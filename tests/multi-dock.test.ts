import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  addDockPreset,
  availableDockPositions,
  normalizeSettings,
} from "../src/settings";

void test("settings use one page with Dock sections followed by Data and About", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const baseSettings = fs.readFileSync("src/settings-tab.ts", "utf8");

  assert.doesNotMatch(source, /WorkspaceSettingsTab|WORKSPACE_TABS/);
  assert.match(source, /if \(mutable\.cls === "ledge-settings-tabs-group"\) continue/);
  assert.match(source, /mutable\.cls === "ledge-settings-panel-data"/);
  assert.match(source, /mutable\.cls = "ledge-settings-data-inline"/);
  assert.match(source, /aboutFooterDefinitions\(definition\)/);
  assert.match(source, /definitions\.push\(this\.dockWorkspaceDefinitions\(\)\)/);
  assert.match(source, /heading: "Docks"/);

  // Existing declarative definitions remain the single source of truth for all
  // Dock features instead of duplicating controls in the preset UI.
  assert.match(baseSettings, /heading: "Layout"/);
  assert.match(baseSettings, /heading: "Reveal behavior"/);
  assert.match(baseSettings, /heading: "Context visibility"/);
  assert.match(baseSettings, /heading: "Edge trigger"/);
  assert.match(baseSettings, /heading: "Appearance"/);
  assert.match(baseSettings, /heading: "Dock items"/);
  assert.match(baseSettings, /heading: "Backup & transfer"/);
});

void test("Dock preset menu is a simple button row with the add button last", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /dockPresetSwitcherDefinition/);
  assert.match(source, /for \(const dock of this\.ledgePlugin\.settings\.docks\)/);
  assert.match(source, /\.setButtonText\(dock\.name\)/);
  assert.match(source, /button\.buttonEl\.dataset\.dockPresetId = dock\.id/);
  assert.match(source, /\.setIcon\("plus"\)[\s\S]*\.setTooltip\("Add Dock preset"\)/);
  assert.doesNotMatch(source, /dockPresetDefinition\(|ledge-dock-preset-body|chevron-down|chevron-right/);
});

void test("Dock section tabs are centered without the tabs wrapper box", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /private activeDockSection: DockSettingsSection = "items"/);
  assert.match(source, /dockSectionNavigationDefinition/);
  assert.match(source, /cls: "ledge-dock-section-tabs"/);
  assert.match(source, /tabList\.setCssStyles\(\{ display: "contents" \}\)/);
  assert.match(source, /justifyContent: "center"/);
  assert.match(source, /flexWrap: "wrap"/);
  assert.match(source, /gap: "var\(--size-4-1\)"/);
  assert.doesNotMatch(source, /cls: "ledge-settings-tabs ledge-dock-section-tabs"/);
  assert.match(source, /marginTop: "var\(--size-4-5\)"/);
  assert.match(source, /paddingTop: "var\(--size-4-4\)"/);
  assert.match(source, /borderTop: "1px solid var\(--background-modifier-border\)"/);
  assert.match(source, /setting\.infoEl\.setCssStyles\(\{ display: "none" \}\)/);
  assert.match(source, /this\.containerEl\.dataset\.ledgeSettingsTab = this\.activeDockSection/);
});

void test("About stays at the bottom and uses manifest metadata", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /mutable\.cls = "ledge-settings-about-footer"/);
  assert.match(source, /name: "Version"[\s\S]*this\.ledgePlugin\.manifest\.version/);
  assert.match(source, /name: "Author"[\s\S]*this\.ledgePlugin\.manifest\.author/);
});

void test("top edge and top corners anchor to the active note content area", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(source, /anchorRectForPosition/);
  assert.match(source, /position === "top-left"/);
  assert.match(source, /position === "top-right"/);
  assert.match(source, /contentEl\?: HTMLElement/);
  assert.match(source, /querySelector<HTMLElement>\("\.view-content"\)/);
  assert.match(source, /this\.positionTrigger\(rect, position/);
});

void test("corner triggers render as perpendicular pill arms instead of a square", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(source, /const cornerExtent = Math\.max\(triggerSize \* 2\.6, 40\)/);
  assert.match(styles, /data-position\*="-"[^\n]*ledge-dock-trigger::after/);
  assert.match(styles, /width: 72%/);
  assert.match(styles, /height: 72%/);
});

void test("enabling auto-hide hides an already-visible Dock immediately", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(source, /private previousAutoHide: boolean \| null = null/);
  assert.match(source, /const autoHideChanged = this\.previousAutoHide !== null[\s\S]*this\.previousAutoHide !== settings\.autoHide/);
  assert.match(source, /const autoHideJustEnabled = autoHideChanged && settings\.autoHide/);
  assert.match(source, /if \(autoHideChanged\) this\.clearTimers\(\)/);
  assert.match(source, /else if \(autoHideJustEnabled\) this\.setVisible\(false\)/);
});

