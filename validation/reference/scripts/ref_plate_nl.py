"""Plate bifurcation reference (lane L20): thin bilayer square plate under uniform cooling, total-Lagrangian SVK
(apref/nonlinear.py), quarter model with the engine's symmetry supports.

Deck (synthetic, test only; same as engine/tests/mech-nl.test.mjs): 20 x 20 mm square, layer a (bottom) 50 um,
E 100 GPa, nu 0.3, alpha 0; layer b (top) 50 um, E 100 GPa, nu 0.3, alpha 10 ppm/K (imperfect variant: alpha_x
1 % higher). Stress-free at dT = 0, cooled to dT = -60 K in -5 K load steps. One element per layer through the
thickness. Probes on the bottom face (z = 0), relative to the centre node: sag_x = u_z(L/2, 0), sag_y = u_z(0, L/2),
corner = u_z(L/2, L/2) (um).
Runs: (1) perfect, symmetric path with the lowest tangent eigenvalues (bifurcation where the lowest crosses 0);
(2) perfect with branch switching along the critical eigenvector; (3) imperfect; (4) discretization checks of the
imperfect path: q2s at 0.5 mm in-plane cells and q2 (27-node) at 1 mm.

Usage: ./run.sh scripts/ref_plate_nl.py
"""

from __future__ import annotations

import common  # noqa: F401  (sets sys.path)
import numpy as np

from apref import record
from apref.nonlinear import Plate, newton_path

L2 = 10e-3  # quarter side (m)
DTS = [-5.0 * k for k in range(1, 13)]


def layers(aniso=0.0):
    return [{"h": 50e-6, "E": 100e9, "nu": 0.3, "alpha": [0, 0, 0]},
            {"h": 50e-6, "E": 100e9, "nu": 0.3, "alpha": [10e-6 * (1 + aniso), 10e-6, 10e-6]}]


def probes(P):
    c, ex, ey, co = (P.dof(p, 2) for p in ([0, 0, 0], [L2, 0, 0], [0, L2, 0], [L2, L2, 0]))
    return {"sag_x_um": lambda u: 1e6 * (u[ex] - u[c]), "sag_y_um": lambda u: 1e6 * (u[ey] - u[c]),
            "corner_um": lambda u: 1e6 * (u[co] - u[c])}


def run(log, n=10, elem="q2s", aniso=0.0, switch=False, eig=True):
    xs = np.linspace(0, L2, n + 1)
    P = Plate(xs, xs, layers(aniso), elem=elem)
    log(f"run n={n} elem={elem} aniso={aniso} switch={switch} dof={P.N}")
    rows, _, sw = newton_path(P, P.quarter_supports(), DTS, eig=eig, switch=switch, log=log, probes=probes(P))
    return {"n_quarter": n, "elem": elem, "aniso": aniso, "switch": switch, "dof": P.N, "rows": rows, "switched": sw}


def main():
    log = record.Log("PLATE-NL")
    out = {"deck": __doc__.split("Usage")[0].strip(), "dT_steps": DTS}
    out["perfect_symmetric"] = run(log)
    r = out["perfect_symmetric"]["rows"]
    # bifurcation: lowest eigenvalue crosses 0 between two load steps (linear interpolation)
    for a, b in zip(r, r[1:], strict=False):
        if a["eig_low"][0] > 0 >= b["eig_low"][0]:
            t = a["eig_low"][0] / (a["eig_low"][0] - b["eig_low"][0])
            out["bifurcation_dT_K"] = a["dT"] + t * (b["dT"] - a["dT"])
            out["bifurcation_bracket_K"] = [a["dT"], b["dT"]]
            break
    log(f"bifurcation dT ~ {out.get('bifurcation_dT_K')} K (bracket {out.get('bifurcation_bracket_K')})")
    out["perfect_switch"] = run(log, switch=True)
    out["imperfect"] = run(log, aniso=0.01)
    out["imperfect_q2s_n20"] = run(log, n=20, aniso=0.01, eig=False)
    out["imperfect_q2_n10"] = run(log, elem="q2", aniso=0.01, eig=False)
    p = record.write_result("PLATE-NL", out)
    log(f"wrote {p}")


if __name__ == "__main__":
    main()
