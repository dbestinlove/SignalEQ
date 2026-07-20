# SignalEQ — v0.9 Spec

**Paste this at the start of every coding session with any AI tool. Update the "Status" section at the end of each session — nowhere else.**

## What it is
SignalEQ is a phone comparison and scoring platform. The core idea: "best phone" isn't objective — it's a function of personal values. SignalEQ makes those hidden value judgments visible and user-controllable, instead of hiding them behind a single ranked list.

## How it works
- User adjusts weight sliders (battery, camera, price, etc.) in an HTML equalizer interface
- Python backend scoring engine recalculates phone rankings based on those weights
- Data comes from a CSV pipeline (currently `phones_clean`, 21 phones)
- Runs in a local Flask test environment

## v0.9 Definition of Done
1. All 21 phones load correctly from the CSV pipeline with no data errors
2. Moving any slider updates the ranked results live — no page reload, no noticeable lag
3. Scoring engine produces mathematically correct rankings for a given set of weights (verifiable by hand-checking at least 2-3 weight combinations)
4. Edge cases don't break it: all sliders at zero, all sliders at max, one slider at max and rest at zero
5. No crashes, no silent failures — if something's wrong, it's visible, not hidden

## Explicitly OUT of scope for v0.9
- Adding phones beyond the current 21
- New features: saved profiles, comparisons, sharing/export, accounts
- Visual design / polish (functional Flask UI is fine)
- Performance optimization beyond "feels responsive locally"
- Deployment or hosting

If a coding session drifts toward any of the above, stop and come back to this list.

## Working rules for this project
- One chunk of work per session: don't stack multiple asks before checking the first one
- When something breaks, describe it as "expected X, got Y" — not "fix it"
- Update the Status section below before ending a session, not the earlier parts of this doc

## Status (update this each session)
- Last updated: [date]
- Current state: [what works right now]
- Next single task: [the one thing to tackle next session]
- Known issues: [anything broken or flaky]
