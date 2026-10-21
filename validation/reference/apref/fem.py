"""Vectorised assembly and solves on scikit-fem bases (hex Q1 / Q2 / Q2 serendipity, tet P1 / P2).

Conduction:   int k grad T . grad v dV + int_Gr h T v dA = int q v dV + int_Gr h T_inf v dA + int_Gq q'' v dA.
Elasticity:   int eps(v) : C : (eps(u) - eps_th) dV = 0 (no body force), Voigt form K u = f_th.
Element matrices are built with batched matmul over element chunks (the scikit-fem form loop over 81 x 81 local pairs
is too slow for Q2 elasticity); the scalar basis functions, gradients, quadrature weights and DOF maps are
scikit-fem's. Vector DOFs are interleaved: global dof = 3 * scalar_dof + component.
"""

from __future__ import annotations

import time

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from skfem import (
    BilinearForm,
    CellBasis,
    ElementHex1,
    ElementHex2,
    ElementHexS2,
    ElementQuad1,
    ElementQuad2,
    ElementTetP1,
    ElementTetP2,
    ElementTriP1,
    ElementTriP2,
    FacetBasis,
    LinearForm,
    MeshHex,
    MeshHex2,
    MeshTet,
    MeshTet2,
    MeshTri,
    MeshTri2,
)

ELEMENTS = {
    "q1": (ElementHex1, 3),
    "q2": (ElementHex2, 5),
    "q2s": (ElementHexS2, 5),
    "p1": (ElementTetP1, 2),
    "p2": (ElementTetP2, 4),
    "t1": (ElementTriP1, 2),
    "t2": (ElementTriP2, 4),
}
FACET_ELEMENT_ORDER = {"q1": 3, "q2": 5, "q2s": 5, "p1": 2, "p2": 4}
_ = (ElementQuad1, ElementQuad2, ElementTriP1, ElementTriP2, MeshHex, MeshTet)  # re-exported for scripts

CHUNK = 1500
MAX_DIRECT = 100_000


def make_basis(mesh, elem: str, intorder: int | None = None) -> CellBasis:
    E, io = ELEMENTS[elem]
    return CellBasis(mesh, E(), intorder=intorder or io)


def facet_basis(mesh, elem: str, facets) -> FacetBasis:
    E, io = ELEMENTS[elem]
    return FacetBasis(mesh, E(), facets=facets, intorder=io)


def _grads(basis: CellBasis, sl: slice) -> np.ndarray:
    """(ne_chunk, nqp, 3, nloc)."""
    G = np.stack([np.asarray(basis.basis[a][0].grad)[:, sl, :] for a in range(basis.Nbfun)], axis=-1)
    return np.ascontiguousarray(G.transpose(1, 2, 0, 3))


def _coo_add(rows, cols, vals, n) -> sp.csr_matrix:
    return sp.coo_matrix((vals.ravel(), (rows.ravel(), cols.ravel())), shape=(n, n)).tocsr()


def assemble_conduction(basis: CellBasis, kcell: np.ndarray) -> sp.csr_matrix:
    """kcell: (ne, 3, 3) W/(m K) per element."""
    ne, N = basis.nelems, basis.N
    K = sp.csr_matrix((N, N))
    dofs = basis.element_dofs.T  # (ne, nloc)
    for s in range(0, ne, CHUNK):
        sl = slice(s, min(s + CHUNK, ne))
        G = _grads(basis, sl)  # (e, q, 3, a)
        dx = basis.dx[sl]  # (e, q)
        kG = np.einsum("eij,eqja->eqia", kcell[sl], G)
        Ke = np.einsum("eqia,eqib,eq->eab", G, kG, dx, optimize=True)
        d = dofs[sl]
        K = K + _coo_add(np.repeat(d[:, :, None], d.shape[1], 2), np.repeat(d[:, None, :], d.shape[1], 1), Ke, N)
    return K


