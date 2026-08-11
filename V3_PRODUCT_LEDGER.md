# Office V3 Product Ledger

## Purpose

Office is a local-first authority and control room for defining, assigning, tracking, and reviewing jobs. It records intent and permissions; it does not execute work.

## Architecture and current state

- Dependency-free browser UI served locally, with hash-routed dashboard and job details.
- Pure job rules in `src/domain`, browser persistence in `src/data`, UI in `src/app.js`, and an inactive future connector boundary in `src/connectors`.
- V0 includes job creation and validation, priorities, projects, workers, six workflow statuses, timestamps, result/handoff notes, filtering, responsive dark UI, empty states, and `localStorage` persistence.
- Office-side permissions describe allowed and explicitly denied capabilities for each job. They are editable declarations only and perform no action.
- Local Worker Profiles can be created, viewed, edited, and deleted with identity, role, description, availability status, timestamps, and off-by-default permission suggestions. Workers are declarative identities only: they cannot start processes, access files, use tools, or connect externally.
- Explicit profile assignment copies permission suggestions into an independent job record. Existing job denials remain denied; later profile changes or deletion do not mutate existing jobs. Legacy free-text assignments remain readable.
- Local Dispatch Packages create immutable-style historical previews from current job and assigned-worker data. Each package freezes instructions, identity, sandbox label, priority/status, effective permissions, and explicit denials; only Draft/Ready/Cancelled lifecycle state changes afterward.
- Dispatch remains preview/data only. It never contacts a worker, executes a permission or command, calls a connector, or accesses a target.
- Ready Dispatch Packages can be exported as browser-local JSON handoff files using the frozen package snapshot only. The versioned `office-dispatch-package` format contains only the selected package's execution-relevant metadata, capability lists, and lifecycle state; export never triggers a worker or connector.
- Target-project selection is now supplied by a narrow, read-only local Code Space catalog. Office requests only direct project-folder names from Code Space's approved workspace root, can refresh that list explicitly, and validates new jobs against the current catalog. It never receives paths, file contents, or arbitrary filesystem access; when Code Space is unavailable, project selection is disabled without a hard-coded fallback.
- The UI now uses a unified dark control-room system derived from the local design reference: persistent navigation, real-data summary metrics, workflow board, worker availability, attention queue, compact inspectors, permission matrices, and polished dispatch panels. Dashboard, Jobs, Workers, Dispatch, and the read-only current-state Ledger are distinct responsive views.

## Verification status

- Verified: static HTTP delivery of the HTML, JavaScript, and CSS assets.
- Verified for this patch: HTTP 200 with correct JavaScript content types for the Worker Profile domain, persistence, and updated UI modules; source audit found no execution, shell, filesystem, network, or connector calls in the new Worker Profile code.
- Verified for Dispatch: HTTP 200 with correct content types for the updated UI, dispatch domain, dispatch store, and stylesheet. Source audit found no process/command launching, filesystem execution, network APIs, connector calls, or worker dispatch calls.
- Verified for Dispatch export: the updated UI, serializer, and stylesheet return HTTP 200; source review confirms export projects only the frozen package data into a versioned JSON Blob and never reads current jobs/workers or calls a connector.
- Project-catalog patch: source review confirms Office has no hard-coded production project list, receives names only, and fails job creation unless the chosen name is in the current Code Space catalog. The Code Space endpoint is GET-only and applies exact `http://127.0.0.1:4176` CORS; it enumerates direct folders only and excludes its own application folder.
- UI redesign verification: route/render wiring and browser asset references were source-reviewed; final static HTTP checks are recorded in the current handoff. Pixel-level and interactive browser verification remain outstanding because the local browser automation executable is unavailable in this environment.
- Not yet verified in the available environment: Node syntax/unit commands and the browser download flow for a Ready package. The environment lacks a usable Linux Node/browser runtime.

## Hard safety boundaries

- Office remains local inside its own workspace. Its only active integration is the local, name-only Code Space project catalog at the exact approved loopback origin.
- No connection to external apps, services, repositories, or real projects.
- No connector or worker execution is active. No job permission executes itself.
- Examples and future validation must use disposable sandbox data only.

## Intended controlled workflow — direction only

User → Office creates and controls a job → worker receives only the job's explicit permissions → Code Space later provides an isolated execution environment → worker returns a result to Office → user reviews the result.

Office is the authority/controller. Code Space will later be the workshop/execution environment. Workers never receive broad access by default.

A future job permission envelope may contain:

- task/instructions
- sandbox project
- assigned worker
- allowed code/files
- allowed commands/tools
- optional scoped memory/context permission
- result/handoff
- explicit forbidden capabilities

This envelope is product direction, not an implemented execution contract. Current permissions are local Office records only.

## Next logical work — not implemented

Add a local snapshot-difference review that compares a new Draft package with the most recent package for the same job before the user marks it Ready. Execution and connectors remain out of scope.
