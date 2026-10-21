"""EM-4 reduced G-S-G micro-bump transition (sims/em/em4_microbump_gsg_reference_deck.md) on NGSolve.

Geometry from the deck (um; origin at the signal bump axis, z = 0 at the interposer ground), true cylinders (OCC),
conductors PEC (cut out of the dielectric), oxide eps 4.0 (tan d 0.002), underfill 3.8 (0.012). Optional lead-in
extension `ext` (both lines and the box extended by ext beyond x = -+80; the uniform line sections are unchanged, so
the de-embedded block is the same physical problem; it gives the fit more uniform line). Wave ports on the x faces
(first-order absorbing, crude excitation under the line); S and Y of the block between the pad edges x = -+13.5 come
from the terminal fit (em_ngs.fit_line with evanescent terms) of two excitations.
"""

from __future__ import annotations

import math

import ngsolve as ngs
import numpy as np
from netgen.occ import Box, Cylinder, Glue, OCCGeometry, Pnt, X, Y, Z
from scipy.optimize import least_squares

from . import em_ngs as em

EPS = {"ox": 4.0 * (1 - 0.002j), "uf": 3.8 * (1 - 0.012j)}
PAD, R_BUMP, W_LINE = 13.5, 11.0, 5.0


def conductor_boxes(x0, x1, thru=False):
    """Axis-aligned bounding boxes (xmin, ymin, zmin, xmax, ymax, zmax) of every conductor piece (cylinders: their
    bounding box); used to name the faces that bound conductors after the boolean operations."""
    if thru:
        return [(x0, -W_LINE, 6, x1, W_LINE, 8)]
    bx = [(x0, -W_LINE, 6, 0, W_LINE, 8), (0, -W_LINE, 36, x1, W_LINE, 38), (-PAD, -PAD, 6, PAD, PAD, 11),
          (-PAD, -PAD, 33, PAD, PAD, 38), (-R_BUMP, -R_BUMP, 11, R_BUMP, R_BUMP, 33)]
    for yc in (-40.0, 40.0):
        bx += [(-5, yc - 5, 0, 5, yc + 5, 6), (-PAD, yc - PAD, 6, PAD, yc + PAD, 11),
               (-R_BUMP, yc - R_BUMP, 11, R_BUMP, yc + R_BUMP, 33), (-PAD, yc - PAD, 33, PAD, yc + PAD, 38),
               (-5, yc - 5, 38, 5, yc + 5, 44)]
    return bx


def name_faces(geo, x0, x1, ylo, cboxes=None, tol=1e-6):
    """Explicit face classification (name propagation through the booleans is not reliable where a conductor face
    coincides with a dielectric interface, e.g. the line bottom on the z = 6 oxide top): outer faces by position;
    other faces by topology: shared by two dielectric solids -> interface, bounding one solid only -> conductor
    surface (pec). cboxes is unused (kept for the call signature)."""
    def key(f):
        (ax, ay, az), (bx_, by, bz) = f.bounding_box
        return (round(ax, 6), round(ay, 6), round(az, 6), round(bx_, 6), round(by, 6), round(bz, 6), round(f.mass, 6))

    count = {}
    for sol in geo.solids:
        for f in sol.faces:
            count[key(f)] = count.get(key(f), 0) + 1
    for f in geo.faces:
        (ax, ay, az), (bx_, by, bz) = f.bounding_box
        if bx_ - ax < tol and abs(ax - x0) < tol:
            f.name = "p1"
        elif bx_ - ax < tol and abs(ax - x1) < tol:
            f.name = "p2"
        elif by - ay < tol and abs(ay - 70.0) < tol:
            f.name = "pec"
        elif by - ay < tol and abs(ay - ylo) < tol:
            f.name = "pmc" if ylo == 0.0 else "pec"
        elif bz - az < tol and (abs(az) < tol or abs(az - 44.0) < tol):
            f.name = "pec"
        elif count.get(key(f), 0) >= 2:
            f.name = "interface"
        else:
            f.name = "pec"


