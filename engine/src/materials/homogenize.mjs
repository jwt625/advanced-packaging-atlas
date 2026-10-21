// Derived homogenized entries by rule of mixtures (lane L2, DevLog-012). Labelled `homogenization: rom`: DevLog-010
// (R1) shows ROM can be 23 % low on laminate in-plane stiffness versus an RVE; E3 replaces these with RVE FEM.
// Topologies:
//   columns along `axis` (bumps, pillars, TSV, TGV, vias, and RDL lines along x or y): axial Voigt (isostrain) for E
//   and k, transverse Reuss (isostress) for E, G and k; axial CTE by Turner (stiffness-weighted), transverse CTE by
//   Schapery; Poisson ratios by volume ROM.
//   rdl_layer (CD7 b, 2026-10-20): the metal spans the level thickness, so z is a parallel (Voigt) path. x | y = lines
//   (along and z Voigt, across Reuss); plane = continuous metal (Voigt in all directions, an upper bound); xy = two
//   stacked sublevels of x and y lines (in-plane mean of along / across, z Voigt, out-of-plane shear in series).
//   Default for rdl_layer keys without an axis suffix: plane.
//   ROM is the fallback (`homogenization: rom`); homog keys resolve by the E3 RVE by default when a resolver is attached
//   (CD7 a, materials/library.mjs attachHomogResolver).
//   Poisson convention (all topologies): nu_ij = -eps_j / eps_i under stress along i; the major ratio (load along the
//   stiffer, continuous direction) is the volume ROM, the minor one follows from reciprocity nu_ij / E_i = nu_ji / E_j.
//   (Audit A1 S2, 2026-10-20: the plane branch had the pair inverted.)
// Constituents must be isotropic; a cubic constituent (Si) enters with its Voigt-Reuss-Hill average (labelled).
// License: GPL-3.0-or-later.

import { orthoCompliance, isPositiveDefinite6 } from './cubic.mjs';

export const COLUMN_KINDS = ['microbump', 'c4', 'bga', 'cu_pillar', 'hybrid_bond', 'tsv', 'tgv', 'rdl_via', 'pth', 'via_field', 'bump_layer', 'tsv_field'];
export const LAYER_KINDS = ['rdl_layer'];

/** Parse `homog:<kind>:<inclusion>+<matrix>:<fraction>[:<axis>]` (SPEC section 2). */
export function parseHomogKey(key) {
  const parts = key.split(':');
  if (parts.length < 4 || parts.length > 5 || parts[0] !== 'homog') throw new Error(`materials: bad homog key '${key}' (homog:<kind>:<inclusion>+<matrix>:<fraction>[:<axis>])`);
  const [, kind, mats, frac, axis] = parts;
  const [inclusion, matrix] = mats.split('+');
  const fraction = Number(frac);
  if (!inclusion || !matrix) throw new Error(`materials: homog key '${key}' needs <inclusion>+<matrix>`);
  return { kind, constituents: { inclusion, matrix }, fraction, axis: axis ?? (kind === 'rdl_layer' ? 'plane' : 'z'), key };
}

/** Matrix key meaning 'no material' (air gap, not meshed as a solid). */
export const VOID = 'void';
/**
 * Void-matrix regularization ratio. A void phase carries no load and no heat (gas conduction and radiation neglected);
 * directions without a continuous inclusion path get this fraction of the axial value so the cell stays positive
 * definite (cf. R1 lesson 7: COMSOL scales inactive-material stiffness by 1e-5).
 */
export const VOID_RATIO = 1e-5;

