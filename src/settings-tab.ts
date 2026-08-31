import {
  App,
  Notice,
  PluginSettingTab,
  normalizePath,
  setIcon,
  type SettingDefinitionItem,
  type SettingDefinitionPage,
  type TFile,
} from "obsidian";
import type LedgePlugin from "./main";
import { cloneDefaultSettings, createDockItem } from "./settings";
import type { DockItemSettings, DockPosition, LedgeSettings, SurfaceMode } from "./types";

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

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);
const FUNDING_URL = "https://www.buymeacoffee.com/llocphann";
const SETTINGS_TABS = [
  { id: "layout", label: "Layout", icon: "layout-dashboard" },
  { id: "behavior", label: "Behavior", icon: "timer" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "items", label: "Items", icon: "list" },
  { id: "about", label: "About", icon: "info" },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export class LedgeSettingTab extends PluginSettingTab {
  private resetArmed = false;
  private activeTab: SettingsTabId = "layout";

  constructor(app: App, private readonly ledge: LedgePlugin) {
    super(app, ledge);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      this.tabNavigationDefinitions(),
      this.layoutDefinitions(),
      this.behaviorDefinitions(),
      this.appearanceDefinitions(),
      this.itemDefinitions(),
      this.aboutDefinitions(),
    ];
  }

  getControlValue(key: string): unknown {
    const itemKey = this.parseItemKey(key);
    if (itemKey) {
      const item = this.ledge.settings.items.find((candidate) => candidate.id === itemKey.id);
      if (!item) return undefined;
      if (itemKey.field === "iconColorEnabled") return Boolean(item.iconColor);
      if (itemKey.field === "tileGradientEnabled") {
        return Boolean(item.tileGradientStart || item.tileGradientEnd);
      }
      return item[itemKey.field as keyof DockItemSettings];
    }

    if (key === "accentColorEnabled") return Boolean(this.ledge.settings.accentColor);
    if (key === "borderColorEnabled") return Boolean(this.ledge.settings.borderColor);
    return this.ledge.settings[key as keyof LedgeSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const itemKey = this.parseItemKey(key);
    if (itemKey) {
      const item = this.ledge.settings.items.find((candidate) => candidate.id === itemKey.id);
      if (!item) return;
      this.setItemValue(item, itemKey.field, value);
      await this.ledge.saveSettings();
      if (["iconSource", "iconColorEnabled", "tileGradientEnabled"].includes(itemKey.field)) {
        this.refreshDomState();
      }
      return;
    }

    if (key === "accentColorEnabled") {
      this.ledge.settings.accentColor = value === true ? "#7dd3fc" : "";
    } else if (key === "borderColorEnabled") {
      this.ledge.settings.borderColor = value === true ? "#64748b" : "";
    } else {
      this.setGlobalValue(key, value);
    }
    await this.ledge.saveSettings();
    if ([
      "autoHide",
      "magnification",
      "showDockBackground",
      "showDockBorder",
      "surfaceMode",
      "accentColorEnabled",
      "borderColorEnabled",
    ].includes(key)) {
      this.refreshDomState();
    }
  }

  private tabNavigationDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      cls: "ledge-settings-tabs-group",
      items: [
        {
          name: "Settings sections",
          searchable: false,
          render: (setting) => {
            this.containerEl.classList.add("ledge-settings-root");
            this.containerEl.dataset.ledgeSettingsTab = this.activeTab;
            setting.settingEl.classList.add("ledge-settings-tabs-setting");

            const tabList = setting.controlEl.createDiv({ cls: "ledge-settings-tabs" });
            tabList.setAttribute("role", "tablist");
            tabList.setAttribute("aria-label", "Ledge settings sections");
            const buttons: HTMLButtonElement[] = [];
            const cleanups: Array<() => void> = [];

            const activate = (tabId: SettingsTabId, focus = false): void => {
              this.activeTab = tabId;
              this.containerEl.dataset.ledgeSettingsTab = tabId;
              for (const candidate of buttons) {
                const selected = candidate.dataset.tabId === tabId;
                candidate.setAttribute("aria-selected", String(selected));
                candidate.tabIndex = selected ? 0 : -1;
                if (selected && focus) candidate.focus();
              }
            };

            for (const tab of SETTINGS_TABS) {
              const button = tabList.createEl("button", {
                cls: "ledge-settings-tab",
                attr: {
                  type: "button",
                  role: "tab",
                  "data-tab-id": tab.id,
                  "aria-selected": "false",
                },
              });
              const icon = button.createSpan({ cls: "ledge-settings-tab-icon" });
              setIcon(icon, tab.icon);
              button.createSpan({ text: tab.label });
              const onClick = (): void => activate(tab.id);
              button.addEventListener("click", onClick);
              cleanups.push(() => button.removeEventListener("click", onClick));
              buttons.push(button);
            }

            const onKeyDown = (event: KeyboardEvent): void => {
              if (!new Set(["ArrowLeft", "ArrowRight", "Home", "End"]).has(event.key)) {
                return;
              }
              const currentIndex = Math.max(0, buttons.indexOf(this.documentActiveButton(buttons)));
              let nextIndex = currentIndex;
              if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
              if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
              if (event.key === "Home") nextIndex = 0;
              if (event.key === "End") nextIndex = buttons.length - 1;
              const nextTab = SETTINGS_TABS[nextIndex];
              if (!nextTab) return;
              event.preventDefault();
              activate(nextTab.id, true);
            };
            tabList.addEventListener("keydown", onKeyDown);
            cleanups.push(() => tabList.removeEventListener("keydown", onKeyDown));
            activate(this.activeTab);
            return () => cleanups.forEach((cleanup) => cleanup());
          },
        },
      ],
    };
  }

  private layoutDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Layout",
      cls: "ledge-settings-panel-layout",
      items: [
        {
          name: "Enable dock",
          desc: "Show or hide the workspace dock without disabling its extension.",
          control: { type: "toggle", key: "enabled" },
        },
        {
          name: "Position",
          desc: "Corner positions arrange items as an L-shaped 90-degree dock.",
          control: { type: "dropdown", key: "position", options: POSITION_LABELS },
        },
        this.slider("Item size", "Size of each dock button.", "itemSize", 30, 84, 1, "px"),
        this.slider("Icon size", "Default icon size. Individual items can override it.", "iconSize", 14, 72, 1, "px"),
        this.slider("Gap", "Space between dock items.", "gap", 0, 32, 1, "px"),
        this.slider("Padding", "Space around items inside the dock surface.", "padding", 0, 32, 1, "px"),
        this.slider("Corner radius", "Rounding of the dock surface and item tiles.", "radius", 0, 40, 1, "px"),
        this.slider("Edge offset", "Move the dock inward from its selected pane edge.", "edgeOffset", 0, 160, 1, "px"),
      ],
    };
  }

  private behaviorDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Reveal behavior",
      cls: "ledge-settings-panel-behavior",
      items: [
        {
          name: "Auto-hide",
          desc: "Keep only a small edge trigger visible until the dock is hovered or focused.",
          control: { type: "toggle", key: "autoHide" },
        },
        {
          ...this.slider("Reveal delay", "Time spent hovering the edge before the dock appears.", "revealDelay", 0, 3000, 25, "ms"),
          visible: () => this.ledge.settings.autoHide,
        },
        {
          ...this.slider("Hide delay", "How long the dock remains visible after the pointer leaves.", "hideDelay", 0, 10000, 50, "ms"),
          visible: () => this.ledge.settings.autoHide,
        },
        {
          ...this.slider("Trigger size", "Thickness of the edge activation area.", "triggerSize", 4, 48, 1, "px"),
          visible: () => this.ledge.settings.autoHide,
        },
        this.slider("Motion duration", "Duration of reveal, hide, and magnification transitions.", "motionDuration", 0, 1000, 10, "ms"),
        {
          name: "Magnification",
          desc: "Magnify the focused item and its immediate neighbors.",
          control: { type: "toggle", key: "magnification" },
        },
        {
          ...this.slider("Focused scale", "Maximum scale of the hovered or keyboard-focused item.", "magnificationScale", 1, 2, 0.05, "×"),
          visible: () => this.ledge.settings.magnification,
        },
        {
          ...this.slider("Neighbor scale", "Scale of the items directly beside the focused item.", "neighborScale", 1, 1.6, 0.05, "×"),
          visible: () => this.ledge.settings.magnification,
        },
        {
          name: "Show labels",
          desc: "Display an item label while its button is hovered or focused.",
          control: { type: "toggle", key: "showLabels" },
        },
      ],
    };
  }

  private appearanceDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Appearance",
      cls: "ledge-settings-panel-appearance",
      items: [
        {
          name: "Show dock background",
          desc: "Show the shared surface behind dock items. Item tiles remain visible when this is off.",
          control: { type: "toggle", key: "showDockBackground" },
        },
        {
          name: "Show dock border",
          desc: "Show the outer border around the dock surface. Item tile borders are unaffected.",
          control: { type: "toggle", key: "showDockBorder" },
        },
        {
          name: "Surface",
          desc: "Theme mode follows the active palette. Solid and gradient modes use custom colors.",
          control: {
            type: "dropdown",
            key: "surfaceMode",
            options: {
              theme: "Theme palette",
              solid: "Solid color",
              gradient: "Gradient",
            },
          },
          visible: () => this.ledge.settings.showDockBackground,
        },
        {
          ...this.slider("Surface opacity", "Opacity of the surface without fading its icons.", "surfaceOpacity", 0, 100, 1, "%"),
          visible: () => this.ledge.settings.showDockBackground,
        },
        {
          name: "Surface color",
          control: { type: "color", key: "surfaceColor" },
          visible: () => this.ledge.settings.showDockBackground
            && this.ledge.settings.surfaceMode === "solid",
        },
        {
          name: "Gradient start",
          control: { type: "color", key: "gradientStart" },
          visible: () => this.ledge.settings.showDockBackground
            && this.ledge.settings.surfaceMode === "gradient",
        },
        {
          name: "Gradient end",
          control: { type: "color", key: "gradientEnd" },
          visible: () => this.ledge.settings.showDockBackground
            && this.ledge.settings.surfaceMode === "gradient",
        },
        {
          ...this.slider("Gradient angle", "Direction of the surface gradient.", "gradientAngle", 0, 360, 1, "°"),
          visible: () => this.ledge.settings.showDockBackground
            && this.ledge.settings.surfaceMode === "gradient",
        },
        {
          name: "Custom accent color",
          desc: "Disable this option to use the active theme accent.",
          control: { type: "toggle", key: "accentColorEnabled" },
        },
        {
          name: "Accent color",
          control: { type: "color", key: "accentColor" },
          visible: () => Boolean(this.ledge.settings.accentColor),
        },
        {
          name: "Custom border color",
          desc: "Disable this option to use the active theme border.",
          control: { type: "toggle", key: "borderColorEnabled" },
          visible: () => this.ledge.settings.showDockBorder,
        },
        {
          name: "Border color",
          control: { type: "color", key: "borderColor" },
          visible: () => this.ledge.settings.showDockBorder
            && Boolean(this.ledge.settings.borderColor),
        },
      ],
    };
  }

  private itemDefinitions(): SettingDefinitionItem {
    return {
      type: "list",
      heading: "Dock items",
      cls: "ledge-settings-panel-items",
      emptyState: "No dock items. Add one to create a shortcut.",
      items: this.ledge.settings.items.map((item, index) => this.itemPage(item, index)),
      addItem: {
        name: "Add dock item",
        action: () => {
          this.ledge.settings.items.push(createDockItem(this.ledge.settings.items));
          void this.ledge.saveSettings().then(() => this.update());
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const [item] = this.ledge.settings.items.splice(oldIndex, 1);
        if (!item) return;
        this.ledge.settings.items.splice(newIndex, 0, item);
        void this.ledge.saveSettings().then(() => this.update());
      },
      onDelete: (index) => {
        this.ledge.settings.items.splice(index, 1);
        void this.ledge.saveSettings().then(() => this.update());
      },
    };
  }

  private aboutDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "About & support",
      cls: "ledge-settings-panel-about",
      items: [
        {
          name: `Ledge ${this.ledge.manifest.version}`,
          desc: "A configurable navigation dock for the edge of your Obsidian workspace.",
          searchable: false,
        },
        {
          name: "Restore defaults",
          desc: "Replace every layout, appearance, behavior, and item setting with the original defaults.",
          action: () => this.restoreDefaults(),
        },
        {
          name: "Buy me a coffee",
          desc: "If Ledge is useful to you, you can support its continued development.",
          searchable: false,
          render: (setting) => {
            const link = setting.controlEl.createEl("a", {
              cls: "mod-cta ledge-support-link",
              attr: {
                href: FUNDING_URL,
                target: "_blank",
                rel: "noopener noreferrer",
                "aria-label": "Buy me a coffee",
              },
            });
            const icon = link.createSpan({ cls: "ledge-support-link-icon" });
            setIcon(icon, "coffee");
            link.createSpan({ text: "Buy me a coffee" });
          },
        },
      ],
    };
  }

  private documentActiveButton(buttons: HTMLButtonElement[]): HTMLButtonElement {
    const activeElement = this.containerEl.ownerDocument.activeElement;
    return buttons.find((button) => button === activeElement) || buttons[0]!;
  }

  private itemPage(item: DockItemSettings, index: number): SettingDefinitionPage {
    const key = (field: string): string => `item:${item.id}:${field}`;
    return {
      type: "page",
      name: item.label || item.target || `Item ${index + 1}`,
      desc: item.target || "No target path",
      displayValue: () => item.enabled ? "Enabled" : "Hidden",
      status: () => this.targetExists(item.target) ? null : "warning",
      items: [
        {
          name: "Enabled",
          control: { type: "toggle", key: key("enabled") },
        },
        {
          name: "Label",
          control: { type: "text", key: key("label"), placeholder: "Books" },
        },
        {
          name: "Target path",
          desc: "Vault-relative path to a note, base file, canvas, or another file.",
          control: { type: "file", key: key("target"), placeholder: "Folder/Note.md" },
        },
        {
          name: "Icon source",
          control: {
            type: "dropdown",
            key: key("iconSource"),
            options: {
              lucide: "Built-in Lucide icon",
              vault: "Image in vault",
            },
          },
        },
        {
          name: "Icon name",
          desc: "Lucide icon ID, for example library, home, or dumbbell.",
          control: { type: "text", key: key("icon"), placeholder: "circle" },
          visible: () => item.iconSource === "lucide",
        },
        {
          name: "Icon path",
          desc: "Choose a PNG, JPEG, WebP, GIF, or SVG file stored in the vault.",
          control: {
            type: "file",
            key: key("icon"),
            placeholder: "Assets/icon.png",
            filter: (file: TFile) => IMAGE_EXTENSIONS.has(file.extension.toLowerCase()),
          },
          visible: () => item.iconSource === "vault",
        },
        {
          name: "Image rendering",
          desc: "Tint creates a theme-colored silhouette. Original preserves source colors.",
          control: {
            type: "dropdown",
            key: key("iconRenderMode"),
            options: { tint: "Tint", original: "Original colors" },
          },
          visible: () => item.iconSource === "vault",
        },
        {
          name: "Icon size override",
          desc: "Set to 0 to inherit the global icon size.",
          control: {
            type: "slider",
            key: key("iconSize"),
            min: 0,
            max: 96,
            step: 1,
            displayFormat: (value) => value === 0 ? "Global" : `${value}px`,
          },
        },
        {
          name: "Custom icon color",
          desc: "Disable this option to inherit the dock accent.",
          control: { type: "toggle", key: key("iconColorEnabled") },
        },
        {
          name: "Icon color",
          control: { type: "color", key: key("iconColor") },
          visible: () => Boolean(item.iconColor),
        },
        {
          name: "Custom tile gradient",
          desc: "Override the shared tile colors for this item.",
          control: { type: "toggle", key: key("tileGradientEnabled") },
        },
        {
          name: "Tile gradient start",
          control: { type: "color", key: key("tileGradientStart") },
          visible: () => Boolean(item.tileGradientStart || item.tileGradientEnd),
        },
        {
          name: "Tile gradient end",
          control: { type: "color", key: key("tileGradientEnd") },
          visible: () => Boolean(item.tileGradientStart || item.tileGradientEnd),
        },
      ],
    };
  }

  private slider(
    name: string,
    desc: string,
    key: string,
    min: number,
    max: number,
    step: number,
    suffix: string,
  ) {
    return {
      name,
      desc,
      control: {
        type: "slider" as const,
        key,
        min,
        max,
        step,
        displayFormat: (value: number) => `${value}${suffix}`,
      },
    };
  }

  private targetExists(target: string): boolean {
    const normalized = normalizePath(target.trim());
    if (!normalized) return false;
    return Boolean(
      this.ledge.app.vault.getFileByPath(normalized)
      || this.ledge.app.metadataCache.getFirstLinkpathDest(normalized, ""),
    );
  }

  private parseItemKey(key: string): { id: string; field: string } | null {
    if (!key.startsWith("item:")) return null;
    const [, id, ...fieldParts] = key.split(":");
    if (!id || fieldParts.length === 0) return null;
    return { id, field: fieldParts.join(":") };
  }

  private setItemValue(item: DockItemSettings, field: string, value: unknown): void {
    if (field === "iconColorEnabled") {
      item.iconColor = value === true ? "#7dd3fc" : "";
      return;
    }
    if (field === "tileGradientEnabled") {
      item.tileGradientStart = value === true ? "#334155" : "";
      item.tileGradientEnd = value === true ? "#111827" : "";
      return;
    }
    if (field === "enabled") item.enabled = value === true;
    else if (field === "iconSize") item.iconSize = Number(value);
    else if (field === "iconSource") item.iconSource = value === "vault" ? "vault" : "lucide";
    else if (field === "iconRenderMode") item.iconRenderMode = value === "original" ? "original" : "tint";
    else if (["label", "target", "icon", "iconColor", "tileGradientStart", "tileGradientEnd"].includes(field)) {
      item[field as "label"] = typeof value === "string" ? value : "";
    }
  }

  private setGlobalValue(key: string, value: unknown): void {
    const settings = this.ledge.settings;
    if ([
      "enabled",
      "autoHide",
      "showLabels",
      "magnification",
      "showDockBackground",
      "showDockBorder",
    ].includes(key)) {
      settings[key as "enabled"] = value === true;
    } else if (key === "position") {
      settings.position = value as DockPosition;
    } else if (key === "surfaceMode") {
      settings.surfaceMode = value as SurfaceMode;
    } else if ([
      "itemSize", "iconSize", "gap", "padding", "radius", "edgeOffset", "triggerSize",
      "revealDelay", "hideDelay", "motionDuration", "magnificationScale", "neighborScale",
      "surfaceOpacity", "gradientAngle",
    ].includes(key)) {
      settings[key as "itemSize"] = Number(value);
    } else if (["surfaceColor", "gradientStart", "gradientEnd", "accentColor", "borderColor"].includes(key)) {
      settings[key as "surfaceColor"] = typeof value === "string" ? value : "";
    }
  }

  private restoreDefaults(): void {
    if (!this.resetArmed) {
      this.resetArmed = true;
      new Notice("Select restore defaults again to confirm.");
      return;
    }
    this.resetArmed = false;
    this.ledge.settings = cloneDefaultSettings();
    void this.ledge.saveSettings().then(() => this.update());
  }
}
