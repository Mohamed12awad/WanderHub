# TASK: Read-only audit of NawaHub authorization coverage and frontend UI/UX + accessibility

You are performing a **READ-ONLY AUDIT**. Do NOT modify, create, or delete any file.
Do NOT run formatters, do NOT write tests, do NOT apply fixes. Your entire deliverable is a
written findings report printed as your final message. If you want to fix something, describe
the fix in one or two lines instead of applying it.

## Repo context

NawaHub, a single-company ERP. `backend/` = NestJS 11 + Prisma 7 + Postgres.
`frontend/` = React 19 + Vite + Tailwind 4 + Radix/shadcn + TanStack Query + react-hook-form/zod.
English + Arabic (RTL) via `frontend/src/i18n/` and `frontend/src/contexts/LanguageContext.tsx`.

OUT OF SCOPE — do not report these, they are known and accepted:
- missing multi-tenancy / tenantId (single-tenant by design)
- missing HR/payroll and manufacturing modules
- the GL posting engine's arithmetic (a separate audit lane covers it)

=========================================================
## PART 1 — Authorization coverage (highest priority)
=========================================================

Start from `frontend/src/config/permissions.ts` (the PERMISSION_REGISTRY) and the backend guard —
find it under `backend/src/auth/**` / `backend/src/common/**` (look for `@RequirePermission`
and a PermissionGuard, plus any APP_GUARD registration in `app.module.ts` / `main.ts`).

Produce a COMPLETE route inventory across every `backend/src/**/*.controller.ts`:

| Controller file:line | Verb + path | Guard/decorator | Permission required | VERDICT |

VERDICT ∈ GUARDED / UNGUARDED / PUBLIC-BY-DESIGN / MISMATCH.

Investigate specifically:
1. Every route with NO permission decorator. Is a global guard registered? If so, enumerate every
   `@Public()`/`@SkipAuth()` escape hatch and judge each: legitimate (login, health, webhook,
   tracking pixel) or an accidental hole?
2. Routes authenticated but not permission-checked — any logged-in user can call them.
3. Verb/permission mismatches: mutations (POST/PATCH/DELETE) gated only by a `:view` permission,
   or destructive routes gated by a weaker permission than their read counterpart.
4. `backend/src/public-api/**` and `backend/src/api-keys/**`: how are API keys authenticated and
   scoped? Hashed at rest? Revocable? Expiring? Rate-limited? Can an API key exceed the
   permissions of the user that created it?
5. `backend/src/common/visibility.service.ts` — `resolveScope()` returns `'all'` as its FINAL
   fallback. Enumerate every call site of `resolveScope` / `VisibilityService.ownershipWhere` and
   determine which modules apply scoping and which query with NO scope filter at all. Is the
   fail-open default reachable in a way that leaks records to a narrowly-scoped role?
6. Object-level authorization / IDOR: do GET-by-id, PATCH, and DELETE handlers verify the record
   is within the caller's scope, or do they fetch by id alone?
7. Segregation of duties: trace `backend/src/common/approval.service.ts`. Can one user create a
   supplier, raise a vendor bill against it, approve that bill, and record its payment? Is there a
   self-approval block, and is it consistently applied across invoices/quotes/POs/bills/expenses?
   (Note: `invoices.service.ts:414` has an explicit self-rejection block — check whether the
   equivalent exists on every other approve/reject path, and whether the `*` permission bypasses it.)
8. Auth hardening in `backend/src/auth/**`: password hashing cost, refresh-token rotation and
   reuse detection, token revocation on logout/password change, JWT expiry, cookie flags
   (httpOnly/secure/sameSite), and whether `backend/src/auth/auth.service.spec.ts` covers them.

=========================================================
## PART 2 — Frontend UI/UX + accessibility (static)
=========================================================

Shared primitives (assume reuse; recommendations must extend these, not add parallel components):
`frontend/src/components/common/` — PageShell, PageHeader, DetailPageLayout, DetailHeader,
EntityFormPage, GenericTable, GenericKanban, StickyFormBar, BulkActionBar, SearchPalette,
PermissionGate, EmptyState, ErrorState, PageSkeleton, ConfirmDialog, RowActions.
Primitives: `frontend/src/components/ui/` (shadcn/Radix). Tokens: `frontend/src/index.css`.

