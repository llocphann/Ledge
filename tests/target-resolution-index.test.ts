import assert from "node:assert/strict";
import test from "node:test";
import { TargetResolutionIndex } from "../src/runtime/target-resolution-index";

void test("target resolution is cached by stable item ID and configured target", () => {
  const index = new TargetResolutionIndex<string | null>();
  let calls = 0;
  const resolver = (target: string): string | null => {
    calls += 1;
    return target === "Missing" ? null : `/resolved/${target}`;
  };

  assert.equal(index.resolve("a", "Home", resolver), "/resolved/Home");
  assert.equal(index.resolve("a", "Home", resolver), "/resolved/Home");
  assert.equal(index.resolve("b", "Missing", resolver), null);
  assert.equal(index.resolve("b", "Missing", resolver), null);
  assert.equal(calls, 2);
  assert.equal(index.size, 2);
});

void test("changing an item's configured target forces a fresh resolution", () => {
  const index = new TargetResolutionIndex<string>();
  let calls = 0;

  index.resolve("item", "A", (target) => `${target}:${++calls}`);
  const next = index.resolve("item", "B", (target) => `${target}:${++calls}`);

  assert.equal(next, "B:2");
  assert.equal(calls, 2);
});

void test("target cache can invalidate selected entries or the entire index", () => {
  const index = new TargetResolutionIndex<string>();
  const resolver = (target: string): string => target;
  index.resolve("a", "A", resolver);
  index.resolve("b", "B", resolver);
  index.resolve("c", "C", resolver);

  index.invalidateWhere((_itemId, target) => target === "B");
  assert.equal(index.size, 2);
  index.invalidateItem("a");
  assert.equal(index.size, 1);
  index.invalidateAll();
  assert.equal(index.size, 0);
});
