import { Notice, Plugin } from "obsidian";
import { ICON_CACHE_DATA_KEY } from "./icon-cache";
import { LedgeIconLibrarySettingTab } from "./icon-library-setting-tab";
import {
  exportIconifyCache,
  restoreIconifyCache,
  syncIconifyCache,
} from "./icon-provider";
import { MultiDockController } from "./multi-dock";
import { SettingsStore } from "./services/settings-store";
import {
  addDockPreset,
  applyDockPreset,
  getDockPreset,
  hasLegacyHotCornerSettings,
  hasLegacySingleDockSettings,
  normalizeSettings,
  removeSelectedDockPreset,
  renameSelectedDockPreset,
  syncSelectedDockPreset,
} from "./settings";
import type { DockPresetSettings, LedgeSettings } from "./types";

export default class LedgePlugin extends Plugin {
  settings!: LedgeSettings;
  private controller: MultiDockController | null = null;
  private persistenceStore!: SettingsStore<Record<string, unknown>>;
  private unloaded = false;

  async onload(): Promise<void> {
    this.persistenceStore = new SettingsStore(
      (data) => this.saveData(data),
      { coalesceMs: 200 },
    );

    const storedSettings: unknown = await this.loadData();
    restoreIconifyCache(storedSettings);

    const shouldPersistMigration = hasLegacyHotCornerSettings(storedSettings)
      || hasLegacySingleDockSettings(storedSettings);
    this.settings = normalizeSettings(storedSettings);
    if (shouldPersistMigration) await this.savePersistedData();
    this.addSettingTab(new LedgeIconLibrarySettingTab(this.app, this));

    void this.syncExternalIcons(true).catch((error: unknown) => {
      console.error("[Ledge] Could not synchronize external icons", error);
    });

    this.addCommand({
      id: "toggle-dock",
      name: "Toggle selected dock",
      callback: () => {
        this.settings.enabled = !this.settings.enabled;
        const presetName = getDockPreset(this.settings, this.settings.selectedDockId)?.name ?? "Dock";
        void this.saveSettings().catch((error: unknown) => {
          console.error("[Ledge] Could not save selected Dock state", error);
        });
        new Notice(`${presetName} ${this.settings.enabled ? "enabled" : "hidden"}`);
      },
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.unloaded || this.controller) return;
      this.controller = new MultiDockController(this);
      this.addChild(this.controller);
    });
  }

  onunload(): void {
    this.unloaded = true;
    this.controller = null;
    void this.persistenceStore?.settle().catch((error: unknown) => {
      console.error("[Ledge] Could not flush pending settings on unload", error);
    });
  }

  async saveSettings(refresh = true, syncIcons = false): Promise<void> {
    syncSelectedDockPreset(this.settings);
    this.settings = normalizeSettings(this.settings);
    if (syncIcons) await syncIconifyCache(this.externalIconIds());
    if (refresh) this.controller?.applySettings();
    await this.savePersistedData(false);
  }

  getDockPresetRuntime(dockId: string): DockPresetSettings | null {
    return getDockPreset(this.settings, dockId);
  }

  async saveDockPresetRuntime(dockId: string, refresh = true): Promise<void> {
    if (dockId === this.settings.selectedDockId) {
      applyDockPreset(this.settings, dockId);
    }
    this.settings = normalizeSettings(this.settings);
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }

  async persistRuntimeSettings(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    if (getDockPreset(this.settings, this.settings.selectedDockId)) {
      applyDockPreset(this.settings, this.settings.selectedDockId);
    }
    await this.savePersistedData();
  }

  async selectDockPreset(dockId: string): Promise<boolean> {
    syncSelectedDockPreset(this.settings);
    if (!applyDockPreset(this.settings, dockId)) return false;
    this.settings = normalizeSettings(this.settings);
    await this.savePersistedData();
    return true;
  }

  async createDockPreset(duplicateSelected = false): Promise<boolean> {
    const created = addDockPreset(this.settings, duplicateSelected);
    if (!created) return false;
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    this.controller?.applySettings();
    return true;
  }

  async deleteSelectedDockPreset(): Promise<boolean> {
    if (!removeSelectedDockPreset(this.settings)) return false;
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    this.controller?.applySettings();
    return true;
  }

  async renameSelectedDockPreset(name: string): Promise<void> {
    syncSelectedDockPreset(this.settings);
    renameSelectedDockPreset(this.settings, name);
    await this.savePersistedData();
  }

  private externalIconIds(): string[] {
    return this.settings.docks.flatMap((dock) => dock.items.map((item) => item.builtInIcon));
  }

  private persistedSnapshot(): Record<string, unknown> {
    return {
      ...this.settings,
      [ICON_CACHE_DATA_KEY]: exportIconifyCache(),
    };
  }

  private savePersistedData(immediate = true): Promise<void> {
    const snapshot = this.persistedSnapshot();
    return immediate
      ? this.persistenceStore.flush(snapshot)
      : this.persistenceStore.schedule(snapshot);
  }

  private async syncExternalIcons(refresh: boolean): Promise<void> {
    const changed = await syncIconifyCache(this.externalIconIds());
    if (this.unloaded) return;
    if (changed) await this.savePersistedData();
    if (refresh) this.controller?.refreshIcons();
  }
}
