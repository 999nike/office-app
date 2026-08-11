import test from "node:test";
import assert from "node:assert/strict";
import { createCodeSpaceProjectCatalog, normalizeProjects } from "../src/connectors/code-space-projects.js";

test("accepts only a safe Code Space project-name catalog", () => {
  assert.deepEqual(normalizeProjects({ projects: [{ name: "office-app" }, { name: "agent-sandbox-test" }] }), ["agent-sandbox-test", "office-app"]);
  assert.throws(() => normalizeProjects({ projects: [{ name: "../outside" }] }), /unsafe/i);
});

test("keeps project selection unavailable when Code Space cannot provide a catalog", async () => {
  const catalog = createCodeSpaceProjectCatalog(async () => ({ ok: false }));
  await catalog.refresh();
  assert.equal(catalog.available, false);
  assert.equal(catalog.has("office-app"), false);
  assert.equal(catalog.message, "Code Space projects unavailable");
});

test("uses only the current Code Space catalog", async () => {
  const catalog = createCodeSpaceProjectCatalog(async () => ({ ok: true, json: async () => ({ projects: [{ name: "agent-sandbox-test" }] }) }));
  await catalog.refresh();
  assert.equal(catalog.has("agent-sandbox-test"), true);
  assert.equal(catalog.has("office-app"), false);
});
