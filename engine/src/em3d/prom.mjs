// Adaptive frequency sweep for the 3D EM block solver: projection-based reduced-order model (PROM) with greedy
// sampling by minimal rational interpolation (lane L22, DevLog-014 D7).
// Adapted from awslabs/palace at 29ad351f (Apache-2.0): palace/drivers/drivensolver.cpp (SweepAdaptive: samples at the
// band ends, then greedy samples at the MRI error maximum; relative HDM vs PROM error at each new sample; stop after
// `memory` consecutive samples below tol or at max samples) and palace/models/romoperator.cpp (real basis from the real
// and imaginary parts of each HDM solution, Galerkin projection; MRI: coefficients q from the smallest right singular
// vector of the R factor of [u_i; i w_i u_i], next sample at argmin |sum_i q_i / (z - z_i)|).
// Changes: JavaScript; one basis for all excitations and one MRI over the stacked excitation states; the R factor is
// not formed: its right singular vectors are the eigenvectors of the Gram matrix G_ij = (1 + w_i w_j) u_i^H u_j, which
// is computed from the basis coefficients of the samples (they lie in the basis exactly); the reduced operator is
// V^T A(w) V formed at every frequency from the assembled operator (assembly + one sparse product per basis vector)
// instead of Palace's affine split, so PML stretching, surface impedance, dispersive permittivity and frequency-
// dependent port modes are all exact. License of this file: GPL-3.0-or-later; see engine/src/em3d/NOTICE.

import { solveAt } from './solver.mjs';
import { CMat, cmatInv, cluFactor, cluSolve, cmatEig } from '../em2d/dense.mjs';

const now = () => performance.now();

/** y = (Are + j Aim) v for real v. */
function spmvReal(pat, re, im, v, yr, yi) {
  const { rowptr, colidx } = pat;
  for (let i = 0; i < pat.n; i++) {
    let sr = 0,
      si = 0;
    for (let q = rowptr[i]; q < rowptr[i + 1]; q++) {
      const x = v[colidx[q]];
      sr += re[q] * x;
      si += im[q] * x;
    }
    yr[i] = sr;
    yi[i] = si;
  }
}
const dot = (a, b) => {
  let s = 0;
  for (let k = 0; k < a.length; k++) s += a[k] * b[k];
  return s;
};

/**
 * Build the PROM of prepared operator P over [fminHz, fmaxHz] by greedy sampling. Options: tol (relative HDM vs PROM
 * error at a new sample, default 1e-3), maxSamples (20), memory (2), grid (points of the MRI search grid, 4000),
 * onSample({f_GHz, error, dim, ms}). Returns {solveAt(fHz, opts), samples: [{f_GHz, error}], dim, offline_ms}.
 */
