"""Engine mechanics (engine/src/mech: q2s, q1im) vs reference (scikit-fem Q2s) on identical grids.

Per case and level: reference model (apref.boxcase) -> deck with the same parts and every grid plane -> node
run_engine_mech.mjs (nice 10). Reported:
(1) engine q2s vs reference Q2s corner-node displacements after removing the best-fit rigid motion of the difference
    (the two codes pick different 3-2-1 / pinned points): max |du| / max |u| (same element, same mesh);
(2) curvature kappa_clt (engine corner-node fit, reference all-node fit), point stresses, vs the converged reference
    (results/<case>-skfem.json) and the closed form (L4 expected), apref.compare tier A verdicts.
Engine outputs -> logs/engine-xcheck-mech-<stamp>/; summary -> results/engine-xcheck-mech.json.

Usage: uv run --no-sync python engine_xcheck/xcheck_mech.py [case ...]
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from apref import boxcase as bc  # noqa: E402
from apref import compare, fem, l4, record  # noqa: E402

OUT = record.LOGS / f"engine-xcheck-mech-{record.stamp()}"
E = l4.expected()
SET = l4.tier_a_materials()


def ref_conv(case, q, path=()):
    d = json.loads((record.RESULTS / f"{case}-skfem.json").read_text())["results"]
    for p in path:
        d = d[p]
    c = d["convergence"]["q2s"][q]
    return c["f_ext"] if c.get("f_ext") is not None else c["f_fine"]


def mcase(boxes, sym, mesh, mech, set_over=None):
    c = l4.boxes_to_case(boxes, "x", set_over)
    c.update({"geometry": {"symmetry": sym}, "mesh": mesh, "mechanics": mech})
    return c


def specs():
    S = {}
    y = l4.case_yaml("A/MA4")
    for v, (probes, mesh, _L) in {"a": ({"si_bottom_Pa": ("si", 0), "cu_top_Pa": ("cu", 1000)}, {"max_xy_mm": 2.0, "max_z_um": 500}, 20),
                                 "b": ({"si_bottom_Pa": ("si", 1050), "si_top_Pa": ("si", 1825), "sub_bottom_Pa": ("sub", 0)},
                                       {"max_xy_mm": 5.0, "max_z_um": 1000}, 50)}.items():
        vv = y["variants"][v]
        mech = {"stress_free_C": vv["stress_free_C"], "temperature": {"uniform_C": vv["temperature_C"]}, "supports": "symmetry"}
        exp_c = {"kappa_clt_1_m": E["MA4"][v]["kappa_1_m"], **{k: E["MA4"][v][k] for k in probes}}
        exp_r = {"kappa_clt_1_m": ref_conv(f"MA4{v}", "kappa_clt_1_m")}
        for k in probes:
            exp_r[k] = json.loads((record.RESULTS / f"MA4{v}-skfem.json").read_text())["results"]["convergence"]["q2s"][k]["f_fine"]
        S[f"MA4{v}"] = (mcase(vv["boxes"], "quarter", mesh, mech), probes, exp_r, exp_c, [1, 2])
    b3 = l4.case_yaml("A/MA3")["inputs"]["geometry"]["boxes"]
    # strips: the engine's default window (central 50 % in x and y) has one y node line on a 1 mm strip and its
    # yy fit is singular; use an explicit window: central 50 % in x, full width in y (crop coordinates)
    c3 = mcase(b3, "quarter", {"max_xy_mm": 0.5, "max_z_um": 250},
               {"stress_free_C": 125, "temperature": {"uniform_C": 25}, "supports": "symmetry"})
    c3["_region"] = {"x": [0.0, 2.5e-3], "y": [0.0, 0.5e-3]}
    S["MA3"] = (c3, {},
                {"kappa_clt_1_m": ref_conv("MA3", "kappa_clt_1_m")}, {"kappa_clt_1_m": E["MA3"]["kappa_1_m"]}, [1, 2])
    b5 = l4.case_yaml("A/MA5b")["inputs"]["geometry"]["boxes"]
    S["MA5b"] = (mcase(b5, "quarter", {"max_xy_mm": 1.0, "max_z_um": 775, "min_cells_per_layer": 1},
                       {"stress_free_C": 125, "temperature": {"uniform_C": 25}, "supports": "symmetry"}), {},
                 {"kappa_clt_1_m": ref_conv("MA5b", "kappa_clt_1_m", ("h_study",))}, {"kappa_clt_1_m": E["MA5b"]["kappa_clt_1_m"]}, [1, 2])
    b6 = l4.case_yaml("A/MA6")["inputs"]["geometry"]["boxes"]
    c6 = mcase(b6, "quarter", {"max_xy_mm": 2.5, "max_z_um": 775},
               {"stress_free_C": 25, "temperature": {"from_thermal": True}, "supports": "symmetry"})
    c6["thermal"] = {"bcs": [{"selection": "bottom:si", "type": "temperature", "T_C": 25},
                             {"selection": "top:si", "type": "temperature", "T_C": 35}, {"selection": "default", "type": "adiabatic"}]}
    S["MA6"] = (c6, {}, {"kappa_clt_1_m": E["MA6"]["kappa_1_m"]}, {"kappa_clt_1_m": E["MA6"]["kappa_1_m"]}, [1, 2])
    b1 = l4.case_yaml("A/MA1")["inputs"]["geometry"]["boxes"]
    c1 = mcase(b1, "none", {"max_xy_mm": 5, "max_z_um": 5000},
               {"stress_free_C": 25, "temperature": {"uniform_C": 125}, "supports": "rigid_motion"})
    c1["_nocurv"] = True  # free expansion: compare displacements only
    S["MA1"] = (c1, {}, {}, {}, [1, 2])
    for wd in (1, 10):
        bx = [dict(b, d_mm=wd) for b in b3]
        cx = mcase(bx, "quarter", {"max_xy_mm": 0.5, "max_z_um": 250},
                   {"stress_free_C": 125, "temperature": {"uniform_C": 25}, "supports": "symmetry"})
        if wd < 5:
            cx["_region"] = {"x": [0.0, 2.5e-3], "y": [0.0, wd / 2 * 1e-3]}
        S[f"XB1-w{wd}"] = (cx, {},
                           {"kappa_clt_1_m": json.loads((record.RESULTS / "XB1-skfem.json").read_text())["results"][f"w{wd}mm"]["runs"][-1]["q"]["kappa_x_clt_1_m"]},
                           {}, [1])
    for L in (50, 120):
        bx = [dict(b, w_mm=L, d_mm=L) for b in y["variants"]["b"]["boxes"]]
        xb2 = json.loads((record.RESULTS / "XB2-skfem.json").read_text())["results"][f"L{L}mm"]["runs"][-1]["q"]
        S[f"XB2-{L}"] = (mcase(bx, "quarter", {"max_xy_mm": L / 10, "max_z_um": 1000},
                               {"stress_free_C": 150, "temperature": {"uniform_C": 25}, "supports": "symmetry"}), {},
                         {"kappa_clt_1_m": xb2["kappa_centre_clt_1_m"], "coplanarity_top_m": xb2["coplanarity_top_m"]}, {}, [1, 2])
    return S


def deck(case, m, element, probes):
    mech = case["mechanics"]
    set_ = {}
    for p in case["parts"]:
        set_[p["material"]] = dict(SET[p["material"]])
    d = {"parts": case["parts"], "symmetry": case["geometry"]["symmetry"], "set": set_, "element": element,
         "planes": {"x_mm": (m.xs * 1e3).tolist(), "y_mm": (m.ys * 1e3).tolist(), "z_um": (m.zs * 1e6).tolist()},
         "supports": mech["supports"], "stress_free_C": {"default": mech["stress_free_C"]},
         "curvature": [] if case.get("_nocurv") else
         [{"z_m": float(m.zs[0]), "frac": 0.5, **({"region": case["_region"]} if "_region" in case else {})}],
         "warpage": [],
         "probes": [{"name": k, "part": pid, "xyz_m": [0.0, 0.0, z * 1e-6]} for k, (pid, z) in probes.items()]}
    if "uniform_C" in mech["temperature"]:
        d["temperature"] = {"uniform_C": mech["temperature"]["uniform_C"]}
    else:
        d["thermal"] = {"bcs": [b for b in case["thermal"]["bcs"] if b["type"] != "adiabatic"]}
        d["k_W_mK"] = {k: SET[k]["k_W_mK"] for k in set_}
    return d


def run_node(name, dk):
    OUT.mkdir(parents=True, exist_ok=True)
    dp, op = OUT / f"{name}-deck.json", OUT / f"{name}-engine.json"
    dp.write_text(json.dumps(dk))
    t0 = time.perf_counter()
    subprocess.run(["nice", "-n", "10", "node", str(HERE / "run_engine_mech.mjs"), str(dp), str(op)], check=True)
    return json.loads(op.read_text()), time.perf_counter() - t0


def rigid_free_diff(P, ue, ur):
    """max |(ue - ur) - best-fit rigid motion| / max |ur| over corner nodes; P (3, n), u (n, 3)."""
    Bm = fem.rigid_body_modes(P)
    d = (ue - ur).ravel()
    c, *_ = np.linalg.lstsq(Bm, d, rcond=None)
    return float(np.abs(d - Bm @ c).max() / max(np.abs(ur).max(), 1e-300))


def main(names):
    log = record.Log("engine-xcheck-mech")
    S = specs()
    rows = []
    for name in names or list(S):
        case, probes, exp_r, exp_c, levels = S[name]
        if "_nocurv" in case:
            case = {k: v for k, v in case.items()}
        for lev in levels:
            m = bc.build_model(case, lev)
            th = bc.solve_thermal(m, "q1") if "thermal" in case else None
            r = bc.solve_mech(m, "q2s", thermal=th)
            if th is not None:
                r["thermal"] = th
            basis = r["basis"]
            vd = basis.nodal_dofs[0]  # scalar DOF of each mesh vertex
            P = m.mesh.p
            ur = r["u"].reshape(-1, 3)[vd]
            q_ref = {}
            if not case.get("_nocurv"):
                cf = bc.curvature_fit(m, r, f"bottom:{m.parts[0]['id']}", 0.5)
                q_ref["kappa_clt_1_m"] = float(-cf["d2w_dx2"])
            for k, (pid, z) in probes.items():
                part = next(pp for pp in m.parts if pp["id"] == pid)
                side = 1 if abs(part["z_um"] - z) < 1e-9 else -1  # nudge into the named part
                q_ref[k] = float(bc.stress_at(m, r, np.array([[0.0], [0.0], [z * 1e-6]]), np.array([[0], [0], [side * 1e-9]]))["stress"][0, 0])
            for element in ("q2s", "q1im"):
                eng, wall = run_node(f"{name}-r{lev}-{element}", deck(case, m, element, probes))
                xs, ys, zs = (np.asarray(eng["grid"][a]) for a in ("xs", "ys", "zs"))
                gdx = max(float(np.abs(xs - m.xs).max()), float(np.abs(ys - m.ys).max()), float(np.abs(zs - m.zs).max()))
                i = np.argmin(np.abs(P[0][:, None] - xs[None]), 1)
                j = np.argmin(np.abs(P[1][:, None] - ys[None]), 1)
                k = np.argmin(np.abs(P[2][:, None] - zs[None]), 1)
                n = i + xs.size * (j + ys.size * k)
                ue = np.asarray(eng["fields"]["u_m"]).reshape(-1, 3)[n]
                du = rigid_free_diff(P, ue, ur)
                q_eng = {"u_rel_diff": du} if case.get("_nocurv") else {"kappa_clt_1_m": eng["derived"]["curvature"][0]["kappa_clt_x_1_m"]}
                for pr in eng["probes"]:
                    q_eng[pr["name"]] = pr["sigma_Pa"][0]
                for q, ve in q_eng.items():
                    row = {"case": name, "level": lev, "element": element, "quantity": q, "engine": ve,
                           "ref_q2s_same_grid": q_ref.get(q), "ref_converged": exp_r.get(q), "closed_form": exp_c.get(q),
                           "grid_max_dx_m": gdx, "u_rel_diff_vs_ref_q2s_rigid_removed": du, "dof_ref": int(r["dof"]),
                           "dof_engine": eng.get("dof"), "runtime_s": round(wall, 2)}
                    if exp_r.get(q) is not None:
                        row["vs_ref"] = compare.compare_scalar(ve, exp_r[q], "A", "global" if "kappa" in q else "point_stress")
                    if exp_c.get(q) is not None:
                        row["vs_closed"] = compare.compare_scalar(ve, exp_c[q], "A", "global" if "kappa" in q else "point_stress")
                    rows.append(row)
                    log(f"{name} r{lev} {element} {q}: engine {ve:.9g} | ref Q2s same grid {q_ref.get(q)} | ref conv "
                        f"{exp_r.get(q)} | closed {exp_c.get(q)} | u diff (rigid removed) {du:.2e} | dof {eng.get('dof')} | grid dx {gdx:.1e}")
    p = record.RESULTS / "engine-xcheck-mech.json"
    p.write_text(json.dumps(record.strip_volatile(record._clean({"engine_outputs": "logs/engine-xcheck-mech-<stamp>/", "rows": rows})), indent=1) + "\n")
    log(f"done -> {p.name}")


if __name__ == "__main__":
    main(sys.argv[1:])
