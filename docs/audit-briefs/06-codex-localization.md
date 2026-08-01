# Codex brief — route all date/number formatting through the app locale

Repo: `D:/Personal/NawaHub`, branch `main`. Do NOT commit — the orchestrator reviews and commits.

## The defect

`frontend/src/contexts/LanguageContext.tsx` already provides locale-aware formatters and maps
`en → en-US`, `ar → ar-EG` (`LanguageContext.tsx:6-9, 49-58`):

```ts
formatNumber(value, options?)
formatCurrency(value, currency, options?)
formatDate(value, options?)      // defaults to { year:'numeric', month:'short', day:'numeric' }
```

**They are bypassed almost everywhere.** Measured across `frontend/src`:

- **172 occurrences in 51 files** call bare `toLocaleDateString()` / `toLocaleString()` /
  `toLocaleTimeString()` with **no locale argument**, so they follow the *browser's* locale rather than
  the user's selected app language.
- **16 occurrences** use date-fns `format(...)` with hardcoded English patterns like `"dd MMM yyyy"` /
  `"EEE, dd MMM yyyy"` — always English regardless of language.
- `frontend/src/components/Pipeline/Pipeline.tsx:50` hardcodes `"en-US"`.

Real user impact, verified:

| | Date | Number |
|---|---|---|
| `ar-EG` (what the app should show) | `٥ أغسطس ٢٠٢٦` | `١٬٢٣٤٬٥٦٧٫٨٩` |
| bare `toLocaleString()` (what it shows) | `8/5/2026` | `1,234,567.89` |

So an Arabic user gets English month names and Western digits throughout, even though the RTL layout,
mirroring and translations are otherwise complete and good. The 2026-08 audit screenshotted this
(`8/5/2026` in the Arabic invoice list) and misread it as date ambiguity rather than a locale bypass.

## What to do

Route every user-facing date and number through the existing context formatters. **Do not write new
formatting helpers** — `formatDate` / `formatNumber` / `formatCurrency` already exist and are the
single source of truth.

Distinguish the two cases carefully — `toLocaleString()` is used on **both** dates and numbers:

- on a `Date` → `formatDate(value, options?)`
- on a `number` → `formatNumber(value, options?)`, or `formatCurrency(value, currency)` where an
  amount is rendered next to a currency code
- date-fns `format(date, "dd MMM yyyy")` → `formatDate(date, { day:'2-digit', month:'short', year:'numeric' })`

Preserve the intent of any options already passed — e.g. `{ minimumFractionDigits: 2 }`,
`{ maximumFractionDigits: 6 }`, and the combined date+time variants — do not silently drop precision or
drop the time portion.

**19 of the 51 files do not currently import `useLanguage`.** Add it. If a file is not a component and
cannot use a hook, hoist formatting to the calling component rather than importing the context
imperatively or re-implementing `Intl` locally — say so in your report if you hit one.

Where a raw machine value is intentional — an `<input type="date">` value, a CSV export cell, a
`key`, a `data-*` attribute, an API payload, a test fixture — **leave it alone** and note it. Only
user-facing display text should change.

## Constraints

- Do not change `LanguageContext.tsx` itself beyond what is strictly needed; its API is already right.
- Do not regress the accessibility or RTL work: keyboard-activatable rows, named icon controls,
  `dir="auto"` on mixed-content cells, the COA tree, the mobile card layout.
- Do not touch `frontend/src/index.css` colour tokens — 26 contrast assertions guard them.
- Do not touch `frontend/src/config/permissions.ts` (a backend test asserts its contents).
- Backend is out of scope entirely.
- Another task may be editing `frontend/src/pages/Payments.tsx` and `frontend/src/pages/Finance.tsx`.
  Check `git status` first; if either has uncommitted changes, **skip those two files** and say so in
  your report rather than fighting the other edit.

## Tests

Add Vitest tests under `frontend/src/**/__tests__/` in the existing style:

- `formatDate` and `formatNumber` produce Arabic-Indic output under `ar` and Western under `en` —
  pinning the behaviour the app is supposed to have.
- At least one component test rendering a date-bearing cell under `ar` and asserting it is **not** the
  browser-default `M/D/YYYY` form.

## Gates — run and report exact output

```
npm --prefix frontend test
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run lint
```

Baseline: frontend **5 files / 37 tests** (including 26 contrast assertions), typecheck clean, lint
0 errors. All must still pass.

## Report contract

Report: the count of call sites converted by category (date / number / currency / date-fns), the files
where you added `useLanguage`, every site you deliberately left as a raw machine value with the reason,
any file you skipped due to a concurrent edit, and exact before/after test counts. If some of the 172
turn out to be non-display uses, say how many — an accurate smaller number is better than a padded one.
