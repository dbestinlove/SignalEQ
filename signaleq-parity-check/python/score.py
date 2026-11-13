#!/usr/bin/env python3
"""Score a fixed set of phones with build.py's engine, as a parity-check subprocess.

Reads the SignalEQ project root and a comma-separated tier list from argv, and a
JSON object {tier: [phone, ...]} from stdin. Prints {tier: [{model, scores}, ...]}
to stdout, where scores are that tier's base_scores() output. Importing build.py
runs only its module level (definitions + TIERS); the CLI body is guarded by
`if __name__ == "__main__"`.
"""

import importlib.util
import json
import sys
from pathlib import Path

SCORERS = {
    "flagship": "flagship_base_scores",
    "budget": "budget_base_scores",
}


def load_build(root: str):
    spec = importlib.util.spec_from_file_location("signaleq_build", Path(root) / "build.py")
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load build.py from {root}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("usage: score.py <projectRoot> <tier1,tier2,...>  (phones JSON on stdin)")
    root, tier_names = sys.argv[1], sys.argv[2].split(",")
    phones = json.load(sys.stdin)
    build = load_build(root)
    out = {}
    for tier in tier_names:
        scorer = getattr(build, SCORERS[tier])
        out[tier] = [{"model": p["model"], "scores": scorer(p)} for p in phones.get(tier, [])]
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
