// Closed-form steady conduction references for the tier-A thermal gates (R6 section 1.2, TA1-TA4).
// Formulas as written in R6 (DevLog/research/2026-10-20-sim-validation-set.md section 1.2) unless noted; the
// rectangular flux-channel series is derived here by separation of variables (see rectSpreadingSeries).
// License: GPL-3.0-or-later.

/**
 * TA1: 1D series resistance of layers on area A with a convective face: R = sum t_i / (k_i A) + 1 / (h A).
 * @param {{t_m: number, k: number}[]} layers
 * @param {number} A_m2
 * @param {number} [h] W/m^2 K (omit for no convective term)
 */
export function multilayerResistance(layers, A_m2, h = null) {
  const R = layers.map((l) => l.t_m / (l.k * A_m2));
  const Rconv = h ? 1 / (h * A_m2) : 0;
  return { R, R_conv: Rconv, R_tot: R.reduce((a, b) => a + b, 0) + Rconv };
}

/**
 * TA3: spreading resistance of a centred source on a plate with a convective back face, circular-equivalent
 * approximation (Song, Lee, Au 1994; Lee, Song, Au, Moran 1995; as written in R6 TA3).
 * a = sqrt(As / pi), b = sqrt(Ap / pi), eps = a / b, tau = t / b, Bi = h b / k, lambda_c = pi + 1 / (sqrt(pi) eps),
 * phi_c = (tanh(lambda_c tau) + lambda_c / Bi) / (1 + (lambda_c / Bi) tanh(lambda_c tau)),
 * psi_max = eps tau / sqrt(pi) + (1 - eps) phi_c / sqrt(pi), psi_avg = (1 - eps)^1.5 phi_c / 2,
 * R_sp = psi / (sqrt(pi) k a).
 */
export function songLeeAu({ k, t, As, Ap, h }) {
  const sp = Math.sqrt(Math.PI);
  const a = Math.sqrt(As / Math.PI), b = Math.sqrt(Ap / Math.PI);
  const eps = a / b, tau = t / b, Bi = (h * b) / k;
  const lc = Math.PI + 1 / (sp * eps);
  const th = Math.tanh(lc * tau);
  const phi = (th + lc / Bi) / (1 + (lc / Bi) * th);
  const psiMax = (eps * tau) / sp + ((1 - eps) * phi) / sp;
  const psiAvg = ((1 - eps) ** 1.5 * phi) / 2;
  return { Rsp_max: psiMax / (sp * k * a), Rsp_avg: psiAvg / (sp * k * a), psi_max: psiMax, psi_avg: psiAvg, eps, tau, Bi };
}

/**
 * Exact series for a rectangular source c x d centred at (Xc, Yc) on face z = 0 of a plate [0, a] x [0, b] x [0, t]
 * (uniform inward flux Q / (c d)), convective face z = t (h, T_inf), other faces adiabatic. Own derivation by
 * separation of variables: theta = T - T_inf = sum_mn A_mn cos(l_m x) cos(d_n y) [cosh(z_mn z) - phi_mn sinh(z_mn z)],
 * l_m = m pi / a, d_n = n pi / b, z_mn = sqrt(l_m^2 + d_n^2),
 * phi(z) = (z sinh(z t) + (h / k) cosh(z t)) / (z cosh(z t) + (h / k) sinh(z t)) (convective condition at z = t),
 * A_mn = q a_m b_n / (k z_mn phi(z_mn)) for (m, n) != (0, 0) (flux condition -k theta_z = q at z = 0), with the cosine
 * coefficients of the source indicator a_0 = c / a, a_m = 4 cos(l_m Xc) sin(l_m c / 2) / (a l_m), b_n likewise, and
 * the (0, 0) term Q / (a b) (t / k + 1 / h). Same structure as Muzychka, Culham and Yovanovich, J. Electron. Packag.
 * 125, 178 (2003) (not re-checked against the paper; the FE gate checks this series independently).
 * @returns {{theta_avg: number, theta_center: number, R_1D: number, R_0: number, Rs_avg: number, Rs_max: number}}
 *   per unit Q (K/W): theta_* / Q; Rs = theta / Q - R_1D - R_0.
 */
export function rectSpreadingSeries({ a, b, t, k, h, c, d, Xc = a / 2, Yc = b / 2, M = 400 }) {
  const Q = 1;
  const q = Q / (c * d);
  const coef = (L, w, X, m) => (m === 0 ? w / L : (4 * Math.cos((m * Math.PI * X) / L) * Math.sin((m * Math.PI * w) / (2 * L))) / (L * ((m * Math.PI) / L)));
  // source averages of cos(l_m x): (2 / (w l_m)) cos(l_m X) sin(l_m w / 2); 1 for m = 0
  const avg = (L, w, X, m) => (m === 0 ? 1 : (2 * Math.cos((m * Math.PI * X) / L) * Math.sin((m * Math.PI * w) / (2 * L))) / (w * ((m * Math.PI) / L)));
  const phi = (z) => {
    // large z t: tanh -> 1, phi -> 1 (avoid overflow)
    if (z * t > 300) return 1;
    const s = Math.sinh(z * t), co = Math.cosh(z * t), Bi = h / k;
    return (z * s + Bi * co) / (z * co + Bi * s);
  };
  const am = [], bn = [], avx = [], avy = [], cx = [], cy = [];
  for (let m = 0; m <= M; m++) {
    am.push(coef(a, c, Xc, m));
    bn.push(coef(b, d, Yc, m));
    avx.push(avg(a, c, Xc, m));
    avy.push(avg(b, d, Yc, m));
    cx.push(Math.cos((m * Math.PI * Xc) / a));
    cy.push(Math.cos((m * Math.PI * Yc) / b));
  }
  const R1D = t / (k * a * b), R0 = 1 / (h * a * b);
  let thAvg = Q * (R1D + R0), thC = Q * (R1D + R0);
  for (let m = 0; m <= M; m++)
    for (let n = 0; n <= M; n++) {
      if (m === 0 && n === 0) continue;
      const lm = (m * Math.PI) / a, dn = (n * Math.PI) / b;
      const z = Math.hypot(lm, dn);
      const A = (q * am[m] * bn[n]) / (k * z * phi(z));
      thAvg += A * avx[m] * avy[n];
      thC += A * cx[m] * cy[n];
    }
  return { theta_avg: thAvg, theta_center: thC, R_1D: R1D, R_0: R0, Rs_avg: thAvg / Q - R1D - R0, Rs_max: thC / Q - R1D - R0 };
}

/**
 * TA4: straight fin with a convective tip (Incropera, Table 3.4, as written in R6 TA4):
 * q / theta_b = sqrt(h P k Ac) [sinh mL + (h / (m k)) cosh mL] / [cosh mL + (h / (m k)) sinh mL], m = sqrt(h P / (k Ac)).
 */
export function finConvectiveTip({ h, k, t, w, L }) {
  const P = 2 * (w + t), Ac = w * t;
  const m = Math.sqrt((h * P) / (k * Ac));
  const r = h / (m * k);
  const M = Math.sqrt(h * P * k * Ac);
  return { q_per_K: (M * (Math.sinh(m * L) + r * Math.cosh(m * L))) / (Math.cosh(m * L) + r * Math.sinh(m * L)), m, mL: m * L };
}
