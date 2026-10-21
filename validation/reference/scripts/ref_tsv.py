"""Curved-geometry references: MA7 (Lame cylindrical inclusion, plane strain) and XB3 (3D TSV unit cell).

Usage: ./run.sh scripts/ref_tsv.py MA7 | XB3 | all
Mesh: gmsh quarter cylinders (apref.curved), P1 (straight) and P2 (isoparametric, snapped to r = a, r = R) tets.
MA7 closed forms: infinite matrix (L4 expected p) and the finite composite cylinder with a traction-free outer radius
R (own derivation, plane strain eps_zz = 0, u_r = A r + B / r per phase):
  sigma_rr = 2 (lam + mu) A - 2 mu B / r^2 - beta, sigma_tt = 2 (lam + mu) A + 2 mu B / r^2 - beta,
  beta = (3 lam + 2 mu) alpha dT; continuity of u_r and sigma_rr at r = a, sigma_rr(R) = 0, B_inclusion = 0.
XB3 (R6 section 2.3, no published numbers): Cu d = 10 um through a 100 um Si layer, free top surface, dT = -250 K.
Unit-cell choices (lane assumptions, template): Si cylinder R = 50 um (isolated TSV, traction-free outer surface),
bottom face z = 0 is a mirror plane (u_z = 0: top half of a 200 um layer), stress-free 275 C, T = 25 C.
"""

from __future__ import annotations

import math
import sys
import time

import numpy as np
from common import sweep

from apref import curved, fem, l4, record
from apref.materials import make_material, strain_tensor_to_voigt

E = l4.expected()


def lame(mat):
    C = mat.C
    return C[0, 1], C[3, 3]


def ma7_closed(cu, si, a, R, dT):
    l1, m1 = lame(cu)
    l2, m2 = lame(si)
    b1 = (3 * l1 + 2 * m1) * cu.alpha_diag[0] * dT
    b2 = (3 * l2 + 2 * m2) * si.alpha_diag[0] * dT
    if math.isinf(R):
        A2 = b2 / (2 * (l2 + m2))
        M = np.array([[a, -1 / a], [2 * (l1 + m1), 2 * m2 / a**2]])
        rhs = np.array([A2 * a, 2 * (l2 + m2) * A2 - b2 + b1])
        A1, B2 = np.linalg.solve(M, rhs)
    else:
        M = np.array([[a, -a, -1 / a], [2 * (l1 + m1), -2 * (l2 + m2), 2 * m2 / a**2], [0, 2 * (l2 + m2), -2 * m2 / R**2]])
        A1, A2, B2 = np.linalg.solve(M, np.array([0.0, b1 - b2, b2]))
    p = -(2 * (l1 + m1) * A1 - b1)

    def si_s(r):
        return (2 * (l2 + m2) * A2 - 2 * m2 * B2 / r**2 - b2, 2 * (l2 + m2) * A2 + 2 * m2 * B2 / r**2 - b2)

    return {"p_Pa": p, "si_srr_r_a_Pa": si_s(a)[0], "si_stt_r_a_Pa": si_s(a)[1], "si_srr_r_2a_Pa": si_s(2 * a)[0],
            "si_stt_r_2a_Pa": si_s(2 * a)[1], "si_srr_r_1p05a_Pa": si_s(1.05 * a)[0], "si_stt_r_1p05a_Pa": si_s(1.05 * a)[1],
            "cu_srr_Pa": -p}


def polar(s, th):
    c, sn = math.cos(th), math.sin(th)
    srr = s[0] * c * c + s[1] * sn * sn + 2 * s[5] * c * sn
    stt = s[0] * sn * sn + s[1] * c * c - 2 * s[5] * c * sn
    return srr, stt


class TetModel:
    def __init__(self, mesh, etag, mats, elem, Tsf, T):
        self.basis = fem.make_basis(mesh, elem)
        self.mesh, self.etag, self.mats, self.Tsf, self.T = mesh, etag, mats, Tsf, T
        ne = mesh.t.shape[1]
        self.C = np.zeros((ne, 6, 6))
        eps = np.zeros(self.basis.dx.shape + (6,))
        for tag, mat in mats.items():
            s = etag == tag
            self.C[s] = mat.C
            eps[s] = strain_tensor_to_voigt(mat.thermal_strain(np.full(self.basis.dx[s].shape, T), Tsf))
        self.eps = eps

    def solve(self, fixes):
        t0 = time.perf_counter()
        K, f = fem.assemble_elastic(self.basis, self.C, self.eps)
        ta = time.perf_counter() - t0
        D = []
        for pred, comp in fixes:
            facets = self.mesh.facets_satisfying(pred)
            D.append(3 * self.basis.get_dofs(facets).all() + comp)
        D = np.unique(np.concatenate(D))
        self.u, info = fem.solve_dirichlet(K, f, D, np.zeros(D.size))
        info["assemble_s"] = ta
        return info

    def stress(self, pts, tag_hint):
        eps, disp, cells = fem.strain_at(self.basis, self.u, pts)
        out = []
        for k, e in enumerate(cells):
            tag = self.etag[e]
            if tag != tag_hint[k]:
                raise RuntimeError(f"probe {pts[:, k]} landed in tag {tag}, wanted {tag_hint[k]}")
            mat = self.mats[tag]
            eth = strain_tensor_to_voigt(mat.thermal_strain(np.asarray(self.T), self.Tsf))
            out.append(mat.C @ (eps[k] - eth))
        return np.asarray(out), disp


