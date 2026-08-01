# Gemini brief — multimodal UI/UX audit (READY, NEVER RUN)

Status: **not executed.** The 2026-08 audit was specified as tri-model (Claude + OpenAI + Gemini).
Neither the Gemini CLI nor the Antigravity CLI was installed on the machine; `@google/gemini-cli`
0.53.1 was installed during the session but exits with:

> Please set an Auth method in your `~/.gemini/settings.json` or specify one of the following
> environment variables: `GEMINI_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_GENAI_USE_GCA`

That is an interactive login only the operator can complete, so the lane was reported as ❌ rather
than quietly dropped. Nothing in `docs/AUDIT-2026-08.md` is attributed to Gemini.

## To run it

```bash
# once, either:
gemini                       # then choose "Login with Google"
# or:
setx GEMINI_API_KEY "…"      # from https://aistudio.google.com/apikey

gemini -p "$(cat docs/audit-briefs/04-gemini-visual-ui.md)"
```

The captured frames referenced below were written to a session scratchpad and are almost certainly
gone. Regenerate them first with the harness described in `docs/AUDIT-2026-08.md` §3 (boot the app via
the `run-nawahub` skill, then sweep routes × light/dark × 1440/390 × en/ar), or point Gemini at a fresh
capture. **Do not** trust an old path — the first two capture runs of the original audit produced 161
frames that were all invalid, and the lesson was to assert each frame is really the app before
analysing it.

---

## TASK

You are performing a **READ-ONLY multimodal UI/UX audit** of the NawaHub ERP. Do not modify any file.
Your deliverable is a written report.

Repo: `D:/Personal/NawaHub` — React 19 + Vite + Tailwind 4 + Radix/shadcn frontend, English + Arabic
(RTL). Read `docs/AUDIT-2026-08.md` §3 first: it records what has already been measured, so you are
adding visual judgement rather than repeating DOM measurement.

**Out of scope — already fixed, do not re-report:** colour token contrast (17 pairs corrected and
guarded by `frontend/src/config/__tests__/contrast.test.ts`), unnamed icon-only buttons, keyboard
activation of table rows, the RTL start-truncation bug, and Chart-of-Accounts flat pagination.

### What to judge, per screenshot

For each frame you are given, in both light and dark and at each viewport:

1. **Information density.** Is the screen carrying its weight for a data-dense ERP, or is chrome
   crowding out data? Count how much vertical space precedes the first row. Judge whether a finance
   user scanning hundreds of records would be fighting the layout.
2. **Visual hierarchy.** Does the eye land on the right thing first — the number that matters, the
   status, the exception? Or does every element compete?
3. **Alignment and rhythm.** Numeric columns right-aligned; consistent spacing scale; no ragged edges
   between adjacent cards or table sections.
4. **Arabic / RTL frames specifically.** Is the mirroring complete and *natural*, or merely flipped?
   Look for: icons that should not mirror (clocks, logos, media controls), mixed-direction strings,
   number formatting, and any element that reads awkwardly rather than incorrectly.
5. **Dark mode.** Not just contrast — does it look designed, or like light mode with inverted values?
   Check elevation, borders, and whether status colours still carry meaning.
6. **Cross-screen consistency.** Compare frames against each other. The same concept should look the
   same everywhere: status badges, empty states, action placement, table headers.

### Report contract

Markdown only. For each finding:

```
### [P1|P2|P3] <short title>
- **Frame(s):** <filename(s)>, viewport, theme, locale
- **What:** one sentence naming the visual defect.
- **Why it matters:** the concrete user cost — what task gets slower or riskier.
- **Fix:** what to change, in design terms.
```

Then a short **"What is working well"** section — a design review that only lists faults is not a
useful one, and this codebase has genuinely strong shared primitives.

Rules:
- Every finding must name the frame it came from. No frame reference = do not report it.
- If a frame looks fine, say so. A clean result is a valid result; do not invent findings to fill space.
- Do not report anything in the out-of-scope list above.
- Rank most-severe first.
