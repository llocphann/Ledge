from pathlib import Path

root = Path('.')
source_path = root / 'src/icon-library-setting-tab.ts'
styles_path = root / 'styles.css'
test_path = root / 'tests/multi-dock.test.ts'
changelog_path = root / 'CHANGELOG.md'

source = source_path.read_text()
source = source.replace(
    'export class LedgeIconLibrarySettingTab extends LedgeSettingTab {\n  private activeDockSection: DockSettingsSection = "items";\n',
    'export class LedgeIconLibrarySettingTab extends LedgeSettingTab {\n  private activeDockSection: DockSettingsSection = "items";\n  private draggedItemId: string | null = null;\n',
)
source = source.replace(
    '  override update(): void {\n    super.update();\n    this.scheduleItemRowControls();\n  }\n',
    '  override display(): void {\n    super.display();\n    this.scheduleItemRowControls();\n  }\n\n  override update(): void {\n    super.update();\n    this.scheduleItemRowControls();\n  }\n',
)
source = source.replace(
    '      if (decorated < this.ledgePlugin.settings.items.length && attempt < 2) {\n',
    '      if (decorated < this.ledgePlugin.settings.items.length && attempt < 8) {\n',
)

start = source.index('  private decorateItemRowControls(): number {')
end = source.index('  private moveDockItem(itemId: string, delta: -1 | 1): void {', start)
replacement = '''  private itemRowName(itemId: string, index: number): string {
    const items = this.ledgePlugin.settings.items;
    const item = items[index];
    if (!item || item.id !== itemId) return item?.label || item?.target || `Item ${index + 1}`;
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

  private itemRows(): Array<{ itemId: string; row: HTMLElement }> {
    const resolved = new Map<string, HTMLElement>();
    const markers = Array.from(this.containerEl.querySelectorAll<HTMLElement>(
      ".ledge-item-row-marker[data-ledge-item-id]",
    ));
    for (const marker of markers) {
      const itemId = marker.dataset.ledgeItemId;
      const row = marker.closest<HTMLElement>(".setting-item");
      if (itemId && row) resolved.set(itemId, row);
    }

    const items = this.ledgePlugin.settings.items;
    if (resolved.size < items.length) {
      const panel = this.containerEl.querySelector<HTMLElement>(".ledge-settings-panel-items");
      const candidates = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(".setting-item"))
        : [];
      for (const [index, item] of items.entries()) {
        if (resolved.has(item.id)) continue;
        const expectedName = this.itemRowName(item.id, index);
        const row = candidates.find((candidate) =>
          candidate.querySelector<HTMLElement>(".setting-item-name")?.textContent?.trim() === expectedName,
        );
        if (row) resolved.set(item.id, row);
      }
    }

    return items.flatMap((item) => {
      const row = resolved.get(item.id);
      return row ? [{ itemId: item.id, row }] : [];
    });
  }

  private decorateItemRowControls(): number {
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
          draggable: "true",
        },
      });
      dragButton.draggable = true;
      setIcon(dragButton, "grip-vertical");
      dragButton.addEventListener("pointerdown", (event: PointerEvent) => event.stopPropagation());
      dragButton.addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      });
      dragButton.addEventListener("dragstart", (event: DragEvent) => {
        this.draggedItemId = itemId;
        row.classList.add("is-ledge-item-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", itemId);
        }
      });
      dragButton.addEventListener("dragend", () => this.clearItemDragState());

      row.addEventListener("dragover", (event: DragEvent) => {
        if (!this.draggedItemId || this.draggedItemId === itemId) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        const rect = row.getBoundingClientRect();
        const dropAfter = event.clientY >= rect.top + rect.height / 2;
        row.classList.toggle("is-ledge-item-drop-before", !dropAfter);
        row.classList.toggle("is-ledge-item-drop-after", dropAfter);
      });
      row.addEventListener("dragleave", (event: DragEvent) => {
        if (event.relatedTarget && row.contains(event.relatedTarget as Node)) return;
        row.classList.remove("is-ledge-item-drop-before", "is-ledge-item-drop-after");
      });
      row.addEventListener("drop", (event: DragEvent) => {
        const sourceId = this.draggedItemId;
        if (!sourceId || sourceId === itemId) return;
        event.preventDefault();
        event.stopPropagation();
        const dropAfter = row.classList.contains("is-ledge-item-drop-after");
        this.reorderDockItem(sourceId, itemId, dropAfter);
        this.clearItemDragState();
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
    this.draggedItemId = null;
    for (const { row } of this.itemRows()) {
      row.classList.remove(
        "is-ledge-item-dragging",
        "is-ledge-item-drop-before",
        "is-ledge-item-drop-after",
      );
    }
  }

'''
source = source[:start] + replacement + source[end:]
source_path.write_text(source)

