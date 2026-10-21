// Schema validation for engine/data/materials/*.yaml (schema `ap-sim.materials/1`, lane L2, DevLog-012).
// Every leaf carries basis + source + locator (or is N/A with `missing` / `pending`). License: GPL-3.0-or-later.

import { knownUnit, PROPERTY_FAMILY } from './units.mjs';

export const SCHEMA_ID = 'ap-sim.materials/1';
export const BASES = ['datasheet', 'handbook', 'measured', 'paper_model_input', 'derived', 'template', 'case_override'];
// Template policy (coordinator decision 2026-10-20, DevLog-012): basis `template` only for a missing Poisson ratio or
// thermal conductivity, never for E, CTE or Tg. Preference: (a) analog_of a sourced same-class grade, (b) midpoint of a
// sourced class range (range_from), (c) placeholder nu = 0.30 for polymers / composites. Every template value carries
// sensitivity {property, delta: {abs} | {factor: [lo, hi]}}.
export const TEMPLATE_FIELDS = ['k', 'nu', 'nuxy', 'nuyz', 'nuxz'];
export const STATUSES = ['ok', 'partial', 'pending_source', 'placeholder'];
export const TIERS = ['mvp', '1', '2'];
export const PROPERTIES = ['density', 'cp', 'k', 'elastic', 'cte', 'tg', 'eps_r', 'tan_delta', 'sigma', 'cure_shrinkage'];
export const SHRINKAGE_KINDS = ['volumetric', 'linear', 'not_stated'];
export const TIER2_PROPERTIES = ['viscoelastic', 'viscoplastic', 'plasticity'];
export const SCALAR_MODELS = ['constant', 'table_T', 'bilinear_tg', 'linear_T', 'table_f', 'table_f_T', 'conductivity', 'expr_T'];
export const ELASTIC_MODELS = ['iso', 'ortho', 'cubic'];
export const CTE_KINDS = ['secant', 'instantaneous'];
export const TG_METHODS = ['DMA', 'DMA_tan_delta_peak', 'DMA_onset', 'TMA', 'DSC', 'not_stated'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PROVENANCE_KEYS = ['basis', 'source', 'locator', 'condition', 'verified_on', 'unit', 'note', 'primary_cited'];
export const isNA = (v) => v === 'N/A';

/** Merge inherited provenance fields (block -> leaf). */
export function inheritProv(parent, leaf) {
  const out = { ...leaf };
  for (const k of PROVENANCE_KEYS) if (out[k] === undefined && parent && parent[k] !== undefined) out[k] = parent[k];
  return out;
}

/** Sub-leaf of an elastic block (E, nu, C11, ...): inherits block provenance; Poisson ratios are dimensionless. */
export function elasticSubLeaf(el, f) {
  const raw = el[f];
  const base = raw !== null && typeof raw === 'object' ? raw : { value: raw };
  const leaf = inheritProv(el, base);
  if (f.startsWith('nu')) leaf.unit = base.unit ?? '1';
  return leaf;
}

function err(errors, where, msg) {
  errors.push(`${where}: ${msg}`);
}

function checkTemplate(errors, where, leaf, sources, field) {
  if (field === 'cte') {
    // CD5 (coordinator 2026-10-20): template CTE only for compliant layers (E <= 100 MPa, checked at resolve time),
    // with sensitivity {property: cte, delta: {factor: [<= 1/3, >= 3]}} and a rationale.
    const fac = leaf.sensitivity?.delta?.factor;
    if (!(Array.isArray(fac) && fac[0] <= 1 / 3 + 1e-9 && fac[1] >= 3 - 1e-9 && leaf.sensitivity.property === 'cte')) err(errors, where, 'template CTE needs sensitivity {property: cte, delta: {factor: [1/3, 3]}}');
    if (!leaf.rationale) err(errors, where, 'template CTE needs a rationale');
  } else if (!TEMPLATE_FIELDS.includes(field)) err(errors, where, `basis template not allowed for '${field}' (only Poisson ratio, k, and CTE of compliant layers)`);
  const sv = leaf.sensitivity;
  const d = sv?.delta;
  const okDelta =
    d &&
    ((typeof d.abs === 'number' && d.abs > 0) ||
      (Array.isArray(d.factor) && d.factor.length === 2) ||
      (typeof d.minus === 'number' && typeof d.plus === 'number' && d.minus >= 0 && d.plus >= 0 && d.minus + d.plus > 0));
  if (!sv || !sv.property || !okDelta) err(errors, where, 'template value needs sensitivity {property, delta: {abs} | {minus, plus} | {factor: [lo, hi]}}');
  const kinds = ['analog_of', 'range_from', 'placeholder'].filter((k) => leaf[k] !== undefined);
  if (kinds.length !== 1) return err(errors, where, 'template value needs exactly one of analog_of | range_from | placeholder');
  if (leaf.placeholder) {
    if (!/placeholder/.test(String(leaf.note ?? ''))) err(errors, where, "placeholder template needs a note containing 'placeholder'");
    if (!['nu', 'nuxy', 'nuyz', 'nuxz'].includes(field) || leaf.value !== 0.3) err(errors, where, 'placeholder only for nu = 0.30');
    return;
  }
  if (!leaf.source) err(errors, where, 'template analog / range needs the source of the analog value');
  else for (const s of [].concat(leaf.source)) if (sources && !sources[s]) err(errors, where, `source '${s}' not in _sources.yaml`);
  if (!leaf.locator) err(errors, where, 'locator required');
}

function checkProv(errors, where, leaf, sources, field) {
  const na = isNA(leaf.value) || leaf.status === 'pending_source';
  if (na) {
    if (!leaf.missing && !leaf.pending) err(errors, where, 'N/A value needs `missing` (text) or `pending` (paper ids)');
    if (leaf.pending && !Array.isArray(leaf.pending)) err(errors, where, '`pending` must be a list of paper ids');
    return;
  }
  if (!BASES.includes(leaf.basis)) err(errors, where, `basis '${leaf.basis}' not in ${BASES.join('|')}`);
  if (leaf.basis === 'template') {
    checkTemplate(errors, where, leaf, sources, field ?? '?');
    if (!leaf.verified_on || !ISO.test(String(leaf.verified_on))) err(errors, where, 'verified_on (ISO date) required');
    return;
  }
  if (!leaf.source) err(errors, where, 'source required');
  else for (const s of [].concat(leaf.source)) if (sources && !sources[s]) err(errors, where, `source '${s}' not in _sources.yaml`);
  if (!leaf.locator) err(errors, where, 'locator required');
  if (!leaf.verified_on || !ISO.test(String(leaf.verified_on))) err(errors, where, 'verified_on (ISO date) required');
}

function isNumArray(a) {
  return Array.isArray(a) && a.length > 0 && a.every((v) => typeof v === 'number' && Number.isFinite(v));
}

function checkIncreasing(errors, where, a, name) {
  for (let i = 1; i < a.length; i++) if (!(a[i] > a[i - 1])) return err(errors, where, `${name} must be strictly increasing`);
}

/** Validate one scalar leaf (value / table / bilinear / linear). `family` is the unit family. */
export function checkScalarLeaf(errors, where, leaf, family, sources, { allowAxes = false, field } = {}) {
  if (leaf === null || typeof leaf !== 'object') return err(errors, where, 'must be an object');
  checkProv(errors, where, leaf, sources, field ?? where.split('.').pop());
  if (isNA(leaf.value) || leaf.status === 'pending_source') return;
  const model = leaf.model ?? 'constant';
  if (!SCALAR_MODELS.includes(model)) return err(errors, where, `model '${model}' unknown`);
  if (leaf.range_C !== undefined && !(Array.isArray(leaf.range_C) && leaf.range_C.length === 2 && leaf.range_C[1] > leaf.range_C[0]))
    err(errors, where, 'range_C must be [lo, hi]');
  if (model !== 'conductivity' && family && !knownUnit(family, leaf.unit))
    err(errors, where, `unit '${leaf.unit}' not allowed for ${family}`);
  if (model === 'constant') {
    const v = leaf.value;
    const ok = (typeof v === 'number' && Number.isFinite(v)) || (allowAxes && isNumArray(v) && v.length === 3);
    if (!ok) err(errors, where, `constant needs a finite number${allowAxes ? ' or [x, y, z]' : ''}`);
  } else if (model === 'table_T') {
    const T = leaf.T_K ?? leaf.T_C;
    if (!isNumArray(T) || !isNumArray(leaf.value) || T.length !== leaf.value.length || T.length < 2)
      return err(errors, where, 'table_T needs T_K or T_C and value of equal length >= 2');
    if (leaf.T_K && leaf.T_C) err(errors, where, 'give T_K or T_C, not both');
    checkIncreasing(errors, where, T, 'T');
    if (leaf.interp && !['linear', 'loglog'].includes(leaf.interp)) err(errors, where, `interp '${leaf.interp}' unknown`);
  } else if (model === 'bilinear_tg') {
    if (typeof leaf.below !== 'number' || typeof leaf.above !== 'number') err(errors, where, 'bilinear_tg needs below and above');
    if (leaf.Tg_C !== undefined && typeof leaf.Tg_C !== 'number') err(errors, where, 'Tg_C must be a number');
    if (leaf.width_K !== undefined && !(leaf.width_K > 0)) err(errors, where, 'width_K must be > 0');
  } else if (model === 'expr_T') {
    if (typeof leaf.expr !== 'string' || !leaf.expr.trim()) err(errors, where, 'expr_T needs expr (expression in T_C / T_K)');
  } else if (model === 'linear_T') {
    if (![leaf.a, leaf.b, leaf.T0_C].every((v) => typeof v === 'number')) err(errors, where, 'linear_T needs a, b, T0_C (value = a + b (T_C - T0_C))');
    if (!Array.isArray(leaf.range_C) || leaf.range_C.length !== 2) err(errors, where, 'linear_T needs range_C');
  } else if (model === 'table_f') {
    if (!isNumArray(leaf.f_GHz) || !isNumArray(leaf.value) || leaf.f_GHz.length !== leaf.value.length)
      return err(errors, where, 'table_f needs f_GHz and value of equal length');
    checkIncreasing(errors, where, leaf.f_GHz, 'f_GHz');
  } else if (model === 'table_f_T') {
    if (!isNumArray(leaf.f_GHz) || !isNumArray(leaf.T_C) || !Array.isArray(leaf.value)) return err(errors, where, 'table_f_T needs f_GHz, T_C, value[f][T]');
    if (leaf.value.length !== leaf.f_GHz.length || leaf.value.some((r) => !isNumArray(r) || r.length !== leaf.T_C.length))
      err(errors, where, 'table_f_T value must be [f_GHz.length][T_C.length]');
    checkIncreasing(errors, where, leaf.f_GHz, 'f_GHz');
    checkIncreasing(errors, where, leaf.T_C, 'T_C');
  }
}

function checkCte(errors, where, cte, sources) {
  if (!cte || typeof cte !== 'object') return err(errors, where, 'must be an object');
  if (isNA(cte.value) || cte.status === 'pending_source') return checkProv(errors, where, cte, sources);
  if (!CTE_KINDS.includes(cte.kind)) err(errors, where, `kind is mandatory: ${CTE_KINDS.join('|')}`);
  if (cte.kind === 'secant' && cte.Tref_C === undefined && cte.Tref_K === undefined) err(errors, where, 'secant CTE needs Tref_C or Tref_K');
  if (cte.kind === 'secant' && cte.model && !['constant', 'table_T'].includes(cte.model)) err(errors, where, 'secant CTE supports constant or table_T');
  if (cte.axes) {
    const ax = Object.keys(cte.axes);
    const ok = (ax.length === 2 && ax.includes('xy') && ax.includes('z')) || (ax.length === 3 && ['x', 'y', 'z'].every((a) => ax.includes(a)));
    if (!ok) err(errors, where, 'axes must be {xy, z} or {x, y, z}');
    for (const a of ax) checkScalarLeaf(errors, `${where}.axes.${a}`, inheritProv(cte, cte.axes[a]), 'cte', sources, { field: 'cte' });
  } else checkScalarLeaf(errors, where, cte, 'cte', sources, { field: 'cte' });
}

function checkElastic(errors, where, el, sources) {
  if (!el || typeof el !== 'object') return err(errors, where, 'must be an object');
  if (isNA(el.value) || el.status === 'pending_source') return checkProv(errors, where, el, sources);
  if (!ELASTIC_MODELS.includes(el.model)) return err(errors, where, `model must be ${ELASTIC_MODELS.join('|')}`);
  const fields =
    el.model === 'iso'
      ? ['E', 'nu']
      : el.model === 'cubic'
        ? ['C11', 'C12', 'C44']
        : ['Ex', 'Ey', 'Ez', 'nuxy', 'nuyz', 'nuxz', 'Gxy', 'Gyz', 'Gxz'];
  for (const f of fields) {
    const raw = el[f];
    if (raw === undefined) {
      err(errors, where, `${f} missing (use N/A with missing)`);
      continue;
    }
    const fam = f.startsWith('nu') ? 'dimensionless' : 'modulus';
    checkScalarLeaf(errors, `${where}.${f}`, elasticSubLeaf(el, f), fam, sources, { field: f });
  }
}

function checkProperty(errors, where, name, p, sources) {
  if (name === 'elastic') return checkElastic(errors, where, p, sources);
  if (name === 'cte') return checkCte(errors, where, p, sources);
  if (name === 'tg') {
    checkScalarLeaf(errors, where, p, 'temperature', sources, { field: 'tg' });
    if (!isNA(p.value) && p.status !== 'pending_source' && !TG_METHODS.includes(p.method)) err(errors, where, `Tg method required: ${TG_METHODS.join('|')}`);
    return;
  }
  if (name === 'sigma') {
    const fam = p.quantity === 'resistivity' ? 'resistivity' : 'electrical_conductivity';
    return checkScalarLeaf(errors, where, p, fam, sources, { field: name });
  }
  if (name === 'tan_delta' && p.model === 'conductivity') return checkProv(errors, where, p, sources, name);
  if (name === 'cure_shrinkage' && !isNA(p.value) && p.status !== 'pending_source') {
    if (!SHRINKAGE_KINDS.includes(p.kind)) err(errors, where, `cure_shrinkage kind must be ${SHRINKAGE_KINDS.join('|')}`);
    if (p.model && p.model !== 'constant') err(errors, where, 'cure_shrinkage supports a constant value only');
  }
  checkScalarLeaf(errors, where, p, PROPERTY_FAMILY[name], sources, { allowAxes: name === 'k', field: name });
}

/** Validate a parsed data file. Returns a list of error strings (empty = valid). */
export function validateFile(doc, fileName, sources) {
  const errors = [];
  if (!doc || doc.schema !== SCHEMA_ID) return [`${fileName}: schema must be ${SCHEMA_ID}`];
  if (!doc.verified_on || !ISO.test(String(doc.verified_on))) err(errors, fileName, 'verified_on (ISO date) required');
  const mats = doc.materials;
  if (!mats || typeof mats !== 'object') return [...errors, `${fileName}: materials map required`];
  for (const [key, m] of Object.entries(mats)) {
    const w = `${fileName}:${key}`;
    if (!/^[a-z][a-z0-9_]*$/.test(key)) err(errors, w, 'key must be lower snake case');
    if (!m.description) err(errors, w, 'description required');
    if (!m.class) err(errors, w, 'class required');
    if (!TIERS.includes(String(m.tier))) err(errors, w, `tier must be ${TIERS.join('|')}`);
    if (!STATUSES.includes(m.status)) err(errors, w, `status must be ${STATUSES.join('|')}`);
    if (!Array.isArray(m.valid_T_C) || m.valid_T_C.length !== 2 || !(m.valid_T_C[1] > m.valid_T_C[0])) err(errors, w, 'valid_T_C [lo, hi] required');
    if (m.status === 'pending_source' && !(Array.isArray(m.pending) && m.pending.length)) err(errors, w, 'pending_source entry needs `pending` paper ids');
    const props = m.properties ?? {};
    if (!m.inherits && typeof props !== 'object') err(errors, w, 'properties map required');
    for (const [name, p] of Object.entries(props)) {
      if (TIER2_PROPERTIES.includes(name)) {
        if (!p || !['tier2_pending', 'tier2_data'].includes(p.status)) err(errors, `${w}.${name}`, 'tier-2 block needs status tier2_pending | tier2_data');
        if (p && p.status === 'tier2_data') checkProv(errors, `${w}.${name}`, p, sources);
        continue;
      }
      if (!PROPERTIES.includes(name)) {
        err(errors, w, `unknown property '${name}'`);
        continue;
      }
      checkProperty(errors, `${w}.${name}`, name, p, sources);
    }
    for (const [an, alt] of Object.entries(m.alternatives ?? {})) {
      const aw = `${w}.alternatives.${an}`;
      if (!PROPERTIES.includes(alt.property)) err(errors, aw, `property must be one of ${PROPERTIES.join('|')}`);
      if (!alt.use) err(errors, aw, '`use` required (e.g. sensitivity)');
      const leaf = { ...alt };
      delete leaf.property;
      delete leaf.use;
      if (PROPERTIES.includes(alt.property)) checkProperty(errors, aw, alt.property, leaf, sources);
    }
    if (m.missing !== undefined && !Array.isArray(m.missing)) err(errors, w, 'missing must be a list');
    if (m.assumptions !== undefined && !(Array.isArray(m.assumptions) && m.assumptions.every((a) => a && a.id && a.text)))
      err(errors, w, 'assumptions must be a list of {id, text}');
  }
  return errors;
}
