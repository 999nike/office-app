# Worker App — Codex Plan

## Current status — 12 Aug 2026
The real Office -> Code Space -> Codex path is working end-to-end in the disposable sandbox.

Verified live:
- Worker App startup opens Code Space once and Office once.
- Office Create & send reuses the existing Code Space tab; no duplicate Code Space tab.
- Existing Code Space Dispatch Inbox receives the package and shows `NEW JOB`.
- Built-in Codex routes as `builtin:codex`.
- Persistent one-at-a-time queue receives and authorises jobs.
- Codex executes in `agent-sandbox-test`.
- Read/write sandbox execution works.
- A real write job created `nicky.html` and rendered successfully in-browser.
- Result / handoff persisted as Completed.

Do not spend tokens re-proving the verified single-job path unless code affecting that boundary changes or a real regression appears.

## Locked decisions
- Office built-in Codex ID is `builtin:codex`.
- Code Space routes by stable ID first and keeps legacy worker-name fallback.
- Frozen Office permissions remain authoritative.
- `agent-sandbox-test` is the only execution target until explicitly widened by the user.
- No automatic git push or merge.
- Worker App startup opens Code Space once and Office once.
- Office dispatch must reuse the existing Code Space tab.
- Current handoff uses the managed Code Space bridge/storage path.
- Keep custom/local Worker Profiles working.
- Do not touch Memory Space.

## Runtime / permission rule
For real coding/write jobs in the current runner, Codex needs `Use terminal` allowed as part of its execution grant. Read-only inspection can remain more restricted.

The running Code Space backend may be stale after `server.js` or worker/runtime code changes. When that code changes, use the managed supervisor restart path; do not waste time on manual process handling.

## Phase A — Real Codex execution — VERIFIED
Treat this as complete unless a real regression appears.

Verified:
- Office -> Code Space dispatch
- no duplicate tab
- `builtin:codex` routing
- persistent one-at-a-time queue
- Authorise & Start -> Codex launch
- read/write sandbox execution
- persisted result/handoff

Do not repeat these checks during unrelated Phase B work.

## Phase B — Multi-job Create Job flow
This is the current main product chunk.

Existing preparation:
- Create Job supports Multi jobs mode.
- 2–10 internal Job tabs/pages.
- Each tab keeps separate title, description, project, worker, priority and permission state.
- Submission creates normal existing Office job objects only.
- Code Space accepts ordered multi-job batches and feeds the existing persistent queue.

Next goal:
Build/fix the next meaningful Phase B chunk. Use code inspection first. When the multi-job chunk is ready, run one small 2-job end-to-end batch through Office -> Code Space -> persistent queue using only `agent-sandbox-test`. Fix only real issues found.

Do not introduce:
- a second job schema,
- a second permission system,
- a second queue,
- parallel mutation of the same project,
- automatic git push/merge.

## Lean Codex working rules
Goal: spend tokens on coding, not repeated ceremony.

1. Read `CODEX_PLAN.md` first.
2. Read `V3_PRODUCT_LEDGER.md` or Code Space `V2_PRODUCT_LEDGER.md` only when the current task genuinely needs historical/architectural detail not present here.
3. Read only the code needed for the current change and its direct dependencies. Do not repeatedly audit the whole repo or reread unchanged architecture.
4. Prefer meaningful implementation chunks over tiny patch/test loops.
5. Do not ask the user to manually test every patch.
6. Run only focused automated tests relevant to changed behaviour by default.
7. Run a broader suite only when changing shared job schema, permission logic, dispatch serialization, persistent queue, runner/security boundaries, or another broadly shared contract.
8. Do one end-to-end sandbox smoke test after a meaningful cross-app chunk, not after every patch.
9. Do not re-test verified single-job infrastructure unless that code was changed or a real regression appears.
10. Do not repeatedly inspect ports, PIDs, supervisor state or launcher behaviour unless runtime/startup code changed or the runtime is actually failing.
11. If backend/runtime code changed, perform one managed restart and one relevant health/behaviour check.
12. Keep ledger/plan updates short and only after useful milestones.

## Safety checks that must remain
Do not remove these to save tokens:
- execution target must remain `agent-sandbox-test` unless the user explicitly widens it;
- frozen permissions remain authoritative;
- write/terminal capabilities must match the job grant;
- no automatic git push/merge;
- no Memory Space changes;
- when permission, runner or security-boundary code changes, perform one focused success check and one relevant denial/negative check.

These are the important boundaries. Everything else should be tested only when the changed code makes it necessary.

## Next instruction for Codex
Read this file first. Do not automatically load the full product ledgers.

Treat the end-to-end single-job Codex path as verified and leave it alone unless the current work changes it or exposes a regression.

Continue the next meaningful Phase B multi-job chunk. Preserve the existing normal job schema, frozen permissions, ordered persistent queue, no-duplicate-tab handoff and `agent-sandbox-test` execution boundary.

Use focused code reading and focused tests. When the chunk is ready, perform one 2-job sandbox end-to-end proof. Do not repeat unrelated checks. Do not touch Memory Space. Do not auto-push or merge.