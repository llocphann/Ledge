import {
  App,
  Component,
  Notice,
  TFile,
  getIcon,
  normalizePath,
  setIcon,
  type WorkspaceLeaf,
} from "obsidian";
import { computeCornerLayout, isCornerPosition, isVerticalPosition } from "./layout";
import type {
  DockItemSettings,
  DockPosition,
  LedgeSettings,
} from "./types";

export interface LedgeHost {
  app: App;
  settings: LedgeSettings;
  saveSettings(refresh?: boolean): Promise<void>;
}

interface DragState {
  pointerId: number;
  button: HTMLButtonElement;
  startX: number;
  startY: number;
  moved: boolean;
}

export class DockController extends Component {
  private readonly instances = new Map<Document, DockInstance>();
  private refreshFrame: number | null = null;

  constructor(private readonly host: LedgeHost) {
    super();
  }

  onload(): void {
    const { workspace } = this.host.app;
    this.registerEvent(workspace.on("layout-change", () => this.scheduleRefresh()));
    this.registerEvent(workspace.on("active-leaf-change", () => this.scheduleRefresh()));
    this.registerEvent(workspace.on("file-open", () => this.scheduleRefresh()));
    this.registerEvent(workspace.on("window-open", (_workspaceWindow, openedWindow) => {
      this.mountDocument(openedWindow.document);
    }));
    this.registerEvent(workspace.on("window-close", (_workspaceWindow, closedWindow) => {
      this.unmountDocument(closedWindow.document);
    }));
    this.registerEvent(this.host.app.vault.on("rename", () => this.applySettings()));

    this.register(() => {
      if (this.refreshFrame !== null) window.cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
      this.instances.clear();
    });

    this.mountAllDocuments();
    this.scheduleRefresh();
  }

  applySettings(): void {
    this.mountAllDocuments();
    for (const instance of this.instances.values()) instance.render();
    this.scheduleRefresh();
  }

  settings(): LedgeSettings {
    return this.host.settings;
  }

  app(): App {
    return this.host.app;
  }

  resolveTarget(target: string): TFile | null {
    const normalized = normalizePath(target.trim());
    if (!normalized) return null;
    const exact = this.host.app.vault.getFileByPath(normalized);
    if (exact) return exact;
    return this.host.app.metadataCache.getFirstLinkpathDest(target, "") || null;
  }

  leafForDocument(document: Document): WorkspaceLeaf | null {
    const recentLeaf = this.host.app.workspace.getMostRecentLeaf();
    if (this.isRootLeafForDocument(recentLeaf, document)) return recentLeaf;

    let result: WorkspaceLeaf | null = null;
    this.host.app.workspace.iterateAllLeaves((leaf) => {
      if (!result && this.isRootLeafForDocument(leaf, document)) result = leaf;
    });
    return result;
  }

  async openTarget(document: Document, itemId: string): Promise<void> {
    const item = this.host.settings.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const file = this.resolveTarget(item.target);
    if (!file) {
      new Notice(`Ledge could not find: ${item.target || item.label}`);
      return;
    }

    const leaf = this.leafForDocument(document) || this.host.app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }

  async persistVisibleOrder(visibleIds: string[]): Promise<void> {
    const orderedVisible = visibleIds
      .map((id) => this.host.settings.items.find((item) => item.enabled && item.id === id))
      .filter((item): item is DockItemSettings => Boolean(item));
    const queue = [...orderedVisible];
    this.host.settings.items = this.host.settings.items.map((item) => {
      if (!item.enabled) return item;
      return queue.shift() || item;
    });
    await this.host.saveSettings(false);
    this.applySettings();
  }

  private isRootLeafForDocument(leaf: WorkspaceLeaf | null, document: Document): boolean {
    const container = leaf?.view?.containerEl;
    return container?.ownerDocument === document
      && Boolean(container.closest(".workspace-split.mod-root"));
  }

  private mountAllDocuments(): void {
    const documents = new Set<Document>();
    const workspaceDocument = this.host.app.workspace.containerEl.ownerDocument;
    documents.add(workspaceDocument);
    this.host.app.workspace.iterateAllLeaves((leaf) => {
      const document = leaf.view?.containerEl?.ownerDocument;
      if (document) documents.add(document);
    });

    for (const document of documents) this.mountDocument(document);
    for (const document of this.instances.keys()) {
      if (!documents.has(document) || !document.defaultView) this.unmountDocument(document);
    }
  }

