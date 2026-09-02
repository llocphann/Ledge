import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  addDockPreset,
  applyDockPreset,
  availableDockPositions,
  hasLegacyHotCornerSettings,
  hasLegacySingleDockSettings,
  normalizeSettings,
  syncSelectedDockPreset,
} from "../src/settings";

void test("fresh installs receive usable defaults", () => {
  const settings = normalizeSettings(null);
  assert.equal(settings.position, "left");
  assert.equal(settings.showDockBackground, true);
  assert.equal(settings.showDockBorder, true);
  assert.equal(settings.showTrigger, true);
  assert.equal(settings.triggerLength, 86);
  assert.equal(settings.triggerAreaShowBackground, true);
  assert.equal(settings.triggerAreaSurfaceMode, "theme");
  assert.equal(settings.triggerSurfaceThickness, 5);
  assert.equal(settings.triggerSurfaceMode, "theme");
  assert.deepEqual(settings.items, []);
  assert.deepEqual(settings.includeRules, []);
  assert.deepEqual(settings.excludeRules, []);
  assert.equal(settings.docks.length, 1);
  assert.equal(settings.docks[0]?.name, "Dock 1");
  assert.equal(settings.selectedDockId, settings.docks[0]?.id);
});

void test("bounded settings and supported enums survive loading", () => {
  const settings = normalizeSettings({
    position: "somewhere",
    itemSize: 999,
    gap: -20,
    revealDelay: 99999,
    surfaceMode: "glass",
    triggerSize: 999,
    triggerLength: 999,
    triggerAreaSurfaceOpacity: 999,
    triggerAreaRadius: 999,
    triggerAreaSurfaceMode: "glass",
    triggerSurfaceThickness: 999,
    triggerSurfaceMode: "glass",
    triggerBorderWidth: 99,
  });
  assert.equal(settings.position, DEFAULT_SETTINGS.position);
  assert.equal(settings.itemSize, 84);
  assert.equal(settings.gap, 0);
  assert.equal(settings.revealDelay, 3000);
  assert.equal(settings.surfaceMode, "theme");
  assert.equal(settings.triggerSize, 64);
  assert.equal(settings.triggerLength, 360);
  assert.equal(settings.triggerAreaSurfaceOpacity, 100);
  assert.equal(settings.triggerAreaRadius, 40);
  assert.equal(settings.triggerAreaSurfaceMode, "theme");
  assert.equal(settings.triggerSurfaceThickness, 48);
  assert.equal(settings.triggerSurfaceMode, "theme");
  assert.equal(settings.triggerBorderWidth, 6);
});

void test("zero values and disabled toggles are preserved", () => {
  const settings = normalizeSettings({
    enabled: false,
    autoHide: false,
    showDockBackground: false,
    showDockBorder: false,
    showTrigger: false,
    triggerAreaShowBackground: false,
    triggerAreaShowBorder: false,
    triggerShowBackground: false,
    triggerShowBorder: false,
    gap: 0,
    padding: 0,
    revealDelay: 0,
    hideDelay: 0,
    motionDuration: 0,
    surfaceOpacity: 0,
    triggerSurfaceOpacity: 0,
    triggerAreaSurfaceOpacity: 0,
    triggerAreaRadius: 0,
    triggerAreaBorderWidth: 0,
    triggerRadius: 0,
    triggerBorderWidth: 0,
    items: [],
  });
  assert.equal(settings.enabled, false);
  assert.equal(settings.autoHide, false);
  assert.equal(settings.showDockBackground, false);
  assert.equal(settings.showDockBorder, false);
  assert.equal(settings.showTrigger, false);
  assert.equal(settings.triggerAreaShowBackground, false);
  assert.equal(settings.triggerAreaShowBorder, false);
  assert.equal(settings.triggerShowBackground, false);
  assert.equal(settings.triggerShowBorder, false);
  assert.equal(settings.gap, 0);
  assert.equal(settings.padding, 0);
  assert.equal(settings.revealDelay, 0);
  assert.equal(settings.hideDelay, 0);
  assert.equal(settings.motionDuration, 0);
  assert.equal(settings.surfaceOpacity, 0);
  assert.equal(settings.triggerSurfaceOpacity, 0);
  assert.equal(settings.triggerAreaSurfaceOpacity, 0);
  assert.equal(settings.triggerAreaRadius, 0);
  assert.equal(settings.triggerAreaBorderWidth, 0);
  assert.equal(settings.triggerRadius, 0);
  assert.equal(settings.triggerBorderWidth, 0);
  assert.deepEqual(settings.items, []);
});

void test("legacy hot-corner appearance migrates to the edge trigger", () => {
  const legacy = {
    hotCornersEnabled: true,
    hotCornerShowBackground: false,
    hotCornerShowBorder: false,
    hotCornerSurfaceMode: "gradient",
    hotCornerSurfaceOpacity: 37,
    hotCornerGradientStart: "#112233",
    hotCornerGradientEnd: "#445566",
    hotCornerGradientAngle: 210,
    hotCornerRadius: 18,
    hotCornerBorderWidth: 3,
    hotCornerBorderColor: "#778899",
  };
  const settings = normalizeSettings(legacy);

  assert.equal(hasLegacyHotCornerSettings(legacy), true);
  assert.equal(settings.triggerShowBackground, false);
  assert.equal(settings.triggerShowBorder, false);
  assert.equal(settings.triggerSurfaceMode, "gradient");
  assert.equal(settings.triggerSurfaceOpacity, 37);
  assert.equal(settings.triggerGradientStart, "#112233");
  assert.equal(settings.triggerGradientEnd, "#445566");
  assert.equal(settings.triggerGradientAngle, 210);
  assert.equal(settings.triggerRadius, 18);
  assert.equal(settings.triggerBorderWidth, 3);
  assert.equal(settings.triggerBorderColor, "#778899");
  assert.equal("hotCornersEnabled" in settings, false);
});

