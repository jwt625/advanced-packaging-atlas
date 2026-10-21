"""Quasi-TEM cascade model of a GSG TSV chain (EM-5a paper geometry bracket): sections are uniform G-S-G lines
(front-side strips, 3-wire TSV sections in Si with an oxide liner, back-side strips), each from 2D electrostatics
(NGSolve, complex eps incl. Si conductivity -> C*(w); vacuum C0 -> L = mu0 eps0 / C0) plus a skin-effect series R;
cascaded with ABCD matrices; S at 50 ohm. Junction (bend, pad, TSV landing) parasitics are not modelled: the model is
validated against the 3D reduced case (apref.em5a) to bound that error.

Lengths in um. Section dicts: {"kind": "strip", "side": "front" | "back", "P", "W", "t_ox", "len"} or
{"kind": "tsv", "P", "d", "t_liner", "len"}. Materials: Si eps 11.9, sigma variable; SiO2 3.9; Al 3.5e7 S/m strips,
Cu 5.8e7 S/m TSV (template values, deck sims/em/em5a_tsv_gsg_reference_deck.md).
"""

from __future__ import annotations

import math
from functools import lru_cache

import ngsolve as ngs
import numpy as np
from netgen.occ import Circle, Glue, OCCGeometry, Rectangle
from scipy.constants import epsilon_0 as E0
from scipy.constants import mu_0 as MU0

SIGMA_AL, SIGMA_CU = 3.5e7, 5.8e7
TOL = 1e-6


def _rect(y0, y1, z0, z1):
    return Rectangle(y1 - y0, z1 - z0).Face().Move((y0, z0, 0))


def _solve_C(mesh, eps_map, order=3):
    fes = ngs.H1(mesh, order=order, complex=True, dirichlet="sig|gnd")
    u, v = fes.TnT()
    e = mesh.MaterialCF(eps_map, default=1.0)
    a = ngs.BilinearForm(e * ngs.grad(u) * ngs.grad(v) * ngs.dx).Assemble()
    g = ngs.GridFunction(fes)
    g.Set(1, definedon=mesh.Boundaries("sig"))
    r = (-a.mat * g.vec).Evaluate()
    g.vec.data += a.mat.Inverse(fes.FreeDofs(), inverse="umfpack") * r
    return complex(ngs.Integrate(e * ngs.grad(g) * ngs.grad(g), mesh)) * E0


def _name_edges(dom, is_sig, is_gnd):
    for e in dom.edges:
        (ay, az, _), (by, bz, _) = e.bounding_box
        e.name = "sig" if is_sig(ay, by, az, bz) else ("gnd" if is_gnd(ay, by, az, bz) else "x")


@lru_cache(maxsize=256)
def strip_mesh(side, P, W, t_ox, h=None):
    """Front: Si [0, 100], oxide [100, 100 + t_ox + 2] with metal (1 um) at [100 + t_ox, 101 + t_ox], air above.
    Back: mirror (metal below the Si on t_ox of oxide, passivation below). Open boundaries (natural) 300 um away."""
    span = P + W / 2 + 250
    zm0 = 100 + t_ox if side == "front" else -t_ox - 1
    zm1 = zm0 + 1
    metal = _rect(-W / 2, W / 2, zm0, zm1) + _rect(P - W / 2, P + W / 2, zm0, zm1) + _rect(-P - W / 2, -P + W / 2, zm0, zm1)
    if side == "front":
        layers = [("si", 0, 100), ("ox", 100, 100 + t_ox + 2), ("air", 100 + t_ox + 2, 100 + t_ox + 300)]
        layers.insert(0, ("air", -300, 0))
    else:
        layers = [("air", -t_ox - 2 - 300, -t_ox - 2), ("ox", -t_ox - 2, 0), ("si", 0, 100), ("air", 100, 400)]
    faces = []
    for m, z0, z1 in layers:
        f = _rect(-span, span, z0, z1) - metal
        f.faces.name = m
        faces.append(f)
    dom = Glue(faces)

    def in_box(ay, by, az, bz, yc):
        return yc - W / 2 - TOL <= ay and by <= yc + W / 2 + TOL and zm0 - TOL <= az and bz <= zm1 + TOL

    _name_edges(dom, lambda ay, by, az, bz: in_box(ay, by, az, bz, 0.0),
                lambda ay, by, az, bz: in_box(ay, by, az, bz, P) or in_box(ay, by, az, bz, -P))
    for e in dom.edges:
        if e.name in ("sig", "gnd"):
            e.maxh = min(W / 6, 2.0)
    return ngs.Mesh(OCCGeometry(dom, dim=2).GenerateMesh(maxh=h or 25.0))


