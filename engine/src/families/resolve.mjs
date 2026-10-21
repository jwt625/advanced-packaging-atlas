// License: GPL-3.0-or-later.
// Structure resolver: declarative family specs (transcribed from config/package3d templates) -> box parts, layers,
// arrays with per-dimension provenance. Placement semantics, instance ids, ordering and 4-decimal output rounding
// follow scripts/build_package3d.py (Builder.footprint / zpos / build / place / build_array / array_region).
// Extensions for the sim (documented in DevLog/lanes/L3-families.md): zero-count repeats drop the part; explicit
// instance centers; frames with separate x / y widths; x, y, z provenance per part; explicit priorities;
// per-instance arrays whose region intersection is empty are skipped instead of raising.

import { evalExpr, identifiers } from './expr.mjs';
import { combineStatus, dominant, GeneratorError, rnd } from './params.mjs';

const EPS = 1e-9;
export const rectOf = (x, y, w, d) => [x - w / 2, y - d / 2, x + w / 2, y + d / 2];
export const xywd = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, r[2] - r[0], r[3] - r[1]];
export function intersect(a, b) {
  const r = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[2] - r[0] > EPS && r[3] - r[1] > EPS ? r : null;
}
export function subtract(a, b) {
  const i = intersect(a, b);
  if (!i) return [a];
  const out = [[a[0], a[1], i[0], a[3]], [i[2], a[1], a[2], a[3]], [i[0], a[1], i[2], i[1]], [i[0], i[3], i[2], a[3]]];
  return out.filter((r) => r[2] - r[0] > EPS && r[3] - r[1] > EPS);
}
export const inside = (a, b, tol = 1e-6) => a[0] >= b[0] - tol && a[1] >= b[1] - tol && a[2] <= b[2] + tol && a[3] <= b[3] + tol;
const grow = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];

/** Dimension resolver bound to resolved params. */
export function makeDims(P) {
  const { values, entries } = P;
  function dim(spec, where) {
    if (spec === undefined || spec === null) throw new GeneratorError(`${where}: missing dimension`);
    if (typeof spec === 'number') throw new GeneratorError(`${where}: bare number ${spec} (use a param or {value, status, note})`);
    if (typeof spec === 'object') {
      if (!('value' in spec) || !spec.status || !(spec.note || spec.ref || spec.refs)) {
        throw new GeneratorError(`${where}: dimension object needs value, status and note/ref`);
      }
      if (typeof spec.value === 'string') {
        const d = dim(spec.value, where);
        return { value: d.value, dim: { ...d.dim, status: combineStatus(spec.status, [d.dim.status]), note: spec.note } };
      }
      const e = { status: spec.status, value: rnd(spec.value) };
      for (const k of ['ref', 'refs', 'note', 'source']) if (spec[k] !== undefined) e[k] = spec[k];
      return { value: spec.value, dim: e };
    }
    if (spec in values) {
      const e = entries[spec];
      const out = { status: e.status, value: e.value };
      for (const k of ['ref', 'refs', 'note', 'source', 'formula']) if (e[k] !== undefined) out[k] = e[k];
      out.inputs = [spec];
      return { value: values[spec], dim: out };
    }
    const ids = identifiers(spec);
    for (const id of ids) if (!(id in values)) throw new GeneratorError(`${where}: unknown parameter ${id} in ${spec}`);
    const value = evalExpr(spec, (id) => values[id]);
    const refs = [...new Set(ids.flatMap((id) => [entries[id].ref, ...(entries[id].refs || [])].filter(Boolean)))];
    const out = { status: combineStatus('derived', ids.map((id) => entries[id].status)), value: rnd(value), formula: spec, inputs: ids };
    if (refs.length) out.refs = refs;
    return { value, dim: out };
  }
  return dim;
}

const derivedDim = (value, statuses, formula, inputs = [], note) => {
  const d = { status: combineStatus('derived', statuses), value: rnd(value), formula };
  if (inputs.length) d.inputs = inputs;
  if (note) d.note = note;
  return d;
};


/**
 * @param {object} spec {parts, layers, arrays} declarative lists (see family modules)
 * @param {object} P resolved params {values, entries}
 */
