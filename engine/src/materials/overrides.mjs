// Case-level material overrides (lane L2, DevLog-012; SPEC section 1 `materials.overrides`). Pure module.
//
// Shape (per library key or 3D-template key):
//   materials:
//     overrides:
//       emc:
//         E_GPa:    {value: 18, status: reported, ref: "ectc51909.2023.00155 p.3 Table 8"}
//         nu:       {value: 0.3, status: template, note: "placeholder", sensitivity: {delta: {abs: 0.05}}}
//         cte_ppmK: {value: {alpha1: 7, alpha2: 25, Tg_C: 140}, status: reported, ref: "..."}   # or value: 7
//         k_W_mK:   {value: 0.95, status: public, ref: "..."}                                     # or [kx, ky, kz]
//         rho_kg_m3, cp_J_kgK: {value, status, ref|note}
// status `sensitivity` (wave 8): a bound run of a template value (E_GPa, nu, k_W_mK, cte_ppmK; E_GPa added
// 2026-10-21 by lane L26 for CD1 sensitivity bounds on moduli); provenance shows status sensitivity and
// `sensitivity_bound: true`. Bounds pass the same admissibility checks as any other override.
// Fields: E_GPa (isotropic E; replaces cubic / ortho elastic, which then needs nu too), nu, cte_ppmK (number = constant,
// [ax, ay, az] = per-axis constants;
// `kind` secant (default, Tref_C default 25 C, recorded as assumption override_cte_secant_Tref_25C) | instantaneous;
// {alpha1, alpha2, Tg_C} = instantaneous bilinear step, i.e. TMA slopes below / above Tg),
// k_W_mK (number or [kx, ky, kz]), rho_kg_m3, cp_J_kgK. Each needs `status` (A11: reported | derived | public | template
// | user) and `ref` or `note`. status template is allowed only for nu and k_W_mK (template policy) and gets the default
// sensitivity (nu +-0.05, k x0.5 / x2) unless one is given. The override becomes a leaf with basis `case_override`
// (or `template`) and a synthetic source id `case:<key>.<field>`, so resolve() provenance shows it.
// License: GPL-3.0-or-later.

import { createLibrary } from './library.mjs';
import { orthoCompliance, isPositiveDefinite6 } from './cubic.mjs';
import { C_TO_K } from './units.mjs';

export const OVERRIDE_FIELDS = ['E_GPa', 'nu', 'cte_ppmK', 'k_W_mK', 'rho_kg_m3', 'cp_J_kgK'];
export const OVERRIDE_STATUSES = ['reported', 'derived', 'public', 'template', 'user', 'sensitivity'];
const SENSITIVITY_FIELDS = ['E_GPa', 'nu', 'k_W_mK', 'cte_ppmK'];
const DEFAULT_SENS = { nu: { property: 'nu', delta: { abs: 0.05 } }, k_W_mK: { property: 'k', delta: { factor: [0.5, 2] } } };

const clone = (o) => JSON.parse(JSON.stringify(o));

const fin = (v) => typeof v === 'number' && Number.isFinite(v);
/** k_W_mK expression form (case form `k_W_mK: {expr}` or `{value: {expr}}`): the expression string, else null. */
function kExpr(o) {
  if (o && typeof o === 'object' && typeof o.expr === 'string') return o.expr;
  if (o && o.value && typeof o.value === 'object' && !Array.isArray(o.value) && typeof o.value.expr === 'string') return o.value.expr;
  return null;
}

/**
 * Admissibility of one override value (audit A3 S1, L11 wave 2): E > 0, isotropic 0 <= nu < 0.5, k / rho / cp > 0
 * (number or per-axis), CTE finite. Throws naming the key and field.
 */
