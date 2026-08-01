# Codex brief — migrate GenericTable callers to the `columns` contract

Repo: `D:/Personal/NawaHub`, branch `main`. Do NOT commit — the orchestrator reviews and commits.

## Background

Commit `d687375` added a column contract to `frontend/src/components/common/GenericTable.tsx`. It is
**additive**: `columns` supersedes the legacy `headers[] + renderRow()` when present, and the legacy
path still works, so callers migrate one at a time.

```ts
export type TableColumn<T> = {
  id: string;            // stable, untranslated — sort + persistence identity
  header: string;        // translated display label
  sortKey?: string;      // API sort field; omit if not sortable
  kind?: "text" | "number" | "status" | "date" | "actions";
  cell: (item: T) => ReactNode;
  hideable?: boolean;    // default true
  mobileLabel?: string;  // overrides `header` on the mobile card
};
```

Plus two companion props used only with `columns`:
- `onRowClick?: (item: T) => void` — the row-level click target
- `renderActions?: (item, handleDelete) => ReactNode` — the trailing actions cell

**Read `frontend/src/components/common/__tests__/GenericTable.columns.test.tsx` first — it is the
specification.** It pins: a cell's mobile label follows its own column (not child index), labels stay
correct when column order is reversed, a hidden column drops cleanly, sorting uses `sortKey` not the
translated header, and numeric columns get tabular figures with end alignment.

## Why the old shape had to go (so you migrate with the right intent)

`headers[]` and `renderRow()` were related only by array position. `withMobileLabels` matched a row's
Nth child to `headers[N]` via `cloneElement`, and the translated header string doubled as the sort key
— `Finance.tsx:136` literally builds a map from translated labels back to API fields to cope. Your
migration should delete those workarounds, not carry them across.

## The task

Migrate the **27** `GenericTable` callers to `columns`. Find them with:
`grep -rl "GenericTable" frontend/src --include=*.tsx`

For each caller:

1. Convert its `headers` + `renderRow` into a `columns` array. Give every column a stable `id`
   (`invoiceNumber`, `customer`, `total`, `dueDate`, …) — never a translated string.
2. Set `kind` honestly: money/quantities `number`; badges `status`; dates `date`; the trailing
   actions cell is `renderActions`, not a column. Everything else `text`.
3. Move the row's `onClick` to `onRowClick`, and the actions dropdown to `renderActions`.
4. Delete the now-dead `*Row.tsx` component if nothing else uses it — check first. If a row component
   holds hooks or state (e.g. `UserRow` uses `useAuth`/`useQueryClient` for a toggle), keep a small
   component for that cell or for `renderActions` rather than inlining hooks into a `cell` function.
   `cell` is called during render and must not use hooks.

### Sort keys must match the backend allow-lists

Commit `6af0f15` added server-side sort validation; an unrecognised key now throws
`BadRequestException`. Use exactly these as `sortKey`:

| Surface | Allowed `sortKey` values | Source |
|---|---|---|
| Invoices | `invoiceNumber`, `total`, `dueDate` | `backend/src/finance/invoices.service.ts:88-92` |
| Payments | `date`, `amount` | `invoices.service.ts:101-104` |
| Quotes | `quoteNumber`, `total`, `validUntil`, `createdAt` | `backend/src/finance/quotes.service.ts:63-68` |

For other modules, read that module's service to find its accepted sort fields. **If a column has no
server-supported sort field, omit `sortKey`** rather than inventing one — silently sending an
unsupported key now produces a 400.

Note invoices no longer support sorting by "Outstanding" (a computed `total - totalPaid`); do not add
a `sortKey` for it.

Once a caller is migrated, its bespoke translated-label→API-field `sortMap` should disappear.

## Constraints

- **Do not change `GenericTable`'s contract itself**, only migrate callers. If a caller genuinely
  cannot be expressed — say, it renders a colspan summary row — STOP and report it rather than
  bending the contract or leaving a half-migration.
- Preserve the localization work from `f564f78`: cells must keep using `formatDate` / `formatNumber` /
  `formatCurrency` from `useLanguage`. Do not reintroduce bare `toLocaleString()`.
- Do not regress: keyboard-activatable rows (`ui/table.tsx`), named icon controls, the mobile card
  layout, RTL mirroring, the COA tree.
- Do not touch `frontend/src/index.css` colour tokens (26 contrast assertions guard them) or
  `frontend/src/config/permissions.ts` (a backend test asserts it).
- Backend is out of scope.

## Tests

- The 5 existing column-contract tests must keep passing unchanged.
- Add a render test for at least three migrated callers of different shapes (one with a status badge,
  one with money, one with row actions) asserting the right cells render with the right `data-label`.
- Add one test proving a migrated table sends the API `sortKey` — not the translated header — as the
  `sort` param.

## Gates — run and report exact output

```
npm --prefix frontend test
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run lint
npm --prefix backend test
```

Baseline: frontend **7 files / 45 tests**, backend **30 suites / 199 tests**, typecheck clean, lint
0 errors. All must still pass.

## Report contract

List every caller migrated and every `*Row.tsx` deleted. Name any caller you could NOT migrate and
why. State the `sortKey` you chose per sortable column and which backend allow-list you verified it
against. Exact before/after test counts. If migrating a caller reveals a bug in the contract itself,
say so plainly — that is more valuable than working around it.
