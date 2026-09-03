from pathlib import Path

# Fix lint issues introduced by the generated implementation without changing behavior.
p = Path("src/item-settings-accordion.ts")
text = p.read_text()
replacements = [
    (
        '      setValue = (value) => text.setValue(value);',
        '      setValue = (value) => { text.setValue(value); };',
        "void callback",
    ),
    (
        '      .setDesc("Choose a PNG, JPEG, WebP, GIF, or SVG file stored in the vault.");',
        '      .setDesc("Choose a PNG, JPEG, webp, GIF, or SVG file stored in the vault.");',
        "sentence-case image description",
    ),
]
for old, new, label in replacements:
    if old not in text:
        raise SystemExit(f"accordion patch anchor missing: {label}")
    text = text.replace(old, new, 1)
text = text.replace('    .setDynamicTooltip()\n', '', 1)
p.write_text(text)

# Keep Obsidian's element helper while still reparenting the root into the workspace host.
p = Path("src/dock.ts")
text = p.read_text()
old = '''    this.root = this.document.createElement("div");
    this.root.className = "ledge-dock-root";
    this.root.dataset.ledgeDockRoot = "true";
    (this.workspaceHost() ?? this.document.body).appendChild(this.root);'''
new = '''    this.root = this.document.body.createDiv({ cls: "ledge-dock-root" });
    this.root.dataset.ledgeDockRoot = "true";
    (this.workspaceHost() ?? this.document.body).appendChild(this.root);'''
if old not in text:
    raise SystemExit("dock create helper patch anchor missing")
text = text.replace(old, new, 1)
p.write_text(text)

# Place the collapsed-state selector after the base header selector so stylelint's
# descending-specificity rule and the intended cascade both agree.
p = Path("styles.css")
text = p.read_text()
collapsed = '''.ledge-item-accordion:not(.is-expanded) > .ledge-settings-item-header {
  border-bottom-color: transparent;
}

'''
if collapsed not in text:
    raise SystemExit("collapsed accordion CSS anchor missing")
text = text.replace(collapsed, "", 1)
header = '''.ledge-settings-item-header {
  border-bottom: 1px solid var(--background-modifier-border);
}
'''
if header not in text:
    raise SystemExit("base item header CSS anchor missing")
text = text.replace(header, header + "\n" + collapsed.rstrip() + "\n", 1)
p.write_text(text)

# Clean up sentence-case tooltip warnings and make the requested header order
# deterministic: state/warning, reorder controls (including delete), then chevron.
p = Path("src/icon-library-setting-tab.ts")
text = p.read_text()
text = text.replace('.setTooltip("Add Dock preset")', '.setTooltip("Add dock preset")', 1)
text = text.replace('.setTooltip("Duplicate Dock")', '.setTooltip("Duplicate dock")', 1)
text = text.replace('.setTooltip("Delete Dock")', '.setTooltip("Delete dock")', 1)
old = '''      const navigationControl = controlEl.lastElementChild;
      if (navigationControl && navigationControl !== controls) {
        controlEl.insertBefore(controls, navigationControl);
      }'''
new = '''      const navigationControl = controlEl.querySelector<HTMLElement>(".ledge-item-accordion-toggle");
      if (navigationControl) controlEl.insertBefore(controls, navigationControl);'''
if old not in text:
    raise SystemExit("item control ordering patch anchor missing")
text = text.replace(old, new, 1)
p.write_text(text)

# Update source-level regression tests that intentionally described the old UI
# and old position-specific anchoring semantics.
p = Path("tests/multi-dock.test.ts")
text = p.read_text()
old = r'''  assert.match(source, /\.setIcon\("plus"\)[\s\S]*\.setTooltip\("Add Dock preset"\)/);'''
new = r'''  assert.match(source, /\.setIcon\("plus"\)[\s\S]*\.setTooltip\("Add dock preset"\)/);'''
if old not in text:
    raise SystemExit("stale add-dock tooltip test anchor missing")
text = text.replace(old, new, 1)
old = r'''  assert.match(source, /private activeDockSection: DockSettingsSection = "items"/);'''
new = r'''  assert.match(source, /private activeDockSection: DockSettingsSection = "appearance"/);'''
if old not in text:
    raise SystemExit("stale active section test anchor missing")
text = text.replace(old, new, 1)
old = '''void test("top edge and top corners anchor to the active note content area", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(source, /anchorRectForPosition/);
  assert.match(source, /position === "top-left"/);
  assert.match(source, /position === "top-right"/);
  assert.match(source, /contentEl\\?: HTMLElement/);
  assert.match(source, /querySelector<HTMLElement>\\("\\.view-content"\\)/);
  assert.match(source, /this\\.positionTrigger\\(rect, position/);
});'''
new = '''void test("all Dock positions anchor to the active workspace content area", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(source, /private activeWorkspaceContent/);
  assert.match(source, /contentEl\\?: HTMLElement/);
  assert.match(source, /querySelector<HTMLElement>\\("\\.view-content"\\)/);
  assert.match(source, /const viewContent = this\\.activeWorkspaceContent\\(leaf, leafContainer\\)/);
  assert.match(source, /private anchorRectForPosition\\([\\s\\S]*_position: DockPosition/);
  assert.match(source, /this\\.positionTrigger\\(rect, position/);
  assert.match(source, /ResizeObserver/);
});'''
if old not in text:
    raise SystemExit("stale workspace anchor test block missing")
text = text.replace(old, new, 1)

# Guard the exact requested item-header control ordering in future changes.
needle = '''  assert.match(source, /gap: "var\\(--size-4-1\\)"/);'''
extra = '''  assert.match(source, /gap: "var\\(--size-4-1\\)"/);
  assert.match(source, /querySelector<HTMLElement>\\("\\.ledge-item-accordion-toggle"\\)/);'''
if needle not in text:
    raise SystemExit("item header ordering test insertion anchor missing")
text = text.replace(needle, extra, 1)
p.write_text(text)
