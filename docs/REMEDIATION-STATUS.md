# NawaHub Remediation — Status Handover

**Branch:** `main` — 18 commits merged from `fix/audit-2026-08-batch-0-1` (fast-forward). **Not pushed** to origin.
**Baseline audit:** [`docs/AUDIT-2026-08.md`](./AUDIT-2026-08.md)
**Date:** 2026-08-01

**Gates, re-run at handover:** backend **21 suites / 155 tests pass** · frontend **3 files / 33 tests pass** ·
backend + frontend typecheck clean · backend lint 0 errors (3 pre-existing warnings) ·
**0 it.failing remain** · **verify:gl 5/5 against a live DB** · working tree clean.

---

## TL;DR

**Every P0 from the original audit is closed.** All 11 documented-failing tests are green —
**0 `it.failing` remain**.

Closed this effort: record-level authorization, WCAG AA contrast, shared-primitive accessibility,
period close (carry-forward + empty-period lock), reversal period locks, gapless journal numbering,
missing-FX-rate rejection, cross-currency AR/AP relief, document↔journal atomicity (including the
approval-step residual), the two divergent PO receipt paths, quote→invoice conversion posting nothing,
and postings now following the whole invoice lifecycle — reject, edit and delete all reverse the live
entry and return the stock.

The headline defects were verified **end-to-end against the running app**, not only by unit test:
closing a period no longer erases prior history, and an empty period now genuinely locks.

What remains is **P1 and below** — see "Not done". Nothing there silently corrupts money in the way the
P0s did, though item 1 (manual stock adjustments posting no GL) does cause steady, invisible drift
between the Inventory Asset account and the stock subledger.

> **Verification caveat worth knowing about.** During this work a stale backend process from an earlier
> session held port 3000, so a restart silently failed with `EADDRINUSE` and several live checks were
> hitting old code — including one that briefly looked like a pass. The process was killed and every
> claim below was re-verified against a confirmed-fresh server. If you do live checks, confirm the
> backend you are talking to is the one you started.

---

## Done

### 1. `bc8a942` — Record-level authorization (the worst finding)

Scoping was silently inert across most of the app, from two compounding defects:

- **Resource-name drift.** Services passed `finance` (×14), `leads` (×7), `procurement` (×3), `sales` (×1)
  to `ownershipWhere()`. No such permission exists — the registry uses `invoices`, `purchase-orders`,
  `vendor-bills`, `sales-orders`, and had no `leads` key at all.
- **`resolveScope()` failed OPEN**, returning `all` when nothing matched.

Together: a user granted `invoices:view:own` saw **every invoice in the company**. Same for POs, bills,
sales orders, leads. The reverse also bit — global search gated invoice results on `finance:view`, a
permission nobody can hold, so legitimate users silently got no results.

Fixed as one change (fail-closed alone would have locked everyone out):
- `backend/src/common/resources.ts` — canonical vocabulary; every scope argument typed `Resource`, so
  this drift is now a **compile error**.
- `resolveScope()` gains a `none` scope and fails closed; `ownershipWhere()` returns a match-nothing
  predicate.
- All drifted call sites canonicalised (invoices, reports, search, linked-access).
- Missing grantable resources added to `PERMISSION_REGISTRY`: `leads`, `warehouses`,
  `product-categories`, `activities`, `notes`, `emails`, `accounting:view` — all enforced by the backend
  but absent from the Roles UI, so only `*` holders could reach them.

Also closed in the same commit:
- `POST /api/emails` had `JwtAuthGuard` only — any authenticated user could send outbound mail through
  company SMTP. Now needs `emails:send`, is rate-limited to 20/min, and asserts linked-record access.
- `activities` / `notes` mutations inherited the class-level `:view`, so a read-only role could create,
  edit and delete. Each mutation now requires its own permission.

`resources.spec.ts` derives the enforced permission set from `@RequirePermission` across the source tree
and asserts every one is grantable — this class of drift cannot silently return.

### 2. `c346439` — WCAG 2.1 AA contrast

17 of 34 token pairs were below threshold. Worst: white on the green accent at **1.99:1** in dark mode.
Values were **solved** for the minimum change that reaches threshold, not picked by eye.

