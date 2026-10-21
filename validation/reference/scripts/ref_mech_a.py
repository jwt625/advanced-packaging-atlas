"""Tier-A thermo-elastic references (R6 section 1.1) on box geometries from the L4 cases.

Usage: ./run.sh scripts/ref_mech_a.py MA4b [MA5b ...] | all
Each case: element orders x mesh levels (refine multiplies every interval's cell count), quantities vs the L4
expected values (validation/expected/tier_a_values.json), Richardson / observed order. Results:
results/<case>-skfem.json; log: logs/ref-<case>-<stamp>.log.
Curvature sign: kappa_clt = -d2w/dx2 (CLT convention eps = eps0 + kappa z, z up, layer 1 at the bottom); the L4
expected kappa values use this CLT sign.
"""

from __future__ import annotations

import sys

import numpy as np
from common import sweep

from apref import boxcase as bc
from apref import l4, record

E = l4.expected()
NUDGE = 1e-9  # m, chooses the element side for interface probes


def meta(m, r, extra=None):
    d = {"dof": r["dof"], "mesh": {k: m.stats[k] for k in ("nx", "ny", "nz", "elements")}, "solve": r["timing"],
         "reaction_rel": r.get("reaction_rel")}
    d.update(extra or {})
    return d


def sxx(m, r, x_mm, y_mm, z_um, side):
    p = np.array([[x_mm * 1e-3], [y_mm * 1e-3], [z_um * 1e-6]])
    h = np.array([[0.0], [0.0], [side * NUDGE]])
    return bc.stress_at(m, r, p, h)


def mech_case(boxes, cid, sym, mesh, mech, overrides=None):
    c = l4.boxes_to_case(boxes, cid, overrides)
    c["geometry"] = {"symmetry": sym}
    c["mesh"] = mesh
    c["mechanics"] = mech
    return c


# ------------------------------------------------------------------ MA1, MA2, MA8 (uniform states)


