# NawaHub — Documentation

NawaHub is an all-in-one business operations platform: **CRM** (leads, contacts,
deals, pipeline) plus **Finance** (quotes, invoices, payments), **Procurement**
(suppliers, purchase orders, vendor bills), **Project management** (projects,
milestones, tasks), **Inventory**, multi-step **Approvals**, multi-currency, RBAC
with hierarchical visibility, audit logging, notifications, global search,
dashboards, and a key-authenticated **public REST API**. Arabic (RTL) + 6 other
languages.

- API reference: [API.md](./API.md)
- Public API guide: [../backend/PUBLIC_API.md](../backend/PUBLIC_API.md)

---

## 1. Tech stack

| Layer | Tech |
|-------|------|
| Backend | NestJS 11, TypeScript, Express |
| ORM / DB | Prisma 7 (driver adapter `@prisma/adapter-pg`) + PostgreSQL |
| Auth | Passport JWT (access) + rotating refresh tokens (httpOnly cookie) |
| Jobs | `@nestjs/schedule` (cron) + durable email outbox |
| Frontend | React 18, Vite, TypeScript, Tailwind 4 |
| Data/state | TanStack Query, React Hook Form, Zod |
| UI | Radix UI, lucide-react, Recharts, dnd-kit |
| Errors | Sentry (optional) |

---

## 2. Repository layout

```
backend/
  src/
    auth/            JWT + API-key guards, permission guard, decorators
    customers/ leads/ deals/        CRM
    finance/         quotes + invoices + payments
    procurement/     suppliers + purchase-orders + vendor-bills
    projects/ tasks/ activities/ notes/   delivery & collaboration
    products/ inventory/             catalog & stock
    accounts/ reports/ summary/ search/   finance accounts, analytics, search
    import/ dedup/ bulk/ saved-views/     data tooling (Stage 1)
    api-keys/ public-api/            public REST API
    settings/ roles/ users/ logs/    administration
    notifications/ scheduler/ timeline/ attachments/ approvals/
    common/          cross-cutting services (visibility, currency, approval,
                     workspace-config, customFields, clean-data, serialize)
    prisma/          PrismaService
  prisma/schema.prisma
  utils/seed.ts      master seed (roles → users → sample data)
frontend/
  src/
    components/      feature UIs + common/ (GenericTable, dialogs) + ui/ (Radix)
    pages/           routes incl. settings/
    contexts/        auth, language (i18n), theme, modules, sidebar
    hooks/ utils/api.tsx   API client
    i18n/translations.ts   en + ar (others fall back to en)
    config/permissions.ts  Permission registry/types
```

---

## 3. Architecture & cross-cutting concerns

### Authentication
- `POST /api/auth/signin` returns a short-lived **access token** (JWT) + sets a
  rotating **refresh token** in an httpOnly, SameSite=Strict cookie scoped to
  `/api/auth`. `POST /api/auth/refresh` rotates it; `POST /api/auth/logout`
  revokes it.
- `JwtStrategy.validate` re-reads role/permissions/active **from the DB on every
  request**, so role changes and deactivations take effect immediately.
- The frontend keeps the access token in memory and transparently refreshes on
  401 (`frontend/src/utils/api.tsx`).

### Authorization (RBAC + visibility)
- Routes are guarded by `JwtAuthGuard` + `PermissionGuard`; handlers declare
  `@RequirePermission('resource:action')`.
- Permissions follow `resource:action[:scope]`. A scoped permission
  (`deals:view:own`) satisfies the broader requirement (`deals:view`); the
  service then narrows results. `*` = all permissions (super admin).
- `VisibilityService` (`common/visibility.service.ts`) resolves a user's scope
  (`own` / `team` / `all`) and returns a Prisma `where` fragment. `team` uses a
  recursive CTE over the `User.reportsTo` tree (one round trip, any depth).
- **Every list/read/bulk/merge/import/public path runs through
  `VisibilityService`** — the central rule for not leaking scoped data.

### Approvals
- `common/approval.service.ts` generates ordered approval steps from the
  workspace approval config when an entity is submitted (Quote, Invoice,
  ExpenseReport, PurchaseOrder, VendorBill). Approved only when all steps pass;
  creators can't approve their own docs.

