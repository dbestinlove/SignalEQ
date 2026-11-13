---
name: signaleq-scoring-parity
description: Use before and after editing any scoring function — fs_score_* or bg_score_* in build.py, or the inline base() function in flagships.html / index_budget_phones.html.
---

# Scoring parity check

Flagship scoring exists in build.py (fs_score_*) and duplicated inline in
flagships.html. Budget scoring exists in build.py (bg_score_*) and
duplicated inline in index_budget_phones.html. Nothing enforces these
copies stay identical.

Procedure:
1. If the signaleq-parity-check tool is available, run it and require a
   clean pass before considering the edit done.
2. If it isn't available, hand-verify: pick 3 phones spanning different
   score ranges (one likely deal-broken, one mid-pack, one top-ranked),
   compute each category score by hand or by running build.py's function
   directly, and compare against what the tier's inline JS would produce
   for the same input. All 7-8 categories must match within rounding.
3. Never edit only one of the two copies (build.py vs. the HTML's inline
   script) and call the task done — they change together or not at all.