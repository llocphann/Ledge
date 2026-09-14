import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("global Obsidian subscriptions have one runtime owner", () => {
  const coordinator = fs.readFileSync("src/runtime/runtime-coordinator.ts", "utf8");
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const multiDock = fs.readFileSync("src/multi-dock.ts", "utf8");

  for (const event of ["layout-change", "active-leaf-change", "file-open", "window-open", "window-close"]) {
    assert.match(coordinator, new RegExp(`workspace\\.on\\(\\"${event}\\"`));
  }
  assert.match(coordinator, /metadataCache\.on\("changed"/);
  assert.match(coordinator, /app\.vault\.on\("rename"/);
  assert.doesNotMatch(dock, /workspace\.on\(|metadataCache\.on\(|vault\.on\(/);
  assert.doesNotMatch(multiDock, /workspace\.on\(|metadataCache\.on\(|vault\.on\(/);
});

void test("workspace leaf traversal is centralized in the shared document registry", () => {
  const registry = fs.readFileSync("src/runtime/document-registry.ts", "utf8");
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const multiDock = fs.readFileSync("src/multi-dock.ts", "utf8");

  assert.equal((registry.match(/iterateAllLeaves/g) ?? []).length, 1);
  assert.doesNotMatch(dock, /iterateAllLeaves/);
  assert.match(multiDock, /new DocumentRegistry\(host\.app\)/);
  assert.match(multiDock, /this\.documentRegistry/);
});

void test("disabled Dock presets stay data-only", () => {
  const source = fs.readFileSync("src/multi-dock.ts", "utf8");

  assert.match(source, /settings\.docks\.filter\(\(dock\) => dock\.enabled\)/);
  assert.match(source, /if \(!preset\.enabled \|\| this\.controllers\.has\(preset\.id\)\) continue/);
});

void test("incremental rendering isolates full item DOM reconstruction", () => {
  const source = fs.readFileSync("src/dock.ts", "utf8");
  const panelRebuilds = source.match(/this\.panel\.replaceChildren\(\)/g) ?? [];

  assert.equal(panelRebuilds.length, 1);
  assert.match(source, /private rebuildItems\([\s\S]*this\.panel\.replaceChildren\(\)/);
  assert.match(source, /classifyDockChanges/);
  assert.match(source, /dirty\.has\("ITEMS"\)/);
  assert.match(source, /dirty\.has\("ICONS"\)/);
});

void test("target resolution and persistence use bounded shared services", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const targetIndex = fs.readFileSync("src/runtime/target-resolution-index.ts", "utf8");
  const main = fs.readFileSync("src/main.ts", "utf8");

  assert.match(dock, /TargetResolutionIndex/);
  assert.match(targetIndex, /private readonly entries = new Map/);
  assert.match(main, /new SettingsStore/);
  assert.match(main, /coalesceMs: 200/);
});
