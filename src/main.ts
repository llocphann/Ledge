import { Notice, Plugin } from "obsidian";
import { DockController } from "./dock";
import { ICON_CACHE_DATA_KEY } from "./icon-cache";
import { LedgeIconLibrarySettingTab } from "./icon-library-setting-tab";
import {
  exportIconifyCache,
  restoreIconifyCache,
  syncIconifyCache,
} from "./icon-provider";
import { hasLegacyHotCornerSettings, normalizeSettings } from "./settings";
import type { LedgeSettings } from "./types";

export default class LedgePlugin extends Plugin {
  settings!: LedgeSettings;
  private controller: DockController | null = null;
  private unloaded = false;

  async onload(): Promise<void> {
    const storedSettings: unknown = await this.loadData();
    restoreIconifyCache(storedSettings);

    const shouldPersistTriggerMigration = hasLegacyHotCornerSettings(storedSettings);
    this.settings = normalizeSettings(storedSettings);
    if (shouldPersistTriggerMigration) await this.savePersistedData();
    this.addSettingTab(new LedgeIconLibrarySettingTab(this.app, this));

    void this.syncExternalIcons(true);

    this.addCommand({
      id: "toggle-dock",
      name: "Toggle dock",
      callback: () => {
        this.settings.enabled = !this.settings.enabled;
        void this.saveSettings();
        new Notice(`Ledge ${this.settings.enabled ? "enabled" : "hidden"}`);
      },
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.unloaded || this.controller) return;
      this.controller = new DockController(this);
      this.addChild(this.controller);
    });
  }

  onunload(): void {
    this.unloaded = true;
    this.controller = null;
  }

  async saveSettings(refresh = true): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }

  private externalIconIds(): string[] {
    return this.settings.items.map((item) => item.builtInIcon);
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
