"""Tier-A steady conduction references (R6 section 1.2) and NAFEMS T4, on box geometries.

Usage: ./run.sh scripts/ref_thermal_a.py TA1 [TA2 TA3a TA3b TA4 TA6 T4] | all
Expected values: L4 validation/expected/tier_a_values.json (TA*), R6 section 2.1 (T4: 18.3 C, Altair OS-V 0120 /
FEATool heattransfer4 as cited there).
"""

from __future__ import annotations

import sys

import numpy as np
from common import sweep

from apref import boxcase as bc
from apref import fem, l4, record

E = l4.expected()


def tmeta(m, r):
    return {"dof": r["dof"], "mesh": {k: m.stats[k] for k in ("nx", "ny", "nz", "elements")}, "solve": r["timing"],
            "balance_rel": r["balance_rel"]}


def T_at(r, pts_m):
    V, _, _ = fem.point_matrices(r["basis"], np.asarray(pts_m, dtype=float).reshape(3, -1))
    return V @ r["T"]


def face_avg(m, r, sel, rect_mm=None):
    fs = bc.rect_filter(m, bc.selection(m, sel), rect_mm)
    fb = fem.facet_basis(m.mesh, r["elem"], fs)
    Tq = np.asarray(fb.interpolate(r["T"]))
    return float((Tq * fb.dx).sum() / fb.dx.sum())


def ta1_case(R_contact=None):
    y = l4.case_yaml("A/TA1")
    boxes = [dict(b) for b in y["inputs"]["geometry"]["boxes"]]
    if R_contact:
        # contact resistance as an equivalent 1 um layer (k = t / R''), inserted under the Cu: exact in 1D
        t_um = 1.0
        cu = next(b for b in boxes if b["id"] == "cu")
        boxes.append({"id": "rc", "kind": "contact", "material": "tierA:rc", "x_mm": cu["x_mm"], "y_mm": cu["y_mm"],
                      "w_mm": cu["w_mm"], "d_mm": cu["d_mm"], "z_um": cu["z_um"], "h_um": t_um})
        cu["z_um"] += t_um
    c = {"schema": "ap-ref-box/0", "id": "TA1", "parts": [], "materials": {}}
    for b in boxes:
        key = b["material"].split(":")[-1]
        c["parts"].append(dict(b, material=key))
        c["materials"][key] = {"k_W_mK": (t_um * 1e-6 / R_contact) if key == "rc" else l4.tier_a_materials()[key]["k_W_mK"]}
    c["geometry"] = {"symmetry": "quarter"}
    c["mesh"] = {"max_xy_mm": 2.5, "max_z_um": 250}
    c["thermal"] = {"bcs": [{"selection": "bottom:si", "type": "flux", "power_W": 100},
                            {"selection": "top:cu", "type": "htc", "h_W_m2K": 1e4, "T_inf_C": 25},
                            {"selection": "default", "type": "adiabatic"}]}
    return c


def run_ta1(log, variant="TA1"):
    rc = 1e-5 if variant == "TA2" else None
    case = ta1_case(rc)

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_thermal(m, el)
        return {"T_bottom_C": float(T_at(r, [1e-3, 1e-3, 0.0])[0]), "T_top_C": float(T_at(r, [1e-3, 1e-3, (2825 + (1 if rc else 0)) * 1e-6])[0]),
                "heat_out_W_full": float(r["heat_out_W"] * m.mirror_factor)}, tmeta(m, r)

    ex = E[variant]
    return sweep(log, variant, fn, [1], ["q1", "q2"], {"T_bottom_C": ex["T_bottom_C"], "T_top_C": ex["T_top_C"], "heat_out_W_full": ex["heat_out_W"]})


def ta3_case(variant):
    y = l4.case_yaml("A/TA3")
    v = y["variants"][variant]
    box = v["boxes"][0]
    key = box["material"].split(":")[-1]
    sp = v["source_patch"]
    hw = sp["w_mm"] / 2
    return v, sp, hw, {"schema": "ap-ref-box/0", "id": f"TA3{variant}", "parts": [dict(box, material=key)],
            "materials": {key: {"k_W_mK": l4.tier_a_materials()[key]["k_W_mK"]}},
            "geometry": {"symmetry": "quarter"},
            "mesh": {"max_xy_mm": 2.5 if variant == "a" else 1.25, "max_z_um": box["h_um"] / 2,
                     "extra_lines_mm": {"x": [hw], "y": [hw]}},
            "thermal": {"bcs": [{"selection": "bottom:plate", "rect_mm": [-hw, hw, -hw, hw], "type": "flux",
                                 "q_W_m2": sp["total_W"] / (sp["w_mm"] * sp["d_mm"] * 1e-6)},
                                v["bcs"][0], {"selection": "default", "type": "adiabatic"}]}}


def run_ta3(log, variant):
    v, sp, hw, case = ta3_case(variant)
    Q = sp["total_W"]
    Tinf = v["bcs"][0]["T_inf_C"]

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_thermal(m, el)
        Tmax = float(T_at(r, [0.0, 0.0, 0.0])[0])
        Tavg_src = face_avg(m, r, "bottom:plate", [-hw, hw, -hw, hw])
        return {"R_total_max_K_W": (Tmax - Tinf) / Q, "R_total_avg_K_W": (Tavg_src - Tinf) / Q,
                "heat_out_W_full": float(r["heat_out_W"] * m.mirror_factor)}, tmeta(m, r)

    ex = E["TA3"][variant]
    return sweep(log, f"TA3{variant}", fn, {"q1": [1, 2, 4], "q2": [1, 2, 3]}, ["q1", "q2"],
                 {"R_total_max_K_W": ex["R_total_max_K_W"], "R_total_avg_K_W": ex["R_total_avg_K_W"], "heat_out_W_full": Q})


