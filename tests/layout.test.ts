import assert from "node:assert/strict";
import test from "node:test";
import { computeCornerLayout, isCornerPosition, isVerticalPosition } from "../src/layout";

void test("straight and corner positions are classified", () => {
  assert.equal(isVerticalPosition("left"), true);
  assert.equal(isVerticalPosition("top"), false);
  assert.equal(isCornerPosition("bottom-right"), true);
  assert.equal(isCornerPosition("right"), false);
});

void test("top-left layout forms a 90-degree corner", () => {
  assert.deepEqual(computeCornerLayout("top-left", 5), {
    columns: 3,
    rows: 3,
    horizontalCount: 3,
    slots: [
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
      { column: 1, row: 2 },
      { column: 1, row: 3 },
    ],
  });
});

void test("bottom-right layout grows left and upward from its corner", () => {
  assert.deepEqual(computeCornerLayout("bottom-right", 4).slots, [
    { column: 2, row: 3 },
    { column: 1, row: 3 },
    { column: 2, row: 2 },
    { column: 2, row: 1 },
  ]);
});

void test("the remaining corner layouts mirror the same 90-degree geometry", () => {
  assert.deepEqual(computeCornerLayout("top-right", 3).slots, [
    { column: 2, row: 1 },
    { column: 1, row: 1 },
    { column: 2, row: 2 },
  ]);
  assert.deepEqual(computeCornerLayout("bottom-left", 3).slots, [
    { column: 1, row: 2 },
    { column: 2, row: 2 },
    { column: 1, row: 1 },
  ]);
});
