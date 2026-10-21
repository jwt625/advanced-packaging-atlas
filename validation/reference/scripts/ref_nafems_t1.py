"""NAFEMS T1 plane-stress membrane with a circular hot spot (target sigma_yy at D = 50.0 MPa, NAFEMS TNSB Rev. 3 via
Abaqus Benchmarks T1 and Altair OS-V 0100).

Geometry, load and BCs from the public Abaqus input deck (retrieved 2026-10-20):
- https://abaqus-docs.mit.edu/2017/English/SIMAINPRefResources/nt1xxf8x.inp (CPS8): quarter model, outer square
  0..10 x 0..10 (corner nodes 97 (0, 10), 101 (10, 10), 105 (10, 0)); hot spot = quarter disk r = 1.0 (arc nodes 27-35,
  doubled as 200-208 and tied by *EQUATION, so the temperature jumps at r = 1); E 100 GPa, nu 0.3, alpha 1e-5,
  T = 100 on the hot-spot nodes (eigenstrain 1e-3 inside, 0 outside); *BOUNDARY SYMX (y = 0) u_y = 0, SYMY (x = 0)
  u_x = 0; output elements 8 (inside) and 12 (outside) meet at (1.0, 0): D = (1, 0) on the outside.
- https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-t1.htm: same material and load in text; target
  50.0 MPa at "point D (outside the hot-spot)"; lengths are dimensionless in plane stress (scale-free).
Closed-form checks (own derivation, plane stress, same material inside and outside, eigenstrain e* = 1e-3):
infinite plate sigma_tt(a+) = E e* / 2 = 50 MPa; free circular plate of radius R: sigma_tt(a+) = (E e* / 2)(1 + a^2/R^2).
Mesh: gmsh conforming triangles, P2 with arc midpoints snapped to r = 1; size lc_in at r = 1 growing to lc_out.

Usage: ./run.sh scripts/ref_nafems_t1.py
"""

from __future__ import annotations

import dataclasses
import math
import sys

import numpy as np
from common import sweep
from skfem import MeshTri, MeshTri2

from apref import fem, record


def tri_mesh(lc_in, lc_out):
    import gmsh

    gmsh.initialize(["-noenv"])
    gmsh.option.setNumber("General.Terminal", 0)
    try:
        occ = gmsh.model.occ
        sq = occ.addRectangle(0, 0, 0, 10, 10)
        dk = occ.addDisk(0, 0, 0, 1, 1)
        q, _ = occ.intersect([(2, dk)], [(2, occ.addRectangle(0, 0, 0, 2, 2))])
        occ.fragment([(2, sq)], q)
        occ.synchronize()
        fld = gmsh.model.mesh.field
        fid = fld.add("MathEval")
        fld.setString(fid, "F", f"Min({lc_out}, {lc_in} + 0.25 * Abs(Sqrt(x*x + y*y) - 1))")
        fld.setAsBackgroundMesh(fid)
        for k in ("MeshSizeExtendFromBoundary", "MeshSizeFromPoints", "MeshSizeFromCurvature"):
            gmsh.option.setNumber(f"Mesh.{k}", 0)
        gmsh.model.mesh.generate(2)
        tags, xyz, _ = gmsh.model.mesh.getNodes()
        P = xyz.reshape(-1, 3).T[:2]
        idx = {int(t): i for i, t in enumerate(tags)}
        T, tag = [], []
        for _, sfc in gmsh.model.getEntities(2):
            cx, cy, _ = occ.getCenterOfMass(2, sfc)
            _, _, en = gmsh.model.mesh.getElements(2, sfc)
            tt = np.array([idx[int(n)] for n in en[0]]).reshape(-1, 3).T
            T.append(tt)
            tag.append(np.full(tt.shape[1], 1 if math.hypot(cx, cy) < 1 else 0))
    finally:
        gmsh.finalize()
    t = np.concatenate(T, 1)
    etag = np.concatenate(tag)
    used = np.unique(t)
    rm = -np.ones(P.shape[1], dtype=np.int64)
    rm[used] = np.arange(used.size)
    m = MeshTri(P[:, used], rm[t])
    m2 = MeshTri2.from_mesh(m)
    D = m2.doflocs.copy()
    nv = m.p.shape[1]
    on = np.abs(np.hypot(m.p[0], m.p[1]) - 1) < 1e-9
    e = m2.facets  # 2D: facets are edges, edge DOFs follow vertices in facet order
    sel = np.nonzero(on[e[0]] & on[e[1]])[0]
    mid = D[:, nv + sel]
    D[:, nv + sel] = mid / np.hypot(mid[0], mid[1])
    return m, dataclasses.replace(m2, doflocs=D), etag


