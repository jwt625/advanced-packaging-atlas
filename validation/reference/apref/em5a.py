"""EM-5a reduced TSV GSG chain (sims/em/em5a_tsv_gsg_chain_reduced.yaml, lane L7) on NGSolve, desktop cross-check.

Geometry read from the YAML (boxes and cylinders; true cylinders here, 12-gons in the browser case), half model
y >= 0 (y = 0 magnetic wall for the even GSG mode). Ports on the x faces with a quasi-TEM modal operator built on
the 3D mesh's own port face:
- e_t = -grad phi (surface H1 electrostatics on the port face, complex eps incl. Si conductivity, signal 1 V, grounds 0),
  q_t = -grad phi0 (same with vacuum): H shape of the quasi-TEM mode in E units (L = mu0 eps0 / C0);
  C, C0 per unit length from the same solves; beta = k0 sqrt(C / C0), Zc = 1 / (c sqrt(C C0)).
- port operator: j beta [M - M e (e^T M e)^-1 e^T M] + j beta (M q)(M q)^T / (e^T M q)  (M: tangential boundary mass),
  i.e. a local first-order absorbing term on the complement of the mode plus the exact single-mode term;
  applied with a Woodbury update on the sparse factorisation of the volume operator + local terms.
- excitation: incident amplitude 1 V at port k: rhs 2 j beta M q_k; outgoing amplitudes b = (q^T E) / (e^T M q) - a.
S referenced to Zc of each port, renormalised to 50 ohm (both ports have the same line).
"""

from __future__ import annotations

import math

import ngsolve as ngs
import numpy as np
import yaml
from netgen.occ import Box, Cylinder, Glue, OCCGeometry, Pnt, Z
from scipy.constants import c as C0
from scipy.constants import epsilon_0 as E0

from . import em_ngs as em

TOL = 1e-6


def shape_of(s):
    if "box_um" in s:
        b = s["box_um"]
        return Box(Pnt(b["x"][0], b["y"][0], b["z"][0]), Pnt(b["x"][1], b["y"][1], b["z"][1]))
    c = s["cylinder_um"]
    return Cylinder(Pnt(c["c"][0], c["c"][1], c["z"][0]), Z, r=c["r"], h=c["z"][1] - c["z"][0])


def build(deck_path, h_far=20.0, h_cond=4.0, half=True, sig_names=("sig_in", "sig_bot", "sig_out", "tsv1", "tsv2",
                                                                  "tsv1_pad_t", "tsv1_pad_b", "tsv2_pad_t", "tsv2_pad_b")):
    d = yaml.safe_load(open(deck_path))["em3d"]
    bx = d["box_um"]
    x0, x1 = bx["x"]
    y0, y1 = (0.0 if half else bx["y"][0]), bx["y"][1]
    z0, z1 = bx["z"]
    dom = Box(Pnt(x0, y0, z0), Pnt(x1, y1, z1))
    cond = None
    for s in d["solids"]:
        if s["kind"] == "conductor":
            sh = shape_of(s)
            cond = sh if cond is None else cond + sh
    cond = cond * dom
    cond.faces.maxh = h_cond
    diel = [s for s in d["solids"] if s["kind"] == "dielectric"]
    solids = []
    later = None
    for s in reversed(diel):  # later solids override earlier ones
        sh = shape_of(s) * dom
        part = sh - cond
        if later is not None:
            part = part - later
        part.mat(s["material"])
        solids.append(part)
        later = sh if later is None else later + sh
    air = dom - later - cond
    air.mat("air")
    solids.append(air)
    geo = Glue(solids)
    # faces: outer by position, interior by topology (shared by two solids = interface, else conductor)
    def key(f):
        (ax, ay, az), (bx_, by, bz) = f.bounding_box
        return tuple(round(v, 6) for v in (ax, ay, az, bx_, by, bz, f.mass))

    count = {}
    for sol in geo.solids:
        for f in sol.faces:
            count[key(f)] = count.get(key(f), 0) + 1
    for f in geo.faces:
        (ax, ay, az), (bx_, by, bz) = f.bounding_box
        if bx_ - ax < TOL and abs(ax - x0) < TOL:
            f.name = "p1"
        elif bx_ - ax < TOL and abs(ax - x1) < TOL:
            f.name = "p2"
        elif by - ay < TOL and abs(ay - y1) < TOL:
            f.name = "pec"  # ymax wall (bc pec)
        elif by - ay < TOL and abs(ay - y0) < TOL:
            f.name = "pmc" if half else "pec"
        elif bz - az < TOL and (abs(az - z0) < TOL or abs(az - z1) < TOL):
            f.name = "pmc"  # zmin / zmax pmc (deck)
        elif count.get(key(f), 0) >= 2:
            f.name = "interface"
        else:
            f.name = "pec"
    # port-plane edges: signal conductor outline -> psig, ground conductor outline and the y = ymax wall -> pgnd
    sig_boxes = []
    for s in d["solids"]:
        if s["kind"] == "conductor" and s["name"] in sig_names and "box_um" in s:
            b = s["box_um"]
            sig_boxes.append((b["y"][0], b["y"][1], b["z"][0], b["z"][1]))
    for e in geo.edges:
        (ax, ay, az), (bx_, by, bz) = e.bounding_box
        if bx_ - ax < TOL and (abs(ax - x0) < TOL or abs(ax - x1) < TOL):
            if by - ay < TOL and abs(ay - y1) < TOL:
                e.name = "pgnd"
                continue
            mid_y, mid_z = 0.5 * (ay + by), 0.5 * (az + bz)
            if any(b[0] - TOL <= ay and by <= b[1] + TOL and b[2] - TOL <= az and bz <= b[3] + TOL for b in sig_boxes):
                e.name = "psig"
            elif _on_ground_outline(d, mid_y, mid_z, ay, by, az, bz):
                e.name = "pgnd"
    mesh = ngs.Mesh(OCCGeometry(geo).GenerateMesh(maxh=h_far))
    return mesh, d, (x0, x1)


