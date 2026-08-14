import test from "node:test";
import assert from "node:assert/strict";
import { cancelPackage, createDispatchExport, createDispatchPackage, dispatchExportFilename, markPackageReady, normalizeDispatchPackage } from "../src/domain/dispatch.js";
import { createDispatchStore, DISPATCH_STORAGE_KEY } from "../src/data/dispatch-store.js";
import { getExecutionWorker } from "../src/domain/execution-models.js";

const now = new Date("2026-08-11T14:00:00.000Z");
const job = {
  id: "job-sandbox",
  workerId: "worker-sandbox",
  worker: "Sandbox Helper",
  title: "Inspect disposable fixture",
  description: "Review the sandbox-only material and propose a handoff.",
  priority: "Medium",
  status: "Ready",
  project: "sandbox-target",
};
const worker = { id: "worker-sandbox", name: "Sandbox Helper", role: "Reviewer", status: "Available" };

test("creates a safe Draft dispatch snapshot", () => {
  const packageSnapshot = createDispatchPackage(job, worker, now, "package-1");
  assert.equal(packageSnapshot.packageStatus, "Draft");
  assert.equal(packageSnapshot.workerId, worker.id);
  assert.equal(packageSnapshot.sandboxTarget, "sandbox-target");
  assert.equal(Object.hasOwn(packageSnapshot, "effectivePermissions"), false);
  assert.equal(Object.hasOwn(packageSnapshot, "explicitDenials"), false);
});

test("freezes the built-in Codex identity in an unchanged v1 dispatch package", () => {
  const codex = getExecutionWorker("builtin:codex");
  const packageSnapshot = createDispatchPackage({ ...job, workerId: codex.id, worker: codex.name }, codex, now, "package-codex");
  const exported = createDispatchExport(markPackageReady(packageSnapshot, { ...job, workerId: codex.id, worker: codex.name }, codex));
  assert.deepEqual(exported.worker, { id: "builtin:codex", name: "Codex", role: "Built-in coding model" });
  assert.equal(exported.version, 1);
});

test("snapshot remains independent after job and worker edits", () => {
  const packageSnapshot = createDispatchPackage(job, worker, now, "package-1");
  worker.name = "Changed sandbox label";
  assert.equal(packageSnapshot.workerName, "Sandbox Helper");
  worker.name = "Sandbox Helper";
});

test("marks a valid Draft package Ready", () => {
  const packageSnapshot = createDispatchPackage(job, worker, now, "package-1");
  const ready = markPackageReady(packageSnapshot, job, worker, new Date("2026-08-11T14:10:00.000Z"));
  assert.equal(ready.packageStatus, "Ready");
  assert.equal(ready.createdAt, packageSnapshot.createdAt);
});

test("exports only a Ready package using its frozen snapshot", () => {
  const draft = createDispatchPackage(job, worker, now, "package:1");
  assert.throws(() => createDispatchExport(draft), /Ready/i);
  const ready = markPackageReady(draft, job, worker);
  const exported = JSON.parse(JSON.stringify(createDispatchExport(ready)));
  assert.equal(exported.format, "office-dispatch-package");
  assert.equal(exported.version, 1);
  assert.equal(exported.packageId, "package:1");
  assert.equal(exported.worker.name, "Sandbox Helper");
  assert.equal(Object.hasOwn(exported, "capabilities"), false);
  assert.equal(dispatchExportFilename(ready), "office-dispatch-package-1.json");
});

test("export stays independent of later job and worker edits", () => {
  const ready = markPackageReady(createDispatchPackage(job, worker, now, "package-1"), job, worker);
  job.description = "Changed later";
  worker.role = "Changed later";
  const exported = createDispatchExport(ready);
  assert.equal(exported.instructions, "Review the sandbox-only material and propose a handoff.");
  assert.equal(exported.worker.role, "Reviewer");
  job.description = "Review the sandbox-only material and propose a handoff.";
  worker.role = "Reviewer";
});

test("rejects Ready without an assigned worker", () => {
  const unassignedJob = { ...job, workerId: null, worker: "Unassigned" };
  const packageSnapshot = createDispatchPackage(unassignedJob, null, now, "package-1");
  assert.throws(() => markPackageReady(packageSnapshot, unassignedJob, null), /assigned worker/i);
});

test("rejects Ready for a disabled worker", () => {
  const packageSnapshot = createDispatchPackage(job, worker, now, "package-1");
  assert.throws(() => markPackageReady(packageSnapshot, job, { ...worker, status: "Disabled" }), /disabled/i);
});

test("accepts a package without Office permission state", () => {
  const oldPackage = normalizeDispatchPackage({
    id: "old-package",
    jobId: job.id,
    workerId: worker.id,
    packageStatus: "Draft",
  });
  assert.equal(markPackageReady(oldPackage, job, worker).packageStatus, "Ready");
});

test("cancels without changing snapshot fields", () => {
  const packageSnapshot = createDispatchPackage(job, worker, now, "package-1");
  const cancelled = cancelPackage(packageSnapshot, new Date("2026-08-11T14:20:00.000Z"));
  assert.equal(cancelled.packageStatus, "Cancelled");
  assert.equal(Object.hasOwn(cancelled, "effectivePermissions"), false);
  assert.equal(cancelled.jobTitle, packageSnapshot.jobTitle);
});

test("normalizes old stored state to safe Draft defaults", () => {
  const normalized = normalizeDispatchPackage({ id: "old-package", jobId: "old-job" });
  assert.equal(normalized.packageStatus, "Draft");
  assert.equal(Object.hasOwn(normalized, "hasPermissionSnapshot"), false);
  assert.equal(Object.hasOwn(normalized, "effectivePermissions"), false);
});

test("persists dispatch packages in a separate local store", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = createDispatchStore(storage);
  const packageSnapshot = createDispatchPackage(job, worker, now, "package-1");
  store.add(packageSnapshot);
  store.replace(cancelPackage(packageSnapshot, now));
  assert.equal(store.get("package-1").packageStatus, "Cancelled");
  assert.equal(JSON.parse(values.get(DISPATCH_STORAGE_KEY)).length, 1);
});
