/* eslint-disable @typescript-eslint/no-unused-vars */
import { App, livePreviewState, MarkdownView, Notice, Plugin } from 'obsidian';
import {EditorManager, EditorState} from './editor';

interface PluginSetting {
    folders: string[];
    files: string[];
}

interface SaveSetting {
    setting: PluginSetting;
    saveSettings: () => Promise<void> | void;
}

const DEFAULT_SETTING: PluginSetting = {
    folders: [],
    files: []
}

export default class AutoSwitchPlugin extends Plugin {
    public setting: PluginSetting;
    public sm: SettingManager;
    public edm: EditorManager;
    private prevState: EditorState;
    private isIn = false;

    private openIn() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            return;
        }
        const state = this.edm.getEditorState();
        if (this.sm.hasFile(file.path) || this.sm.hasFolder(file.path)) {
            if (this.isIn) {
                return;
            }
            if (state !== 'other') {
                this.prevState = state;
            }
            this.edm.setEditorMode('preview');
            this.isIn = true;
        } else if (this.isIn){
            this.edm.setEditorMode(this.prevState);
            this.isIn = false;
        } else if (state !== 'other') {
            this.prevState = state;
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

        this.addRibbonIcon('switch', 'Auto Switch Viewer Mode', () => this.toggleSetting());

        this.addCommand({
            id: 'append-or-remove-to-switch-list',
            name: "Append or remove to auto switch list",
            callback: () => this.toggleSetting(),
        });

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

class SettingManager {
    private files: Set<string>;
    private folders: Set<string>;
    private rawData: PluginSetting;

    constructor(
        private settingManager: SaveSetting
    ) {
        this.rawData = settingManager.setting;
        this.files = new Set(this.rawData.files);
        this.folders = new Set(this.rawData.folders);
    }

    private triggerSaved() {
        this.rawData.files = [...this.files];
        this.rawData.folders = [...this.folders];
        this.settingManager.saveSettings();
    }

    public appendFile(path: string) {
        this.files.add(path);
        this.triggerSaved();
    }

    public appendFolder(path: string) {
        this.folders.add(path);
        this.triggerSaved();
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

    public removeFile(path: string) {
        this.files.delete(path);
        this.triggerSaved();
    }

    public removeFolder(path: string) {
        this.folders.delete(path);
        this.triggerSaved();
    }
}
