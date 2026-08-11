# Development Ledger

## 2026-08-11 — Office V0

### Decisions

- Built a dependency-free ES module application to keep local setup small and dependable.
- Used hash routing for dashboard and job-detail navigation from a static local server.
- Used browser `localStorage` as the only persistence layer.
- Kept job domain logic, persistence, interface code, and future connectors in separate modules.
- Added an inert Code Space connector contract as a boundary only; it makes no connection.

### Delivered

- Dark responsive dashboard with real empty state and project/job metrics.
- Job creation form and validation.
- Status and priority display, filtering, detail view, status changes, and result notes.
- Local persistence and automated domain/store tests.

### Deferred beyond V0

- Code Space execution connector and all other external integrations.
- Editing/deleting jobs, activity history, search, data import/export, sync, and accounts.

## 2026-08-11 — Office-side permission model

- Added five declarative worker capabilities with safe off-by-default values.
- Added explicit denial records and mutually exclusive Off / Allowed / Denied UI controls.
- Added permission editing during job creation and from job detail.
- Normalized older locally stored jobs to safe defaults without requiring a migration.
- Permissions remain local job metadata and cannot execute tools, commands, workers, or connectors.

## 2026-08-11 — Local Worker Profiles

- Added separate worker domain and local persistence modules with no seeded profiles.
- Added local create, view, edit, and delete UI with four availability states.
- Added off-by-default Allowed / Denied / Not granted profile permission suggestions.
- Replaced new-job free-text assignment with local profile selection while preserving old stored labels.
- Profile defaults copy only on explicit assignment; job permissions remain independent and retain explicit denials.
- Worker Profiles are definitions only and contain no execution or connector behavior.

## 2026-08-11 — Dispatch Package previews

- Added separate dispatch domain and local persistence modules with no seeded packages.
- Added explicit job-to-package snapshot creation, inspection, regeneration, readiness, and cancellation UI.
- Froze worker identity, job instructions, sandbox label, status/priority, effective permissions, and explicit denials at creation.
- Added Ready guards for source job, assigned worker, disabled-worker state, and permission snapshot presence.
- Used compact cyan/amber control-room styling for Dispatch only, following the local visual reference.
- Dispatch is local preview data only and performs no execution, worker contact, connector call, or target access.
