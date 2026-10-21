"""Curved geometry for the references: gmsh (OCC) quarter-cylinder TSV cells meshed with tets, converted to scikit-fem
MeshTet (P1) or MeshTet2 (quadratic geometry: edge midpoints on the cylinders r = a and r = R are snapped radially).

Geometry: Cu cylinder r < a inside a Si cylinder r < R, z in [0, H], quarter model x >= 0, y >= 0 (symmetry planes
x = 0 and y = 0). Mesh size: lc(r) = lc_in + (lc_out - lc_in) * clip((r - rf) / (R - rf), 0, 1) with rf = r_flat
(default a), optionally refined to
lc_top within `top_band` of z = H (near-surface stress, XB3).
"""

from __future__ import annotations

import dataclasses
import math

import numpy as np
from skfem import MeshTet, MeshTet2

TAG_CU, TAG_SI = 1, 2


def tsv_quarter(a: float, R: float, H: float, lc_in: float, lc_out: float, lc_top: float | None = None,
                top_band: float = 0.0, cu_height: float | None = None, r_flat: float | None = None) -> tuple[MeshTet, np.ndarray]:
    """Returns (MeshTet, elem_tag (ne,) with TAG_CU / TAG_SI). cu_height: Cu from z = H - cu_height to H (blind via)
    or the full height when None."""
    import gmsh

    gmsh.initialize(["-noenv"])
    gmsh.option.setNumber("General.Terminal", 0)
    gmsh.option.setNumber("General.NumThreads", 1)
    gmsh.option.setNumber("Mesh.MaxNumThreads3D", 1)
    # gmsh/OCC tolerances are absolute (1e-8): build in micrometres, scale nodes back to metres
    S = 1e6
    a, R, H, lc_in, lc_out = a * S, R * S, H * S, lc_in * S, lc_out * S
    lc_top = None if lc_top is None else lc_top * S
    top_band *= S
    cu_height = None if cu_height is None else cu_height * S
    rf = a if r_flat is None else r_flat * S  # lc = lc_in for r < r_flat, then linear growth to lc_out at R
    try:
        gmsh.model.add("tsv")
        occ = gmsh.model.occ
        hc = H if cu_height is None else cu_height
        cu = occ.addCylinder(0, 0, H - hc, 0, 0, hc, a, angle=math.pi / 2)
        si = occ.addCylinder(0, 0, 0, 0, 0, H, R, angle=math.pi / 2)
        out, omap = occ.fragment([(3, si)], [(3, cu)])
        occ.synchronize()
        vols = [e[1] for e in gmsh.model.getEntities(3)]
        # classify volumes by centre of mass radius
        tags = {}
        for v in vols:
            cx, cy, _ = occ.getCenterOfMass(3, v)
            tags[v] = TAG_CU if math.hypot(cx, cy) < a else TAG_SI
        f = gmsh.model.mesh.field
        fid = f.add("MathEval")
        expr = f"{lc_in} + ({lc_out} - {lc_in}) * Min(1, Max(0, (Sqrt(x*x + y*y) - {rf}) / ({R} - {rf})))"
        if lc_top is not None:  # refined band under the top surface, limited to r < 4 a
            expr = f"Min({expr}, {lc_top} + 1e3 * Max(0, {H - top_band} - z) + 1e3 * Max(0, Sqrt(x*x + y*y) - {4 * a}))"
        f.setString(fid, "F", expr)
        f.setAsBackgroundMesh(fid)
        gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        gmsh.option.setNumber("Mesh.Algorithm3D", 1)
        gmsh.model.mesh.generate(3)
        ntags, coords, _ = gmsh.model.mesh.getNodes()
        P = coords.reshape(-1, 3).T / S
        idx = {int(t): i for i, t in enumerate(ntags)}
        T, etag = [], []
        for v in vols:
            types, _, enodes = gmsh.model.mesh.getElements(3, v)
            for ty, en in zip(types, enodes, strict=True):
                if ty != 4:
                    raise RuntimeError(f"unexpected gmsh element type {ty}")
                tt = np.array([idx[int(n)] for n in en]).reshape(-1, 4).T
                T.append(tt)
                etag.append(np.full(tt.shape[1], tags[v]))
        t = np.concatenate(T, axis=1)
        etag = np.concatenate(etag)
    finally:
        gmsh.finalize()
    used = np.unique(t)
    remap = -np.ones(P.shape[1], dtype=np.int64)
    remap[used] = np.arange(used.size)
    mesh = MeshTet(P[:, used], remap[t])
    return mesh, etag


def to_quadratic(mesh: MeshTet, etag: np.ndarray, radii: list[float], tol: float) -> MeshTet2:
    """P2 geometry. For each cylinder r = r_k: facets with all three vertices on it (|r - r_k| < tol) that are a
    material interface (adjacent tags differ) or an exterior boundary; their edge midpoints are moved radially onto
    the cylinder."""
    m2 = MeshTet2.from_mesh(mesh)
    D = m2.doflocs.copy()
    nv = mesh.p.shape[1]
    rv = np.hypot(mesh.p[0], mesh.p[1])
    f2t = mesh.f2t
    t0 = etag[f2t[0]]
    t1 = np.where(f2t[1] >= 0, etag[np.maximum(f2t[1], 0)], -1)
    surf = (f2t[1] < 0) | (t0 != t1)
    for rk in radii:
        on = np.abs(rv - rk) < tol
        fsel = np.nonzero(surf & on[mesh.facets].all(axis=0))[0]
        esel = np.unique(mesh.f2e[:, fsel])
        mid = D[:, nv + esel]
        rm = np.hypot(mid[0], mid[1])
        D[0, nv + esel] *= rk / rm
        D[1, nv + esel] *= rk / rm
    return dataclasses.replace(m2, doflocs=D)
