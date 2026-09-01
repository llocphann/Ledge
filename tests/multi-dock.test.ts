import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  addDockPreset,
  availableDockPositions,
  normalizeSettings,
} from "../src/settings";

void test("settings use one Dock-first hierarchy instead of repeating preset selectors", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const baseSettings = fs.readFileSync("src/settings-tab.ts", "utf8");

  assert.match(source, /type WorkspaceSettingsTab = "docks" \| "data"/);
  assert.match(source, /\{ id: "docks", label: "Docks"/);
  assert.match(source, /\{ id: "data", label: "Data"/);
  assert.doesNotMatch(source, /\{ id: "about", label: "About"/);
  assert.match(source, /const DOCK_SETTINGS_SECTIONS[\s\S]*"items",[\s\S]*"layout"/);
  assert.match(source, /definitions\.push\(this\.dockWorkspaceDefinitions\(\)\)/);
  assert.match(source, /heading: "Docks"/);
  assert.match(source, /Every setting in these sections belongs only to the open Dock/);
  assert.match(source, /renderDockSectionNavigation/);
  assert.doesNotMatch(source, /dockPresetListDefinitions\(section\)/);
  assert.doesNotMatch(source, /renderDockLayoutSettings/);

  // Existing declarative definitions remain the single source of truth for all
  // Dock features instead of duplicating controls in the preset UI.
  assert.match(baseSettings, /heading: "Layout"/);
  assert.match(baseSettings, /heading: "Reveal behavior"/);
  assert.match(baseSettings, /heading: "Context visibility"/);
  assert.match(baseSettings, /heading: "Edge trigger"/);
  assert.match(baseSettings, /heading: "Appearance"/);
  assert.match(baseSettings, /heading: "Dock items"/);
});

void test("About is shared metadata at the bottom of every top-level settings tab", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /aboutFooterDefinitions\(definition\)/);
  assert.match(source, /mutable\.cls = "ledge-settings-about-footer"/);
  assert.match(source, /name: "Version"[\s\S]*this\.ledgePlugin\.manifest\.version/);
  assert.match(source, /name: "Author"[\s\S]*this\.ledgePlugin\.manifest\.author/);
  assert.doesNotMatch(source, /WorkspaceSettingsTab = [^\n]*about/);
});

void test("every Dock section is scoped by the open preset and Items is the first task", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  for (const section of ["layout", "behavior", "visibility", "trigger", "appearance", "items"]) {
    assert.match(source, new RegExp(`${section}: "ledge-settings-panel-${section}"`));
  }
  assert.match(source, /private activeDockSection: DockSettingsSection = "items"/);
  assert.match(source, /renderedTab = this\.activeWorkspaceTab === "docks"[\s\S]*this\.activeDockSection/);
  assert.match(source, /The remaining sections control only this dock/);
});

void test("Dock preset rerenders clear stale bodies and do not use focus highlighting", () => {
  const source = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");

  assert.match(source, /resetDockPresetRender\(setting\)/);
  assert.match(source, /classList\.contains\("ledge-dock-preset-body"\)/);
  assert.match(source, /setting\.controlEl\.replaceChildren\(\)/);
  assert.doesNotMatch(source, /interactive-accent/);
  assert.doesNotMatch(source, /is-selected|is-disabled/);
});

void test("top and bottom docks anchor to the active note content area", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(source, /anchorRectForPosition/);
  assert.match(source, /position !== "top" && position !== "bottom"/);
  assert.match(source, /contentEl\?: HTMLElement/);
  assert.match(source, /querySelector<HTMLElement>\("\.view-content"\)/);
  assert.match(source, /this\.positionTrigger\(rect, position/);
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
