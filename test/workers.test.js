import test from "node:test";
import assert from "node:assert/strict";
import { defaultPermissionSet } from "../src/domain/jobs.js";
import { createWorker, normalizeWorker, updateWorker } from "../src/domain/workers.js";
import { createWorkerStore, WORKER_STORAGE_KEY } from "../src/data/worker-store.js";

const now = new Date("2026-08-11T12:00:00.000Z");
const input = { name: " Sandbox Helper ", role: " Review assistant ", status: "Available" };

test("creates a worker with safe permission defaults", () => {
  const worker = createWorker(input, now, "worker-1");
  assert.equal(worker.name, "Sandbox Helper");
  assert.equal(worker.role, "Review assistant");
  assert.deepEqual(worker.permissions, defaultPermissionSet());
  assert.deepEqual(worker.deniedPermissions, defaultPermissionSet());
});

test("validates worker identity and status", () => {
  assert.throws(() => createWorker({ ...input, name: "" }, now, "worker-1"), /name/i);
  assert.throws(() => createWorker({ ...input, role: "" }, now, "worker-1"), /role/i);
  assert.throws(() => createWorker({ ...input, status: "Running" }, now, "worker-1"), /status/i);
});

test("updates a worker while preserving identity and creation time", () => {
  const worker = createWorker(input, now, "worker-1");
  const later = new Date("2026-08-11T13:00:00.000Z");
  const updated = updateWorker(worker, { status: "Busy" }, later);
  assert.equal(updated.id, worker.id);
  assert.equal(updated.createdAt, worker.createdAt);
  assert.equal(updated.updatedAt, later.toISOString());
});

test("normalizes older worker records safely", () => {
  const worker = normalizeWorker({ id: "legacy", name: "Old sandbox profile", role: "Helper" });
  assert.equal(worker.status, "Offline");
  assert.deepEqual(worker.permissions, defaultPermissionSet());
  assert.equal(worker.createdAt, "1970-01-01T00:00:00.000Z");
});

test("persists, replaces, and deletes workers locally", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = createWorkerStore(storage);
  const worker = createWorker(input, now, "worker-1");
  store.add(worker);
  store.replace({ ...worker, status: "Disabled" });
  assert.equal(store.get("worker-1").status, "Disabled");
  store.remove("worker-1");
  assert.equal(store.list().length, 0);
  assert.deepEqual(JSON.parse(values.get(WORKER_STORAGE_KEY)), []);
});
