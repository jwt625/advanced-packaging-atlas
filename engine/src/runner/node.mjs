#!/usr/bin/env node
// Node wrapper of the CD1 sensitivity runner (lane L3). Same dependencies as cli.mjs:
//   node src/runner/node.mjs <case.yaml> [--study s1] [--json]
//   node src/runner/node.mjs <case.yaml> --variants <variants.yaml> [--study s2]   (labelled variants: JSON {engine, case, study, homogenization, rows})
//   either form: [--homog rom | rve] (homogenized keys; default = library default, CD7 rve)
// Thermal studies run through L1's runCase (physics thermal: k bounds). thermo_elastic studies run through L1 / L10's
// runCaseAll with L8's mech module (audit A2 S1; L10 2026-10-20: runCaseAll carries the SPEC 17 case features, i.e.
// study-level overrides and allow_extrapolation incl. the CTE rebase, mesh.thin, DB unit conversion). Physics
// thermo_elastic (nu and CTE bounds) for uniform-temperature studies, coupled (nu, k, CTE) for mixed selections or
// temperature.from.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { engineVersion, metricsTable } from '../../cli.mjs';
import { generateNode, loadPackage3d } from '../families/node.mjs';
import { applyOverrides, loadLibrary } from '../materials/node.mjs';
import { OVERRIDE_STATUSES } from '../materials/overrides.mjs';
import { mechLibrary, modelSurface, runMechCase } from '../mech/case.mjs'; // passed to runCaseAll as the mech module
import { solveMech } from '../mech/index.mjs';
import { libraryAdapter, runCase, runCaseAll } from '../thermal/case.mjs';
import { runSensitivity, summarizeSensitivity } from './sensitivity.mjs';
import { runVariants } from './variants.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// audit A2 M8: CTE bound runs carry status `sensitivity` once the materials library accepts it; `user` until then
export const BOUND_STATUS = OVERRIDE_STATUSES.includes('sensitivity') ? 'sensitivity' : 'user';
const MECH = { runMechCase, mechLibrary, modelSurface, solveMech };

// homogenization: library default (CD7: rve) unless 'rom' | 'rve' is given (RVE-vs-ROM comparisons)
export function nodeDeps({ homogenization = null } = {}) {
  const lib = homogenization ? loadLibrary(undefined, { homogenization }) : loadLibrary();
  const data = loadPackage3d();
  const metricLookup = metricsTable(join(HERE, '../../../data/metrics.csv'));
  const depsFor = (c) => {
    const { resolve: res, materialOf } = libraryAdapter(lib, c.materials?.map ?? {}, { overrides: c.materials?.overrides ?? null, applyOverrides });
    return { generate: (f, p) => generateNode(f, p), resolve: res, materialOf, data, metricLookup, overridesApplied: true, lib, applyOverrides, mech: MECH };
  };
  return { lib, depsFor };
}

/** Physics of the selected studies: thermal | thermo_elastic | coupled. */
export function physicsOf(c, study = null) {
  const sel = (c.studies ?? []).filter((s) => !study || s.id === study);
  const isMech = (s) => s.type === 'thermo_elastic' || s.type === 'process_sequence';
  const mech = sel.filter(isMech);
  if (!mech.length) return 'thermal';
  return mech.some((s) => s.temperature?.from) || sel.some((s) => !isMech(s)) ? 'coupled' : 'thermo_elastic';
}

// the materials of every mechanics grid pass through the resolver so their template rows are found
function register(results, d) {
  for (const r of results ?? []) for (const key of r.grid?.materials ?? []) {
    try { d.resolve(key, 298.15, { need: [] }); } catch { /* registration only */ }
  }
}

function coupledRunner(cv, d) {
  const out = runCaseAll(cv, d);
  register(out.mech, d);
  return out;
}

const mechRunner = coupledRunner;

export function sensitivityNode(caseObj, { study = null, onProgress = null, physics = null, homogenization = null } = {}) {
  const { lib, depsFor } = nodeDeps({ homogenization });
  const ph = physics ?? physicsOf(caseObj, study);
  const runner = { thermal: runCase, thermo_elastic: mechRunner, coupled: coupledRunner }[ph];
  if (!runner) throw new Error(`sensitivity: physics ${ph} not in thermal | thermo_elastic | coupled`);
  return runSensitivity(caseObj, { depsFor, lib, runCase: runner, study, physics: ph, boundStatus: BOUND_STATUS, onProgress });
}

/** Labelled variants (runner/variants.mjs) of the thermo_elastic studies, one runCaseAll call per temperature. */
export function variantsNode(caseObj, variants, { study = null, onProgress = null, common = null, homogenization = null } = {}) {
  const { depsFor } = nodeDeps({ homogenization });
  const runOne = (cv, { study: st }) => {
    const out = runCaseAll(cv, { ...depsFor(cv), study: st });
    if (!out.mech.length && out.errors?.length) throw new Error(out.errors.map((e) => `${e.study}${e.T_C != null ? ` at ${e.T_C} C` : ''}: ${e.error}`).join('; '));
    return { results: out.mech, targets: out.targets };
  };
  return runVariants(caseObj, variants, { runOne, study, onProgress, common });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const si = args.indexOf('--study');
  const study = si >= 0 ? args[si + 1] : null;
  const hi = args.indexOf('--homog');
  const homogenization = hi >= 0 ? args[hi + 1] : null; // rom | rve (default: library default)
  const vi = args.indexOf('--variants');
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--study' && args[i - 1] !== '--variants' && args[i - 1] !== '--homog');
  const c = parseYaml(readFileSync(file, 'utf8'));
  if (vi >= 0) {
    // --variants <variants.yaml>: list of variant objects (runner/variants.mjs); prints JSON rows
    // file: a list of variants, or {common, variants}
    const doc = parseYaml(readFileSync(args[vi + 1], 'utf8'));
    const variants = Array.isArray(doc) ? doc : doc.variants ?? [];
    const rows = variantsNode(c, variants, { study, common: Array.isArray(doc) ? null : doc.common ?? null, homogenization, onProgress: (v, m) => process.stderr.write(`${v}: ${m}\n`) });
    // stamped with the engine hash and git dirty flag (L10)
    process.stdout.write(JSON.stringify({ engine: engineVersion(), case: c.id, study, homogenization: homogenization ?? 'library default', rows }, null, 2) + '\n');
    process.exit(0);
  }
  const rep = sensitivityNode(c, { study, homogenization, onProgress: (s, m) => process.stderr.write(`${s}: ${m}\n`) });
  rep.engine = engineVersion();
  rep.homogenization = homogenization ?? 'library default';
  process.stdout.write((json ? JSON.stringify(rep, null, 2) : summarizeSensitivity(rep)) + '\n');
}
