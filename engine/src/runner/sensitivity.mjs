// CD1 sensitivity runner (audit A1 S4; lane L3). Browser-safe: no Node imports; dependencies are injected.
// License: GPL-3.0-or-later.
//
// For one case: run the study at nominal, find the template-basis material properties the run actually used
// (library listTemplateValues() rows of the resolved keys, incl. homogenized constituents), rerun at each sensitivity
// bound of each row (nu +-0.05, k x0.5 / x2, as the row's `sensitivity` block says) and report the spread of every
// target quantity and of the study Tmax. Properties the case overrides itself are not template values and are skipped.
//
//   runSensitivity(c, { depsFor, lib, runCase, study, physics, boundStatus, onProgress }) -> report
//     depsFor(caseObj) -> {generate, resolve, materialOf, data, metricLookup, overridesApplied}  (e.g. L1 libraryAdapter)
//     lib: the L2 library object (listTemplateValues, aliasTemplateKey | canonicalKey)
//     runCase: L1 src/thermal/case.mjs runCase (thermal) or runCaseAll with the L8 mech module (thermo_elastic)
//     physics: which template properties are perturbed (PHYSICS_PROPS)
//     boundStatus: A11 status of the bound overrides (audit A2 M8: `sensitivity` once L2 accepts it; see runner/node.mjs)

const FIELD = { k: 'k_W_mK', nu: 'nu', cte: 'cte_ppmK' };
// thermal: k only. thermo_elastic (uniform temperature): nu and CTE; k does not enter. coupled (temperature from a
// thermal study): nu, k and CTE. mechanics: nu and k, kept for L1's CLI path, which adds the CTE bounds itself
// (cli.mjs addCteBounds); listing cte here as well would run those bounds twice.
export const PHYSICS_PROPS = { thermal: ['k'], thermo_elastic: ['nu', 'cte'], coupled: ['nu', 'k', 'cte'], mechanics: ['nu', 'k'] };
const NU_MAX = 0.499;
const NU_MIN = 0;

function canonical(lib, key) {
  if (!key || key === 'void') return null;
  try {
    if (typeof lib.canonicalKey === 'function') { const r = lib.canonicalKey(key); return typeof r === 'string' ? r : r?.key ?? key; }
    if (typeof lib.aliasTemplateKey === 'function') { const r = lib.aliasTemplateKey(key); return typeof r === 'string' ? r : r?.key ?? key; }
  } catch {
    return key;
  }
  return key;
}

/** Library keys behind a resolved material key (homog keys contribute their inclusion and matrix). */
export function keysOf(lib, key) {
  if (typeof key !== 'string') return [];
  if (key.startsWith('homog:')) {
    const mats = key.split(':')[2] || '';
    return mats.split('+').map((m) => canonical(lib, m)).filter(Boolean);
  }
  const k = canonical(lib, key);
  return k ? [k] : [];
}

/** Template rows (sensitivity-bearing) for the used keys and physics, minus properties the case overrides. */
export function templateRows(lib, usedKeys, c, physics = 'thermal') {
  const props = PHYSICS_PROPS[physics] ?? ['k'];
  const ov = c.materials?.overrides ?? {};
  const overridden = (key, prop) => {
    for (const [k, f] of Object.entries(ov)) if (canonical(lib, k) === key && f && f[FIELD[prop]] !== undefined) return true;
    return false;
  };
  return lib.listTemplateValues().filter((r) => usedKeys.has(r.key) && r.where.startsWith('properties.') && r.sensitivity
    && props.includes(r.sensitivity.property) && !overridden(r.key, r.sensitivity.property));
}

/**
 * Bound values of a row: k x factor, nu +- abs or -minus / +plus (asymmetric, audit A2 S2). Poisson ratios are clipped
 * to [0, 0.499] (an isotropic stiffness needs nu < 0.5) with a warning. Non-scalar values (tables) are unsupported.
 */
