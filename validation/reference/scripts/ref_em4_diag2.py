"""EM-4 diagnostic 2: area-weighted current vs half-loop line integral on the half model (uniform line)."""

import math

import common  # noqa: F401
import ngsolve as ngs
import numpy as np

from apref import em4
from apref import em_ngs as em

ngs.SetNumThreads(1)
f = 10e9
L2 = em4.line_2d(f, 5, 0.5)
mesh, x0, x1 = em4.build(100.0, 20.0, 5.0, thru=True)
mesh.Curve(2)
bp = (L2["gamma_1_um"] / 1j).real
gfu, nd = em.solve(mesh, 2, f, em4.eps_cf(mesh), ["p1", "p2"], "p1", {"p1": bp, "p2": bp}, em4.einc("p1"))
x = -40.0
Va, Ia = em4.sample_vi(mesh, gfu, f, [x], "ip")
Vp = em.voltage(mesh, gfu, x, 1e-6, 0.0, 6.0)
cE = ngs.curl(gfu)
w = 2 * math.pi * f


def seg(p0, p1, n=60):
    t, wt = em.gauss(0.0, 1.0, n)
    pts = np.array([np.full(n, x), p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t])
    H = 1j * em.sample(mesh, cE, pts) * 1e12 / (w * em.MU0)
    dl = np.array([0.0, p1[0] - p0[0], p1[1] - p0[1]]) * em.UM
    return np.sum((H @ dl) * wt)


E0 = 1e-6
Ih = seg((E0, 1.5), (20, 1.5)) + seg((20, 1.5), (20, 20)) + seg((20, 20), (E0, 20))  # y = 0 leg: H_z = 0 by symmetry
print("V area", Va[0], "V path", Vp)
print("I area", Ia[0], "I half-loop x2", 2 * Ih)
print("Zc2D", L2["Zc_ohm"], "V/I area", Va[0] / Ia[0], "V/I loop", Vp / (2 * Ih))
