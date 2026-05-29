# WanderHub — Enhancement & Modernization Plan

> Status: pre-production (no live data). Breaking schema/auth changes are cheap, so the
> foundation is rebuilt in one pass rather than via guarded incremental migrations.

## Decisions locked
- **Auth:** access token (short-lived) + rotating refresh token; `active`/permissions
  re-validated server-side on every request. Logout/deactivation revokes immediately.
- **Payments:** legacy deal-level `PartialPayment` is **removed**; all money standardizes
  on the `Invoice` / `InvoicePayment` model.
- **Feature priority:** 1) Lead management  2) Notifications  3) Reporting/analytics.
  (Documents/attachments deferred.)
- **Scale:** unknown → design for growth (real pagination everywhere, indexes,
  server-side aggregates, code-splitting) without premature infra (no Redis/queues yet,
  but dispatch behind interfaces so they can slot in later).

---

## Stage 1 — Foundation rebuild (one chunk; build → schema → integrity → authz)

### 1A. Unblock & secure
- Fix the broken build: restore/commit the missing `src/logs/` module
  (imported by `app.module.ts` and `common/logging.interceptor.ts`).
- Rotate `JWT_SECRET` + DB creds; `git rm --cached .env`; add `.env.example`.
- Remove public `/auth/signup`; user creation only via `users` module behind
  `JwtAuthGuard + @RequirePermission('users:create')`.
- Register `ThrottlerGuard` globally; throttle `/auth/*`.
- Generic auth errors (no user enumeration); stop leaking raw error messages.
- Remove hardcoded demo credentials from the login form.

### 1B. Validation
- DTO classes with `class-validator` for **every** controller.
- Stop spreading `...rest` into Prisma — explicit field mapping (kills mass-assignment
  of `approvalStatus`, `totalPaid`, `createdById`, `balance`, etc.).

### 1C. Schema rebuild (single migration baseline)
- DB-level `onDelete` rules replacing hand-rolled cascade deletes.
- Soft delete (`deletedAt`) on financial + core entities; lists exclude deleted.
- Finish polymorphic links: typed FKs for Quote/Invoice/Expense/Product on
  Activity/Note/Timeline (not just untyped string columns).
- Indexes on `Log(userId, timestamp)`, ownership/FK columns, and filter columns.
- Remove `PartialPayment` model + module + frontend usages; migrate the deal-payment
  concept onto invoices.
- Consistent currency defaults (resolve Deal/Workspace `EGP` vs Quote/Invoice `USD`).

### 1D. Money integrity
- Wrap all multi-step money ops in `prisma.$transaction`: `recordPayment`,
  `editPayment`, `deleteInvoicePayment`, `convertQuoteToInvoice`, item replace.
- Recompute `totalPaid` as `SUM(payments)` inside the txn (no read-modify-write).
- Fix quote→invoice double-conversion race (row lock inside txn, not TOCTOU).
- Wire `Account.balance` to move on payment create/edit/delete; use `exchangeRate`
  for cross-currency or block it.
- Approval separation of duties (creator ≠ approver); config by role ID, not name.

### 1E. Auth model (refresh tokens + server validation)
- Short-lived access token; rotating refresh token (httpOnly cookie preferred).
- `/auth/refresh` + `/auth/logout` (revoke); refresh-token store / token-version in DB.
- Guard re-checks `active` + current permissions per request.

### 1F. RBAC & data isolation
- Visibility scopes: `own` / `team (reportsTo subtree)` / `all` as scoped permissions.
- `reportsTo` subtree resolver (managers see reports' records).
- Apply ownership/team `where` to every `findAll`/`findOne` across modules.
- Reliable audit log: actor + before/after, log failures too.

### 1G. Tests
- Unit tests: `calcTotals`, payment math, status derivation, account balance,
  authorization scoping (rep/manager/admin). Fix `package.json` test script.

**DoD:** clean clone builds; auth has no trivial holes; concurrent payments keep totals
correct; reps/managers/admins each see exactly the right records; no endpoint accepts
unvalidated bodies.

---

## Stage 2 — Frontend UX (parallelizable with 1F/1G)
- Single brand name (WanderHub) everywhere.
- Catch-all `*` 404 route.
- Responsive tables: stacked/card view on mobile (stop hiding columns).
- Finish i18n in `GenericTable` (filters, placeholders, empty/error copy) + RTL QA pass.
- A11y: `aria-sort`/keyboard on sortable headers, `role="tablist"` on status tabs,
  non-color status cues.
- Route-level code splitting (`React.lazy` + Suspense).
- Nest settings inside the app shell instead of a separate full-screen layout.
- Login error states (network vs credentials vs blocked).

---

## Stage 3 — CRM features (in priority order)
1. **Lead management** — leads separate from customers; dedup on phone/email before the
   unique constraint; lead→customer conversion funnel.
2. **Notifications** — in-app + email (approvals, assignments, overdue invoices);
   dispatch behind an interface so a queue can be added later.
3. **Reporting/analytics** — server-side aggregates (no computing over unbounded sets);
   pipeline, revenue, forecast dashboards.

---

## Stage 4 — CI / quality (start day 1, runs throughout)
- CI: build + lint + test + `prisma migrate` check on every PR.
- Remove dead deps: `mongoose`, one of the two bcrypt libs, `express-jwt`,
  `jsonwebtoken`, `express-rate-limit`.
- Structured logging + error tracking (e.g. Sentry).

---

## Sequencing
```
Stage 1  Foundation        ~1.5–2 wks   (hard dependency for everything)
Stage 2  Frontend UX       ~1 wk        (overlaps 1F/1G)
Stage 3  Features          incremental  (after schema frozen in Stage 1)
Stage 4  CI/quality        from day 1
```
