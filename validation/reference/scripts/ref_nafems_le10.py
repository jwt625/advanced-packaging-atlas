"""NAFEMS LE10 thick elliptic plate under normal pressure (target sigma_yy at D = -5.38 MPa, NAFEMS TNSB Rev. 3 via
the Abaqus Benchmarks Manual; FeenoX -5.37968 MPa).

Geometry and BCs verified 2026-10-20 against public sources (retrieved 2026-10-20):
- https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le10.step (STEP, mm): inner ellipse
  semi-axes 2000 x 1000, outer 3250 x 2750, faces at z = -300 and +300, curve at z = 0 on the outer face.
- https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le10.geo: physical groups upper, DCD'C',
  ABA'B', BCB'C', midplane = a curve (line EE').
- https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le10.fee: p = 1 MPa on upper; v = 0 on DCD'C';
  u = 0 on ABA'B'; u = v = 0 on BCB'C'; w = 0 on midplane; E 210 GPa, nu 0.3; sigma_y at D = (2000, 0, 300) mm.
- https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-le10.htm: the same BCs; uz = 0 on line EE'
  (E midpoint of edge CC', E' midpoint of edge BB'); target 5.38 MPa (compressive in its results table).
Model (SI): quarter plate x >= 0, y >= 0 between (x/2)^2 + y^2 = 1 and (x/3.25)^2 + (y/2.75)^2 = 1 (m), z in [-0.3, 0.3].
Discretisations:
- hex: mapped (s, t, z) -> x = (2 + 1.25 s) cos t, y = (1 + 1.75 s) sin t; MeshHex2 (quadratic geometry) for Q2s / Q2,
  straight MeshHex for Q1; geometric grading (ratio 1.25) toward s = 0 and s = 1, t = 0 and the top face; z = 0 kept
  as a line.
- tet: gmsh P2 tets (curved-face midpoints projected onto the ellipses), size lc_D + 0.2 |x - D| capped at lc_far,
  extrusion split at z = 0 so that line EE' is in the mesh.
Note: u_z on a single support line is log-singular in 3D, so displacements near EE' are not a convergence measure;
the stress at D is.

Usage: ./run.sh scripts/ref_nafems_le10.py
"""

from __future__ import annotations

import dataclasses
import sys

import numpy as np
from common import sweep
from skfem import MeshHex, MeshHex2, MeshTet, MeshTet2

from apref import fem, record
from apref.materials import stiffness_iso


def facets_all(mesh, pred):
    """Facets whose vertices all satisfy pred (facet-midpoint tests fail on curved faces)."""
    return np.nonzero(pred(mesh.p[:, mesh.facets]).all(axis=0))[0]


def graded(n, ratio, lo, hi, toward_lo=True):
    """n cells, geometric growth `ratio` between neighbours, smallest cell at lo (or hi)."""
    if ratio == 1.0:
        x = np.linspace(0, 1, n + 1)
    else:
        w = ratio ** np.arange(n)
        x = np.concatenate([[0], np.cumsum(w)]) / w.sum()
    if not toward_lo:
        x = 1 - x[::-1]
    return lo + (hi - lo) * x


def two_sided(n, ratio):
    """Grading toward both s = 0 (point D side) and s = 1 (clamped outer face, line EE'); n rounded up to even."""
    h = (n + n % 2) // 2
    a = graded(h, ratio, 0, 0.5)
    return np.concatenate([a, (1 - a[::-1])[1:]])


