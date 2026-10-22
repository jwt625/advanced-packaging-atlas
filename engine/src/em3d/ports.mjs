// Wave ports for the 3D EM block solver (lane L7, E6 phase 2): port-face data, quasi-TEM multi-mode port modes from
// 2D electrostatics on the port-face triangles, analytic TE10, and a full-wave 2D port eigenmode (Lee-Sun-Cendes
// Nedelec + P1 formulation) on the same face triangles. License: GPL-3.0-or-later.
//
// A port mode m carries an E shape e_m and an H shape q_m (in E units: q = (w mu0 / beta) n x h_t, n the outward
// normal), both as Whitney edge vectors on the port edges, a propagation constant beta_m (gamma = j beta) and a
// norm N_m = e_m^T M q_m. Terminal mapping: terminal voltages V = T (a + b), currents into the block I = Yc T (a - b).
//   quasi-TEM, K signals: e_i = -grad phi_i (dielectric), q_i = -grad phi0_i (vacuum), phi = 1 V on signal i;
//     C V = lambda C0 V (C, C0 terminal capacitance matrices), beta_m = k0 sqrt(lambda_m), e_m = sum_i V_mi e_i,
//     q_m = sum_i V_mi q_i (the H field of mode m is the vacuum field of the same modal voltage vector because the
//     modal current is I_m = C0 beta_m V_m / (w mu0 eps0) for L = mu0 eps0 C0^-1); Yc = C0 T diag(beta) T^-1 /
//     (w mu0 eps0). Modes are C0-orthogonal, so e_m^T M q_n = 0 for m != n (Green's identity on the face).
//   TE10: e = q = v-hat sin(pi (u - u0)/a), beta = sqrt(k0^2 eps_r - (pi/a)^2), Yc = beta N / (w mu0).
//   full-wave (single signal): A x = -beta^2 B x with A = int curl N . curl N - k0^2 eps N . N, B_tt = int N . N,
//     B_tz = int N . grad L, B_zz = int grad L . grad L - k0^2 eps L L (x = [e_t; e_z], E_z = j beta e_z), solved by
//     shift-invert inverse iteration from the quasi-TEM beta^2; q = e_t + grad_t e_z; scaled so that its projection on
//     the quasi-TEM 1 V mode is 1 V; Yc = beta N / (w mu0) (power-voltage impedance).

import { buildPattern, triangleSlots, buildElementPattern, elementSlots, analyze } from '../la/sparse.mjs';
import { ComplexSupernodalLDLT } from '../la/ldlt.mjs';
import { restrictPattern } from '../em2d/fe.mjs';
import { faceMass, FACE_EDGES } from './elements.mjs';
import { triTables, evalBilinearReal, gradGram2d, curlGram2d, triSurfaceGrads, TRI_QUAD, evalVector } from './hcurl.mjs';
import { C0, MU0, EPS0 } from '../em2d/closed-forms.mjs';
import { CMat, cmatEig, cmatInv, cmatMul } from '../em2d/dense.mjs';

const fail = (m) => {
  throw new Error(`em3d port: ${m}`);
};
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
export const AXIS = { xmin: 0, xmax: 0, ymin: 1, ymax: 1, zmin: 2, zmax: 2 };
const SIDES = ['xmin', 'xmax', 'ymin', 'ymax', 'zmin', 'zmax'];

