import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, TFile } from 'obsidian';

interface XoppPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: XoppPluginSettings = {
    mySetting: 'default'
}

export default class XoppPlugin extends Plugin {
    settings: XoppPluginSettings;

    async onload() {
        await this.loadSettings();

        const divsEmbedFiles = this.app.workspace
            .getActiveViewOfType(MarkdownView)?.contentEl
            .querySelectorAll('div.file-embed');


        const files: TFile[] = this.app.vault.getFiles();

        if (!divsEmbedFiles) return;
    
        divsEmbedFiles.forEach( (e, i) => {
            let filename: string = e.getAttribute('src') ?? '';
            
            // Skip embed files that are no XOPP file
            if (!filename.match(/\.xopp$/)) return;

            console.log(files.find(e => e.name == filename));
        })
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SettingTab extends PluginSettingTab {
    plugin: XoppPlugin;

    constructor(app: App, plugin: XoppPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
