// Materials library core (pure; no file I/O; runs in Node and in a Web Worker). Lane L2, DevLog-012; contract
// sims/SPEC.md section 4. `createLibrary({files, sources, aliases})` validates and compiles the data once and returns
// the API {resolve, rebaseSecantCte, homogenize, aliasTemplateKey, keys, entry, alternativesOf}.
// License: GPL-3.0-or-later.

import { validateFile, inheritProv, elasticSubLeaf, isNA, PROPERTIES } from './schema.mjs';
import { compileScalar, buildStrain, secantAlpha, rebasedAlpha } from './eval.mjs';
import { cubicDirectionalE, cubicIsotropicAverages } from './cubic.mjs';
import { C_TO_K, EPS0 } from './units.mjs';
import { homogenizeWith, parseHomogKey } from './homogenize.mjs';

export const DEFAULT_NEED = ['k', 'elastic', 'cte'];
export const SI_ORIENTATIONS = {
  crystal: { frame: 'crystal', rotation_z_deg: 0, note: 'lab x, y, z = [100], [010], [001]' },
  wafer_100_edges_110: {
    frame: 'wafer_100_edges_110',
    rotation_z_deg: 45,
    note: '(100) wafer, die edges along <110> (Hopcroft 2010 p.5: wafer frame [110], [-110], [001])',
  },
};

class MaterialError extends Error {}

function fail(msg) {
  throw new MaterialError(`materials: ${msg}`);
}

function needsOf(opts) {
  return new Set(opts.need ?? DEFAULT_NEED);
}

/** Merge an `inherits` chain: child properties replace parent properties one level deep. */
function flatten(raw, all, seen = new Set()) {
  if (!raw.inherits) return raw;
  if (seen.has(raw.inherits)) fail(`inherits cycle at ${raw.inherits}`);
  seen.add(raw.inherits);
  const parent = all[raw.inherits];
  if (!parent) fail(`inherits unknown key '${raw.inherits}'`);
  const p = flatten(parent, all, seen);
  // properties taken from the parent are marked on the leaf (`inherited_from`, shown in provenance)
  const inheritedProps = {};
  for (const [name, leaf] of Object.entries(p.properties ?? {}))
    if (!(raw.properties ?? {})[name]) inheritedProps[name] = leaf && typeof leaf === 'object' ? { ...leaf, inherited_from: leaf.inherited_from ?? raw.inherits } : leaf;
  return {
    ...p,
    ...raw,
    properties: { ...inheritedProps, ...(raw.properties ?? {}) },
    alternatives: { ...(p.alternatives ?? {}), ...(raw.alternatives ?? {}) },
    missing: [...(raw.missing ?? []), ...(p.missing ?? []).filter((m) => !(raw.missing ?? []).includes(m))],
  };
}

function compileTg(p) {
  if (!p || isNA(p.value) || p.status === 'pending_source') return null;
  const off = p.unit === 'C' ? C_TO_K : 0;
  return p.value + off;
}

function compileCte(p, entry) {
  if (!p || isNA(p.value) || p.status === 'pending_source') return { na: true, missing: p?.missing ?? null, pending: p?.pending ?? null };
  const TrefK = p.Tref_K ?? (p.Tref_C !== undefined ? p.Tref_C + C_TO_K : 293.15);
  const trefBasis = p.Tref_K !== undefined || p.Tref_C !== undefined ? 'source' : 'convention: 293.15 K for instantaneous data';
  const [lo, hi] = entry.valid_T_C;
  const domainK = [lo + C_TO_K - 100, hi + C_TO_K + 100];
  const leafOf = (a) => inheritProv(p, p.axes[a]);
  const axes = p.axes ? (p.axes.xy ? [leafOf('xy'), leafOf('xy'), leafOf('z')] : [leafOf('x'), leafOf('y'), leafOf('z')]) : [p, p, p];
  const tgK = entry.tgK;
  const strains = axes.map((leaf) => {
    const c = compileScalar(leaf, 'cte', { tgK });
    if (c.na) fail(`${entry.key}.cte axis is N/A`);
    return { st: buildStrain(c, p.kind, TrefK, domainK), rangeK: c.rangeK };
  });
  return { na: false, kind: p.kind, TrefK, trefBasis, strains, leaf: p };
}

function compileElastic(p, entry) {
  if (!p || isNA(p.value) || p.status === 'pending_source') return { na: true, missing: p?.missing ?? null, pending: p?.pending ?? null };
  const fields =
    p.model === 'iso' ? ['E', 'nu'] : p.model === 'cubic' ? ['C11', 'C12', 'C44'] : ['Ex', 'Ey', 'Ez', 'nuxy', 'nuyz', 'nuxz', 'Gxy', 'Gyz', 'Gxz'];
  const sub = {};
  for (const f of fields) sub[f] = compileScalar(elasticSubLeaf(p, f), f.startsWith('nu') ? 'dimensionless' : 'modulus', { tgK: entry.tgK });
  return { na: false, model: p.model, sub, leaf: p };
}