  private mountDocument(document: Document): void {
    const current = this.instances.get(document);
    if (current?.isMounted()) return;
    if (current) this.unmountDocument(document);
    if (!document.body) return;

    const instance = new DockInstance(this, document);
    this.instances.set(document, instance);
    this.addChild(instance);
  }

  private unmountDocument(document: Document): void {
    const instance = this.instances.get(document);
    if (!instance) return;
    this.removeChild(instance);
    this.instances.delete(document);
  }

  private scheduleRefresh(): void {
    if (this.refreshFrame !== null) return;
    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.mountAllDocuments();
      for (const instance of this.instances.values()) instance.refreshGeometryAndActiveState();
    });
  }
}

class DockInstance extends Component {
  private root!: HTMLDivElement;
  private trigger!: HTMLButtonElement;
  private panel!: HTMLElement;
  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private dragState: DragState | null = null;
  private suppressClickId: string | null = null;
  private visible = false;
  private renderVersion = 0;

  constructor(
    private readonly controller: DockController,
    private readonly document: Document,
  ) {
    super();
  }

  onload(): void {
    this.root = this.document.body.createDiv({ cls: "ledge-dock-root" });
    this.root.dataset.ledgeDockRoot = "true";

    this.trigger = this.root.createEl("button", { cls: "ledge-dock-trigger" });
    this.trigger.type = "button";
    this.trigger.setAttribute("aria-label", "Reveal dock");
    this.trigger.setAttribute("aria-expanded", "false");

    this.panel = this.root.createEl("nav", { cls: "ledge-dock-panel" });
    this.panel.setAttribute("aria-label", "Vault navigation");

    this.bindRevealBehavior();
    this.bindDockInteraction();
    const view = this.document.defaultView;
    if (view) this.registerDomEvent(view, "resize", () => this.refreshGeometryAndActiveState());
    this.register(() => {
      this.clearTimers();
      this.root.remove();
    });

    this.render();
  }

  isMounted(): boolean {
    return this.root?.isConnected === true;
  }

  render(): void {
    const settings = this.controller.settings();
    this.renderVersion += 1;
    this.root.hidden = !settings.enabled;
    this.root.dataset.position = settings.position;
    this.root.classList.toggle("is-auto-hide", settings.autoHide);
    this.root.classList.toggle("is-labels-hidden", !settings.showLabels);
    this.root.classList.toggle("is-magnification-disabled", !settings.magnification);
    this.root.classList.toggle("is-background-hidden", !settings.showDockBackground);
    this.root.classList.toggle("is-border-hidden", !settings.showDockBorder);
    this.root.classList.toggle("is-trigger-hidden", !settings.showTrigger);
    this.root.classList.toggle("is-trigger-background-hidden", !settings.triggerShowBackground);
    this.root.classList.toggle("is-trigger-border-hidden", !settings.triggerShowBorder);

    this.setRootVariables(settings);
    this.panel.replaceChildren();
    for (const item of settings.items.filter((candidate) => candidate.enabled)) {
      this.createButton(item, this.renderVersion);
    }

    this.applyLayout(settings.position);
    this.clearMagnification();
    if (!settings.autoHide) this.setVisible(true);
    else this.setVisible(this.visible);
    this.refreshGeometryAndActiveState();
  }

  refreshGeometryAndActiveState(): void {
    if (!this.isMounted() || this.root.hidden) return;
    this.positionAgainstRootPane();
    this.markActiveTarget();
  }

