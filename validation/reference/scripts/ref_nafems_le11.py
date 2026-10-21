"""NAFEMS LE11 solid cylinder / taper / sphere under T = sqrt(x^2 + y^2) + z (target sigma_zz at A = (1, 0, 0) m:
-105 MPa, NAFEMS TNSB Rev. 3 via Abaqus / Altair OS-V 0070 / CAST3M; FeenoX -105.04 MPa).

Geometry, BCs and load from public inputs (retrieved 2026-10-20):
- https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le11.geo: meridian points (m) 1 (0, 0),
  A = 2 (1, 0), B = 3 (1.4, 0), 4 (sin 45, sin 45), 5 (sqrt(1.4^2 - sin^2 45), sin 45), 6 (sin 45, sin 45 + 0.69),
  7 (1, sin 45 + 0.69), H = 8 (sin 45, sin 45 + 1.09), I = 9 (1, sin 45 + 1.09); arcs A-4 (r 1.0) and B-5 (r 1.4) about
  the origin, straight lines 4-5, 4-6, 6-8, 5-7, 7-9, 6-7, 8-9, 3-2; revolved Pi/2 about z.
- https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le11.fee: T = sqrt(x^2 + y^2) + z;
  E = 210e3 MPa, nu 0.3, alpha 2.3e-4 /C; v = 0 on xz, u = 0 on yz, w = 0 on xy and on HIH'I'; output sigma_z(1, 0, 0).
  The stress-free (reference) temperature is not stated: 0 C assumed (field = temperature change), as in L4.
Mesh (6 elements over the 90 deg revolution at every level): three blocks in the meridian (sphere sector, taper, cylinder) on a parameter grid (s through the wall,
w along the meridian, phi about z), mapped block-wise and revolved; MeshHex2 nodes on the exact arcs / revolution.

Usage: ./run.sh scripts/ref_nafems_le11.py
"""

from __future__ import annotations

import dataclasses
import math
import sys

import numpy as np
from common import sweep
from skfem import MeshHex, MeshHex2

from apref import fem, record
from apref.materials import stiffness_iso

S45 = math.sin(math.pi / 4)
Z1 = S45
Z2 = S45 + 0.345 + 0.345
Z3 = S45 + 0.345 + 0.345 + 0.400
R5 = math.sqrt(1.4**2 - S45**2)
TH_I, TH_O = math.pi / 4, math.asin(S45 / 1.4)
NPHI = 6


def meridian(s, w):
    """(r, z) for wall parameter s in [0, 1] and meridian parameter w in [0, 3] (block boundaries at 1, 2)."""
    s, w = np.asarray(s, float), np.asarray(w, float)
    r = np.empty_like(w)
    z = np.empty_like(w)
    b1 = w <= 1
    b2 = (w > 1) & (w <= 2)
    b3 = w > 2
    u = w[b1]
    ri, zi = np.cos(TH_I * u), np.sin(TH_I * u)
    ro, zo = 1.4 * np.cos(TH_O * u), 1.4 * np.sin(TH_O * u)
    r[b1] = (1 - s[b1]) * ri + s[b1] * ro
    z[b1] = (1 - s[b1]) * zi + s[b1] * zo
    u = w[b2] - 1
    r[b2] = (1 - s[b2]) * S45 + s[b2] * (R5 + (1.0 - R5) * u)
    z[b2] = Z1 + (Z2 - Z1) * u
    u = w[b3] - 2
    r[b3] = (1 - s[b3]) * S45 + s[b3] * 1.0
    z[b3] = Z2 + (Z3 - Z2) * u
    return r, z


def F(P):
    r, z = meridian(P[0], P[1])
    return np.stack([r * np.cos(P[2]), r * np.sin(P[2]), z])


def mesh_for(lev, quadratic):
    s = np.linspace(0, 1, lev + 1)
    w = np.concatenate([np.linspace(0, 1, 3 * lev + 1), np.linspace(1, 2, 4 * lev + 1)[1:], np.linspace(2, 3, 2 * lev + 1)[1:]])
    ph = np.linspace(0, math.pi / 2, NPHI + 1)  # field and geometry are axisymmetric: fixed circumferential count
    m = MeshHex.init_tensor(s, w, ph)
    if not quadratic:
        return MeshHex(F(m.p), m.t)
    m2 = MeshHex2.from_mesh(m)
    return dataclasses.replace(m2, doflocs=F(m2.doflocs))


def facets_all(mesh, pred):
    return np.nonzero(pred(mesh.p[:, mesh.facets]).all(axis=0))[0]


def solve(lev, el):
    mesh = mesh_for(lev, el != "q1")
    basis = fem.make_basis(mesh, el)
    C = stiffness_iso(210e9, 0.3)
    X = basis.mapping.F(basis.X)
    T = np.sqrt(X[0] ** 2 + X[1] ** 2) + X[2]
    eps = np.zeros(basis.dx.shape + (6,))
    eps[..., 0] = eps[..., 1] = eps[..., 2] = 2.3e-4 * T
    K, f = fem.assemble_elastic(basis, np.repeat(C[None], mesh.t.shape[1], 0), eps)
    D = [3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[1], 0.0))).all() + 1,
         3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[0], 0.0, atol=1e-12))).all(),
         3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[2], 0.0))).all() + 2,
         3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[2], Z3))).all() + 2]
    D = np.unique(np.concatenate(D))
    u, info = fem.solve_dirichlet(K, f, D, np.zeros(D.size))
    pA = np.array([[1.0], [0.0], [0.0]])
    e, _, _ = fem.strain_at(basis, u, pA, hint=np.array([[1e-7], [1e-7], [1e-7]]))
    TA = 1.0
    sig = C @ (e[0] - 2.3e-4 * TA * np.array([1, 1, 1, 0, 0, 0]))
    return {"sigma_zz_A_Pa": float(sig[2]), "sigma_rr_A_Pa": float(sig[0])}, {
        "dof": int(3 * basis.N), "mesh": {"elements": int(mesh.t.shape[1])}, "solve": info}


def main():
    log = record.Log("LE11")
    log(f"case LE11 start; versions {record.versions()}")
    res = sweep(log, "LE11", solve, {"q1": [2, 4, 8], "q2s": [2, 3, 4, 6, 8], "q2": [2, 3, 4, 6]}, ["q1", "q2s", "q2"],
                {"sigma_zz_A_Pa": -105e6})
    res["sources"] = {"retrieved": "2026-10-20", "urls": [
        "https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le11.geo",
        "https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le11.fee"]}
    res["assumptions"] = ["stress-free temperature 0 C (not stated in the FeenoX input; field taken as the temperature change)"]
    p = record.write_result("LE11", {"case": "NAFEMS-LE11", "tier": "B", "expected_source": "R6 section 2.1 / L4 B/nafems-LE11 (-105 MPa)",
                                     "results": res, "max_rss_mb": record.max_rss_mb()})
    log(f"case LE11 done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    sys.exit(main())
