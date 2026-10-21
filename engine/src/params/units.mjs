// Ported from eo-modulator-atlas engine/src/postproc/units.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes (lane L1, 2026-10-20): fifth base dimension K (temperature) appended; dimension vectors have 5 entries
// and every dimension operation treats a missing fifth entry as 0, so EO 4-entry vectors behave as before; symbols K
// (prefixable, e.g. mK) and ppm (dimensionless 1e-6); named thermal forms in NAMED.
// SI dimensions and unit strings of the postprocessing engine (DevLog-030 P2/P3, DevLog-031).
// A dimension is a vector of exponents over the SI base units (m, kg, s, A); a parsed unit is {dim, factor} with
// value_SI = value_in_unit * factor. Own recursive-descent unit parser (no eval). License: GPL-3.0-or-later.

export const BASE_UNITS = Object.freeze(['m', 'kg', 's', 'A', 'K']);
const D = (m = 0, kg = 0, s = 0, A = 0, K = 0) => Object.freeze([m, kg, s, A, K]);
export const DIMLESS = D();

/** Named units (exact symbol match is tried before a prefix split). */
const SYMBOLS = {
  m: [D(1), 1], g: [D(0, 1), 1e-3], s: [D(0, 0, 1), 1], A: [D(0, 0, 0, 1), 1],
  V: [D(2, 1, -3, -1), 1], W: [D(2, 1, -3), 1], J: [D(2, 1, -2), 1], C: [D(0, 0, 1, 1), 1],
  F: [D(-2, -1, 4, 2), 1], H: [D(2, 1, -2, -2), 1], ohm: [D(2, 1, -3, -2), 1], S: [D(-2, -1, 3, 2), 1],
  Hz: [D(0, 0, -1), 1], N: [D(1, 1, -2), 1], Pa: [D(-1, 1, -2), 1], T: [D(0, 1, -2, -1), 1],
  rad: [DIMLESS, 1], deg: [DIMLESS, Math.PI / 180], '1': [DIMLESS, 1],
  // logarithmic labels (factor 1, no conversion between them): rf.alpha_dB carries dB, rf.alpha nepers
  dB: [DIMLESS, 1], Np: [DIMLESS, 1],
  // L1 additions: temperature and parts per million
  K: [D(0, 0, 0, 0, 1), 1], ppm: [DIMLESS, 1e-6],
};
const ALIASES = { Ohm: 'ohm', 'Ω': 'ohm', '°': 'deg' };
const PREFIXES = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, m: 1e-3, c: 1e-2, k: 1e3, M: 1e6, G: 1e9, T: 1e12 };

export class UnitError extends Error {
  /** @param {string} message @param {string} [detail] message without the position @param {number|null} [pos] 0-based index in the unit string */
  constructor(message, detail = message, pos = null) {
    super(message);
    this.detail = detail;
    this.pos = pos;
  }
}

const NB = 5;
const at = (a, q) => a[q] ?? 0;
export const dimMul = (a, b) => Array.from({ length: NB }, (_, q) => at(a, q) + at(b, q));
export const dimDiv = (a, b) => Array.from({ length: NB }, (_, q) => at(a, q) - at(b, q));
export const dimPow = (a, p) => Array.from({ length: NB }, (_, q) => at(a, q) * p);
export const dimEq = (a, b) => { for (let q = 0; q < NB; q++) if (Math.abs(at(a, q) - at(b, q)) >= 1e-9) return false; return true; };
export const isDimless = (a) => dimEq(a, DIMLESS);

function symbol(name) {
  const key = ALIASES[name] ?? name;
  if (Object.hasOwn(SYMBOLS, key)) return { dim: [...SYMBOLS[key][0]], factor: SYMBOLS[key][1] };
  for (const [p, f] of Object.entries(PREFIXES)) {
    if (!key.startsWith(p) || key.length <= p.length) continue;
    const rest = ALIASES[key.slice(p.length)] ?? key.slice(p.length);
    if (Object.hasOwn(SYMBOLS, rest) && !['1', 'deg', 'dB', 'Np', 'ppm'].includes(rest)) return { dim: [...SYMBOLS[rest][0]], factor: f * SYMBOLS[rest][1] };
  }
  return null;
}

const cache = new Map();

/**
 * Parse a unit string: products and quotients of (prefixed) symbols with optional integer or decimal exponents,
 * parentheses, `1`, `*`, `/`, `^` or a space as product: `V/um`, `pF/m`, `1/V`, `V*cm`, `W/m^2`, `1/(V*m^2)`, `um^2`.
 * @param {string} src
 * @returns {{dim:number[], factor:number}}
 */