def ta4_case():
    y = l4.case_yaml("A/TA4")
    box = y["inputs"]["geometry"]["boxes"][0]
    return {"schema": "ap-ref-box/0", "id": "TA4", "parts": [dict(box, material="al")],
            "materials": {"al": {"k_W_mK": l4.tier_a_materials()["al"]["k_W_mK"]}},
            "geometry": {"symmetry": "quarter"}, "mesh": {"max_xy_mm": 0.5, "max_z_um": 1000},
            "thermal": {"bcs": [{"selection": "bottom:fin", "type": "temperature", "T_C": 75},
                                {"selection": "default", "type": "htc", "h_W_m2K": 50, "T_inf_C": 25}]}}


def run_ta4(log):
    case = ta4_case()

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_thermal(m, el)
        q = float(r["heat_out_robin_W"] * m.mirror_factor)
        return {"q_per_theta_W_K": q / 50.0, "q_base_reaction_W_K": float(-r["heat_out_dirichlet_W"] * m.mirror_factor / 50.0),
                "T_tip_center_C": float(T_at(r, [0.0, 0.0, 0.02])[0])}, tmeta(m, r)

    return sweep(log, "TA4", fn, [1, 2, 4], ["q1", "q2"], {"q_per_theta_W_K": E["TA4"]["q_per_theta_W_K"]})


TA6_EXPR = "25 + 1.0e4*(x+0.5e-3) + 2.0e4*(y+0.5e-3) + 3.0e4*z"


def ta6_case(frame):
    mat = {"k_W_mK": [10, 50, 148]}
    if frame:
        mat["frame"] = frame
    return {"schema": "ap-ref-box/0", "id": "TA6", "geometry": {"symmetry": "none"},
                "parts": [{"id": "cube", "kind": "die", "material": "aniso", "x_mm": 0, "y_mm": 0, "w_mm": 1, "d_mm": 1,
                           "z_um": 0, "h_um": 1000}], "materials": {"aniso": mat},
                "mesh": {"max_xy_mm": 0.25, "max_z_um": 200,
                         "extra_lines_mm": {"x": [-0.43, -0.1, 0.33], "y": [-0.21, 0.05, 0.41], "z_um": [70, 610]}},
            "thermal": {"bcs": [{"selection": "default", "type": "temperature", "T_expr": TA6_EXPR}]}}


def run_ta6(log):
    out = {}
    for name, frame in (("aniso", None), ("aniso_rot30z", {"rot_z_deg": 30})):
        case = ta6_case(frame)

        def fn(refine, el, case=case):
            m = bc.build_model(case, refine)
            r = bc.solve_thermal(m, el)
            P = r["basis"].doflocs
            ex = 25 + 1e4 * (P[0] + 0.5e-3) + 2e4 * (P[1] + 0.5e-3) + 3e4 * P[2]
            return {"T_centre_C": float(T_at(r, [0.0, 0.0, 0.5e-3])[0]), "max_abs_err_K": float(np.abs(r["T"] - ex).max())}, tmeta(m, r)

        out[name] = sweep(log, f"TA6-{name}", fn, [1], ["q1", "q2"], {"T_centre_C": E["TA6"]["T_at"]["centre"]})
    return out


def run_t4(log):
    case = {"schema": "ap-ref-box/0", "id": "NAFEMS-T4", "geometry": {"symmetry": "none"},
            "parts": [{"id": "plate", "kind": "plate", "material": "m", "x_mm": 300, "y_mm": 500, "w_mm": 600,
                       "d_mm": 1000, "z_um": 0, "h_um": 10000}],
            "materials": {"m": {"k_W_mK": 52.0}},
            "mesh": {"max_xy_mm": 50, "max_z_um": 10000, "extra_lines_mm": {"y": [200]}, "refine_z": False},
            "thermal": {"bcs": [{"selection": "face:y-", "type": "temperature", "T_C": 100},
                                {"selection": "face:x+", "type": "htc", "h_W_m2K": 750, "T_inf_C": 0},
                                {"selection": "face:y+", "type": "htc", "h_W_m2K": 750, "T_inf_C": 0},
                                {"selection": "default", "type": "adiabatic"}]}}

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_thermal(m, el)
        return {"T_E_C": float(T_at(r, [0.6, 0.2, 0.005])[0])}, tmeta(m, r)

    return sweep(log, "T4", fn, [1, 2, 4, 8], ["q1", "q2"], {"T_E_C": 18.3})


CASES = {"TA1": run_ta1, "TA2": lambda lg: run_ta1(lg, "TA2"), "TA3a": lambda lg: run_ta3(lg, "a"),
         "TA3b": lambda lg: run_ta3(lg, "b"), "TA4": run_ta4, "TA6": run_ta6, "T4": run_t4}


def main(names):
    if names == ["all"]:
        names = list(CASES)
    for n in names:
        log = record.Log(n)
        log(f"case {n} start; versions {record.versions()}")
        res = CASES[n](log)
        tier = "B" if n == "T4" else "A"
        src = "R6 section 2.1 (NAFEMS T4 target 18.3 C)" if n == "T4" else "validation/expected/tier_a_values.json"
        p = record.write_result(n, {"case": n, "tier": tier, "expected_source": src, "results": res,
                                    "max_rss_mb": record.max_rss_mb()})
        log(f"case {n} done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["all"])
