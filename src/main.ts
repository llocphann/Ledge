import { Notice, Plugin } from "obsidian";
import { renameRememberedVaultIconPaths } from "./dock-paths";
import { ICON_CACHE_DATA_KEY } from "./icon-cache";
import { LedgeIconLibrarySettingTab } from "./icon-library-setting-tab";
import {
  exportIconifyCache,
  restoreIconifyCache,
  syncIconifyCache,
} from "./icon-provider";
import { MultiDockController } from "./multi-dock";
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
  private unloaded = false;

  async onload(): Promise<void> {
    const storedSettings: unknown = await this.loadData();
    restoreIconifyCache(storedSettings);

    const shouldPersistMigration = hasLegacyHotCornerSettings(storedSettings)
      || hasLegacySingleDockSettings(storedSettings);
    this.settings = normalizeSettings(storedSettings);
    if (shouldPersistMigration) await this.savePersistedData();
    this.addSettingTab(new LedgeIconLibrarySettingTab(this.app, this));

    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (!renameRememberedVaultIconPaths(this.settings, file.path, oldPath)) return;
      applyDockPreset(this.settings, this.settings.selectedDockId);
      void this.saveSettings(false);
    }));

    void this.syncExternalIcons(true);

    this.addCommand({
      id: "toggle-dock",
      name: "Toggle selected dock",
      callback: () => {
        this.settings.enabled = !this.settings.enabled;
        const presetName = getDockPreset(this.settings, this.settings.selectedDockId)?.name ?? "Dock";
        void this.saveSettings();
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
  }

  async saveSettings(refresh = true): Promise<void> {
    syncSelectedDockPreset(this.settings);
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }

  getDockPresetRuntime(dockId: string): DockPresetSettings | null {
    return getDockPreset(this.settings, dockId);
  }

  async saveDockPresetRuntime(dockId: string, refresh = true): Promise<void> {
    if (dockId === this.settings.selectedDockId) {
      applyDockPreset(this.settings, dockId);
    }
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
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

  private async savePersistedData(): Promise<void> {
    await this.saveData({
      ...this.settings,
      [ICON_CACHE_DATA_KEY]: exportIconifyCache(),
    });
  }

  private async syncExternalIcons(refresh: boolean): Promise<void> {
    const changed = await syncIconifyCache(this.externalIconIds());
    if (changed) await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }
}
