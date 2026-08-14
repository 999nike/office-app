import { createDispatchExport, createDispatchPackage, markPackageReady } from "./domain/dispatch.js";
import { createDispatchStore } from "./data/dispatch-store.js";
import { createJobStore } from "./data/job-store.js";
import { createWorkerStore } from "./data/worker-store.js";
import { codeSpaceConnector } from "./connectors/code-space.js";
import { getExecutionWorker } from "./domain/execution-models.js";

const jobs = createJobStore();
const workers = createWorkerStore();
const dispatches = createDispatchStore();
const processedJobs = new Set(dispatches.list().filter((item) => item.sentAt).map((item) => item.jobId));

function titleFromDescription(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "New Office job";
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] || text;
  return firstSentence.slice(0, 100);
}

function tuneJobForm() {
  const form = document.querySelector("#create-job-form");
  if (!form || form.dataset.quickFlow === "1") return;
  form.dataset.quickFlow = "1";

  const title = form.elements.namedItem("title");
  if (title) {
    title.required = false;
    title.closest("label")?.setAttribute("hidden", "");
  }

  const priority = form.elements.namedItem("priority");
  if (priority) {
    priority.value = "Medium";
    priority.closest("label")?.setAttribute("hidden", "");
  }

  const description = form.elements.namedItem("description");
  if (description) {
    description.rows = 6;
    description.placeholder = "Describe the job and the result you want.";
    const label = description.closest("label");
    if (label?.firstChild) label.firstChild.textContent = "Job description";
    requestAnimationFrame(() => description.focus());
  }

  const project = form.elements.namedItem("project");
  if (project) {
    const label = project.closest("label");
    if (label?.firstChild) label.firstChild.textContent = "Project";
  }

  const worker = form.elements.namedItem("workerId");
  if (worker) {
    worker.required = true;
    if (worker.options[0]) worker.options[0].textContent = "Choose agent / model";
    const label = worker.closest("label");
    if (label?.firstChild) label.firstChild.textContent = "Agent / model";
  }

  const submit = form.querySelector("#create-job-button");
  if (submit) submit.textContent = "Create & send";
}

async function sendJobToCodeSpace(jobId) {
  const job = jobs.get(jobId);
  if (!job || processedJobs.has(job.id)) return;

  const worker = getExecutionWorker(job.workerId, workers.list());
  if (!worker) throw new Error("Choose an agent / model before creating the job.");

  const draft = createDispatchPackage(job, worker);
  const ready = markPackageReady(draft, job, worker);
  dispatches.add(ready);

  const exported = createDispatchExport(ready);
  await codeSpaceConnector.dispatch(exported);
  dispatches.replace({ ...ready, sentAt: new Date().toISOString() });
  processedJobs.add(job.id);
}

async function createAndSendDispatchBatch(jobIds) {
  const exports = [];
  const readyPackages = [];
  for (const jobId of jobIds) {
    const job = jobs.get(jobId);
    if (!job || processedJobs.has(job.id)) throw new Error("One of the new Office jobs could not be prepared for dispatch.");
    const worker = getExecutionWorker(job.workerId, workers.list());
    if (!worker) throw new Error("Choose an agent / model before creating the jobs.");
    const ready = markPackageReady(createDispatchPackage(job, worker), job, worker);
    dispatches.add(ready);
    readyPackages.push(ready);
    exports.push(createDispatchExport(ready));
  }
  await codeSpaceConnector.dispatchMany(exports);
  readyPackages.forEach((ready) => {
    dispatches.replace({ ...ready, sentAt: new Date().toISOString() });
    processedJobs.add(ready.jobId);
  });
}

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "create-job-form") return;

  const description = form.elements.namedItem("description");
  const title = form.elements.namedItem("title");
  const worker = form.elements.namedItem("workerId");

  if (title) title.value = titleFromDescription(description?.value);
  if (worker && !worker.value) {
    worker.setCustomValidity("Choose an agent / model.");
    worker.reportValidity();
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  worker?.setCustomValidity("");

  // The core Office submit handler emits these only after persisting the job.
  // Dispatch now goes through a hidden Code Space bridge and never opens or
  // navigates a Code Space browser tab from Create & send.
  const sendCreatedJob = (createdEvent) => {
    document.removeEventListener("office:job-created", sendCreatedJob);
    document.removeEventListener("office:jobs-created", sendCreatedJobs);
    sendJobToCodeSpace(createdEvent.detail?.jobId).catch((error) => {
      console.error("Could not send Office job to Code Space:", error);
    });
  };
  const sendCreatedJobs = (createdEvent) => {
    document.removeEventListener("office:job-created", sendCreatedJob);
    document.removeEventListener("office:jobs-created", sendCreatedJobs);
    createAndSendDispatchBatch(createdEvent.detail?.jobIds || []).catch((error) => {
      console.error("Could not send Office jobs to Code Space:", error);
    });
  };
  document.addEventListener("office:job-created", sendCreatedJob);
  document.addEventListener("office:jobs-created", sendCreatedJobs);
}, true);

const observer = new MutationObserver(tuneJobForm);
observer.observe(document.documentElement, { childList: true, subtree: true });
tuneJobForm();

globalThis.OfficeDispatch = Object.freeze({
  sendJob: sendJobToCodeSpace,
});
