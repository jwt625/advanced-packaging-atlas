"""Total-Lagrangian thermo-elasticity on scikit-fem hex bases (lane L20; reference for the engine's
solveMechNonlinear).

Green-Lagrange strain E = (F^T F - I) / 2, F = I + grad u (reference configuration), St. Venant-Kirchhoff material
S = C (E - eps_th) with an isotropic C per element and a (possibly anisotropic, diagonal) thermal strain per element.
Residual R = int B_NL^T S dV0; tangent K = int B_NL^T C B_NL dV0 + int (grad N_a . S grad N_b) I dV0.
Load-stepped Newton on the temperature change (eps_th = alpha dT lambda). Written from the continuum equations with
numpy on scikit-fem's basis gradients, quadrature and DOF maps (independent of the engine's JavaScript code).
Stability: the lowest eigenvalues of the free-DOF tangent at converged states (scipy eigsh, shift-invert at 0).
Branch switching: at a converged state with a negative eigenvalue, the strain energy (the total potential: no
external loads) is minimised along that eigenvector (step doubling from 1e-3 max |u| while the energy decreases,
then a parabola through the last three points), followed by energy-descent Newton (tangent shifted by 1.5 |lambda_min|
while indefinite, backtracking on the strain energy) at the same load; up to 3 times until the state is stable.
"""

from __future__ import annotations

import time

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from skfem import MeshHex

from apref.fem import CHUNK, _grads, make_basis, vector_dofs


def iso_C(E: float, nu: float) -> np.ndarray:
    lam, mu = E * nu / ((1 + nu) * (1 - 2 * nu)), E / (2 * (1 + nu))
    C = np.zeros((6, 6))
    C[:3, :3] = lam
    C[np.arange(3), np.arange(3)] += 2 * mu
    C[np.arange(3, 6), np.arange(3, 6)] = mu
    return C