def conductors(x0, x1):
    c = [Box(Pnt(x0, -W_LINE, 6), Pnt(0, W_LINE, 8)),  # interposer line
         Box(Pnt(0, -W_LINE, 36), Pnt(x1, W_LINE, 38)),  # die line
         Box(Pnt(-PAD, -PAD, 6), Pnt(PAD, PAD, 11)), Box(Pnt(-PAD, -PAD, 33), Pnt(PAD, PAD, 38)),
         Cylinder(Pnt(0, 0, 11), Z, r=R_BUMP, h=22)]
    for yc in (-40.0, 40.0):
        c += [Box(Pnt(-5, yc - 5, 0), Pnt(5, yc + 5, 6)), Box(Pnt(-PAD, yc - PAD, 6), Pnt(PAD, yc + PAD, 11)),
              Cylinder(Pnt(0, yc, 11), Z, r=R_BUMP, h=22), Box(Pnt(-PAD, yc - PAD, 33), Pnt(PAD, yc + PAD, 38)),
              Box(Pnt(-5, yc - 5, 38), Pnt(5, yc + 5, 44))]
    out = c[0]
    for s in c[1:]:
        out = out + s
    return out


def build(ext=0.0, h_far=20.0, h_cond=4.0, h_line=None, thru=False, half=True):
    """thru=True: only the interposer line, continuous over the whole length (uniform-line diagnostic).
    half=True: y >= 0 only; y = 0 is a magnetic wall (natural BC, name 'pmc') for the even quasi-TEM excitation."""
    x0, x1 = -80.0 - ext, 80.0 + ext
    cond = Box(Pnt(x0, -W_LINE, 6), Pnt(x1, W_LINE, 8)) if thru else conductors(x0, x1)
    cond.bc("pec")
    cond.faces.maxh = h_cond
    layers = []
    ylo = 0.0 if half else -70.0
    for name, z0, z1 in (("ox", 0, 6), ("uf", 6, 38), ("ox", 38, 44)):
        b = Box(Pnt(x0, ylo, z0), Pnt(x1, 70, z1))
        b.bc("interface")
        b.faces.Min(X).name = "p1"
        b.faces.Max(X).name = "p2"
        b.faces.Min(Y).name = "pmc" if half else "pec"
        b.faces.Max(Y).name = "pec"
        if z0 == 0:
            b.faces.Min(Z).name = "pec"
        if z1 == 44:
            b.faces.Max(Z).name = "pec"
        d = b - cond
        d.mat(name)
        layers.append(d)
    geo = Glue(layers)
    name_faces(geo, x0, x1, ylo, conductor_boxes(x0, x1, thru))
    mesh = ngs.Mesh(OCCGeometry(geo).GenerateMesh(maxh=h_far))
    return mesh, x0, x1


def eps_cf(mesh):
    return mesh.MaterialCF(EPS, default=1.0)


def einc(side):
    """Crude excitation: E_z under the line (|y| < 5) between the line and its ground plane."""
    if side == "p1":
        return ngs.CF((0, 0, ngs.IfPos(W_LINE - ngs.y, 1, 0) * ngs.IfPos(W_LINE + ngs.y, 1, 0) * ngs.IfPos(6 - ngs.z, 1, 0)))
    return ngs.CF((0, 0, -ngs.IfPos(W_LINE - ngs.y, 1, 0) * ngs.IfPos(W_LINE + ngs.y, 1, 0) * ngs.IfPos(ngs.z - 38, 1, 0)))


def sample_side(mesh, gfu, f, xs, side):
    if side == "ip":
        V = [em.voltage(mesh, gfu, x, 0.0, 0.0, 6.0) for x in xs]
        Icur = [em.current(mesh, gfu, f, x, -9.0, 9.0, 3.0, 11.0) for x in xs]
    else:
        V = [em.voltage(mesh, gfu, x, 0.0, 44.0, 38.0) for x in xs]
        Icur = [em.current(mesh, gfu, f, x, -9.0, 9.0, 33.0, 41.0) for x in xs]
    return np.array(V), np.array(Icur)