@lru_cache(maxsize=256)
def tsv_mesh(P, d, t_liner, h=None):
    """Three Cu cylinders (radius d / 2) at y = -P, 0, P with SiO2 liners in Si; open boundary 300 um away."""
    r = d / 2
    span = P + 300
    cond = Circle((0, 0), r).Face() + Circle((P, 0), r).Face() + Circle((-P, 0), r).Face()
    lin = Circle((0, 0), r + t_liner).Face() + Circle((P, 0), r + t_liner).Face() + Circle((-P, 0), r + t_liner).Face()
    si = _rect(-span, span, -300, 300) - lin
    si.faces.name = "si"
    ln = lin - cond
    ln.faces.name = "ox"
    dom = Glue([si, ln])
    for e in dom.edges:
        (ay, az, _), (by, bz, _) = e.bounding_box
        cy = 0.5 * (ay + by)
        rad = 0.5 * (by - ay)
        if abs(rad - r) < 1e-3 * r or abs(max(by - ay, bz - az) / 2 - r) < 1e-2 * r:
            e.name = "sig" if abs(cy) < P / 2 else "gnd"
        else:
            e.name = "x"
        if e.name in ("sig", "gnd"):
            e.maxh = r / 3
        elif abs(max(by - ay, bz - az) / 2 - (r + t_liner)) < 0.05 * (r + t_liner):
            e.maxh = max(t_liner, 0.3)
    m = ngs.Mesh(OCCGeometry(dom, dim=2).GenerateMesh(maxh=h or 30.0))
    m.Curve(3)
    return m


def line_params(sec, f_hz, sigma_si):
    w = 2 * math.pi * f_hz
    eps = {"air": 1.0, "ox": 3.9, "si": 11.9 - 1j * sigma_si / (w * E0)}
    vac = {"air": 1.0, "ox": 1.0, "si": 1.0}
    if sec["kind"] == "strip":
        mesh = strip_mesh(sec["side"], sec["P"], sec["W"], sec["t_ox"])
        Rs = math.sqrt(math.pi * f_hz * MU0 / SIGMA_AL)
        # signal strip (both faces) + half-share of the two ground strips (crude, current-crowding ignored)
        R = Rs / (2 * sec["W"] * 1e-6) + Rs / (2 * 2 * sec["W"] * 1e-6) / 2
    else:
        mesh = tsv_mesh(sec["P"], sec["d"], sec["t_liner"])
        Rs = math.sqrt(math.pi * f_hz * MU0 / SIGMA_CU)
        per = math.pi * sec["d"] * 1e-6
        R = Rs / per + Rs / per / 2
    key = (id(mesh), "vac")
    C0v = _C0_cache.get(key)
    if C0v is None:
        C0v = _solve_C(mesh, vac).real
        _C0_cache[key] = C0v
    C = _solve_C(mesh, eps)
    L = MU0 * E0 / C0v
    Zs = R + 1j * w * L
    Yp = 1j * w * C  # C complex: G included
    gamma = np.sqrt(Zs * Yp)
    Zc = np.sqrt(Zs / Yp)
    return gamma, Zc, {"C_F_m": C, "C0_F_m": C0v, "L_H_m": L, "R_ohm_m": R}


_C0_cache: dict = {}


def abcd(gamma, Zc, length_m):
    gl = gamma * length_m
    ch, sh = np.cosh(gl), np.sinh(gl)
    return np.array([[ch, Zc * sh], [sh / Zc, ch]])


def chain_s(sections, f_hz, sigma_si, zref=50.0):
    M = np.eye(2, dtype=complex)
    for sec in sections:
        g, Zc, _ = line_params(sec, f_hz, sigma_si)
        M = M @ abcd(g, Zc, sec["len"] * 1e-6)
    A, B, C, D = M[0, 0], M[0, 1], M[1, 0], M[1, 1]
    den = A + B / zref + C * zref + D
    return np.array([[(A + B / zref - C * zref - D) / den, 2 * (A * D - B * C) / den],
                     [2 / den, (-A + B / zref - C * zref + D) / den]])


def paper_chain(P, W, Lh, Lend, t_front, t_back, t_liner, d, n_tsv=4):
    """End top segment (Lend) - [TSV - bottom (Lh) - TSV - top (Lh)] ... with n_tsv TSVs, ending on a top segment
    (Lend). TSV length 100 um (Si) + oxides."""
    top_end = {"kind": "strip", "side": "front", "P": P, "W": W, "t_ox": t_front, "len": Lend}
    tsv = {"kind": "tsv", "P": P, "d": d, "t_liner": t_liner, "len": 100.0 + t_front + t_back}
    bot = {"kind": "strip", "side": "back", "P": P, "W": W, "t_ox": t_back, "len": Lh}
    top = {"kind": "strip", "side": "front", "P": P, "W": W, "t_ox": t_front, "len": Lh}
    secs = [top_end]
    for i in range(n_tsv):
        secs.append(tsv)
        if i < n_tsv - 1:
            secs.append(bot if i % 2 == 0 else top)
    secs.append(top_end)
    return secs