function checkValue(key, field, o) {
  const bad = (why) => { throw new Error(`materials: override ${key}.${field} = ${JSON.stringify(o.value ?? o.expr)}: ${why}`); };
  const v = o.value;
  if (field === 'E_GPa' && !(fin(v) && v > 0)) bad('E must be a finite number > 0 (GPa)');
  if (field === 'nu' && !(fin(v) && v >= 0 && v < 0.5)) bad('isotropic Poisson ratio must satisfy 0 <= nu < 0.5');
  if (field === 'k_W_mK' && kExpr(o) == null && !((fin(v) && v > 0) || (Array.isArray(v) && v.length === 3 && v.every((x) => fin(x) && x > 0)))) bad('k must be > 0 (number or [kx, ky, kz])');
  if ((field === 'rho_kg_m3' || field === 'cp_J_kgK') && !(fin(v) && v > 0)) bad('must be a finite number > 0');
  if (field === 'cte_ppmK') {
    const ok = fin(v) || (Array.isArray(v) && v.every(fin)) || (v && typeof v === 'object' && fin(v.alpha1) && fin(v.alpha2) && fin(v.Tg_C));
    if (!ok) bad('CTE must be finite');
  }
}

function leafFor(key, field, o, sources, date) {
  if (field === 'k_W_mK' && kExpr(o) != null && o.value === undefined) o = { ...o, value: { expr: kExpr(o) } };
  if (!o || typeof o !== 'object' || o.value === undefined) throw new Error(`materials: override ${key}.${field} needs {value, status, ref|note}`);
  if (!OVERRIDE_STATUSES.includes(o.status)) throw new Error(`materials: override ${key}.${field}: status must be ${OVERRIDE_STATUSES.join('|')}`);
  if (!o.ref && !o.note) throw new Error(`materials: override ${key}.${field} needs ref or note`);
  const id = `case:${key}.${field}`;
  sources[id] = { citation: o.ref ?? o.note, access: 'case_config', read: 'case override' };
  const leaf = { source: id, locator: o.ref ? `case override (${o.ref})` : 'case override', verified_on: date, status_A11: o.status };
  if (o.note) leaf.note = o.note;
  if (o.status === 'sensitivity') {
    // bound run of a template value (CD1 / CD5 sensitivity): only for the fields that carry template sensitivity
    if (!SENSITIVITY_FIELDS.includes(field)) throw new Error(`materials: override ${key}.${field}: status sensitivity only for ${SENSITIVITY_FIELDS.join(', ')}`);
    leaf.basis = 'case_override';
    leaf.sensitivity_bound = true;
    return leaf;
  }
  if (o.status === 'template') {
    if (!DEFAULT_SENS[field]) throw new Error(`materials: override ${key}.${field}: status template only for nu and k_W_mK`);
    Object.assign(leaf, { basis: 'template', analog_of: o.ref ?? o.note, sensitivity: o.sensitivity ? { ...DEFAULT_SENS[field], ...o.sensitivity } : DEFAULT_SENS[field] });
  } else leaf.basis = 'case_override';
  return leaf;
}

/**
 * Return a new library (same API) with case overrides applied. `overrides` = {key: {E_GPa, nu, cte_ppmK, k_W_mK,
 * rho_kg_m3, cp_J_kgK}}; keys may be library keys or 3D-template keys (mapped through aliasTemplateKey).
 */
