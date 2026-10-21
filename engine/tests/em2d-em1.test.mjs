// EM-1 (R3 Sec. 4.2): ABF Type-A microstrip on glass vs measured TRL IL/mm (ectc51846.2026.00389-b-m2,m5,m8,m11).
// Runs the case file at the four target frequencies only (base and smooth variants).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { runEm2d } from '../src/em2d/run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CASE = join(HERE, '..', '..', 'sims', 'em', 'em1_abf_microstrip_glass.yaml');

test('EM-1 ABF microstrip on glass: cannonball within the L4 tolerance, smooth < cannonball < base bracket, Z0', () => {
  const c = parse(readFileSync(CASE, 'utf8'));
  c.em2d.sweep = { f_GHz: [33, 77, 140, 200] };
  c.em2d.touchstone = false;
  const res = runEm2d(c, { variants: ['base', 'smooth', 'cannonball'] });
  const [base, smooth, cb] = res.variants;
  for (const v of res.variants)
    for (const t of v.targets) if (process.env.EM2D_GATE_LOG) console.log(`GATE EM-1 ${v.variant} ${t.metric_id} ${t.f_GHz} GHz: ${t.computed.toFixed(4)} vs ${t.value} dB/mm (${(100 * t.rel_err).toFixed(1)} %) ${t.pass ? 'pass' : 'miss'}`);
  for (const t of cb.targets) assert.ok(t.pass, `cannonball ${t.metric_id}: ${t.computed} vs ${t.value}`);
  base.targets.forEach((t, i) => assert.ok(smooth.targets[i].computed < cb.targets[i].computed && cb.targets[i].computed < t.computed, 'smooth < cannonball < base'));
  const z0 = base.derived.modes.map((m) => m.Zc_ohm[0][0][0]);
  for (const z of z0) assert.ok(Math.abs(z - 70) < 3, `Z0 ${z} vs 70 ohm design (DB tv name)`);
  for (const l of base.derived.lines) assert.ok(l.checks.passive && l.checks.max_reciprocity_error < 1e-12);
});
