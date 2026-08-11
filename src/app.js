import { assignWorker, CAPABILITIES, createJob, defaultPermissionSet, PRIORITIES, STATUSES, updateJob } from "./domain/jobs.js";
import { createWorker, updateWorker, WORKER_STATUSES } from "./domain/workers.js";
import { cancelPackage, createDispatchExport, createDispatchPackage, dispatchExportFilename, markPackageReady } from "./domain/dispatch.js";
import { createJobStore } from "./data/job-store.js";
import { createWorkerStore } from "./data/worker-store.js";
import { createDispatchStore } from "./data/dispatch-store.js";
import { createCodeSpaceProjectCatalog } from "./connectors/code-space-projects.js";

const root = document.querySelector("#app");
const store = createJobStore();
const workerStore = createWorkerStore();
const dispatchStore = createDispatchStore();
const projectCatalog = createCodeSpaceProjectCatalog();
let selectedStatus = "All";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (value) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const slug = (value = "") => String(value).toLowerCase().replaceAll(" ", "-");

const jobDetailHref = (id) => `#/jobs/${encodeURIComponent(String(id))}`;

function shell(content, active = "dashboard") {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#/" aria-label="Office home">
          <span class="brand-mark">O</span><span><strong>OFFICE</strong><small>Local Control Center</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a class="nav-item ${active === "dashboard" ? "active" : ""}" href="#/">
            <span class="nav-icon">⌂</span><span>Dashboard<small>Overview & system health</small></span>
          </a>
          <a class="nav-item ${active === "jobs" ? "active" : ""}" href="#/jobs">
            <span class="nav-icon">▦</span><span>Jobs<small>Browse & manage work</small></span>
          </a>
          <a class="nav-item ${active === "workers" ? "active" : ""}" href="#/workers">
            <span class="nav-icon">◇</span><span>Workers<small>Declarative identities</small></span>
          </a>
          <a class="nav-item ${active === "dispatch" ? "active" : ""}" href="#/dispatch">
            <span class="nav-icon">△</span><span>Dispatch<small>Preview local handoffs</small></span>
          </a>
          <a class="nav-item ${active === "ledger" ? "active" : ""}" href="#/ledger">
            <span class="nav-icon">▤</span><span>Ledger<small>Local record overview</small></span>
          </a>
        </nav>
        <div class="sidebar-foot">
          <span class="local-shield">⌾</span>
          <div><strong><i class="connection-dot"></i> Local mode</strong><small>Browser storage · offline</small></div>
        </div>
      </aside>
      <main>${content}</main>
    </div>`;
}

function renderDashboard() {
  const jobs = store.list();
  const workers = workerStore.list();
  const packages = dispatchStore.list();
  const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, jobs.filter((job) => job.status === status).length]));
  const availableWorkers = workers.filter((worker) => worker.status === "Available").length;
  root.innerHTML = shell(`
    <header class="topbar control-topbar">
      <div><p class="eyebrow">LOCAL CONTROL CENTER</p><h1>Dashboard</h1><p class="topbar-context">Your current Office state, stored only in this browser.</p></div>
      <div class="topbar-actions"><button class="button secondary" id="new-worker">＋ New worker</button><button class="button primary" id="new-job">＋ New job</button></div>
    </header>
    <section class="dashboard overview-page">
      <div class="metric-row control-metrics">
        ${metricCard("▦", "Total jobs", jobs.length, "All local work", "cyan")}
        ${metricCard("◈", "In progress", statusCounts["In Progress"], "Being worked", "amber")}
        ${metricCard("✓", "Complete", statusCounts.Complete, "Finished locally", "green")}
        ${metricCard("!", "Blocked", statusCounts.Blocked, "Needs attention", "red")}
        ${metricCard("◇", "Available workers", `${availableWorkers}/${workers.length}`, "Declarative profiles", "teal")}
        ${metricCard("△", "Dispatch ready", packages.filter((item) => item.packageStatus === "Ready").length, "Preview packages", "blue")}
      </div>
      <div class="overview-grid">
        <section class="panel workflow-panel">
          <div class="panel-head"><div><p class="eyebrow">WORKFLOW</p><h2>Jobs board</h2></div><a class="panel-link" href="#/jobs">View all jobs →</a></div>
          <div class="workflow-board">${STATUSES.map((status) => workflowColumn(status, jobs.filter((job) => job.status === status))).join("")}</div>
        </section>
        <aside class="panel availability-panel">
          <div class="panel-head"><div><p class="eyebrow">WORKFORCE</p><h2>Workers</h2></div><a class="panel-link" href="#/workers">View all</a></div>
          <div class="dashboard-worker-list">${workers.length ? workers.slice(0, 7).map(dashboardWorkerRow).join("") : '<div class="mini-empty"><span>◇</span><strong>No workers</strong><p>Create a local profile when needed.</p></div>'}</div>
        </aside>
        <section class="panel attention-panel">
          <div class="panel-head"><div><p class="eyebrow">ATTENTION</p><h2>Review & blocked</h2></div><span class="count">${statusCounts.Review + statusCounts.Blocked} jobs</span></div>
          <div class="attention-list">${[...jobs.filter((job) => job.status === "Blocked"), ...jobs.filter((job) => job.status === "Review")].slice(0, 6).map(attentionJob).join("") || '<div class="compact-empty">No jobs currently need review or unblock action.</div>'}</div>
        </section>
        <aside class="panel local-panel">
          <div class="local-panel-icon">⌾</div><div><p class="eyebrow">LOCAL FIRST</p><h2>Office stays on this machine</h2><p>Jobs, workers, permissions, and dispatch previews remain in browser storage. Nothing is executed.</p></div>
        </aside>
      </div>
    </section>
    <dialog id="job-dialog">${jobForm(workers)}</dialog>
    <dialog id="worker-dialog"></dialog>
  `);

  bindJobDialog(workers);
  document.querySelector("#new-worker").addEventListener("click", () => openWorkerDialog(null, renderDashboard));
}

function metricCard(icon, label, value, note, tone) {
  return `<article class="metric"><span class="metric-icon ${tone}">${icon}</span><div><span>${label}</span><strong>${value}</strong><small>${note}</small></div></article>`;
}

function workflowColumn(status, jobs) {
  return `<div class="workflow-column ${slug(status)}"><div class="workflow-column-head"><strong>${status}</strong><span>${jobs.length}</span></div><div class="workflow-stack">${jobs.slice(0, 3).map((job) => `<a href="${jobDetailHref(job.id)}"><small>${escapeHtml(job.id.slice(0, 8).toUpperCase())}</small><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(job.project)}</span></a>`).join("") || '<p>Empty</p>'}</div></div>`;
}

function dashboardWorkerRow(worker) {
  return `<a class="dashboard-worker-row" href="#/workers"><span class="worker-avatar">${escapeHtml(worker.name.slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(worker.name)}</strong><small>${escapeHtml(worker.role)}</small></div><span class="worker-status ${slug(worker.status)}">${worker.status}</span></a>`;
}

function attentionJob(job) {
  return `<a class="attention-job" href="${jobDetailHref(job.id)}"><span class="status ${slug(job.status)}">${job.status}</span><div><strong>${escapeHtml(job.title)}</strong><small>${escapeHtml(job.project)} · ${escapeHtml(job.worker)}</small></div><span>→</span></a>`;
}

function renderJobs() {
  const jobs = store.list();
  const workers = workerStore.list();
  const visibleJobs = selectedStatus === "All" ? jobs : jobs.filter((job) => job.status === selectedStatus);
  const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, jobs.filter((job) => job.status === status).length]));

  root.innerHTML = shell(`
    <header class="topbar control-topbar">
      <div><p class="eyebrow">WORK MANAGEMENT</p><h1>Jobs</h1><p class="topbar-context">Plan, assign, and review local work.</p></div>
      <button class="button primary" id="new-job">＋ New job</button>
    </header>
    <section class="dashboard">
      <div class="metric-row">
        ${metricCard("▦", "Open jobs", jobs.filter((job) => !["Complete", "Blocked"].includes(job.status)).length, "Ready for action", "cyan")}
        ${metricCard("◈", "In progress", statusCounts["In Progress"], "Being worked", "amber")}
        ${metricCard("◎", "Needs review", statusCounts.Review, "Awaiting decision", "blue")}
        ${metricCard("✓", "Completed", statusCounts.Complete, "All time", "green")}
      </div>
      <div class="workspace-grid">
        <section class="panel job-panel">
          <div class="panel-head"><div><p class="eyebrow">WORK QUEUE</p><h2>All jobs</h2></div><span class="count">${jobs.length} total</span></div>
          <div class="filters" aria-label="Filter jobs by status">
            ${["All", ...STATUSES].map((status) => `<button class="filter ${selectedStatus === status ? "active" : ""}" data-filter="${status}">${status}<span>${status === "All" ? jobs.length : statusCounts[status]}</span></button>`).join("")}
          </div>
          <div class="job-list">
            ${visibleJobs.length ? visibleJobs.map(jobCard).join("") : emptyState(jobs.length > 0)}
          </div>
        </section>
        <aside class="panel activity-panel">
          <div class="panel-head"><div><p class="eyebrow">WORKSPACE</p><h2>Projects</h2></div></div>
          ${projectCatalog.available ? projectCatalog.projects.map((project) => `<div class="project-row"><span class="project-icon">${project.slice(0, 2).toUpperCase()}</span><div><strong>${escapeHtml(project)}</strong><small>${jobs.filter((job) => job.project === project).length} jobs</small></div></div>`).join("") || '<div class="connector-note"><span>⌁</span><div><strong>No Code Space projects available</strong><p>Create a direct workspace folder, then refresh the project catalog.</p></div></div>' : `<div class="connector-note"><span>⌁</span><div><strong>Code Space projects unavailable</strong><p>Project selection stays disabled until the local catalog is available.</p></div></div>`}
          <div class="connector-note"><span>⌁</span><div><strong>Execution disconnected</strong><p>Office receives project names only. Jobs stay local and nothing is executed.</p></div></div>
        </aside>
      </div>
    </section>
    <dialog id="job-dialog">${jobForm(workers)}</dialog>
  `, "jobs");

  bindJobDialog(workers);
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    selectedStatus = button.dataset.filter;
    renderJobs();
  }));
  document.querySelectorAll("[data-delete-job]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const job = store.get(button.dataset.deleteJob);
    if (job && window.confirm(`Delete the local Office job “${job.title}”? This does not affect any Code Space package or result.`)) {
      store.remove(job.id);
      renderJobs();
    }
  }));
}

function bindJobDialog(workers) {
  const dialog = document.querySelector("#job-dialog");
  document.querySelector("#new-job").addEventListener("click", () => dialog.showModal());
  dialog.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.querySelector("#cancel-dialog").addEventListener("click", () => dialog.close());
  dialog.querySelector("#create-job-form").addEventListener("submit", handleCreate);
  dialog.querySelector("#job-worker").addEventListener("change", (event) => copySelectedWorkerDefaults(event.currentTarget, workers));
  dialog.querySelector("#refresh-projects").addEventListener("click", () => refreshProjectSelector(dialog));
}

function jobCard(job) {
  return `<a class="job-card" href="${jobDetailHref(job.id)}">
    <span class="priority-bar ${slug(job.priority)}"></span>
    <div class="job-main"><div class="job-title-row"><h3>${escapeHtml(job.title)}</h3><span class="status ${slug(job.status)}">${job.status}</span></div>
      <p>${escapeHtml(job.description)}</p>
      <div class="job-meta"><span>◫ ${escapeHtml(job.project)}</span><span>◇ ${escapeHtml(job.worker)}</span><span>Updated ${formatDate(job.updatedAt)}</span></div>
    </div>
    <span class="priority ${slug(job.priority)}">${job.priority}</span><span class="arrow">→</span>
    <button class="job-delete" type="button" data-delete-job="${escapeHtml(job.id)}" aria-label="Delete job ${escapeHtml(job.title)}" title="Delete job">×</button>
  </a>`;
}

function emptyState(filtered) {
  return `<div class="empty-state"><span class="empty-icon">${filtered ? "⌕" : "＋"}</span><h3>${filtered ? "No jobs in this stage" : "Your queue is clear"}</h3><p>${filtered ? "Choose another status or move a job here." : "Create your first job to start planning work across your projects."}</p>${filtered ? "" : '<button class="button secondary" onclick="document.querySelector(\'#job-dialog\').showModal()">Create first job</button>'}</div>`;
}

function jobForm(workers) {
  return `<form id="create-job-form">
    <div class="dialog-head"><div><p class="eyebrow">NEW WORK ITEM</p><h2>Create job</h2></div><button id="close-dialog" type="button" class="icon-button" aria-label="Close">×</button></div>
    <label>Title<input name="title" required maxlength="100" placeholder="What needs to be done?" autofocus></label>
    <label>Description<textarea name="description" required rows="5" placeholder="Add context, requirements, and a clear outcome."></textarea></label>
    <div class="form-grid">
      <label>Priority<select name="priority">${PRIORITIES.map((value) => `<option ${value === "Medium" ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label>Target project<select id="job-project" name="project" ${projectCatalog.available && projectCatalog.projects.length ? "" : "disabled"}>${projectCatalog.available && projectCatalog.projects.length ? projectCatalog.projects.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("") : '<option>Code Space projects unavailable</option>'}</select><span class="project-catalog-state" id="project-catalog-state">${escapeHtml(projectCatalog.message)}</span><button class="button secondary project-refresh" id="refresh-projects" type="button">Refresh projects</button></label>
    </div>
    <label>Assigned worker / agent<select id="job-worker" name="workerId"><option value="">Unassigned</option>${workers.map((worker) => `<option value="${escapeHtml(worker.id)}">${escapeHtml(worker.name)} · ${escapeHtml(worker.role)}</option>`).join("")}</select></label>
    <fieldset class="permission-editor">
      <legend>Worker permissions</legend>
      <p>All capabilities are off unless explicitly allowed.</p>
      ${permissionFields()}
    </fieldset>
    <p class="form-error" id="form-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="button ghost" id="cancel-dialog">Cancel</button><button class="button primary" id="create-job-button" type="submit" ${projectCatalog.available && projectCatalog.projects.length ? "" : "disabled"}>Create job</button></div>
  </form>`;
}

function handleCreate(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const worker = workerStore.get(form.get("workerId"));
    const input = { ...Object.fromEntries(form), worker: worker?.name || "Unassigned", ...permissionValues(form) };
    const job = createJob(input, new Date(), crypto.randomUUID(), projectCatalog.projects);
    store.add(job);
    document.dispatchEvent(new CustomEvent("office:job-created", { detail: { jobId: job.id } }));
    location.hash = jobDetailHref(job.id);
  } catch (error) {
    document.querySelector("#form-error").textContent = error.message;
  }
}

async function refreshProjectSelector(dialog) {
  const button = dialog.querySelector("#refresh-projects");
  const select = dialog.querySelector("#job-project");
  const state = dialog.querySelector("#project-catalog-state");
  const submit = dialog.querySelector("#create-job-button");
  button.disabled = true;
  button.textContent = "Refreshing…";
  await projectCatalog.refresh();
  const projects = projectCatalog.projects;
  select.disabled = !projectCatalog.available || projects.length === 0;
  submit.disabled = select.disabled;
  select.innerHTML = projects.length
    ? projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`).join("")
    : `<option>${escapeHtml(projectCatalog.message)}</option>`;
  state.textContent = projectCatalog.message;
  button.disabled = false;
  button.textContent = "Refresh projects";
}

function renderDetail(id) {
  const job = store.get(id);
  const workers = workerStore.list();
  if (!job) {
    root.innerHTML = shell(`<section class="not-found"><p class="eyebrow">404</p><h1>Job not found</h1><a class="button secondary" href="#/jobs">Back to jobs</a></section>`, "jobs");
    return;
  }
  root.innerHTML = shell(`
    <header class="topbar detail-topbar"><a class="back-link" href="#/jobs">← Back to jobs</a><div class="detail-top-status"><span class="priority ${slug(job.priority)}">${job.priority}</span><span class="status ${slug(job.status)}">${job.status}</span></div></header>
    <section class="detail-page">
      <div class="detail-heading"><div><p class="eyebrow">${escapeHtml(job.project)} · ${escapeHtml(job.id.slice(0, 8).toUpperCase())}</p><h1>${escapeHtml(job.title)}</h1><p>${escapeHtml(job.description)}</p></div><span class="priority large ${slug(job.priority)}">${job.priority} priority</span></div>
      <div class="detail-grid">
        <section class="panel detail-card">
          <div class="panel-head"><div><p class="eyebrow">WORKFLOW</p><h2>Job status</h2></div></div>
          <div class="status-flow">${STATUSES.map((status) => `<button data-status="${status}" class="status-step ${job.status === status ? "active" : ""}"><span>${STATUSES.indexOf(status) + 1}</span>${status}</button>`).join("")}</div>
          <label>Result / handoff notes<textarea id="result" rows="7" placeholder="Capture the outcome, links, or review notes…">${escapeHtml(job.result)}</textarea></label>
          <div class="save-row"><span id="save-message" role="status"></span><button id="save-result" class="button primary">Save notes</button></div>
        </section>
        <section class="panel permission-card">
          <div class="panel-head"><div><p class="eyebrow">AUTHORITY</p><h2>Worker permissions</h2></div><span class="count">Declaration only</span></div>
          <form id="permission-form" class="permission-detail-form">
            <p class="permission-help">These settings record the job boundary. Office does not execute them.</p>
            ${permissionFields(job)}
            <div class="save-row"><span id="permission-message" role="status"></span><button class="button primary" type="submit">Save permissions</button></div>
          </form>
        </section>
        <aside class="panel facts-card">
          <div class="panel-head"><div><p class="eyebrow">DETAILS</p><h2>Job information</h2></div></div>
          <form id="assignment-form" class="assignment-form">
            <label>Assigned worker / agent<select id="detail-worker" name="workerId"><option value="">Unassigned</option>${workers.map((worker) => `<option value="${escapeHtml(worker.id)}" ${job.workerId === worker.id ? "selected" : ""}>${escapeHtml(worker.name)} · ${escapeHtml(worker.role)}</option>`).join("")}</select></label>
            ${!workers.some((worker) => worker.id === job.workerId) && job.worker !== "Unassigned" ? `<p class="legacy-worker">Stored assignment: ${escapeHtml(job.worker)}</p>` : ""}
            <button class="button secondary" type="submit">Apply assignment</button>
          </form>
          <dl><div><dt>Project</dt><dd>${escapeHtml(job.project)}</dd></div><div><dt>Current worker</dt><dd>${escapeHtml(job.worker)}</dd></div><div><dt>Priority</dt><dd>${escapeHtml(job.priority)}</dd></div><div><dt>Created</dt><dd>${formatDate(job.createdAt)}</dd></div><div><dt>Last updated</dt><dd>${formatDate(job.updatedAt)}</dd></div></dl>
          <div class="local-badge"><span class="connection-dot"></span><div><strong>Stored locally</strong><small>This job remains in this browser.</small></div></div>
        </aside>
      </div>
    </section>`, "jobs");

  document.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", () => {
    store.replace(updateJob(job, { status: button.dataset.status }));
    renderDetail(id);
  }));
  document.querySelector("#save-result").addEventListener("click", () => {
    const current = store.get(id);
    store.replace(updateJob(current, { result: document.querySelector("#result").value.trim() }));
    document.querySelector("#save-message").textContent = "Notes saved locally";
  });
  document.querySelector("#permission-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const current = store.get(id);
    store.replace(updateJob(current, permissionValues(new FormData(event.currentTarget))));
    document.querySelector("#permission-message").textContent = "Permissions saved locally";
  });
  document.querySelector("#assignment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const worker = workerStore.get(new FormData(event.currentTarget).get("workerId"));
    store.replace(assignWorker(store.get(id), worker));
    renderDetail(id);
  });
}

function copySelectedWorkerDefaults(select, workers) {
  const worker = workers.find((item) => item.id === select.value);
  if (!worker) return;
  for (const { key } of CAPABILITIES) {
    const field = select.form.elements.namedItem(`capability.${key}`);
    if (field.value === "deny") continue;
    field.value = worker.deniedPermissions[key] ? "deny" : worker.permissions[key] ? "allow" : "off";
  }
}

function renderWorkers() {
  const workers = workerStore.list();
  const available = workers.filter((worker) => worker.status === "Available").length;
  root.innerHTML = shell(`
    <header class="topbar control-topbar">
      <div><p class="eyebrow">DECLARATIVE IDENTITIES</p><h1>Workers</h1><p class="topbar-context">Local profiles and permission suggestions. No processes are launched.</p></div>
      <button class="button primary" id="new-worker">＋ New worker</button>
    </header>
    <section class="dashboard workers-page">
      <div class="worker-summary-strip"><span><strong>${workers.length}</strong>Total profiles</span><span><strong>${available}</strong>Available</span><span><strong>${workers.filter((worker) => worker.status === "Busy").length}</strong>Busy</span><span><strong>${workers.filter((worker) => worker.status === "Disabled").length}</strong>Disabled</span></div>
      <section class="panel">
        <div class="panel-head"><div><p class="eyebrow">LOCAL PROFILES</p><h2>Worker profiles</h2></div><span class="count">${workers.length} total</span></div>
        <div class="worker-grid">
          ${workers.length ? workers.map(workerCard).join("") : `<div class="empty-state worker-empty"><span class="empty-icon">◇</span><h3>No worker profiles</h3><p>Create a declarative worker identity with safe, off-by-default permission suggestions.</p><button class="button secondary" id="first-worker">Create first worker</button></div>`}
        </div>
      </section>
      <div class="connector-note worker-safety"><span>◇</span><div><strong>Definitions only</strong><p>Worker profiles cannot start processes, access files, use tools, or connect externally.</p></div></div>
    </section>
    <dialog id="worker-dialog"></dialog>
  `, "workers");

  document.querySelector("#new-worker").addEventListener("click", () => openWorkerDialog());
  document.querySelector("#first-worker")?.addEventListener("click", () => openWorkerDialog());
  document.querySelectorAll("[data-edit-worker]").forEach((button) => button.addEventListener("click", () => openWorkerDialog(workerStore.get(button.dataset.editWorker))));
  document.querySelectorAll("[data-delete-worker]").forEach((button) => button.addEventListener("click", () => {
    const worker = workerStore.get(button.dataset.deleteWorker);
    if (worker && window.confirm(`Delete the local profile “${worker.name}”? Existing jobs will keep their copied assignment and permissions.`)) {
      workerStore.remove(worker.id);
      renderWorkers();
    }
  }));
}

function workerCard(worker) {
  const allowed = CAPABILITIES.filter(({ key }) => worker.permissions[key]).map(({ label }) => label);
  const denied = CAPABILITIES.filter(({ key }) => worker.deniedPermissions[key]).map(({ label }) => label);
  return `<article class="worker-card">
    <div class="worker-card-head"><span class="worker-avatar">${escapeHtml(worker.name.slice(0, 2).toUpperCase())}</span><div><h3>${escapeHtml(worker.name)}</h3><p>${escapeHtml(worker.role)}</p></div><span class="worker-status ${slug(worker.status)}">${worker.status}</span></div>
    ${worker.description ? `<p class="worker-description">${escapeHtml(worker.description)}</p>` : ""}
    <div class="permission-summary"><span><strong>${allowed.length}</strong> allowed</span><span><strong>${denied.length}</strong> denied</span><span><strong>${CAPABILITIES.length - allowed.length - denied.length}</strong> not granted</span></div>
    <div class="worker-defaults" aria-label="Default permissions">${CAPABILITIES.map(({ key, label }) => {
      const state = worker.deniedPermissions[key] ? "Denied" : worker.permissions[key] ? "Allowed" : "Not granted";
      return `<span><i class="permission-dot ${slug(state)}"></i>${label}<small>${state}</small></span>`;
    }).join("")}</div>
    <div class="worker-actions"><button class="button ghost" data-delete-worker="${escapeHtml(worker.id)}">Delete</button><button class="button secondary" data-edit-worker="${escapeHtml(worker.id)}">Edit profile</button></div>
  </article>`;
}

function workerForm(worker = null) {
  return `<form id="worker-form">
    <div class="dialog-head"><div><p class="eyebrow">${worker ? "EDIT IDENTITY" : "NEW IDENTITY"}</p><h2>${worker ? "Edit worker" : "Create worker"}</h2></div><button id="close-worker-dialog" type="button" class="icon-button" aria-label="Close">×</button></div>
    <label>Name<input name="name" required maxlength="80" value="${escapeHtml(worker?.name || "")}" placeholder="Sandbox worker"></label>
    <label>Type / role<input name="role" required maxlength="80" value="${escapeHtml(worker?.role || "")}" placeholder="Review assistant"></label>
    <label>Description<textarea name="description" rows="3" placeholder="Optional local profile notes">${escapeHtml(worker?.description || "")}</textarea></label>
    <label>Status<select name="status">${WORKER_STATUSES.map((status) => `<option ${worker?.status === status || (!worker && status === "Available") ? "selected" : ""}>${status}</option>`).join("")}</select></label>
    <fieldset class="permission-editor"><legend>Default permission suggestions</legend><p>Copied only when this worker is explicitly assigned. All defaults start off.</p>${permissionFields(worker || {})}</fieldset>
    <p class="form-error" id="worker-form-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="button ghost" id="cancel-worker-dialog">Cancel</button><button class="button primary" type="submit">${worker ? "Save worker" : "Create worker"}</button></div>
  </form>`;
}

function openWorkerDialog(worker = null, afterSave = renderWorkers) {
  const dialog = document.querySelector("#worker-dialog");
  dialog.innerHTML = workerForm(worker);
  dialog.showModal();
  const close = () => dialog.close();
  dialog.querySelector("#close-worker-dialog").addEventListener("click", close);
  dialog.querySelector("#cancel-worker-dialog").addEventListener("click", close);
  dialog.querySelector("#worker-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const input = { ...Object.fromEntries(form), ...permissionValues(form) };
      worker ? workerStore.replace(updateWorker(worker, input)) : workerStore.add(createWorker(input));
      dialog.close();
      afterSave();
    } catch (error) {
      dialog.querySelector("#worker-form-error").textContent = error.message;
    }
  });
}

function renderDispatch(selectedId = null) {
  const jobs = store.list();
  const packages = dispatchStore.list();
  const selected = selectedId ? dispatchStore.get(selectedId) : packages[0] || null;
  root.innerHTML = shell(`
    <header class="topbar dispatch-topbar control-topbar">
      <div><p class="eyebrow">LOCAL HANDOFF ENVELOPE</p><h1>Dispatch</h1><p class="topbar-context">Create and inspect frozen package previews.</p></div>
      <span class="dispatch-mode"><i></i> Preview only</span>
    </header>
    <section class="dashboard dispatch-page">
      <section class="panel dispatch-builder">
        <div class="panel-head"><div><p class="eyebrow">NEW SNAPSHOT</p><h2>Create dispatch preview</h2></div></div>
        <form id="dispatch-form" class="dispatch-create-form">
          <label>Source job<select name="jobId" required><option value="">Select a job</option>${jobs.map((job) => `<option value="${escapeHtml(job.id)}">${escapeHtml(job.title)} · ${escapeHtml(job.worker)}</option>`).join("")}</select></label>
          <button class="button dispatch-button" type="submit" ${jobs.length ? "" : "disabled"}>Create package</button>
        </form>
        ${jobs.length ? "" : '<p class="dispatch-empty-note">Create a job first. No sample packages are added.</p>'}
      </section>
      <div class="dispatch-layout">
        <aside class="panel package-list-panel">
          <div class="panel-head"><div><p class="eyebrow">HISTORY</p><h2>Local packages</h2></div><span class="count">${packages.length}</span></div>
          <div class="package-list">${packages.length ? packages.map((item) => dispatchListItem(item, selected?.id)).join("") : '<div class="mini-empty"><span>△</span><strong>No dispatch packages</strong><p>Create an explicit snapshot from a job.</p></div>'}</div>
        </aside>
        ${selected ? dispatchPreview(selected) : `<section class="panel dispatch-preview empty-preview"><span class="dispatch-glyph">△</span><h2>Dispatch Package Preview</h2><p>This is what the selected worker would receive. Nothing is executed.</p></section>`}
      </div>
    </section>
  `, "dispatch");

  document.querySelector("#dispatch-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const job = store.get(new FormData(event.currentTarget).get("jobId"));
    if (!job) return;
    const packageSnapshot = createDispatchPackage(job, workerStore.get(job.workerId));
    dispatchStore.add(packageSnapshot);
    location.hash = `#/dispatch/${packageSnapshot.id}`;
  });
  bindDispatchActions(selected);
}

