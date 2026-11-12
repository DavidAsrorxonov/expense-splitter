# Expense Splitter

A shared expense tracker for housemates, trips, and groups of friends. Record who paid, choose who shares each expense, and see who owes whom.

Built with Next.js and SQLite, with raw SQL repositories, integer money calculations, and a responsive web interface. Part of [Ethevex](https://ethevex.com).

## Features

- **Shareable groups:** create a group with one currency and share its `/g/<groupId>` link. Supported currencies: JPY, USD, EUR, and UZS.
- **Expense tracking:** split an expense equally among selected members, with a payer, amount, date, and optional note. The payer does not have to be a participant.
- **Spending overview:** total spending, expense count, average expense, and teal charts for monthly spending and spending by payer. The expense table and expandable totals provide the underlying detail.
- **Balances and suggestions:** see who owes or is owed money and record suggested repayments.
- **Manual payments:** record partial payments or corrections, including payments involving archived members. Payment history shows 10 records per page.
- **Archiving:** archive expenses and members without deleting historical data. A member must have a settled balance before being archived.
- **Tabbed layout:** Expenses, Balances, Payments, and Members, with Add expense and Add member dialogs available at the top.
- **Custom controls:** shadcn selects and a calendar date picker, keyboard navigation, inline validation, and retained form input after errors.
- **Light and dark themes:** square controls, Space Grotesk and Space Mono typography, and a teal accent. Each fresh load starts in light mode; the chosen theme persists during client-side navigation.

There are no accounts or permissions: **anyone with a group link can view and edit that group**. The app records payments; it does not transfer money. The interactive interface requires JavaScript.

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

Use **Node.js 24.x** and npm. Node.js 22.x from **22.12.0** is also supported by the installed dependencies. Run commands from the project root.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), create a group, and add members and expenses. No external database service or API keys are required.

The app creates `data/app.db` and applies migrations on its first database access. You do not need to seed the database or run migrations manually to get started.

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

The query-plan script expects a migrated database containing at least one group. After creating the demo database above, run:

```bash
DATABASE_PATH=data/demo.db npm run plans
```

See [docs/query-plans.md](docs/query-plans.md) for the recorded query plans.

## Development checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Tests cover database constraints, repositories, splitting and settlement calculations, service transactions, form validation, presentation helpers, date parsing, pagination, and chart data. Database tests use fresh in-memory SQLite databases.

Browser checks should include:

- Creating a group, adding members, and adding expenses with different payers and participants.
- Recording suggested and manual payments, then reversing an entry with an equal payment in the opposite direction.
- Archiving an expense, archiving a settled member, and rejecting an archive when a member still has a balance.
- Invalid submissions retaining input and showing useful errors.
- Tabs, dialogs, selects, the calendar, charts, and pagination with keyboard navigation and on mobile, in both themes.
- Reloading the group and restarting the server to confirm data persists.

## Project structure

```text
src/
  app/             Routes, shared layout, and Server Actions
  components/      Group interface, forms, charts, layout, and UI primitives
  lib/             UI validation, form parsing, presentation helpers, and DB access wrapper
  domain/          Pure money, split, and suggested-transfer calculations
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

## Production

```bash
npm run build
DATABASE_PATH=/absolute/path/to/persistent/expenses.db npm start
```

Use a Node.js runtime with writable, persistent storage for SQLite. The application is not a static export, and an ephemeral filesystem will not preserve the database across deployments. Keep `src/db/migrations/` available and launch from the project root, because migrations are resolved relative to the working directory.

The build uses `next/font/google` for Space Grotesk and Space Mono and needs access to download those fonts. The current production build reports filesystem-tracing warnings from the migration runner; these can increase the amount of source included in the server output.

## Current scope

- Each group uses one currency; there is no currency conversion.
- Splits are equal among the chosen participants; custom split amounts are not available.
- Settlements are append-only. Correct an entry by recording the same amount in the opposite direction.
- Archived data is retained, but restore controls are not yet available.
- Expense editing, search, CSV export, authentication, and payment processing are not implemented.
- The initial expense date comes from the server's local date.
