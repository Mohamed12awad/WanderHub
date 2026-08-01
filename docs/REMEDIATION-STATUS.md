# NawaHub Remediation — Status Handover

**Branch:** `fix/audit-2026-08-batch-0-1` (3 commits, not pushed, not merged)
**Baseline audit:** [`docs/AUDIT-2026-08.md`](./AUDIT-2026-08.md)
**Date:** 2026-08-01

**Gates, re-run at handover:** backend **16 suites / 141 tests pass** · frontend **3 files / 33 tests pass** ·
backend + frontend typecheck clean · backend lint 0 errors (2 pre-existing warnings) · working tree clean.

---

## TL;DR

Batches 0 and 1 are **done**. The exploitable data-leak is closed, accessibility is at AA, and there is
now a safety net that makes the remaining accounting work verifiable.

**Batch 2 — the deep accounting P0s — has not been started.** That was deliberate: it needed the test
net first. 11 tests are already written and waiting for those fixes.

**The system is not yet safe to close accounting periods in.** That defect is untouched.

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

---

## Not done — Batch 2 and beyond

Ordered by severity. Every item has a failing test waiting except where noted.

### P0 — accounting correctness (blocks safe production use)

1. **Period-close carry-forward chain.** `period-close.service.ts:54-59` seeds opening balances only from
   `priorPeriod(period)`; any gap — *including a zero-activity month* — silently zeroes the carry-forward
   and erases all prior history from every statement, while still reporting `balanced: true`.
   **Until fixed, do not let anyone close accounting periods.** Also: reopening an earlier period never
   recomputes later snapshots.
2. **Empty periods don't lock.** Closed state is inferred from the existence of `AccountBalance` rows,
   so a period with no activity creates none and never locks. Needs its own period state table/row.
3. **Cross-currency payments relieve AR/AP with the wrong quantity.** `posting.service.ts:390-392`,
   `:592-594` use one numeric amount as both payment-currency and document-currency units. A USD 100
   invoice paid with EGP 5,000 credits AR **EGP 250,000** and books a fabricated 245,000 FX loss.
4. **Missing FX rate posts 1:1.** `currency.service.ts:42` passes the amount through unconverted, so a
   USD 1,000 invoice with no rate on file posts as EGP 1,000. Split the API: keep pass-through for
   dashboards, add a strict `toBaseOrThrow()` for the posting path.
5. **Document↔journal atomicity.** Approval commits, then posting is invoked without that transaction
   (`invoices.service.ts:367,385`; `vendor-bills.service.ts:160,187,246,277,422,455`;
   `expenses.service.ts:113,145,198,217`). Posting failure leaves an approved document with no journal,
   permanently — retry returns early because it's already approved.
6. **Quote→invoice conversion posts nothing.** `quotes.service.ts:235-285` creates an **approved**
   invoice with no AR, revenue, tax, stock movement or COGS.
7. **Pending invoices deplete stock and post COGS before approval**, and rejection reverses only the
   `Invoice` journal — the stock movement and `StockCogs` entry are never touched.
8. **Editing/deleting approved documents leaves postings live.** Edit + re-approve double-posts AR;
   soft-delete performs no reversal at all.
9. **PO receipt: two divergent paths.** `updateStatus` (`purchase-orders.service.ts:210-229`) creates
   uncosted stock with no GRNI under a different `refType`, so `receive()` doesn't see it → double
   receipt. `receive()` itself is non-atomic and can leave a PO permanently unreceivable.

### P1

10. **Reversals bypass the period lock.** `reverseEntry()` has no check; `reverse()`/`reverseLive()`
    (11 call sites) inherit that. `reverseById()` *does* check — move the check into `reverseEntry()`.
11. **JE numbering gaps.** `nextNumber()` runs on the root connection, never the caller's `tx`; every
    serializable retry burns a number. Statutory issue in many jurisdictions.
12. **Manual stock adjustments post no GL at all.** `defaultInventoryAdjustment` is declared, seeded and
    exposed in Settings but referenced by no posting code. Inventory Asset drifts from the subledger
    with every recount.
13. **Stock return / COGS reversal not atomic** (`inventory.service.ts:48-63`).
14. **No three-way match** in procurement — no partial receipt, no over-receipt tolerance, no check that
    a bill matches what was received.
15. **Vendor-bill self-approval** is gated on `enabled` (`vendor-bills.service.ts:263`), which defaults
    to false — PO does the same check unconditionally. Also `*` bypasses SoD everywhere.
16. **IDOR on mutation handlers** — `expenses:152`, `sales-orders:154`, `purchase-orders:163`,
    `vendor-bills:195`, `tasks:153`, `projects:129` fetch by raw id without caller scope. Fail-closed
    scoping fixed *reads*; these mutations remain unscoped.
17. **Payment mutations reuse document permissions** — recording an invoice payment needs only
    `invoices:create`; deleting a bill payment only `vendor-bills:edit`.
18. **Conversion endpoints check the source, not the target, permission** — `quotes:create` can mint
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

1. Fix (1) and (2) — period close. Highest severity, and the 3 waiting tests make it verifiable.
2. Fix (10) and (11) — reversal lock and JE numbering; both small and both have tests.
3. Then (3) and (4) — multi-currency, which needs a schema decision about storing the applied amount in
   document currency.
4. Re-run `npm --prefix backend run verify:gl` after each — it is the fastest end-to-end signal.