  private setRootVariables(settings: LedgeSettings): void {
    const style = this.root.style;
    style.setProperty("--ledge-item-size", `${settings.itemSize}px`);
    style.setProperty("--ledge-icon-size", `${settings.iconSize}px`);
    style.setProperty("--ledge-gap", `${settings.gap}px`);
    style.setProperty("--ledge-padding", `${settings.padding}px`);
    style.setProperty("--ledge-radius", `${settings.radius}px`);
    style.setProperty("--ledge-trigger-size", `${settings.triggerSize}px`);
    style.setProperty("--ledge-trigger-surface-thickness", `${settings.triggerSurfaceThickness}px`);
    style.setProperty("--ledge-trigger-opacity", `${settings.triggerSurfaceOpacity}%`);
    style.setProperty("--ledge-trigger-angle", `${settings.triggerGradientAngle}deg`);
    style.setProperty("--ledge-trigger-radius", `${settings.triggerRadius}px`);
    style.setProperty("--ledge-trigger-border-width", `${settings.triggerBorderWidth}px`);
    style.setProperty("--ledge-motion-duration", `${settings.motionDuration}ms`);
    style.setProperty("--ledge-magnification", String(settings.magnificationScale));
    style.setProperty("--ledge-neighbor-scale", String(settings.neighborScale));
    style.setProperty("--ledge-surface-opacity", `${settings.surfaceOpacity}%`);
    style.setProperty("--ledge-gradient-angle", `${settings.gradientAngle}deg`);
    style.setProperty(
      "--ledge-accent",
      settings.accentColor || "var(--interactive-accent)",
    );
    style.setProperty(
      "--ledge-border-color",
      settings.borderColor || "var(--background-modifier-border-hover)",
    );
    style.setProperty(
      "--ledge-trigger-border-color",
      settings.triggerBorderColor || "var(--background-modifier-border-hover)",
    );

    if (settings.surfaceMode === "solid") {
      style.setProperty("--ledge-surface-start", settings.surfaceColor);
      style.setProperty("--ledge-surface-end", settings.surfaceColor);
    } else if (settings.surfaceMode === "gradient") {
      style.setProperty("--ledge-surface-start", settings.gradientStart);
      style.setProperty("--ledge-surface-end", settings.gradientEnd);
    } else {
      style.setProperty("--ledge-surface-start", "var(--background-secondary)");
      style.setProperty("--ledge-surface-end", "var(--background-primary-alt)");
    }

    if (settings.triggerSurfaceMode === "solid") {
      style.setProperty("--ledge-trigger-start", settings.triggerSurfaceColor);
      style.setProperty("--ledge-trigger-end", settings.triggerSurfaceColor);
    } else if (settings.triggerSurfaceMode === "gradient") {
      style.setProperty("--ledge-trigger-start", settings.triggerGradientStart);
      style.setProperty("--ledge-trigger-end", settings.triggerGradientEnd);
    } else {
      style.setProperty("--ledge-trigger-start", "var(--interactive-accent)");
      style.setProperty("--ledge-trigger-end", "var(--background-secondary)");
    }
  }

  private createButton(item: DockItemSettings, version: number): HTMLButtonElement {
    const button = this.panel.createEl("button");
    button.type = "button";
    button.className = "ledge-dock-item";
    button.dataset.itemId = item.id;
    button.dataset.target = item.target;
    button.setAttribute("aria-label", item.label || item.target || "Dock item");
    button.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight");

    if (item.iconColor) button.style.setProperty("--ledge-item-icon-color", item.iconColor);
    if (item.tileGradientStart) {
      button.style.setProperty("--ledge-item-gradient-start", item.tileGradientStart);
    }
    if (item.tileGradientEnd) {
      button.style.setProperty("--ledge-item-gradient-end", item.tileGradientEnd);
    }

    const icon = button.createSpan();
    icon.className = "ledge-dock-icon";
    icon.setAttribute("aria-hidden", "true");
    const iconSize = item.iconSize > 0 ? item.iconSize : this.controller.settings().iconSize;
    icon.style.setProperty("--ledge-current-icon-size", `${iconSize}px`);
    this.renderIcon(icon, item, version);

    const label = button.createSpan();
    label.className = "ledge-dock-label";
    label.textContent = item.label || item.target || "Untitled";
    if (!this.controller.resolveTarget(item.target)) {
      button.classList.add("is-missing-target");
      button.title = `Missing target: ${item.target || "No path configured"}`;
    }
    return button;
  }

  private renderIcon(iconEl: HTMLElement, item: DockItemSettings, version: number): void {
    if (item.iconSource === "lucide") {
      setIcon(iconEl, getIcon(item.icon) ? item.icon : "circle-help");
      return;
    }

    const file = this.controller.app().vault.getFileByPath(normalizePath(item.icon));
    if (!file) {
      iconEl.classList.add("is-missing-icon");
      setIcon(iconEl, "image-off");
      return;
    }

    const resource = this.controller.app().vault.getResourcePath(file);
    if (item.iconRenderMode === "original") {
      const image = iconEl.createEl("img");
      image.className = "ledge-dock-icon-image";
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      image.src = resource;
      image.addEventListener("error", () => {
        if (version !== this.renderVersion || !iconEl.isConnected) return;
        iconEl.replaceChildren();
        iconEl.classList.add("is-missing-icon");
        setIcon(iconEl, "image-off");
      }, { once: true });
      return;
    }

    const mask = iconEl.createSpan();
    mask.className = "ledge-dock-icon-mask";
    const url = `url(${JSON.stringify(resource)})`;
    mask.style.maskImage = url;
  }

