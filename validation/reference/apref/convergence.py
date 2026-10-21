"""Observed order, Richardson extrapolation and grid convergence index (Roache 1998; Celik et al. 2008 procedure).

Inputs are values on 3+ meshes ordered coarse -> fine with representative sizes h (any refinement ratios).
"""

from __future__ import annotations

import math

import numpy as np


def observed_order(f: list[float], h: list[float], p_guess: float = 2.0) -> float | None:
    """Observed order from the three finest levels (f1 finest). Fixed-point iteration for non-constant ratio
    (Celik et al. 2008, eq. 3-4). Returns None for oscillatory or non-converging data."""
    if len(f) < 3:
        return None
    f3, f2, f1 = f[-3], f[-2], f[-1]
    h3, h2, h1 = h[-3], h[-2], h[-1]
    r21, r32 = h2 / h1, h3 / h2
    e21, e32 = f2 - f1, f3 - f2
    if e21 == 0 or e32 == 0:
        return None
    s = np.sign(e32 / e21)
    if s < 0:
        return None
    p = p_guess
    for _ in range(200):
        q = math.log((r21**p - s) / (r32**p - s))
        p_new = abs(math.log(abs(e32 / e21)) + q) / math.log(r21)
        if abs(p_new - p) < 1e-10:
            p = p_new
            break
        p = p_new
    return float(p)


def richardson(f: list[float], h: list[float], p: float | None = None, fs: float = 1.25) -> dict:
    """Extrapolated value from the two finest levels with order p (observed if None), and GCI_fine."""
    p_obs = observed_order(f, h)
    pp = p if p is not None else p_obs
    out = {"p_obs": p_obs, "p_used": pp, "f_fine": f[-1]}
    if pp is None or len(f) < 2:
        out.update({"f_ext": None, "gci_fine": None})
        return out
    r = h[-2] / h[-1]
    f_ext = (r**pp * f[-1] - f[-2]) / (r**pp - 1)
    ea = abs((f[-1] - f[-2]) / f[-1]) if f[-1] != 0 else float("nan")
    out.update({"f_ext": float(f_ext), "gci_fine": float(fs * ea / (r**pp - 1)), "rel_change_last": float(ea)})
    return out


def error_orders(err: list[float], h: list[float]) -> list[float]:
    """Pairwise observed orders from errors against a known exact value."""
    return [
        float(math.log(abs(err[i] / err[i + 1])) / math.log(h[i] / h[i + 1])) if err[i + 1] != 0 and err[i] != 0
        else float("nan")
        for i in range(len(err) - 1)
    ]
