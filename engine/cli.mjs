#!/usr/bin/env node
// ap-sim CLI (tranche E1; SPEC section 1): node cli.mjs <case.yaml> [--study s1] [--json] [--solver auto|direct|pcg_mg]
// Loads a case, calls the family generator (src/families/index.mjs, lane L3), builds the grid, runs the thermal
// studies, prints a summary (or JSON without the field arrays). Exit codes (as the EO engine CLI): 0 ok, 1 input or
// solver error, 2 a checked target missed. Nothing is written to disk.
// License: GPL-3.0-or-later.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { C_TO_K } from './src/thermal/index.mjs';
import { CaseError, parseCase, runCase, runCaseAll, summarize, summarizeAll, toJson, toJsonAll, libraryAdapter } from './src/thermal/case.mjs';

export { CaseError, parseCase, runCase, summarize, toJson, materialMapper, overrideResolver, evalTarget, libraryAdapter } from './src/thermal/case.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Engine version stamp (L9 W2.2: batch failures during concurrent edits must be traceable): sha256 over the sorted
 * relative paths and contents of engine/src/ (every .mjs and .json, recursively) and cli.mjs (`src`), the same
 * over every file under engine/data/ (`data`), the run-time inputs `package3d` (app/static/data/package3d.json, the
 * generator data) and `metrics` (data/metrics.csv, expected values; null when absent), and `dirty`: 'untracked' when
 * git tracks no file under engine/ (the status flag carries no information then), else read-only
 * `git status --porcelain -- .` in engine/ non-empty (true / false; null when git is unavailable). Hashes are the
 * first 12 hex digits.
 * @param {string} [root] engine directory
 */
export function engineVersion(root = HERE) {
  const walk = (d) => (existsSync(d) ? readdirSync(d).sort().flatMap((n) => { const q = join(d, n); return statSync(q).isDirectory() ? walk(q) : [q]; }) : []);
  const hashOf = (files) => {
    const h = createHash('sha256');
    for (const f of files) { h.update(relative(root, f).split('\\').join('/')); h.update('\0'); h.update(readFileSync(f)); h.update('\0'); }
    return h.digest('hex').slice(0, 12);
  };
  const src = [...walk(join(root, 'src')).filter((f) => /\.(mjs|json)$/.test(f)), join(root, 'cli.mjs')].filter((f) => existsSync(f));
  const data = walk(join(root, 'data'));
  const fileHash = (f) => (existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12) : null);
  let dirty = null, dirty_files = null;
  try {
    const tracked = spawnSync('git', ['ls-files', '--', '.'], { cwd: root, encoding: 'utf8', timeout: 10000 });
    const g = spawnSync('git', ['status', '--porcelain', '--', '.'], { cwd: root, encoding: 'utf8', timeout: 10000 });
    if (tracked.status === 0 && g.status === 0) {
      const lines = g.stdout.split('\n').filter(Boolean);
      dirty_files = lines.length;
      dirty = tracked.stdout.trim() === '' ? 'untracked' : lines.length > 0;
    }
  } catch { /* git unavailable: dirty unknown */ }
  return {
    src: hashOf(src), src_files: src.length, data: hashOf(data), data_files: data.length,
    package3d: fileHash(join(root, '../app/static/data/package3d.json')), metrics: fileHash(join(root, '../data/metrics.csv')), dirty, dirty_files,
  };
}

/** One-line form of engineVersion(). */
export function engineVersionLine(v) {
  return `engine src ${v.src} (${v.src_files} files), data ${v.data}, package3d ${v.package3d ?? '-'}, metrics ${v.metrics ?? '-'}, ${v.dirty == null ? 'git state unknown' : v.dirty === 'untracked' ? 'untracked (engine/ not committed: no dirty state)' : v.dirty ? `dirty (${v.dirty_files} git status entries under engine/)` : 'clean'}`;
}

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, newlines inside quotes). */
export function parseCsv(text) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}

