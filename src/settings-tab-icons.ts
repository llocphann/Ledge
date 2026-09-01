import { App, setIcon, type SettingDefinitionItem } from "obsidian";
import { IconPickerModal } from "./icon-picker";
import type LedgePlugin from "./main";
import { LedgeSettingTab } from "./settings-tab";
import type { DockItemSettings } from "./types";

export class LedgeSettingTabWithIcons extends LedgeSettingTab {
  constructor(app: App, private readonly plugin: LedgePlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const definitions = super.getSettingDefinitions();
    const dockItems = definitions.find((definition) =>
      definition.type === "list" && definition.heading === "Dock items",
    );
    if (!dockItems || dockItems.type !== "list") return definitions;

    for (const [index, page] of dockItems.items.entries()) {
      if (page.type !== "page") continue;
      const item = this.plugin.settings.items[index];
      if (!item) continue;

      const iconNameIndex = page.items.findIndex((definition) =>
        "name" in definition && definition.name === "Icon name",
      );
      const insertAt = iconNameIndex >= 0 ? iconNameIndex + 1 : page.items.length;
      page.items.splice(insertAt, 0, this.iconLibraryDefinition(item));
    }

    return definitions;
  }

  private iconLibraryDefinition(item: DockItemSettings): SettingDefinitionItem {
    return {
      name: "Icon library",
      desc: "Browse and search the Lucide icons included with your current Obsidian version.",
      visible: () => item.iconSource === "lucide",
      render: (setting) => {
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
