#!/usr/bin/env python3
"""Reproduce the F0 / ior / Kapton absorption values in ../optics.ts from refractiveindex.info database tables (CC0).

Downloads (rate-limited, 1.5 s apart) the YAML files listed below into OUT (default: a temp dir) and prints, per
dataset, n, k and F0 = ((n-1)^2 + k^2) / ((n+1)^2 + k^2) at R 630 nm, G 532 nm, B 465 nm ("OOR" = outside the
table range, value clamped to the nearest table end) and alpha = 4 pi k / lambda (1/um).

Usage: uv run --with pyyaml --with numpy python app/src/lib/process/materials/lab/f0_from_nk.py [OUT]
"""

from __future__ import annotations

import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import numpy as np
import yaml

BASE = "https://raw.githubusercontent.com/polyanskiy/refractiveindex.info-database/master/database/data/"
DATA = [
    "main/Cu/nk/Johnson", "main/Au/nk/Johnson", "main/Ni/nk/Johnson", "main/Al/nk/Rakic", "main/Ti/nk/Johnson",
    "main/Ta/nk/Werner", "main/Fe/nk/Johnson", "main/Cr/nk/Johnson", "main/Sn/nk/Golovashkin-293K",
    "main/Si/nk/Green-2008", "main/Si/nk/Aspnes", "main/SiO2/nk/Malitson", "main/Si3N4/nk/Luke",
    "specs/schott/misc/BOROFLOAT33", "other/commercial polymers/Kapton/nk/Kumar",
    "other/alloys/stainless steel/nk/Karlsson-ferritic",
    # follow-up keys (2026-10-23): ceramic, silicone, pet, water
    "main/AlN/nk/Pastrnak-o", "main/SiC/nk/Shaffer", "main/H2O/nk/Hale",
    "organic/(C2H6OSi)n - polydimethylsiloxane/nk/Schneider-Sylgard184",
    "organic/(C10H8O4)n - polyethylene terephthalate/nk/Zhang",
]
WL = {"R": 0.630, "G": 0.532, "B": 0.465}


def load(f: Path):
    y = yaml.safe_load(f.read_text())
    n = k = None
    for d in y["DATA"]:
        t = d["type"]
        if t.startswith("tabulated"):
            a = np.array([[float(v) for v in ln.split()] for ln in d["data"].strip().splitlines()])
            if t == "tabulated nk":
                n, k = (a[:, 0], a[:, 1]), (a[:, 0], a[:, 2])
            elif t == "tabulated n":
                n = (a[:, 0], a[:, 1])
            elif t == "tabulated k":
                k = (a[:, 0], a[:, 1])
        elif t in ("formula 1", "formula 2", "formula 5"):
            c = [float(v) for v in d["coefficients"].split()]
            lo, hi = (float(v) for v in d["wavelength_range"].split())
            wl = np.linspace(lo, hi, 400)
            if t == "formula 1":  # Sellmeier: n^2 - 1 = C0 + sum Ci l^2 / (l^2 - C(i+1)^2)
                s = 1 + c[0] + sum(c[i] * wl**2 / (wl**2 - c[i + 1] ** 2) for i in range(1, len(c) - 1, 2))
                n = (wl, np.sqrt(s))
            elif t == "formula 2":  # Sellmeier-2: n^2 - 1 = C0 + sum Ci l^2 / (l^2 - C(i+1))
                s = 1 + c[0] + sum(c[i] * wl**2 / (wl**2 - c[i + 1]) for i in range(1, len(c) - 1, 2))
                n = (wl, np.sqrt(s))
            else:  # Cauchy: n = C0 + sum Ci l^C(i+1)
                n = (wl, c[0] + sum(c[i] * wl ** c[i + 1] for i in range(1, len(c) - 1, 2)))
    return n, k


def at(t, w):
    if t is None:
        return 0.0, True
    x, y = t
    return float(np.interp(w, x, y)), bool(x.min() <= w <= x.max())


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix="nk_"))
    out.mkdir(parents=True, exist_ok=True)
    for p in DATA:
        f = out / (p.replace("/", "_").replace(" ", "_") + ".yml")
        if not f.exists():
            urllib.request.urlretrieve(BASE + urllib.request.quote(p) + ".yml", f)
            time.sleep(1.5)
        n_t, k_t = load(f)
        cells = []
        for ch, w in WL.items():
            n, okn = at(n_t, w)
            k, okk = at(k_t, w)
            F = ((n - 1) ** 2 + k**2) / ((n + 1) ** 2 + k**2)
            cells.append(f"{ch} n={n:.3f} k={k:.5f} F0={F:.3f} a={4 * np.pi * k / w:.4f}{'' if okn and okk else ' OOR'}")
        print(f"{p:52s} " + " | ".join(cells))


if __name__ == "__main__":
    main()