def dip(sections, sigma_si, f_lo=5e9, f_hi=67e9, n=63):
    fs = np.linspace(f_lo, f_hi, n)
    s11 = np.array([abs(chain_s(sections, f, sigma_si)[0, 0]) for f in fs])
    s21_67 = abs(chain_s(sections, f_hi, sigma_si)[1, 0])
    i = int(np.argmin(s11))
    interior = 0 < i < n - 1
    return {"f_dip_GHz": float(fs[i] / 1e9) if interior else None, "S11_dip_dB": float(20 * np.log10(s11[i])),
            "S11_max_dB": float(20 * np.log10(s11.max())), "S21_67_dB": float(20 * np.log10(s21_67)),
            "s11_curve_dB": (20 * np.log10(s11)).tolist(), "f_GHz": (fs / 1e9).tolist()}


# ------------------------------------------------------------------ L7 reduced-case cross-sections (validation)


@lru_cache(maxsize=16)
def reduced_strip_mesh(level):
    """Cross-section of sims/em/em5a_tsv_gsg_chain_reduced.yaml at a line section: signal (20 x 1 um) on the front
    (z 104-105) or back (z 1-2) side, ground lines (y 40-60, |y|) on both sides, PEC walls y = -+65, PMC z = -20 / 126."""
    zs = (104, 105) if level == "top" else (1, 2)
    cond = _rect(-10, 10, *zs) + _rect(40, 60, 104, 105) + _rect(-60, -40, 104, 105) + _rect(40, 60, 1, 2) + _rect(-60, -40, 1, 2)
    faces = []
    for m, z0, z1 in (("air", -20, 0), ("ox", 0, 3), ("si", 3, 103), ("ox", 103, 106), ("air", 106, 126)):
        f = _rect(-65, 65, z0, z1) - cond
        f.faces.name = m
        faces.append(f)
    dom = Glue(faces)
    for e in dom.edges:
        (ay, az, _), (by, bz, _) = e.bounding_box
        if (abs(ay - 65) < TOL and abs(by - 65) < TOL) or (abs(ay + 65) < TOL and abs(by + 65) < TOL):
            e.name = "gnd"
        elif -10 - TOL <= ay and by <= 10 + TOL and zs[0] - TOL <= az and bz <= zs[1] + TOL:
            e.name = "sig"
        elif (ay >= 40 - TOL or by <= -40 + TOL) and ((104 - TOL <= az and bz <= 105 + TOL) or (1 - TOL <= az and bz <= 2 + TOL)):
            e.name = "gnd"
        else:
            e.name = "x"
        if e.name != "x":
            e.maxh = 1.0
    return ngs.Mesh(OCCGeometry(dom, dim=2).GenerateMesh(maxh=4.0))


@lru_cache(maxsize=16)
def reduced_tsv_mesh():
    """TSV section of the reduced case (x-y plane in the Si): signal TSV at y = 0, ground TSVs at y = -+50, r 5, liner
    1 um, Si between PEC walls y = -+65; open (natural) 300 um along x."""
    r, tl = 5.0, 1.0
    cond = Circle((0, 0), r).Face() + Circle((0, 50), r).Face() + Circle((0, -50), r).Face()
    lin = Circle((0, 0), r + tl).Face() + Circle((0, 50), r + tl).Face() + Circle((0, -50), r + tl).Face()
    si = Rectangle(600, 130).Face().Move((-300, -65, 0)) - lin
    si.faces.name = "si"
    ln = lin - cond
    ln.faces.name = "ox"
    dom = Glue([si, ln])
    for e in dom.edges:
        (ax, ay, _), (bx, by, _) = e.bounding_box
        cy = 0.5 * (ay + by)
        if (abs(ay - 65) < TOL and abs(by - 65) < TOL) or (abs(ay + 65) < TOL and abs(by + 65) < TOL):
            e.name = "gnd"
        elif abs(max(bx - ax, by - ay) / 2 - r) < 1e-2 * r:
            e.name = "sig" if abs(cy) < 25 else "gnd"
            e.maxh = r / 3
        else:
            e.name = "x"
    m = ngs.Mesh(OCCGeometry(dom, dim=2).GenerateMesh(maxh=10.0))
    m.Curve(3)
    return m