Report on:

**A. Accessibility, mapped to specific WCAG 2.1 AA success criteria.**
- SC 1.4.3 Contrast: read the actual HSL custom properties in `frontend/src/index.css` for BOTH
  `:root` and `.dark` (`--muted-foreground`, `--primary`, `--destructive`, `--border`, `--ring`,
  `--accent`, and the sidebar tokens). COMPUTE real contrast ratios against their intended
  backgrounds and report every pair below 4.5:1 (3:1 large text). SHOW THE NUMBERS in a table.
- SC 1.4.11 Non-text Contrast: borders, focus rings, input outlines, icon-only controls (≥3:1).
- SC 2.1.1 / 2.1.2 Keyboard: custom interactive elements (`div`/`span` with onClick) lacking
  role, tabIndex, and key handlers. Radix dialog/popover focus management.
- SC 2.4.7 Focus Visible: grep for `outline-none` / `focus:outline-none` applied without a
  replacement `focus-visible` ring.
- SC 3.3.1 / 3.3.2 / 1.3.1: react-hook-form + zod errors — are they wired to inputs via
  `aria-invalid` and `aria-describedby`, or rendered as loose text? Are all inputs labelled?
- SC 4.1.2 Name, Role, Value: icon-only buttons without `aria-label`; GenericTable sort headers;
  switches/toggles.
- RTL correctness: count physical-direction Tailwind utilities (`ml-`, `mr-`, `pl-`, `pr-`,
  `left-`, `right-`, `text-left`, `text-right`) inside `components/common/` and `components/ui/`
  that should be logical (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) for Arabic to mirror.
  Report the worst offending files WITH COUNTS.

**B. Information density and action efficiency for a data-heavy ERP.**
- GenericTable: does it support column sizing/visibility, sticky header, virtualization, sorting,
  inline editing? What breaks with 50+ columns or 10k rows?
- Keyboard shortcuts and global search reach (SearchPalette / cmdk): what fraction of high-frequency
  actions are reachable without a mouse?
- Bulk actions, modal depth/nesting in the quote→invoice→payment flow, and unsaved-change guards.
- Line-item grids on invoice/quote/PO forms: keyboard-only row add/remove, tab order, totals feedback.

**C. Design-system consistency.**
- Hardcoded colors/spacing bypassing the tokens in `index.css` — grep for hex literals and
  `text-[#`, `bg-[#`, arbitrary `w-[…px]` values in components. Report counts by file.
- Dark-mode token coverage gaps (a token defined in `:root` but missing from `.dark`).
- Note as a performance/privacy issue: `frontend/src/index.css:1` does a remote
  `@import url("https://fonts.googleapis.com/css2?family=Cairo…")` — render-blocking third-party
  request on every boot. Also check whether `--font-geist` is declared in the `@theme` block while
  `body` actually sets `Cairo` (a token/usage divergence).

=========================================================
## REPORT CONTRACT
=========================================================

Markdown only:

```
## Part 1 — Authorization
### Route inventory
<full table>
### Findings
### [P0|P1|P2|P3] <title>
- **Where:** `path/to/file.ts:LINE`
- **What:** one sentence.
- **Failure scenario:** concrete — "a user holding only role X calls Y and gets/changes Z".
- **Confidence:** CONFIRMED (read the code proving it) | PLAUSIBLE (needs runtime check)
- **Fix sketch:** 1-3 lines, described not written.

## Part 2 — UI/UX & Accessibility
### Contrast table
| token | light HSL | bg | ratio | dark HSL | ratio | verdict |
### Findings
<same shape; tag each a11y finding with its SC number, e.g. "(SC 1.4.3)">

## Refuted hypotheses
<anything above that you checked and found to be FINE — list it explicitly>
```

Severity: P0 = auth bypass / data exposure / silent corruption. P1 = user-visible breakage or
compliance violation. P2 = edge-case correctness or meaningful friction. P3 = hygiene.

Rules:
- EVERY finding cites `file:line`. No line reference = do not report it.
- If a hypothesis is WRONG, say so explicitly under "Refuted hypotheses". A refuted hypothesis is a
  valuable result. Do NOT invent findings to fill the report.
- Rank most-severe first.