/** metric_id -> {value, unit} from the DB metrics table (read-only); null lookup when the file is absent. */
export function metricsTable(path) {
  if (!existsSync(path)) return null;
  const [head, ...rows] = parseCsv(readFileSync(path, 'utf8'));
  const iId = head.indexOf('metric_id'), iV = head.indexOf('value'), iU = head.indexOf('unit');
  const m = new Map();
  for (const r of rows) if (r[iId]) m.set(r[iId], { value: r[iV] === '' ? NaN : Number(r[iV]), unit: r[iU] || null });
  return (id) => m.get(id) ?? null;
}

async function loadDeps(c) {
  const famPath = join(HERE, 'src/families/index.mjs');
  if (!existsSync(famPath)) throw new CaseError('family generators not available: engine/src/families/index.mjs is missing (lane L3)');
  const fam = await import(pathToFileURL(famPath).href);
  const matPath = join(HERE, 'src/materials/node.mjs');
  if (!existsSync(matPath)) throw new CaseError('materials library not available: engine/src/materials/node.mjs is missing (lane L2)');
  const mat = await import(pathToFileURL(matPath).href);
  if (typeof mat.loadLibrary !== 'function') throw new CaseError('materials library: no loadLibrary() export in src/materials/node.mjs');
  const { resolve, materialOf, notes } = libraryAdapter(mat.loadLibrary(), c.materials?.map ?? {}, { overrides: c.materials?.overrides ?? null, applyOverrides: mat.applyOverrides ?? null });
  for (const n of notes) process.stderr.write(`note: ${n}\n`);
  const dataPath = join(HERE, '../app/static/data/package3d.json');
  const data = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, 'utf8')) : null;
  const metricLookup = metricsTable(join(HERE, '../data/metrics.csv'));
  const lib = mat.loadLibrary();
  let mech = null;
  if (c.studies.some((s) => s.type === 'thermo_elastic' || s.type === 'process_sequence') && existsSync(join(HERE, 'src/mech/case.mjs'))) {
    const mc = await import(pathToFileURL(join(HERE, 'src/mech/case.mjs')).href);
    const mi = await import(pathToFileURL(join(HERE, 'src/mech/index.mjs')).href);
    mech = { runMechCase: mc.runMechCase, mechLibrary: mc.mechLibrary, modelSurface: mc.modelSurface, solveMech: mi.solveMech };
  }
  return { generate: fam.generate, resolve, materialOf, data, metricLookup, overridesApplied: !!mat.applyOverrides, lib, applyOverrides: mat.applyOverrides ?? null, mech, overrideStatuses: mat.OVERRIDE_STATUSES ?? null };
}

/**
 * family em2d (SPEC section 9): dispatch to runEm2d (lane L7, src/em2d/run.mjs); --json passes its result through.
 * Exit 2 when any returned target has pass === false.
 */
async function runEm2dCase(c, { json, variants, io, deps }) {
  const runEm2d = deps?.runEm2d ?? (await import(pathToFileURL(join(HERE, 'src/em2d/run.mjs')).href)).runEm2d;
  const res = runEm2d(c, { variants, log: (m) => io.stderr.write(`${m}\n`) });
  const missed = res.variants.some((v) => (v.targets ?? []).some((t) => t.pass === false));
  if (json) io.stdout.write(JSON.stringify(stamp(res), null, 2) + '\n');
  else {
    const L = [stampLine(), `case ${res.case} (family em2d)`];
    for (const v of res.variants) {
      L.push(`variant ${v.variant}: mesh ${v.mesh?.tris} tris, ${v.derived?.freqs_GHz?.length ?? 0} frequencies, total ${((v.timing?.total_ms ?? 0) / 1000).toFixed(2)} s`);
      for (const t of v.targets ?? []) L.push(`  target ${t.metric_id} ${t.quantity} @ ${t.f_GHz} GHz: computed ${Number(t.computed).toPrecision(4)} vs ${t.value} ${t.unit ?? ''} ${t.pass == null ? 'unchecked' : t.pass ? 'pass' : 'MISS'}`);
      for (const w of v.warnings ?? []) L.push(`  warning: ${w}`);
    }
    io.stdout.write(L.join('\n') + '\n');
  }
  return missed ? 2 : 0;
}