# key = 1 / h (lc_in = 0.2 / key) so that the sweep's Richardson uses the true size ratio
LEVELS = {1: (0.2, 1.5), 2: (0.1, 1.0), 4: (0.05, 0.7), 8: (0.025, 0.5), 16: (0.0125, 0.35)}


def solve(lev, el):
    m1, m2, etag = tri_mesh(*LEVELS[lev])
    mesh = m2 if el == "t2" else m1
    basis = fem.make_basis(mesh, el)
    Dm = fem.plane_stress(100e9, 0.3)
    eps = np.zeros(basis.dx.shape + (3,))
    eps[etag == 1, :, 0] = 1e-3
    eps[etag == 1, :, 1] = 1e-3
    K, f = fem.assemble_elastic_2d(basis, np.repeat(Dm[None], mesh.t.shape[1], 0), eps)
    fy = mesh.facets_satisfying(lambda x: np.isclose(x[1], 0.0))
    fx = mesh.facets_satisfying(lambda x: np.isclose(x[0], 0.0))
    D = np.unique(np.concatenate([2 * basis.get_dofs(fy).all() + 1, 2 * basis.get_dofs(fx).all()]))
    u, info = fem.solve_dirichlet(K, f, D, np.zeros(D.size))
    V, Gs, cells = fem.point_matrices(basis, np.array([[1.0], [0.0]]), hint=np.array([[1e-6], [1e-7]]))
    assert etag[cells[0]] == 0
    U = u.reshape(-1, 2)
    exx = (Gs[0] @ U[:, 0])[0]
    eyy = (Gs[1] @ U[:, 1])[0]
    gxy = (Gs[1] @ U[:, 0] + Gs[0] @ U[:, 1])[0]
    s = Dm @ np.array([exx, eyy, gxy])
    Vi, Gi, ci = fem.point_matrices(basis, np.array([[1.0], [0.0]]), hint=np.array([[-1e-6], [1e-7]]))
    si = Dm @ (np.array([(Gi[0] @ U[:, 0])[0], (Gi[1] @ U[:, 1])[0], (Gi[1] @ U[:, 0] + Gi[0] @ U[:, 1])[0]]) - [1e-3, 1e-3, 0])
    return {"sigma_yy_D_Pa": float(s[1]), "sigma_xx_D_Pa": float(s[0]), "sigma_yy_D_inside_Pa": float(si[1])}, {
        "dof": int(2 * basis.N), "mesh": {"lc_in": LEVELS[lev][0], "lc_out": LEVELS[lev][1], "elements": int(mesh.t.shape[1])},
        "solve": info}


def main():
    log = record.Log("T1")
    log(f"case T1 start; versions {record.versions()}")
    res = sweep(log, "T1", solve, {"t1": list(LEVELS), "t2": list(LEVELS)}, ["t1", "t2"], {"sigma_yy_D_Pa": 50e6})
    res["closed_form"] = {"infinite_plate_sigma_tt_a_plus_Pa": 50e6,
                          "free_disk_R10_sigma_tt_a_plus_Pa": 50e6 * (1 + 1 / 100.0),
                          "note": "plane stress, same material, e* = 1e-3; the square 10 x 10 quarter lies between these"}
    res["sources"] = {"retrieved": "2026-10-20", "urls": [
        "https://abaqus-docs.mit.edu/2017/English/SIMAINPRefResources/nt1xxf8x.inp",
        "https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-t1.htm"]}
    p = record.write_result("T1", {"case": "NAFEMS-T1", "tier": "B", "expected_source": "Abaqus T1 / L4 B/nafems-T1 (50.0 MPa)",
                                   "results": res, "max_rss_mb": record.max_rss_mb()})
    log(f"case T1 done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    sys.exit(main())
