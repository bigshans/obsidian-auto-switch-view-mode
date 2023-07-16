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

        containerEl.createEl('h2', {text: 'Setting for auto switch view mode'});
        this.buildAppendSetting(containerEl);
        this.buildRuleSetting(containerEl);
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
                if (detect.value) {
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

    buildRuleSetting(containerEl: HTMLElement) {
        const detect: Trigger = {
            value: '',
        }
        new Setting(containerEl)
        .setName('Add regexp rule')
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
    }

    hide() {
        this.plugin.sm.unsubscribe(this.sub);
    }

    buildFileList(containerEl: HTMLElement) {
        const [ ruleUl, buildRuleUl ] = this.createUl(containerEl, this.plugin.setting.ruler, (rule) => {
            this.plugin.sm.removeRule(rule);
        });
        buildRuleUl();

        const [ fileUl, buildFileUl ] = this.createUl(containerEl, this.plugin.setting.files, (file) => {
            this.plugin.sm.removeFile(file);
        });
        buildFileUl();

        const [folderUl, buildFolderUl] = this.createUl(containerEl, this.plugin.setting.folders, (folder) => {
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
            }
        });
    }

    createUl(containerEl: HTMLElement, list: string[], removeListener: (v: string) => void): [HTMLElement, () => void] {
        containerEl.createEl('h3', {text: 'Folder List:'});
        const ulEl = containerEl.createEl('ul');
        const build = () => {
            for (const item of list) {
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
