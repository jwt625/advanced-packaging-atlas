"""Small-mesh gates for the reference solvers (R6 section 4.1): patch tests, free expansion, linear-T exactness,
energy balance, convergence helpers, comparison helper."""

import json

import numpy as np
import pytest
from skfem import MeshHex, MeshTet

from apref import boxcase as bc
from apref import compare, convergence, fem
from apref.materials import make_material, rot_z, rotate_stiffness, stiffness_cubic


def distorted(mesh, amp=0.12, seed=1):
    rng = np.random.default_rng(seed)
    p = mesh.p.copy()
    inner = np.all((p > 1e-12) & (p < 1 - 1e-12), axis=0)
    p[:, inner] += amp / 3 * rng.uniform(-1, 1, (3, inner.sum()))
    return type(mesh)(p, mesh.t)


MESHES = {
    "q1": lambda: distorted(MeshHex.init_tensor(*[np.linspace(0, 1, 4)] * 3)),
    "q2s": lambda: distorted(MeshHex.init_tensor(*[np.linspace(0, 1, 4)] * 3)),
    "q2": lambda: distorted(MeshHex.init_tensor(*[np.linspace(0, 1, 4)] * 3)),
    "p1": lambda: distorted(MeshTet.init_tensor(*[np.linspace(0, 1, 4)] * 3)),
    "p2": lambda: distorted(MeshTet.init_tensor(*[np.linspace(0, 1, 4)] * 3)),
}


@pytest.mark.parametrize("elem", list(MESHES))
def test_mech_patch(elem):
    mesh = MESHES[elem]()
    basis = fem.make_basis(mesh, elem)
    C = rotate_stiffness(stiffness_cubic(165.7e9, 63.9e9, 79.6e9), rot_z(30))  # Si-like cubic constants, rotated
    K, f = fem.assemble_elastic(basis, np.repeat(C[None], mesh.t.shape[1], 0), None)
    G = np.array([[1e-3, 2e-4, -3e-4], [5e-4, -2e-3, 1e-4], [0, 3e-4, 1.5e-3]])
    U = (G @ basis.doflocs).T.ravel()
    D = 3 * basis.get_dofs(mesh.boundary_facets()).all()
    D = np.concatenate([D, D + 1, D + 2])
    u, _ = fem.solve_dirichlet(K, f, D, U[D])
    assert np.abs(u - U).max() < 1e-12 * np.abs(U).max() * 1e3
    pts = np.array([[0.31, 0.52, 0.47], [0.6, 0.2, 0.7]]).T
    eps, _, _ = fem.strain_at(basis, u, pts)
    ex = np.array([G[0, 0], G[1, 1], G[2, 2], G[1, 2] + G[2, 1], G[0, 2] + G[2, 0], G[0, 1] + G[1, 0]])
    assert np.abs(eps - ex).max() < 1e-10


@pytest.mark.parametrize("elem", list(MESHES))
def test_thermal_patch_aniso_rotated(elem):
    mesh = MESHES[elem]()
    basis = fem.make_basis(mesh, elem)
    k = make_material("a", {"k_W_mK": [10, 50, 148], "frame": {"rot_z_deg": 30}}).k
    K = fem.assemble_conduction(basis, np.repeat(k[None], mesh.t.shape[1], 0))
    Tex = 25 + 1e4 * basis.doflocs[0] + 2e4 * basis.doflocs[1] + 3e4 * basis.doflocs[2]
    D = basis.get_dofs(mesh.boundary_facets()).all()
    T, _ = fem.solve_dirichlet(K, np.zeros(basis.N), D, Tex[D])
    assert np.abs(T - Tex).max() < 1e-9


def box(material, sym="none", **kw):
    return {"schema": "ap-ref-box/0", "id": "t", "geometry": {"symmetry": sym}, "materials": {"m": material},
            "parts": [{"id": "b", "kind": "die", "material": "m", "x_mm": 0, "y_mm": 0, "w_mm": 2, "d_mm": 3, "z_um": 0,
                       "h_um": 500}], "mesh": {"max_xy_mm": 1, "max_z_um": 250}, **kw}


@pytest.mark.parametrize("sym,sup", [("none", "rigid_motion"), ("quarter", "symmetry"), ("half_x", "symmetry")])
def test_free_expansion_zero_stress_and_reaction(sym, sup):
    mat = {"elastic": {"type": "ortho", "Ex_GPa": 20, "Ey_GPa": 25, "Ez_GPa": 8, "nuxy": 0.2, "nuyz": 0.3, "nuxz": 0.25,
                       "Gxy_GPa": 8, "Gyz_GPa": 3, "Gxz_GPa": 3.5}, "cte": {"alpha_ppmK": [11, 13, 40]}}
    c = box(mat, sym, mechanics={"stress_free_C": 150, "temperature": {"uniform_C": 25}, "supports": sup})
    m = bc.build_model(c)
    r = bc.solve_mech(m, "q2s")
    s = bc.stress_at(m, r, np.array([[0.3e-3], [0.4e-3], [0.2e-3]]))
    assert np.abs(s["stress"]).max() < 1e-6 * 20e9 * 40e-6 * 125
    assert r["reaction_rel"] < 1e-10
    assert s["strain"][0, 2] == pytest.approx(40e-6 * -125, rel=1e-10)


