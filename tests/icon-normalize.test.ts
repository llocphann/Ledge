import assert from "node:assert/strict";
import test from "node:test";
import { iconBodyForObsidian } from "../src/icon-normalize";

void test("external icons fill Obsidian's 100x100 custom-icon coordinate space", () => {
  assert.equal(
    iconBodyForObsidian({ body: "<path/>", width: 24, height: 24 }, {}),
    '<g transform="scale(4.166667)"><path/></g>',
  );
  assert.equal(
    iconBodyForObsidian({ body: "<path/>", width: 100, height: 100 }, {}),
    "<path/>",
  );
});

void test("external icon normalization preserves rectangular aspect ratio and centers it", () => {
  assert.equal(
    iconBodyForObsidian({ body: "<path/>", width: 32, height: 16 }, {}),
    '<g transform="translate(0 25)"><g transform="scale(3.125)"><path/></g></g>',
  );
});
