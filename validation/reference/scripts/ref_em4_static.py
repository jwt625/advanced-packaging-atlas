"""EM-4 quasi-static block L and C (de-embedded to the pad edges): 3D electrostatics and magnetostatics, half model.

Usage: ./run.sh scripts/ref_em4_static.py
"""

import sys
import time

import common  # noqa: F401
import ngsolve as ngs

from apref import em4
from apref import record as rec

ngs.SetNumThreads(1)
LEVELS = [  # (name, ext, h_far, h_cond, order); each level runs the DUT and the uniform line on the same settings
    ("o3_h5", 100.0, 20.0, 5.0, 3),
    ("o4_h5", 100.0, 20.0, 5.0, 4),
    ("o3_h3", 100.0, 15.0, 3.0, 3),
    ("o4_h3", 100.0, 15.0, 3.0, 4),
    ("o4_h3_ext50", 50.0, 15.0, 3.0, 4),
    ("o4_h2", 100.0, 12.0, 2.0, 4),
    ("o5_h2", 100.0, 12.0, 2.0, 5),
]


def main(names):
    log = rec.Log("EM4-static")
    rows = []
    for name, ext, hf, hc, order in LEVELS:
        if names and name not in names:
            continue
        t0 = time.perf_counter()
        md, x0, x1, _ = em4.build_static(ext, hf, hc)
        rd = em4.static_LC(md, x0, x1, order)
        mt, _, _, _ = em4.build_static(ext, hf, hc, thru=True)
        rt = em4.static_LC(mt, x0, x1, order, posts=False)
        dt = time.perf_counter() - t0
        C27, L27 = rt["Cp_F_m"].real * 27e-6, rt["Lp_H_m"] * 27e-6
        Cb = rd["C_total_re_F"].real - rt["C_total_re_F"].real + C27
        Cbx = rd["C_total_cx_F"] - rt["C_total_cx_F"] + rt["Cp_F_m"] * 27e-6
        Lb = rd["L_total_H"] - rt["L_total_H"] + L27
        row = {"case": name, "ext_um": ext, "h_far_um": hf, "h_cond_um": hc, "order": order, "ndof_C_dut": rd["ndof_C"],
               "ndof_C_line": rt["ndof_C"], "C_block_fF": Cb * 1e15, "C1_eq_C2_fF": Cb * 1e15 / 2,
               "C_block_cx_fF": [Cbx.real * 1e15, Cbx.imag * 1e15], "L_block_pH": Lb * 1e12,
               "line_C_err_rel": rt["C_total_re_F"].real / (rt["Cp_F_m"].real * (x1 - x0) * 1e-6) - 1,
               "line_L_err_rel": rt["L_total_H"] / (rt["Lp_H_m"] * (x1 - x0) * 1e-6) - 1,
               "C_block_2d_deembed_fF": rd["C_block_F"] * 1e15, "L_block_2d_deembed_pH": rd["L_block_H"] * 1e12,
               "post_current_per_post_rel": rd.get("post_current_rel"),
               "L_block_noposts_pH": (rd["L_total_noposts_H"] - rt["L_total_H"] + L27) * 1e12,
               "runtime_s": round(dt, 1), "max_rss_mb": rec.max_rss_mb()}
        rows.append(row)
        log(f"{name}: ndof {rd['ndof_C']} (+line {rt['ndof_C']})  C_block {row['C_block_fF']:.4f} fF (C1 = C2 = "
            f"{row['C1_eq_C2_fF']:.4f})  L_block {row['L_block_pH']:.4f} pH  | line vs 2D: C {row['line_C_err_rel']:+.2e} "
            f"L {row['line_L_err_rel']:+.2e} | 2D-only de-embedding: C {row['C_block_2d_deembed_fF']:.4f} L "
            f"{row['L_block_2d_deembed_pH']:.4f} | posts: current/post {row['post_current_per_post_rel']:+.3f} I, "
            f"L without post currents {row['L_block_noposts_pH']:.3f}  t={dt:.1f} s rss={rec.max_rss_mb():.0f} MB")
    p = rec.write_result("EM4-static", {"case": "EM-4 quasi-static block L, C", "rows": rows})
    log(f"done -> {p.name}")


if __name__ == "__main__":
    main(sys.argv[1:])