def mapped_mesh(ns, nt, nz, quadratic, ratio=1.0):
    s = two_sided(ns, ratio) if ratio != 1.0 else np.linspace(0, 1, ns + 1)
    t = graded(nt, ratio, 0, np.pi / 2)
    # z = 0 must stay a grid line (u_z = 0 on line EE'): lower half uniform, upper half graded toward the top face
    hz = max(1, nz // 2)
    z = np.concatenate([np.linspace(-0.3, 0.0, hz + 1)[:-1], graded(nz - hz, ratio, 0.0, 0.3, toward_lo=False)])
    m = MeshHex.init_tensor(s, t, z)

    def F(P):
        return np.stack([(2 + 1.25 * P[0]) * np.cos(P[1]), (1 + 1.75 * P[0]) * np.sin(P[1]), P[2]])

    if not quadratic:
        return MeshHex(F(m.p), m.t)
    m2 = MeshHex2.from_mesh(m)
    return dataclasses.replace(m2, doflocs=F(m2.doflocs))


def solve(lev, el, ratio=1.0):
    ns, nt, nz = 3 * lev, 6 * lev, 2 * lev
    mesh = mapped_mesh(ns, nt, nz, el != "q1", ratio)
    basis = fem.make_basis(mesh, el)
    C = stiffness_iso(210e9, 0.3)
    K, f = fem.assemble_elastic(basis, np.repeat(C[None], mesh.t.shape[1], 0), None)
    # pressure on top: f_z = -p int phi dA
    top = facets_all(mesh, lambda x: np.isclose(x[2], 0.3))
    fb = fem.facet_basis(mesh, el, top)
    from skfem import LinearForm

    @LinearForm
    def one(v, w):
        return v

    f[2::3] += -1e6 * one.assemble(fb)
    P = basis.doflocs
    D = []
    D.append(3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[1], 0.0))).all() + 1)
    D.append(3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[0], 0.0))).all() + 0)
    outer = basis.get_dofs(facets_all(mesh, lambda x: np.isclose((x[0] / 3.25) ** 2 + (x[1] / 2.75) ** 2, 1.0, atol=1e-9))).all()
    D += [3 * outer, 3 * outer + 1]
    mid = outer[np.isclose(P[2, outer], 0.0)]
    D.append(3 * mid + 2)
    D = np.unique(np.concatenate(D))
    u, info = fem.solve_dirichlet(K, f, D, np.zeros(D.size))
    pD = np.array([[2.0], [0.0], [0.3]])
    eps, _, _ = fem.strain_at(basis, u, pD, hint=np.array([[1e-7], [1e-7], [-1e-7]]))
    sig = C @ eps[0]
    return {"sigma_yy_D_Pa": float(sig[1]), "sigma_xx_D_Pa": float(sig[0])}, {
        "dof": int(3 * basis.N), "mesh": {"ns": ns, "nt": nt, "nz": nz, "elements": int(mesh.t.shape[1])}, "solve": info}


def tet_mesh(lc_far, lc_D):
    """gmsh quarter elliptic annulus extruded in two halves (z = 0 line kept); returns (MeshTet, MeshTet2)."""
    import gmsh

    gmsh.initialize(["-noenv"])
    gmsh.option.setNumber("General.Terminal", 0)
    gmsh.option.setNumber("General.NumThreads", 1)
    try:
        occ = gmsh.model.occ
        outer = occ.addDisk(0, 0, -0.3, 3.25, 2.75)
        inner = occ.addDisk(0, 0, -0.3, 2.0, 1.0)
        ring, _ = occ.cut([(2, outer)], [(2, inner)])
        box = occ.addRectangle(0, 0, -0.3, 4, 4)
        q, _ = occ.intersect(ring, [(2, box)])
        e1 = occ.extrude(q, 0, 0, 0.3)
        occ.extrude([e for e in e1 if e[0] == 2][:1], 0, 0, 0.3)
        occ.fragment(occ.getEntities(3), [])
        occ.synchronize()
        fld = gmsh.model.mesh.field
        fid = fld.add("MathEval")
        fld.setString(fid, "F", f"Min({lc_far}, {lc_D} + 0.2 * Sqrt((x-2)^2 + y^2 + (z-0.3)^2))")
        fld.setAsBackgroundMesh(fid)
        for k in ("MeshSizeExtendFromBoundary", "MeshSizeFromPoints", "MeshSizeFromCurvature"):
            gmsh.option.setNumber(f"Mesh.{k}", 0)
        gmsh.model.mesh.generate(3)
        tags, xyz, _ = gmsh.model.mesh.getNodes()
        P = xyz.reshape(-1, 3).T
        idx = {int(t): i for i, t in enumerate(tags)}
        T = []
        for _, v in gmsh.model.getEntities(3):
            _, _, en = gmsh.model.mesh.getElements(3, v)
            T.append(np.array([idx[int(n)] for n in en[0]]).reshape(-1, 4).T)
    finally:
        gmsh.finalize()
    t = np.concatenate(T, 1)
    used = np.unique(t)
    rm = -np.ones(P.shape[1], dtype=np.int64)
    rm[used] = np.arange(used.size)
    m = MeshTet(P[:, used], rm[t])
    m2 = MeshTet2.from_mesh(m)
    D = m2.doflocs.copy()
    nv = m.p.shape[1]
    for a, b in ((2.0, 1.0), (3.25, 2.75)):
        on = np.abs((m.p[0] / a) ** 2 + (m.p[1] / b) ** 2 - 1) < 1e-9
        fs = np.nonzero((m.f2t[1] < 0) & on[m.facets].all(0))[0]
        es = np.unique(m.f2e[:, fs])
        mid = D[:, nv + es]
        lam = 1 / np.sqrt((mid[0] / a) ** 2 + (mid[1] / b) ** 2)
        D[0, nv + es] *= lam
        D[1, nv + es] *= lam
    return m, dataclasses.replace(m2, doflocs=D)


