from pathlib import Path
import re

path = Path("src/icon-library-setting-tab.ts")
source = path.read_text()

old_header = '''export class LedgeIconLibrarySettingTab extends LedgeSettingTab {
  private activeDockSection: DockSettingsSection = "items";
  private draggedItemId: string | null = null;

  constructor(
    app: App,
    private readonly ledgePlugin: LedgePlugin,
    private readonly pickerApp: App = app,
  ) {
    super(app, ledgePlugin);
  }

  override display(): void {
    super.display();
    this.scheduleItemRowControls();
  }

  override update(): void {
    super.update();
    this.scheduleItemRowControls();
  }
'''
new_header = '''export class LedgeIconLibrarySettingTab extends LedgeSettingTab {
  private activeDockSection: DockSettingsSection = "items";
  private draggedItemId: string | null = null;
  private dragPointerId: number | null = null;
  private dragTargetItemId: string | null = null;
  private dragDropAfter = false;
  private activeDragHandle: HTMLButtonElement | null = null;

  constructor(
    app: App,
    private readonly ledgePlugin: LedgePlugin,
    private readonly pickerApp: App = app,
  ) {
    super(app, ledgePlugin);
  }
'''
assert old_header in source, "class header/display hooks changed"
source = source.replace(old_header, new_header, 1)

old_defs = '''    const definitions: SettingDefinitionItem[] = [];
    let dockWorkspaceInserted = false;
'''
new_defs = '''    const definitions: SettingDefinitionItem[] = [];
    let dockWorkspaceInserted = false;
    let itemDecoratorInserted = false;
'''
assert old_defs in source
source = source.replace(old_defs, new_defs, 1)

old_section = '''      if (section && !dockWorkspaceInserted) {
        definitions.push(this.dockWorkspaceDefinitions());
        dockWorkspaceInserted = true;
      }
      definitions.push(definition);
'''
new_section = '''      if (section && !dockWorkspaceInserted) {
        definitions.push(this.dockWorkspaceDefinitions());
        dockWorkspaceInserted = true;
      }
      if (section === "items" && !itemDecoratorInserted) {
        definitions.push(this.itemRowDecoratorDefinition());
        itemDecoratorInserted = true;
      }
      definitions.push(definition);
'''
assert old_section in source
source = source.replace(old_section, new_section, 1)

old_tail = '''    this.decorateControls(definitions);
    if (this.containerEl.isConnected) this.scheduleItemRowControls();
    return definitions;
  }
'''
new_tail = '''    this.decorateControls(definitions);
    return definitions;
  }
'''
assert old_tail in source
source = source.replace(old_tail, new_tail, 1)

anchor = '''  private applyDockSectionVisibility(): void {
'''
hook = '''  private itemRowDecoratorDefinition(): SettingDefinitionItem {
    return {
      name: "Dock item reorder controls",
      cls: "ledge-item-row-decorator",
      searchable: false,
      render: () => {
        this.scheduleItemRowControls();
        return () => this.clearItemDragState();
      },
    };
  }

'''
assert anchor in source
source = source.replace(anchor, hook + anchor, 1)

