"""Box-part cases (input schema `ap-ref-box/0`) on a rectilinear hex grid aligned to every part boundary.

Mirrors sims/SPEC.md sections 1-3 so that the same box list runs in the JS engine and here:
- parts: {id, kind, material, x_mm, y_mm, w_mm, d_mm, z_um, h_um, priority?, in?}; x/y = footprint centre, z = bottom.
- cell material: part with the highest priority containing the cell centre; default priority = containment depth via
  `in` (a part `in` a host outranks it); ties: later in the list wins. Cells in no part are void (not meshed).
- symmetry: none | half_x (mirror plane x = 0, keep x >= 0) | half_y | quarter (keep x >= 0, y >= 0).
- selections: top:<part>, bottom:<part>, side:<part> (fnmatch on part id), default (exterior facets not used by any
  other BC of the same physics, symmetry planes excluded), sym:x, sym:y, and face:<axis><sign> (bounding-box faces,
  e.g. face:x+ for all exterior facets on the max-x plane of the model).
- mesh: max_xy_mm, max_z_um, min_cells_per_layer, extra_lines_mm {x, y, z_um}, refine_z (default true);
  `refine` (int) multiplies every interval's cell count (z too unless refine_z is false).

Units in the input follow SPEC suffixes; everything inside is SI (m), temperatures in C (linear problems).
"""

from __future__ import annotations

import fnmatch
import json
import math
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml
from skfem import CellBasis, MeshHex

from . import fem
from .materials import Material, make_material, strain_tensor_to_voigt


def load_case(path: str | Path) -> dict:
    p = Path(path)
    d = json.loads(p.read_text()) if p.suffix == ".json" else yaml.safe_load(p.read_text())
    if d.get("schema") != "ap-ref-box/0":
        raise ValueError(f"{p}: schema must be ap-ref-box/0, got {d.get('schema')}")
    return d


@dataclass
class Model:
    case: dict
    mesh: MeshHex
    xs: np.ndarray
    ys: np.ndarray
    zs: np.ndarray
    parts: list
    elem_part: np.ndarray  # (ne,) index into parts
    mats: dict[str, Material]
    sym: str
    bfacets: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=np.int64))
    bf_axis: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=np.int64))
    bf_sign: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=np.int64))
    bf_part: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=np.int64))
    bf_plane: np.ndarray = field(default_factory=lambda: np.zeros(0))
    stats: dict = field(default_factory=dict)

    @property
    def mirror_factor(self) -> int:
        return {"none": 1, "half_x": 2, "half_y": 2, "quarter": 4}[self.sym]


def _bounds(p):
    x0, x1 = (p["x_mm"] - p["w_mm"] / 2) * 1e-3, (p["x_mm"] + p["w_mm"] / 2) * 1e-3
    y0, y1 = (p["y_mm"] - p["d_mm"] / 2) * 1e-3, (p["y_mm"] + p["d_mm"] / 2) * 1e-3
    z0, z1 = p["z_um"] * 1e-6, (p["z_um"] + p["h_um"]) * 1e-6
    return x0, x1, y0, y1, z0, z1


def _lines(vals, lo_cut, hmax, refine, nmin=1):
    v = np.unique(np.round(np.asarray(vals), 15))
    if lo_cut is not None:
        v = np.unique(np.concatenate([[lo_cut], v[v > lo_cut]]))
    out = [v[0]]
    for a, b in zip(v[:-1], v[1:], strict=True):
        n = max(nmin, math.ceil((b - a) / hmax - 1e-9)) * refine
        out.extend(np.linspace(a, b, n + 1)[1:])
    return np.asarray(out)


def _depth(parts, i):
    byid = {p["id"]: p for p in parts}
    d, p = 0, parts[i]
    while p.get("in") and p["in"] in byid:
        d, p = d + 1, byid[p["in"]]
    return d


