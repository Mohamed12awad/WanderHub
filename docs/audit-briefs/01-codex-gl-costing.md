# TASK: Read-only forensic audit of the NawaHub GL posting engine and inventory costing

You are performing a **READ-ONLY AUDIT**. Do NOT modify, create, or delete any file.
Do NOT run formatters or write tests. Your entire deliverable is a written findings report
printed as your final message. If you feel the urge to fix something, describe the fix instead.

## Repo context

NawaHub is a single-company ERP: NestJS 11 + Prisma 7 + Postgres backend at `backend/`,
React 19 frontend at `frontend/`. Base currency is workspace-configurable (default EGP).
This is a single-tenant, single-legal-entity deployment — do NOT report missing multi-tenancy.

## Files in scope (read all of them before concluding)

Primary:
- `backend/src/accounting/posting.service.ts`      (609 lines — the double-entry engine)
- `backend/src/accounting/period-close.service.ts`
- `backend/src/accounting/journal.service.ts`
- `backend/src/accounting/reconciliation.service.ts`
- `backend/src/accounting/statements.service.ts`
- `backend/src/accounting/period.util.ts`
- `backend/src/common/currency.service.ts`
- `backend/src/number-sequence/number-sequence.service.ts`
- `backend/src/accounting/posting.service.spec.ts`  (existing coverage — 165 lines)

Callers (to check transaction boundaries):
- `backend/src/finance/**`      (invoices, payments, quotes)
- `backend/src/procurement/**`  (purchase orders, vendor bills, bill payments)
- `backend/src/inventory/**`    (stock movements, cost layers)
- `backend/src/expenses/**`

Schema: `backend/prisma/schema.prisma` — models `JournalEntry`, `JournalLine`,
`ChartOfAccount`, `AccountBalance`, `StockCostLayer`, `StockMovement`, `Invoice`,
`VendorBill`, `ExchangeRate`, `NumberSequence`.

## What to investigate — answer each with a verdict + evidence

### A. Balance & correctness
A1. `post()` validates `Σ baseAmount ≈ 0` with `POST_TOLERANCE = 0.005`. Find every call path
    that can construct lines summing outside that tolerance and thus throw
    `BadRequestException` at runtime, aborting a user's save.
    Specifically check: is `Invoice.total` ALWAYS exactly `subtotal + tax`? What happens with
    discounts, line-level rounding, or many line items each rounded to 2dp?
A2. `VendorBill` has a `taxInclusive` flag (migration `20260617134103_vendor_bill_tax_inclusive`).
    In `postVendorBill()` the legs are `Dr subtotal + Dr tax / Cr total`. Trace how `subtotal`,
    `tax`, `total` are computed for a **tax-inclusive** bill. If total == subtotal for
    tax-inclusive bills, the entry is unbalanced by the tax amount. Confirm or refute with code.
A3. Is `POST_TOLERANCE = 0.005` an absolute tolerance applied regardless of entry magnitude?
    What is the largest realistic entry, and can accumulated per-line rounding exceed it?

### B. Transaction boundaries & atomicity
B1. `post()` uses `db = tx ?? this.prisma`. Enumerate EVERY caller and state whether it passes
    a `tx`. Any caller that does NOT pass `tx` can commit the business document while the
    journal entry fails (or vice versa) — report each as a distinct finding with file:line.
B2. `this.numbers.nextNumber('journal', 'JE')` (posting.service.ts:204, :237) is called WITHOUT
    the `db`/`tx` handle. Read `number-sequence.service.ts`: does it run on its own connection
    or its own transaction? If the outer transaction rolls back, is the JE number consumed
    anyway, producing gaps in the journal number sequence? Gapless numbering is a statutory
    requirement in many jurisdictions — assess severity accordingly.
B3. `post()` checks `periods.isDateLocked()` then creates. Is there a TOCTOU window where a
    period close committing concurrently lets an entry land in a closed period?

### C. Reversal integrity  ← HIGH PRIORITY
C1. `reverseById()` (line 291) checks `periods.isDateLocked()`. `reverse()` (275) and
    `reverseLive()` (312) call `reverseEntry()` **without** any period-lock check. Enumerate
    the callers of `reverse()`/`reverseLive()` (invoice void, bill edit, payment delete, etc.)
    and confirm whether a user editing/voiding an old document can write a reversal into a
    CLOSED accounting period. This is the single most important question in this audit.