void test("legacy single-Dock settings migrate into Dock 1 without losing configuration", () => {
  const legacy = {
    position: "bottom" as const,
    itemSize: 57,
    items: [{ id: "home", label: "Home", target: "Home.md", icon: "home" }],
  };
  assert.equal(hasLegacySingleDockSettings(legacy), true);

  const settings = normalizeSettings(legacy);
  assert.equal(settings.docks.length, 1);
  assert.equal(settings.docks[0]?.position, "bottom");
  assert.equal(settings.docks[0]?.itemSize, 57);
  assert.equal(settings.docks[0]?.items[0]?.target, "Home.md");
});

void test("duplicate Dock positions are repaired deterministically", () => {
  const settings = normalizeSettings({
    selectedDockId: "one",
    docks: [
      { id: "one", name: "One", position: "left" },
      { id: "two", name: "Two", position: "left" },
      { id: "three", name: "Three", position: "top" },
    ],
  });

  assert.deepEqual(settings.docks.map((dock) => dock.position), ["left", "right", "top"]);
  assert.equal(new Set(settings.docks.map((dock) => dock.position)).size, settings.docks.length);
  assert.equal(availableDockPositions(settings, "two").includes("left"), false);
  assert.equal(availableDockPositions(settings, "two").includes("top"), false);
  assert.equal(availableDockPositions(settings, "two").includes("right"), true);
});

void test("adding Dock presets consumes every position exactly once and then stops", () => {
  const settings = normalizeSettings(null);
  for (let index = 1; index < 8; index += 1) {
    assert.ok(addDockPreset(settings));
  }
  assert.equal(settings.docks.length, 8);
  assert.equal(new Set(settings.docks.map((dock) => dock.position)).size, 8);
  assert.equal(addDockPreset(settings), null);
});

void test("switching presets preserves edits in the previously selected Dock", () => {
  const settings = normalizeSettings(null);
  settings.itemSize = 63;
  syncSelectedDockPreset(settings);
  const firstId = settings.selectedDockId;
  const second = addDockPreset(settings);
  assert.ok(second);
  assert.equal(applyDockPreset(settings, firstId), true);
  assert.equal(settings.itemSize, 63);
});

void test("duplicate item IDs are repaired without losing order", () => {
  const settings = normalizeSettings({
    items: [
      { id: "same", label: "One" },
      { id: "same", label: "Two" },
    ],
  });
  assert.deepEqual(settings.items.map((item) => item.id), ["same", "same-2"]);
  assert.deepEqual(settings.items.map((item) => item.label), ["One", "Two"]);
});

void test("Dock items preserve independent built-in and vault icon values", () => {
  const settings = normalizeSettings({
    items: [{
      id: "contacts",
      iconSource: "vault",
      icon: "90_System/contacts.png",
      builtInIcon: "iconify:tabler:address-book",
      vaultIconPath: "90_System/contacts.png",
    }],
  });
  const item = settings.items[0];

  assert.equal(item?.iconSource, "vault");
  assert.equal(item?.icon, "90_System/contacts.png");
  assert.equal(item?.builtInIcon, "iconify:tabler:address-book");
  assert.equal(item?.vaultIconPath, "90_System/contacts.png");
});

void test("legacy source switches recover a vault image path instead of treating it as a built-in ID", () => {
  const settings = normalizeSettings({
    items: [{
      id: "contacts",
      iconSource: "lucide",
      icon: "90_System/9_Icons/contacts.png",
    }],
  });
  const item = settings.items[0];

  assert.equal(item?.iconSource, "lucide");
  assert.equal(item?.icon, "circle");
  assert.equal(item?.builtInIcon, "circle");
  assert.equal(item?.vaultIconPath, "90_System/9_Icons/contacts.png");
});

void test("visibility rules normalize paths, tags, and duplicate IDs", () => {
  const settings = normalizeSettings({
    includeRules: [
      { id: "same", enabled: true, matchType: "tag", matchValue: "#Media" },
      { id: "same", enabled: true, matchType: "folder", matchValue: "20_Personal_Life\\" },
    ],
    excludeRules: [
      { id: "exclude", enabled: true, matchType: "note", matchValue: "Homepage.md" },
    ],
  });
  assert.deepEqual(settings.includeRules.map((rule) => rule.id), ["same", "same-2"]);
  assert.equal(settings.includeRules[0]?.matchValue, "Media");
  assert.equal(settings.includeRules[1]?.matchValue, "20_Personal_Life");
  assert.equal(settings.excludeRules[0]?.matchValue, "Homepage");
});

void test("imported CSS colors are restricted to color values", () => {
  const settings = normalizeSettings({
    surfaceColor: "url(https://example.com/tracker.png)",
    accentColor: "red; background:url(https://example.com/x)",
    items: [{
      id: "unsafe",
      iconColor: "url(https://example.com/icon)",
      tileGradientStart: "#123456",
    }],
  });

  assert.equal(settings.surfaceColor, DEFAULT_SETTINGS.surfaceColor);
  assert.equal(settings.accentColor, "");
  assert.equal(settings.items[0]?.iconColor, "");
  assert.equal(settings.items[0]?.tileGradientStart, "#123456");
});
