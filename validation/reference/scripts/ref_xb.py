"""Cross-solver decks XB1, XB2, XB4, XB5 (R6 section 2.3; no published numbers: reference = converged Q2 with
Richardson). XB3 (TSV unit cell) is in ref_tsv.py.

Usage: ./run.sh scripts/ref_xb.py XB1 [XB2 XB4 XB5] | all
Deck choices that R6 leaves open are lane assumptions (template) and are written into each result's `assumptions`.
"""

from __future__ import annotations

import sys

import numpy as np
from common import sweep
from ref_thermal_a import T_at, face_avg, tmeta

from apref import boxcase as bc
from apref import l4, record

E = l4.expected()


def mmeta(m, r):
    return {"dof": r["dof"], "mesh": {k: m.stats[k] for k in ("nx", "ny", "nz", "elements")}, "solve": r["timing"]}


def run_xb1(log):
    """MA3 bimetal (si_iso 0.5 + cu 0.5 mm, L = 10 mm, dT = -100 K) at widths 1, 2, 5, 10 mm."""
    y = l4.case_yaml("A/MA3")
    out = {}
    for wd in (1, 2, 5, 10):
        boxes = [dict(b, d_mm=wd) for b in y["inputs"]["geometry"]["boxes"]]
        case = l4.boxes_to_case(boxes, f"XB1-w{wd}")
        case.update({"geometry": {"symmetry": "quarter"}, "mesh": {"max_xy_mm": 0.5, "max_z_um": 250},
                     "mechanics": {"stress_free_C": 125, "temperature": {"uniform_C": 25}, "supports": "symmetry"}})

        def fn(refine, el, case=case):
            m = bc.build_model(case, refine)
            r = bc.solve_mech(m, el)
            cf = bc.curvature_fit(m, r, "bottom:si", 0.5)
            return {"kappa_x_clt_1_m": float(-cf["d2w_dx2"]), "kappa_y_clt_1_m": float(-cf["d2w_dy2"])}, mmeta(m, r)

        out[f"w{wd}mm"] = sweep(log, f"XB1-w{wd}", fn, [1, 2] if wd >= 5 else [1, 2, 4], ["q2s"], None)
    out["closed_forms"] = {"beam_timoshenko_1_m": E["MA3"]["kappa_1_m"], "plate_Q_abs_1_m": E["MA3"]["abs_kappa_plate_Q_1_m"]}
    return out


def run_xb2(log):
    """MA4b stack (sub 1.0 / uf 0.05 / si 0.775 mm, 150 C -> 25 C), 50 and 120 mm squares, linear elastic."""
    y = l4.case_yaml("A/MA4")
    v = y["variants"]["b"]
    out = {}
    for L in (50, 120):
        boxes = [dict(b, w_mm=L, d_mm=L) for b in v["boxes"]]
        case = l4.boxes_to_case(boxes, f"XB2-{L}")
        case.update({"geometry": {"symmetry": "quarter"}, "mesh": {"max_xy_mm": L / 10, "max_z_um": 1000},
                     "mechanics": {"stress_free_C": 150, "temperature": {"uniform_C": 25}, "supports": "symmetry"}})

        def fn(refine, el, case=case, L=L):
            m = bc.build_model(case, refine)
            r = bc.solve_mech(m, el)
            cf = bc.curvature_fit(m, r, "bottom:sub", 0.5)
            kap = float(-cf["d2w_dx2"])
            wp = bc.warpage(m, r, "top:si")
            x, yy, w = bc.surface_w(m, r, "bottom:sub")
            sel = np.abs(yy) < 1e-12
            xs, ws = x[sel], w[sel]
            o = np.argsort(xs)
            xs, ws = xs[o], ws[o]
            dev = ws - ws[0] + kap * xs**2 / 2  # deviation from the centre parabola
            q = {"kappa_centre_clt_1_m": kap, "coplanarity_top_m": wp["coplanarity_m"],
                 "centre_minus_corner_top_m": wp["center_minus_corner_m"]}
            for d in (0.0, 1.0, 2.0, 5.0):
                q[f"dev_parabola_at_edge_minus_{d:g}mm_m"] = float(np.interp(L / 2e3 - d * 1e-3, xs, dev))
            return q, mmeta(m, r)

        out[f"L{L}mm"] = sweep(log, f"XB2-{L}", fn, [1, 2, 3], ["q2s"], None)
    out["assumptions"] = ["linear elastic, small strain (geometric nonlinearity, R6 MA4c, not modelled)"]
    out["clt_kappa_1_m"] = E["MA4"]["b"]["kappa_1_m"]
    return out