function dispatchListItem(item, selectedId) {
  return `<a class="package-list-item ${item.id === selectedId ? "active" : ""}" href="#/dispatch/${encodeURIComponent(item.id)}">
    <span class="package-status ${slug(item.packageStatus)}">${item.packageStatus}</span>
    <strong>${escapeHtml(item.jobTitle || "Untitled snapshot")}</strong>
    <small>${formatDate(item.createdAt)}</small>
  </a>`;
}

function dispatchPreview(item) {
  return `<section class="panel dispatch-preview">
    <div class="dispatch-preview-head">
      <div><p class="eyebrow">READ-ONLY SNAPSHOT</p><h2>Dispatch Package Preview</h2><p>This is what the selected worker would receive. Nothing is executed.</p></div>
      <span class="package-status large ${slug(item.packageStatus)}">${item.packageStatus}</span>
    </div>
    <div class="dispatch-facts">
      <div><span>Job</span><strong>${escapeHtml(item.jobTitle)}</strong></div>
      <div><span>Worker</span><strong>${escapeHtml(item.workerName)}${item.workerRole ? ` · ${escapeHtml(item.workerRole)}` : ""}</strong></div>
      <div><span>Priority</span><strong>${escapeHtml(item.priority)}</strong></div>
      <div><span>Job status at snapshot</span><strong>${escapeHtml(item.jobStatus)}</strong></div>
      <div><span>Sandbox target</span><strong>${escapeHtml(item.sandboxTarget)}</strong></div>
      <div><span>Created</span><strong>${formatDate(item.createdAt)}</strong></div>
    </div>
    <div class="dispatch-section"><p class="eyebrow">INSTRUCTIONS</p><p class="dispatch-instructions">${escapeHtml(item.instructions)}</p></div>
    <div class="dispatch-section"><div class="dispatch-section-title"><p class="eyebrow">PERMISSION SNAPSHOT</p><span>Frozen at creation</span></div>
      <div class="dispatch-permissions">${CAPABILITIES.map(({ key, label }) => {
        const denied = item.explicitDenials[key];
        const allowed = item.effectivePermissions[key] && !denied;
        const state = denied ? "Explicitly denied" : allowed ? "Allowed" : "Not granted";
        return `<div><span>${label}</span><strong class="snapshot-state ${denied ? "denied" : allowed ? "allowed" : "off"}">${state}</strong></div>`;
      }).join("")}</div>
    </div>
    <div class="dispatch-section denial-section"><p class="eyebrow">EXPLICIT DENIALS</p>${CAPABILITIES.some(({ key }) => item.explicitDenials[key]) ? `<div class="denial-list">${CAPABILITIES.filter(({ key }) => item.explicitDenials[key]).map(({ label }) => `<span>⊘ ${label}</span>`).join("")}</div>` : '<p class="no-denials">No explicit denials recorded in this snapshot.</p>'}</div>
    <div class="handoff-state"><span>Result / handoff capability</span><strong>${escapeHtml(item.resultHandoffCapabilityState)}</strong></div>
    <p class="export-note">Export creates a handoff file only. Nothing is executed.</p>
    <p class="dispatch-error" id="dispatch-error" role="alert"></p>
    <div class="dispatch-actions">
      <button class="button ghost" id="cancel-package" ${item.packageStatus === "Cancelled" ? "disabled" : ""}>Cancel package</button>
      <button class="button secondary" id="regenerate-package">Create new snapshot</button>
      <button class="button dispatch-button" id="ready-package" ${item.packageStatus !== "Draft" ? "disabled" : ""}>Mark Ready</button>
      <button class="button export-button" id="export-package" ${item.packageStatus === "Ready" ? "" : "disabled"}>Export package</button>
    </div>
  </section>`;
}

