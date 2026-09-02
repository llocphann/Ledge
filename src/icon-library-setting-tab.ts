import {
  Notice,
  Setting,
  setIcon,
  type App,
  type SettingDefinitionItem,
  type SettingGroupItem,
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

type DockSettingsSection =
  | "items"
  | "layout"
  | "behavior"
  | "visibility"
  | "trigger"
  | "appearance";

const DOCK_SETTINGS_SECTIONS: DockSettingsSection[] = [
  "items",
  "layout",
  "behavior",
  "visibility",
  "trigger",
  "appearance",
];

const SECTION_LABELS: Record<DockSettingsSection, string> = {
  items: "Items",
  layout: "Layout",
  behavior: "Behavior",
  visibility: "Visibility",
  trigger: "Trigger",
  appearance: "Appearance",
};

const SECTION_CLASSES: Record<DockSettingsSection, string> = {
  layout: "ledge-settings-panel-layout",
  behavior: "ledge-settings-panel-behavior",
  visibility: "ledge-settings-panel-visibility",
  trigger: "ledge-settings-panel-trigger",
  appearance: "ledge-settings-panel-appearance",
  items: "ledge-settings-panel-items",
};

type MutableSettingDefinition = {
  name?: string;
  desc?: string;
  heading?: string;
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
 * Adds the unified searchable built-in icon library and a Dock-first settings
 * hierarchy on top of Ledge's declarative single-Dock settings definitions.
 *
 * The base definitions remain the source of truth for every Dock feature. The
 * selected Dock is projected into the legacy flat settings shape by main.ts,
 * so every section below edits that preset without duplicating controls.
 */
export class LedgeIconLibrarySettingTab extends LedgeSettingTab {
  private activeDockSection: DockSettingsSection = "items";

  constructor(
    app: App,
    private readonly ledgePlugin: LedgePlugin,
    private readonly pickerApp: App = app,
  ) {
    super(app, ledgePlugin);
  }

  override update(): void {
    super.update();
    this.scheduleItemRowControls();
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const baseDefinitions = super.getSettingDefinitions();
    const definitions: SettingDefinitionItem[] = [];
    let dockWorkspaceInserted = false;

    this.containerEl.classList.add("ledge-settings-root");
    this.applyDockSectionVisibility();

    for (const definition of baseDefinitions) {
      const mutable = definition as unknown as MutableSettingDefinition;
      // The base tab row is intentionally omitted. Ledge now has one settings
      // page: Dock presets and their sections, followed by Data and About.
      if (mutable.cls === "ledge-settings-tabs-group") continue;

      if (mutable.cls === "ledge-settings-panel-data") {
        mutable.cls = "ledge-settings-data-inline";
        definitions.push(definition);
        continue;
      }

      if (mutable.cls === "ledge-settings-panel-about") {
        definitions.push(this.aboutFooterDefinitions(definition));
        continue;
      }

      const section = this.sectionForDefinition(definition);
      if (section && !dockWorkspaceInserted) {
        definitions.push(this.dockWorkspaceDefinitions());
        dockWorkspaceInserted = true;
      }
      definitions.push(definition);
    }

    this.decorateControls(definitions);
    if (this.containerEl.isConnected) this.scheduleItemRowControls();
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
      await this.ledgePlugin.saveSettings(true, true);
      this.update();
      return;
    }

    if (itemKey.field === "icon") {
      const icon = typeof value === "string" ? value : "";
      item.icon = icon;
      if (item.iconSource === "vault") item.vaultIconPath = icon;
      else item.builtInIcon = icon;
      await this.ledgePlugin.saveSettings(true, item.iconSource !== "vault");
      return;
    }

    await super.setControlValue(key, value);
  }

  private applyDockSectionVisibility(): void {
    this.containerEl.dataset.ledgeSettingsTab = this.activeDockSection;
  }

  private aboutFooterDefinitions(definition: SettingDefinitionItem): SettingDefinitionItem {
    const mutable = definition as unknown as MutableSettingDefinition;
    const originalItems = Array.isArray(mutable.items) ? mutable.items : [];
    const legacySummaryName = `Ledge ${this.ledgePlugin.manifest.version}`;
    const retainedItems = originalItems.filter((item) => {
      const candidate = item as unknown as MutableSettingDefinition;
      return candidate.name !== legacySummaryName;
    });

    mutable.heading = "About";
    mutable.cls = "ledge-settings-about-footer";
    mutable.items = [
      {
        name: "Version",
        desc: this.ledgePlugin.manifest.version,
        searchable: false,
      },
      {
        name: "Author",
        desc: this.ledgePlugin.manifest.author || "llocphann",
        searchable: false,
      },
      ...retainedItems,
    ];
    return definition;
  }

  private sectionForDefinition(definition: SettingDefinitionItem): DockSettingsSection | null {
    const cls = (definition as unknown as MutableSettingDefinition).cls;
    if (!cls) return null;
    const classes = new Set(cls.split(/\s+/));
    return DOCK_SETTINGS_SECTIONS.find((section) => classes.has(SECTION_CLASSES[section])) ?? null;
  }

  private dockWorkspaceDefinitions(): SettingDefinitionItem {
    const items: SettingGroupItem<string>[] = [
      this.dockPresetSwitcherDefinition(),
      this.selectedPresetManagementDefinition(),
      this.dockSectionNavigationDefinition(),
    ];

    return {
      type: "group",
      heading: "Docks",
      cls: "ledge-dock-workspace",
      items,
    };
  }

  private dockPresetSwitcherDefinition(): SettingGroupItem<string> {
    return {
      name: "Dock presets",
      desc: "Choose a preset. Use + to create the next Dock preset.",
      searchable: false,
      render: (setting) => {
        setting.settingEl.addClass("ledge-dock-preset-switcher-setting");
        setting.controlEl.replaceChildren();
        setting.infoEl.setCssStyles({ display: "none" });
        setting.settingEl.setCssStyles({ display: "block" });
        setting.controlEl.setCssStyles({
          width: "100%",
          justifyContent: "flex-start",
          flexWrap: "wrap",
          gap: "var(--size-4-1)",
        });
        this.applyDockSectionVisibility();

        for (const dock of this.ledgePlugin.settings.docks) {
          const selected = dock.id === this.ledgePlugin.settings.selectedDockId;
          setting.addButton((button) => {
            button
              .setButtonText(dock.name)
              .setTooltip(`${POSITION_LABELS[dock.position]} · ${dock.enabled ? "Enabled" : "Hidden"}`)
              .onClick(() => {
                void this.ledgePlugin.selectDockPreset(dock.id).then((changed) => {
                  if (changed) this.update();
                });
              });
            button.buttonEl.dataset.dockPresetId = dock.id;
            button.buttonEl.setAttribute("aria-pressed", String(selected));
          });
        }

        setting.addButton((button) => {
          button
            .setIcon("plus")
            .setTooltip("Add Dock preset")
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
    };
  }

  private selectedPresetManagementDefinition(): SettingGroupItem<string> {
    const dockId = this.ledgePlugin.settings.selectedDockId;
    const preset = this.ledgePlugin.getDockPresetRuntime(dockId);
    return {
      name: "Preset name",
      desc: preset
        ? `${POSITION_LABELS[preset.position]} · ${preset.enabled ? "Enabled" : "Hidden"}`
        : "Rename the selected Dock preset.",
      searchable: false,
      render: (setting) => {
        const current = this.ledgePlugin.getDockPresetRuntime(dockId);
        if (!current) return;

        setting.addText((text) => {
          text
            .setPlaceholder("Dock 1")
            .setValue(current.name)
            .onChange((value) => {
              const latest = this.ledgePlugin.getDockPresetRuntime(dockId);
              if (!latest) return;
              latest.name = value;
              const selector = Array.from(
                this.containerEl.querySelectorAll<HTMLButtonElement>("[data-dock-preset-id]"),
              ).find((candidate) => candidate.dataset.dockPresetId === dockId);
              if (selector) selector.textContent = value.trim() || "Dock";
              void this.ledgePlugin.saveDockPresetRuntime(dockId, false);
            });
        });

        setting.addButton((button) => {
          button
            .setIcon("copy")
            .setTooltip("Duplicate Dock")
            .setDisabled(this.ledgePlugin.settings.docks.length >= MAX_DOCK_PRESETS)
            .onClick(() => this.duplicateDock(dockId));
        });

        setting.addButton((button) => {
          button
            .setIcon("trash-2")
            .setTooltip("Delete Dock")
            .setDisabled(this.ledgePlugin.settings.docks.length <= 1)
            .setDestructive()
            .onClick(() => this.deleteDock(dockId));
        });
      },
    };
  }

  private dockSectionNavigationDefinition(): SettingGroupItem<string> {
    return {
      name: "Dock settings",
      searchable: false,
      render: (setting) => {
        setting.settingEl.addClass("ledge-dock-section-nav-setting");
        setting.controlEl.replaceChildren();
        setting.infoEl.setCssStyles({ display: "none" });
        setting.settingEl.setCssStyles({
          display: "block",
          marginTop: "var(--size-4-5)",
          paddingTop: "var(--size-4-4)",
          borderTop: "1px solid var(--background-modifier-border)",
        });
        setting.controlEl.setCssStyles({
          width: "100%",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "var(--size-4-1)",
        });

        const tabList = setting.controlEl.createDiv({
          cls: "ledge-dock-section-tabs",
        });
        tabList.setCssStyles({ display: "contents" });
        tabList.setAttribute("role", "tablist");
        tabList.setAttribute("aria-label", "Dock settings sections");
        const buttons: HTMLButtonElement[] = [];

        const activate = (section: DockSettingsSection, focus = false): void => {
          this.activeDockSection = section;
          this.applyDockSectionVisibility();
          for (const candidate of buttons) {
            const selected = candidate.dataset.dockSection === section;
            candidate.setAttribute("aria-selected", String(selected));
            candidate.tabIndex = selected ? 0 : -1;
            if (selected && focus) candidate.focus();
          }
        };

        for (const section of DOCK_SETTINGS_SECTIONS) {
          const button = tabList.createEl("button", {
            cls: "ledge-settings-tab",
            attr: {
              type: "button",
              role: "tab",
              "data-dock-section": section,
              "aria-selected": "false",
            },
          });
          button.createSpan({ text: SECTION_LABELS[section] });
          button.addEventListener("click", () => activate(section));
          buttons.push(button);
        }

        tabList.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          const activeElement = this.containerEl.ownerDocument.activeElement;
          const currentIndex = Math.max(0, buttons.findIndex((button) => button === activeElement));
          let nextIndex = currentIndex;
          if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = buttons.length - 1;
          const next = DOCK_SETTINGS_SECTIONS[nextIndex];
          if (!next) return;
          event.preventDefault();
          activate(next, true);
        });

        activate(this.activeDockSection);
      },
    };
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

  private scheduleItemRowControls(attempt = 0): void {
    const view = this.containerEl.ownerDocument.defaultView;
    if (!view) return;
    view.requestAnimationFrame(() => {
      const decorated = this.decorateItemRowControls();
      if (decorated < this.ledgePlugin.settings.items.length && attempt < 2) {
        this.scheduleItemRowControls(attempt + 1);
      }
    });
  }

  private decorateItemRowControls(): number {
    const markers = Array.from(this.containerEl.querySelectorAll<HTMLElement>(
      ".ledge-item-row-marker[data-ledge-item-id]",
    ));
    const items = this.ledgePlugin.settings.items;

    for (const marker of markers) {
      const itemId = marker.dataset.ledgeItemId;
      const row = marker.closest<HTMLElement>(".setting-item");
      if (!itemId || !row) continue;
      const controlEl = row.querySelector<HTMLElement>(".setting-item-control");
      if (!controlEl || controlEl.querySelector(".ledge-item-order-controls")) continue;

      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) continue;
      const controls = controlEl.createSpan({ cls: "ledge-item-order-controls" });

      const upButton = controls.createEl("button", {
        cls: "clickable-icon ledge-item-order-button",
        attr: { type: "button", "aria-label": "Move dock item up" },
      });
      upButton.disabled = index === 0;
      setIcon(upButton, "arrow-up");
      upButton.addEventListener("pointerdown", (event: PointerEvent) => event.stopPropagation());
      upButton.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        this.moveDockItem(itemId, -1);
      });

      const downButton = controls.createEl("button", {
        cls: "clickable-icon ledge-item-order-button",
        attr: { type: "button", "aria-label": "Move dock item down" },
      });
      downButton.disabled = index === items.length - 1;
      setIcon(downButton, "arrow-down");
      downButton.addEventListener("pointerdown", (event: PointerEvent) => event.stopPropagation());
      downButton.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        this.moveDockItem(itemId, 1);
      });

      const navigationControl = controlEl.lastElementChild;
      if (navigationControl && navigationControl !== controls) {
        controlEl.insertBefore(controls, navigationControl);
      }
    }

    return markers.length;
  }

  private moveDockItem(itemId: string, delta: -1 | 1): void {
    const items = this.ledgePlugin.settings.items;
    const index = items.findIndex((item) => item.id === itemId);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    if (!item) return;
    items.splice(nextIndex, 0, item);
    void this.ledgePlugin.saveSettings().then(() => this.update());
  }

  private decorateControls(definitions: SettingDefinitionItem[]): void {
    for (const definition of definitions) {
      const mutable = definition as unknown as MutableSettingDefinition;
      if (Array.isArray(mutable.items)) this.decorateControls(mutable.items);

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

  private renderIconControl(setting: Setting, key: string): () => void {
    const storedValue = this.getControlValue(key);
    const initialValue = typeof storedValue === "string" ? storedValue : "";
    let pendingValue = initialValue;
    let committedValue = initialValue;
    let inputEl: HTMLInputElement | null = null;
    let setTextValue: ((value: string) => void) | null = null;

    const commit = (): void => {
      if (pendingValue === committedValue) return;
      committedValue = pendingValue;
      void this.setControlValue(key, pendingValue);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Enter") commit();
    };

    setting.controlEl.addClass("ledge-icon-setting-control");
    setting.addText((text) => {
      text
        .setPlaceholder("Home")
        .setValue(initialValue)
        .onChange((value) => { pendingValue = value; });
      inputEl = text.inputEl;
      inputEl.setAttribute("aria-label", "Icon ID");
      inputEl.addEventListener("blur", commit);
      inputEl.addEventListener("keydown", onKeyDown);
      setTextValue = (value) => { text.setValue(value); };
    });

    setting.addButton((button) => {
      button
        .setButtonText("Browse icons")
        .setIcon("shapes")
        .onClick(() => {
          openIconPicker(this.pickerApp, (iconId) => {
            pendingValue = iconId;
            committedValue = iconId;
            setTextValue?.(iconId);
            void this.setControlValue(key, iconId);
          });
        });
    });

    return () => {
      inputEl?.removeEventListener("blur", commit);
      inputEl?.removeEventListener("keydown", onKeyDown);
    };
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
