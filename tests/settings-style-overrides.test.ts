import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("settings item panel uses compact spacing without inherited separators", () => {
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.doesNotMatch(styles, /\.ledge-settings-panel-items\s*\{[^}]*\bgap\s*:/);
  assert.match(
    styles,
    /\.ledge-settings-root \.setting-group \.setting-item:not\(\.setting-item-heading\)::before\s*\{[^}]*border-top:\s*0;/,
  );
});
