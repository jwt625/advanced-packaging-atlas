"""EM-4 diagnostic 3: E_z(y) under the uniform line, half vs full model."""

import common  # noqa: F401
import ngsolve as ngs
import numpy as np

from apref import em4
from apref import em_ngs as em

ngs.SetNumThreads(1)
f = 10e9
L2 = em4.line_2d(f, 5, 0.5)
bp = (L2["gamma_1_um"] / 1j).real
for half in (True, False):
    mesh, x0, x1 = em4.build(100.0, 20.0, 5.0, thru=True, half=half)
    mesh.Curve(2)
    print("half", half, "boundaries", sorted(set(mesh.GetBoundaries())), flush=True)
    gfu, nd = em.solve(mesh, 2, f, em4.eps_cf(mesh), ["p1", "p2"], "p1", {"p1": bp, "p2": bp}, em4.einc("p1"))
    ys = np.array([0.01, 1, 2, 3, 4, 4.9, 6, 10, 20])
    pts = np.array([np.full(ys.size, -40.0), ys, np.full(ys.size, 3.0)])
    Ez = em.sample(mesh, gfu, pts)[:, 2]
    print("  Ez(y) at z=3:", np.round(np.abs(Ez), 4), flush=True)
