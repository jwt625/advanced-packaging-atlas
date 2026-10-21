// License: GPL-3.0-or-later.
// Constraint rules. Issue = {code, level: 'error' | 'warn' | 'info', message, ...}. Errors make generate() throw.
// Thresholds and their sources:
//   reticle area: warn above reticle_x * reticle_area_mm2, error above 1.05x (R5 sec. 4.6)
//   logic die <= one scanner field 26 x 33 mm (R5 sec. 4.6, standard_reference) - warn (test / dummy dies may exceed)
//   HBM faces a logic-die edge: the HBM rect grown by the D2D gap overlaps a logic die along >= 50 % of the HBM
//     edge (template geometry rule, R5 sec. 4.6 "HBM placement")

import { rnd } from './params.mjs';
import { intersect, inside, xywd } from './resolve.mjs';

const TOL = 1e-6;
const grow = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const fmt = (v) => String(rnd(v));

export function preChecks(P, checks) {
  const issues = [];
  for (const c of checks || []) {
    const r = c(P);
    if (r) issues.push(...(Array.isArray(r) ? r : [r]));
  }
  return issues;
}

/** Divisibility pre-check helper: count param must be a non-negative multiple of a divisor param. */
export function multipleOf(count, divisor, why) {
  return (P) => {
    const n = P.v(count);
    const k = P.v(divisor);
    if (!Number.isInteger(n) || n < 0) return { code: 'bad_count', level: 'error', param: count, message: `${count} = ${n} must be a non-negative integer` };
    if (!Number.isInteger(k) || k < 1) return { code: 'bad_count', level: 'error', param: divisor, message: `${divisor} = ${k} must be a positive integer` };
    if (n % k !== 0) return { code: 'not_multiple', level: 'error', param: count, message: `${count} = ${n} is not a multiple of ${divisor} = ${k} (${why})` };
    return null;
  };
}

