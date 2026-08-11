import { normalizePermissions } from "../domain/jobs.js";

const STORAGE_KEY = "office-v0.jobs";

function normalizeStoredJob(job) {
  return {
    ...job,
    id: job?.id == null ? "" : String(job.id),
    worker: job.worker || "Unassigned",
    workerId: job.workerId || null,
    ...normalizePermissions(job),
  };
}

export function createJobStore(storage = window.localStorage) {
  function read() {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeStoredJob) : [];
    } catch {
      return [];
    }
  }

  function write(jobs) {
    storage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    return jobs;
  }

  return {
    list: read,
    get(id) {
      return read().find((job) => job.id === id) || null;
    },
    add(job) {
      return write([job, ...read()]);
    },
    replace(job) {
      const jobs = read();
      const index = jobs.findIndex((item) => item.id === job.id);
      if (index === -1) throw new Error("Job not found.");
      jobs[index] = job;
      return write(jobs);
    },
  };
}

export { STORAGE_KEY };
