# Deployment verification

Recorded on 2026-11-15 (Asia/Tokyo), after the owner committed the container configuration. Local source baseline: `31b3009`. This report covers deployment preparation steps 1–6, corresponding to DEPLOY.md Part A, Step 1. It does not certify a live Railway deployment or the remaining abuse-protection work.

## Implemented

- Production database-path requirement, first-use path logging, and a production seed guard.
- Request-time `/api/health` with migration/open-error handling and uncached 200/503 JSON responses.
- General security headers, group/export noindex and no-referrer headers, and robots rules that permit reading noindex headers.
- Browser-local expense-date defaults with preserved edits/errors and success resets.
- Node 22 Dockerfile, Docker context exclusions, matching package/lockfile engine requirements, and Railway configuration for one instance and startup healthchecking.

## Automated checks run by the coding agent

These results were obtained during implementation and review of steps 1–5. Step 6 changes documentation only; those checks were not rerun for the documentation update.

| Check | Result | Evidence and limits |
| --- | --- | --- |
| `npm test` | Passed: 509 tests across 46 files | Latest run after reviewing the owner's container/package changes; existing tests pass unchanged |
| `npm run lint` | Passed | Latest run after container/package review |
| `npx tsc --noEmit` | Passed | Latest run after container/package review |
| `DATABASE_PATH= npm run build` | Passed | Last agent build after step 4; request-time database access does not require a build-time path |
| Production path guard | Passed | Missing/blank production paths rejected; importing the wrapper does not open a database; migration failures remain retryable |
| Production seed guard | Passed | Subprocess tests preserved a temporary database and sidecars byte-for-byte, created no missing target, and confirmed development seeding still works |
| Health endpoint | Passed | Service/route tests cover healthy/closed databases, missing configuration, opening/migration failures, generic error bodies, and no-store responses |
| Headers and robots | Passed | Next.js configuration test helper verifies matching and overrides; generated robots artifact inspected |
| Date defaults | Passed | Pure state-selection tests and server-rendered markup checks cover defaults, edits, failed submissions, resets, and hidden submission values |
| UTC/Japan date boundary | Passed | Separate Node processes with `TZ=UTC` and `TZ=Asia/Tokyo` at `2026-11-14T15:30:00Z` return November 14 and November 15 respectively; this is not a browser lifecycle test |

The production build still emits three pre-existing filesystem-tracing warnings from `src/db/migrate.ts`. They can increase the amount of source included in server output. They were not changed as part of deployment preparation.

## Local Docker checks reported by the owner

The agent reviewed the Dockerfile, `.dockerignore`, `railway.json`, and package changes. Docker's daemon was not running during the agent's check. The owner subsequently started Docker Desktop, followed the local verification instructions, and reported that everything worked as expected. The following are owner-reported results, not agent-observed HTTP responses or retained command logs.

| Check | Reported result |
| --- | --- |
| `docker build -t expense-splitter:local .` | Passed |
| Container with `/data/app.db` on the separate `expense-splitter-deploy-check` named volume | Started successfully on host port 3001 |
| `/api/health` | HTTP 200 with status ok and schema version 2 |
| Startup database-path logging | `/data/app.db` reported |
| General/group headers and `/robots.txt` | Expected values present |
| Creating a group, members, and an expense | Worked |
| Restarting the container | Records remained |
| Stopping and recreating the container using the same named volume | Records remained |
| Separate container without `DATABASE_PATH`, on host port 3002 | Health returned generic 503; logs contained the required-path error |

The prescribed container checks use a named test volume rather than the repository's `data/app.db`. Agent checks used in-memory or isolated temporary databases; the agent did not delete or reseed the real database. The owner manages Git commits and reported pushing the preceding changes to GitHub; the agent made no commits or pushes.

## Outstanding verification and work

- A live browser test at the UTC/Japan date boundary, including the date reset after success, has not been reported. Automated timezone/state tests do not replace that check.
- Data caps (guided step 7 / DEPLOY A8) and rate limiting (step 8 / DEPLOY A9) are not implemented. `MAX_GROUPS` is not active yet.
- Railway volume attachment, environment variables, region, custom-domain DNS, and HTTPS have not been verified on the live service.
- Railway restart/redeployment persistence, scheduled backups, and a manual restore drill remain pending. Local Docker volume persistence does not prove Railway volume configuration.
- Uptime monitoring, usage alerts, and public-edge client-IP verification remain pending.
- An off-platform online backup script remains optional and unimplemented; no `npm run backup` command exists.

See the [README deployment section](../README.md#deployment) for the current setup and the local [DEPLOY.md](../DEPLOY.md) for the full implementation and operations plan. DEPLOY.md is gitignored and may be absent in a fresh clone.
