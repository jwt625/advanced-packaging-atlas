// Multiconductor quasi-TEM RLGC(f) extraction on a 2D cross-section (EM 2D lane L7, tranche E5).
// License: GPL-3.0-or-later.
//
// Conventions: SI; phasor exp(+j w t); N signal conductors (config order) plus one reference group made of every
// `ground` conductor (tied) and, for `pec` box sides, the box. Matrices are N x N, row-major Float64Array.
//
// C, G (electrostatics with complex permittivity eps* = eps' - j eps''): -div(eps* grad phi) = 0 on the dielectric
//   DOFs; conductor DOFs Dirichlet (signal i = 1 V, all others 0), pec box sides phi = 0, pmc sides natural.
//   C*_ij = eps0 sum_{d in conductor j} (K* phi_i)_d (the bilinear form phi_j^T K* phi_i); C = Re C*, G = -w Im C*.
// R, L (magneto-quasi-statics with volumetric conductors, eddy currents included):
//   (1/mu0) K A + j w M_sigma A = sum_g B_g u_g, u_g = voltage drop per length of conductor group g,
//   I_g = G_g u_g - j w B_g^T A (G_g = sigma * area). Eliminating A: I = Yc u with
//   Yc = diag(G) - j w mu0 B^T (K + j w mu0 M)^-1 B. Loop impedance Z = R + j w L (signals vs reference):
//     return 'ground'         ground group carries -sum(I_signal); Z = Q Yc^-1 P (Q = [I, -1], P = [I; -1^T]);
//                             with all box sides pmc, Yc is singular (net current is zero by construction) and the
//                             reduced form Z = (Yc_ss)^-1 is used (same physics).
//     return 'box'            u_ground = 0 and the pec box (perfect conductor) takes whatever the ground does not:
//                             Z = (Yc_ss)^-1. Needed when there is no ground conductor (the box is the return).
//   Roughness: per-conductor dissipation matrices D_k = int_k J_i conj(J_j) / sigma give R = sum_k Re D_k exactly
//   (discrete power identity, reported as power_balance_rel); rough R = sum_k K_k(f) Re D_k, and with
//   roughness_reactance the same increase is added to w L (surface impedance scaled as (1 + j) R_s).
// Conductor model 'pec': R = 0, L = mu0 eps0 C0^-1 (external inductance from the vacuum capacitance).

import { analyze } from '../la/sparse.mjs';
import { makeFactor } from './ldlt-select.mjs';
import { makeSpace, triangleGeometry, assembleByTag, elementLoad, restrictPattern, cmatvec } from './fe.mjs';
import { boundaryFlags, pecMask } from './section.mjs';
import { EPS0, MU0 } from './closed-forms.mjs';
import { CMat, cmatInv, cmatMul } from './dense.mjs';
import { makeRoughness } from './roughness.mjs';

const fail = (m) => {
  throw new Error(`em2d rlgc: ${m}`);
};
const now = () => performance.now();

/**
 * Prepare the FE problem on a built section (buildSection output). Pure setup; no frequency work.
 * @param {object} sec buildSection result
 * @param {object} materials makeMaterials result
 * @param {{conductor_model?: 'volumetric'|'pec', return?: 'auto'|'ground'|'box', roughness_reactance?: boolean}} opts
 */
