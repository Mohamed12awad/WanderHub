# Codex brief — column visibility and ordering

Repo: `D:/Personal/NawaHub`, branch `main`. Do NOT commit — the orchestrator reviews and lands.

## Background

`655254f` migrated all 27 `GenericTable` callers to the `columns` contract, and `1df0e86` added
`rowClassName`. Every column now has a stable, untranslated `id` and an explicit `kind`. That was the
prerequisite for this task: under the old `headers[] + renderRow()` shape, reordering columns
mislabelled every mobile card, because labels were matched to cells by child index.

`TableColumn.hideable` exists in the type (`GenericTable.tsx:74`) and **nothing reads it yet**. This
task makes it mean something.

## The task

Let a user choose which columns a list shows, and in what order.

1. **A column menu** in the table toolbar, beside the existing filter/saved-view controls. It lists
   every column by its translated `header`, with a checkbox per column and a way to reorder. A column
   with `hideable: false` is listed but cannot be unchecked — it is the record's identifier (invoice
   number, account code), and a table whose rows cannot be identified is useless.
2. **Reordering** — drag or explicit move-up/move-down. If you reach for a drag library, check it is
   already a dependency first; do not add one. **Move-up/move-down buttons are perfectly acceptable
   and are keyboard-operable by default**, which drag is not. Whatever you choose, the reorder control
   must be usable from the keyboard alone and must have accessible names.
3. **Persistence** — two distinct scopes, do not conflate them:
   - *My last layout* → `localStorage`, keyed per table, alongside `ui-theme` / `ui-density`. This is
     the one that restores automatically on return.
   - *A named saved view* → `SavedView.query`, as versioned URL params (`cols=a,b,c`). `SavedView.query`
     is a URLSearchParams string by schema and DTO (`schema.prisma:974-983`), so it must serialise to
     one. Applying a view replaces route state wholesale.
   Normalise transient `page` out of `saveCurrentView` (`GenericTable.tsx:353-356`) — a saved view
   should not pin the reader to page 4. Leave `limit` in only if you can justify it; density supplies
   the default now (`0f816dc`), so pinning `limit` in a shared view is probably also wrong.
4. **Unknown ids must degrade gracefully.** A stored layout naming a column that no longer exists, or
   missing a column added since, must not blank the table. Render the known ones, drop unknown ids,
   append new columns at the end. Pin this with a test — it is the failure mode that will actually
   happen when a column is renamed in a later release.

## Constraints

- Column identity is `id`, never `header`. A layout stored in English must apply unchanged in Arabic.
  If you find yourself persisting a translated string, stop — that is the bug the contract removed.
- The mobile card layout (`max-md:`) must honour visibility and order too; that is the whole reason
  `data-label` comes from the column definition.
- Do not regress: keyboard-activatable rows and the `cursor-pointer` affordance (`1df0e86` —
  3 tests guard it), named icon controls, `dir="auto"` on `kind: "text"` cells, the COA tree with
  `aria-expanded`, RTL mirroring, density (`0f816dc` — 5 tests).
- Do not touch `frontend/src/index.css` colour tokens (26 contrast assertions) or
  `frontend/src/config/permissions.ts` (a backend test asserts it).
- Backend is out of scope. If you believe a schema change is needed, STOP and report rather than
  making one.

## Tests

- A hidden column disappears from header, body and mobile labels together — not just the header.
- Reordering moves header and cells consistently, and `data-label` still follows its own column.
- A `hideable: false` column cannot be hidden.
- A stored layout containing an unknown id, and one missing a newly added column, both render.
- A layout stored under `en` applies correctly under `ar`.

## Gates — run and report exact output

```
npm --prefix frontend test
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run lint
```

Baseline: frontend **9 files / 57 tests**, typecheck clean, lint **0 errors / 7 warnings** (all 7
pre-existing — do not add an eighth).

## Report contract

State where you put each persistence scope and why; the reorder control you chose and how it is
keyboard-operable; exactly how unknown/missing ids degrade; before/after test counts. If the contract
itself needs a change to make this work, say so plainly rather than working around it — the last
migration silently worked around a missing `rowClassName` and a dropped `cursor-pointer`, and both had
to be found in review.
