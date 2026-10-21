#!/usr/bin/env node
// Transcribe a package3d template (config/package3d/<id>.yaml, read-only) into the family-generator spec format
// (engine/src/families/specs/<id>.mjs). Node only; run by hand when a template changes:
//   node src/families/tools/transcribe.mjs <family_id> [...]
// Rules (scripts/build_package3d.py expand_modules / module_drop / module_rename): `use:` modules are merged with the
// template winning on part / array ids and layer hosts; drop runs before rename. Inline dimension specs that need a
// database cell (`ref:`, `analog:`, `r0` tokens) become constants taken from the matching package3d.json dims (value,
// status, note, R-id refs); other inline templates keep their expression. Routing, callouts and insets are not
// transcribed (not sim geometry). The output is a plain ES module so the browser build needs no JSON import.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../..');
const CONFIG = join(REPO, 'config/package3d');
const OUT = resolve(HERE, '../specs');

const loadYaml = (p) => YAML.parse(readFileSync(p, 'utf8'), { version: '1.2', merge: true });
const clone = (x) => JSON.parse(JSON.stringify(x));

function moduleDrop(mod, names) {
  const ns = new Set(names.map(String));
  for (const key of ['parts', 'arrays']) mod[key] = (mod[key] || []).filter((x) => !ns.has(x.id));
  mod.layers = (mod.layers || []).filter((g) => !ns.has(g.part)).map((g) => ({ ...g, pattern: (g.pattern || []).filter((el) => !ns.has(el.id)) }))
    .filter((g) => g.pattern.length);
  for (const n of ns) if (mod.params) delete mod.params[n];
}

function moduleRename(mod, ren) {
  const idmap = {};
  const patch = {};
  for (const [old, v] of Object.entries(ren)) {
    if (typeof v === 'string') idmap[old] = v;
    else { if (v.id) idmap[old] = v.id; patch[old] = Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'id')); }
  }
  const m = (x) => (typeof x === 'string' && idmap[x] ? idmap[x] : x);
  const els = [...(mod.parts || []), ...(mod.arrays || []), ...(mod.layers || []).flatMap((g) => g.pattern || [])];
  for (const el of els) { Object.assign(el, patch[el.id] || {}); el.id = m(el.id); }
  for (const p of mod.parts || []) {
    for (const k of ['on', 'in', 'under', 'standoff']) if (p[k]) p[k] = m(p[k]);
    if (p.fill) { for (const k of ['above', 'per']) if (p.fill[k]) p.fill[k] = m(p.fill[k]); if (p.fill.parts) p.fill.parts = p.fill.parts.map(m); }
  }
  for (const a of mod.arrays || []) {
    for (const k of ['per', 'upper', 'lower', 'in', 'under', 'host']) if (a[k]) a[k] = m(a[k]);
    if (a.between) a.between = a.between.map(m);
    if (a.span) a.span = a.span.map((s) => { const [side, n] = s.split(':'); return `${side}:${m(n)}`; });
    if (a.region) { if (a.region.part) a.region.part = m(a.region.part); for (const k of ['intersect', 'subtract']) if (a.region[k]) a.region[k] = a.region[k].map(m); }
  }
  for (const g of mod.layers || []) g.part = m(g.part);
}

export function expandModules(path, tpl) {
  const uses = tpl.use || [];
  if (!uses.length) return tpl;
  const t = clone(tpl);
  for (const u of uses) {
    const stpl = u.from ? loadYaml(join(CONFIG, u.from)) : t;
    const mod = clone((stpl.modules || {})[u.module]);
    if (!mod) throw new Error(`${path}: module ${u.module} not found`);
    if (u.drop) moduleDrop(mod, u.drop);
    if (u.rename) moduleRename(mod, u.rename);
    for (const key of ['parts', 'arrays']) {
      const own = t[key] || [];
      const ids = new Set(own.map((x) => x.id));
      t[key] = [...own, ...(mod[key] || []).filter((x) => !ids.has(x.id))];
    }
    const own = t.layers || [];
    const hosts = new Set(own.map((g) => g.part));
    t.layers = [...own, ...(mod.layers || []).filter((g) => !hosts.has(g.part))];
  }
  return t;
}

