from pathlib import Path
import re


def sub_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f"patch failed ({label}): {count} matches")
    return updated


# Dock roots live under the central workspace and follow the active view's live geometry.
p = Path("src/dock.ts")
text = p.read_text()
text = sub_once(
    text,
    r"(\s+private renderVersion = 0;\n)",
    r"\1  private geometryObserver: ResizeObserver | null = null;\n  private observedGeometryElements: Element[] = [];\n",
    "dock observer fields",
)
text = sub_once(
    text,
    r'this\.root = this\.document\.body\.createDiv\(\{ cls: "ledge-dock-root" \}\);\n\s*this\.root\.dataset\.ledgeDockRoot = "true";',
    'this.root = this.document.createElement("div");\n    this.root.className = "ledge-dock-root";\n    this.root.dataset.ledgeDockRoot = "true";\n    (this.workspaceHost() ?? this.document.body).appendChild(this.root);',
    "workspace mount",
)
text = sub_once(
    text,
    r'(if \(view\) this\.registerDomEvent\(view, "resize", \(\) => this\.refreshGeometryAndActiveState\(\)\);\n)(\s*this\.register\(\(\) => \{\n\s*this\.clearTimers\(\);)',
    r"\1    this.bindGeometryObserver();\n\2\n      this.geometryObserver?.disconnect();\n      this.geometryObserver = null;\n      this.observedGeometryElements = [];",
    "observer lifecycle",
)
text = sub_once(
    text,
    r'(if \(!this\.controller\.settings\(\)\.autoHide && !this\.visible\) this\.setVisible\(true\);\n)(\s*this\.positionAgainstRootPane\(\);)',
    r"\1    this.ensureWorkspaceHost();\n    this.bindGeometryObserver();\n\2",
    "live geometry refresh",
)
helpers = '''  private workspaceHost(): HTMLElement | null {
    const leaf = this.controller.leafForDocument(this.document);
    const leafContainer = leaf?.view?.containerEl;
    return leafContainer?.closest<HTMLElement>(".workspace-split.mod-root")
      ?? this.document.querySelector<HTMLElement>(".workspace-split.mod-root")
      ?? this.document.querySelector<HTMLElement>(".workspace");
  }

  private activeWorkspaceContent(
    leaf: WorkspaceLeaf | null,
    leafContainer: HTMLElement | undefined,
  ): HTMLElement | null {
    return (leaf?.view as { contentEl?: HTMLElement } | undefined)?.contentEl
      ?? leafContainer?.querySelector<HTMLElement>(".view-content")
      ?? leafContainer
      ?? null;
  }

  private ensureWorkspaceHost(): void {
    const host = this.workspaceHost();
    if (host && this.root.parentElement !== host) host.appendChild(this.root);
  }

  private bindGeometryObserver(): void {
    const ResizeObserverCtor = this.document.defaultView?.ResizeObserver;
    if (!ResizeObserverCtor) return;

    const host = this.workspaceHost();
    const leaf = this.controller.leafForDocument(this.document);
    const leafContainer = leaf?.view?.containerEl;
    const content = this.activeWorkspaceContent(leaf, leafContainer);
    const candidates = [host, content].filter((element): element is HTMLElement => Boolean(element));
    const elements = candidates.filter((element, index) => candidates.indexOf(element) === index);
    const unchanged = elements.length === this.observedGeometryElements.length
      && elements.every((element, index) => element === this.observedGeometryElements[index]);
    if (unchanged) return;

    if (!this.geometryObserver) {
      this.geometryObserver = new ResizeObserverCtor(() => this.refreshGeometryAndActiveState());
    } else {
      this.geometryObserver.disconnect();
    }
    this.observedGeometryElements = elements;
    for (const element of elements) this.geometryObserver.observe(element);
  }

'''
text = sub_once(
    text,
    r"  private positionAgainstRootPane\(\): void \{",
    helpers + "  private positionAgainstRootPane(): void {",
    "workspace helpers",
)
anchor = '''  private anchorRectForPosition(
    _position: DockPosition,
    leaf: WorkspaceLeaf | null,
    leafContainer: HTMLElement | undefined,
    fallbackRect: DOMRect,
  ): DOMRect {
    const viewContent = this.activeWorkspaceContent(leaf, leafContainer);
    const contentRect = viewContent?.getBoundingClientRect();
    if (!contentRect || contentRect.width <= 0 || contentRect.height <= 0) return fallbackRect;
    return contentRect;
  }

'''
text = sub_once(
    text,
    r"  private anchorRectForPosition\([\s\S]*?\n  private positionTrigger\(",
    anchor + "  private positionTrigger(",
    "active content anchor",
)
p.write_text(text)


