import {
  AbstractInputSuggest,
  App,
  Notice,
  PluginSettingTab,
  Setting,
  normalizePath,
  prepareSimpleSearch,
  setIcon,
  type SettingDefinitionItem,
  type SettingDefinitionPage,
  type TFile,
} from "obsidian";
import type LedgePlugin from "./main";
import { cloneDefaultSettings, createDockItem, createVisibilityRule } from "./settings";
import { parseLedgeSettingsImport, serializeLedgeSettings } from "./settings-transfer";
import {
  CONTEXT_MATCH_TYPES,
  type ContextMatchType,
  type DockItemSettings,
  type DockPosition,
  type DockVisibilityRule,
  type LedgeSettings,
  type SurfaceMode,
} from "./types";

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
const MAX_IMPORT_BYTES = 1024 * 1024;
const TARGET_SUGGESTION_LIMIT = 50;
const PRIMARY_TARGET_EXTENSIONS = new Set(["md", "base", "canvas"]);

function isTargetSuggestion(file: TFile): boolean {
  if (!PRIMARY_TARGET_EXTENSIONS.has(file.extension.toLowerCase())) return false;
  return !file.path.split("/").some((segment) => segment === ".git" || segment === "node_modules");
}

class DockTargetSuggest extends AbstractInputSuggest<TFile> {
  private readonly files: TFile[];

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.limit = TARGET_SUGGESTION_LIMIT;
    this.files = app.vault.getFiles();
  }

  protected getSuggestions(query: string): TFile[] {
    const normalized = query.trim();
    const search = normalized ? prepareSimpleSearch(normalized) : null;
    const suggestions: TFile[] = [];
    for (const file of this.files) {
      if (!isTargetSuggestion(file)) continue;
      if (search && !search(file.path)) continue;
      suggestions.push(file);
      if (suggestions.length >= TARGET_SUGGESTION_LIMIT) break;
    }
    return suggestions;
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ text: file.name });
    if (file.path !== file.name) {
      el.createDiv({ cls: "ledge-target-suggestion-path", text: file.path });
    }
  }
}

