# Codex brief — list data completeness (server-side pagination)

Repo: `D:/Personal/NawaHub`, branch `main`. Do NOT commit — the orchestrator reviews and commits.

Read `docs/AUDIT-2026-08.md` §3 and `docs/REMEDIATION-STATUS.md` first for context and conventions.

## The defect — verified, not hypothetical

Three list surfaces fetch far more than they should and paginate in the browser. One of them **loses
records outright**.

### 1. Payments — records past 100 are unreachable (the real bug)

`frontend/src/pages/Payments.tsx:71` requests `getPayments({ page: 1, limit: 1000 })`.
`backend/src/finance/invoices.service.ts:669` caps it: `Math.min(100, parseInt(query.limit) || 25)`.

So the page receives **100** rows, then filters, sorts and paginates those 100 as if they were the
whole dataset (`Payments.tsx:74-110`). With 250 payments, 150 are invisible — no error, the pager just
shows pages over the first 100 — and search/date filters only ever see those 100.

### 2. Invoices — silent 1000-row ceiling

`frontend/src/pages/Finance.tsx:100-136` calls `getInvoices()` with no params, hitting the
unpaginated branch (`backend/src/finance/invoices.service.ts:141-160`) which is capped at
`UNPAGINATED_MAX = 1000` (`backend/src/common/paginate.ts:8`), then paginates client-side. The backend
already supports proper paging — it is simply not being asked for it.

### 3. Quotes — no server pagination at all

`backend/src/finance/quotes.service.ts:60-67` does `findMany` with no `take` and returns everything.

## What to do

Move paging, search, filtering and sorting to the server for all three, so the UI shows the complete
dataset.

**Follow the pattern that already works** — `frontend/src/components/Customers/Customers.tsx:39-40`
passes `{ page, limit, q, sort, dir, ...filters }` straight through to the backend, and
`GenericTable` already supplies exactly those params (`GenericTable.tsx:50, 375`). Return the paged
payload shape `{ data, total, page, pages }` that `GenericTable` understands.

Specifically:

- **`getPayments`** (`invoices.service.ts:667-687`): accept `q`, date range and `sort`/`dir` in
  addition to `page`/`limit`. Search should cover the fields the UI currently filters on client-side —
  read `Payments.tsx:74-93` and preserve that behaviour exactly, just server-side. Keep the existing
  scope filter (`visibility.ownershipWhere(user, 'invoices', 'createdById')`) and the soft-delete
  exclusion — both are load-bearing.
- **`getQuotes`** (`quotes.service.ts:60-67`): add pagination + `q` + `sort`/`dir`, mirroring the
  invoice list. Keep the existing scope filter and `status`/`customer`/`deal` filters.
- **Frontend**: `Payments.tsx` and `Finance.tsx` stop fetching-everything-then-slicing and hand the
  params to the API, like Customers does. Delete the now-dead client-side filter/sort/paginate code
  rather than leaving it unreachable.

## Constraints

- **Do not change the visibility/scope filters.** They were fixed in commit `bc8a942` after a P0 where
  scoping silently did nothing; `ownershipWhere` must keep receiving the same canonical resource name
  and owner field it does today.
- Sort must be validated against an allow-list server-side — do not interpolate a client string into
  `orderBy`.
- Preserve current default ordering (payments `date desc`, quotes `createdAt desc`) when no sort given.
- Do not touch the accounting engine, posting, or any `*.service.ts` outside `finance/`.
- Frontend: do not regress the a11y work — keyboard-activatable rows, named icon controls,
  `dir="auto"` cells, mobile card layout. Do not change `index.css` colour tokens (guarded by 26
  contrast assertions).

## Tests

- **A test that fails on today's code:** with more than 100 payments, the last one is reachable and a
  search matching only a late record finds it. That is the defect; prove it is fixed.
- Server pagination returns correct `total`/`pages` for invoices and quotes.
- Sort allow-list rejects an unknown sort key rather than passing it through.
- Existing scope tests must still pass — a scoped user still sees only their own records.

Match the established mocked-Prisma style (see `backend/src/finance/invoices.lifecycle.spec.ts`).
No new dependencies.

## Gates — run and report exact output

```
npm --prefix backend test
npm --prefix frontend test
./backend/node_modules/.bin/tsc -p backend/tsconfig.json --noEmit
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit
npm --prefix backend run lint
```

Baseline: backend **29 suites / 192 tests**, frontend **5 files / 37 tests**, 0 `it.failing`. All must
still pass; the frontend's 26 contrast assertions in particular.

## Report contract

Per surface: what changed on each side, the search/sort fields you moved server-side and how you
validated the sort key, the tests added, and anything you deliberately left alone with the reason.
Exact before/after counts. If a claim above turns out to be wrong when you read the code, say so
plainly rather than implementing around it — a refuted premise is a valuable result.
