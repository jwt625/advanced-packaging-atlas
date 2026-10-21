"""Tier-A expected values for the thermal and thermo-elastic validation cases.

Recomputes every closed-form target of validation/cases/A/*.yaml from the formulas in
DevLog/research/2026-10-20-sim-validation-set.md (R6) section 1. Stdlib only.

Run:  uv run --no-project python validation/expected/tier_a.py [--json validation/expected/tier_a_values.json]

Units: SI inside (m, K, W, Pa); printed values carry their unit in the key name.
Sign: z up, layer 1 at the bottom; curvature kappa > 0 means the centre is higher than the edges
(dome, top surface convex) for w(x, y) = -kappa (x^2 + y^2) / 2 + const ... see `sag_note`.
"""

from __future__ import annotations

import argparse
import json
import math

# R6 section 1 synthetic material set (isotropic; not real material data).
MAT = {
    "si_iso": {"E": 130e9, "nu": 0.28, "alpha": 2.6e-6, "k": 148.0, "rho": 2330.0, "cp": 705.0},
    "cu": {"E": 110e9, "nu": 0.34, "alpha": 17e-6, "k": 390.0},
    "uf": {"E": 8e9, "nu": 0.35, "alpha": 30e-6},
    "sub": {"E": 25e9, "nu": 0.30, "alpha": 15e-6},
    "tim": {"k": 5.0},
    "al": {"k": 200.0},
}


def q_biax(E: float, nu: float) -> float:
    return E / (1.0 - nu)


# ---------------------------------------------------------------- CLT (equibiaxial, isotropic layers)
def clt(layers: list[dict], dT: float) -> dict:
    """layers bottom to top: {t, E, nu, alpha}. Free plate, uniform dT, equibiaxial state.

    Returns eps0 (mid-plane strain at z = 0, the bottom face), kappa, and per-layer stresses at
    bottom/top of each layer: sigma = Q (eps0 + kappa z - alpha dT). kappa here is d(eps)/dz;
    kappa > 0 means the top fibre is longer: top surface convex, centre high (dome) for z up.
    """
    z = [0.0]
    for L in layers:
        z.append(z[-1] + L["t"])
    A = B = D = NT = MT = 0.0
    for i, L in enumerate(layers):
        Q = q_biax(L["E"], L["nu"])
        z0, z1 = z[i], z[i + 1]
        A += Q * (z1 - z0)
        B += Q * (z1**2 - z0**2) / 2.0
        D += Q * (z1**3 - z0**3) / 3.0
        NT += Q * L["alpha"] * dT * (z1 - z0)
        MT += Q * L["alpha"] * dT * (z1**2 - z0**2) / 2.0
    det = A * D - B * B
    eps0 = (D * NT - B * MT) / det
    kappa = (A * MT - B * NT) / det
    stresses = []
    forces = []
    for i, L in enumerate(layers):
        Q = q_biax(L["E"], L["nu"])
        sb = Q * (eps0 + kappa * z[i] - L["alpha"] * dT)
        st = Q * (eps0 + kappa * z[i + 1] - L["alpha"] * dT)
        stresses.append((sb, st))
        forces.append((sb + st) / 2.0 * (z[i + 1] - z[i]))  # linear in z: exact integral
    return {"eps0": eps0, "kappa": kappa, "z": z, "stresses": stresses, "forces": forces}


def sag(kappa: float, span: float) -> float:
    """Centre-to-end height difference over a span (chord) of length `span`: kappa (span/2)^2 / 2."""
    return kappa * span**2 / 8.0