# Visible Settings tab: replace item pages with a stable inline accordion renderer.
p = Path("src/icon-library-setting-tab.ts")
text = p.read_text()
text = sub_once(
    text,
    r'(import \{ openIconPicker \} from "\./icon-picker";\n)',
    r'\1import {\n  confirmDeleteDockItem,\n  renderDockItemsAccordion,\n  type DockItemsAccordionHost,\n} from "./item-settings-accordion";\n',
    "accordion import",
)
text = sub_once(
    text,
    r"const DOCK_SETTINGS_SECTIONS: DockSettingsSection\[\] = \[[\s\S]*?\n\];",
    '''const DOCK_SETTINGS_SECTIONS: DockSettingsSection[] = [
  "appearance",
  "layout",
  "behavior",
  "visibility",
  "items",
  "trigger",
];''',
    "tab order",
)
text = sub_once(
    text,
    r'private activeDockSection: DockSettingsSection = "items";',
    'private activeDockSection: DockSettingsSection = "appearance";',
    "default tab",
)
text = sub_once(
    text,
    r"(\s+private activeDragHandle: HTMLButtonElement \| null = null;\n)",
    r"\1  private readonly expandedItemIds = new Set<string>();\n",
    "expanded item state",
)
text = sub_once(
    text,
    r'(\s+if \(section === "items" && !itemDecoratorInserted\) \{[\s\S]*?itemDecoratorInserted = true;\n\s+\}\n)(\s+definitions\.push\(definition\);)',
    r'\1      if (section === "items") {\n        definitions.push(this.dockItemsAccordionDefinition());\n        continue;\n      }\n\2',
    "accordion definition substitution",
)
accordion_methods = '''  private itemAccordionHost(): DockItemsAccordionHost {
    return {
      app: this.app,
      plugin: this.ledgePlugin,
      expandedItemIds: this.expandedItemIds,
      getControlValue: (key) => this.getControlValue(key),
      setControlValue: (key, value) => this.setControlValue(key, value),
      update: () => this.update(),
    };
  }

  private dockItemsAccordionDefinition(): SettingDefinitionItem {
    return {
      type: "group",
      heading: "Dock items",
      cls: "ledge-settings-panel-items",
      items: [{
        name: "Dock items",
        searchable: false,
        render: (setting) => {
          const cleanup = renderDockItemsAccordion(setting, this.itemAccordionHost());
          this.scheduleItemRowControls();
          return () => {
            cleanup();
            this.clearItemDragState();
          };
        },
      }],
    };
  }

'''
text = sub_once(
    text,
    r"  private applyDockSectionVisibility\(\): void \{",
    accordion_methods + "  private applyDockSectionVisibility(): void {",
    "accordion methods",
)
text = sub_once(
    text,
    r'(downButton\.addEventListener\("click", \(event: MouseEvent\) => \{[\s\S]*?this\.moveDockItem\(itemId, 1\);\n\s*\}\);)',
    r'''\1

      const deleteButton = controls.createEl("button", {
        cls: "clickable-icon ledge-item-delete-button",
        attr: { type: "button", "aria-label": "Delete dock item", title: "Delete dock item" },
      });
      setIcon(deleteButton, "trash-2");
      deleteButton.addEventListener("pointerdown", (event: PointerEvent) => event.stopPropagation());
      deleteButton.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        confirmDeleteDockItem(this.itemAccordionHost(), itemId);
      });''',
    "row delete control",
)
p.write_text(text)


# Accordion styling.
p = Path("styles.css")
text = p.read_text()
css = '''
.ledge-items-accordion-setting {
  display: block;
  padding: 0;
  border: 0;
}

.ledge-items-accordion-setting > .setting-item-control {
  width: 100%;
  display: block;
}

.ledge-items-accordion {
  width: 100%;
  display: grid;
  gap: var(--size-4-2);
}

.ledge-item-accordion {
  padding: 0;
  overflow: hidden;
}

.ledge-item-accordion > .setting-item {
  padding: var(--size-4-3);
  border: 0;
  cursor: pointer;
}

.ledge-item-accordion:not(.is-expanded) > .ledge-settings-item-header {
  border-bottom-color: transparent;
}

.ledge-item-accordion-details {
  padding: 0 var(--size-4-3) var(--size-4-2);
}

.ledge-item-accordion-details[hidden] {
  display: none;
}

.ledge-item-row-state {
  min-width: max-content;
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.ledge-item-row-warning,
.ledge-item-row-warning > svg {
  width: var(--icon-s);
  height: var(--icon-s);
  color: var(--text-warning);
}

.ledge-item-delete-button {
  color: var(--text-error);
}

.ledge-items-empty-state {
  padding: var(--size-4-4);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
  text-align: center;
}

.ledge-delete-confirmation-actions .setting-item-info {
  display: none;
}
'''
text = sub_once(
    text,
    r"(\.ledge-settings-panel-items \{[\s\S]*?\n\})",
    r"\1\n" + css,
    "accordion CSS",
)
p.write_text(text)


# Source-level regression coverage.
p = Path("tests/manifest.test.ts")
text = p.read_text()
if "workspace anchoring and Dock item accordion stay regression-covered" not in text:
    text += r'''

void test("workspace anchoring and Dock item accordion stay regression-covered", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const settings = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const accordion = fs.readFileSync("src/item-settings-accordion.ts", "utf8");

  assert.match(dock, /workspaceHost\(\)/);
  assert.match(dock, /ResizeObserver/);
  assert.match(dock, /activeWorkspaceContent/);
  assert.match(settings, /ledge-item-delete-button/);
  assert.match(settings, /"appearance",[\s\S]*"layout",[\s\S]*"behavior",[\s\S]*"visibility",[\s\S]*"items",[\s\S]*"trigger"/);
  assert.match(accordion, /ConfirmDockItemDeleteModal extends Modal/);
  assert.match(accordion, /ledge-item-accordion-toggle/);
});
'''
p.write_text(text)


p = Path("CHANGELOG.md")
text = p.read_text()
if "Keep every Dock and trigger anchored to the active workspace content" not in text:
    text = text.replace(
        "## Unreleased\n\n",
        "## Unreleased\n\n"
        "- Keep every Dock and trigger anchored to the active workspace content and observe live workspace geometry so collapsing or reopening sidebars repositions them immediately.\n"
        "- Replace Dock item sub-pages with inline expandable accordions, move delete controls onto item rows with confirmation, and keep item identity stable while editing labels.\n"
        "- Reorder Dock settings sections to Appearance → Layout → Behavior → Visibility → Items → Trigger.\n\n",
        1,
    )
p.write_text(text)
