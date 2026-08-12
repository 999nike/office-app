# Worker App — Codex Plan

## Current focus
Finish the real Office -> Code Space -> Codex path first, then add multi-job entry using the existing Create Job panel.

## Locked decisions
- Office has built-in Codex with stable ID `builtin:codex`.
- Code Space routes by stable ID first and keeps legacy `worker.name == "Codex"` fallback.
- Frozen Office permissions remain authoritative.
- `agent-sandbox-test` remains the only execution target until explicitly widened.
- No automatic git push or merge.
- Worker App startup opens Code Space once and Office once.
- Office dispatch must reuse the existing named `code-space` browsing context and never create duplicate Code Space tabs.
- Do not touch Memory Space.
- Keep custom/local Worker Profiles working.

## Phase A — Real Codex execution
Goal: make one real Office -> Code Space -> Codex read-only sandbox job succeed cleanly.

Tasks:
1. Preserve `builtin:codex` routing and current queue work.
2. Review the current `useTerminal` requirement for the mediated Codex runner.
3. Codex selection must not silently imply unrestricted/general terminal authority.
4. Do not weaken the Office permission model.
5. Keep the mediated runner non-interactive, sandbox-scoped, and limited to `agent-sandbox-test`.
6. Use focused checks while coding and one batched relevant suite at the end.
7. Only one live read-only Office -> Codex proof is required when implementation is ready.
8. If that live proof fails, fix the actual integration fault and repeat only that proof.

## Phase B — Multi-job Create Job flow
Build this only after Phase A is ready/passing.

Reuse the existing Create Job panel. Do not build a separate Job Board form or second job model.

UI:
- Add a `Multi jobs` button to the existing Create Job panel.
- User chooses how many jobs to prepare, initially 2–10.
- Keep the same panel and show internal tabs/paging such as `Job 1 | Job 2 | Job 3`.
- Each tab uses the same existing job form controls and layout.
- Each tab keeps its own form state.
- Single-job mode remains unchanged.

Data/queue:
- Each page creates the same normal Office job object used today.
- Multi-job submission produces an ordered list of normal jobs.
- Do not introduce a second job schema or permission system.
- Preserve project, worker/model, instructions, and frozen permissions per job.
- Feed the existing persistent one-at-a-time Code Space queue in order.
- No parallel project mutation.
- No silent permission escalation.
- No automatic git push/merge.

## Working rules
- Prefer meaningful implementation chunks over tiny patch/test loops.
- Do not ask for manual testing after every patch.
- Update the active product ledger only at useful milestones.
- Keep this plan short and current; tick/replace completed work instead of turning it into a diary.
- Do not commit or push local implementation work unless explicitly asked.

## Next instruction for Codex
Read this file plus `V3_PRODUCT_LEDGER.md` in Office and `V2_PRODUCT_LEDGER.md` in Code Space. Continue Phase A from the current local worktree. Preserve existing built-in Codex routing, queue work, and browser ownership behavior. Report files changed, exact permission/execution behavior, automated test totals, whether the single live proof is ready, and any real blocker.
