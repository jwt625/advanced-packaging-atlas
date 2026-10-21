// Frequency-domain 3D EM solver for discontinuity blocks (lane L7, tranche E6 phase 1): first-order Nedelec
// curl-curl E formulation on the layered tet mesh, PEC / PMC box sides, PEC / IBC / thin-conductor transition BC,
// stretched-coordinate PML slabs, single-mode wave ports (quasi-TEM from a 2D electrostatic solve on the port face,
// or analytic TE10), S-parameters with port extension. License: GPL-3.0-or-later.
//
// Weak form (phasor exp(+j w t), mu_r = 1):
//   int nu curl E . curl v - k0^2 int eps E . v + sum_faces alpha int E_t . v_t = sum_ports 2 j beta a int e_t . v
//   PEC: E_t = 0 (Dirichlet edges). Port (n x curl E = j beta E_t - 2 j beta a e_t): alpha = j beta.
//   IBC: alpha = j w mu0 / Zs, Zs = K_rough (1 + j)/(sigma delta).
//   Thin slab (faces paired by the extrusion): alpha_ii = j w mu0 coth(kt)/Zs, alpha_ij = -j w mu0 csch(kt)/Zs,
//   k = (1 + j)/delta; a face whose partner is not in the domain gets j w mu0 / (Zs coth(kt)) when the partner lies
//   on a pmc / port side (no field behind) and j w mu0 coth(kt) / Zs when it lies on a pec side or against another
//   conductor (E = 0 behind; audit A2 item M4).
//   PML: s = 1 - j sigma(d)/(w eps0), sigma = sigma_max (d/L)^m, sigma_max = -(m + 1) ln(R0) / (2 eta0 L);
//   nu = Lambda^-1, eps_eff = eps_r Lambda, Lambda = diag(sy sz / sx, sx sz / sy, sx sy / sz).

import { buildElementPattern, elementSlots, analyze, buildPattern, triangleSlots } from '../la/sparse.mjs';
import { ComplexSupernodalLDLT } from '../la/ldlt.mjs';
import { restrictPattern } from '../em2d/fe.mjs';
import { tetGeometry, tetMatrices, faceMass, FACE_EDGES } from './elements.mjs';
import { preparePort, portModes, portMass } from './ports.mjs';
import { nd3Order } from './order.mjs';
import { makeFactor } from '../em2d/ldlt-select.mjs';
import { C0, MU0, EPS0, ETA0, skinDepth } from '../em2d/closed-forms.mjs';
import { makeRoughness } from '../em2d/roughness.mjs';
import { CMat, cmatInv, cmatMul } from '../em2d/dense.mjs';
import { zToS } from '../em2d/mtl.mjs';

const fail = (m) => {
  throw new Error(`em3d: ${m}`);
};
const now = () => performance.now();
const SIDES = ['xmin', 'xmax', 'ymin', 'ymax', 'zmin', 'zmax'];
const AXIS = { xmin: 0, xmax: 0, ymin: 1, ymax: 1, zmin: 2, zmax: 2 };

// complex helpers on [re, im]
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const csqrt = (z) => {
  const r = Math.hypot(z[0], z[1]);
  if (r === 0) return [0, 0];
  const t = Math.sqrt((r + Math.abs(z[0])) / 2);
  return z[0] >= 0 ? [t, z[1] / (2 * t)] : [Math.abs(z[1]) / (2 * t), z[1] >= 0 ? t : -t];
};
const cexp = (z) => [Math.exp(z[0]) * Math.cos(z[1]), Math.exp(z[0]) * Math.sin(z[1])];
function cothCsch(z) {
  // coth z, csch z for Re z > 0 via e^{-2z}
  const e = cexp([-2 * z[0], -2 * z[1]]);
  const e1 = cexp([-z[0], -z[1]]);
  const den = [1 - e[0], -e[1]];
  return { coth: cdiv([1 + e[0], e[1]], den), csch: cdiv([2 * e1[0], 2 * e1[1]], den) };
}

const faceKey = (a, b, c) => `${a},${b},${c}`;

/**
 * Frequency-independent setup.
 * @param {object} mesh buildLayeredMesh result
 * @param {object} p {materials (em2d makeMaterials), background, solidProps: [{kind, material?, model?, sigma_S_m?,
 *   roughness?}] per mesh solid, bc: {side: 'pec'|'pmc'}, ports: [{name, side, mode, deembed_um?}],
 *   pml: {side: {thickness_um, R0?, order?}}, max_dof?}
 */
