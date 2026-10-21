// Labelled explicit variants of a case (lane L3, 2026-10-20; coordinator / L9 knobs). Browser-safe, dependencies
// injected. A variant is a sensitivity knob or a model-form alternative, never a fit:
//   {id, label, basis, params?: {name: param spec}, overrides?: {key: {field: leaf}}, stress_free_C?: number,
//    stress_free_per_part?: {part: C}, map?: {template_key: library_key}, mesh?: {...}}
// params merge into the case params (generator knobs), overrides into materials.overrides, stress_free_C replaces
// physics.mechanics.stress_free_C.default (per_part kept), map into materials.map, mesh into mesh.
// License: GPL-3.0-or-later.

/** Case copy with one variant applied. */
export function applyVariant(c, v) {
  const out = JSON.parse(JSON.stringify(c));
  if (v.params) out.params = { ...(out.params ?? {}), ...v.params };
  if (v.overrides) {
    out.materials = out.materials ?? {};
    const ov = { ...(out.materials.overrides ?? {}) };
    for (const [k, f] of Object.entries(v.overrides)) ov[k] = { ...(ov[k] ?? {}), ...f };
    out.materials.overrides = ov;
  }
  if (v.mesh) {
    out.mesh = { ...(out.mesh ?? {}), ...v.mesh };
    for (const k of Object.keys(out.mesh)) if (out.mesh[k] === null) delete out.mesh[k]; // null removes a mesh key
  }
  if (v.map) {
    out.materials = out.materials ?? {};
    out.materials.map = { ...(out.materials.map ?? {}), ...v.map };
  }
  if (v.stress_free_C != null) {
    out.physics = out.physics ?? {};
    const m = out.physics.mechanics = { ...(out.physics.mechanics ?? {}) };
    const sf = m.stress_free_C && typeof m.stress_free_C === 'object' ? m.stress_free_C : {};
    m.stress_free_C = { ...sf, default: { value: v.stress_free_C, status: 'user', note: `variant ${v.id}: ${v.label}` } };
    // study-level numbers would override the case default: drop them in the variant
    out.studies = out.studies.map((s) => (s.type === 'thermo_elastic' && typeof s.stress_free_C === 'number' ? { ...s, stress_free_C: undefined } : s));
  }
  if (v.stress_free_per_part) {
    out.physics = out.physics ?? {};
    const m = out.physics.mechanics = { ...(out.physics.mechanics ?? {}) };
    const sf = m.stress_free_C && typeof m.stress_free_C === 'object' ? m.stress_free_C : { default: m.stress_free_C };
    m.stress_free_C = { ...sf, per_part: { ...(sf.per_part ?? {}), ...v.stress_free_per_part } };
  }
  return out;
}

/** Split thermo_elastic studies into one study per temperature (one solve per call; per-call budgets). */
export function perTemperature(c, study = null) {
  const jobs = [];
  for (const s of c.studies) {
    if (study && s.id !== study) continue;
    // a process sequence is one solve chain: one job (its per-step targets carry `step`)
    if (s.type === 'process_sequence') { jobs.push({ study: s.id, T_C: null, case: c }); continue; }
    if (s.type !== 'thermo_elastic') continue;
    const temps = s.temperature?.uniform_C;
    const list = Array.isArray(temps) ? temps.map((t) => (typeof t === 'object' && t ? t.value : t)) : [];
    for (const T of list) jobs.push({ study: s.id, T_C: T, case: { ...c, studies: c.studies.map((x) => (x.id === s.id ? { ...x, temperature: { ...x.temperature, uniform_C: [T] } } : x)) } });
  }
  return jobs;
}

/**
 * Run variants: runOne(caseObj, {study}) -> {targets, results}. Returns rows {variant, study, T_C, targets: [{metric_id,
 * quantity, got, part, flag}], warpage: [...], error}. Failures are recorded per job, not thrown.
 */
export function runVariants(c, variants, { runOne, study = null, onProgress = null, common = null }) {
  // common: a variant applied to every run incl. base (e.g. a coarse mesh shared by all spreads)
  const c0 = common ? applyVariant(c, common) : c;
  const rows = [];
  for (const v of [{ id: 'base', label: 'case as configured', basis: 'case' }, ...variants]) {
    const cv = v.id === 'base' ? c0 : applyVariant(c0, v);
    for (const job of perTemperature(cv, study)) {
      onProgress?.(v.id, `${job.study} @ ${job.T_C} C`);
      const t0 = Date.now();
      try {
        const o = runOne(job.case, { study: job.study });
        const r = (o.results ?? [])[0];
        rows.push({ variant: v.id, label: v.label, basis: v.basis, study: job.study, T_C: job.T_C, s: (Date.now() - t0) / 1000,
          dof: r?.stats?.dof ?? null,
          targets: (o.targets ?? []).filter((t) => (t.study ?? job.study) === job.study && (job.T_C == null || t.T_C == null || t.T_C === job.T_C))
            .map((t) => ({ metric_id: t.metric_id, quantity: t.quantity, step: t.step ?? null, got: t.got, part: t.part ?? null, flag: t.flag ?? null, reason: t.reason ?? null })),
          warpage: r?.type === 'process_sequence'
            ? (r.steps ?? []).flatMap((st) => (st.warpage ?? []).map((w) => ({ step: st.step, surface: w.surface, warpage_um: w.warpage_um, coplanarity_um: w.coplanarity_um, shape_class: w.shape_class ?? null })))
            : (r?.derived?.warpage ?? []).map((w) => ({ surface: w.surface, warpage_um: w.warpage_um, coplanarity_um: w.coplanarity_um, shape_class: w.shape_class ?? null })),
          warnings: r?.warnings ?? [] });
      } catch (e) {
        rows.push({ variant: v.id, label: v.label, basis: v.basis, study: job.study, T_C: job.T_C, s: (Date.now() - t0) / 1000, error: e.message });
      }
    }
  }
  return rows;
}
