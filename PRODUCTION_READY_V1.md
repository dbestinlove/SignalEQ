# SignalEQ — Production Readiness: Path to v1.0

Acting as lead dev/product on this pass. The original audit below was verified directly against the shipped files (`index.html`, `flagships.html`, `index_budget_phones.html`, `build.py`), not inferred from docs — the docs were, in fact, the thing most out of sync with reality (see P0-4). **Status updated 2026-11-13 after the repo cleanup pass**; resolved items are marked so the remaining list is honest.

## Executive summary
The two-tier static site (flagship + budget, CSV → `build.py` → self-contained HTML) is functionally solid and further along than the docs suggested. The 2026-11-13 cleanup closed the repo-layout and documentation blockers: the orphaned legacy code is deleted, both CSVs and both rankings JSON files are restored and committed, the landing page's flagship count is corrected to 26, and `README.md` / `SPEC.md` now describe the real architecture.

What remains before v1.0 is **product and data work, not architecture**: two of the most recognizable flagship phones still vanish by default, the budget performance category scores zero for all 20 budget phones because the source data has no `perf` column, and the "why" popup is still hover-only. All of it is fixable in well under a day; none of it requires touching the scoring architecture.

---

## P0 — Launch blockers

### P0-1: Scoring logic is duplicated with no parity check — INTERIM STEP DONE
Flagship scoring exists in **two live places**: `build.py` (`fs_score_*`) and inline in `flagships.html`'s `<script>`. Budget scoring likewise in **two**: `build.py` (`bg_score_*`) and inline in `index_budget_phones.html`. The dead third flagship copy was deleted with the legacy JS set in the 2026-11-13 cleanup — **that interim step is done.**

I compared the live copies (`build.py` vs. each HTML's inline JS) line by line during the 2026-08-28 audit — **they currently match.** But nothing enforces that. A boundary-condition tweak, a rounding change, or a copy-paste slip in either file will silently make the on-page score disagree with `rankings_*.json`, with no error and no test to catch it. A parity suite now exists (`signaleq-parity-check/`, see P1-2), but it is manual/optional, not a gate.

**Remaining fix for v1.0 (small):** add a short manual note to the pre-launch checklist confirming the two live copies still match before each release, until the automated check is wired in.

**Fix for v1.1+ (bigger, recommended):** have `build.py` generate the scoring function itself into the HTML at build time (or a JSON-encoded curve description the inline JS reads), so the CSV + `build.py` become the *only* hand-edited source of the math. Alternatively, wire `signaleq-parity-check` into CI so divergence fails the build.

### P0-2: iPhone 17 Pro Max and Galaxy S26 Ultra are excluded by default — OPEN
Confirmed directly from `flagships.html`'s data (re-verified 2026-11-13, and the deal-breaker toggles are still `checked` by default):

| Phone | Battery | Charging | Flagship floor | Result |
|---|---|---|---|---|
| iPhone 17 Pro Max | 5,088mAh | 45W | 6,500mAh / 90W | Fails **both** deal-breakers |
| Galaxy S26 Ultra | 5,000mAh | 67W | 6,500mAh / 90W | Fails **both** deal-breakers |

Both are permanently struck through in the "excluded" pile on first load, with only a small `excl-note` line explaining why. A first-time visitor who opens the tool expecting to compare "the top flagships" and doesn't see the iPhone or the Galaxy Ultra — with no obvious explanation — is a real trust/first-impression risk, especially since these are two of the most-searched flagship phones on the market.

**Recommend (combine both for v1.0):**
1. **Make the exclusion legible.** Right now it's a small muted line at the bottom of the page. Add a higher-contrast, specific callout the first time a recognizable phone is excluded (e.g., "iPhone 17 Pro Max excluded — battery and charging both below your floor. Adjust deal-breakers →").
2. **Default deal-breaker toggles to off** for first-time visitors, so nothing disappears silently. Scoring already penalizes weak battery/charging heavily through the weighted categories — the hard exclusion doesn't need to be the default experience. Let people opt into strict filtering.

**Defer to P1/post-launch:** whether "charging < 90W" should be a hard deal-breaker at all, given it excludes an entire vendor's flagship line by design, not by outlier spec. That's a real product call worth revisiting with actual usage data, not a pre-launch scramble.

### P0-3: Landing page states the wrong flagship count — RESOLVED (2026-11-13)
`index.html`'s flagship tool card used to say **"22 current-gen flagships"** while the actual `PHONES` array in `flagships.html` now has **26 entries** (budget's "20 budget and mid-range phones" was already correct). The copy says **"26 current-gen flagships"** and matches the shipped array — verified 2026-11-13 (26 after the vivo X500 Pro Max row was added).

