// License: GPL-3.0-or-later.
// Parameter resolution: defaults and provenance from package3d.json `families[].params`, family extensions (new sim
// knobs, generalized formulas), user overrides. Status vocabulary (DevLog-010 A11): reported | derived | public |
// template | user. Status never upgrades (DevLog-008): a value computed from a template input is template; a user
// input makes every dependent value `user`.

import { evalExpr, identifiers, rValues } from './expr.mjs';

export const STATUSES = ['reported', 'derived', 'public', 'template', 'user'];
const RANK = { reported: 1, derived: 2, public: 3, template: 4, user: 5 };

export class GeneratorError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = 'GeneratorError';
    this.issues = issues;
  }
}

export function unitOf(name) {
  if (/_mm2$/.test(name)) return 'mm2';
  if (/_mm$/.test(name)) return 'mm';
  if (/_um$/.test(name)) return 'um';
  if (/_n$/.test(name)) return 'count';
  if (/_C$/.test(name)) return 'C';
  if (/_W$/.test(name)) return 'W';
  return '-';
}

/** Dominant status of a list (user > template > public > derived > reported). */
export function dominant(statuses) {
  let best = null;
  for (const s of statuses) if (s && (!best || RANK[s] > RANK[best])) best = s;
  return best;
}

/** Status of a value computed by a formula of kind `own` from inputs with `statuses`. */
export function combineStatus(own, statuses) {
  const d = dominant([own === 'reported' ? 'derived' : own, ...statuses]);
  return d === 'reported' ? 'derived' : d;
}

export function rnd(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return v;
  const r = Number(v.toFixed(4));
  return Object.is(r, -0) ? 0 : r;
}

function convert(v, conv) {
  if (!conv) return v;
  if (conv === 'um->mm') return v / 1000;
  if (conv === 'mm->um') return v * 1000;
  throw new GeneratorError(`unknown unit conversion ${conv}`);
}

function isExpr(v) {
  return typeof v === 'string' && v.startsWith('=');
}

/**
 * @param {object} jsonParams  package3d.json family `params`
 * @param {object} ext  {add: {name: def}, formulas: {name: def | [def,...]}}; def = {value?, formula?, status, note,
 *                      ref?, refs?, source?, options?, alternatives?, when?}
 * @param {object} overrides  user overrides {name: number | string | boolean | "=expr" | {value, status, ref|refs|note|source}}
 * @returns {{values: object, entries: object, warnings: object[]}}
 */