function compileProp(name, p, entry) {
  if (name === 'cte') return compileCte(p, entry);
  if (name === 'elastic') return compileElastic(p, entry);
  if (name === 'tg') return { na: !compileTg(p), value: compileTg(p), leaf: p };
  if (name === 'sigma') {
    const fam = p?.quantity === 'resistivity' ? 'resistivity' : 'electrical_conductivity';
    const c = compileScalar(p, fam, { tgK: entry.tgK });
    if (!c.na && fam === 'resistivity') {
      const ev = c.eval;
      c.eval = (TK, f) => 1 / ev(TK, f);
    }
    return c;
  }
  const fam = { density: 'density', cp: 'cp', k: 'conductivity', eps_r: 'dimensionless', tan_delta: 'dimensionless', cure_shrinkage: 'dimensionless' }[name];
  return compileScalar(p, fam, { tgK: entry.tgK });
}

function provOf(leaf, sources, extra = {}) {
  if (!leaf) return { status: 'N/A' };
  const ids = leaf.source === undefined ? [] : [].concat(leaf.source);
  const srcs = ids.map((i) => sources[i]).filter(Boolean);
  return {
    basis: leaf.basis ?? null,
    source: leaf.source ?? null,
    citation: srcs.length ? srcs.map((s) => s.citation).join(' | ') : null,
    paper_id: srcs.length ? srcs.map((s) => s.paper_id ?? null).filter(Boolean).join(' | ') || null : null,
    locator: leaf.locator ?? null,
    condition: leaf.condition ?? null,
    model: leaf.model ?? 'constant',
    note: leaf.note ?? null,
    assumption: leaf.assumption ?? null,
    inherited_from: leaf.inherited_from ?? null,
    ...(leaf.sensitivity_bound ? { sensitivity_bound: true } : {}),
    ...(leaf.status_A11 ? { override_status: leaf.status_A11 } : {}),
    ...(leaf.basis === 'template'
      ? { template: true, sensitivity: leaf.sensitivity ?? null, analog_of: leaf.analog_of ?? null, range_from: leaf.range_from ?? null, placeholder: !!leaf.placeholder }
      : {}),
    ...extra,
  };
}

/** Walk a raw entry (properties or alternatives) for template-basis leaves. */
function templateLeaves(obj, path, out, parent = null) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  if (obj.basis === 'template' && obj.value !== undefined) out.push({ path, leaf: obj, parent });
  for (const [k, v] of Object.entries(obj)) if (v && typeof v === 'object' && !Array.isArray(v)) templateLeaves(v, path ? `${path}.${k}` : k, out, obj);
}

