// Dielectric models for the EM 2D solver: complex relative permittivity eps(f) = eps' - j eps'' (phasor exp(+j w t)).
// License: GPL-3.0-or-later.
//
// Models (material spec `model` key):
//   const               eps_r, tan_delta (default 0), sigma_S_m (default 0). Constant tan delta is not causal over a
//                       wide band (flagged `causal: false` when tan_delta > 0).
//   djordjevic_sarkar   wideband Debye: eps = eps_inf + d_eps log10((w2 + j w)/(w1 + j w)) / log10(w2/w1)
//                       (Djordjevic et al., IEEE Trans. EMC 43(4) 2001; form as in R3 Sec. 2.7 [S12]). Fitted to one
//                       point (eps_r, tan_delta at f_ref_Hz) for given corners f_low_Hz, f_high_Hz. Causal: it is the
//                       continuous log-uniform distribution of Debye poles between w1 and w2.
//   causal_fit          eps_inf + c_DS * DS(w) + sum c_k Debye_k(w) + sum c_k Lorentz_k(w), all c >= 0 (passive,
//                       causal), non-negative least squares on relative errors of Dk and Df at the given points.
//   table               linear interpolation of Dk and Df in f (HFSS-style frequency table); not causal, flagged.
// Every model adds an optional DC conductivity term -j sigma / (w eps0).

import { EPS0 } from './closed-forms.mjs';

const fail = (m) => {
  throw new Error(`em2d dielectric: ${m}`);
};

/** DS basis F(w) = log10((w2 + j w)/(w1 + j w)) / log10(w2 / w1) -> {re, im}; F(0) = 1, F(inf) = 0. */
export function dsBasis(w, w1, w2) {
  const lr = 0.5 * Math.log((w2 * w2 + w * w) / (w1 * w1 + w * w));
  const li = Math.atan2(w, w2) - Math.atan2(w, w1);
  const s = Math.log(w2 / w1);
  return { re: lr / s, im: li / s };
}
const debye = (w, wk) => {
  const x = w / wk;
  const d = 1 + x * x;
  return { re: 1 / d, im: -x / d };
};
const lorentz = (w, wk, gk) => {
  // wk^2 / (wk^2 - w^2 + j w gk)
  const a = wk * wk - w * w,
    b = w * gk;
  const d = a * a + b * b;
  return { re: (wk * wk * a) / d, im: (-wk * wk * b) / d };
};

/** Lawson-Hanson non-negative least squares min ||A x - b||, x >= 0 (A: rows x cols, row-major arrays). */
export function nnls(A, b, rows, cols, { maxIter = 500, tol = 1e-12 } = {}) {
  const x = new Float64Array(cols);
  const P = new Uint8Array(cols);
  const resid = () => {
    const r = new Float64Array(rows);
    for (let i = 0; i < rows; i++) {
      let s = b[i];
      for (let j = 0; j < cols; j++) s -= A[i * cols + j] * x[j];
      r[i] = s;
    }
    return r;
  };
  const lsq = (set) => {
    // unconstrained least squares on the columns in `set` via normal equations with Cholesky (small, well scaled)
    const k = set.length;
    const N = new Float64Array(k * k),
      rhs = new Float64Array(k);
    for (let a = 0; a < k; a++) {
      for (let c = 0; c < k; c++) {
        let s = 0;
        for (let i = 0; i < rows; i++) s += A[i * cols + set[a]] * A[i * cols + set[c]];
        N[a * k + c] = s;
      }
      let s = 0;
      for (let i = 0; i < rows; i++) s += A[i * cols + set[a]] * b[i];
      rhs[a] = s;
    }
    // Cholesky with tiny ridge for safety
    const L = new Float64Array(k * k);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j <= i; j++) {
        let s = N[i * k + j];
        for (let q = 0; q < j; q++) s -= L[i * k + q] * L[j * k + q];
        if (i === j) L[i * k + i] = Math.sqrt(Math.max(s, 1e-30 * (N[i * k + i] || 1)));
        else L[i * k + j] = s / L[j * k + j];
      }
    }
    const y = new Float64Array(k);
    for (let i = 0; i < k; i++) {
      let s = rhs[i];
      for (let q = 0; q < i; q++) s -= L[i * k + q] * y[q];
      y[i] = s / L[i * k + i];
    }
    for (let i = k - 1; i >= 0; i--) {
      let s = y[i];
      for (let q = i + 1; q < k; q++) s -= L[q * k + i] * y[q];
      y[i] = s / L[i * k + i];
    }
    return y;
  };
  for (let it = 0; it < maxIter; it++) {
    const r = resid();
    let best = -1,
      bw = tol;
    for (let j = 0; j < cols; j++) {
      if (P[j]) continue;
      let wj = 0;
      for (let i = 0; i < rows; i++) wj += A[i * cols + j] * r[i];
      if (wj > bw) {
        bw = wj;
        best = j;
      }
    }
    if (best < 0) break;
    P[best] = 1;
    for (;;) {
      const set = [];
      for (let j = 0; j < cols; j++) if (P[j]) set.push(j);
      const z = lsq(set);
      if (z.every((v) => v > 0)) {
        x.fill(0);
        set.forEach((j, q) => (x[j] = z[q]));
        break;
      }
      let alpha = Infinity;
      set.forEach((j, q) => {
        if (z[q] <= 0) alpha = Math.min(alpha, x[j] / (x[j] - z[q]));
      });
      set.forEach((j, q) => {
        x[j] += alpha * (z[q] - x[j]);
        if (x[j] <= 1e-15) {
          x[j] = 0;
          P[j] = 0;
        }
      });
    }
  }
  return x;
}

