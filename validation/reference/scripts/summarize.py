"""Markdown table of the reference numbers in results/*.json: finest level per (case, variant, element, quantity),
with DOF, Richardson value, observed order and error vs the expected value when one exists.

Usage: uv run --no-sync python scripts/summarize.py [--all] [case ...]   (default: quantities that have an expected value)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

RES = Path(__file__).resolve().parents[1] / "results"


def g(v, n=7):
    return "" if v is None else (f"{v:.{n}g}" if isinstance(v, float) else str(v))


def walk(name, node, rows, show_all):
    if isinstance(node, dict) and "runs" in node and "convergence" in node:
        runs = node["runs"]
        for el, qs in node["convergence"].items():
            fin = [r for r in runs if r["elem"] == el][-1]
            for q, c in qs.items():
                if not show_all and c.get("expected") is None:
                    continue
                err = c.get("rel_err_ext") if c.get("rel_err_ext") is not None else c.get("rel_err_fine")
                rows.append([name, q, g(c["f_fine"], 10), g(c.get("f_ext"), 10), g(c.get("p_obs"), 3), g(c.get("expected"), 10),
                             g(err, 3), el, g(fin["refine"]), g(fin["dof"])])
        singles = {r["elem"] for r in runs} - set(node["convergence"])
        for el in sorted(singles):
            fin = [r for r in runs if r["elem"] == el][-1]
            for q, v in fin["q"].items():
                ex = node.get("expected", {}).get(q)
                if not isinstance(v, float) or (not show_all and ex is None):
                    continue
                err = (v - ex) / abs(ex) if ex not in (None, 0) else None
                rows.append([name, q, g(v, 10), "", "", g(ex, 10), g(err, 3), el, g(fin["refine"]), g(fin["dof"])])
        return
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, dict):
                walk(f"{name}/{k}" if k not in ("results",) else name, v, rows, show_all)


def main(argv):
    show_all = "--all" in argv
    names = [a for a in argv if not a.startswith("--")]
    rows = []
    for p in sorted(RES.glob("*-skfem.json")):
        case = p.name.removesuffix("-skfem.json")
        if names and case not in names:
            continue
        walk(case, json.loads(p.read_text())["results"], rows, show_all)
    hdr = ["case", "quantity", "value (finest)", "Richardson", "p_obs", "expected", "rel err", "elem", "level", "DOF"]
    print("| " + " | ".join(hdr) + " |")
    print("|" + "---|" * len(hdr))
    for r in rows:
        print("| " + " | ".join(r) + " |")


if __name__ == "__main__":
    main(sys.argv[1:])