def fit_evanescent(xs, Vs, Is, g0, z0, xnear, xfar, kappa0=0.0224):
    """V_k = a e^{-g x} + b e^{g x} + c e^{-kap |x - xnear|} + d e^{-kap |x - xfar|}; I_k = (a e^{-g x} - b e^{g x}) / Zc
    + c' e^{-kap |x - xnear|} + d' e^{-kap |x - xfar|}; g, Zc, kap shared, coefficients per excitation (linear)."""
    xs = np.asarray(xs)
    K = Vs.shape[0]

    def lin(g, Zc, kap):
        ep, em_ = np.exp(-g * xs), np.exp(g * xs)
        en, ef = np.exp(-kap * np.abs(xs - xnear)), np.exp(-kap * np.abs(xs - xfar))
        Z = np.zeros_like(ep)
        A = np.vstack([np.column_stack([ep, em_, en, ef, Z, Z]), np.column_stack([ep / Zc, -em_ / Zc, Z, Z, en, ef])])
        W = np.concatenate([np.ones(xs.size), np.full(xs.size, abs(z0))])  # fixed weight (a fitted |Zc| weight lets Zc -> 0)
        out, res = [], []
        for k in range(K):
            rhs = np.concatenate([Vs[k], Is[k]])
            sol, *_ = np.linalg.lstsq(A * W[:, None], rhs * W, rcond=None)
            out.append(sol)
            res.append((A @ sol - rhs) * W)
        return np.array(out), np.concatenate(res)

    def fun(p):
        _, r = lin(p[0] + 1j * p[1], p[2] + 1j * p[3], p[4])
        return np.concatenate([r.real, r.imag])

    p0 = np.array([g0.real, g0.imag, z0.real, z0.imag, kappa0])
    sol = least_squares(fun, p0, xtol=1e-15, ftol=1e-15, gtol=1e-15, x_scale=np.abs(p0) + 1e-9)
    g, Zc, kap = sol.x[0] + 1j * sol.x[1], sol.x[2] + 1j * sol.x[3], sol.x[4]
    ab, r = lin(g, Zc, kap)
    scale = np.sqrt(np.mean(np.abs(Vs) ** 2))
    return {"g": g, "Zc": Zc, "kappa": kap, "a": ab[:, 0], "b": ab[:, 1], "res": float(np.sqrt(np.mean(np.abs(r) ** 2)) / scale)}