TET_LEVELS = {1: (0.2, 0.04), 2: (0.12, 0.016), 3: (0.12, 0.008), 4: (0.09, 0.008)}


def solve_tet(lev, el):
    from skfem import LinearForm

    _, mesh = tet_mesh(*TET_LEVELS[lev])
    basis = fem.make_basis(mesh, "p2")
    C = stiffness_iso(210e9, 0.3)
    K, f = fem.assemble_elastic(basis, np.repeat(C[None], mesh.t.shape[1], 0), None)

    @LinearForm
    def one(v, w):
        return v

    f[2::3] += -1e6 * one.assemble(fem.facet_basis(mesh, "p2", facets_all(mesh, lambda x: np.isclose(x[2], 0.3))))
    P = basis.doflocs
    D = [3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[1], 0))).all() + 1,
         3 * basis.get_dofs(facets_all(mesh, lambda x: np.isclose(x[0], 0))).all()]
    outer = basis.get_dofs(facets_all(mesh, lambda x: np.abs((x[0] / 3.25) ** 2 + (x[1] / 2.75) ** 2 - 1) < 1e-9)).all()
    D += [3 * outer, 3 * outer + 1, 3 * outer[np.isclose(P[2, outer], 0)] + 2]
    D = np.unique(np.concatenate(D))
    u, info = fem.solve_dirichlet(K, f, D, np.zeros(D.size), max_direct=130_000)
    eps, _, _ = fem.strain_at(basis, u, np.array([[2.0 + 1e-6], [1e-6], [0.3 - 1e-6]]))
    sig = C @ eps[0]
    return {"sigma_yy_D_Pa": float(sig[1]), "sigma_xx_D_Pa": float(sig[0])}, {
        "dof": int(3 * basis.N), "mesh": {"lc_far_m": TET_LEVELS[lev][0], "lc_D_m": TET_LEVELS[lev][1],
                                          "elements": int(mesh.t.shape[1])}, "solve": info}


def main():
    log = record.Log("LE10")
    log(f"case LE10 start; versions {record.versions()}")
    exp = {"sigma_yy_D_Pa": -5.38e6}
    res = {"hex_graded_1.25": sweep(log, "LE10-hex", lambda lev, el: solve(lev, el, 1.25),
                                    {"q1": [1, 2, 4], "q2s": [2, 3, 4, 5], "q2": [2, 3, 4]}, ["q1", "q2s", "q2"], exp),
           "hex_uniform": sweep(log, "LE10-hexu", solve, {"q2s": [3, 4, 5]}, ["q2s"], exp),
           "tet_p2": sweep(log, "LE10-tet", solve_tet, [1, 2, 3, 4], ["p2"], exp)}
    res["sources"] = {"retrieved": "2026-10-20", "urls": [
        "https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le10.step",
        "https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le10.geo",
        "https://raw.githubusercontent.com/seamplex/feenox/main/examples/nafems-le10.fee",
        "https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-le10.htm"]}
    res["note"] = ("tet_p2 'refine' index: (lc_far, lc_D) = (0.2, 0.04), (0.12, 0.016), (0.12, 0.008), (0.09, 0.008) m; "
                   "hex_graded: two-sided grading in s (toward D and toward the clamped outer face / line EE'), "
                   "one-sided toward t = 0 and the top face. One-sided s-grading (toward D only) plateaued at "
                   "-5.412 MPa: the result is sensitive to resolution at the outer support (log-singular line EE').")
    p = record.write_result("LE10", {"case": "NAFEMS-LE10", "tier": "B", "expected_source": "R6 section 2.1 (-5.38 MPa)",
                                     "results": res, "max_rss_mb": record.max_rss_mb()})
    log(f"case LE10 done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    sys.exit(main())
