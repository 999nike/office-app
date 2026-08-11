import test from "node:test";
import assert from "node:assert/strict";
import { assignWorker, createJob, defaultPermissionSet, normalizePermissions, updateJob } from "../src/domain/jobs.js";
import { createJobStore, STORAGE_KEY } from "../src/data/job-store.js";

const input = { title: " Sandbox task ", description: " Validate disposable fixture ", priority: "High", project: "office-app", worker: "Sandbox Worker" };
const now = new Date("2026-08-11T10:00:00.000Z");
const catalog = [input.project];

test("creates a normalized inbox job", () => {
  const job = createJob(input, now, "job-1", catalog);
  assert.equal(job.title, "Sandbox task");
  assert.equal(job.status, "Inbox");
  assert.equal(job.createdAt, now.toISOString());
  assert.deepEqual(job.permissions, defaultPermissionSet());
  assert.deepEqual(job.deniedPermissions, defaultPermissionSet());
});

test("copies worker defaults on assignment and preserves job denials", () => {
  const job = createJob({ ...input, deniedPermissions: { useTerminal: true } }, now, "job-1", catalog);
  const worker = {
    id: "worker-1",
    name: "Disposable Helper",
    permissions: { readFiles: true, useTerminal: true },
    deniedPermissions: { modifyFiles: true },
  };
  const assigned = assignWorker(job, worker, new Date("2026-08-11T10:30:00.000Z"));
  assert.equal(assigned.workerId, "worker-1");
  assert.equal(assigned.worker, "Disposable Helper");
  assert.equal(assigned.permissions.readFiles, true);
  assert.equal(assigned.permissions.useTerminal, false);
  assert.equal(assigned.deniedPermissions.useTerminal, true);
  assert.equal(assigned.deniedPermissions.modifyFiles, true);
});

test("assigned job permissions remain independent of later worker edits", () => {
  const job = createJob(input, now, "job-1", catalog);
  const worker = { id: "worker-1", name: "Disposable Helper", permissions: { runTests: true } };
  const assigned = assignWorker(job, worker, now);
  worker.permissions.runTests = false;
  worker.permissions.modifyFiles = true;
  assert.equal(assigned.permissions.runTests, true);
  assert.equal(assigned.permissions.modifyFiles, false);
});

test("records explicit allows and denials without conflicts", () => {
  const job = createJob({
    ...input,
    permissions: { readFiles: true, useTerminal: true },
    deniedPermissions: { modifyFiles: true, useTerminal: true },
  }, now, "job-1", catalog);
  assert.equal(job.permissions.readFiles, true);
  assert.equal(job.permissions.modifyFiles, false);
  assert.equal(job.deniedPermissions.modifyFiles, true);
  assert.equal(job.permissions.useTerminal, false);
  assert.equal(job.deniedPermissions.useTerminal, true);
});

test("normalizes existing jobs to safe permission defaults", () => {
  const normalized = normalizePermissions({ title: "Legacy job" });
  assert.deepEqual(normalized.permissions, defaultPermissionSet());
  assert.deepEqual(normalized.deniedPermissions, defaultPermissionSet());
});

test("rejects incomplete jobs and invalid values", () => {
  assert.throws(() => createJob({ ...input, title: "" }, now, "job-1", catalog), /title/i);
  assert.throws(() => createJob({ ...input, priority: "Extreme" }, now, "job-1", catalog), /priority/i);
  assert.throws(() => createJob({ ...input, project: "not-in-catalog" }, now, "job-1", catalog), /current Code Space catalog/i);
});

test("changes status without mutating identity or creation time", () => {
  const job = createJob(input, now, "job-1", catalog);
  const later = new Date("2026-08-11T11:00:00.000Z");
  const updated = updateJob(job, { status: "Review" }, later);
  assert.equal(updated.status, "Review");
  assert.equal(updated.createdAt, job.createdAt);
  assert.equal(updated.updatedAt, later.toISOString());
});

test("persists, retrieves, and replaces jobs", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = createJobStore(storage);
  const job = createJob(input, now, "job-1", catalog);
  store.add(job);
  assert.equal(store.get("job-1").title, "Sandbox task");
  store.replace({ ...job, status: "Complete" });
  assert.equal(JSON.parse(values.get(STORAGE_KEY))[0].status, "Complete");
});

test("loads existing persisted jobs with safe permission defaults", () => {
  const values = new Map([[STORAGE_KEY, JSON.stringify([{ id: "legacy", title: "Legacy", worker: "Old local label" }])]]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const job = createJobStore(storage).get("legacy");
  assert.deepEqual(job.permissions, defaultPermissionSet());
  assert.deepEqual(job.deniedPermissions, defaultPermissionSet());
  assert.equal(job.worker, "Old local label");
  assert.equal(job.workerId, null);
});
