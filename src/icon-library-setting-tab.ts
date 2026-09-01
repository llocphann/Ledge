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

type DockSettingsSection =
  | "items"
  | "layout"
  | "behavior"
  | "visibility"
  | "trigger"
  | "appearance";

type WorkspaceSettingsTab = "docks" | "data" | "about";

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

const WORKSPACE_TABS: Array<{
  id: WorkspaceSettingsTab;
  label: string;
  icon: string;
}> = [
  { id: "docks", label: "Docks", icon: "panels-top-left" },
  { id: "data", label: "Data", icon: "database-backup" },
  { id: "about", label: "About", icon: "info" },
];

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
 * Adds the unified searchable built-in icon library and a Dock-first settings
 * hierarchy on top of Ledge's declarative single-Dock settings definitions.
 *
 * The base definitions remain the source of truth for every Dock feature. The
 * selected Dock is projected into the legacy flat settings shape by main.ts,
 * so every section below edits that preset without duplicating controls.
 */
export class LedgeIconLibrarySettingTab extends LedgeSettingTab {
  private activeWorkspaceTab: WorkspaceSettingsTab = "docks";
  private activeDockSection: DockSettingsSection = "items";

  constructor(
    app: App,
    private readonly ledgePlugin: LedgePlugin,
    private readonly pickerApp: App = app,
  ) {
    super(app, ledgePlugin);
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const baseDefinitions = super.getSettingDefinitions();
    const definitions: SettingDefinitionItem[] = [];
    let dockWorkspaceInserted = false;

    for (const definition of baseDefinitions) {
      const mutable = definition as unknown as MutableSettingDefinition;
      if (mutable.cls === "ledge-settings-tabs-group") {
        definitions.push(this.workspaceNavigationDefinitions());
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

  private workspaceNavigationDefinitions(): SettingDefinitionItem {
    return {
      type: "group",
      cls: "ledge-settings-tabs-group",
      items: [
        {
          name: "Settings sections",
          searchable: false,
          render: (setting) => {
            this.containerEl.classList.add("ledge-settings-root");
            setting.settingEl.classList.add("ledge-settings-tabs-setting");

            const tabList = setting.controlEl.createDiv({ cls: "ledge-settings-tabs" });
            tabList.setAttribute("role", "tablist");
            tabList.setAttribute("aria-label", "Ledge settings sections");
            const buttons: HTMLButtonElement[] = [];
            const cleanups: Array<() => void> = [];

            const activate = (tabId: WorkspaceSettingsTab, focus = false): void => {
              this.activeWorkspaceTab = tabId;
              this.applyWorkspaceVisibility();
              for (const candidate of buttons) {
                const selected = candidate.dataset.tabId === tabId;
                candidate.setAttribute("aria-selected", String(selected));
                candidate.tabIndex = selected ? 0 : -1;
                if (selected && focus) candidate.focus();
              }
            };

            for (const tab of WORKSPACE_TABS) {
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
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              const activeElement = this.containerEl.ownerDocument.activeElement;
              const currentIndex = Math.max(0, buttons.findIndex((button) => button === activeElement));
              let nextIndex = currentIndex;
              if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
              if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
              if (event.key === "Home") nextIndex = 0;
              if (event.key === "End") nextIndex = buttons.length - 1;
              const next = WORKSPACE_TABS[nextIndex];
              if (!next) return;
              event.preventDefault();
              activate(next.id, true);
            };
            tabList.addEventListener("keydown", onKeyDown);
            cleanups.push(() => tabList.removeEventListener("keydown", onKeyDown));
            activate(this.activeWorkspaceTab);
            return () => cleanups.forEach((cleanup) => cleanup());
          },
        },
      ],
    };
  }

  private applyWorkspaceVisibility(): void {
    const renderedTab = this.activeWorkspaceTab === "docks"
      ? this.activeDockSection
      : this.activeWorkspaceTab;
    this.containerEl.dataset.ledgeSettingsTab = renderedTab;
    const workspaces = Array.from(this.containerEl.querySelectorAll(".ledge-dock-workspace"));
    for (const workspace of workspaces) {
      if (!(workspace instanceof HTMLElement)) continue;
      workspace.hidden = this.activeWorkspaceTab !== "docks";
    }
  }

  private sectionForDefinition(definition: SettingDefinitionItem): DockSettingsSection | null {
    const cls = (definition as unknown as MutableSettingDefinition).cls;
    if (!cls) return null;
    const classes = new Set(cls.split(/\s+/));
    return DOCK_SETTINGS_SECTIONS.find((section) => classes.has(SECTION_CLASSES[section])) ?? null;
  }

  private dockWorkspaceDefinitions(): SettingDefinitionItem {
    const items: SettingGroupItem<string>[] = [
      {
        name: "Dock presets",
        desc: `Choose a Dock, then edit its Items, Layout, Behavior, Visibility, Trigger, or Appearance (${this.ledgePlugin.settings.docks.length}/${MAX_DOCK_PRESETS} used). Every setting in these sections belongs only to the open Dock.`,
        searchable: false,
        render: (setting) => {
          setting.settingEl.addClass("ledge-dock-preset-toolbar");
          this.applyWorkspaceVisibility();
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
      ...this.ledgePlugin.settings.docks.map((dock) => this.dockPresetDefinition(dock)),
    ];

    return {
      type: "group",
      heading: "Docks",
      cls: "ledge-dock-workspace",
      items,
    };
  }

  private dockPresetDefinition(dock: DockPresetSettings): SettingGroupItem<string> {
    const selected = dock.id === this.ledgePlugin.settings.selectedDockId;
    return {
      name: dock.name,
      desc: `${POSITION_LABELS[dock.position]} · ${dock.enabled ? "Enabled" : "Hidden"}`,
      searchable: false,
      render: (setting) => {
        this.resetDockPresetRender(setting);
        this.styleDockPresetRow(setting);

        setting.addButton((button) => {
          button
            .setIcon(selected ? "chevron-down" : "chevron-right")
            .setTooltip(selected ? "Dock settings are open" : "Open Dock settings")
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
          paddingTop: "var(--size-4-2)",
        });
        this.renderPresetIdentity(body, dock.id, setting);
        this.renderDockSectionNavigation(body);
      },
    };
  }

  private resetDockPresetRender(setting: Setting): void {
    setting.controlEl.replaceChildren();
    for (const child of Array.from(setting.settingEl.children)) {
      if (child.classList.contains("ledge-dock-preset-body")) child.remove();
    }
  }

  private styleDockPresetRow(setting: Setting): void {
    setting.settingEl.addClass("ledge-dock-preset-card");
    setting.settingEl.setCssStyles({
      flexWrap: "wrap",
      gap: "var(--size-4-2)",
    });
    setting.infoEl.setCssStyles({ flex: "1 1 220px" });
    setting.controlEl.setCssStyles({ flex: "0 0 auto", flexWrap: "wrap" });
  }

  private renderPresetIdentity(
    container: HTMLElement,
    dockId: string,
    parentSetting: Setting,
  ): void {
    const preset = this.ledgePlugin.getDockPresetRuntime(dockId);
    if (!preset) return;

    new Setting(container)
      .setName("Preset name")
      .setDesc("Name used to identify this preset throughout the plugin.")
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
  }

  private renderDockSectionNavigation(container: HTMLElement): void {
    const navSetting = new Setting(container)
      .setName("Dock settings")
      .setDesc("Items are the shortcuts in this dock. The remaining sections control only this dock.");
    const tabList = navSetting.controlEl.createDiv({ cls: "ledge-settings-tabs" });
    tabList.setAttribute("role", "tablist");
    tabList.setAttribute("aria-label", "Dock settings sections");
    const buttons: HTMLButtonElement[] = [];

    const activate = (section: DockSettingsSection, focus = false): void => {
      this.activeDockSection = section;
      this.applyWorkspaceVisibility();
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
      const activeElement = container.ownerDocument.activeElement;
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