def run(f_hz, order=2, ext=0.0, h_far=20.0, h_cond=4.0, nsamp=30, margin=(4.0, 4.0), mesh_cache=None, evanescent=True,
        line=None, mode="v", fit_gamma=False):
    """mode "v": wave amplitudes from V(x) only (gamma, Zc from the 2D cross-section; fit_gamma: gamma refitted to the
    3D V data, identifiable when beta x window >~ 0.2 rad); mode "vi": joint V and I fit (I from curl E loops)."""
    """S (50 ohm) and Y of the block between the pad edges, pi model. Wave amplitudes from V(x) on both lead-ins
    (fit_v; gamma and Zc from the 2D cross-section `line_2d`), two excitations."""
    if mesh_cache is None:
        mesh, x0, x1 = build(ext, h_far, h_cond)
        mesh.Curve(max(order, 2))
    else:
        mesh, x0, x1 = mesh_cache
    line = line or line_2d(f_hz)
    gam, Zc = line["gamma_1_um"], line["Zc_ohm"]
    eps = eps_cf(mesh)
    k0 = em.k0_um(f_hz)
    beta_p = k0 * math.sqrt(3.85)  # port absorbing term: approximate quasi-TEM beta (calibrated out by the fit)
    xs_ip = np.linspace(x0 + margin[0], -PAD - margin[1], nsamp)
    xs_die = np.linspace(PAD + margin[1], x1 - margin[0], nsamp)
    V = {"ip": [], "die": []}
    I = {"ip": [], "die": []}
    ndof = None
    for exc in ("p1", "p2"):
        gfu, ndof = em.solve(mesh, order, f_hz, eps, ["p1", "p2"], exc, {"p1": beta_p, "p2": beta_p}, einc(exc))
        for side, xs in (("ip", xs_ip), ("die", xs_die)):
            Vx, Ix = sample_vi(mesh, gfu, f_hz, xs, side)
            V[side].append(Vx)
            I[side].append(Ix)
    fits = {}
    for side, xs, xnear, xfar in (("ip", xs_ip, -PAD, x0), ("die", xs_die, PAD, x1)):
        Vs, Is = np.array(V[side]), np.array(I[side])
        g_side = gam
        kap = best_kappa(xs, Vs, gam, xnear, xfar)[0] if evanescent else None
        if mode == "v":
            if fit_gamma:
                g_side, _ = fit_gamma_v(xs, Vs, gam, xnear, xfar, kap)
                kap = best_kappa(xs, Vs, g_side, xnear, xfar)[0] if evanescent else None
            a, b, resv = fit_v(xs, Vs, g_side, xnear, xfar, kap)
            Ifit = np.array([(a[k] * np.exp(-g_side * xs) - b[k] * np.exp(g_side * xs)) / Zc for k in range(len(a))])
            sc = np.sqrt(np.mean(np.abs(Vs) ** 2))
            resi = float(np.sqrt(np.mean(np.abs(Ifit - Is) ** 2)) * abs(Zc) / sc)  # diagnostic only
            res = resv
        else:
            a, b, res, resv, resi = fit_vi(xs, Vs, Is, gam, Zc, xnear, xfar, kap)
        fits[side] = {"a": a, "b": b, "res": res, "res_V": resv, "res_I": resi, "kappa": kap, "gamma": g_side}
    V1, I1 = em.wave_at(fits["ip"]["gamma"], Zc, fits["ip"]["a"], fits["ip"]["b"], -PAD)
    V2, I2 = em.wave_at(fits["die"]["gamma"], Zc, fits["die"]["a"], fits["die"]["b"], PAD)
    Ymat = np.array([I1, -I2]) @ np.linalg.inv(np.array([V1, V2]))
    S = em.y_to_s(Ymat, 50.0)
    return {"f_GHz": f_hz / 1e9, "order": order, "ndof": ndof, "ext_um": ext, "h_far_um": h_far, "h_cond_um": h_cond,
            "S11_dB": em.db(S[0, 0]), "S21_dB": em.db(S[1, 0]), "S22_dB": em.db(S[1, 1]),
            "S11_deg": float(np.degrees(np.angle(S[0, 0]))), "S21_deg": float(np.degrees(np.angle(S[1, 0]))),
            "pi": em.pi_model(Ymat, f_hz), "Y": Ymat, "S": S, "Zc_ohm": Zc, "eps_eff": line["eps_eff"],
            "fit": {s: {**{k: fits[s][k] for k in ("res", "res_V", "res_I", "kappa")},
                        "gamma_rel_2d": complex(fits[s]["gamma"] / gam - 1)} for s in fits}}


def line_2d(f_hz, order=4, h=1.0, h_far=6.0):
    """Quasi-TEM parameters of the EM-4 lead-in cross-section (interposer line: 10 x 2 um at z 6-8 over 6 um oxide,
    underfill to z 38, die oxide 38-44, PEC box 140 x 44 um): C (complex, lossy eps) and C0 (vacuum) per unit length
    from 2D electrostatics, gamma = j k0 sqrt(C / C0), Zc = 1 / (c sqrt(C C0)) (L = mu0 eps0 / C0). The die line is the
    mirror image (z -> 44 - z) and has the same parameters."""
    from netgen.occ import OCCGeometry as G2
    from netgen.occ import Rectangle
    from scipy.constants import c as C0
    from scipy.constants import epsilon_0 as E0

    full = Rectangle(140, 44).Face().Move((-70, 0, 0))
    line = Rectangle(2 * W_LINE, 2).Face().Move((-W_LINE, 6, 0))
    ox1 = Rectangle(140, 6).Face().Move((-70, 0, 0))
    ox2 = Rectangle(140, 6).Face().Move((-70, 38, 0))
    uf = full - ox1 - ox2
    dom = Glue([ox1 - line, uf - line, ox2 - line])
    dom.faces[0].name = "ox"
    for fc in dom.faces:
        cy = fc.center.y
        fc.name = "ox" if (cy < 6 or cy > 38) else "uf"
    dom.edges.name = "interface"
    for e in dom.edges:
        p = e.center
        if abs(p.x) > 69.999 or p.y < 1e-9 or p.y > 43.999:
            e.name = "gnd"
        elif abs(p.x) <= W_LINE + 1e-9 and 6 - 1e-9 <= p.y <= 8 + 1e-9:
            e.name = "sig"
    dom.edges.maxh = h_far
    for e in dom.edges:
        if e.name == "sig":
            e.maxh = h
    mesh2 = ngs.Mesh(G2(dom, dim=2).GenerateMesh(maxh=h_far))

    def cap(eps_map):
        fes = ngs.H1(mesh2, order=order, complex=True, dirichlet="gnd|sig")
        u, v = fes.TnT()
        epsr = mesh2.MaterialCF(eps_map, default=1.0)
        a = ngs.BilinearForm(epsr * ngs.grad(u) * ngs.grad(v) * ngs.dx).Assemble()
        g = ngs.GridFunction(fes)
        g.Set(1, definedon=mesh2.Boundaries("sig"))
        r = -a.mat * g.vec
        g.vec.data += a.mat.Inverse(fes.FreeDofs(), inverse="sparsecholesky") * r
        return complex(ngs.Integrate(epsr * ngs.grad(g) * ngs.grad(g), mesh2)) * E0  # F/m (2D: um factors cancel)

    C = cap(EPS)
    C0v = cap({"ox": 1.0, "uf": 1.0}).real
    k0 = 2 * math.pi * f_hz / C0
    gam = 1j * k0 * np.sqrt(C / C0v) * 1e-6  # 1/um
    Zc = 1 / (C0 * np.sqrt(C * C0v))
    return {"gamma_1_um": gam, "Zc_ohm": Zc, "C_F_m": C, "C0_F_m": C0v, "eps_eff": complex(C / C0v), "ndof2d": mesh2.ne}