def _bmat(G: np.ndarray) -> np.ndarray:
    """G (e, q, 3, a) -> B (e, q, 6, 3a), engineering shear, local dof = 3 a + c."""
    e, q, _, a = G.shape
    B = np.zeros((e, q, 6, a, 3))
    gx, gy, gz = G[:, :, 0], G[:, :, 1], G[:, :, 2]
    B[:, :, 0, :, 0] = gx
    B[:, :, 1, :, 1] = gy
    B[:, :, 2, :, 2] = gz
    B[:, :, 3, :, 1] = gz
    B[:, :, 3, :, 2] = gy
    B[:, :, 4, :, 0] = gz
    B[:, :, 4, :, 2] = gx
    B[:, :, 5, :, 0] = gy
    B[:, :, 5, :, 1] = gx
    return B.reshape(e, q, 6, 3 * a)


def assemble_elastic_2d(basis: CellBasis, Dcell: np.ndarray, eps_th: np.ndarray | None):
    """2D (plane stress / strain via Dcell (ne, 3, 3), Voigt xx, yy, xy engineering). eps_th (ne, nqp, 3) or None.
    DOFs interleaved: 2 * scalar_dof + component."""
    ne, N = basis.nelems, 2 * basis.N
    K = sp.csr_matrix((N, N))
    f = np.zeros(N)
    d = basis.element_dofs.T
    vd = (2 * d[:, :, None] + np.arange(2)[None, None, :]).reshape(d.shape[0], -1)
    m = vd.shape[1]
    for s0 in range(0, ne, CHUNK):
        sl = slice(s0, min(s0 + CHUNK, ne))
        G = _grads(basis, sl)  # (e, q, 2, a)
        e, q, _, a = G.shape
        B = np.zeros((e, q, 3, a, 2))
        B[:, :, 0, :, 0] = G[:, :, 0]
        B[:, :, 1, :, 1] = G[:, :, 1]
        B[:, :, 2, :, 0] = G[:, :, 1]
        B[:, :, 2, :, 1] = G[:, :, 0]
        B = B.reshape(e, q, 3, 2 * a)
        dx = basis.dx[sl]
        C = Dcell[sl]
        CB = np.einsum("eij,eqjm->eqim", C, B, optimize=True) * dx[:, :, None, None]
        Ke = np.matmul(B.reshape(e, q * 3, m).transpose(0, 2, 1), CB.reshape(e, q * 3, m))
        dd = vd[sl]
        K = K + _coo_add(np.repeat(dd[:, :, None], m, 2), np.repeat(dd[:, None, :], m, 1), Ke, N)
        if eps_th is not None:
            sig = np.einsum("eij,eqj->eqi", C, eps_th[sl])
            fe = np.einsum("eqim,eqi,eq->em", B, sig, dx, optimize=True)
            np.add.at(f, dd.ravel(), fe.ravel())
    return K, f


def plane_stress(E: float, nu: float) -> np.ndarray:
    return E / (1 - nu**2) * np.array([[1, nu, 0], [nu, 1, 0], [0, 0, (1 - nu) / 2]])


def vector_dofs(basis: CellBasis) -> np.ndarray:
    """(ne, 3 nloc) interleaved global vector DOFs."""
    d = basis.element_dofs.T
    return (3 * d[:, :, None] + np.arange(3)[None, None, :]).reshape(d.shape[0], -1)


