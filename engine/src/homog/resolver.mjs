// RVE-homogenized materials (tranche E3): `homog:` keys resolved by periodic unit-cell FE instead of the L2 rule of
// mixtures. Lane L8. Browser-safe (the library object is injected).
// Key grammar: L2 `homog:<kind>:<inclusion>+<matrix>:<fraction>[:<axis>]` (materials/homogenize.mjs parseHomogKey),
// plus `homog:stack:<m1>+<m2>+...:<t1>/<t2>/...` (z laminate with thickness weights; merge.mjs).
// Topology map: column kinds (bumps, pillars, TSV, TGV, vias, PTH) -> circular column along the axis; rdl_layer x | y
// -> strip (lines), plane -> metal sheet with a circular antipad, xy -> two sublevels of x and y lines; stack ->
// exact laminate (laminate.mjs, no FE needed; the FE RVE reproduces it to round-off, tests). A void matrix is not an
// RVE problem: delegated to the library (ROM), labelled.
// Staircased cylinders: two cells bracketing the target area fraction on one grid, properties interpolated linearly
// in the achieved fraction (C, effective thermal strain, k), at n and 2n cells across the pitch (default n = 32),
// Richardson-extrapolated with order 1 (observed staircase order; L8 notes and tests).
// Output: resolved-like entry with `homogenization: 'rve'`, 9 orthotropic constants from S_eff, secant CTE at
// (Tsf_K, T_K), k diagonal, rho volume mean, cp mass mean, provenance {C6_Pa, non_orthotropic, fractions, n, element,
// ROM comparison when the library can compute it}. Cached by (key, T_K, Tsf_K, n, element, constituent fingerprint).
// Constituent fingerprints (lane L11, 2026-10-20): every table lookup and cache key carries a hash of the resolved
// constituent values the RVE uses (fingerprint()), so overridden constituents (case, study or sensitivity-bound
// materials.overrides via applyOverrides) never hit rows or cache entries built with other values.
// License: GPL-3.0-or-later.

import { parseHomogKey, COLUMN_KINDS } from '../materials/homogenize.mjs';
import { buildCellPair } from './cells.mjs';
import { rveElastic, rveConduction, orthoFromS, nonOrthotropic } from './rve.mjs';
import { laminate } from './laminate.mjs';
import { stiffnessLab, invertDense, thermalStrainLab, directionCosines } from '../mech/constitutive.mjs';

export const RVE_VERSION = 'ap-sim-homog-rve/0';

/** Parse a key into an RVE spec (topology, axis, fraction, constituents) or {stack layers}. */
export function rveSpecOf(key) {
  const parts = key.split(':');
  if (parts[0] !== 'homog') throw new Error(`homog: not a homog key: ${key}`);
  if (parts[1] === 'stack') {
    if (parts.length === 3) return { topology: 'stack', registered: parts[2], key };
    const mats = parts[2].split('+'), ts = parts[3].split('/').map(Number);
    if (mats.length !== ts.length || ts.some((t) => !(t > 0))) throw new Error(`homog: bad stack key ${key} (homog:stack:<m1>+<m2>:<t1>/<t2>)`);
    return { topology: 'stack', layers: mats.map((m, q) => ({ material: m, t: ts[q] })), key };
  }
  const p = parseHomogKey(key);
  const base = { inclusion: p.constituents.inclusion, matrix: p.constituents.matrix, f: p.fraction, key, kind: p.kind };
  if (p.kind === 'rdl_layer') {
    if (p.axis === 'x' || p.axis === 'y') return { ...base, topology: 'strip', axis: p.axis };
    // a metal 'plane' too sparse for a circular antipad (f < 1 - pi / 4 = 0.2146: hole radius > p / 2) is isolated metal
    // islands: modelled as Cu columns in the dielectric (labelled)
    if (p.axis === 'plane') return p.fraction < 1 - Math.PI / 4 ? { ...base, topology: 'column', axis: 'z', note: `plane with metal fraction ${p.fraction} < 1 - pi/4: isolated metal columns` } : { ...base, topology: 'plane', axis: 'z' };
    if (p.axis === 'xy') return { ...base, topology: 'xy' };
    return { ...base, topology: 'column', axis: 'z' };
  }
  if (COLUMN_KINDS.includes(p.kind)) return { ...base, topology: 'column', axis: p.axis ?? 'z' };
  throw new Error(`homog: kind ${p.kind} has no RVE topology`);
}

