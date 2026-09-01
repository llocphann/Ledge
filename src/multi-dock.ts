import { Component, type App } from "obsidian";
import { DockController, type LedgeHost } from "./dock";
import type { DockPresetSettings, LedgeSettings } from "./types";

export interface MultiDockHost {
  app: App;
  settings: LedgeSettings;
  getDockPresetRuntime(dockId: string): DockPresetSettings | null;
  saveDockPresetRuntime(dockId: string, refresh?: boolean): Promise<void>;
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
 * Keeps one existing DockController per preset. This preserves the proven
 * single-dock rendering/interaction implementation while allowing all presets
 * to be visible at the same time at their exclusive positions.
 */
export class MultiDockController extends Component {
  private readonly controllers = new Map<string, DockController>();

  constructor(private readonly host: MultiDockHost) {
    super();
  }

  onload(): void {
    this.reconcile();
  }

  applySettings(): void {
    this.reconcile();
    for (const controller of this.controllers.values()) controller.applySettings();
  }

  private reconcile(): void {
    const desired = new Set(this.host.settings.docks.map((dock) => dock.id));

    for (const [dockId, controller] of this.controllers) {
      if (desired.has(dockId)) continue;
      this.removeChild(controller);
      this.controllers.delete(dockId);
    }

    for (const preset of this.host.settings.docks) {
      if (this.controllers.has(preset.id)) continue;
      const controller = new DockController(new PresetDockHost(this.host, preset.id));
      this.controllers.set(preset.id, controller);
      this.addChild(controller);
    }
  }
}
