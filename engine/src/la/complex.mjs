// Ported from eo-modulator-atlas engine/src/complex.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: none (verbatim copy).
// Minimal complex-number helpers on plain {re, im} pairs (no dependencies, no classes).
// Convention: time dependence exp(+j w t); sqrt is the principal root (Re >= 0).
// License: GPL-3.0-or-later.

export const cx = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
export const cscale = (a, s) => ({ re: a.re * s, im: a.im * s });
export const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const cabs = (a) => Math.hypot(a.re, a.im);

export function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (!(d > 0)) throw new Error('complex division by zero');
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

/**
 * Principal square root. Re >= 0; for z on the negative real axis the result is +j sqrt(|z|).
 * Stable for tiny |Im z| relative to |Re z| (no cancellation in the small component).
 */
export function csqrt(z) {
  const r = Math.hypot(z.re, z.im);
  if (r === 0) return { re: 0, im: 0 };
  if (z.re >= 0) {
    const t = Math.sqrt((r + z.re) / 2);
    return { re: t, im: z.im / (2 * t) };
  }
  const t = Math.sqrt((r - z.re) / 2);
  const s = z.im < 0 || Object.is(z.im, -0) ? -1 : 1;
  return { re: Math.abs(z.im) / (2 * t), im: s * t };
}

export const cexp = (z) => {
  const m = Math.exp(z.re);
  return { re: m * Math.cos(z.im), im: m * Math.sin(z.im) };
};
export const ccosh = (z) => ({ re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) });
export const csinh = (z) => ({ re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) });