def fit_v(xs, Vs, gam, xnear, xfar, kappa=None):
    """Linear fit of V_k(x) = a e^{-g x} + b e^{g x} [+ c e^{-kap |x - xnear|} + d e^{-kap |x - xfar|}] per excitation k,
    g fixed. Returns a (K), b (K), relative rms residual."""
    xs = np.asarray(xs)
    cols = [np.exp(-gam * xs), np.exp(gam * xs)]
    if kappa:
        cols += [np.exp(-kappa * np.abs(xs - xnear)), np.exp(-kappa * np.abs(xs - xfar))]
    A = np.column_stack(cols)
    sol, res = [], []
    for V in Vs:
        s, *_ = np.linalg.lstsq(A, V, rcond=None)
        sol.append(s)
        res.append(A @ s - V)
    sol = np.array(sol)
    return sol[:, 0], sol[:, 1], float(np.sqrt(np.mean(np.abs(np.array(res)) ** 2) / np.mean(np.abs(Vs) ** 2)))


KAPPA_GRID = np.geomspace(0.003, 0.3, 121)


def best_kappa(xs, Vs, gam, xnear, xfar, grid=KAPPA_GRID):
    r = [fit_v(xs, Vs, gam, xnear, xfar, k)[2] for k in grid]
    i = int(np.argmin(r))
    return float(grid[i]), r[i], fit_v(xs, Vs, gam, xnear, xfar, None)[2]


def fit_gamma_v(xs, Vs, gam0, xnear, xfar, kappa):
    """gamma from the 3D V data (consistency check against the 2D gamma)."""
    def fun(p):
        _, _, r = fit_v(xs, Vs, p[0] + 1j * p[1], xnear, xfar, kappa)
        return [r]
    from scipy.optimize import minimize
    res = minimize(lambda p: fun(p)[0], [gam0.real, gam0.imag], method="Nelder-Mead",
                   options={"xatol": 1e-12, "fatol": 1e-14, "maxiter": 4000})
    return res.x[0] + 1j * res.x[1], res.fun


V_PATHS_Y = (-3.0, -1.5, 0.0, 1.5, 3.0)
I_LOOPS = ((-20.0, 20.0, 1.5, 20.0), (-35.0, 35.0, 1.0, 26.0), (-50.0, 50.0, 0.75, 30.0))  # (ylo, yhi, zlo, zhi), interposer
# area-weighted probes (interposer side; die side mirrored z -> 44 - z): w = r_y(|y|) r_z(z), 1 around the line,
# linear ramps to 0; I = int (H_y dw/dz - H_z dw/dy) dA (level-set average of the loop integral), V = -<int E_z dz>_y
W_Y = (8.0, 40.0)
W_Z = (0.5, 4.0, 10.0, 30.0)
V_BOX_Y = 4.0
NQ = 10


