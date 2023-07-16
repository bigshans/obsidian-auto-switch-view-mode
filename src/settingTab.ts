import {App, PluginSettingTab, Setting, TFile} from "obsidian";
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

        containerEl.createEl('h2', {text: 'Setting for auto switch view mode'});
        const choose: Trigger = {
            value: '',
        };
        new Setting(containerEl)
            .setName('Append File or Folder into List')
            .addDropdown((cp) => {
                const files = Object.keys((this.plugin.app.vault as any).fileMap);
                cp.addOption('', '请添加');
                for (const file of files) {
                    cp.addOption(file, file);
                }
                choose.clear = () => {
                    cp.setValue('');
                }
                cp.onChange((v) => {
                    if (v) {
                        cp.setValue(v);
                        choose.value = v;
                    }
                });
            })
            .addButton(cp => {
                cp.setButtonText('Add');
                cp.onClick(() => {
                    if (!choose.value) {
                        return;
                    }
                    const p = choose.value;
                    const file: TFile = (this.plugin.app.vault as any).fileMap[p];
                    // maybe not in there, don't believe the type
                    if (file.extension) {
                        this.plugin.sm.appendFile(p);
                    } else {
                        this.plugin.sm.appendFolder(p);
                    }
                    choose.clear && choose.clear();
                });
            });
        const detect: Trigger = {
            value: '',
        }
        new Setting(containerEl)
            .setName('Set regexp')
            .addText((cp) => {
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
                    this.plugin.sm.appendRule(detect.value);
                    detect.value = '';
                    detect.clear && detect.clear();
                })
            });
        this.sub = this.buildFileList(containerEl);
    }

    public hide() {
        this.plugin.sm.unsubscribe(this.sub);
    }

    public buildFileList(containerEl: HTMLElement) {
        containerEl.createEl('h3', {text: 'Rule List:'});
        const ruleUl = containerEl.createEl('ul');
        const buildRuleUl = () => {
            for (const rule of this.plugin.setting.ruler) {
                const li = ruleUl.createEl('li');
                li.style.display = 'flex';
                li.style.width = '100%';
                li.style.justifyContent = 'space-between';
                li.createEl('span', {text: rule});
                const d = li.createEl('span', {text: 'X'}, (el) => {
                    el.addEventListener('click', () => {
                        this.plugin.sm.removeFolder(rule);
                    });
                });
                d.style.cursor = 'pointer';
            }
        }
        buildRuleUl();

        containerEl.createEl('h3', {text: 'File List:'});
        const fileUl = containerEl.createEl('ul');
        const buildFileUl = () => {
            for (const file of this.plugin.setting.files) {
                const li = fileUl.createEl('li');
                li.style.display = 'flex';
                li.style.width = '100%';
                li.style.justifyContent = 'space-between';
                li.createEl('span', {text: file});
                const d = li.createEl('span', {text: 'X'}, (el) => {
                    el.addEventListener('click', () => {
                        this.plugin.sm.removeFile(file);
                    });
                });
                d.style.cursor = 'pointer';
            }
        };
        buildFileUl();

        containerEl.createEl('h3', {text: 'Folder List:'});
        const folderUl = containerEl.createEl('ul');
        const buildFolderUl = () => {
            for (const folder of this.plugin.setting.folders) {
                const li = folderUl.createEl('li');
                li.style.display = 'flex';
                li.style.width = '100%';
                li.style.justifyContent = 'space-between';
                li.createEl('span', {text: folder});
                const d = li.createEl('span', {text: 'X'}, (el) => {
                    el.addEventListener('click', () => {
                        this.plugin.sm.removeFolder(folder);
                    });
                });
                d.style.cursor = 'pointer';
            }
        }
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
            }
        });
    }
}