void test("vault icon renames update the remembered path even while built-in is active", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(source, /const rememberedIcon = rename\(item\.vaultIconPath\)/);
  assert.match(source, /item\.vaultIconPath = rememberedIcon/);
  assert.match(source, /if \(item\.iconSource === "vault"\) item\.icon = rememberedIcon/);
});

void test("disabled docks still reserve their exclusive position", () => {
  const settings = normalizeSettings(null);
  const first = settings.docks[0]!;
  first.enabled = false;
  const second = addDockPreset(settings);
  assert.ok(second);

  assert.equal(first.position, "left");
  assert.equal(availableDockPositions(settings, second.id).includes("left"), false);
});

void test("duplicating a dock preserves every feature setting without sharing mutable state", () => {
  const settings = normalizeSettings({
    enabled: false,
    autoHide: false,
    showLabels: false,
    itemSize: 63,
    iconSize: 41,
    gap: 13,
    padding: 12,
    radius: 27,
    edgeOffset: 31,
    showTrigger: false,
    triggerSize: 22,
    triggerLength: 144,
    magnification: false,
    showDockBackground: false,
    showDockBorder: false,
    surfaceMode: "gradient",
    surfaceOpacity: 44,
    accentColor: "#123456",
    includeRules: [{ id: "include", enabled: true, matchType: "tag", matchValue: "work" }],
    excludeRules: [{ id: "exclude", enabled: true, matchType: "folder", matchValue: "Archive" }],
    items: [{
      id: "home",
      enabled: true,
      label: "Home",
      target: "Home.md",
      iconSource: "vault",
      icon: "Assets/home.svg",
      builtInIcon: "home",
      vaultIconPath: "Assets/home.svg",
      iconRenderMode: "original",
      iconSize: 37,
      iconColor: "#abcdef",
      tileGradientStart: "#111111",
      tileGradientEnd: "#222222",
    }],
  });
  const source = settings.docks[0]!;
  const duplicate = addDockPreset(settings, true);
  assert.ok(duplicate);

  const excluded = new Set(["id", "name", "position"]);
  for (const key of Object.keys(source) as Array<keyof typeof source>) {
    if (excluded.has(String(key))) continue;
    assert.deepEqual(duplicate[key], source[key], `duplicate lost Dock field: ${String(key)}`);
  }

  assert.notStrictEqual(duplicate.items, source.items);
  assert.notStrictEqual(duplicate.includeRules, source.includeRules);
  assert.notStrictEqual(duplicate.excludeRules, source.excludeRules);
  duplicate.items[0]!.label = "Changed only in copy";
  duplicate.includeRules[0]!.matchValue = "copy-only";
  assert.equal(source.items[0]!.label, "Home");
  assert.equal(source.includeRules[0]!.matchValue, "work");
});

void test("multi-dock runtime reuses the complete single-dock controller", () => {
  const source = fs.readFileSync("src/multi-dock.ts", "utf8");

  assert.match(source, /new DockController\(new PresetDockHost/);
  assert.match(source, /controller\.applySettings\(\)/);
  assert.doesNotMatch(source, /setInterval\(|MutationObserver/);
});

void test("vault path controls use a bounded lazy suggester instead of eager file controls", () => {
  const source = fs.readFileSync("src/settings-tab.ts", "utf8");

  assert.match(source, /class BoundedVaultFileSuggest extends AbstractInputSuggest<TFile>/);
  assert.match(source, /const TARGET_SUGGESTION_LIMIT = 50/);
  assert.match(source, /PRIMARY_TARGET_EXTENSIONS = new Set\(\["md", "base", "canvas"\]\)/);
  assert.match(source, /segment === "\.git" \|\| segment === "node_modules"/);
  assert.match(source, /mode: "target" \| "all" \| "image"/);
  assert.match(source, /searchableFiles = mode === "target"[\s\S]*preferredTargets[\s\S]*secondaryTargets/);
  assert.match(source, /name: "Target path"[\s\S]*renderFilePathControl/);
  assert.match(source, /name: "Exact file path"[\s\S]*renderFilePathControl/);
  assert.match(source, /name: "Icon path"[\s\S]*renderFilePathControl/);
  assert.doesNotMatch(source, /control:\s*\{\s*type: "file"/);
  assert.match(source, /suggester\.onSelect\(\(file\) =>/);
});

void test("prerelease item settings expose working drag and arrow reorder controls", () => {
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
});


void test("item and visibility page identities refresh only after committed text edits", () => {
  const source = fs.readFileSync("src/settings-tab.ts", "utf8");
  const enhanced = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /name: "Label"[\s\S]*renderCommittedTextControl[\s\S]*"Dock item label"[\s\S]*true/);
  assert.match(source, /"Visibility rule value"[\s\S]*true/);
  assert.match(source, /if \(event\.key === "Enter"\) commit\(\)/);
  assert.match(source, /inputEl\.addEventListener\("blur", commit\)/);
  assert.match(enhanced, /item\.iconSource !== "vault"/);
  assert.doesNotMatch(enhanced, /\.onChange\(\(value\) => \{\s*void this\.setControlValue\(key, value\)/);
});
