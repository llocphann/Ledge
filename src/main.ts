import { Notice, Plugin } from "obsidian";
import { DockController } from "./dock";
import { LedgeSettingTab } from "./settings-tab";
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
    await this.migrateLegacyDockOrder();
    if (shouldPersistTriggerMigration) await this.saveData(this.settings);
    this.addSettingTab(new LedgeSettingTab(this.app, this));

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

  private async migrateLegacyDockOrder(): Promise<void> {
    if (this.settings.legacyOrderMigrated) return;
    this.settings.legacyOrderMigrated = true;
    try {
      const vaultName = this.app.vault.getName();
      const storageKey = `custom-views:homepage-v2:dock-order:${encodeURIComponent(vaultName)}`;
      const raw = this.app.workspace.containerEl.win.localStorage.getItem(storageKey);
      const legacyOrder: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(legacyOrder)) {
        const rank = new Map(
          legacyOrder
            .filter((target): target is string => typeof target === "string")
            .map((target, index) => [target, index]),
        );
        this.settings.items.sort((left, right) => {
          const leftRank = rank.get(left.target) ?? Number.MAX_SAFE_INTEGER;
          const rightRank = rank.get(right.target) ?? Number.MAX_SAFE_INTEGER;
          return leftRank - rightRank;
        });
      }
    } catch (error) {
      console.debug("[Ledge] Could not migrate the previous dock order", error);
    }
    await this.saveData(this.settings);
  }
}
