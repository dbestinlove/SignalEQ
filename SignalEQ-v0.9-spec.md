# SignalEQ — Spec & Status

**Paste this at the start of every coding session with any AI tool. Update the "Status" section at the end of each session — nowhere else.**

> Note on the filename: this doc is still named for the pre-pivot v0.9 milestone (Flask + single CSV). That milestone is long past — see "How we got here" below. Recommend renaming to `SPEC.md` or `SignalEQ-v1-spec.md` as part of the P0-4 cleanup in `PRODUCTION_READY_V1.md`, but keeping the old name here so this update is easy to diff against the version you had.

## What it is
SignalEQ is a two-tier, fully static phone comparison and preference-discovery tool. The core idea hasn't changed since v0.9: "best phone" isn't objective — it's a function of personal values. SignalEQ makes those value judgments visible and user-controllable (weighted sliders + toggleable deal-breakers) instead of hiding them behind one ranked list.

What *has* changed is everything about how it's built.

## How we got here (so old context doesn't mislead you)
Three distinct architectures exist in this project's history. Only the third is live.

1. **v0.9 (this doc, original draft):** Flask backend, single CSV (`phones_clean`, 21 phones), local dev server. Fully superseded — no Flask code remains in what was shared for this audit.
2. **"v5" ES6-module era (still described in the old `README.md`):** `index.html` importing `js/app.js`, `js/data.js`, `js/scorer.js`, styled by `css/styles.css`. Single tier, 16 phones, required a local server for ES module CORS. **This is dead code.** No current page loads these files. Keep reading before you touch anything in `js/` or `css/`.
3. **Current (two-tier static, this spec):** what's actually deployed. Described below.

## Current architecture
- `index.html` — marketing/landing page. Fully self-contained (inline CSS + JS). Links to both tools.
- `flagships.html` — flagship tool. Fully self-contained; its `const PHONES = [...]` array is written by `build.py`, not hand-edited.
- `index_budget_phones.html` — budget tool. Same pattern, separate scoring curve.
- `build.py` — the data pipeline. Reads a per-tier CSV, scores every phone with that tier's Python scoring engine, regex-replaces `const PHONES = [...]` inside the matching HTML file, and writes a `rankings_*.json` snapshot. Run with `python build.py` (both tiers) or `python build.py flagship` / `python build.py budget`.
- `phones_flagship.csv`, `phones_budget.csv` — source data. Not included in the files reviewed for this audit; confirm they're present and current in the repo.
- `rankings_flagship.json`, `rankings_budget.json` — build output, for reference/debugging, not read by the HTML at runtime.

No server, no ES modules, no build step required to *view* the site — `build.py` only needs to run when the CSVs change. Each HTML file works by double-clicking it open.

## Legacy code — do not build on this, do not "fix" it in place
- `js/app.js`, `js/data.js`, `js/scorer.js`, `css/styles.css` — orphaned "v5" single-tier module set. `css/styles.css` additionally contains two full, contradictory theme definitions concatenated together with a stray unattached CSS declaration in between — it will not render correctly even if you did wire it back up.
- `phone_equalizer.html`, `phone_scorer.py`, `phones_clean.csv`, `rankings.json` — referenced by the old README as a "legacy single-file version." Presence in the current repo is unverified; treat as unused unless you confirm otherwise.
- See `PRODUCTION_READY_V1.md` (P0-4/P0-5) for the recommended cleanup.

## Scoring engines
Two independent curves, tuned per price bracket. **Each currently exists in more than one file with no automated check that the copies agree** — see `PRODUCTION_READY_V1.md` P0-1.

**Flagship (v4 curve)** — implemented in `build.py` (`fs_score_*`) and duplicated inline in `flagships.html`'s `<script>`. A third, dead copy exists in the orphaned `js/scorer.js`.

