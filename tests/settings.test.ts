import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  hasLegacyHotCornerSettings,
  normalizeSettings,
} from "../src/settings";

void test("fresh installs receive usable defaults", () => {
  const settings = normalizeSettings(null);
  assert.equal(settings.position, "left");
  assert.equal(settings.showDockBackground, true);
  assert.equal(settings.showDockBorder, true);
  assert.equal(settings.showTrigger, true);
  assert.equal(settings.triggerLength, 86);
  assert.equal(settings.triggerSurfaceThickness, 5);
  assert.equal(settings.triggerSurfaceMode, "theme");
  assert.equal(settings.items.length, 9);
  assert.ok(settings.items.every((item) => item.iconSource === "lucide"));
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
    triggerShowBackground: false,
    triggerShowBorder: false,
    gap: 0,
    padding: 0,
    revealDelay: 0,
    hideDelay: 0,
    motionDuration: 0,
    surfaceOpacity: 0,
    triggerSurfaceOpacity: 0,
    triggerRadius: 0,
    triggerBorderWidth: 0,
    items: [],
  });
  assert.equal(settings.enabled, false);
  assert.equal(settings.autoHide, false);
  assert.equal(settings.showDockBackground, false);
  assert.equal(settings.showDockBorder, false);
  assert.equal(settings.showTrigger, false);
  assert.equal(settings.triggerShowBackground, false);
  assert.equal(settings.triggerShowBorder, false);
  assert.equal(settings.gap, 0);
  assert.equal(settings.padding, 0);
  assert.equal(settings.revealDelay, 0);
  assert.equal(settings.hideDelay, 0);
  assert.equal(settings.motionDuration, 0);
  assert.equal(settings.surfaceOpacity, 0);
  assert.equal(settings.triggerSurfaceOpacity, 0);
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