def _ramp(t, a, b):
    return np.clip((t - a) / (b - a), 0.0, 1.0), np.where((t > a) & (t < b), 1.0 / (b - a), 0.0)


def _quad_rect(ybr, zbr, n=NQ):
    gx, gw = np.polynomial.legendre.leggauss(n)
    ys, zs, ws = [], [], []
    for y0, y1 in zip(ybr[:-1], ybr[1:], strict=True):
        for z0, z1 in zip(zbr[:-1], zbr[1:], strict=True):
            yy = 0.5 * (y1 - y0) * gx + 0.5 * (y1 + y0)
            zz = 0.5 * (z1 - z0) * gx + 0.5 * (z1 + z0)
            Y_, Z_ = np.meshgrid(yy, zz, indexing="ij")
            W_ = np.outer(gw, gw) * 0.25 * (y1 - y0) * (z1 - z0)
            ys.append(Y_.ravel())
            zs.append(Z_.ravel())
            ws.append(W_.ravel())
    return np.concatenate(ys), np.concatenate(zs), np.concatenate(ws)


_IQ = _quad_rect([0.0, W_Y[0], W_Y[1]], list(W_Z))  # y >= 0 half; integrand is even in y -> x2
_VQ = _quad_rect([0.0, V_BOX_Y], [0.0, 6.0])


def sample_vi(mesh, gfu, f_hz, xs, side):
    """Area-weighted V and I at each x (half model y >= 0; even integrands doubled)."""
    w = 2 * math.pi * f_hz
    cE = ngs.curl(gfu)
    yq, zq, wq = _IQ
    rz_lo, drz_lo = _ramp(zq, W_Z[0], W_Z[1])
    rz_hi, drz_hi = _ramp(zq, W_Z[2], W_Z[3])
    rz = np.minimum(rz_lo, 1 - rz_hi)
    drz = np.where(zq < W_Z[1], drz_lo, -drz_hi)
    ry_, dry_ = _ramp(np.abs(yq), W_Y[0], W_Y[1])
    ry, dry = 1 - ry_, -dry_
    wgt_z = ry * drz  # dw/dz
    wgt_y = dry * rz  # dw/dy (y >= 0)
    keep = (wgt_z != 0) | (wgt_y != 0)  # constant-w cells (incl. the conductor) contribute nothing
    yq, zq, wq, wgt_z, wgt_y = yq[keep], zq[keep], wq[keep], wgt_z[keep], wgt_y[keep]
    yv, zv, wv = _VQ
    Vx, Ix = [], []
    for x in xs:
        if side == "ip":
            zz, sgn = zq, 1.0
            zvv = zv
        else:
            zz, sgn = 44.0 - zq, -1.0
            zvv = 44.0 - zv
        Hc = em.sample(mesh, cE, np.array([np.full(zz.size, x), yq, zz])) * 1j * 1e12 / (w * em.MU0)
        # mirror z -> 44 - z flips dw/dz and the z components: I = int (H_y dw/dz' - H_z dw/dy) with z' = 44 - z
        Iv = 2 * np.sum(wq * (Hc[:, 1] * wgt_z * sgn - Hc[:, 2] * wgt_y)) * em.UM
        Ev = em.sample(mesh, gfu, np.array([np.full(zvv.size, x), yv, zvv]))
        Vv = -sgn * np.sum(wv * Ev[:, 2]) / V_BOX_Y
        Vx.append(Vv)
        Ix.append(Iv)
    return np.array(Vx), np.array(Ix)