/** Columns or sheet of `A` in a void matrix (e.g. BGA balls in air). */
function homogenizeVoid(lib, { kind, A, fraction: f, ax, T_K, Tsf_K, opts, sub, need, key, warnings, aliasesUsed }) {
  const dirIdx = { x: 0, y: 1, z: 2 };
  const along = (i) => (ax === 'xy' || ax === 'plane' ? i < 2 : i === dirIdx[ax]);
  const out = {
    key: key ?? `homog:${kind}:${A.key}+void:${f}`,
    T_K,
    homogenization: 'rom',
    topology: ax === 'plane' ? 'plane' : ax === 'xy' ? 'orthogonal_lines' : `columns_${ax}`,
    k_W_mK: null,
    rho_kg_m3: A.rho_kg_m3 !== null ? f * A.rho_kg_m3 : null,
    cp_J_kgK: A.cp_J_kgK,
    elastic: null,
    cte: null,
    eps_r: null,
    tan_delta: null,
    f_ref_Hz: null,
    sigma_S_m: null,
    bounds: {},
    provenance: {
      basis: 'derived',
      homogenization: 'rom',
      constituents: { inclusion: A.key, matrix: VOID },
      aliases: aliasesUsed,
      fraction: f,
      axis: ax,
      extrapolated: (A.provenance?.extrapolated ?? []).map((x) => ({ constituent: A.key, ...x })),
      void: `void matrix: no load and no heat in the void (gas conduction and radiation neglected); directions without a continuous inclusion path use ${VOID_RATIO} x the axial value (regularization); CTE = inclusion CTE (the void imposes no constraint)`,
      warnings,
    },
  };
  Object.defineProperty(out, '_homog', { value: true, enumerable: false });
  if (A.k_W_mK) {
    const ka = f * A.k_W_mK[0];
    out.k_W_mK = [0, 1, 2].map((i) => (along(i) ? ka : ka * VOID_RATIO));
    out.bounds.k = { voigt: ka, reuss: 0 };
  } else if (need.has('k')) throw new Error('materials: homogenize: k needed but missing in the inclusion');
  if (A.elastic) {
    const { E: E1, nu: nu1 } = isoOf(A, A.key, warnings);
    const Ea = f * E1;
    const Et = Ea * VOID_RATIO;
    const G1 = E1 / (2 * (1 + nu1));
    const Ga = f * G1 * VOID_RATIO; // shear without an inclusion path (regularized)
    const Gax = f * G1; // shear in planes containing the column axis (CD7 c, L8): carried by the columns
    const E = [0, 1, 2].map((i) => (along(i) ? Ea : Et));
    // Poisson: nu1 between load-path directions, regularized otherwise
    const nu = (i, j) => (along(i) && along(j) ? nu1 : nu1 * VOID_RATIO);
    const sheet = ax === 'xy' || ax === 'plane';
    const G = (i, j) => (sheet ? (along(i) && along(j) ? Gax : Ga) : along(i) || along(j) ? Gax : Ga);
    const o = { Ex: E[0], Ey: E[1], Ez: E[2], nuxy: nu(0, 1), nuyz: nu(1, 2), nuxz: nu(0, 2), Gxy: G(0, 1), Gyz: G(1, 2), Gxz: G(0, 2) };
    if (!isPositiveDefinite6(orthoCompliance(o))) warnings.push('homogenized compliance not positive definite');
    out.elastic = { type: 'ortho', ...o };
    out.bounds.E = { voigt: Ea, reuss: 0 };
  } else if (need.has('elastic')) throw new Error('materials: homogenize: elastic needed but missing in the inclusion');
  if (need.has('cte')) {
    if (!(Tsf_K > 0)) throw new Error('materials: homogenize: Tsf_K (stress-free temperature) required for CTE');
    const a = lib.rebaseSecantCte(A, Tsf_K, T_K, { ...opts, allowExtrapolation: sub.allowExtrapolation }).alpha;
    out.cte = { kind: 'secant', Tref_K: Tsf_K, alpha: a.slice() };
  }
  out.provenance.formulas = {
    k: `load-path direction f k1; others ${VOID_RATIO} x that`,
    E: `load-path direction f E1; others and shear ${VOID_RATIO} x (regularization)`,
    cte: 'inclusion CTE (re-based to Tsf)',
    validity: 'void layers (BGA balls in air, unfilled bumps): axial stiffness and heat path only',
  };
  return out;
}

const reuss = (f, a, b) => 1 / (f / a + (1 - f) / b);
const voigt = (f, a, b) => f * a + (1 - f) * b;