export function prepareRlgc(sec, materials, opts = {}) {
  const t0 = now();
  const { mesh, regions, conductors, rect, bc } = sec;
  const space = makeSpace(mesh, sec.order);
  const geo = triangleGeometry(mesh);
  const k = space.k;
  const nt = mesh.nTris;
  const condModel = opts.conductor_model ?? 'volumetric';
  if (condModel !== 'volumetric' && condModel !== 'pec') fail(`conductor_model must be volumetric or pec (got ${condModel})`);
  const signals = conductors.filter((c) => c.role === 'signal');
  const grounds = conductors.filter((c) => c.role === 'ground');
  const N = signals.length;
  const groupOf = new Int32Array(conductors.length);
  signals.forEach((c, i) => (groupOf[c.index] = i));
  grounds.forEach((c) => (groupOf[c.index] = N));
  const nGroups = N + (grounds.length ? 1 : 0);
  const pm = pecMask(bc);
  const bflag = boundaryFlags(space, rect);
  let ret = opts.return ?? 'auto';
  if (ret === 'auto') ret = grounds.length ? 'ground' : 'box';
  if (ret !== 'ground' && ret !== 'box') fail(`return must be auto, ground or box (got ${ret})`);
  if (ret === 'ground' && !grounds.length) fail('return "ground" needs at least one ground conductor');
  if (ret === 'box' && !pm) fail('return "box" needs at least one pec box side');
  if (!grounds.length && !pm) fail('no reference: add a ground conductor or a pec box side');

  // DOF -> conductor (-1 dielectric)
  const triCond = new Int32Array(nt).fill(-1);
  for (let t = 0; t < nt; t++) {
    const r = regions[mesh.triRegion[t]];
    if (r.kind === 'conductor') triCond[t] = r.cond;
  }
  const dofCond = new Int32Array(space.nDof).fill(-1);
  for (let t = 0; t < nt; t++) {
    const c = triCond[t];
    if (c < 0) continue;
    for (let a = 0; a < k; a++) {
      const d = space.elem[k * t + a];
      if (dofCond[d] >= 0 && dofCond[d] !== c) {
        if (conductors[dofCond[d]].role === 'ground' && conductors[c].role === 'ground') continue; // tied grounds may touch
        fail(`conductors ${conductors[dofCond[d]].name} and ${conductors[c].name} share a mesh node`);
      }
      dofCond[d] = c;
    }
  }
  const condDofs = conductors.map(() => new Set());
  for (let t = 0; t < nt; t++) if (triCond[t] >= 0) for (let a = 0; a < k; a++) condDofs[triCond[t]].add(space.elem[k * t + a]);
  for (let d = 0; d < space.nDof; d++) {
    const c = dofCond[d];
    if (c >= 0 && conductors[c].role === 'signal' && bflag[d] & pm) fail(`signal conductor ${conductors[c].name} touches a pec box side`);
  }

  // ---- electrostatic setup: one stiffness per dielectric material ----
  const matKeys = [];
  const triMat = new Int32Array(nt).fill(-1);
  for (let t = 0; t < nt; t++) {
    const r = regions[mesh.triRegion[t]];
    if (r.kind !== 'dielectric') continue;
    if (!materials[r.material]) fail(`material "${r.material}" (region ${r.name}) is not defined`);
    let m = matKeys.indexOf(r.material);
    if (m < 0) {
      m = matKeys.length;
      matKeys.push(r.material);
    }
    triMat[t] = m;
  }
  const { K: Kmat } = assembleByTag(space, geo, triMat, matKeys.length, { stiffness: true });
  const esFree = new Uint8Array(space.nDof);
  for (let d = 0; d < space.nDof; d++) esFree[d] = dofCond[d] < 0 && !(bflag[d] & pm) ? 1 : 0;
  const esR = restrictPattern(space.pat, esFree);
  const tA = now();
  const esSym = analyze(esR.pat);
  const esAnalyzeMs = now() - tA;

  // ---- magneto-quasi-static setup ----
  let mqs = null;
  if (condModel === 'volumetric') {
    for (const c of conductors) if (!(c.sigma_S_m > 0)) fail(`conductor ${c.name}: sigma_S_m > 0 required for the volumetric model`);
    const allTri = new Int32Array(nt); // single stiffness tag (mu_r = 1 everywhere)
    const { K: Kall } = assembleByTag(space, geo, allTri, 1, { stiffness: true });
    const sigmaOf = conductors.map((c) => c.sigma_S_m);
    const { M: Mc } = assembleByTag(space, geo, triCond, conductors.length, { stiffness: false, mass: true, coefM: sigmaOf });
    const Mtot = new Float64Array(space.pat.nnz);
    for (const m of Mc) for (let p = 0; p < m.length; p++) Mtot[p] += m[p];
    const B = Array.from({ length: nGroups }, () => new Float64Array(space.nDof));
    const Gdc = new Float64Array(nGroups);
    const fe = new Float64Array(k);
    for (let t = 0; t < nt; t++) {
      const c = triCond[t];
      if (c < 0) continue;
      const g = groupOf[c],
        s = sigmaOf[c];
      elementLoad(space, geo, t, fe);
      for (let a = 0; a < k; a++) B[g][space.elem[k * t + a]] += s * fe[a];
      Gdc[g] += s * Math.abs(geo.area[t]) * 1e-12;
    }
    const aFree = new Uint8Array(space.nDof);
    for (let d = 0; d < space.nDof; d++) aFree[d] = bflag[d] & pm ? 0 : 1;
    const aR = restrictPattern(space.pat, aFree);
    const tB = now();
    const aSym = analyze(aR.pat);
    const roughness = conductors.map((c) => makeRoughness(c.roughness));
    mqs = { K: Kall[0], Mc, Mtot, B, Gdc, aR, aSym, analyzeMs: now() - tB, roughness, sigmaOf };
  }
  return {
    sec,
    space,
    geo,
    materials,
    matKeys,
    Kmat,
    esR,
    esSym,
    esAnalyzeMs,
    mqs,
    dofCond,
    condDofs: condDofs.map((a) => Int32Array.from([...a].sort((p, q) => p - q))),
    signals,
    grounds,
    N,
    nGroups,
    groupOf,
    ret,
    pm,
    condModel,
    roughnessReactance: opts.roughness_reactance ?? true,
    factor: opts.factor,
    setupMs: now() - t0,
    stats: { dof_es: esR.nf, dof_mqs: mqs ? mqs.aR.nf : 0, nnzL_es: esSym.nnzL, nnzL_mqs: mqs ? mqs.aSym.nnzL : 0 },
    _esCache: null,
  };
}