def fit_vi(xs, Vs, Is, gam, Zc, xnear, xfar, kappa=None):
    """Joint linear fit, gamma and Zc fixed: V = a e^{-g x} + b e^{g x} (+ evanescent c, d in V and c', d' in I),
    I = (a e^{-g x} - b e^{g x}) / Zc; current rows weighted by |Zc|."""
    xs = np.asarray(xs)
    ep, em_ = np.exp(-gam * xs), np.exp(gam * xs)
    Zr = np.zeros_like(ep)
    cv = [ep, em_]
    ci = [ep / Zc, -em_ / Zc]
    if kappa:
        en, ef = np.exp(-kappa * np.abs(xs - xnear)), np.exp(-kappa * np.abs(xs - xfar))
        cv += [en, ef, Zr, Zr]
        ci += [Zr, Zr, en, ef]
    A = np.vstack([np.column_stack(cv), np.column_stack(ci) * abs(Zc)])
    out, rv, ri = [], [], []
    for V, Icur in zip(Vs, Is, strict=True):
        rhs = np.concatenate([V, Icur * abs(Zc)])
        sol, *_ = np.linalg.lstsq(A, rhs, rcond=None)
        r = A @ sol - rhs
        out.append(sol)
        rv.append(r[: xs.size])
        ri.append(r[xs.size:])
    out = np.array(out)
    sc = np.sqrt(np.mean(np.abs(Vs) ** 2))
    f = lambda r: float(np.sqrt(np.mean(np.abs(np.array(r)) ** 2)) / sc)  # noqa: E731
    return out[:, 0], out[:, 1], f(rv + ri), f(rv), f(ri)


# ------------------------------------------------------------------ quasi-static L and C of the block


def build_static(ext=100.0, h_far=20.0, h_cond=4.0, thru=False):
    """Half model (y >= 0) for the quasi-static solves, faces named:
    sig (signal conductor surfaces), gnd (ground stacks, walls, planes), p1 / p2 (line continuation faces, natural),
    symA / symB (the y = 0 magnetic-wall plane below / above the signal path), interface (dielectric-dielectric)."""
    x0, x1 = -80.0 - ext, 80.0 + ext
    cond = Box(Pnt(x0, -W_LINE, 6), Pnt(x1, W_LINE, 8)) if thru else conductors(x0, x1)
    cond.faces.maxh = h_cond
    layers = []
    for name, z0, z1 in (("ox", 0, 6), ("uf", 6, 38), ("ox", 38, 44)):
        b = Box(Pnt(x0, 0.0, z0), Pnt(x1, 70, z1))
        d = b - cond
        d.mat(name)
        layers.append(d)
    geo = Glue(layers)
    name_faces(geo, x0, x1, 0.0)
    nA = nB = 0
    for f in geo.faces:
        (ax, ay, az), (bx_, by, bz) = f.bounding_box
        if f.name == "pec":
            f.name = "sig" if by <= PAD + 1e-6 and not (bz - az < 1e-6 and (abs(az) < 1e-6 or abs(az - 44) < 1e-6)) \
                and not (by - ay < 1e-6 and abs(ay - 70) < 1e-6) else "gnd"
        elif f.name == "pmc":
            if bz <= 6 + 1e-6:
                f.name, nA = "symA", nA + 1
            elif az >= 38 - 1e-6:
                f.name, nB = "symB", nB + 1
            elif abs(ax - x0) < 1e-6:  # underfill piece above the interposer line (starts at the left port)
                f.name, nB = "symB", nB + 1
            else:  # underfill piece below the die line
                f.name, nA = "symA", nA + 1
    mesh = ngs.Mesh(OCCGeometry(geo).GenerateMesh(maxh=h_far))
    return mesh, x0, x1, (nA, nB)


