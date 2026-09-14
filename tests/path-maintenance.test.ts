import assert from "node:assert/strict";
import test from "node:test";
import { maintainRenamedVaultPaths } from "../src/services/path-maintenance";
import { addDockPreset, normalizeSettings } from "../src/settings";

void test("vault rename updates all persisted path-bearing Dock fields in one transaction", () => {
  const settings = normalizeSettings(null);
  const first = settings.docks[0]!;
  first.includeRules = [{ id: "inc", enabled: true, matchType: "path", matchValue: "Projects/Alpha.md" }];
  first.excludeRules = [{ id: "exc", enabled: true, matchType: "folder", matchValue: "Projects/Archive" }];
  first.items = [{
    id: "alpha",
    enabled: true,
    label: "Alpha",
    target: "Projects/Alpha.md",
    iconSource: "vault",
    icon: "Projects/icons/alpha.svg",
    builtInIcon: "home",
    vaultIconPath: "Projects/icons/alpha.svg",
    iconRenderMode: "original",
    iconSize: 0,
    iconColor: "",
    tileGradientStart: "",
    tileGradientEnd: "",
  }];

  const second = addDockPreset(settings);
  assert.ok(second);
  second.enabled = false;
  second.items = [{
    id: "beta",
    enabled: true,
    label: "Beta",
    target: "Projects/Beta.md",
    iconSource: "lucide",
    icon: "circle",
    builtInIcon: "circle",
    vaultIconPath: "Projects/icons/beta.svg",
    iconRenderMode: "tint",
    iconSize: 0,
    iconColor: "",
    tileGradientStart: "",
    tileGradientEnd: "",
  }];

  const result = maintainRenamedVaultPaths(settings, "Work", "Projects");

  assert.equal(result.changed, true);
  assert.deepEqual(result.affectedDockIds, [first.id, second.id]);
  assert.equal(first.includeRules[0]!.matchValue, "Work/Alpha.md");
  assert.equal(first.excludeRules[0]!.matchValue, "Work/Archive");
  assert.equal(first.items[0]!.target, "Work/Alpha.md");
  assert.equal(first.items[0]!.vaultIconPath, "Work/icons/alpha.svg");
  assert.equal(first.items[0]!.icon, "Work/icons/alpha.svg");
  assert.equal(second.items[0]!.target, "Work/Beta.md");
  assert.equal(second.items[0]!.vaultIconPath, "Work/icons/beta.svg");
  assert.equal(second.items[0]!.icon, "circle");
});

void test("unrelated vault rename leaves settings untouched", () => {
  const settings = normalizeSettings(null);
  const before = structuredClone(settings.docks);

  const result = maintainRenamedVaultPaths(settings, "Elsewhere", "Missing");

  assert.equal(result.changed, false);
  assert.deepEqual(result.affectedDockIds, []);
  assert.deepEqual(settings.docks, before);
});
