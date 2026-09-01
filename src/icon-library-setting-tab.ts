import {
  Notice,
  Setting,
  type App,
  type SettingDefinitionItem,
} from "obsidian";
import { openIconPicker } from "./icon-picker";
import type LedgePlugin from "./main";
import { availableDockPositions, MAX_DOCK_PRESETS } from "./settings";
import { LedgeSettingTab } from "./settings-tab";
import type { DockPosition, DockPresetSettings } from "./types";

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

type LayoutNumberKey =
  | "itemSize"
  | "iconSize"
  | "gap"
  | "padding"
  | "radius"
  | "edgeOffset";

type MutableSettingDefinition = {
  name?: string;
  desc?: string;
  cls?: string;
  control?: {
    type?: string;
    key?: string;
    options?: Record<string, string>;
  };
  render?: (setting: Setting) => void;
  items?: SettingDefinitionItem[];
};

/**
 * Adds the unified searchable built-in icon library plus the multi-dock preset
 * editor to Ledge's existing declarative settings.
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
    const layoutIndex = definitions.findIndex((definition) =>
      (definition as unknown as MutableSettingDefinition).cls === "ledge-settings-panel-layout");
    if (layoutIndex >= 0) definitions.splice(layoutIndex, 1, this.dockPresetListDefinitions());
    else definitions.splice(1, 0, this.dockPresetListDefinitions());
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

  private dockPresetListDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Docks",
      cls: "ledge-settings-panel-layout",
      items: [
        {
          name: "Dock presets",
          desc: `Each dock owns one exclusive edge or corner position. Open a dock below to edit its layout (${this.ledgePlugin.settings.docks.length}/${MAX_DOCK_PRESETS} used).`,
          searchable: false,
          render: (setting) => {
            setting.settingEl.addClass("ledge-dock-preset-toolbar");
            setting.addButton((button) => {
              button
                .setButtonText("Add dock")
                .setIcon("plus")
                .setTooltip("Add dock preset")
                .setDisabled(this.ledgePlugin.settings.docks.length >= MAX_DOCK_PRESETS)
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
          },
        },
        ...this.ledgePlugin.settings.docks.map((dock) => this.dockPresetCardDefinition(dock)),
      ],
    };
  }

  private dockPresetCardDefinition(dock: DockPresetSettings): SettingDefinitionItem {
    const selected = dock.id === this.ledgePlugin.settings.selectedDockId;
    return {
      name: dock.name,
      desc: `${POSITION_LABELS[dock.position]} · ${dock.enabled ? "Enabled" : "Hidden"}`,
      searchable: false,
      render: (setting) => {
        this.styleDockCard(setting, selected, dock.enabled);

        setting.addButton((button) => {
          button
            .setButtonText(selected ? "Editing" : "Edit")
            .setIcon(selected ? "chevron-down" : "chevron-right")
            .setTooltip(selected ? "This dock is open" : "Open dock layout")
            .setDisabled(selected)
            .onClick(() => {
              void this.ledgePlugin.selectDockPreset(dock.id).then((changed) => {
                if (changed) this.update();
              });
            });
        });

        setting.addButton((button) => {
          button
            .setIcon("copy")
            .setTooltip("Duplicate dock")
            .setDisabled(this.ledgePlugin.settings.docks.length >= MAX_DOCK_PRESETS)
            .onClick(() => this.duplicateDock(dock.id));
        });

        setting.addButton((button) => {
          button
            .setIcon("trash-2")
            .setTooltip("Delete dock")
            .setDisabled(this.ledgePlugin.settings.docks.length <= 1)
            .setDestructive()
            .onClick(() => this.deleteDock(dock.id));
        });

        if (!selected) return;
        const body = setting.settingEl.createDiv({ cls: "ledge-dock-preset-body" });
        body.setCssStyles({
          flex: "1 0 100%",
          width: "100%",
          marginTop: "var(--size-4-2)",
          paddingTop: "var(--size-4-2)",
          borderTop: "1px solid var(--background-modifier-border)",
        });
        this.renderDockLayoutSettings(body, dock.id, setting);
      },
    };
  }

  private styleDockCard(setting: Setting, selected: boolean, enabled: boolean): void {
    const card = setting.settingEl;
    card.addClass("ledge-dock-preset-card");
    card.classList.toggle("is-selected", selected);
    card.classList.toggle("is-disabled", !enabled);
    card.setCssStyles({
      flexWrap: "wrap",
      gap: "var(--size-4-2)",
      margin: "var(--size-4-2) 0",
      padding: "var(--size-4-3)",
      border: selected
        ? "1px solid var(--interactive-accent)"
        : "1px solid var(--background-modifier-border)",
      borderRadius: "var(--radius-m)",
      background: selected
        ? "color-mix(in srgb, var(--interactive-accent) 8%, var(--background-secondary))"
        : "var(--background-secondary)",
      opacity: enabled ? "1" : ".72",
    });
    setting.infoEl.setCssStyles({ flex: "1 1 220px" });
    setting.controlEl.setCssStyles({ flex: "0 0 auto", flexWrap: "wrap" });
  }

  private renderDockLayoutSettings(
    container: HTMLElement,
    dockId: string,
    parentSetting: Setting,
  ): void {
    const preset = this.ledgePlugin.getDockPresetRuntime(dockId);
    if (!preset) return;

    new Setting(container)
      .setName("Preset name")
      .setDesc("Name used to identify this dock in settings.")
      .addText((text) => {
        text
          .setPlaceholder("Dock 1")
          .setValue(preset.name)
          .onChange((value) => {
            const current = this.ledgePlugin.getDockPresetRuntime(dockId);
            if (!current) return;
            current.name = value;
            parentSetting.nameEl.textContent = value.trim() || "Dock";
            void this.ledgePlugin.saveDockPresetRuntime(dockId, false);
          });
      });

    new Setting(container)
      .setName("Enable dock")
      .setDesc("Show or hide this workspace dock without deleting its preset.")
      .addToggle((toggle) => {
        toggle
          .setValue(preset.enabled)
          .onChange((value) => {
            const current = this.ledgePlugin.getDockPresetRuntime(dockId);
            if (!current) return;
            current.enabled = value;
            void this.ledgePlugin.saveDockPresetRuntime(dockId).then(() => this.update());
          });
      });

    new Setting(container)
      .setName("Position")
      .setDesc("A position already assigned to another dock is not offered here.")
      .addDropdown((dropdown) => {
        for (const position of availableDockPositions(this.ledgePlugin.settings, dockId)) {
          dropdown.addOption(position, POSITION_LABELS[position]);
        }
        dropdown
          .setValue(preset.position)
          .onChange((value) => {
            const position = value as DockPosition;
            if (!availableDockPositions(this.ledgePlugin.settings, dockId).includes(position)) return;
            const current = this.ledgePlugin.getDockPresetRuntime(dockId);
            if (!current) return;
            current.position = position;
            void this.ledgePlugin.saveDockPresetRuntime(dockId).then(() => this.update());
          });
      });

    this.addDockSlider(container, dockId, "Item size", "Size of each dock button.", "itemSize", 30, 84, 1);
    this.addDockSlider(
      container,
      dockId,
      "Icon size",
      "Default icon size. Individual items can override it.",
      "iconSize",
      14,
      72,
      1,
    );
    this.addDockSlider(container, dockId, "Gap", "Space between dock items.", "gap", 0, 32, 1);
    this.addDockSlider(
      container,
      dockId,
      "Padding",
      "Space around items inside the dock surface.",
      "padding",
      0,
      32,
      1,
    );
    this.addDockSlider(
      container,
      dockId,
      "Corner radius",
      "Rounding of the dock surface and item tiles.",
      "radius",
      0,
      40,
      1,
    );
    this.addDockSlider(
      container,
      dockId,
      "Edge offset",
      "Move the dock inward from its selected pane edge.",
      "edgeOffset",
      0,
      160,
      1,
    );
  }

  private addDockSlider(
    container: HTMLElement,
    dockId: string,
    name: string,
    desc: string,
    key: LayoutNumberKey,
    minimum: number,
    maximum: number,
    step: number,
  ): void {
    const preset = this.ledgePlugin.getDockPresetRuntime(dockId);
    if (!preset) return;
    const numericPreset = preset as unknown as Record<LayoutNumberKey, number>;
    new Setting(container)
      .setName(name)
      .setDesc(desc)
      .addSlider((slider) => {
        slider
          .setLimits(minimum, maximum, step)
          .setValue(numericPreset[key])
          .onChange((value) => {
            const current = this.ledgePlugin.getDockPresetRuntime(dockId);
            if (!current) return;
            const numericCurrent = current as unknown as Record<LayoutNumberKey, number>;
            numericCurrent[key] = value;
            void this.ledgePlugin.saveDockPresetRuntime(dockId);
          });
      });
  }

  private duplicateDock(dockId: string): void {
    void this.ledgePlugin.selectDockPreset(dockId).then((selected) => {
      if (!selected) return false;
      return this.ledgePlugin.createDockPreset(true);
    }).then((created) => {
      if (created === false) {
        new Notice("All eight dock positions are already in use.");
        return;
      }
      if (created) this.update();
    });
  }

  private deleteDock(dockId: string): void {
    void this.ledgePlugin.selectDockPreset(dockId).then((selected) => {
      if (!selected) return false;
      return this.ledgePlugin.deleteSelectedDockPreset();
    }).then((deleted) => {
      if (deleted) this.update();
    });
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