/** Port face: triangles, port edges, node-local 2D problem, signal assignment. */
export function preparePort(mesh, pt, faces, ctx) {
  if (!faces.length) fail(`${pt.name}: no boundary faces on side ${pt.side}`);
  const { nodes } = mesh;
  const ax = AXIS[pt.side];
  const [u, v] = [0, 1, 2].filter((d) => d !== ax);
  const order = ctx.space?.order ?? 1;
  // port DOFs (lane L22): order 1 = the face edges (unchanged); order 2 = Whitney, gradient and face DOFs of the face
  const edgeSet = new Set();
  const tris = faces.map((f) => {
    const T = order === 1 ? faceMass(nodes, f).T : ctx.faceT(f);
    const e = order === 1 ? FACE_EDGES.map(([i, j]) => ctx.edgeOf(f[i], f[j])) : Array.from(ctx.space.faceDofs(f));
    e.forEach((x) => edgeSet.add(x));
    return { v: f, T, e };
  });
  const edges = Int32Array.from([...edgeSet].sort((a, b) => a - b));
  const eLoc = new Map(Array.from(edges, (e, k) => [e, k]));
  for (const t of tris) t.r = t.e.map((e) => eLoc.get(e));
  const mode = pt.mode ?? { type: 'tem' };
  const out = { name: pt.name, side: pt.side, ax, u, v, tris, edges, dofs: edges, eLoc, mode, order, nE: ctx.space?.nEdges ?? mesh.nEdges, deembed: (pt.deembed_um ?? 0) * 1e-6, edgeFree: Uint8Array.from(edges, (e) => (ctx.free[e] ? 1 : 0)) };
  if (mode.type === 'te10') return out;
  if (mode.type !== 'tem' && mode.type !== 'fullwave') fail(`${pt.name}: mode type ${mode.type} (tem | fullwave | te10)`);
  const sigNames = Array.isArray(mode.signal) ? mode.signal : [mode.signal];
  if (mode.type === 'fullwave' && sigNames.length !== 1) fail(`${pt.name}: fullwave ports take one signal conductor (multi-mode full-wave ports not implemented)`);
  const sig = sigNames.map((n) => {
    const i = mesh.solids.findIndex((s) => s.name === n);
    if (i < 0) fail(`${pt.name}: signal conductor ${n} not found`);
    return i;
  });
  const loc = new Map();
  const gl = [];
  for (const t of tris) for (const n of t.v) if (!loc.has(n)) loc.set(n, gl.push(n) - 1);
  const nn = gl.length;
  const tri = new Int32Array(3 * tris.length);
  tris.forEach((t, k) => t.v.forEach((n, i) => (tri[3 * k + i] = loc.get(n))));
  const triMat = new Int32Array(tris.length).fill(-1);
  const want = new Map(tris.map((t, k) => [t.v.join(','), k]));
  for (let e = 0; e < mesh.nTets; e++) {
    if (!ctx.domain[e]) continue;
    const q = mesh.tets.subarray(4 * e, 4 * e + 4);
    for (const [i, j, k] of [
      [0, 1, 2],
      [0, 1, 3],
      [0, 2, 3],
      [1, 2, 3],
    ]) {
      const key = `${q[i]},${q[j]},${q[k]}`;
      if (want.has(key)) triMat[want.get(key)] = ctx.tetMat[e];
    }
  }
  let pecBits = 0;
  for (const s of SIDES) if (ctx.bc[s] === 'pec') pecBits |= ctx.sideBit(s);
  const fixed = new Uint8Array(nn),
    sigOf = new Int8Array(nn).fill(-1);
  gl.forEach((n, i) => {
    const c = ctx.nodeCond[n];
    if (c >= 0) {
      fixed[i] = 1;
      sigOf[i] = sig.indexOf(c);
    } else if (ctx.nodeSide[n] & pecBits) fixed[i] = 1;
  });
  sig.forEach((s, k) => {
    if (!sigOf.some((x) => x === k)) fail(`${pt.name}: signal conductor ${mesh.solids[s].name} does not reach the port face`);
  });
  // 2D geometry per triangle in face coordinates (metres)
  const pat = buildPattern(nn, tri);
  const slots = triangleSlots(pat, tri);
  const Ke = new Float64Array(9 * tris.length),
    G2 = new Float64Array(6 * tris.length),
    Ar = new Float64Array(tris.length);
  for (let k = 0; k < tris.length; k++) {
    const P = [0, 1, 2].map((i) => [nodes[3 * gl[tri[3 * k + i]] + u], nodes[3 * gl[tri[3 * k + i]] + v]]);
    const a2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    const gx = [(P[1][1] - P[2][1]) / a2, (P[2][1] - P[0][1]) / a2, (P[0][1] - P[1][1]) / a2];
    const gy = [(P[2][0] - P[1][0]) / a2, (P[0][0] - P[2][0]) / a2, (P[1][0] - P[0][0]) / a2];
    const A = Math.abs(a2) / 2;
    Ar[k] = A;
    for (let i = 0; i < 3; i++) {
      G2[6 * k + 2 * i] = gx[i];
      G2[6 * k + 2 * i + 1] = gy[i];
    }
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) Ke[9 * k + 3 * a + b] = A * (gx[a] * gx[b] + gy[a] * gy[b]);
  }
  // edge endpoints (local node indices, a < b by global index); order 2: kind per port DOF (0 Whitney, 1 gradient,
  // 2 face), and the H1-P2 face problem (vertices [0, nn), edge bubbles [nn, nn + nb))
  const eA = new Int32Array(edges.length).fill(-1),
    eB = new Int32Array(edges.length).fill(-1);
  const nE = out.nE;
  const edgeOfDof = (d) => (order === 1 ? d : d < nE ? d : d < 2 * nE ? d - nE : -1);
  edges.forEach((d, k) => {
    const e = edgeOfDof(d);
    if (e < 0) return;
    eA[k] = loc.get(mesh.edges[2 * e]);
    eB[k] = loc.get(mesh.edges[2 * e + 1]);
  });
  const stat = { nh: nn, h1elem: tri, nloc: 3, pat, slots, Ke, fixed };
  if (order === 2) {
    // bubbles on the port edges (Whitney DOFs < nE)
    const bub = new Map();
    for (const d of edges) if (d < nE) bub.set(d, nn + bub.size);
    const nb = bub.size;
    const nh = nn + nb;
    const h1elem = new Int32Array(6 * tris.length);
    tris.forEach((t, k) => {
      for (let i = 0; i < 3; i++) h1elem[6 * k + i] = tri[3 * k + i];
      for (let i = 0; i < 3; i++) h1elem[6 * k + 3 + i] = bub.get(t.e[i]);
    });
    const fixedH = new Uint8Array(nh);
    fixedH.set(fixed);
    for (const [e, b] of bub) {
      const a0 = mesh.edges[2 * e],
        b0 = mesh.edges[2 * e + 1];
      if (ctx.edgeOnCond[e] || ctx.nodeSide[a0] & ctx.nodeSide[b0] & pecBits) fixedH[b] = 1;
    }
    const patH = buildElementPattern(nh, h1elem, 6);
    const slotsH = elementSlots(patH, h1elem, 6);
    const TT = triTables(2);
    const KeH = new Float64Array(36 * tris.length);
    const tmp = new Float64Array(36);
    for (let k = 0; k < tris.length; k++) {
      const g = Float64Array.from([G2[6 * k], G2[6 * k + 1], G2[6 * k + 2], G2[6 * k + 3], G2[6 * k + 4], G2[6 * k + 5]]);
      evalBilinearReal(TT.h1Stiff, gradGram2d(g), Ar[k], tmp);
      KeH.set(tmp, 36 * k);
    }
    const kind = Uint8Array.from(edges, (d) => (d < nE ? 0 : d < 2 * nE ? 1 : 2));
    const bubOf = Int32Array.from(edges, (d) => (d < nE ? -1 : d < 2 * nE ? bub.get(d - nE) ?? -1 : -1));
    Object.assign(stat, { nh, h1elem, nloc: 6, pat: patH, slots: slotsH, Ke: KeH, fixed: fixedH, kind, bubOf, bub });
  }
  stat.fr = restrictPattern(stat.pat, Uint8Array.from(stat.fixed, (f) => (f ? 0 : 1)));
  stat.fsym = analyze(stat.fr.pat);
  Object.assign(out, { sig, sigOf, gl, tri, triMat, fixed, pat, slots, Ke, G2, Ar, eA, eB, stat, cache: null });
  return out;
}

