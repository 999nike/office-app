import { CAPABILITIES, normalizePermissions } from "./jobs.js";

export const PACKAGE_STATUSES = ["Draft", "Ready", "Cancelled"];
export const DISPATCH_EXPORT_FORMAT = "office-dispatch-package";
export const DISPATCH_EXPORT_VERSION = 1;

function permissionSnapshot(source = {}) {
  const normalized = normalizePermissions({
    permissions: source.effectivePermissions ?? source.permissions,
    deniedPermissions: source.explicitDenials ?? source.deniedPermissions,
  });
  return {
    effectivePermissions: { ...normalized.permissions },
    explicitDenials: { ...normalized.deniedPermissions },
  };
}

function capabilityState(snapshot, key) {
  if (snapshot.explicitDenials[key]) return "Explicitly denied";
  if (snapshot.effectivePermissions[key]) return "Allowed";
  return "Not granted";
}

export function createDispatchPackage(job, worker = null, now = new Date(), id = crypto.randomUUID()) {
  if (!job?.id) throw new Error("A valid job is required to create a dispatch package.");
  const snapshot = permissionSnapshot(job);
  const timestamp = now.toISOString();
  return {
    id,
    jobId: job.id,
    workerId: worker?.id === job.workerId ? worker.id : null,
    workerName: worker?.id === job.workerId ? worker.name : job.worker || "Unassigned",
    workerRole: worker?.id === job.workerId ? worker.role : "",
    jobTitle: job.title,
    instructions: job.description,
    priority: job.priority,
    jobStatus: job.status,
    sandboxTarget: job.project,
    ...snapshot,
    hasPermissionSnapshot: true,
    resultHandoffCapabilityState: capabilityState(snapshot, "proposeResult"),
    packageStatus: "Draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeDispatchPackage(value = {}) {
  const snapshot = permissionSnapshot(value);
  const fallbackTimestamp = value.updatedAt || value.createdAt || new Date(0).toISOString();
  return {
    ...value,
    workerId: value.workerId || null,
    workerName: value.workerName || "Unassigned",
    workerRole: value.workerRole || "",
    instructions: value.instructions || "",
    ...snapshot,
    hasPermissionSnapshot: Object.hasOwn(value, "hasPermissionSnapshot")
      ? value.hasPermissionSnapshot === true
      : Boolean(value.effectivePermissions && value.explicitDenials),
    resultHandoffCapabilityState: capabilityState(snapshot, "proposeResult"),
    packageStatus: PACKAGE_STATUSES.includes(value.packageStatus) ? value.packageStatus : "Draft",
    createdAt: value.createdAt || fallbackTimestamp,
    updatedAt: value.updatedAt || fallbackTimestamp,
  };
}

export function validateReady(packageSnapshot, job, worker) {
  const snapshot = normalizeDispatchPackage(packageSnapshot);
  if (!job?.id || job.id !== snapshot.jobId) throw new Error("The source job is missing.");
  if (!snapshot.workerId || !worker || worker.id !== snapshot.workerId) throw new Error("An assigned worker is required.");
  if (job.workerId !== snapshot.workerId) throw new Error("The package worker is no longer assigned to the source job.");
  if (worker.status === "Disabled") throw new Error("A disabled worker cannot receive a Ready package.");
  if (!snapshot.hasPermissionSnapshot) throw new Error("A permission snapshot is required.");
  for (const { key } of CAPABILITIES) {
    if (snapshot.explicitDenials[key] && snapshot.effectivePermissions[key]) throw new Error("Explicit denials must override allowed permissions.");
  }
  return snapshot;
}

export function markPackageReady(packageSnapshot, job, worker, now = new Date()) {
  if (packageSnapshot.packageStatus !== "Draft") throw new Error("Only a Draft package can become Ready.");
  const snapshot = validateReady(packageSnapshot, job, worker);
  return { ...snapshot, packageStatus: "Ready", updatedAt: now.toISOString() };
}

export function cancelPackage(packageSnapshot, now = new Date()) {
  if (packageSnapshot.packageStatus === "Cancelled") return normalizeDispatchPackage(packageSnapshot);
  return { ...normalizeDispatchPackage(packageSnapshot), packageStatus: "Cancelled", updatedAt: now.toISOString() };
}

export function createDispatchExport(packageSnapshot) {
  const snapshot = normalizeDispatchPackage(packageSnapshot);
  if (snapshot.packageStatus !== "Ready") throw new Error("Only a Ready dispatch package can be exported.");
  if (!snapshot.hasPermissionSnapshot) throw new Error("A permission snapshot is required for export.");

  const allowedCapabilities = [];
  const explicitlyDeniedCapabilities = [];
  const notGrantedCapabilities = [];
  for (const { key, label } of CAPABILITIES) {
    if (snapshot.explicitDenials[key]) explicitlyDeniedCapabilities.push({ key, label });
    else if (snapshot.effectivePermissions[key]) allowedCapabilities.push({ key, label });
    else notGrantedCapabilities.push({ key, label });
  }

  return {
    format: DISPATCH_EXPORT_FORMAT,
    version: DISPATCH_EXPORT_VERSION,
    packageId: snapshot.id,
    createdAt: snapshot.createdAt,
    sourceJobId: snapshot.jobId,
    jobTitle: snapshot.jobTitle,
    instructions: snapshot.instructions,
    priority: snapshot.priority,
    jobStatusAtSnapshot: snapshot.jobStatus,
    sandboxTarget: snapshot.sandboxTarget,
    worker: { id: snapshot.workerId, name: snapshot.workerName, role: snapshot.workerRole },
    capabilities: {
      allowed: allowedCapabilities,
      explicitlyDenied: explicitlyDeniedCapabilities,
      notGranted: notGrantedCapabilities,
    },
    resultHandoffPermissionState: snapshot.resultHandoffCapabilityState,
    packageStatus: snapshot.packageStatus,
  };
}

export function dispatchExportFilename(packageSnapshot) {
  const safeId = String(packageSnapshot.id || "package").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `office-dispatch-${safeId}.json`;
}