/** family em3d (SPEC section 14): dispatch to runEm3d (lane L7, src/em3d/run.mjs); exit 2 on any pass === false. */
async function runEm3dCase(c, { json, variants, io, deps }) {
  const runEm3d = deps?.runEm3d ?? (await importOr('src/em3d/run.mjs', 'EM 3D runner (lane L7)')).runEm3d;
  const res = runEm3d(c, { variants, log: (m) => io.stderr.write(`${m}\n`) });
  const missed = res.variants.some((v) => (v.targets ?? []).some((t) => t.pass === false));
  if (json) io.stdout.write(JSON.stringify(stamp(res), null, 2) + '\n');
  else {
    const L = [stampLine(), `case ${res.case} (family em3d)`];
    for (const v of res.variants) {
      L.push(`variant ${v.variant ?? v.id ?? '-'}: ${v.derived?.freqs_GHz?.length ?? v.derived?.rows?.length ?? 0} frequencies, total ${((v.timing?.total_ms ?? 0) / 1000).toFixed(2)} s`);
      for (const t of v.targets ?? []) L.push(`  target ${t.metric_id ?? '-'} ${t.quantity} @ ${t.f_GHz} GHz: computed ${Number(t.computed).toPrecision(4)} vs ${t.value} ${t.pass == null ? 'unchecked' : t.pass ? 'pass' : 'MISS'}`);
      for (const w of v.warnings ?? []) L.push(`  warning: ${w}`);
    }
    io.stdout.write(L.join('\n') + '\n');
  }
  return missed ? 2 : 0;
}

/**
 * --sensitivity: L3's CD1 runner (src/runner/sensitivity.mjs). Thermal studies: L3's Node wrapper. thermo_elastic
 * studies: runSensitivity with physics 'mechanics' (nu and k bounds) and runCaseAll as the runner; the mechanics
 * grid materials are touched through the resolver so the template rows of the keys they use are found.
 */
async function runSensitivityCase(c, { json, study, io, deps }) {
  const core = deps?.sensitivity ?? (await importOr('src/runner/sensitivity.mjs', 'sensitivity runner (lane L3)'));
  const mechStudy = c.studies.some((s) => s.type === 'thermo_elastic' && (!study || s.id === study));
  const onProgress = (stage, m) => io.stderr.write(`[${stage}] ${m}\n`);
  let rep;
  if (!mechStudy) {
    const node = deps?.sensitivity ?? (await importOr('src/runner/node.mjs', 'sensitivity Node wrapper (lane L3)'));
    rep = await node.sensitivityNode(c, { study, onProgress });
  } else {
    const base = deps ?? (await loadDeps(c));
    const depsFor = (cv) => {
      const mat = libraryAdapter(base.lib, cv.materials?.map ?? {}, { overrides: cv.materials?.overrides ?? null, applyOverrides: base.applyOverrides });
      return { ...base, resolve: mat.resolve, materialOf: mat.materialOf };
    };
    const runner = (cv, d) => {
      const out = runCaseAll(cv, d);
      for (const r of out.mech) for (const key of r.grid.materials) try { d.resolve(key, 298.15, { need: [] }); } catch { /* registration only */ }
      return out;
    };
    // L2 wave 8 accepts status sensitivity for bound runs (nu, k, CTE); user otherwise (the runner then warns)
    const boundStatus = base.overrideStatuses?.includes('sensitivity') ? 'sensitivity' : 'user';
    rep = core.runSensitivity(c, { depsFor, lib: base.lib, runCase: runner, study, physics: 'mechanics', boundStatus, onProgress });
    addCteBounds(rep, c, { lib: base.lib, depsFor, runner, study, onProgress, boundsOf: core.boundsOf, boundStatus });
  }
  io.stdout.write((json ? JSON.stringify(stamp(rep), null, 2) : `${stampLine()}\n${core.summarizeSensitivity(rep)}`) + '\n');
  return 0;
}

/**
 * L2 CD5 template CTE rows (sensitivity factor [1/3, 3]) for mechanics sensitivity: L3's runner varies k and nu only,
 * so the CTE bounds run here (override cte_ppmK with status sensitivity, L2 wave 8; user when the library does not
 * list that status) and the spread is recomputed over all rows with the same rules as L3's report.
 */
