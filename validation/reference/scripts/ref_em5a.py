"""EM-5a reduced (L7 browser case sims/em/em5a_tsv_gsg_chain_reduced.yaml) on NGSolve: S at 50 ohm, both Si variants.

Usage: ./run.sh scripts/ref_em5a.py [--levels o2_h4] [--freqs 1,10,...] [--sigma 10,0.1]
"""

import argparse
import sys
import time

import common  # noqa: F401
import ngsolve as ngs

from apref import em5a
from apref import em_ngs as em
from apref import record as rec

ngs.SetNumThreads(1)
DECK = str(rec.REPO / "sims" / "em" / "em5a_tsv_gsg_chain_reduced.yaml")
LEVELS = {"o1_h4": (1, 20.0, 4.0), "o1_h6": (1, 25.0, 6.0), "o2_h8": (2, 30.0, 8.0)}


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--levels", default="o2_h4")
    ap.add_argument("--freqs", default="1,10,20,30,40,45,50,60,67")
    ap.add_argument("--sigma", default="10,0.1")
    ap.add_argument("--tag", default="")
    a = ap.parse_args(argv)
    log = rec.Log("EM5a" + a.tag)
    rows = []
    for lv in a.levels.split(","):
        order, hf, hc = LEVELS[lv]
        mesh, d, _ = em5a.build(DECK, hf, hc)
        for sig in (float(s) for s in a.sigma.split(",")):
            d["materials"]["si"]["sigma_S_m"] = sig
            for f in (float(v) * 1e9 for v in a.freqs.split(",")):
                t0 = time.perf_counter()
                r = em5a.solve_s(mesh, d, f, order)
                S = r["S"]
                row = {"level": lv, "order": order, "sigma_S_m": sig, "f_GHz": f / 1e9, "ndof": r["ndof"],
                       "S11_dB": em.db(S[0, 0]), "S21_dB": em.db(S[1, 0]), "S22_dB": em.db(S[1, 1]), "S12_dB": em.db(S[0, 1]),
                       "S11_zc_dB": em.db(r["S_zc"][0, 0]), "S21_zc_dB": em.db(r["S_zc"][1, 0]),
                       "Zc_ohm": [r["Zc"].real, r["Zc"].imag], "eps_eff": [r["eps_eff"].real, r["eps_eff"].imag],
                       "runtime_s": round(time.perf_counter() - t0, 1), "max_rss_mb": rec.max_rss_mb()}
                rows.append(row)
                log(f"{lv} sigma {sig:g} f {f / 1e9:g}: ndof {r['ndof']} S11 {row['S11_dB']:.2f} S21 {row['S21_dB']:.4f} "
                    f"S22 {row['S22_dB']:.2f} S12 {row['S12_dB']:.4f} dB | Zc-ref S11 {row['S11_zc_dB']:.2f} S21 {row['S21_zc_dB']:.4f} | Zc {r['Zc']:.4g} eps_eff {r['eps_eff']:.4g} "
                    f"t={row['runtime_s']} s rss={row['max_rss_mb']:.0f} MB")
    p = rec.write_result("EM5a" + a.tag, {"case": "EM-5a reduced (L7 geometry)", "deck": "sims/em/em5a_tsv_gsg_chain_reduced.yaml",
                                          "rows": rows, "solver": "NGSolve " + ngs.__version__})
    log(f"done -> {p.name}")


if __name__ == "__main__":
    main(sys.argv[1:])