pattern = re.compile(
    r'  private decorateItemRowControls\(\): number \{.*?\n  private decorateControls\(definitions: SettingDefinitionItem\[\]\): void \{',
    re.S,
)
match = pattern.search(source)
assert match, "reorder implementation region not found"
replacement = '''  private decorateItemRowControls(): number {
    const rows = this.itemRows();
    const items = this.ledgePlugin.settings.items;

    for (const { itemId, row } of rows) {
      const controlEl = row.querySelector<HTMLElement>(".setting-item-control");
      if (!controlEl || controlEl.querySelector(".ledge-item-order-controls")) continue;

      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) continue;
      const controls = controlEl.createSpan({ cls: "ledge-item-order-controls" });

      const dragButton = controls.createEl("button", {
        cls: "clickable-icon ledge-item-drag-handle",
        attr: {
          type: "button",
          "aria-label": "Drag to reorder dock item",
        },
      });
      setIcon(dragButton, "grip-vertical");
      dragButton.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      });
      dragButton.addEventListener("pointerdown", (event: PointerEvent) => {
        this.beginItemPointerDrag(event, itemId, dragButton);
      });
      dragButton.addEventListener("pointermove", (event: PointerEvent) => {
        this.updateItemPointerDrag(event);
      });
      dragButton.addEventListener("pointerup", (event: PointerEvent) => {
        this.finishItemPointerDrag(event, dragButton);
      });
      dragButton.addEventListener("pointercancel", (event: PointerEvent) => {
        if (event.pointerId === this.dragPointerId) this.clearItemDragState();
      });

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

    return rows.length;
  }

  private beginItemPointerDrag(
    event: PointerEvent,
    itemId: string,
    handle: HTMLButtonElement,
  ): void {
    if (event.button !== 0 || this.dragPointerId !== null) return;
    event.preventDefault();
    event.stopPropagation();

    this.draggedItemId = itemId;
    this.dragPointerId = event.pointerId;
    this.dragTargetItemId = null;
    this.dragDropAfter = false;
    this.activeDragHandle = handle;
    handle.setPointerCapture(event.pointerId);

    const source = this.itemRows().find((candidate) => candidate.itemId === itemId);
    source?.row.classList.add("is-ledge-item-dragging");
  }

  private updateItemPointerDrag(event: PointerEvent): void {
    if (event.pointerId !== this.dragPointerId || !this.draggedItemId) return;
    event.preventDefault();
    event.stopPropagation();

    const rows = this.itemRows();
    for (const { row } of rows) {
      row.classList.remove("is-ledge-item-drop-before", "is-ledge-item-drop-after");
    }

    const hit = this.containerEl.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    let target = hit
      ? rows.find(({ row }) => row.contains(hit))
      : undefined;

    if (!target && rows.length > 0) {
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of rows) {
        const rect = candidate.row.getBoundingClientRect();
        const distance = Math.abs(event.clientY - (rect.top + rect.height / 2));
        if (distance >= closestDistance) continue;
        closestDistance = distance;
        target = candidate;
      }
    }

    if (!target || target.itemId === this.draggedItemId) {
      this.dragTargetItemId = null;
      this.dragDropAfter = false;
      return;
    }

    const rect = target.row.getBoundingClientRect();
    const dropAfter = event.clientY >= rect.top + rect.height / 2;
    this.dragTargetItemId = target.itemId;
    this.dragDropAfter = dropAfter;
    target.row.classList.add(dropAfter ? "is-ledge-item-drop-after" : "is-ledge-item-drop-before");
  }

  private finishItemPointerDrag(event: PointerEvent, handle: HTMLButtonElement): void {
    if (event.pointerId !== this.dragPointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const sourceId = this.draggedItemId;
    const targetId = this.dragTargetItemId;
    const dropAfter = this.dragDropAfter;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    this.clearItemDragState();

    if (sourceId && targetId && sourceId !== targetId) {
      this.reorderDockItem(sourceId, targetId, dropAfter);
    }
  }

  private reorderDockItem(sourceId: string, targetId: string, dropAfter: boolean): void {
    const items = this.ledgePlugin.settings.items;
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const [item] = items.splice(sourceIndex, 1);
    if (!item) return;
    let insertIndex = targetIndex;
    if (sourceIndex < targetIndex) insertIndex -= 1;
    if (dropAfter) insertIndex += 1;
    insertIndex = Math.max(0, Math.min(insertIndex, items.length));
    items.splice(insertIndex, 0, item);
    void this.ledgePlugin.saveSettings().then(() => this.update());
  }

  private clearItemDragState(): void {
    if (
      this.activeDragHandle
      && this.dragPointerId !== null
      && this.activeDragHandle.hasPointerCapture(this.dragPointerId)
    ) {
      this.activeDragHandle.releasePointerCapture(this.dragPointerId);
    }
    this.draggedItemId = null;
    this.dragPointerId = null;
    this.dragTargetItemId = null;
    this.dragDropAfter = false;
    this.activeDragHandle = null;
    for (const { row } of this.itemRows()) {
      row.classList.remove(
        "is-ledge-item-dragging",
        "is-ledge-item-drop-before",
        "is-ledge-item-drop-after",
      );
    }
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

  private decorateControls(definitions: SettingDefinitionItem[]): void {'''