export function boundsOf(row) {
  const d = row.sensitivity?.delta ?? {};
  if (typeof row.value !== 'number') return { values: [], unsupported: `non-scalar template value (${row.where})` };
  let values;
  if (Array.isArray(d.factor)) values = d.factor.map((f) => ({ label: `x${+f.toPrecision(4)}`, value: row.value * f }));
  else if (d.abs !== undefined) values = [{ label: `-${d.abs}`, value: row.value - d.abs }, { label: `+${d.abs}`, value: row.value + d.abs }];
  else if (d.minus !== undefined || d.plus !== undefined) {
    values = [];
    if (d.minus !== undefined) values.push({ label: `-${d.minus}`, value: row.value - d.minus });
    if (d.plus !== undefined) values.push({ label: `+${d.plus}`, value: row.value + d.plus });
  } else return { values: [], unsupported: 'no delta in the sensitivity block' };
  const warnings = [];
  if (row.sensitivity?.property === 'nu') {
    for (const b of values) {
      const v = Math.min(NU_MAX, Math.max(NU_MIN, b.value));
      if (v !== b.value) { warnings.push(`${row.key} nu bound ${b.label} = ${+b.value.toPrecision(4)} clipped to ${v} (isotropic stiffness needs 0 <= nu < 0.5)`); b.label += ` (clipped to ${v})`; b.value = v; }
    }
  }
  return { values, warnings };
}

function withOverride(c, key, prop, value, label, status) {
  const v = JSON.parse(JSON.stringify(c));
  v.materials = v.materials ?? {};
  v.materials.overrides = v.materials.overrides ?? {};
  v.materials.overrides[key] = { ...(v.materials.overrides[key] ?? {}),
    [FIELD[prop]]: { value, status, note: `CD1 / CD5 sensitivity bound ${label} of the template value ${key}.${prop} (bound run, not a material property)` } };
  return v;
}

function quantities(out) {
  const q = {};
  for (const t of out.targets ?? []) if (Number.isFinite(t.got)) q[`${t.metric_id} ${t.quantity}${t.study ? ` [${t.study}]` : ''}${t.T_C != null ? ` @ ${t.T_C} C` : ''}`] = t.got;
  for (const r of out.results ?? []) {
    const tm = r.derived?.Tmax_C;
    const v = typeof tm === 'number' ? tm : tm?.value;
    if (Number.isFinite(v)) q[`Tmax_C [${r.study}]`] = v;
  }
  return q;
}