function makeConverter(famJson, where0) {
  const jpart = (tid) => famJson.parts.find((p) => p.template_id === tid);
  const jlayer = (lid) => famJson.layers.find((l) => l.template_id === lid);
  const jarray = (aid) => famJson.arrays.find((a) => a.template_id === aid);
  const fromJson = (d, where) => {
    if (!d) throw new Error(`${where}: inline cell spec without a resolved package3d.json dim`);
    const o = { value: d.value, status: d.status };
    for (const k of ['ref', 'refs', 'note', 'source']) if (d[k] !== undefined) o[k] = d[k];
    if (!o.note && !o.ref && !o.refs) o.note = 'resolved package3d.json dimension';
    return o;
  };
  // spec: string (param or expression) | inline object; jd: the resolved dims entry for this key
  return function conv(spec, jd, where) {
    if (spec === undefined) return undefined;
    if (typeof spec === 'string') return spec;
    if (typeof spec === 'number') return { value: spec, status: 'template', note: `literal in config/package3d template (${where0} ${where})` };
    if (typeof spec === 'object') {
      if ('template' in spec || 'derived' in spec) {
        const v = spec.template ?? spec.derived;
        const st = 'template' in spec ? 'template' : 'derived';
        if (typeof v === 'number') return { value: v, status: st, note: spec.note || 'template value', ...(spec.refs ? { refs: spec.refs } : {}), ...(spec.source ? { source: spec.source } : {}) };
        if (/\br\d+\b/.test(String(v))) return fromJson(jd, where);
        return { value: String(v), status: st, note: spec.note || `${st} expression`, ...(spec.refs ? { refs: spec.refs } : {}) };
      }
      if ('ref' in spec || 'analog' in spec) return fromJson(jd, where);
    }
    throw new Error(`${where}: unsupported dimension spec ${JSON.stringify(spec)}`);
  };
}

