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
 * declarative settings without changing the stored Dock item schema.
 */
export class LedgeIconLibrarySettingTab extends LedgeSettingTab {
  constructor(
    app: App,
    ledge: LedgePlugin,
    private readonly pickerApp: App = app,
  ) {
    super(app, ledge);
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const definitions = super.getSettingDefinitions();
    this.decorateIconControls(definitions);
    return definitions;
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
        control.options = { ...control.options, lucide: "Built-in icon" };
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
}