/** Complex capacitance matrix C* (F/m) for per-material complex relative permittivities epsList[m] = {re, im}. */
function solveCapacitance(P, epsList) {
  const { space, Kmat, esR, esSym, dofCond, signals, N } = P;
  const nnz = space.pat.nnz;
  const Kre = new Float64Array(nnz),
    Kim = new Float64Array(nnz);
  epsList.forEach((e, m) => {
    const v = Kmat[m];
    for (let p = 0; p < nnz; p++) {
      Kre[p] += e.re * v[p];
      Kim[p] += e.im * v[p];
    }
  });
  const re = new Float64Array(esR.pat.nnz),
    im = new Float64Array(esR.pat.nnz);
  for (let q = 0; q < re.length; q++) {
    re[q] = Kre[esR.src[q]];
    im[q] = Kim[esR.src[q]];
  }
  const t0 = now();
  const fac = makeFactor(P.factor, esSym);
  fac.factor(re, im);
  const factorMs = now() - t0;
  const n = space.nDof;
  const Cs = new CMat(N);
  const xr = new Float64Array(n),
    xi = new Float64Array(n),
    yr = new Float64Array(n),
    yi = new Float64Array(n);
  const br = new Float64Array(esR.nf),
    bi = new Float64Array(esR.nf);
  const { map } = esR;
  for (let i = 0; i < N; i++) {
    const ci = signals[i].index;
    xr.fill(0);
    xi.fill(0);
    for (let d = 0; d < n; d++) if (dofCond[d] === ci) xr[d] = 1;
    cmatvec(space.pat, Kre, Kim, xr, xi, yr, yi);
    for (let d = 0; d < n; d++)
      if (map[d] >= 0) {
        br[map[d]] = -yr[d];
        bi[map[d]] = -yi[d];
      }
    const s = fac.solve(br, bi);
    for (let d = 0; d < n; d++)
      if (map[d] >= 0) {
        xr[d] = s.re[map[d]];
        xi[d] = s.im[map[d]];
      }
    cmatvec(space.pat, Kre, Kim, xr, xi, yr, yi);
    for (let j = 0; j < N; j++) {
      const cj = signals[j].index;
      let qr = 0,
        qi = 0;
      for (let d = 0; d < n; d++)
        if (dofCond[d] === cj) {
          qr += yr[d];
          qi += yi[d];
        }
      Cs.re[j * N + i] = EPS0 * qr;
      Cs.im[j * N + i] = EPS0 * qi;
    }
  }
  return { Cs, factorMs, solveMs: now() - t0 - factorMs };
}

const symmetrize = (A, n) => {
  let asym = 0,
    mx = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const a = A[i * n + j],
        b = A[j * n + i];
      asym = Math.max(asym, Math.abs(a - b));
      A[i * n + j] = A[j * n + i] = 0.5 * (a + b);
    }
  for (let i = 0; i < n * n; i++) mx = Math.max(mx, Math.abs(A[i]));
  return mx > 0 ? asym / mx : 0;
};