### Multi-currency
- `common/currency.service.ts` + `ExchangeRate` rows convert figures to the
  workspace `baseCurrency` (default EGP) for aggregated reports.

### Workspace config (singleton, cached)
- `common/workspace-config.service.ts` caches the single `WorkspaceConfig` row
  (60s TTL). Holds approvals, **custom field groups**, pipeline stages, module
  toggles, invoice defaults, password policy, base currency/locale.
- Custom fields are stored per entity in a `customFields` JSON column (Customer,
  Deal, Product) keyed by field id; filtered via `cf_<id>` query params.

### Notifications & jobs
- In-app + email notifications via `notifications/notification-dispatcher.ts`
  with per-user preferences. Email uses a durable `EmailOutbox` drained by the
  scheduler with retry/backoff. Cron also sweeps overdue invoices/bills.
  Serverless trigger: `POST /api/internal/cron/run` (bearer `CRON_SECRET`).

### Audit
- `TimelineService` writes per-record event history; `LoggingInterceptor`
  persists an access `Log` for each request.

### Soft deletes
- Aggregate roots carry `deletedAt`; all queries filter `deletedAt: null`.

---

## 4. Data tooling (Stage 1)

| Feature | Module | Notes |
|---------|--------|-------|
| **Bulk CSV import** | `import/` | Upload → preview → column mapping (incl. custom fields) → per-row create **through the domain services**, so validation/dedup/timeline all apply; per-row error report. `GET /import/:entity/fields`, `POST /import/:entity`. Entities: customers, leads, deals. |
| **Dedup + merge** | `dedup/` | Groups by normalized phone/email; merge reassigns child records (deals/quotes/invoices/projects + polymorphic activities/notes/timeline/attachments) onto the survivor and soft-deletes the rest, in one transaction. customers, leads. |
| **Bulk actions** | `bulk/` | `delete` (reuses each service's `remove()` so guards/cascades apply), `assignOwner`, `setStatus`; all scope-checked. customers, leads, deals. |
| **Saved views** | `saved-views/` | Per-user named presets of a list's query string (search+filters+sort). |
| **Public API + keys** | `public-api/`, `api-keys/` | `x-api-key` → acts as the owning user, reusing PermissionGuard + visibility. SHA-256 hashed; shown once. See [API.md](./API.md) + [PUBLIC_API.md](../backend/PUBLIC_API.md). |

Frontend integration: all four list-tooling features are wired through the shared
`components/common/GenericTable.tsx` (`importConfig`, `dedupConfig`,
`bulkConfig`, and saved-views via the `module` prop). API keys are managed in
**Settings → API Keys**.

---

## 5. Setup & run

```bash
# Backend
cd backend
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, FRONTEND_URL, …
npm install
npx prisma migrate dev        # apply schema
npm run seed                  # roles + users + sample data (password: Nawa@123)
npm run dev                   # http://localhost:3000  (global prefix /api)

# Frontend
cd ../frontend
npm install
# set VITE_API_URL (e.g. http://localhost:3000/api)
npm run dev
```

### Seed accounts (`npm run seed`, password `Nawa@123`)
| Email | Role |
|-------|------|
| superadmin@nawahub.com | super admin (`*`) |
| admin@nawahub.com | admin |
| manager@nawahub.com | manager |
| sales@nawahub.com | sales rep |
| viewer@nawahub.com | viewer |

The seed (`backend/utils/seed.ts`) populates every module — CRM, finance,
procurement, projects, inventory, accounts, tax/exchange rates, number
sequences, custom fields, pipeline stages — plus intentional duplicates for
testing dedup.

---

## 6. Conventions

- **Backend**: feature module = `*.module.ts` + `*.controller.ts` + `*.service.ts`
  (+ `dto/`). Reuse `cleanData`, `toClient` (serialize), `paginate`,
  `buildCfConditions`, and inject `VisibilityService` for any scoped read.
- **Frontend**: list pages render through `GenericTable`; reference files as
  `path:line`. i18n keys live in `i18n/translations.ts` (en + ar; fr/es/de/tr/zh
  currently alias en). New Stage-1 dialog copy is English pending translation.
- **Permissions**: add to `backend/utils/seed.ts` `ALL_PERMISSIONS` **and**
  `frontend/src/config/permissions.ts` together.