def reduced_line_params(kind, f_hz, sigma_si):
    """kind: top | bottom | tsv (PEC metals, as in the browser case)."""
    w = 2 * math.pi * f_hz
    eps = {"air": 1.0, "ox": 3.9, "si": 11.9 - 1j * sigma_si / (w * E0)}
    mesh = reduced_tsv_mesh() if kind == "tsv" else reduced_strip_mesh("top" if kind == "top" else "bottom")
    C = _solve_C(mesh, eps, order=4)
    C0v = _solve_C(mesh, {"air": 1.0, "ox": 1.0, "si": 1.0}, order=4).real
    L = MU0 * E0 / C0v
    gamma = np.sqrt(1j * w * L * 1j * w * C)
    Zc = np.sqrt(1j * w * L / (1j * w * C))
    return gamma, Zc


def reduced_chain_s(f_hz, sigma_si, zref=50.0, port_ref="zref"):
    """Ports at x = -+90 on the top lines (deembed 0): top 50 um, TSV 103 um (line centre to line centre), bottom 80 um,
    TSV 103 um, top 50 um. port_ref 'zc': S referenced to the port line Zc instead of zref."""
    M = np.eye(2, dtype=complex)
    for kind, length in (("top", 50.0), ("tsv", 103.0), ("bottom", 80.0), ("tsv", 103.0), ("top", 50.0)):
        g, Zc = reduced_line_params(kind, f_hz, sigma_si)
        M = M @ abcd(g, Zc, length * 1e-6)
    z = reduced_line_params("top", f_hz, sigma_si)[1] if port_ref == "zc" else zref
    A, B, C, D = M[0, 0], M[0, 1], M[1, 0], M[1, 1]
    den = A + B / z + C * z + D
    return np.array([[(A + B / z - C * z - D) / den, 2 * (A * D - B * C) / den],
                     [2 / den, (-A + B / z - C * z + D) / den]])


# ------------------------------------------------------------------ fast evaluation: C*(f) interpolated on a log grid

F_GRID = np.geomspace(1e9, 70e9, 12)


def section_curve(sec, sigma_si):
    """(gamma(f), Zc(f)) callables from 12 2D solves (complex C interpolated in log f, cubic)."""
    from scipy.interpolate import CubicSpline

    Cs, info0 = [], None
    for f in F_GRID:
        _, _, info0 = line_params(sec, f, sigma_si)
        Cs.append(info0["C_F_m"])
    Cs = np.array(Cs)
    lf = np.log(F_GRID)
    cr, ci = CubicSpline(lf, Cs.real), CubicSpline(lf, Cs.imag)
    L = info0["L_H_m"]
    is_strip = sec["kind"] == "strip"

    def gz(f):
        w = 2 * math.pi * f
        C = cr(np.log(f)) + 1j * ci(np.log(f))
        if is_strip:
            Rs = math.sqrt(math.pi * f * MU0 / SIGMA_AL)
            R = Rs / (2 * sec["W"] * 1e-6) + Rs / (2 * 2 * sec["W"] * 1e-6) / 2
        else:
            Rs = math.sqrt(math.pi * f * MU0 / SIGMA_CU)
            per = math.pi * sec["d"] * 1e-6
            R = Rs / per + Rs / per / 2
        Zs = R + 1j * w * L
        Yp = 1j * w * C
        return np.sqrt(Zs * Yp), np.sqrt(Zs / Yp)

    return gz


def chain_curve(sections, sigma_si, fs, zref=50.0):
    curves = {}
    for sec in sections:
        k = tuple(sorted((kk, vv) for kk, vv in sec.items() if kk != "len"))
        if k not in curves:
            curves[k] = section_curve(sec, sigma_si)
    out = []
    for f in fs:
        M = np.eye(2, dtype=complex)
        for sec in sections:
            k = tuple(sorted((kk, vv) for kk, vv in sec.items() if kk != "len"))
            g, Zc = curves[k](f)
            M = M @ abcd(g, Zc, sec["len"] * 1e-6)
        A, B, C, D = M[0, 0], M[0, 1], M[1, 0], M[1, 1]
        den = A + B / zref + C * zref + D
        out.append(((A + B / zref - C * zref - D) / den, 2 / den))
    return np.array(out)


def dip_fast(sections, sigma_si, f_lo=2e9, f_hi=67e9, n=131):
    fs = np.linspace(f_lo, f_hi, n)
    S = chain_curve(sections, sigma_si, fs)
    s11 = np.abs(S[:, 0])
    db11 = 20 * np.log10(s11)
    # local minima of |S11| that are at least 3 dB below both neighbouring maxima
    mins = [i for i in range(1, n - 1) if s11[i] < s11[i - 1] and s11[i] < s11[i + 1]]
    dips = []
    for i in mins:
        left, right = db11[: i + 1].max(), db11[i:].max()
        if min(left, right) - db11[i] >= 3.0:
            dips.append((float(fs[i] / 1e9), float(db11[i])))
    return {"dips": dips, "S11_max_dB": float(db11.max()), "S21_67_dB": float(20 * np.log10(abs(S[-1, 1])))}
