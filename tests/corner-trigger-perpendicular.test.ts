import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("corner trigger pills keep their size and meet at a perpendicular joint", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(dock, /const cornerExtent = Math\.max\(triggerSize \* 2\.6, 40\)/);
  assert.match(styles, /data-position\*="-"\] \.ledge-dock-trigger::before \{[\s\S]*?width: 72%;[\s\S]*?height: min\(100%, var\(--ledge-trigger-surface-thickness\)\)/);
  assert.match(styles, /data-position\*="-"\] \.ledge-dock-trigger::after \{[\s\S]*?width: min\(100%, var\(--ledge-trigger-surface-thickness\)\);[\s\S]*?height: 72%/);
  assert.match(styles, /data-position="top-left"\] \.ledge-dock-trigger::before \{[\s\S]*?border-radius: 0 var\(--ledge-trigger-radius\) var\(--ledge-trigger-radius\) 0;/);
  assert.match(styles, /data-position="top-left"\] \.ledge-dock-trigger::after \{[\s\S]*?border-radius: 0 0 var\(--ledge-trigger-radius\) var\(--ledge-trigger-radius\);/);
  assert.match(styles, /data-position="bottom-right"\] \.ledge-dock-trigger::before \{[\s\S]*?border-radius: var\(--ledge-trigger-radius\) 0 0 var\(--ledge-trigger-radius\);/);
  assert.match(styles, /data-position="bottom-right"\] \.ledge-dock-trigger::after \{[\s\S]*?border-radius: var\(--ledge-trigger-radius\) var\(--ledge-trigger-radius\) 0 0;/);
});