def build_model(case: dict, refine: int = 1, mesh_over: dict | None = None) -> Model:
    t0 = time.perf_counter()
    parts = case["parts"]
    msh = dict(case.get("mesh", {}))
    msh.update(mesh_over or {})
    sym = case.get("geometry", {}).get("symmetry", "none")
    B = np.array([_bounds(p) for p in parts])
    xcut = 0.0 if sym in ("half_x", "quarter") else None
    ycut = 0.0 if sym in ("half_y", "quarter") else None
    hxy = msh.get("max_xy_mm", 1.0) * 1e-3
    hz = msh.get("max_z_um", 1e9) * 1e-6
    nmin = int(msh.get("min_cells_per_layer", 1))
    ex = msh.get("extra_lines_mm", {})
    exx = np.asarray(ex.get("x", []), dtype=float) * 1e-3
    exy = np.asarray(ex.get("y", []), dtype=float) * 1e-3
    exz = np.asarray(ex.get("z_um", []), dtype=float) * 1e-6
    xs = _lines(np.concatenate([B[:, 0], B[:, 1], exx]), xcut, msh.get("max_x_mm", msh.get("max_xy_mm", 1.0)) * 1e-3, refine)
    ys = _lines(np.concatenate([B[:, 2], B[:, 3], exy]), ycut, msh.get("max_y_mm", msh.get("max_xy_mm", 1.0)) * 1e-3, refine)
    zs = _lines(np.concatenate([B[:, 4], B[:, 5], exz]), None, hz, refine if msh.get("refine_z", True) else 1, nmin)
    del hxy
    mesh = MeshHex.init_tensor(xs, ys, zs)
    c = mesh.p[:, mesh.t].mean(axis=1)  # (3, ne)
    prio = np.array([p.get("priority", _depth(parts, i)) for i, p in enumerate(parts)], dtype=float)
    best = np.full(c.shape[1], -1)
    bestp = np.full(c.shape[1], -np.inf)
    for i, b in enumerate(B):
        inside = (c[0] > b[0]) & (c[0] < b[1]) & (c[1] > b[2]) & (c[1] < b[3]) & (c[2] > b[4]) & (c[2] < b[5])
        take = inside & (prio[i] >= bestp)
        best[take] = i
        bestp[take] = prio[i]
    if np.any(best < 0):
        mesh = mesh.remove_elements(np.nonzero(best < 0)[0]).remove_unused_nodes()
        best = best[best >= 0]
    mats = {k: make_material(k, v) for k, v in case["materials"].items()}
    for p in parts:
        if p["material"] not in mats:
            raise KeyError(f"part {p['id']}: material {p['material']} not in case materials")
    m = Model(case, mesh, xs, ys, zs, parts, best, mats, sym)
    _boundary(m)
    m.stats = {"nodes_q1": int(mesh.p.shape[1]), "elements": int(mesh.t.shape[1]), "nx": len(xs) - 1,
               "ny": len(ys) - 1, "nz": len(zs) - 1, "grid_s": time.perf_counter() - t0}
    return m


def _boundary(m: Model):
    mesh = m.mesh
    bf = mesh.boundary_facets()
    fc = mesh.p[:, mesh.facets[:, bf]]  # (3, 4, nb)
    spread = fc.max(axis=1) - fc.min(axis=1)
    axis = np.argmin(spread, axis=0)
    owner = mesh.f2t[0, bf]
    ec = mesh.p[:, mesh.t[:, owner]].mean(axis=1)
    plane = fc[axis, 0, np.arange(bf.size)]
    sign = np.sign(plane - ec[axis, np.arange(bf.size)]).astype(int)
    m.bfacets, m.bf_axis, m.bf_sign, m.bf_part, m.bf_plane = bf, axis, sign, m.elem_part[owner], plane


def _sym_mask(m: Model):
    mask = np.zeros(m.bfacets.size, dtype=bool)
    if m.sym in ("half_x", "quarter"):
        mask |= (m.bf_axis == 0) & (m.bf_sign < 0) & np.isclose(m.bf_plane, 0.0, atol=1e-15)
    if m.sym in ("half_y", "quarter"):
        mask |= (m.bf_axis == 1) & (m.bf_sign < 0) & np.isclose(m.bf_plane, 0.0, atol=1e-15)
    return mask


