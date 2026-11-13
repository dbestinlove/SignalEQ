# SignalEQ — Production Readiness: Path to v1.0

Acting as lead dev/product on this pass. Everything below was verified directly against the shipped files (`index.html`, `flagships.html`, `index_budget_phones.html`, `build.py`), not inferred from docs — the docs were, in fact, the thing most out of sync with reality (see P0-4).

## Executive summary
The two-tier static site (flagship + budget, CSV → `build.py` → self-contained HTML) is functionally solid and further along than the docs suggested. The blockers are not architectural — they're **first-impression and data-integrity issues**: two of the most recognizable flagship phones vanish by default, the landing page states a phone count that doesn't match the data, and there's dead, broken legacy code still described as current in the README. All of this is fixable in under a day of focused work; none of it requires touching the scoring architecture.

---

## P0 — Launch blockers

### P0-1: Scoring logic is duplicated with no parity check
Flagship scoring exists in **three** places: `build.py` (`fs_score_*`), inline in `flagships.html`'s `<script>`, and a dead third copy in orphaned `js/scorer.js`. Budget scoring exists in **two**: `build.py` (`bg_score_*`) and inline in `index_budget_phones.html`.

I compared the live copies (`build.py` vs. each HTML's inline JS) line by line — **they currently match.** But nothing enforces that. A boundary-condition tweak, a rounding change, or a copy-paste slip in either file will silently make the on-page score disagree with `rankings_*.json`, with no error and no test to catch it.

**Fix for v1.0 (small):**
- Delete `js/scorer.js` — it's dead code and not even load-bearing for the parity risk, just extra surface area. Cuts flagship from 3 copies to 2.
- Add a short manual note to the pre-launch checklist (below) confirming the two live copies still match before each release, until an automated check exists.

**Fix for v1.1+ (bigger, recommended):** have `build.py` generate the scoring function itself into the HTML at build time (or a JSON-encoded curve description the inline JS reads), so the CSV + `build.py` become the *only* hand-edited source of the math. Alternatively, a small Node/pytest script that runs both engines against a fixed set of test phones and fails CI on divergence.

### P0-2: iPhone 17 Pro Max and Galaxy S26 Ultra are excluded by default
Confirmed directly from `flagships.html`'s data:

| Phone | Battery | Charging | Flagship floor | Result |
|---|---|---|---|---|
| iPhone 17 Pro Max | 5,088mAh | 45W | 6,500mAh / 90W | Fails **both** deal-breakers |
| Galaxy S26 Ultra | 5,000mAh | 67W | 6,500mAh / 90W | Fails **both** deal-breakers |

Both are permanently struck through in the "excluded" pile on first load, with only a small `excl-note` line explaining why. A first-time visitor who opens the tool expecting to compare "the top flagships" and doesn't see the iPhone or the Galaxy Ultra — with no obvious explanation — is a real trust/first-impression risk, especially since these are two of the most-searched flagship phones on the market.

**Recommend (combine both for v1.0):**
1. **Make the exclusion legible.** Right now it's a small muted line at the bottom of the page. Add a higher-contrast, specific callout the first time a recognizable phone is excluded (e.g., "iPhone 17 Pro Max excluded — battery and charging both below your floor. Adjust deal-breakers →").
2. **Default deal-breaker toggles to off** for first-time visitors, so nothing disappears silently. Scoring already penalizes weak battery/charging heavily through the weighted categories — the hard exclusion doesn't need to be the default experience. Let people opt into strict filtering.

**Defer to P1/post-launch:** whether "charging < 90W" should be a hard deal-breaker at all, given it excludes an entire vendor's flagship line by design, not by outlier spec. That's a real product call worth revisiting with actual usage data, not a pre-launch scramble.

### P0-3: Landing page states the wrong flagship count
`index.html`'s flagship tool card says **"22 current-gen flagships."** The actual `PHONES` array in `flagships.html` has **25 entries.** (Budget's stated "20 budget and mid-range phones" is correct — verified.)

**Fix:** either correct the copy to match, or better — stop hardcoding an exact count in marketing copy that will drift every time `build.py` runs against an edited CSV. The meta description already hedges correctly with "20+ Android phones"; make the on-page card copy match that pattern.

### P0-4: Orphaned legacy architecture is still documented as current
`js/app.js`, `js/data.js`, `js/scorer.js`, and `css/styles.css` describe an earlier single-tier, 16-phone, ES6-module structure. **No live page loads any of them** — `index.html`, `flagships.html`, and `index_budget_phones.html` are all fully self-contained. The previous `README.md` documented this dead code as the current "v5" architecture, complete with setup instructions ("serve via local server for ES module CORS") that don't apply to how the site actually runs today.

