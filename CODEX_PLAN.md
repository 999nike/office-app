# Worker App — Codex Plan

## Current status — 12 Aug 2026
The real Office -> Code Space -> Codex path is working end-to-end in the disposable sandbox.

Verified live:
- Worker App startup opens Code Space once and Office once.
- Office Create & send no longer opens a duplicate Code Space tab.
- Existing Code Space Dispatch Inbox lights `NEW JOB` and receives the package once.
- Built-in Codex routes as `builtin:codex`.
- Persistent queue receives and authorises the job.
- Codex executes in `agent-sandbox-test`.
- A real write job completed and created `nicky.html`; the page rendered successfully in-browser.
- Result / handoff persisted as Completed.

Important correction from live testing:
- For real coding/write jobs in the current runner, Codex needs `Use terminal` allowed as part of its execution grant.
- Read-only inspection can remain more restricted.
- Do not treat the earlier Phase A "terminal must be denied" rule as the product rule for write jobs.

## Locked decisions
- Office has built-in Codex with stable ID `builtin:codex`.
- Code Space routes by stable ID first and keeps legacy worker-name fallback.
- Frozen Office permissions remain authoritative.
- `agent-sandbox-test` remains the only execution target until explicitly widened.
- No automatic git push or merge.
- Worker App startup opens Code Space once and Office once.
- Office dispatch must never create a second visible Code Space tab.
- Current handoff uses the managed Code Space bridge/storage path so the existing Code Space tab receives and surfaces jobs.
- Do not touch Memory Space.
- Keep custom/local Worker Profiles working.

## Phase A — Real Codex execution — VERIFIED
Completed:
- Office -> Code Space dispatch works without duplicate tabs.
- Inbox NEW JOB indicator works on the existing Code Space tab.
- `builtin:codex` routing works.
- Persistent one-at-a-time Codex queue works.
- Authorise & Start launches Codex.
- Read/write sandbox execution works in `agent-sandbox-test`.
- Real file-write proof succeeded with `nicky.html`.
- Persisted task result/handoff works.

Known runtime lesson:
- After backend `server.js` / worker-code changes, the already-running Code Space Node process can be stale. Use the managed supervisor restart path rather than manual process handling.

## Phase B — Multi-job Create Job flow
This is the next main product chunk.

Current preparation already exists:
- Existing Create Job panel supports Multi jobs mode.
- 2–10 internal Job tabs/pages.
- Each tab keeps separate title, description, project, worker, priority, and permission state.
- Submission creates normal Office job objects only.
- Code Space accepts ordered multi-job batches and feeds the existing persistent queue.

Next goal:
Run one small 2-job sandbox batch through the now-working handoff/queue and fix only real issues found. Then continue polishing the multi-job workflow for unattended sequential Codex work.

Do not introduce:
- a second job schema,
- a second permission system,
- parallel mutation of the same project,
- automatic git push/merge.

## Working rules
- Prefer meaningful implementation chunks over tiny patch/test loops.
- Do not ask for manual testing after every patch.
- Batch automated verification after substantial work.
- Update ledgers/plans only at useful milestones.
- Keep this file short and current; replace stale assumptions instead of keeping a diary.
- Keep real/core projects out of experimental Worker App tests until explicitly authorised.

## Next instruction for Codex
Read this file plus `V3_PRODUCT_LEDGER.md` in Office and `V2_PRODUCT_LEDGER.md` in Code Space.

Treat the end-to-end single-job Codex path as verified. Do not rework it unless a real regression appears.

Continue with the next meaningful Phase B chunk: validate the existing 2-job multi-job flow through Office -> Code Space -> persistent queue using only `agent-sandbox-test`, preserve the current no-duplicate-tab handoff, and fix only real issues found.

Keep checks focused and batched. Do not touch Memory Space. Do not auto-push/merge.