class Plate:
    """Layered box on a tensor mesh. layers: [{'h': m, 'E': Pa, 'nu': -, 'alpha': [ax, ay, az] 1/K}] bottom to top."""

    def __init__(self, xs, ys, layers, elem="q2s", nz_per_layer=1):
        zs = [0.0]
        for L in layers:
            for _ in range(nz_per_layer):
                zs.append(zs[-1] + L["h"] / nz_per_layer)
        self.zs = np.array(zs)
        self.mesh = MeshHex.init_tensor(np.asarray(xs, float), np.asarray(ys, float), self.zs)
        self.basis = make_basis(self.mesh, elem)
        self.elem = elem
        zc = self.mesh.p[2, self.mesh.t].mean(axis=0)
        bounds = np.cumsum([0.0] + [L["h"] for L in layers])
        lid = np.clip(np.searchsorted(bounds, zc) - 1, 0, len(layers) - 1)
        self.C = np.stack([iso_C(layers[i]["E"], layers[i]["nu"]) for i in lid])
        self.alpha = np.stack([np.r_[np.asarray(layers[i]["alpha"], float), 0, 0, 0] for i in lid])
        self.N = 3 * self.basis.N
        self.vd = vector_dofs(self.basis)
        self.locs = self.basis.doflocs

    def dof(self, pt, comp):
        d = np.argmin(((self.locs - np.asarray(pt, float)[:, None]) ** 2).sum(axis=0))
        if np.linalg.norm(self.locs[:, d] - pt) > 1e-12:
            raise ValueError(f"no node at {pt}")
        return 3 * d + comp

    def quarter_supports(self):
        """ux = 0 on x = 0, uy = 0 on y = 0, uz = 0 at the origin (the engine's symmetry quarter rule)."""
        x, y = self.locs[0], self.locs[1]
        D = np.r_[3 * np.where(np.abs(x) < 1e-14)[0], 3 * np.where(np.abs(y) < 1e-14)[0] + 1, self.dof([0, 0, 0], 2)]
        return np.unique(D)

    def assemble(self, u, dT, with_K=True):
        ne, m = self.basis.nelems, self.vd.shape[1]
        R = np.zeros(self.N)
        rows, cols, vals = [], [], []
        self.energy = 0.0
        for s in range(0, ne, CHUNK):
            sl = slice(s, min(s + CHUNK, ne))
            G = _grads(self.basis, sl)  # (e, q, 3, a)
            dx = self.basis.dx[sl]
            d = self.vd[sl]
            e, q, _, a = G.shape
            Ue = u[d].reshape(e, a, 3)
            F = np.eye(3)[None, None] + np.einsum("eai,eqpa->eqip", Ue, G)
            Cg = np.einsum("eqki,eqkj->eqij", F, F)
            Ev = np.stack([0.5 * (Cg[..., 0, 0] - 1), 0.5 * (Cg[..., 1, 1] - 1), 0.5 * (Cg[..., 2, 2] - 1),
                           Cg[..., 1, 2], Cg[..., 0, 2], Cg[..., 0, 1]], axis=-1)
            eth = self.alpha[sl][:, None, :] * dT
            S = np.einsum("eij,eqj->eqi", self.C[sl], Ev - eth)
            # B_NL (e, q, 6, a, 3): row I, column (a, i)
            B = np.zeros((e, q, 6, a, 3))
            g0, g1, g2 = G[:, :, 0], G[:, :, 1], G[:, :, 2]
            for i in range(3):
                Fi0, Fi1, Fi2 = F[:, :, i, 0, None], F[:, :, i, 1, None], F[:, :, i, 2, None]
                B[:, :, 0, :, i] = Fi0 * g0
                B[:, :, 1, :, i] = Fi1 * g1
                B[:, :, 2, :, i] = Fi2 * g2
                B[:, :, 3, :, i] = Fi1 * g2 + Fi2 * g1
                B[:, :, 4, :, i] = Fi0 * g2 + Fi2 * g0
                B[:, :, 5, :, i] = Fi0 * g1 + Fi1 * g0
            B = B.reshape(e, q, 6, m)
            self.energy += 0.5 * float(np.einsum("eqi,eqi,eq->", S, Ev - eth, dx))
            fe = np.einsum("eqim,eqi,eq->em", B, S, dx, optimize=True)
            np.add.at(R, d.ravel(), fe.ravel())
            if not with_K:
                continue
            CB = np.einsum("eij,eqjm->eqim", self.C[sl], B, optimize=True) * dx[:, :, None, None]
            Ke = np.matmul(B.reshape(e, q * 6, m).transpose(0, 2, 1), CB.reshape(e, q * 6, m))
            St = np.stack([np.stack([S[..., 0], S[..., 5], S[..., 4]], -1), np.stack([S[..., 5], S[..., 1], S[..., 3]], -1),
                           np.stack([S[..., 4], S[..., 3], S[..., 2]], -1)], -2)  # (e, q, 3, 3)
            Kg = np.einsum("eqpa,eqpr,eqrb,eq->eab", G, St, G, dx, optimize=True)
            Ke = Ke.reshape(e, a, 3, a, 3)
            for i in range(3):
                Ke[:, :, i, :, i] += Kg
            Ke = Ke.reshape(e, m, m)
            rows.append(np.repeat(d[:, :, None], m, 2).ravel())
            cols.append(np.repeat(d[:, None, :], m, 1).ravel())
            vals.append(Ke.ravel())
        K = sp.coo_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(self.N, self.N)).tocsr() if with_K else None
        return R, K


def lowest_eigs(Kff, k=3):
    """Lowest-magnitude eigenvalues (and vectors) of the symmetric free-DOF tangent (shift-invert at 0)."""
    w, V = spla.eigsh(Kff.tocsc(), k=k, sigma=0.0, which="LM")
    o = np.argsort(w)
    return w[o], V[:, o]


