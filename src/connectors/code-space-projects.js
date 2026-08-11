const PROJECT_CATALOG_URL = "http://127.0.0.1:8090/api/office/projects";

function normalizeProjects(payload) {
  if (!Array.isArray(payload?.projects)) throw new Error("Code Space returned an invalid project catalog.");
  const names = payload.projects.map((project) => project?.name);
  if (names.some((name) => typeof name !== "string" || !name.trim() || /[\\/\0]/.test(name))) {
    throw new Error("Code Space returned an unsafe project catalog.");
  }
  return [...new Set(names.map((name) => name.trim()))].sort((left, right) => left.localeCompare(right));
}

export function createCodeSpaceProjectCatalog(request = globalThis.fetch) {
  let projects = [];
  let available = false;
  let message = "Code Space projects unavailable";

  return {
    get projects() { return [...projects]; },
    get available() { return available; },
    get message() { return message; },
    has(name) { return available && projects.includes(name); },
    async refresh() {
      try {
        const response = await request(PROJECT_CATALOG_URL, { method: "GET", cache: "no-store" });
        if (!response?.ok) throw new Error("Code Space projects unavailable");
        projects = normalizeProjects(await response.json());
        available = true;
        message = projects.length ? "" : "No Code Space projects available";
      } catch {
        projects = [];
        available = false;
        message = "Code Space projects unavailable";
      }
      return [...projects];
    },
  };
}

export { PROJECT_CATALOG_URL, normalizeProjects };
