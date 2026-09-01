import { Notice, Plugin } from "obsidian";
import { DockController } from "./dock";
import { LedgeIconLibrarySettingTab } from "./icon-library-setting-tab";
import { ensureIconifyIcons } from "./icon-provider";
import { hasLegacyHotCornerSettings, normalizeSettings } from "./settings";
import type { LedgeSettings } from "./types";

export default class LedgePlugin extends Plugin {
  settings!: LedgeSettings;
  private controller: DockController | null = null;
  private unloaded = false;

  async onload(): Promise<void> {
    const storedSettings: unknown = await this.loadData();
    const shouldPersistTriggerMigration = hasLegacyHotCornerSettings(storedSettings);
    this.settings = normalizeSettings(storedSettings);
    if (shouldPersistTriggerMigration) await this.saveData(this.settings);
    this.addSettingTab(new LedgeIconLibrarySettingTab(this.app, this));

    void ensureIconifyIcons(
      this.settings.items
        .filter((item) => item.iconSource === "lucide")
        .map((item) => item.icon),
    ).then(() => {
      this.controller?.applySettings();
    });

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
    await this.saveData(this.settings);
    if (refresh) this.controller?.applySettings();
  }
}
