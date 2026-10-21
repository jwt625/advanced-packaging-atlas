"""Frequency-domain 3D E-field reference on NGSolve (H(curl), any order), lengths in um.

Weak form (phasor exp(+j w t)): int curl E . curl v - k0^2 eps_r E . v dV + int_ports j beta (n x E).(n x v) dA
                                 = int_port_k 2 j beta (n x E_inc).(n x v) dA,
from n x curl E = j beta E_t - 2 j beta E_inc,t on a port (first-order modal absorbing condition: exact for the single
propagating mode of a homogeneous guide, approximate otherwise). PEC: Dirichlet on named faces (tangential E = 0).
Two ways to get S:
- modal projection on the port faces (homogeneous guides with an analytic mode: TE10, coax TEM);
- terminal extraction for TEM-like lines: V(x) (line integral of E between ground and signal) and I(x) (loop
  integral of H = j curl E / (w mu0) around the signal) sampled along a uniform lead-in, fitted with
  V = a e^{-g x} + b e^{g x}, I = (a e^{-g x} - b e^{g x}) / Zc (g, Zc fitted), extrapolated to the reference plane;
  two excitations give Y = I V^-1 of the block between the reference planes. Port reflections and the crude
  excitation shape are calibrated out (only the uniform-line sections enter the fit).
"""

from __future__ import annotations

import math

import ngsolve as ngs
import numpy as np
from scipy.constants import c as C0
from scipy.constants import mu_0 as MU0
from scipy.optimize import least_squares

UM = 1e-6


def k0_um(f_hz: float) -> float:
    return 2 * math.pi * f_hz / C0 * UM


def solve(mesh, order, f_hz, eps_cf, ports, excite, beta_um, einc_cf, pec="pec", inverse="sparsecholesky"):
    """ports: boundary names with the absorbing term; excite: name of the driven port; beta_um: dict name -> beta
    (1/um) used in the port term; einc_cf: incident tangential field on the driven port (vector CF)."""
    fes = ngs.HCurl(mesh, order=order, complex=True, dirichlet=pec)
    u, v = fes.TnT()
    n = ngs.specialcf.normal(3)
    k0 = k0_um(f_hz)
    a = ngs.BilinearForm(fes, symmetric=True)
    a += (ngs.curl(u) * ngs.curl(v) - k0**2 * eps_cf * u * v) * ngs.dx
    for p in ports:
        a += 1j * beta_um[p] * ngs.Cross(n, u.Trace()) * ngs.Cross(n, v.Trace()) * ngs.ds(p)
    fl = ngs.LinearForm(fes)
    fl += 2j * beta_um[excite] * ngs.Cross(n, einc_cf) * ngs.Cross(n, v.Trace()) * ngs.ds(excite)
    with ngs.TaskManager():
        a.Assemble()
        fl.Assemble()
        gfu = ngs.GridFunction(fes)
        inv = a.mat.Inverse(fes.FreeDofs(), inverse=inverse)
        gfu.vec.data = inv * fl.vec
    return gfu, fes.ndof


def bnd_int(mesh, cf, name, order=8):
    return ngs.Integrate(cf, mesh, ngs.BND, order=order, definedon=mesh.Boundaries(name))


# ------------------------------------------------------------------ terminal extraction


def gauss(a, b, n):
    x, w = np.polynomial.legendre.leggauss(n)
    return 0.5 * (b - a) * x + 0.5 * (b + a), 0.5 * (b - a) * w


def sample(mesh, cf, pts):
    mp = mesh(pts[0], pts[1], pts[2])
    v = np.asarray(cf(mp))
    return v


def voltage(mesh, E, x, y, z0, z1, n=24):
    """V = -int_{z0}^{z1} E_z dz at (x, y) (potential at z1 relative to z0), volts (E in V/um, z in um)."""
    zz, ww = gauss(z0, z1, n)
    pts = np.array([np.full(n, x), np.full(n, y), zz])
    Ez = sample(mesh, E, pts)[:, 2]
    return -np.sum(Ez * ww)


