import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, TFile, FileStats, Stat } from 'obsidian';
import { exec } from 'child_process';

interface XoppPluginSettings {
    importedPath: string;
}

const DEFAULT_SETTINGS: XoppPluginSettings = {
    importedPath: 'xopp',
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

    /**
     * Returns the generated preview pdf file for the given xopp file. If the pdf file is too old/doesn't exist generate one
     * A pdf filename will have the form: path_to_xopp_xoppfilename.xopp.pdf
     * @param xoppFile
     */
    async getPdfPath(xoppFile: TFile): Promise<string> {
        const pdfPath = `${this.settings.importedPath}/preview/${xoppFile.path.replace(/\/|\\/, '_')}.pdf`;

        if (await this.app.vault.adapter.exists(pdfPath)) {
            const pdfMTime: number = (await this.app.vault.adapter.stat(pdfPath))?.mtime ?? 0;

            // if the pdf exists and has very similar modified date as xopp file just return the path and do nothing
            if (pdfMTime - xoppFile.stat.mtime > 10) return pdfPath;
        }
        
        // try to create directory
        this.app.vault.adapter.mkdir(`${this.settings.importedPath}/preview`);

        const vaultPath = this.getAbsoluteVaultPath();

        exec(`xournalpp -p ${vaultPath}/${pdfPath} ${vaultPath}/${xoppFile.path}`);

        return pdfPath;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Workaround to get the vault path
     * @returns string|null
     */
    getAbsoluteVaultPath(): string|null {
        const matches = this.app.vault.adapter.getResourcePath('FAKE_FILE').match(/(?<=app:\/\/[^\ /\\]+\/)(.+)(?=\/FAKE_FILE\?\d+)/);

        if (matches?.length) {
            let path = matches[0];

            // if not on Windows, add a Slash before path
            if (!path.match(/^[A-Z]:/)) {
                path = '/' + path;
            }

            return path;
        }
        else {
            return null
        }
    }
}
