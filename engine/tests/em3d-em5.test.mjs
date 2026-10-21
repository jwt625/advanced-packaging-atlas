// EM-5a reduced (GSG through 2 TSVs in 100 um Si) at 20 GHz: DOF budget, passivity, reciprocity, symmetry, and the
// expected ordering of Si substrate loss (10 S/m vs 0.1 S/m). No DB comparison (geometry not reported; see
// sims/em/em5a_tsv_gsg_reference_deck.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { runEm3d } from '../src/em3d/run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

test('EM-5a reduced TSV chain at 20 GHz: <= 6e4 DOF, passive, reciprocal, lossy Si > high-resistivity Si loss', () => {
  const c = parse(readFileSync(join(HERE, '..', '..', 'sims', 'em', 'em5a_tsv_gsg_chain_reduced.yaml'), 'utf8'));
  c.em3d.sweep = { f_GHz: [20] };
  c.em3d.touchstone = false;
  const [base, hr] = runEm3d(c).variants;
  const s21 = (v) => 20 * Math.log10(Math.hypot(...v.derived.rows[0].S[1][0]));
  if (process.env.EM2D_GATE_LOG) console.log(`GATE EM-5a 20 GHz dof ${base.mesh.dof}: S21 ${s21(base).toFixed(3)} dB (10 S/m Si), ${s21(hr).toFixed(3)} dB (0.1 S/m); ${(base.timing.mean_freq_ms / 1000).toFixed(1)} s`);
  for (const v of [base, hr]) {
    const r = v.derived.rows[0];
    assert.ok(v.mesh.dof <= 6e4);
    assert.ok(r.checks.max_singular_value <= 1 + 1e-9 && r.checks.reciprocity_error < 1e-10);
    assert.ok(Math.hypot(r.S[0][0][0] - r.S[1][1][0], r.S[0][0][1] - r.S[1][1][1]) < 1e-2, 'S11 = S22 (mirror-symmetric chain)');
  }
  assert.ok(s21(base) < s21(hr) - 0.3, 'conductive Si adds loss');
  // L5 (wave 3) found the 0.1 S/m S11 20-27 dB too low; cause (L7 wave 6): the 3D line cross-section is under-resolved
  // at this budget (port / line impedance 53.9 ohm vs 68.87 ohm from em2d and from L5's independent 2D solve). The
  // port-impedance check must flag it.
  const pc = hr.derived.port_checks[0];
  assert.ok(pc.z_rel < -0.15 && Math.abs(pc.z_em2d_ohm - 68.87) < 0.5, `port Z check ${pc.z_port_ohm} vs ${pc.z_em2d_ohm}`);
  assert.ok(hr.warnings.some((w) => /differs from the converged 2D cross-section/.test(w)));
});
