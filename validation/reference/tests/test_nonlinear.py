"""Consistency gates of the total-Lagrangian reference (apref/nonlinear.py), audit A7 M1 (lane L27, 2026-10-21):
the tangent K is the derivative of the residual R (central differences, error O(h^2)), K is symmetric, and R is the
derivative of the strain energy E. Synthetic bilayer (E 100 GPa, nu 0.3, alpha 0 / 10 ppm/K, as the PLATE-NL gate) on
a small q2s mesh at a finite deformation (state after a -30 K load with a random perturbation)."""

import numpy as np
import pytest

from apref.nonlinear import Plate

LAYERS = [
    {"h": 50e-6, "E": 100e9, "nu": 0.3, "alpha": [0.0, 0.0, 0.0]},
    {"h": 50e-6, "E": 100e9, "nu": 0.3, "alpha": [10e-6, 10e-6, 10e-6]},
]
DT = -30.0


@pytest.fixture(scope="module")
def state():
    xs = np.linspace(0.0, 4e-3, 4)
    P = Plate(xs, xs, LAYERS, elem="q2s")
    rng = np.random.default_rng(7)
    # finite rotations of the order of the PLATE-NL plate (sag ~ 1e-4 m over 1e-2 m): u ~ 1e-5 m on a 4 mm patch
    u = 1e-5 * rng.standard_normal(P.N)
    v = rng.standard_normal(P.N)
    return P, u, v / np.linalg.norm(v)


def test_tangent_is_residual_derivative(state):
    P, u, v = state
    _, K = P.assemble(u, DT)
    Kv = K @ v
    errs = []
    for h in (1e-7, 5e-8):
        Rp, _ = P.assemble(u + h * v, DT, with_K=False)
        Rm, _ = P.assemble(u - h * v, DT, with_K=False)
        errs.append(np.linalg.norm((Rp - Rm) / (2 * h) - Kv) / np.linalg.norm(Kv))
    assert errs[0] < 1e-6, errs
    # O(h^2) truncation (or round-off floor): halving h does not grow the error beyond round-off
    assert errs[1] < max(errs[0] / 3.0, 1e-9), errs


def test_tangent_symmetric(state):
    P, u, _ = state
    _, K = P.assemble(u, DT)
    asym = abs(K - K.T).max() / abs(K).max()
    assert asym < 1e-12, asym


def test_residual_is_energy_derivative(state):
    P, u, v = state
    R, _ = P.assemble(u, DT, with_K=False)
    h = 1e-8
    P.assemble(u + h * v, DT, with_K=False)
    Ep = P.energy
    P.assemble(u - h * v, DT, with_K=False)
    Em = P.energy
    dE = (Ep - Em) / (2 * h)
    assert abs(dE - R @ v) / abs(R @ v) < 1e-6, (dE, R @ v)