  private applyLayout(position: DockPosition): void {
    const buttons = Array.from(this.panel.querySelectorAll<HTMLButtonElement>(".ledge-dock-item"));
    this.panel.classList.toggle("is-corner", isCornerPosition(position));
    this.panel.classList.toggle("is-vertical", isVerticalPosition(position));
    this.panel.classList.toggle(
      "is-horizontal",
      !isCornerPosition(position) && !isVerticalPosition(position),
    );

    for (const button of buttons) {
      button.style.removeProperty("grid-column");
      button.style.removeProperty("grid-row");
    }

    if (!isCornerPosition(position)) {
      this.panel.style.removeProperty("--ledge-corner-columns");
      this.panel.style.removeProperty("--ledge-corner-rows");
      return;
    }

    const layout = computeCornerLayout(position, buttons.length);
    this.panel.style.setProperty("--ledge-corner-columns", String(layout.columns));
    this.panel.style.setProperty("--ledge-corner-rows", String(layout.rows));
    buttons.forEach((button, index) => {
      const slot = layout.slots[index];
      if (!slot) return;
      button.style.gridColumn = String(slot.column);
      button.style.gridRow = String(slot.row);
    });
  }

  private positionAgainstRootPane(): void {
    const settings = this.controller.settings();
    const leaf = this.controller.leafForDocument(this.document);
    const leafContainer = leaf?.view?.containerEl;
    const rootPane = leafContainer?.closest(".workspace-split.mod-root")
      || this.document.querySelector(".workspace-split.mod-root")
      || this.document.querySelector(".workspace");
    const rect = rootPane?.getBoundingClientRect();
    if (!rect) return;

    const viewportWidth = this.document.defaultView?.innerWidth
      || this.document.documentElement.clientWidth;
    const viewportHeight = this.document.defaultView?.innerHeight
      || this.document.documentElement.clientHeight;
    const panelWidth = this.panel.offsetWidth;
    const panelHeight = this.panel.offsetHeight;
    const offset = settings.edgeOffset;
    const position = settings.position;
    let left = rect.left;
    let top = rect.top;

    if (position === "left") {
      left = rect.left + offset;
      top = rect.top + (rect.height - panelHeight) / 2;
    } else if (position === "right") {
      left = rect.right - panelWidth - offset;
      top = rect.top + (rect.height - panelHeight) / 2;
    } else if (position === "top") {
      left = rect.left + (rect.width - panelWidth) / 2;
      top = rect.top + offset;
    } else if (position === "bottom") {
      left = rect.left + (rect.width - panelWidth) / 2;
      top = rect.bottom - panelHeight - offset;
    } else {
      left = position.endsWith("right")
        ? rect.right - panelWidth - offset
        : rect.left + offset;
      top = position.startsWith("bottom")
        ? rect.bottom - panelHeight - offset
        : rect.top + offset;
    }

    const safety = 4;
    left = Math.min(Math.max(safety, left), Math.max(safety, viewportWidth - panelWidth - safety));
    top = Math.min(Math.max(safety, top), Math.max(safety, viewportHeight - panelHeight - safety));
    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
    this.positionTrigger(rect, position, settings.triggerSize, settings.triggerLength);
  }

  private positionTrigger(
    rect: DOMRect,
    position: DockPosition,
    triggerSize: number,
    triggerLength: number,
  ): void {
    let left = rect.left;
    let top = rect.top;
    let width = triggerSize;
    let height = triggerLength;

    if (position === "left" || position === "right") {
      left = position === "right" ? rect.right - triggerSize : rect.left;
      top = rect.top + (rect.height - triggerLength) / 2;
    } else if (position === "top" || position === "bottom") {
      width = triggerLength;
      height = triggerSize;
      left = rect.left + (rect.width - triggerLength) / 2;
      top = position === "bottom" ? rect.bottom - triggerSize : rect.top;
    } else {
      width = Math.max(triggerSize, 34);
      height = width;
      left = position.endsWith("right") ? rect.right - width : rect.left;
      top = position.startsWith("bottom") ? rect.bottom - height : rect.top;
    }

    this.trigger.style.left = `${left}px`;
    this.trigger.style.top = `${top}px`;
    this.trigger.style.width = `${width}px`;
    this.trigger.style.height = `${height}px`;
  }

