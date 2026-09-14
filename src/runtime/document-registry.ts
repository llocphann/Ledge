import {
  TFile,
  getAllTags,
  type App,
  type WorkspaceLeaf,
} from "obsidian";
import type { NoteContext } from "../context-rules";

export interface DocumentRuntimeContext {
  document: Document;
  leaf: WorkspaceLeaf | null;
  contentEl: HTMLElement | null;
  file: TFile | null;
  noteContext: NoteContext | null;
}

/**
 * Shared snapshot of workspace documents and their active root leaves.
 * A snapshot is built with one workspace traversal and reused by every Dock
 * until a workspace/window event invalidates it.
 */
export class DocumentRegistry {
  private documentsSnapshot: readonly Document[] | null = null;
  private readonly leavesByDocument = new Map<Document, WorkspaceLeaf>();
  private readonly contexts = new Map<Document, DocumentRuntimeContext>();

  constructor(private readonly app: App) {}

  documents(): readonly Document[] {
    this.ensureWorkspaceSnapshot();
    return this.documentsSnapshot ?? [];
  }

  context(document: Document): DocumentRuntimeContext {
    const cached = this.contexts.get(document);
    if (cached) return cached;

    this.ensureWorkspaceSnapshot();
    const leaf = this.leavesByDocument.get(document) ?? null;
    const leafContainer = leaf?.view?.containerEl;
    const contentEl = (leaf?.view as { contentEl?: HTMLElement } | undefined)?.contentEl
      ?? leafContainer?.querySelector<HTMLElement>(".view-content")
      ?? leafContainer
      ?? null;
    const candidate: unknown = (leaf?.view as { file?: unknown } | undefined)?.file;
    const file = candidate instanceof TFile ? candidate : null;
    const cache = file ? this.app.metadataCache.getFileCache(file) : null;
    const noteContext = file ? {
      path: file.path,
      name: file.name,
      basename: file.basename,
      tags: cache ? getAllTags(cache) || [] : [],
    } : null;

    const context: DocumentRuntimeContext = {
      document,
      leaf,
      contentEl,
      file,
      noteContext,
    };
    this.contexts.set(document, context);
    return context;
  }

  invalidateWorkspace(): void {
    this.documentsSnapshot = null;
    this.leavesByDocument.clear();
    this.contexts.clear();
  }

  invalidateFile(file: TFile): void {
    for (const [document, context] of this.contexts) {
      if (context.file?.path === file.path) this.contexts.delete(document);
    }
  }

  private ensureWorkspaceSnapshot(): void {
    if (this.documentsSnapshot) return;

    const documents = new Set<Document>();
    const workspaceDocument = this.app.workspace.containerEl.ownerDocument;
    documents.add(workspaceDocument);
    this.leavesByDocument.clear();

    const recentLeaf = this.app.workspace.getMostRecentLeaf();
    if (recentLeaf) this.rememberRootLeaf(recentLeaf, documents, true);

    this.app.workspace.iterateAllLeaves((leaf) => {
      this.rememberRootLeaf(leaf, documents, false);
    });

    this.documentsSnapshot = [...documents];
  }

  private rememberRootLeaf(
    leaf: WorkspaceLeaf,
    documents: Set<Document>,
    prefer: boolean,
  ): void {
    const container = leaf.view?.containerEl;
    const document = container?.ownerDocument;
    if (!document) return;
    documents.add(document);
    if (!container.closest(".workspace-split.mod-root")) return;
    if (prefer || !this.leavesByDocument.has(document)) {
      this.leavesByDocument.set(document, leaf);
    }
  }
}