/** M x over the port DOFs (complex vectors as [re, im] Float64Arrays). */
export function portMass(port, x) {
  const n = port.edges.length;
  const yr = new Float64Array(n),
    yi = new Float64Array(n);
  const nl = port.order === 2 ? 8 : 3;
  for (const t of port.tris)
    for (let a = 0; a < nl; a++)
      for (let b = 0; b < nl; b++) {
        const T = t.T[nl * a + b];
        yr[t.r[a]] += T * x[0][t.r[b]];
        yi[t.r[a]] += T * x[1][t.r[b]];
      }
  return [yr, yi];
}
const dot = (x, y) => {
  let sr = 0,
    si = 0;
  for (let i = 0; i < x[0].length; i++) {
    sr += x[0][i] * y[0][i] - x[1][i] * y[1][i];
    si += x[0][i] * y[1][i] + x[1][i] * y[0][i];
  }
  return [sr, si];
};

/** Electrostatic solves on the port face: phi_k (eps) and phi0_k (vacuum) per signal, terminal C and C0. */
function faceStatics(P, port, f) {
  const epsList = P.matKeys.map((k) => P.p.materials[k].epsAt(f));
  const key = epsList.map((e) => `${e.re},${e.im}`).join(';');
  if (port.cache && port.cache.key === key) return port.cache;
  const st = port.stat; // order 1: P1 on the face nodes; order 2: hierarchical P2 (vertices + edge bubbles)
  const n = st.nh,
    nn = port.gl.length,
    nl2 = st.nloc * st.nloc,
    K = port.sig.length;
  const solveSet = (eps) => {
    const nnz = st.pat.nnz;
    const re = new Float64Array(nnz),
      im = new Float64Array(nnz);
    for (let k = 0; k < port.triMat.length; k++) {
      const e = eps[port.triMat[k]];
      for (let q = 0; q < nl2; q++) {
        re[st.slots[nl2 * k + q]] += e.re * st.Ke[nl2 * k + q];
        im[st.slots[nl2 * k + q]] += e.im * st.Ke[nl2 * k + q];
      }
    }
    const fr = st.fr;
    const rr = new Float64Array(fr.pat.nnz),
      ri = new Float64Array(fr.pat.nnz);
    for (let q = 0; q < rr.length; q++) {
      rr[q] = re[fr.src[q]];
      ri[q] = im[fr.src[q]];
    }
    const fac = new ComplexSupernodalLDLT(st.fsym);
    fac.factor(rr, ri);
    const phis = [];
    const C = new CMat(K);
    for (let s = 0; s < K; s++) {
      // fixed values: 1 V on the vertices of signal s, 0 elsewhere (bubbles of fixed edges are 0)
      const val = new Float64Array(n);
      for (let i = 0; i < nn; i++) if (port.sigOf[i] === s) val[i] = 1;
      const br = new Float64Array(fr.nf),
        bi = new Float64Array(fr.nf);
      for (let i = 0; i < n; i++) {
        if (fr.map[i] < 0) continue;
        for (let q = st.pat.rowptr[i]; q < st.pat.rowptr[i + 1]; q++) {
          const j = st.pat.colidx[q];
          if (val[j]) {
            br[fr.map[i]] -= re[q];
            bi[fr.map[i]] -= im[q];
          }
        }
      }
      const sol = fac.solve(br, bi);
      const pr = new Float64Array(n),
        pi = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        if (fr.map[i] >= 0) {
          pr[i] = sol.re[fr.map[i]];
          pi[i] = sol.im[fr.map[i]];
        } else pr[i] = val[i];
      }
      phis.push([pr, pi]);
      // charge on each signal: rows of the signal vertices of K phi
      for (let t = 0; t < K; t++) {
        let qr = 0,
          qi = 0;
        for (let i = 0; i < nn; i++) {
          if (port.sigOf[i] !== t) continue;
          for (let q = st.pat.rowptr[i]; q < st.pat.rowptr[i + 1]; q++) {
            const j = st.pat.colidx[q];
            qr += re[q] * pr[j] - im[q] * pi[j];
            qi += re[q] * pi[j] + im[q] * pr[j];
          }
        }
        C.re[t * K + s] = EPS0 * qr;
        C.im[t * K + s] = EPS0 * qi;
      }
    }
    return { phis, C };
  };
  const a = solveSet(epsList);
  const v = solveSet(epsList.map(() => ({ re: 1, im: 0 })));
  // e = -grad phi on the port DOFs: Whitney phi_a - phi_b; order 2: gradient DOF -c (bubble), face DOFs 0
  const edgeVec = (phi) => {
    const m = port.edges.length;
    const er = new Float64Array(m),
      ei = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      if (port.order === 2 && st.kind[k] !== 0) {
        if (st.kind[k] === 1) {
          er[k] = -phi[0][st.bubOf[k]];
          ei[k] = -phi[1][st.bubOf[k]];
        }
        continue;
      }
      er[k] = phi[0][port.eA[k]] - phi[0][port.eB[k]];
      ei[k] = phi[1][port.eA[k]] - phi[1][port.eB[k]];
    }
    return [er, ei];
  };
  port.cache = { key, eps: epsList, C: a.C, C0: v.C, e: a.phis.map(edgeVec), q: v.phis.map(edgeVec), phi: a.phis, phi0: v.phis };
  return port.cache;
}

