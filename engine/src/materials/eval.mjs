// Compilation of library leaves into evaluators (SI), and the secant-CTE machinery (lane L2, DevLog-012).
// CTE: every dataset is turned once, at load, into a thermal-strain function eps_m(T) relative to its own strain-free
// temperature Tm; the secant alpha_m(T) = eps_m(T) / (T - Tm). Re-basing to a stress-free Tr uses the closed form of R1
// sec. 1.2 (COMSOL-equivalent): alpha_r(T) = [alpha_m(T)(T - Tm) - alpha_m(Tr)(Tr - Tm)] / [(T - Tr)(1 + alpha_m(Tr)(Tr - Tm))],
// with the derivative limit at |T - Tr| < 1e-3 K. License: GPL-3.0-or-later.

import { siFactor, C_TO_K } from './units.mjs';
import { isNA } from './schema.mjs';
import { parseExpression, evaluateAst } from '../params/params.mjs';

const lerp = (x0, x1, y0, y1, x) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);

function bracket(xs, x) {
  let i = 0;
  while (i < xs.length - 2 && xs[i + 1] < x) i++;
  return i;
}

/** Interpolate a 1D table (linear or log-log); x outside the table is clamped (callers check ranges first). */
export function interp1(xs, ys, x, mode = 'linear') {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  const i = bracket(xs, x);
  if (mode === 'loglog') return Math.exp(lerp(Math.log(xs[i]), Math.log(xs[i + 1]), Math.log(ys[i]), Math.log(ys[i + 1]), Math.log(x)));
  return lerp(xs[i], xs[i + 1], ys[i], ys[i + 1], x);
}

const tableT_K = (leaf) => (leaf.T_K ? leaf.T_K.slice() : leaf.T_C.map((t) => t + C_TO_K));

/**
 * Compile a scalar leaf into {na, eval(T_K, f_Hz), rangeK, rangeF, breaksK, fRefHz, smooth}.
 * `family` selects the unit conversion; `ctx.tgK` is the entry Tg used by bilinear leaves without their own Tg_C.
 */
export function compileScalar(leaf, family, ctx = {}) {
  if (!leaf || isNA(leaf.value) || leaf.status === 'pending_source') {
    return { na: true, missing: leaf?.missing ?? null, pending: leaf?.pending ?? null, leaf };
  }
  const model = leaf.model ?? 'constant';
  const fac = model === 'conductivity' ? 1 : siFactor(family, leaf.unit);
  const fRefHz = typeof leaf.f_GHz === 'number' ? leaf.f_GHz * 1e9 : null;
  const rangeC = leaf.range_C ? [leaf.range_C[0] + C_TO_K, leaf.range_C[1] + C_TO_K] : null;
  const base = { na: false, leaf, model, rangeK: rangeC, rangeF: null, breaksK: [], fRefHz, smooth: false };
  if (model === 'constant') {
    const v = Array.isArray(leaf.value) ? leaf.value.map((x) => x * fac) : leaf.value * fac;
    return { ...base, eval: () => v };
  }
  if (model === 'table_T') {
    const T = tableT_K(leaf);
    const y = leaf.value.map((x) => x * fac);
    const mode = leaf.interp ?? 'linear';
    return { ...base, rangeK: [T[0], T[T.length - 1]], breaksK: T, loglog: mode === 'loglog', eval: (TK) => interp1(T, y, TK, mode) };
  }
  if (model === 'linear_T') {
    const [lo, hi] = leaf.range_C;
    return { ...base, rangeK: [lo + C_TO_K, hi + C_TO_K], eval: (TK) => (leaf.a + leaf.b * (TK - C_TO_K - leaf.T0_C)) * fac };
  }
  if (model === 'bilinear_tg') {
    const tgK = leaf.Tg_C !== undefined ? leaf.Tg_C + C_TO_K : ctx.tgK;
    if (!(tgK > 0)) throw new Error('materials: bilinear_tg leaf needs Tg_C or an entry `tg` value');
    const b = leaf.below * fac;
    const a = leaf.above * fac;
    const w = leaf.width_K;
    const f = w ? (TK) => b + (a - b) / (1 + Math.exp(-(TK - tgK) / w)) : (TK) => (TK < tgK ? b : a);
    return { ...base, breaksK: [tgK], tgK, smooth: !!w, eval: f };
  }
  if (model === 'table_f') {
    const F = leaf.f_GHz.map((g) => g * 1e9);
    const y = leaf.value.map((x) => x * fac);
    return { ...base, rangeF: [F[0], F[F.length - 1]], eval: (TK, fHz) => interp1(F, y, fHz) };
  }
  if (model === 'table_f_T') {
    const F = leaf.f_GHz.map((g) => g * 1e9);
    const T = leaf.T_C.map((t) => t + C_TO_K);
    const tab = leaf.value.map((row) => row.map((x) => x * fac));
    return {
      ...base,
      rangeF: [F[0], F[F.length - 1]],
      rangeK: [T[0], T[T.length - 1]],
      eval: (TK, fHz) => {
        const col = tab.map((row) => interp1(T, row, TK));
        return interp1(F, col, fHz);
      },
    };
  }
  if (model === 'expr_T') {
    // expression in T_C and / or T_K (L1 params grammar), in the leaf unit; L11 wave 2: the case form k_W_mK: {expr}
    const src = String(leaf.expr);
    const ast = parseExpression(src);
    const positive = family === 'conductivity' || family === 'density' || family === 'cp' || family === 'modulus';
    return {
      ...base,
      // smooth: an instantaneous CTE given as an expression is integrated on the 0.5 K grid of buildStrain (L21)
      smooth: true,
      eval: (TK) => {
        const v = evaluateAst(ast, { T_K: TK, T_C: TK - C_TO_K }, src);
        if (typeof v !== 'number' || !Number.isFinite(v) || (positive && !(v > 0))) throw new Error(`materials: expression '${src}' gives ${v} at ${(TK - C_TO_K).toFixed(2)} C${positive ? ' (must be > 0)' : ''}`);
        return v * fac;
      },
    };
  }
  if (model === 'conductivity') return { ...base, eval: null };
  throw new Error(`materials: unknown scalar model '${model}'`);
}

