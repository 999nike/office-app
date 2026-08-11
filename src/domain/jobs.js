export const STATUSES = ["Inbox", "Ready", "In Progress", "Review", "Complete", "Blocked"];
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const CAPABILITIES = Object.freeze([
  { key: "readFiles", label: "Read files" },
  { key: "modifyFiles", label: "Modify files" },
  { key: "runTests", label: "Run tests" },
  { key: "useTerminal", label: "Use terminal" },
  { key: "proposeResult", label: "Propose result / handoff" },
]);

export function defaultPermissionSet() {
  return Object.fromEntries(CAPABILITIES.map(({ key }) => [key, false]));
}

export function normalizePermissions(job = {}) {
  const permissions = defaultPermissionSet();
  const deniedPermissions = defaultPermissionSet();
  for (const { key } of CAPABILITIES) {
    const allowed = job.permissions?.[key] === true;
    const denied = job.deniedPermissions?.[key] === true;
    permissions[key] = allowed && !denied;
    deniedPermissions[key] = denied;
  }
  return { permissions, deniedPermissions };
}

export function createJob(input, now = new Date(), id = crypto.randomUUID(), availableProjects = []) {
  const title = input.title?.trim();
  const description = input.description?.trim();
  if (!title) throw new Error("A title is required.");
  if (!description) throw new Error("A description is required.");
  if (!PRIORITIES.includes(input.priority)) throw new Error("Choose a valid priority.");
  const project = typeof input.project === "string" ? input.project.trim() : "";
  if (!Array.isArray(availableProjects) || !availableProjects.includes(project)) throw new Error("Choose a project from the current Code Space catalog.");

  const timestamp = now.toISOString();
  return {
    id,
    title,
    description,
    priority: input.priority,
    project,
    worker: input.worker?.trim() || "Unassigned",
    workerId: input.workerId || null,
    status: "Inbox",
    result: "",
    ...normalizePermissions(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function assignWorker(job, worker, now = new Date()) {
  if (!worker) return updateJob(job, { worker: "Unassigned", workerId: null }, now);
  const defaults = normalizePermissions(worker);
  const existing = normalizePermissions(job);
  for (const { key } of CAPABILITIES) {
    if (existing.deniedPermissions[key]) {
      defaults.permissions[key] = false;
      defaults.deniedPermissions[key] = true;
    }
  }
  return updateJob(job, {
    worker: worker.name,
    workerId: worker.id,
    ...defaults,
  }, now);
}

export function updateJob(job, changes, now = new Date()) {
  if (changes.status && !STATUSES.includes(changes.status)) throw new Error("Invalid job status.");
  const permissionState = normalizePermissions({
    permissions: changes.permissions ?? job.permissions,
    deniedPermissions: changes.deniedPermissions ?? job.deniedPermissions,
  });
  return {
    ...job,
    ...changes,
    id: job.id,
    createdAt: job.createdAt,
    ...permissionState,
    updatedAt: now.toISOString(),
  };
}
