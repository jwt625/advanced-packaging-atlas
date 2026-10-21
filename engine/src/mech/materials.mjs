// Mechanical material adaptor (tranche E2; DevLog-010 A6; SPEC section 4).
// Maps grid cells to mechanical materials = (library key, stress-free temperature of the owning part, orientation).
// Each provides D(T_K) (lab-frame 6x6 Voigt stiffness) and epsTh(T_K) (lab-frame Voigt thermal strain relative to the
// stress-free state). Thermal strain from the secant CTE re-based to the part's stress-free temperature Tsf:
//   with `rebase` (materials rebaseSecantCte): e_i = alpha_r,i(T) (T - Tsf)
//   without: the same closed form (R1 1.2) from two resolves, e_i = [a_m(T)(T - Tm) - a_m(Tsf)(Tsf - Tm)] /
//   (1 + a_m(Tsf)(Tsf - Tm)), which needs no division by (T - Tsf).
// `homog:` keys are resolved with opts.Tsf_K (their CTE is already strain-free at Tsf).
// Materials whose e(T) is linear in T (constant instantaneous alpha) are detected and evaluated in closed form.
// License: GPL-3.0-or-later.

import { stiffnessLab, directionCosines, thermalStrainLab } from './constitutive.mjs';

export const C_TO_K = 273.15;

/**
 * @param {object} grid SPEC section 3 grid
 * @param {object} o
 * @param {(key: string, T_K: number, opts?: object) => object} o.resolve SPEC section 4 resolver
 * @param {(key: string|object, Tsf_K: number, T_K: number, opts?: object) => {alpha: number[]}} [o.rebase]
 * @param {{default: number, per_part?: object}} o.stressFreeC stress-free temperatures (C); per_part keys are part ids
 *   or globs on part ids (`hbm_*`)
 * @param {object} [o.orientation] {part id | material key: orientation} (material axes in global coordinates, SPEC
 *   section 12 active rotation; constitutive.mjs)
 * @param {object} [o.resolveOpts] extra resolver options (e.g. {allowExtrapolation: true})
 */
export function createMechMaterials(grid, o) {
  const { resolve, rebase = null, stressFreeC, orientation = {}, resolveOpts = {}, eigenstrain = {} } = o;
  if (typeof resolve !== 'function') throw new Error('mech: a materials resolver function is required');
  if (!stressFreeC || !Number.isFinite(stressFreeC.default)) throw new Error('mech: stress_free_C.default (number) is required');
  const per = stressFreeC.per_part ?? {};
  const globs = Object.keys(per).map((g) => [new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`), per[g], g]);
  const usedGlob = new Set();
  const tsfOfPart = grid.parts.map((p) => {
    for (const [re, v, g] of globs) if (re.test(p.id)) { usedGlob.add(g); return v; }
    return stressFreeC.default;
  });
  for (const g of Object.keys(per)) if (!usedGlob.has(g)) throw new Error(`mech: stress_free_C.per_part ${g} matches no part`);
  // eigenstrain (cure shrinkage etc.): {part id | glob on part ids | material key: {linear} | {volumetric}}; linear
  // strain added to the thermal strain (shrinkage is negative); volumetric v -> linear v / 3 (small strain)
  const eGlobs = Object.entries(eigenstrain).map(([g, v]) => [new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`), v, g]);
  const usedE = new Set();
  const eigenOf = (part, key) => {
    let spec = null;
    for (const [re, v, g] of eGlobs) if (re.test(part.id) || g === key) { spec = v; usedE.add(g); break; }
    if (!spec) return null;
    if (Number.isFinite(spec.linear) === Number.isFinite(spec.volumetric)) throw new Error(`mech: eigenstrain for ${part.id}: give exactly one of linear, volumetric`);
    return Number.isFinite(spec.linear) ? spec.linear : spec.volumetric / 3;
  };
  const list = [], index = new Map();
  const cellMM = new Int32Array(grid.cellPart.length).fill(-1);
  for (let c = 0; c < cellMM.length; c++) {
    const p = grid.cellPart[c];
    if (p < 0) continue;
    const key = grid.materials[grid.cellMat[c]];
    const part = grid.parts[p];
    const or = orientation[part.id] ?? orientation[key] ?? null;
    const tsf = tsfOfPart[p];
    const e0 = eigenOf(part, key);
    const id = `${key}|${tsf}|${or ? JSON.stringify(or) : ''}|${e0 ?? ''}`;
    let m = index.get(id);
    if (m === undefined) {
      m = list.length;
      index.set(id, m);
      list.push(mechMaterial(key, tsf + C_TO_K, or, resolve, rebase, resolveOpts, e0));
    }
    cellMM[c] = m;
  }
  for (const g of Object.keys(eigenstrain)) if (!usedE.has(g)) throw new Error(`mech: eigenstrain ${g} matches no part or material`);
  return { list, cellMM, tsfOfPart };
}

