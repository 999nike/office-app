# Office V0

Office is a local-first project control room for creating and tracking work jobs. It stores Office data in `localStorage` and uses a narrow local Code Space project-catalog endpoint only to populate target-project names; it does not connect to Memory Space, GitHub, or any remote service.

## Run locally

Requires Node.js 20 or newer.

```bash
npm run dev
```

Open <http://127.0.0.1:4173>. Run checks with:

```bash
npm run check
npm test
```

## Current scope

- Create jobs with title, description, priority, target project, and worker/agent.
- Track Inbox, Ready, In Progress, Review, Complete, and Blocked states.
- View job details, update status, and save result/handoff notes.
- Persist data only in the current browser using `localStorage`.
- Populate target-project choices from direct folders reported by the approved local Code Space workspace catalog. Office receives names only and can refresh the list on demand.

Job rules live in `src/domain`, persistence in `src/data`, UI in `src/app.js`, and the intentionally inactive future integration boundary in `src/connectors`.

## V0 limitations

There is no sync, authentication, multi-user support, job deletion/editing, or execution-system connection yet. Clearing browser site data removes all jobs. The local Code Space project catalog is used only for target-project names; if it is unavailable, Office cannot create a new job until it is refreshed successfully.
