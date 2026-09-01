import {
  App,
  setIcon,
  type SettingDefinitionItem,
  type SettingGroupItem,
} from "obsidian";
import { IconPickerModal } from "./icon-picker";
import type LedgePlugin from "./main";
import { LedgeSettingTab } from "./settings-tab";
import type { DockItemSettings } from "./types";

export class LedgeSettingTabWithIcons extends LedgeSettingTab {
  constructor(app: App, private readonly plugin: LedgePlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      ...super.getSettingDefinitions(),
      {
        type: "group",
        heading: "Icon library",
        cls: "ledge-settings-panel-items",
        items: this.plugin.settings.items.map((item, index) =>
          this.iconLibraryDefinition(item, index),
        ),
      },
    ];
  }

  private iconLibraryDefinition(
    item: DockItemSettings,
    index: number,
  ): SettingGroupItem {
    const itemName = item.label || item.target || `Item ${index + 1}`;
    return {
      name: itemName,
      desc: item.iconSource === "lucide"
        ? `Current icon: ${item.icon || "circle"}`
        : "Switch this item to the built-in Lucide source to choose an icon here.",
      render: (setting) => {
        if (item.iconSource !== "lucide") {
          setting.addButton((button) =>
            button
              .setButtonText("Use built-in icons")
              .onClick(() => {
                item.iconSource = "lucide";
                item.icon = "circle";
                void this.plugin.saveSettings().then(() => this.update());
              }),
          );
          return;
        }

        const preview = setting.controlEl.createSpan({
          cls: "clickable-icon",
          attr: {
            "aria-label": item.icon ? `Current icon: ${item.icon}` : "No icon selected",
            title: item.icon || "No icon selected",
          },
        });
        setIcon(preview, item.icon || "circle");

        setting.addButton((button) =>
          button
            .setButtonText("Browse icons")
            .setIcon("search")
            .onClick(() => {
              new IconPickerModal(this.app, item.icon, (icon) => {
                item.icon = icon;
                void this.plugin.saveSettings().then(() => this.update());
              }).open();
            }),
        );
      },
    };
  }
}