# ---------------------------------------------------------------- thermal
def ta1(rc: float = 0.0) -> dict:
    A = 10e-3 * 10e-3
    Q = 100.0
    R_si = 0.775e-3 / (MAT["si_iso"]["k"] * A)
    R_tim = 50e-6 / (MAT["tim"]["k"] * A)
    R_cu = 2e-3 / (MAT["cu"]["k"] * A)
    R_conv = 1.0 / (1e4 * A)
    R_c = rc / A
    R_tot = R_si + R_tim + R_cu + R_conv + R_c
    T_amb = 25.0
    # temperatures at interfaces (from the top down)
    T_cu_top = T_amb + Q * R_conv
    T_cu_bot = T_cu_top + Q * R_cu
    T_tim_top = T_cu_bot + Q * R_c
    T_tim_bot = T_tim_top + Q * R_tim
    T_bot = T_tim_bot + Q * R_si
    return {
        "R_si_K_W": R_si, "R_tim_K_W": R_tim, "R_cu_K_W": R_cu, "R_conv_K_W": R_conv, "R_c_K_W": R_c,
        "R_tot_K_W": R_tot, "T_bottom_C": T_bot, "T_si_tim_C": T_tim_bot, "T_tim_cu_lower_C": T_tim_top,
        "T_tim_cu_upper_C": T_cu_bot, "T_top_C": T_cu_top, "jump_K": Q * R_c, "heat_out_W": Q,
    }


def lee_spreading(k: float, A_s: float, A_p: float, t: float, h: float) -> dict:
    a = math.sqrt(A_s / math.pi)
    b = math.sqrt(A_p / math.pi)
    eps = a / b
    tau = t / b
    Bi = h * b / k
    lam = math.pi + 1.0 / (math.sqrt(math.pi) * eps)
    th = math.tanh(lam * tau)
    phi = (th + lam / Bi) / (1.0 + (lam / Bi) * th)
    psi_max = eps * tau / math.sqrt(math.pi) + (1.0 - eps) * phi / math.sqrt(math.pi)
    psi_avg = (1.0 - eps) ** 1.5 * phi / 2.0
    R_max = psi_max / (math.sqrt(math.pi) * k * a)
    R_avg = psi_avg / (math.sqrt(math.pi) * k * a)
    R_1d = t / (k * A_p)
    R_conv = 1.0 / (h * A_p)
    return {"a_m": a, "b_m": b, "eps": eps, "tau": tau, "Bi": Bi, "lambda_c": lam, "phi_c": phi,
            "R_sp_max_K_W": R_max, "R_sp_avg_K_W": R_avg, "R_1d_K_W": R_1d, "R_conv_K_W": R_conv,
            "R_total_max_K_W": R_max + R_1d + R_conv, "R_total_avg_K_W": R_avg + R_1d + R_conv}


def ta3() -> dict:
    # (a) Electronics Cooling 1998-01 example: Al k 200, 100 x 100 x 1.3 mm base, 25 x 25 mm source, R0 = 1.0 K/W
    A_p = 0.1 * 0.1
    a_case = lee_spreading(200.0, 0.025**2, A_p, 1.3e-3, 1.0 / (1.0 * A_p))
    # (b) die-on-lid: 25 x 25 mm source on cu 50 x 50 x 2 mm, h = 5000 W/m2K
    b_case = lee_spreading(MAT["cu"]["k"], 0.025**2, 0.05**2, 2e-3, 5000.0)
    return {"a": a_case, "b": b_case}


def ta4() -> dict:
    k = MAT["al"]["k"]
    t, w, L, h = 1e-3, 10e-3, 20e-3, 50.0
    P = 2.0 * (w + t)
    Ac = w * t
    m = math.sqrt(h * P / (k * Ac))
    M = math.sqrt(h * P * k * Ac)  # per K of theta_b
    r = h / (m * k)
    q_conv = M * (math.sinh(m * L) + r * math.cosh(m * L)) / (math.cosh(m * L) + r * math.sinh(m * L))
    q_adia = M * math.tanh(m * L)
    A_fin = P * L + Ac
    eta = q_conv / (h * A_fin)
    return {"m_1_m": m, "mL": m * L, "q_per_theta_W_K": q_conv, "q_per_theta_adiabatic_tip_W_K": q_adia,
            "efficiency": eta}