def run_ma1(log):
    y = l4.case_yaml("A/MA1")
    boxes = y["inputs"]["geometry"]["boxes"]
    case = mech_case(boxes, "MA1", "none", {"max_xy_mm": 5, "max_z_um": 5000},
                     {"stress_free_C": 25, "temperature": {"uniform_C": 125}, "supports": "rigid_motion"})

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_mech(m, el)
        P = r["basis"].doflocs
        lo = P.min(axis=1)
        U = r["u"].reshape(-1, 3)
        d = np.linalg.norm(P - lo[:, None], axis=0)
        i5 = int(np.argmin(np.abs(P[0] - lo[0] - 5e-3) + np.abs(P[1] - lo[1]) + np.abs(P[2] - lo[2])))
        s = bc.stress_at(m, r, P[:, :: max(1, P.shape[1] // 50)] * 0.999 + lo[:, None] * 0.001)
        q = {"u_at_5mm_m": float(U[i5, 0]), "max_abs_sigma_over_scale": float(np.abs(s["stress"]).max() / E["MA1"]["sigma_scale_Pa"]),
             "max_u_m": float(np.linalg.norm(U, axis=1)[np.argmax(d)])}
        return q, meta(m, r)

    return sweep(log, "MA1", fn, [1, 2], ["q1", "q2s", "q2"], {"u_at_5mm_m": E["MA1"]["u_at_5mm_m"]})


def run_ma2(log):
    y = l4.case_yaml("A/MA2")
    boxes = y["inputs"]["geometry"]["boxes"]
    out = {}
    lo, hi = -0.5, 0.5
    variants = {
        "uniaxial": ({"faces": [{"selection": "face:x-", "u": {"x": 0}}, {"selection": "face:x+", "u": {"x": 0}}],
                      "points": [{"xyz_mm": [lo, lo, 0], "fix": "yz"}, {"xyz_mm": [lo, hi, 0], "fix": "z"}]}, None, "uniaxial_Pa", 0),
        "biaxial": ({"faces": [{"selection": f"face:{a}{s}", "u": {a: 0}} for a in "xy" for s in "-+"],
                     "points": [{"xyz_mm": [lo, lo, 0], "fix": "z"}]}, None, "biaxial_Pa", 0),
        "triaxial": ({"faces": [{"selection": f"face:{a}{s}", "u": {a: 0}} for a in "xyz" for s in "-+"]}, None, "triaxial_Pa", 0),
        "triaxial_nu049": ({"faces": [{"selection": f"face:{a}{s}", "u": {a: 0}} for a in "xyz" for s in "-+"]},
                           {"cu": {"nu": 0.49}}, "triaxial_nu049_Pa", 0),
        "biaxial_nu049": ({"faces": [{"selection": f"face:{a}{s}", "u": {a: 0}} for a in "xy" for s in "-+"],
                           "points": [{"xyz_mm": [lo, lo, 0], "fix": "z"}]}, {"cu": {"nu": 0.49}}, "biaxial_nu049_Pa", 0),
    }
    for name, (sup, ov, key, comp) in variants.items():
        case = mech_case(boxes, f"MA2-{name}", "none", {"max_xy_mm": 0.5, "max_z_um": 500},
                         {"stress_free_C": 25, "temperature": {"uniform_C": 125}, "supports": sup}, ov)

        def fn(refine, el, case=case, comp=comp):
            m = bc.build_model(case, refine)
            r = bc.solve_mech(m, el)
            pts = np.array([[0.1e-3, -0.2e-3, 0.0], [0.05e-3, 0.3e-3, -0.4e-3], [0.5e-3, 0.3e-3, 0.95e-3]])
            s = bc.stress_at(m, r, pts)
            return {"sigma_Pa": float(s["stress"][0, comp]), "sigma_spread_rel": float(np.ptp(s["stress"][:, comp]) / abs(s["stress"][0, comp]))}, meta(m, r)

        out[name] = sweep(log, f"MA2-{name}", fn, [1], ["q1", "q2s"], {"sigma_Pa": E["MA2"][key]})
    return out


def run_ma8(log):
    y = l4.case_yaml("A/MA8")
    boxes = y["inputs"]["geometry"]["boxes"]
    out = {}
    for name, frame in (("aligned", None), ("rot30x", {"rot_x_deg": 30})):
        case = mech_case(boxes, f"MA8-{name}", "none", {"max_xy_mm": 2.5, "max_z_um": 2500},
                         {"stress_free_C": 25, "temperature": {"uniform_C": 125}, "supports": "rigid_motion"})
        if frame:
            case["materials"]["ortho_core"]["frame"] = frame

        def fn(refine, el, case=case):
            m = bc.build_model(case, refine)
            r = bc.solve_mech(m, el)
            pts = np.array([[1e-3, -2e-3, 3e-3], [-4e-3, 4e-3, 9e-3]]).T
            s = bc.stress_at(m, r, pts)
            e = s["strain"][0]
            return {"eps_xx": float(e[0]), "eps_yy": float(e[1]), "eps_zz": float(e[2]), "eps_yz_tensor": float(e[3] / 2),
                    "max_abs_sigma_Pa": float(np.abs(s["stress"]).max())}, meta(m, r)

        ex = E["MA8"]
        exp = ({"eps_xx": ex["eps"][0], "eps_yy": ex["eps"][1], "eps_zz": ex["eps"][2]} if name == "aligned" else
               {"eps_xx": ex["rot30x_eps_xx"], "eps_yy": ex["rot30x_eps_yy"], "eps_zz": ex["rot30x_eps_zz"],
                "eps_yz_tensor": ex["rot30x_eps_yz_tensor"]})
        out[name] = sweep(log, f"MA8-{name}", fn, [1], ["q1", "q2s"], exp)
    return out


# ------------------------------------------------------------------ plates (MA3, MA4, MA5b, MA6)


def plate_q(m, r, Lx_mm, probes):
    cf = bc.curvature_fit(m, r, f"bottom:{m.parts[0]['id']}", 0.5)
    q = {"kappa_clt_1_m": float(-cf["d2w_dx2"]), "kappa_clt_y_1_m": float(-cf["d2w_dy2"]), "fit_rms_m": cf["fit_rms_m"]}
    x, yy, w = bc.surface_w(m, r, f"bottom:{m.parts[0]['id']}")
    ic = np.argmin(x**2 + yy**2)
    ie = np.argmin((x - Lx_mm / 2 * 1e-3) ** 2 + yy**2)
    icor = np.argmax(x**2 + yy**2)
    q["sag_edge_m"] = float(w[ic] - w[ie])
    q["sag_diag_m"] = float(w[ic] - w[icor])
    for name, (z_um, side) in probes.items():
        s = sxx(m, r, 0.0, 0.0, z_um, side)
        q[name] = float(s["stress"][0, 0])
    s0 = sxx(m, r, 0.0, 0.0, 0.0, +1)
    q["eps0_bottom"] = float(s0["strain"][0, 0])
    return q


def run_ma4(log, variant):
    y = l4.case_yaml("A/MA4")
    v = y["variants"][variant]
    if variant == "a":
        probes = {"si_bottom_Pa": (0, 1), "si_top_Pa": (500, -1), "cu_bottom_Pa": (500, 1), "cu_top_Pa": (1000, -1)}
        base = {"max_xy_mm": 2.0, "max_z_um": 500}
        L = 20
    else:
        probes = {"sub_bottom_Pa": (0, 1), "sub_top_Pa": (1000, -1), "uf_bottom_Pa": (1000, 1), "uf_top_Pa": (1050, -1),
                  "si_bottom_Pa": (1050, 1), "si_top_Pa": (1825, -1)}
        base = {"max_xy_mm": 5.0, "max_z_um": 1000}
        L = 50
    case = mech_case(v["boxes"], f"MA4{variant}", "quarter", base,
                     {"stress_free_C": v["stress_free_C"], "temperature": {"uniform_C": v["temperature_C"]},
                      "supports": "symmetry"})

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_mech(m, el)
        return plate_q(m, r, L, probes), meta(m, r)

    ex = dict(E["MA4"][variant])
    exp = {"kappa_clt_1_m": ex["kappa_1_m"], "eps0_bottom": ex["eps0_bottom"], **{k: ex[k] for k in probes}}
    if variant == "b":
        exp["sag_edge_m"] = ex["sag_edge50_m"]
        exp["sag_diag_m"] = ex["sag_diag_m"]
    res = sweep(log, f"MA4{variant}", fn, {"q1": [1, 2, 4], "q2s": [1, 2, 4], "q2": [1, 2, 3]}, ["q1", "q2s", "q2"], exp)
    # symmetry consistency: quarter vs full model at the same mesh density (q2s, refine 1)
    full = dict(case)
    full["geometry"] = {"symmetry": "none"}
    full["mechanics"] = dict(case["mechanics"], supports="rigid_motion")
    mq = bc.build_model(case, 2)
    rq = bc.solve_mech(mq, "q2s")
    mf = bc.build_model(full, 2)
    rf = bc.solve_mech(mf, "q2s")
    kq = -bc.curvature_fit(mq, rq, f"bottom:{mq.parts[0]['id']}", 0.5, (L / 2e3, L / 2e3))["d2w_dx2"]
    kf = -bc.curvature_fit(mf, rf, f"bottom:{mf.parts[0]['id']}", 0.5, (L / 2e3, L / 2e3))["d2w_dx2"]
    res["symmetry_check"] = {"kappa_quarter": kq, "kappa_full": kf, "rel_diff": (kq - kf) / abs(kf), "dof_full": rf["dof"],
                             "reaction_rel_full": rf["reaction_rel"]}
    log(f"MA4{variant} symmetry quarter vs full (q2s refine 2): {kq:.10g} vs {kf:.10g} rel {(kq - kf) / abs(kf):.2e}")
    return res


def run_ma3(log):
    y = l4.case_yaml("A/MA3")
    boxes = y["inputs"]["geometry"]["boxes"]
    case = mech_case(boxes, "MA3", "quarter", {"max_xy_mm": 0.5, "max_z_um": 250},
                     {"stress_free_C": 125, "temperature": {"uniform_C": 25}, "supports": "symmetry"})

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_mech(m, el)
        cf = bc.curvature_fit(m, r, "bottom:si", 0.5)
        x, yy, w = bc.surface_w(m, r, "bottom:si")
        ic = np.argmin(x**2 + yy**2)
        ie = np.argmin((x - 5e-3) ** 2 + yy**2)
        return {"kappa_clt_1_m": float(-cf["d2w_dx2"]), "kappa_clt_y_1_m": float(-cf["d2w_dy2"]),
                "sag_L10mm_m": float(w[ie] - w[ic])}, meta(m, r)

    ex = E["MA3"]
    return sweep(log, "MA3", fn, [1, 2, 4], ["q2s", "q2"], {"kappa_clt_1_m": ex["kappa_1_m"], "sag_L10mm_m": ex["sag_L10mm_m"]})


def run_ma5b(log):
    """Thin-film locking (5 um Cu on 775 um Si, 10 mm plate, quarter). (1) h-study: refine 1-3 on the base mesh
    (xy 1 mm, 1 cell per layer); (2) locking study: fixed in-plane 0.5 mm, Si 2 cells, film 1 / 2 / 4 cells."""
    y = l4.case_yaml("A/MA5b")
    boxes = y["inputs"]["geometry"]["boxes"]
    ex = E["MA5b"]
    mech = {"stress_free_C": 125, "temperature": {"uniform_C": 25}, "supports": "symmetry"}

    def q_of(m, r):
        cf = bc.curvature_fit(m, r, "bottom:si", 0.5)
        s = sxx(m, r, 0, 0, 777.5, 0)
        return {"kappa_clt_1_m": float(-cf["d2w_dx2"]), "film_sxx_mid_Pa": float(s["stress"][0, 0])}

    out = {}
    case = mech_case(boxes, "MA5b", "quarter", {"max_xy_mm": 1.0, "max_z_um": 775, "min_cells_per_layer": 1}, mech)

    def fn_h(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_mech(m, el)
        return q_of(m, r), meta(m, r)

    out["h_study"] = sweep(log, "MA5b-h", fn_h, [1, 2, 3], ["q1", "q2s", "q2"], {"kappa_clt_1_m": ex["kappa_clt_1_m"]})

    def fn_film(nfilm, el):
        c = mech_case(boxes, "MA5b", "quarter", {"max_xy_mm": 0.5, "max_z_um": 387.5, "min_cells_per_layer": nfilm}, mech)
        m = bc.build_model(c, 1)
        r = bc.solve_mech(m, el)
        return q_of(m, r), meta(m, r, {"film_cells": nfilm})

    out["film_cells_study"] = sweep(log, "MA5b-film", fn_film, [1, 2, 4], ["q1", "q2s", "q2"], {"kappa_clt_1_m": ex["kappa_clt_1_m"]})
    out["note"] = "film_cells_study 'refine' = film cells (1, 2, 4); Richardson there is across film cells, not h"
    return out


def run_ma6(log):
    y = l4.case_yaml("A/MA6")
    boxes = y["inputs"]["geometry"]["boxes"]
    case = mech_case(boxes, "MA6", "quarter", {"max_xy_mm": 2.5, "max_z_um": 775},
                     {"stress_free_C": 25, "temperature": {"from_thermal": True}, "supports": "symmetry"})
    case["thermal"] = {"bcs": [{"selection": "bottom:si", "type": "temperature", "T_C": 25},
                               {"selection": "top:si", "type": "temperature", "T_C": 35},
                               {"selection": "default", "type": "adiabatic"}]}

    def fn(refine, el):
        m = bc.build_model(case, refine)
        th = bc.solve_thermal(m, "q1")
        r = bc.solve_mech(m, el, thermal=th)
        r["thermal"] = th
        cf = bc.curvature_fit(m, r, "bottom:si", 0.5)
        pts = np.array([[1e-3, 2e-3, 0.1e-3], [10e-3, 3e-3, 0.5e-3], [20e-3, 20e-3, 0.7e-3]]).T
        s = bc.stress_at(m, r, pts)
        return {"kappa_clt_1_m": float(-cf["d2w_dx2"]), "max_vm_over_scale": float(s["vm"].max() / (130e9 * 2.6e-6 * 10))}, meta(m, r)

    return sweep(log, "MA6", fn, [1, 2], ["q1", "q2s"], {"kappa_clt_1_m": E["MA6"]["kappa_1_m"]})


CASES = {"MA1": run_ma1, "MA2": run_ma2, "MA3": run_ma3, "MA4a": lambda lg: run_ma4(lg, "a"),
         "MA4b": lambda lg: run_ma4(lg, "b"), "MA5b": run_ma5b, "MA6": run_ma6, "MA8": run_ma8}


def main(names):
    if names == ["all"]:
        names = list(CASES)
    for n in names:
        log = record.Log(n)
        log(f"case {n} start; versions {record.versions()}")
        res = CASES[n](log)
        p = record.write_result(n, {"case": n, "tier": "A", "expected_source": "validation/expected/tier_a_values.json",
                                    "results": res, "max_rss_mb": record.max_rss_mb()})
        log(f"case {n} done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["all"])
