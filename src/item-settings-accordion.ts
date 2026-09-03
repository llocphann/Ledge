import {
  AbstractInputSuggest,
  Modal,
  Setting,
  normalizePath,
  prepareSimpleSearch,
  setIcon,
  type App,
  type TFile,
} from "obsidian";
import { openIconPicker } from "./icon-picker";
import type LedgePlugin from "./main";
import { createDockItem } from "./settings";

const TARGET_SUGGESTION_LIMIT = 50;
const PRIMARY_TARGET_EXTENSIONS = new Set(["md", "base", "canvas"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

export interface DockItemsAccordionHost {
  app: App;
  plugin: LedgePlugin;
  expandedItemIds: Set<string>;
  getControlValue(key: string): unknown;
  setControlValue(key: string, value: unknown): Promise<void>;
  update(): void;
}

function isUserVaultFile(file: TFile): boolean {
  return !file.path.split("/").some((segment) => segment === ".git" || segment === "node_modules");
}

function targetExists(plugin: LedgePlugin, target: string): boolean {
  const normalized = normalizePath(target.trim());
  if (!normalized) return false;
  return Boolean(
    plugin.app.vault.getFileByPath(normalized)
    || plugin.app.metadataCache.getFirstLinkpathDest(normalized, ""),
  );
}

function itemDisplayName(host: DockItemsAccordionHost, itemId: string): string {
  const items = host.plugin.settings.items;
  const index = items.findIndex((candidate) => candidate.id === itemId);
  const item = items[index];
  if (!item) return "Dock item";
  const base = item.label || item.target || `Item ${index + 1}`;
  let occurrence = 1;
  for (let candidateIndex = 0; candidateIndex < index; candidateIndex += 1) {
    const candidate = items[candidateIndex];
    if (!candidate) continue;
    const candidateBase = candidate.label || candidate.target || `Item ${candidateIndex + 1}`;
    if (candidateBase === base) occurrence += 1;
  }
  return occurrence === 1 ? base : `${base} (${occurrence})`;
}

class BoundedVaultFileSuggest extends AbstractInputSuggest<TFile> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private readonly initialFiles: TFile[],
    private readonly searchableFiles: TFile[] = initialFiles,
  ) {
    super(app, inputEl);
    this.limit = TARGET_SUGGESTION_LIMIT;
  }

  protected getSuggestions(query: string): TFile[] {
    const normalized = query.trim();
    const search = normalized ? prepareSimpleSearch(normalized) : null;
    const files = normalized ? this.searchableFiles : this.initialFiles;
    const suggestions: TFile[] = [];
    for (const file of files) {
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

class ConfirmDockItemDeleteModal extends Modal {
  constructor(
    app: App,
    private readonly label: string,
    private readonly confirmDelete: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Delete dock item?");
    this.contentEl.createEl("p", {
      text: `Remove “${this.label}” from this Dock? This cannot be undone.`,
    });
    const actions = new Setting(this.contentEl);
    actions.settingEl.addClass("ledge-delete-confirmation-actions");
    actions.addButton((button) => button
      .setButtonText("Cancel")
      .onClick(() => this.close()));
    actions.addButton((button) => button
      .setButtonText("Delete item")
      .setIcon("trash-2")
      .setDestructive()
      .onClick(() => {
        this.close();
        this.confirmDelete();
      }));
  }
}

export function confirmDeleteDockItem(host: DockItemsAccordionHost, itemId: string): void {
  const item = host.plugin.settings.items.find((candidate) => candidate.id === itemId);
  if (!item) return;
  new ConfirmDockItemDeleteModal(
    host.app,
    item.label || item.target || "Untitled item",
    () => {
      host.expandedItemIds.delete(itemId);
      host.plugin.settings.items = host.plugin.settings.items.filter((candidate) => candidate.id !== itemId);
      void host.plugin.saveSettings().then(() => host.update());
    },
  ).open();
}

function renderCommittedText(
  setting: Setting,
  value: string,
  placeholder: string,
  ariaLabel: string,
  persist: (value: string) => Promise<void>,
): () => void {
  let pending = value;
  let committed = value;
  let inputEl: HTMLInputElement | null = null;
  const commit = (): void => {
    if (pending === committed) return;
    committed = pending;
    void persist(pending);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") commit();
  };
  setting.addText((text) => {
    text.setPlaceholder(placeholder).setValue(value).onChange((next) => { pending = next; });
    inputEl = text.inputEl;
    inputEl.setAttribute("aria-label", ariaLabel);
    inputEl.addEventListener("blur", commit);
    inputEl.addEventListener("keydown", onKeyDown);
  });
  return () => {
    inputEl?.removeEventListener("blur", commit);
    inputEl?.removeEventListener("keydown", onKeyDown);
  };
}

function renderCommittedFilePath(
  setting: Setting,
  host: DockItemsAccordionHost,
  value: string,
  mode: "target" | "image",
  persist: (value: string) => Promise<void>,
): () => void {
  const files = host.app.vault.getFiles().filter(isUserVaultFile);
  const imageFiles = files.filter((file) => IMAGE_EXTENSIONS.has(file.extension.toLowerCase()));
  const primaryTargets = files.filter((file) => PRIMARY_TARGET_EXTENSIONS.has(file.extension.toLowerCase()));
  const secondaryTargets = files.filter((file) => !PRIMARY_TARGET_EXTENSIONS.has(file.extension.toLowerCase()));
  const initialFiles = mode === "image" ? imageFiles : primaryTargets;
  const searchableFiles = mode === "image" ? imageFiles : [...primaryTargets, ...secondaryTargets];
  let pending = value;
  let committed = value;
  let inputEl: HTMLInputElement | null = null;
  let suggester: BoundedVaultFileSuggest | null = null;

  const commit = (): void => {
    if (pending === committed) return;
    committed = pending;
    void persist(pending);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") commit();
  };

  setting.controlEl.addClass("ledge-target-path-control");
  setting.addSearch((search) => {
    search
      .setPlaceholder(mode === "image" ? "Assets/icon.png" : "Folder/Note.md")
      .setValue(value)
      .onChange((next) => { pending = next; });
    inputEl = search.inputEl;
    inputEl.setAttribute("aria-label", mode === "image" ? "Icon path" : "Target path");
    inputEl.addEventListener("blur", commit);
    inputEl.addEventListener("keydown", onKeyDown);
    suggester = new BoundedVaultFileSuggest(host.app, inputEl, initialFiles, searchableFiles);
    suggester.onSelect((file) => {
      pending = file.path;
      committed = file.path;
      search.setValue(file.path);
      void persist(file.path);
    });
  });

  return () => {
    suggester?.close();
    inputEl?.removeEventListener("blur", commit);
    inputEl?.removeEventListener("keydown", onKeyDown);
  };
}

function renderItemDetails(
  details: HTMLElement,
  host: DockItemsAccordionHost,
  itemId: string,
  refreshHeaders: () => void,
): () => void {
  const item = host.plugin.settings.items.find((candidate) => candidate.id === itemId);
  if (!item) return () => undefined;
  const key = (field: string): string => `item:${itemId}:${field}`;
  const cleanups: Array<() => void> = [];
  const rerender = (): void => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    details.replaceChildren();
    const cleanup = renderItemDetails(details, host, itemId, refreshHeaders);
    cleanups.push(cleanup);
  };

  const enabled = new Setting(details).setName("Enabled");
  enabled.addToggle((toggle) => toggle
    .setValue(item.enabled)
    .onChange((value) => {
      void host.setControlValue(key("enabled"), value).then(refreshHeaders);
    }));

  const label = new Setting(details).setName("Label");
  cleanups.push(renderCommittedText(
    label,
    item.label,
    "Books",
    "Dock item label",
    async (value) => {
      await host.setControlValue(key("label"), value);
      refreshHeaders();
    },
  ));

  const target = new Setting(details)
    .setName("Target path")
    .setDesc("Vault-relative path to a note, base file, canvas, or another file.");
  cleanups.push(renderCommittedFilePath(
    target,
    host,
    item.target,
    "target",
    async (value) => {
      await host.setControlValue(key("target"), value);
      refreshHeaders();
    },
  ));

  const source = new Setting(details).setName("Icon source");
  source.addDropdown((dropdown) => dropdown
    .addOptions({ lucide: "Built-in icon", vault: "Icon in vault" })
    .setValue(item.iconSource)
    .onChange((value) => {
      void host.setControlValue(key("iconSource"), value);
    }));

  if (item.iconSource === "lucide") {
    const icon = new Setting(details)
      .setName("Icon")
      .setDesc("Choose from the built-in icon library or type an Obsidian icon ID manually.");
    let pending = item.icon;
    let committed = item.icon;
    let inputEl: HTMLInputElement | null = null;
    let setValue: ((value: string) => void) | null = null;
    const commit = (): void => {
      if (pending === committed) return;
      committed = pending;
      void host.setControlValue(key("icon"), pending);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Enter") commit();
    };
    icon.addText((text) => {
      text.setPlaceholder("Home").setValue(item.icon).onChange((value) => { pending = value; });
      inputEl = text.inputEl;
      inputEl.setAttribute("aria-label", "Icon ID");
      inputEl.addEventListener("blur", commit);
      inputEl.addEventListener("keydown", onKeyDown);
      setValue = (value) => { text.setValue(value); };
    });
    icon.addButton((button) => button
      .setButtonText("Browse icons")
      .setIcon("shapes")
      .onClick(() => {
        openIconPicker(host.app, (iconId) => {
          pending = iconId;
          committed = iconId;
          setValue?.(iconId);
          void host.setControlValue(key("icon"), iconId);
        });
      }));
    cleanups.push(() => {
      inputEl?.removeEventListener("blur", commit);
      inputEl?.removeEventListener("keydown", onKeyDown);
    });
  } else {
    const iconPath = new Setting(details)
      .setName("Icon path")
      .setDesc("Choose a PNG, JPEG, webp, GIF, or SVG file stored in the vault.");
    cleanups.push(renderCommittedFilePath(
      iconPath,
      host,
      item.icon,
      "image",
      (value) => host.setControlValue(key("icon"), value),
    ));
    const rendering = new Setting(details)
      .setName("Image rendering")
      .setDesc("Tint creates a theme-colored silhouette. Original preserves source colors.");
    rendering.addDropdown((dropdown) => dropdown
      .addOptions({ tint: "Tint", original: "Original colors" })
      .setValue(item.iconRenderMode)
      .onChange((value) => { void host.setControlValue(key("iconRenderMode"), value); }));
  }

  const iconSize = new Setting(details)
    .setName("Icon size override")
    .setDesc("Set to 0 to inherit the global icon size.");
  iconSize.addSlider((slider) => slider
    .setLimits(0, 96, 1)
    .setValue(item.iconSize)
    .onChange((value) => { void host.setControlValue(key("iconSize"), value); }));

  const iconColorToggle = new Setting(details)
    .setName("Custom icon color")
    .setDesc("Disable this option to inherit the dock accent.");
  iconColorToggle.addToggle((toggle) => toggle
    .setValue(Boolean(item.iconColor))
    .onChange((value) => {
      void host.setControlValue(key("iconColorEnabled"), value).then(rerender);
    }));
  if (item.iconColor) {
    const iconColor = new Setting(details).setName("Icon color");
    iconColor.addColorPicker((picker) => picker
      .setValue(item.iconColor)
      .onChange((value) => { void host.setControlValue(key("iconColor"), value); }));
  }

  const gradientToggle = new Setting(details)
    .setName("Custom tile gradient")
    .setDesc("Override the shared tile colors for this item.");
  gradientToggle.addToggle((toggle) => toggle
    .setValue(Boolean(item.tileGradientStart || item.tileGradientEnd))
    .onChange((value) => {
      void host.setControlValue(key("tileGradientEnabled"), value).then(rerender);
    }));
  if (item.tileGradientStart || item.tileGradientEnd) {
    const start = new Setting(details).setName("Tile gradient start");
    start.addColorPicker((picker) => picker
      .setValue(item.tileGradientStart || "#334155")
      .onChange((value) => { void host.setControlValue(key("tileGradientStart"), value); }));
    const end = new Setting(details).setName("Tile gradient end");
    end.addColorPicker((picker) => picker
      .setValue(item.tileGradientEnd || "#111827")
      .onChange((value) => { void host.setControlValue(key("tileGradientEnd"), value); }));
  }

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}

export function renderDockItemsAccordion(setting: Setting, host: DockItemsAccordionHost): () => void {
  setting.settingEl.addClass("ledge-items-accordion-setting");
  setting.infoEl.setCssStyles({ display: "none" });
  setting.controlEl.replaceChildren();
  setting.controlEl.setCssStyles({ display: "block", width: "100%" });
  const container = setting.controlEl.createDiv({ cls: "ledge-items-accordion" });
  const detailCleanups = new Map<string, () => void>();
  const headers = new Map<string, { row: HTMLElement; warning: HTMLElement; state: HTMLElement }>();
  const cleanups: Array<() => void> = [];

  const refreshHeaders = (): void => {
    for (const [itemId, header] of headers) {
      const item = host.plugin.settings.items.find((candidate) => candidate.id === itemId);
      if (!item) continue;
      const name = header.row.querySelector<HTMLElement>(".setting-item-name");
      const desc = header.row.querySelector<HTMLElement>(".setting-item-description");
      if (name) name.textContent = itemDisplayName(host, itemId);
      if (desc) desc.textContent = item.target || "No target path";
      header.state.textContent = item.enabled ? "Enabled" : "Hidden";
      header.warning.hidden = targetExists(host.plugin, item.target);
    }
  };

  if (host.plugin.settings.items.length === 0) {
    container.createDiv({
      cls: "ledge-items-empty-state",
      text: "No dock items. Add one to create a shortcut.",
    });
  }

  for (const item of host.plugin.settings.items) {
    const wrapper = container.createDiv({ cls: "ledge-settings-item ledge-item-accordion" });
    const header = new Setting(wrapper)
      .setName(itemDisplayName(host, item.id))
      .setDesc(item.target || "No target path");
    header.settingEl.addClasses(["ledge-settings-item-header", "mod-navigable", "tappable"]);
    header.settingEl.dataset.ledgeItemId = item.id;
    const state = header.controlEl.createSpan({ cls: "ledge-item-row-state", text: item.enabled ? "Enabled" : "Hidden" });
    const warning = header.controlEl.createSpan({
      cls: "ledge-item-row-warning",
      attr: { "aria-label": "Target path is missing", title: "Target path is missing" },
    });
    setIcon(warning, "triangle-alert");
    warning.hidden = targetExists(host.plugin, item.target);
    headers.set(item.id, { row: header.settingEl, warning, state });

    const toggleButton = header.controlEl.createEl("button", {
      cls: "clickable-icon ledge-item-accordion-toggle",
      attr: { type: "button", "aria-label": "Toggle dock item settings" },
    });
    const details = wrapper.createDiv({ cls: "ledge-item-accordion-details" });

    const setExpanded = (expanded: boolean): void => {
      wrapper.classList.toggle("is-expanded", expanded);
      details.hidden = !expanded;
      toggleButton.setAttribute("aria-expanded", String(expanded));
      setIcon(toggleButton, expanded ? "chevron-down" : "chevron-right");
      detailCleanups.get(item.id)?.();
      detailCleanups.delete(item.id);
      details.replaceChildren();
      if (expanded) {
        host.expandedItemIds.add(item.id);
        detailCleanups.set(item.id, renderItemDetails(details, host, item.id, refreshHeaders));
      } else {
        host.expandedItemIds.delete(item.id);
      }
    };
    const toggle = (): void => setExpanded(!host.expandedItemIds.has(item.id));
    const onToggle = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    };
    const onHeader = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, select, textarea, a, .clickable-icon")) return;
      toggle();
    };
    toggleButton.addEventListener("click", onToggle);
    header.settingEl.addEventListener("click", onHeader);
    cleanups.push(() => {
      toggleButton.removeEventListener("click", onToggle);
      header.settingEl.removeEventListener("click", onHeader);
    });
    setExpanded(host.expandedItemIds.has(item.id));
  }

  const addRow = new Setting(container)
    .setName("Add dock item")
    .setDesc("Create a new shortcut and open its settings.");
  addRow.settingEl.addClass("ledge-add-item-row");
  addRow.addButton((button) => button
    .setIcon("plus")
    .setButtonText("Add item")
    .onClick(() => {
      const item = createDockItem(host.plugin.settings.items);
      host.plugin.settings.items.push(item);
      host.expandedItemIds.add(item.id);
      void host.plugin.saveSettings().then(() => host.update());
    }));

  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const cleanup of detailCleanups.values()) cleanup();
    detailCleanups.clear();
  };
}
