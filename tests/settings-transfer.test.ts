import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLedgeSettingsImport,
  serializeLedgeSettings,
} from "../src/settings-transfer";
import { normalizeSettings } from "../src/settings";

void test("Ledge settings export and import round-trip through canonical schema v3", () => {
  const settings = normalizeSettings({
    position: "bottom-right",
    itemSize: 61,
    items: [{ id: "home", label: "Home", target: "Homepage.md", icon: "home" }],
    excludeRules: [{
      id: "private",
      enabled: true,
      matchType: "folder",
      matchValue: "Private",
    }],
  });
  const exported = serializeLedgeSettings(settings, "9.9.9", new Date("2026-08-31T00:00:00Z"));
  const envelope = JSON.parse(exported) as Record<string, unknown>;
  const exportedSettings = envelope.settings as Record<string, unknown>;

  assert.equal(envelope.format, "ledge-settings");
  assert.equal(envelope.schemaVersion, 3);
  assert.equal(envelope.pluginVersion, "9.9.9");
  assert.equal(exportedSettings.settingsSchemaVersion, 3);
  assert.equal("position" in exportedSettings, false);
  assert.equal("items" in exportedSettings, false);
  assert.deepEqual(parseLedgeSettingsImport(exported), settings);
});

void test("Ledge import accepts raw, v1, and v2 settings but rejects foreign or future envelopes", () => {
  assert.equal(parseLedgeSettingsImport('{"itemSize":999}').itemSize, 84);

  const legacy = parseLedgeSettingsImport(JSON.stringify({
    format: "ledge-settings",
    schemaVersion: 1,
    settings: { position: "right", items: [] },
  }));
  assert.equal(legacy.docks.length, 1);
  assert.equal(legacy.position, "right");

  const v2 = parseLedgeSettingsImport(JSON.stringify({
    format: "ledge-settings",
    schemaVersion: 2,
    settings: { position: "bottom", items: [] },
  }));
  assert.equal(v2.position, "bottom");

  assert.throws(() => parseLedgeSettingsImport("not json"), /valid JSON/);
  assert.throws(() => parseLedgeSettingsImport("{}"), /does not contain Ledge settings/);
  assert.throws(
    () => parseLedgeSettingsImport('{"format":"veil-settings","schemaVersion":1,"settings":{}}'),
    /not exported by Ledge/,
  );
  assert.throws(
    () => parseLedgeSettingsImport('{"format":"ledge-settings","schemaVersion":4,"settings":{}}'),
    /Unsupported Ledge settings schema/,
  );
});