export function resolveStructure(spec, P) {
  const dim = makeDims(P);
  const warnings = [];
  const pdecl = new Map();
  for (const p of spec.parts) {
    if (pdecl.has(p.id)) throw new GeneratorError(`duplicate part id ${p.id}`);
    pdecl.set(p.id, p);
  }
  const insts = new Map(); // tid -> [{id, tid, name, rect, zk, xk}]
  const byid = new Map();
  const pdims = new Map();
  const xyDims = new Map(); // tid -> {x_mm, y_mm}
  const nzOf = new Map();
  const register = (tid, list, dims) => {
    insts.set(tid, list);
    pdims.set(tid, dims);
    nzOf.set(tid, list.length ? Math.max(...list.map((i) => i.zk)) + 1 : 1);
    for (const i of list) byid.set(i.id, i);
    return list;
  };
  const levels = (tid) => {
    const l = footprint(tid);
    return Array.from({ length: nzOf.get(tid) }, (_, lv) => l.filter((i) => i.zk === lv));
  };
  const topLevel = (tid) => levels(tid).at(-1);
  const levelInst = (tid, zk, xk) => insts.get(tid).find((i) => i.zk === zk && i.xk === xk);
  const base0 = (tid) => (insts.get(tid) || []).filter((i) => i.zk === 0); // one footprint per xy position
  function below(tid, inst) {
    if (inst.zk > 0) return levelInst(tid, inst.zk - 1, inst.xk);
    const host = pdecl.get(tid).on;
    if (!host) return null;
    const cands = topLevel(host);
    const [cx, cy] = xywd(inst.rect);
    return cands.find((c) => inside([cx, cy, cx, cy], c.rect)) || (cands.length === 1 ? cands[0] : null);
  }

  function footprint(tid) {
    if (insts.has(tid)) return insts.get(tid);
    const p = pdecl.get(tid);
    if (!p) throw new GeneratorError(`unknown part ${tid}`);
    const where = `parts.${tid}`;
    const dims = {};
    if (p.fill) {
      const fl = p.fill;
      const m = dim(fl.margin, `${where}.fill.margin`);
      dims.margin_mm = m.dim;
      if (fl.per) {
        const bases = footprint(fl.per);
        const st = [m.dim.status, pdims.get(fl.per).w_mm?.status, pdims.get(fl.per).d_mm?.status];
        const out = bases.map((bi, k) => {
          let bb = grow(bi.rect, m.value);
          const low = below(fl.per, bi);
          if (low && p.clip !== false) bb = intersect(bb, low.rect) || bb;
          const one = bases.length === 1;
          return { id: one ? tid : `${tid}_${k + 1}`, tid, name: one ? p.name : `${p.name} ${k + 1}`, rect: bb, zk: bi.zk, xk: bi.xk };
        });
        dims.w_mm = derivedDim(out[0] ? xywd(out[0].rect)[2] : 0, st, `instance of ${fl.per} + margin, clipped to the solid below`, [fl.margin]);
        dims.d_mm = derivedDim(out[0] ? xywd(out[0].rect)[3] : 0, st, `instance of ${fl.per} + margin, clipped to the solid below`, [fl.margin]);
        xyDims.set(tid, { x_mm: { ...xyDims.get(fl.per).x_mm }, y_mm: { ...xyDims.get(fl.per).y_mm } });
        return register(tid, out, dims);
      }
      const members = fl.parts.filter((t) => footprint(t).length);
      if (!members.length) { xyDims.set(tid, { x_mm: {}, y_mm: {} }); return register(tid, [], dims); }
      const rects = members.flatMap((t) => footprint(t).map((i) => i.rect));
      let bb = [Math.min(...rects.map((r) => r[0])) - m.value, Math.min(...rects.map((r) => r[1])) - m.value,
        Math.max(...rects.map((r) => r[2])) + m.value, Math.max(...rects.map((r) => r[3])) + m.value];
      const above = topLevel(fl.above);
      if (above.length === 1 && p.clip !== false) bb = intersect(bb, above[0].rect) || bb;
      const st = [m.dim.status, ...members.flatMap((t) => ['w_mm', 'd_mm'].map((k) => pdims.get(t)[k]?.status)),
        ...members.flatMap((t) => [xyDims.get(t).x_mm.status, xyDims.get(t).y_mm.status])];
      const [x, y, w, d] = xywd(bb);
      const formula = `bbox(${members.join(', ')}) + margin, clipped to ${fl.above}`;
      dims.w_mm = derivedDim(w, st, formula, [fl.margin]);
      dims.d_mm = derivedDim(d, st, formula, [fl.margin]);
      xyDims.set(tid, { x_mm: derivedDim(x, st, formula), y_mm: derivedDim(y, st, formula) });
      return register(tid, [{ id: tid, tid, name: p.name, rect: bb, zk: 0, xk: 0 }], dims);
    }
    for (const k of ['w', 'd', 'h']) dims[{ w: 'w_mm', d: 'd_mm', h: 'h_um' }[k]] = dim(p[k], `${where}.${k}`).dim;
    const w = dim(p.w, where).value;
    const d = dim(p.d, where).value;
    const x0r = p.x !== undefined ? dim(p.x, `${where}.x`) : null;
    const y0r = p.y !== undefined ? dim(p.y, `${where}.y`) : null;
    const x0 = x0r ? x0r.value : 0;
    const y0 = y0r ? y0r.value : 0;
    for (const [k, key] of [['gap', 'gap_um'], ['depth', 'depth_um']]) if (p[k] !== undefined) dims[key] = dim(p[k], `${where}.${k}`).dim;
    const center = { status: 'template', note: 'centered on the package (layout convention; position not reported)' };
    let centers = [[x0, y0]];
    let nz = 1;
    let xDim = x0r ? x0r.dim : center;
    let yDim = y0r ? y0r.dim : center;
    if (p.centers) {
      centers = p.centers.list;
      xDim = p.centers.x_mm;
      yDim = p.centers.y_mm;
    } else if (p.repeat) {
      const rp = p.repeat;
      const val = (k) => (rp[k] !== undefined ? dim(rp[k], `${where}.repeat.${k}`) : null);
      const nx = val('nx');
      const ny = val('ny');
      const nzr = val('nz');
      const px = val('px');
      const py = val('py');
      const nxv = nx ? nx.value : 1;
      const nyv = ny ? ny.value : 1;
      nz = nzr ? nzr.value : 1;
      if (![nxv, nyv, nz].every((n) => Number.isInteger(n) && n >= 0)) {
        throw new GeneratorError(`${where}: repeat counts must be non-negative integers (nx=${nxv}, ny=${nyv}, nz=${nz})`,
          [{ code: 'non_integer_count', part: tid, nx: nxv, ny: nyv, nz }]);
      }
      if (nzr && (rp.pitch_z !== undefined) === !!rp.stack) throw new GeneratorError(`${where}: vertical repeat needs exactly one of pitch_z or stack`);
      if (nx) dims.repeat_nx = nx.dim;
      if (ny) dims.repeat_ny = ny.dim;
      if (nzr) dims.repeat_nz = nzr.dim;
      if (rp.pitch_z !== undefined) dims.repeat_pitch_um = dim(rp.pitch_z, `${where}.repeat.pitch_z`).dim;
      if (px) dims.repeat_pitch_x_mm = px.dim;
      if (py) dims.repeat_pitch_y_mm = py.dim;
      const pxv = px ? px.value : 0;
      const pyv = py ? py.value : 0;
      centers = [];
      for (let j = 0; j < nyv; j++) for (let i = 0; i < nxv; i++) centers.push([x0 + (i - (nxv - 1) / 2) * pxv, y0 + ((nyv - 1) / 2 - j) * pyv]);
      if (nxv > 1 && px) xDim = derivedDim(0, [px.dim.status, nx.dim.status, xDim.status], 'x0 + (i - (nx - 1) / 2) * pitch_x', px.dim.inputs || []);
      if (nyv > 1 && py) yDim = derivedDim(0, [py.dim.status, ny.dim.status, yDim.status], 'y0 + ((ny - 1) / 2 - j) * pitch_y', py.dim.inputs || []);
    }
    const out = [];
    if (p.shape === 'frame') {
      if (nz > 1) throw new GeneratorError(`${where}: a frame cannot repeat vertically`);
      const fwx = dim(p.frame_wx ?? p.frame_w, `${where}.frame_w`);
      const fwy = dim(p.frame_wy ?? p.frame_w, `${where}.frame_w`);
      dims.frame_w_mm = fwx.dim;
      if (p.frame_wy !== undefined) dims.frame_wy_mm = fwy.dim;
      const a = fwx.value;
      const b = fwy.value;
      if (2 * a >= w || 2 * b >= d) throw new GeneratorError(`${where}: frame width too large for ${w} x ${d}`, [{ code: 'frame_too_wide', part: tid }]);
      const sides = { n: [x0, y0 + d / 2 - b / 2, w, b], s: [x0, y0 - d / 2 + b / 2, w, b],
        e: [x0 + w / 2 - a / 2, y0, a, d - 2 * b], w: [x0 - w / 2 + a / 2, y0, a, d - 2 * b] };
      const st = [dims.w_mm.status, dims.d_mm.status, fwx.dim.status, fwy.dim.status, xDim.status, yDim.status];
      for (const [s, [x, y, ww, dd]] of Object.entries(sides)) {
        out.push({ id: `${tid}_${s}`, tid, name: `${p.name} (${s.toUpperCase()})`, rect: rectOf(x, y, ww, dd), zk: 0, xk: 0,
          frameDims: { x_mm: derivedDim(x, st, 'frame side center'), y_mm: derivedDim(y, st, 'frame side center'),
            w_mm: s === 'n' || s === 's' ? dims.w_mm : derivedDim(ww, st, 'frame side: w_mm = frame width'),
            d_mm: s === 'e' || s === 'w' ? derivedDim(dd, st, 'frame side: d_mm = outline d - 2 frame width') : derivedDim(dd, st, 'frame side: d_mm = frame width') } });
      }
    } else {
      const n = centers.length * nz;
      let k = 0;
      for (let zk = 0; zk < nz; zk++) {
        centers.forEach(([x, y], xk) => {
          k++;
          out.push({ id: n === 1 ? tid : `${tid}_${k}`, tid, name: n === 1 ? p.name : `${p.name} ${k}`, rect: rectOf(x, y, w, d), zk, xk });
        });
      }
    }
    xyDims.set(tid, { x_mm: xDim, y_mm: yDim });
    return register(tid, out, dims);
  }

  // arrays: dims pass
  const adecl = new Map();
  const adims = new Map();
  const arep = new Map();
  for (const a of spec.arrays || []) {
    if (adecl.has(a.id)) throw new GeneratorError(`duplicate array id ${a.id}`);
    adecl.set(a.id, a);
    const dd = {};
    for (const [k, key] of [['pitch', 'pitch_um'], ['diameter', 'diameter_um'], ['height', 'height_um'], ['wall', 'wall_um']]) {
      if (a[k] !== undefined) dd[key] = dim(a[k], `arrays.${a.id}.${k}`).dim;
    }
    if (a.repeat) {
      const n = dim(a.repeat.nz, `arrays.${a.id}.repeat.nz`);
      dd.repeat_nz = n.dim;
      if (!Number.isInteger(n.value) || n.value < 1) throw new GeneratorError(`arrays.${a.id}: repeat nz must be a positive integer`);
      let zp = null;
      if (a.repeat.pitch_z !== undefined) { const r = dim(a.repeat.pitch_z, `arrays.${a.id}.repeat.pitch_z`); dd.repeat_pitch_um = r.dim; zp = r.value; }
      arep.set(a.id, [n.value, zp]);
    }
    adims.set(a.id, dd);
  }
  const aval = (aid, key) => {
    const a = adecl.get(aid);
    const k = { pitch_um: 'pitch', diameter_um: 'diameter', height_um: 'height', wall_um: 'wall' }[key];
    return dim(a[k], `arrays.${aid}.${k}`).value;
  };

  for (const tid of pdecl.keys()) footprint(tid);

  // z pass
  const z = new Map();
  const h = new Map();
  const zp = new Map();
  const zSt = new Map();
  const gapVal = (tid) => {
    const p = pdecl.get(tid);
    if (p.standoff) {
      const dd = adims.get(p.standoff);
      if (!dd || !dd.height_um) throw new GeneratorError(`parts.${tid}: standoff array ${p.standoff} has no height`);
      return { value: aval(p.standoff, 'height_um'), dim: dd.height_um };
    }
    if (p.gap !== undefined) return dim(p.gap, `parts.${tid}.gap`);
    return null;
  };
  const stack = [];
  function zpos(tid) {
    if (z.has(tid)) return z.get(tid);
    if (stack.includes(tid)) throw new GeneratorError(`circular stacking at ${tid}`);
    stack.push(tid);
    const p = pdecl.get(tid);
    const dims = pdims.get(tid);
    let zz;
    if (p.fill && p.fill.per) {
      const per = p.fill.per;
      const zper = zpos(per);
      const g = gapVal(per);
      if (!g || g.value <= 0) throw new GeneratorError(`parts.${tid}: fill.per needs a part with a standoff array or gap`);
      if (nzOf.get(per) > 1 && Math.abs(zp.get(per) - h.get(per) - g.value) > 1e-6) throw new GeneratorError(`parts.${tid}: the gaps of the stacked part ${per} are not uniform`);
      h.set(tid, g.value);
      dims.h_um = g.dim;
      zp.set(tid, zp.get(per) || 0);
      zz = zper - g.value;
      zSt.set(tid, combineStatus('derived', [zSt.get(per), g.dim.status]));
    } else if (p.fill) {
      const members = p.fill.parts.filter((t) => insts.get(t).length);
      const z0 = top(p.fill.above);
      const z1 = members.length ? Math.min(...members.map((t) => zpos(t))) : z0;
      if (members.length && z1 - z0 <= 0) throw new GeneratorError(`parts.${tid}: nothing to fill (gap ${z1 - z0} um)`);
      h.set(tid, z1 - z0);
      const g = members.length ? gapVal(members[0]) : null;
      dims.h_um = g ? g.dim : { status: 'derived', value: rnd(z1 - z0), note: 'gap below parts' };
      zz = z0;
      zSt.set(tid, combineStatus('derived', [zSt.get(p.fill.above), pdims.get(p.fill.above).h_um?.status]));
    } else {
      const hh = dim(p.h, `parts.${tid}.h`).value;
      h.set(tid, hh);
      if (p.base) {
        zz = 0;
        zSt.set(tid, 'derived');
      } else if (p.on) {
        const g = gapVal(tid);
        zz = top(p.on) + (g ? g.value : 0);
        zSt.set(tid, combineStatus('derived', [zSt.get(p.on), pdims.get(p.on).h_um.status, g?.dim.status]));
      } else if (p.in) {
        if (nzOf.get(p.in) > 1) throw new GeneratorError(`parts.${tid}: in: a vertically repeated host is not supported`);
        const depth = p.depth !== undefined ? dim(p.depth, `parts.${tid}.depth`).value : 0;
        zz = top(p.in) - depth - hh;
        if (zz < zpos(p.in) - 1e-6) warnings.push({ code: 'below_host', level: 'warn', message: `part ${tid}: extends below its host ${p.in}` });
        zSt.set(tid, combineStatus('derived', [zSt.get(p.in), pdims.get(p.in).h_um.status, dims.h_um.status, dims.depth_um?.status]));
      } else if (p.under) {
        const g = gapVal(tid);
        zz = zpos(p.under) - (g ? g.value : 0) - hh;
        zSt.set(tid, combineStatus('derived', [zSt.get(p.under), g?.dim.status, dims.h_um.status]));
      } else {
        throw new GeneratorError(`parts.${tid}: needs base/on/in/under/fill`);
      }
      if (nzOf.get(tid) > 1) {
        let pitch;
        if (p.repeat.stack) { const g = gapVal(tid); pitch = hh + (g ? g.value : 0); } else pitch = dim(p.repeat.pitch_z, `parts.${tid}.repeat.pitch_z`).value;
        if (pitch <= 0) throw new GeneratorError(`parts.${tid}: vertical pitch must be > 0`);
        if (pitch < hh - 1e-6) warnings.push({ code: 'levels_overlap', level: 'warn', message: `part ${tid}: vertical pitch < height` });
        zp.set(tid, pitch);
      }
    }
    z.set(tid, zz);
    stack.pop();
    return zz;
  }
  function top(tid) { return zpos(tid) + (zp.get(tid) || 0) * (nzOf.get(tid) - 1) + h.get(tid); }
  const iz = (inst) => zpos(inst.tid) + inst.zk * (zp.get(inst.tid) || 0);
  const itop = (inst) => iz(inst) + h.get(inst.tid);
  const labelTop = (tid) => (nzOf.get(tid) > 1 ? (topLevel(tid).length === 1 ? topLevel(tid)[0].id : tid) : tid);
  const labelBottom = (tid) => (nzOf.get(tid) > 1 ? (levels(tid)[0].length === 1 ? levels(tid)[0][0].id : tid) : tid);
  function anchor(s) {
    const [side, name] = String(s).split(':');
    if (pdecl.has(name)) return side === 'top' ? top(name) : zpos(name);
    if (byid.has(name)) return side === 'top' ? itop(byid.get(name)) : iz(byid.get(name));
    throw new GeneratorError(`bad anchor ${s}`);
  }
  for (const tid of pdecl.keys()) zpos(tid);

  // layers: stacked downward from the host top (one set per vertical level of a stacked host)
  const layersOut = [];
  const cursor = new Map();
  const seq = new Map();
  const lz = new Map(); // layer id or group id -> [[z0, z1, host, lv], ...]
  for (const [gi, g] of (spec.layers || []).entries()) {
    const host = g.part;
    if (!pdecl.has(host)) throw new GeneratorError(`layers[${gi}]: unknown part ${host}`);
    if (!insts.get(host).length) continue;
    let n = 1;
    let repDim = null;
    if (g.repeat !== undefined) {
      const r = dim(g.repeat, `layers[${gi}].repeat`);
      n = r.value;
      repDim = r.dim;
      if (!Number.isInteger(n) || n < 0) throw new GeneratorError(`layers[${gi}] on ${host}: repeat ${n} is not a non-negative integer`, [{ code: 'non_integer_count', layer_group: gi }]);
    }
    const lvls = levels(host);
    lvls.forEach((linsts, lv) => {
      const key = `${host}|${lv}`;
      let ztop = cursor.has(key) ? cursor.get(key) : itop(linsts[0]);
      for (let k = 1; k <= n; k++) {
        for (const el of g.pattern) {
          const hd = dim(el.h, `layers.${el.id}.h`);
          ztop -= hd.value;
          seq.set(key, (seq.get(key) || 0) + 1);
          let id = n === 1 ? el.id : `${el.id}_${k}`;
          if (lvls.length > 1) id += linsts.length === 1 ? `_${linsts[0].id}` : `_z${lv + 1}`;
          const lo = { id, part: insts.get(host).length === 1 ? host : linsts[0].id, seq: seq.get(key), name: el.name + (n === 1 ? '' : ` ${k}`),
            material: el.material, role: el.role, z_um: rnd(ztop), h_um: rnd(hd.value), template_id: el.id };
          if (linsts.length > 1) lo.instances = linsts.map((i) => i.id);
          if (el.material_sim) { lo.material_sim = P.values[el.material_sim]; lo.material_sim_param = el.material_sim; }
          const dims = { h_um: hd.dim };
          if (repDim) dims.repeat_n = repDim;
          if (el.route) {
            const rt = el.route;
            const ro = { use: rt.use, matrix: rt.matrix };
            if (rt.matrix_sim) ro.matrix_sim = P.values[rt.matrix_sim];
            if (rt.dir) ro.dir = rt.dir === 'alt' ? (k % 2 ? 'x' : 'y') : rt.dir;
            const rd = {};
            for (const kk of ['line', 'space']) if (rt[kk] !== undefined) { const r = dim(rt[kk], `layers.${el.id}.route.${kk}`); ro[`${kk}_um`] = r.value; rd[`${kk}_um`] = r.dim; }
            if (rt.fill !== undefined) {
              const f = dim(rt.fill, `layers.${el.id}.route.fill`);
              ro.fill = f.value;
              rd.fill = f.dim;
            } else if (rt.use === 'signal' || rt.use === 'mixed') {
              ro.fill = ro.line_um / (ro.line_um + ro.space_um);
              rd.fill = { status: combineStatus('derived', [rd.line_um.status, rd.space_um.status]), value: rnd(ro.fill), formula: 'line_um / (line_um + space_um)' };
            } else {
              ro.fill = rt.use === 'plane' ? 0.85 : 0.5;
              rd.fill = { status: 'template', value: ro.fill, note: `default Cu area fraction of a ${rt.use} level (generator default, not reported)` };
            }
            if (!(ro.fill > 0 && ro.fill <= 1)) throw new GeneratorError(`layers.${id}: route fill ${ro.fill} not in (0, 1]`, [{ code: 'bad_fill', layer: id }]);
            ro.dims = rd;
            lo.route = ro;
          }
          lo.dims = dims;
          lo._hostInsts = linsts;
          layersOut.push(lo);
          for (const name of [el.id, g.id]) {
            if (!name) continue;
            if (!lz.has(name)) lz.set(name, []);
            lz.get(name).push([ztop, ztop + hd.value, host, lv]);
          }
        }
      }
      cursor.set(key, ztop);
    });
  }
  for (const [key, zb] of cursor) {
    const [host, lv] = key.split('|');
    if (lv !== '0') continue;
    const used = itop(levels(host)[0][0]) - zb;
    if (used > h.get(host) + 1e-6) warnings.push({ code: 'layers_overfill', level: 'warn', message: `layers in ${host} total ${rnd(used)} um > part height ${rnd(h.get(host))} um` });
    else if (Math.abs(used - h.get(host)) > 1e-6) warnings.push({ code: 'layers_partial', level: 'info', message: `layers in ${host} total ${rnd(used)} um of ${rnd(h.get(host))} um (rest unlayered, host material)` });
  }

  // arrays
  const arraysOut = [];
  const lzSpan = (name) => {
    const ent = lz.get(name);
    return [Math.min(...ent.map((e) => e[0])), Math.max(...ent.map((e) => e[1])), ent[0][2]];
  };
  for (const [aid, a] of adecl) {
    const dims = adims.get(aid);
    const where = `arrays.${aid}`;
    const places = [];
    if (a.per) {
      for (const base of insts.get(a.per)) {
        let z0;
        let low;
        if (base.zk > 0) { const prev = levelInst(a.per, base.zk - 1, base.xk); z0 = itop(prev); low = prev.id; } else { z0 = top(a.lower); low = labelTop(a.lower); }
        places.push({ suffix: `_${base.id}`, z0, z1: iz(base), between: [base.id, low], mount: 'between', src: [base] });
      }
    } else if (a.in && insts.get(a.in) && nzOf.get(a.in) > 1) {
      levels(a.in).forEach((linsts, lv) => {
        const one = linsts.length === 1;
        const z0 = iz(linsts[0]);
        places.push({ suffix: one ? `_${linsts[0].id}` : `_z${lv + 1}`, z0, z1: z0 + h.get(a.in), between: one ? [linsts[0].id, linsts[0].id] : [a.in, a.in], mount: 'in', src: linsts, levelSrc: true, host: a.in });
      });
    } else if (a.in) {
      if (!insts.get(a.in).length) continue;
      places.push({ suffix: '', z0: zpos(a.in), z1: top(a.in), between: [a.in, a.in], mount: 'in', src: null, host: a.in, levelSrc: true });
    } else if (a.inLayer) {
      const ent = lz.get(a.inLayer);
      if (!ent) { if (a.optional) continue; throw new GeneratorError(`${where}: in_layer ${a.inLayer} is not a layer or group id`); }
      const host = ent[0][2];
      const lvs = [...new Set(ent.map((e) => e[3]))];
      if (lvs.length > 1) {
        levels(host).forEach((linsts, lv) => {
          const zs = ent.filter((e) => e[3] === lv);
          const one = linsts.length === 1;
          places.push({ suffix: one ? `_${linsts[0].id}` : `_z${lv + 1}`, z0: Math.min(...zs.map((e) => e[0])), z1: Math.max(...zs.map((e) => e[1])),
            between: one ? [linsts[0].id, linsts[0].id] : [host, host], mount: 'in', src: linsts, levelSrc: true, host, layer: a.inLayer });
        });
      } else {
        const [z0, z1] = lzSpan(a.inLayer);
        places.push({ suffix: '', z0, z1, between: [host, host], mount: 'in', src: insts.get(host), levelSrc: true, host, layer: a.inLayer });
      }
    } else if (a.under) {
      const hh = aval(aid, 'height_um');
      const z1 = zpos(a.under);
      places.push({ suffix: '', z0: z1 - hh, z1, between: [labelBottom(a.under), labelBottom(a.under)], mount: 'under', src: null, host: a.under });
    } else if (a.span) {
      const host = a.host || a.span[1].split(':')[1];
      places.push({ suffix: '', z0: anchor(a.span[0]), z1: anchor(a.span[1]), between: [host, host], mount: 'span', src: null, host: null });
    } else {
      if (!insts.get(a.upper).length) continue;
      places.push({ suffix: '', z0: top(a.lower), z1: zpos(a.upper), between: [labelBottom(a.upper), labelTop(a.lower)], mount: 'between', src: null });
    }
    const pitch = aval(aid, 'pitch_um');
    if (a.diameter !== undefined && aval(aid, 'diameter_um') >= pitch) {
      throw new GeneratorError(`${where}: diameter ${rnd(aval(aid, 'diameter_um'))} um >= pitch ${rnd(pitch)} um`, [{ code: 'diameter_ge_pitch', array: aid }]);
    }
    for (const pl of places) {
      if (pl.z1 - pl.z0 <= 0) throw new GeneratorError(`${where}: empty z span (${pl.z0}..${pl.z1} um)`);
      if (pl.mount === 'between' && a.height !== undefined && Math.abs(pl.z1 - pl.z0 - aval(aid, 'height_um')) > 1e-6) {
        warnings.push({ code: 'joint_gap', level: 'warn', message: `array ${aid}${pl.suffix}: gap ${rnd(pl.z1 - pl.z0)} um != joint height ${rnd(aval(aid, 'height_um'))} um` });
      }
      let rects;
      const reg = a.region || {};
      if (reg.box) {
        rects = [reg.box];
      } else if (reg.xywd) {
        const v = (k) => dim(reg.xywd[k], `${where}.region.${k}`);
        const [rx, ry, rw, rd] = ['x', 'y', 'w', 'd'].map(v);
        dims.region_x_mm = rx.dim; dims.region_y_mm = ry.dim; dims.region_w_mm = rw.dim; dims.region_d_mm = rd.dim;
        rects = [rectOf(rx.value, ry.value, rw.value, rd.value)];
        for (const t of reg.subtract || []) for (const i of base0(t)) rects = rects.flatMap((r) => subtract(r, i.rect));
      } else {
        let srcs;
        if (reg.part) srcs = pl.levelSrc && pl.src && reg.part === pl.src[0].tid ? pl.src : insts.get(reg.part);
        else if (pl.src) srcs = pl.src;
        else srcs = insts.get(a.in || a.under || a.upper || pl.between[0]);
        if (srcs.length > 1 && new Set(srcs.map((i) => i.zk)).size > 1) srcs = srcs.filter((i) => i.zk === 0);
        rects = srcs.map((i) => i.rect);
        for (const t of reg.intersect || []) {
          const nxt = [];
          for (const r of rects) for (const i of base0(t)) { const x = intersect(r, i.rect); if (x) nxt.push(x); }
          rects = nxt;
        }
        if (reg.intersectAny) {
          const nxt = [];
          for (const r of rects) for (const t of reg.intersectAny) for (const i of base0(t)) { const x = intersect(r, i.rect); if (x) nxt.push(x); }
          rects = nxt;
        }
        for (const t of reg.subtract || []) for (const i of base0(t)) rects = rects.flatMap((r) => subtract(r, i.rect));
      }
      if (reg.size) {
        const rw = dim(reg.size.w, `${where}.region.w`);
        const rd = dim(reg.size.d, `${where}.region.d`);
        dims.region_w_mm = rw.dim;
        dims.region_d_mm = rd.dim;
        rects = rects.map((r) => { const [cx, cy] = xywd(r); return rectOf(cx, cy, rw.value, rd.value); });
      }
      if (!rects.length) {
        if (a.per || (reg.part && !(insts.get(reg.part) || []).length)) continue; // zero-count source part: no array
        throw new GeneratorError(`${where}: empty region`);
      }
      const rep = arep.get(aid);
      const reps = rep && rep[0] > 1 ? Array.from({ length: rep[0] }, (_, k) => [k * (rep[1] ?? pl.z1 - pl.z0), `_z${k + 1}`]) : [[0, '']];
      for (const [dz, zsuf] of reps) {
        rects.forEach((r, ri) => {
          const [x, y, w, d] = xywd(r);
          const id = aid + pl.suffix + zsuf + (rects.length > 1 ? `_${String.fromCharCode(97 + ri)}` : '');
          const ao = { id, name: a.name, kind: a.kind, between: a.between ? (a.per && a.between[0] === a.per ? [pl.between[0], a.between[1]] : a.between) : pl.between,
            mount: pl.mount, region: { x_mm: x, y_mm: y, w_mm: w, d_mm: d }, z_um: pl.z0 + dz, h_um: pl.z1 - pl.z0, pitch_um: pitch };
          if (a.diameter !== undefined) ao.diameter_um = aval(aid, 'diameter_um');
          ao.height_um = a.height !== undefined ? aval(aid, 'height_um') : pl.z1 - pl.z0;
          if (a.wall !== undefined) ao.wall_um = aval(aid, 'wall_um');
          ao.count_est = Math.floor((w * 1000) / pitch + 1e-9) * Math.floor((d * 1000) / pitch + 1e-9);
          ao.template_id = aid;
          if (pl.layer) ao.layer = pl.layer;
          if (a.via) ao.via = a.via;
          if (a.simOnly) ao.sim_only = true;
          if (a.fillKind) ao.fill_kind = a.fillKind;
          if (a.inclusion) ao.inclusion = P.values[a.inclusion];
          if (a.note) ao.note = a.note;
          ao.dims = { ...dims };
          ao._host = pl.host ?? null;
          arraysOut.push(ao);
        });
      }
    }
  }

  // shift so the lowest point is z = 0
  const zmin = Math.min(...[...pdecl.keys()].filter((t) => insts.get(t).length).map((t) => z.get(t)), ...arraysOut.map((a) => a.z_um));
  const partsOut = [];
  for (const [tid, p] of pdecl) {
    const dj = pdims.get(tid);
    for (const inst of insts.get(tid)) {
      const [x, y, w, d] = xywd(inst.rect);
      const po = { id: inst.id, name: inst.name, kind: p.kind, material: p.material, x_mm: rnd(x), y_mm: rnd(y), w_mm: rnd(w), d_mm: rnd(d),
        z_um: rnd(iz(inst) - zmin), h_um: rnd(h.get(tid)), template_id: tid };
      if (nzOf.get(tid) > 1) po.z_index = inst.zk + 1;
      if (p.material_label) po.material_label = p.material_label;
      if (p.material_sim) { po.material_sim = P.values[p.material_sim]; po.material_sim_param = p.material_sim; }
      if (p.in || p.host) {
        const hosts = insts.get(p.in || p.host);
        po.in = (hosts.find((hh) => inside(inst.rect, hh.rect)) || hosts[0]).id;
      }
      if (p.note) po.note = p.note;
      const xyd = inst.frameDims || {};
      const xy = xyDims.get(tid);
      po.dims = { ...dj, w_mm: xyd.w_mm || dj.w_mm, d_mm: xyd.d_mm || dj.d_mm,
        x_mm: { ...(xyd.x_mm || xy.x_mm), value: po.x_mm }, y_mm: { ...(xyd.y_mm || xy.y_mm), value: po.y_mm },
        z_um: { status: zSt.get(tid) || 'derived', value: po.z_um, formula: p.fill ? (p.fill.per ? `bottom(${p.fill.per} level) - gap` : 'top of fill.above') : p.base ? 'base (0) + lowest-point shift' : p.on ? `top(${p.on}) + standoff` : p.in ? `top(${p.in}) - depth - h` : `bottom(${p.under}) - gap - h` } };
      if (nzOf.get(tid) > 1) po.dims.z_um.formula += ` + level * vertical pitch`;
      partsOut.push(po);
    }
  }
  for (const lo of layersOut) lo.z_um = rnd(lo.z_um - zmin);
  for (const ao of arraysOut) {
    ao._z0 = ao.z_um - zmin;
    ao.z_um = rnd(ao.z_um - zmin);
    ao.h_um = rnd(ao.h_um);
    if (ao.sim_only) {
      // sim-only fields come from rectangle differences: round the edges (4 decimals, as the parts' rounded
      // center +/- size / 2 of the boxes they are cut from) so shared faces coincide exactly in the grid
      const g = ao.region;
      const e = [rnd(g.x_mm - g.w_mm / 2), rnd(g.y_mm - g.d_mm / 2), rnd(g.x_mm + g.w_mm / 2), rnd(g.y_mm + g.d_mm / 2)];
      ao.region = { x_mm: (e[0] + e[2]) / 2, y_mm: (e[1] + e[3]) / 2, w_mm: e[2] - e[0], d_mm: e[3] - e[1] };
    } else {
      for (const k of ['x_mm', 'y_mm', 'w_mm', 'd_mm']) ao.region[k] = rnd(ao.region[k]);
    }
    for (const k of ['pitch_um', 'diameter_um', 'height_um', 'wall_um']) if (k in ao) ao[k] = rnd(ao[k]);
  }
  return { parts: partsOut, layers: layersOut, arrays: arraysOut, insts, pdecl, adecl, zmin, warnings, top: (t) => top(t) - zmin, zpos: (t) => zpos(t) - zmin, depthOf: (tid) => depthOf(pdecl, tid) };
}

export function depthOf(pdecl, tid) {
  let d = 0;
  let p = pdecl.get(tid);
  while (p && (p.in || p.host)) { d++; p = pdecl.get(p.in || p.host); }
  return d;
}

export { dominant };