RING_DEG = (5.0, 15.0, 25.0, 35.0, 45.0, 55.0, 65.0, 75.0, 85.0)


def ring_means(tm, rings, z):
    """Mean of sigma_rr and sigma_tt over 9 angles (5-85 deg) on circles r: the element-wise P2 stress sampled at one
    point on an unstructured tet mesh scatters by about +-2 % on the 1/r^2 field (MA7, r = 2a); the ring mean is the
    gate quantity, the single 22.5 deg points are kept for reference."""
    out = {}
    for name, (r, tag) in rings.items():
        ths = [math.radians(d) for d in RING_DEG]
        pts = np.array([[r * math.cos(t) for t in ths], [r * math.sin(t) for t in ths], [z] * len(ths)])
        s, _ = tm.stress(pts, [tag] * len(ths))
        pr = [polar(s[k], ths[k]) for k in range(len(ths))]
        out[f"{name}_srr_mean_Pa"] = float(np.mean([v[0] for v in pr]))
        out[f"{name}_stt_mean_Pa"] = float(np.mean([v[1] for v in pr]))
        out[f"{name}_srr_spread_rel"] = float(np.ptp([v[0] for v in pr]) / abs(np.mean([v[0] for v in pr])))
    return out


def mats_tier_a(cu_key):
    return {curved.TAG_CU: make_material("cu", l4.material(cu_key)), curved.TAG_SI: make_material("si", l4.material("si_iso"))}


def run_ma7(log):
    a, H, dT = 5e-6, 5e-6, 100.0
    mats = mats_tier_a("cu_nu035")
    th = math.radians(22.5)
    out = {}
    for Rfac in (10, 20, 40):
        R = Rfac * a
        cf = ma7_closed(mats[1], mats[2], a, R, dT)
        cinf = ma7_closed(mats[1], mats[2], a, math.inf, dT)
        log(f"MA7 R={Rfac}a closed form finite-R: {cf}; infinite: p={cinf['p_Pa']:.6g}")

        def fn(lev, el, R=R):
            lc = a / (2 * lev)
            mesh, tag = curved.tsv_quarter(a, R, H, lc, min(lc * 12, R / 4))
            if el == "p2":
                mesh = curved.to_quadratic(mesh, tag, [a, R], 1e-12)
            tm = TetModel(mesh, tag, mats, el, 25.0, 125.0)
            info = tm.solve([(lambda x: np.isclose(x[0], 0.0), 0), (lambda x: np.isclose(x[1], 0.0), 1),
                             (lambda x: np.isclose(x[2], 0.0), 2), (lambda x: np.isclose(x[2], H), 2)])
            rr = np.array([0.5 * a, a * (1 + 1e-6), 2 * a, 0.9 * a])
            pts = np.stack([rr * math.cos(th), rr * math.sin(th), np.full(4, H / 2)])
            s, _ = tm.stress(pts, [1, 2, 2, 1])
            p0 = polar(s[0], th)
            p1 = polar(s[1], th)
            p2 = polar(s[2], th)
            p3 = polar(s[3], th)
            q = {"cu_srr_centre_Pa": p0[0], "cu_srr_r_0p9a_Pa": p3[0], "si_srr_r_a_Pa": p1[0], "si_stt_r_a_Pa": p1[1],
                 "si_srr_r_2a_Pa": p2[0], "si_stt_r_2a_Pa": p2[1]}
            q.update(ring_means(tm, {"si_r_1p05a": (1.05 * a, 2), "si_r_2a": (2 * a, 2), "cu_r_0p5a": (0.5 * a, 1)}, H / 2))
            return q, {"dof": int(3 * tm.basis.N), "mesh": {"elements": int(mesh.t.shape[1]), "lc_in_m": lc}, "solve": info}

        exp = {"si_r_1p05a_srr_mean_Pa": cf["si_srr_r_1p05a_Pa"], "si_r_1p05a_stt_mean_Pa": cf["si_stt_r_1p05a_Pa"],
               "si_r_2a_srr_mean_Pa": cf["si_srr_r_2a_Pa"], "si_r_2a_stt_mean_Pa": cf["si_stt_r_2a_Pa"],
               "cu_r_0p5a_srr_mean_Pa": cf["cu_srr_Pa"], "cu_r_0p5a_stt_mean_Pa": cf["cu_srr_Pa"],
               "cu_srr_centre_Pa": cf["cu_srr_Pa"], "cu_srr_r_0p9a_Pa": cf["cu_srr_Pa"], "si_srr_r_a_Pa": cf["si_srr_r_a_Pa"],
               "si_stt_r_a_Pa": cf["si_stt_r_a_Pa"], "si_srr_r_2a_Pa": cf["si_srr_r_2a_Pa"], "si_stt_r_2a_Pa": cf["si_stt_r_2a_Pa"]}
        levels = {"p1": [1, 2, 4, 6], "p2": [1, 2, 3, 4]} if Rfac == 20 else {"p2": [1, 2, 3]}
        res = sweep(log, f"MA7-R{Rfac}a", fn, levels, list(levels), exp)
        res["closed_form_finite_R"] = cf
        res["closed_form_infinite"] = cinf
        out[f"R{Rfac}a"] = res
    out["l4_expected_infinite"] = E["MA7"]
    return out


