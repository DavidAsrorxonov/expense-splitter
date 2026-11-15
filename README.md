# Expense Splitter

A shared expense tracker for housemates, trips, and groups of friends. Record who paid, choose who shares each expense, and see who owes whom.

Built with Next.js and SQLite, with raw SQL repositories, integer money calculations, and a responsive web interface. Part of [Ethevex](https://ethevex.com).

## Features

- **Shareable groups:** create a group with one currency and share its `/g/<groupId>` link. Supported currencies: JPY, USD, EUR, and UZS.
- **Expense tracking:** split an expense equally among selected members, with a payer, amount, date, and optional note. The payer does not have to be a participant.
- **Spending overview:** total spending, expense count, average expense, and teal charts for monthly spending and spending by payer. The expense table and expandable totals provide the underlying detail.
- **Balances and suggestions:** see who owes or is owed money and record suggested repayments.
- **Manual payments:** record partial payments or corrections, including payments involving archived members. Payment history shows 10 records per page.
- **Search:** SQLite FTS5 searches active expense notes, ranked by relevance, after one second without typing. Search/Enter submits immediately; clearing resets immediately. Charts continue to show all active spending.
- **Archiving and restore:** archive expenses and members without deleting history, show archived records, and restore them. A member must have a settled balance to be archived; restoring a member rejects an active member with the same name. Restoring an expense can update balances for archived members.
- **CSV download:** export expenses and each member's share, optionally including archived expenses. Downloads use exact currency decimals and spreadsheet-friendly CSV formatting. Search does not filter the export.
- **Tabbed layout:** Expenses, Balances, Payments, and Members, with Add expense and Add member dialogs available at the top.
- **Custom controls:** shadcn selects and a calendar date picker, keyboard navigation, inline validation, and retained form input after errors.
- **Light and dark themes:** square controls, Space Grotesk and Space Mono typography, and a teal accent. Each fresh load starts in light mode; the chosen theme persists during client-side navigation.

There are no accounts or permissions: **anyone with a group link can view and edit that group**. The app records payments; it does not transfer money. Custom selects, the date picker, add dialogs, and chart interactions require JavaScript. Without JavaScript, group sections are stacked with anchor navigation; search submission, archived visibility, restore forms, and CSV downloads remain available.

### Search, archived records, and exports

Search matches prefixes in expense notes, ignoring case and accents, and shows up to 50 results. Multiple search terms must all match. The URL stores the query as `q`, so a filtered view can be reloaded or shared. Search covers active expenses only.

Show archived / Hide archived controls in Expenses and Members share the `archived=1` URL flag. Archived sections show all archived records independently of search. Restoring an expense keeps its original payer and shares, even if those members are archived.

The Export CSV link downloads all active expenses by default, or active and archived expenses when Show archived is enabled. Columns are Date, Note, Paid by, Amount, Status, then one share column per member. Rows are oldest first; non-participants have blank shares, while zero shares are explicitly formatted. Archived member labels include `(archived)`. The file includes a UTF-8 BOM, CRLF line endings, CSV quoting, and a leading apostrophe on potentially formula-like notes and names. Amounts have no currency symbols or thousands separators and use the group's decimal precision.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Rendering and writes | Server Components and Server Actions |
| Database | SQLite through `better-sqlite3`, with raw SQL and numbered migrations |
| Validation | Zod |
| Styling and controls | Tailwind CSS 4, shadcn/ui, Base UI, Lucide |
| Charts | shadcn charts and Recharts |
| Date picker | React DayPicker and date-fns |
| Tests | Vitest, including in-memory SQLite integration tests |

## Local setup

Use **Node.js 22.x, version 22.12.0 or newer**, and npm, matching `package.json` and the Docker image's Node major. Run commands from the project root.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), create a group, and add members and expenses. No external database service or API keys are required.

The app creates `data/app.db` and applies migrations on its first database access. You do not need to seed the database or run migrations manually to get started.

In production, application database access requires an explicit, nonblank `DATABASE_PATH`; development keeps the default above. The selected path is logged once on first use. Setting a path does not verify that it is on persistent storage.

### Database location

Set `DATABASE_PATH` to choose a different SQLite file:

```bash
DATABASE_PATH=data/local.db npm run dev
```

Next.js can also read this setting from `.env.local`:

```dotenv
DATABASE_PATH=data/local.db
```

The standalone seed and query-plan scripts read the process environment directly. Pass `DATABASE_PATH` inline or export it in your shell when running those scripts; they do not automatically load `.env.local`.

SQLite files under `data/`, including their WAL and shared-memory sidecars, are ignored by Git.

### Sample data

**The seed script deletes and recreates its target database, including its WAL and shared-memory files. Without `DATABASE_PATH`, that target is `data/app.db`. Use a separate disposable database, and stop any app process using that file before reseeding.**

The script refuses to run when `NODE_ENV=production`, before modifying any database files. This guards against accidental use; it does not protect against someone overriding the environment.

```bash
DATABASE_PATH=data/demo.db npm run seed
DATABASE_PATH=data/demo.db npm run dev
```

The seed command prints a group ID. Open `/g/<printed-group-id>` to view the sample Housemates group with Alice, Bob, and Carol, expenses across two months, and a recorded payment.

Expected balances:

| Member | Balance |
| --- | --- |
| Alice | Owes ¥34 |
| Bob | Is owed ¥3,067 |
| Carol | Owes ¥3,033 |

To return to your normal database, stop the demo server and start the app with your usual `DATABASE_PATH` setting.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve a completed production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm test` | Run the Vitest suite |
| `npm run seed` | Replace the configured database with sample data |
| `npm run plans` | Inspect SQLite query plans and rewrite `docs/query-plans.md` |

The query-plan script expects a migrated database containing at least one group. Use a separate, unused scratch file for both commands below; **seed replaces that file**, so do not point it at your working database:

```bash
DATABASE_PATH=data/phase4-check.db npm run seed
DATABASE_PATH=data/phase4-check.db npm run plans
```

See [docs/query-plans.md](docs/query-plans.md) for the recorded plans, including FTS search, archived expenses, and group splits. The small seed dataset verifies query access paths; it is not a production performance benchmark.

## Development checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Tests cover database constraints, repositories, splitting and settlement calculations, service transactions, form validation, presentation helpers, date parsing, pagination, and chart data. Phase 4 coverage includes FTS synchronization and migration backfill, ranked search, restore rules and balances, exact decimal serialization, CSV escaping and round trips, export responses, URL state, debounce timing, and server-rendered UI fallbacks. Database tests use fresh in-memory SQLite databases or isolated temporary databases for migration checks.

Browser checks should include:

- Creating a group, adding members, and adding expenses with different payers and participants.
- Recording suggested and manual payments, then reversing an entry with an equal payment in the opposite direction.
- Archiving an expense, archiving a settled member, and rejecting an archive when a member still has a balance.
- Searching while typing, submitting immediately, clearing, and checking no-match states; charts should retain overall active spending.
- Showing archived records, restoring expenses and members, and checking a restore blocked by an active member with the same name.
- Downloading CSV with and without archived expenses, including while a search is active.
- Invalid submissions retaining input and showing useful errors.
- Tabs, dialogs, selects, the calendar, charts, and pagination with keyboard navigation and on mobile, in both themes.
- Native search submission, archived visibility, restore, and CSV links with JavaScript disabled.
- Reloading the group and restarting the server to confirm data persists.

## Project structure

```text
src/
  app/             Routes, CSV export handler, shared layout, and Server Actions
  components/      Group interface, forms, charts, layout, and UI primitives
  lib/             UI validation, form parsing, presentation helpers, and DB access wrapper
  domain/          Pure money, split, transfer, search-query, and CSV helpers
  services/        Business rules and transaction boundaries
  repos/           SQL queries and row mapping
  db/              SQLite connection, migration runner, and migration files
  types.ts         Shared data types
scripts/           Sample-data and query-plan utilities
tests/             Unit and SQLite integration tests
docs/              Query-plan documentation
```

The dependency flow is **UI → services → domain/repositories → database**. UI code accesses the database through services. Application queries live in repositories; the database layer handles connection configuration and migration bookkeeping. No ORM is used.

Money is stored as integer minor units: yen for JPY and hundredths for USD, EUR, and UZS. Equal splits distribute any remainder deterministically by member ID. The SQLite balance view accounts for active expenses, expense shares, and recorded payments.

Connections enable foreign keys, WAL mode, and a busy timeout. Migrations are numbered SQL files in `src/db/migrations/`, tracked with SQLite's `user_version`. Add a new migration for schema changes instead of editing an applied one.

Migration `002_expenses_fts.sql` adds an external-content FTS5 index over expense notes, synchronization triggers, and a rebuild for existing expenses. Archived expenses remain indexed and are filtered at query time. Existing databases migrate on their next application database access; there is no need to reseed them.

## Project documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): layers, schema, business rules, flows, and build phases.
- [DESIGN.md](DESIGN.md): visual rules, responsive layout, controls, and accessibility.
- [PHASE3.md](PHASE3.md): original web UI implementation specification.
- [PHASE4.md](PHASE4.md): search, archive/restore, CSV export, and closeout specification.
- [DEPLOY.md](DEPLOY.md): deployment implementation plan and Railway/DNS operations guide.
- [Query plans](docs/query-plans.md): recorded SQLite access paths and explanations.
- [Deployment verification](docs/deployment-checks.md): automated results, owner-reported Docker checks, and outstanding deployment checks.

The five root specification files are currently excluded by `.gitignore` and may be absent from a fresh clone. They are local project references; the README and reports under `docs/` are tracked.

## Deployment

The deployment target is one Railway service in Singapore, with **exactly one instance** and a persistent volume mounted at `/data`. The root `Dockerfile` builds the app using Node 22 on Debian, retains dependencies and `src/db/migrations/`, and starts it with `npm start`. `.dockerignore` keeps local database files, environment files, dependencies, and build output out of the image.

`railway.json` selects the Dockerfile builder, one replica, `/api/health` with a 120-second startup healthcheck timeout, and restart-on-failure with up to five retries. This configuration does not create the volume, configure DNS, or enable backups; those are owner setup tasks. Local container verification has passed; a live Railway deployment has not yet been verified. Data caps and rate limiting remain to be implemented before completing the deployment plan.

### Environment

| Variable | Configuration | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | Set to `/data/app.db` in Railway | Required on production database access; the `/data` volume must actually be attached |
| `NODE_ENV` | `production`, set by the Dockerfile | Enables production behavior and blocks the seed script |
| `NEXT_TELEMETRY_DISABLED` | `1`, set by the Dockerfile | Disables Next.js telemetry |
| `PORT` | Supplied by Railway | Read by `next start`; do not hardcode it in the image |

`MAX_GROUPS` belongs to the upcoming data-limits work and is not read by the application yet. The current image runs as root for mounted-volume write access; no `RAILWAY_RUN_UID` override is needed for this image.

For production outside Docker, build and start from the project root:

```bash
npm run build
DATABASE_PATH=/absolute/path/to/persistent/expenses.db npm start
```

Use a Node.js runtime with writable, persistent storage for SQLite. The application is not a static export, and an ephemeral filesystem will not preserve the database across deployments. Keep `src/db/migrations/` available and launch from the project root, because migrations are resolved relative to the working directory.

`GET /api/health` opens the application database, applies pending migrations on first access, and checks database connectivity. It returns HTTP 200 with `{"status":"ok","schemaVersion":N}`, or HTTP 503 with `{"status":"error"}` for configuration, initialization, or query failures. Responses use `Cache-Control: no-store`; initialization error details are logged only on the server. This endpoint does not verify the storage mount or perform a full database integrity check.

The build uses `next/font/google` for Space Grotesk and Space Mono and needs access to download those fonts. The current production build reports filesystem-tracing warnings from the migration runner; these can increase the amount of source included in the server output.

Responses include MIME-sniffing and framing protection, a referrer policy, camera/microphone/geolocation restrictions, and one-year HSTS without `includeSubDomains` or `preload`. Group pages and CSV exports use `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow, noarchive`. `/robots.txt` disallows `/api/` but allows group URLs so crawlers can read their `noindex` header. These policies do not add authentication: anyone with a group link can still access it.

### Backups and release procedure

Enable daily and weekly volume backups in Railway, and take a manual backup before deploying a new migration. Migrations run on first database access, normally the startup healthcheck. Rolling back application code does not roll back the schema.

Before sharing the live app, verify that records survive a restart and redeployment, then perform a restore drill with disposable data. Railway restores stage a change that must be deployed to take effect; verify health and a known group afterward. See [Railway's backup guide](https://docs.railway.com/volumes/backups) and Parts B–E of the local `DEPLOY.md` for setup and operations.

An application backup script is not implemented. A future off-platform copy should use SQLite's online backup API; do not copy only a live `app.db` while it is using WAL mode. CSV exports contain expenses and shares, not the complete database, and are not a substitute for a database backup.

## Current scope

- Each group uses one currency; there is no currency conversion.
- Splits are equal among the chosen participants; custom split amounts are not available.
- Settlements are append-only. Correct an entry by recording the same amount in the opposite direction.
- Expense editing, custom splits, authentication, and payment processing are not implemented.
- Same-group integrity triggers and an online backup script remain optional, unimplemented extras. Same-group checks are enforced by services.
- The expense date starts with a server value for hydration, then defaults to the browser's local date. Successful saves reset it to the current local date; edited dates and failed submissions retain their values.
