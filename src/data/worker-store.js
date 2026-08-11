import { normalizeWorker } from "../domain/workers.js";

export const WORKER_STORAGE_KEY = "office-v0.workers";

export function createWorkerStore(storage = window.localStorage) {
  function read() {
    try {
      const value = JSON.parse(storage.getItem(WORKER_STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeWorker) : [];
    } catch {
      return [];
    }
  }

  function write(workers) {
    storage.setItem(WORKER_STORAGE_KEY, JSON.stringify(workers));
    return workers;
  }

  return {
    list: read,
    get(id) {
      return read().find((worker) => worker.id === id) || null;
    },
    add(worker) {
      return write([worker, ...read()]);
    },
    replace(worker) {
      const workers = read();
      const index = workers.findIndex((item) => item.id === worker.id);
      if (index === -1) throw new Error("Worker not found.");
      workers[index] = worker;
      return write(workers);
    },
    remove(id) {
      return write(read().filter((worker) => worker.id !== id));
    },
  };
}