function isoOf(r, name, warnings) {
  const el = r.elastic;
  if (!el) throw new Error(`materials: homogenize: ${name} has no elastic data`);
  if (el.type === 'iso') return { E: el.E_Pa, nu: el.nu };
  throw new Error(`materials: homogenize: constituent ${name} must be isotropic (resolve it with elastic: 'iso_hill'); got ${el.type}`);
}

/**
 * homogenize({kind, constituents: {inclusion, matrix}, fraction, axis, T_K, Tsf_K, opts}) -> resolved-like entry.
 * `fraction` = inclusion volume fraction (= area fraction for prismatic columns / lines). Tsf_K (stress-free
 * temperature) is required when CTE is needed: constituent secant CTEs are re-based to Tsf_K before mixing.
 */
export function homogenizeWith(lib, { kind, constituents, fraction, axis, T_K, Tsf_K, opts = {}, key }) {
  if (!COLUMN_KINDS.includes(kind) && !LAYER_KINDS.includes(kind)) throw new Error(`materials: homogenize: unknown kind '${kind}' (${[...COLUMN_KINDS, ...LAYER_KINDS].join(', ')})`);
  if (!(fraction >= 0 && fraction <= 1)) throw new Error(`materials: homogenize: fraction must be in [0, 1], got ${fraction}`);
  const ax = axis ?? (kind === 'rdl_layer' ? 'plane' : 'z');
  if (!['x', 'y', 'z', 'xy', 'plane'].includes(ax)) throw new Error(`materials: homogenize: axis must be x | y | z | xy | plane`);
  if ((ax === 'xy' || ax === 'plane') && kind !== 'rdl_layer') throw new Error(`materials: homogenize: axis ${ax} only for rdl_layer`);
  const need = new Set(opts.need ?? ['k', 'elastic', 'cte']);
  const warnings = [];
  const sub = { ...opts, need: [...need].filter((n) => ['k', 'elastic', 'cte', 'density', 'cp'].includes(n)), elastic: 'iso_hill' };
  // CD6: listing the homog key itself allows extrapolation for its constituents
  if (Array.isArray(opts.allowExtrapolation) && key && opts.allowExtrapolation.includes(key)) sub.allowExtrapolation = true;
  delete sub.Tsf_K;
  const res = {};
  const aliasesUsed = {};
  if (constituents.inclusion === VOID) throw new Error(`materials: homogenize: 'void' is only allowed as the matrix`);
  for (const role of ['inclusion', 'matrix']) {
    const c = constituents[role];
    if (c === VOID) continue;
    if (typeof c === 'string') {
      const ck = lib.canonicalKey(c);
      if (ck.alias) aliasesUsed[role] = ck.alias;
      res[role] = lib.resolve(ck.key, T_K, sub);
    } else res[role] = c;
    if (lib.entry(res[role].key).properties?.elastic?.model === 'cubic') warnings.push(`${res[role].key}: cubic constituent mixed with its Voigt-Reuss-Hill isotropic average`);
  }
  if (constituents.matrix === VOID) return homogenizeVoid(lib, { kind, A: res.inclusion, fraction, ax, T_K, Tsf_K, opts, sub, need, key, warnings, aliasesUsed });
  const f = fraction;
  const A = res.inclusion;
  const B = res.matrix;
  const out = {
    key: key ?? `homog:${kind}:${A.key}+${B.key}:${f}:${ax}`,
    T_K,
    homogenization: 'rom',
    topology: ax === 'plane' ? 'plane' : ax === 'xy' ? 'orthogonal_lines' : `columns_${ax}`,
    k_W_mK: null,
    rho_kg_m3: null,
    cp_J_kgK: null,
    elastic: null,
    cte: null,
    eps_r: null,
    tan_delta: null,
    f_ref_Hz: null,
    sigma_S_m: null,
    bounds: {},
    provenance: {
      basis: 'derived',
      homogenization: 'rom',
      constituents: { inclusion: A.key, matrix: B.key },
      aliases: aliasesUsed,
      fraction: f,
      axis: ax,
      extrapolated: [A, B].flatMap((r) => (r.provenance?.extrapolated ?? []).map((x) => ({ constituent: r.key, ...x }))),
      warnings,
    },
  };
  Object.defineProperty(out, '_homog', { value: true, enumerable: false });
  const dirIdx = { x: 0, y: 1, z: 2 };
  const rdl = kind === 'rdl_layer';
  // thermal conductivity
  if (A.k_W_mK && B.k_W_mK) {
    const ka = A.k_W_mK[0];
    const kb = B.k_W_mK[0];
    if (A.k_W_mK.some((v) => v !== ka) || B.k_W_mK.some((v) => v !== kb)) warnings.push('anisotropic constituent k: x component used');
    const kv = voigt(f, ka, kb);
    const kr = reuss(f, ka, kb);
    const km = 0.5 * (kv + kr);
    // RDL levels (CD7 b): metal spans the level thickness, so z is a parallel (Voigt) path for every RDL topology
    if (rdl) out.k_W_mK = ax === 'plane' ? [kv, kv, kv] : ax === 'xy' ? [km, km, kv] : ax === 'x' ? [kv, kr, kv] : [kr, kv, kv];
    else out.k_W_mK = [0, 1, 2].map((i) => (i === dirIdx[ax] ? kv : kr));
    out.bounds.k = { voigt: kv, reuss: kr };
  } else if (need.has('k')) throw new Error('materials: homogenize: k needed but missing in a constituent');
  if (A.rho_kg_m3 && B.rho_kg_m3) {
    out.rho_kg_m3 = voigt(f, A.rho_kg_m3, B.rho_kg_m3);
    if (A.cp_J_kgK && B.cp_J_kgK) out.cp_J_kgK = (f * A.rho_kg_m3 * A.cp_J_kgK + (1 - f) * B.rho_kg_m3 * B.cp_J_kgK) / out.rho_kg_m3;
  }
  // elasticity
  let EA = null;
  let EB = null;
  let nuA = null;
  let nuB = null;
  if (A.elastic && B.elastic) {
    ({ E: EA, nu: nuA } = isoOf(A, A.key, warnings));
    ({ E: EB, nu: nuB } = isoOf(B, B.key, warnings));
    const GA = EA / (2 * (1 + nuA));
    const GB = EB / (2 * (1 + nuB));
    const Ev = voigt(f, EA, EB);
    const Er = reuss(f, EA, EB);
    const Gr = reuss(f, GA, GB);
    const nuR = voigt(f, nuA, nuB);
    const Gv = voigt(f, GA, GB);
    let o;
    if (rdl && ax === 'plane') {
      // continuous plane spanning the level: every direction Voigt (upper bound; the RVE is the default)
      o = { Ex: Ev, Ey: Ev, Ez: Ev, nuxy: nuR, nuxz: nuR, nuyz: nuR, Gxy: Gv, Gxz: Gv, Gyz: Gv };
    } else if (rdl && ax === 'xy') {
      // two sublevels (x lines, y lines) stacked in z: in-plane mean of along (Voigt) and across (Reuss); z Voigt in
      // each sublevel; out-of-plane shear = series of the two sublevels (Gv, Gr)
      const Em = 0.5 * (Ev + Er);
      const Gs = 2 / (1 / Gv + 1 / Gr);
      const nuMinor = (nuR * Em) / Ev; // load in-plane (softer), strain z (stiffer)
      o = { Ex: Em, Ey: Em, Ez: Ev, nuxy: nuR, nuxz: nuMinor, nuyz: nuMinor, Gxy: Gr, Gxz: Gs, Gyz: Gs };
    } else if (rdl) {
      // lines along x (or y) spanning the level: metal plates normal to the across direction; along and z Voigt,
      // across Reuss; in-plate shear Voigt, others Reuss; major Poisson (load in a stiff direction) = ROM
      const nuMinor = (nuR * Er) / Ev;
      o =
        ax === 'x'
          ? { Ex: Ev, Ey: Er, Ez: Ev, nuxy: nuR, nuxz: nuR, nuyz: nuMinor, Gxy: Gr, Gxz: Gv, Gyz: Gr }
          : { Ex: Er, Ey: Ev, Ez: Ev, nuxy: nuMinor, nuxz: nuMinor, nuyz: nuR, Gxy: Gr, Gxz: Gr, Gyz: Gv };
    } else {
      // columns along a: E_a Voigt, transverse Reuss; nu_at (axial load -> transverse strain) ROM.
      const Ea = Ev;
      const Et = Er;
      const nuAT = nuR;
      const nuTA = (nuAT * Et) / Ea; // transverse load -> axial strain (reciprocity)
      const ox = {};
      const t = ['x', 'y', 'z'].filter((d) => d !== ax);
      const E = { [ax]: Ea, [t[0]]: Et, [t[1]]: Et };
      ox.Ex = E.x;
      ox.Ey = E.y;
      ox.Ez = E.z;
      const nu = (i, j) => (i === ax ? nuAT : j === ax ? nuTA : nuR); // nu_ij: load along i, strain along j
      ox.nuxy = nu('x', 'y');
      ox.nuyz = nu('y', 'z');
      ox.nuxz = nu('x', 'z');
      ox.Gxy = Gr;
      ox.Gyz = Gr;
      ox.Gxz = Gr;
      o = ox;
    }
    if (!isPositiveDefinite6(orthoCompliance(o))) warnings.push('homogenized compliance not positive definite');
    out.elastic = { type: 'ortho', ...o };
    out.bounds.E = { voigt: Ev, reuss: Er };
    out.bounds.nu = { rom: nuR };
  } else if (need.has('elastic')) throw new Error('materials: homogenize: elastic needed but missing in a constituent');
  // thermal expansion (secant, re-based to Tsf)
  if (need.has('cte')) {
    if (!(Tsf_K > 0)) throw new Error('materials: homogenize: Tsf_K (stress-free temperature) required for CTE');
    if (EA === null) throw new Error('materials: homogenize: CTE mixing needs constituent elastic data');
    const aA = lib.rebaseSecantCte(A, Tsf_K, T_K, { ...opts, allowExtrapolation: sub.allowExtrapolation }).alpha[0];
    const aB = lib.rebaseSecantCte(B, Tsf_K, T_K, { ...opts, allowExtrapolation: sub.allowExtrapolation }).alpha[0];
    const Ev = voigt(f, EA, EB);
    const aTurner = (f * EA * aA + (1 - f) * EB * aB) / Ev;
    const nuR = voigt(f, nuA, nuB);
    const aSchapery = (1 + nuA) * f * aA + (1 + nuB) * (1 - f) * aB - aTurner * nuR;
    const aMean = 0.5 * (aTurner + aSchapery);
    const alpha = rdl
      ? ax === 'plane'
        ? [aTurner, aTurner, aTurner]
        : ax === 'xy'
          ? [aMean, aMean, aTurner]
          : ax === 'x'
            ? [aTurner, aSchapery, aTurner]
            : [aSchapery, aTurner, aTurner]
      : [0, 1, 2].map((i) => (i === dirIdx[ax] ? aTurner : aSchapery));
    out.cte = { kind: 'secant', Tref_K: Tsf_K, alpha };
    out.bounds.cte = { rom: voigt(f, aA, aB), turner: aTurner, schapery: aSchapery, constituents: [aA, aB] };
  }
  out.provenance.formulas = {
    k: 'axial f k1 + (1 - f) k2 (Voigt); transverse 1 / (f / k1 + (1 - f) / k2) (Reuss)',
    E: 'axial Voigt, transverse Reuss; G Reuss (plane: Gxy Voigt; xy: in-plane mean of Voigt and Reuss); major nu volume ROM, minor by reciprocity',
    cte: 'axial Turner (f E1 a1 + (1 - f) E2 a2) / E_axial; transverse Schapery (1 + nu1) f a1 + (1 + nu2)(1 - f) a2 - a_axial nu_ROM',
    validity: 'layer-scale warpage and heat flow only; local stress needs resolved features (E3 submodels); ROM biased (DevLog-010 R1: -23 % in-plane E on a laminate)',
  };
  return out;
}