def current(mesh, gfu, f_hz, x, ylo, yhi, zlo, zhi, n=24):
    """I = loop integral of H around the rectangle [ylo, yhi] x [zlo, zhi] at x, counterclockwise seen from +x
    (current in +x positive), amperes. H = j curl E / (w mu0) with curl E in V/um^2 -> SI factor 1e12."""
    w = 2 * math.pi * f_hz
    cE = ngs.curl(gfu)
    tot = 0j
    # counterclockwise in the (y, z) plane seen from +x: (y up to the right, z up)
    segs = [((ylo, zlo), (yhi, zlo)), ((yhi, zlo), (yhi, zhi)), ((yhi, zhi), (ylo, zhi)), ((ylo, zhi), (ylo, zlo))]
    for (y0, z0), (y1, z1) in segs:
        t, wt = gauss(0.0, 1.0, n)
        ys, zs = y0 + (y1 - y0) * t, z0 + (z1 - z0) * t
        pts = np.array([np.full(n, x), ys, zs])
        H = 1j * sample(mesh, cE, pts) * 1e12 / (w * MU0)  # A/m
        dl = np.array([0.0, y1 - y0, z1 - z0]) * UM  # m per unit t
        tot += np.sum((H @ dl) * wt)
    return tot


def fit_line(xs, Vs, Is, g0, z0):
    """Joint fit over excitations k: V_k(x) = a_k e^{-g x} + b_k e^{g x}, I_k(x) = (a_k e^{-g x} - b_k e^{g x}) / Zc.
    xs (um), Vs/Is: arrays (K, nx). Returns g (1/um), Zc, a (K), b (K), rms residual (relative)."""
    xs = np.asarray(xs)
    K = Vs.shape[0]

    def lin(g, Zc):
        ep, em = np.exp(-g * xs), np.exp(g * xs)
        A = np.vstack([np.column_stack([ep, em]), np.column_stack([ep / Zc, -em / Zc])])
        ab = []
        res = []
        for k in range(K):
            rhs = np.concatenate([Vs[k], Is[k]])
            # scale the current rows to voltage units
            W = np.concatenate([np.ones(xs.size), np.full(xs.size, abs(z0))])  # fixed weight (a fitted |Zc| weight lets Zc -> 0)
            sol, *_ = np.linalg.lstsq(A * W[:, None], rhs * W, rcond=None)
            ab.append(sol)
            res.append((A @ sol - rhs) * W)
        return np.array(ab), np.concatenate(res)

    def fun(p):
        g = p[0] + 1j * p[1]
        Zc = p[2] + 1j * p[3]
        _, r = lin(g, Zc)
        return np.concatenate([r.real, r.imag])

    p0 = np.array([g0.real, g0.imag, z0.real, z0.imag])
    sol = least_squares(fun, p0, xtol=1e-14, ftol=1e-14, gtol=1e-14, x_scale=np.abs(p0) + 1e-12)
    g = sol.x[0] + 1j * sol.x[1]
    Zc = sol.x[2] + 1j * sol.x[3]
    ab, r = lin(g, Zc)
    scale = np.sqrt(np.mean(np.abs(Vs) ** 2))
    return g, Zc, ab[:, 0], ab[:, 1], float(np.sqrt(np.mean(np.abs(r) ** 2)) / scale)


def wave_at(g, Zc, a, b, x):
    V = a * np.exp(-g * x) + b * np.exp(g * x)
    Icur = (a * np.exp(-g * x) - b * np.exp(g * x)) / Zc
    return V, Icur


def y_to_s(Y, z0=50.0):
    E = np.eye(Y.shape[0])
    return (E - z0 * Y) @ np.linalg.inv(E + z0 * Y)


def pi_model(Y, f_hz):
    w = 2 * math.pi * f_hz
    zs = -1 / Y[0, 1]
    return {"L_H": float(np.imag(zs) / w), "R_ohm": float(np.real(zs)), "C1_F": float(np.imag(Y[0, 0] + Y[0, 1]) / w),
            "C2_F": float(np.imag(Y[1, 1] + Y[0, 1]) / w)}


def db(x):
    return float(20 * np.log10(abs(x)))
