import { defaultPermissionSet } from "./jobs.js";

export const BUILT_IN_EXECUTION_MODELS = Object.freeze([
  Object.freeze({
    id: "builtin:codex",
    name: "Codex",
    role: "Built-in coding model",
    description: "Code Space routed execution model",
    status: "Available",
    builtIn: true,
  }),
]);

function copyModel(model) {
  const permissions = defaultPermissionSet();
  const deniedPermissions = defaultPermissionSet();

  if (model.id === "builtin:codex") {
    permissions.readFiles = true;
    permissions.modifyFiles = true;
    permissions.runTests = true;
    permissions.useTerminal = true;
    permissions.proposeResult = true;
  }

  return {
    ...model,
    permissions,
    deniedPermissions,
  };
}

export function listExecutionWorkers(localWorkers = []) {
  return [...BUILT_IN_EXECUTION_MODELS.map(copyModel), ...localWorkers];
}

export function getExecutionWorker(id, localWorkers = []) {
  const builtIn = BUILT_IN_EXECUTION_MODELS.find((model) => model.id === id);
  if (builtIn) return copyModel(builtIn);
  return localWorkers.find((worker) => worker.id === id) || null;
}
