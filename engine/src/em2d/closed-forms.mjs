// Closed-form transmission-line results used as EM-0 gates for the 2D cross-section solver (lane L7, tranche E5).
// SI units (m, F/m, H/m, ohm, S/m, Hz). Phasor exp(+j w t). License: GPL-3.0-or-later.
//
// Sources (formula provenance; none of the numbers below is fitted):
//   - coax, parallel plate, CPW / stripline conformal maps: standard TEM electrostatics; CPW on an infinitely thick
//     substrate C' = 2 eps0 (eps_r + 1) K(k)/K(k'), k = w/(w + 2s); Cohn stripline k = sech(pi w / (2b)) (R3 Sec. 5.1,
//     tagged [unverified, textbook] there).
//   - Hammerstad-Jensen microstrip (E. Hammerstad, O. Jensen, "Accurate models for microstrip computer-aided design",
//     IEEE MTT-S Digest 1980), with their thickness correction; transcribed from memory, not re-checked against the
//     paper this session [unverified]. Stated accuracy (same source): Z0 better than 0.01 % (u <= 1) / 0.03 %
//     (u <= 1000) for zero thickness; eps_eff better than 0.2 % for eps_r < 128, 0.01 <= u <= 100.
//   - Round-wire internal impedance Z = k J0(ka) / (2 pi a sigma J1(ka)), k = (1 - j)/delta (exact solution of the
//     axisymmetric diffusion equation; standard).
//   - Slab internal impedance Z_s = (k/sigma) coth(k t), from EO engine/src/rf-line.mjs slabSurfaceImpedance (eb97f96).

import { cx, cadd, csub, cmul, cdiv, cscale } from '../la/complex.mjs';

export const C0 = 299792458;
export const MU0 = 1.25663706212e-6;
export const EPS0 = 8.8541878128e-12;
export const ETA0 = MU0 * C0;

/** Complete elliptic integral of the first kind K(k) (modulus k, 0 <= k < 1) by the arithmetic-geometric mean. */
export function ellipK(k) {
  if (!(k >= 0 && k < 1)) throw new Error(`ellipK: modulus must be in [0, 1) (got ${k})`);
  let a = 1,
    b = Math.sqrt(1 - k * k);
  for (let i = 0; i < 60 && Math.abs(a - b) > 1e-16 * a; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return Math.PI / (2 * a);
}

/** K(k') / K(k) with k' = sqrt(1 - k^2). */
export function ellipRatio(k) {
  return ellipK(Math.sqrt(1 - k * k)) / ellipK(k);
}

export const skinDepth = (fHz, sigma, mur = 1) => 1 / Math.sqrt(Math.PI * fHz * MU0 * mur * sigma);
export const surfaceResistance = (fHz, sigma) => Math.sqrt((Math.PI * fHz * MU0) / sigma);

// ---- coax / parallel plate ---------------------------------------------------------------

export function coax({ a, b, epsR = 1 }) {
  const ln = Math.log(b / a);
  const C = (2 * Math.PI * EPS0 * epsR) / ln;
  const L = (MU0 / (2 * Math.PI)) * ln;
  return { C, L, Z0: Math.sqrt(L / C) };
}

/** Parallel plates of width w at spacing h with no fringing (magnetic side walls). */
export function parallelPlate({ w, h, epsR = 1 }) {
  const C = (EPS0 * epsR * w) / h;
  const L = (MU0 * h) / w;
  return { C, L, Z0: Math.sqrt(L / C) };
}

// ---- conformal maps -----------------------------------------------------------------------

/** Zero-thickness CPW (centre w, gaps s, semi-infinite grounds) on an infinitely thick substrate eps_r, air above. */
export function cpwConformal({ w, s, epsR }) {
  const k = w / (w + 2 * s);
  const r = ellipRatio(k); // K(k')/K(k)
  const epsEff = (epsR + 1) / 2;
  const C = (2 * EPS0 * (epsR + 1)) / r;
  return { k, epsEff, C, Z0: (ETA0 / (4 * Math.sqrt(epsEff))) * r, Z0_30pi: ((30 * Math.PI) / Math.sqrt(epsEff)) * r };
}

/** Zero-thickness centred stripline of width w between plates at spacing b (Cohn). */
export function striplineCohn({ w, b, epsR }) {
  const k = 1 / Math.cosh((Math.PI * w) / (2 * b));
  const Z0 = (ETA0 / (4 * Math.sqrt(epsR))) / ellipRatio(k); // K(k)/K(k')
  return { k, Z0, C: Math.sqrt(epsR) / (C0 * Z0) };
}

// ---- Hammerstad-Jensen microstrip --------------------------------------------------------

function hjZ01(u) {
  const f = 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / u, 0.7528));
  return (ETA0 / (2 * Math.PI)) * Math.log(f / u + Math.sqrt(1 + (2 / u) ** 2));
}
function hjEpsEff(u, er) {
  const a = 1 + Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) / 49 + Math.log(1 + (u / 18.1) ** 3) / 18.7;
  const b = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053);
  return (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 10 / u, -a * b);
}

