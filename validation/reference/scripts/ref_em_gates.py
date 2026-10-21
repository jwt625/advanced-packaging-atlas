"""EM verification gates on NGSolve H(curl) (compare with L7's E6 gate table, DevLog/lanes/L7-em2d.md):
- rectangular guide 1 x 0.5 mm, TE10 at 200 GHz, length 3 mm: beta from the S21 phase, S11, |S21| (analytic TE10 port);
- coax a = 50 um, b = 115 um, eps_r 2.1, length 1 mm (TEM port): Zc and beta from the terminal V / I fit vs closed form.
Usage: ./run.sh scripts/ref_em_gates.py
"""

import math
import time

import common  # noqa: F401
import ngsolve as ngs
import numpy as np
from netgen.occ import Box, Cylinder, OCCGeometry, Pnt, X, Z
from scipy.constants import epsilon_0, mu_0

from apref import em_ngs as em
from apref import record as rec

ngs.SetNumThreads(1)


def te10(log):
    a, b, L, f = 1000.0, 500.0, 3000.0, 200e9
    rows = []
    for order, h in ((1, 200.0), (1, 100.0), (2, 200.0), (2, 100.0), (3, 200.0)):
        t0 = time.perf_counter()
        box = Box(Pnt(0, 0, 0), Pnt(a, b, L))
        box.bc("pec")
        box.faces.Min(Z).name = "p1"
        box.faces.Max(Z).name = "p2"
        mesh = ngs.Mesh(OCCGeometry(box).GenerateMesh(maxh=h))
        k0 = em.k0_um(f)
        beta = math.sqrt(k0**2 - (math.pi / a) ** 2)
        e = ngs.CF((0, ngs.sin(math.pi * ngs.x / a), 0))
        gfu, ndof = em.solve(mesh, order, f, 1.0, ["p1", "p2"], "p1", {"p1": beta, "p2": beta}, e)
        N = em.bnd_int(mesh, e * e, "p1")
        s11 = em.bnd_int(mesh, gfu * e, "p1") / N - 1
        s21 = em.bnd_int(mesh, gfu * e, "p2") / N
        ph = -np.angle(s21)
        ph += 2 * math.pi * round((beta * L - ph) / (2 * math.pi))
        row = {"order": order, "h_um": h, "ndof": ndof, "beta_rel_err": (ph / L - beta) / beta, "S11_dB": em.db(s11),
               "S21_mag": abs(s21), "runtime_s": round(time.perf_counter() - t0, 2)}
        rows.append(row)
        log(f"TE10 order {order} h {h}: ndof {ndof} beta {row['beta_rel_err']:+.2e} S11 {row['S11_dB']:.1f} dB |S21| {abs(s21):.6f}")
    return rows


def coax(log):
    ra, rb, L, er = 50.0, 115.0, 1000.0, 2.1
    z0 = math.sqrt(mu_0 / epsilon_0) / (2 * math.pi * math.sqrt(er)) * math.log(rb / ra)
    rows = []
    for f in (10e9, 50e9):
        for order, h in ((1, 15.0), (2, 25.0), (3, 25.0)):
            t0 = time.perf_counter()
            sh = Cylinder(Pnt(0, 0, 0), X, r=rb, h=L) - Cylinder(Pnt(0, 0, 0), X, r=ra, h=L)
            sh.bc("pec")
            sh.faces.Min(X).name = "p1"
            sh.faces.Max(X).name = "p2"
            mesh = ngs.Mesh(OCCGeometry(sh).GenerateMesh(maxh=h))
            mesh.Curve(max(order, 2))
            beta = em.k0_um(f) * math.sqrt(er)
            r2 = ngs.y**2 + ngs.z**2
            e = ngs.CF((0, ngs.y / r2, ngs.z / r2))
            xs = np.linspace(200, 800, 13)
            Vs, Is = [], []
            for exc in ("p1", "p2"):
                gfu, ndof = em.solve(mesh, order, f, er, ["p1", "p2"], exc, {"p1": beta, "p2": beta}, e)
                Vs.append([em.voltage(mesh, gfu, x, 0.0, rb, ra) for x in xs])
                Is.append([em.current(mesh, gfu, f, x, -70, 70, -70, 70) for x in xs])
            g, Zc, A, B, res = em.fit_line(xs, np.array(Vs), np.array(Is), 1j * beta, 50.0 + 0j)
            row = {"f_GHz": f / 1e9, "order": order, "h_um": h, "ndof": ndof, "Zc_rel_err": (Zc.real - z0) / z0,
                   "beta_rel_err": (g.imag - beta) / beta, "alpha_1_um": g.real, "fit_res": res, "Zc_closed_ohm": z0,
                   "runtime_s": round(time.perf_counter() - t0, 2)}
            rows.append(row)
            log(f"coax f {f / 1e9:g} GHz order {order} h {h}: ndof {ndof} Zc {row['Zc_rel_err']:+.2e} beta {row['beta_rel_err']:+.2e} fit {res:.1e}")
    return rows


def main():
    log = rec.Log("EM-gates")
    res = {"te10": te10(log), "coax": coax(log)}
    p = rec.write_result("EM-gates", {"case": "EM verification gates (NGSolve H(curl))", "results": res})
    log(f"done -> {p.name}")


if __name__ == "__main__":
    main()
