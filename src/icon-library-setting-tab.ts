import {
  Notice,
  type App,
  type Setting,
  type SettingDefinitionItem,
} from "obsidian";
import { openIconPicker } from "./icon-picker";
import type LedgePlugin from "./main";
import { availableDockPositions, MAX_DOCK_PRESETS } from "./settings";
import { LedgeSettingTab } from "./settings-tab";
import type { DockPosition } from "./types";

const POSITION_LABELS: Record<DockPosition, string> = {
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom",
  "top-left": "Top left (90°)",
  "top-right": "Top right (90°)",
  "bottom-left": "Bottom left (90°)",
  "bottom-right": "Bottom right (90°)",
};

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
 * Adds the unified searchable built-in icon library plus the multi-Dock preset
 * selector to Ledge's existing declarative settings.
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
    definitions.splice(1, 0, this.dockPresetDefinitions());
    this.decorateControls(definitions);
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

  private dockPresetDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      cls: "ledge-dock-preset-selector",
      items: [
        {
          name: "Dock preset",
          desc: `Each preset is rendered as its own Dock. One position can belong to only one Dock (${this.ledgePlugin.settings.docks.length}/${MAX_DOCK_PRESETS} used).`,
          searchable: false,
          render: (setting) => {
            setting.addDropdown((dropdown) => {
              for (const dock of this.ledgePlugin.settings.docks) {
                dropdown.addOption(
                  dock.id,
                  `${dock.name} — ${POSITION_LABELS[dock.position]}`,
                );
              }
              dropdown
                .setValue(this.ledgePlugin.settings.selectedDockId)
                .onChange((dockId) => {
                  void this.ledgePlugin.selectDockPreset(dockId).then((selected) => {
                    if (selected) this.update();
                  });
                });
            });

            setting.addButton((button) => {
              button
                .setButtonText("Add")
                .setIcon("plus")
                .setTooltip("Add dock preset")
                .onClick(() => {
                  void this.ledgePlugin.createDockPreset(false).then((created) => {
                    if (!created) {
                      new Notice("All eight dock positions are already in use.");
                      return;
                    }
                    this.update();
                  });
                });
            });

            setting.addButton((button) => {
              button
                .setButtonText("Duplicate")
                .setIcon("copy")
                .setTooltip("Duplicate selected dock preset")
                .onClick(() => {
                  void this.ledgePlugin.createDockPreset(true).then((created) => {
                    if (!created) {
                      new Notice("All eight dock positions are already in use.");
                      return;
                    }
                    this.update();
                  });
                });
            });

            setting.addButton((button) => {
              button
                .setButtonText("Delete")
                .setIcon("trash-2")
                .setTooltip("Delete selected dock preset")
                .setDisabled(this.ledgePlugin.settings.docks.length <= 1)
                .setDestructive()
                .onClick(() => {
                  void this.ledgePlugin.deleteSelectedDockPreset().then((deleted) => {
                    if (deleted) this.update();
                  });
                });
            });
          },
        },
        {
          name: "Preset name",
          desc: "Name used to identify this Dock while editing settings.",
          searchable: false,
          render: (setting) => {
            const preset = this.ledgePlugin.getDockPresetRuntime(
              this.ledgePlugin.settings.selectedDockId,
            );
            setting.addText((text) => {
              text
                .setPlaceholder("Dock 1")
                .setValue(preset?.name ?? "Dock")
                .onChange((value) => {
                  void this.ledgePlugin.renameSelectedDockPreset(value);
                });
            });
          },
        },
      ],
    };
  }

  private decorateControls(definitions: SettingDefinitionItem[]): void {
    for (const definition of definitions) {
      const mutable = definition as unknown as MutableSettingDefinition;
      if (Array.isArray(mutable.items)) {
        this.decorateControls(mutable.items);
      }

      const control = mutable.control;
      const key = control?.key;

      if (control?.type === "dropdown" && key === "position") {
        control.options = Object.fromEntries(
          availableDockPositions(this.ledgePlugin.settings)
            .map((position) => [position, POSITION_LABELS[position]]),
        );
        continue;
      }

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