/**
 * Quasi-static microstrip Z0 and eps_eff (Hammerstad-Jensen 1980), strip width w, substrate height h, strip
 * thickness t (0 allowed), substrate eps_r, air above, infinite ground.
 */
export function microstripHJ({ w, h, t = 0, epsR }) {
  const u = w / h;
  if (t <= 0) {
    const ee = hjEpsEff(u, epsR);
    return { u, epsEff: ee, Z0: hjZ01(u) / Math.sqrt(ee), Z0air: hjZ01(u) };
  }
  const tn = t / h;
  const coth = 1 / Math.tanh(Math.sqrt(6.517 * u));
  const du1 = (tn / Math.PI) * Math.log(1 + (4 * Math.E) / (tn * coth * coth));
  const dur = 0.5 * (1 + 1 / Math.cosh(Math.sqrt(epsR - 1))) * du1;
  const u1 = u + du1,
    ur = u + dur;
  const eeR = hjEpsEff(ur, epsR);
  const Z0 = hjZ01(ur) / Math.sqrt(eeR);
  const epsEff = eeR * (hjZ01(u1) / hjZ01(ur)) ** 2;
  return { u, u1, ur, epsEff, Z0, Z0air: hjZ01(u1) };
}

/** Hammerstad roughness factor K = 1 + (2/pi) atan(1.4 (Rq/delta)^2). */
export const hammerstadK = (rq, delta) => 1 + (2 / Math.PI) * Math.atan(1.4 * (rq / delta) ** 2);

// ---- complex Bessel J0, J1 by power series (|z| <~ 40) ----------------------------------

export function besselJ(n, z) {
  // sum_m (-1)^m (z/2)^(2m+n) / (m! (m+n)!)
  const h = cscale(z, 0.5);
  const h2 = cmul(h, h);
  let term = cx(1, 0);
  for (let i = 1; i <= n; i++) term = cscale(cmul(term, h), 1 / i);
  let sum = term;
  for (let m = 1; m < 400; m++) {
    term = cscale(cmul(term, h2), -1 / (m * (m + n)));
    sum = cadd(sum, term);
    if (Math.hypot(term.re, term.im) < 1e-18 * Math.hypot(sum.re, sum.im) && m > 4) break;
  }
  return sum;
}

/** Internal impedance per unit length (ohm/m) of an isolated round wire of radius a: {re: R', im: w L'_int}. */
export function roundWireInternalZ({ a, sigma, fHz, mur = 1 }) {
  if (fHz === 0) return cx(1 / (Math.PI * a * a * sigma), 0);
  const d = skinDepth(fHz, sigma, mur);
  const k = cx(1 / d, -1 / d);
  const ka = cscale(k, a);
  const ratio = cdiv(besselJ(0, ka), besselJ(1, ka));
  return cscale(cmul(k, ratio), 1 / (2 * Math.PI * a * sigma));
}

/** Slab internal surface impedance per square Z_s = (k/sigma) coth(k t), field zero beyond the far face. */
export function slabSurfaceZ({ t, sigma, fHz }) {
  if (fHz === 0) return cx(1 / (sigma * t), 0);
  const d = skinDepth(fHz, sigma);
  const x = t / d;
  const den = Math.cosh(2 * x) - Math.cos(2 * x);
  const cr = Math.sinh(2 * x) / den,
    ci = -Math.sin(2 * x) / den;
  return cx((cr - ci) / (sigma * d), (cr + ci) / (sigma * d));
}

export { cx, cadd, csub, cmul, cdiv };