/**
 * Port modes at frequency f. Returns {K, modes: [{beta, e, q, N}], T (CMat K x K, columns = modal voltages),
 * Yc (CMat), zNative (Re of diag(Yc^-1), per terminal)}.
 */
export function portModes(P, port, f) {
  const w = 2 * Math.PI * f,
    k0 = w / C0;
  if (port.mode.type === 'te10') return te10Modes(P, port, f);
  const st = faceStatics(P, port, f);
  const K = port.sig.length;
  // generalized eigenproblem C V = lambda C0 V
  const C0i = cmatInv(st.C0);
  const eig = cmatEig(cmatMul(C0i, st.C));
  const T = eig.vectors.clone();
  const modes = [];
  for (let m = 0; m < K; m++) {
    const sq = csqrt([eig.values.re[m], eig.values.im[m]]);
    const beta = [k0 * sq[0], k0 * sq[1]];
    const comb = (list) => {
      const r = new Float64Array(port.edges.length),
        i = new Float64Array(port.edges.length);
      for (let s = 0; s < K; s++) {
        const c = [T.re[s * K + m], T.im[s * K + m]];
        for (let k = 0; k < r.length; k++) {
          r[k] += c[0] * list[s][0][k] - c[1] * list[s][1][k];
          i[k] += c[0] * list[s][1][k] + c[1] * list[s][0][k];
        }
      }
      return [r, i];
    };
    const e = comb(st.e),
      q = comb(st.q);
    modes.push({ beta, e, q, N: dot(e, portMass(port, q)) });
  }
  // Yc = C0 T diag(beta) T^-1 / (w mu0 eps0)
  const B = new CMat(K);
  modes.forEach((md, m) => {
    B.re[m * K + m] = md.beta[0] / (w * MU0 * EPS0);
    B.im[m * K + m] = md.beta[1] / (w * MU0 * EPS0);
  });
  const Yc = cmatMul(cmatMul(st.C0, cmatMul(T, B)), cmatInv(T));
  if (port.mode.type === 'fullwave') return fullwaveModes(P, port, f, modes[0], st);
  const Zc = cmatInv(Yc);
  return { K, modes, T, Yc, zNative: Array.from({ length: K }, (_, i) => Zc.re[i * K + i]), C: st.C, C0: st.C0 };
}

function te10Modes(P, port, f) {
  const { nodes } = P.mesh;
  const uMin = Math.min(...port.tris.flatMap((t) => t.v.map((n) => nodes[3 * n + port.u])));
  const uMax = Math.max(...port.tris.flatMap((t) => t.v.map((n) => nodes[3 * n + port.u])));
  const a = uMax - uMin;
  const er = port.mode.eps_r ?? 1;
  const w = 2 * Math.PI * f,
    k0 = w / C0;
  const b2 = k0 * k0 * er - (Math.PI / a) ** 2;
  const beta = b2 >= 0 ? [Math.sqrt(b2), 0] : [0, -Math.sqrt(-b2)];
  const GL = [
    [0.5 - Math.sqrt(15) / 10, 5 / 18],
    [0.5, 8 / 18],
    [0.5 + Math.sqrt(15) / 10, 5 / 18],
  ];
  const m = port.edges.length;
  if (port.order === 2) {
    // order 2 (lane L22): L2 projection of v-hat sin(pi (u - u0) / a) on the free port trace DOFs
    const e = te10Project(P, port, a, uMin);
    const N = dot(e, portMass(port, e));
    const y = cdiv(cmul(beta, N), [w * MU0, 0]);
    const Yc = new CMat(1);
    Yc.re[0] = y[0];
    Yc.im[0] = y[1];
    return { K: 1, modes: [{ beta, e, q: e, N }], T: CMat.eye(1), Yc, zNative: [cdiv([1, 0], y)[0]] };
  }
  const er2 = new Float64Array(m);
  port.edges.forEach((e, k) => {
    const A = P.mesh.edges[2 * e],
      B = P.mesh.edges[2 * e + 1];
    const du = nodes[3 * B + port.u] - nodes[3 * A + port.u],
      dv = nodes[3 * B + port.v] - nodes[3 * A + port.v];
    let s = 0;
    for (const [x, wq] of GL) s += wq * Math.sin((Math.PI * (nodes[3 * A + port.u] + x * du - uMin)) / a);
    er2[k] = s * dv;
  });
  const e = [er2, new Float64Array(m)];
  const N = dot(e, portMass(port, e));
  const y = cdiv(cmul(beta, N), [w * MU0, 0]);
  const Yc = new CMat(1);
  Yc.re[0] = y[0];
  Yc.im[0] = y[1];
  const T = CMat.eye(1);
  return { K: 1, modes: [{ beta, e, q: e, N }], T, Yc, zNative: [cdiv([1, 0], y)[0]] };
}