export function buildProm(P, fminHz, fmaxHz, { tol = 1e-3, maxSamples = 20, memory = 2, grid = 4000, onSample = null, onProgress = null } = {}) {
  const t0 = now();
  const n = P.R.nf;
  const V = [];
  const samples = []; // {f, w (normalized), coef: [[cr, ci] per excitation] (padded to V.length)}
  const addVector = (v0) => {
    const v = Float64Array.from(v0);
    const nrm0 = Math.sqrt(dot(v, v));
    if (nrm0 === 0) return;
    for (let pass = 0; pass < 2; pass++)
      for (const u of V) {
        const c = dot(u, v);
        for (let k = 0; k < n; k++) v[k] -= c * u[k];
      }
    const nrm = Math.sqrt(dot(v, v));
    if (nrm <= 1e-12 * nrm0) return;
    for (let k = 0; k < n; k++) v[k] /= nrm;
    V.push(v);
  };
  const coefOf = (x) => {
    const cr = new Float64Array(V.length),
      ci = new Float64Array(V.length);
    for (let a = 0; a < V.length; a++) {
      cr[a] = dot(V[a], x.re);
      ci[a] = dot(V[a], x.im);
    }
    return [cr, ci];
  };
  // reduced solver for solveAt (makeSolver hook)
  const makeSolver = ({ re, im, Ucols, blocks, R }) => {
    const nr = V.length;
    const Ar = new CMat(nr);
    const tr = new Float64Array(n),
      ti = new Float64Array(n);
    for (let b = 0; b < nr; b++) {
      spmvReal(R.pat, re, im, V[b], tr, ti);
      for (let a = 0; a < nr; a++) {
        Ar.re[a * nr + b] = dot(V[a], tr);
        Ar.im[a * nr + b] = dot(V[a], ti);
      }
    }
    // port low-rank terms: + W^T Cc W, W = U^T V
    const nU = Ucols.length;
    if (nU) {
      const W = new CMat(nU, nr);
      Ucols.forEach(([ur, ui], u) => {
        for (let b = 0; b < nr; b++) {
          W.re[u * nr + b] = dot(ur, V[b]);
          W.im[u * nr + b] = dot(ui, V[b]);
        }
      });
      const Cc = new CMat(nU);
      for (const bl of blocks) {
        const inv = cmatInv(bl.Cinv);
        for (let a = 0; a < inv.r; a++)
          for (let b = 0; b < inv.r; b++) {
            Cc.re[(bl.off + a) * nU + bl.off + b] = inv.re[a * inv.r + b];
            Cc.im[(bl.off + a) * nU + bl.off + b] = inv.im[a * inv.r + b];
          }
      }
      // CW = Cc W (nU x nr); Ar += W^T CW
      for (let a = 0; a < nr; a++)
        for (let b = 0; b < nr; b++) {
          let sr = 0,
            si = 0;
          for (let u = 0; u < nU; u++) {
            let cr = 0,
              ci = 0;
            for (let v = 0; v < nU; v++) {
              const kr = Cc.re[u * nU + v],
                ki = Cc.im[u * nU + v],
                wr = W.re[v * nr + b],
                wi = W.im[v * nr + b];
              cr += kr * wr - ki * wi;
              ci += kr * wi + ki * wr;
            }
            const wr = W.re[u * nr + a],
              wi = W.im[u * nr + a];
            sr += wr * cr - wi * ci;
            si += wr * ci + wi * cr;
          }
          Ar.re[a * nr + b] += sr;
          Ar.im[a * nr + b] += si;
        }
    }
    const lu = cluFactor(Ar);
    return (br, bi) => {
      const rhs = new CMat(nr, 1);
      for (let a = 0; a < nr; a++) {
        rhs.re[a] = dot(V[a], br);
        rhs.im[a] = dot(V[a], bi);
      }
      const y = cluSolve(lu, rhs);
      const xr = new Float64Array(n),
        xi = new Float64Array(n);
      for (let a = 0; a < nr; a++) {
        const yr = y.re[a],
          yi = y.im[a];
        const v = V[a];
        for (let k = 0; k < n; k++) {
          xr[k] += yr * v[k];
          xi[k] += yi * v[k];
        }
      }
      return { re: xr, im: xi };
    };
  };
  const hdm = (f) => {
    const xs = [];
    const r = solveAt(P, f, { onProgress, onSolution: (col, x) => (xs[col] = { re: Float64Array.from(x.re), im: Float64Array.from(x.im) }) });
    return { r, xs };
  };
  const rom = (f) => {
    const xs = [];
    const r = solveAt(P, f, { makeSolver, onSolution: (col, x) => (xs[col] = x) });
    return { r, xs };
  };
  const add = (f, xs) => {
    for (const x of xs) {
      addVector(x.re);
      addVector(x.im);
    }
    samples.push({ f, w: f / fmaxHz, coef: xs.map(coefOf) });
  };
  const relErr = (a, b) => {
    let num = 0,
      den = 0;
    a.forEach((x, j) => {
      for (let k = 0; k < n; k++) {
        num += (x.re[k] - b[j].re[k]) ** 2 + (x.im[k] - b[j].im[k]) ** 2;
        den += x.re[k] ** 2 + x.im[k] ** 2;
      }
    });
    return Math.sqrt(num / den);
  };
  // MRI next sample: q = eigenvector of the smallest eigenvalue of G_ij = (1 + w_i w_j) sum_exc c_i^H c_j
  const nextSample = () => {
    const S = samples.length;
    const G = new CMat(S);
    for (let i = 0; i < S; i++)
      for (let j = 0; j < S; j++) {
        let sr = 0,
          si = 0;
        samples[i].coef.forEach(([ar, ai], e) => {
          const [br, bi] = samples[j].coef[e];
          const m = Math.min(ar.length, br.length);
          for (let k = 0; k < m; k++) {
            sr += ar[k] * br[k] + ai[k] * bi[k];
            si += ar[k] * bi[k] - ai[k] * br[k];
          }
        });
        const s = 1 + samples[i].w * samples[j].w;
        G.re[i * S + j] = s * sr;
        G.im[i * S + j] = s * si;
      }
    const eig = cmatEig(G);
    let m = 0;
    for (let k = 1; k < S; k++) if (Math.hypot(eig.values.re[k], eig.values.im[k]) < Math.hypot(eig.values.re[m], eig.values.im[m])) m = k;
    const q = Array.from({ length: S }, (_, i) => [eig.vectors.re[i * S + m], eig.vectors.im[i * S + m]]);
    let best = null,
      bestQ = Infinity;
    const used = samples.map((s) => s.f);
    for (let g = 0; g <= grid; g++) {
      const f = fminHz + ((fmaxHz - fminHz) * g) / grid;
      if (used.some((u) => Math.abs(u - f) < 1e-9 * fmaxHz)) continue;
      const z = f / fmaxHz;
      let sr = 0,
        si = 0;
      samples.forEach((s, i) => {
        const d = z - s.w;
        sr += q[i][0] / d;
        si += q[i][1] / d;
      });
      const a = Math.hypot(sr, si);
      if (a < bestQ) {
        bestQ = a;
        best = f;
      }
    }
    return best;
  };
  const log = [];
  for (const f of fmaxHz > fminHz ? [fminHz, fmaxHz] : [fminHz]) {
    const ts = now();
    const { xs } = hdm(f);
    add(f, xs);
    log.push({ f_GHz: f / 1e9, error: null, dim: V.length, ms: now() - ts });
    onSample?.(log[log.length - 1]);
  }
  let mem = 0;
  while (samples.length < maxSamples && mem < memory && fmaxHz > fminHz) {
    const f = nextSample();
    if (f == null) break;
    const ts = now();
    const xr = rom(f).xs;
    const { xs } = hdm(f);
    const err = relErr(xs, xr);
    mem = err < tol ? mem + 1 : 0;
    add(f, xs);
    log.push({ f_GHz: f / 1e9, error: err, dim: V.length, ms: now() - ts });
    onSample?.(log[log.length - 1]);
  }
  const converged = mem >= memory || fmaxHz <= fminHz;
  return {
    solveAt: (f, opts = {}) => {
      const r = solveAt(P, f, { ...opts, makeSolver });
      r.solver = { kind: 'prom', dim: V.length };
      return r;
    },
    samples: log,
    converged,
    dim: () => V.length,
    offline_ms: now() - t0,
  };
}
