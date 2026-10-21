"""Shared driver: run a case function over mesh levels and element orders, convergence, record JSON + log."""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apref import convergence, record  # noqa: E402


def sweep(log, name: str, fn, levels, elems: list[str], expected: dict | None = None, **kw) -> dict:
    """fn(refine, elem, **kw) -> (quantities dict, meta dict with dof/mesh/timing). levels: list or {elem: list}."""
    runs = []
    for el in elems:
        for r in levels[el] if isinstance(levels, dict) else levels:
            t0 = time.perf_counter()
            q, meta = fn(r, el, **kw)
            dt = time.perf_counter() - t0
            row = {"elem": el, "refine": r, "runtime_s": round(dt, 3), "max_rss_mb": round(record.max_rss_mb(), 1),
                   **meta, "q": q}
            runs.append(row)
            qs = " ".join(f"{k}={v:.8g}" for k, v in q.items() if isinstance(v, float))
            log(f"{name} elem={el} refine={r} dof={meta.get('dof')} t={dt:.2f}s rss={row['max_rss_mb']}MB {qs}")
    conv = {}
    for el in elems:
        rows = [x for x in runs if x["elem"] == el]
        if len(rows) < 2:
            continue
        h = [1.0 / x["refine"] for x in rows]
        for k in rows[-1]["q"]:
            vals = [x["q"][k] for x in rows]
            if not all(isinstance(v, float) for v in vals):
                continue
            c = convergence.richardson(vals, h)
            if expected and k in expected and expected[k] not in (None, 0):
                ex = expected[k]
                c["expected"] = ex
                c["rel_err_fine"] = (vals[-1] - ex) / abs(ex)
                if c.get("f_ext") is not None:
                    c["rel_err_ext"] = (c["f_ext"] - ex) / abs(ex)
                errs = [v - ex for v in vals]
                c["orders_vs_exact"] = convergence.error_orders(errs, h)
            elif expected and k in expected:
                c["expected"] = expected[k]
                c["abs_err_fine"] = vals[-1] - expected[k]
            conv.setdefault(el, {})[k] = c
    for el, cs in conv.items():
        for k, c in cs.items():
            log(f"{name} conv elem={el} {k}: fine={c['f_fine']:.10g} p_obs={c['p_obs']} ext={c.get('f_ext')} "
                f"expected={c.get('expected')} rel_err_fine={c.get('rel_err_fine')} rel_err_ext={c.get('rel_err_ext')} "
                f"orders_vs_exact={c.get('orders_vs_exact')}")
    return {"runs": runs, "convergence": conv, "expected": expected or {}}
