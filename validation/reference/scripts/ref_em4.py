"""EM-4 reduced G-S-G micro-bump reference (sims/em/em4_microbump_gsg_reference_deck.md) on NGSolve.

Usage: ./run.sh scripts/ref_em4.py [--quick] [--levels name,...]
Mesh levels (order, h_far, h_cond, ext): see LEVELS. Frequencies 1, 10, 25, 50, 75, 100 GHz.
"""

from __future__ import annotations

import argparse
import sys
import time

import common  # noqa: F401  (sys.path setup)
import ngsolve as ngs

from apref import em4
from apref import record as rec

ngs.SetNumThreads(1)
LEVELS = {
    "o2_h5": (2, 20.0, 5.0, 100.0),
    "o3_h5": (3, 20.0, 5.0, 100.0),
    "o2_h3": (2, 15.0, 3.0, 100.0),
    "o3_h6": (3, 20.0, 6.0, 100.0),
    "o3_h4": (3, 20.0, 4.0, 100.0),
}
FREQS = (1e9, 10e9, 25e9, 50e9, 75e9, 100e9)


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--levels", default="o2_h5,o3_h6")
    ap.add_argument("--freqs", default=",".join(str(f / 1e9) for f in FREQS))
    ap.add_argument("--no-evanescent", action="store_true")
    ap.add_argument("--tag", default="")
    ap.add_argument("--mode", default="v")
    ap.add_argument("--fit-gamma", action="store_true")
    a = ap.parse_args(argv)
    log = rec.Log("EM4" + a.tag)
    freqs = [float(v) * 1e9 for v in a.freqs.split(",")]
    lines = {}
    for f in freqs:
        t0 = time.perf_counter()
        lines[f] = em4.line_2d(f, 5, 0.5)
        L = lines[f]
        log(f"line 2D f={f / 1e9:g} GHz Zc={L['Zc_ohm']:.6g} eps_eff={L['eps_eff']:.6g} ({time.perf_counter() - t0:.1f} s)")
    rows = []
    for lv in a.levels.split(","):
        order, h_far, h_cond, ext = LEVELS[lv]
        t0 = time.perf_counter()
        mesh, x0, x1 = em4.build(ext, h_far, h_cond)
        mesh.Curve(max(order, 2))
        log(f"{lv}: mesh {mesh.ne} tets ({time.perf_counter() - t0:.1f} s)")
        for f in freqs:
            t0 = time.perf_counter()
            r = em4.run(f, order, ext=ext, h_far=h_far, h_cond=h_cond, mesh_cache=(mesh, x0, x1),
                        evanescent=not a.no_evanescent, line=lines[f], mode=a.mode, fit_gamma=a.fit_gamma)
            pi = r["pi"]
            row = {"level": lv, "order": order, "h_far_um": h_far, "h_cond_um": h_cond, "ext_um": ext, "ndof": r["ndof"],
                   "f_GHz": f / 1e9, "S11_dB": r["S11_dB"], "S21_dB": r["S21_dB"], "S22_dB": r["S22_dB"],
                   "S11_deg": r["S11_deg"], "S21_deg": r["S21_deg"], "L_pH": pi["L_H"] * 1e12, "R_ohm": pi["R_ohm"],
                   "C1_fF": pi["C1_F"] * 1e15, "C2_fF": pi["C2_F"] * 1e15, "Zc_ohm": [r["Zc_ohm"].real, r["Zc_ohm"].imag],
                   "fit": {k: {kk: (vv if not isinstance(vv, complex) else [vv.real, vv.imag]) for kk, vv in v.items()}
                           for k, v in r["fit"].items()}, "runtime_s": round(time.perf_counter() - t0, 1), "max_rss_mb": rec.max_rss_mb()}
            rows.append(row)
            log(f"{lv} f={f / 1e9:g} ndof={r['ndof']} S11={r['S11_dB']:.3f} dB S21={r['S21_dB']:.5f} dB L={row['L_pH']:.4f} pH "
                f"C1={row['C1_fF']:.4f} C2={row['C2_fF']:.4f} fF R={row['R_ohm']:.4f} fitV/I ip {r['fit']['ip']['res_V']:.1e}/"
                f"{r['fit']['ip']['res_I']:.1e} die {r['fit']['die']['res_V']:.1e}/{r['fit']['die']['res_I']:.1e} "
                f"dgamma ip {r['fit']['ip']['gamma_rel_2d']:.1e} die {r['fit']['die']['gamma_rel_2d']:.1e} "
                f"t={row['runtime_s']} s rss={row['max_rss_mb']:.0f} MB")
    p = rec.write_result("EM4" + a.tag, {"case": "EM-4 reduced", "deck": "sims/em/em4_microbump_gsg_reference_deck.md",
                                         "rows": rows, "solver": "NGSolve " + ngs.__version__})
    log(f"done -> {p.name}")


if __name__ == "__main__":
    main(sys.argv[1:])
