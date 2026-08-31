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
});
