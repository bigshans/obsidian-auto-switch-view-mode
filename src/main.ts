/* eslint-disable @typescript-eslint/no-unused-vars */
import { Plugin } from 'obsidian';
import {EditorManager} from './editor';
import {WorkspaceManager} from './workspace';
import {AutoSwitchSettingTab} from './settingTab';

interface PluginSetting {
    folders: string[];
    files: string[];
    ruler: string[];
}

interface SaveSetting {
    setting: PluginSetting;
    saveSettings: () => Promise<void> | void;
}

const DEFAULT_SETTING: PluginSetting = {
    folders: [],
    files: [],
    ruler: []
}

export default class AutoSwitchPlugin extends Plugin {
    public setting: PluginSetting;
    public sm: SettingManager;
    public edm: EditorManager;
    public wm: WorkspaceManager;

    private openIn() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            return;
        }
        if (this.sm.meetRule(file.path) || this.sm.hasFile(file.path) || this.sm.hasFolder(file.path)) {
            const state = this.edm.getEditorState();
            // 初次进入目标文件，其状态不为 preview 或 source 时，将不进行上锁
            // 其状态延续之前的状态。
            if (state === 'other') {
                return;
            }
            this.wm.recordPrevStateOnActiveLeaf();
            this.edm.setEditorMode('preview');
            this.wm.lockActiveLeaf();
        } else if (this.wm.isLockedActiveLeaf()) {
            this.wm.releaseActiveLeaf();
            const state = this.wm.getPrevStateOnActiveLeaf();
            if (state !== 'other') {
                this.edm.setEditorMode(state);
            }
        } else {
            this.wm.recordPrevStateOnActiveLeaf();
        }
    }

    private toggleSetting() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            return;
        }
        const path = file.path;
        if (this.sm.hasFile(path)) {
            this.sm.removeFile(path);
        } else {
            this.sm.appendFile(path);
        }
        this.openIn();
    }

    async onload() {
        await this.loadSettings();

        this.sm = new SettingManager(this);
        this.edm = new EditorManager(this);
        this.wm = new WorkspaceManager(this);

        this.addRibbonIcon('switch', 'Auto Switch Viewer Mode', () => this.toggleSetting());

        this.addCommand({
            id: 'append-or-remove-to-switch-list',
            name: "Append or remove to auto switch list",
            callback: () => this.toggleSetting(),
        });

        this.addSettingTab(new AutoSwitchSettingTab(this.app, this));

        this.app.workspace.on('file-open', () => this.openIn());
    }

    async loadSettings() {
        this.setting = {
            ...DEFAULT_SETTING,
            ...(await this.loadData()),
        };
    }

    async saveSettings() {
        await this.saveData(this.setting);
    }
}

export interface SettingEvent {
    path: string;
    type: 'file' | 'folder' | 'rule';
    op: 'append' | 'remove';
}
export type Subscription = (e: SettingEvent) => void;

class SettingManager {
    private files: Set<string>;
    private folders: Set<string>;
    private ruler: Set<string>;
    private rawData: PluginSetting;
    private subscription: Subscription[] = [];

    constructor(
        private settingManager: SaveSetting
    ) {
        this.rawData = settingManager.setting;
        this.files = new Set(this.rawData.files);
        this.folders = new Set(this.rawData.folders);
        this.ruler = new Set(this.rawData.ruler);
        this.subscribe((_) => {
            this.triggerSaved();
        })
    }

    private triggerSaved() {
        this.rawData.files = [...this.files];
        this.rawData.folders = [...this.folders];
        this.rawData.ruler = [...this.ruler];
        this.settingManager.saveSettings();
    }

    private dispatch(e: SettingEvent) {
        this.subscription.forEach((fn) => fn(e));
    }

    public appendFile(path: string) {
        this.files.add(path);
        this.dispatch({
            path,
            type: 'file',
            op: 'append'
        });
    }

    public appendFolder(path: string) {
        this.folders.add(path);
        this.dispatch({
            path,
            type: 'folder',
            op: 'append'
        });
    }

    public appendRule(rule: string) {
        this.ruler.add(rule);
        this.dispatch({
            path: rule,
            type: 'rule',
            op: 'append',
        })
    }

    public hasFile(path: string) {
        return this.files.has(path);
    }

    public hasFolder(path: string): boolean {
        const paths = path.split('/');
        while (paths.length > 0) {
            if (this.folders.has(paths.join('/'))) {
                return true;
            }
            paths.pop();
        }
        return false;
    }

    public meetRule(path: string): boolean {
        for (const rule of this.ruler) {
            try {
                const r = new RegExp(rule);
                if (r.test(path)) {
                    return true;
                }
            } catch (e) {
                console.log(e);
            }
        }
        return false;
    }

    public removeFile(path: string) {
        this.files.delete(path);
        this.dispatch({
            path,
            type: 'file',
            op: 'remove'
        });
    }

    public removeFolder(path: string) {
        this.folders.delete(path);
        this.dispatch({
            path,
            type: 'folder',
            op: 'remove'
        });
    }

    public subscribe(s: Subscription) {
        this.subscription.push(s);
        return s;
    }

    public unsubscribe(target: Subscription) {
        this.subscription.remove(target);
    }
}
