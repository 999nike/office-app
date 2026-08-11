import { createDispatchExport, createDispatchPackage, markPackageReady } from "./domain/dispatch.js";
import { createDispatchStore } from "./data/dispatch-store.js";
import { createJobStore } from "./data/job-store.js";
import { createWorkerStore } from "./data/worker-store.js";
import { codeSpaceConnector } from "./connectors/code-space.js";

const jobs = createJobStore();
const workers = createWorkerStore();
const dispatches = createDispatchStore();
const processedJobs = new Set(dispatches.list().map((item) => item.jobId));

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

async function createAndSendDispatch(captured) {
  await Promise.resolve();

  const job = jobs.list().find((item) =>
    !processedJobs.has(item.id) &&
    item.description === captured.description &&
    item.project === captured.project &&
    item.workerId === captured.workerId
  );

  if (!job) {
    throw new Error("Office created the job but the quick-flow handoff could not resolve its saved record.");
  }

  const worker = workers.get(job.workerId);
  if (!worker) throw new Error("Choose an agent / model before creating the job.");

  const draft = createDispatchPackage(job, worker);
  const ready = markPackageReady(draft, job, worker);
  dispatches.add(ready);
  processedJobs.add(job.id);

  const exported = createDispatchExport(ready);
  await codeSpaceConnector.dispatch(exported);
}

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "create-job-form") return;

  const description = form.elements.namedItem("description");
  const title = form.elements.namedItem("title");
  const project = form.elements.namedItem("project");
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

  // Capture the exact values before the core Office submit handler can rerender/reset the form.
  const captured = {
    description: String(description?.value || "").trim(),
    project: String(project?.value || ""),
    workerId: String(worker?.value || "")
  };

  queueMicrotask(() => createAndSendDispatch(captured).catch((error) => {
    console.error("Could not send Office job to Code Space:", error);
  }));
}, true);

const observer = new MutationObserver(tuneJobForm);
observer.observe(document.documentElement, { childList: true, subtree: true });
tuneJobForm();
