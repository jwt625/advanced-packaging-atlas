"""EM post-processing references for the L7 2D EM outputs: Touchstone I/O, renormalisation, cascading, mixed-mode
conversion, passivity / reciprocity (scikit-rf), and closed-form transmission-line impedances written from the
published formulas (own implementations, checked in tests against scikit-rf media where scikit-rf has them).

Closed forms (quasi-static, lossless, zero strip thickness unless stated):
- Microstrip: Hammerstad and Jensen, "Accurate models for microstrip computer-aided design", IEEE MTT-S 1980:
  Z01(u) = eta0 / (2 pi) ln(f(u)/u + sqrt(1 + 4/u^2)), f(u) = 6 + (2 pi - 6) exp(-(30.666/u)^0.7528), u = w/h;
  eps_eff = (er+1)/2 + (er-1)/2 (1 + 10/u)^(-a b),
  a = 1 + ln((u^4 + (u/52)^2)/(u^4 + 0.432))/49 + ln(1 + (u/18.1)^3)/18.7, b = 0.564 ((er-0.9)/(er+3))^0.053;
  Z0 = Z01 / sqrt(eps_eff).
- Coplanar waveguide on a substrate of thickness h, no backside metal (conformal mapping; Wen 1969 for h -> inf,
  finite-h form as in Simons, "Coplanar Waveguide Circuits, Components and Systems", 2001):
  k0 = w/(w + 2s), k1 = sinh(pi w/(4h)) / sinh(pi (w + 2s)/(4h)),
  eps_eff = 1 + (er - 1)/2 * K(k1)/K(k1') * K(k0')/K(k0), Z0 = eta0 / (4 sqrt(eps_eff)) * K(k0')/K(k0).
- Centred stripline, zero thickness (Cohn 1954): Z0 = eta0 / (4 sqrt(er)) * K(k)/K(k'), k = sech(pi w/(2 b)).
  (Textbooks write 30 pi for eta0 / 4, which is 6.9e-4 relative high with the exact eta0.)
- Coax: Z0 = eta0 / (2 pi sqrt(er)) ln(b/a). Rectangular waveguide TE10: fc = c / (2 a sqrt(er)).
K(k) is the complete elliptic integral of the first kind with modulus k, by the arithmetic-geometric mean.
"""

from __future__ import annotations

import math

import numpy as np
import skrf
from scipy.constants import c as C0
from scipy.constants import epsilon_0, mu_0

ETA0 = math.sqrt(mu_0 / epsilon_0)


def ellipk_agm(k: float) -> float:
    """K(k) = pi / (2 AGM(1, k')), modulus k."""
    a, b = 1.0, math.sqrt(1.0 - k * k)
    for _ in range(60):
        a, b = (a + b) / 2, math.sqrt(a * b)
        if abs(a - b) < 1e-16 * a:
            break
    return math.pi / (2 * a)


def k_ratio(k: float) -> float:
    """K(k') / K(k)."""
    return ellipk_agm(math.sqrt(1 - k * k)) / ellipk_agm(k)


def microstrip_hj(w: float, h: float, er: float) -> dict:
    u = w / h
    fu = 6 + (2 * math.pi - 6) * math.exp(-((30.666 / u) ** 0.7528))
    z01 = ETA0 / (2 * math.pi) * math.log(fu / u + math.sqrt(1 + 4 / u**2))
    a = 1 + math.log((u**4 + (u / 52) ** 2) / (u**4 + 0.432)) / 49 + math.log(1 + (u / 18.1) ** 3) / 18.7
    b = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053
    ee = (er + 1) / 2 + (er - 1) / 2 * (1 + 10 / u) ** (-a * b)
    return {"z0_ohm": z01 / math.sqrt(ee), "eps_eff": ee, "z0_air_ohm": z01}


def cpw_conformal(w: float, s: float, h: float, er: float) -> dict:
    k0 = w / (w + 2 * s)
    k1 = math.sinh(math.pi * w / (4 * h)) / math.sinh(math.pi * (w + 2 * s) / (4 * h))
    ee = 1 + (er - 1) / 2 * (1 / k_ratio(k1)) * k_ratio(k0)
    return {"z0_ohm": ETA0 / 4 / math.sqrt(ee) * k_ratio(k0), "eps_eff": ee}


def stripline_cohn(w: float, b: float, er: float) -> float:
    k = 1 / math.cosh(math.pi * w / (2 * b))
    return ETA0 / 4 / math.sqrt(er) / k_ratio(k)


def coax_z0(a: float, b: float, er: float) -> float:
    return ETA0 / (2 * math.pi * math.sqrt(er)) * math.log(b / a)


def te10_cutoff(a: float, er: float = 1.0) -> float:
    return C0 / (2 * a * math.sqrt(er))


# ------------------------------------------------------------------ network utilities


def read(path: str) -> skrf.Network:
    return skrf.Network(path)


def write(nw: skrf.Network, path_stem: str) -> None:
    nw.write_touchstone(path_stem)


def renormalize(nw: skrf.Network, z_new) -> skrf.Network:
    out = nw.copy()
    out.renormalize(z_new)
    return out


def cascade(*nws: skrf.Network) -> skrf.Network:
    out = nws[0]
    for n in nws[1:]:
        out = out**n
    return out


def mixed_mode(nw: skrf.Network, p: int = 2) -> skrf.Network:
    """Single-ended 2p-port -> generalized mixed-mode (skrf convention: port pairs (1,2)->... see skrf se2gmm)."""
    out = nw.copy()
    out.se2gmm(p=p)
    return out


def passivity_margin(nw: skrf.Network) -> float:
    """max over f of the largest singular value of S minus 1 (<= 0 for a passive network)."""
    sv = np.linalg.svd(nw.s, compute_uv=False)
    return float(sv.max() - 1.0)


def reciprocity_error(nw: skrf.Network) -> float:
    return float(np.abs(nw.s - np.transpose(nw.s, (0, 2, 1))).max())


def line_s(gamma: np.ndarray, zc: np.ndarray, length: float, z_ref: float = 50.0) -> np.ndarray:
    """2-port S of a uniform line (ABCD of gamma, Zc) referenced to real z_ref; shape (nf, 2, 2)."""
    gl = np.asarray(gamma) * length
    zc = np.asarray(zc, dtype=complex) * np.ones_like(gl)
    A = np.cosh(gl)
    B = zc * np.sinh(gl)
    Cc = np.sinh(gl) / zc
    D = A
    den = A + B / z_ref + Cc * z_ref + D
    S = np.empty(gl.shape + (2, 2), dtype=complex)
    S[:, 0, 0] = (A + B / z_ref - Cc * z_ref - D) / den
    S[:, 0, 1] = 2 * (A * D - B * Cc) / den
    S[:, 1, 0] = 2 / den
    S[:, 1, 1] = (-A + B / z_ref - Cc * z_ref + D) / den
    return S


def network(f_hz: np.ndarray, s: np.ndarray, z0=50.0, name: str = "nw") -> skrf.Network:
    return skrf.Network(frequency=skrf.Frequency.from_f(f_hz, unit="Hz"), s=s, z0=z0, name=name)
