import { normalizeDispatchPackage } from "../domain/dispatch.js";

export const DISPATCH_STORAGE_KEY = "office-v0.dispatch-packages";

export function createDispatchStore(storage = window.localStorage) {
  function read() {
    try {
      const value = JSON.parse(storage.getItem(DISPATCH_STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeDispatchPackage) : [];
    } catch {
      return [];
    }
  }

  function write(packages) {
    storage.setItem(DISPATCH_STORAGE_KEY, JSON.stringify(packages));
    return packages;
  }

  return {
    list: read,
    get(id) {
      return read().find((item) => item.id === id) || null;
    },
    add(packageSnapshot) {
      return write([packageSnapshot, ...read()]);
    },
    replace(packageSnapshot) {
      const packages = read();
      const index = packages.findIndex((item) => item.id === packageSnapshot.id);
      if (index === -1) throw new Error("Dispatch package not found.");
      packages[index] = packageSnapshot;
      return write(packages);
    },
  };
}