/** Vacuum capacitance matrix C0 (F/m), cached. */
export function vacuumCapacitance(P) {
  if (!P._C0) {
    const { Cs } = solveCapacitance(P, P.matKeys.map(() => ({ re: 1, im: 0 })));
    const C0 = Cs.re.slice();
    symmetrize(C0, P.N);
    P._C0 = C0;
  }
  return P._C0;
}

/**
 * RLGC at one frequency (Hz). Returns {f, R, L, G, C (Float64Array N*N), diag: {...}, timing: {...}}.
 */
export function rlgcAt(P, fHz) {
  const { N, materials, matKeys } = P;
  const w = 2 * Math.PI * fHz;
  const timing = {};
  // ---- C, G ----
  const epsList = matKeys.map((k) => materials[k].epsAt(fHz > 0 ? fHz : 1e-3));
  const key = epsList.map((e) => `${e.re},${fHz > 0 ? e.im : 0}`).join(';');
  let Cs;
  const tE = now();
  if (P._esCache && P._esCache.key === key) Cs = P._esCache.Cs;
  else {
    const r = solveCapacitance(P, fHz > 0 ? epsList : epsList.map((e) => ({ re: e.re, im: 0 })));
    Cs = r.Cs;
    P._esCache = { key, Cs };
  }
  timing.es_ms = now() - tE;
  const C = Cs.re.slice();
  const G = new Float64Array(N * N);
  for (let q = 0; q < N * N; q++) G[q] = -w * Cs.im[q];
  const asymC = symmetrize(C, N);
  symmetrize(G, N);
  // ---- R, L ----
  let R = new Float64Array(N * N),
    L = new Float64Array(N * N);
  const diag = { asym_C: asymC };
  const tM = now();
  if (P.condModel === 'pec') {
    const C0 = vacuumCapacitance(P);
    const Li = cmatInv(CMat.real(N, C0));
    for (let q = 0; q < N * N; q++) L[q] = MU0 * EPS0 * Li.re[q];
  } else {
    const r = mqsAt(P, fHz);
    R = r.R;
    L = r.L;
    Object.assign(diag, r.diag);
    timing.mqs_factor_ms = r.factorMs;
  }
  timing.mqs_ms = now() - tM;
  diag.asym_L = symmetrize(L, N);
  symmetrize(R, N);
  return { f: fHz, R, L, G, C, diag, timing };
}