const SETTINGS_TABS = [
  { id: "layout", label: "Layout", icon: "layout-dashboard" },
  { id: "behavior", label: "Behavior", icon: "timer" },
  { id: "visibility", label: "Visibility", icon: "list-filter" },
  { id: "trigger", label: "Trigger", icon: "mouse-pointer-2" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "items", label: "Items", icon: "list" },
  { id: "data", label: "Data", icon: "database-backup" },
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
      ...this.visibilityDefinitions(),
      this.triggerDefinitions(),
      this.appearanceDefinitions(),
      this.itemDefinitions(),
      this.dataDefinitions(),
      this.aboutDefinitions(),
    ];
  }

  getControlValue(key: string): unknown {
    const visibilityKey = this.parseVisibilityRuleKey(key);
    if (visibilityKey) {
      const rule = this.findVisibilityRule(visibilityKey.kind, visibilityKey.id);
      return rule?.[visibilityKey.field as keyof DockVisibilityRule];
    }
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
    if (key === "triggerBorderColorEnabled") {
      return Boolean(this.ledge.settings.triggerBorderColor);
    }
    if (key === "triggerAreaBorderColorEnabled") {
      return Boolean(this.ledge.settings.triggerAreaBorderColor);
    }
    return this.ledge.settings[key as keyof LedgeSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const visibilityKey = this.parseVisibilityRuleKey(key);
    if (visibilityKey) {
      const rule = this.findVisibilityRule(visibilityKey.kind, visibilityKey.id);
      if (!rule) return;
      this.setVisibilityRuleValue(rule, visibilityKey.field, value);
      await this.ledge.saveSettings();
      if (["matchType", "enabled"].includes(visibilityKey.field)) this.update();
      return;
    }
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
    } else if (key === "triggerBorderColorEnabled") {
      this.ledge.settings.triggerBorderColor = value === true ? "#64748b" : "";
    } else if (key === "triggerAreaBorderColorEnabled") {
      this.ledge.settings.triggerAreaBorderColor = value === true ? "#64748b" : "";
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
      "showTrigger",
      "triggerShowBackground",
      "triggerShowBorder",
      "triggerSurfaceMode",
      "triggerBorderColorEnabled",
      "triggerAreaShowBackground",
      "triggerAreaShowBorder",
      "triggerAreaSurfaceMode",
      "triggerAreaBorderColorEnabled",
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

  private visibilityDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "Context visibility",
        cls: "ledge-settings-panel-visibility",
        items: [
          {
            name: "Rule priority",
            desc: "With no enabled include rules, Ledge appears everywhere. Enabled include rules restrict where it may appear, and an enabled exclude rule always wins. Rules can match a note name, exact path, folder, or tag.",
            searchable: false,
          },
        ],
      },
      this.visibilityRuleList("include"),
      this.visibilityRuleList("exclude"),
    ];
  }

  private visibilityRuleList(kind: "include" | "exclude"): SettingDefinitionItem {
    const rules = kind === "include"
      ? this.ledge.settings.includeRules
      : this.ledge.settings.excludeRules;
    const include = kind === "include";
    return {
      type: "list",
      heading: include ? "Show Dock in" : "Hide Dock in",
      cls: "ledge-settings-panel-visibility",
      emptyState: include
        ? "No include rules. The Dock is allowed everywhere unless excluded."
        : "No exclude rules.",
      items: rules.map((rule, index) => this.visibilityRulePage(rule, index, kind)),
      addItem: {
        name: include ? "Add include rule" : "Add exclude rule",
        action: () => {
          rules.push(createVisibilityRule(rules, kind));
          void this.ledge.saveSettings().then(() => this.update());
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const [rule] = rules.splice(oldIndex, 1);
        if (!rule) return;
        rules.splice(newIndex, 0, rule);
        void this.ledge.saveSettings().then(() => this.update());
      },
      onDelete: (index) => {
        rules.splice(index, 1);
        void this.ledge.saveSettings().then(() => this.update());
      },
    };
  }

  private visibilityRulePage(
    rule: DockVisibilityRule,
    index: number,
    kind: "include" | "exclude",
  ): SettingDefinitionPage {
    const key = (field: string): string => `visibility:${kind}:${rule.id}:${field}`;
    return {
      type: "page",
      name: rule.matchValue || `${kind === "include" ? "Include" : "Exclude"} rule ${index + 1}`,
      desc: kind === "include" ? "Allow the Dock in this context." : "Hide the Dock in this context.",
      displayValue: () => rule.enabled ? CONTEXT_MATCH_TYPES[rule.matchType] : "Disabled",
      status: () => !rule.enabled || rule.matchValue ? null : "warning",
      items: [
        {
          name: "Enabled",
          control: { type: "toggle", key: key("enabled") },
        },
        {
          name: "Match by",
          desc: "Tag rules also match nested tags. Folder rules include every descendant file.",
          control: {
            type: "dropdown",
            key: key("matchType"),
            options: CONTEXT_MATCH_TYPES,
          },
        },
        {
          name: "Exact file path",
          desc: "Choose one file in the vault.",
          control: {
            type: "file",
            key: key("matchValue"),
            placeholder: "Folder/Note.md",
          },
          visible: () => rule.matchType === "path",
        },
        {
          name: rule.matchType === "note"
            ? "Note name"
            : rule.matchType === "folder"
              ? "Folder path"
              : "Tag",
          desc: rule.matchType === "note"
            ? "The .md extension is optional."
            : rule.matchType === "folder"
              ? "Use a vault-relative folder path."
              : "A leading # is optional.",
          control: {
            type: "text",
            key: key("matchValue"),
            placeholder: rule.matchType === "note"
              ? "Homepage"
              : rule.matchType === "folder"
                ? "20_Personal_Life/25_Media_Tracker"
                : "#media/movies",
          },
          visible: () => rule.matchType !== "path",
        },
      ],
    };
  }

  private triggerDefinitions(): SettingDefinitionItem {
    const enabled = (): boolean => this.ledge.settings.autoHide;
    const areaBackgroundVisible = (): boolean => enabled()
      && this.ledge.settings.triggerAreaShowBackground;
    const areaBorderVisible = (): boolean => enabled()
      && this.ledge.settings.triggerAreaShowBorder;
    const surfaceVisible = (): boolean => enabled() && this.ledge.settings.showTrigger;
    const backgroundVisible = (): boolean => surfaceVisible()
      && this.ledge.settings.triggerShowBackground;
    const borderVisible = (): boolean => surfaceVisible()
      && this.ledge.settings.triggerShowBorder;

    return {
      type: "group",
      heading: "Edge trigger",
      cls: "ledge-settings-panel-trigger",
      items: [
        {
          name: "Edge trigger",
          desc: "This activation strip stays attached to the active root pane. It is used only while auto-hide is enabled.",
          searchable: false,
        },
        {
          ...this.slider(
            "Activation thickness",
            "Thickness of the pointer-sensitive area along the pane edge.",
            "triggerSize",
            4,
            64,
            1,
            "px",
          ),
          visible: enabled,
        },
        {
          ...this.slider(
            "Activation length",
            "Length of the pointer-sensitive area along a straight pane edge.",
            "triggerLength",
            24,
            360,
            2,
            "px",
          ),
          visible: enabled,
        },
        {
          name: "Activation area",
          desc: "The rectangle around the pill is the pointer-sensitive hitbox. When its background is transparent, the active pane or theme color shows through. These controls paint that outer area without changing its hover size.",
          searchable: false,
          visible: enabled,
        },
        {
          name: "Show activation area background",
          desc: "Draw a controllable background behind the pill instead of exposing the pane background directly.",
          control: { type: "toggle", key: "triggerAreaShowBackground" },
          visible: enabled,
        },
        {
          name: "Activation area background style",
          control: {
            type: "dropdown",
            key: "triggerAreaSurfaceMode",
            options: {
              theme: "Theme palette",
              solid: "Solid color",
              gradient: "Gradient",
            },
          },
          visible: areaBackgroundVisible,
        },
        {
          ...this.slider(
            "Activation area opacity",
            "Opacity of the background around the pill.",
            "triggerAreaSurfaceOpacity",
            0,
            100,
            1,
            "%",
          ),
          visible: areaBackgroundVisible,
        },
        {
          name: "Activation area solid color",
          control: { type: "color", key: "triggerAreaSurfaceColor" },
          visible: () => areaBackgroundVisible()
            && this.ledge.settings.triggerAreaSurfaceMode === "solid",
        },
        {
          name: "Activation area gradient start",
          control: { type: "color", key: "triggerAreaGradientStart" },
          visible: () => areaBackgroundVisible()
            && this.ledge.settings.triggerAreaSurfaceMode === "gradient",
        },
        {
          name: "Activation area gradient end",
          control: { type: "color", key: "triggerAreaGradientEnd" },
          visible: () => areaBackgroundVisible()
            && this.ledge.settings.triggerAreaSurfaceMode === "gradient",
        },
        {
          ...this.slider(
            "Activation area gradient angle",
            "Direction of the outer hitbox gradient.",
            "triggerAreaGradientAngle",
            0,
            360,
            1,
            "°",
          ),
          visible: () => areaBackgroundVisible()
            && this.ledge.settings.triggerAreaSurfaceMode === "gradient",
        },
        {
          ...this.slider(
            "Activation area radius",
            "Rounding of the outer pointer-sensitive rectangle.",
            "triggerAreaRadius",
            0,
            40,
            1,
            "px",
          ),
          visible: enabled,
        },
        {
          name: "Show activation area border",
          control: { type: "toggle", key: "triggerAreaShowBorder" },
          visible: enabled,
        },
        {
          ...this.slider(
            "Activation area border width",
            "Thickness of the outer hitbox outline.",
            "triggerAreaBorderWidth",
            0,
            6,
            1,
            "px",
          ),
          visible: areaBorderVisible,
        },
        {
          name: "Custom activation area border color",
          desc: "Disable this option to use the active theme border color.",
          control: { type: "toggle", key: "triggerAreaBorderColorEnabled" },
          visible: areaBorderVisible,
        },
        {
          name: "Activation area border color",
          control: { type: "color", key: "triggerAreaBorderColor" },
          visible: () => areaBorderVisible()
            && Boolean(this.ledge.settings.triggerAreaBorderColor),
        },
        {
          ...this.slider(
            "Reveal delay",
            "Time spent hovering the trigger before the dock appears.",
            "revealDelay",
            0,
            3000,
            25,
            "ms",
          ),
          visible: enabled,
        },
        {
          ...this.slider(
            "Hide delay",
            "How long the dock remains visible after the pointer leaves.",
            "hideDelay",
            0,
            10000,
            50,
            "ms",
          ),
          visible: enabled,
        },
        {
          name: "Trigger pill",
          desc: "The pill is the smaller visual indicator drawn inside the activation area.",
          searchable: false,
          visible: enabled,
        },
        {
          name: "Show trigger pill",
          desc: "Hide only the pill. The activation area remains available so the Dock can still be revealed.",
          control: { type: "toggle", key: "showTrigger" },
          visible: enabled,
        },
        {
          ...this.slider(
            "Surface thickness",
            "Thickness of the visible strip inside the larger activation area.",
            "triggerSurfaceThickness",
            1,
            48,
            1,
            "px",
          ),
          visible: surfaceVisible,
        },
        {
          name: "Show background",
          desc: "Draw a surface inside the trigger. The activation area still works when this is off.",
          control: { type: "toggle", key: "triggerShowBackground" },
          visible: surfaceVisible,
        },
        {
          name: "Background style",
          desc: "Theme follows the active Obsidian palette. Solid and gradient use the colors below.",
          control: {
            type: "dropdown",
            key: "triggerSurfaceMode",
            options: {
              theme: "Theme palette",
              solid: "Solid color",
              gradient: "Gradient",
            },
          },
          visible: backgroundVisible,
        },
        {
          ...this.slider(
            "Background opacity",
            "Opacity of the visible surface without reducing the activation area.",
            "triggerSurfaceOpacity",
            0,
            100,
            1,
            "%",
          ),
          visible: backgroundVisible,
        },
        {
          name: "Solid color",
          control: { type: "color", key: "triggerSurfaceColor" },
          visible: () => backgroundVisible()
            && this.ledge.settings.triggerSurfaceMode === "solid",
        },
        {
          name: "Gradient start",
          control: { type: "color", key: "triggerGradientStart" },
          visible: () => backgroundVisible()
            && this.ledge.settings.triggerSurfaceMode === "gradient",
        },
        {
          name: "Gradient end",
          control: { type: "color", key: "triggerGradientEnd" },
          visible: () => backgroundVisible()
            && this.ledge.settings.triggerSurfaceMode === "gradient",
        },
        {
          ...this.slider(
            "Gradient angle",
            "Direction of the trigger gradient.",
            "triggerGradientAngle",
            0,
            360,
            1,
            "°",
          ),
          visible: () => backgroundVisible()
            && this.ledge.settings.triggerSurfaceMode === "gradient",
        },
        {
          ...this.slider(
            "Corner radius",
            "Rounding of the visible trigger strip.",
            "triggerRadius",
            0,
            40,
            1,
            "px",
          ),
          visible: surfaceVisible,
        },
        {
          name: "Show border",
          desc: "Draw an outline around the visible trigger strip.",
          control: { type: "toggle", key: "triggerShowBorder" },
          visible: surfaceVisible,
        },
        {
          ...this.slider(
            "Border width",
            "Thickness of the trigger outline.",
            "triggerBorderWidth",
            0,
            6,
            1,
            "px",
          ),
          visible: borderVisible,
        },
        {
          name: "Custom border color",
          desc: "Disable this option to use the active theme border color.",
          control: { type: "toggle", key: "triggerBorderColorEnabled" },
          visible: borderVisible,
        },
        {
          name: "Border color",
          control: { type: "color", key: "triggerBorderColor" },
          visible: () => borderVisible()
            && Boolean(this.ledge.settings.triggerBorderColor),
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
        const item = this.ledge.settings.items[index];
        if (item) this.deleteDockItem(item.id);
      },
    };
  }

  private dataDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Backup & transfer",
      cls: "ledge-settings-panel-data",
      items: [
        {
          name: "Export settings",
          desc: "Download a versioned JSON backup containing layout, trigger, visibility, and Dock item settings.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Export")
                .setIcon("download")
                .onClick(() => this.exportSettings()),
            );
          },
        },
        {
          name: "Import settings",
          desc: "Replace the current configuration with a validated Ledge JSON backup. Invalid and unsupported files are rejected.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Import")
                .setIcon("upload")
                .onClick(() => this.chooseImportFile()),
            );
          },
        },
        {
          name: "Import safety",
          desc: "Imports are limited to 1 MB and normalized before use. Ledge caps imported Dock items and visibility rules to prevent oversized configurations from degrading the workspace.",
          searchable: false,
        },
      ],
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
              cls: "ledge-support-link",
              attr: {
                href: FUNDING_URL,
                target: "_blank",
                rel: "noopener noreferrer",
                "aria-label": "Buy me a coffee",
              },
            });
            const icon = link.createSpan({ cls: "ledge-support-link-icon" });
            setIcon(icon, "coffee");
            link.createSpan({ cls: "ledge-support-link-label", text: "Buy me a coffee" });
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
          render: (setting) => this.renderTargetPathControl(setting, key("target")),
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
        {
          name: "Delete dock item",
          desc: "Remove this shortcut from Ledge.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Delete item")
                .setIcon("trash-2")
                .setDestructive()
                .onClick(() => this.deleteDockItem(item.id)),
            );
          },
        },
      ],
    };
  }

  private renderTargetPathControl(setting: Setting, key: string): () => void {
    const storedValue = this.getControlValue(key);
    const initialValue = typeof storedValue === "string" ? storedValue : "";
    let pendingValue = initialValue;
    let committedValue = initialValue;
    let suggester: DockTargetSuggest | null = null;
    let inputEl: HTMLInputElement | null = null;

    const commit = (): void => {
      if (pendingValue === committedValue) return;
      committedValue = pendingValue;
      void this.setControlValue(key, pendingValue);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Enter") commit();
    };

    setting.controlEl.addClass("ledge-target-path-control");
    setting.addSearch((search) => {
      search
        .setPlaceholder("Folder/Note.md")
        .setValue(initialValue)
        .onChange((value) => {
          pendingValue = value;
        });
      search.inputEl.setAttribute("aria-label", "Target path");
      inputEl = search.inputEl;
      inputEl.addEventListener("blur", commit);
      inputEl.addEventListener("keydown", onKeyDown);

      suggester = new DockTargetSuggest(this.app, inputEl);
      suggester.onSelect((file) => {
        pendingValue = file.path;
        committedValue = file.path;
        search.setValue(file.path);
        void this.setControlValue(key, file.path);
      });
    });

    return () => {
      suggester?.close();
      inputEl?.removeEventListener("blur", commit);
      inputEl?.removeEventListener("keydown", onKeyDown);
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

  private parseVisibilityRuleKey(
    key: string,
  ): { kind: "include" | "exclude"; id: string; field: string } | null {
    const [prefix, kind, id, ...fieldParts] = key.split(":");
    if (prefix !== "visibility" || (kind !== "include" && kind !== "exclude")) return null;
    if (!id || fieldParts.length === 0) return null;
    return { kind, id, field: fieldParts.join(":") };
  }

  private findVisibilityRule(
    kind: "include" | "exclude",
    id: string,
  ): DockVisibilityRule | undefined {
    const rules = kind === "include"
      ? this.ledge.settings.includeRules
      : this.ledge.settings.excludeRules;
    return rules.find((rule) => rule.id === id);
  }

  private setVisibilityRuleValue(
    rule: DockVisibilityRule,
    field: string,
    value: unknown,
  ): void {
    if (field === "enabled") rule.enabled = value === true;
    else if (field === "matchType") {
      rule.matchType = Object.keys(CONTEXT_MATCH_TYPES).includes(String(value))
        ? value as ContextMatchType
        : "path";
    } else if (field === "matchValue") {
      rule.matchValue = typeof value === "string" ? value : "";
    }
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
      "showTrigger",
      "triggerAreaShowBackground",
      "triggerAreaShowBorder",
      "triggerShowBackground",
      "triggerShowBorder",
    ].includes(key)) {
      settings[key as "enabled"] = value === true;
    } else if (key === "position") {
      settings.position = value as DockPosition;
    } else if (key === "surfaceMode") {
      settings.surfaceMode = value as SurfaceMode;
    } else if (key === "triggerSurfaceMode") {
      settings.triggerSurfaceMode = value as SurfaceMode;
    } else if (key === "triggerAreaSurfaceMode") {
      settings.triggerAreaSurfaceMode = value as SurfaceMode;
    } else if ([
      "itemSize", "iconSize", "gap", "padding", "radius", "edgeOffset", "triggerSize",
      "revealDelay", "hideDelay", "motionDuration", "magnificationScale", "neighborScale",
      "surfaceOpacity", "gradientAngle", "triggerLength", "triggerSurfaceThickness",
      "triggerSurfaceOpacity", "triggerGradientAngle", "triggerRadius", "triggerBorderWidth",
      "triggerAreaSurfaceOpacity", "triggerAreaGradientAngle", "triggerAreaRadius",
      "triggerAreaBorderWidth",
    ].includes(key)) {
      settings[key as "itemSize"] = Number(value);
    } else if ([
      "surfaceColor", "gradientStart", "gradientEnd", "accentColor", "borderColor",
      "triggerSurfaceColor", "triggerGradientStart", "triggerGradientEnd",
      "triggerBorderColor",
      "triggerAreaSurfaceColor", "triggerAreaGradientStart", "triggerAreaGradientEnd",
      "triggerAreaBorderColor",
    ].includes(key)) {
      settings[key as "surfaceColor"] = typeof value === "string" ? value : "";
    }
  }

  private deleteDockItem(id: string): void {
    const items = this.ledge.settings.items.filter((item) => item.id !== id);
    if (items.length === this.ledge.settings.items.length) return;
    this.ledge.settings.items = items;
    void this.ledge.saveSettings().then(() => this.update());
  }

  private exportSettings(): void {
    const text = serializeLedgeSettings(this.ledge.settings, this.ledge.manifest.version);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = this.containerEl.createEl("a");
    link.href = url;
    link.download = `ledge-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.hidden = true;
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 0);
    new Notice("Ledge settings exported.");
  }

  private chooseImportFile(): void {
    const input = this.containerEl.createEl("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    const cleanup = (): void => input.remove();
    input.addEventListener("cancel", cleanup, { once: true });
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        return;
      }
      void this.importSettings(file).finally(cleanup);
    }, { once: true });
    input.click();
  }

  private async importSettings(file: File): Promise<void> {
    if (file.size > MAX_IMPORT_BYTES) {
      new Notice("Ledge settings import is limited to one megabyte.");
      return;
    }
    try {
      this.ledge.settings = parseLedgeSettingsImport(await file.text());
      await this.ledge.saveSettings();
      this.update();
      new Notice("Ledge settings imported.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error.";
      new Notice(`Ledge could not import settings: ${message}`);
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