  private markActiveTarget(): void {
    const leaf = this.controller.leafForDocument(this.document);
    const candidate: unknown = (leaf?.view as { file?: unknown } | undefined)?.file;
    const activeFile = candidate instanceof TFile ? candidate : null;
    const buttons = Array.from(
      this.panel.querySelectorAll<HTMLButtonElement>(".ledge-dock-item"),
    );
    for (const button of buttons) {
      const itemId = button.dataset.itemId || "";
      const item = this.controller.settings().items.find((candidate) => candidate.id === itemId);
      const target = item ? this.controller.resolveTarget(item.target) : null;
      const active = Boolean(activeFile && target && activeFile.path === target.path);
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  }

  private bindRevealBehavior(): void {
    this.registerDomEvent(this.trigger, "pointerenter", () => this.scheduleShow());
    this.registerDomEvent(this.trigger, "pointerleave", () => this.scheduleHide());
    this.registerDomEvent(this.panel, "pointerenter", () => {
      this.cancelHide();
      if (this.controller.settings().autoHide) this.setVisible(true);
    });
    this.registerDomEvent(this.panel, "pointerleave", () => {
      this.clearMagnification();
      this.scheduleHide();
    });
    this.registerDomEvent(this.trigger, "focus", () => this.setVisible(true));
    this.registerDomEvent(this.panel, "focusin", () => this.setVisible(true));
    this.registerDomEvent(this.root, "focusout", () => {
      this.document.defaultView?.setTimeout(() => {
        if (!this.root.contains(this.document.activeElement)) this.scheduleHide();
      }, 0);
    });
    this.registerDomEvent(this.trigger, "click", () => {
      if (!this.controller.settings().autoHide) return;
      this.clearTimers();
      this.setVisible(!this.visible);
    });
  }

  private bindDockInteraction(): void {
    this.registerDomEvent(this.panel, "click", (event) => {
      const button = this.eventButton(event);
      if (!button) return;
      const itemId = button.dataset.itemId || "";
      if (this.suppressClickId === itemId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      void this.controller.openTarget(this.document, itemId).catch((error: unknown) => {
        console.error("[Ledge] Could not open dock target", error);
      });
    });

    this.registerDomEvent(this.panel, "pointerover", (event) => {
      const button = this.eventButton(event);
      if (button) this.applyMagnification(button);
    });

    this.registerDomEvent(this.panel, "focusin", (event) => {
      const button = this.eventButton(event);
      if (button) this.applyMagnification(button);
    });

    this.registerDomEvent(this.panel, "pointerdown", (event) => {
      if (event.isPrimary === false || event.button !== 0) return;
      const button = this.eventButton(event);
      if (!button) return;
      this.dragState = {
        pointerId: event.pointerId,
        button,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      button.setPointerCapture(event.pointerId);
    });

    this.registerDomEvent(this.panel, "pointermove", (event) => this.moveDrag(event));
    this.registerDomEvent(this.panel, "pointerup", (event) => this.finishDrag(event, false));
    this.registerDomEvent(this.panel, "pointercancel", (event) => this.finishDrag(event, true));
    this.registerDomEvent(this.panel, "lostpointercapture", (event) => this.finishDrag(event, true));

    this.registerDomEvent(this.panel, "keydown", (event) => {
      if (!event.altKey || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }
      const button = this.eventButton(event);
      if (!button) return;
      const previous = event.key === "ArrowUp" || event.key === "ArrowLeft";
      const sibling = previous ? button.previousElementSibling : button.nextElementSibling;
      if (!(sibling instanceof this.document.defaultView!.HTMLButtonElement)) return;
      event.preventDefault();
      if (previous) this.panel.insertBefore(button, sibling);
      else this.panel.insertBefore(sibling, button);
      this.applyLayout(this.controller.settings().position);
      button.focus();
      void this.saveDomOrder();
    });
  }

  private eventButton(event: Event): HTMLButtonElement | null {
    const target = event.target;
    if (!(target instanceof this.document.defaultView!.Element)) return null;
    const button = target.closest<HTMLButtonElement>("button.ledge-dock-item");
    return button?.parentElement === this.panel ? button : null;
  }

  private moveDrag(event: PointerEvent): void {
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && distance < 7) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.button.classList.add("is-dragging");
      drag.button.setAttribute("aria-grabbed", "true");
    }
    event.preventDefault();

    const hit = this.document.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest<HTMLButtonElement>("button.ledge-dock-item");
    if (!target || target === drag.button || target.parentElement !== this.panel) return;
    const buttons = Array.from(this.panel.querySelectorAll<HTMLButtonElement>(".ledge-dock-item"));
    const draggedIndex = buttons.indexOf(drag.button);
    const targetIndex = buttons.indexOf(target);
    if (draggedIndex < targetIndex) target.after(drag.button);
    else target.before(drag.button);
    this.applyLayout(this.controller.settings().position);
  }

  private finishDrag(event: PointerEvent, cancelled: boolean): void {
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.dragState = null;
    drag.button.classList.remove("is-dragging");
    drag.button.removeAttribute("aria-grabbed");
    if (drag.button.hasPointerCapture(drag.pointerId)) {
      drag.button.releasePointerCapture(drag.pointerId);
    }
    if (!drag.moved) return;
    event.preventDefault();
    if (cancelled) {
      this.render();
      return;
    }

    this.suppressClickId = drag.button.dataset.itemId || null;
    void this.saveDomOrder();
    this.document.defaultView?.setTimeout(() => {
      this.suppressClickId = null;
    }, 0);
  }

  private async saveDomOrder(): Promise<void> {
    const ids = Array.from(this.panel.querySelectorAll<HTMLButtonElement>(".ledge-dock-item"))
      .map((button) => button.dataset.itemId || "")
      .filter(Boolean);
    await this.controller.persistVisibleOrder(ids);
  }

  private applyMagnification(button: HTMLButtonElement): void {
    this.clearMagnification();
    if (!this.controller.settings().magnification) return;
    const buttons = Array.from(this.panel.querySelectorAll<HTMLButtonElement>(".ledge-dock-item"));
    const index = buttons.indexOf(button);
    if (index < 0) return;
    button.classList.add("is-magnified");
    buttons[index - 1]?.classList.add("is-neighbor");
    buttons[index + 1]?.classList.add("is-neighbor");
  }

  private clearMagnification(): void {
    const buttons = Array.from(this.panel.querySelectorAll<HTMLButtonElement>(
      ".ledge-dock-item.is-magnified, .ledge-dock-item.is-neighbor",
    ));
    for (const button of buttons) {
      button.classList.remove("is-magnified", "is-neighbor");
    }
  }

  private scheduleShow(delay = this.controller.settings().revealDelay): void {
    if (!this.controller.settings().autoHide) return;
    this.cancelHide();
    this.cancelShow();
    this.showTimer = this.document.defaultView?.setTimeout(() => {
      this.showTimer = null;
      this.setVisible(true);
    }, delay) ?? null;
  }

  private scheduleHide(): void {
    if (!this.controller.settings().autoHide || this.dragState) return;
    this.cancelShow();
    this.cancelHide();
    const delay = this.controller.settings().hideDelay;
    this.hideTimer = this.document.defaultView?.setTimeout(() => {
      this.hideTimer = null;
      if (!this.root.matches(":hover") && !this.root.contains(this.document.activeElement)) {
        this.setVisible(false);
      }
    }, delay) ?? null;
  }

  private cancelShow(): void {
    if (this.showTimer === null) return;
    this.document.defaultView?.clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private cancelHide(): void {
    if (this.hideTimer === null) return;
    this.document.defaultView?.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private clearTimers(): void {
    this.cancelShow();
    this.cancelHide();
  }

  private setVisible(visible: boolean): void {
    this.visible = visible;
    this.panel.classList.toggle("is-visible", visible);
    this.trigger.classList.toggle("is-visible", visible);
    this.trigger.setAttribute("aria-expanded", visible ? "true" : "false");
    if (!visible) this.clearMagnification();
  }
}