- Accents (white ≥4.5:1): green `40→31`/`50→32`, orange `50→40`/`58→40`, teal `36→30`/`48→31`,
  red dark `60→53`, purple dark `62→59`, rose `52→50`/`62→52`. `--ring` moved with `--primary`.
- Dark `--primary` `62→58`; light `--destructive` `56→50`; light `--muted-foreground` `46→44`.
- Borders split by role: `--input` is a UI-component boundary and is now ≥3:1 (SC 1.4.11);
  `--border` is decorative and was raised `90→82` / `18→28` for visibility without being forced to 3:1.

`frontend/src/config/__tests__/contrast.test.ts` parses the real HSL values out of `index.css` and
computes ratios — 26 assertions, so a regression fails CI.

### 3. `d646c19` — Accessibility in shared primitives + GL invariant checker

- Chart of Accounts row edit/delete were unnamed icon buttons (24 of 40 on that page). Now labelled
  with account code + name. **Re-measured live: 24 → 4 unnamed.**
- `DetailHeader`, `PageHeader`, `BulkActionBar` overflow/clear buttons labelled.
- `GenericTable` sorting was mouse-only — handler on a non-focusable `<th>` (SC 2.1.1). Now a real
  `<button>`. **Verified live: 4 sort buttons on the invoices table where there were 0.**
- `backend/utils/verify-gl.ts` (`npm --prefix backend run verify:gl`) checks five invariants
  independently of the app's own reporting: entries balance, ledger nets to zero, inventory subledger ==
  Inventory Asset GL, journal numbering gapless, closed-period chain unbroken. Exit 1 on failure.
  **Proved it catches a real break** — injecting a non-contiguous chain makes it fail and name the
  missing months.

### 4. Batch 0 safety net — 11 documented-failing tests (Codex, `gpt-5.6-sol`)

Written with `it.failing()`, so they pass *because* the defect is still present and will start failing
the moment it's fixed — which forces flipping them to `it()`. This is the work-list for Batch 2:

| Test | File |
|---|---|
| `closePeriod` carries opening balances across a gap | `accounting/period-close.service.spec.ts:102` |
| `closePeriod` locks an empty period | `:113` |
| re-closing an earlier period refreshes later snapshots | `:125` |
| cross-currency invoice payment relieves AR correctly | `accounting/posting.service.spec.ts:173` |
| `reverse` rejects a reversal in a closed period | `:210` |
| `reverseLive` rejects a reversal in a closed period | `:222` |
| cross-currency vendor payment relieves AP correctly | `:236` |
| foreign invoice posting rejects a missing FX rate | `:256` |
| rejecting an invoice restores stock, no net COGS | `finance/invoices.payments.spec.ts` |
| `nextNumber` uses the supplied transaction client | `number-sequence/number-sequence.service.spec.ts` |

**All 11 have since been fixed and flipped to active tests** (see 5–12 below). Zero remain red.

### 5. `aa8ad46` — Period close (both P0s), verified live

- **Carry-forward across gaps.** `openingBalances()` now takes the most recent snapshot at or before the
  prior period and adds the movement since; with no snapshot it sums everything prior. Still incremental.
  **Verified:** closing 2026-06 with 2026-01 left open used to collapse the balance sheet from 694,144 to
  194,144 assets (equity 211,400 → −288,600); it now holds at 694,144 / 211,400.
- **Empty periods lock.** New `AccountingPeriod` table holds lock state independently of account
  snapshots (migration `20260801074243_accounting_period_lock_state`).
  **Verified:** closing empty 2027-06 now lists it closed and a journal dated into it is rejected.
- Re-closing an earlier period now cascades forward and refreshes later snapshots.

### 6. `db41742` — Reversal lock + journal numbering (both P1s)

- The period-lock check moved into `reverseEntry()`, so all eleven automated reversal paths inherit it
  instead of only the manual `reverseById`.
- `nextNumber()` accepts a transaction client and `PostingService` passes its own — rollbacks and
  serializable retries no longer burn journal numbers.

### 7. `94e8090` — Missing exchange rate no longer posts 1:1