export function applyOverrides(lib, overrides = {}, { date = '2026-10-20' } = {}) {
  if (!overrides || !Object.keys(overrides).length) return lib;
  const input = lib.input;
  if (!input) throw new Error('materials: applyOverrides needs a library built by createLibrary');
  const files = input.files.map((f) => ({ name: f.name, doc: clone(f.doc) }));
  const sources = { ...input.sources };
  const where = {};
  for (const f of files) for (const k of Object.keys(f.doc.materials ?? {})) where[k] = f.doc.materials[k];
  const applied = [];
  for (const [name, fields] of Object.entries(overrides)) {
    const key = lib.canonicalKey(name).key;
    const m = where[key];
    if (!m) throw new Error(`materials: override for unknown key '${name}'`);
    for (const field of Object.keys(fields)) if (!OVERRIDE_FIELDS.includes(field)) throw new Error(`materials: override ${name}.${field}: unknown field (${OVERRIDE_FIELDS.join(', ')})`);
    // materialize inherited properties so the override edits this entry only
    const flat = lib.entry(key);
    m.properties = clone(flat.properties ?? {});
    if (m.inherits) delete m.inherits;
    for (const k of ['description', 'class', 'tier', 'status', 'valid_T_C']) if (m[k] === undefined) m[k] = flat[k];
    const P = m.properties;
    for (const field of Object.keys(fields)) if (fields[field] && typeof fields[field] === 'object') checkValue(name, field, fields[field]);
    const leaf = (field) => leafFor(key, field, fields[field], sources, date);
    if (fields.E_GPa || fields.nu) {
      let el = P.elastic;
      if (!el || el.value === 'N/A' || el.model !== 'iso') {
        if (!(fields.E_GPa && fields.nu) && (!el || el.model !== 'iso')) throw new Error(`materials: override ${name}: elastic '${el?.model ?? 'N/A'}' needs both E_GPa and nu to become isotropic`);
        el = { model: 'iso', unit: 'GPa', E: { value: 'N/A', missing: 'override' }, nu: { value: 'N/A', missing: 'override' } };
      }
      if (fields.E_GPa) el.E = { ...leaf('E_GPa'), value: fields.E_GPa.value, unit: 'GPa' };
      if (fields.nu) el.nu = { ...leaf('nu'), value: fields.nu.value, unit: '1' };
      // make sure untouched sub-leaves keep the block provenance as explicit fields
      const blockUnit = el.unit ?? 'GPa';
      for (const f of ['E', 'nu']) if (typeof el[f] !== 'object') el[f] = { value: el[f], basis: el.basis, source: el.source, locator: el.locator, verified_on: el.verified_on, unit: f === 'nu' ? '1' : blockUnit };
      if (typeof el.E === 'object' && el.E.unit === undefined) el.E.unit = blockUnit;
      P.elastic = el;
    }
    if (fields.cte_ppmK) {
      const o = fields.cte_ppmK;
      const base = { ...leaf('cte_ppmK'), unit: 'ppm/K' };
      if (Array.isArray(o.value)) {
        // per-axis constant [ax, ay, az] (audit A1 M5); same kind default as a scalar
        if (o.value.length !== 3 || !o.value.every((v) => typeof v === 'number' && Number.isFinite(v))) throw new Error(`materials: override ${name}.cte_ppmK: per-axis value must be [ax, ay, az]`);
        if (o.kind && !['secant', 'instantaneous'].includes(o.kind)) throw new Error(`materials: override ${name}.cte_ppmK: kind must be secant | instantaneous`);
        const kind = o.kind ?? 'secant';
        const Tref_C = kind === 'secant' ? (o.Tref_C ?? 25) : o.Tref_C;
        P.cte = { ...base, kind, axes: { x: { value: o.value[0] }, y: { value: o.value[1] }, z: { value: o.value[2] } }, ...(Tref_C !== undefined ? { Tref_C } : {}) };
        if (!o.kind || (kind === 'secant' && o.Tref_C === undefined)) P.cte.assumption = 'override_cte_secant_Tref_25C';
      } else if (typeof o.value === 'number') {
        // Audit A1 M6 (2026-10-20): a numeric override without `kind` is a secant (mean) CTE referenced to 25 C, the
        // usual datasheet meaning; the default is recorded as an assumption in provenance.
        if (o.kind && !['secant', 'instantaneous'].includes(o.kind)) throw new Error(`materials: override ${name}.cte_ppmK: kind must be secant | instantaneous`);
        const kind = o.kind ?? 'secant';
        const Tref_C = kind === 'secant' ? (o.Tref_C ?? 25) : o.Tref_C;
        P.cte = { ...base, kind, value: o.value, ...(Tref_C !== undefined ? { Tref_C } : {}) };
        if (!o.kind || (kind === 'secant' && o.Tref_C === undefined)) P.cte.assumption = 'override_cte_secant_Tref_25C';
      }
      else if (o.value && typeof o.value.alpha1 === 'number') P.cte = { ...base, kind: 'instantaneous', model: 'bilinear_tg', below: o.value.alpha1, above: o.value.alpha2, Tg_C: o.value.Tg_C };
      else throw new Error(`materials: override ${name}.cte_ppmK: value must be a number, [ax, ay, az] or {alpha1, alpha2, Tg_C}`);
    }
    if (fields.k_W_mK) {
      const ex = kExpr(fields.k_W_mK);
      // expression form (L11 wave 2): a T-dependent leaf (model expr_T, variables T_C / T_K), so homog constituents,
      // the RVE fingerprint and the table see it like any other k
      if (ex != null) {
        const { value: _v, ...lf } = leaf('k_W_mK');
        P.k = { ...lf, model: 'expr_T', expr: ex, unit: 'W/mK' };
      } else P.k = { ...leaf('k_W_mK'), value: fields.k_W_mK.value, unit: 'W/mK' };
    }
    if (fields.rho_kg_m3) P.density = { ...leaf('rho_kg_m3'), value: fields.rho_kg_m3.value, unit: 'kg/m3' };
    if (fields.cp_J_kgK) P.cp = { ...leaf('cp_J_kgK'), value: fields.cp_J_kgK.value, unit: 'J/kgK' };
    applied.push({ key, requested: name, fields: Object.keys(fields) });
  }
  const out = createLibrary({ files, sources, aliases: input.aliases });
  admissible(out, applied);
  const att = typeof lib.homogAttachment === 'function' ? lib.homogAttachment() : null;
  if (att) out.attachHomogResolver(att.createFn, att.cfg); // keep the CD7 RVE default
  Object.defineProperty(out, 'overridesApplied', { value: applied, enumerable: false });
  return out;
}

