import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

void test("fresh installs receive usable defaults", () => {
  const settings = normalizeSettings(null);
  assert.equal(settings.position, "left");
  assert.equal(settings.showDockBackground, true);
  assert.equal(settings.showDockBorder, true);
  assert.equal(settings.hotCornersEnabled, false);
  assert.equal(settings.hotCornerTopLeftEnabled, true);
  assert.equal(settings.hotCornerActivationSize, 36);
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
    hotCornerActivationSize: 999,
    hotCornerRevealDelay: -12,
    hotCornerSurfaceMode: "glass",
    hotCornerBorderWidth: 99,
  });
  assert.equal(settings.position, DEFAULT_SETTINGS.position);
  assert.equal(settings.itemSize, 84);
  assert.equal(settings.gap, 0);
  assert.equal(settings.revealDelay, 3000);
  assert.equal(settings.surfaceMode, "theme");
  assert.equal(settings.hotCornerActivationSize, 128);
  assert.equal(settings.hotCornerRevealDelay, 0);
  assert.equal(settings.hotCornerSurfaceMode, "theme");
  assert.equal(settings.hotCornerBorderWidth, 6);
});

void test("zero values and disabled toggles are preserved", () => {
  const settings = normalizeSettings({
    enabled: false,
    autoHide: false,
    showDockBackground: false,
    showDockBorder: false,
    gap: 0,
    padding: 0,
    revealDelay: 0,
    hideDelay: 0,
    motionDuration: 0,
    surfaceOpacity: 0,
    hotCornersEnabled: false,
    hotCornerShowBackground: false,
    hotCornerShowBorder: false,
    hotCornerRevealDelay: 0,
    hotCornerSurfaceOpacity: 0,
    hotCornerRadius: 0,
    hotCornerBorderWidth: 0,
    items: [],
  });
  assert.equal(settings.enabled, false);
  assert.equal(settings.autoHide, false);
  assert.equal(settings.showDockBackground, false);
  assert.equal(settings.showDockBorder, false);
  assert.equal(settings.gap, 0);
  assert.equal(settings.padding, 0);
  assert.equal(settings.revealDelay, 0);
  assert.equal(settings.hideDelay, 0);
  assert.equal(settings.motionDuration, 0);
  assert.equal(settings.surfaceOpacity, 0);
  assert.equal(settings.hotCornersEnabled, false);
  assert.equal(settings.hotCornerShowBackground, false);
  assert.equal(settings.hotCornerShowBorder, false);
  assert.equal(settings.hotCornerRevealDelay, 0);
  assert.equal(settings.hotCornerSurfaceOpacity, 0);
  assert.equal(settings.hotCornerRadius, 0);
  assert.equal(settings.hotCornerBorderWidth, 0);
  assert.deepEqual(settings.items, []);
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
