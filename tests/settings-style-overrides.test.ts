import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("settings item panel uses compact spacing without inherited separators", () => {
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.doesNotMatch(styles, /\.ledge-settings-panel-items\s*\{[^}]*\bgap\s*:/);
  assert.match(
    styles,
    /\.ledge-settings-panel-items\s*\{[^}]*margin:\s*var\(--size-4-3\) 0 0;/,
  );
  assert.match(
    styles,
    /\.ledge-settings-panel-items \+ \.ledge-settings-data-inline\s*\{[^}]*margin-top:\s*var\(--size-4-3\);/,
  );
  assert.match(
    styles,
    /\.ledge-settings-root \.setting-group \.setting-item:not\(\.setting-item-heading\)::before\s*\{[^}]*border-top:\s*0;/,
  );
});