def selection(m: Model, name: str, used: np.ndarray | None = None) -> np.ndarray:
    """Facet ids of a named selection."""
    symm = _sym_mask(m)
    if name == "default":
        mask = ~symm
        if used is not None:
            mask &= ~np.isin(m.bfacets, used)
        return m.bfacets[mask]
    if name in ("sym:x", "sym:y"):
        ax = 0 if name == "sym:x" else 1
        return m.bfacets[symm & (m.bf_axis == ax)]
    kind, _, pat = name.partition(":")
    if kind == "face":
        ax, sg = "xyz".index(pat[0]), (1 if pat[1] == "+" else -1)
        ext = m.mesh.p[ax].max() if sg > 0 else m.mesh.p[ax].min()
        return m.bfacets[(m.bf_axis == ax) & (m.bf_sign == sg) & np.isclose(m.bf_plane, ext, atol=1e-12) & ~symm]
    pidx = [i for i, p in enumerate(m.parts) if fnmatch.fnmatch(p["id"], pat)]
    if not pidx:
        raise KeyError(f"selection {name}: no part matches {pat}")
    pm = np.isin(m.bf_part, pidx) & ~symm
    if kind == "top":
        return m.bfacets[pm & (m.bf_axis == 2) & (m.bf_sign > 0)]
    if kind == "bottom":
        return m.bfacets[pm & (m.bf_axis == 2) & (m.bf_sign < 0)]
    if kind == "side":
        return m.bfacets[pm & (m.bf_axis < 2)]
    raise KeyError(f"unknown selection {name}")


def rect_filter(m: Model, facets: np.ndarray, rect_mm) -> np.ndarray:
    """Keep facets whose centroid lies in [x0, x1] x [y0, y1] (mm, full-model coordinates)."""
    if rect_mm is None:
        return facets
    c = m.mesh.p[:, m.mesh.facets[:, facets]].mean(axis=1)
    x0, x1, y0, y1 = (v * 1e-3 for v in rect_mm)
    return facets[(c[0] > x0) & (c[0] < x1) & (c[1] > y0) & (c[1] < y1)]


def _facet_area(m: Model, facets) -> float:
    fc = m.mesh.p[:, m.mesh.facets[:, facets]]
    span = fc.max(axis=1) - fc.min(axis=1)  # (3, nf)
    span.sort(axis=0)
    return float(np.sum(span[1] * span[2]))


# ---------------------------------------------------------------- thermal


def solve_thermal(m: Model, elem: str = "q1") -> dict:
    th = m.case["thermal"]
    t0 = time.perf_counter()
    basis = fem.make_basis(m.mesh, elem)
    ne = m.mesh.t.shape[1]
    kcell = np.zeros((ne, 3, 3))
    for i, p in enumerate(m.parts):
        sel = m.elem_part == i
        if np.any(sel):
            k = m.mats[p["material"]].k
            if k is None:
                raise ValueError(f"material {p['material']}: k_W_mK needed")
            kcell[sel] = k
    K = fem.assemble_conduction(basis, kcell)
    f = np.zeros(basis.N)
    q_in = 0.0
    for s in th.get("sources", []):
        pidx = [i for i, p in enumerate(m.parts) if fnmatch.fnmatch(p["id"], s["parts"])]
        if not pidx:
            raise KeyError(f"source parts {s['parts']}: no match")
        Vfull = sum(m.parts[i]["w_mm"] * m.parts[i]["d_mm"] * m.parts[i]["h_um"] * 1e-12 for i in pidx)
        qv = s["power_W"] / Vfull
        qcell = np.where(np.isin(m.elem_part, pidx), qv, 0.0)
        f += fem.volume_source(basis, qcell)
        q_in += s["power_W"] / m.mirror_factor
    used: list[np.ndarray] = []
    robins, D, xD = [], [], []
    default_bc = None
    for bc in th.get("bcs", []):
        if bc["selection"] == "default":
            default_bc = bc
            continue
        fs = rect_filter(m, selection(m, bc["selection"]), bc.get("rect_mm"))
        used.append(fs)
        q_in += _apply_thermal_bc(m, basis, elem, bc, fs, f, robins, D, xD)
    if default_bc is not None and default_bc["type"] != "adiabatic":
        fs = selection(m, "default", np.concatenate(used) if used else None)
        q_in += _apply_thermal_bc(m, basis, elem, default_bc, fs, f, robins, D, xD)
    for Kr, fr, _, _ in robins:
        K = K + Kr
        f = f + fr
    t_asm = time.perf_counter() - t0
    if D:
        Dd = np.concatenate(D)
        xd = np.concatenate(xD)
        Dd, ix = np.unique(Dd, return_index=True)
        xd = xd[ix]
    else:
        Dd, xd = np.zeros(0, dtype=np.int64), np.zeros(0)
    if Dd.size == 0 and not robins:
        raise ValueError("thermal: no Dirichlet or Robin boundary; problem is singular")
    T, info = fem.solve_dirichlet(K, f, Dd, xd, max_direct=300_000)
    # energy balance (per modelled fraction)
    q_out_robin = 0.0
    for _, _, fb, (h, Tinf) in robins:
        q_out_robin += float(np.sum(h * (np.asarray(fb.interpolate(T)) - Tinf) * fb.dx))
    # K includes the Robin terms: the consistent reaction -(K T - f) at Dirichlet DOFs is the heat leaving there
    q_out_dir = float(-(K @ T - f)[Dd].sum()) if Dd.size else 0.0
    q_out = q_out_robin + q_out_dir
    res = {
        "elem": elem, "dof": int(basis.N), "T": T, "basis": basis,
        "Tmax_C": float(T.max()), "Tmin_C": float(T.min()),
        "heat_in_W": q_in, "heat_out_W": q_out, "heat_out_robin_W": q_out_robin, "heat_out_dirichlet_W": q_out_dir,
        "balance_rel": (q_out - q_in) / q_in if q_in else float("nan"),
        "timing": {"assemble_s": t_asm, **info},
    }
    return res