function bindDispatchActions(item) {
  if (!item) return;
  document.querySelector("#ready-package").addEventListener("click", () => {
    try {
      const job = store.get(item.jobId);
      const worker = workerStore.get(item.workerId);
      dispatchStore.replace(markPackageReady(item, job, worker));
      renderDispatch(item.id);
    } catch (error) {
      document.querySelector("#dispatch-error").textContent = error.message;
    }
  });
  document.querySelector("#cancel-package").addEventListener("click", () => {
    dispatchStore.replace(cancelPackage(item));
    renderDispatch(item.id);
  });
  document.querySelector("#regenerate-package").addEventListener("click", () => {
    const job = store.get(item.jobId);
    if (!job) {
      document.querySelector("#dispatch-error").textContent = "The source job is missing; a new snapshot cannot be created.";
      return;
    }
    const next = createDispatchPackage(job, workerStore.get(job.workerId));
    dispatchStore.add(next);
    location.hash = `#/dispatch/${next.id}`;
  });
  document.querySelector("#export-package").addEventListener("click", () => {
    try {
      const exportData = createDispatchExport(item);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = dispatchExportFilename(item);
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      document.querySelector("#dispatch-error").textContent = error.message;
    }
  });
}

function renderLedger() {
  const entries = [
    ...store.list().map((job) => ({ type: "Job", title: job.title, detail: `${job.status} · ${job.project}`, time: job.updatedAt, tone: slug(job.status), href: jobDetailHref(job.id) })),
    ...workerStore.list().map((worker) => ({ type: "Worker", title: worker.name, detail: `${worker.status} · ${worker.role}`, time: worker.updatedAt, tone: slug(worker.status), href: "#/workers" })),
    ...dispatchStore.list().map((item) => ({ type: "Dispatch", title: item.jobTitle || "Untitled package", detail: `${item.packageStatus} · ${item.workerName}`, time: item.updatedAt, tone: slug(item.packageStatus), href: `#/dispatch/${encodeURIComponent(item.id)}` })),
  ].filter((entry) => entry.time).sort((a, b) => new Date(b.time) - new Date(a.time));
  root.innerHTML = shell(`
    <header class="topbar control-topbar">
      <div><p class="eyebrow">LOCAL RECORD</p><h1>Ledger</h1><p class="topbar-context">A read-only overview assembled from current browser data.</p></div>
      <span class="dispatch-mode"><i></i> Local only</span>
    </header>
    <section class="dashboard ledger-page">
      <section class="panel ledger-panel">
        <div class="panel-head"><div><p class="eyebrow">RECENT STATE</p><h2>Jobs, workers & packages</h2></div><span class="count">${entries.length} records</span></div>
        <div class="ledger-table"><div class="ledger-table-head"><span>Type</span><span>Record</span><span>Current state</span><span>Updated</span></div>${entries.length ? entries.map((entry) => `<a href="${entry.href}"><span class="ledger-type">${entry.type}</span><strong>${escapeHtml(entry.title)}</strong><span class="ledger-state ${entry.tone}">${escapeHtml(entry.detail)}</span><time>${formatDate(entry.time)}</time></a>`).join("") : '<div class="empty-state"><span class="empty-icon">▤</span><h3>No local records</h3><p>Create jobs, workers, or dispatch previews to populate this view.</p></div>'}</div>
      </section>
      <aside class="panel ledger-note"><span>i</span><div><strong>Current-state ledger</strong><p>This view summarizes stored records. It is not yet an immutable audit log.</p></div></aside>
    </section>
  `, "ledger");
}

