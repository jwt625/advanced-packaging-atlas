"""Implied linear stress-free temperature of every two-temperature warpage case (diagnostic, read-only).

Run:  uv run --no-project --with pyyaml python validation/expected/implied_tsf.py [--json validation/expected/implied_tsf.json]

For a linear thermo-elastic model with temperature-independent properties, warpage is proportional to (T - Tsf), so a
pair of reported values gives
    r = w(T_HT) / w(T_RT) = (T_HT - Tsf) / (T_RT - Tsf)   ->   Tsf = (T_HT - r T_RT) / (1 - r).
For a series of three or more temperatures the least-squares line w = k (T - Tsf) gives Tsf as its zero crossing, and
the measured zero crossing is interpolated between the two points that change sign. The sign convention cancels in r.

The implied Tsf is compared with the stress-free input of the sim case (sims/<case>.yaml, mechanics.stress_free_C
default). It is a diagnostic, not a gate: a paper's own FEM with non-linear materials also departs from it (see the
paper-simulated rows of ectc51687.2025.00178, which state 180 C / 150 C), so the difference measures how far a linear,
single-Tsf model can reproduce the pair. Proposed by lane L9 (DevLog/lanes/L9-warpage-investigation.md).
"""

from __future__ import annotations

import argparse
import csv
import itertools
import json
import pathlib

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]

# (label, sim case, [(metric_id, T_C), ...], note). T from the DB condition / parameter of each row.
PAIRS = [
    ("cowos_l lid TV_1.6x (measured)", "cowos_l/warpage_rt_ht",
     [("ectc51909.2023.00091-a-m1", 25), ("ectc51909.2023.00091-a-m2", 240)], "view side not stated; RT shape saddle-like"),
    ("cowos_l ring TV_4.8x (measured)", "cowos_l/warpage_rt_ht",
     [("ectc51909.2023.00091-b-m1", 25), ("ectc51909.2023.00091-b-m2", 240)], "ring variant; case input taken from the lid case"),
    ("120 mm SUS430 stiffener (measured)", "si_interposer_peers/120mm_warpage",
     [("ectc51529.2024.00155-a-m16", 30), ("ectc51529.2024.00155-a-m17", 148), ("ectc51529.2024.00155-a-m18", 222),
      ("ectc51529.2024.00155-a-m19", 243)], "stiffener parts use 130 C in the case"),
    ("120 mm Cu stiffener (measured)", "si_interposer_peers/120mm_warpage",
     [("ectc51529.2024.00155-e-m1", 30), ("ectc51529.2024.00155-e-m2", 148), ("ectc51529.2024.00155-e-m3", 222),
      ("ectc51529.2024.00155-e-m4", 243)], "Cu-stiffener variant of the same package"),
    ("FCBGA bare substrate (paper FEM, stated 180 C)", "fcbga_organic/substrate_warpage_bare",
     [("ectc51687.2025.00178-c-m1", 25), ("ectc51687.2025.00178-c-m2", 265)], "paper FEM; tests the diagnostic itself"),
    ("FCBGA bare substrate (measured DIC)", "fcbga_organic/substrate_warpage_bare",
     [("ectc51687.2025.00178-b-m4", 30), ("ectc51687.2025.00178-b-m5", 260)], ""),
    ("FCBGA after 2-chip assembly (paper FEM, stated 150 C)", "fcbga_organic/substrate_warpage",
     [("ectc51687.2025.00178-c-m3", 25), ("ectc51687.2025.00178-c-m4", 265)], "paper FEM"),
    ("glass core bare substrate (paper FEM, stated 180 C)", "glass_core_substrate/warpage_vs_organic",
     [("ectc51687.2025.00178-d-m1", 25), ("ectc51687.2025.00178-d-m2", 265)], "case s3 uses 180 C"),
    ("glass core after 2-chip assembly (paper FEM, stated 150 C)", "glass_core_substrate/warpage_vs_organic",
     [("ectc51687.2025.00178-d-m3", 25), ("ectc51687.2025.00178-d-m4", 265)], "paper FEM"),
    ("CoWoS-S package (basis unspecified)", "cowos_s/warpage_corner_stress",
     [("ectc51909.2023.00135-a-m1", 25), ("ectc51909.2023.00135-a-m2", 250)], ""),
]
CASE_OVERRIDE_TSF = {"glass core bare substrate (paper FEM, stated 180 C)": 180.0}  # study s3 overrides the case default


def case_tsf(case: str) -> float | None:
    path = ROOT / "sims" / f"{case}.yaml"
    if not path.exists():
        return None
    doc = yaml.safe_load(path.read_text())
    sf = (((doc.get("physics") or {}).get("mechanics") or {}).get("stress_free_C") or {}).get("default")
    if isinstance(sf, dict):
        sf = sf.get("value")
    return float(sf) if sf is not None else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json")
    args = ap.parse_args()
    with open(ROOT / "data" / "metrics.csv", newline="") as f:
        m = {r["metric_id"]: r for r in csv.DictReader(f)}
    out = []
    for label, case, rows, note in PAIRS:
        pts = [(t, float(m[i]["value"]) * (1000.0 if m[i]["unit"] == "mm" else 1.0)) for i, t in rows]
        rec = {"label": label, "sim_case": case, "metric_ids": [i for i, _ in rows], "points_T_C_w_um": pts, "note": note}
        if len(pts) == 2:
            (t1, w1), (t2, w2) = pts
            r = w2 / w1
            rec["ratio_HT_over_RT"] = r
            rec["implied_tsf_C"] = (t2 - r * t1) / (1 - r) if r != 1 else None
        else:
            n = len(pts)
            mt = sum(t for t, _ in pts) / n
            mw = sum(w for _, w in pts) / n
            k = sum((t - mt) * (w - mw) for t, w in pts) / sum((t - mt) ** 2 for t, _ in pts)
            rec["lsq_slope_um_per_C"] = k
            rec["implied_tsf_C"] = mt - mw / k
            zc = [t1 + (t2 - t1) * w1 / (w1 - w2) for (t1, w1), (t2, w2) in itertools.pairwise(pts) if w1 * w2 < 0]
            rec["measured_zero_crossings_C"] = zc
        tsf_in = CASE_OVERRIDE_TSF.get(label, case_tsf(case))
        rec["case_stress_free_C"] = tsf_in
        if rec.get("implied_tsf_C") is not None and tsf_in is not None:
            rec["delta_C"] = rec["implied_tsf_C"] - tsf_in
        out.append(rec)
        zc = rec.get("measured_zero_crossings_C")
        print(f"{label:58s} implied Tsf {rec['implied_tsf_C']:7.1f} C   case input {tsf_in}   "
              + (f"ratio {rec['ratio_HT_over_RT']:+.3f}" if "ratio_HT_over_RT" in rec else f"zero crossings {[round(z, 1) for z in zc]}"))
    if args.json:
        with open(args.json, "w") as f:
            json.dump({"generator": "validation/expected/implied_tsf.py", "rows": out}, f, indent=1)
            f.write("\n")


if __name__ == "__main__":
    main()
