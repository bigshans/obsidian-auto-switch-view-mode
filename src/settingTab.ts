import {App, PluginSettingTab, Setting} from "obsidian";
import AutoSwitchPlugin, {Subscription} from "./main";

interface Trigger {
    value: string;
    clear?: () => void;
}

export class AutoSwitchSettingTab extends PluginSettingTab {
    public plugin: AutoSwitchPlugin;
    private sub: Subscription;

    constructor(app: App, plugin: AutoSwitchPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    public display() {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Setting for auto switch mode'});
        this.buildAppendSetting(containerEl);
        this.buildRuleSetting(containerEl);
        this.buildBlackSetting(containerEl);
        this.buildInitState(containerEl);
        this.sub = this.buildFileList(containerEl);
    }

    buildAppendSetting(containerEl: HTMLElement) {
        const detect: Trigger = {
            value: '',
        };
        new Setting(containerEl)
        .setName('Append File or Folder into List')
        .addDropdown((cp) => {
            const files = this.app.vault.getAllLoadedFiles();
            cp.addOption('', '请添加');
            for (const file of files) {
                cp.addOption(file.path, file.path);
            }
            detect.clear = () => cp.setValue("");
            cp.onChange((v) => {
                if (v) {
                    cp.setValue(v);
                    detect.value = v;
                }
            });
        })
        .addButton(cp => {
            cp.setButtonText('Add');
            cp.onClick(() => {
                if (!detect.value) {
                    return;
                }
                const p = detect.value;
                const file = this.plugin.getFileByPath(p);
                if (!file) {
                    return ;
                }
                if (this.plugin.isFolder(file.path)) {
                    this.plugin.sm.appendFile(p);
                } else {
                    this.plugin.sm.appendFolder(p);
                }
                detect.clear && detect.clear();
            });
        });
    }

    buildTextAddUI(containerEl: HTMLElement, settingDesc: { name: string; desc?: string }, solve: (v: string) => void) {
        const detect: Trigger = {
            value: '',
        }
        const s = new Setting(containerEl).setName(settingDesc.name);
        if (settingDesc.desc) {
            s.setDesc(settingDesc.desc);
        }
        s.addText((cp) => {
            detect.clear = () => {
                cp.setValue('');
            }
            cp.onChange((v) => {
                detect.value = v;
            })
        })
        .addButton((cp) => {
            cp.setButtonText('Add');
            cp.onClick(() => {
                if(!detect.value) {
                    return;
                }
                solve(detect.value);
                detect.value = '';
                detect.clear && detect.clear();
            })
        });
    }

    buildRuleSetting(containerEl: HTMLElement) {
        this.buildTextAddUI(containerEl, {
            name: 'Add regexp rule',
        }, (v) => {
            this.plugin.sm.appendRule(v);
        });
    }

    buildBlackSetting(containerEl: HTMLElement) {
        this.buildTextAddUI(containerEl, {
            name: 'Add regexp rule to black list',
        }, (v) => {
            this.plugin.sm.appendBlackRule(v);
        });
    }

    buildInitState(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName("Default Mode")
            .setDesc("Set the default mode.")
            .addDropdown((cp) => {
                cp.addOption('source', 'source');
                cp.addOption('preview', 'preview');
                cp.setValue(this.plugin.setting.initState);
                cp.onChange((v) => {
                    cp.setValue(v);
                    this.plugin.sm.setInitState(v as any);
                });
            });
    }

    hide() {
        this.plugin.sm.unsubscribe(this.sub);
    }

    buildFileList(containerEl: HTMLElement) {
        const [ blackUl, buildBlackUl ] = this.createUl(containerEl, 'Black Rule List', () => this.plugin.setting.blackRule, (rule) => {
            this.plugin.sm.removeBlack(rule);
        });
        buildBlackUl();

        const [ ruleUl, buildRuleUl ] = this.createUl(containerEl, 'Rule List', () => this.plugin.setting.ruler, (rule) => {
            this.plugin.sm.removeRule(rule);
        });
        buildRuleUl();

        const [ fileUl, buildFileUl ] = this.createUl(containerEl, 'File List', () => this.plugin.setting.files, (file) => {
            this.plugin.sm.removeFile(file);
        });
        buildFileUl();

        const [folderUl, buildFolderUl] = this.createUl(containerEl, 'Folder List', () => this.plugin.setting.folders, (folder) => {
            this.plugin.sm.removeFolder(folder);
        });
        buildFolderUl();

        return this.plugin.sm.subscribe((e) => {
            if (e.type === 'file') {
                fileUl.empty();
                buildFileUl();
            } else if (e.type === 'folder') {
                folderUl.empty();
                buildFolderUl();
            } else if (e.type === 'rule'){
                ruleUl.empty();
                buildRuleUl();
            } else if (e.type === 'blackRule') {
                blackUl.empty();
                buildBlackUl();
            }
        });
    }

    createUl(containerEl: HTMLElement, title: string, getList: () => string[], removeListener: (v: string) => void): [HTMLElement, () => void] {
        containerEl.createEl('h3', {text: title});
        const ulEl = containerEl.createEl('ul');
        const build = () => {
            for (const item of getList()) {
                const li = ulEl.createEl('li');
                li.style.display = 'flex';
                li.style.width = '100%';
                li.style.justifyContent = 'space-between';
                li.createEl('span', {text: item});
                const d = li.createEl('span', {text: 'X'}, (el) => {
                    el.addEventListener('click', () => {
                        removeListener(item);
                    });
                });
                d.style.cursor = 'pointer';
            }
        }
        return [ulEl, build];
    }
}
