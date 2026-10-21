// EM-4 reduced (G-S-G micro-bump transition) at 10 GHz: DOF budget, passivity, reciprocity, mirror symmetry of the
// block (rotation about the bump axis maps port ip to port die), pi-model extraction. No external target exists
// (R3 Sec. 4.2: cross-solver only); see sims/em/em4_microbump_gsg_reference_deck.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { runEm3d } from '../src/em3d/run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

test('EM-4 reduced micro-bump block at 10 GHz: <= 6e4 DOF, passive, reciprocal, symmetric, pi model', () => {
  const c = parse(readFileSync(join(HERE, '..', '..', 'sims', 'em', 'em4_microbump_gsg.yaml'), 'utf8'));
  c.em3d.sweep = { f_GHz: [10] };
  c.em3d.touchstone = false;
  const events = [];
  const v = runEm3d(c, { variants: ['base'], onProgress: (ev) => events.push(ev) }).variants[0];
  const stages = new Set(events.map((e) => e.stage));
  for (const st of ['mesh', 'setup', 'ready', 'frequency', 'factor', 'frequency_done']) assert.ok(stages.has(st), `progress stage ${st}`);
  const fr = events.filter((e) => e.stage === 'factor' && !e.companion).map((e) => e.fraction);
  assert.ok(events.some((e) => e.companion), 'companion line runs report progress');
  assert.ok(fr[0] === 0 && fr[fr.length - 1] === 1 && fr.every((x, i) => !i || x >= fr[i - 1]), 'factor fractions 0 .. 1, monotonic');
  assert.deepEqual(v.derived.port_checks.map((p) => p.status), ['ok', 'ok'], 'port-distance rule');
  for (const pc of v.derived.port_checks) assert.ok(Math.abs(pc.z_rel + 0.095) < 0.02, `port Z check ${pc.z_rel}`);
  const r = v.derived.rows[0];
  if (process.env.EM2D_GATE_LOG) console.log(`GATE EM-4 10 GHz dof ${v.mesh.dof}: S11 ${(20 * Math.log10(Math.hypot(...r.S[0][0]))).toFixed(2)} dB, S21 ${(20 * Math.log10(Math.hypot(...r.S[1][0]))).toFixed(3)} dB, L ${(r.pi.L_H * 1e12).toFixed(2)} pH, C1 ${(r.pi.C1_F * 1e15).toFixed(2)} fF, C2 ${(r.pi.C2_F * 1e15).toFixed(2)} fF, ${(v.timing.mean_freq_ms / 1000).toFixed(1)} s`);
  assert.ok(v.mesh.dof <= 6e4);
  assert.ok(r.checks.max_singular_value <= 1 + 1e-9 && r.checks.reciprocity_error < 1e-10);
  assert.ok(Math.hypot(r.S[0][0][0] - r.S[1][1][0], r.S[0][0][1] - r.S[1][1][1]) < 5e-3, 'S11 = S22 (mirror-symmetric block)');
  assert.ok(Math.abs(r.pi.C1_F / r.pi.C2_F - 1) < 0.05 && r.pi.L_H > 0 && r.pi.C1_F > 0);
  // lane L5 converged desktop reference (DevLog/lanes/L5-references.md wave 3: quasi-static L 9.03 +- 0.03 pH,
  // C1 = C2 9.37 +- 0.02 fF, S11 -32.5 dB at 10 GHz). Line-run de-embedding with companions cut from the device mesh
  // (lane L13, audit A3 S3) at 59.5k DOF: L 8.913 pH (-1.3 %), C1 10.53 fF (+12 %), S11 -31.22 dB (+1.3 dB); at 97k DOF
  // L 8.966 pH, C1 10.03 fF, S11 -31.75 dB (DevLog/lanes/L13-em3d.md). Bands: L 3 %, C 15 %, S11 1.5 dB.
  assert.equal(v.derived.deembed_method, 'line_run');
  const [c1, c2] = v.derived.companions;
  assert.ok(c1.layers === v.mesh.layers && c2.layers === v.mesh.layers, 'companions on the device z-planes');
  assert.deepEqual([c1.reference_plane.at_um, c2.reference_plane.at_um], [-13.5, 13.5]);
  assert.ok(Math.abs(c1.z_face_ohm / r.zref_native_ohm[0] - 1) < 1e-12, 'companion face = device port face');
  assert.ok(Math.abs(r.pi.L_H / 9.03e-12 - 1) < 0.03, `L ${r.pi.L_H}`);
  assert.ok(Math.abs(r.pi.C1_F / 9.37e-15 - 1) < 0.15, `C1 ${r.pi.C1_F}`);
  assert.ok(Math.abs(20 * Math.log10(Math.hypot(...r.S[0][0])) + 32.5) < 1.5, 'S11 vs L5');
  assert.ok(v.warnings.some((w) => /port ip: 3D port-face impedance/.test(w)), 'port-Z check warns (-9.5 %)');
});
