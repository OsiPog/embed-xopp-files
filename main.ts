import { exec } from 'child_process';
import { MarkdownView, Plugin, TFile } from 'obsidian';

interface XoppPluginSettings {
    importedPath: string;
}

const DEFAULT_SETTINGS: XoppPluginSettings = {
    importedPath: 'Attachments',
}

export default class XoppPlugin extends Plugin {
    settings: XoppPluginSettings;
    activeMDView: MarkdownView|null;

    async onload() {
        await this.loadSettings();

        this.registerInterval(window.setInterval(() => {
            this.activeMDView = this.app.workspace.getActiveViewOfType(MarkdownView);
            this.updateEmbeds();
        }, 1000))
    }

    onunload() {

    }

    async updateEmbeds() {
        if (!this.activeMDView) return;

        const activeViewContent = this.activeMDView.contentEl

        // get all embed xopp file divs from current document
        const divsEmbedFiles = Array.from(activeViewContent?.querySelectorAll('div.file-embed') ?? [])
        .filter(e => e.getAttribute('src')?.match(/\.xopp$/));

        // all files in vault
        const files: TFile[] = this.app.vault.getFiles();

        divsEmbedFiles.forEach( async (div, i) => {
            const filename: string|undefined = (div.getAttribute('src') ?? '')
                // src might be a path
                .replace(/\//, '/') // Windows path to unix path
                .split('/')
                .at(-1); // filename is last in list when path split by slash
            
            const xoppFile = files.find(e => e.name === filename);

            if (!xoppFile) return;

            const pngPaths = (await this.getPngFiles(xoppFile)).sort();

            if (!div.classList.contains('has-xopp-images')) {
                div.replaceChildren();
                pngPaths.forEach((pngPath) => {
                    const img = div.createEl('img');

                    const file = this.app.vault.getFileByPath(pngPath);
                    
                    if (!file) return;

                    img.setAttr('src', this.app.vault.getResourcePath(file));
                })

                div.classList.add('has-xopp-images');
            }
        })
    }

    /**
     * Returns the generated preview pdf file for the given xopp file. If the pdf file is too old/doesn't exist generate one
     * @param xoppFile
     */
    async getPngFiles(xoppFile: TFile): Promise<string[]> {
        const pngDir = `${this.settings.importedPath}/preview/${xoppFile.path.replaceAll(/\/|\\/g, '_').replace(/\.xopp$/g, "")}`;

        if (await this.app.vault.adapter.exists(pngDir)) {
            const pngMTime: number = 
                (await this.app.vault.adapter.stat(`${pngDir}/exported`))?.mtime 
                ?? (await this.app.vault.adapter.stat(`${pngDir}/exported-1`))?.mtime
                ?? 0;

            // if the exoport exists and has very similar modified date as xopp file just return the path and do nothing
            if (pngMTime - xoppFile.stat.mtime > 10) 
                return (await this.app.vault.adapter.list(pngDir)).files;
        }
        
        // try to create directory
        this.app.vault.adapter.mkdir(pngDir);

        const vaultPath = this.getAbsoluteVaultPath();

        exec(`xournalpp -i ${vaultPath}/${pngDir}/exported.svg ${vaultPath}/${xoppFile.path}`);

        return (await this.app.vault.adapter.list(pngDir)).files;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Workaround to get the full vault path
     * @returns string|null
     */
    getAbsoluteVaultPath(): string|null {
        const matches = this.app.vault.adapter.getResourcePath('FAKE_FILE').match(/(?<=app:\/\/[^\ /\\]+\/)(.+)(?=\/FAKE_FILE\?\d+)/);

        if (matches?.length) {
            let path = matches[0];

            // if not on Windows, add a slash before path
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
