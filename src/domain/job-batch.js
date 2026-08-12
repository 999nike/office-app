import { createJob } from "./jobs.js";

export function createJobBatch(inputs, options = {}) {
  if (!Array.isArray(inputs) || inputs.length < 2 || inputs.length > 10) {
    throw new Error("Choose between 2 and 10 jobs for a multi-job batch.");
  }
  const now = options.now || new Date();
  const createId = options.createId || (() => crypto.randomUUID());
  const projects = options.projects || [];
  return inputs.map((input) => createJob(input, now, createId(), projects));
}