export function prepare3d(mesh, p) {
  const t0 = now();
  const { nodes, tets, nTets, tetSolid, edges, nEdges, tetEdges, box } = mesh;
  const bc = Object.fromEntries(SIDES.map((s) => [s, p.bc?.[s] ?? 'pec']));
  const ports = p.ports ?? [];
  for (const pt of ports) {
    if (!SIDES.includes(pt.side)) fail(`port ${pt.name}: side must be one of ${SIDES.join(', ')}`);
    bc[pt.side] = 'port';
  }
  if (new Set(ports.map((q) => q.side)).size !== ports.length) fail('one port per box side (multi-mode ports not implemented)');
  const solidProps = mesh.solids.map((s, i) => {
    const sp = p.solidProps?.[i] ?? fail(`solid ${s.name}: properties missing`);
    if (sp.kind === 'conductor' && !['pec', 'ibc', 'thin'].includes(sp.model)) fail(`conductor ${s.name}: model must be pec, ibc or thin`);
    if (sp.kind === 'conductor' && sp.model !== 'pec' && !(sp.sigma_S_m > 0)) fail(`conductor ${s.name}: sigma_S_m required for ${sp.model}`);
    return { ...sp, name: s.name, roughness: sp.kind === 'conductor' ? makeRoughness(sp.roughness) : null };
  });
  const isCond = (s) => s >= 0 && solidProps[s].kind === 'conductor';
  const bmin = [box.x[0] * 1e-6, box.y[0] * 1e-6, box.z[0] * 1e-6],
    bmax = [box.x[1] * 1e-6, box.y[1] * 1e-6, box.z[1] * 1e-6];
  const tol = 1e-9 * Math.max(bmax[0] - bmin[0], bmax[1] - bmin[1], bmax[2] - bmin[2]);
  const nodeSide = new Uint8Array(mesh.nNodes);
  for (let n = 0; n < mesh.nNodes; n++)
    for (let ax = 0; ax < 3; ax++) {
      if (Math.abs(nodes[3 * n + ax] - bmin[ax]) <= tol) nodeSide[n] |= 1 << (2 * ax);
      if (Math.abs(nodes[3 * n + ax] - bmax[ax]) <= tol) nodeSide[n] |= 1 << (2 * ax + 1);
    }
  const sideBit = (s) => 1 << (2 * AXIS[s] + (s.endsWith('max') ? 1 : 0));

  // domain tets, geometry, material tags
  const domain = new Uint8Array(nTets);
  for (let e = 0; e < nTets; e++) domain[e] = isCond(tetSolid[e]) ? 0 : 1;
  const geo = new Float64Array(12 * nTets),
    vol = new Float64Array(nTets),
    cen = new Float64Array(3 * nTets);
  const vv = [0, 0, 0, 0],
    g = new Float64Array(12);
  for (let e = 0; e < nTets; e++) {
    if (!domain[e]) continue;
    for (let i = 0; i < 4; i++) vv[i] = tets[4 * e + i];
    vol[e] = tetGeometry(nodes, vv, g);
    geo.set(g, 12 * e);
    for (let d = 0; d < 3; d++) cen[3 * e + d] = 0.25 * (nodes[3 * vv[0] + d] + nodes[3 * vv[1] + d] + nodes[3 * vv[2] + d] + nodes[3 * vv[3] + d]);
  }
  const matOf = (e) => (tetSolid[e] < 0 ? p.background : solidProps[tetSolid[e]].material);
  const matKeys = [];
  const tetMat = new Int32Array(nTets).fill(-1);
  for (let e = 0; e < nTets; e++) {
    if (!domain[e]) continue;
    const k = matOf(e);
    if (!p.materials[k]) fail(`material ${k} not defined`);
    let i = matKeys.indexOf(k);
    if (i < 0) i = matKeys.push(k) - 1;
    tetMat[e] = i;
  }
  // PML stretch descriptors per tet (sides with a PML slab)
  const pml = [];
  for (const [side, q] of Object.entries(p.pml ?? {})) {
    if (!SIDES.includes(side)) fail(`pml side ${side}`);
    if (bc[side] === 'port') fail(`pml on port side ${side}`);
    const L = q.thickness_um * 1e-6;
    const m = q.order ?? 2,
      R0 = q.R0 ?? 1e-6;
    pml.push({ side, ax: AXIS[side], max: side.endsWith('max'), L, m, sigmaMax: (-(m + 1) * Math.log(R0)) / (2 * ETA0 * L) });
  }

  // edges: domain membership and Dirichlet sets
  const inDomain = new Uint8Array(nEdges),
    dirichlet = new Uint8Array(nEdges);
  for (let e = 0; e < nTets; e++) {
    const pecTet = isCond(tetSolid[e]) && solidProps[tetSolid[e]].model === 'pec';
    for (let l = 0; l < 6; l++) {
      const id = tetEdges[6 * e + l];
      if (domain[e]) inDomain[id] = 1;
      if (pecTet) dirichlet[id] = 1;
    }
  }
  let pecMaskBits = 0;
  for (const s of SIDES) if (bc[s] === 'pec') pecMaskBits |= sideBit(s);
  for (let id = 0; id < nEdges; id++) {
    const a = edges[2 * id],
      b = edges[2 * id + 1];
    if (nodeSide[a] & nodeSide[b] & pecMaskBits) dirichlet[id] = 1;
  }
  // faces of conductor tets (solid id) and boundary faces of the domain
  const condFace = new Map();
  for (let e = 0; e < nTets; e++) {
    if (domain[e]) continue;
    const v = tets.subarray(4 * e, 4 * e + 4);
    for (const [i, j, k] of [
      [0, 1, 2],
      [0, 1, 3],
      [0, 2, 3],
      [1, 2, 3],
    ])
      condFace.set(faceKey(v[i], v[j], v[k]), tetSolid[e]);
  }
  const faceCount = new Map();
  for (let e = 0; e < nTets; e++) {
    if (!domain[e]) continue;
    const v = tets.subarray(4 * e, 4 * e + 4);
    for (const [i, j, k] of [
      [0, 1, 2],
      [0, 1, 3],
      [0, 2, 3],
      [1, 2, 3],
    ]) {
      const key = faceKey(v[i], v[j], v[k]);
      faceCount.set(key, (faceCount.get(key) ?? 0) + 1);
    }
  }
  const portFaces = ports.map(() => []);
  const condFaces = []; // {v: [a,b,c], solid}
  for (const [key, cnt] of faceCount) {
    if (cnt !== 1) continue;
    const v = key.split(',').map(Number);
    if (condFace.has(key)) {
      condFaces.push({ v, solid: condFace.get(key) });
      continue;
    }
    const common = nodeSide[v[0]] & nodeSide[v[1]] & nodeSide[v[2]];
    ports.forEach((pt, i) => {
      if (common & sideBit(pt.side)) portFaces[i].push(v);
    });
  }
  const edgeOf = (a, b) => {
    const id = mesh.edgeIndex(a, b);
    if (id === undefined) fail('face edge not found');
    return id;
  };
  // IBC and thin faces
  const ibcFaces = [];
  const thinPairs = [];
  const thinSingle = [];
  const zIndex = new Map();
  mesh.zs.forEach((z, k) => zIndex.set(Math.round(z * 1e6), k));
  for (const f of condFaces) {
    const sp = solidProps[f.solid];
    if (sp.model === 'pec') continue;
    const fm = faceMass(nodes, f.v);
    const fe = FACE_EDGES.map(([i, j]) => edgeOf(f.v[i], f.v[j]));
    if (sp.model === 'ibc') {
      ibcFaces.push({ solid: f.solid, T: fm.T, e: fe });
      continue;
    }
    // thin: horizontal faces at the slab's z0 / z1 are paired with the opposite face of the same xy triangle
    const s = mesh.solids[f.solid];
    const zf = f.v.map((n) => nodes[3 * n + mesh.axisIndex] * 1e6);
    const horiz = Math.abs(zf[0] - zf[1]) < 1e-9 && Math.abs(zf[0] - zf[2]) < 1e-9;
    if (!horiz) {
      ibcFaces.push({ solid: f.solid, T: fm.T, e: fe, thinSide: true });
      continue;
    }
    const atTop = Math.abs(zf[0] - s.z[1]) < 1e-6 * Math.max(1, Math.abs(s.z[1]));
    const kO = zIndex.get(Math.round((atTop ? s.z[0] : s.z[1]) * 1e6 * 1e-6 * 1e6));
    const kS = zIndex.get(Math.round(zf[0] * 1e6 * 1e-6 * 1e6));
    if (kO === undefined || kS === undefined) fail(`thin conductor ${s.name}: faces not on z planes`);
    const off = (kO - kS) * mesh.nV2;
    const ov = f.v.map((n) => n + off);
    const oKey = faceKey(...[...ov].sort((x, y) => x - y));
    const partnerInDomain = faceCount.get(oKey) === 1;
    const thick = Math.abs(s.z[1] - s.z[0]) * 1e-6;
    if (partnerInDomain) thinPairs.push({ solid: f.solid, T: fm.T, e: fe, eo: FACE_EDGES.map(([i, j]) => edgeOf(ov[i], ov[j])), t: thick, own: true });
    else {
      // partner face not in the domain: on a box side (pmc / port: open behind, K2 = 0 -> K1 = E1 / (Zs coth kt);
      // pec: E2 = 0 -> K1 = (coth kt / Zs) E1) or against another conductor (treated as PEC behind)
      const common = nodeSide[ov[0]] & nodeSide[ov[1]] & nodeSide[ov[2]];
      let backing = 'pec';
      for (const sd of SIDES) if (common & sideBit(sd)) backing = bc[sd] === 'pec' ? 'pec' : 'open';
      thinSingle.push({ solid: f.solid, T: fm.T, e: fe, t: thick, backing });
    }
  }
  // elements for the pattern: domain tets + thin pair blocks (own 3 + opposite 3 edges)
  const nDomTets = domain.reduce((a, b) => a + b, 0);
  const portEdgeLists = portFaces.map((faces) => {
    const set = new Set();
    for (const f of faces) for (const [i, j] of FACE_EDGES) set.add(edgeOf(f[i], f[j]));
    return Int32Array.from([...set].sort((x, y) => x - y));
  });
  const elem = new Int32Array(6 * (nDomTets + thinPairs.length));
  const domList = new Int32Array(nDomTets);
  let w = 0;
  for (let e = 0; e < nTets; e++)
    if (domain[e]) {
      domList[w] = e;
      elem.set(tetEdges.subarray(6 * e, 6 * e + 6), 6 * w++);
    }
  thinPairs.forEach((tp, i) => {
    elem.set(tp.e, 6 * (nDomTets + i));
    elem.set(tp.eo, 6 * (nDomTets + i) + 3);
  });
  const nElemFE = nDomTets; // element slots are used for the tets only
  const warnings = [];
  const present = new Uint8Array(solidProps.length);
  for (let e = 0; e < nTets; e++) if (tetSolid[e] >= 0) present[tetSolid[e]] = 1;
  solidProps.forEach((sp, i) => {
    if (sp.model !== 'thin' || !present[i]) return; // absent solids (sub-meshes, lane L13): nothing to warn about
    const nPair = thinPairs.filter((t) => t.solid === i).length + thinSingle.filter((t) => t.solid === i).length;
    if (!nPair) warnings.push(`thin conductor ${sp.name}: no faces normal to the extrusion axis ${mesh.axis}; all its faces use the thick IBC (use axis = thickness direction)`);
  });
  const pat = buildElementPattern(nEdges, elem, 6);
  const free = new Uint8Array(nEdges);
  let nFree = 0;
  for (let id = 0; id < nEdges; id++) if (inDomain[id] && !dirichlet[id]) (free[id] = 1), nFree++;
  const maxDof = p.max_dof ?? 6e4;
  if (nFree > maxDof) fail(`DOF budget exceeded: ${nFree} free edges > max_dof ${maxDof} (raise max_dof explicitly to run larger blocks)`);
  const R = restrictPattern(pat, free);
  const tA = now();
  let sym;
  const ordering = p.ordering ?? 'auto';
  if (ordering === 'nd3' || ordering === 'auto') {
    // DOF coordinates = edge midpoints for the 3D nested dissection (wave 4: 10-20 % fewer factor flops than AMD)
    const cx = new Float64Array(R.nf),
      cy = new Float64Array(R.nf),
      cz = new Float64Array(R.nf);
    for (let id = 0; id < nEdges; id++) {
      const q = R.map[id];
      if (q < 0) continue;
      const a = edges[2 * id],
        b = edges[2 * id + 1];
      cx[q] = 0.5 * (nodes[3 * a] + nodes[3 * b]);
      cy[q] = 0.5 * (nodes[3 * a + 1] + nodes[3 * b + 1]);
      cz[q] = 0.5 * (nodes[3 * a + 2] + nodes[3 * b + 2]);
    }
    sym = analyze(R.pat, { perm: nd3Order(R.pat, cx, cy, cz, { leaf: p.nd_leaf ?? 8000 }) });
    if (ordering === 'auto') {
      // 'auto': keep whichever symbolic analysis predicts fewer factor flops (AMD wins on line-extruded meshes, where
      // coordinate bisection cuts whole cross-sections; ND3 wins by 10-20 % on layered blocks such as EM-4)
      const amd = analyze(R.pat);
      if (amd.flops < sym.flops) sym = amd;
    }
  } else sym = analyze(R.pat);
  const analyzeMs = now() - tA;
  // node -> conductor solid (for port electrostatics)
  const nodeCond = new Int32Array(mesh.nNodes).fill(-1);
  for (let e = 0; e < nTets; e++) if (!domain[e]) for (let i = 0; i < 4; i++) nodeCond[tets[4 * e + i]] = tetSolid[e];
  const portData = ports.map((pt, i) => ({ ...preparePort(mesh, pt, portFaces[i], { nodeCond, nodeSide, sideBit, bc, solidProps, edgeOf, tetMat, matKeys, domain, free }), }));
  return {
    mesh,
    p,
    bc,
    solidProps,
    domList,
    geo,
    vol,
    cen,
    tetMat,
    matKeys,
    pml,
    pat,
    elem,
    elemFE: elem.subarray(0, 6 * nElemFE),
    R,
    sym,
    free,
    nFree,
    ibcFaces,
    thinPairs,
    thinSingle,
    ports: portData,
    warnings,
    bmin,
    bmax,
    stats: { dof: nFree, edges: nEdges, tets: nTets, domainTets: nDomTets, nnzL: sym.nnzL, ibcFaces: ibcFaces.length, thinPairs: thinPairs.length, portFaces: portFaces.map((f) => f.length), setup_ms: now() - t0, analyze_ms: analyzeMs },
  };
}

