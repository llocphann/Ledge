import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("manifest and package metadata agree", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8")) as Record<string, unknown>;
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as Record<string, unknown>;
  const versions = JSON.parse(fs.readFileSync("versions.json", "utf8")) as Record<string, string>;

  assert.equal(manifest.id, "ledge");
  assert.equal(manifest.name, "Ledge");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.isDesktopOnly, true);
  assert.equal(manifest.fundingUrl, "https://www.buymeacoffee.com/llocphann");
  assert.equal(packageJson.license, "GPL-3.0-only");
  assert.equal(versions[String(manifest.version)], manifest.minAppVersion);
  assert.ok(String(manifest.description).length <= 250);
  assert.match(String(manifest.description), /\.$/);
});

void test("release and repository documents exist", () => {
  for (const path of [
    "manifest.json",
    "styles.css",
    "README.md",
    "ROADMAP.md",
    "LICENSE",
  ]) {
    assert.equal(fs.existsSync(path), true, `${path} is required`);
  }
  assert.match(fs.readFileSync("LICENSE", "utf8"), /^GNU GENERAL PUBLIC LICENSE\nVersion 3/);

  const readme = fs.readFileSync("README.md", "utf8");
  assert.match(readme, /https:\/\/www\.buymeacoffee\.com\/llocphann/);
  assert.match(readme, /alt="Buy Me a Coffee"/);
});

