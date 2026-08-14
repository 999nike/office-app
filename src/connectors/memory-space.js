import { createJob } from "../domain/jobs.js";

export const MEMORY_JOB_SOURCE = "memory-space";
export const COLLECTION_INTERVAL_MS = 12 * 60 * 60 * 1000;

const PRIORITY_MAP = Object.freeze({
  low: "Low",
  normal: "Medium",
  high: "High",
  urgent: "Urgent",
});

function responseError(data, response) {
  return data?.error || `Memory Space job feed returned HTTP ${response?.status || "unknown"}.`;
}

export function toOfficeJobInput(memoryJob) {
  if (memoryJob?.type !== "job" || memoryJob?.status !== "ready" || memoryJob?.officeCollectedAt || memoryJob?.officeJobId) {
    throw new Error("Memory Space returned a job that is not eligible for collection.");
  }
  const sourceJobId = String(memoryJob.id || "").trim();
  const title = String(memoryJob.title || "").trim();
  const description = String(memoryJob.details || "").trim();
  const project = String(memoryJob.project || "").trim();
  if (!sourceJobId || !title || !description || !project) throw new Error("Memory Space returned an incomplete ready job.");
  return {
    title,
    description,
    project,
    priority: PRIORITY_MAP[String(memoryJob.priority || "normal").toLowerCase()] || "Medium",
    source: MEMORY_JOB_SOURCE,
    sourceJobId,
    sourceSpaceId: String(memoryJob.spaceId || "") || undefined,
  };
}

export function createMemoryJobCollector({
  request = globalThis.fetch,
  store,
  projects,
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
  endpoint = "/api/memory-jobs",
} = {}) {
  if (!store?.list || !store?.add) throw new Error("The existing Office job store is required.");

  async function acknowledge(memoryJobId, officeJobId) {
    const response = await request(`${endpoint}/${encodeURIComponent(memoryJobId)}/collected`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officeJobId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(responseError(data, response));
    return data;
  }

  async function collect() {
    const response = await request(endpoint, { method: "GET", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(responseError(data, response));
    const availableProjects = typeof projects === "function" ? projects() : projects;
    const result = { discovered: 0, imported: [], acknowledged: [], failed: [] };

    for (const memoryJob of Array.isArray(data?.jobs) ? data.jobs : []) {
      result.discovered += 1;
      const sourceJobId = String(memoryJob?.id || "");
      try {
        const existing = store.findBySource?.(MEMORY_JOB_SOURCE, sourceJobId)
          || store.list().find((job) => job.source === MEMORY_JOB_SOURCE && job.sourceJobId === sourceJobId);
        if (existing) {
          try {
            await acknowledge(sourceJobId, existing.id);
            result.acknowledged.push({ memoryJobId: sourceJobId, officeJobId: existing.id, recovered: true });
          } catch (error) {
            result.failed.push({ memoryJobId: sourceJobId, officeJobId: existing.id, stage: "acknowledge", error: error.message });
          }
          continue;
        }

        const input = toOfficeJobInput(memoryJob);
        const officeJob = createJob(input, now(), createId(), availableProjects || []);
        store.add(officeJob);
        result.imported.push(officeJob);

        try {
          await acknowledge(sourceJobId, officeJob.id);
          result.acknowledged.push({ memoryJobId: sourceJobId, officeJobId: officeJob.id, recovered: false });
        } catch (error) {
          result.failed.push({ memoryJobId: sourceJobId, officeJobId: officeJob.id, stage: "acknowledge", error: error.message });
        }
      } catch (error) {
        result.failed.push({ memoryJobId: sourceJobId, stage: "import", error: error.message });
      }
    }
    return result;
  }

  return Object.freeze({ collect });
}
