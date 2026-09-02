from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}")
    file.write_text(text.replace(old, new, 1))


settings = "src/settings-tab.ts"
replace_once(
    settings,
    "    this.files = app.vault.getFiles();\n",
    "    this.files = app.vault.getFiles().filter(isTargetSuggestion);\n",
)
replace_once(
    settings,
    '''    for (const file of this.files) {\n      if (!isTargetSuggestion(file)) continue;\n      if (search && !search(file.path)) continue;\n''',
    '''    for (const file of this.files) {\n      if (search && !search(file.path)) continue;\n''',
)

icon_tab = "src/icon-library-setting-tab.ts"
replace_once(
    icon_tab,
    '''import {\n  Notice,\n  Setting,\n  setIcon,\n  type App,\n''',
    '''import {\n  Notice,\n  Setting,\n  type App,\n''',
)
replace_once(
    icon_tab,
    '''  ) {\n    super(app, ledgePlugin);\n  }\n\n  override getSettingDefinitions(): SettingDefinitionItem[] {\n''',
    '''  ) {\n    super(app, ledgePlugin);\n  }\n\n  override display(): void {\n    super.display();\n    this.scheduleItemRowControls();\n  }\n\n  override update(): void {\n    super.update();\n    this.scheduleItemRowControls();\n  }\n\n  override getSettingDefinitions(): SettingDefinitionItem[] {\n''',
)
replace_once(
    icon_tab,
    '''    this.decorateControls(definitions);\n    this.scheduleItemRowControls();\n    return definitions;\n''',
    '''    this.decorateControls(definitions);\n    return definitions;\n''',
)
replace_once(
    icon_tab,
    '''      const controls = controlEl.createSpan({ cls: "ledge-item-order-controls" });\n\n      const grip = controls.createSpan({ cls: "ledge-item-drag-affordance" });\n      setIcon(grip, "grip-vertical");\n      grip.setAttribute("aria-hidden", "true");\n      grip.setAttribute("title", "Drag to reorder");\n\n      const upButton = controls.createEl("button", {\n''',
    '''      const controls = controlEl.createSpan({ cls: "ledge-item-order-controls" });\n\n      const upButton = controls.createEl("button", {\n''',
)

styles = "styles.css"
replace_once(
    styles,
    '''.ledge-settings-panel-items .setting-item {\n  padding-right: 0;\n  padding-left: 0;\n}\n''',
    '''.ledge-settings-panel-items .setting-item {\n  padding-right: 0;\n}\n''',
)
replace_once(
    styles,
    '''.ledge-item-drag-affordance {\n  width: var(--icon-s);\n  height: var(--icon-s);\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--text-faint);\n  cursor: grab;\n}\n\n.ledge-item-drag-affordance:active {\n  cursor: grabbing;\n}\n\n''',
    "",
)

tests = "tests/multi-dock.test.ts"
replace_once(
    tests,
    '''  assert.match(source, /segment === "\\.git" \\|\\| segment === "node_modules"/);\n  assert.match(source, /name: "Target path"[\\s\\S]*render: \\(setting\\) => this\\.renderTargetPathControl/);\n''',
    '''  assert.match(source, /segment === "\\.git" \\|\\| segment === "node_modules"/);\n  assert.match(source, /this\\.files = app\\.vault\\.getFiles\\(\\)\\.filter\\(isTargetSuggestion\\)/);\n  assert.doesNotMatch(source, /for \\(const file of this\\.files\\) \\{\\s*if \\(!isTargetSuggestion\\(file\\)\\)/);\n  assert.match(source, /name: "Target path"[\\s\\S]*render: \\(setting\\) => this\\.renderTargetPathControl/);\n''',
)
replace_once(
    tests,
    '''  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");\n  const main = fs.readFileSync("src/main.ts", "utf8");\n\n  assert.match(base, /onReorder: \\(oldIndex, newIndex\\) =>/);\n''',
    '''  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");\n  const main = fs.readFileSync("src/main.ts", "utf8");\n  const styles = fs.readFileSync("styles.css", "utf8");\n\n  assert.match(base, /onReorder: \\(oldIndex, newIndex\\) =>/);\n''',
)
replace_once(
    tests,
    '''  assert.match(enhanced, /scheduleItemRowControls/);\n  assert.match(enhanced, /setIcon\\(grip, "grip-vertical"\\)/);\n  assert.match(enhanced, /"aria-label": "Move dock item up"/);\n''',
    '''  assert.match(enhanced, /override display\\(\\): void \\{[\\s\\S]*super\\.display\\(\\);[\\s\\S]*this\\.scheduleItemRowControls\\(\\);/);\n  assert.match(enhanced, /override update\\(\\): void \\{[\\s\\S]*super\\.update\\(\\);[\\s\\S]*this\\.scheduleItemRowControls\\(\\);/);\n  assert.doesNotMatch(enhanced, /grip-vertical|ledge-item-drag-affordance/);\n  assert.match(enhanced, /"aria-label": "Move dock item up"/);\n''',
)
replace_once(
    tests,
    '''  assert.doesNotMatch(enhanced, /dragstart|dragover|dropEffect|dataTransfer/);\n  assert.match(main, /async saveSettings\\(refresh = true, syncIcons = false\\)/);\n''',
    '''  assert.doesNotMatch(enhanced, /dragstart|dragover|dropEffect|dataTransfer/);\n  assert.doesNotMatch(styles, /ledge-item-drag-affordance/);\n  assert.match(styles, /\\.ledge-settings-panel-items \\.setting-item \\{\\s*padding-right: 0;\\s*\\}/);\n  assert.match(main, /async saveSettings\\(refresh = true, syncIcons = false\\)/);\n''',
)