function mqsAt(P, fHz) {
  const { space, mqs, N, nGroups, ret, pm, dofCond, groupOf, sec } = P;
  const { K, Mtot, B, Gdc, aR, aSym, Mc, roughness, sigmaOf } = mqs;
  const w = 2 * Math.PI * fHz;
  const n = space.nDof;
  const nf = aR.nf;
  // all-pmc box: for w > 0, Yc is singular (net current is zero by construction): use the reduced form (same physics).
  // At DC Yc = diag(G) and the return current must be forced through the ground group.
  const reduced = ret === 'box' || (!pm && w > 0);
  let factorMs = 0;
  // X_g = (K + j w mu0 M)^-1 (mu0 B_g) on free DOFs (A = 0 on pec sides)
  let X = null;
  const Yc = new CMat(nGroups);
  for (let g = 0; g < nGroups; g++) Yc.re[g * nGroups + g] = Gdc[g];
  if (w > 0) {
    const re = new Float64Array(aR.pat.nnz),
      im = new Float64Array(aR.pat.nnz);
    for (let q = 0; q < re.length; q++) {
      re[q] = K[aR.src[q]];
      im[q] = w * MU0 * Mtot[aR.src[q]];
    }
    const t0 = now();
    const fac = makeFactor(P.factor, aSym);
    fac.factor(re, im);
    factorMs = now() - t0;
    X = [];
    const br = new Float64Array(nf),
      bi = new Float64Array(nf);
    for (let g = 0; g < nGroups; g++) {
      for (let d = 0; d < n; d++) if (aR.map[d] >= 0) br[aR.map[d]] = MU0 * B[g][d];
      X.push(fac.solve(br, bi));
    }
    // Yc_gh -= j w B_g^T X_h
    for (let g = 0; g < nGroups; g++)
      for (let h = 0; h < nGroups; h++) {
        let sr = 0,
          si = 0;
        const xh = X[h];
        const bg = B[g];
        for (let d = 0; d < n; d++) {
          const q = aR.map[d];
          if (q < 0 || bg[d] === 0) continue;
          sr += bg[d] * xh.re[q];
          si += bg[d] * xh.im[q];
        }
        // -j w (sr + j si) = w si - j w sr
        Yc.re[g * nGroups + h] += w * si;
        Yc.im[g * nGroups + h] -= w * sr;
      }
  }
  // group voltage-drop vectors U[j] (length nGroups) for unit current in signal j
  const U = [];
  if (reduced) {
    const Yss = new CMat(N);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        Yss.re[i * N + j] = Yc.re[i * nGroups + j];
        Yss.im[i * N + j] = Yc.im[i * nGroups + j];
      }
    const Zi = cmatInv(Yss);
    for (let j = 0; j < N; j++) {
      const u = { re: new Float64Array(nGroups), im: new Float64Array(nGroups) };
      for (let i = 0; i < N; i++) {
        u.re[i] = Zi.re[i * N + j];
        u.im[i] = Zi.im[i * N + j];
      }
      U.push(u);
    }
  } else {
    const Yi = cmatInv(Yc);
    for (let j = 0; j < N; j++) {
      const u = { re: new Float64Array(nGroups), im: new Float64Array(nGroups) };
      for (let i = 0; i < nGroups; i++) {
        // Yi (e_j - e_g)
        u.re[i] = Yi.re[i * nGroups + j] - Yi.re[i * nGroups + N];
        u.im[i] = Yi.im[i * nGroups + j] - Yi.im[i * nGroups + N];
      }
      U.push(u);
    }
  }
  const ug = (u) => (nGroups > N ? { re: u.re[N], im: u.im[N] } : { re: 0, im: 0 });
  const Zr = new Float64Array(N * N),
    Zi = new Float64Array(N * N);
  for (let j = 0; j < N; j++) {
    const g0 = reduced ? { re: 0, im: 0 } : ug(U[j]);
    for (let i = 0; i < N; i++) {
      Zr[i * N + j] = U[j].re[i] - g0.re;
      Zi[i * N + j] = U[j].im[i] - g0.im;
    }
  }
  // dissipation split per conductor: E = u_group - j w A on conductor DOFs, A = sum_g u_g X_g
  const nC = Mc.length;
  const D = Array.from({ length: nC }, () => ({ re: new Float64Array(N * N), im: new Float64Array(N * N) }));
  const Er = [],
    Ei = [];
  for (let j = 0; j < N; j++) {
    const er = new Float64Array(n),
      ei = new Float64Array(n);
    const u = U[j];
    for (let d = 0; d < n; d++) {
      const c = dofCond[d];
      if (c < 0) continue;
      const g = groupOf[c];
      let ar = 0,
        ai = 0;
      const q = aR.map[d];
      if (X && q >= 0)
        for (let h = 0; h < nGroups; h++) {
          const xr = X[h].re[q],
            xi = X[h].im[q];
          ar += u.re[h] * xr - u.im[h] * xi;
          ai += u.re[h] * xi + u.im[h] * xr;
        }
      // E = u_g - j w A
      er[d] = u.re[g] + w * ai;
      ei[d] = u.im[g] - w * ar;
    }
    Er.push(er);
    Ei.push(ei);
  }
  const pat = space.pat;
  const condDofs = P.condDofs;
  const tr = new Float64Array(n),
    ti = new Float64Array(n);
  for (let c = 0; c < nC; c++) {
    const Mk = Mc[c];
    const dofs = condDofs[c];
    for (let j = 0; j < N; j++) {
      // t = Mk conj(E_j) on the rows of conductor c only (Mk vanishes elsewhere)
      const er = Er[j],
        ei = Ei[j];
      for (const d of dofs) {
        let sr = 0,
          si = 0;
        for (let p = pat.rowptr[d]; p < pat.rowptr[d + 1]; p++) {
          const m = Mk[p];
          if (m === 0) continue;
          const col = pat.colidx[p];
          sr += m * er[col];
          si -= m * ei[col];
        }
        tr[d] = sr;
        ti[d] = si;
      }
      for (let i = 0; i < N; i++) {
        let sr = 0,
          si = 0;
        const fr = Er[i],
          fi = Ei[i];
        for (const d of dofs) {
          sr += fr[d] * tr[d] - fi[d] * ti[d];
          si += fr[d] * ti[d] + fi[d] * tr[d];
        }
        D[c].re[i * N + j] = sr;
        D[c].im[i * N + j] = si;
      }
    }
  }
  const R = new Float64Array(N * N),
    L = new Float64Array(N * N);
  let pb = 0,
    rmax = 0;
  const sumD = new Float64Array(N * N);
  for (let q = 0; q < N * N; q++) {
    for (let c = 0; c < nC; c++) sumD[q] += D[c].re[q];
    rmax = Math.max(rmax, Math.abs(Zr[q]));
  }
  for (let q = 0; q < N * N; q++) pb = Math.max(pb, Math.abs(sumD[q] - 0.5 * (Zr[q] + Zr[(q % N) * N + Math.floor(q / N)])));
  const Kf = sec.conductors.map((c, i) => roughness[i].K(fHz, sigmaOf[i]));
  const anyRough = Kf.some((v) => v !== 1);
  const Ldc = w > 0 ? null : dcInductance(P);
  for (let q = 0; q < N * N; q++) {
    let dR = 0;
    if (anyRough) for (let c = 0; c < nC; c++) dR += (Kf[c] - 1) * D[c].re[q];
    R[q] = Zr[q] + dR;
    L[q] = w > 0 ? (Zi[q] + (P.roughnessReactance ? dR : 0)) / w : Ldc[q];
  }
  const lossShare = sec.conductors.map((c, k) => (N ? D[k].re[0] / (sumD[0] || 1) : 0));
  return { R, L, factorMs, diag: { power_balance_rel: rmax > 0 ? pb / rmax : 0, roughness_K: Kf, loss_share_signal0: lossShare, return: reduced ? 'reduced' : ret } };
}