function permissionFields(job = {}) {
  return `<div class="permission-list">${CAPABILITIES.map(({ key, label }) => {
    const state = job.deniedPermissions?.[key] ? "deny" : job.permissions?.[key] ? "allow" : "off";
    return `<label class="permission-row"><span>${label}</span><select name="capability.${key}" aria-label="${label}"><option value="off" ${state === "off" ? "selected" : ""}>Not granted</option><option value="allow" ${state === "allow" ? "selected" : ""}>Allowed</option><option value="deny" ${state === "deny" ? "selected" : ""}>Explicitly denied</option></select></label>`;
  }).join("")}</div>`;
}

function permissionValues(form) {
  const permissions = defaultPermissionSet();
  const deniedPermissions = defaultPermissionSet();
  for (const { key } of CAPABILITIES) {
    const value = form.get(`capability.${key}`);
    permissions[key] = value === "allow";
    deniedPermissions[key] = value === "deny";
  }
  return { permissions, deniedPermissions };
}

function route() {
  const match = location.hash.match(/^#\/jobs\/([^/]+)$/);
  const dispatchMatch = location.hash.match(/^#\/dispatch\/([^/]+)$/);
  if (match) renderDetail(decodeURIComponent(match[1]));
  else if (dispatchMatch) renderDispatch(decodeURIComponent(dispatchMatch[1]));
  else if (location.hash === "#/dispatch") renderDispatch();
  else if (location.hash === "#/workers") renderWorkers();
  else if (location.hash === "#/ledger") renderLedger();
  else if (location.hash === "#/jobs") renderJobs();
  else renderDashboard();
}

window.addEventListener("hashchange", route);
route();
projectCatalog.refresh().then(() => {
  if (!document.querySelector("#job-dialog")?.open) route();
});
