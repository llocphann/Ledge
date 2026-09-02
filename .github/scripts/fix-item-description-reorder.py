from pathlib import Path

settings = Path('src/settings-tab.ts')
text = settings.read_text()
old = '''  private itemRowDescription(item: DockItemSettings): DocumentFragment {
    const doc = this.containerEl.ownerDocument;
    const fragment = doc.createDocumentFragment();
    fragment.append(item.target || "No target path");
    const marker = doc.createElement("span");
    marker.className = "ledge-item-row-marker";
    marker.dataset.ledgeItemId = item.id;
    fragment.append(marker);
    return fragment;
  }
'''
new = '''  private itemRowDescription(item: DockItemSettings): string {
    return item.target || "No target path";
  }
'''
if old not in text:
    raise SystemExit('itemRowDescription block not found')
settings.write_text(text.replace(old, new, 1))

enhanced = Path('src/icon-library-setting-tab.ts')
text = enhanced.read_text()
old = '''  private itemRows(): Array<{ itemId: string; row: HTMLElement }> {
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
'''
new = '''  private itemRows(): Array<{ itemId: string; row: HTMLElement }> {
    const resolved = new Map<string, HTMLElement>();
    const items = this.ledgePlugin.settings.items;
    const panel = this.containerEl.querySelector<HTMLElement>(".ledge-settings-panel-items");
    const candidates = panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(".setting-item"))
      : [];

    for (const row of candidates) {
      const itemId = row.dataset.ledgeItemId;
      if (itemId && items.some((item) => item.id === itemId)) resolved.set(itemId, row);
    }

    if (resolved.size < items.length) {
      for (const [index, item] of items.entries()) {
        if (resolved.has(item.id)) continue;
        const expectedName = this.itemRowName(item.id, index);
        const row = candidates.find((candidate) =>
          !candidate.dataset.ledgeItemId
          && candidate.querySelector<HTMLElement>(".setting-item-name")?.textContent?.trim() === expectedName,
        );
        if (!row) continue;
        row.dataset.ledgeItemId = item.id;
        resolved.set(item.id, row);
      }
    }

    return items.flatMap((item) => {
      const row = resolved.get(item.id);
      return row ? [{ itemId: item.id, row }] : [];
    });
  }
'''
if old not in text:
    raise SystemExit('itemRows block not found')
enhanced.write_text(text.replace(old, new, 1))

tests = Path('tests/multi-dock.test.ts')
text = tests.read_text()
addition = r'''

void test("item row descriptions stay plain text across reorder refreshes", () => {
  const base = fs.readFileSync("src/settings-tab.ts", "utf8");
  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(base, /private itemRowDescription\(item: DockItemSettings\): string/);
  assert.match(base, /return item\.target \|\| "No target path"/);
  assert.doesNotMatch(base, /ledge-item-row-marker|createDocumentFragment\(\)/);
  assert.match(enhanced, /row\.dataset\.ledgeItemId = item\.id/);
  assert.match(enhanced, /const itemId = row\.dataset\.ledgeItemId/);
});
'''
if 'item row descriptions stay plain text across reorder refreshes' not in text:
    tests.write_text(text + addition)

changelog = Path('CHANGELOG.md')
text = changelog.read_text()
entry = '- Fix Dock item row descriptions turning into `[object DocumentFragment]` after drag or arrow reordering by keeping descriptions as plain text and storing row identity in DOM data attributes.\n'
if entry not in text:
    text = text.replace('## Unreleased\n\n', '## Unreleased\n\n' + entry, 1)
    changelog.write_text(text)