/** Solve M x = b on the free port DOFs (M = port trace mass, SPD) by Jacobi-preconditioned CG to round-off. */
function portMassSolve(port, b) {
  const m = port.edges.length;
  const free = port.edgeFree;
  const diag = new Float64Array(m);
  const nl = port.order === 2 ? 8 : 3;
  for (const t of port.tris) for (let a = 0; a < nl; a++) diag[t.r[a]] += t.T[nl * a + a];
  const Mv = (x) => {
    const y = portMass(port, [x, new Float64Array(m)])[0];
    for (let k = 0; k < m; k++) if (!free[k]) y[k] = 0;
    return y;
  };
  const x = new Float64Array(m),
    r = Float64Array.from(b, (v, k) => (free[k] ? v : 0));
  const z = Float64Array.from(r, (v, k) => (free[k] ? v / diag[k] : 0));
  const p = z.slice();
  let rz = r.reduce((s, v, k) => s + v * z[k], 0);
  const r0 = Math.sqrt(r.reduce((s, v) => s + v * v, 0));
  for (let it = 0; it < 4 * m + 10 && r0 > 0; it++) {
    const Ap = Mv(p);
    const al = rz / p.reduce((s, v, k) => s + v * Ap[k], 0);
    for (let k = 0; k < m; k++) {
      x[k] += al * p[k];
      r[k] -= al * Ap[k];
    }
    if (Math.sqrt(r.reduce((s, v) => s + v * v, 0)) < 1e-15 * r0) break;
    for (let k = 0; k < m; k++) z[k] = free[k] ? r[k] / diag[k] : 0;
    const rz1 = r.reduce((s, v, k) => s + v * z[k], 0);
    const be = rz1 / rz;
    rz = rz1;
    for (let k = 0; k < m; k++) p[k] = z[k] + be * p[k];
  }
  return x;
}

/** Order-2 TE10 port vector: L2 projection of v-hat sin(pi (u - uMin) / a) (16-point triangle rule per face). */
function te10Project(P, port, a, uMin) {
  const { nodes } = P.mesh;
  const TT = triTables(2);
  const rhs = new Float64Array(port.edges.length);
  const vec = new Float64Array(3);
  for (const t of port.tris) {
    const X = t.v.map((q) => [nodes[3 * q], nodes[3 * q + 1], nodes[3 * q + 2]]);
    const { g, area } = triSurfaceGrads(X);
    for (const [l, wq] of TRI_QUAD) {
      const uu = l[0] * X[0][port.u] + l[1] * X[1][port.u] + l[2] * X[2][port.u];
      const s = Math.sin((Math.PI * (uu - uMin)) / a) * wq * area;
      for (let i = 0; i < 8; i++) {
        evalVector(TT.basis[i], l, g, 3, vec);
        rhs[t.r[i]] += vec[port.v] * s;
      }
    }
  }
  return [portMassSolve(port, rhs), new Float64Array(rhs.length)];
}