def ta5() -> dict:
    s = MAT["si_iso"]
    alpha = s["k"] / (s["rho"] * s["cp"])
    x, t = 0.5e-3, 1e-3
    Ti, Ts = 25.0, 125.0
    eta = x / (2.0 * math.sqrt(alpha * t))
    theta = math.erf(eta)  # (T - Ts) / (Ti - Ts)
    T = Ts + (Ti - Ts) * theta
    qf = 1e6
    rise = 2.0 * qf * math.sqrt(alpha * t / math.pi) / s["k"]
    depth_min = 4.0 * math.sqrt(alpha * t)
    return {"alpha_m2_s": alpha, "eta": eta, "theta": theta, "T_C": T, "flux_surface_rise_K": rise,
            "depth_min_m": depth_min}


def ta6() -> dict:
    # T = a + b x + c y + d z on a 1 mm cube; any constant (anisotropic, rotated) k: div(k grad T) = 0.
    a, b, c, d = 25.0, 1.0e4, 2.0e4, 3.0e4  # C, K/m
    pts = {"centre": (0.5e-3, 0.5e-3, 0.5e-3), "corner_max": (1e-3, 1e-3, 1e-3)}
    return {"coef": {"a_C": a, "b_K_m": b, "c_K_m": c, "d_K_m": d},
            "T_at": {n: a + b * p[0] + c * p[1] + d * p[2] for n, p in pts.items()}}


# ---------------------------------------------------------------- mechanical
def ma1() -> dict:
    s = MAT["si_iso"]
    dT = 100.0
    eps = s["alpha"] * dT
    return {"eps": eps, "u_at_5mm_m": eps * 5e-3, "u_at_10mm_m": eps * 10e-3, "sigma_Pa": 0.0,
            "sigma_scale_Pa": s["E"] * s["alpha"] * dT}


def ma2() -> dict:
    c = MAT["cu"]
    dT = 100.0
    base = -c["E"] * c["alpha"] * dT
    out = {"uniaxial_Pa": base, "biaxial_Pa": base / (1 - c["nu"]), "triaxial_Pa": base / (1 - 2 * c["nu"])}
    nu2 = 0.49
    out["triaxial_nu049_Pa"] = base / (1 - 2 * nu2)
    out["biaxial_nu049_Pa"] = base / (1 - nu2)
    # biaxial: free direction strain eps_zz = alpha dT (1 + nu)/(1 - nu) ... (1 + 2 nu / (1 - nu)) alpha dT
    out["biaxial_eps_zz"] = c["alpha"] * dT * (1 + 2 * c["nu"] / (1 - c["nu"]))
    out["uniaxial_eps_lateral"] = c["alpha"] * dT * (1 + c["nu"])
    return out


def timoshenko(t1, t2, E1, E2, a1, a2, dT) -> float:
    m = t1 / t2
    n = E1 / E2
    h = t1 + t2
    return 6 * (a2 - a1) * dT * (1 + m) ** 2 / (h * (3 * (1 + m) ** 2 + (1 + m * n) * (m**2 + 1 / (m * n))))


def ma3() -> dict:
    s, c = MAT["si_iso"], MAT["cu"]
    dT = -100.0
    kap = timoshenko(0.5e-3, 0.5e-3, s["E"], c["E"], s["alpha"], c["alpha"], dT)
    # Layer 1 = si (bottom), layer 2 = cu (top). kap < 0: top (cu) side concave after cooling.
    # Wide-plate bracket: same formula with biaxial moduli Q = E / (1 - nu) (n = Q1 / Q2), valid for equibiaxial bending.
    kap_q = timoshenko(0.5e-3, 0.5e-3, q_biax(s["E"], s["nu"]), q_biax(c["E"], c["nu"]), s["alpha"], c["alpha"], dT)
    return {"kappa_1_m": kap, "abs_kappa_1_m": abs(kap), "R_m": 1 / abs(kap), "sag_L10mm_m": sag(abs(kap), 10e-3),
            "abs_kappa_plate_Q_1_m": abs(kap_q)}


