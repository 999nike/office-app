# Office V3 Product Ledger

## Purpose

Office is a local-first authority and control room for defining, assigning, tracking, and reviewing jobs. It records intent and permissions; it does not execute work itself.

## Architecture and current state

- Dependency-free browser UI served locally, with Dashboard, Jobs, Workers, Dispatch, and Ledger views.
- Pure job/worker/dispatch rules live under `src/domain`, browser persistence under `src/data`, UI in `src/app.js`, and narrow integration code under `src/connectors`.
- Job creation includes title, instructions, priority, target project, worker assignment, workflow status, timestamps, and result/handoff state.
- Office-side permissions are explicit declarations that become part of the job and dispatch contract.
- Worker Profiles can be created, viewed, edited, and deleted with identity, role, description, availability status, timestamps, and default permission suggestions.
- Explicit worker assignment copies permission suggestions into an independent job record. Existing denials remain denied; later worker edits or deletion do not mutate existing jobs.
- Dispatch Packages freeze instructions, worker identity, sandbox target, priority/status, effective permissions, explicit denials, and lifecycle state.
- Ready Dispatch Packages export as versioned `office-dispatch-package` v1 JSON using only the frozen package snapshot.
- Target-project selection is supplied dynamically by Code Space through a narrow local name-only catalog. Office no longer contains a hard-coded production project list.
- Office validates new jobs against the current Code Space project catalog and disables project selection/job creation if that catalog is unavailable.
- The UI uses a dark control-room layout with real-data metrics, workflow board, worker availability, permission matrices, dispatch previews, and a read-only current-state ledger.

## Verified cross-app milestone — 11 Aug 2026

The complete Office → Code Space dispatch path has now been manually proven on the HP using a disposable sandbox.

### Dynamic project discovery — VERIFIED

Code Space exposes a local read-only project catalog from:

```text
E:\WIZZ-Server\workspaces
```

Office successfully discovered current direct workspace folders including:

```text
agent-sandbox-test
junkz-shooter-landing
memory-app
office-app
Smokey-Space
space-junkz-shooter
```

`code-space` itself is excluded by the catalog endpoint.

Verified properties:

- Office has no hard-coded production project list
- Code Space returns names only, never arbitrary paths or file contents
- only direct workspace folders are returned
- Code Space app folder is excluded
- exact Office loopback origin is enforced for the catalog
- Office has an explicit Refresh projects action
- Code Space unavailable => project selection and job creation fail closed with no static fallback
- `createJob` validates the selected project against the current returned catalog

### Automated Office verification — VERIFIED locally

Command:

```powershell
cd E:\WIZZ-Server\workspaces\office-app
node --test
```

Result:

```text
29 tests
29 pass
0 fail
```

Coverage includes:

- worker persistence and normalization
- job persistence and validation
- current project-catalog validation
- Code Space unavailable behavior
- dispatch snapshot creation
- frozen dispatch snapshots
- permission preservation
- Ready/export checks
- safe Code Space project-name catalog behavior

### First real dispatch package — VERIFIED

Office job:

```text
Title: Agent Sandbox Read Test
Target: agent-sandbox-test
Worker: Test Worker Alpha
Priority: Medium
Status before dispatch: Ready
```

Instructions:

```text
Read the files in agent-sandbox-test, run the approved test, report what the code does and whether the test passes. Do not modify any files.
```

Frozen permissions:

```text
Read files                 Allowed
Run tests                  Allowed
Propose result / handoff   Allowed
Modify files               Explicitly denied
Use terminal               Not granted
```

Verified Office behavior:

- job created against the dynamically discovered `agent-sandbox-test` target
- worker assignment preserved correctly
- status changed Inbox -> Ready
- Dispatch package created from the Ready job
- frozen permission snapshot matched the job exactly
- package marked Ready
- package exported as Office dispatch JSON
- Office itself performed no filesystem access, test execution, terminal use, or code modification

### Code Space handoff result — VERIFIED end to end

The exported Office package was imported into Code Space and validated successfully.

Code Space then executed its mediated read/test worker against the disposable sandbox only.

Observed result:

```text
Files inspected: 2
- math.js
- math.test.js

Tests run: 1
Result: PASS
Detected code: function add
```

The structured proposed handoff was persisted in Code Space.

Critically, the dispatch retained:

```text
Modify files   Explicitly denied
Use terminal   Not granted
```

No file-write capability or general terminal capability was granted to the worker.

This is the first manually verified real Office → Code Space execution journey.

## Verification status