/**
 * Resolved-property admissibility of the overridden entries over their data range (audit A3 S1, L11 wave 2): the
 * elastic stiffness (isotropic: E > 0, 0 <= nu < 0.5; orthotropic: positive-definite compliance) when E or nu was
 * overridden, and k > 0 at 21 temperatures when k was given as an expression. Throws naming the key and field.
 */
function admissible(lib, applied) {
  for (const { key, requested, fields } of applied) {
    const e = lib.entry(key);
    const [lo, hi] = e.valid_T_C ?? [25, 25];
    const temps = Array.from({ length: 21 }, (_, i) => lo + ((hi - lo) * i) / 20 + C_TO_K);
    if (fields.includes('E_GPa') || fields.includes('nu')) {
      for (const T of [temps[0], temps[10], temps[20]]) {
        let el;
        try {
          // allowExtrapolation (hold last value): entry ranges may extend past the default E table when an alternative
          // reaches further (e.g. silicone_adhesive -65..250 C, default E to 150 C); the held values are what is checked
          el = lib.resolve(key, T, { need: ['elastic'], allowExtrapolation: [key] }).elastic;
        } catch (err) {
          throw new Error(`materials: override ${requested}.${fields.includes('nu') ? 'nu' : 'E_GPa'}: elastic data do not resolve at ${(T - C_TO_K).toFixed(1)} C (${err.message})`);
        }
        const ok = el.type === 'iso' ? el.E_Pa > 0 && el.nu >= 0 && el.nu < 0.5 : el.type === 'ortho' ? isPositiveDefinite6(orthoCompliance(el)) : true;
        if (!ok) throw new Error(`materials: override ${requested}.${fields.includes('nu') ? 'nu' : 'E_GPa'}: stiffness not admissible at ${(T - C_TO_K).toFixed(1)} C (${JSON.stringify(el)})`);
      }
    }
    if (fields.includes('k_W_mK') && lib.entry(key).properties?.k?.model === 'expr_T') {
      for (const T of temps) {
        try {
          lib.resolve(key, T, { need: ['k'] });
        } catch (err) {
          throw new Error(`materials: override ${requested}.k_W_mK: ${err.message}`);
        }
      }
    }
  }
}

/**
 * Override keys that match no material used by a case (warn, do not fail). `usedKeys` = material keys of the grid
 * (library, template or homog: keys); homog: keys contribute their constituents. With `lib`, keys are compared after
 * template-key aliasing (canonicalKey), so an override on `underfill` matches a part using `underfill_cuf`.
 */
export function unusedOverrideKeys(overrides, usedKeys, lib = null) {
  const canon = (k) => {
    if (!lib || typeof lib.canonicalKey !== 'function') return k;
    try {
      return lib.canonicalKey(k).key;
    } catch {
      return k;
    }
  };
  const used = new Set();
  for (const k of usedKeys ?? []) {
    const s = String(k);
    if (s.startsWith('homog:')) {
      const parts = s.split(':');
      for (const c of (parts[2] ?? '').split('+')) if (c && c !== 'void') used.add(canon(c));
    } else used.add(canon(s));
  }
  return Object.keys(overrides ?? {}).filter((k) => !used.has(canon(k)));
}
