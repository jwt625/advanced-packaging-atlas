"""Constitutive data for the references: conductivity tensor, stiffness (Voigt 6x6), secant CTE.

Voigt order: xx, yy, zz, yz, xz, xy with engineering shear strains (gamma = 2 eps).
Input units: E/G/Cij in GPa, alpha in ppm/K, k in W/(m K), temperatures in C. Returned values are SI.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

VOIGT = [(0, 0), (1, 1), (2, 2), (1, 2), (0, 2), (0, 1)]


def rot_z(deg: float) -> np.ndarray:
    c, s = np.cos(np.radians(deg)), np.sin(np.radians(deg))
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]])


def rotation(spec) -> np.ndarray:
    """Material-to-lab rotation. spec: None | {'rot_z_deg': a} | 3x3 list."""
    if spec is None:
        return np.eye(3)
    if isinstance(spec, dict):
        R = np.eye(3)
        if "rot_x_deg" in spec:
            c, s = np.cos(np.radians(spec["rot_x_deg"])), np.sin(np.radians(spec["rot_x_deg"]))
            R = np.array([[1, 0, 0], [0, c, -s], [0, s, c]]) @ R
        if "rot_z_deg" in spec:
            R = rot_z(spec["rot_z_deg"]) @ R
        return R
    return np.asarray(spec, dtype=float)


def voigt_to_tensor(C6: np.ndarray) -> np.ndarray:
    C = np.zeros((3, 3, 3, 3))
    for I, (i, j) in enumerate(VOIGT):
        for J, (k, l) in enumerate(VOIGT):
            for a, b in ((i, j), (j, i)):
                for c, d in ((k, l), (l, k)):
                    C[a, b, c, d] = C6[I, J]
    return C


def tensor_to_voigt(C: np.ndarray) -> np.ndarray:
    C6 = np.zeros((6, 6))
    for I, (i, j) in enumerate(VOIGT):
        for J, (k, l) in enumerate(VOIGT):
            C6[I, J] = C[i, j, k, l]
    return C6


def rotate_stiffness(C6: np.ndarray, R: np.ndarray) -> np.ndarray:
    if np.allclose(R, np.eye(3)):
        return C6
    C = voigt_to_tensor(C6)
    Cr = np.einsum("ip,jq,kr,ls,pqrs->ijkl", R, R, R, R, C)
    return tensor_to_voigt(Cr)


def stiffness_iso(E: float, nu: float) -> np.ndarray:
    lam = E * nu / ((1 + nu) * (1 - 2 * nu))
    mu = E / (2 * (1 + nu))
    C = np.zeros((6, 6))
    C[:3, :3] = lam
    C[0, 0] = C[1, 1] = C[2, 2] = lam + 2 * mu
    C[3, 3] = C[4, 4] = C[5, 5] = mu
    return C


def stiffness_ortho(Ex, Ey, Ez, nuxy, nuyz, nuxz, Gxy, Gyz, Gxz) -> np.ndarray:
    """Engineering constants; nu_ij = -eps_j / eps_i under uniaxial stress along i (symmetric compliance)."""
    S = np.zeros((6, 6))
    S[0, 0], S[1, 1], S[2, 2] = 1 / Ex, 1 / Ey, 1 / Ez
    S[0, 1] = S[1, 0] = -nuxy / Ex
    S[1, 2] = S[2, 1] = -nuyz / Ey
    S[0, 2] = S[2, 0] = -nuxz / Ex
    S[3, 3], S[4, 4], S[5, 5] = 1 / Gyz, 1 / Gxz, 1 / Gxy
    return np.linalg.inv(S)


def stiffness_cubic(C11, C12, C44) -> np.ndarray:
    C = np.zeros((6, 6))
    C[:3, :3] = C12
    C[0, 0] = C[1, 1] = C[2, 2] = C11
    C[3, 3] = C[4, 4] = C[5, 5] = C44
    return C


@dataclass
class Material:
    key: str
    k: np.ndarray | None = None  # 3x3 W/(m K), lab frame
    C: np.ndarray | None = None  # 6x6 Pa, lab frame
    alpha_diag: np.ndarray | None = None  # principal secant CTE (1/K), material frame (constant case)
    alpha_table: np.ndarray | None = None  # rows [T_C, a_1, a_2, a_3] ppm/K (secant, material frame), optional
    R: np.ndarray = field(default_factory=lambda: np.eye(3))
    Tref_C: float | None = None  # strain-free temperature of the CTE dataset (Tm); None: Tm = Tsf (pure alpha dT)
    raw: dict = field(default_factory=dict)

    def _a(self, T_C: np.ndarray) -> np.ndarray:
        """Principal secant CTE (1/K) at T, shape T.shape + (3,)."""
        if self.alpha_table is None:
            return np.broadcast_to(self.alpha_diag, T_C.shape + (3,))
        tab = self.alpha_table
        return np.stack([np.interp(T_C, tab[:, 0], tab[:, i]) for i in (1, 2, 3)], axis=-1) * 1e-6

    def thermal_strain(self, T_C: np.ndarray, Tsf_C: float) -> np.ndarray:
        """Thermal strain tensor (lab frame, shape T.shape + (3, 3)) rebased to the stress-free temperature Tsf.
        Per principal direction i (R1 Sec. 1.2 closed form, Tm = dataset strain-free temperature):
        eps_i(T) = [a_i(T) (T - Tm) - a_i(Tsf) (Tsf - Tm)] / (1 + a_i(Tsf) (Tsf - Tm)).
        Constant alpha with Tm = Tsf reduces to alpha (T - Tsf)."""
        T_C = np.asarray(T_C, dtype=float)
        Tm = float(Tsf_C) if self.Tref_C is None else self.Tref_C
        aT = self._a(T_C)
        aS = self._a(np.asarray(float(Tsf_C)))
        e = (aT * (T_C - Tm)[..., None] - aS * (Tsf_C - Tm)) / (1.0 + aS * (Tsf_C - Tm))
        diag = np.zeros(T_C.shape + (3, 3))
        for i in range(3):
            diag[..., i, i] = e[..., i]
        return np.einsum("ip,...pq,jq->...ij", self.R, diag, self.R)


def make_material(key: str, d: dict) -> Material:
    """d: {k_W_mK: s | [kx,ky,kz], elastic: {type: iso, E_GPa, nu} | {type: ortho, Ex_GPa,..., nuxy,..., Gxy_GPa,...} |
    {type: cubic, C11_GPa, C12_GPa, C44_GPa}, cte: {alpha_ppmK: s | [ax, ay, az], Tref_C} | {table: [[T_C, ax, ay, az]],
    Tref_C}, frame: {rot_z_deg: a}}"""
    R = rotation(d.get("frame"))
    m = Material(key=key, R=R, raw=d)
    if "k_W_mK" in d:
        kv = np.atleast_1d(np.asarray(d["k_W_mK"], dtype=float))
        kd = np.diag(np.repeat(kv, 3) if kv.size == 1 else kv)
        m.k = R @ kd @ R.T
    el = d.get("elastic")
    if el:
        t = el.get("type", "iso")
        G = 1e9
        if t == "iso":
            C6 = stiffness_iso(el["E_GPa"] * G, el["nu"])
        elif t == "ortho":
            C6 = stiffness_ortho(
                el["Ex_GPa"] * G, el["Ey_GPa"] * G, el["Ez_GPa"] * G, el["nuxy"], el["nuyz"], el["nuxz"],
                el["Gxy_GPa"] * G, el["Gyz_GPa"] * G, el["Gxz_GPa"] * G,
            )
        elif t == "cubic":
            C6 = stiffness_cubic(el["C11_GPa"] * G, el["C12_GPa"] * G, el["C44_GPa"] * G)
        else:
            raise ValueError(f"material {key}: unknown elastic type {t}")
        m.C = rotate_stiffness(C6, R)
    cte = d.get("cte")
    if cte:
        m.Tref_C = None if cte.get("Tref_C") is None else float(cte["Tref_C"])
        if "table" in cte:
            m.alpha_table = np.asarray(cte["table"], dtype=float)
        else:
            av = np.atleast_1d(np.asarray(cte["alpha_ppmK"], dtype=float)) * 1e-6
            m.alpha_diag = np.repeat(av, 3) if av.size == 1 else av
    return m


def strain_tensor_to_voigt(eps: np.ndarray) -> np.ndarray:
    """(..., 3, 3) -> (..., 6) engineering shear."""
    return np.stack(
        [eps[..., 0, 0], eps[..., 1, 1], eps[..., 2, 2], 2 * eps[..., 1, 2], 2 * eps[..., 0, 2], 2 * eps[..., 0, 1]],
        axis=-1,
    )