def _apply_thermal_bc(m, basis, elem, bc, fs, f, robins, D, xD) -> float:
    """Adds the BC in place; returns heat input through it (flux BCs), W, for the modelled fraction."""
    t = bc["type"]
    if fs.size == 0:
        raise ValueError(f"BC selection {bc['selection']} is empty")
    if t == "adiabatic":
        return 0.0
    fb = fem.facet_basis(m.mesh, elem, fs)
    if t == "htc":
        Kr, fr = fem.robin(fb, bc["h_W_m2K"], bc["T_inf_C"])
        robins.append((Kr, fr, fb, (bc["h_W_m2K"], bc["T_inf_C"])))
    elif t == "flux":
        if "power_W" in bc:
            q = bc["power_W"] / (bc.get("area_full_m2") or _facet_area(m, fs) * m.mirror_factor)
        else:
            q = bc["q_W_m2"]
        f += fem.flux(fb, q)
        return q * _facet_area(m, fs)
    elif t == "temperature":
        dofs = basis.get_dofs(fs).all()
        D.append(dofs)
        if "T_expr" in bc:  # expression in x, y, z (m, model coordinates)
            x, y, z = basis.doflocs[:, dofs]
            xD.append(np.asarray(eval(bc["T_expr"], {"np": np, "x": x, "y": y, "z": z}), dtype=float) * np.ones(dofs.size))
        else:
            xD.append(np.full(dofs.size, float(bc["T_C"])))
    else:
        raise ValueError(f"unknown thermal BC type {t}")
    return 0.0


# ---------------------------------------------------------------- thermo-elastic


def temperature_qp(m: Model, basis: CellBasis, thermal: dict | None) -> np.ndarray:
    mech = m.case["mechanics"]
    tspec = mech.get("temperature", {})
    X = basis.mapping.F(basis.X)  # (3, ne, nqp)
    if "uniform_C" in tspec:
        return np.full(basis.dx.shape, float(tspec["uniform_C"]))
    if "linear_z" in tspec:
        zz = np.asarray(tspec["linear_z"]["z_um"], dtype=float) * 1e-6
        TT = np.asarray(tspec["linear_z"]["T_C"], dtype=float)
        return np.interp(X[2], zz, TT)
    if "expr" in tspec:
        x, y, z = X  # noqa: F841 (used by eval)
        return np.asarray(eval(tspec["expr"], {"np": np, "x": x, "y": y, "z": z}), dtype=float) * np.ones(basis.dx.shape)
    if tspec.get("from_thermal"):
        tb = CellBasis(m.mesh, thermal["basis"].elem, quadrature=(basis.X, basis.W))
        return np.asarray(tb.interpolate(thermal["T"]))
    raise ValueError("mechanics.temperature: need uniform_C, linear_z, expr or from_thermal")


def stress_free(m: Model, part_index: int) -> float:
    sf = m.case["mechanics"]["stress_free_C"]
    if isinstance(sf, dict):
        return float(sf.get("per_part", {}).get(m.parts[part_index]["id"], sf["default"]))
    return float(sf)


