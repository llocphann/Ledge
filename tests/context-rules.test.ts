import assert from "node:assert/strict";
import test from "node:test";
import {
  contextMatches,
  dockVisibleForContext,
  type NoteContext,
} from "../src/context-rules";
import type { DockVisibilityRule } from "../src/types";

const context: NoteContext = {
  path: "20_Personal_Life/25_Media_Tracker/Movies/World War Z.md",
  name: "World War Z.md",
  basename: "World War Z",
  tags: ["#media/movie", "#favorite"],
};

function rule(
  matchType: DockVisibilityRule["matchType"],
  matchValue: string,
): DockVisibilityRule {
  return { id: `${matchType}-${matchValue}`, enabled: true, matchType, matchValue };
}

void test("visibility rules match note names, exact paths, folders, and nested tags", () => {
  assert.equal(contextMatches(rule("note", "world war z.md"), context), true);
  assert.equal(contextMatches(rule("path", context.path), context), true);
  assert.equal(contextMatches(rule("folder", "20_Personal_Life/25_Media_Tracker"), context), true);
  assert.equal(contextMatches(rule("tag", "#media"), context), true);
  assert.equal(contextMatches(rule("tag", "books"), context), false);
});

void test("no include rules preserves the current show-everywhere behavior", () => {
  assert.equal(dockVisibleForContext([], [], context), true);
  assert.equal(dockVisibleForContext([], [], null), true);
});

void test("include rules restrict visibility and exclude rules always win", () => {
  assert.equal(dockVisibleForContext([rule("tag", "media")], [], context), true);
  assert.equal(dockVisibleForContext([rule("tag", "books")], [], context), false);
  assert.equal(
    dockVisibleForContext([rule("tag", "media")], [rule("note", "World War Z")], context),
    false,
  );
});
