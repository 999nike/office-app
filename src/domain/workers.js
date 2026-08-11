import { normalizePermissions } from "./jobs.js";

export const WORKER_STATUSES = ["Available", "Busy", "Offline", "Disabled"];

export function createWorker(input, now = new Date(), id = crypto.randomUUID()) {
  const name = input.name?.trim();
  const role = input.role?.trim();
  if (!name) throw new Error("A worker name is required.");
  if (!role) throw new Error("A worker type / role is required.");
  if (!WORKER_STATUSES.includes(input.status)) throw new Error("Choose a valid worker status.");

  const timestamp = now.toISOString();
  return {
    id,
    name,
    role,
    description: input.description?.trim() || "",
    status: input.status,
    ...normalizePermissions(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeWorker(worker) {
  const fallbackTimestamp = worker.updatedAt || worker.createdAt || new Date(0).toISOString();
  return {
    ...worker,
    name: worker.name || "Unnamed worker",
    role: worker.role || "Unspecified",
    description: worker.description || "",
    status: WORKER_STATUSES.includes(worker.status) ? worker.status : "Offline",
    ...normalizePermissions(worker),
    createdAt: worker.createdAt || fallbackTimestamp,
    updatedAt: worker.updatedAt || fallbackTimestamp,
  };
}

export function updateWorker(worker, changes, now = new Date()) {
  const updated = createWorker({ ...worker, ...changes }, now, worker.id);
  return { ...updated, createdAt: worker.createdAt };
}