def run_xb3(log):
    a, H, R = 5e-6, 100e-6, 50e-6
    mats = mats_tier_a("cu")
    th = math.radians(22.5)

    def fn(lev, el):
        lc = a / lev
        mesh, tag = curved.tsv_quarter(a, R, H, lc, 12.5e-6, lc_top=lc / 2, top_band=2 * a)
        if el == "p2":
            mesh = curved.to_quadratic(mesh, tag, [a, R], 1e-12)
        tm = TetModel(mesh, tag, mats, el, 275.0, 25.0)
        info = tm.solve([(lambda x: np.isclose(x[0], 0.0), 0), (lambda x: np.isclose(x[1], 0.0), 1),
                         (lambda x: np.isclose(x[2], 0.0), 2)])
        # displacement probes on the top surface
        P = np.array([[0.0, 0.0, H], [0.9 * R * math.cos(th), 0.9 * R * math.sin(th), H], [2 * a * math.cos(th), 2 * a * math.sin(th), H]]).T
        _, d = fem.strain_at(tm.basis, tm.u, P)[:2]
        rr = np.array([2 * a, 3 * a, 2 * a, a * (1 + 1e-6)])
        zz = np.array([H * (1 - 1e-9), H * (1 - 1e-9), H / 2, H / 2])
        pts = np.stack([rr * math.cos(th), rr * math.sin(th), zz])
        s, _ = tm.stress(pts, [2, 2, 2, 2])
        sc, _ = tm.stress(np.array([[0.2 * a * math.cos(th)], [0.2 * a * math.sin(th)], [H / 2]]), [1])
        rm = ring_means(tm, {"si_top_2a": (2 * a, 2), "si_top_3a": (3 * a, 2)}, H * (1 - 1e-9))
        q = {**rm, "cu_protrusion_m": float(d[0, 2] - d[1, 2]), "uz_top_axis_m": float(d[0, 2]),
             "si_top_2a_srr_Pa": polar(s[0], th)[0], "si_top_2a_stt_Pa": polar(s[0], th)[1], "si_top_2a_szz_Pa": float(s[0, 2]),
             "si_top_3a_srr_Pa": polar(s[1], th)[0], "si_top_3a_stt_Pa": polar(s[1], th)[1],
             "si_mid_2a_srr_Pa": polar(s[2], th)[0], "si_mid_a_srr_Pa": polar(s[3], th)[0], "si_mid_a_stt_Pa": polar(s[3], th)[1],
             "cu_mid_axis_szz_Pa": float(sc[0, 2]), "cu_mid_axis_srr_Pa": polar(sc[0], th)[0]}
        return q, {"dof": int(3 * tm.basis.N), "mesh": {"elements": int(mesh.t.shape[1]), "lc_in_m": lc}, "solve": info}

    res = sweep(log, "XB3", fn, {"p1": [1, 2, 3, 4], "p2": [1, 1.5, 2, 2.5]}, ["p1", "p2"], None)
    res["assumptions"] = ["Si cylinder R = 50 um, traction-free outer surface (isolated TSV)",
                          "z = 0 mirror plane (top half of a 200 um layer); top z = 100 um free",
                          "stress-free 275 C, T = 25 C (dT = -250 K, R6 XB3)", "tier-A materials si_iso, cu (nu 0.34)",
                          "cu_protrusion_m = u_z(axis, top) - u_z(r = 0.9 R = 45 um, top)"]
    return res


CASES = {"MA7": run_ma7, "XB3": run_xb3}


def main(names):
    if names == ["all"]:
        names = list(CASES)
    for n in names:
        log = record.Log(n)
        log(f"case {n} start; versions {record.versions()}")
        res = CASES[n](log)
        tier = "A" if n == "MA7" else "B"
        p = record.write_result(n, {"case": n, "tier": tier, "results": res, "max_rss_mb": record.max_rss_mb()})
        log(f"case {n} done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["all"])