function mechMaterial(key, Tsf_K, orient, resolve, rebase, resolveOpts, e0 = null) {
  const homog = typeof key === 'string' && key.startsWith('homog:');
  const ropts = homog ? { ...resolveOpts, Tsf_K } : resolveOpts;
  // CD6 (materials): extrapolation flags of every resolve / rebase, surfaced per material by solveMech
  const extrapolated = new Map();
  let probing = false;
  const note = (list, T, src) => {
    if (probing) return; // the linearity probe evaluates temperatures the model does not use
    for (const x of list ?? []) {
      const k = `${src}|${x.property}|${x.rule}`;
      const e = extrapolated.get(k);
      if (!e) extrapolated.set(k, { source: src, ...x, T_C_min: T - C_TO_K, T_C_max: T - C_TO_K });
      else { e.T_C_min = Math.min(e.T_C_min, T - C_TO_K); e.T_C_max = Math.max(e.T_C_max, T - C_TO_K); }
    }
  };
  const res = (T) => {
    let r;
    try {
      r = resolve(key, T, { ...ropts, need: ['elastic', 'cte'] });
    } catch (e) {
      throw new Error(`mech: material ${key} at ${(T - C_TO_K).toFixed(2)} C: ${e.message}`);
    }
    note(r?.provenance?.extrapolated, T, 'resolve');
    return r;
  };
  const Dcache = new Map();
  let aCos = null;
  const D = (T) => {
    let v = Dcache.get(T);
    if (!v) {
      const r = res(T);
      if (!r?.elastic) throw new Error(`mech: material ${key} has no elastic property`);
      v = stiffnessLab(r.elastic, orient);
      if (!aCos) aCos = directionCosines(orient ?? r.elastic.orientation ?? null);
      if (Dcache.size > 4096) Dcache.clear();
      Dcache.set(T, v);
    }
    return v;
  };
  // material-frame axial thermal strains relative to the stress-free state
  const axial = (T) => {
    if (homog) {
      const r = res(T);
      const a = r.cte.alpha;
      if (Math.abs((r.cte.Tref_K ?? Tsf_K) - Tsf_K) > 1e-9) throw new Error(`mech: homogenized ${key} strain-free at ${r.cte.Tref_K} K, expected ${Tsf_K} K`);
      return [a[0] * (T - Tsf_K), a[1] * (T - Tsf_K), a[2] * (T - Tsf_K)];
    }
    if (rebase) {
      let a;
      try {
        const rb = rebase(key, Tsf_K, T, resolveOpts);
        a = rb.alpha;
        note(rb.extrapolated ?? rb.provenance?.extrapolated, T, 'rebaseSecantCte');
        if (!rb.extrapolated && Array.isArray(rb.warnings) && rb.warnings.some((w) => /allowExtrapolation/.test(w)))
          note([{ property: 'cte', rule: 'hold_last_alpha', note: rb.warnings.join('; ') }], T, 'rebaseSecantCte');
      } catch (e) {
        throw new Error(`mech: material ${key} CTE rebase Tsf ${(Tsf_K - C_TO_K).toFixed(2)} C, T ${(T - C_TO_K).toFixed(2)} C: ${e.message}`);
      }
      return [a[0] * (T - Tsf_K), a[1] * (T - Tsf_K), a[2] * (T - Tsf_K)];
    }
    const rT = res(T).cte, rS = res(Tsf_K).cte;
    if (!rT || !rS) throw new Error(`mech: material ${key} has no CTE`);
    const Tm = rT.Tref_K;
    const out = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const eS = rS.alpha[i] * (Tsf_K - Tm);
      out[i] = (rT.alpha[i] * (T - Tm) - eS) / (1 + eS);
    }
    return out;
  };
  // linearity probe: e(T) = b (T - Tsf) for all T?
  let lin = null;
  const probe = () => {
    if (lin !== null) return lin;
    // homogenized entries: no probe (each probe temperature would cost an RVE solve); evaluate at the needed T only
    if (homog) return (lin = false);
    probing = true;
    try {
      const e1 = axial(Tsf_K + 50), e2 = axial(Tsf_K - 50), e3 = axial(Tsf_K + 137.3);
      const b = e1.map((v) => v / 50);
      const ok = [0, 1, 2].every((i) => Math.abs(e2[i] + 50 * b[i]) <= 1e-13 * (Math.abs(50 * b[i]) + 1e-30) &&
        Math.abs(e3[i] - 137.3 * b[i]) <= 1e-13 * (Math.abs(137.3 * b[i]) + 1e-30));
      lin = ok ? b : false;
    } catch {
      lin = false;
    }
    probing = false;
    return lin;
  };
  const epsTh = (T, out = new Float64Array(6)) => {
    const b = probe();
    const e = b ? [b[0] * (T - Tsf_K), b[1] * (T - Tsf_K), b[2] * (T - Tsf_K)] : axial(T);
    if (e0) { e[0] += e0; e[1] += e0; e[2] += e0; }
    if (!aCos) D(T);
    return thermalStrainLab(e, aCos, out);
  };
  return { key, Tsf_K, orientation: orient, eigenstrain: e0, D, epsTh, isLinear: () => !!probe(), extrapolated: () => [...extrapolated.values()] };
}

/**
 * Stub resolver for explicit material sets (tier-A YAML style): {key: {E_GPa, nu, cte_ppmK: number | [ax, ay, az]}}
 * or {key: {elastic: {...SPEC}, cte_ppmK}}. The CTE is constant and strain-free at any temperature (Tref = T), so
 * e = alpha (T - Tsf) exactly.
 */
export function explicitResolver(set) {
  return (key, T_K) => {
    const k = key.startsWith('tierA:') ? key.slice(6) : key;
    const m = set[k];
    if (!m) throw new Error(`unknown material ${key}`);
    const elastic = m.elastic ?? { type: 'iso', E_Pa: m.E_GPa * 1e9, nu: m.nu };
    const a = Array.isArray(m.cte_ppmK) ? m.cte_ppmK.map((v) => v * 1e-6) : [m.cte_ppmK * 1e-6, m.cte_ppmK * 1e-6, m.cte_ppmK * 1e-6];
    return { key, T_K, elastic, cte: { kind: 'secant', Tref_K: T_K, alpha: a, constant: true } };
  };
}

/** Rebase for explicitResolver sets: constant alpha (instantaneous = secant at any reference). */
export function explicitRebase(set) {
  const r = explicitResolver(set);
  return (key, Tsf_K, T_K) => ({ kind: 'secant', Tref_K: Tsf_K, alpha: r(key, T_K).cte.alpha });
}
