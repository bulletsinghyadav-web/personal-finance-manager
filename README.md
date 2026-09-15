# Ledgerly — Personal Finance & Expense Management System

A full-stack personal finance application for tracking income, expenses, budgets,
accounts, and savings across multiple currencies, with a real PostgreSQL backend,
a React dashboard, and Chart.js visualizations.

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture overview](#architecture-overview)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started (local, no Docker)](#getting-started-local-no-docker)
- [Getting started (Docker Compose)](#getting-started-docker-compose)
- [Environment variables](#environment-variables)
- [Database & migrations](#database--migrations)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [API documentation](#api-documentation)
- [Security considerations](#security-considerations)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

## Features

- Email/password authentication with httpOnly cookies, refresh-token rotation,
  change password, forgot/reset password (with a safe dev mode), and account deletion.
- Accounts (cash, bank, savings, credit card, other) with computed current balances.
- Transactions: income, expense, and transfers (recorded as two linked, signed
  ledger entries so a transfer never counts as income or expense). Full CRUD,
  search, filter (type/category/account/date range), sort, and pagination.
- Categories with 15 seeded defaults per user, custom categories, and safe
  soft-delete (historical transactions keep their category for accurate reporting).
- Monthly budgets with an overall limit and optional per-category limits,
  utilization percentage, remaining amount, and over-budget/near-limit flags.
- Dashboard with total/monthly income, expenses, net savings, savings rate,
  recent transactions, top spending categories, and four Chart.js visualizations
  (income vs. expenses, category distribution, budget vs. actual, savings trend).
- Multi-currency support for INR, USD, EUR, GBP, CAD, AUD, JPY, with correct
  decimal precision (JPY has 0 decimals) and locale-correct formatting (including
  Indian digit grouping for INR). Amounts in different currencies are never summed
  directly; the dashboard converts to a selected display currency using stored or
  fallback exchange rates and clearly flags anything it could not convert.
- Light/dark mode, responsive layout (sidebar nav on desktop, drawer on mobile),
  skeleton loading states, empty states, and confirmation dialogs for deletions.

## Technology stack

**Frontend:** React 19, Vite, React Router, Axios, Chart.js + react-chartjs-2, Tailwind CSS.

**Backend:** Node.js, Express, PostgreSQL, `pg` (node-postgres) + `node-pg-migrate`,
JWT access tokens + opaque refresh tokens in httpOnly cookies, Zod validation,
bcrypt password hashing, Helmet, express-rate-limit, Swagger/OpenAPI.

**Testing:** Vitest + React Testing Library (frontend), Vitest + Supertest (backend
unit + integration), Playwright (e2e, test files included).

**Deployment:** Docker + Docker Compose for local/self-hosted use; deployable to
Vercel (frontend) and Render/Railway (backend) with a managed PostgreSQL database.

### A note on the ORM choice

The spec suggested Prisma. This project uses **`pg` + `node-pg-migrate`** instead,
with hand-written, reviewable SQL migrations, because Prisma's query-engine binary
download was not reliably available in the sandboxed environment this project was
built and tested in. `pg` + `node-pg-migrate` is a fully-supported, production-ready
choice with no native binary dependency, and every migration in `server/migrations`
is plain, auditable SQL-generation code. If you prefer Prisma, the schema in
`server/migrations` maps directly to a Prisma schema and can be introspected with
`prisma db pull` against a running database.

## Architecture overview

```
Browser (React SPA)
   │  fetch/axios, httpOnly cookies, credentials: include
   ▼
Express API (/api/v1/*)
   │  Zod validation → controllers → repositories (parameterized SQL)
   ▼
PostgreSQL (users, accounts, categories, transactions, budgets, exchange_rates, tokens)
```

- **Auth:** short-lived (15 min) JWT access token + opaque, hashed, rotating
  refresh token, both in httpOnly cookies. CSRF is mitigated with SameSite
  cookies, a strict CORS allowlist, and a required `X-Requested-With` header on
  all mutating requests (the axios client sets this automatically).
- **Authorization:** every query is scoped by `user_id` at the repository layer;
  cross-user access returns `404` (not `403`) to avoid confirming a resource's
  existence to a non-owner.
- **Money:** all monetary columns are `DECIMAL(18,2)` in PostgreSQL; all backend
  arithmetic goes through `decimal.js` (see `server/src/utils/money.js`) — never
  native floating point.
- **Transfers:** implemented as two rows sharing a `transfer_group_id`, tagged
  `transfer_direction = 'OUT' | 'IN'`, created inside a single DB transaction so
  both legs are atomic and consistent.

## Project structure

```
personal-finance-manager/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/ pages/ layouts/ hooks/ services/ context/ utils/ charts/ tests/
│   ├── Dockerfile  nginx.conf  vitest.config.js
├── server/                 # Express + PostgreSQL backend
│   ├── src/
│   │   ├── config/ controllers/ services/ routes/ middleware/ validators/ db/ utils/ docs/ seeds/ tests/
│   ├── migrations/         # node-pg-migrate SQL migrations (run in order)
│   ├── Dockerfile  vitest.config.js
├── e2e/                     # Playwright end-to-end tests (see Testing section)
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+ (or Docker, to run it in a container)
- (Optional) Docker + Docker Compose for the containerized workflow

## Getting started (local, no Docker)

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env: set DATABASE_URL / TEST_DATABASE_URL to your local Postgres,
# and set two long random JWT secrets.

# 3. Create the databases (adjust to your local Postgres setup)
createdb finance_dev
createdb finance_test

# 4. Run migrations
npm run migrate

# 5. (Optional) seed sample data — creates demo@example.com / DemoPass123
npm run seed

# 6. Start the backend (http://localhost:4000)
npm run dev:server

# 7. In a second terminal, start the frontend (http://localhost:5173)
npm run dev:client
```

Visit `http://localhost:5173`, register a new account, or log in with the seeded
demo user.

## Getting started (Docker Compose)

```bash
cp .env.example .env
# Edit .env: set real JWT secrets before doing anything beyond local testing.

docker compose up --build
```

This starts PostgreSQL, runs migrations once (`migrate` service), then starts the
API on `http://localhost:4000` and the frontend (built and served by nginx) on
`http://localhost:5173`. Run the seed script against the containerized database
with:

```bash
docker compose run --rm server node src/seeds/seed.js
```

Tear down (including the database volume) with `npm run docker:down`.

## Environment variables

See `server/.env.example` and `client/.env.example` for the full list with
comments. Key variables:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | PostgreSQL connection string |
| `TEST_DATABASE_URL` | server | Separate database used only by integration tests |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | server | Must be long, random, and different from each other |
| `CLIENT_ORIGIN` | server | Exact origin allowed by CORS; must match the frontend URL |
| `COOKIE_SECURE` | server | Set `true` in any deployment served over HTTPS |
| `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` | server | Leave blank for dev mode (reset links logged to server console, never returned in the API response) |
| `VITE_API_BASE_URL` | client | Base URL the frontend calls; never hardcode `localhost` in a deployed build |

## Database & migrations

Migrations live in `server/migrations/` and run in filename order via
`node-pg-migrate`. Commands:

```bash
npm run migrate            # apply all pending migrations (uses DATABASE_URL)
npm run migrate:down       # roll back the most recent migration
```

To run migrations against the test database instead:

```bash
DATABASE_URL=$TEST_DATABASE_URL npx node-pg-migrate up -m server/migrations
```

The schema includes: `users`, `refresh_tokens`, `password_reset_tokens`,
`accounts`, `categories`, `transactions`, `budgets`, `budget_categories`,
`exchange_rates` — with foreign keys, unique constraints (e.g. one budget per
user/month/year/currency, one category name per user/type), check constraints
(e.g. `amount > 0`), and indexes on the columns used for filtering
(`user_id`, `transaction_date`, `type`, `category_id`, `account_id`).

## Testing

### Backend (real PostgreSQL, no mocking)

```bash
cd server
npm test                 # unit tests: money math, password hashing, JWT (29 tests)
npm run test:integration # Supertest against a live Postgres test DB (38 tests)
```

The integration suite truncates all tables between tests and covers: full auth
flows (including no-user-enumeration on login/forgot-password and session
invalidation on password change), transaction CRUD/search/filter/sort/pagination,
transfers (balances and dashboard exclusion), budget utilization (including
recompute-on-delete), category soft-delete preserving history, and a dedicated
cross-user isolation suite (read/edit/delete/list all correctly scoped, 404 not 403).

### Frontend

```bash
cd client
npm test    # Vitest + React Testing Library, 27 tests
```

Covers currency/percent/date formatting utilities, login/register forms
(including validation error display and loading state), the transactions page
(loading, empty, error, and populated states, plus live search filtering), and
shared components (confirm dialog, empty state).

### End-to-end (Playwright)

Test files are in `e2e/tests/full-workflow.spec.js` and cover the full
requested workflow: register → log in → create account → income transaction →
expense transaction → verify dashboard → create budget → verify utilization →
edit transaction → verify dashboard updates → delete transaction → verify
dashboard updates again → log out → verify protected routes redirect → and a
second user verifying they cannot see the first user's data.

**These are written but not executed in this delivery.** The sandboxed build
environment used to produce this project only allows network access to a
fixed domain allowlist (npm, GitHub, PyPI, etc.) and does not include
Playwright's browser-binary CDN, so `npx playwright install` cannot download
Chromium here. To run them yourself:

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
# In separate terminals: run the backend and `npm run preview` (or `dev`) for the client
E2E_BASE_URL=http://localhost:5173 npx playwright test
```

### Full command summary

```bash
npm run test:all   # from repo root: backend unit + integration + frontend
```

## Production build

```bash
cd client && npm run build   # outputs client/dist, ready for any static host
cd server && NODE_ENV=production node src/server.js
```

The frontend build was verified to complete successfully in this delivery
(`vite build` → `dist/index.html`, `dist/assets/*`). The backend was verified to
start, pass its health checks, and serve real requests against PostgreSQL.

## Deployment

### Frontend (Vercel or any static host)

1. Set `VITE_API_BASE_URL` to your deployed backend's `/api/v1` URL as a build-time
   environment variable.
2. Build command: `npm run build`; output directory: `dist`.
3. Add a rewrite/fallback rule so all paths serve `index.html` (React Router uses
   client-side routing) — e.g. Vercel's default SPA fallback, or the `nginx.conf`
   included here if self-hosting.

### Backend (Render, Railway, or any Node host)

1. Provision a managed PostgreSQL database and copy its connection string into
   `DATABASE_URL`.
2. Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long random values),
   `CLIENT_ORIGIN` (your deployed frontend's exact origin), and `COOKIE_SECURE=true`.
3. Run migrations as a release/predeploy step: `node-pg-migrate up -m migrations`.
4. Start command: `node src/server.js`. Health check path: `/health` (process
   liveness) and `/health/db` (verifies the database connection).
5. Configure your platform's log drain to capture stdout — errors are logged
   there without leaking stack traces to API responses in production.

### PostgreSQL (managed)

1. Create a managed instance (e.g. Render Postgres, Railway Postgres, RDS, Neon).
2. Copy the connection string into `DATABASE_URL` on the backend service.
3. Apply migrations from a machine/CI job with network access to the database:
   `DATABASE_URL=... node-pg-migrate up -m migrations`.
4. Run `node src/seeds/seed.js` only in non-production environments — it inserts
   a fixed demo account and is not intended for production data.
5. Configure your provider's automated backups (most managed providers enable
   daily backups by default; verify retention meets your requirements).
6. Verify connectivity with `curl https://your-api/health/db`.

### Docker

`docker-compose.yml` at the repo root runs Postgres, a one-shot migration
service, the API, and the frontend (built and served by nginx) together for
local development or simple self-hosting. See the Docker Compose section above.

## API documentation

Interactive Swagger UI is served at `/api-docs` when the backend is running
(source: `server/src/docs/openapi.yaml`). It documents authentication, the
paginated/filterable transactions endpoint, budgets, and the dashboard summary
endpoint in detail; the remaining REST resources (accounts, categories,
currencies, reports) follow the same conventions and are implemented in
`server/src/routes/`.

All endpoints are under `/api/v1`. Every endpoint except `/auth/register`,
`/auth/login`, `/auth/refresh`, `/auth/forgot-password`, and `/auth/reset-password`
requires a valid session cookie. All mutating requests (`POST`/`PATCH`/`DELETE`)
require the `X-Requested-With: finance-app` header (set automatically by the
bundled frontend's API client).

## Security considerations

Implemented: bcrypt password hashing (never plaintext), httpOnly + SameSite
cookies, a CSRF-mitigation header check on all mutating requests, strict CORS
allowlist, Helmet security headers, rate limiting on auth endpoints (general
auth + a stricter login limiter), Zod validation on every input, parameterized
SQL throughout (no string-concatenated queries), per-user data scoping at the
repository layer (404 rather than 403 on cross-user access, to avoid confirming
existence), centralized error handling that never leaks stack traces in
production, and no user-enumeration on login or forgot-password responses.

**This project has not undergone a professional security audit and should not
be treated as production-hardened as-is.** Before any real deployment:
generate strong, unique JWT secrets; set `COOKIE_SECURE=true` behind HTTPS;
configure a real SMTP provider for password resets; review and tune rate
limits for your expected traffic; and consider adding structured audit logging
and a Web Application Firewall in front of the API.

## Known limitations

- **Exchange rates** ship with a small static fallback table (`server/src/db/exchangeRateRepo.js`)
  for demo/dev purposes and a `exchange_rates` table for storing real rates. No
  live exchange-rate provider is wired up by default — set `EXCHANGE_RATE_PROVIDER`
  and populate `exchange_rates` on a schedule for accurate real-world conversions.
- **Playwright e2e tests are written but not executed** in this delivery, for the
  environment reason explained in the Testing section above.
- **Not deployed to a live URL.** This delivery includes working, tested code,
  Docker configuration, and step-by-step deployment instructions, but was not
  actually deployed to Vercel/Render/a managed database as part of this session.
- The production frontend bundle is a single ~544 KB (174 KB gzipped) chunk;
  code-splitting (e.g. route-based `React.lazy`) would improve initial load time
  for a larger real-world deployment.

## Troubleshooting

- **`ECONNREFUSED` connecting to Postgres:** confirm PostgreSQL is running and
  `DATABASE_URL` matches its host/port/credentials.
- **CORS errors in the browser:** `CLIENT_ORIGIN` on the backend must exactly
  match the frontend's origin (including port and scheme).
- **`403 Missing CSRF protection header`:** any mutating request must include
  `X-Requested-With: finance-app`; the bundled axios client does this
  automatically, but a raw `curl`/Postman request needs the header added manually.
  This is unrelated to `.env`-configured secrets — it's a fixed application-level
  header requirement.
- **Login works but `/auth/me` returns 401 right after:** check that cookies are
  being sent (`withCredentials: true` on the client, matching `CLIENT_ORIGIN` and
  `COOKIE_SECURE` on the server) and that the browser isn't blocking third-party
  cookies if frontend and backend are on different domains without a shared
  parent domain.
- **Migrations fail with "type already exists":** you likely ran the same
  migration twice against a database that already has it; `node-pg-migrate`
  tracks applied migrations in a `pgmigrations` table — check it before
  re-running, and use `migrate:down` to roll back cleanly instead of manual SQL.
