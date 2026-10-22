#!/usr/bin/env node
// License: GPL-3.0-or-later.
// CD6 overlap ceiling (Wentao 2026-10-21; lane L19): the highest temperature (1 C steps, 25-320 C) at which every
// material of a case study's mechanics model resolves without allowExtrapolation (elastic constants, CTE re-based to
// the stress-free temperature; homog keys through their constituents, ROM path). Compliant layers (CD5 class:
// E <= 100 MPa at the study's highest temperature, read with hold-last) are reported separately and do not set the
// ceiling (decision 2026-10-21); beyond their range they hold their last value via materials.allow_extrapolation.
// Node only; run by hand when library ranges or a case change:
//   node src/families/tools/ceiling.mjs ../sims/<family>/<case>.yaml <study id> [--all]
// Prints one JSON line {case, study, ceiling_C, limiting, ceiling_all_C, limiting_all, compliant_keys}, then the
// lowest per-key ceilings (--all: every key).

import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { generateNode } from '../node.mjs';
import { loadLibrary, applyOverrides } from '../../materials/node.mjs';
import { mechLibrary } from '../../mech/case.mjs';

const COMPLIANT_E_PA = 100e6; // CD5 compliant-layer threshold

const uv = (x) => (x && typeof x === 'object' && !Array.isArray(x) && 'value' in x ? x.value : x);

/** Overlap ceiling of one study (see the file header). */
export function overlapCeiling(c, studyId, { lib = loadLibrary(), Tmax = 320 } = {}) {
  const s = (c.studies ?? []).find((x) => x.id === studyId);
  if (!s) throw new Error(`ceiling: study ${studyId} not in case ${c.id}`);
  const g = generateNode(c.family, { ...(c.params ?? {}), ...(s.params ?? {}) });
  const drop = s.geometry?.drop_kinds ?? c.geometry?.drop_kinds ?? [];
  const caseLike = { ...c, materials: { ...(c.materials ?? {}), overrides: { ...(c.materials?.overrides ?? {}), ...(s.materials?.overrides ?? {}) } } };
  const mat = mechLibrary(lib, caseLike, applyOverrides);
  const keys = new Map();
  for (const b of g.boxes ?? g.parts) {
    if (drop.includes(b.kind)) continue;
    const k = mat.materialOf(b);
    if (!keys.has(k)) keys.set(k, []);
    keys.get(k).push(b.id);
  }
  let Tsf = uv(s.stress_free_C ?? c.physics?.mechanics?.stress_free_C ?? 150);
  if (Tsf && typeof Tsf === 'object') Tsf = uv(Tsf.default);
  const TsfK = Number(Tsf) + 273.15;
  const temps = [...(s.temperature?.uniform_C ?? []), ...(s.steps ?? []).flatMap((x) => [].concat(x.temperature?.uniform_C ?? []))].map(Number);
  const Tst = temps.length ? Math.max(...temps) : 25;
  const fails = (k, T) => {
    const TK = T + 273.15;
    try {
      const e = mat.resolve(k, TK, { homogenization: 'rom', Tsf_K: TsfK, mechanics: true });
      if (!k.startsWith('homog:')) mat.rebase(e, TsfK, TK, {});
      return null;
    } catch (err) { return String(err?.message ?? err); }
  };
  const Eof = (k) => {
    if (k.startsWith('homog:')) return null;
    try { return mat.resolve(k, Tst + 273.15, { allowExtrapolation: true }).elastic?.E_Pa ?? null; } catch { return null; }
  };
  const rows = [];
  for (const [k, ids] of keys) {
    let last = null, why = null;
    for (let T = 25; T <= Tmax; T++) { const w = fails(k, T); if (w) { why = w; break; } last = T; }
    const E = Eof(k);
    rows.push({ key: k, ceiling_C: last, limit: why, parts: ids, E_MPa_at_T: E == null ? null : E / 1e6, compliant: E != null && E <= COMPLIANT_E_PA });
  }
  rows.sort((a, b) => (a.ceiling_C ?? -1) - (b.ceiling_C ?? -1));
  const all = rows[0], stiff = rows.find((r) => !r.compliant);
  return {
    case: c.id, study: studyId, Tsf_C: TsfK - 273.15, T_study_max_C: Tst,
    ceiling_C: stiff?.ceiling_C ?? null, limiting: stiff?.key ?? null,
    ceiling_all_C: all?.ceiling_C ?? null, limiting_all: all?.key ?? null,
    compliant_keys: rows.filter((r) => r.compliant).map((r) => ({ key: r.key, E_MPa: r.E_MPa_at_T, ceiling_C: r.ceiling_C })),
    rows,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, studyId] = process.argv.slice(2);
  if (!file || !studyId) { process.stderr.write('usage: node src/families/tools/ceiling.mjs <case.yaml> <study id> [--all]\n'); process.exit(1); }
  const c = YAML.parse(readFileSync(file, 'utf8'));
  const r = overlapCeiling(c, studyId);
  const { rows, ...head } = r;
  process.stdout.write(JSON.stringify(head) + '\n');
  for (const x of process.argv.includes('--all') ? rows : rows.slice(0, 5)) {
    process.stdout.write(`  ${x.ceiling_C ?? '-'} C  ${x.compliant ? '[compliant] ' : ''}${x.key}  [${x.parts.slice(0, 4).join(',')}${x.parts.length > 4 ? `,+${x.parts.length - 4}` : ''}]  ${x.limit ?? ''}\n`);
  }
}
