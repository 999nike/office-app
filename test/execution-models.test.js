import test from "node:test";
import assert from "node:assert/strict";
import { defaultPermissionSet } from "../src/domain/jobs.js";
import { getExecutionWorker, listExecutionWorkers } from "../src/domain/execution-models.js";

test("exposes Codex as a built-in execution model without a local profile", () => {
  const [codex] = listExecutionWorkers([]);
  assert.equal(codex.id, "builtin:codex");
  assert.equal(codex.name, "Codex");
  assert.equal(codex.builtIn, true);
  assert.deepEqual(codex.permissions, defaultPermissionSet());
  assert.deepEqual(codex.deniedPermissions, defaultPermissionSet());
});

test("keeps built-in models separate from and compatible with local worker profiles", () => {
  const local = { id: "worker-local", name: "Local Reviewer", role: "Reviewer" };
  const models = listExecutionWorkers([local]);
  assert.deepEqual(models.map((worker) => worker.id), ["builtin:codex", "worker-local"]);
  assert.equal(getExecutionWorker("builtin:codex", [local]).name, "Codex");
  assert.equal(getExecutionWorker("worker-local", [local]), local);
  assert.equal(getExecutionWorker("missing", [local]), null);
});
