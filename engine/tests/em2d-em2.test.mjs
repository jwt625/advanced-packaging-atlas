// EM-2 (R3 Sec. 4.2): differential CPWG on a 4-layer PI Si-bridge RDL vs measured differential IL/mm at 56 GHz
// (eptc67330.2025.11392620-a-e1..e5, paper p.3 Table I). Runs the case at 56 GHz only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { runEm2d } from '../src/em2d/run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CASE = join(HERE, '..', '..', 'sims', 'em', 'em2_cpwg_si_bridge.yaml');

test('EM-2 Si-bridge CPWG: odd-mode alpha vs measured IL/mm (5 designs), Zdiff near the 100 ohm design', () => {
  const c = parse(readFileSync(CASE, 'utf8'));
  c.em2d.sweep = { f_GHz: [56] };
  c.em2d.lines = [];
  const res = runEm2d(c, { variants: ['base', 'm4m1w2', 'm4m1w10', 'm4m3w2', 'm4m3w5'] });
  for (const v of res.variants) {
    assert.equal(v.targets.length, 1, `${v.variant}: one target`);
    const t = v.targets[0];
    if (process.env.EM2D_GATE_LOG) console.log(`GATE EM-2 ${v.variant} ${t.metric_id}: ${t.computed.toFixed(3)} vs ${t.value} dB/mm (${(100 * t.rel_err).toFixed(1)} %)`);
    assert.ok(t.pass, `${v.variant}: ${t.computed} vs ${t.value}`);
    const z = v.derived.modes[0].Zc_ohm;
    const zd = 2 * (z[0][0][0] - z[0][1][0]);
    assert.ok(Math.abs(zd / 100 - 1) < 0.1, `${v.variant}: Zdiff ${zd} vs 100 ohm design (a-m1)`);
  }
});
