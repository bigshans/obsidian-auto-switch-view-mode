/* eslint-disable @typescript-eslint/no-unused-vars */
import { Notice, Plugin, TFolder } from 'obsidian';
import {EditorManager, EditorState} from './editor';
import {WorkspaceManager} from './workspace';
import {AutoSwitchSettingTab} from './settingTab';

interface PluginSetting {
    folders: string[];
    files: string[];
    ruler: string[];
    blackRule: string[];
    initState: EditorState;
}

interface SaveSetting {
    setting: PluginSetting;
    saveSettings: () => Promise<void> | void;
}

const DEFAULT_SETTING: PluginSetting = {
    folders: [],
    files: [],
    ruler: [],
    blackRule: [],
    initState: 'source',
}

export default class AutoSwitchPlugin extends Plugin {
    public setting: PluginSetting;
    public sm: SettingManager;
    public edm: EditorManager;
    public wm: WorkspaceManager;
    private firstOpenInRule = false;

    private openIn() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            return;
        }
        if (!this.sm.isInBlackList(file.path)
            && (this.sm.meetRule(file.path) || this.sm.hasFile(file.path) || this.sm.hasFolder(file.path))) {
            const state = this.edm.getEditorState();
            // 初次进入目标文件，其状态不为 preview 或 source 时，将不进行上锁
            // 其状态延续之前的状态。
            if (state === 'other') {
                return;
            }
            this.wm.recordPrevStateOnActiveLeaf(this.firstOpenInRule ? undefined : this.edm.getInitState());
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
        this.firstOpenInRule = true;
    }

    private getActiveFilePath() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            return;
        }
        return file.path;
    }

    private toggleSetting(path?: string) {
        if (!path) {
            return;
        }
        let op = 'nothing';
        if (this.isFolder(path)) {
            if (this.sm.hasFolder(path)) {
                op = 'remove';
                this.sm.removeFolder(path);
            } else {
                op = 'append';
                this.sm.appendFolder(path);
            }
        } else {
            if (this.sm.hasFile(path)) {
                op = 'remove';
                this.sm.removeFile(path);
            } else {
                op = 'append';
                this.sm.appendFile(path);
            }
        }
        if (op === 'append') {
            new Notice("Append to List successful");
        } else if (op === 'remove') {
            new Notice("Remove from List successful");
        }
        new Notice('Take effect the next time you open the file');
    }

    public isFolder(path: string) {
        const file = this.getFileByPath(path);
        if (!file) {
            return false;
        }
        return file instanceof TFolder;
    }

    public getFileByPath(path: string) {
        return this.app.vault.getAbstractFileByPath(path);
    }

    async onload() {
        await this.loadSettings();

        this.sm = new SettingManager(this);
        this.edm = new EditorManager(this);
        this.wm = new WorkspaceManager(this);

        this.addCommand({
            id: 'append-or-remove-to-switch-list',
            name: "Append or remove to auto switch list",
            callback: () => this.toggleSetting(this.getActiveFilePath()),
        });

        this.addSettingTab(new AutoSwitchSettingTab(this.app, this));

        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => leaf ? this.openIn() : null));
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item.setTitle("Auto Switch: remove or append to list")
                    .setIcon("switch")
                    .onClick(() => {
                        this.toggleSetting(file.path);
                    });
                });
            })
        );
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
    value: string;
    type: 'file' | 'folder' | 'rule' | 'initState' | 'blackRule';
    op: 'append' | 'remove' | 'update';
}
export type Subscription = (e: SettingEvent) => void;

class SettingManager {
    private files: Set<string>;
    private folders: Set<string>;
    private rulers: Set<string>;
    private blackRule: Set<string>;

    private rawData: PluginSetting;
    private initState: EditorState;
    private subscription: Subscription[] = [];

    constructor(
        private settingManager: SaveSetting
    ) {
        this.rawData = settingManager.setting;
        this.files = new Set(this.rawData.files);
        this.folders = new Set(this.rawData.folders);
        this.rulers = new Set(this.rawData.ruler);
        this.blackRule = new Set(this.rawData.blackRule);
        this.initState = this.rawData.initState;

        this.subscribe((_) => {
            this.triggerSaved();
        })
    }

    private triggerSaved() {
        this.rawData.files = [...this.files];
        this.rawData.folders = [...this.folders];
        this.rawData.ruler = [...this.rulers];
        this.rawData.initState = this.initState;
        this.rawData.blackRule = [...this.blackRule];
        this.settingManager.saveSettings();
    }

    private dispatch(e: SettingEvent) {
        this.subscription.forEach((fn) => fn(e));
    }

    public appendFile(path: string) {
        this.files.add(path);
        this.dispatch({
            value: path,
            type: 'file',
            op: 'append'
        });
    }

    public appendFolder(path: string) {
        this.folders.add(path);
        this.dispatch({
            value: path,
            type: 'folder',
            op: 'append'
        });
    }

    public appendRule(rule: string) {
        this.rulers.add(rule);
        this.dispatch({
            value: rule,
            type: 'rule',
            op: 'append',
        })
    }

    public appendBlackRule(rule: string) {
        this.blackRule.add(rule);
        this.dispatch({
            value: rule,
            type: 'blackRule',
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
        for (const rule of this.rulers) {
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

    public isInBlackList(path: string): boolean {
        for (const rule of this.blackRule) {
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
            value: path,
            type: 'file',
            op: 'remove'
        });
    }

    public removeFolder(path: string) {
        const paths = path.split('/');
        while (paths.length > 0) {
            const p = paths.join('/');
            if (this.folders.has(paths.join('/'))) {
                this.folders.delete(p);
                this.dispatch({
                    value: p,
                    type: 'folder',
                    op: 'remove'
                });
                return ;
            }
            paths.pop();
        }
    }

    public removeRule(rule: string) {
        this.rulers.delete(rule);
        this.dispatch({
            value: rule,
            type: 'rule',
            op: 'remove'
        });
    }

    public removeBlack(rule: string) {
        this.blackRule.delete(rule);
        this.dispatch({
            value: rule,
            type: 'blackRule',
            op: 'remove'
        });
    }

    public setInitState(state: EditorState) {
        this.dispatch({
            value: state,
            type: 'initState',
            op: 'update'
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
