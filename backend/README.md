# NawaHub — Backend

The NawaHub API: a multi-module CRM + ERP for sales, finance, procurement and
project teams. Built with **NestJS 11**, **Prisma 7** (PostgreSQL via the
`pg` driver adapter) and a permission-based RBAC layer, deployable to a Node
server or to **Vercel** serverless functions.

> Full HTTP endpoint reference: **[API.md](./API.md)**.

---

## Features

| Area | Modules | Highlights |
|------|---------|------------|
| **CRM** | Customers, Leads, Deals, Activities, Notes, Timeline | Pipeline stages, lead → customer conversion, polymorphic notes/activities, per-record audit timeline |
| **Sales** | Quotes, Sales Orders, Invoices, Payments | Quote → Sales Order → Invoice flow, multi-line documents, partial payments, approval chains |
| **Procurement** | Suppliers, Purchase Orders, Vendor Bills | PO → Bill flow, vendor payments, approvals |
| **Inventory** | Products, Stock Items, Stock Movements | On-hand quantities, reorder levels, append-only movement ledger |
| **Finance** | Accounts, Tax Rates, Exchange Rates, Expense Reports | Multi-currency with base-currency consolidation, cash/bank accounts, expense approvals |
| **Projects** | Projects, Milestones, Members, Tasks | Budgets, milestones, membership, linked invoices/expenses/tasks |
| **Platform** | Auth, Users, Roles, Settings, Notifications, Search, Reports, Logs | JWT auth + rotating refresh tokens, granular permissions, workspace config, custom fields, saved views, full-text search, audit logs |
| **Integrations** | API Keys, Public API, Emails, AI, Attachments, Import/Bulk/Dedup | Public REST API via hashed keys, tracked outbound email, AI summarize/score, CSV import, bulk ops, duplicate detection |

---

## Tech stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS 11 (Express adapter)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (Prisma 7 moved the connection URL
  out of `schema.prisma`; the runtime client builds the adapter from
  `DATABASE_URL` in [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts),
  while the CLI reads it from [prisma.config.ts](prisma.config.ts)).
- **Database:** PostgreSQL (Supabase-friendly — use the pooled URL at runtime,
  the direct URL for migrations).
- **Auth:** Passport JWT access tokens + rotating refresh tokens (only SHA-256
  hashes are stored), delivered as an httpOnly cookie.
- **Cross-cutting:** pino logging, Sentry, `@nestjs/throttler` rate limiting,
  `@nestjs/schedule` cron, Helmet, class-validator DTOs.
- **Docs/PDF/email:** puppeteer + pug templates for invoice PDFs, nodemailer
  with a durable `EmailOutbox` retry queue.

---

## Getting started

### Prerequisites
- Node.js 20+
- A PostgreSQL database (local, or Supabase)

### 1. Install
```bash
npm install
```
`postinstall` runs `prisma generate` automatically.

### 2. Configure environment
Copy the example and fill in real values:
```bash
cp .env.example .env
```
Key variables (see [.env.example](.env.example) for the full list):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string used at runtime and by the CLI. For Supabase use the **pooled** URL (`:6543`). |
| `DIRECT_URL` | Optional direct/session URL for Prisma migrations when `DATABASE_URL` is a transaction pooler. |
| `JWT_SECRET` | Secret used to sign access tokens. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `FRONTEND_URL` / `CORS_ORIGINS` | Allowed CORS origin(s) for the SPA. |
| `APP_URL` | Public frontend URL used in email links. |
| `PORT` | Port the API listens on (default 3000). |
| `SENTRY_DSN` | Optional error tracking. |
| `CRON_SECRET` | Bearer secret protecting the internal cron endpoint. |
| `SMTP_*` | Optional SMTP transport for outbound email. |
| `UPLOAD_DIR` | Attachment storage dir (use object storage on serverless). |

> **⚠️ Connection-string gotcha:** any special characters in the DB password
> must be **percent-encoded** (`?`→`%3F`, `+`→`%2B`, `@`→`%40`, `#`→`%23`,
> `/`→`%2F`, space→`%20`). An unencoded `?` or `@` truncates the URL and the
> adapter throws `Invalid URL` / `Can't reach database server`.