export function geometryChecks(S, P, layout) {
  const issues = [];
  const rectsOf = (tids) => tids.flatMap((t) => (S.insts.get(t) || []).map((i) => ({ id: i.id, tid: t, rect: i.rect })));
  // positive dims
  for (const p of S.parts) if (!(p.w_mm > 0 && p.d_mm > 0 && p.h_um > 0)) issues.push({ code: 'nonpositive_dim', level: 'error', part: p.id, message: `part ${p.id}: non-positive size ${p.w_mm} x ${p.d_mm} mm x ${p.h_um} um` });
  for (const l of S.layers) if (!(l.h_um > 0)) issues.push({ code: 'nonpositive_dim', level: 'error', layer: l.id, message: `layer ${l.id}: non-positive thickness ${l.h_um} um` });
  // reticle area
  if (layout.reticleArea) {
    const { w, d, mult, per, count } = layout.reticleArea;
    const area = P.v(w) * P.v(d);
    const allowed = P.v(mult) * P.v(per);
    const ratio = area / allowed;
    const what = `${count ? 'each interposer' : 'interposer'} ${fmt(P.v(w))} x ${fmt(P.v(d))} mm = ${fmt(area)} mm2 vs ${mult} ${fmt(P.v(mult))} x ${fmt(P.v(per))} mm2 = ${fmt(allowed)} mm2 (ratio ${fmt(ratio)})`;
    if (ratio > 1.05 + TOL) issues.push({ code: 'reticle_area', level: 'error', ratio: rnd(ratio), message: `${what}: more than 5 % above the reticle multiple (R5 sec. 4.6)` });
    else if (ratio > 1 + TOL) issues.push({ code: 'reticle_area', level: 'warn', ratio: rnd(ratio), message: `${what}: above the reticle multiple (within 5 %)` });
  }
  const logic = rectsOf(layout.logic || []);
  const hbm = rectsOf(layout.hbm || []);
  // scanner field
  for (const L of logic) {
    const [, , w, d] = xywd(L.rect);
    const lo = Math.min(w, d);
    const hi = Math.max(w, d);
    if (lo > 26 + TOL || hi > 33 + TOL) issues.push({ code: 'die_exceeds_field', level: 'warn', part: L.id, message: `logic die ${L.id} ${fmt(w)} x ${fmt(d)} mm exceeds one 26 x 33 mm scanner field` });
  }
  // dies inside interposers
  const ips = rectsOf(layout.interposers || []);
  if (ips.length) {
    for (const D of [...logic, ...hbm]) {
      if (!ips.some((I) => inside(D.rect, I.rect))) issues.push({ code: 'die_outside_interposer', level: 'error', part: D.id, message: `${D.id} footprint is not inside an interposer (${(layout.interposers || []).join(', ')}); enlarge the interposer or set ip_size_rule: fit_dies` });
    }
  }
  // top-die overlap (incl. passive top-layer dies such as dummy Si)
  const tops = [...logic, ...hbm, ...rectsOf(layout.others || [])];
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    if (intersect(tops[i].rect, tops[j].rect)) issues.push({ code: 'die_overlap', level: 'error', parts: [tops[i].id, tops[j].id], message: `top dies ${tops[i].id} and ${tops[j].id} overlap` });
  }
  // HBM along logic edges
  const gapMm = P.has('die_gap_um') ? P.v('die_gap_um') / 1000 : P.has('soc_gap_um') ? P.v('soc_gap_um') / 1000 : 0.15;
  for (const H of hbm) {
    const [, , hw, hd] = xywd(H.rect);
    // reach from a family param (fixed template value or a reported line length), not from the current die gap,
    // so a growing gap is caught (audit A1 M4)
    const reach = layout.hbmReach && P.has(layout.hbmReach) ? P.v(layout.hbmReach) : gapMm + 0.5;
    const g = grow(H.rect, reach + TOL);
    const ok = logic.some((L) => {
      const x = intersect(g, L.rect);
      if (!x) return false;
      const [, , xw, xd] = xywd(x);
      return xd >= 0.5 * hd - TOL || xw >= 0.5 * hw - TOL;
    });
    if (!ok) issues.push({ code: 'hbm_not_on_logic_edge', level: 'error', part: H.id, message: `${H.id} does not face a logic-die edge (no logic die within ${fmt(reach)} mm along >= 50 % of an HBM edge${layout.hbmReach ? ` ; reach = ${layout.hbmReach}` : '; reach = D2D gap + 0.5 mm'})` });
  }
  // bridges
  const bridges = rectsOf(layout.bridges || []);
  for (const B of bridges) {
    if (ips.length && !ips.some((I) => inside(B.rect, I.rect))) issues.push({ code: 'bridge_outside_interposer', level: 'error', part: B.id, message: `bridge ${B.id} is not inside the interposer` });
    const onLogic = logic.filter((L) => intersect(B.rect, L.rect));
    const onHbm = hbm.filter((H) => intersect(B.rect, H.rect));
    const isHbmBridge = B.tid === layout.hbmBridges || (layout.hbmBridgeTids || []).includes(B.tid);
    if (isHbmBridge ? !(onLogic.length >= 1 && onHbm.length >= 1) : onLogic.length < 2) {
      issues.push({ code: 'bridge_not_under_dies', level: 'error', part: B.id, message: `bridge ${B.id} must lie under ${isHbmBridge ? 'an HBM and a logic die' : 'two logic dies'} (it touches ${onLogic.length} logic, ${onHbm.length} HBM)` });
    }
  }
  for (let i = 0; i < bridges.length; i++) for (let j = i + 1; j < bridges.length; j++) {
    if (intersect(bridges[i].rect, bridges[j].rect)) issues.push({ code: 'bridge_overlap', level: 'error', parts: [bridges[i].id, bridges[j].id], message: `bridges ${bridges[i].id} and ${bridges[j].id} overlap` });
  }
  if (layout.bridgeRule) {
    const { target, edge, rule, reported } = layout.bridgeRule;
    const drawn = bridges.length;
    const t = P.v(target);
    if (t !== drawn) {
      issues.push({ code: 'bridge_count', level: 'info', rule: P.v(rule), target: t, drawn,
        message: `bridge count rule ${P.v(rule)} gives ${t}; the layout draws ${drawn} (one per die-to-die edge)${t > drawn ? `; ${t - drawn} bridge(s) without reported placement are not drawn` : ''}${reported && P.has(reported) ? `; reported cell ${reported} = ${P.v(reported)}` : ''}` });
    }
    if (P.has(edge) && P.v(edge) !== drawn) issues.push({ code: 'bridge_count_internal', level: 'warn', message: `edge-rule count ${P.v(edge)} != drawn ${drawn}` });
  }
  // array regions inside their die / host footprint
  for (const a of S.arrays) {
    const decl = S.adecl.get(a.template_id);
    if (!decl || !decl.region || !decl.region.size) continue;
    const owners = decl.per ? S.insts.get(decl.per).filter((i) => a.id === `${a.template_id}_${i.id}`) : (S.insts.get(decl.region.part || decl.upper || decl.under || decl.in) || []);
    if (!owners.length) continue;
    const r = [a.region.x_mm - a.region.w_mm / 2, a.region.y_mm - a.region.d_mm / 2, a.region.x_mm + a.region.w_mm / 2, a.region.y_mm + a.region.d_mm / 2];
    if (!owners.some((o) => inside(r, o.rect, 1e-4))) issues.push({ code: 'array_outside_footprint', level: 'error', array: a.id, message: `array ${a.id} region ${fmt(a.region.w_mm)} x ${fmt(a.region.d_mm)} mm is not inside ${owners.map((o) => o.id).join(' / ')}` });
    if (a.region.w_mm * 1000 < a.pitch_um || a.region.d_mm * 1000 < a.pitch_um) issues.push({ code: 'array_region_small', level: 'error', array: a.id, message: `array ${a.id} region smaller than one pitch` });
  }
  // interposer inside substrate; stiffener clear of the interposer underfill
  const sbt = rectsOf(layout.substrate || ['substrate']);
  if (sbt.length) {
    const S0 = sbt[0].rect;
    for (const I of ips) if (!inside(I.rect, S0)) issues.push({ code: 'interposer_outside_substrate', level: 'error', part: I.id, message: `${I.id} is not inside the substrate` });
    for (const D of [...logic, ...hbm]) {
      if (inside(D.rect, S0)) continue;
      if ((layout.overhang || []).includes(D.tid)) issues.push({ code: 'die_overhang', level: 'info', part: D.id, message: `${D.id} overhangs the substrate edge (template layout: ${layout.overhangNote || 'overhang by design'})` });
      else issues.push({ code: 'die_outside_substrate', level: 'error', part: D.id, message: `${D.id} is not inside the substrate` });
    }
    const keep = rectsOf([layout.fillUnderInterposer, ...(layout.keepOut || [])].filter(Boolean));
    const frames = S.parts.filter((p) => (p.kind === 'stiffener' || (p.kind === 'lid' && /_(n|s|e|w)$/.test(p.id)) || (p.kind === 'other' && /_(n|s|e|w)$/.test(p.id))));
    for (const f of frames) {
      const fr = [f.x_mm - f.w_mm / 2, f.y_mm - f.d_mm / 2, f.x_mm + f.w_mm / 2, f.y_mm + f.d_mm / 2];
      for (const K of [...keep, ...ips, ...logic, ...hbm]) if (intersect(fr, K.rect)) issues.push({ code: 'stiffener_overlap', level: 'error', parts: [f.id, K.id], message: `${f.id} overlaps ${K.id}; reduce ring_w_mm / lid_foot_w_mm or enlarge the substrate` });
    }
  }
  // bump diameter / pitch above the largest DB-observed ratio (0.8125, ectc51906.2022.00180-b-i7, BGA 650 / 800 um)
  for (const a of S.arrays) {
    if (a.diameter_um === undefined || a.sim_only) continue;
    const r = a.diameter_um / a.pitch_um;
    if (r > 0.8125 + 1e-9) issues.push({ code: 'bump_dp_high', level: 'warn', array: a.template_id,
      message: `array ${a.template_id}: diameter / pitch ${fmt(r)} above the largest DB-observed ratio 0.8125 (ectc51906.2022.00180-b-i7); joints nearly touch` });
  }
  // one issue per cause: merge repeats of the same code and part / array (audit A1 M4)
  const seen = new Map();
  const out = [];
  for (const i of issues) {
    const k = `${i.code}|${i.level}|${i.part ?? (i.parts ? i.parts[0] : '')}|${i.array ?? ''}`;
    if (seen.has(k)) { const o = seen.get(k); o.count = (o.count || 1) + 1; if (i.parts) o.parts = [...new Set([...(o.parts || []), ...i.parts])]; continue; }
    const c = { ...i };
    seen.set(k, c);
    out.push(c);
  }
  for (const o of out) if (o.count > 1 && o.parts) o.message = `${o.message} (and ${o.count - 1} more: ${o.parts.join(', ')})`;
  return out;
}