def energy_along(P, u, phi, dT, free):
    """Minimise the strain energy along +-phi (phi on all DOFs, zero on constrained ones); returns the new u."""
    P.assemble(u, dT, with_K=False)
    E0 = P.energy
    best = None
    for sgn in (1.0, -1.0):
        t, ts, es = 1e-3 * np.abs(u).max() / np.abs(phi).max(), [0.0], [E0]
        for _ in range(40):
            P.assemble(u + sgn * t * phi, dT, with_K=False)
            ts.append(t)
            es.append(P.energy)
            if es[-1] > es[-2]:
                break
            t *= 2
        j = int(np.argmin(es))
        if 0 < j < len(ts) - 1:
            # parabola through (t_{j-1}, t_j, t_{j+1})
            x0, x1, x2, y0, y1, y2 = ts[j - 1], ts[j], ts[j + 1], es[j - 1], es[j], es[j + 1]
            den = (x0 - x1) * (x0 - x2) * (x1 - x2)
            a = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / den
            b = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / den
            tj = -b / (2 * a) if a > 0 else ts[j]
        else:
            tj = ts[j]
        P.assemble(u + sgn * tj * phi, dT, with_K=False)
        if best is None or P.energy < best[0]:
            best = (P.energy, sgn * tj)
    return u + best[1] * phi, {"E0_J": E0, "E_J": best[0], "t": best[1]}


def newton_path(P: Plate, D, dTs, tol=1e-10, max_newton=30, eig=True, switch=False, log=print, probes=None):
    """Load path over dTs (list, from 0). Returns rows per load step with probe values, Newton counts, eigenvalues.
    switch: at converged states with a negative eigenvalue, minimise the energy along its eigenvector and re-solve
    at the same load (branch switching, up to 4 times per load step)."""
    free = np.setdiff1d(np.arange(P.N), D)
    u = np.zeros(P.N)
    rows, Rref, switches = [], None, []
    for dT in dTs:
        for attempt in range(5):
            t0 = time.perf_counter()
            hist = []
            descent = attempt > 0  # after an energy step along the critical mode: energy-descent Newton
            for it in range(max_newton + (40 if descent else 0)):  # noqa: B007 (it is reported after the loop)
                R, K = P.assemble(u, dT)
                E0 = P.energy
                rn = np.linalg.norm(R[free])
                if Rref is None:
                    Rref = rn
                rel = rn / Rref
                hist.append(rel)
                if rel < tol:
                    break
                Kff = K[free][:, free]
                if descent:
                    w0 = lowest_eigs(Kff, k=1)[0][0]
                    if w0 > 0:
                        descent = False
                    else:
                        # shift to positive definite (1.5 |lambda_min|), backtrack on the strain energy
                        du = spla.spsolve((Kff + 1.5 * abs(w0) * sp.identity(free.size)).tocsc(), -R[free])
                        g, t = float(R[free] @ du), 1.0
                        for _ in range(30):
                            ut = u.copy()
                            ut[free] += t * du
                            P.assemble(ut, dT, with_K=False)
                            if P.energy <= E0 + 1e-4 * t * g:
                                break
                            t *= 0.5
                        u[free] += t * du
                        continue
                du = spla.spsolve(Kff.tocsc(), -R[free])
                u[free] += du
            else:
                raise RuntimeError(f"Newton did not converge at dT {dT} (rel {rel:.2e})")
            ev = None
            if eig:
                w, V = lowest_eigs(K[free][:, free])
                ev = w.tolist()
                if switch and w[0] < 0 and attempt < 3:
                    phi = np.zeros(P.N)
                    phi[free] = V[:, 0]
                    u, info = energy_along(P, u, phi, dT, free)
                    switches.append({"dT": float(dT), "eig": float(w[0]), **info})
                    log(f"  branch switch at dT {dT}: eig {w[0]:.4e}, energy {info['E0_J']:.6e} -> {info['E_J']:.6e} J")
                    continue
            break
        row = {"dT": float(dT), "newton": it, "rel": float(rel), "eig_low": ev, "runtime_s": round(time.perf_counter() - t0, 2)}
        if probes:
            row.update({nm: float(fn(u)) for nm, fn in probes.items()})
        P.assemble(u, dT, with_K=False)
        row["energy_J"] = P.energy
        rows.append(row)
        log("  " + " ".join(f"{kk}={vv:.6g}" if isinstance(vv, float) else f"{kk}={vv}" for kk, vv in row.items() if kk != "eig_low")
            + (f" eig0={ev[0]:.4e}" if ev else ""))
    return rows, u, switches
