from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}")
    file.write_text(text.replace(old, new, 1))


# Non-icon settings should not wait for external icon cache synchronization.
main = "src/main.ts"
replace_once(main, '''  async saveSettings(refresh = true): Promise<void> {
    syncSelectedDockPreset(this.settings);
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }
''', '''  async saveSettings(refresh = true, syncIcons = false): Promise<void> {
    syncSelectedDockPreset(this.settings);
    this.settings = normalizeSettings(this.settings);
    if (syncIcons) await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }
''')
replace_once(main, '''  async saveDockPresetRuntime(dockId: string, refresh = true): Promise<void> {
    if (dockId === this.settings.selectedDockId) {
      applyDockPreset(this.settings, dockId);
    }
    this.settings = normalizeSettings(this.settings);
    await syncIconifyCache(this.externalIconIds());
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }
''', '''  async saveDockPresetRuntime(dockId: string, refresh = true): Promise<void> {
    if (dockId === this.settings.selectedDockId) {
      applyDockPreset(this.settings, dockId);
    }
    this.settings = normalizeSettings(this.settings);
    await this.savePersistedData();
    if (refresh) this.controller?.applySettings();
  }
''')

settings = "src/settings-tab.ts"
replace_once(settings, '''      onReorder: (oldIndex, newIndex) => {
        const [item] = this.ledge.settings.items.splice(oldIndex, 1);
        if (!item) return;
        this.ledge.settings.items.splice(newIndex, 0, item);
        void this.ledge.saveSettings().then(() => this.update());
      },
''', '''      onReorder: (oldIndex, newIndex) => {
        const [item] = this.ledge.settings.items.splice(oldIndex, 1);
        if (!item) return;
        this.ledge.settings.items.splice(newIndex, 0, item);
        void this.ledge.saveSettings();
      },
''')
replace_once(settings, '''    return {
      type: "page",
      name: item.label || item.target || `Item ${index + 1}`,
      desc: item.target || "No target path",
''', '''    return {
      type: "page",
      name: this.itemPageName(item, index),
      desc: this.itemRowDescription(item),
''')
replace_once(settings, '''  private renderTargetPathControl(setting: Setting, key: string): () => void {
''', '''  private itemPageName(item: DockItemSettings, index: number): string {
    const base = item.label || item.target || `Item ${index + 1}`;
    let occurrence = 1;
    for (let candidateIndex = 0; candidateIndex < index; candidateIndex += 1) {
      const candidate = this.ledge.settings.items[candidateIndex];
      if (!candidate) continue;
      const candidateBase = candidate.label || candidate.target || `Item ${candidateIndex + 1}`;
      if (candidateBase === base) occurrence += 1;
    }
    return occurrence === 1 ? base : `${base} (${occurrence})`;
  }

  private itemRowDescription(item: DockItemSettings): DocumentFragment {
    const doc = this.containerEl.ownerDocument;
    const fragment = doc.createDocumentFragment();
    fragment.append(item.target || "No target path");
    const marker = doc.createElement("span");
    marker.className = "ledge-item-row-marker";
    marker.dataset.ledgeItemId = item.id;
    fragment.append(marker);
    return fragment;
  }

  private renderTargetPathControl(setting: Setting, key: string): () => void {
''')
replace_once(settings, '''      this.ledge.settings = parseLedgeSettingsImport(await file.text());
      await this.ledge.saveSettings();
''', '''      this.ledge.settings = parseLedgeSettingsImport(await file.text());
      await this.ledge.saveSettings(true, true);
''')

icon_tab = "src/icon-library-setting-tab.ts"
replace_once(icon_tab, '''import {
  Notice,
  Setting,
  type App,
''', '''import {
  Notice,
  Setting,
  setIcon,
  type App,
''')
replace_once(icon_tab, '''    this.decorateControls(definitions);
    return definitions;
''', '''    this.decorateControls(definitions);
    this.scheduleItemRowControls();
    return definitions;
''')
replace_once(icon_tab, '''      await this.ledgePlugin.saveSettings();
      this.update();
      return;
''', '''      await this.ledgePlugin.saveSettings(true, true);
      this.update();
      return;
''')
replace_once(icon_tab, '''      await this.ledgePlugin.saveSettings();
      return;
''', '''      await this.ledgePlugin.saveSettings(true, true);
      return;
''')
replace_once(icon_tab, '''  private decorateControls(definitions: SettingDefinitionItem[]): void {
''', '''  private scheduleItemRowControls(attempt = 0): void {
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

      const grip = controls.createSpan({ cls: "ledge-item-drag-affordance" });
      setIcon(grip, "grip-vertical");
      grip.setAttribute("aria-hidden", "true");
      grip.setAttribute("title", "Drag to reorder");

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
''')

styles = "styles.css"
replace_once(styles, '''.ledge-target-suggestion-path {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}
''', '''.ledge-target-suggestion-path {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.ledge-item-row-marker {
  display: none;
}

.ledge-item-order-controls {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 2px;
  margin-left: var(--size-4-1);
}

.ledge-item-drag-affordance {
  width: var(--icon-s);
  height: var(--icon-s);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
  cursor: grab;
}

.ledge-item-drag-affordance:active {
  cursor: grabbing;
}

.ledge-item-order-button:disabled {
  cursor: default;
  opacity: 0.35;
}
''')

tests = "tests/multi-dock.test.ts"
text = Path(tests).read_text()
addition = r'''

void test("prerelease item settings use native reorder with lightweight row controls", () => {
  const base = fs.readFileSync("src/settings-tab.ts", "utf8");
  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const main = fs.readFileSync("src/main.ts", "utf8");

  assert.match(base, /onReorder: \(oldIndex, newIndex\) =>/);
  assert.doesNotMatch(base, /onReorder:[\s\S]{0,420}saveSettings\(\)\.then\(\(\) => this\.update\(\)\)/);
  assert.match(base, /name: this\.itemPageName\(item, index\)/);
  assert.match(base, /marker\.dataset\.ledgeItemId = item\.id/);
  assert.match(enhanced, /scheduleItemRowControls/);
  assert.match(enhanced, /setIcon\(grip, "grip-vertical"\)/);
  assert.match(enhanced, /"aria-label": "Move dock item up"/);
  assert.match(enhanced, /"aria-label": "Move dock item down"/);
  assert.match(enhanced, /private moveDockItem\(itemId: string, delta: -1 \| 1\)/);
  assert.doesNotMatch(enhanced, /dragstart|dragover|dropEffect|dataTransfer/);
  assert.match(main, /async saveSettings\(refresh = true, syncIcons = false\)/);
  assert.match(main, /if \(syncIcons\) await syncIconifyCache/);
});
'''
if 'prerelease item settings use native reorder with lightweight row controls' in text:
    raise SystemExit("Optimization regression test already exists")
Path(tests).write_text(text.rstrip() + addition + "\n")