/** Assemble and solve at frequency f (Hz). Returns {f, S: CMat (Re Z0 references), ports: [...], timing}. */
export function solveAt(P, f, { onProgress = null } = {}) {
  const t0 = now();
  const { mesh, pat, R, geo, vol, cen, tetMat, matKeys, pml, domList } = P;
  const w = 2 * Math.PI * f,
    k0 = w / C0,
    k02 = k0 * k0;
  const epsList = matKeys.map((k) => P.p.materials[k].epsAt(f));
  const nnz = pat.nnz;
  const Are = new Float64Array(nnz),
    Aim = new Float64Array(nnz);
  const slots = elementSlots(pat, P.elemFE, 6);
  const Sre = new Float64Array(36),
    Sim = new Float64Array(36),
    Mre = new Float64Array(36),
    Mim = new Float64Array(36);
  const g = new Float64Array(12);
  const nu = { re: [1, 1, 1], im: [0, 0, 0] },
    ep = { re: [0, 0, 0], im: [0, 0, 0] };
  for (let q = 0; q < domList.length; q++) {
    const e = domList[q];
    for (let i = 0; i < 12; i++) g[i] = geo[12 * e + i];
    const er = epsList[tetMat[e]];
    // stretch factors
    const s = [
      [1, 0],
      [1, 0],
      [1, 0],
    ];
    for (const pm of pml) {
      const c = cen[3 * e + pm.ax];
      const d = pm.max ? c - (P.bmax[pm.ax] - pm.L) : P.bmin[pm.ax] + pm.L - c;
      if (d > 0) s[pm.ax] = [1, -(pm.sigmaMax * (d / pm.L) ** pm.m) / (w * EPS0)];
    }
    if (pml.length) {
      const L = [cdiv(cmul(s[1], s[2]), s[0]), cdiv(cmul(s[0], s[2]), s[1]), cdiv(cmul(s[0], s[1]), s[2])];
      for (let d = 0; d < 3; d++) {
        const inv = cdiv([1, 0], L[d]);
        nu.re[d] = inv[0];
        nu.im[d] = inv[1];
        const ee = cmul([er.re, er.im], L[d]);
        ep.re[d] = ee[0];
        ep.im[d] = ee[1];
      }
    } else for (let d = 0; d < 3; d++) (ep.re[d] = er.re), (ep.im[d] = er.im), (nu.re[d] = 1), (nu.im[d] = 0);
    tetMatrices(g, vol[e], nu, ep, Sre, Sim, Mre, Mim);
    for (let k = 0; k < 36; k++) {
      const sl = slots[36 * q + k];
      Are[sl] += Sre[k] - k02 * Mre[k];
      Aim[sl] += Sim[k] - k02 * Mim[k];
    }
  }
  const addFace = (ea, eb, T, alpha) => {
    for (let x = 0; x < 3; x++)
      for (let y = 0; y < 3; y++) {
        const sl = entry(pat, ea[x], eb[y]);
        Are[sl] += alpha[0] * T[3 * x + y];
        Aim[sl] += alpha[1] * T[3 * x + y];
      }
  };
  const jwmu = [0, w * MU0];
  for (const fc of P.ibcFaces) {
    const sp = P.solidProps[fc.solid];
    const d = skinDepth(f, sp.sigma_S_m);
    const K = sp.roughness.K(f, sp.sigma_S_m);
    const Zs = [K / (sp.sigma_S_m * d), K / (sp.sigma_S_m * d)];
    addFace(fc.e, fc.e, fc.T, cdiv(jwmu, Zs));
  }
  for (const fc of [...P.thinPairs, ...P.thinSingle]) {
    const sp = P.solidProps[fc.solid];
    const d = skinDepth(f, sp.sigma_S_m);
    const K = sp.roughness.K(f, sp.sigma_S_m);
    const Zs = [K / (sp.sigma_S_m * d), K / (sp.sigma_S_m * d)];
    const { coth, csch } = cothCsch([fc.t / d, fc.t / d]);
    if (fc.eo) {
      addFace(fc.e, fc.e, fc.T, cdiv(cmul(jwmu, coth), Zs));
      addFace(fc.e, fc.eo, fc.T, cdiv(cmul(jwmu, [-csch[0], -csch[1]]), Zs));
    } else if (fc.backing === 'pec') addFace(fc.e, fc.e, fc.T, cdiv(cmul(jwmu, coth), Zs));
    else addFace(fc.e, fc.e, fc.T, cdiv(jwmu, cmul(Zs, coth)));
  }
  const pm = P.ports.map((pt) => portModes(P, pt, f));
  // local port term j beta_bar M on every port face (absorbs non-modal fields)
  const betaBar = pm.map((d) => [d.modes.reduce((a, m) => a + m.beta[0], 0) / d.K, d.modes.reduce((a, m) => a + m.beta[1], 0) / d.K]);
  P.ports.forEach((pt, i) => {
    const jb = [-betaBar[i][1], betaBar[i][0]];
    for (const t of pt.tris) addFace(t.e, t.e, t.T, jb);
  });
  const tAs = now();
  const re = new Float64Array(R.pat.nnz),
    im = new Float64Array(R.pat.nnz);
  for (let q = 0; q < re.length; q++) {
    re[q] = Are[R.src[q]];
    im[q] = Aim[R.src[q]];
  }
  const fac = makeFactor(P.p.factor, P.sym);
  if (onProgress) {
    onProgress({ stage: 'factor', fraction: 0, f_GHz: f / 1e9, ms: tAs - t0 });
    fac.onProgress = (fraction) => onProgress({ stage: 'factor', fraction, f_GHz: f / 1e9 });
  }
  fac.factor(re, im);
  const tF = now();
  onProgress?.({ stage: 'factor', fraction: 1, f_GHz: f / 1e9, ms: tF - tAs });
  // Low-rank modal port corrections (Woodbury, sparse pattern unchanged). Per port with modes m = 1..K:
  //   - j beta_bar M E_s G^-1 E_s^T M (G = E_s^T M E_s): removes the local term on span{e_m}
  //   + sum_m j beta_m (M q_m)(M q_m)^T / N_m: exact modal condition n x curl E = -j beta_m (a_m - b_m) q_m
  // A = A0 + U Cc U^T, x = y - Y (Cc^-1 + U^T Y)^-1 U^T y, y = A0^-1 b, Y = A0^-1 U.
  const toGlobal = (pt, vec) => {
    const ur = new Float64Array(R.nf),
      ui = new Float64Array(R.nf);
    pt.edges.forEach((edge, r) => {
      const q = R.map[edge];
      if (q >= 0) {
        ur[q] = vec[0][r];
        ui[q] = vec[1][r];
      }
    });
    return [ur, ui];
  };
  const Ucols = [];
  const blocks = []; // {off, Cinv: CMat}
  const portQ = []; // per port: [{Mq (port-local), N}]
  P.ports.forEach((pt, i) => {
    const d = pm[i];
    const K = d.K;
    const Me = d.modes.map((m) => portMass(pt, m.e));
    const Mq = d.modes.map((m) => portMass(pt, m.q));
    portQ.push(d.modes.map((m, k) => ({ Mq: Mq[k], N: m.N })));
    // block 1: Cc = -j beta_bar G^-1 -> Cc^-1 = (j / beta_bar) G
    const off1 = Ucols.length;
    const G = new CMat(K);
    for (let a = 0; a < K; a++)
      for (let b = 0; b < K; b++) {
        const v = cmul(cdiv([0, 1], betaBar[i]), (() => {
          let sr = 0,
            si = 0;
          for (let r = 0; r < pt.edges.length; r++) {
            const ea = [d.modes[a].e[0][r], d.modes[a].e[1][r]],
              mb = [Me[b][0][r], Me[b][1][r]];
            const t = cmul(ea, mb);
            sr += t[0];
            si += t[1];
          }
          return [sr, si];
        })());
        G.re[a * K + b] = v[0];
        G.im[a * K + b] = v[1];
      }
    Me.forEach((v) => Ucols.push(toGlobal(pt, v)));
    blocks.push({ off: off1, Cinv: G });
    // block 2: diag(j beta_m / N_m) -> inverse N_m / (j beta_m)
    d.modes.forEach((m, k) => {
      const c = new CMat(1);
      const v = cdiv(m.N, [-m.beta[1], m.beta[0]]);
      c.re[0] = v[0];
      c.im[0] = v[1];
      blocks.push({ off: Ucols.length, Cinv: c });
      Ucols.push(toGlobal(pt, Mq[k]));
    });
  });
  const nU = Ucols.length;
  const Ycols = Ucols.map(([ur, ui]) => fac.solve(ur, ui));
  const dotU = (u, x) => {
    let sr = 0,
      si = 0;
    for (let q = 0; q < u[0].length; q++) {
      const a = u[0][q],
        b = u[1][q];
      if (a === 0 && b === 0) continue;
      sr += a * x.re[q] - b * x.im[q];
      si += a * x.im[q] + b * x.re[q];
    }
    return [sr, si];
  };
  const Kc = new CMat(nU);
  for (let a = 0; a < nU; a++)
    for (let b = 0; b < nU; b++) {
      const d = dotU(Ucols[a], Ycols[b]);
      Kc.re[a * nU + b] = d[0];
      Kc.im[a * nU + b] = d[1];
    }
  for (const bl of blocks)
    for (let a = 0; a < bl.Cinv.r; a++)
      for (let b = 0; b < bl.Cinv.r; b++) {
        Kc.re[(bl.off + a) * nU + bl.off + b] += bl.Cinv.re[a * bl.Cinv.r + b];
        Kc.im[(bl.off + a) * nU + bl.off + b] += bl.Cinv.im[a * bl.Cinv.r + b];
      }
  const KcInv = cmatInv(Kc);
  const solveFull = (br, bi) => {
    const y = fac.solve(br, bi);
    const t = [];
    for (let a = 0; a < nU; a++) t.push(dotU(Ucols[a], y));
    for (let a = 0; a < nU; a++) {
      let cr = 0,
        ci = 0;
      for (let b = 0; b < nU; b++) {
        const v = cmul([KcInv.re[a * nU + b], KcInv.im[a * nU + b]], t[b]);
        cr += v[0];
        ci += v[1];
      }
      const Y = Ycols[a];
      for (let q = 0; q < y.re.length; q++) {
        y.re[q] -= Y.re[q] * cr - Y.im[q] * ci;
        y.im[q] -= Y.re[q] * ci + Y.im[q] * cr;
      }
    }
    return y;
  };
  // excitations: every (port, mode); modal amplitudes a, b -> terminal V, I (de-embedded per mode)
  const exc = [];
  P.ports.forEach((pt, i) => pm[i].modes.forEach((m, k) => exc.push({ p: i, k })));
  const nT = exc.length;
  const Vm = new CMat(nT),
    Im = new CMat(nT);
  const termOff = [];
  {
    let o = 0;
    for (const d of pm) {
      termOff.push(o);
      o += d.K;
    }
  }
  exc.forEach(({ p, k }, col) => {
    const m = pm[p].modes[k];
    const jb2 = [-2 * m.beta[1], 2 * m.beta[0]];
    const [gr, gi] = toGlobal(P.ports[p], portQ[p][k].Mq);
    const br = new Float64Array(R.nf),
      bi = new Float64Array(R.nf);
    for (let q = 0; q < R.nf; q++) {
      const v = cmul(jb2, [gr[q], gi[q]]);
      br[q] = v[0];
      bi[q] = v[1];
    }
    const x = solveFull(br, bi);
    P.ports.forEach((pt, r) => {
      const d = pm[r];
      const K = d.K;
      const ab = []; // per mode: [a + b, a - b] at the de-embedded reference plane
      d.modes.forEach((mn, n) => {
        let sr = 0,
          si = 0;
        const Mq = portQ[r][n].Mq;
        pt.edges.forEach((edge, ri) => {
          const q = R.map[edge];
          if (q < 0) return;
          sr += Mq[0][ri] * x.re[q] - Mq[1][ri] * x.im[q];
          si += Mq[0][ri] * x.im[q] + Mq[1][ri] * x.re[q];
        });
        const Vn = cdiv([sr, si], portQ[r][n].N);
        let a = r === p && n === k ? [1, 0] : [0, 0];
        let b = [Vn[0] - a[0], Vn[1] - a[1]];
        const g = [-mn.beta[1] * pt.deembed, mn.beta[0] * pt.deembed]; // gamma d
        a = cmul(a, cexp([-g[0], -g[1]]));
        b = cmul(b, cexp(g));
        ab.push([
          [a[0] + b[0], a[1] + b[1]],
          [a[0] - b[0], a[1] - b[1]],
        ]);
      });
      // V = T (a + b), I = Yc T (a - b)
      for (let s = 0; s < K; s++) {
        let vr = 0,
          vi = 0;
        for (let n = 0; n < K; n++) {
          const t = [d.T.re[s * K + n], d.T.im[s * K + n]];
          const v = cmul(t, ab[n][0]);
          vr += v[0];
          vi += v[1];
        }
        Vm.re[(termOff[r] + s) * nT + col] = vr;
        Vm.im[(termOff[r] + s) * nT + col] = vi;
      }
      const TaMinus = [];
      for (let s = 0; s < K; s++) {
        let cr = 0,
          ci = 0;
        for (let n = 0; n < K; n++) {
          const v = cmul([d.T.re[s * K + n], d.T.im[s * K + n]], ab[n][1]);
          cr += v[0];
          ci += v[1];
        }
        TaMinus.push([cr, ci]);
      }
      for (let s = 0; s < K; s++) {
        let cr = 0,
          ci = 0;
        for (let n = 0; n < K; n++) {
          const v = cmul([d.Yc.re[s * K + n], d.Yc.im[s * K + n]], TaMinus[n]);
          cr += v[0];
          ci += v[1];
        }
        Im.re[(termOff[r] + s) * nT + col] = cr;
        Im.im[(termOff[r] + s) * nT + col] = ci;
      }
    });
  });
  const Zt = cmatMul(Vm, cmatInv(Im));
  const zNative = pm.flatMap((d) => d.zNative);
  const S = zToS(Zt, zNative);
  return {
    f,
    S,
    Z: Zt,
    zref: zNative,
    terminals: P.ports.flatMap((pt, i) => pm[i].modes.map((_, k) => `${pt.name}:${pt.mode.signal ? (Array.isArray(pt.mode.signal) ? pt.mode.signal[k] : pt.mode.signal) : 'te10'}`)),
    ports: P.ports.map((pt, i) => ({
      name: pt.name,
      K: pm[i].K,
      beta: pm[i].modes[0].beta,
      betas: pm[i].modes.map((m) => m.beta),
      Z0: [pm[i].zNative[0], 0],
      C: pm[i].C ? [pm[i].C.re[0], pm[i].C.im[0]] : null,
      C0: pm[i].C0 ? pm[i].C0.re[0] : null,
      Cmat: pm[i].C ? pm[i].C.toArray() : null,
      C0mat: pm[i].C0 ? pm[i].C0.toArray() : null,
      fullwave: pm[i].fullwave ?? null,
    })),
    timing: { assemble_ms: tAs - t0, factor_ms: tF - tAs, solve_ms: now() - tF, total_ms: now() - t0, nPerturbed: fac.nPerturbed },
  };
}

function entry(pat, i, j) {
  let lo = pat.rowptr[i],
    hi = pat.rowptr[i + 1] - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const c = pat.colidx[m];
    if (c === j) return m;
    if (c < j) lo = m + 1;
    else hi = m - 1;
  }
  throw new Error('em3d: pattern entry missing');
}