def test_secant_rebase_constant_alpha():
    m = make_material("x", {"cte": {"alpha_ppmK": 17.0, "Tref_C": 20.0}})
    e = m.thermal_strain(np.array([260.0]), 150.0)[0]
    assert e[0, 0] == pytest.approx(17e-6 * 110 / (1 + 17e-6 * 130), rel=1e-12)


def test_thermal_1d_and_balance():
    c = box({"k_W_mK": 100.0}, "quarter", thermal={"bcs": [
        {"selection": "bottom:b", "type": "flux", "power_W": 6.0},
        {"selection": "top:b", "type": "htc", "h_W_m2K": 1e4, "T_inf_C": 20},
        {"selection": "default", "type": "adiabatic"}]})
    m = bc.build_model(c)
    for el in ("q1", "q2"):
        r = bc.solve_thermal(m, el)
        q = 6.0 / 6e-6
        assert r["Tmax_C"] == pytest.approx(20 + q / 1e4 + q * 0.5e-3 / 100, rel=1e-12)
        assert abs(r["balance_rel"]) < 1e-10


def test_convergence_helpers():
    h = [1.0, 0.5, 0.25]
    f = [1 + 0.3 * x**2 for x in h]
    c = convergence.richardson(f, h)
    assert c["p_obs"] == pytest.approx(2.0, abs=1e-8)
    assert c["f_ext"] == pytest.approx(1.0, abs=1e-12)
    h2 = [1.0, 0.6, 0.35]
    f2 = [2 - 0.1 * x**3 for x in h2]
    assert convergence.observed_order(f2, h2) == pytest.approx(3.0, abs=1e-6)


def test_compare_helper(tmp_path):
    xs, ys, zs = np.linspace(0, 1e-3, 3), np.linspace(0, 2e-3, 4), np.linspace(0, 5e-4, 2)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    T = (300 + 1e4 * X + 2e4 * Y + 3e4 * Z)  # node n = i + nx1 (j + ny1 k): ravel in (k, j, i) order
    eng = {"grid": {"xs": xs.tolist(), "ys": ys.tolist(), "zs": zs.tolist()},
           "fields": {"T_K": np.transpose(T, (2, 1, 0)).ravel().tolist()},
           "derived": {"Tmax_C": {"value": 145.4}, "warpage_um": {"value": -180.0}}}
    pts = np.array([[0.3e-3, 0.7e-3, 0.1e-3], [0.9e-3, 1.9e-3, 0.4e-3]]).T
    vals = compare.sample_engine(eng, "T_K", pts)
    assert vals == pytest.approx(300 + 1e4 * pts[0] + 2e4 * pts[1] + 3e4 * pts[2], rel=1e-14)
    smp = tmp_path / "s.json"
    smp.write_text(json.dumps({"points_m": pts.tolist(), "values": (vals - 273.15).tolist()}))
    ref = {"results": {"T": 145.36469}}
    rows = [{"engine": "derived.Tmax_C.value", "reference": "results.T", "tier": "A", "qclass": "global"},
            {"engine": "derived.warpage_um.value", "reference": -189.0, "tier": "C", "qclass": "warpage"},
            {"engine": "derived.warpage_um.value", "reference": 150.0, "tier": "D", "qclass": "warpage"},
            {"engine_field": "T_K", "offset": -273.15, "reference_samples": str(smp), "tier": "B", "qclass": "field"}]
    out = compare.run(eng, ref, rows)
    assert out[0]["pass"] and out[1]["pass"] and not out[2]["pass"] and out[3]["pass"]
    assert out[2]["sign_match"] is False


def test_reference_samples_roundtrip():
    c = box({"k_W_mK": 100.0}, "none", thermal={"bcs": [
        {"selection": "face:x-", "type": "temperature", "T_C": 10.0},
        {"selection": "face:x+", "type": "temperature", "T_C": 30.0},
        {"selection": "default", "type": "adiabatic"}]})
    m = bc.build_model(c)
    r = bc.solve_thermal(m, "q2")
    pts = compare.sampling_points(m.mesh.p.min(axis=1), m.mesh.p.max(axis=1), (5, 3, 2))
    smp = compare.reference_samples(r["basis"], r["T"], pts)
    ex = 10 + 20 * (pts[0] + 1e-3) / 2e-3
    assert np.abs(np.asarray(smp["values"]) - ex).max() < 1e-10
