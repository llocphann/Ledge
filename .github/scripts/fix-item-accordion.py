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

# Clean up the three existing sentence-case tooltip warnings while this settings
# surface is already being touched.
p = Path("src/icon-library-setting-tab.ts")
text = p.read_text()
text = text.replace('.setTooltip("Add Dock preset")', '.setTooltip("Add dock preset")', 1)
text = text.replace('.setTooltip("Duplicate Dock")', '.setTooltip("Duplicate dock")', 1)
text = text.replace('.setTooltip("Delete Dock")', '.setTooltip("Delete dock")', 1)
p.write_text(text)
