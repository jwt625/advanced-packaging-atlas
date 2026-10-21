#!/usr/bin/env node
// Stand-alone EM 2D case runner (until engine/cli.mjs dispatches family em2d to runEm2d):
//   node src/em2d/cli.mjs <sims/em/<case>.yaml> [--variants base,smooth] [--json] [--touchstone-dir <dir>]
// Prints a per-variant summary (targets, timing). Writes Touchstone files only with --touchstone-dir.
// Exit codes: 0 ok, 1 input or solver error, 2 a target with a tolerance missed. License: GPL-3.0-or-later.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runEm2d } from './run.mjs';

function main(argv) {
  const args = argv.slice(2);
  const valued = new Set(['--variants', '--touchstone-dir']);
  const file = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
  if (!file) {
    console.error('usage: node src/em2d/cli.mjs <case.yaml> [--variants a,b] [--json] [--touchstone-dir dir]');
    return 1;
  }
  const opt = (k) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : null;
  };
  const variants = opt('--variants')?.split(',') ?? undefined;
  const tsDir = opt('--touchstone-dir');
  let res;
  try {
    const c = parseYaml(readFileSync(file, 'utf8'));
    res = runEm2d(c, { variants, log: (m) => console.error(m) });
  } catch (e) {
    console.error(String(e?.message ?? e));
    return 1;
  }
  if (tsDir) {
    mkdirSync(tsDir, { recursive: true });
    for (const v of res.variants) for (const t of v.touchstone) writeFileSync(join(tsDir, t.name), t.text);
  }
  let missed = false;
  if (args.includes('--json')) {
    const slim = { ...res, variants: res.variants.map((v) => ({ ...v, touchstone: v.touchstone.map((t) => t.name) })) };
    console.log(JSON.stringify(slim, null, 1));
  }
  for (const v of res.variants) {
    console.error(`\n== ${res.case} / ${v.variant}: ${v.title}`);
    console.error(`mesh ${v.mesh.tris} tris, DOF es ${v.mesh.dof_es}, mqs ${v.mesh.dof_mqs}; ${v.derived.freqs_GHz.length} frequencies; total ${(v.timing.total_ms / 1000).toFixed(2)} s, mean ${v.timing.mean_freq_ms.toFixed(0)} ms/frequency`);
    for (const t of v.targets) {
      if (t.pass === false) missed = true;
      console.error(`  ${t.metric_id} ${t.quantity} @ ${t.f_GHz} GHz: computed ${t.computed.toPrecision(4)} vs ${t.value} ${t.unit ?? ''} (${(100 * t.rel_err).toFixed(1)} %) ${t.pass == null ? '' : t.pass ? 'pass' : 'MISS'}`);
    }
    for (const w of v.warnings) console.error(`  warning: ${w}`);
  }
  return missed ? 2 : 0;
}

process.exitCode = main(process.argv);
