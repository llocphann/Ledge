import assert from "node:assert/strict";
import test from "node:test";
import { SettingsStore } from "../src/services/settings-store";

void test("scheduled settings writes coalesce to the latest snapshot", async () => {
  const writes: number[] = [];
  const store = new SettingsStore<number>(async (value) => {
    writes.push(value);
  }, { coalesceMs: 5 });

  const first = store.schedule(1);
  const second = store.schedule(2);
  const third = store.schedule(3);

  await Promise.all([first, second, third]);
  assert.deepEqual(writes, [3]);
});

void test("explicit flushes serialize behind a write already in flight", async () => {
  const events: string[] = [];
  let releaseFirst!: () => void;
  const firstWriteCanFinish = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const store = new SettingsStore<number>(async (value) => {
    events.push(`start:${value}`);
    if (value === 1) await firstWriteCanFinish;
    events.push(`end:${value}`);
  }, { coalesceMs: 5 });

  const first = store.flush(1);
  const second = store.flush(2);
  await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

  assert.deepEqual(events, ["start:1"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["start:1", "end:1", "start:2", "end:2"]);
});

void test("a failed write does not poison subsequent persistence", async () => {
  const writes: number[] = [];
  const store = new SettingsStore<number>(async (value) => {
    writes.push(value);
    if (value === 1) throw new Error("expected failure");
  });

  await assert.rejects(store.flush(1), /expected failure/);
  await store.flush(2);
  assert.deepEqual(writes, [1, 2]);
});
