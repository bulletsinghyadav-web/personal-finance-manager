# Final Testing & Debugging Report

All results below were produced by actually running the commands shown against
a live PostgreSQL 16 instance and the real application code in this session —
none are fabricated or assumed.

## Summary

| Suite | Tool | Result |
|---|---|---|
| Backend unit tests | Vitest | **29 / 29 passed** |
| Backend integration tests | Vitest + Supertest + live PostgreSQL | **38 / 38 passed** |
| Frontend component/unit tests | Vitest + React Testing Library | **27 / 27 passed** |
| Frontend production build | `vite build` | **Succeeded** |
| Backend startup & health checks | `node src/server.js` + curl | **Succeeded** |
| Manual end-to-end smoke test (curl, real DB) | curl against running server | **Succeeded** (see below) |
| Playwright e2e (8 tests, full workflow + isolation) | Playwright | **Written, listed/validated (8/8 parse correctly), not executed** — see "Not run" below |
| Docker builds | `docker build` | **Not executed** — see "Not run" below |

**Total automated tests executed and passing: 94** (29 + 38 + 27).

## Bugs found and fixed during this session

1. **Ambiguous `user_id`/`type` columns in transaction queries.** Once the
   transactions list query joined `accounts` and `categories` (both of which
   also have `user_id` and `type` columns), unqualified column references in
   the dynamic filter builder became ambiguous to PostgreSQL, causing the
   dashboard and filtered transaction list to fail with
   `column reference "user_id" is ambiguous`. Found by exercising the dashboard
   endpoint after creating real data, not by static review. **Fixed** by
   qualifying every filter column with the `t.` (transactions) alias in
   `server/src/db/transactionRepo.js`, and re-verified with a fresh live request.

2. **Transfer credit leg treated as an outflow.** The initial transfer
   implementation gave both legs of a transfer the same `TRANSFER` type with no
   way to distinguish the debit (source) leg from the credit (destination) leg,
   so the account-balance calculation subtracted the amount from *both*
   accounts — the destination account's balance went negative instead of
   increasing. Found by creating a real transfer between two accounts and
   checking both balances. **Fixed** with a new migration adding a
   `transfer_direction` (`OUT`/`IN`) enum column with a check constraint tying
   it to `type = 'TRANSFER'`, updating `createTransfer` to tag each leg, and
   updating the balance-calculation SQL in `accountRepo.js` accordingly.
   Re-verified: source account correctly decreased, destination correctly
   increased, and the dashboard correctly still excludes both legs from
   income/expense totals.

3. **Frontend Vitest failed with "React is not defined"** on every component
   test, because the automatic JSX runtime wasn't being applied under Vitest's
   esbuild transform by default. **Fixed** by adding `esbuild: { jsx: 'automatic' }`
   to `client/vitest.config.js`.

4. **Prisma could not be used as originally planned** — its query-engine binary
   download (`binaries.prisma.sh`) is not reachable from this sandboxed build
   environment's network allowlist. This was caught immediately at
   `prisma migrate dev` (a `403 Forbidden` on the checksum fetch) before any
   further work was built on top of it, and the project was switched to
   `pg` + `node-pg-migrate` (see README "A note on the ORM choice"). This is
   disclosed as a deliberate, necessary technology substitution, not a bug.

## What was verified manually beyond the automated suites

Using `curl` against the real running server and PostgreSQL database (not
mocked), the following were exercised end-to-end and produced correct results:

- Registration seeds exactly 15 default categories (5 income + 10 expense).
- Cookie-based session authentication persists across requests (`/auth/me`).
- Account creation, and account current-balance computation
  (`opening_balance + income − expense ± transfer legs`).
- Transaction creation (income and expense), dashboard totals, net savings,
  and savings-rate calculation (verified 68.75% for 80,000 income / 25,000
  expense) matched hand-calculated expected values.
- Budget creation, duplicate-budget rejection (409), and utilization
  percentage (verified 62.5% for 25,000 spent / 40,000 budget).
- Transfers: both legs linked by `transfer_group_id`, correct signed effect
  on both accounts' balances, and correctly excluded from income/expense
  dashboard totals.
- Cross-user isolation: a second authenticated user received `404 Not Found`
  (not `403`, to avoid confirming existence) when requesting another user's
  account by ID, and `401 Unauthorized` with no session at all.

## Not run in this delivery, and why

- **Playwright e2e tests** (`e2e/tests/full-workflow.spec.js`, 8 tests covering
  the full requested workflow plus a cross-user isolation check): the test
  file is syntactically valid and Playwright can list all 8 tests
  (`npx playwright test --list` succeeded), but running them requires
  downloading a Chromium binary from Playwright's CDN
  (`playwright-akamai.azureedge.net` / `playwright-verizon.azureedge.net`),
  which this sandboxed environment's network allowlist blocks (confirmed via
  a live `403 Host not in allowlist` error when attempting
  `npx playwright install chromium`). Run them yourself with the commands in
  the README's Testing section on a machine with normal internet access.
- **Docker image builds**: `docker` itself is not available as a runnable
  daemon inside this sandbox (no `docker` CLI/daemon present), so
  `docker compose up --build` could not be executed here. The Dockerfiles and
  `docker-compose.yml` were written to standard, common patterns (multi-stage
  Node builds, non-root user, health checks, nginx for the static frontend)
  and should be validated with `docker compose up --build` in an environment
  with Docker available before relying on them for a real deployment.
- **Actual deployment to Vercel/Render/a managed database**: not performed;
  this delivery provides tested code and step-by-step instructions, not a live
  deployed URL.

## Remaining limitations (see README for full list)

- No live exchange-rate provider is wired up by default (static fallback table
  only); real-world multi-currency conversion accuracy depends on populating
  the `exchange_rates` table from a real provider on a schedule.
- The production frontend JS bundle is a single ~544 KB chunk; route-based
  code-splitting was not implemented.
- This system has not had a professional security audit.