export function parseUnit(src) {
  if (typeof src !== 'string') throw new UnitError('unit must be a string');
  const key = src.trim();
  const hit = cache.get(key);
  if (hit) return { dim: [...hit.dim], factor: hit.factor };
  if (key === '' || key === '1') return { dim: [...DIMLESS], factor: 1 };
  if (key.length > 200) throw new UnitError('unit string longer than 200 characters');
  let i = 0;
  const err = (m) => { throw new UnitError(`unit "${src}": ${m} at position ${i + 1}`, m, i); };
  const ws = () => { while (key[i] === ' ') i++; };
  const num = () => {
    const m = /^[+-]?(?:\d+\.?\d*|\.\d+)/.exec(key.slice(i));
    if (!m) err('expected a number');
    i += m[0].length;
    return Number(m[0]);
  };
  function factor() {
    ws();
    let u;
    if (key[i] === '(') {
      i++;
      u = product();
      ws();
      if (key[i] !== ')') err("expected ')'");
      i++;
    } else if (/[0-9]/.test(key[i] ?? '')) {
      const v = num();
      if (v !== 1) err('only the number 1 may appear in a unit');
      u = { dim: [...DIMLESS], factor: 1 };
    } else {
      const m = /^[A-Za-zµμΩ°]+/.exec(key.slice(i));
      if (!m) err(`unexpected '${key[i] ?? 'end'}'`);
      u = symbol(m[0]);
      if (!u) err(`unknown unit '${m[0]}'`);
      i += m[0].length;
    }
    ws();
    if (key[i] === '^') {
      i++;
      ws();
      let p;
      if (key[i] === '(') {
        i++;
        const a = num();
        ws();
        if (key[i] === '/') { i++; ws(); p = a / num(); } else p = a;
        ws();
        if (key[i] !== ')') err("expected ')'");
        i++;
      } else p = num();
      if (!Number.isFinite(p)) err('invalid exponent');
      u = { dim: dimPow(u.dim, p), factor: u.factor ** p };
    }
    return u;
  }
  function product() {
    let u = factor();
    for (;;) {
      ws();
      const c = key[i];
      if (c === '*' || c === '·') { i++; const v = factor(); u = { dim: dimMul(u.dim, v.dim), factor: u.factor * v.factor }; }
      else if (c === '/') { i++; const v = factor(); u = { dim: dimDiv(u.dim, v.dim), factor: u.factor / v.factor }; }
      else if (c != null && c !== ')' && /[A-Za-z(µμΩ°]/.test(c)) { const v = factor(); u = { dim: dimMul(u.dim, v.dim), factor: u.factor * v.factor }; }
      else return u;
    }
  }
  const u = product();
  ws();
  if (i < key.length) err(`unexpected '${key[i]}'`);
  if (cache.size > 500) cache.clear();
  cache.set(key, u);
  return { dim: [...u.dim], factor: u.factor };
}

/** Preferred SI names of common dimensions (first match wins). */
const NAMED = [
  ['1', D()], ['m', D(1)], ['m^2', D(2)], ['1/m', D(-1)], ['1/m^2', D(-2)], ['s', D(0, 0, 1)], ['Hz', D(0, 0, -1)],
  ['V', D(2, 1, -3, -1)], ['V/m', D(1, 1, -3, -1)], ['A', D(0, 0, 0, 1)], ['A/m', D(-1, 0, 0, 1)], ['W', D(2, 1, -3)],
  ['W/m', D(1, 1, -3)], ['W/m^2', D(0, 1, -3)], ['J/m', D(1, 1, -2)], ['J/m^3', D(-1, 1, -2)], ['C/m', D(-1, 0, 1, 1)],
  ['C/m^2', D(-2, 0, 1, 1)], ['F', D(-2, -1, 4, 2)], ['F/m', D(-3, -1, 4, 2)], ['H', D(2, 1, -2, -2)],
  ['H/m', D(1, 1, -2, -2)], ['ohm', D(2, 1, -3, -2)], ['S/m', D(-3, -1, 3, 2)], ['1/V', D(-2, -1, 3, 1)],
  ['1/(V*m)', D(-3, -1, 3, 1)], ['1/(V*m^2)', D(-4, -1, 3, 1)], ['V*m', D(3, 1, -3, -1)], ['V^2', D(4, 2, -6, -2)],
  ['V^2/m^2', D(2, 2, -6, -2)], ['m/V', D(-1, -1, 3, 1)], ['V/m^2', D(0, 1, -3, -1)], ['A^2', D(0, 0, 0, 2)],
  ['K', D(0, 0, 0, 0, 1)], ['1/K', D(0, 0, 0, 0, -1)], ['W/(m*K)', D(1, 1, -3, 0, -1)], ['W/(m^2*K)', D(0, 1, -3, 0, -1)],
  ['K/W', D(-2, -1, 3, 0, 1)], ['J/(kg*K)', D(2, 0, -2, 0, -1)], ['m^2*K/W', D(0, -1, 3, 0, 1)], ['K/m', D(-1, 0, 0, 0, 1)],
  ['ohm*m', D(3, 1, -3, -2)], ['W*m', D(3, 1, -3)], ['J', D(2, 1, -2)],
];

const fmtExp = (p) => (Number.isInteger(p) ? String(p) : String(Math.round(p * 1e6) / 1e6));

/** SI unit string of a dimension vector (named forms for common dimensions, base units otherwise). */
export function formatUnit(dim) {
  for (const [name, d] of NAMED) if (dimEq(d, dim)) return name;
  const num = [], den = [];
  dim.forEach((p, k) => {
    if (Math.abs(p) < 1e-9) return;
    const s = Math.abs(Math.abs(p) - 1) < 1e-9 ? BASE_UNITS[k] : `${BASE_UNITS[k]}^${fmtExp(Math.abs(p))}`;
    (p > 0 ? num : den).push(s);
  });
  const n = num.length ? num.join('*') : '1';
  if (!den.length) return n;
  return `${n}/${den.length > 1 ? `(${den.join('*')})` : den[0]}`;
}

/**
 * Conversion of an SI value of dimension `dim` into a display unit. Throws when the unit has another dimension.
 * @returns {{factor:number, unit:string}} display value = SI value / factor
 */
export function displayConversion(dim, unit) {
  if (unit == null || unit === '') return { factor: 1, unit: formatUnit(dim) };
  const u = parseUnit(unit);
  if (!dimEq(u.dim, dim)) throw new UnitError(`unit "${unit}" (${formatUnit(u.dim)}) does not match the expression unit ${formatUnit(dim)}`);
  return { factor: u.factor, unit };
}