/**
 * Build a dielectric model. Returns {key, model, causal, epsAt(fHz) -> {re, im}, fit?, params}.
 * `key` is only used in messages.
 */
export function makeDielectric(key, spec) {
  if (!spec || typeof spec !== 'object') fail(`material "${key}" is not defined`);
  const sigma = spec.sigma_S_m ?? 0;
  const cond = (w) => (sigma > 0 && w > 0 ? sigma / (w * EPS0) : 0);
  const model = spec.model ?? 'const';
  if (model === 'const') {
    const er = spec.eps_r ?? fail(`${key}: eps_r required`);
    const td = spec.tan_delta ?? 0;
    return {
      key,
      model,
      causal: td === 0,
      params: { eps_r: er, tan_delta: td, sigma_S_m: sigma },
      epsAt: (f) => ({ re: er, im: -er * td - cond(2 * Math.PI * f) }),
    };
  }
  if (model === 'djordjevic_sarkar') {
    const er = spec.eps_r ?? fail(`${key}: eps_r required`);
    const td = spec.tan_delta ?? fail(`${key}: tan_delta required`);
    const f0 = spec.f_ref_Hz ?? fail(`${key}: f_ref_Hz required`);
    const w1 = 2 * Math.PI * (spec.f_low_Hz ?? 1e3),
      w2 = 2 * Math.PI * (spec.f_high_Hz ?? 1e12);
    const F0 = dsBasis(2 * Math.PI * f0, w1, w2);
    const dEps = (-er * td) / F0.im;
    const epsInf = er - dEps * F0.re;
    return {
      key,
      model,
      causal: true,
      params: { eps_r: er, tan_delta: td, f_ref_Hz: f0, f_low_Hz: w1 / (2 * Math.PI), f_high_Hz: w2 / (2 * Math.PI), eps_inf: epsInf, d_eps: dEps, corners_status: spec.f_low_Hz && spec.f_high_Hz ? 'user' : 'template' },
      epsAt: (f) => {
        const F = dsBasis(2 * Math.PI * f, w1, w2);
        return { re: epsInf + dEps * F.re, im: dEps * F.im - cond(2 * Math.PI * f) };
      },
    };
  }
  if (model === 'table') {
    const pts = (spec.points ?? fail(`${key}: points required`)).map((p) => ({ f: p.f_GHz * 1e9, dk: p.Dk, df: p.Df })).sort((a, b) => a.f - b.f);
    const interp = (f, k) => {
      if (f <= pts[0].f) return pts[0][k];
      if (f >= pts[pts.length - 1].f) return pts[pts.length - 1][k];
      let i = 0;
      while (pts[i + 1].f < f) i++;
      const t = (f - pts[i].f) / (pts[i + 1].f - pts[i].f);
      return pts[i][k] + t * (pts[i + 1][k] - pts[i][k]);
    };
    return { key, model, causal: false, params: { points: spec.points }, epsAt: (f) => ({ re: interp(f, 'dk'), im: -interp(f, 'dk') * interp(f, 'df') - cond(2 * Math.PI * f) }) };
  }
  if (model === 'causal_fit') {
    const pts = (spec.points ?? fail(`${key}: points required`)).map((p) => ({ f: p.f_GHz * 1e9, dk: p.Dk, df: p.Df }));
    if (pts.length < 2) fail(`${key}: causal_fit needs >= 2 points`);
    const fmin = Math.min(...pts.map((p) => p.f)),
      fmax = Math.max(...pts.map((p) => p.f));
    const w1 = 2 * Math.PI * (spec.f_low_Hz ?? 1e3),
      w2 = 2 * Math.PI * (spec.f_high_Hz ?? 1e12);
    const zeta = spec.lorentz_damping ?? 0.5;
    // basis: [eps_inf, DS, Debye poles (3/decade, fmin/10 .. fmax*100), Lorentz poles (4/decade, 1.2 fmax .. 50 fmax)]
    const basis = [{ kind: 'const' }, { kind: 'ds' }];
    for (let lf = Math.log10(fmin / 10); lf <= Math.log10(fmax * 100) + 1e-9; lf += 1 / 3) basis.push({ kind: 'debye', wk: 2 * Math.PI * 10 ** lf });
    for (let lf = Math.log10(fmax * 1.2); lf <= Math.log10(fmax * 50) + 1e-9; lf += 1 / 4) basis.push({ kind: 'lorentz', wk: 2 * Math.PI * 10 ** lf, gk: 2 * zeta * 2 * Math.PI * 10 ** lf });
    const evalB = (bf, w) => (bf.kind === 'const' ? { re: 1, im: 0 } : bf.kind === 'ds' ? dsBasis(w, w1, w2) : bf.kind === 'debye' ? debye(w, bf.wk) : lorentz(w, bf.wk, bf.gk));
    const rows = 2 * pts.length,
      cols = basis.length;
    const A = new Float64Array(rows * cols),
      b = new Float64Array(rows);
    const wRe = spec.weight_dk ?? 1,
      wIm = spec.weight_df ?? 1;
    pts.forEach((p, i) => {
      const w = 2 * Math.PI * p.f;
      const sRe = wRe / p.dk,
        sIm = wIm / (p.dk * p.df);
      basis.forEach((bf, j) => {
        const v = evalB(bf, w);
        A[2 * i * cols + j] = v.re * sRe;
        A[(2 * i + 1) * cols + j] = -v.im * sIm; // fit eps'' = -Im eps
      });
      b[2 * i] = p.dk * sRe;
      b[2 * i + 1] = p.dk * p.df * sIm;
    });
    const c = nnls(A, b, rows, cols);
    const terms = basis.map((bf, j) => ({ ...bf, f_Hz: bf.wk ? bf.wk / (2 * Math.PI) : undefined, c: c[j] })).filter((t) => t.c > 0);
    const epsAt = (f) => {
      const w = 2 * Math.PI * f;
      let re = 0,
        im = 0;
      for (const t of terms) {
        const v = evalB(t, w);
        re += t.c * v.re;
        im += t.c * v.im;
      }
      return { re, im: im - cond(w) };
    };
    const residual = pts.map((p) => {
      const e = epsAt(p.f);
      return { f_GHz: p.f / 1e9, Dk: p.dk, Df: p.df, Dk_fit: e.re, Df_fit: -e.im / e.re, rel_dk: e.re / p.dk - 1, rel_df: -e.im / e.re / p.df - 1 };
    });
    return {
      key,
      model,
      causal: true,
      params: { f_low_Hz: w1 / (2 * Math.PI), f_high_Hz: w2 / (2 * Math.PI), lorentz_damping: zeta, terms: terms.map(({ kind, f_Hz, c }) => ({ kind, f_Hz, c })) },
      fit: { points: residual, max_rel_dk: Math.max(...residual.map((r) => Math.abs(r.rel_dk))), max_rel_df: Math.max(...residual.map((r) => Math.abs(r.rel_df))) },
      epsAt,
    };
  }
  return fail(`${key}: unknown model "${model}"`);
}

/** Materials table -> {key: model}; `air` / `vacuum` are predefined as lossless eps_r = 1 unless overridden. */
export function makeMaterials(table = {}) {
  const out = {
    air: makeDielectric('air', { model: 'const', eps_r: 1 }),
    vacuum: makeDielectric('vacuum', { model: 'const', eps_r: 1 }),
  };
  for (const [k, v] of Object.entries(table)) out[k] = makeDielectric(k, v);
  return out;
}