C2. `reverseEntry()` writes `sourceType: 'Reversal', sourceId: orig.id`. Given the unique
    constraint on `(sourceType, sourceId)`, what happens on a concurrent double-reversal —
    is the P2002 handled (as `post()` does at line 221) or does it surface as a 500?
C3. `reverseLive()` matches `sourceId: { startsWith: sourceIdBase }`. Can one document's base id
    be a prefix of another's, causing the wrong entry to be reversed? Check how the versioned
    `<base>#r<ts>` sourceIds are generated.

### D. Multi-currency / FX
D1. In `postInvoicePayment()` (369): `baseCash = toBase(amount, payment.currency)` but
    `baseAr = toBase(amount, invoice.currency, invoice.exchangeRate)` — the SAME numeric
    `amount` is used for both legs. If the payment currency differs from the invoice currency,
    is AR relieved by the wrong amount? Determine whether payments can be recorded in a
    currency different from the invoice, and whether any validation prevents it.
D2. Same question for `postVendorBillPayment()` (571).
D3. `postInvoicePayment` relieves AR at the invoice's historical rate for a PARTIAL payment.
    After several partial payments plus rate moves, does AR clear to exactly zero, or is
    residue left? Show the arithmetic.
D4. Read `currency.service.ts`: what happens when NO `ExchangeRate` row exists for a currency
    on a given date — does it throw, return 1, or silently use a stale rate? A silent 1.0
    fallback would post materially wrong base amounts.

### E. Inventory costing
E1. Read the FIFO/LIFO layer consumption in `backend/src/inventory/**` against `StockCostLayer`.
    Is layer consumption ordering deterministic (tie-break on equal dates)? Is it done inside
    the same transaction as the `StockMovement` write?
E2. Can stock go negative, and if so what unit cost is used for the COGS posting when no layer
    remains? Does `postCogs` then post a zero/undefined cost?
E3. Do `postCogs`/`postCogsReversal` always agree with the layers actually consumed/restored,
    including on partial returns?
E4. Are stock transfers between warehouses atomic (out+in in one transaction)?

### F. Performance
F1. `getGlConfig()`, `getBaseCurrency()`, and `requireCode()` each hit the DB per posting call.
    Count the queries for a single invoice approval. Is any of it cached?
F2. Find N+1 query patterns and missing indexes on hot paths — especially
    `statements.service.ts` (trial balance / P&L / balance sheet) and `AccountBalance` maintenance.
F3. Are the reporting aggregates paginated and bounded?

### G. Test coverage gap
G1. Read `posting.service.spec.ts` and list, concretely, which of the risks in A–E it does NOT
    assert. Propose a test matrix: test name + the exact scenario each should set up.

## Report contract

Output ONLY a markdown report, structured as:

```
## Findings

### [P0|P1|P2|P3] <short title>
- **Where:** `path/to/file.ts:LINE`
- **What:** one sentence stating the defect.
- **Failure scenario:** concrete inputs → the wrong GL/stock outcome. Include numbers.
- **Confidence:** CONFIRMED (I read the code that proves it) | PLAUSIBLE (needs runtime check)
- **Fix sketch:** 1-3 lines, described not written.

## Answered questions
<one line per question ID A1..G1 with the verdict, including the ones that came back CLEAN>

## Test matrix
<table: test name | scenario | asserts>
```

Severity rubric (from the repo's own AGENTS.md):
- **P0** — silent data corruption, money posted wrong, auth bypass, unrecoverable state.
- **P1** — user-visible breakage, statutory/compliance violation, lost writes.
- **P2** — correctness risk under load or edge cases, meaningful perf cliff.
- **P3** — hygiene, maintainability, missing tests.

Rules:
- Every finding MUST cite `file:line`. No finding without a line reference.
- If a hypothesis in A–G turns out to be WRONG, say so explicitly and say why — a refuted
  hypothesis is a valuable result, not a failure. Do not invent findings to fill the report.
- Do not report missing multi-tenancy, missing HR/payroll, or missing manufacturing modules.
  Those are known and out of scope.
- Rank findings most-severe first.