`CurrencyService` split by intent: `toBase()` stays lenient (correct for dashboard aggregates, where a
missing rate should not zero a total); new **`toBaseOrThrow()`** is strict and is what `post()` uses. A
foreign-currency document with no rate on file is now refused instead of booking base-currency units.

### 8. `9a1fc9b` — Cross-currency AR/AP relief

`payment.amount` is in the *payment* currency but was reused as the AR/AP quantity and re-priced at the
document's rate. An EGP 5,000 payment against a USD 100 invoice booked at 50 credited AR **EGP 250,000**
and invented an **EGP 245,000** FX loss to balance. The payment is now converted into document currency
first, and that applied amount relieves the control account. Same-currency payments are unchanged —
`convert()` returns the amount untouched, so existing realized-FX behaviour still holds.

### 9. `f32a10b` — Document approval atomic with its GL posting (Codex, reviewed)

Approval/creation and posting now share one transaction across invoices (both branches), vendor bills
(create, both branches, create-from-PO) and expenses (create, both branches). The private posting
helpers now **require** a transaction client, so a non-atomic call site is a compile error. Timeline
logging stays outside the transaction. Six new rollback/commit tests.

> **Known residual, deliberately not fixed here.** `ApprovalService.act()` still writes the step advance
> on its own connection *before* the transaction opens (`approval.service.ts:127`). If posting then
> fails, the document correctly rolls back but the approval step stays advanced, so a retry may be
> rejected as already-acted. Strictly better than before — the document no longer ends up
> approved-with-no-journal — but incomplete. Closing it means threading a `tx` through `act()` and
> restructuring the six call sites that use its result to decide what to write.

### 10. `c1704e0` — Quote→invoice conversion routed through the shared creation path

Extracted  so conversion performs the same approval chain,
stock draw, COGS and issued GL posting as normal creation, on the conversion transaction — which
preserves the  race guard that a plain  call would have broken.

### 12. `923eab9` — Postings follow the invoice lifecycle (the last P0)

Editing an approved invoice's lines reset it to `pending` but left the issued entry standing, so
re-approval posted a second time — 114 edited to 228 ended with AR at **342**. Deleting was worse: a
plain soft-delete with no reversal, leaving AR, revenue, tax, stock depletion and COGS live for a
document that had vanished from every listing.

Both paths now un-issue inside their transaction — edit reverses and swaps stock (old lines back, new
lines drawn); delete reverses and returns stock. The creation draw and the reject restore were
refactored into one pair of inverse helpers (`drawInvoiceStock` / `restoreInvoiceStock`) so creation,
reject, edit and delete share them rather than hand-rolling four loops. Distinct refTypes
(`InvoiceEdited`, `InvoiceDeleted`, `InvoiceRejected`) keep these distinguishable from a sale or a
customer return in the stock ledger.

### 11. `f3b8f11` — Stock restored and COGS reversed on invoice reject

Both reject paths now mirror the draw performed at creation.

---

## Not done — remaining Batch 2

Ordered by severity. Every item below needs a test written alongside its fix — the 11-test safety net
is fully consumed.

### P0 — none remaining

All original P0 items are closed. The last one (`923eab9`) is recorded under "Done".

### P1

8. **Manual stock adjustments post no GL at all.** `defaultInventoryAdjustment` is declared, seeded and
    exposed in Settings but referenced by no posting code. Inventory Asset drifts from the subledger
    with every recount.
9. **Stock return / COGS reversal not atomic** (`inventory.service.ts:48-63`).
10. **No three-way match** in procurement — no partial receipt, no over-receipt tolerance, no check that
    a bill matches what was received.
11. **Vendor-bill self-approval** is gated on `enabled` (`vendor-bills.service.ts:263`), which defaults
    to false — PO does the same check unconditionally. Also `*` bypasses SoD everywhere.
12. **IDOR on mutation handlers** — `expenses:152`, `sales-orders:154`, `purchase-orders:163`,
    `vendor-bills:195`, `tasks:153`, `projects:129` fetch by raw id without caller scope. Fail-closed
    scoping fixed *reads*; these mutations remain unscoped.
13. **Payment mutations reuse document permissions** — recording an invoice payment needs only
    `invoices:create`; deleting a bill payment only `vendor-bills:edit`.
14. **Conversion endpoints check the source, not the target, permission** — `quotes:create` can mint
    invoices.

