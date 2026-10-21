"""Engine (JS, Q1 hex, engine/src/thermal) vs reference (scikit-fem) cross-check on identical grids.

For each case and mesh level: build the reference model (apref.boxcase), export a deck with the same parts, BCs and every
grid plane, solve it with `node run_engine.mjs` (nice 10), then report
(1) grid identity, (2) node-by-node |T_engine - T_ref,Q1| on the identical grid (code verification: same element, same
mesh), (3) the case quantities from the engine field vs the converged reference (results/<case>-skfem.json, Q2
Richardson) and vs the closed form (L4 expected), with apref.compare verdicts (tier A, global, rel 1e-3).
Engine outputs are solver outputs: written under logs/ (not committed); the summary goes to results/engine-xcheck-thermal.json.

Usage: uv run --no-sync python engine_xcheck/xcheck_thermal.py [case ...]
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
sys.path.insert(0, str(HERE.parent / "scripts"))

import ref_thermal_a as RT  # noqa: E402
import ref_xb as RX  # noqa: E402

from apref import boxcase as bc  # noqa: E402
from apref import compare, l4, record  # noqa: E402

OUT = record.LOGS / f"engine-xcheck-{record.stamp()}"
E = l4.expected()


def ref_value(case, path_fn):
    d = json.loads((record.RESULTS / f"{case}-skfem.json").read_text())["results"]
    return path_fn(d)


def q2_ext(qname, variant=None):
    def f(d):
        node = d[variant] if variant else d
        c = node["convergence"]["q2"][qname]
        return c["f_ext"] if c.get("f_ext") is not None else c["f_fine"]
    return f


def to_engine_bcs(bcs, ta3_hw=None):
    out = []
    for b in bcs:
        t = b["type"]
        sel = b["selection"]
        if t == "adiabatic":
            continue
        if b.get("rect_mm") is not None:
            sel = "bottom:src"
        if t == "flux":
            e = {"selection": sel, "type": "heat_flux"}
            e.update({"power_W": b["power_W"]} if "power_W" in b else {"q_W_m2": b["q_W_m2"]})
        elif t == "htc":
            e = {"selection": sel, "type": "htc", "h_W_m2K": b["h_W_m2K"], "T_inf_C": b["T_inf_C"]}
        elif t == "temperature" and "T_expr" in b:
            e = {"selection": sel, "type": "temperature_field", "T_C": b["T_expr"], "origin": "model"}
        elif t == "temperature":
            e = {"selection": sel, "type": "temperature", "T_C": b["T_C"]}
        else:
            raise ValueError(t)
        out.append(e)
    return out


def deck_for(case, m, ta3_hw=None):
    parts = [dict(p) for p in case["parts"]]
    if ta3_hw is not None:  # TA3: the flux patch as a same-material source column inside the plate
        p0 = parts[0]
        parts.append({**p0, "id": "src", "w_mm": 2 * ta3_hw, "d_mm": 2 * ta3_hw, "in": p0["id"]})
    k = {key: (v["k_W_mK"] if not isinstance(v["k_W_mK"], list) else v["k_W_mK"]) for key, v in case["materials"].items()}
    th = case["thermal"]
    return {"parts": parts, "symmetry": case.get("geometry", {}).get("symmetry", "none"), "k_W_mK": k,
            "planes": {"x_mm": (m.xs * 1e3).tolist(), "y_mm": (m.ys * 1e3).tolist(), "z_um": (m.zs * 1e6).tolist()},
            "thermal": {"sources": th.get("sources", []), "bcs": to_engine_bcs(th["bcs"], ta3_hw)}, "solver": "direct"}


def run_engine(name, deck):
    OUT.mkdir(parents=True, exist_ok=True)
    dp, op = OUT / f"{name}-deck.json", OUT / f"{name}-engine.json"
    dp.write_text(json.dumps(deck))
    t0 = time.perf_counter()
    subprocess.run(["nice", "-n", "10", "node", str(HERE / "run_engine.mjs"), str(dp), str(op)], check=True)
    return json.loads(op.read_text()), time.perf_counter() - t0


def engine_on_ref_basis(eng, m, basis):
    """Engine nodal T (C) mapped onto the reference Q1 DOFs (identical grid)."""
    xs, ys, zs = (np.asarray(eng["grid"][k]) for k in ("xs", "ys", "zs"))
    P = basis.doflocs
    i = np.argmin(np.abs(P[0][:, None] - xs[None]), axis=1)
    j = np.argmin(np.abs(P[1][:, None] - ys[None]), axis=1)
    k = np.argmin(np.abs(P[2][:, None] - zs[None]), axis=1)
    T = np.asarray([np.nan if v is None else v for v in eng["fields"]["T_K"]], dtype=float)
    return T[i + xs.size * (j + ys.size * k)] - 273.15


def case_specs():
    """name -> (case, quantity fn(m, r) on a Q1 result dict, reference getters, closed-form values, levels, ta3_hw)."""
    specs = {}
    for v in ("TA1", "TA2"):
        rc = 1e-5 if v == "TA2" else None
        ztop = (2825 + (1 if rc else 0)) * 1e-6
        specs[v] = (RT.ta1_case(rc),
                    lambda m, r, zt=ztop: {"T_bottom_C": float(RT.T_at(r, [1e-3, 1e-3, 0.0])[0]), "T_top_C": float(RT.T_at(r, [1e-3, 1e-3, zt])[0])},
                    {"T_bottom_C": E[v]["T_bottom_C"], "T_top_C": E[v]["T_top_C"]},
                    {"T_bottom_C": E[v]["T_bottom_C"], "T_top_C": E[v]["T_top_C"]}, [1], None)
    for v in ("a", "b"):
        vv, sp, hw, case = RT.ta3_case(v)
        Q, Ti = sp["total_W"], vv["bcs"][0]["T_inf_C"]
        specs[f"TA3{v}"] = (case,
                            lambda m, r, Q=Q, Ti=Ti, hw=hw: {"R_total_max_K_W": (float(RT.T_at(r, [0, 0, 0])[0]) - Ti) / Q,
                                                              "R_total_avg_K_W": (RT.face_avg(m, r, "bottom:plate", [-hw, hw, -hw, hw]) - Ti) / Q},
                            {"R_total_max_K_W": ref_value(f"TA3{v}", q2_ext("R_total_max_K_W")),
                             "R_total_avg_K_W": ref_value(f"TA3{v}", q2_ext("R_total_avg_K_W"))},
                            {"R_total_max_K_W": E["TA3"][v]["R_total_max_K_W"], "R_total_avg_K_W": E["TA3"][v]["R_total_avg_K_W"]},
                            [1, 2], hw)
    specs["TA4"] = (RT.ta4_case(), None, {"q_per_theta_W_K": ref_value("TA4", q2_ext("q_per_theta_W_K"))},
                    {"q_per_theta_W_K": E["TA4"]["q_per_theta_W_K"]}, [1, 2], None)
    specs["TA6"] = (RT.ta6_case(None), lambda m, r: {"T_centre_C": float(RT.T_at(r, [0.0, 0.0, 0.5e-3])[0])},
                    {"T_centre_C": 55.0}, {"T_centre_C": 55.0}, [1], None)
    specs["XB4"] = (RX.xb4_case(), lambda m, r: {"T_max_C": float(RT.T_at(r, [0.0, 0.0, 0.0])[0]),
                                                 "R_th_avg_K_W": (RT.face_avg(m, r, "bottom:die") - 25) / 100},
                    {"T_max_C": ref_value("XB4", q2_ext("T_max_C")), "R_th_avg_K_W": ref_value("XB4", q2_ext("R_th_avg_K_W"))},
                    {}, [1, 2], None)
    specs["XB5"] = (RX.xb5_case(100.0, 50.0), lambda m, r: {"Tj_a_C": float(RT.T_at(r, RX.XB5_PROBES["a"])[0]),
                                                            "Tj_b_C": float(RT.T_at(r, RX.XB5_PROBES["b"])[0])},
                    {"Tj_a_C": ref_value("XB5", q2_ext("Tj_a_C")), "Tj_b_C": ref_value("XB5", q2_ext("Tj_b_C"))},
                    {}, [1, 2], None)
    return specs


def main(names):
    log = record.Log("engine-xcheck-thermal")
    specs = case_specs()
    names = names or list(specs)
    rows = []
    for name in names:
        case, qfn, refv, closed, levels, hw = specs[name]
        for lev in levels:
            m = bc.build_model(case, lev)
            r = bc.solve_thermal(m, "q1")
            eng, wall = run_engine(f"{name}-r{lev}", deck_for(case, m, hw))
            gx = max(np.abs(np.asarray(eng["grid"][a]) - b).max() if len(eng["grid"][a]) == b.size else np.inf
                     for a, b in (("xs", m.xs), ("ys", m.ys), ("zs", m.zs)))
            Te = engine_on_ref_basis(eng, m, r["basis"])
            dmax = float(np.nanmax(np.abs(Te - r["T"])))
            rng = float(np.ptp(r["T"])) or 1.0
            re = dict(r, T=Te)
            if name == "TA4":
                # convective outflow (= heat in through the Dirichlet base); engine components_W are full-model values
                qe = {"q_per_theta_W_K": eng["derived"]["components_W"]["htc_out"] / 50.0}
                qr = {"q_per_theta_W_K": r["heat_out_robin_W"] * m.mirror_factor / 50.0}
            else:
                qe, qr = qfn(m, re), qfn(m, r)
            for q, ve in qe.items():
                row = {"case": name, "level": lev, "quantity": q, "engine_q1": ve, "ref_q1_same_grid": qr[q],
                       "ref_converged": refv.get(q), "closed_form": closed.get(q), "grid_max_dx_m": gx,
                       "node_max_dT_K": dmax, "node_max_dT_rel_range": dmax / rng, "dof": int(r["dof"]),
                       "runtime_s": round(wall, 2), "engine_balance_rel": eng["derived"].get("balance_rel")}
                if refv.get(q) is not None:
                    row["vs_ref"] = compare.compare_scalar(ve, refv[q], "A", "global")
                if closed.get(q) is not None:
                    row["vs_closed"] = compare.compare_scalar(ve, closed[q], "A", "global")
                rows.append(row)
                log(f"{name} r{lev} {q}: engine {ve:.10g} | ref Q1 same grid {qr[q]:.10g} | ref conv {refv.get(q)} | "
                    f"closed {closed.get(q)} | node max dT {dmax:.2e} K ({dmax / rng:.1e} of range) | grid dx {gx:.1e} m")
    p = record.RESULTS / "engine-xcheck-thermal.json"
    p.write_text(json.dumps(record.strip_volatile(record._clean({"engine_outputs": "logs/engine-xcheck-<stamp>/", "rows": rows})), indent=1) + "\n")
    log(f"done -> {p.name}; engine decks/results in logs/{OUT.name}")


if __name__ == "__main__":
    main(sys.argv[1:])