/**
 * Thermal-strain function for one axis. `alpha` is a compiled scalar (1/K). Returns {TmK, strain(TK), alphaInst(TK),
 * domainK}. Instantaneous data are integrated piecewise with the midpoint rule on segments where alpha is linear (exact
 * for tables, linear models and sharp bilinear steps); smooth steps use a 0.5 K grid.
 */
export function buildStrain(alpha, kind, TrefK, domainK) {
  if (kind === 'secant') {
    const Tm = TrefK;
    const strain = (TK) => alpha.eval(TK) * (TK - Tm);
    const alphaInst = (TK) => {
      const h = 0.01;
      return (strain(TK + h) - strain(TK - h)) / (2 * h);
    };
    return { TmK: Tm, strain, alphaInst, domainK: alpha.rangeK ?? domainK };
  }
  // instantaneous
  const dom = alpha.rangeK ? alpha.rangeK.slice() : domainK.slice();
  let Tm = TrefK;
  if (Tm < dom[0]) Tm = dom[0];
  if (Tm > dom[1]) Tm = dom[1];
  if (alpha.model === 'constant') {
    const a = alpha.eval();
    return { TmK: Tm, strain: (TK) => a * (TK - Tm), alphaInst: () => a, domainK: [-Infinity, Infinity] };
  }
  const set = new Set([dom[0], dom[1], Tm]);
  for (const b of alpha.breaksK) if (b > dom[0] && b < dom[1]) set.add(b);
  if (alpha.smooth || alpha.loglog) for (let t = Math.ceil(dom[0] * 2) / 2; t < dom[1]; t += 0.5) set.add(t);
  const nodes = [...set].sort((x, y) => x - y);
  const S = new Float64Array(nodes.length);
  const im = nodes.indexOf(Tm);
  for (let i = im + 1; i < nodes.length; i++) S[i] = S[i - 1] + (nodes[i] - nodes[i - 1]) * alpha.eval(0.5 * (nodes[i] + nodes[i - 1]));
  for (let i = im - 1; i >= 0; i--) S[i] = S[i + 1] - (nodes[i + 1] - nodes[i]) * alpha.eval(0.5 * (nodes[i] + nodes[i + 1]));
  const n = nodes.length;
  const strain = (TK) => {
    if (TK <= nodes[0]) return S[0] + (TK - nodes[0]) * alpha.eval(nodes[0]);
    if (TK >= nodes[n - 1]) return S[n - 1] + (TK - nodes[n - 1]) * alpha.eval(nodes[n - 1]);
    const i = bracket(nodes, TK);
    return S[i] + (TK - nodes[i]) * alpha.eval(0.5 * (nodes[i] + TK));
  };
  return { TmK: Tm, strain, alphaInst: (TK) => alpha.eval(TK), domainK: dom };
}

/** Secant alpha relative to the dataset strain-free temperature Tm. */
export function secantAlpha(st, TK) {
  if (Math.abs(TK - st.TmK) < 1e-3) return st.alphaInst(st.TmK);
  return st.strain(TK) / (TK - st.TmK);
}

/** Re-based secant alpha (strain-free at Tr) at T, from the dataset strain function (R1 sec. 1.2 closed form). */
export function rebasedAlpha(st, TrK, TK) {
  const am = (T) => secantAlpha(st, T);
  const epsTr = am(TrK) * (TrK - st.TmK);
  if (Math.abs(TK - TrK) < 1e-3) return st.alphaInst(TrK) / (1 + epsTr);
  return (am(TK) * (TK - st.TmK) - epsTr) / ((TK - TrK) * (1 + epsTr));
}
