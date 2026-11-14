# SignalEQ — Specification & Status

**Paste this at the start of every coding session with any AI tool. Update the "Status" section at the end of each session — nowhere else.**

This is `SPEC.md` at the repo root (renamed from the old pre-pivot v0.9 filename during the 2026-11-13 cleanup). It is still named for the v0.9 milestone in spirit only — that milestone is long past; see "How we got here".

## What it is
SignalEQ is a two-tier, fully static phone comparison and preference-discovery tool. The core idea hasn't changed since v0.9: "best phone" isn't objective — it's a function of personal values. SignalEQ makes those value judgments visible and user-controllable (weighted sliders + toggleable deal-breakers) instead of hiding them behind one ranked list.

What *has* changed is everything about how it's built.

## How we got here (so old context doesn't mislead you)
Three distinct architectures exist in this project's history. Only the third is live.

1. **v0.9 (original draft of this doc):** Flask backend, a single CSV of 21 phones, local dev server. Fully superseded — no Flask code remains.
2. **"v5" ES6-module era:** modular JS, single tier, 16 phones, styled by a standalone stylesheet, and it required a local server for ES module CORS. **This is gone.** The orphaned module set and stylesheet were deleted in the 2026-11-13 cleanup; nothing in the current repo references them, and no doc should describe them as current.
3. **Current (two-tier static, this spec):** what's actually deployed. Described below.

## Current architecture
- `index.html` — marketing/landing page. Fully self-contained (inline CSS + JS). Links to both tools.
- `flagships.html` — flagship tool. Fully self-contained; its `const PHONES = [...]` array is written by `build.py`, not hand-edited.
- `index_budget_phones.html` — budget tool. Same pattern, separate scoring curve.
- `build.py` — the data pipeline. Reads a per-tier CSV, scores every phone with that tier's Python scoring engine, regex-replaces `const PHONES = [...]` inside the matching HTML file, and writes a `rankings_*.json` snapshot. Run `python build.py` to regenerate **both** tiers, or `python build.py flagship` / `python build.py budget` for one.
- `phones_flagship.csv`, `phones_budget.csv` — committed source data: 26 flagship rows and 20 budget rows as of this writing. `python build.py` reads them and regenerates both tiers (HTML `PHONES` arrays + rankings snapshots).
- `rankings_flagship.json`, `rankings_budget.json` — committed build output, for reference/debugging, not read by the HTML at runtime.
- `docs/marketing/` — TikTok channel launch plan and the first three video scripts. Non-code; does not affect the build.
- `research/` — provenance notes for data additions: source URLs, per-field confidence, and any field deliberately left blank (e.g. the vivo X500 Pro Max camera score).
- `signaleq-parity-check/` — optional Node/vitest dev tooling. It runs `build.py`'s `fs_score_*` / `bg_score_*` engines and the inline `base()` copies extracted from both tool pages against a fixed set of phones, then diffs every category. Not wired into CI.
- `.agents/skills/` — repo-scoped agent skills: `signaleq-build-pipeline` (rerun `build.py` after CSV edits) and `signaleq-scoring-parity` (check both copies of the math together).

No server, no ES modules, no build step required to *view* the site — `build.py` only needs to run when the CSVs change. Each HTML file works by double-clicking it open.

## Scoring engines
Two independent curves, tuned per price bracket. **Each currently exists in more than one file with no automated check that the copies agree** — once in `build.py`, once inline in the tier's HTML page. `signaleq-parity-check/` can diff them, but nothing runs it automatically. See `PRODUCTION_READY_V1.md` P0-1 (duplication) and P1-2 (partial automation).

**Flagship (v4 curve)** — implemented in `build.py` (`fs_score_*`) and duplicated inline in `flagships.html`'s `<script>`.

| Category | Max points | Curve |
|---|---|---|
| OS ROM | 25 (Global) / 15 (China) | Fixed preference, not a deal-breaker |
| Battery | 23 | Sweet spot 6500–7500mAh (steep), compressed bonus above |
| Price | 10 | ≤$800 gentle, $800–1000 moderate, >$1000 exponential decay (never zero) |
| Storage | 20 | 256GB=10, 512GB=15, 1TB=20 |
| Charging | 20 | 90W=5, 100W=10, 120W=20 |
| Display | 12 | 6.78–6.89"=10, 6.9"+=12 |
| Camera | 15 | Nanoreview 70→5, 85→10, 95→13, 100→15 |

**Budget (v1 curve)** — implemented in `build.py` (`bg_score_*`) and duplicated inline in `index_budget_phones.html`'s `<script>`.

| Category | Max points | Curve |
|---|---|---|
| Price | 28 | Full pts to ~$380, steep taper to $700, gentle decay after — the dominant factor at this bracket |
| Battery | 23 | Sweet spot 6000–7500mAh, compressed bonus above |
| Performance | 20 | Manual 1–10 judgment rating ×2, not raw benchmarks — **currently scores 0 for every budget phone; see gap below** |
| Charging | 22 | Finer steps: 33/67/80/100/120W |
| Camera | 15 | Same Nanoreview curve as flagship |
| Storage | 20 | Same breakpoints as flagship |
| OS ROM | 18 (Global) / 14 (China) | Narrower gap than flagship — less decisive at this price |
| Display | 12 | Gradual, never zeroed (unlike flagship, no hard 0 below the floor) |