source = source[:match.start()] + replacement + source[match.end():]
path.write_text(source)

css_path = Path("styles.css")
css = css_path.read_text()
css = css.replace(
    '.ledge-item-row-marker {\n  display: none;\n}\n',
    '.ledge-item-row-marker,\n.ledge-item-row-decorator {\n  display: none;\n}\n',
    1,
)
css = css.replace(
    '.ledge-item-drag-handle {\n  cursor: grab;\n}\n',
    '.ledge-item-drag-handle {\n  cursor: grab;\n  touch-action: none;\n  user-select: none;\n}\n',
    1,
)
css_path.write_text(css)

test_path = Path("tests/multi-dock.test.ts")
tests = test_path.read_text()
test_pattern = re.compile(
    r'void test\("prerelease item settings expose working drag and arrow reorder controls", \(\) => \{.*?\n\}\);',
    re.S,
)
assert test_pattern.search(tests), "existing reorder test not found"
new_test = r'''void test("prerelease item settings expose pointer-captured drag and arrow reorder controls", () => {
  const base = fs.readFileSync("src/settings-tab.ts", "utf8");
  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const main = fs.readFileSync("src/main.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(base, /onReorder: \(oldIndex, newIndex\) =>/);
  assert.match(enhanced, /private itemRowDecoratorDefinition\(\): SettingDefinitionItem/);
  assert.match(enhanced, /render: \(\) => \{[\s\S]*this\.scheduleItemRowControls\(\)/);
  assert.doesNotMatch(enhanced, /override display\(\)/);
  assert.match(enhanced, /private itemRows\(\): Array<\{ itemId: string; row: HTMLElement \}>/);
  assert.match(enhanced, /"aria-label": "Drag to reorder dock item"/);
  assert.match(enhanced, /setIcon\(dragButton, "grip-vertical"\)/);
  assert.match(enhanced, /addEventListener\("pointerdown"/);
  assert.match(enhanced, /addEventListener\("pointermove"/);
  assert.match(enhanced, /addEventListener\("pointerup"/);
  assert.match(enhanced, /setPointerCapture\(event\.pointerId\)/);
  assert.match(enhanced, /elementFromPoint\(event\.clientX, event\.clientY\)/);
  assert.match(enhanced, /private reorderDockItem\(sourceId: string, targetId: string, dropAfter: boolean\)/);
  assert.doesNotMatch(enhanced, /dragstart|dragover|dropEffect|dataTransfer|draggable = true/);
  assert.match(enhanced, /"aria-label": "Move dock item up"/);
  assert.match(enhanced, /"aria-label": "Move dock item down"/);
  assert.match(styles, /\.ledge-item-row-decorator/);
  assert.match(styles, /\.ledge-item-drag-handle \{[\s\S]*touch-action: none;/);
  assert.match(main, /async saveSettings\(refresh = true, syncIcons = false\)/);
});'''
tests = test_pattern.sub(new_test, tests, count=1)
test_path.write_text(tests)

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text()
old_bullet = '- Fix Dock item Settings rows so reorder controls initialize on first display; add an explicit draggable grip plus visible move-up / move-down buttons instead of relying only on Obsidian\'s native list affordance.\n'
new_bullet = '- Fix Dock item Settings reorder initialization with a declarative render hook, and replace unreliable HTML5 drag/drop with pointer-captured dragging while retaining visible move-up / move-down buttons.\n'
assert old_bullet in changelog
changelog = changelog.replace(old_bullet, new_bullet, 1)
changelog = changelog.replace(
    '- Restore Obsidian\'s native drag-and-drop handle for Dock items and add accessible move-up / move-down buttons to each item row.\n',
    '',
    1,
)
changelog_path.write_text(changelog)
