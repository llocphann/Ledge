from pathlib import Path

p = Path("src/item-settings-accordion.ts")
text = p.read_text()
old = '      setValue = (value) => text.setValue(value);'
new = '      setValue = (value) => { text.setValue(value); };'
if old not in text:
    raise SystemExit("accordion callback patch anchor missing")
text = text.replace(old, new, 1)
text = text.replace('        .setDynamicTooltip()\n', '', 1)
p.write_text(text)