def solve_mech(m: Model, elem: str = "q2s", thermal: dict | None = None, method: str = "auto") -> dict:
    mech = m.case["mechanics"]
    t0 = time.perf_counter()
    basis = fem.make_basis(m.mesh, elem)
    ne = m.mesh.t.shape[1]
    Tq = temperature_qp(m, basis, thermal)
    Ccell = np.zeros((ne, 6, 6))
    eps = np.zeros(basis.dx.shape + (6,))
    for i, p in enumerate(m.parts):
        sel = np.nonzero(m.elem_part == i)[0]
        if sel.size == 0:
            continue
        mat = m.mats[p["material"]]
        if mat.C is None:
            raise ValueError(f"material {p['material']}: elastic needed")
        Ccell[sel] = mat.C
        eps[sel] = strain_tensor_to_voigt(mat.thermal_strain(Tq[sel], stress_free(m, i)))
    K, f = fem.assemble_elastic(basis, Ccell, eps)
    t_asm = time.perf_counter() - t0
    D, xD = supports(m, basis, mech.get("supports", "rigid_motion"))
    coords = basis.doflocs
    ns = fem.rigid_body_modes(coords)
    u, info = fem.solve_dirichlet(K, f, D, xD, method=method, nullspace=ns)
    R = K @ u - f
    fscale = np.abs(f).sum() or 1.0
    reac = float(np.abs(R[D]).max() / fscale) if D.size else 0.0
    return {"elem": elem, "dof": int(3 * basis.N), "u": u, "basis": basis, "Ccell": Ccell, "eps_th": eps,
            "reaction_rel": reac, "timing": {"assemble_s": t_asm, **info}}


def _nearest_dof(basis, pt):
    d = np.linalg.norm(basis.doflocs - np.asarray(pt)[:, None], axis=0)
    return int(np.argmin(d))


def supports(m: Model, basis: CellBasis, spec) -> tuple[np.ndarray, np.ndarray]:
    P = basis.doflocs
    lo, hi = P.min(axis=1), P.max(axis=1)
    D: list[int] = []
    if spec == "rigid_motion":
        if m.sym != "none":
            raise ValueError("rigid_motion with a symmetric model: use supports: symmetry (SPEC: never both)")
        a = _nearest_dof(basis, [lo[0], lo[1], lo[2]])
        b = _nearest_dof(basis, [hi[0], lo[1], lo[2]])
        c = _nearest_dof(basis, [lo[0], hi[1], lo[2]])
        D = [3 * a, 3 * a + 1, 3 * a + 2, 3 * b + 1, 3 * b + 2, 3 * c + 2]
        return np.asarray(D), np.zeros(len(D))
    if spec == "symmetry":
        if m.sym == "none":
            raise ValueError("supports: symmetry needs geometry.symmetry != none")
        if m.sym in ("half_x", "quarter"):
            D += list(3 * basis.get_dofs(selection(m, "sym:x")).all())
        if m.sym in ("half_y", "quarter"):
            D += list(3 * basis.get_dofs(selection(m, "sym:y")).all() + 1)
        o = _nearest_dof(basis, [max(lo[0], 0.0), max(lo[1], 0.0), lo[2]])
        if m.sym == "quarter":
            D += [3 * o + 2]
        elif m.sym == "half_x":
            b = _nearest_dof(basis, [0.0, hi[1], lo[2]])
            D += [3 * o + 1, 3 * o + 2, 3 * b + 2]
        else:
            b = _nearest_dof(basis, [hi[0], 0.0, lo[2]])
            D += [3 * o, 3 * o + 2, 3 * b + 2]
        D = sorted(set(D))
        return np.asarray(D), np.zeros(len(D))
    if isinstance(spec, dict) and "faces" in spec:
        xD = {}
        for fspec in spec["faces"]:
            dofs = basis.get_dofs(selection(m, fspec["selection"])).all()
            for comp, val in fspec["u"].items():
                c = "xyz".index(comp)
                for s in dofs:
                    xD[3 * int(s) + c] = float(val)
        for extra in spec.get("points", []):
            s = _nearest_dof(basis, np.asarray(extra["xyz_mm"]) * 1e-3)
            for comp in extra["fix"]:
                xD[3 * s + "xyz".index(comp)] = 0.0
        keys = np.asarray(sorted(xD))
        return keys, np.asarray([xD[k] for k in keys])
    raise ValueError(f"unknown supports {spec}")