**Known data gap in the budget engine:** `phones_budget.csv` has no `perf` column. `build.py`'s `bg_score_perf` does `max(0, min(20, (perf or 0) * 2))` and the inline budget `base()` does the same with `(p.perf||0) * 2`, so Performance contributes **0 points to all 20 budget phones** and the category is effectively inert (the Speed preset moves nothing). Fixing it needs manual 1–10 ratings added as a `perf` column, then `python build.py`. Tracked as `PRODUCTION_READY_V1.md` P1-8. (`rankings_*.json` stores only total scores plus the raw spec inputs, so the missing category isn't visible there — it shows up as a dead Performance category in the app.)

## Deal-breakers (hard exclusions, toggleable per-session, on by default)
- **Flagship:** battery < 6500mAh, charging < 90W, display < 6.78"
- **Budget:** battery < 5000mAh, charging < 33W

**Confirmed impact (verified 2026-11-13 against the shipped `flagships.html`):** with default settings, iPhone 17 Pro Max (5088mAh, 45W) and Galaxy S26 Ultra (5000mAh, 67W) each trip *two* flagship deal-breakers simultaneously and are always excluded on first load. See `PRODUCTION_READY_V1.md` P0-2.

## Current data snapshot (counted directly from the shipped files)
- Flagship tier: **26 phones** in the `PHONES` array: the original 25 plus the vivo X500 Pro Max (global, 7800mAh / 90W / 6.85" / 256GB / 12GB / $1,599). Two intentional variant duplicates (OPPO Find X9 Ultra china/global, OnePlus 15 256GB/1TB) still render with identical display names. The X500 Pro Max's `camera_quality` is deliberately blank (no Nanoreview composite yet), so `build.py` scores its camera as 0 and prints a warning; its 71.3 total is provisional until that rating is supplied.
- Budget tier: **20 phones**, no duplicates.
- Landing page (`index.html`) says **"26 current-gen flagships"** — this matches the 26 actually shipped. Budget's stated "20 budget and mid-range phones" is correct.
- `phones_budget.csv` carries no `perf` column (see the budget data gap above).

## v1.0 Definition of Done
Carried forward from the original v0.9 DoD, updated for the current architecture:
1. Both tiers' phone data loads correctly from their CSVs via `build.py`, no injection errors.
2. Moving any slider updates rankings live with no reload and no noticeable lag, on both tiers.
3. Both scoring engines produce mathematically correct rankings for a given weight set — hand-verified for at least 2–3 combinations per tier.
4. Edge cases don't break either tier: all sliders at zero, all at max, one at max with the rest at zero.
5. No crashes, no silent failures. Deal-breaker exclusions are visible and explained, not just implied by absence.
6. Landing-page and tool-page copy (phone counts, tier descriptions) matches the data actually shipped.
7. No dead/orphaned code is presented as current in the docs. *(Met by the 2026-11-13 cleanup.)*

## Explicitly out of scope for v1.0
- Adding phones beyond the current CSVs (drop new rows in whenever, but don't block launch on sourcing more)
- Saved profiles, compare mode, export/print, accounts
- Backend API
- Deep visual redesign beyond what's already shipped

## Working rules for this project
- One chunk of work per session; don't stack multiple asks before checking the first one.
- When something breaks, describe it as "expected X, got Y," not "fix it."
- Update the Status section below before ending a session, not the earlier parts of this doc.
- If you edit a CSV, rerun `build.py` before committing — see `PRODUCTION_READY_V1.md` P1-7 for why this matters.

## Status (update this each session)
- Last updated: 2026-11-13
- Current state: two-tier static site (`index.html` + `flagships.html` + `index_budget_phones.html` + `build.py`) is functionally complete for both tiers. The 2026-11-13 cleanup is done: `js/` and `css/` and the legacy boundary skill are removed, `phones_flagship.csv` / `phones_budget.csv` and both rankings JSON files are restored and committed, the landing page's flagship count is corrected to 26, and the docs (this file, `README.md`, `PRODUCTION_READY_V1.md`) have been rewritten to match the real repo layout. A parity suite now exists in `signaleq-parity-check/` (13/13 green) but is not wired into CI. The vivo X500 Pro Max row was added the same day; `build.py` now tolerates its blank `camera_quality` (scores it 0 and warns), so that phone's total is provisional.
- Next single task: fix the default deal-breaker exclusion of iPhone 17 Pro Max / Galaxy S26 Ultra (P0-2).
- Known issues:
  - Scoring logic is still duplicated between `build.py` and each tier page's inline JS; the `signaleq-parity-check` suite exists but nothing runs it automatically (P0-1/P1-2).
  - Budget `perf` data is missing: no `perf` column in `phones_budget.csv`, so the 20-point performance category scores 0 for all 20 budget phones (P1-8).
  - The newly added vivo X500 Pro Max row has no `camera_quality` yet (blank by design), so it scores 0 for camera and its 71.3 total / ranking is provisional until a Nanoreview rating is supplied (P1-9).
  - The "why it ranks here" popup is hover-only and invisible on touch devices (P1-4).
  - Duplicate display names: "OPPO Find X9 Ultra" and "OnePlus 15" each appear twice with no visual distinction (P1-1).
  - `build.py` has no CSV schema validation; a malformed row fails ungracefully (P1-3).
  - Open Graph/Twitter preview image points at `https://dbest180.github.io/phone-picker/og-preview.png` and is unverified (P1-6).
  - No CI reruns `build.py`, so committed HTML/JSON can drift from the CSVs (P1-7).
  - No usage analytics (P1-5).
