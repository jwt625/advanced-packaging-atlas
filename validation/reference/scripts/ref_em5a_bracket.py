"""EM-5a paper geometry (ectc51909.2023.00230, 4 TSVs in series, GSG) bracket with the quasi-TEM cascade
(apref.em5a_cascade): one-at-a-time sensitivities and a Monte Carlo over the unknowns. Ranges (lane L5 reading of
Fig. 2 p.2, scale bar 0.3 mm; text p.2 Sec. II.B) are listed in RANGES with their basis.

Usage: ./run.sh scripts/ref_em5a_bracket.py oat | mc N SEED
"""

import sys
import time

import common  # noqa: F401
import ngsolve as ngs
import numpy as np

from apref import em5a_cascade as cc
from apref import record as rec

ngs.SetNumThreads(1)
NOMINAL = {"P": 100.0, "W": 60.0, "Lh": 96.0, "Lend": 120.0, "t_front": 3.0, "t_back": 1.0, "t_liner": 0.5, "d": 10.0,
           "sigma": 1.0}
RANGES = {  # (low, high, basis)
    "P": (60.0, 150.0, "G-S-G row pitch: Fig. 2 depth axis uncalibrated (estimates 60-145 um); common probe pitches"),
    "W": (40.0, 80.0, "stadium width: Fig. 2, segment length 155 um minus TSV pitch 94-98 um -> ~60 um"),
    "Lh": (85.0, 110.0, "TSV-to-TSV pitch along the chain: Fig. 2 94-98 um, TSV1-TSV4 ~306 um"),
    "Lend": (50.0, 200.0, "pad (probe-tip reference) to first TSV: Fig. 2 stub ~156 um, tip position unknown"),
    "t_front": (1.0, 5.0, "front oxide under the top RDL: BOX 2 um + BEOL (thickness not reported) + passivation"),
    "t_back": (1.0, 2.0, "back-side oxide 1 um (DB a-L13) plus margin"),
    "t_liner": (0.2, 1.0, "TSV liner: not reported (deck sweep 0.2 / 0.5 / 1)"),
    "d": (10.0, 20.0, "TSV diameter 10 um (text) vs ~14-20 um rendered in Fig. 2"),
    "sigma": (0.1, 10.0, "Si conductivity (S/m): not reported (deck sweep 0.1 / 1 / 10), log-uniform"),
}


def evaluate(p):
    secs = cc.paper_chain(p["P"], p["W"], p["Lh"], p["Lend"], p["t_front"], p["t_back"], p["t_liner"], p["d"])
    return cc.dip_fast(secs, p["sigma"])


def main(argv):
    mode = argv[0] if argv else "oat"
    log = rec.Log(f"EM5a-bracket-{mode}")
    rows = []
    t0 = time.perf_counter()
    if mode == "oat":
        r = evaluate(NOMINAL)
        rows.append({"param": "nominal", "value": None, **r})
        log(f"nominal {NOMINAL}: dips {r['dips']} S11max {r['S11_max_dB']:.1f} S21(67) {r['S21_67_dB']:.2f}")
        for k, (lo, hi, _) in RANGES.items():
            vals = (lo, hi) if k != "sigma" else (0.1, 10.0)
            for v in vals:
                p = dict(NOMINAL, **{k: v})
                if p["W"] > p["P"] - 10:
                    continue
                r = evaluate(p)
                rows.append({"param": k, "value": v, **r})
                log(f"{k}={v:g}: dips {r['dips']} S11max {r['S11_max_dB']:.1f} S21(67) {r['S21_67_dB']:.2f}")
    else:
        n, seed = int(argv[1]), int(argv[2])
        rng = np.random.default_rng(seed)
        while len(rows) < n:
            p = {k: (float(np.exp(rng.uniform(np.log(lo), np.log(hi)))) if k == "sigma" else float(rng.uniform(lo, hi)))
                 for k, (lo, hi, _) in RANGES.items()}
            if p["W"] > p["P"] - 10:
                continue
            r = evaluate(p)
            rows.append({"params": p, **r})
            log(f"sample {len(rows)}: dips {r['dips']} S11max {r['S11_max_dB']:.1f}")
    p = rec.write_result(f"EM5a-bracket-{mode}" + (f"-{argv[2]}" if mode == "mc" else ""),
                         {"case": "EM-5a paper geometry bracket (quasi-TEM cascade)", "ranges": RANGES, "nominal": NOMINAL,
                          "rows": rows})
    log(f"done -> {p.name} ({time.perf_counter() - t0:.0f} s)")



if __name__ == "__main__":
    main(sys.argv[1:])
