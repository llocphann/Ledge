import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("corner triggers keep viewport-fixed geometry outside the workspace split", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(
    dock,
    /const position = this\.controller\.settings\(\)\.position;[\s\S]*const host = isCornerPosition\(position\) \? this\.document\.body : this\.workspaceHost\(\);/,
  );
  assert.match(styles, /\[data-position\*="-"\] \.ledge-dock-trigger::before \{[\s\S]*?width: 72%;/);
  assert.match(styles, /\[data-position\*="-"\] \.ledge-dock-trigger::after \{[\s\S]*?height: 72%;/);
});
