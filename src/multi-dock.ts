import { Component, type App } from "obsidian";
import { DockController, type LedgeHost } from "./dock";
import { DocumentRegistry } from "./runtime/document-registry";
import { RuntimeCoordinator } from "./runtime/runtime-coordinator";
import type { DockPresetSettings, DockSettings, LedgeSettings } from "./types";

export interface MultiDockHost {
  app: App;
  settings: LedgeSettings;
  getDockPresetRuntime(dockId: string): DockPresetSettings | null;
  saveDockPresetRuntime(dockId: string, refresh?: boolean): Promise<void>;
  persistRuntimeSettings(): Promise<void>;
}

class PresetDockHost implements LedgeHost {
  constructor(
    private readonly host: MultiDockHost,
    private readonly dockId: string,
    readonly documentRegistry: DocumentRegistry,
  ) {}

  get app(): App {
    return this.host.app;
  }

  get settings(): DockSettings {
    return this.host.getDockPresetRuntime(this.dockId) ?? this.host.settings;
  }

  saveSettings(refresh = true): Promise<void> {
    return this.host.saveDockPresetRuntime(this.dockId, refresh);
  }
}

/**
 * Keeps one DockController per enabled preset. A single RuntimeCoordinator owns
 * global Obsidian subscriptions and dispatches changes to those document-local
 * runtimes. Disabled presets remain data-only and still participate in shared
 * path maintenance.
 */
export class MultiDockController extends Component {
  private readonly controllers = new Map<string, DockController>();
  private readonly documentRegistry: DocumentRegistry;

  constructor(private readonly host: MultiDockHost) {
    super();
    this.documentRegistry = new DocumentRegistry(host.app);
  }

  onload(): void {
    this.reconcile();
    this.addChild(new RuntimeCoordinator({
      app: this.host.app,
      documentRegistry: this.documentRegistry,
      getSettings: () => this.host.settings,
      dockRuntimes: () => this.controllers.entries(),
      persistRuntimeSettings: () => this.host.persistRuntimeSettings(),
    }));
  }

  applySettings(): void {
    this.reconcile();
    for (const controller of this.controllers.values()) controller.applySettings();
  }

  refreshIcons(): void {
    this.reconcile();
    for (const controller of this.controllers.values()) controller.refreshIcons();
  }

  private reconcile(): void {
    const desired = new Set(
      this.host.settings.docks.filter((dock) => dock.enabled).map((dock) => dock.id),
    );

    for (const [dockId, controller] of this.controllers) {
      if (desired.has(dockId)) continue;
      this.removeChild(controller);
      this.controllers.delete(dockId);
    }

    for (const preset of this.host.settings.docks) {
      if (!preset.enabled || this.controllers.has(preset.id)) continue;
      const controller = new DockController(
        new PresetDockHost(this.host, preset.id, this.documentRegistry),
      );
      this.controllers.set(preset.id, controller);
      this.addChild(controller);
    }
  }
}
