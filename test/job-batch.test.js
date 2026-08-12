import test from "node:test";
import assert from "node:assert/strict";
import { createJobBatch } from "../src/domain/job-batch.js";
import { defaultPermissionSet } from "../src/domain/jobs.js";

const now = new Date("2026-08-12T19:30:00.000Z");
const projects = ["agent-sandbox-test"];
const base = {
  description: "Read only the authorized snapshot.",
  priority: "Low",
  project: "agent-sandbox-test",
  worker: "Codex",
  workerId: "builtin:codex",
  permissions: { ...defaultPermissionSet(), readFiles: true, proposeResult: true },
  deniedPermissions: defaultPermissionSet(),
};

test("creates ordered normal jobs with independently frozen input values", () => {
  const ids = ["job-1", "job-2"];
  const jobs = createJobBatch([
    { ...base, title: "First" },
    { ...base, title: "Second", permissions: { ...base.permissions, runTests: true } }
  ], { now, projects, createId: () => ids.shift() });

  assert.deepEqual(jobs.map((job) => job.id), ["job-1", "job-2"]);
  assert.deepEqual(jobs.map((job) => job.title), ["First", "Second"]);
  assert.equal(jobs[0].permissions.runTests, false);
  assert.equal(jobs[1].permissions.runTests, true);
  assert.notEqual(jobs[0].permissions, jobs[1].permissions);
});

test("rejects an invalid batch before any job can be persisted", () => {
  assert.throws(() => createJobBatch([{ ...base, title: "Only one" }], { now, projects }), /2 and 10/i);
  assert.throws(() => createJobBatch([{ ...base, title: "Good" }, { ...base, title: "", project: "outside" }], { now, projects }), /title/i);
});
