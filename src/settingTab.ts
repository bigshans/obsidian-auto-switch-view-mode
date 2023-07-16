import {App, PluginSettingTab, Setting, TFile} from "obsidian";
import AutoSwitchPlugin, {Subscription} from "./main";

interface ChooseTrigger {
    addButton?: (v: string) => void;
    cleanDropdown?: () => void;
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
        const choose: ChooseTrigger = {
        };
        new Setting(containerEl)
            .setName('Append File or Folder into List')
            .addDropdown((cp) => {
                const files = Object.keys((this.plugin.app.vault as any).fileMap);
                cp.addOption('', '请添加');
                for (const file of files) {
                    cp.addOption(file, file);
                }
                choose.cleanDropdown = () => {
                    cp.setValue('');
                }
                cp.onChange((v) => {
                    if (v) {
                        cp.setValue(v);
                        const {addButton} = choose;
                        addButton && addButton(v);
                    }
                });
            })
            .addButton(cp => {
                let p = '';
                choose.addButton = (v) => {
                    p = v;
                };
                cp.onClick(() => {
                    if (!p) {
                        return;
                    }
                    const {cleanDropdown} = choose;
                    const file: TFile = (this.plugin.app.vault as any).fileMap[p];
                    // maybe not in there, don't believe the type
                    if (file.extension) {
                        this.plugin.sm.appendFile(p);
                    } else {
                        this.plugin.sm.appendFolder(p);
                    }
                    cleanDropdown && cleanDropdown();
                });
            });
        this.sub = this.buildFileList(containerEl);
    }

    public hide() {
        this.plugin.sm.unsubscribe(this.sub);
    }

    public buildFileList(containerEl: HTMLElement) {
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
            } else {
                folderUl.empty();
                buildFolderUl();
            }
        });
    }
}