### P2 / P3

19. Statements scan the full ledger when no period is closed (`statements.service.ts:36-55`).
20. No fiscal-year close; retained earnings never crystallise.
21. "Cash flow" is a cash-account delta, not a classified cash-flow statement.
22. Missing `(period, closedAt)` index; period close does one awaited upsert per account.
23. Global throttle 100 req/min per IP is too low for a dense ERP behind office NAT — it broke a real
    session during the audit (`app.module.ts:84`).
24. FIFO tie-break nondeterministic (`inventory.service.ts:89-92`) — order by `(receivedAt, id)`.
25. Remaining a11y: ~4 unnamed icon buttons per page (pagination controls); clickable table **rows**
    still lack keyboard access (per-module `*Row.tsx`, ~10 files); 2 unlabelled inputs per list page.
26. RTL bidi bug: English titles in Arabic truncate at the **start** (`...oice for Birthday`). Needs
    `dir="auto"` on mixed-content cells.
27. Chart of Accounts renders flat although `parentId`/`children` exist and are indexed; default 10
    rows/page is too low for an ERP.
28. Absent modules: fixed assets, HR/payroll, manufacturing/BOM. Blueprints in the audit §2.5–2.6.

---

## Notes and caveats

- **Nothing is pushed or merged.** Branch `fix/audit-2026-08-batch-0-1` off `main`.
- **Behaviour change to review.** Fail-closed scoping is correct but *is* a behaviour change: a role
  holding `reports:view` but no `deals:view` now sees empty reports rather than all deals. That is the
  intended secure behaviour — but check it against how your real roles are configured before deploying.
  Seeded roles (`admin`/`manager`/`sales rep`/`viewer`) were updated to keep the demo working.
- **A design disagreement I resolved.** Codex's test expected unmatched-resource scoping to degrade to
  the caller's *own* records; I implemented match-**nothing**. Reasoning is in the test comment at
  `visibility.service.spec.ts` — "no permission for this resource" should mean "see none of it", not
  "see the ones you own". Reverse it if you disagree; it's a one-line change.
- **A sequencing mistake I made.** I dispatched Codex to write failing authorization tests at the same
  time I was fixing authorization, so it saw the fixed code and wrote regression tests rather than
  failing ones. No work was lost and the GL/period-close tests are unaffected, but the tests-first
  discipline was inverted for that one section.
- **An audit correction.** The audit's remediation note implicated `RowActions` in the unnamed-button
  finding. It was wrong — `RowActions` already carries an `sr-only` label and was never among the
  counted controls. The real offenders were `ChartOfAccounts.tsx:136-137`.
- **`inventory subledger vs GL` currently reads 0.00 vs 0.00** on the seeded DB — the seed creates no
  valued stock, so that check is trivially green. It will become meaningful against real data.
- **Dev environment left running:** Docker Postgres `nawahub-pg` on 5433, backend on 3000, frontend on
  5173. `docker rm -f nawahub-pg` to tear down. The dev DB has `hasOnboarded = true` set on all users
  (needed for screenshots); everything else was restored to baseline.

## Suggested next session

1. **Manual stock adjustments post no GL** (P1). `defaultInventoryAdjustment` is declared, seeded and
   exposed in Settings but referenced by no posting code, so Inventory Asset drifts from the stock
   subledger with every recount or write-off. `verify:gl` check 3 will start catching this once there
   is real valued stock in the database.
2. **Vendor-bill self-approval** (P1). Gated on `enabled`, which defaults to false, while the PO path
   applies the same check unconditionally — so with approvals off, one user can raise a bill and
   approve it.
3. **Edit/delete posting parity for vendor bills and expenses** (P1). `invoices.service.ts` now
   reverses on edit and delete; those two modules have the same shape and the same gap.
4. **IDOR on mutation handlers** (P1). Fail-closed scoping fixed *reads*; six mutation paths still
   fetch by raw id without caller scope.
5. Re-run `npm --prefix backend run verify:gl` after each — fastest end-to-end signal. Note it needs a
   live database; the Docker Postgres used during this work is `nawahub-pg` on port 5433.

> Items 1–3 are currently dispatched to Codex; check `git log` before starting them.