| Category | Max points | Curve |
|---|---|---|
| OS ROM | 25 (Global) / 15 (China) | Fixed preference, not a deal-breaker |
| Battery | 23 | Sweet spot 6500–7500mAh (steep), compressed bonus above |
| Price | 10 | ≤$800 gentle, $800–1000 moderate, >$1000 exponential decay (never zero) |
| Storage | 20 | 256GB=10, 512GB=15, 1TB=20 |
| Charging | 20 | 90W=5, 100W=10, 120W=20 |
| Display | 12 | 6.78–6.89"=10, 6.9"+=12 |
| Camera | 15 | Nanoreview 70→5, 85→10, 95→13, 100→15 |

**Budget (v1 curve)** — implemented in `build.py` (`bg_score_*`) and duplicated inline in `index_budget_phones.html`'s `<script>`. No legacy JS copy exists for this tier.

| Category | Max points | Curve |
|---|---|---|
| Price | 28 | Full pts to ~$380, steep taper to $700, gentle decay after — the dominant factor at this bracket |
| Battery | 23 | Sweet spot 6000–7500mAh, compressed bonus above |
| Performance | 20 | Manual 1–10 judgment rating ×2, not raw benchmarks |
| Charging | 22 | Finer steps: 33/67/80/100/120W |
| Camera | 15 | Same Nanoreview curve as flagship |
| Storage | 20 | Same breakpoints as flagship |
| OS ROM | 18 (Global) / 14 (China) | Narrower gap than flagship — less decisive at this price |
| Display | 12 | Gradual, never zeroed (unlike flagship, no hard 0 below the floor) |

## Deal-breakers (hard exclusions, toggleable per-session, on by default)
- **Flagship:** battery < 6500mAh, charging < 90W, display < 6.78"
- **Budget:** battery < 5000mAh, charging < 33W

**Confirmed impact (as of this audit):** with default settings, iPhone 17 Pro Max (5088mAh, 45W) and Galaxy S26 Ultra (5000mAh, 67W) each trip *two* flagship deal-breakers simultaneously and are always excluded on first load. See `PRODUCTION_READY_V1.md` P0-2.

## Current data snapshot (counted directly from the shipped HTML)
- Flagship tier: **25 phones** in the array, including two intentional variant duplicates (OPPO Find X9 Ultra china/global, OnePlus 15 256GB/1TB) that currently render with identical display names.
- Budget tier: **20 phones**, no duplicates.
- Landing page (`index.html`) copy says "22 current-gen flagships" — this doesn't match the 25 actually shipped. Budget's stated "20 budget and mid-range phones" is correct.

## v1.0 Definition of Done
Carried forward from the original v0.9 DoD, updated for the current architecture:
1. Both tiers' phone data loads correctly from their CSVs via `build.py`, no injection errors.
2. Moving any slider updates rankings live with no reload and no noticeable lag, on both tiers.
3. Both scoring engines produce mathematically correct rankings for a given weight set — hand-verified for at least 2–3 combinations per tier.
4. Edge cases don't break either tier: all sliders at zero, all at max, one at max with the rest at zero.
5. No crashes, no silent failures. Deal-breaker exclusions are visible and explained, not just implied by absence.
6. Landing-page and tool-page copy (phone counts, tier descriptions) matches the data actually shipped.
7. No dead/orphaned code is presented as current in the docs.

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
- Last updated: 2026-08-28
- Current state: two-tier static site (`index.html` + `flagships.html` + `index_budget_phones.html` + `build.py`) is functionally complete for both tiers. Documentation was badly out of sync with the shipped code — describing an orphaned single-tier ES6-module architecture as current — and has been corrected in this pass. Several P0 issues identified; see `PRODUCTION_READY_V1.md`.
- Next single task: fix the default deal-breaker exclusion of iPhone 17 Pro Max / Galaxy S26 Ultra (P0-2).
- Known issues: scoring logic duplicated 2–3× per tier with no parity check; landing-page flagship count is wrong; the "why it ranks here" popup is hover-only and invisible on touch devices; `css/styles.css` is internally broken; orphaned legacy files still exist and are still documented as current.