def ma4() -> dict:
    s, c, uf, sub = MAT["si_iso"], MAT["cu"], MAT["uf"], MAT["sub"]
    # (a) si 0.5 bottom + cu 0.5 top, both nu = 0.28 (reduces to MA3 with Q)
    la = [{"t": 0.5e-3, "E": s["E"], "nu": 0.28, "alpha": s["alpha"]}, {"t": 0.5e-3, "E": c["E"], "nu": 0.28, "alpha": c["alpha"]}]
    ra = clt(la, -100.0)
    # (b) sub 1.0 / uf 0.05 / si 0.775 (bottom to top), stress-free 150 C, dT = -125 K, 50 x 50 mm
    lb = [dict(t=1.0e-3, **{k: sub[k] for k in ("E", "nu", "alpha")}),
          dict(t=0.05e-3, **{k: uf[k] for k in ("E", "nu", "alpha")}),
          dict(t=0.775e-3, **{k: s[k] for k in ("E", "nu", "alpha")})]
    rb = clt(lb, -125.0)
    return {
        "a": {"kappa_1_m": ra["kappa"], "eps0_bottom": ra["eps0"],
              "si_bottom_Pa": ra["stresses"][0][0], "si_top_Pa": ra["stresses"][0][1],
              "cu_bottom_Pa": ra["stresses"][1][0], "cu_top_Pa": ra["stresses"][1][1],
              "cu_force_N_m": ra["forces"][1], "si_force_N_m": ra["forces"][0]},
        "b": {"kappa_1_m": rb["kappa"], "R_m": 1 / rb["kappa"], "eps0_bottom": rb["eps0"],
              "sag_edge50_m": sag(rb["kappa"], 50e-3), "sag_diag_m": sag(rb["kappa"], 50e-3 * math.sqrt(2)),
              "sub_bottom_Pa": rb["stresses"][0][0], "sub_top_Pa": rb["stresses"][0][1],
              "uf_bottom_Pa": rb["stresses"][1][0], "uf_top_Pa": rb["stresses"][1][1],
              "si_bottom_Pa": rb["stresses"][2][0], "si_top_Pa": rb["stresses"][2][1],
              "deflection_to_thickness": sag(rb["kappa"], 50e-3) / 1.825e-3},
    }


def ma5() -> dict:
    s = MAT["si_iso"]
    Qs = q_biax(s["E"], s["nu"])
    hs, hf, sf = 775e-6, 1e-6, 100e6
    k_stoney_brantley = 6 * sf * hf / (180.5e9 * hs**2)
    k_stoney = 6 * sf * hf / (Qs * hs**2)
    # Runnable form: film = si_iso elastic constants with a CTE offset so that the film misfit stress is +100 MPa
    # at dT = -100 K: Q_f (alpha_s - alpha_f) dT = sf -> alpha_f = alpha_s + sf / (Q_f * 100).
    dT = -100.0
    alpha_f = s["alpha"] - sf / (Qs * dT)
    r = clt([{"t": hs, "E": s["E"], "nu": s["nu"], "alpha": s["alpha"]}, {"t": hf, "E": s["E"], "nu": s["nu"], "alpha": alpha_f}], dT)
    return {"kappa_stoney_brantley_1_m": k_stoney_brantley, "kappa_stoney_si_iso_1_m": k_stoney,
            "R_stoney_m": 1 / k_stoney_brantley,
            "bow_r150mm_stoney_brantley_m": k_stoney_brantley * 0.15**2 / 2,
            "alpha_film_equiv_ppmK": alpha_f * 1e6, "kappa_clt_runnable_1_m": r["kappa"],
            "bow_r150mm_clt_runnable_m": r["kappa"] * 0.15**2 / 2,
            "film_stress_clt_mid_Pa": sum(r["stresses"][1]) / 2}