// ---- constituent fingerprints (lane L11) -------------------------------------------------------------------------
/** Canonical text of a value: numbers at 12 significant digits, object keys sorted (stable across runs and hosts). */
export function canonText(v) {
  if (v == null) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(Number(v.toPrecision(12))) : String(v);
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (Array.isArray(v) || ArrayBuffer.isView(v)) return `[${Array.from(v, canonText).join(',')}]`;
  if (typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${k}:${canonText(v[k])}`).join(',')}}`;
  return JSON.stringify(String(v));
}
/** cyrb53 string hash (public-domain algorithm by bryc), 53 bits as 14 hex digits. */
export function hash53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
const TABLE_CFG_FIELDS = ['n', 'element', 'h_over_p', 'richardson'];
const CACHE_MAX = 20000;

const orthoPositive = (o) => ['Ex', 'Ey', 'Ez', 'Gyz', 'Gxz', 'Gxy'].every((q) => o[q] > 0);
const canon = (lib, k) => (lib && typeof lib.canonicalKey === 'function' ? lib.canonicalKey(k).key : k);

/**
 * Create a resolver that handles `homog:` keys by RVE and passes every other key to the library.
 * @param {object} lib materials library (resolve, rebaseSecantCte, canonicalKey)
 * @param {{n?: number, element?: 'q1im'|'q1', h_over_p?: number, richardson?: boolean, stackConstituents?: 'rve'|'rom',
 *   only?: 'all'|'stack'}} [cfg] only 'stack': other homog keys go to the library (ROM), only merged stacks here
 */
export function createRveResolver(lib, cfg = {}) {
  // cfg.cache: a Map shared between resolvers (e.g. the libraries applyOverrides derives from one attachment); safe
  // because every cache key carries the constituent fingerprint
  const cache = cfg.cache instanceof Map ? cfg.cache : new Map(), stacks = new Map();
  const { n = 32, element = 'q1im', h_over_p = 1, richardson = true, stackConstituents = 'rve' } = cfg;
  // CD6: the outer call's allowExtrapolation applies to the constituents; their extrapolation flags are collected
  // into the homogenized entry's provenance.extrapolated
  let ctx = { ropt: {}, flags: [] };
  const resolveC = (k, T, o = {}) => {
    const r = lib.resolve(k, T, { ...ctx.ropt, ...o });
    for (const x of r?.provenance?.extrapolated ?? []) ctx.flags.push({ constituent: k, ...x });
    return r;
  };
  const rebase = (e, Tsf, T, o = {}) => {
    const r = lib.rebaseSecantCte(e, Tsf, T, { ...ctx.ropt, ...o });
    if (Array.isArray(r?.warnings) && r.warnings.some((w) => /allowExtrapolation/.test(w))) ctx.flags.push({ constituent: typeof e === 'string' ? e : e?.key, property: 'cte', rule: 'hold_last_alpha', note: r.warnings.join('; ') });
    return r;
  };
  const stats = {
    table_exact: 0, table_interpolated: 0, table_miss_fingerprint: 0, table_miss_unverified: 0, table_miss_absent: 0, table_cfg_mismatch: 0,
    live_full: 0, live_k: 0, void_rom: 0, cache: 0,
  };
  const table0 = cfg.table ? indexTable(cfg.table) : null;
  // a table built with another discretization (n, element, h_over_p, richardson) is not used
  const cfgNow = { n, element, h_over_p, richardson };
  const tableCfgOk = !table0 || TABLE_CFG_FIELDS.every((q) => table0.meta.cfg?.[q] === cfgNow[q]);
  const table = tableCfgOk ? table0 : null;
  const tableGapK = cfg.tableGapK ?? 50;
  /**
   * Fingerprint of the resolved constituent values an RVE answer depends on (lane L11). Full (Tsf_K given): per
   * constituent the elastic constants (incl. orientation), the CTE re-based to (Tsf, T_eval), k, rho and cp at T_eval
   * (T_eval = Tsf + 1 K when T = Tsf, as the solve); k-only (Tsf_K null): constituent k at T. Stacks: layers with
   * thicknesses (nested homog layers by their own fingerprint) and the stackConstituents mode. Void matrix: inclusion
   * only. Returns null when a constituent does not resolve (the live path then raises the real error).
   */
  function fingerprint(key, T_K, Tsf_K = null, ropt = ctx.ropt) {
    try {
      return hash53(fpText(key, T_K, Tsf_K, ropt));
    } catch {
      return null;
    }
  }
  function fpText(key, T_K, Tsf_K, ropt) {
    const spec = rveSpecOf(key);
    let mats;
    if (spec.topology === 'stack') {
      const L = spec.registered ? stacks.get(spec.registered) : spec.layers;
      if (!L) throw new Error(`homog: stack ${spec.registered} is not registered`);
      mats = L.map((l) => ({ m: l.material, t: l.t }));
    } else mats = [{ m: spec.inclusion }, ...(spec.matrix === 'void' ? [] : [{ m: spec.matrix }])];
    const kOnly = !(Tsf_K > 0);
    // the solve temperature (Tsf + 1 K at T = Tsf); a void matrix is answered by the library ROM at T itself
    const Tm = kOnly || spec.matrix === 'void' ? T_K : Math.abs(T_K - Tsf_K) < 1e-3 ? Tsf_K + 1 : T_K;
    const parts = [RVE_VERSION, spec.topology, kOnly ? 'k' : 'full', spec.topology === 'stack' ? `stackConstituents=${stackConstituents}` : `void=${spec.matrix === 'void'}`];
    for (const { m, t } of mats) {
      if (String(m).startsWith('homog:')) {
        parts.push(`${m}|t=${canonText(t)}|${fpText(m, Tm, kOnly ? null : Tsf_K, ropt)}`);
        continue;
      }
      const k0 = canon(lib, m);
      let kk = null;
      try {
        kk = lib.resolve(k0, Tm, { ...ropt, need: ['k'] }).k_W_mK;
      } catch {
        if (kOnly) throw new Error(`homog: ${k0}: k does not resolve`);
      }
      if (kOnly) {
        // k-only table hits also serve rho and cp from the row (thermal transients): both are fingerprinted (audit)
        let rc = null;
        try {
          const r = lib.resolve(k0, Tm, { ...ropt, need: [] });
          rc = [r.rho_kg_m3, r.cp_J_kgK];
        } catch {
          rc = null;
        }
        parts.push(`${k0}|t=${canonText(t)}|k=${canonText(kk)}|rho_cp=${canonText(rc)}`);
        continue;
      }
      const r = lib.resolve(k0, Tm, { ...ropt, need: ['elastic', 'cte'] });
      const a = lib.rebaseSecantCte(k0, Tsf_K, Tm, ropt).alpha;
      parts.push(`${k0}|t=${canonText(t)}|el=${canonText(r.elastic)}|a=${canonText(a)}|k=${canonText(kk)}|rho=${canonText(r.rho_kg_m3)}|cp=${canonText(r.cp_J_kgK)}`);
    }
    return parts.join(';');
  }
  /** Table lookup with fingerprint verification at every row used; returns {hit} or {miss: reason}. */
  function lookup(key, T_K, Tsf_K, ropt) {
    if (!table) return { miss: table0 ? 'cfg_mismatch' : 'no_table' };
    const hit = tableLookup(table, key, T_K, Tsf_K, tableGapK);
    if (!hit) return { miss: 'absent' };
    const fps = [];
    for (const row of hit.rows) {
      const stored = hit.kOnly ? row.fp_k : row.fp;
      if (!stored) return { miss: 'unverified' };
      const now = fingerprint(key, row.T_K, hit.kOnly ? null : Tsf_K, ropt);
      if (now !== stored) return { miss: 'fingerprint', stored, now };
      fps.push(now);
    }
    return { hit, fps };
  }
  function rve(key, T_K, opts = {}) {
    // thermal-only calls (need without elastic / cte): conduction RVE only (scalar, cheap), no Tsf needed
    const kOnly = Array.isArray(opts.need) && !opts.need.includes('elastic') && !opts.need.includes('cte');
    const Tsf_K = opts.Tsf_K;
    if (!kOnly && !(Tsf_K > 0)) throw new Error(`homog: ${key}: Tsf_K (stress-free temperature) is required`);
    const ext = opts.allowExtrapolation ?? null;
    const ropt = ext ? { allowExtrapolation: ext } : {};
    const fp = fingerprint(key, T_K, kOnly ? null : Tsf_K, ropt);
    const ck = `${key}|${T_K}|${kOnly ? 'k' : Tsf_K}|${n}|${element}|${h_over_p}|${richardson}|${stackConstituents}|${JSON.stringify(ext)}|${JSON.stringify(opts.use ?? null)}|${fp}`;
    if (fp && cache.has(ck)) { stats.cache++; return cache.get(ck); }
    const lk = lookup(key, T_K, kOnly ? null : Tsf_K, ropt);
    if (lk.hit) {
      lk.hit.how === 'exact' ? stats.table_exact++ : stats.table_interpolated++;
      const e = entryFromRow(lk.hit, key, T_K, kOnly ? null : Tsf_K, table.meta);
      e.provenance.table.fingerprints = lk.fps;
      e.provenance.rve_table = { status: lk.hit.how === 'exact' ? 'hit_exact' : 'hit_interpolated', fingerprint: fp };
      if (fp) {
        if (cache.size >= CACHE_MAX) cache.clear();
        cache.set(ck, e);
      }
      return e;
    }
    if (lk.miss === 'fingerprint') stats.table_miss_fingerprint++;
    else if (lk.miss === 'unverified') stats.table_miss_unverified++;
    else if (lk.miss === 'absent') stats.table_miss_absent++;
    else if (lk.miss === 'cfg_mismatch') stats.table_cfg_mismatch++;
    const missInfo = { status: lk.miss === 'no_table' ? 'no_table' : `miss_${lk.miss}`, fingerprint: fp, ...(lk.stored ? { table_fingerprint: lk.stored } : {}) };
    const done = (e) => {
      if (e && e.provenance && typeof e.provenance === 'object') e.provenance.rve_table = missInfo;
      if (fp) {
        if (cache.size >= CACHE_MAX) cache.clear(); // bounded (the cache is shared by every override library)
        cache.set(ck, e);
      }
      return e;
    };
    if (kOnly) {
      if (/\+void:/.test(key)) stats.void_rom++;
      else stats.live_k++;
      const saved = ctx;
      ctx = { ropt, flags: [] };
      try {
        return done(kEntry(key, T_K));
      } finally {
        ctx = saved;
      }
    }
    if (/\+void:/.test(key)) stats.void_rom++;
    else stats.live_full++;
    const saved = ctx;
    ctx = { ropt, flags: [] };
    try {
      return done(rveUncached(key, T_K, opts, Tsf_K));
    } finally {
      ctx = saved;
    }
  }
  /** Conduction-only entry (thermal studies): exact laminate for stacks, periodic conduction RVE (n, 2n Richardson for
   * staircased cells) otherwise; elastic and cte null. */
  function kEntry(key, T) {
    const spec = rveSpecOf(key);
    if (spec.registered) spec.layers = stacks.get(spec.registered);
    if (spec.matrix === 'void') return lib.resolve(key, T, { need: ['k'] });
    const t0 = performance.now();
    let k, phases;
    if (spec.topology === 'stack') {
      const tot = spec.layers.reduce((a, l) => a + l.t, 0);
      const ls = spec.layers.map((l) => ({ f: l.t / tot, k: String(l.material).startsWith('homog:') ? rve(l.material, T, { need: ['k'], ...ctx.ropt }).k_W_mK : resolveC(canon(lib, l.material), T, { need: ['k'] }).k_W_mK }));
      k = [ls.reduce((a, l) => a + l.f * l.k[0], 0), ls.reduce((a, l) => a + l.f * l.k[1], 0), 1 / ls.reduce((a, l) => a + l.f / l.k[2], 0)];
    } else {
      const at = (nn) => {
        const cells = buildCellPair({ ...spec, n: nn, h_over_p });
        const res = cells.map((g) => {
          g.materials = g.materials.map((m) => canon(lib, m));
          return { f: g.achieved.inclusion_fraction, k: rveConduction(g, (m) => resolveC(m, T, { need: ['k'] }).k_W_mK).k };
        });
        if (res.length === 1) return res[0].k;
        const w = (spec.f - res[0].f) / (res[1].f - res[0].f);
        return res[0].k.map((v, i) => (1 - w) * v + w * res[1].k[i]);
      };
      const stair = spec.topology === 'column' || spec.topology === 'plane';
      let kk = at(n);
      if (stair && richardson) { const k2 = at(2 * n); const kx = k2.map((v, i) => 2 * v - kk[i]); kk = kx.every((v, i) => i % 4 !== 0 || v > 0) ? kx : k2; }
      k = [kk[0], kk[4], kk[8]];
      phases = [canon(lib, spec.inclusion), canon(lib, spec.matrix)];
    }
    const out = {
      key, T_K: T, homogenization: 'rve', topology: spec.topology, k_W_mK: k, rho_kg_m3: null, cp_J_kgK: null, elastic: null, cte: null,
      eps_r: null, tan_delta: null, f_ref_Hz: null, sigma_S_m: null,
      provenance: { basis: 'derived', homogenization: 'rve', version: RVE_VERSION, kOnly: true, constituents: phases ?? null, n, ms: performance.now() - t0, extrapolated: ctx.flags.slice() },
    };
    Object.defineProperty(out, '_homog', { value: true, enumerable: false });
    return out;
  }
  function rveUncached(key, T_K, opts, Tsf_K) {
    const spec = rveSpecOf(key);
    if (spec.registered) {
      const L = stacks.get(spec.registered);
      if (!L) throw new Error(`homog: stack ${spec.registered} is not registered (registerStack)`);
      spec.layers = L;
    }
    if (spec.matrix === 'void') {
      const r = lib.resolve(key, T_K, opts);
      r.provenance = { ...(r.provenance ?? {}), rve: 'not applicable (void matrix): library rule of mixtures' };
      return r;
    }
    const t0 = performance.now();
    // thermal strain needs T != Tsf; at T = Tsf use the 1 K secant (tangent limit)
    const Tm = Math.abs(T_K - Tsf_K) < 1e-3 ? Tsf_K + 1 : T_K;
    let out;
    if (spec.topology === 'stack') out = stackEntry(spec, Tm, Tsf_K);
    else out = fieldEntry(spec, Tm, Tsf_K);
    out.key = key;
    out.T_K = T_K;
    out.provenance.ms = performance.now() - t0;
    out.provenance.T_eval_K = Tm;
    out.provenance.extrapolated = ctx.flags.slice();
    Object.defineProperty(out, '_homog', { value: true, enumerable: false });
    return out;
  }
  function phase(k, T) {
    const key = canon(lib, k);
    const r = resolveC(key, T, { need: ['elastic', 'cte', 'k'] });
    return { key, r };
  }
  function stackEntry(spec, T, Tsf) {
    const T_ = spec.layers.reduce((a, l) => a + l.t, 0);
    const layers = spec.layers.map((l) => {
      if (String(l.material).startsWith('homog:')) {
        // homogenized constituent (e.g. an RDL level inside a merged thin stack): its own RVE entry at (Tsf, T)
        const r = stackConstituents === 'rom' ? resolveC(l.material, T, { Tsf_K: Tsf, homogenization: 'rom' }) : rve(l.material, T, { Tsf_K: Tsf, ...ctx.ropt });
        if (stackConstituents !== 'rom') for (const x of r.provenance?.extrapolated ?? []) ctx.flags.push({ via: l.material, ...x });
        return { key: l.material, r, C: stiffnessLab(r.elastic), alpha: [...r.cte.alpha, 0, 0, 0], f: l.t / T_ };
      }
      const { key, r } = phase(l.material, T);
      const a = rebase(key, Tsf, T).alpha;
      const C = stiffnessLab(r.elastic);
      const R = directionCosines(r.elastic.orientation ?? null);
      const al = Array.from(thermalStrainLab(a, R));
      return { key, r, C, alpha: al, f: l.t / T_ };
    });
    const L = laminate(layers, 'z');
    const S = invertDense(L.C, 6);
    // conduction: series through the stack, parallel in-plane (exact for a laminate)
    const hasK = layers.every((l) => Array.isArray(l.r.k_W_mK));
    const kx = hasK ? layers.reduce((s, l) => s + l.f * l.r.k_W_mK[0], 0) : null, ky = hasK ? layers.reduce((s, l) => s + l.f * l.r.k_W_mK[1], 0) : null;
    const kz = hasK ? 1 / layers.reduce((s, l) => s + l.f / l.r.k_W_mK[2], 0) : null;
    return entry({ C: L.C, S, alpha: L.alpha, k: hasK ? [kx, ky, kz] : null, phases: layers.map((l) => ({ key: l.key, f: l.f, r: l.r })), topology: 'stack', spec, extra: { method: 'exact laminate (laminate.mjs)' } });
  }
  // staircased topologies converge at first order in the cell size (L8 notes): Richardson with p = 1 from (n, 2n)
  function fieldEntry(spec, T, Tsf) {
    const stair = spec.topology === 'column' || spec.topology === 'plane';
    if (!stair || !richardson) return fieldEntryAt(spec, T, Tsf, n);
    const a = fieldEntryAt(spec, T, Tsf, n), b = fieldEntryAt(spec, T, Tsf, 2 * n);
    const C = b._C.map((v, i) => 2 * v - a._C[i]);
    const eps = b._eps.map((v, i) => 2 * v - a._eps[i]);
    const k = a._k && b._k ? b._k.map((v, i) => 2 * v - a._k[i]) : null;
    let S;
    try {
      S = invertDense(C, 6);
    } catch {
      S = null;
    }
    const ok = S && orthoPositive(orthoFromS(S)) && (!k || k.every((v) => v > 0));
    if (!ok) { b.provenance.richardson = 'rejected (extrapolated tensor not positive): 2n value used'; return b; }
    const out = entry({
      C, S, alpha: eps.map((e) => e / (T - Tsf)), k: k ? [k[0], k[4], k[8]] : null, topology: spec.topology, spec, phases: b._phases,
      extra: { ...b.provenance.extra_in, n_levels: [n, 2 * n], richardson: 'p = 1 from (n, 2n)', level_values: { n: a.elastic, n2: b.elastic, k_n: a.k_W_mK, k_n2: b.k_W_mK } },
    });
    return out;
  }
  function fieldEntryAt(spec, T, Tsf, n) {
    const cells = buildCellPair({ ...spec, n, h_over_p });
    const keys = { inclusion: canon(lib, spec.inclusion), matrix: canon(lib, spec.matrix) };
    const res = cells.map((g) => {
      g.materials = g.materials.map((m) => canon(lib, m));
      const el = rveElastic(g, { resolve: resolveC, rebase, T_K: T, Tsf_K: Tsf, element, resolveOpts: ctx.ropt });
      // conduction only when every phase has k (explicit test sets may carry mechanics only)
      const ks = [...new Set(g.materials)].map((m) => { try { return resolveC(m, T, { need: ['k'] }).k_W_mK; } catch { return null; } });
      const kk = ks.every((v) => Array.isArray(v)) ? rveConduction(g, (m) => resolveC(m, T, { need: ['k'] }).k_W_mK).k : null;
      return { f: g.achieved.inclusion_fraction, el, k: kk, g };
    });
    let C, epsTh, k, fUsed;
    if (res.length === 1) ({ C, k } = { C: res[0].el.C, k: res[0].k }), (epsTh = res[0].el.eps_th), (fUsed = res[0].f);
    else {
      const [a, b] = res, w = (spec.f - a.f) / (b.f - a.f);
      C = a.el.C.map((v, i) => (1 - w) * v + w * b.el.C[i]);
      epsTh = a.el.eps_th.map((v, i) => (1 - w) * v + w * b.el.eps_th[i]);
      k = a.k && b.k ? a.k.map((v, i) => (1 - w) * v + w * b.k[i]) : null;
      fUsed = spec.f;
    }
    const S = invertDense(C, 6);
    const alpha = epsTh.map((e) => e / (T - Tsf));
    const ri = resolveC(keys.inclusion, T, { need: ['elastic'] }), rm = resolveC(keys.matrix, T, { need: ['elastic'] });
    const phases = [{ key: keys.inclusion, f: spec.f, r: ri }, { key: keys.matrix, f: 1 - spec.f, r: rm }];
    const extra = {
        achieved_fractions: res.map((r) => r.f), fraction_interpolated: res.length === 2, fraction: fUsed,
        n, element, dof: res.map((r) => r.el.dof), rve_ms: res.map((r) => r.el.ms), k_offdiag_max: k ? Math.max(Math.abs(k[1]), Math.abs(k[2]), Math.abs(k[5])) : null,
        ...(spec.topology === 'xy' ? { h_over_p } : {}),
      };
    const e = entry({ C, S, alpha, k: k ? [k[0], k[4], k[8]] : null, topology: spec.topology, spec, phases, extra });
    Object.defineProperty(e, '_C', { value: C, enumerable: false });
    Object.defineProperty(e, '_eps', { value: epsTh, enumerable: false });
    Object.defineProperty(e, '_k', { value: k, enumerable: false });
    Object.defineProperty(e, '_phases', { value: phases, enumerable: false });
    e.provenance.extra_in = extra;
    return e;
  }
  function entry({ C, S, alpha, k, phases, topology, spec, extra }) {
    const o = orthoFromS(S);
    const rho = phases.every((p) => p.r.rho_kg_m3 != null) ? phases.reduce((s, p) => s + p.f * p.r.rho_kg_m3, 0) : null;
    const cp = rho && phases.every((p) => p.r.cp_J_kgK != null) ? phases.reduce((s, p) => s + p.f * p.r.rho_kg_m3 * p.r.cp_J_kgK, 0) / rho : null;
    const Cv = new Float64Array(36), Sr = new Float64Array(36);
    for (const p of phases) {
      const Ci = stiffnessLab(p.r.elastic), Si = invertDense(Ci, 6);
      for (let i = 0; i < 36; i++) { Cv[i] += p.f * Ci[i]; Sr[i] += p.f * Si[i]; }
    }
    const Cr = invertDense(Sr, 6);
    return {
      homogenization: 'rve',
      topology,
      k_W_mK: k,
      rho_kg_m3: rho,
      cp_J_kgK: cp,
      elastic: { type: 'ortho', ...o },
      cte: { kind: 'secant', Tref_K: null, alpha: [alpha[0], alpha[1], alpha[2]] },
      eps_r: null, tan_delta: null, f_ref_Hz: null, sigma_S_m: null,
      bounds: { C_voigt_Pa: Array.from(Cv), C_reuss_Pa: Array.from(Cr) },
      provenance: {
        basis: 'derived', homogenization: 'rve', version: RVE_VERSION, spec: { ...spec },
        constituents: phases.map((p) => ({ key: p.key, f: p.f })),
        C6_Pa: Array.from(C), non_orthotropic: nonOrthotropic(C), alpha6: alpha, ...extra,
        method: extra.method ?? 'periodic unit-cell FE (homog/rve.mjs), 6 strain cases + 1 thermal case',
      },
    };
  }
  const resolve = (key, T_K, opts = {}) => {
    if (typeof key === 'string' && key.startsWith('homog:') && (cfg.only !== 'stack' || key.startsWith('homog:stack:'))) {
      const r = rve(key, T_K, opts);
      if (r.cte) r.cte.Tref_K = opts.Tsf_K;
      return r;
    }
    return lib.resolve(key, T_K, opts);
  };
  /** Register a z laminate for `homog:stack:<id>` (layers [{material, t}], material may be a homog: key). */
  const registerStack = (id, layers) => { stacks.set(String(id), layers.map((l) => ({ material: l.material, t: l.t }))); return `homog:stack:${id}`; };
  return {
    resolve, rebase, rve, cache, registerStack, stacks, stats: () => ({ ...stats }), cfg: { n, element, h_over_p, richardson },
    fingerprint: (key, T_K, Tsf_K = null, opts = {}) => fingerprint(key, T_K, Tsf_K, opts.allowExtrapolation ? { allowExtrapolation: opts.allowExtrapolation } : {}),
    table: table0 ? { used: !!table, cfg: table0.meta.cfg, rows: table0.rows } : null,
  };
}

/** One-shot form for the materials library hook: resolveHomog(key, T_K, {lib, Tsf_K, n, element}). */
const DEFAULT = new WeakMap();
export function resolveHomog(key, T_K, opts = {}) {
  const { lib, ...rest } = opts;
  if (!lib) throw new Error('homog: resolveHomog needs opts.lib (materials library)');
  let r = DEFAULT.get(lib);
  if (!r) { r = createRveResolver(lib, { n: rest.n, element: rest.element }); DEFAULT.set(lib, r); }
  return r.resolve(key, T_K, rest);
}

// ---- precomputed RVE tables (browser shipping; coordinator request 2026-10-20) -------------------------------------
// Rule (stated in every table and in each served entry's provenance.table):
//   full rows (key, T, Tsf): served for the same key and Tsf (|dTsf| < 1e-6 K) at an exact T (|dT| < 1e-6 K), or by
//   linear interpolation in T of C6, the effective thermal strain eps = alpha (T - Tsf) and k between the two
//   nearest tabulated temperatures that bracket T, when both lie within tableGapK (default 50 K) of T;
//   k rows (key, T, Tsf null): the same rule for thermal-only calls (full rows also serve thermal-only calls).
//   Fingerprints (L11): each row stores the constituent fingerprint it was built with (fp full, fp_k conduction); a row
//   serves a request only when that equals the current library's fingerprint at the row's (T, Tsf), so overridden
//   constituents compute live; rows without a fingerprint (tables built before L11) are never used.
//   Anything else is computed live (and cached). Rows are built in range (no extrapolation; out-of-range requests are
//   listed in `skipped`), so they also serve calls that allow extrapolation.

export const RVE_TABLE_SCHEMA = 'ap-sim-rve-table/0';
export const RVE_TABLE_RULE = 'exact (key, Tsf, T) hit, else linear interpolation in T of C6, eps_th = alpha (T - Tsf) and k between the bracketing tabulated temperatures within tableGapK (50 K) at the same Tsf; a row is used only when its constituent fingerprint (fp full, fp_k conduction) equals the current library fingerprint at that row and the table cfg equals the resolver cfg; else live';

/** Serializable table row of a resolved RVE entry. */
export function rveTableRow(e, T_K, Tsf_K, fp = {}) {
  const C6 = e.provenance?.C6_Pa ?? null;
  return {
    key: e.key, T_K, Tsf_K, topology: e.topology, C6, alpha6: e.provenance?.alpha6 ?? (e.cte ? [...e.cte.alpha, 0, 0, 0] : null),
    k: e.k_W_mK, rho: e.rho_kg_m3, cp: e.cp_J_kgK,
    // constituent fingerprints of the values the row was built with (L11): full rows `fp`, rows with k `fp_k`
    fp: Tsf_K == null ? null : fp.fp ?? null, fp_k: e.k_W_mK ? fp.fp_k ?? null : null,
  };
}

/**
 * Build a table for a list of requests [{key, T_C, Tsf_C | null}] with a resolver from createRveResolver (deterministic:
 * same library, cfg and requests give the same rows). Returns a JSON-serializable object.
 */
export function buildRveTable(resolver, requests, { onProgress = null } = {}) {
  const rows = [], skipped = [], t0 = performance.now();
  requests.forEach((q, i) => {
    const T_K = q.T_C + 273.15, Tsf_K = q.Tsf_C == null ? null : q.Tsf_C + 273.15;
    let e;
    try {
      e = Tsf_K == null ? resolver.rve(q.key, T_K, { need: ['k'] }) : resolver.rve(q.key, T_K, { Tsf_K });
    } catch (err) {
      // e.g. a constituent outside its data range (CD6: such calls need allowExtrapolation and bypass the table)
      skipped.push({ ...q, reason: err.message.slice(0, 200) });
      return;
    }
    if (e.homogenization !== 'rve') return; // void matrix: library ROM, not tabulated
    const fp = resolver.fingerprint ? { fp: Tsf_K == null ? null : resolver.fingerprint(q.key, T_K, Tsf_K), fp_k: resolver.fingerprint(q.key, T_K, null) } : {};
    rows.push(rveTableRow(e, T_K, Tsf_K, fp));
    onProgress?.(i + 1, requests.length, q.key);
  });
  return { schema: RVE_TABLE_SCHEMA, version: RVE_VERSION, cfg: resolver.cfg, rule: RVE_TABLE_RULE, generated_ms: Math.round(performance.now() - t0), rows, skipped };
}

function indexTable(t) {
  if (t.schema !== RVE_TABLE_SCHEMA) throw new Error(`homog: RVE table schema ${t.schema} (expected ${RVE_TABLE_SCHEMA})`);
  const byKey = new Map();
  for (const r of t.rows) {
    if (!byKey.has(r.key)) byKey.set(r.key, { full: new Map(), k: [] });
    const e = byKey.get(r.key);
    if (r.k) e.k.push(r);
    if (r.Tsf_K != null && r.C6) {
      const ts = r.Tsf_K.toFixed(6);
      if (!e.full.has(ts)) e.full.set(ts, []);
      e.full.get(ts).push(r);
    }
  }
  for (const e of byKey.values()) { e.k.sort((a, b) => a.T_K - b.T_K); for (const l of e.full.values()) l.sort((a, b) => a.T_K - b.T_K); }
  return { byKey, rows: t.rows.length, meta: { version: t.version, cfg: t.cfg, rule: t.rule } };
}

function bracket(list, T, gap) {
  const ex = list.find((r) => Math.abs(r.T_K - T) < 1e-6);
  if (ex) return { how: 'exact', rows: [ex], w: 0 };
  let lo = null, hi = null;
  for (const r of list) { if (r.T_K < T) lo = r; else if (r.T_K > T && !hi) hi = r; }
  if (lo && hi && T - lo.T_K <= gap && hi.T_K - T <= gap) return { how: 'interpolated', rows: [lo, hi], w: (T - lo.T_K) / (hi.T_K - lo.T_K) };
  return null;
}

function tableLookup(t, key, T_K, Tsf_K, gap) {
  const e = t.byKey.get(key);
  if (!e) return null;
  if (Tsf_K == null) {
    const all = e.k.length ? e.k : [];
    const b = bracket(all, T_K, gap);
    return b ? { ...b, kOnly: true } : null;
  }
  const list = e.full.get(Tsf_K.toFixed(6));
  if (!list) return null;
  const b = bracket(list, T_K, gap);
  return b ? { ...b, kOnly: false, Tsf_K } : null;
}

function entryFromRow(hit, key, T_K, Tsf_K, meta) {
  const [a, b] = hit.rows, w = hit.w;
  const lerp = (x, y) => (y == null ? x : x.map((v, i) => (1 - w) * v + w * y[i]));
  const k = lerp(a.k, b?.k);
  const prov = { basis: 'derived', homogenization: 'rve', version: meta.version, table: { how: hit.how, T_K: hit.rows.map((r) => r.T_K), rule: meta.rule, cfg: meta.cfg } };
  const out = { key, T_K, homogenization: 'rve', topology: a.topology, k_W_mK: k, rho_kg_m3: a.rho, cp_J_kgK: a.cp, elastic: null, cte: null, eps_r: null, tan_delta: null, f_ref_Hz: null, sigma_S_m: null, provenance: prov };
  if (!hit.kOnly) {
    const C = lerp(a.C6, b?.C6);
    // interpolate the effective thermal strain (alpha (T - Tsf)), not alpha, so a T near Tsf stays regular
    const ea = a.alpha6.map((v) => v * (a.T_K - Tsf_K)), eb = b ? b.alpha6.map((v) => v * (b.T_K - Tsf_K)) : null;
    const eps = lerp(ea, eb);
    const dT = Math.abs(T_K - Tsf_K) < 1e-3 ? null : T_K - Tsf_K;
    const alpha = dT == null ? a.alpha6 : eps.map((v) => v / dT);
    const S = invertDense(C, 6);
    out.elastic = { type: 'ortho', ...orthoFromS(S) };
    out.cte = { kind: 'secant', Tref_K: Tsf_K, alpha: [alpha[0], alpha[1], alpha[2]] };
    prov.C6_Pa = Array.from(C);
    prov.alpha6 = alpha;
  }
  Object.defineProperty(out, '_homog', { value: true, enumerable: false });
  return out;
}