Anyone — human or AI coding tool — onboarding via the old README gets pointed at the wrong files entirely. This is the single biggest doc/code mismatch found in this audit, bigger than the stale Flask-era spec.

**Fix:** `README.md` and `SignalEQ-v0.9-spec.md` have been rewritten in this pass to reflect the real architecture and explicitly flag the legacy files. Follow-up: physically move `js/`, `css/`, and (if still present) `phone_equalizer.html`, `phone_scorer.py`, `phones_clean.csv`, `rankings.json` into a `/legacy` folder or delete them outright, so the repo layout matches the docs.

### P0-5: `css/styles.css` is internally broken
Not a runtime risk today (nothing loads it), but worth flagging before anyone reaches for it as a style reference: the file as it exists contains **two full, contradictory copies of the stylesheet concatenated together** — a neon dark/light theme, followed by a CSS custom-property declaration block sitting outside any selector (invalid CSS), followed by a second, older non-neon theme with a completely different color system. This looks like a bad merge or diff-paste artifact, not intentional. If it's kept around at all, fix it or mark it clearly broken; otherwise it should go in the P0-4 cleanup.

---

## P1 — Should fix before or soon after launch

**P1-1 — Duplicate model names are visually indistinguishable.** "OPPO Find X9 Ultra" appears twice in the flagship data (china $1,199 vs. global $1,599), and "OnePlus 15" appears twice (256GB $679 vs. 1TB $889, both global). Both render with identical names in the rankings list and hover popup. Recommend appending the distinguishing spec to the display name (e.g., "OPPO Find X9 Ultra (Global)").

**P1-2 — No automated tests anywhere.** Not for either scoring engine, not for `build.py`'s CSV parsing/injection, not for the JSON output. Recommend a minimal pytest suite covering a handful of hand-verified weight/spec combinations per tier — this was actually part of the original v0.9 Definition of Done and never got picked back up.

**P1-3 — No CSV schema validation in `build.py`.** A malformed row (missing column, non-numeric price, empty `os_type`) raises an unhandled exception or silently coerces oddly. Add row-level validation with a clear error message pointing at the offending row.

**P1-4 — The "why it ranks here" popup is hover-only.** It's triggered by `mouseenter`/`mouseleave` with `pointer-events: none` on the container — there's no touch equivalent. On mobile, which is likely a majority of first-time traffic from a shared link, visitors never see the explanation panel that's central to the tool's actual pitch ("see why, not just who"). Recommend a tap-to-toggle handler alongside the existing hover behavior.

**P1-5 — No usage analytics.** You won't know which tier, presets, or deal-breaker settings people actually use post-launch — which directly matters for revisiting the P0-2 decision with real data. Even a minimal, privacy-respecting pageview/event counter would help.

**P1-6 — Unverified social preview asset.** `index.html` references `https://dbest180.github.io/phone-picker/og-preview.png` for Open Graph/Twitter previews. Confirm this file actually exists at that path before launch, or shared links will show a broken image.

**P1-7 — No CI keeping `build.py` output in sync with the CSVs.** If a CSV is edited but `build.py` isn't rerun before commit, the live HTML silently goes stale relative to the source data, with nothing to catch it. A GitHub Action that runs `python build.py` and fails the PR if the output differs from what's committed would close this cheaply.

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
- [ ] Rerun `python build.py` against the committed CSVs and diff against committed HTML/JSON — should be zero diff (P1-7)
- [ ] Check all internal links: `index.html` → both tools, and the header preset nav on both tool pages
- [ ] Confirm `og:image`/`twitter:image` assets resolve (P1-6)
- [ ] Hand-verify 3 scores per tier against the on-page total (original spec's Definition of Done #3)
- [ ] Archive/delete orphaned `js/`, `css/`, and any surviving `phone_equalizer.html` / `phone_scorer.py` / `phones_clean.csv` / `rankings.json` (P0-4)

---

## Suggested sequencing
1. **P0-2 + P0-3** — content-only fixes, ~30 minutes combined, highest first-impression impact.
2. **P0-4 + P0-5** — repo cleanup (delete/archive orphaned files); docs already rewritten in this pass.
3. **P0-1 interim** — delete `js/scorer.js`, manual parity note; automated check can be a fast-follow, not a blocker.
4. Run the full QA checklist.
5. Ship v1.0.
6. Work the P1 backlog roughly in the order listed above.