- VERIFIED: Office static delivery and UI routes.
- VERIFIED: worker profiles and persistence.
- VERIFIED: job creation, assignment, status flow, and persistence.
- VERIFIED: dispatch snapshot creation and frozen permission state.
- VERIFIED: Ready package export.
- VERIFIED: dynamic Code Space project catalog and fail-closed unavailable state.
- VERIFIED: Office local automated suite at 29/29 passing.
- VERIFIED: Office package imported and validated by Code Space.
- VERIFIED: first real disposable read/test/report job completed successfully in Code Space.
- VERIFIED: resulting worker permissions remained read/test/propose only; Modify files stayed denied and terminal stayed not granted.
- VERIFIED: streamlined Office `Create & send` handoff reaches Code Space without manual JSON import.
- VERIFIED: existing Code Space tab is reused in the final browser recovery test; no duplicate Code Space tab opened.
- VERIFIED: Code Space opens/selects the new package and shows an obvious `NEW JOB` state.
- VERIFIED: `Authorise & Start / Reject` remains the explicit execution boundary.
- VERIFIED: final read/test worker execution completed successfully after the recovery patch.

## Hard safety boundaries

- Office is the authority/controller; it does not execute project work itself.
- importing, selecting, creating, or marking a Dispatch Package Ready must never execute the job.
- execution requires an explicit user Start action in Code Space.
- capabilities are an allow-list, not advisory labels.
- anything denied or not granted must not be supplied to the worker.
- target-project metadata must not become arbitrary filesystem authority.
- no automatic Git push or merge behavior.
- no silent permission escalation.
- result/handoff authority is separate from code-mutation authority.
- examples and first-stage execution tests use disposable sandbox data only.

## Current controlled workflow

```text
User
  -> Office creates job
  -> Office assigns worker
  -> Office freezes exact permissions
  -> Office marks job/package Ready
  -> Office sends the Ready package directly to Code Space
  -> Code Space validates + selects the package
  -> user explicitly chooses Authorise & Start or Reject
  -> Code Space enforces sandbox + capability boundary
  -> worker receives only granted capabilities
  -> structured result/handoff is persisted
```

**Office decides the job. Code Space enforces the job. The worker only receives explicitly granted capabilities.**

## Streamlined job flow recovery — 11 Aug 2026 — VERIFIED

The shortened Office → Code Space path is now live-verified on the HP.

Verified user path:

```text
Office -> New Job
  -> choose Project
  -> choose Agent / model
  -> write Job description
  -> choose Permissions
  -> Create & send

Code Space
  -> reuses the existing Code Space tab
  -> receives validated Ready package
  -> opens/selects Dispatch Inbox package
  -> shows NEW JOB
  -> Authorise & Start / Reject

Result
  -> mediated worker runs only after explicit authorisation
  -> structured result is persisted
```

Recovery work fixed two regressions without changing the permission or execution architecture:

1. Office job-detail routing was made stable by canonicalising job IDs and using one encoded detail-route helper.
2. Quick handoff now uses the exact persisted job ID instead of rediscovering the new job by matching form fields.
3. Code Space receipt now selects the validated package in-page instead of relying on reload + timer reselection.
4. Office window reservation/dispatch lifecycle now reuses the stable `code-space` named tab and no longer leaves an `about:blank` or fallback duplicate tab.

Focused checks reported by Codex:

- syntax checks for changed JavaScript files passed
- Office focused job/dispatch tests passed
- Code Space focused office-dispatch-link / dispatch-package / dispatch-runner tests passed
- connector-focused Code Space tab reuse tests passed
- one unrelated full Code Space suite failure remains under WSL because Windows paths resolve differently in `office-project-catalog.test.cjs`; this was not introduced by the recovery changes

Final manual browser verification proved:

- one existing Code Space tab was reused
- new package arrived automatically
- correct new package was selected
- `NEW JOB` indicator appeared
- frozen permissions remained visible and unchanged
- `Authorise & Start / Reject` were offered
- the worker read the sandbox files and completed the approved test successfully
- Modify files remained explicitly denied
- terminal remained not granted

Local recovery commits recorded after verification:

```text
Office:     31fa649  Fix Office job recovery and Code Space tab reuse
Code Space: 8e0e8a3  Fix direct Office dispatch receipt
```

These recovery commits were created locally with no automatic push or merge. Unrelated ledger/working-tree changes were intentionally excluded from those commits.

## Next logical work

The read/test execution boundary is now proven. The next deliberate capability test is a **write-capable coding worker** against `agent-sandbox-test` only.

Before that test:

1. grant `Modify files` only for the disposable sandbox job being tested
2. keep unrestricted terminal access not granted unless a separate test explicitly requires it
3. preserve explicit `Authorise & Start` in Code Space
4. require the worker to modify/create only the named sandbox artifact
5. verify the resulting file contents and that no unrelated files changed
6. keep automatic Git push/merge disabled

Do not broaden write authority to production projects until the disposable write test is proven.