function addCteBounds(rep, c, { lib, depsFor, runner, study, onProgress, boundsOf, boundStatus = 'user' }) {
  if (typeof lib.listTemplateValues !== 'function') return;
  const used = new Set(rep.used_keys ?? []);
  const ov = c.materials?.overrides ?? {};
  const rows = lib.listTemplateValues().filter((r) => used.has(r.key) && r.sensitivity?.property === 'cte' && !(ov[r.key] && ov[r.key].cte_ppmK !== undefined));
  const quantities = (out) => {
    const q = {};
    for (const t of out.targets ?? []) if (Number.isFinite(t.got)) q[`${t.metric_id} ${t.quantity}${t.study ? ` [${t.study}]` : ''}`] = t.got;
    for (const r of out.results ?? []) { const v = r.derived?.Tmax_C?.value; if (Number.isFinite(v)) q[`Tmax_C [${r.study}]`] = v; }
    return q;
  };
  for (const row of rows) {
    const { values, unsupported } = boundsOf(row);
    if (unsupported) { rep.unsupported.push({ key: row.key, where: row.where, reason: unsupported }); continue; }
    const out = { key: row.key, where: row.where, property: 'cte', value: row.value, analog_of: row.analog_of, bounds: [] };
    for (const b of values) {
      onProgress?.('bound', `${row.key}.cte ${b.label}`);
      const cv = JSON.parse(JSON.stringify(c));
      cv.materials = cv.materials ?? {};
      cv.materials.overrides = { ...(cv.materials.overrides ?? {}), [row.key]: { ...(cv.materials.overrides?.[row.key] ?? {}), cte_ppmK: { value: b.value, status: boundStatus, note: `CD5 sensitivity bound ${b.label} of the template value ${row.key}.cte (${row.value} ppm/K)` } } };
      const res = runner(cv, { ...depsFor(cv), study });
      rep.runs++;
      out.bounds.push({ label: b.label, value: b.value, quantities: quantities(res) });
    }
    rep.rows.push(out);
  }
  for (const [name, s0] of Object.entries(rep.spread)) {
    let lo = s0.nominal, hi = s0.nominal, loFrom = 'nominal', hiFrom = 'nominal';
    for (const r of rep.rows) for (const b of r.bounds) {
      const v = b.quantities[name];
      if (!Number.isFinite(v)) continue;
      if (v < lo) { lo = v; loFrom = `${r.key}.${r.property} ${b.label}`; }
      if (v > hi) { hi = v; hiFrom = `${r.key}.${r.property} ${b.label}`; }
    }
    const isT = /Tmax_C|Tmin_C|Tavg_C/.test(name);
    rep.spread[name] = { ...s0, min: lo, max: hi, delta_min: lo - s0.nominal, delta_max: hi - s0.nominal, rel_min: !isT && s0.nominal ? lo / s0.nominal - 1 : null, rel_max: !isT && s0.nominal ? hi / s0.nominal - 1 : null, min_from: loFrom, max_from: hiFrom };
  }
}

// engine version of the current main() call (set once per run; tests may inject deps.engineVersion)
let VERSION = null;
const stamp = (o) => (o && typeof o === 'object' && VERSION ? { engine_version: VERSION, ...o } : o);
const stampLine = () => (VERSION ? engineVersionLine(VERSION) : 'engine version: not computed');

async function importOr(rel, what) {
  const p = join(HERE, rel);
  if (!existsSync(p)) throw new CaseError(`${what} not available: engine/${rel} is missing`);
  return import(pathToFileURL(p).href);
}

