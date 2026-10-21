#!/usr/bin/env node
// Stand-alone EM 3D block case runner (until engine/cli.mjs dispatches family em3d to runEm3d):
//   node src/em3d/cli.mjs <sims/em/<case>.yaml> [--variants base,lossy] [--json] [--touchstone-dir <dir>]
// Exit codes: 0 ok, 1 input or solver error, 2 a target with a tolerance missed. License: GPL-3.0-or-later.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runEm3d } from './run.mjs';

function main(argv) {
  const args = argv.slice(2);
  const valued = new Set(['--variants', '--touchstone-dir']);
  const file = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
  if (!file) {
    console.error('usage: node src/em3d/cli.mjs <case.yaml> [--variants a,b] [--json] [--touchstone-dir dir]');
    return 1;
  }
  const opt = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
  let res;
  try {
    res = runEm3d(parseYaml(readFileSync(file, 'utf8')), { variants: opt('--variants')?.split(','), log: (m) => console.error(m) });
  } catch (e) {
    console.error(String(e?.message ?? e));
    return 1;
  }
  const dir = opt('--touchstone-dir');
  if (dir) {
    mkdirSync(dir, { recursive: true });
    for (const v of res.variants) for (const t of v.touchstone) writeFileSync(join(dir, t.name), t.text);
  }
  if (args.includes('--json')) console.log(JSON.stringify({ ...res, variants: res.variants.map((v) => ({ ...v, touchstone: v.touchstone.map((t) => t.name) })) }, null, 1));
  let missed = false;
  for (const v of res.variants) {
    console.error(`\n== ${res.case} / ${v.variant}: ${v.title}`);
    console.error(`mesh ${v.mesh.tets} tets, ${v.mesh.dof} DOF, nnzL ${v.mesh.nnzL}; ${v.derived.freqs_GHz.length} frequencies; mean ${(v.timing.mean_freq_ms / 1000).toFixed(1)} s/frequency; RSS ${v.timing.rss_MB?.toFixed(0)} MB`);
    for (const r of v.derived.rows) {
      const s = (i, j) => 20 * Math.log10(Math.hypot(...r.S[i][j]));
      const pi = r.pi ? ` L ${(r.pi.L_H * 1e12).toFixed(2)} pH, C1 ${(r.pi.C1_F * 1e15).toFixed(2)} fF, C2 ${(r.pi.C2_F * 1e15).toFixed(2)} fF, R ${r.pi.R_ohm.toFixed(4)} ohm` : '';
      console.error(`  ${r.f_GHz} GHz: S11 ${s(0, 0).toFixed(2)} dB, S21 ${s(1, 0).toFixed(3)} dB;${pi}`);
    }
    for (const t of v.targets) if (t.pass === false) missed = true;
    for (const w of v.warnings) console.error(`  warning: ${w}`);
  }
  return missed ? 2 : 0;
}

process.exitCode = main(process.argv);
