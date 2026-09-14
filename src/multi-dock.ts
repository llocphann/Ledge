import { Component, type App } from "obsidian";
import { DockController, type LedgeHost } from "./dock";
import { RuntimeCoordinator } from "./runtime/runtime-coordinator";
import type { DockPresetSettings, LedgeSettings } from "./types";

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
  ) {}

  get app(): App {
    return this.host.app;
  }

  get settings(): LedgeSettings {
    const preset = this.host.getDockPresetRuntime(this.dockId);
    // DockController only reads/writes DockSettings fields. The cast keeps the
    // existing controller contract while the preset owns those same fields.
    return (preset ?? this.host.settings) as LedgeSettings;
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

  constructor(private readonly host: MultiDockHost) {
    super();
  }

  onload(): void {
    this.reconcile();
    this.addChild(new RuntimeCoordinator({
      app: this.host.app,
      getSettings: () => this.host.settings,
      dockRuntimes: () => this.controllers.entries(),
      persistRuntimeSettings: () => this.host.persistRuntimeSettings(),
    }));
  }

  applySettings(): void {
    this.reconcile();
    for (const controller of this.controllers.values()) controller.applySettings();
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
      const controller = new DockController(new PresetDockHost(this.host, preset.id));
      this.controllers.set(preset.id, controller);
      this.addChild(controller);
    }
  }
}