def stress_at(m: Model, res: dict, pts_m: np.ndarray, hint: np.ndarray | None = None) -> dict:
    """Stress (Pa, Voigt) at points; material and thermal strain of the element containing each (nudged) point."""
    basis = res["basis"]
    eps, disp, cells = fem.strain_at(basis, res["u"], pts_m, hint)
    out = []
    for k, e in enumerate(cells):
        i = m.elem_part[e]
        mat = m.mats[m.parts[i]["material"]]
        Tpt = _temperature_point(m, pts_m[:, k], res)
        eth = strain_tensor_to_voigt(mat.thermal_strain(np.asarray(Tpt), stress_free(m, i)))
        out.append(mat.C @ (eps[k] - eth))
    s = np.asarray(out)
    return {"stress": s, "strain": eps, "u": disp, "vm": fem.von_mises(s), "cells": cells}


def _temperature_point(m: Model, x, res):
    tspec = m.case["mechanics"].get("temperature", {})
    if "uniform_C" in tspec:
        return float(tspec["uniform_C"])
    if "linear_z" in tspec:
        return float(np.interp(x[2], np.asarray(tspec["linear_z"]["z_um"]) * 1e-6, tspec["linear_z"]["T_C"]))
    if "expr" in tspec:
        return float(eval(tspec["expr"], {"np": np, "x": x[0], "y": x[1], "z": x[2]}))
    th = res.get("thermal")
    if th is None:
        raise ValueError("from_thermal stress evaluation needs res['thermal']")
    V, _, _ = fem.point_matrices(th["basis"], x[:, None])
    return float((V @ th["T"])[0])


def surface_w(m: Model, res: dict, sel: str):
    """Nodal (x, y, w) on a z-facing selection (all scalar DOF locations on those facets)."""
    basis = res["basis"]
    dofs = basis.get_dofs(selection(m, sel)).all()
    P = basis.doflocs[:, dofs]
    w = res["u"][3 * dofs + 2]
    return P[0], P[1], w


def curvature_fit(m: Model, res: dict, sel: str, region_frac: float = 0.5, half_span_m=None) -> dict:
    """Quadratic fit w = c0 + c1 x + c2 y + c3 x^2 + c4 y^2 + c5 x y over |x|, |y| <= region_frac * half span.
    Reports d2w/dx2 = 2 c3, d2w/dy2 = 2 c4 (z up; positive = concave up when viewed from +z)."""
    x, y, w = surface_w(m, res, sel)
    # mirror symmetric models so that the fit domain is the full symmetric square (same points as a full model)
    if m.sym in ("half_x", "quarter"):
        k = x > 1e-15
        x, y, w = np.concatenate([x, -x[k]]), np.concatenate([y, y[k]]), np.concatenate([w, w[k]])
    if m.sym in ("half_y", "quarter"):
        k = y > 1e-15
        x, y, w = np.concatenate([x, x[k]]), np.concatenate([y, -y[k]]), np.concatenate([w, w[k]])
    if half_span_m is None:
        ax = max(abs(m.xs[0]), abs(m.xs[-1]))
        ay = max(abs(m.ys[0]), abs(m.ys[-1]))
    else:
        ax, ay = half_span_m
    sel_pts = (np.abs(x) <= region_frac * ax + 1e-12) & (np.abs(y) <= region_frac * ay + 1e-12)
    x, y, w = x[sel_pts], y[sel_pts], w[sel_pts]
    A = np.stack([np.ones_like(x), x, y, x**2, y**2, x * y], axis=1)
    c, *_ = np.linalg.lstsq(A, w, rcond=None)
    rms = float(np.sqrt(np.mean((A @ c - w) ** 2)))
    return {"d2w_dx2": 2 * c[3], "d2w_dy2": 2 * c[4], "d2w_dxdy": c[5], "fit_rms_m": rms, "n_pts": int(x.size)}


def warpage(m: Model, res: dict, sel: str) -> dict:
    """Coplanarity (max - min after best-fit-plane removal; plane removal skipped for symmetric models, whose
    constraints admit no tilt) and signed centre-minus-corner w of the selection (z up; + = centre high = convex
    when viewed from +z)."""
    x, y, w = surface_w(m, res, sel)
    if m.sym == "none":
        A = np.stack([np.ones_like(x), x, y], axis=1)
        c, *_ = np.linalg.lstsq(A, w, rcond=None)
        wr = w - A @ c
    else:
        wr = w
    ic = np.argmin(x**2 + y**2)
    r2 = x**2 + y**2
    icor = np.argmax(r2)
    return {"coplanarity_m": float(wr.max() - wr.min()), "center_minus_corner_m": float(w[ic] - w[icor]),
            "center_xy_m": [float(x[ic]), float(y[ic])], "corner_xy_m": [float(x[icor]), float(y[icor])]}