/** Full-wave single-mode port eigenmode (see header), starting from the quasi-TEM mode qs. */
function fullwaveModes(P, port, f, qs, st) {
  if (port.order === 2) return fullwaveModes2(P, port, f, qs, st);
  const w = 2 * Math.PI * f,
    k0 = w / C0,
    k02 = k0 * k0;
  const nE = port.edges.length,
    nN = port.gl.length;
  // DOFs: free port edges (3D free) then free nodes (not on conductors / pec sides)
  const eMap = new Int32Array(nE).fill(-1),
    nMap = new Int32Array(nN).fill(-1);
  let nd = 0;
  for (let k = 0; k < nE; k++) if (port.edgeFree[k]) eMap[k] = nd++;
  const nEf = nd;
  for (let i = 0; i < nN; i++) if (!port.fixed[i]) nMap[i] = nd++;
  if (!port.fw) {
    const elem = new Int32Array(6 * port.tris.length);
    const dummy = nd; // fixed DOFs map to a dummy index (dropped by restriction)
    port.tris.forEach((t, k) => {
      for (let a = 0; a < 3; a++) {
        elem[6 * k + a] = eMap[t.r[a]] >= 0 ? eMap[t.r[a]] : dummy;
        elem[6 * k + 3 + a] = nMap[port.tri[3 * k + a]] >= 0 ? nMap[port.tri[3 * k + a]] : dummy;
      }
    });
    const pat = buildElementPattern(nd + 1, elem, 6);
    const R = restrictPattern(pat, Uint8Array.from({ length: nd + 1 }, (_, i) => (i < nd ? 1 : 0)));
    port.fw = { elem, pat, R, sym: analyze(R.pat), slots: elementSlots(pat, elem, 6), nd };
  }
  const { pat, R, sym, slots } = port.fw;
  const nnz = pat.nnz;
  const Ar = new Float64Array(nnz),
    Ai = new Float64Array(nnz),
    Br = new Float64Array(nnz),
    Bi = new Float64Array(nnz);
  const LP = FACE_EDGES;
  port.tris.forEach((t, k) => {
    const eps = st.eps[port.triMat[k]];
    const A = port.Ar[k];
    const g = (i) => [port.G2[6 * k + 2 * i], port.G2[6 * k + 2 * i + 1]];
    const curl = LP.map(([i, j]) => {
      const gi = g(i),
        gj = g(j);
      return 2 * (gi[0] * gj[1] - gi[1] * gj[0]);
    });
    const add = (arr, ai, a, b, re, im) => {
      const sl = slots[36 * k + 6 * a + b];
      arr[sl] += re;
      ai[sl] += im;
    };
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        const Tm = t.T[3 * a + b];
        // A_tt = int curl curl - k0^2 eps N.N ; B_tt = int N.N
        add(Ar, Ai, a, b, A * curl[a] * curl[b] - k02 * eps.re * Tm, -k02 * eps.im * Tm);
        add(Br, Bi, a, b, Tm, 0);
        // B_tz(edge a, node b) = int N_a . grad L_b = (A/3)(g_j . g_b - g_i . g_b)
        const [i, j] = LP[a];
        const gb = g(b),
          gi = g(i),
          gj = g(j);
        const btz = (A / 3) * (gj[0] * gb[0] + gj[1] * gb[1] - gi[0] * gb[0] - gi[1] * gb[1]);
        add(Br, Bi, a, 3 + b, btz, 0);
        add(Br, Bi, 3 + b, a, btz, 0);
        // B_zz = int grad L grad L - k0^2 eps L L
        const kzz = port.Ke[9 * k + 3 * a + b];
        const mzz = (A / 12) * (a === b ? 2 : 1);
        add(Br, Bi, 3 + a, 3 + b, kzz - k02 * eps.re * mzz, -k02 * eps.im * mzz);
      }
  });
  const restrict = (vr, vi) => {
    const r = new Float64Array(R.pat.nnz),
      i = new Float64Array(R.pat.nnz);
    for (let q = 0; q < r.length; q++) {
      r[q] = vr[R.src[q]];
      i[q] = vi[R.src[q]];
    }
    return [r, i];
  };
  const [aR, aI] = restrict(Ar, Ai),
    [bR, bI] = restrict(Br, Bi);
  const sigma = cmul(qs.beta, qs.beta);
  const kR = new Float64Array(aR.length),
    kI = new Float64Array(aR.length);
  for (let q = 0; q < aR.length; q++) {
    kR[q] = aR[q] + sigma[0] * bR[q] - sigma[1] * bI[q];
    kI[q] = aI[q] + sigma[0] * bI[q] + sigma[1] * bR[q];
  }
  const fac = new ComplexSupernodalLDLT(sym);
  fac.factor(kR, kI);
  const mv = (vr, vi, xr, xi) => {
    const yr = new Float64Array(nd),
      yi = new Float64Array(nd);
    const p = R.pat;
    for (let r = 0; r < nd; r++)
      for (let q = p.rowptr[r]; q < p.rowptr[r + 1]; q++) {
        const c = p.colidx[q];
        yr[r] += vr[q] * xr[c] - vi[q] * xi[c];
        yi[r] += vr[q] * xi[c] + vi[q] * xr[c];
      }
    return [yr, yi];
  };
  // start: quasi-TEM e_t, e_z = phi - phi0 (quasi-static limit of q = e_t + grad e_z = -grad phi0)
  let xr = new Float64Array(nd),
    xi = new Float64Array(nd);
  for (let k = 0; k < nE; k++)
    if (eMap[k] >= 0) {
      xr[eMap[k]] = qs.e[0][k];
      xi[eMap[k]] = qs.e[1][k];
    }
  for (let i = 0; i < nN; i++)
    if (nMap[i] >= 0) {
      xr[nMap[i]] = st.phi[0][0][i] - st.phi0[0][0][i];
      xi[nMap[i]] = st.phi[0][1][i] - st.phi0[0][1][i];
    }
  let lam = sigma,
    it = 0,
    dl = Infinity;
  for (; it < 30; it++) {
    const [br, bi] = mv(bR, bI, xr, xi);
    const y = fac.solve(br, bi);
    let nrm = 0;
    for (let q = 0; q < nd; q++) nrm = Math.max(nrm, Math.hypot(y.re[q], y.im[q]));
    xr = y.re.map((v) => v / nrm);
    xi = y.im.map((v) => v / nrm);
    const ax = mv(aR, aI, xr, xi),
      bx = mv(bR, bI, xr, xi);
    const num = dot([xr, xi], ax),
      den = dot([xr, xi], bx);
    const nl = cdiv([-num[0], -num[1]], den);
    dl = Math.hypot(nl[0] - lam[0], nl[1] - lam[1]) / Math.hypot(nl[0], nl[1]);
    lam = nl;
    if (dl < 1e-12) break;
  }
  const beta = csqrt(lam);
  // edge e_t and q = e_t + grad e_z on all port edges (fixed DOFs = 0)
  const ez = [new Float64Array(nN), new Float64Array(nN)];
  for (let i = 0; i < nN; i++)
    if (nMap[i] >= 0) {
      ez[0][i] = xr[nMap[i]];
      ez[1][i] = xi[nMap[i]];
    }
  let e = [new Float64Array(nE), new Float64Array(nE)];
  let q = [new Float64Array(nE), new Float64Array(nE)];
  for (let k = 0; k < nE; k++) {
    if (eMap[k] >= 0) {
      e[0][k] = xr[eMap[k]];
      e[1][k] = xi[eMap[k]];
    }
    q[0][k] = e[0][k] + ez[0][port.eB[k]] - ez[0][port.eA[k]];
    q[1][k] = e[1][k] + ez[1][port.eB[k]] - ez[1][port.eA[k]];
  }
  // scale: projection on the quasi-TEM 1 V mode equals 1 V
  const Mq0 = portMass(port, qs.q);
  const V = cdiv(dot(e, Mq0), dot(qs.e, Mq0));
  const sc = cdiv([1, 0], V);
  const scale = (x) => {
    const r = new Float64Array(nE),
      i = new Float64Array(nE);
    for (let k = 0; k < nE; k++) {
      const v = cmul(sc, [x[0][k], x[1][k]]);
      r[k] = v[0];
      i[k] = v[1];
    }
    return [r, i];
  };
  e = scale(e);
  q = scale(q);
  const N = dot(e, portMass(port, q));
  const y = cdiv(cmul(beta, N), [w * MU0, 0]);
  const Yc = new CMat(1);
  Yc.re[0] = y[0];
  Yc.im[0] = y[1];
  return { K: 1, modes: [{ beta, e, q, N }], T: CMat.eye(1), Yc, zNative: [cdiv([1, 0], y)[0]], C: st.C, C0: st.C0, fullwave: { iterations: it, rel_change: dl, beta_qtem: qs.beta } };
}

