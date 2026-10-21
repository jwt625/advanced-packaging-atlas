"""EM-0 analytic expected values (stdlib only) for validation/cases/A/em_0_analytic.yaml.

Run:  uv run --no-project python validation/expected/em0.py [--json validation/expected/em0_values.json]

Formulas (R3 DevLog/research/2026-10-20-sim-em-regional-method.md section 5.1; textbook forms):
- coax: Z0 = eta0 / (2 pi sqrt(er)) ln(b / a)
- rectangular waveguide TE10: fc = c / (2 a sqrt(er))
- parallel plate (w >> h, no fringing): Z0 = eta0 h / (w sqrt(er))
- CPW on an infinitely thick substrate (quasi-static, conformal map): k = w / (w + 2 s),
  eps_eff = (er + 1) / 2, Z0 = (eta0 / 4) / sqrt(eps_eff) K(k') / K(k)
- centred zero-thickness stripline (Cohn): k = sech(pi w / (2 b)), Z0 = (eta0 / 4) / sqrt(er) K(k) / K(k')
  (eta0 / 4 = 94.18 ohm; the textbook "30 pi" = 94.25 ohm is 6.9e-4 high)
- microstrip, Hammerstad-Jensen (1980) with the thickness correction (as used in Qucs / scikit-rf MLine)
- dielectric-loss attenuation of a TEM line in a homogeneous medium: alpha_d = pi f sqrt(er) tan_d / c (Np/m)
K is the complete elliptic integral of the first kind, computed by the arithmetic-geometric mean.
"""

from __future__ import annotations

import argparse
import json
import math

C0 = 299792458.0
MU0 = 4e-7 * math.pi  # value used for eta0; the 2019 SI value differs by ~1e-10 relative
ETA0 = MU0 * C0
NP_TO_DB = 20.0 / math.log(10.0)


def ellk(k: float) -> float:
    a, b = 1.0, math.sqrt(1.0 - k * k)
    for _ in range(60):
        a, b = (a + b) / 2.0, math.sqrt(a * b)
        if abs(a - b) < 1e-16 * a:
            break
    return math.pi / (2.0 * a)


def coax(a: float, b: float, er: float) -> float:
    return ETA0 / (2 * math.pi * math.sqrt(er)) * math.log(b / a)


def wg_te10(a: float, er: float = 1.0) -> float:
    return C0 / (2 * a * math.sqrt(er))


def parallel_plate(w: float, h: float, er: float) -> float:
    return ETA0 * h / (w * math.sqrt(er))


def cpw(w: float, s: float, er: float) -> dict:
    k = w / (w + 2 * s)
    kp = math.sqrt(1 - k * k)
    ee = (er + 1) / 2
    # eta0 / 4 (= 94.18 ohm) is exact; the common "30 pi" (94.25 ohm) is an approximation 6.9e-4 high (L5 finding 5)
    return {"k": k, "eps_eff": ee, "Z0_ohm": ETA0 / 4 / math.sqrt(ee) * ellk(kp) / ellk(k),
            "Z0_30pi_ohm": 30 * math.pi / math.sqrt(ee) * ellk(kp) / ellk(k)}


def stripline_cohn(w: float, b: float, er: float) -> float:
    k = 1.0 / math.cosh(math.pi * w / (2 * b))
    kp = math.tanh(math.pi * w / (2 * b))
    return ETA0 / 4 / math.sqrt(er) * ellk(k) / ellk(kp)


def _hj_z0(u: float) -> float:
    f = 6 + (2 * math.pi - 6) * math.exp(-((30.666 / u) ** 0.7528))
    return ETA0 / (2 * math.pi) * math.log(f / u + math.sqrt(1 + 4 / (u * u)))


def _hj_ee(u: float, er: float) -> float:
    a = 1 + math.log((u**4 + (u / 52) ** 2) / (u**4 + 0.432)) / 49 + math.log(1 + (u / 18.1) ** 3) / 18.7
    b = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053
    return (er + 1) / 2 + (er - 1) / 2 * (1 + 10 / u) ** (-a * b)


def microstrip_hj(w: float, h: float, t: float, er: float) -> dict:
    u = w / h
    th = t / h
    if th > 0:
        du1 = th / math.pi * math.log(1 + 4 * math.e / (th * (1 / math.tanh(math.sqrt(6.517 * u))) ** 2))
        dur = du1 * (1 + 1 / math.cosh(math.sqrt(er - 1))) / 2
    else:
        du1 = dur = 0.0
    u1, ur = u + du1, u + dur
    ee_r = _hj_ee(ur, er)
    z0 = _hj_z0(ur) / math.sqrt(ee_r)
    ee = ee_r * (_hj_z0(u1) / _hj_z0(ur)) ** 2
    return {"u": u, "Z0_ohm": z0, "eps_eff": ee}


def alpha_d_homog(f: float, er: float, tand: float) -> float:
    return math.pi * f * math.sqrt(er) * tand / C0  # Np/m


def all_values() -> dict:
    out = {
        "coax_a1mm_b2p3mm_er1": {"Z0_ohm": coax(1e-3, 2.3e-3, 1.0)},
        "coax_a0p455_b1p5_er2p1": {"Z0_ohm": coax(0.455e-3, 1.5e-3, 2.1)},
        "wr90_te10": {"a_m": 22.86e-3, "fc_Hz": wg_te10(22.86e-3)},
        "parallel_plate_w100_h1_er4": {"Z0_ohm": parallel_plate(100e-6, 1e-6, 4.0)},
        "cpw_w30_s18_er9p3": cpw(30e-6, 18e-6, 9.3),
        "stripline_w_b_0p5_er4": {"Z0_ohm": stripline_cohn(0.5e-3, 1e-3, 4.0)},
        # EM-1 geometry (ectc51846.2026.00389-b): w 34, ABF h 30, t 4 um; Dk 3.406 at 16.5 GHz, 25 C (-a-m1)
        "microstrip_em1_abf": microstrip_hj(34e-6, 30e-6, 4e-6, 3.406),
        "microstrip_em1_abf_t0": microstrip_hj(34e-6, 30e-6, 0.0, 3.406),
        # homogeneous-medium dielectric loss, ABF Dk 3.412 / Df 0.0036 at 77 GHz 25 C (-a-m13, -a-m14): upper bound on
        # the microstrip dielectric term (filling factor < 1)
        "alpha_d_abf_77GHz_homog": {"dB_per_mm": alpha_d_homog(77e9, 3.412, 0.0036) * NP_TO_DB / 1000},
    }
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json")
    a = ap.parse_args()
    vals = all_values()
    for k, v in vals.items():
        print(k, json.dumps(v))
    if a.json:
        with open(a.json, "w") as f:
            json.dump({"generator": "validation/expected/em0.py", "values": vals}, f, indent=1)
            f.write("\n")


if __name__ == "__main__":
    main()