def _on_ground_outline(d, my, mz, ay, by, az, bz):
    for s in d["solids"]:
        if s["kind"] == "conductor" and "box_um" in s and s["name"].startswith("g"):
            b = s["box_um"]
            if b["y"][0] - TOL <= ay and by <= b["y"][1] + TOL and b["z"][0] - TOL <= az and bz <= b["z"][1] + TOL:
                return True
    return False


def eps_map(d, f_hz):
    w = 2 * math.pi * f_hz
    out = {"air": 1.0}
    for name, m in d["materials"].items():
        e = m["eps_r"] * (1 - 1j * m.get("tan_delta", 0.0)) - 1j * m.get("sigma_S_m", 0.0) / (w * E0)
        out[name] = e
    return out


def port_mode(mesh, name, eps_cf, order):
    """Surface electrostatics on the port face: returns (e_t CF, q_t CF, C, C0) with e_t = -grad phi (lossy eps),
    q_t = -grad phi0 (vacuum); C, C0 per unit length (F/m) of the modelled half x 2 when half."""
    out = []
    for epsv in (eps_cf, 1.0):
        fes = ngs.H1(mesh, order=order, complex=True, definedon=mesh.Boundaries(name), dirichlet_bbnd="psig|pgnd")
        u, v = fes.TnT()
        ebnd = ngs.BoundaryFromVolumeCF(epsv) if not isinstance(epsv, float) else epsv
        a = ngs.BilinearForm(ebnd * ngs.grad(u).Trace() * ngs.grad(v).Trace() * ngs.ds(name)).Assemble()
        g = ngs.GridFunction(fes)
        g.Set(1, definedon=mesh.BBoundaries("psig"))
        r = (-a.mat * g.vec).Evaluate()
        g.vec.data += a.mat.Inverse(fes.FreeDofs(), inverse="umfpack") * r
        Cpu = complex(ngs.Integrate(ebnd * ngs.grad(g).Trace() * ngs.grad(g).Trace(), mesh, ngs.BND,
                                    definedon=mesh.Boundaries(name))) * E0
        out.append((-ngs.grad(g).Trace(), Cpu, g))
    (e_t, C, ge), (q_t, C0v, gq) = out
    return e_t, q_t, C, C0v.real, (ge, gq)


