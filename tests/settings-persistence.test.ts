import assert from "node:assert/strict";
import test from "node:test";
import {
  LEDGE_DATA_SCHEMA_VERSION,
  canonicalizeLedgeSettings,
} from "../src/settings-persistence";
import { normalizeSettings } from "../src/settings";

void test("schema v3 persists only canonical multi-dock state", () => {
  const settings = normalizeSettings({
    position: "left",
    itemSize: 51,
    items: [{ id: "home", enabled: true, label: "Home", target: "Home.md", icon: "home" }],
  });

  // Simulate a settings control editing the selected-Dock runtime mirror before
  // persistence. Canonicalization must fold that edit into the selected preset.
  settings.itemSize = 63;
  settings.items[0]!.label = "Start";

  const persisted = canonicalizeLedgeSettings(settings);

  assert.equal(persisted.settingsSchemaVersion, LEDGE_DATA_SCHEMA_VERSION);
  assert.equal(persisted.docks[0]!.itemSize, 63);
  assert.equal(persisted.docks[0]!.items[0]!.label, "Start");
  assert.deepEqual(Object.keys(persisted).sort(), ["docks", "selectedDockId", "settingsSchemaVersion"]);
  assert.equal("itemSize" in persisted, false);
  assert.equal("items" in persisted, false);
});

void test("canonicalization does not mutate live runtime settings", () => {
  const settings = normalizeSettings({
    itemSize: 48,
    items: [{ id: "home", enabled: true, label: "Home", target: "Home.md", icon: "home" }],
  });
  settings.itemSize = 67;
  const presetBefore = settings.docks[0]!.itemSize;

  const persisted = canonicalizeLedgeSettings(settings);

  assert.equal(persisted.docks[0]!.itemSize, 67);
  assert.equal(settings.docks[0]!.itemSize, presetBefore);
  assert.equal(settings.itemSize, 67);
});

void test("canonical schema round-trips through the runtime normalizer", () => {
  const settings = normalizeSettings({
    selectedDockId: "dock-b",
    docks: [
      { id: "dock-a", name: "A", position: "left", items: [] },
      { id: "dock-b", name: "B", position: "right", itemSize: 59, items: [] },
    ],
  });
  const persisted = canonicalizeLedgeSettings(settings);
  const restored = normalizeSettings(persisted);

  assert.equal(restored.selectedDockId, "dock-b");
  assert.equal(restored.docks.length, 2);
  assert.equal(restored.position, "right");
  assert.equal(restored.itemSize, 59);
});
