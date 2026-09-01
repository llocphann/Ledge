import {
  type App,
  type Setting,
  type SettingDefinitionItem,
} from "obsidian";
import { openIconPicker } from "./icon-picker";
import type LedgePlugin from "./main";
import { LedgeSettingTab } from "./settings-tab";

type MutableSettingDefinition = {
  name?: string;
  desc?: string;
  control?: {
    type?: string;
    key?: string;
    options?: Record<string, string>;
  };
  render?: (setting: Setting) => void;
  items?: SettingDefinitionItem[];
};

/**
 * Adds the unified searchable built-in icon library to Ledge's existing
 * declarative settings and keeps separate values for each icon source.
 */
export class LedgeIconLibrarySettingTab extends LedgeSettingTab {
  constructor(
    app: App,
    private readonly ledgePlugin: LedgePlugin,
    private readonly pickerApp: App = app,
  ) {
    super(app, ledgePlugin);
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const definitions = super.getSettingDefinitions();
    this.decorateIconControls(definitions);
    return definitions;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    const itemKey = this.parseIconItemKey(key);
    if (!itemKey) {
      await super.setControlValue(key, value);
      return;
    }

    const item = this.ledgePlugin.settings.items.find((candidate) => candidate.id === itemKey.id);
    if (!item) return;

    if (itemKey.field === "iconSource") {
      if (item.iconSource === "vault") item.vaultIconPath = item.icon;
      else item.builtInIcon = item.icon;

      item.iconSource = value === "vault" ? "vault" : "lucide";
      item.icon = item.iconSource === "vault" ? item.vaultIconPath : item.builtInIcon;
      await this.ledgePlugin.saveSettings();

      // saveSettings normalizes Dock items into new objects, so rebuild the page
      // instead of evaluating visibility closures that still reference the old item.
      this.update();
      return;
    }

    if (itemKey.field === "icon") {
      const icon = typeof value === "string" ? value : "";
      item.icon = icon;
      if (item.iconSource === "vault") item.vaultIconPath = icon;
      else item.builtInIcon = icon;
      await this.ledgePlugin.saveSettings();
      return;
    }

    await super.setControlValue(key, value);
  }

  private decorateIconControls(definitions: SettingDefinitionItem[]): void {
    for (const definition of definitions) {
      const mutable = definition as unknown as MutableSettingDefinition;
      if (Array.isArray(mutable.items)) {
        this.decorateIconControls(mutable.items);
      }

      const control = mutable.control;
      const key = control?.key;
      if (
        control?.type === "dropdown"
        && key?.startsWith("item:")
        && key.endsWith(":iconSource")
        && control.options
      ) {
        control.options = {
          ...control.options,
          lucide: "Built-in icon",
          vault: "Icon in vault",
        };
        continue;
      }

      if (control?.type !== "text" || !key?.startsWith("item:") || !key.endsWith(":icon")) {
        continue;
      }

      mutable.name = "Icon";
      mutable.desc = "Choose from the built-in icon library or type an Obsidian icon ID manually.";
      delete mutable.control;
      mutable.render = (setting) => this.renderIconControl(setting, key);
    }
  }

  private renderIconControl(setting: Setting, key: string): void {
    const storedValue = this.getControlValue(key);
    const initialValue = typeof storedValue === "string" ? storedValue : "";
    let setTextValue: ((value: string) => void) | null = null;

    setting.controlEl.addClass("ledge-icon-setting-control");
    setting.addText((text) => {
      text
        .setPlaceholder("Home")
        .setValue(initialValue)
        .onChange((value) => {
          void this.setControlValue(key, value);
        });
      text.inputEl.setAttribute("aria-label", "Icon ID");
      setTextValue = (value) => {
        text.setValue(value);
      };
    });

    setting.addButton((button) => {
      button
        .setButtonText("Browse icons")
        .setIcon("shapes")
        .onClick(() => {
          openIconPicker(this.pickerApp, (iconId) => {
            setTextValue?.(iconId);
            void this.setControlValue(key, iconId);
          });
        });
    });
  }

  private parseIconItemKey(key: string): { id: string; field: string } | null {
    if (!key.startsWith("item:")) return null;
    const [, id, ...fieldParts] = key.split(":");
    if (!id || fieldParts.length === 0) return null;
    const field = fieldParts.join(":");
    if (field !== "icon" && field !== "iconSource") return null;
    return { id, field };
  }
}
