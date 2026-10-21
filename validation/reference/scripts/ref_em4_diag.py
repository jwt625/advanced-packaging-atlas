"""EM-4 diagnostic: uniform interposer line (no pads / bumps) with the EM-4 mesh settings; V / I probes vs the 2D Zc."""

import sys

import common  # noqa: F401
import ngsolve as ngs
import numpy as np

from apref import em4
from apref import em_ngs as em

ngs.SetNumThreads(1)
f = float(sys.argv[1]) * 1e9 if len(sys.argv) > 1 else 10e9
order = int(sys.argv[2]) if len(sys.argv) > 2 else 2
hc = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
L2 = em4.line_2d(f, 5, 0.5)
print("2D Zc", L2["Zc_ohm"], "eps_eff", L2["eps_eff"], flush=True)
mesh, x0, x1 = em4.build(100.0, float(sys.argv[4]) if len(sys.argv) > 4 else 20.0, hc, thru=True)
mesh.Curve(max(order, 2))
k0 = em.k0_um(f)
bp = (L2["gamma_1_um"] / 1j).real
gfu, nd = em.solve(mesh, order, f, em4.eps_cf(mesh), ["p1", "p2"], "p1", {"p1": bp, "p2": bp}, em4.einc("p1"))
print("ndof", nd, flush=True)
xs = np.linspace(-120, 120, 7)
V, Icur = em4.sample_vi(mesh, gfu, f, xs, "ip")
g = L2["gamma_1_um"]
for x, v, i in zip(xs, V, Icur, strict=True):
    print(f"x={x:7.1f} V={v:.6f} |V/I|/|Zc2D|-1 = {abs(v / i) / abs(L2['Zc_ohm']) - 1:+.2e}  V/I phase {np.angle(v / i / L2['Zc_ohm']):+.1e}", flush=True)
# forward-only wave check: V(x) e^{g x} should be constant
print("V e^{gx} spread", np.ptp(np.abs(V * np.exp(g * xs))) / np.mean(np.abs(V)), flush=True)