/** CLI entry; `deps` ({generate, resolve, data}) replaces the real modules in tests. Returns the exit code. */
export async function main(argv, deps = null, io = process) {
  const args = argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    if (i < 0) return null;
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
  };
  const bool = (name) => {
    const i = args.indexOf(name);
    if (i >= 0) args.splice(i, 1);
    return i >= 0;
  };
  const json = bool('--json');
  const sensitivity = bool('--sensitivity');
  const wasm = bool('--wasm');
  const study = flag('--study');
  const solver = flag('--solver');
  const variants = flag('--variants');
  const meshSet = flag('--mesh'); // run-time mesh overrides key=value[,key=value] (not written to the case)
  const budget = flag('--mech-budget-s'); // thermo_elastic temperatures not started within this many seconds are skipped
  const stream = bool('--stream'); // print each mechanics result as it completes (stderr), so an external cap loses nothing finished
  const mechRtol = flag('--mech-rtol'); // mechanics PCG rtol for every study (default: physics.mechanics.rtol, else by target tier)
  if (args.length !== 1) {
    io.stderr.write('usage: node cli.mjs <case.yaml> [--study <id>] [--json] [--solver auto|direct|pcg_mg|pcg_jacobi] [--variants base,a (em2d / em3d)] [--mesh max_nodes=5e5,max_xy_mm=1] [--sensitivity] [--wasm] [--mech-budget-s 600] [--stream] [--mech-rtol 1e-7]\n');
    return 1;
  }
  try {
    VERSION = deps?.engineVersion !== undefined ? deps.engineVersion : engineVersion();
    if (VERSION) io.stderr.write(`${engineVersionLine(VERSION)}\n`);
    if (mechRtol != null && !(Number(mechRtol) > 0 && Number(mechRtol) <= 1e-2)) throw new CaseError(`--mech-rtol: number in (0, 1e-2] expected, got ${mechRtol}`);
    const raw = parseYaml(readFileSync(args[0], 'utf8'));
    if (raw?.family === 'em2d') return await runEm2dCase(raw, { json, variants: variants ? variants.split(',') : undefined, io, deps });
    if (raw?.family === 'em3d') return await runEm3dCase(raw, { json, variants: variants ? variants.split(',') : undefined, io, deps });
    if (meshSet) {
      raw.mesh = { ...(raw.mesh ?? {}) };
      for (const kv of meshSet.split(',')) {
        const [k, v] = kv.split('=');
        if (!k || v == null || !Number.isFinite(Number(v))) throw new CaseError(`--mesh: expected key=number, got ${kv}`);
        raw.mesh[k] = Number(v);
        io.stderr.write(`note: run-time mesh override ${k} = ${v} (case file unchanged)\n`);
      }
    }
    const c = parseCase(raw);
    if (sensitivity) return await runSensitivityCase(c, { json, study, io, deps });
    const d = deps ?? (await loadDeps(c));
    const hasMech = c.studies.some((s) => (s.type === 'thermo_elastic' || s.type === 'process_sequence') && (!study || s.id === study));
    const extra = { ...(wasm ? { accel: 'wasm' } : {}), ...(budget != null ? { budget_s: Number(budget) } : {}), ...(mechRtol != null ? { mechRtol: Number(mechRtol) } : {}),
      ...(stream ? { onMechResult: (r) => io.stderr.write(`[result] study ${r.study} at ${r.T_C} C: ${(r.derived?.warpage ?? []).map((w) => `warpage ${w.warpage_um.toFixed(2)} um (${w.surface})`).join('; ') || 'no warpage surface'}, ${r.timing?.total_ms != null ? (r.timing.total_ms / 1000).toFixed(1) : '-'} s\n`) } : {}) };
    const out = hasMech ? runCaseAll(c, { ...d, study, solver, ...extra }) : runCase(c, { ...d, study, solver, ...extra });
    io.stdout.write((json ? JSON.stringify(stamp(hasMech ? toJsonAll(out) : toJson(out)), null, 2) : `${stampLine()}\n${hasMech ? summarizeAll(out) : summarize(out)}`) + '\n');
    if (out.errors?.length) {
      for (const e of out.errors) io.stderr.write(`${e.skipped ? 'note' : 'error'}: study ${e.study}${e.T_C != null ? ` at ${e.T_C} C` : ''}: ${e.error}\n`);
      if (out.errors.some((e) => !e.skipped)) return 1;
    }
    return out.targets.some((t) => t.status === 'miss') ? 2 : 0;
  } catch (e) {
    io.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv).then((code) => process.exit(code));

export { C_TO_K };
