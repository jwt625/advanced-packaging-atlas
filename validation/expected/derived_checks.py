"""Derived internal-consistency checks of tier C/D thermal targets, computed from data/metrics.csv (read-only).

Run:  uv run --no-project python validation/expected/derived_checks.py

1. CoWoS-R (ectc51687.2025.00085): Rjc = (Tj - Tc) / P for the measured and the calibrated-model rows; TIM1 BLT
   sweep slope dRjc/dBLT and the effective conduction area A_eff = 1 / (k_In * slope), compared with the 1D bounds
   (4 SoC dies vs the full TIM1 / interposer area).
2. InFO_oS (itherm45881.2020.9190542-a): ThetaJC slope vs BLT and A_eff with the gel k; lower bound 1 / (k A_dies).
3. InFO_oS + vapor-chamber model (itherm45881.2020.9190542-b): linear superposition. Fit R_self and R_mutual from the
   single-die cases 11-14 and predict all 14 cases (symmetric dies assumed: R11 = R22, R12 = R21).
"""

from __future__ import annotations

import csv
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]


def load() -> dict:
    with open(ROOT / "data" / "metrics.csv", newline="") as f:
        return {r["metric_id"]: r for r in csv.DictReader(f)}


def v(m: dict, mid: str) -> float:
    return float(m[mid]["value"])


def cowos_r(m: dict) -> None:
    p = "ectc51687.2025.00085"
    P = 1866.0
    for tag, tj, tc, r in (("measured c", "c-m5", "c-m6", "c-m7"), ("model d", "d-m1", "d-m2", "d-m3")):
        calc = (v(m, f"{p}-{tj}") - v(m, f"{p}-{tc}")) / P
        print(f"CoWoS-R {tag}: (Tj - Tc)/P = {calc:.5f} C/W vs row {v(m, f'{p}-{r}')}")
    blt = {25: "d-m4", 50: "d-m6", 100: "d-m8", 200: "d-m10"}
    xs = sorted(blt)
    ys = [v(m, f"{p}-{blt[x]}") for x in xs]
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    slope_um = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    slope = slope_um * 1e6  # C/W per m
    k_in = v(m, f"{p}-d-m32")
    a_eff = 1.0 / (k_in * slope)
    print(f"CoWoS-R BLT sweep: LSQ slope {slope:.3f} C/W/m; A_eff = 1/(k slope) = {a_eff * 1e6:.0f} mm2 "
          f"(bounds: 4 SoC 1331 mm2, TIM1 model area 2685 mm2)")


def info_os(m: dict) -> None:
    p = "itherm45881.2020.9190542-a"
    k = 6.0
    for tag, a, b in (("sim", "m1", "m2"), ("test", "m3", "m4")):
        s = (v(m, f"{p}-{a}") - v(m, f"{p}-{b}")) / 80e-6
        print(f"InFO_oS ThetaJC BLT slope ({tag}): {s:.0f} C/W/m; A_eff {1 / (k * s) * 1e6:.0f} mm2; "
              f"1D lower bound on slope 1/(k A_dies) = {1 / (k * 2 * 21.78 * 16.25e-6):.0f} C/W/m")


def superposition(m: dict) -> None:
    p = "itherm45881.2020.9190542-b"
    cases = {}
    for i in range(1, 15):
        j1, j2, _tc = (f"{p}-m{3 * (i - 1) + 1}", f"{p}-m{3 * (i - 1) + 2}", f"{p}-m{3 * (i - 1) + 3}")
        var = m[j1]["variant"]
        mm = re.search(r"PH1 (\d+) W, PH2 (\d+) W", var)
        cases[i] = (float(mm.group(1)), float(mm.group(2)), v(m, j1), v(m, j2))
    tamb = 55.0
    single = [c for c in cases.values() if c[1] == 0.0]
    r11 = sum((c[2] - tamb) / c[0] for c in single) / len(single)
    r21 = sum((c[3] - tamb) / c[0] for c in single) / len(single)
    print(f"InFO_oS VC superposition: R_self {r11:.4f}, R_mutual {r21:.4f} K/W (from {len(single)} single-die cases)")
    worst = 0.0
    for i, (p1, p2, t1, t2) in cases.items():
        e1 = tamb + r11 * p1 + r21 * p2
        e2 = tamb + r21 * p1 + r11 * p2
        worst = max(worst, abs(e1 - t1), abs(e2 - t2))
        print(f"  case {i:2d}: P = {p1:.0f}/{p2:.0f} W  Tj1 {t1:.1f} pred {e1:.2f}  Tj2 {t2:.1f} pred {e2:.2f}")
    print(f"  worst |error| = {worst:.2f} C")


def main() -> None:
    m = load()
    cowos_r(m)
    info_os(m)
    superposition(m)


if __name__ == "__main__":
    main()
