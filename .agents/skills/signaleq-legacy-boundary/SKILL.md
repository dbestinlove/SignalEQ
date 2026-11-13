---
name: signaleq-legacy-boundary
description: Use before reading, editing, referencing, or "restoring" anything under js/, css/, or files named phone_equalizer.html, phone_scorer.py, phones_clean.csv, or rankings.json. Also use when writing or reviewing any doc that describes this project's architecture.
---

# Legacy boundary

This repo's live architecture is: index.html (landing) + flagships.html +
index_budget_phones.html (self-contained tool pages, inline CSS/JS) + build.py
(CSV -> scored data -> injected into the tool pages) + rankings_*.json (build
output). Full detail in SignalEQ-v0.9-spec.md and README.md at repo root —
read those first if unsure.

The following are DEAD CODE from an earlier single-tier ES6-module
architecture. No live page loads them:

- js/app.js, js/data.js, js/scorer.js
- css/styles.css (also internally broken — two contradictory theme blocks
  concatenated together with an invalid dangling declaration between them)
- phone_equalizer.html, phone_scorer.py, phones_clean.csv, rankings.json
  (if still present — verify before assuming)

Rules:

1. Do not wire any of the above back into index.html, flagships.html, or
   index_budget_phones.html without the user explicitly asking for it.
2. Do not describe any of the above as "current" in any doc, comment, or
   commit message.
3. If a task seems to require editing one of these files, stop and confirm
   with the user whether the goal is actually to touch the live pages
   instead — it usually is.
4. If you find a file NOT listed here that also looks orphaned (no live
   page references it), flag it rather than assuming it's safe to ignore
   or safe to delete.