def ma5b() -> dict:
    s, c = MAT["si_iso"], MAT["cu"]
    dT = -100.0
    Qs, Qf = q_biax(s["E"], s["nu"]), q_biax(c["E"], c["nu"])
    hs, hf = 775e-6, 5e-6
    sf = Qf * (s["alpha"] - c["alpha"]) * dT
    k_st = 6 * sf * hf / (Qs * hs**2)
    r = clt([{"t": hs, "E": s["E"], "nu": s["nu"], "alpha": s["alpha"]}, {"t": hf, "E": c["E"], "nu": c["nu"], "alpha": c["alpha"]}], dT)
    return {"film_stress_Pa": sf, "kappa_stoney_1_m": k_st, "kappa_clt_1_m": r["kappa"],
            "stoney_over_clt": k_st / r["kappa"], "sag_L10mm_clt_m": sag(r["kappa"], 10e-3),
            "sag_L10mm_stoney_m": sag(k_st, 10e-3)}


def ma6() -> dict:
    s = MAT["si_iso"]
    dTz, h = 10.0, 0.775e-3
    kap = s["alpha"] * dTz / h
    return {"kappa_1_m": kap, "sag_L50mm_m": sag(kap, 50e-3), "sag_diag_m": sag(kap, 50e-3 * math.sqrt(2)),
            "sigma_Pa": 0.0}


def ma7() -> dict:
    c = dict(MAT["cu"], nu=0.35)
    s = MAT["si_iso"]
    dT = 100.0
    num = ((1 + c["nu"]) * c["alpha"] - (1 + s["nu"]) * s["alpha"]) * dT
    den = (1 + c["nu"]) * (1 - 2 * c["nu"]) / c["E"] + (1 + s["nu"]) / s["E"]
    p = num / den
    a = 5e-6
    eq = s["E"] * (c["alpha"] - s["alpha"]) * dT / (2 * (1 - s["nu"]))
    out = {"p_Pa": p, "cu_srr_Pa": -p, "cu_stt_Pa": -p, "si_srr_r_a_Pa": -p, "si_stt_r_a_Pa": p,
           "si_srr_r_2a_Pa": -p * 0.25, "si_stt_r_2a_Pa": p * 0.25, "equal_constant_check_Pa": eq,
           "truncation_err_est": (a / 100e-6) ** 2}
    # Finite matrix, outer radius R traction-free (the modelled geometry). Matrix Lame: s_rr = C1 - C2/r^2,
    # s_tt = C1 + C2/r^2 with s_rr(R) = 0, s_rr(a) = -p -> C1 = p a^2 / (R^2 - a^2), C2 = C1 R^2. Continuity of u at r = a
    # with the plane-strain hoop strain of the matrix, (1 + nu2)/E2 [(1 - nu2) s_tt - nu2 s_rr] + (1 + nu2) a2 dT.
    for n_r in (10, 20, 40):
        R = n_r * a
        g = (R * R + a * a) / (R * R - a * a)
        den_f = (1 + c["nu"]) * (1 - 2 * c["nu"]) / c["E"] + (1 + s["nu"]) / s["E"] * ((1 - s["nu"]) * g + s["nu"])
        pf = num / den_f
        c1 = pf * a * a / (R * R - a * a)
        c2 = c1 * R * R
        out[f"finite_R{n_r}a"] = {"p_Pa": pf, "cu_srr_Pa": -pf, "si_srr_r_a_Pa": -pf, "si_stt_r_a_Pa": c1 + c2 / (a * a),
                                  "si_srr_r_2a_Pa": c1 - c2 / (4 * a * a), "si_stt_r_2a_Pa": c1 + c2 / (4 * a * a),
                                  "si_srr_r_1p05a_Pa": c1 - c2 / (1.1025 * a * a), "si_stt_r_1p05a_Pa": c1 + c2 / (1.1025 * a * a)}
    return out