void test("support button is branded and independent from theme button classes", () => {
  const source = fs.readFileSync("src/settings-tab.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(source, /cls: "ledge-support-link"/);
  assert.doesNotMatch(source, /mod-cta ledge-support-link/);
  assert.match(source, /cls: "ledge-support-link-label"/);
  assert.match(styles, /--ledge-support-background: #fd0;/);
  assert.match(styles, /\.ledge-support-link-label[\s\S]*white-space: nowrap;/);
});

void test("edge trigger replaces the removed hot-corner interface", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const settingsTab = fs.readFileSync("src/settings-tab.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");
  const readme = fs.readFileSync("README.md", "utf8");

  assert.doesNotMatch(dock, /hotCorner|ledge-hot-corner/);
  assert.doesNotMatch(settingsTab, /hotCorner|Hot corners|hot-corners/);
  assert.doesNotMatch(styles, /ledge-hot-corner|hot-corners/);
  assert.doesNotMatch(readme, /Hot corners|hot-corner/);
  assert.match(settingsTab, /heading: "Edge trigger"/);
  assert.match(settingsTab, /"Activation length"[\s\S]*"triggerLength"/);
  assert.match(styles, /--ledge-trigger-surface-thickness/);
  assert.match(styles, /--ledge-trigger-area-opacity/);
  assert.match(styles, /\.ledge-dock-root \.ledge-dock-trigger/);
  assert.match(settingsTab, /"Activation area background style"/);
});

void test("release README points users to the published Wiki", () => {
  const settingsTab = fs.readFileSync("src/settings-tab.ts", "utf8");
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const runtime = fs.readFileSync("src/runtime/runtime-coordinator.ts", "utf8");
  const multiDock = fs.readFileSync("src/multi-dock.ts", "utf8");
  const settings = fs.readFileSync("src/settings.ts", "utf8");
  const roadmap = fs.readFileSync("ROADMAP.md", "utf8");
  const readme = fs.readFileSync("README.md", "utf8");

  assert.match(settingsTab, /heading: "Context visibility"/);
  assert.match(settingsTab, /heading: include \? "Show Dock in" : "Hide Dock in"/);
  assert.match(dock, /dockVisibleForContext/);
  assert.doesNotMatch(dock, /metadataCache\.on\("changed"/);
  assert.match(runtime, /metadataCache\.on\("changed"/);
  assert.match(multiDock, /class MultiDockController/);
  assert.match(settings, /availableDockPositions/);
  assert.match(roadmap, /Current foundation/);
  assert.match(roadmap, /Exclusive placement/);
  assert.match(roadmap, /Context routing extensions/);
  assert.match(readme, /https:\/\/github\.com\/llocphann\/Ledge\/wiki/);
});

void test("Dock item deletion is confirmation-backed and runtime work is event driven", () => {
  const enhancedSettings = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const accordion = fs.readFileSync("src/item-settings-accordion.ts", "utf8");
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const runtime = fs.readFileSync("src/runtime/runtime-coordinator.ts", "utf8");

  assert.match(enhancedSettings, /ledge-item-delete-button/);
  assert.match(accordion, /class ConfirmDockItemDeleteModal extends Modal/);
  assert.match(accordion, /\.setDestructive\(\)/);
  assert.match(accordion, /host\.expandedItemIds\.delete\(itemId\)/);
  assert.doesNotMatch(dock, /setInterval\(|MutationObserver/);
  assert.doesNotMatch(runtime, /setInterval\(|MutationObserver/);
});

void test("settings persist only through the Obsidian plugin data API", () => {
  const main = fs.readFileSync("src/main.ts", "utf8");

  assert.match(main, /this\.loadData\(\)/);
  assert.match(main, /this\.saveData\(/);
  assert.doesNotMatch(main, /localStorage|sessionStorage/);
});

void test("corner trigger surface is one continuous perpendicular block", () => {
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(styles, /--ledge-corner-arm-length: 72%/);
  assert.match(styles, /data-position="top-left"\] \.ledge-dock-trigger::before \{[\s\S]*?mask:/);
  assert.match(styles, /data-position="bottom-right"\] \.ledge-dock-trigger::before \{[\s\S]*?mask:/);
  assert.match(styles, /data-position\*="-"\] \.ledge-dock-trigger::after \{[\s\S]*?content: none;/);
});

void test("workspace anchoring uses a shared document registry", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const registry = fs.readFileSync("src/runtime/document-registry.ts", "utf8");
  const multiDock = fs.readFileSync("src/multi-dock.ts", "utf8");

  assert.match(dock, /workspaceHost\(\)/);
  assert.match(dock, /ResizeObserver/);
  assert.match(dock, /activeWorkspaceContent/);
  assert.match(dock, /documentRegistry\.context\(document\)/);
  assert.doesNotMatch(dock, /iterateAllLeaves/);
  assert.match(registry, /interface DocumentRuntimeContext/);
  assert.match(registry, /iterateAllLeaves/);
  assert.match(multiDock, /new DocumentRegistry\(host\.app\)/);
});

void test("Dock runtime supports incremental rendering and target caching", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(dock, /classifyDockChanges/);
  assert.match(dock, /TargetResolutionIndex/);
  assert.match(dock, /applyChanges\(dirty:/);
  assert.match(dock, /if \(dirty\.has\("ITEMS"\)\)/);
  assert.match(dock, /else if \(dirty\.has\("ICONS"\)\)/);
  assert.match(dock, /private rebuildItems/);
  assert.match(dock, /this\.panel\.replaceChildren\(\)/);
});

void test("Dock item accordion stays regression-covered", () => {
  const settings = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const accordion = fs.readFileSync("src/item-settings-accordion.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(settings, /ledge-item-delete-button/);
  assert.match(settings, /"appearance",[\s\S]*"layout",[\s\S]*"behavior",[\s\S]*"visibility",[\s\S]*"trigger"/);
  assert.doesNotMatch(settings, /itemRowDecoratorDefinition/);
  assert.match(settings, /cls: "ledge-settings-panel-appearance ledge-settings-panel-items"/);
  assert.doesNotMatch(settings, /items: "Items"/);
  assert.match(accordion, /ConfirmDockItemDeleteModal extends Modal/);
  assert.match(accordion, /ledge-item-accordion-toggle/);
  assert.match(accordion, /alignItemDetailSettings/);
  assert.match(accordion, /item\.enabled \? "" : "Disabled"/);
  assert.doesNotMatch(accordion, /item\.enabled \? "Enabled" : "Hidden"/);
  assert.match(accordion, /Path to a note, base, canvas, or file\./);
  assert.match(styles, /\.ledge-settings-panel-items > \.setting-items \{[\s\S]*?background: transparent;/);
  assert.doesNotMatch(styles, /\.ledge-settings-root \.setting-group \.setting-items \{/);
  assert.doesNotMatch(styles, /data-ledge-settings-tab="items"/);
});