export function createLibrary({ files, sources = {}, aliases = {} }) {
  const errors = [];
  const raw = {};
  const fileOf = {};
  for (const { name, doc } of files) {
    errors.push(...validateFile(doc, name, sources));
    for (const [k, m] of Object.entries(doc?.materials ?? {})) {
      if (raw[k]) errors.push(`${name}:${k}: duplicate key (also in ${fileOf[k]})`);
      raw[k] = m;
      fileOf[k] = name;
    }
  }
  if (errors.length) throw new MaterialError(`materials: schema errors:\n  ${errors.join('\n  ')}`);

  const entries = {};
  for (const key of Object.keys(raw)) {
    const m = flatten(raw[key], raw);
    const entry = { key, file: fileOf[key], raw: m, valid_T_C: m.valid_T_C, valid_K: m.valid_T_C.map((t) => t + C_TO_K) };
    entry.tgK = compileTg(m.properties?.tg);
    entry.props = {};
    for (const name of PROPERTIES) if (m.properties?.[name] !== undefined) entry.props[name] = compileProp(name, m.properties[name], entry);
    entry.alts = {};
    for (const [an, alt] of Object.entries(m.alternatives ?? {})) {
      const leaf = { ...alt };
      delete leaf.property;
      delete leaf.use;
      entry.alts[an] = { property: alt.property, use: alt.use, compiled: compileProp(alt.property, leaf, entry), leaf };
    }
    entries[key] = entry;
  }
  // Alias targets must exist.
  for (const [tk, a] of Object.entries(aliases.template_keys ?? {})) {
    if (a.key !== null && !entries[a.key]) throw new MaterialError(`materials: alias ${tk} -> unknown key ${a.key}`);
  }
  for (const [s, k] of Object.entries(aliases.db_aliases ?? {})) {
    if (!entries[k]) throw new MaterialError(`materials: db alias '${s}' -> unknown key ${k}`);
  }
  for (const [i, r] of (aliases.db_rules ?? []).entries()) if (!entries[r.key]) throw new MaterialError(`materials: db rule ${i} -> unknown key ${r.key}`);
  for (const [c, k] of Object.entries(aliases.class_defaults ?? {})) if (!entries[k]) throw new MaterialError(`materials: class default ${c} -> unknown key ${k}`);

  const lib = {};

  /** Library key for `name`: a library key, or a 3D-template key mapped through aliasTemplateKey (recorded). */
  function canonicalKey(name) {
    if (entries[name]) return { key: name, alias: null };
    if (aliases.template_keys?.[name]) {
      const a = aliasTemplateKey(name);
      return { key: a.key, alias: { from: name, to: a.key, rationale: a.rationale } };
    }
    fail(`unknown material key '${name}'`);
  }

  function getEntry(key) {
    const e = entries[key];
    if (!e) fail(`unknown material key '${key}'`);
    return e;
  }

  function pick(entry, name, opts) {
    const altName = opts.use?.[name];
    if (altName) {
      const alt = entry.alts[altName];
      if (!alt) fail(`${entry.key}: unknown alternative '${altName}'`);
      if (alt.property !== name) fail(`${entry.key}: alternative '${altName}' is for ${alt.property}, not ${name}`);
      return { c: alt.compiled, alt: altName };
    }
    return { c: entry.props[name], alt: null };
  }

  function naError(entry, name, c) {
    const why = c?.pending ? `pending_source ${c.pending.join(', ')}` : c?.missing ? String(c.missing) : 'not in library';
    return `${entry.key}.${name} is N/A (${why})`;
  }

  /**
   * Extrapolation permission (CD6): opts.allowExtrapolation = true (all keys) or a list of keys (library, template or
   * homog keys) from the case `materials.allow_extrapolation`.
   */
  function extAllowed(opts, ...keys) {
    const a = opts?.allowExtrapolation;
    return a === true || (Array.isArray(a) && keys.some((k) => k && a.includes(k)));
  }

  /** CD5: a template CTE is accepted only for compliant layers (E <= 100 MPa at T). */
  function templateCteGate(entry, c, TK) {
    if (c.leaf?.basis !== 'template') return;
    const el = entry.props.elastic;
    let E = null;
    if (el && !el.na && el.model === 'iso' && !el.sub.E.na) {
      const r = el.sub.E.rangeK;
      E = el.sub.E.eval(r ? Math.min(Math.max(TK, r[0]), r[1]) : TK);
    }
    if (!(E !== null && E <= 100e6)) fail(`${entry.key}.cte is a template value allowed only for compliant layers (E <= 100 MPa at ${(TK - C_TO_K).toFixed(1)} C); E = ${E === null ? 'N/A' : (E / 1e6).toFixed(3) + ' MPa'}`);
  }

  /** Range gate for one compiled leaf; returns the temperature to evaluate at (clamped if extrapolation is allowed). */
  function gateT(entry, name, rangeK, TK, opts, warnings) {
    if (!rangeK) return TK;
    if (TK >= rangeK[0] - 1e-9 && TK <= rangeK[1] + 1e-9) return TK;
    const msg = `${entry.key}.${name}: T = ${(TK - C_TO_K).toFixed(2)} C outside data range [${(rangeK[0] - C_TO_K).toFixed(2)}, ${(rangeK[1] - C_TO_K).toFixed(2)}] C`;
    if (!extAllowed(opts, entry.key)) throw new MaterialError(`materials: ${msg} (pass allowExtrapolation to clamp)`);
    warnings.push(`${msg}; held at the last table value (allowExtrapolation)`);
    (warnings.extrapolated ??= []).push({ property: name, T_C: TK - C_TO_K, range_C: [rangeK[0] - C_TO_K, rangeK[1] - C_TO_K], rule: name === 'cte' ? 'hold_last_alpha' : 'hold_last_value' });
    return Math.min(Math.max(TK, rangeK[0]), rangeK[1]);
  }

  function gateF(entry, name, c, fHz, opts, warnings) {
    if (c.rangeF) {
      if (fHz === undefined || fHz === null) fail(`${entry.key}.${name}: frequency table needs opts.f_Hz`);
      if (fHz < c.rangeF[0] * (1 - 1e-9) || fHz > c.rangeF[1] * (1 + 1e-9)) {
        const msg = `${entry.key}.${name}: f = ${fHz / 1e9} GHz outside data range [${c.rangeF[0] / 1e9}, ${c.rangeF[1] / 1e9}] GHz`;
        if (!opts.allowFrequencyExtrapolation) throw new MaterialError(`materials: ${msg} (pass allowFrequencyExtrapolation to clamp)`);
        warnings.push(`${msg}; clamped`);
        return Math.min(Math.max(fHz, c.rangeF[0]), c.rangeF[1]);
      }
      return fHz;
    }
    if (c.fRefHz && fHz !== undefined && fHz !== null && Math.abs(fHz / c.fRefHz - 1) > 0.01) {
      const msg = `${entry.key}.${name}: value given at ${c.fRefHz / 1e9} GHz, requested ${fHz / 1e9} GHz`;
      if (!opts.allowFrequencyExtrapolation) throw new MaterialError(`materials: ${msg} (pass allowFrequencyExtrapolation to use it)`);
      warnings.push(`${msg}; used as constant in f`);
    }
    return fHz;
  }

  function evalScalarProp(entry, name, TK, opts, need, warnings, prov) {
    const { c, alt } = pick(entry, name, opts);
    if (!c || c.na) {
      if (need.has(name)) throw new MaterialError(`materials: ${naError(entry, name, c)}`);
      prov[name] = { status: 'N/A', missing: c?.missing ?? null, pending: c?.pending ?? null };
      return null;
    }
    let T = TK;
    try {
      T = gateT(entry, name, c.rangeK, TK, opts, warnings);
    } catch (e) {
      if (need.has(name)) throw e;
      prov[name] = { status: 'out_of_range', message: e.message };
      return null;
    }
    let f = opts.f_Hz;
    if (c.rangeF || c.fRefHz) {
      try {
        f = gateF(entry, name, c, opts.f_Hz, opts, warnings);
      } catch (e) {
        if (need.has(name)) throw e;
        prov[name] = { status: 'out_of_range', message: e.message };
        return null;
      }
    }
    prov[name] = provOf(c.leaf, sources, { alternative: alt, f_GHz: c.leaf.f_GHz ?? null });
    return { v: c.eval(T, f), c };
  }

  function evalElastic(entry, TK, opts, need, warnings, prov) {
    const { c, alt } = pick(entry, 'elastic', opts);
    if (!c || c.na) {
      if (need.has('elastic')) throw new MaterialError(`materials: ${naError(entry, 'elastic', c)}`);
      prov.elastic = { status: 'N/A', missing: c?.missing ?? null, pending: c?.pending ?? null };
      return null;
    }
    const vals = {};
    const subProv = {};
    for (const [f, sc] of Object.entries(c.sub)) {
      if (sc.na) {
        const msg = `${entry.key}.elastic.${f} is N/A (${sc.pending ? `pending_source ${sc.pending.join(', ')}` : sc.missing ?? 'no source'})`;
        if (need.has('elastic')) throw new MaterialError(`materials: ${msg}`);
        prov.elastic = { status: 'N/A', missing: msg };
        return null;
      }
      let T = TK;
      try {
        T = gateT(entry, `elastic.${f}`, sc.rangeK, TK, opts, warnings);
      } catch (e) {
        if (need.has('elastic')) throw e;
        prov.elastic = { status: 'out_of_range', message: e.message };
        return null;
      }
      vals[f] = sc.eval(T);
      subProv[f] = provOf(sc.leaf, sources);
    }
    prov.elastic = { ...provOf(c.leaf, sources, { alternative: alt }), model: c.model, fields: subProv };
    if (c.model === 'iso') return { type: 'iso', E_Pa: vals.E, nu: vals.nu };
    if (c.model === 'ortho') return { type: 'ortho', ...vals };
    // cubic
    const C = { C11: vals.C11, C12: vals.C12, C44: vals.C44 };
    const mode = opts.elastic ?? 'cubic';
    if (mode === 'cubic') {
      const o = SI_ORIENTATIONS[opts.orientation ?? 'wafer_100_edges_110'];
      if (!o) fail(`unknown orientation '${opts.orientation}' (${Object.keys(SI_ORIENTATIONS).join(', ')})`);
      return { type: 'cubic', ...C, orientation: { ...o } };
    }
    const avg = cubicIsotropicAverages(C);
    if (mode === 'iso_hill') {
      prov.elastic.shortcut = 'iso_hill: Voigt-Reuss-Hill average of the cubic constants (derived; Hopcroft 2010 Eq. 14 gives the bounds)';
      return { type: 'iso', E_Pa: avg.hill.E, nu: avg.hill.nu };
    }
    if (mode === 'iso_110' || mode === 'iso_100') {
      const dir = mode === 'iso_110' ? [1, 1, 0] : [1, 0, 0];
      prov.elastic.shortcut = `${mode}: E along <${mode.slice(4)}> from the cubic constants, nu = Hill average (derived; isotropic shortcut, direction-dependent)`;
      return { type: 'iso', E_Pa: cubicDirectionalE(C, dir), nu: avg.hill.nu };
    }
    fail(`unknown elastic mode '${mode}' (cubic | iso_hill | iso_110 | iso_100)`);
  }

  function evalCte(entry, TK, opts, need, warnings, prov) {
    const { c, alt } = pick(entry, 'cte', opts);
    if (!c || c.na) {
      if (need.has('cte')) throw new MaterialError(`materials: ${naError(entry, 'cte', c)}`);
      prov.cte = { status: 'N/A', missing: c?.missing ?? null, pending: c?.pending ?? null };
      return null;
    }
    try {
      for (const s of c.strains) gateT(entry, 'cte', s.rangeK, TK, opts, warnings);
      templateCteGate(entry, c, TK);
    } catch (e) {
      if (need.has('cte')) throw e;
      prov.cte = { status: 'out_of_range', message: e.message };
      return null;
    }
    prov.cte = provOf(c.leaf, sources, { alternative: alt, kind_stored: c.kind, Tref_K: c.strains[0].st.TmK, Tref_basis: c.trefBasis });
    // outside a table the thermal strain continues with the end instantaneous alpha (hold-last alpha), never across Tg
    return { kind: 'secant', Tref_K: c.strains[0].st.TmK, alpha: c.strains.map((s) => secantAlpha(s.st, TK)) };
  }

  /**
   * Resolve a library key at temperature T_K into SI properties (SPEC section 4).
   * opts: need (list; default ['k', 'elastic', 'cte']: a needed property that is N/A or out of range throws),
   * allowExtrapolation, allowFrequencyExtrapolation, f_Hz, use ({property: alternativeName}), elastic
   * ('cubic' | 'iso_hill' | 'iso_110' | 'iso_100'; cubic entries only), orientation ('wafer_100_edges_110' default |
   * 'crystal'), Tsf_K (homog: keys only).
   */
  function resolve(key, T_K, opts = {}) {
    if (typeof key === 'string' && key.startsWith('homog:')) return resolveHomogKey(key, T_K, opts);
    if (!(typeof T_K === 'number' && Number.isFinite(T_K) && T_K > 0)) fail(`resolve(${key}): T_K must be a positive finite number`);
    const requested = key;
    const ck = canonicalKey(key);
    key = ck.key;
    const entry = getEntry(key);
    const need = needsOf(opts);
    const warnings = [];
    const tkeys = Object.entries(aliases.template_keys ?? {})
      .filter(([, a]) => a.key === key)
      .map(([t]) => t);
    opts = { ...opts, allowExtrapolation: extAllowed(opts, key, requested, ...tkeys) };
    const [lo, hi] = entry.valid_K;
    if (T_K < lo - 1e-9 || T_K > hi + 1e-9) {
      const msg = `${key}: T = ${(T_K - C_TO_K).toFixed(2)} C outside valid_T_C [${entry.valid_T_C.join(', ')}]`;
      if (!opts.allowExtrapolation) fail(`${msg} (pass allowExtrapolation to override)`);
      warnings.push(`${msg}; allowExtrapolation`);
      (warnings.extrapolated ??= []).push({ property: 'valid_T_C', T_C: T_K - C_TO_K, range_C: entry.valid_T_C.slice(), rule: 'constants used as stored' });
    }
    if (entry.raw.status === 'pending_source' && need.size) {
      const neededPending = [...need].filter((n) => !entry.props[n] || entry.props[n].na);
      if (neededPending.length) fail(`${key} is pending_source (${(entry.raw.pending ?? []).join(', ')}); needed: ${neededPending.join(', ')}`);
    }
    const prov = {};
    const k = evalScalarProp(entry, 'k', T_K, opts, need, warnings, prov);
    const rho = evalScalarProp(entry, 'density', T_K, opts, need, warnings, prov);
    const cp = evalScalarProp(entry, 'cp', T_K, opts, need, warnings, prov);
    const elastic = evalElastic(entry, T_K, opts, need, warnings, prov);
    const cte = evalCte(entry, T_K, opts, need, warnings, prov);
    const eps = evalScalarProp(entry, 'eps_r', T_K, opts, need, warnings, prov);
    const sigma = evalScalarProp(entry, 'sigma', T_K, opts, need, warnings, prov);
    // cure shrinkage (L9 / L8 eigenstrain input): fraction; linear = volumetric / 3 (small strain) when volumetric
    const shr = evalScalarProp(entry, 'cure_shrinkage', T_K, opts, need, warnings, prov);
    let cure = null;
    if (shr) {
      const kind = shr.c.leaf.kind;
      cure = { value: shr.v, kind, linear: kind === 'linear' ? shr.v : kind === 'volumetric' ? shr.v / 3 : null, volumetric: kind === 'volumetric' ? shr.v : kind === 'linear' ? 3 * shr.v : null };
      prov.cure_shrinkage.kind = kind;
    }
    let tan = null;
    const tanC = pick(entry, 'tan_delta', opts).c;
    if (tanC && !tanC.na && tanC.model === 'conductivity') {
      const f = opts.f_Hz;
      if (sigma && eps && f) {
        tan = sigma.v / (2 * Math.PI * f * EPS0 * eps.v);
        prov.tan_delta = provOf(tanC.leaf, sources, { formula: 'tan_d = sigma / (2 pi f eps0 eps_r) (Krupka 2006 Eq. 2, conductivity term only)' });
      } else if (need.has('tan_delta')) fail(`${key}.tan_delta (conductivity model) needs sigma, eps_r and opts.f_Hz`);
      else prov.tan_delta = { status: 'N/A', missing: 'conductivity model: sigma, eps_r or f_Hz not available' };
    } else {
      const t = evalScalarProp(entry, 'tan_delta', T_K, opts, need, warnings, prov);
      tan = t ? t.v : null;
    }
    const kv = k ? (Array.isArray(k.v) ? k.v.slice() : [k.v, k.v, k.v]) : null;
    const fRef = eps?.c?.fRefHz ?? (eps?.c?.rangeF ? opts.f_Hz : null) ?? null;
    const out = {
      key,
      T_K,
      k_W_mK: kv,
      rho_kg_m3: rho ? rho.v : null,
      cp_J_kgK: cp ? cp.v : null,
      elastic,
      cte,
      eps_r: eps ? eps.v : null,
      tan_delta: tan,
      f_ref_Hz: fRef,
      sigma_S_m: sigma ? sigma.v : null,
      cure_shrinkage: cure,
      Tg_K: entry.tgK ?? null,
      provenance: {
        key,
        requested_key: requested,
        alias: ck.alias,
        file: entry.file,
        status: entry.raw.status,
        tier: String(entry.raw.tier),
        properties: prov,
        template: templateMarks(prov),
        assumptions: entry.raw.assumptions ?? [],
        extrapolated: warnings.extrapolated ?? [],
        warnings,
        missing: entry.raw.missing ?? [],
      },
    };
    Object.defineProperty(out, '_cteSource', { value: { key, use: opts.use?.cte ?? null }, enumerable: false });
    return out;
  }

  /**
   * Secant CTE re-based to a stress-free temperature Tsf_K, evaluated at T_K. `entry` = library key, resolved object
   * or {key, use}. Returns {kind: 'secant', Tref_K: Tsf_K, alpha: [ax, ay, az]}.
   */
  function rebaseSecantCte(entry, Tsf_K, T_K, opts = {}) {
    let key;
    let use = opts.use?.cte ?? null;
    if (typeof entry === 'string') key = entry;
    else if (entry && entry._cteSource) ({ key, use } = { key: entry._cteSource.key, use: use ?? entry._cteSource.use });
    else if (entry && entry._homog) {
      if (Math.abs(entry.cte.Tref_K - Tsf_K) > 1e-9) fail(`homogenized entry ${entry.key} is strain-free at ${entry.cte.Tref_K} K; re-homogenize at Tsf ${Tsf_K} K`);
      return { kind: 'secant', Tref_K: Tsf_K, alpha: entry.cte.alpha.slice() };
    } else if (entry && entry.key) key = entry.key;
    else fail('rebaseSecantCte: entry must be a key or a resolved material');
    const e = getEntry(key);
    const { c } = pick(e, 'cte', { use: use ? { cte: use } : undefined });
    if (!c || c.na) fail(naError(e, 'cte', c));
    const warnings = [];
    for (const TT of [Tsf_K, T_K]) {
      for (const s of c.strains) gateT(e, 'cte', s.rangeK, TT, opts, warnings);
      const [lo, hi] = e.valid_K;
      if ((TT < lo - 1e-9 || TT > hi + 1e-9) && !extAllowed(opts, key)) fail(`${key}: T = ${(TT - C_TO_K).toFixed(2)} C outside valid_T_C [${e.valid_T_C.join(', ')}]`);
      templateCteGate(e, c, TT);
    }
    return { kind: 'secant', Tref_K: Tsf_K, alpha: c.strains.map((s) => rebasedAlpha(s.st, Tsf_K, T_K)), warnings };
  }

  // CD7 (coordinator 2026-10-20): homog: keys resolve by the E3 RVE resolver when one is attached (default in
  // materials/node.mjs); opts.homogenization 'rom' selects the rule of mixtures; an RVE failure falls back to ROM with
  // a warning. The RVE resolver is injected (no import of engine/src/homog here) and sees a ROM view of this library,
  // so its own constituent and void-matrix calls never recurse into the RVE.
  let homogRve = null;
  let homogAttach = null;
  const romFallbacks = [];
  // Lane L11 (2026-10-20): the attachment carries one RVE cache (cfg.cache) that applyOverrides passes on to the
  // libraries it derives, so unchanged keys are not recomputed per override set; the resolver keys its cache and its
  // table lookups by a fingerprint of the resolved constituent values, so overridden constituents never reuse
  // default-constituent answers. The resolver is always built on this library's own ROM view (overrides included).
  function attachHomogResolver(createFn, cfg = {}) {
    if (typeof createFn !== 'function') fail('attachHomogResolver needs a resolver factory (homog/resolver.mjs createRveResolver)');
    const romView = Object.create(lib);
    romView.resolve = (k, T, o = {}) => resolve(k, T, { ...o, homogenization: 'rom' });
    const cfg2 = { ...cfg, cache: cfg.cache instanceof Map ? cfg.cache : new Map(), romFallbacks: Array.isArray(cfg.romFallbacks) ? cfg.romFallbacks : [] };
    homogRve = createFn(romView, cfg2);
    homogAttach = { createFn, cfg: cfg2 };
    return lib;
  }

  function resolveHomogKey(key, T_K, opts) {
    const mode = opts.homogenization ?? (homogRve ? 'rve' : 'rom');
    if (!['rom', 'rve'].includes(mode)) fail(`homogenization must be rom | rve, got ${mode}`);
    const rom = () => homogenize({ ...parseHomogKey(key), T_K, Tsf_K: opts.Tsf_K, opts });
    if (mode === 'rom') return rom();
    if (!homogRve) fail(`${key}: homogenization rve requested but no RVE resolver is attached (attachHomogResolver)`);
    const needCte = needsOf(opts).has('cte');
    if (needCte && !(opts.Tsf_K > 0)) fail(`${key}: Tsf_K (stress-free temperature) required for CTE`);
    const Tsf = opts.Tsf_K > 0 ? opts.Tsf_K : T_K; // thermal-only calls: CTE not reported
    let r;
    try {
      r = homogRve.resolve(key, T_K, { ...opts, Tsf_K: Tsf });
    } catch (e) {
      const fb = rom();
      fb.provenance.warnings.push(`RVE failed (${e.message}); rule-of-mixtures fallback`);
      fb.provenance.rve_error = e.message;
      // audit A3 S1 (L11 wave 2): fallbacks are counted per library and in the attachment family (homogStats)
      const ev = { key, T_C: T_K - C_TO_K, Tsf_C: opts.Tsf_K > 0 ? opts.Tsf_K - C_TO_K : null, error: e.message.slice(0, 300) };
      romFallbacks.push(ev);
      homogAttach?.cfg?.romFallbacks?.push(ev);
      return fb;
    }
    const out = { ...r, homogenization: r.homogenization ?? 'rve', provenance: { ...r.provenance, homogenization: r.homogenization ?? 'rve' } };
    // the RVE resolver may answer conduction-only (cte / elastic null) for thermal requests: guard before use
    const need = needsOf(opts);
    if (need.has('elastic') && !r.elastic) fail(`${key}: RVE returned no elastic data (requested need: ${[...need].join(', ')})`);
    if (needCte && !r.cte) fail(`${key}: RVE returned no CTE although CTE was requested`);
    if (!r.cte || (!needCte && !(opts.Tsf_K > 0))) out.cte = null;
    else out.cte = { ...r.cte, alpha: r.cte.alpha.slice(), Tref_K: Tsf };
    Object.defineProperty(out, '_homog', { value: true, enumerable: false });
    return out;
  }

  function homogenize(spec) {
    return homogenizeWith(lib, spec);
  }

  /** Default library key for a 3D-template material key; `other` has no default and throws. */
  function aliasTemplateKey(templateKey) {
    const a = aliases.template_keys?.[templateKey];
    if (!a) fail(`unknown template material key '${templateKey}'`);
    if (a.key === null) fail(`template key '${templateKey}' has no default library entry (${a.rationale}); map it per part in the case config`);
    return { key: a.key, rationale: a.rationale };
  }

  /** Properties of a resolve() result that use template-basis values (for UI badges and sensitivity runs). */
  function templateMarks(prov) {
    const out = [];
    for (const [name, p] of Object.entries(prov)) {
      if (p?.template) out.push({ property: name, sensitivity: p.sensitivity, analog_of: p.analog_of, placeholder: p.placeholder });
      for (const [f, fp] of Object.entries(p?.fields ?? {}))
        if (fp?.template) out.push({ property: `${name}.${f}`, sensitivity: fp.sensitivity, analog_of: fp.analog_of, placeholder: fp.placeholder });
    }
    return out;
  }

  /** Every template-basis value in the library: [{key, where, value, unit, analog_of, range_from, placeholder, sensitivity, note}]. */
  function listTemplateValues() {
    const rows = [];
    for (const key of Object.keys(entries)) {
      const own = raw[key];
      for (const [scope, obj] of [['properties', own.properties], ['alternatives', own.alternatives]]) {
        const found = [];
        templateLeaves(obj, scope, found);
        for (const { path, leaf, parent } of found)
          rows.push({
            key,
            where: path,
            value: leaf.value,
            unit: leaf.unit ?? (path.split('.').pop().startsWith('nu') ? '1' : parent?.unit ?? null),
            analog_of: leaf.analog_of ?? null,
            range_from: leaf.range_from ?? null,
            placeholder: !!leaf.placeholder,
            sensitivity: leaf.sensitivity ?? null,
            rationale: leaf.rationale ?? null,
            source: leaf.source ?? null,
            note: leaf.note ?? null,
          });
      }
    }
    return rows;
  }

  const tok = (s) => s.split(/[^a-z0-9.+]+/).filter(Boolean);
  /**
   * Map a DB `stack_layers.material` string (and optional material_class) to a library key:
   * 1. exact `db_aliases`; 2. ordered `db_rules` (class filter, tokens / contains / none / exclusive); 3. `class_defaults`.
   * Returns {key, via, rule} or null (string left for review).
   */
  function aliasDbStringDetail(s, materialClass) {
    const str = String(s ?? '').trim().toLowerCase();
    if (!str) return null;
    const exact = aliases.db_aliases?.[str];
    if (exact) return { key: exact, via: 'exact', rule: null };
    const toks = tok(str);
    const metalTok = new Set(aliases.metal_tokens ?? []);
    for (const [i, r] of (aliases.db_rules ?? []).entries()) {
      if (r.class && materialClass && !r.class.includes(materialClass)) continue;
      if (r.class && !materialClass && r.class_required) continue;
      const hitTok = (r.tokens ?? []).some((t) => toks.includes(t));
      const hitSub = (r.contains ?? []).some((c) => str.includes(c));
      if (!hitTok && !hitSub) continue;
      if ((r.none ?? []).some((c) => str.includes(c))) continue;
      if (r.exclusive && toks.some((t) => metalTok.has(t) && !(r.tokens ?? []).includes(t))) continue;
      return { key: r.key, via: 'rule', rule: i, confidence: r.confidence ?? 'keyword' };
    }
    const d = materialClass ? aliases.class_defaults?.[materialClass] : null;
    if (d) return { key: d, via: 'class_default', rule: null, confidence: 'class_default' };
    return null;
  }

  function aliasDbString(s, materialClass) {
    return aliasDbStringDetail(s, materialClass)?.key ?? null;
  }

  Object.assign(lib, {
    resolve,
    rebaseSecantCte,
    homogenize,
    aliasTemplateKey,
    canonicalKey,
    attachHomogResolver,
    homogenizationDefault: () => (homogRve ? 'rve' : 'rom'),
    homogAttachment: () => homogAttach,
    // RVE resolver counters of this library (table hits / fingerprint misses / live solves / cache; L11), or null
    // + RVE -> ROM fallbacks (audit A3 S1): rom_fallback (count), rom_fallback_keys (distinct keys), rom_fallback_events
    // (first 50: key, T_C, Tsf_C, error) of this library; {family: true}: of every library sharing this attachment
    // (applyOverrides derivatives, e.g. study-level or sensitivity-bound libraries built inside a runner)
    homogStats: ({ family = false } = {}) => {
      if (!homogRve) return null;
      const ev = family ? homogAttach?.cfg?.romFallbacks ?? romFallbacks : romFallbacks;
      return { ...(typeof homogRve.stats === 'function' ? homogRve.stats() : {}), rom_fallback: ev.length, rom_fallback_keys: [...new Set(ev.map((e) => e.key))], rom_fallback_events: ev.slice(0, 50) };
    },
    aliasDbString,
    aliasDbStringDetail,
    listTemplateValues,
    keys: () => Object.keys(entries),
    entry: (key) => getEntry(key).raw,
    alternativesOf: (key) => Object.fromEntries(Object.entries(getEntry(key).alts).map(([n, a]) => [n, { property: a.property, use: a.use }])),
    sources,
    aliases,
    MaterialError,
  });
  Object.defineProperty(lib, 'input', { value: { files, sources, aliases }, enumerable: false });
  return lib;
}

export { MaterialError };
