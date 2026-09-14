import assert from "node:assert/strict";
import test from "node:test";
import { classifyDockChanges } from "../src/runtime/dock-dirty-domains";
import { normalizeSettings } from "../src/settings";
import type { DockSettings } from "../src/types";

function settings(): DockSettings {
  return structuredClone(normalizeSettings(null));
}

void test("first render marks every Dock domain dirty", () => {
  const dirty = classifyDockChanges(null, settings());
  assert.deepEqual([...dirty].sort(), [
    "GEOMETRY",
    "ICONS",
    "ITEMS",
    "POSITION",
    "STYLE",
    "VISIBILITY",
  ]);
});

void test("style-only changes do not request item reconstruction", () => {
  const previous = settings();
  const next = structuredClone(previous);
  next.surfaceOpacity = previous.surfaceOpacity === 50 ? 51 : 50;

  assert.deepEqual([...classifyDockChanges(previous, next)], ["STYLE"]);
});

void test("position changes request position and geometry only", () => {
  const previous = settings();
  const next = structuredClone(previous);
  next.position = previous.position === "left" ? "right" : "left";

  assert.deepEqual([...classifyDockChanges(previous, next)], ["POSITION", "GEOMETRY"]);
});

void test("visibility rules are isolated from item and style work", () => {
  const previous = settings();
  const next = structuredClone(previous);
  next.includeRules.push({ id: "work", enabled: true, matchType: "tag", matchValue: "work" });

  assert.deepEqual([...classifyDockChanges(previous, next)], ["VISIBILITY"]);
});

void test("item identity/content changes and icon changes use separate domains", () => {
  const previous = settings();
  previous.items = [{
    id: "home",
    enabled: true,
    label: "Home",
    target: "Home.md",
    iconSource: "lucide",
    icon: "home",
    builtInIcon: "home",
    vaultIconPath: "",
    iconRenderMode: "tint",
    iconSize: 0,
    iconColor: "",
    tileGradientStart: "",
    tileGradientEnd: "",
  }];

  const labelChange = structuredClone(previous);
  labelChange.items[0]!.label = "Start";
  assert.deepEqual([...classifyDockChanges(previous, labelChange)], ["ITEMS"]);

  const iconChange = structuredClone(previous);
  iconChange.items[0]!.builtInIcon = "star";
  assert.deepEqual([...classifyDockChanges(previous, iconChange)], ["ICONS"]);
});