/**
 * Order-2 full-wave port eigenmode (lane L22): Lee-Sun-Cendes with the order-2 Nedelec trace (8 per triangle) for e_t
 * and hierarchical P2 (6 per triangle) for e_z, same pencil and inverse iteration as the order-1 version above.
 */
function fullwaveModes2(P, port, f, qs, st) {
  const w = 2 * Math.PI * f,
    k0 = w / C0,
    k02 = k0 * k0;
  const S = port.stat;
  const nE = port.edges.length,
    nH = S.nh;
  const eMap = new Int32Array(nE).fill(-1),
    nMap = new Int32Array(nH).fill(-1);
  let nd = 0;
  for (let k = 0; k < nE; k++) if (port.edgeFree[k]) eMap[k] = nd++;
  for (let i = 0; i < nH; i++) if (!S.fixed[i]) nMap[i] = nd++;
  const TT = triTables(2);
  if (!port.fw) {
    const elem = new Int32Array(14 * port.tris.length);
    const dummy = nd;
    port.tris.forEach((t, k) => {
      for (let a = 0; a < 8; a++) elem[14 * k + a] = eMap[t.r[a]] >= 0 ? eMap[t.r[a]] : dummy;
      for (let a = 0; a < 6; a++) {
        const h = S.h1elem[6 * k + a];
        elem[14 * k + 8 + a] = nMap[h] >= 0 ? nMap[h] : dummy;
      }
    });
    const pat = buildElementPattern(nd + 1, elem, 14);
    const R = restrictPattern(pat, Uint8Array.from({ length: nd + 1 }, (_, i) => (i < nd ? 1 : 0)));
    port.fw = { elem, pat, R, sym: analyze(R.pat), slots: elementSlots(pat, elem, 14), nd };
  }
  const { pat, R, sym, slots } = port.fw;
  const nnz = pat.nnz;
  const Ar = new Float64Array(nnz),
    Ai = new Float64Array(nnz),
    Br = new Float64Array(nnz),
    Bi = new Float64Array(nnz);
  const curlE = new Float64Array(64),
    mix = new Float64Array(48),
    kzz = new Float64Array(36),
    mzz = new Float64Array(36);
  port.tris.forEach((t, k) => {
    const eps = st.eps[port.triMat[k]];
    const A = port.Ar[k];
    const g = Float64Array.from([port.G2[6 * k], port.G2[6 * k + 1], port.G2[6 * k + 2], port.G2[6 * k + 3], port.G2[6 * k + 4], port.G2[6 * k + 5]]);
    evalBilinearReal(TT.curl, curlGram2d(g), A, curlE);
    const D = gradGram2d(g);
    evalBilinearReal(TT.mixed, D, A, mix);
    evalBilinearReal(TT.h1Stiff, D, A, kzz);
    evalBilinearReal(TT.h1Mass, [1], A, mzz);
    const add = (arr, ai, a, b, re, im) => {
      const sl = slots[196 * k + 14 * a + b];
      arr[sl] += re;
      ai[sl] += im;
    };
    for (let a = 0; a < 8; a++)
      for (let b = 0; b < 8; b++) {
        const Tm = t.T[8 * a + b];
        add(Ar, Ai, a, b, curlE[8 * a + b] - k02 * eps.re * Tm, -k02 * eps.im * Tm);
        add(Br, Bi, a, b, Tm, 0);
      }
    for (let a = 0; a < 8; a++)
      for (let b = 0; b < 6; b++) {
        add(Br, Bi, a, 8 + b, mix[6 * a + b], 0);
        add(Br, Bi, 8 + b, a, mix[6 * a + b], 0);
      }
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) add(Br, Bi, 8 + a, 8 + b, kzz[6 * a + b] - k02 * eps.re * mzz[6 * a + b], -k02 * eps.im * mzz[6 * a + b]);
  });
  const restrict = (vr, vi) => {
    const r = new Float64Array(R.pat.nnz),
      i = new Float64Array(R.pat.nnz);
    for (let q = 0; q < r.length; q++) {
      r[q] = vr[R.src[q]];
      i[q] = vi[R.src[q]];
    }
    return [r, i];
  };
  const [aR, aI] = restrict(Ar, Ai),
    [bR, bI] = restrict(Br, Bi);
  const sigma = cmul(qs.beta, qs.beta);
  const kR = new Float64Array(aR.length),
    kI = new Float64Array(aR.length);
  for (let q = 0; q < aR.length; q++) {
    kR[q] = aR[q] + sigma[0] * bR[q] - sigma[1] * bI[q];
    kI[q] = aI[q] + sigma[0] * bI[q] + sigma[1] * bR[q];
  }
  const fac = new ComplexSupernodalLDLT(sym);
  fac.factor(kR, kI);
  const mv = (vr, vi, xr, xi) => {
    const yr = new Float64Array(nd),
      yi = new Float64Array(nd);
    const p = R.pat;
    for (let r = 0; r < nd; r++)
      for (let q = p.rowptr[r]; q < p.rowptr[r + 1]; q++) {
        const c = p.colidx[q];
        yr[r] += vr[q] * xr[c] - vi[q] * xi[c];
        yi[r] += vr[q] * xi[c] + vi[q] * xr[c];
      }
    return [yr, yi];
  };
  let xr = new Float64Array(nd),
    xi = new Float64Array(nd);
  for (let k = 0; k < nE; k++)
    if (eMap[k] >= 0) {
      xr[eMap[k]] = qs.e[0][k];
      xi[eMap[k]] = qs.e[1][k];
    }
  for (let i = 0; i < nH; i++)
    if (nMap[i] >= 0) {
      xr[nMap[i]] = st.phi[0][0][i] - st.phi0[0][0][i];
      xi[nMap[i]] = st.phi[0][1][i] - st.phi0[0][1][i];
    }
  let lam = sigma,
    it = 0,
    dl = Infinity;
  for (; it < 30; it++) {
    const [br, bi] = mv(bR, bI, xr, xi);
    const y = fac.solve(br, bi);
    let nrm = 0;
    for (let q = 0; q < nd; q++) nrm = Math.max(nrm, Math.hypot(y.re[q], y.im[q]));
    xr = y.re.map((v) => v / nrm);
    xi = y.im.map((v) => v / nrm);
    const ax = mv(aR, aI, xr, xi),
      bx = mv(bR, bI, xr, xi);
    const num = dot([xr, xi], ax),
      den = dot([xr, xi], bx);
    const nl = cdiv([-num[0], -num[1]], den);
    dl = Math.hypot(nl[0] - lam[0], nl[1] - lam[1]) / Math.hypot(nl[0], nl[1]);
    lam = nl;
    if (dl < 1e-12) break;
  }
  const beta = csqrt(lam);
  const ez = [new Float64Array(nH), new Float64Array(nH)];
  for (let i = 0; i < nH; i++)
    if (nMap[i] >= 0) {
      ez[0][i] = xr[nMap[i]];
      ez[1][i] = xi[nMap[i]];
    }
  let e = [new Float64Array(nE), new Float64Array(nE)];
  let q = [new Float64Array(nE), new Float64Array(nE)];
  for (let k = 0; k < nE; k++) {
    if (eMap[k] >= 0) {
      e[0][k] = xr[eMap[k]];
      e[1][k] = xi[eMap[k]];
    }
    // q = e_t + grad_t e_z: Whitney ez_b - ez_a, gradient DOF + bubble coefficient, face DOFs none
    let gr = 0,
      gi = 0;
    if (S.kind[k] === 0) {
      gr = ez[0][port.eB[k]] - ez[0][port.eA[k]];
      gi = ez[1][port.eB[k]] - ez[1][port.eA[k]];
    } else if (S.kind[k] === 1 && S.bubOf[k] >= 0) {
      gr = ez[0][S.bubOf[k]];
      gi = ez[1][S.bubOf[k]];
    }
    q[0][k] = e[0][k] + gr;
    q[1][k] = e[1][k] + gi;
  }
  const Mq0 = portMass(port, qs.q);
  const V = cdiv(dot(e, Mq0), dot(qs.e, Mq0));
  const sc = cdiv([1, 0], V);
  const scale = (x) => {
    const r = new Float64Array(nE),
      i = new Float64Array(nE);
    for (let k = 0; k < nE; k++) {
      const v = cmul(sc, [x[0][k], x[1][k]]);
      r[k] = v[0];
      i[k] = v[1];
    }
    return [r, i];
  };
  e = scale(e);
  q = scale(q);
  const N = dot(e, portMass(port, q));
  const y = cdiv(cmul(beta, N), [w * MU0, 0]);
  const Yc = new CMat(1);
  Yc.re[0] = y[0];
  Yc.im[0] = y[1];
  return { K: 1, modes: [{ beta, e, q, N }], T: CMat.eye(1), Yc, zNative: [cdiv([1, 0], y)[0]], C: st.C, C0: st.C0, fullwave: { iterations: it, rel_change: dl, beta_qtem: qs.beta } };
}
