import AutoSwitchPlugin from './main';

export type EditorState = 'source' | 'preview';

export class EditorManager {

    constructor(private plugin: AutoSwitchPlugin) {
    }

    private getEditor() {
        return this.plugin.app.workspace.activeEditor;
    }

    private toggleEditorState() {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.getEditor()?.toggleMode();
    }

    public getInitState() {
        return this.plugin.setting.initState;
    }

    public setEditorMode(to: EditorState) {
        const state = this.getEditorState();
        if (state === 'other') {
            return;
        }
        if (state !== to) {
            this.toggleEditorState();
        }
    }

    public getEditorState(): EditorState | 'other' {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return this.getEditor()?.getState().mode || 'other';
    }
}