export function runSensitivity(c, { depsFor, lib, runCase, study = null, physics = 'thermal', boundStatus = 'user', onProgress = null }) {
  if (!PHYSICS_PROPS[physics]) throw new Error(`sensitivity: physics ${physics} not in ${Object.keys(PHYSICS_PROPS).join(' | ')}`);
  const used = new Set();
  const deps0 = depsFor(c);
  const resolve = (key, T, opts) => { for (const k of keysOf(lib, key)) used.add(k); return deps0.resolve(key, T, opts); };
  onProgress?.('nominal', 'nominal run');
  const nominal = runCase(c, { ...deps0, resolve, study });
  const q0 = quantities(nominal);
  const rows = templateRows(lib, used, c, physics);
  const report = { case: c.id, study, physics, bound_status: boundStatus, nominal: q0, used_keys: [...used].sort(), rows: [], spread: {}, runs: 1, unsupported: [], warnings: [] };
  for (const e of nominal.errors ?? []) report.warnings.push(`nominal: study ${e.study}${e.T_C != null ? ` at ${e.T_C} C` : ''}: ${e.error}`);
  if (boundStatus !== 'sensitivity') report.warnings.push(`bound overrides carry status ${boundStatus}: the materials library does not accept status sensitivity yet (request to L2)`);
  for (const row of rows) {
    const { values, unsupported, warnings = [] } = boundsOf(row);
    report.warnings.push(...warnings);
    if (unsupported) { report.unsupported.push({ key: row.key, where: row.where, reason: unsupported }); continue; }
    const prop = row.sensitivity.property;
    const out = { key: row.key, where: row.where, property: prop, value: row.value, analog_of: row.analog_of, bounds: [] };
    for (const b of values) {
      onProgress?.('bound', `${row.key}.${prop} ${b.label}`);
      // audit A2 M8: status `sensitivity` (L2 wave 8: nu, k_W_mK, cte_ppmK) for every bound when available; older
      // libraries: nu / k as template, CTE as boundStatus
      const status = boundStatus === 'sensitivity' ? 'sensitivity' : prop === 'cte' ? boundStatus : 'template';
      // one failing bound does not abort the report (audit A2 S2)
      try {
        const cv = withOverride(c, row.key, prop, b.value, b.label, status);
        const res = runCase(cv, { ...depsFor(cv), study });
        report.runs++;
        const errs = (res.errors ?? []).map((e) => `study ${e.study}${e.T_C != null ? ` at ${e.T_C} C` : ''}: ${e.error}`);
        out.bounds.push({ label: b.label, value: b.value, quantities: quantities(res), ...(errs.length ? { errors: errs } : {}) });
        for (const e of errs) report.warnings.push(`${row.key}.${prop} ${b.label}: ${e}`);
      } catch (e) {
        report.runs++;
        out.bounds.push({ label: b.label, value: b.value, quantities: {}, errors: [e.message] });
        report.unsupported.push({ key: row.key, where: row.where, reason: `bound ${b.label} failed: ${e.message}` });
      }
    }
    report.rows.push(out);
  }
  for (const [name, v0] of Object.entries(q0)) {
    let lo = v0;
    let hi = v0;
    let loFrom = 'nominal';
    let hiFrom = 'nominal';
    for (const r of report.rows) for (const b of r.bounds) {
      const v = b.quantities[name];
      if (!Number.isFinite(v)) continue;
      if (v < lo) { lo = v; loFrom = `${r.key}.${r.property} ${b.label}`; }
      if (v > hi) { hi = v; hiFrom = `${r.key}.${r.property} ${b.label}`; }
    }
    const isT = /^Tmax_C|Tmax_C|Tmin_C|Tavg_C/.test(name); // temperatures: report absolute deltas (relative to 0 C is meaningless)
    report.spread[name] = { nominal: v0, min: lo, max: hi, delta_min: lo - v0, delta_max: hi - v0,
      rel_min: !isT && v0 ? lo / v0 - 1 : null, rel_max: !isT && v0 ? hi / v0 - 1 : null, min_from: loFrom, max_from: hiFrom };
  }
  return report;
}

/** Plain-text summary of a sensitivity report. */
export function summarizeSensitivity(rep) {
  const L = [`sensitivity ${rep.case}${rep.study ? ` --study ${rep.study}` : ''}: ${rep.rows.length} template properties, ${rep.runs} runs`];
  for (const r of rep.rows) L.push(`  ${r.key}.${r.property} = ${r.value} (${r.where}${r.analog_of ? `; analog of ${r.analog_of}` : ''})`);
  for (const u of rep.unsupported) L.push(`  skipped ${u.key} ${u.where}: ${u.reason}`);
  for (const w of rep.warnings ?? []) L.push(`  warning: ${w}`);
  for (const [n, s] of Object.entries(rep.spread)) {
    const pct = (x) => (x == null ? 'n/a' : `${(100 * x).toFixed(1)} %`);
    const d = s.rel_min == null ? `${s.delta_min.toPrecision(3)} / +${s.delta_max.toPrecision(3)}` : `${pct(s.rel_min)} / ${pct(s.rel_max)}`;
    L.push(`  ${n}: nominal ${s.nominal.toPrecision(5)}, range ${s.min.toPrecision(5)} .. ${s.max.toPrecision(5)} (${d}; min ${s.min_from}, max ${s.max_from})`);
  }
  return L.join('\n');
}