styles = styles_path.read_text()
needle = '''.ledge-item-order-controls {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 2px;
  margin-left: var(--size-4-1);
}

'''
addition = needle + '''.ledge-item-drag-handle {
  cursor: grab;
}

.ledge-item-drag-handle:active {
  cursor: grabbing;
}

.ledge-settings-panel-items .setting-item.is-ledge-item-dragging {
  opacity: 0.55;
}

.ledge-settings-panel-items .setting-item.is-ledge-item-drop-before {
  box-shadow: inset 0 2px 0 var(--interactive-accent);
}

.ledge-settings-panel-items .setting-item.is-ledge-item-drop-after {
  box-shadow: inset 0 -2px 0 var(--interactive-accent);
}

'''
if needle not in styles:
    raise SystemExit('styles insertion point missing')
styles = styles.replace(needle, addition, 1)
styles_path.write_text(styles)

test = test_path.read_text()
old_start = test.index('void test("prerelease item settings use native reorder with lightweight row controls"')
old_end = test.index('\n\n\nvoid test("item and visibility page identities refresh only after committed text edits"', old_start)
new_test = r'''void test("prerelease item settings expose working drag and arrow reorder controls", () => {
  const base = fs.readFileSync("src/settings-tab.ts", "utf8");
  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const main = fs.readFileSync("src/main.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(base, /onReorder: \(oldIndex, newIndex\) =>/);
  assert.match(base, /heading: "Dock items"[\s\S]*onReorder: \(oldIndex, newIndex\) => \{[\s\S]*this\.ledge\.settings\.items\.splice\(newIndex, 0, item\);[\s\S]*void this\.ledge\.saveSettings\(\);[\s\S]*\},/);
  assert.match(enhanced, /override display\(\): void \{[\s\S]*super\.display\(\);[\s\S]*this\.scheduleItemRowControls\(\);/);
  assert.match(enhanced, /override update\(\): void \{[\s\S]*super\.update\(\);[\s\S]*this\.scheduleItemRowControls\(\);/);
  assert.match(enhanced, /private itemRows\(\): Array<\{ itemId: string; row: HTMLElement \}>/);
  assert.match(enhanced, /\.setting-item-name/);
  assert.match(enhanced, /"aria-label": "Drag to reorder dock item"/);
  assert.match(enhanced, /setIcon\(dragButton, "grip-vertical"\)/);
  assert.match(enhanced, /dragButton\.draggable = true/);
  assert.match(enhanced, /addEventListener\("dragstart"/);
  assert.match(enhanced, /addEventListener\("dragover"/);
  assert.match(enhanced, /addEventListener\("drop"/);
  assert.match(enhanced, /private reorderDockItem\(sourceId: string, targetId: string, dropAfter: boolean\)/);
  assert.match(enhanced, /"aria-label": "Move dock item up"/);
  assert.match(enhanced, /"aria-label": "Move dock item down"/);
  assert.match(enhanced, /private moveDockItem\(itemId: string, delta: -1 \| 1\)/);
  assert.match(styles, /\.ledge-item-drag-handle \{\s*cursor: grab;/);
  assert.match(styles, /is-ledge-item-drop-before/);
  assert.match(styles, /is-ledge-item-drop-after/);
  assert.match(main, /async saveSettings\(refresh = true, syncIcons = false\)/);
  assert.match(main, /if \(syncIcons\) await syncIconifyCache/);
});'''
test = test[:old_start] + new_test + test[old_end:]
test_path.write_text(test)

changelog = changelog_path.read_text()
marker = '## Unreleased\n\n'
entry = '- Fix Dock item Settings rows so reorder controls initialize on first display; add an explicit draggable grip plus visible move-up / move-down buttons instead of relying only on Obsidian\'s native list affordance.\n'
if entry not in changelog:
    changelog = changelog.replace(marker, marker + entry, 1)
changelog_path.write_text(changelog)
