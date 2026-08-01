# TASK: Write FAILING tests that reproduce audited defects in NawaHub

## The single most important rule

**You are writing tests that MUST FAIL against the current source code.**

A failing test here is the deliverable — it is SUCCESS, not a problem to fix.

**DO NOT modify any file outside the test paths listed below.** Specifically: do NOT edit
`posting.service.ts`, `period-close.service.ts`, `visibility.service.ts`, `currency.service.ts`,
any controller, any DTO, or the Prisma schema. If a test fails because the code is broken, that is
the entire point. Leave the code broken. Someone else is fixing it.

If you find yourself wanting to "make the tests pass", stop — you have misunderstood the task.

## Context

NawaHub: NestJS 11 + Prisma 7 + Postgres in `backend/`. Test runner is Jest (`npm --prefix backend test`),
config in `backend/package.json` / `backend/jest.config.*`. There are 12 existing spec files, 121 passing
tests — read `backend/src/accounting/posting.service.spec.ts` and
`backend/src/common/visibility.service.spec.ts` first to match the established mocking style exactly.

These defects were confirmed by a prior audit (`docs/AUDIT-2026-08.md` — read it for full detail).
Your job is to lock each one down with a test so the fix is verifiable and can never regress.

## Files you MAY create or modify — nothing else

- `backend/src/accounting/period-close.service.spec.ts` (new)
- `backend/src/accounting/posting.service.spec.ts` (extend existing — do not delete existing cases)
- `backend/src/common/visibility.service.spec.ts` (extend if it exists, else create)
- `backend/src/finance/invoices.payments.spec.ts` (new)
- `backend/src/number-sequence/number-sequence.service.spec.ts` (new)

## Tests to write

### A. Period close (`period-close.service.spec.ts`)

**A1 — gap in the closed-period chain drops prior history.** `closePeriod()` seeds opening balances only
from `priorPeriod(period)` (`period-close.service.ts:54-59`). Set up: account has movement in 2026-01;
2026-02..2026-05 have none and are never closed; close 2026-06. Assert 2026-06's `closingBalance`
INCLUDES the January movement. **This currently fails** — opening resolves to 0 because 2026-02 has no
`AccountBalance` rows.

**A2 — empty period must lock.** `isPeriodClosed()` infers closure from the existence of `AccountBalance`
rows (`:21-24`), so a period with no prior balances and no activity creates none. Set up: empty ledger;
`closePeriod('2027-06')`; assert `isPeriodClosed('2027-06') === true` and that
`isDateLocked(new Date('2027-06-15'))` is true. **Currently fails** — returns 0 accounts and never locks.

**A3 — reopening an earlier period must invalidate later snapshots.** Close 2026-01 then 2026-02; reopen
and re-close 2026-01 with different figures; assert 2026-02's `closingBalance` reflects the correction.
**Currently fails.**

### B. Posting engine (extend `posting.service.spec.ts`)

**B1 — `reverseLive()` must respect a closed period.** `reverseById()` checks `periods.isDateLocked()`
(`posting.service.ts:301`) but `reverse()` (`:275`) and `reverseLive()` (`:312`) do not. Assert that
`reverseLive()` throws when the reversal date lands in a locked period. **Currently fails** — it posts.

**B2 — same for `reverse()`.**

**B3 — cross-currency payment relieves AR by the correct amount.** In `postInvoicePayment()`
(`:390-392`) the same numeric `amount` is used as both payment-currency and document-currency units.
Set up: USD 100 invoice, `exchangeRate = 50` (EGP base); payment of EGP 5,000. Assert the AR credit leg
has `baseAmount === -5000` and that NO FX line is produced. **Currently fails** — AR is relieved
`5000 × 50 = 250,000` and a fabricated 245,000 FX loss appears.

**B4 — same for `postVendorBillPayment()`** (`:592-594`).

**B5 — missing exchange rate must not post 1:1.** `CurrencyService.toBase()` (`currency.service.ts:42`)
returns the amount unconverted when no rate exists. Assert that posting a foreign-currency invoice with
NO `ExchangeRate` row throws rather than silently booking base-currency units. **Currently fails.**

### C. Visibility / authorization (`visibility.service.spec.ts`)

**C1 — `resolveScope()` must fail closed on an unknown resource.** It currently returns `'all'`
(`visibility.service.ts:15-22`). Assert `resolveScope(['invoices:view:own'], 'finance')` does NOT return
`'all'`. **Currently fails.**

**C2 — `ownershipWhere()` must not return an empty filter for a scoped user.** Assert
`ownershipWhere({permissions:['invoices:view:own'], id:'u1'}, 'finance', 'createdById')` returns a
predicate restricting to `u1`, not `{}`. **Currently fails.**

**C3 — keep the legitimate cases passing:** `'*'` ⇒ `all`; `deals:view` ⇒ `all`; `deals:view:own` ⇒ `own`;
`deals:view:team` ⇒ `team`. These must PASS both before and after the fix — they are the regression guard.

### D. Number sequence (`number-sequence.service.spec.ts`)

**D1 — `nextNumber()` must accept and use a transaction client.** It always uses the root Prisma
connection (`number-sequence.service.ts:18`), so a rollback still consumes the number. Assert that when
passed a transaction client it uses that client. **Currently fails** — the signature has no such
parameter. Write the test against the intended signature `nextNumber(key, prefix, padLength, separator, db?)`.

### E. Invoice payments (`invoices.payments.spec.ts`)

**E1 — a rejected invoice must not leave stock depleted.** Invoice creation moves stock and posts COGS
unconditionally (`invoices.service.ts:217-231`); rejection reverses only the `Invoice` journal
(`:400`). Assert that after create-then-reject, the stock movement is reversed and no net COGS remains.
**Currently fails.**

## How to write them

- Match the existing mocking style in `posting.service.spec.ts` — these are unit tests with mocked
  Prisma, not testcontainer integration tests. Do not add new dependencies.
- Each test's name must state the invariant, e.g.
  `'closePeriod carries opening balances across a gap in the closed-period chain'`.
- Add a one-line comment above each failing test citing the audit finding and `file:line`.
- Mark the currently-failing ones so the suite is runnable and the intent is unmistakable — prefer
  `it.failing(...)` if the Jest version supports it; otherwise leave them as plain failing `it(...)`
  and list them explicitly in your report. Do NOT `skip` them — a skipped test protects nothing.

## Gates

Run `npm --prefix backend test` and report the exact pass/fail counts. Expect NEW FAILURES — that is
correct. **All 121 pre-existing tests must still pass**; if you break one of those, you have changed
behaviour you should not have, so fix your test rather than the source.

## Report contract

Report: files created/modified; every test added with its assertion; which fail today and which pass;
the before/after totals from `npm --prefix backend test`; and confirmation that you modified NO source
file outside the five test paths listed above.