### 3. Migrate the database
```bash
npm run db:migrate     # prisma migrate dev (development)
```

### 4. Seed sample data (optional)
```bash
npm run seed           # roles, demo users, and sample records across every module
```
Demo accounts (password **`Nawa@123`**):

| Email | Role |
|-------|------|
| `superadmin@nawahub.com` | Super Admin (all permissions) |
| `admin@nawahub.com` | Admin |
| `manager@nawahub.com` | Manager |
| `sales@nawahub.com` | Sales Rep |
| `viewer@nawahub.com` | Viewer (read-only) |

### 5. Run
```bash
npm run dev            # watch mode
# or
npm run build && npm start
```
The API is served under the global prefix **`/api`** (e.g. `http://localhost:3000/api/auth/signin`).

---

## Sample data

Demo data is centralised in
[src/sample-data/sample-data.builder.ts](src/sample-data/sample-data.builder.ts)
— the single source of truth shared by the CLI and the in-app UI, so they never
drift apart.

- **CLI:** `npm run seed` (load) and `npm run seed:clear` (remove).
- **In-app:** Admins (with `settings:manage`) get **Load Sample Data** and
  **Clear Sample Data** buttons under **Settings → Danger Zone**, backed by
  `POST /api/settings/sample-data/load` and `/clear`.

How it stays safe:
- Every sample record's id is prefixed with **`smpl-`**. Clearing deletes
  exactly those rows (child rows cascade), so **your own data is never touched**.
- All writes are idempotent upserts — re-running never duplicates.
- `WorkspaceConfig` and `NumberSequence` counters are only created when missing,
  so loading sample data into a live workspace won't clobber real configuration.

---

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start in watch mode |
| `npm run build` | `prisma generate` + `nest build` |
| `npm start` | Run the compiled server |
| `npm run seed` | Load roles, demo users and sample data |
| `npm run seed:clear` | Remove all seeded sample data |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:seed` | `prisma db seed` (same as `seed`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | ESLint |
| `npm test` / `test:watch` / `test:cov` | Jest unit tests |

---

## Architecture

```
index.ts                  Vercel serverless handler (boots Nest on first request)
src/
  main.ts                 Standalone bootstrap (node server)
  app.module.ts           Root module — wires every feature module
  config/                 Env loading + validation
  common/                 Cross-cutting: request context, logging, Sentry,
                          workspace config, visibility, soft-delete helpers
  prisma/                 PrismaService (driver adapter) + updatedBy auto-stamp
  auth/                   JWT strategy, guards, RequirePermission decorator
  <feature>/              One folder per module: controller + service (+ dto)
  sample-data/            Shared seed/clear builder + admin endpoints
utils/                    CLI scripts (seed, unseed, migrations)
prisma/                   schema.prisma + migrations
```

Conventions worth knowing:
- **Soft deletes:** aggregate models carry `deletedAt`; services filter
  `deletedAt: null`. "Delete" sets the timestamp rather than removing the row.
- **Auto audit:** the extended Prisma client stamps `updatedById` on every write
  to models that have it (see [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts)).
- **Permissions:** controllers use `@RequirePermission('module:action')` with the
  `PermissionGuard`; the super-admin wildcard `*` grants everything.
- **Configurable enums:** status/priority/type fields are plain `String` columns
  (not DB enums) so their options are editable at **Settings → Fields**.

---

## Deployment (Vercel)

- The serverless entrypoint is [index.ts](index.ts); routing and the cron job are
  configured in [vercel.json](vercel.json).
- Set every environment variable in the Vercel project (Production + Preview).
  **Environment variables are snapshotted when a deployment is created** —
  after changing one you must **redeploy** for it to take effect.
- Use the Supabase **pooled** connection URL (`:6543`, `?pgbouncer=true`) at
  runtime; serverless functions open many short-lived connections.
- A daily cron hits `POST /api/internal/cron/run` (guarded by `CRON_SECRET`) to
  sweep overdue documents and flush the email outbox.