def tier_k(key):
    return {"k_W_mK": l4.tier_a_materials()[key]["k_W_mK"]}


def run_xb4(log):
    """Die-on-lid: si die 25 x 25 x 0.775 mm, 100 W uniform on the die bottom (active face), TIM 50 um (k 5) on the
    die footprint, Cu lid 50 x 50 x 2 mm, lid top h = 5000 W/m2K to 25 C, all other faces adiabatic."""
    case = xb4_case()

    def fn(refine, el):
        m = bc.build_model(case, refine)
        r = bc.solve_thermal(m, el)
        Tmax = float(T_at(r, [0.0, 0.0, 0.0])[0])
        Tavg = face_avg(m, r, "bottom:die")
        return {"T_max_C": Tmax, "R_th_max_K_W": (Tmax - 25) / 100, "R_th_avg_K_W": (Tavg - 25) / 100,
                "T_lid_top_centre_C": float(T_at(r, [0.0, 0.0, 2825e-6])[0]),
                "heat_out_W_full": float(r["heat_out_W"] * m.mirror_factor)}, tmeta(m, r)

    return _xb4_finish(log, fn)


def xb4_case():
    parts = [{"id": "die", "kind": "die", "material": "si_iso", "x_mm": 0, "y_mm": 0, "w_mm": 25, "d_mm": 25, "z_um": 0, "h_um": 775},
             {"id": "tim", "kind": "tim", "material": "tim", "x_mm": 0, "y_mm": 0, "w_mm": 25, "d_mm": 25, "z_um": 775, "h_um": 50},
             {"id": "lid", "kind": "lid", "material": "cu", "x_mm": 0, "y_mm": 0, "w_mm": 50, "d_mm": 50, "z_um": 825, "h_um": 2000}]
    case = {"schema": "ap-ref-box/0", "id": "XB4", "parts": parts,
            "materials": {"si_iso": tier_k("si_iso"), "tim": tier_k("tim"), "cu": tier_k("cu")},
            "geometry": {"symmetry": "quarter"}, "mesh": {"max_xy_mm": 2.5, "max_z_um": 500},
            "thermal": {"bcs": [{"selection": "bottom:die", "type": "flux", "power_W": 100},
                                {"selection": "top:lid", "type": "htc", "h_W_m2K": 5000, "T_inf_C": 25},
                                {"selection": "default", "type": "adiabatic"}]}}
    return case


def _xb4_finish(log, fn):
    res = sweep(log, "XB4", fn, {"q1": [1, 2, 4], "q2": [1, 2, 3]}, ["q1", "q2"], None)
    res["assumptions"] = ["die si_iso 25 x 25 x 0.775 mm with the 100 W as a uniform flux on its bottom face",
                          "TIM 50 um, k 5 W/mK, die footprint only; lid Cu 50 x 50 x 2 mm; h 5000 W/m2K, 25 C on lid top"]
    return res


def run_xb5(log):
    """Two dies on a Si interposer, unequal powers, cold plate (h) on the lid top; superposition / influence matrix."""
    case_for = xb5_case
    probes = XB5_PROBES

    def fn(refine, el):
        q, meta = {}, {}
        rows = {}
        for tag, (Pa, Pb) in {"AB": (100.0, 50.0), "A1": (1.0, 0.0), "B1": (0.0, 1.0)}.items():
            m = bc.build_model(case_for(Pa, Pb), refine)
            r = bc.solve_thermal(m, el)
            ta = float(T_at(r, probes["a"])[0])
            tb = float(T_at(r, probes["b"])[0])
            rows[tag] = (ta, tb, r)
            meta = tmeta(m, r)
        ta, tb, rab = rows["AB"]
        q["Tj_a_C"], q["Tj_b_C"] = ta, tb
        q["Tmax_C"] = rab["Tmax_C"]
        q["psi_aa_K_W"], q["psi_ba_K_W"] = rows["A1"][0] - 25, rows["A1"][1] - 25
        q["psi_ab_K_W"], q["psi_bb_K_W"] = rows["B1"][0] - 25, rows["B1"][1] - 25
        sup = 25 + 100 * q["psi_aa_K_W"] + 50 * q["psi_ab_K_W"]
        q["superposition_err_a_K"] = ta - sup
        return q, meta

    return _xb5_finish(log, fn)