def assemble_elastic(basis: CellBasis, Ccell: np.ndarray, eps_th: np.ndarray | None):
    """Ccell (ne, 6, 6) Pa; eps_th (ne, nqp, 6) Voigt thermal (eigen) strain or None. Returns K (3N x 3N), f."""
    ne, N = basis.nelems, 3 * basis.N
    K = sp.csr_matrix((N, N))
    f = np.zeros(N)
    vd = vector_dofs(basis)
    m = vd.shape[1]
    for s in range(0, ne, CHUNK):
        sl = slice(s, min(s + CHUNK, ne))
        B = _bmat(_grads(basis, sl))  # (e, q, 6, m)
        dx = basis.dx[sl]
        C = Ccell[sl]
        CB = np.einsum("eij,eqjm->eqim", C, B, optimize=True) * dx[:, :, None, None]
        e, q = dx.shape
        Ke = np.matmul(B.reshape(e, q * 6, m).transpose(0, 2, 1), CB.reshape(e, q * 6, m))
        d = vd[sl]
        K = K + _coo_add(np.repeat(d[:, :, None], m, 2), np.repeat(d[:, None, :], m, 1), Ke, N)
        if eps_th is not None:
            sig = np.einsum("eij,eqj->eqi", C, eps_th[sl])
            fe = np.einsum("eqim,eqi,eq->em", B, sig, dx, optimize=True)
            np.add.at(f, d.ravel(), fe.ravel())
    return K, f


@BilinearForm
def _robin_lhs(u, v, w):
    return w.h * u * v


@LinearForm
def _robin_rhs(v, w):
    return w.h * w.Tinf * v


@LinearForm
def _flux_rhs(v, w):
    return w.q * v


@LinearForm
def _vol_rhs(v, w):
    return w.q * v


def robin(fb: FacetBasis, h: float, Tinf: float):
    return _robin_lhs.assemble(fb, h=h), _robin_rhs.assemble(fb, h=h, Tinf=Tinf)


def flux(fb: FacetBasis, q: float):
    return _flux_rhs.assemble(fb, q=q)


def volume_source(basis: CellBasis, qcell: np.ndarray):
    """qcell (ne,) W/m3 per element."""
    return _vol_rhs.assemble(basis, q=np.repeat(qcell[:, None], basis.dx.shape[1], 1))


def solve_dirichlet(K, f, D: np.ndarray, xD: np.ndarray, method: str = "auto", nullspace=None, tol=1e-12,
                    max_direct: int | None = None):
    """Solve K x = f with x[D] = xD. Returns (x, info dict)."""
    N = K.shape[0]
    x = np.zeros(N)
    x[D] = xD
    free = np.setdiff1d(np.arange(N), D)
    Kff = K[free][:, free].tocsc()
    rhs = f[free] - K[free][:, D] @ xD
    t0 = time.perf_counter()
    info: dict = {"n_free": int(free.size)}
    if method == "auto":
        # SuperLU (L and U) is fastest below ~15k DOF; above, qdldl (AMD + LDL^T, L only) halves peak memory.
        # 3D Q2 elasticity: ~2.2 GB peak at 44k free DOF with qdldl (measured, DevLog/lanes/L5-references.md).
        if free.size > (max_direct or MAX_DIRECT):
            raise RuntimeError(f"{free.size} free DOF exceeds the direct-solve budget {max_direct or MAX_DIRECT}")
        method = "superlu" if free.size <= 15_000 else "qdldl"
    if method == "superlu":
        lu = spla.splu(Kff, permc_spec="COLAMD")
        xf = lu.solve(rhs)
        info["nnz_LU"] = int(lu.L.nnz + lu.U.nnz)
    elif method == "qdldl":
        import qdldl

        F = qdldl.Solver(sp.triu(Kff, format="csc"))
        xf = F.solve(rhs)
        r0 = rhs - Kff @ xf  # one step of iterative refinement
        xf = xf + F.solve(r0)
        del F
    else:
        import pyamg

        B = None if nullspace is None else nullspace[free]
        ml = pyamg.smoothed_aggregation_solver(Kff.tocsr(), B=B, symmetry="symmetric", max_coarse=3000)
        res: list[float] = []
        xf = ml.solve(rhs, tol=tol, accel="cg", maxiter=3000, residuals=res)
        info["iterations"] = len(res)
    info["method"] = method
    info["solve_s"] = time.perf_counter() - t0
    r = np.linalg.norm(Kff @ xf - rhs) / max(np.linalg.norm(rhs), 1e-300)
    info["rel_residual"] = float(r)
    if r > 1e-8:
        raise RuntimeError(f"solve did not converge: relative residual {r:.2e} ({method})")
    x[free] = xf
    return x, info


