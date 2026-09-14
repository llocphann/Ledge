import assert from "node:assert/strict";
import test from "node:test";
import {
  attachSelectedDockSettingsView,
  isSelectedDockSettingsView,
} from "../src/runtime/selected-dock-settings-view";
import { applyDockPreset, normalizeSettings } from "../src/settings";

void test("selected Dock fields are live non-enumerable accessors", () => {
  const settings = attachSelectedDockSettingsView(normalizeSettings({
    itemSize: 48,
    items: [],
  }));

  assert.equal(isSelectedDockSettingsView(settings), true);
  assert.equal(settings.itemSize, 48);
  assert.equal(Object.keys(settings).includes("itemSize"), false);
  assert.equal(Object.keys(settings).includes("items"), false);

  settings.itemSize = 71;
  assert.equal(settings.docks[0]!.itemSize, 71);
});

void test("switching selectedDockId changes the live view without copying Dock state", () => {
  const settings = attachSelectedDockSettingsView(normalizeSettings({
    selectedDockId: "dock-a",
    docks: [
      { id: "dock-a", name: "A", position: "left", itemSize: 41, items: [] },
      { id: "dock-b", name: "B", position: "right", itemSize: 67, items: [] },
    ],
  }));

  assert.equal(settings.itemSize, 41);
  assert.equal(applyDockPreset(settings, "dock-b"), true);
  assert.equal(settings.itemSize, 67);

  settings.itemSize = 73;
  assert.equal(settings.docks[1]!.itemSize, 73);
  assert.equal(settings.docks[0]!.itemSize, 41);
});

void test("runtime JSON contains only canonical root fields", () => {
  const settings = attachSelectedDockSettingsView(normalizeSettings({
    position: "bottom",
    itemSize: 55,
    items: [],
  }));
  const serialized = JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;

  assert.deepEqual(Object.keys(serialized).sort(), ["docks", "selectedDockId"]);
  assert.equal("position" in serialized, false);
  assert.equal("itemSize" in serialized, false);
});