XB5_PROBES = {"a": [-7.5e-3, 0.0, 130e-6], "b": [7.5e-3, 0.0, 130e-6]}


def xb5_case(Pa, Pb):
    parts = [
        {"id": "int", "kind": "interposer", "material": "si_iso", "x_mm": 0, "y_mm": 0, "w_mm": 30, "d_mm": 20, "z_um": 0, "h_um": 100},
        {"id": "bnd_a", "kind": "bond", "material": "bond", "x_mm": -7.5, "y_mm": 0, "w_mm": 10, "d_mm": 10, "z_um": 100, "h_um": 30},
        {"id": "bnd_b", "kind": "bond", "material": "bond", "x_mm": 7.5, "y_mm": 0, "w_mm": 10, "d_mm": 10, "z_um": 100, "h_um": 30},
        {"id": "die_a", "kind": "die", "material": "si_iso", "x_mm": -7.5, "y_mm": 0, "w_mm": 10, "d_mm": 10, "z_um": 130, "h_um": 775},
        {"id": "die_b", "kind": "die", "material": "si_iso", "x_mm": 7.5, "y_mm": 0, "w_mm": 10, "d_mm": 10, "z_um": 130, "h_um": 775},
        {"id": "tim_a", "kind": "tim", "material": "tim", "x_mm": -7.5, "y_mm": 0, "w_mm": 10, "d_mm": 10, "z_um": 905, "h_um": 50},
        {"id": "tim_b", "kind": "tim", "material": "tim", "x_mm": 7.5, "y_mm": 0, "w_mm": 10, "d_mm": 10, "z_um": 905, "h_um": 50},
        {"id": "lid", "kind": "lid", "material": "cu", "x_mm": 0, "y_mm": 0, "w_mm": 30, "d_mm": 20, "z_um": 955, "h_um": 2000},
    ]
    mats = {"si_iso": tier_k("si_iso"), "tim": tier_k("tim"), "cu": tier_k("cu"), "bond": {"k_W_mK": 2.0}}
    return {"schema": "ap-ref-box/0", "id": "XB5", "parts": parts, "materials": mats,
            "geometry": {"symmetry": "half_y"}, "mesh": {"max_xy_mm": 2.5, "max_z_um": 1000},
            "thermal": {"sources": ([{"parts": "die_a", "power_W": Pa}] if Pa else []) + ([{"parts": "die_b", "power_W": Pb}] if Pb else []),
                        "bcs": [{"selection": "top:lid", "type": "htc", "h_W_m2K": 10000, "T_inf_C": 25},
                                {"selection": "default", "type": "adiabatic"}]}}


def _xb5_finish(log, fn):
    res = sweep(log, "XB5", fn, {"q1": [1, 2, 4], "q2": [1, 2, 3]}, ["q1", "q2"], None)
    res["assumptions"] = [
        "interposer Si 30 x 20 x 0.1 mm; dies si_iso 10 x 10 x 0.775 mm at x = -7.5 / +7.5 mm (5 mm gap)",
        "die-to-interposer bond layer 30 um, homogenised k 2 W/mK (template, no source); TIM 50 um k 5; Cu lid 30 x 20 x 2 mm on the dies",
        "powers uniform in the die volumes: A 100 W, B 50 W; cold plate h 10000 W/m2K, 25 C on the lid top; other faces adiabatic",
        "Tj probe = centre of each die's bottom (active) face; psi_ij = (T_i - 25 C) per W in die j"]
    return res


CASES = {"XB1": run_xb1, "XB2": run_xb2, "XB4": run_xb4, "XB5": run_xb5}


def main(names):
    if names == ["all"]:
        names = list(CASES)
    for n in names:
        log = record.Log(n)
        log(f"case {n} start; versions {record.versions()}")
        res = CASES[n](log)
        p = record.write_result(n, {"case": n, "tier": "B", "results": res, "max_rss_mb": record.max_rss_mb()})
        log(f"case {n} done -> {p.name}; peak RSS {record.max_rss_mb():.0f} MB; log {log.path.name}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["all"])
