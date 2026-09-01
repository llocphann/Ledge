import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  addDockPreset,
  availableDockPositions,
  normalizeSettings,
} from "../src/settings";

void test("layout settings use a dock list instead of a preset dropdown", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /heading: section === "layout" \? "Docks" : "Dock presets"/);
  assert.match(source, /ledge-dock-preset-card/);
  assert.match(source, /renderDockLayoutSettings/);
  assert.match(source, /"Preset name"/);
  assert.match(source, /"Enable dock"/);
  assert.match(source, /"Position"/);
  assert.match(source, /"Item size"/);
  assert.match(source, /"Icon size"/);
  assert.match(source, /"Gap"/);
  assert.match(source, /"Padding"/);
  assert.match(source, /"Corner radius"/);
  assert.match(source, /"Edge offset"/);
  assert.doesNotMatch(source, /dropdown\.addOption\(\s*dock\.id/);
});

void test("every dock-scoped settings tab exposes the same dock preset context", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  for (const section of ["layout", "behavior", "visibility", "trigger", "appearance", "items"]) {
    assert.match(source, new RegExp(`\\b${section}: \\\"ledge-settings-panel-${section}\\\"`));
  }
  assert.match(source, /definitions\.push\(this\.dockPresetListDefinitions\(section\)\)/);
  assert.match(source, /Every preset keeps its own/);
});

void test("dock card rerenders clear stale inline layout bodies and do not use focus highlighting", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /resetDockCardRender\(setting\)/);
  assert.match(source, /classList\.contains\("ledge-dock-preset-body"\)/);
  assert.match(source, /setting\.controlEl\.replaceChildren\(\)/);
  assert.doesNotMatch(source, /interactive-accent/);
  assert.doesNotMatch(source, /is-selected|is-disabled/);
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
