import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("corner trigger uses one continuous masked surface without changing its geometry", () => {
  const dock = fs.readFileSync("src/dock.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(dock, /const cornerExtent = Math\.max\(triggerSize \* 2\.6, 40\)/);
  assert.match(styles, /--ledge-corner-arm-length: 72%/);
  assert.match(styles, /--ledge-corner-mask-thickness: min\(100%, var\(--ledge-trigger-surface-thickness\)\)/);
  assert.match(styles, /data-position="top-left"\] \.ledge-dock-trigger::before \{[\s\S]*?mask:/);
  assert.match(styles, /radial-gradient\(circle, #000 98%, transparent 100%\)/);
  assert.match(styles, /data-position\*="-"\] \.ledge-dock-trigger::after \{[\s\S]*?content: none;/);
  assert.match(styles, /linear-gradient\([\s\S]*?var\(--ledge-trigger-angle\)[\s\S]*?var\(--ledge-trigger-start\)[\s\S]*?var\(--ledge-trigger-end\)/);
  assert.match(styles, /is-trigger-background-hidden:not\(\.is-trigger-border-hidden\)[\s\S]*?\.ledge-dock-trigger::after/);
});
