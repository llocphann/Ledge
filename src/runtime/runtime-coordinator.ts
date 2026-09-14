import { Component, TFile, type App } from "obsidian";
import { maintainRenamedVaultPaths } from "../services/path-maintenance";
import type { LedgeSettings } from "../types";

export interface CoordinatedDockRuntime {
  refreshWorkspaceState(): void;
  handleMetadataChange(file: TFile): void;
  handleWindowOpen(document: Document): void;
  handleWindowClose(document: Document): void;
  handleVaultPathChange(path: string): void;
  applySettings(): void;
}

export interface RuntimeCoordinatorHost {
  app: App;
  getSettings(): LedgeSettings;
  dockRuntimes(): Iterable<readonly [string, CoordinatedDockRuntime]>;
  persistRuntimeSettings(): Promise<void>;
}

/**
 * Owns the global Obsidian event subscriptions shared by every Dock runtime.
 * Individual Dock controllers only manage their document-local DOM lifecycle.
 */
export class RuntimeCoordinator extends Component {
  constructor(private readonly host: RuntimeCoordinatorHost) {
    super();
  }

  onload(): void {
    const { workspace } = this.host.app;

    this.registerEvent(workspace.on("layout-change", () => this.refreshWorkspaceState()));
    this.registerEvent(workspace.on("active-leaf-change", () => this.refreshWorkspaceState()));
    this.registerEvent(workspace.on("file-open", () => this.refreshWorkspaceState()));
    this.registerEvent(this.host.app.metadataCache.on("changed", (file) => {
      for (const [, dock] of this.host.dockRuntimes()) dock.handleMetadataChange(file);
    }));
    this.registerEvent(workspace.on("window-open", (_workspaceWindow, openedWindow) => {
      for (const [, dock] of this.host.dockRuntimes()) dock.handleWindowOpen(openedWindow.document);
    }));
    this.registerEvent(workspace.on("window-close", (_workspaceWindow, closedWindow) => {
      for (const [, dock] of this.host.dockRuntimes()) dock.handleWindowClose(closedWindow.document);
    }));
    this.registerEvent(this.host.app.vault.on("create", (file) => {
      this.handleVaultPathChange(file.path);
    }));
    this.registerEvent(this.host.app.vault.on("modify", (file) => {
      this.handleVaultPathChange(file.path);
    }));
    this.registerEvent(this.host.app.vault.on("delete", (file) => {
      this.handleVaultPathChange(file.path);
    }));
    this.registerEvent(this.host.app.vault.on("rename", (file, oldPath) => {
      this.handleVaultRename(file.path, oldPath);
    }));
  }

  private refreshWorkspaceState(): void {
    for (const [, dock] of this.host.dockRuntimes()) dock.refreshWorkspaceState();
  }

  private handleVaultPathChange(path: string): void {
    for (const [, dock] of this.host.dockRuntimes()) dock.handleVaultPathChange(path);
  }

  private handleVaultRename(newPath: string, oldPath: string): void {
    const result = maintainRenamedVaultPaths(this.host.getSettings(), newPath, oldPath);
    const affected = new Set(result.affectedDockIds);

    for (const [dockId, dock] of this.host.dockRuntimes()) {
      if (affected.has(dockId)) dock.applySettings();
      else {
        dock.handleVaultPathChange(oldPath);
        dock.handleVaultPathChange(newPath);
      }
    }

    if (!result.changed) return;
    void this.host.persistRuntimeSettings().catch((error: unknown) => {
      console.error("[Ledge] Could not persist renamed Dock paths", error);
    });
  }
}
