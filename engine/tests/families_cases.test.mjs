// License: GPL-3.0-or-later.
// Lane L3: case configs under sims/<family>/*.yaml (SPEC section 1) generate with the family generators, use
// symmetry or rigid-motion supports (never both), carry provenance for every non-default number, and key their
// targets to existing data/metrics.csv rows.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { generateNode } from '../src/families/node.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sims = join(root, 'sims');
const caseFiles = [];
for (const d of readdirSync(sims)) {
  const p = join(sims, d);
  if (d === 'em' || !statSync(p).isDirectory()) continue;
  for (const f of readdirSync(p)) if (f.endsWith('.yaml')) caseFiles.push(join(p, f));
}

// minimal CSV reader (quoted fields, embedded commas and newlines)
function readCsv(path) {
  const s = readFileSync(path, 'utf8');
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const metrics = new Map(readCsv(join(root, 'data/metrics.csv')).map((r) => [r.metric_id, r]));

const TOP = new Set(['schema', 'id', 'title', 'status', 'family', 'params', 'geometry', 'materials', 'mesh', 'physics', 'studies', 'targets', 'assumptions', 'missing']);
const STATUSES = new Set(['reported', 'derived', 'public', 'template', 'user']);
const TIERS = new Set(['A', 'B', 'C', 'D', 'H']);

test('at least the 8 L3 cases exist', () => {
  const ids = caseFiles.map((f) => f.slice(sims.length + 1, -5));
  for (const id of ['cowos_l/warpage_rt_ht', 'cowos_s/warpage_corner_stress', 'emib_t/bridge_stress', 'si_interposer_peers/xilinx_tsv_lid',
    'si_interposer_peers/120mm_warpage', 'si_interposer_peers/50mm_quarter', 'fcbga_organic/substrate_warpage', 'cowos_r/thermal_rjc']) {
    assert.ok(ids.includes(id), `case ${id}`);
  }
});

for (const file of caseFiles) {
  const rel = file.slice(sims.length + 1);
  test(`case ${rel}`, () => {
    const c = YAML.parse(readFileSync(file, 'utf8'));
    for (const k of Object.keys(c)) assert.ok(TOP.has(k), `unknown top-level key ${k}`);
    assert.equal(c.schema, 'ap-sim/0');
    assert.equal(c.id, rel.slice(0, -5));
    for (const [k, v] of Object.entries(c.params || {})) {
      if (typeof v === 'object' && v !== null) {
        assert.ok(STATUSES.has(v.status), `param ${k} status`);
        assert.ok(v.ref || v.refs || v.note || v.source, `param ${k} provenance`);
      } else {
        assert.ok(typeof v !== 'number', `param ${k}: bare number needs a {value, status, ref|note} object`);
      }
    }
    const g = generateNode(c.family, c.params || {});
    assert.ok(g.symmetry.allowed.includes(c.geometry.symmetry), `symmetry ${c.geometry.symmetry} allowed (${g.symmetry.allowed})`);
    const kinds = new Set(g.boxes.map((b) => b.kind));
    for (const k of c.geometry.drop_kinds || []) assert.ok(kinds.has(k), `drop_kinds ${k} present in the layout`);
    const mech = c.physics?.mechanics;
    if (mech) {
      assert.ok(['rigid_motion', 'symmetry'].includes(mech.supports), 'supports');
      if (mech.supports === 'symmetry') assert.notEqual(c.geometry.symmetry, 'none', 'symmetry supports need a symmetric model');
      if (mech.supports === 'rigid_motion') assert.equal(c.geometry.symmetry, 'none', 'rigid_motion supports only on a full model (never combined with mirror planes)');
    }
    assert.ok(c.studies.some((s) => s.type === 'thermal_stationary'), 'a thermal_stationary study (end-to-end run)');
    for (const s of c.studies) {
      if (!s.params) continue;
      for (const [k, v] of Object.entries(s.params)) assert.ok(typeof v !== 'number', `study ${s.id} param ${k}: needs provenance object`);
      const gs = generateNode(c.family, { ...(c.params || {}), ...s.params });
      assert.ok(gs.parts.length > 0, `study ${s.id} variant generates`);
    }
    const th = c.physics?.thermal;
    assert.ok(th && th.sources?.length && th.bcs?.length, 'thermal sources and BCs');
    const partIds = g.parts.map((p) => p.id);
    for (const s of th.sources) {
      const re = new RegExp(`^${s.parts.replace(/\*/g, '.*')}$`);
      assert.ok(partIds.some((id) => re.test(id)) || g.boxes.some((b) => re.test(b.id)), `source parts ${s.parts} match a part or layer box`);
    }
    const sel = (x) => {
      if (x === 'default') return true;
      if (x.startsWith('interface:')) return x.slice(10).split(/[|/]/).every((n) => partIds.includes(n) || g.boxes.some((b) => b.id === n));
      const m = /^(top|bottom|side|part|corner):(.+)$/.exec(x);
      if (!m) return false;
      const re = new RegExp(`^${m[2].replace(/\*/g, '.*')}$`);
      return partIds.some((id) => re.test(id)) || g.boxes.some((b) => re.test(b.id));
    };
    for (const b of th.bcs) assert.ok(sel(b.selection), `bc selection ${b.selection} matches a part`);
    for (const t of c.targets || []) assert.ok(sel(t.selection), `target selection ${t.selection} matches a part`);
    for (const t of c.targets || []) {
      const m = metrics.get(t.metric_id);
      assert.ok(m, `target ${t.metric_id} exists in data/metrics.csv`);
      assert.ok(TIERS.has(t.tier), `tier ${t.tier}`);
      if (t.tier === 'C') assert.equal(m.basis, 'simulated', `${t.metric_id}: tier C needs basis simulated (got ${m.basis})`);
      if (t.tier === 'D') assert.ok(['measured', 'unspecified'].includes(m.basis), `${t.metric_id}: tier D basis ${m.basis}`);
      if (t.quantity === 'warpage_um') assert.equal(t.definition, 'jeita_ed7306');
      if (t.study) assert.ok(c.studies.some((s) => s.id === t.study), `target study ${t.study}`);
    }
    assert.ok(Array.isArray(c.assumptions) && Array.isArray(c.missing));
  });
}
