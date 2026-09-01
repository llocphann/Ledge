import assert from "node:assert/strict";
import test from "node:test";
import {
  ICON_CACHE_DATA_KEY,
  ICON_CACHE_VERSION,
  parseIconCache,
  serializeIconCache,
} from "../src/icon-cache";

void test("external icon cache round-trips selected Iconify bodies", () => {
  const source = new Map([
    ["iconify:mdi:home", "<path d=\"M1 1h22v22H1z\"/>"] ,
    ["iconify:tabler:book", "<path d=\"M4 3h16v18H4z\"/>"] ,
  ]);
  const serialized = serializeIconCache(source);
  const restored = parseIconCache({ [ICON_CACHE_DATA_KEY]: serialized });

  assert.equal(serialized.version, ICON_CACHE_VERSION);
  assert.deepEqual([...restored], [...source]);
});

void test("icon cache ignores unrelated, malformed, and unsafe entries", () => {
  const restored = parseIconCache({
    [ICON_CACHE_DATA_KEY]: {
      version: ICON_CACHE_VERSION,
      icons: {
        home: "<path d=\"M0 0\"/>",
        "iconify:mdi:safe": "<path d=\"M0 0h24v24H0z\"/>",
        "iconify:mdi:scripted": "<script>alert(1)</script>",
        "iconify:mdi:event": "<path onclick=\"alert(1)\" d=\"M0 0\"/>",
        "iconify:mdi:remote": "<use href=\"https://example.com/icon.svg\"/>",
      },
    },
  });

  assert.deepEqual([...restored.keys()], ["iconify:mdi:safe"]);
});

void test("unknown cache versions are ignored safely", () => {
  assert.deepEqual(
    [...parseIconCache({
      [ICON_CACHE_DATA_KEY]: { version: 999, icons: { "iconify:mdi:home": "<path/>" } },
    })],
    [],
  );
});
