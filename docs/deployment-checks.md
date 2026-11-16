# Deployment verification

Updated on 2026-11-16 (Asia/Tokyo). Guided steps 1–8 are implemented and automatically verified; step 9 updates the documentation and records the remaining manual checks. This covers the code in DEPLOY.md Part A, including data caps (A8) and rate limiting (A9). Current source reference before this documentation update: `3d593cb`. The checks below were run against the implementation working tree before this documentation-only update; they do not certify a live Railway deployment.

## Implemented

- Production database-path requirement, first-use path logging, and a production seed guard.
- Request-time `/api/health` with migration/open-error handling and uncached 200/503 JSON responses.
- General security headers, group/export noindex and no-referrer headers, and robots rules that permit reading noindex headers.
- Browser-local expense-date defaults with preserved edits/errors and success resets.
- Node 22 Dockerfile, Docker context exclusions, matching package/lockfile engine requirements, and Railway configuration for one instance and startup healthchecking.
- Transactional data caps: 2,000 groups by default, 50 members/group, 2,000 expenses/group, 1,000 payments/group, and trimmed name/note limits of 80/200 UTF-16 code units. Archived members and expenses count toward their caps. The group-creation action reads the optional `MAX_GROUPS` override at request time.
- Validated `X-Real-IP` identity, fixed-window limits for every Server Action and CSV downloads, bounded draft/row-ID feedback, and uncached CSV 429 responses with retry intervals. Normal page reads and health checks are not limited.

## Automated checks run by the coding agent

The latest full checks were run on 2026-11-16 after reviewing the owner's rate-limiting implementation and adding tests. Step 7 added 28 tests (509 → 537); step 8 added 85 (537 → 622). Existing action/export tests received request-header mocks and limiter-state resets while retaining their assertions. These checks were not rerun for this documentation-only update.

| Check | Result | Evidence and limits |
| --- | --- | --- |
| `npm test` | Passed: 622 tests across 54 files | Full suite after rate-limit integration, including the existing regression tests |
| `npm run lint` | Passed | After rate-limit integration |
| `npx tsc --noEmit` | Passed | After rate-limit integration |
| `DATABASE_PATH= npm run build` | Passed | After rate-limit integration; request-time database access does not require a build-time path |
| Production path guard | Passed | Missing/blank production paths rejected; importing the wrapper does not open a database; migration failures remain retryable |
| Production seed guard | Passed | Subprocess tests preserved a temporary database and sidecars byte-for-byte, created no missing target, and confirmed development seeding still works |
| Health endpoint | Passed | Service/route tests cover healthy/closed databases, missing configuration, opening/migration failures, generic error bodies, and no-store responses |
| Headers and robots | Passed | Next.js configuration test helper verifies matching and overrides; generated robots artifact inspected |
| Date defaults | Passed | Pure state-selection tests and server-rendered markup checks cover defaults, edits, failed submissions, resets, and hidden submission values |
| UTC/Japan date boundary | Passed | Separate Node processes with `TZ=UTC` and `TZ=Asia/Tokyo` at `2026-11-14T15:30:00Z` return November 14 and November 15 respectively; this is not a browser lifecycle test |
| Data caps and `MAX_GROUPS` | Passed | Tiny custom caps exercise below/at/above-cap behavior, archived counts, group isolation, text boundaries, no partial writes, rollback, and environment parsing/fallback |
| Client IP | Passed | IPv4/IPv6 validation and normalization; malformed, missing, scoped, and list values use `unknown`; spoofed `X-Forwarded-For` is ignored. These are unit tests, not proof of Railway header handling |
| Limiter and policy | Passed | Exact budgets, fixed-window boundaries, retry rounding, independent keys, pruning/oldest-key eviction, default capacity, and state shared across module reloads |
| Write-action integration | Passed | All nine actions enforce limits before parsing or DB/service work; allowed paths still run, feedback is bounded, files are ignored, and drafts/row IDs survive rejection |
| Route integration | Passed | CSV rejects with 429, positive `Retry-After`, and no-store before validation/DB access; budgets span groups, reset after expiry, and respect request-time control flow; health remains available with exhausted budgets |

The production build still emits three pre-existing filesystem-tracing warnings from `src/db/migrate.ts`. They can increase the amount of source included in server output. They were not changed as part of deployment preparation.

## Local Docker checks reported by the owner

These results were reported during step 5, before data caps and rate limiting were added (container-stage source reference: `31b3009`). The agent reviewed the Dockerfile, `.dockerignore`, `railway.json`, and package changes. Docker's daemon was not running during the agent's check. The owner subsequently started Docker Desktop, followed the local verification instructions, and reported that everything worked as expected. The following are owner-reported results, not agent-observed HTTP responses or retained command logs. A fresh Docker run of the final protection changes has not been reported.

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

## Manual protection checks still pending

Use a disposable database/container volume for these checks, leaving `data/app.db` untouched. Start with a fresh process or wait for existing windows to expire. Limits count attempts, including invalid submissions, so earlier requests may cause earlier rejection. Local requests without `X-Real-IP` share the `unknown` bucket.

- [ ] Create five groups within one hour from the same client; the sixth attempt shows a retry interval and retains the submitted name/currency.
- [ ] Exhaust the combined allowance of 60 group write attempts in a minute; the next attempt is rejected without changes. Check expense draft fields/participants and archive/restore feedback on the affected row. Confirm writes work after the window expires.
- [ ] Make ten CSV requests within one minute; the eleventh returns HTTP 429 with positive `Retry-After` and `Cache-Control: no-store`. Confirm downloads resume after expiry.
- [ ] Verify `/api/health` and normal group-page reads remain available while write/export limits are exhausted.
- [ ] Verify a data-cap error in the UI using a small `MAX_GROUPS` value against the disposable database; confirm existing groups remain accessible. Other cap boundaries are covered by automated service tests with small custom limits.
- [ ] Repeat the local Docker build and basic health/write/export checks with the final implementation before release.

No browser rate-limit demonstration or live HTTP rate-limit check was run by the agent; the action/route results above come from automated tests.

## Outstanding deployment verification and work

- A live browser test at the UTC/Japan date boundary, including the date reset after success, has not been reported. Automated timezone/state tests do not replace that check.
- Railway volume attachment, environment variables, region, custom-domain DNS, and HTTPS have not been verified on the live service.
- Railway restart/redeployment persistence, scheduled backups, and a manual restore drill remain pending. Local Docker volume persistence does not prove Railway volume configuration.
- Uptime monitoring, usage alerts, and public-edge client-IP verification remain pending.
- An off-platform online backup script remains optional and unimplemented; no `npm run backup` command exists.

The client-IP implementation follows [Railway's public networking specifications](https://docs.railway.com/networking/public-networking/specs-and-limits), reviewed during step 8: use `X-Real-IP` and do not infer an `X-Forwarded-For` hop. The deployment assumes direct access through Railway's public HTTP edge. Verify spoofed-header handling there before relying on per-IP enforcement; adding another proxy or ingress requires reassessment. The global group cap of 60 attempts/hour is a separate backstop.

Limiter instances are process-local and shared on `globalThis`; restart/redeploy resets them, and capacity eviction loses a key's history. The code is intended for one process and one instance, not durable quotas across workers. Group creation checks the IP allowance before the global allowance; globally rejected attempts still consume IP allowance.

See the [README deployment section](../README.md#deployment) for the current setup and the local [DEPLOY.md](../DEPLOY.md) for the full implementation and operations plan. DEPLOY.md is gitignored and may be absent in a fresh clone.