def ma8() -> dict:
    al = (11e-6, 11e-6, 16e-6)
    dT = 100.0
    # rotated frame check: material axes rotated +30 deg about x (active R, columns = local axes in global
    # coordinates; SPEC section 12); global strain tensor eps = R diag R^T
    th = math.radians(30.0)
    cy, sy = math.cos(th), math.sin(th)
    eyy = al[1] * cy**2 + al[2] * sy**2
    ezz = al[1] * sy**2 + al[2] * cy**2
    eyz = (al[1] - al[2]) * sy * cy
    return {"eps": [a * dT for a in al], "sigma_Pa": 0.0,
            "rot30x_eps_xx": al[0] * dT, "rot30x_eps_yy": eyy * dT, "rot30x_eps_zz": ezz * dT,
            "rot30x_eps_yz_tensor": eyz * dT}


def ma9() -> dict:
    # Far-field interface force of a bilayer (Suhir structure as cited by secondary sources; coefficients
    # UNVERIFIED vs primary). Compare with the CLT layer force of MA4a (exact for the plate interior).
    s, c = MAT["si_iso"], MAT["cu"]
    nu = 0.28
    h1 = h2 = 0.5e-3
    E1, E2 = s["E"], c["E"]
    dT = -100.0
    da = c["alpha"] - s["alpha"]  # a2 - a1
    # plate flexural rigidity per layer, D = sum E h^3 / (12 (1 - nu^2))
    D = E1 * h1**3 / (12 * (1 - nu**2)) + E2 * h2**3 / (12 * (1 - nu**2))
    lam = (1 - nu) / (E1 * h1) + (1 - nu) / (E2 * h2) + (h1 + h2) ** 2 / (4 * D)
    T_inf = da * dT / lam
    # Same structure with the equibiaxial plate rigidity D_i = E h^3 / (12 (1 - nu)) = Q h^3 / 12 (consistent with
    # the (1 - nu)/(E h) in-plane terms): reduces exactly to the Timoshenko/CLT interface force.
    D_b = E1 * h1**3 / (12 * (1 - nu)) + E2 * h2**3 / (12 * (1 - nu))
    lam_b = (1 - nu) / (E1 * h1) + (1 - nu) / (E2 * h2) + (h1 + h2) ** 2 / (4 * D_b)
    T_inf_b = da * dT / lam_b
    clt_force = ma4()["a"]["cu_force_N_m"]
    return {"T_inf_suhir_cyl_D_N_m": T_inf, "T_inf_suhir_biax_D_N_m": T_inf_b, "cu_force_clt_N_m": clt_force,
            "abs_ratio_cyl_D_over_clt": abs(T_inf) / clt_force, "abs_ratio_biax_D_over_clt": abs(T_inf_b) / clt_force}


def all_values() -> dict:
    return {
        "TA1": ta1(), "TA2": ta1(rc=1e-5), "TA3": ta3(), "TA4": ta4(), "TA5": ta5(), "TA6": ta6(),
        "MA1": ma1(), "MA2": ma2(), "MA3": ma3(), "MA4": ma4(), "MA5": ma5(), "MA5b": ma5b(), "MA6": ma6(),
        "MA7": ma7(), "MA8": ma8(), "MA9": ma9(),
    }


def _flat(prefix: str, v, out: list) -> None:
    if isinstance(v, dict):
        for k, x in v.items():
            _flat(f"{prefix}.{k}" if prefix else k, x, out)
    elif isinstance(v, list):
        out.append((prefix, ", ".join(f"{x:.6g}" for x in v)))
    else:
        out.append((prefix, f"{v:.6g}"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="write values to this JSON path")
    args = ap.parse_args()
    vals = all_values()
    rows: list = []
    _flat("", vals, rows)
    w = max(len(r[0]) for r in rows)
    for k, v in rows:
        print(f"{k:<{w}}  {v}")
    if args.json:
        with open(args.json, "w") as f:
            json.dump({"generator": "validation/expected/tier_a.py", "values": vals}, f, indent=1)
            f.write("\n")


if __name__ == "__main__":
    main()
