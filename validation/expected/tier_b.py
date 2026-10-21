"""Independent closed-form checks of three NAFEMS tier-B targets (stdlib only).

The NAFEMS targets themselves are quoted from public verification pages (see validation/cases/B/*.yaml). This
script recomputes the ones that have an exact or series solution, so a wrong transcription of the problem
statement (which end is heated, which edge convects, hot-spot shape) shows up as a mismatch.

Run:  uv run --no-project python validation/expected/tier_b.py [--json validation/expected/tier_b_values.json]

- T1: circular hot spot radius a with isotropic eigenstrain e* in an infinite plane-stress plate (same material):
  inside sigma = -E e*/2 (equibiaxial); outside sigma_rr = -E e* a^2 / (2 r^2), sigma_tt = +E e* a^2 / (2 r^2).
  sigma_yy at D = (a+, 0) is the hoop stress E e* / 2. Finite plate size changes this (plate size is figure-only).
- T3: 1D bar, u(0, t) = 0, u(L, t) = 100 sin(pi t / 40), u(x, 0) = 0; exact eigenfunction series.
- T4: 0.6 x 1.0 m plate, T = 100 at y = 0, insulated x = 0, convection (h, T_inf = 0) at x = 0.6 and y = 1.0;
  exact series in the Sturm-Liouville eigenfunctions cos(mu_n x), mu_n tan(mu_n W) = h / k.
"""

from __future__ import annotations

import argparse
import json
import math


def t1(E: float = 100e9, nu: float = 0.3, eps_star: float = 1e-3, a: float = 1.0, R: float = 10.0) -> dict:
    p = E * eps_star / 2.0
    # Free disk of radius R (traction-free rim): inclusion pressure p_R = E e* (R^2 - a^2) / (2 R^2);
    # annulus s_tt(a+) = p_R (R^2 + a^2) / (R^2 - a^2) = E e* (R^2 + a^2) / (2 R^2). The 10 x 10 quarter square of the
    # Abaqus deck lies between the infinite plate and this disk (inscribed circle R = 10).
    p_r = E * eps_star * (R * R - a * a) / (2 * R * R)
    return {"sigma_inside_Pa": -p, "sigma_yy_D_outside_Pa": p, "note": "independent of nu in plane stress",
            "free_disk_R10": {"sigma_inside_Pa": -p_r, "sigma_yy_D_outside_Pa": E * eps_star * (R * R + a * a) / (2 * R * R)}}


def t3(L: float = 0.1, x: float = 0.08, t: float = 32.0, k: float = 35.0, rho: float = 7200.0, cp: float = 440.5,
       n_terms: int = 200000) -> dict:
    a = k / (rho * cp)
    w = math.pi / 40.0
    g = 100.0 * math.sin(w * t)
    s = 0.0
    for n in range(1, n_terms + 1):
        kn = n * math.pi / L
        lam = a * kn * kn
        A = -100.0 * w * 2.0 * (-1) ** (n + 1) / (n * math.pi)
        b = A * (lam * math.cos(w * t) + w * math.sin(w * t) - lam * math.exp(-lam * t)) / (lam * lam + w * w)
        s += b * math.sin(kn * x)
    T = x / L * g + s
    # second evaluation with half the terms: series truncation estimate
    return {"alpha_m2_s": a, "T_C": T, "heated_end": "x = L (point B)", "zero_end": "x = 0 (point A)"}


def _roots_mu(Bi_over_W: float, W: float, n: int) -> list[float]:
    """Roots of mu tan(mu W) = c, c = h/k > 0; one root in each (j pi, j pi + pi/2) / W."""
    c = Bi_over_W
    out = []
    for j in range(n):
        lo = j * math.pi / W + 1e-15
        hi = (j * math.pi + math.pi / 2.0) / W - 1e-15
        f = lambda m: m * math.sin(m * W) - c * math.cos(m * W)  # same roots, no poles
        _flo, fhi = f(lo), f(hi)
        for _ in range(200):
            mid = 0.5 * (lo + hi)
            fm = f(mid)
            if (fm > 0) == (fhi > 0):
                hi, fhi = mid, fm
            else:
                lo, _flo = mid, fm
        out.append(0.5 * (lo + hi))
    return out


def t4(W: float = 0.6, H: float = 1.0, k: float = 52.0, h: float = 750.0, T0: float = 100.0,
       x: float = 0.6, y: float = 0.2, n_terms: int = 400) -> dict:
    c = h / k
    T = 0.0
    for mu in _roots_mu(c, W, n_terms):
        num = math.sin(mu * W) / mu
        den = W / 2.0 + math.sin(2 * mu * W) / (4 * mu)
        cn = T0 * num / den
        # Y(y) = cosh(mu y) + B sinh(mu y), k Y'(H) + h Y(H) = 0; evaluate in a scaled, overflow-safe form
        # Y(y) = [ (k mu cosh(mu (H - y)) + h sinh(mu (H - y))) ] / (k mu cosh(mu H) + h sinh(mu H))
        r = mu * (H - y)
        R = mu * H
        if R > 300:
            Y = math.exp(-mu * y) * (k * mu + h) / (k * mu + h) if r > 300 else \
                (k * mu * math.cosh(r) + h * math.sinh(r)) * 2.0 * math.exp(-R) / (k * mu + h)
        else:
            Y = (k * mu * math.cosh(r) + h * math.sinh(r)) / (k * mu * math.cosh(R) + h * math.sinh(R))
        T += cn * math.cos(mu * x) * Y
    return {"T_E_C": T, "point_E_m": [x, y]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json")
    a = ap.parse_args()
    vals = {"T1": t1(), "T3": t3(), "T3_half_terms": t3(n_terms=100000), "T4": t4(), "T4_half_terms": t4(n_terms=200)}
    for k, v in vals.items():
        print(k, json.dumps(v))
    if a.json:
        with open(a.json, "w") as f:
            json.dump({"generator": "validation/expected/tier_b.py", "values": vals}, f, indent=1)
            f.write("\n")


if __name__ == "__main__":
    main()