def static_LC(mesh, x0, x1, order=3, f_hz=None, posts=True):
    """C_total (F) and L_total (H) of the full model (2 x half), and the de-embedded block values
    C_block = C_total - C' l_out, L_block = L_total - L' l_out (C', L' from line_2d), l_out = both line lengths outside
    the pad edges (used with the same-mesh uniform-line subtraction in scripts/ref_em4_static.py). C uses Re(eps)
    (and a complex variant with tan d); L: magnetic scalar potential psi with B . n = 0 on
    all conductors and port faces (natural), psi = 0 / 1/2 on the y = 0 magnetic-wall pieces below / above the signal
    path (half of the circulation I = 1 A), L = 4 W_half / I^2 = 2 mu0 int_half |grad psi|^2."""
    from scipy.constants import epsilon_0 as E0
    from scipy.constants import mu_0 as MU0v

    um = 1e-6
    out = {}
    for tag, epsmap in (("re", {k: v.real for k, v in EPS.items()}), ("cx", EPS)):
        fes = ngs.H1(mesh, order=order, complex=(tag == "cx"), dirichlet="sig|gnd")
        u, v = fes.TnT()
        eps = mesh.MaterialCF(epsmap, default=1.0)
        a = ngs.BilinearForm(eps * ngs.grad(u) * ngs.grad(v) * ngs.dx, symmetric=True).Assemble()
        g = ngs.GridFunction(fes)
        g.Set(1, definedon=mesh.Boundaries("sig"))
        r = (-a.mat * g.vec).Evaluate()
        g.vec.data += a.mat.Inverse(fes.FreeDofs(), inverse="sparsecholesky") * r
        Wn = ngs.Integrate(eps * ngs.grad(g) * ngs.grad(g), mesh)  # um^3 * (V/um)^2 = V^2 um
        out[f"C_total_{tag}_F"] = 2 * complex(Wn) * E0 * um
        out["ndof_C"] = fes.ndof
    fes = ngs.H1(mesh, order=order, dirichlet="symA|symB")
    u, v = fes.TnT()
    a = ngs.BilinearForm(ngs.grad(u) * ngs.grad(v) * ngs.dx, symmetric=True).Assemble()
    inv = a.mat.Inverse(fes.FreeDofs(), inverse="sparsecholesky")
    g0 = ngs.GridFunction(fes)
    g0.Set(0.5, definedon=mesh.Boundaries("symB"))
    r = (-a.mat * g0.vec).Evaluate()
    g0.vec.data += inv * r
    H0 = ngs.grad(g0)
    if posts:
        # ground posts (y = -+40) join the two ground planes: the domain is multiply connected around them; their
        # (unknown, equal) return current enters as kappa grad(theta), theta = sum of the angles about the two post axes
        # (same sense: tangential H vanishes on the y = 0 magnetic wall); kappa minimises the magnetic energy
        # (inductive-limit current split between parallel PEC return paths)
        th = ngs.CF((0, 0, 0))
        for yc in (-40.0, 40.0):
            r2 = ngs.x**2 + (ngs.y - yc) ** 2
            th = th + ngs.CF((-(ngs.y - yc) / r2, ngs.x / r2, 0))
        g1 = ngs.GridFunction(fes)
        lf = ngs.LinearForm(-th * ngs.grad(v) * ngs.dx).Assemble()
        g1.vec.data = inv * lf.vec
        H1v = ngs.grad(g1) + th
        kappa = -ngs.Integrate(H0 * H1v, mesh) / ngs.Integrate(H1v * H1v, mesh)
        Hc = H0 + kappa * H1v
        out["post_kappa"] = float(kappa)
        out["post_current_rel"] = float(2 * math.pi * kappa)  # post circulation (current per post) in units of I
    else:
        Hc = H0
    Wpsi = ngs.Integrate(Hc * Hc, mesh)  # (A/um)^2 um^3 = A^2 um
    out["L_total_H"] = 2 * MU0v * Wpsi * um  # L = 4 W_half / I^2, W_half = (mu0 / 2) int |H|^2 (circulation 1/2 per half)
    out["L_total_noposts_H"] = 2 * MU0v * ngs.Integrate(H0 * H0, mesh) * um
    out["ndof_L"] = fes.ndof
    line = line_2d(f_hz or 1e9, 5, 0.5)
    from scipy.constants import c as Cl

    Cp = line["C_F_m"]
    Lp = MU0v * E0 / line["C0_F_m"]
    l_out = ((-PAD) - x0 + x1 - PAD) * um
    out["C_block_F"] = out["C_total_re_F"].real - Cp.real * l_out
    out["C_block_cx_F"] = out["C_total_cx_F"] - Cp * l_out
    out["L_block_H"] = out["L_total_H"] - Lp * l_out
    out["Cp_F_m"], out["Lp_H_m"], out["l_out_m"] = Cp, Lp, l_out
    out["Zc_check_ohm"] = math.sqrt(Lp / Cp.real)
    out["v_check_c"] = 1 / math.sqrt(Lp * Cp.real) / Cl
    return out