def solve_s(mesh, d, f_hz, order=2, zref=50.0, half=True):
    eps = mesh.MaterialCF(eps_map(d, f_hz), default=1.0)
    k0 = em.k0_um(f_hz)
    ports = {}
    for p in ("p1", "p2"):
        e_t, q_t, C, C0v, _ = port_mode(mesh, p, eps, order + 1)
        beta = k0 * np.sqrt(C / C0v)  # complex (lossy): gamma = j beta
        Zc = 1 / (C0 * np.sqrt(C * C0v)) / (2 if half else 1)  # half model: C, C0 of the half -> full Zc = half / 2
        ports[p] = {"e": e_t, "q": q_t, "beta": beta, "Zc_full": Zc, "C": C, "C0": C0v}
    fes = ngs.HCurl(mesh, order=order, complex=True, dirichlet="pec")
    u, v = fes.TnT()
    n = ngs.specialcf.normal(3)
    a = ngs.BilinearForm(fes, symmetric=True)
    a += (ngs.curl(u) * ngs.curl(v) - k0**2 * eps * u * v) * ngs.dx
    for p, pd in ports.items():
        a += 1j * pd["beta"] * ngs.Cross(n, u.Trace()) * ngs.Cross(n, v.Trace()) * ngs.ds(p)
    with ngs.TaskManager():
        a.Assemble()
        inv = a.mat.Inverse(fes.FreeDofs(), inverse="sparsecholesky")
    vecs, coef = [], []
    for p, pd in ports.items():
        lf_e = ngs.LinearForm(fes)
        lf_e += pd["e"] * v.Trace() * ngs.ds(p)
        lf_q = ngs.LinearForm(fes)
        lf_q += pd["q"] * v.Trace() * ngs.ds(p)
        lf_e.Assemble()
        lf_q.Assemble()
        n_e = complex(ngs.Integrate(pd["e"] * pd["e"], mesh, ngs.BND, definedon=mesh.Boundaries(p)))
        n_q = complex(ngs.Integrate(pd["e"] * pd["q"], mesh, ngs.BND, definedon=mesh.Boundaries(p)))
        pd.update({"be": lf_e.vec, "bq": lf_q.vec, "N": n_q})
        vecs += [lf_e.vec, lf_q.vec]
        coef += [-1j * pd["beta"] / n_e, 1j * pd["beta"] / n_q]
    fd = np.array(fes.FreeDofs(), dtype=bool)

    def to_np(vec):
        return np.array(vec.FV(), dtype=complex)

    def solve0(rhs_np):
        r = fes.FreeDofs()
        bv = vecs[0].CreateVector()
        bv.FV().NumPy()[:] = np.where(fd, rhs_np, 0)
        x = vecs[0].CreateVector()
        x.data = inv * bv
        del r
        return to_np(x)

    U = np.column_stack([to_np(vv) for vv in vecs])
    AiU = np.column_stack([solve0(U[:, k]) for k in range(U.shape[1])])
    Cinv = np.diag([1 / c for c in coef])
    cap = Cinv + U.T @ AiU
    S = np.zeros((2, 2), dtype=complex)
    names = list(ports)
    for j, pe in enumerate(names):
        pdj = ports[pe]
        f = 2j * pdj["beta"] * to_np(pdj["bq"])
        y = solve0(f)
        x = y - AiU @ np.linalg.solve(cap, U.T @ y)
        for i, pr in enumerate(names):
            pdi = ports[pr]
            amp = (to_np(pdi["bq"]) @ x) / pdi["N"]
            S[i, j] = amp - (1.0 if i == j else 0.0)
    Zc = ports["p1"]["Zc_full"]
    Ssym = S
    # renormalise from Zc (both ports) to zref
    Iden = np.eye(2)
    Zm = Zc * (Iden + Ssym) @ np.linalg.inv(Iden - Ssym)
    S50 = (Zm - zref * Iden) @ np.linalg.inv(Zm + zref * Iden)
    return {"S_zc": Ssym, "S": S50, "Zc": Zc, "beta": ports["p1"]["beta"], "eps_eff": (ports["p1"]["beta"] / k0) ** 2,
            "ndof": fes.ndof}
