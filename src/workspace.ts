import { MarkdownView, WorkspaceLeaf } from 'obsidian';
import {EditorManager, EditorState} from './editor';
import AutoSwitchPlugin from './main';

export interface LeafState {
    state?: EditorState;
    isLock: boolean;
}

export class WorkspaceManager {
    private leafMap: WeakMap<WorkspaceLeaf, LeafState> = new WeakMap();
    private edm: EditorManager;
    private prevId?: string;

    constructor(private plugin: AutoSwitchPlugin) {
        this.edm = new EditorManager(this.plugin);
    }

    private getLastActiveLeafState() {
        if (!this.prevId) {
            return;
        }
        const leaf = this.plugin.app.workspace.getLeafById(this.prevId);
        if (!leaf) {
            return;
        }
        return this.leafMap.get(leaf);
    }

    private getLeaf() {
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
            return;
        }
        const leaf = this.plugin.app.workspace.getLeaf();
        if (!this.prevId) {
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            this.prevId = leaf?.id;
        }
        return leaf;
    }

    private setRecord(leaf: WorkspaceLeaf | undefined, v: LeafState) {
        if (leaf) {
            this.leafMap.set(leaf, v);
        }
    }

    public recordPrevStateOnActiveLeaf(initState?: EditorState) {
        const state = this.edm.getEditorState();
        const _state =  state === 'other' ? undefined : state;
        const leaf = this.getLeaf();
        if (!leaf) {
            return;
        }
        const ls = this.leafMap.get(leaf);
        if (!ls) {
            const pls = this.getLastActiveLeafState();
            // leaf init
            this.setRecord(leaf, {
                state: !initState
                    ? (_state || pls?.state || this.edm.getInitState())
                    : initState,
                isLock: false
            });
            return;
        }
        if (ls.isLock) {
            return;
        }
        this.setRecord(leaf, {
            ...ls,
            state: _state,
        });
    }

    public lockActiveLeaf() {
        const leaf = this.getLeaf();
        if (!leaf) {
            return false;
        }
        const ls = this.leafMap.get(leaf);
        // must create leaf state before
        if (!ls) {
            return false;
        }
        this.setRecord(leaf, {
            ...ls,
            isLock: true,
        });
        return ls.isLock;
    }

    public releaseActiveLeaf() {
        const leaf = this.getLeaf();
        if (!leaf) {
            return;
        }
        const ls = this.leafMap.get(leaf);
        if (!ls) {
            return;
        }
        this.setRecord(leaf, {
            ...ls,
            isLock: false,
        });
    }

    public isLockedActiveLeaf() {
        const leaf = this.getLeaf();
        if (!leaf) {
            return false;
        }
        const ls = this.leafMap.get(leaf);
        if (!ls) {
            return false;
        }
        return ls.isLock;
    }

    public getPrevStateOnActiveLeaf() {
        const leaf = this.getLeaf();
        if (!leaf) {
            return 'other';
        }
        const state = this.leafMap.get(leaf);
        return state && state.state || 'other';
    }
}