Worth keeping in mind: the count is still hardcoded, so it will drift again the next time the CSV changes. The meta description already hedges with "20+ Android phones"; matching that pattern for the on-page card copy would remove the recurring chore, but it is not a launch blocker.

### P0-4: Orphaned legacy architecture is still documented as current — RESOLVED (2026-11-13)
An earlier single-tier, 16-phone, ES6-module architecture (`js/`, `css/`) was still sitting in the repo and was documented in the previous `README.md` as the current "v5" structure, complete with setup instructions ("serve via local server for ES module CORS") that did not apply. **No live page loaded any of it.**

The cleanup removed the orphaned `js/` and `css/` directories and the stale legacy-boundary skill; the four stale root files from the v0.9 era had already been deleted in commit `46fc559`. `README.md` and `SPEC.md` have been rewritten around the real two-tier architecture, and this document no longer cites dead paths as current. Also met: v1.0 Definition of Done item 7 (no orphaned code presented as current).

### P0-5: The orphaned stylesheet was internally broken — RESOLVED (2026-11-13)
Not a runtime risk (nothing loaded it), but it was a trap for anyone reaching for it as a style reference: the file contained **two full, contradictory copies of the stylesheet concatenated together** — a neon dark/light theme, then a CSS custom-property declaration block sitting outside any selector (invalid CSS), then a second, older non-neon theme with a completely different color system. It was deleted with the `css/` directory in this cleanup. If a style reference is ever wanted, use the inline `<style>` blocks in the shipped HTML pages — they are the real thing.

---

## P1 — Should fix before or soon after launch

**P1-1 — Duplicate model names are visually indistinguishable.** (Open; re-verified 2026-11-13.) "OPPO Find X9 Ultra" appears twice in the flagship data (china $1,199 vs. global $1,599), and "OnePlus 15" appears twice (256GB $679 vs. 1TB $889, both global). Both render with identical names in the rankings list and hover popup. Recommend appending the distinguishing spec to the display name (e.g., "OPPO Find X9 Ultra (Global)").

**P1-2 — No automated tests — PARTIALLY RESOLVED (2026-11-13).** A dedicated parity suite now exists in `signaleq-parity-check/`: a vitest project that extracts each tool page's inline `base()` function, runs `build.py`'s Python engine via `python/score.py`, and diffs every category for a fixed set of phones across both tiers (13 tests, including drift/divergence cases that are expected to fail the check). **Still missing:** nothing runs it automatically (no CI job, no pre-commit hook), and there is no test coverage for `build.py`'s CSV parsing/injection or JSON output. Closing the loop means wiring `npm test` (or `vitest run`) into CI.

**P1-3 — No CSV schema validation in `build.py`.** (Open.) A malformed row (missing column, non-numeric price, empty `os_type`) raises an unhandled exception or silently coerces oddly. Add row-level validation with a clear error message pointing at the offending row.

**P1-4 — The "why it ranks here" popup is hover-only.** (Open; re-verified 2026-11-13 — both pages still bind only `mouseenter`/`mouseleave`, with `pointer-events: none` on the container.) There's no touch equivalent, so on mobile visitors never see the explanation panel that's central to the tool's actual pitch ("see why, not just who"). Recommend a tap-to-toggle handler alongside the existing hover behavior.

**P1-5 — No usage analytics.** (Open.) You won't know which tier, presets, or deal-breaker settings people actually use post-launch — which directly matters for revisiting the P0-2 decision with real data. Even a minimal, privacy-respecting pageview/event counter would help.

**P1-6 — Unverified social preview asset.** (Open; re-verified 2026-11-13.) `index.html` still references `https://dbest180.github.io/phone-picker/og-preview.png` for Open Graph/Twitter previews. Confirm this file actually exists at that path before launch, or shared links will show a broken image.

**P1-7 — No CI keeping `build.py` output in sync with the CSVs — DATA HALF RESOLVED (2026-11-13).** `phones_flagship.csv` and `phones_budget.csv` (and both rankings JSON snapshots) are now committed, so the repo is the source of truth again — that half is done. **Still open:** if a CSV is edited but `build.py` isn't rerun before commit, the live HTML silently goes stale relative to the source data, with nothing to catch it. A GitHub Action that runs `python build.py` and fails the PR if the output differs from what's committed would close this cheaply. (As of 2026-11-13 the pipeline is idempotent: running `python build.py` against the committed CSVs reproduces the committed HTML and both rankings JSON files byte for byte, so a zero-diff check is a valid CI gate from day one.)

**P1-8 — Budget performance category scores 0 for all 20 phones — OPEN (data gap).** `phones_budget.csv` has no `perf` column (header: `model, battery_mAh, charging_W, camera_quality, display_size_inches, storage_gb, ram_gb, price_usd, os_type`). The budget engine expects a manual 1–10 judgment rating:

- `build.py`: `bg_score_perf` does `max(0, min(20, (perf or 0) * 2))`; with no `perf` key this returns `0`.
- `index_budget_phones.html` inline `base()`: `Math.max(0, Math.min(20, (p.perf||0) * 2))`; same `0`.

So the 20-point Performance category (default slider weight 20) contributes nothing to any budget phone's score. The rankings themselves still work, but a whole category is inert and the "Speed" preset has no effect. **Fix:** add a `perf` column with manual 1–10 ratings for all 20 budget rows (human judgment — daily-use smoothness and light gaming, not benchmark scores), then rerun `python build.py`. The committed `rankings_*.json` files store total scores plus raw spec inputs rather than per-category scores, so this gap won't appear in the JSON — only in the tool's ranking behavior and any UI that surfaces category scores.

**P1-9 — vivo X500 Pro Max camera score — RESOLVED (2026-11-13).** The row added earlier that day initially left `camera_quality` blank because none of the sources used for the spec (Giztop, GSMArena, vivo) published a Nanoreview composite, and `build.py` was made to tolerate that (score 0 + warning). The project owner then supplied `camera_quality = 95`; the CSV now reads `Vivo X500 Pro Max,7800,90,95,6.85,256,12,1599,global ROM`, `build.py` was rerun, and the phone scores **84.3** (9th of 26). The blank-tolerant code path stays for future rows. Source URLs and per-field confidence live in `research/vivo_x500_pro_max.md`; the 95 itself is owner-supplied and was not independently sourced.

---

## P2 — Post-launch backlog
- Compare mode (side-by-side 2-phone view)
- Saved/named weight profiles
- Export/print report of top 3 + reasoning
- More phones, more categories (PWM dimming, build quality, brand reputation)
- Backend API for the scoring engine
- Automated visual regression testing for both tool pages
- Revisit the flagship charging deal-breaker as a product decision (tied to P0-2)

---

## Pre-launch QA checklist
- [ ] Open `flagships.html` fresh (no URL params) — ranking renders, top phone auto-shown, no console errors
- [ ] Open `index_budget_phones.html` fresh — same check
- [ ] Toggle every deal-breaker off/on on both tiers — excluded count and list update correctly
- [ ] Drag every slider to 0 and to max on both tiers — no NaN/negative percentages, sort order stays stable
- [ ] Click every preset button on both tiers — sliders sync visually, rankings recompute
- [ ] Test on a real mobile viewport — confirm the "why" popup is reachable somehow (P1-4)
- [ ] Confirm iPhone 17 Pro Max / Galaxy S26 Ultra behavior matches whatever P0-2 decision was made
- [ ] Confirm budget Performance is either filled in or deliberately shipped as a documented 0 (P1-8)
- [x] vivo X500 Pro Max camera score filled in (95, owner-supplied) and `build.py` rerun — verified 2026-11-13 (P1-9)
- [ ] Rerun `python build.py` against the committed CSVs and diff against committed HTML/JSON — should be zero diff (verified idempotent 2026-11-13; P1-7)
- [ ] Hand-verify 3 scores per tier against the on-page total (original spec's Definition of Done #3)
- [ ] Check all internal links: `index.html` → both tools, and the header preset nav on both tool pages
- [ ] Confirm `og:image`/`twitter:image` assets resolve (P1-6)
- [x] Repo layout matches `README.md` / `SPEC.md`: no orphaned `js/`, `css/`, or stale legacy files (P0-4) — done 2026-11-13

---

## Suggested sequencing
1. **P0-2** — content-only fix, ~30 minutes, highest first-impression impact. (P0-3 landing copy is already fixed.)
2. **P1-8** — fill in the 20 budget `perf` ratings and rerun `build.py`; without this a headline category is dead.
3. **P1-2 + P1-7** — wire the parity suite and the `build.py`-is-current check into CI. Fast follow; the manual checks above cover v1.0.
4. Run the full QA checklist.
5. Ship v1.0.
6. Work the remaining P1 backlog (P1-1 duplicate names, P1-3 CSV validation, P1-4 touch popup, P1-5 analytics, P1-6 preview asset) roughly in that order.

**Done in the 2026-11-13 cleanup:** P0-3, P0-4, P0-5, P0-1 interim (dead JS copy deleted), P1-2 partial (parity suite exists and is now 13/13 green after fixing two pre-existing test bugs), P1-7 data half (CSVs + rankings JSON committed). **Also on 2026-11-13:** the vivo X500 Pro Max row was added (global variant) and its camera score (95, owner-supplied) was filled in the same day (P1-9 resolved).
