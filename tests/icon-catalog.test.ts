import assert from "node:assert/strict";
import test from "node:test";
import {
  ICONIFY_COLLECTIONS,
  iconDisplayName,
  makeIconifyId,
  parseIconifyId,
  shouldIncludeIconifyName,
} from "../src/icon-catalog";

void test("built-in icon catalog includes the supported external collections", () => {
  assert.deepEqual(
    ICONIFY_COLLECTIONS.map((collection) => collection.prefix),
    ["tabler", "mdi", "ph", "bi"],
  );
});

void test("Iconify IDs round-trip through the stored Dock icon string", () => {
  const iconId = makeIconifyId("tabler", "home");
  assert.equal(iconId, "iconify:tabler:home");
  assert.deepEqual(parseIconifyId(iconId), { prefix: "tabler", name: "home" });
  assert.equal(parseIconifyId("home"), null);
});

void test("icon names stay human-readable without exposing library IDs", () => {
  assert.equal(iconDisplayName("lucide-book-open"), "Book Open");
  assert.equal(iconDisplayName("iconify:mdi:account-circle"), "Account Circle");
});

void test("Phosphor weight variants are filtered from the unified picker", () => {
  assert.equal(shouldIncludeIconifyName("ph", "house"), true);
  assert.equal(shouldIncludeIconifyName("ph", "house-bold"), false);
  assert.equal(shouldIncludeIconifyName("ph", "house-duotone"), false);
  assert.equal(shouldIncludeIconifyName("tabler", "home-filled"), true);
});