export function resolveParams(jsonParams, ext = {}, overrides = {}) {
  const defs = {};
  for (const [name, e] of Object.entries(jsonParams || {})) {
    const d = { name, src: 'json', status: e.status, note: e.note, ref: e.ref, refs: e.refs, source: e.source,
      jsonValue: e.value, inputs: e.inputs || [] };
    if (e.formula) {
      d.formula = e.formula;
      d.rvals = /\br\d+\b/.test(e.formula) ? rValues(e.formula, e.values) : {};
    } else if ((e.inputs || []).length === 1) {
      d.alias = e.inputs[0];
      d.conv = e.conv;
    } else {
      d.value = e.value;
    }
    defs[name] = d;
  }
  for (const [name, a] of Object.entries(ext.add || {})) {
    if (defs[name]) throw new GeneratorError(`family extension redefines package3d param ${name}`);
    defs[name] = { name, src: 'ext', inputs: [], ...a };
  }
  // generalized / rule-dependent formulas (first matching `when` wins; entries without `when` are the default)
  const alt = {};
  for (const [name, f] of Object.entries(ext.formulas || {})) {
    if (!defs[name]) throw new GeneratorError(`formula extension for unknown param ${name}`);
    alt[name] = Array.isArray(f) ? f : [f];
  }
  const overridden = new Set();
  const warnings = [];
  for (const [name, ov] of Object.entries(overrides || {})) {
    if (!defs[name]) throw new GeneratorError(`unknown parameter ${JSON.stringify(name)}`, [{ code: 'unknown_param', param: name }]);
    const d = defs[name];
    overridden.add(name);
    const keep = { name, src: d.src, options: d.options, alternatives: d.alternatives, kind: d.kind };
    if (ov && typeof ov === 'object' && !Array.isArray(ov)) {
      if (!('value' in ov)) throw new GeneratorError(`override ${name}: object form needs value`);
      const st = ov.status || 'user';
      if (!STATUSES.includes(st)) throw new GeneratorError(`override ${name}: status ${st} not in ${STATUSES.join(', ')}`);
      if (st !== 'user' && !(ov.ref || ov.refs || ov.note || ov.source)) {
        throw new GeneratorError(`override ${name}: status ${st} needs ref, refs, source or note`);
      }
      if (st === 'reported' && !(ov.ref || ov.refs)) throw new GeneratorError(`override ${name}: reported needs ref`);
      const base = { ...keep, status: st, note: ov.note, ref: ov.ref, refs: ov.refs, source: ov.source, locator: ov.locator,
        overridden: true };
      defs[name] = isExpr(ov.value) ? { ...base, formula: ov.value.slice(1), rvals: {}, ownStatus: st }
        : { ...base, value: ov.value };
    } else if (isExpr(ov)) {
      defs[name] = { ...keep, status: 'user', formula: ov.slice(1), rvals: {}, overridden: true };
    } else {
      defs[name] = { ...keep, status: 'user', value: ov, overridden: true };
    }
    delete alt[name];
  }
  for (const [name, d] of Object.entries(defs)) {
    if (d.options && 'value' in d && !d.options.includes(d.value) && !d.formula) {
      throw new GeneratorError(`parameter ${name} = ${JSON.stringify(d.value)} not in ${JSON.stringify(d.options)}`,
        [{ code: 'bad_option', param: name }]);
    }
  }

  const values = {};
  const entries = {};
  const touched = {};
  const state = {};
  const get = (name, chain = []) => {
    if (name in values) return values[name];
    if (!defs[name]) throw new GeneratorError(`unknown parameter ${name} (needed by ${chain.at(-1) ?? 'layout'})`);
    if (state[name] === 'busy') throw new GeneratorError(`circular parameter dependency: ${[...chain, name].join(' -> ')}`);
    state[name] = 'busy';
    let d = defs[name];
    let generalized = null;
    if (alt[name]) {
      const pick = alt[name].find((a) => !a.when || Object.entries(a.when).every(([k, v]) => get(k, [...chain, name]) === v));
      if (pick) {
        generalized = pick;
        d = { ...d, formula: pick.formula ?? undefined, rvals: pick.rvals || d.rvals || {}, alias: undefined,
          value: pick.formula === null ? (pick.value ?? d.jsonValue) : d.value,
          status: pick.status || d.status, note: pick.note ? `${pick.note}${d.note ? `; ${d.note}` : ''}` : d.note,
          refs: pick.refs ? [...new Set([...(d.refs || []), ...pick.refs])] : d.refs };
        if (pick.formula === null) { d.formula = undefined; }
        if (pick.replace) {
          for (const k of ['ref', 'refs', 'note', 'source', 'locator', 'alternatives']) d[k] = pick[k];
          d.status = pick.status || d.status;
        }
      }
    }
    const whenKeys = generalized && generalized.when ? Object.keys(generalized.when) : [];
    let value;
    let status = d.status;
    let inputs = [];
    let formula;
    if (d.formula) {
      formula = d.formula;
      inputs = identifiers(d.formula).filter((id) => !/^r\d+$/.test(id));
      const lk = (id) => (/^r\d+$/.test(id) ? d.rvals[id] : get(id, [...chain, name]));
      value = evalExpr(d.formula, lk);
      const own = d.overridden ? (d.ownStatus || 'user') : (d.status || 'template');
      status = combineStatus(own, inputs.map((i) => entries[i].status));
    } else if (d.alias) {
      inputs = [d.alias];
      value = convert(get(d.alias, [...chain, name]), d.conv);
      status = dominant([d.status, entries[d.alias].status]);
      if (d.src === 'ext' && !d.note && !d.ref && !d.refs) {
        const src = entries[d.alias];
        d = { ...d, ref: src.ref, refs: src.refs, note: src.note, source: src.source };
      }
    } else {
      value = d.value;
    }
    if (whenKeys.length) status = dominant([status, ...whenKeys.map((k) => entries[k].status)]);
    const isTouched = !!d.overridden || inputs.some((i) => touched[i]) || whenKeys.some((k) => touched[k]);
    touched[name] = isTouched;
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new GeneratorError(`parameter ${name} evaluates to ${value}${formula ? ` (${formula})` : ''}`,
        [{ code: 'non_finite', param: name }]);
    }
    if (!isTouched && d.src === 'json' && typeof value === 'number' && typeof d.jsonValue === 'number') {
      if (Math.abs(value - d.jsonValue) > 5e-5 * Math.max(1, Math.abs(d.jsonValue))) {
        warnings.push({ code: 'default_mismatch', level: 'warn', param: name,
          message: `${name}: generator default ${value} != package3d.json ${d.jsonValue}${generalized ? ' (generalized formula)' : ''}` });
      }
    }
    values[name] = value;
    const ent = { value: rnd(value), unit: unitOf(name), status };
    for (const k of ['ref', 'refs', 'note', 'source', 'locator', 'options', 'alternatives', 'kind']) if (d[k] !== undefined) ent[k] = d[k];
    if (formula) ent.formula = formula;
    if (inputs.length) ent.inputs = inputs;
    if (generalized) ent.generalized = true;
    entries[name] = ent;
    state[name] = 'done';
    return value;
  };
  for (const name of Object.keys(defs).sort()) get(name);
  // slider / validation bounds: only where a source or a layout rule defines them (ext.bounds; basis required)
  for (const [name, b] of Object.entries(ext.bounds || {})) {
    if (!entries[name]) throw new GeneratorError(`bounds for unknown param ${name}`);
    if (!b.basis) throw new GeneratorError(`bounds for ${name} need a basis`);
    for (const k of ['min', 'max', 'integer']) if (b[k] !== undefined) entries[name][k] = b[k];
    entries[name].bounds_basis = b.basis;
    const v = values[name];
    if (typeof v !== 'number') continue;
    if (b.integer && !Number.isInteger(v)) warnings.push({ code: 'not_integer', level: 'error', param: name, message: `${name} = ${v} must be an integer` });
    if ((b.min !== undefined && v < b.min - 1e-9) || (b.max !== undefined && v > b.max + 1e-9)) {
      warnings.push({ code: 'out_of_range', level: b.hard ? 'error' : 'warn', param: name,
        message: `${name} = ${rnd(v)} outside [${b.min ?? '-inf'}, ${b.max ?? 'inf'}] (${b.basis})` });
    }
  }
  const sorted = {};
  for (const k of Object.keys(entries).sort()) sorted[k] = entries[k];
  return { values, entries: sorted, warnings, overridden: [...overridden] };
}