def rigid_body_modes(coords: np.ndarray) -> np.ndarray:
    """coords (3, n) of scalar DOF locations -> (3n, 6) interleaved rigid-body modes."""
    n = coords.shape[1]
    Bm = np.zeros((3 * n, 6))
    x, y, z = coords
    for c in range(3):
        Bm[c::3, c] = 1.0
    Bm[0::3, 3], Bm[1::3, 3] = -y, x  # rot z
    Bm[1::3, 4], Bm[2::3, 4] = -z, y  # rot x
    Bm[0::3, 5], Bm[2::3, 5] = z, -x  # rot y
    return Bm


def point_matrices(basis: CellBasis, pts: np.ndarray, hint: np.ndarray | None = None):
    """Sparse maps from a scalar DOF vector to values and gradients at pts (3, P).
    hint: optional (3, P) offsets used only to choose the element (point nudged into the wanted material)."""
    mesh = basis.mesh
    probe = pts if hint is None else pts + hint
    if isinstance(mesh, MeshTet2 | MeshHex2 | MeshTri2):
        # locate on the straight-sided mesh (the isoparametric finder runs Newton on far candidates and fails),
        # then invert the curved map on that element only; probes must not sit between a chord and its arc
        lin = {MeshTet2: MeshTet, MeshHex2: MeshHex, MeshTri2: MeshTri}[type(mesh)](mesh.p, mesh.t)
        cells = lin.element_finder()(*probe)
    else:
        cells = mesh.element_finder(mapping=basis.mapping)(*probe)
    X = basis.mapping.invF(pts[:, :, None], tind=cells)
    P = pts.shape[1]
    rows = np.tile(np.arange(P), basis.Nbfun)
    cols = basis.element_dofs[:, cells].ravel()
    vals, grads = [], []
    for k in range(basis.Nbfun):
        phi = basis.elem.gbasis(basis.mapping, X, k, tind=cells)[0]
        vals.append(np.asarray(phi).ravel())
        grads.append(np.asarray(phi.grad)[:, :, 0])
    V = sp.coo_matrix((np.concatenate(vals), (rows, cols)), shape=(P, basis.N)).tocsr()
    Gs = [
        sp.coo_matrix((np.concatenate([g[i] for g in grads]), (rows, cols)), shape=(P, basis.N)).tocsr()
        for i in range(pts.shape[0])
    ]
    return V, Gs, cells


def strain_at(basis: CellBasis, u: np.ndarray, pts: np.ndarray, hint=None):
    """Voigt engineering strain (P, 6) and displacement (P, 3) at points; u interleaved."""
    V, Gs, cells = point_matrices(basis, pts, hint)
    U = u.reshape(-1, 3)
    disp = np.stack([V @ U[:, c] for c in range(3)], axis=1)
    du = np.stack([np.stack([Gs[j] @ U[:, i] for j in range(3)], axis=1) for i in range(3)], axis=1)  # (P, i, j)
    eps = np.stack(
        [du[:, 0, 0], du[:, 1, 1], du[:, 2, 2], du[:, 1, 2] + du[:, 2, 1], du[:, 0, 2] + du[:, 2, 0],
         du[:, 0, 1] + du[:, 1, 0]],
        axis=1,
    )
    return eps, disp, cells


def von_mises(s: np.ndarray) -> np.ndarray:
    """s (..., 6) Voigt stress."""
    sx, sy, sz, tyz, txz, txy = (s[..., i] for i in range(6))
    return np.sqrt(0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2) + 3 * (tyz**2 + txz**2 + txy**2))