export function transcribe(id, { templatePath = null } = {}) {
  const path = templatePath ?? join(CONFIG, `${id}.yaml`);
  const tpl = expandModules(path, loadYaml(path));
  const data = JSON.parse(readFileSync(join(REPO, 'app/static/data/package3d.json'), 'utf8'));
  const fam = data.families.find((f) => f.id === id);
  if (!fam) throw new Error(`${id} not in package3d.json`);
  const conv = makeConverter(fam, id);
  const parts = (tpl.parts || []).map((p) => {
    const jp = famJsonPart(fam, p.id);
    const jd = (k) => jp?.dims?.[k];
    const o = { id: p.id, name: p.name, kind: p.kind, material: p.material };
    for (const k of ['material_label', 'note']) if (p[k]) o[k] = p[k];
    for (const [src, dst] of [['w_mm', 'w'], ['d_mm', 'd'], ['h_um', 'h'], ['x_mm', 'x'], ['y_mm', 'y'], ['gap_um', 'gap'], ['depth_um', 'depth'], ['frame_w_mm', 'frame_w']]) {
      if (p[src] !== undefined) o[dst] = conv(p[src], jd(src), `parts.${p.id}.${src}`);
    }
    for (const k of ['base', 'on', 'in', 'under', 'standoff', 'shape', 'clip']) if (p[k] !== undefined) o[k] = p[k];
    if (p.fill) {
      o.fill = { margin: conv(p.fill.margin_mm, jd('margin_mm'), `parts.${p.id}.fill.margin_mm`) };
      for (const k of ['above', 'parts', 'per']) if (p.fill[k] !== undefined) o.fill[k] = p.fill[k];
    }
    if (p.repeat) {
      const r = p.repeat;
      o.repeat = {};
      for (const [src, dst, dk] of [['nx', 'nx', 'repeat_nx'], ['ny', 'ny', 'repeat_ny'], ['nz', 'nz', 'repeat_nz'], ['pitch_x_mm', 'px', 'repeat_pitch_x_mm'],
        ['pitch_y_mm', 'py', 'repeat_pitch_y_mm'], ['pitch_um', 'pitch_z', 'repeat_pitch_um']]) {
        if (r[src] !== undefined) o.repeat[dst] = conv(r[src], jd(dk), `parts.${p.id}.repeat.${src}`);
      }
      if (r.stack) o.repeat.stack = true;
    }
    return o;
  });
  const layers = (tpl.layers || []).map((g) => {
    const o = { part: g.part, pattern: [] };
    if (g.id) o.id = g.id;
    if (g.repeat !== undefined) o.repeat = conv(g.repeat, famJson1(fam, g.pattern[0].id)?.dims?.repeat_n, `layers.${g.pattern[0].id}.repeat`);
    for (const el of g.pattern || []) {
      const jl = famJson1(fam, el.id);
      const e = { id: el.id, name: el.name, material: el.material, role: el.role, h: conv(el.h_um, jl?.dims?.h_um, `layers.${el.id}.h_um`) };
      if (el.route) {
        const rt = el.route;
        e.route = { use: rt.use, matrix: rt.matrix };
        if (rt.dir) e.route.dir = rt.dir;
        if (rt.line_um !== undefined) e.route.line = conv(rt.line_um, jl?.route?.dims?.line_um, `layers.${el.id}.route.line_um`);
        if (rt.space_um !== undefined) e.route.space = conv(rt.space_um, jl?.route?.dims?.space_um, `layers.${el.id}.route.space_um`);
        if (rt.fill !== undefined) e.route.fill = conv(rt.fill, jl?.route?.dims?.fill, `layers.${el.id}.route.fill`);
      }
      o.pattern.push(e);
    }
    return o;
  });
  const arrays = (tpl.arrays || []).map((a) => {
    const ja = fam.arrays.find((x) => x.template_id === a.id);
    const jd = (k) => ja?.dims?.[k];
    const o = { id: a.id, name: a.name, kind: a.kind };
    for (const k of ['per', 'lower', 'upper', 'in', 'under', 'span', 'host', 'between', 'note']) if (a[k] !== undefined) o[k] = a[k];
    if (a.in_layer) o.inLayer = a.in_layer;
    for (const [src, dst] of [['pitch_um', 'pitch'], ['diameter_um', 'diameter'], ['height_um', 'height']]) if (a[src] !== undefined) o[dst] = conv(a[src], jd(src), `arrays.${a.id}.${src}`);
    if (a.region) {
      const r = a.region;
      if ('x_mm' in r) {
        const jr = ja?.region;
        const c = (k, s) => (typeof s === 'string' ? s : { value: jr[k], status: 'template', note: 'explicit array region of the template (view placement, resolved package3d.json value)' });
        o.region = { xywd: { x: c('x_mm', r.x_mm), y: c('y_mm', r.y_mm), w: c('w_mm', r.w_mm), d: c('d_mm', r.d_mm) } };
      } else {
        o.region = {};
        for (const k of ['part', 'intersect', 'subtract']) if (r[k] !== undefined) o.region[k] = r[k];
      }
    }
    if (a.repeat) {
      o.repeat = { nz: conv(a.repeat.nz, jd('repeat_nz'), `arrays.${a.id}.repeat.nz`) };
      if (a.repeat.pitch_um !== undefined) o.repeat.pitch_z = conv(a.repeat.pitch_um, jd('repeat_pitch_um'), `arrays.${a.id}.repeat.pitch_um`);
    }
    return o;
  });
  return { family: id, source_template: `config/package3d/${id}.yaml`, package3d_generated: data.generated, transcriber: 'ap-sim-transcribe/0', parts, layers, arrays };
}

const famJsonPart = (fam, tid) => fam.parts.find((p) => p.template_id === tid);
const famJson1 = (fam, lid) => fam.layers.find((l) => l.template_id === lid);

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const jsonT = statSync(join(REPO, 'app/static/data/package3d.json')).mtimeMs;
  for (const id of args.filter((a) => !a.startsWith('--'))) {
    // the generator's defaults come from package3d.json: a template edited after the last JSON build would give a
    // spec that references params the JSON does not have yet, so it is skipped until the JSON is rebuilt
    if (!force && statSync(join(CONFIG, `${id}.yaml`)).mtimeMs > jsonT) {
      console.log(`${id}: template newer than app/static/data/package3d.json; skipped (rebuild the JSON first, or --force)`);
      continue;
    }
    const spec = transcribe(id);
    const body = `// Generated by engine/src/families/tools/transcribe.mjs from ${spec.source_template} (package3d.json ${spec.package3d_generated}).\n`
      + '// Do not edit by hand: re-run the transcriber when the template changes. License: GPL-3.0-or-later.\n'
      + `export default ${JSON.stringify(spec, null, 1)};\n`;
    writeFileSync(join(OUT, `${id}.mjs`), body);
    console.log(`${id}: ${spec.parts.length} parts, ${spec.layers.length} layer groups, ${spec.arrays.length} arrays -> specs/${id}.mjs`);
  }
}