/**
 * DC loop inductance with uniform conductor currents: L = Q G^-1 W G^-1 P, W = mu0 B^T K^-1 B (first-order term of
 * Yc = G - j w W + O(w^2)). With an all-pmc box K is singular; one DOF is pinned (A = 0), which is exact for the
 * zero-net-current excitations used here ('ground' return). Cached.
 */
function dcInductance(P) {
  if (P._Ldc) return P._Ldc;
  const { space, mqs, N, nGroups, ret, pm } = P;
  const { K, B, Gdc } = mqs;
  const n = space.nDof;
  let aR = mqs.aR,
    sym = mqs.aSym;
  if (!pm) {
    const free = new Uint8Array(n).fill(1);
    free[0] = 0;
    aR = restrictPattern(space.pat, free);
    sym = analyze(aR.pat);
  }
  const re = new Float64Array(aR.pat.nnz),
    im = new Float64Array(aR.pat.nnz);
  for (let q = 0; q < re.length; q++) re[q] = K[aR.src[q]];
  const fac = makeFactor(P.factor, sym);
  fac.factor(re, im);
  const X = [];
  const br = new Float64Array(aR.nf),
    bi = new Float64Array(aR.nf);
  for (let g = 0; g < nGroups; g++) {
    for (let d = 0; d < n; d++) if (aR.map[d] >= 0) br[aR.map[d]] = MU0 * B[g][d];
    X.push(fac.solve(br, bi).re);
  }
  const W = new Float64Array(nGroups * nGroups);
  for (let g = 0; g < nGroups; g++)
    for (let h = 0; h < nGroups; h++) {
      let s = 0;
      for (let d = 0; d < n; d++) if (aR.map[d] >= 0) s += B[g][d] * X[h][aR.map[d]];
      W[g * nGroups + h] = s;
    }
  // excitation vectors: x_j = G^-1 P e_j (group voltage drops of uniform currents), then L_ij = (Q G^-1 W G^-1 P)_ij
  const boxReturn = ret === 'box';
  const xv = [];
  for (let j = 0; j < N; j++) {
    const x = new Float64Array(nGroups);
    x[j] = 1 / Gdc[j];
    if (!boxReturn && nGroups > N) x[N] = -1 / Gdc[N];
    xv.push(x);
  }
  const L = new Float64Array(N * N);
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      let s = 0;
      for (let g = 0; g < nGroups; g++) for (let h = 0; h < nGroups; h++) s += xv[i][g] * W[g * nGroups + h] * xv[j][h];
      L[i * N + j] = s;
    }
  P._Ldc = L;
  return L;
}

/** Sweep: rlgcAt for each frequency (Hz). */
export function rlgcSweep(P, freqsHz) {
  return freqsHz.map((f) => rlgcAt(P, f));
}

export { cmatMul };
