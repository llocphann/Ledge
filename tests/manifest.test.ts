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
    "assets/buy-me-a-coffee.svg",
  ]) {
    assert.equal(fs.existsSync(path), true, `${path} is required`);
  }
  assert.match(fs.readFileSync("LICENSE", "utf8"), /^GNU GENERAL PUBLIC LICENSE\nVersion 3/);
  assert.match(
    fs.readFileSync("README.md", "utf8"),
    /https:\/\/www\.buymeacoffee\.com\/llocphann/,
  );
  assert.match(
    fs.readFileSync("README.md", "utf8"),
    /https:\/\/raw\.githubusercontent\.com\/llocphann\/Ledge\/main\/assets\/buy-me-a-coffee\.svg/,
  );
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
  const multiDock = fs.readFileSync("src/multi-dock.ts", "utf8");
  const settings = fs.readFileSync("src/settings.ts", "utf8");
  const roadmap = fs.readFileSync("ROADMAP.md", "utf8");
  const readme = fs.readFileSync("README.md", "utf8");

  assert.match(settingsTab, /heading: "Context visibility"/);
  assert.match(settingsTab, /heading: include \? "Show Dock in" : "Hide Dock in"/);
  assert.match(dock, /dockVisibleForContext/);
  assert.match(dock, /metadataCache\.on\("changed"/);
  assert.match(multiDock, /class MultiDockController/);
  assert.match(settings, /availableDockPositions/);
  assert.match(roadmap, /Current foundation/);
  assert.match(roadmap, /Exclusive placement/);
  assert.match(roadmap, /Context routing extensions/);
  assert.match(readme, /https:\/\/github\.com\/llocphann\/Ledge\/wiki/);
  assert.doesNotMatch(readme, /## Development|npm install|npm run check/);
});

void test("Dock item pages expose a visible delete control and runtime work is event driven", () => {
  const settings = fs.readFileSync("src/settings-tab.ts", "utf8");
  const dock = fs.readFileSync("src/dock.ts", "utf8");

  assert.match(settings, /name: "Delete dock item"/);
  assert.match(settings, /\.setDestructive\(\)/);
  assert.match(settings, /heading: "Backup & transfer"/);
  assert.doesNotMatch(dock, /setInterval\(|MutationObserver/);
});

void test("settings persist only through the Obsidian plugin data API", () => {
  const main = fs.readFileSync("src/main.ts", "utf8");

  assert.match(main, /this\.loadData\(\)/);
  assert.match(main, /this\.saveData\(/);
  assert.doesNotMatch(main, /localStorage|sessionStorage/);
});

void test("corner trigger pills use perpendicular rounded arms", () => {
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(
    styles,
    /\[data-position\*="-"\] \.ledge-dock-trigger::before \{[\s\S]*?width: 72%;[\s\S]*?border-radius: var\(--ledge-trigger-radius\);/,
  );
  assert.match(
    styles,
    /\[data-position\*="-"\] \.ledge-dock-trigger::after \{[\s\S]*?height: 72%;[\s\S]*?border-radius: var\(--ledge-trigger-radius\);/,
  );
});


void test("workspace anchoring and Dock item accordion stay regression-covered", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const settings = fs.readFileSync("src/icon-library-setting-tab.ts", "utf8");
  const accordion = fs.readFileSync("src/item-settings-accordion.ts", "utf8");

  assert.match(dock, /workspaceHost\(\)/);
  assert.match(dock, /ResizeObserver/);
  assert.match(dock, /activeWorkspaceContent/);
  assert.match(settings, /ledge-item-delete-button/);
  assert.match(settings, /"appearance",[\s\S]*"layout",[\s\S]*"behavior",[\s\S]*"visibility",[\s\S]*"items",[\s\S]*"trigger"/);
  assert.match(accordion, /ConfirmDockItemDeleteModal extends Modal/);
  assert.match(accordion, /ledge-item-accordion-toggle/);
});
