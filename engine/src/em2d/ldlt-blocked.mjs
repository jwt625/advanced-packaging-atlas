// Complex-symmetric multifrontal LDL^T with a blocked front update (lane L7, wave 4 performance; used by em2d and em3d).
// Subclass of la/ldlt.mjs ComplexSupernodalLDLT (L1's port of EO engine/src/ldlt.mjs at eb97f96); only `factor` is
// replaced. Change: the column update F[:, k] -= sum_c L[:, c] D[c] L[k, c] processes 4 source columns per pass over
// the target column (one load / store of the target per 4 sources instead of per source), with a 1-column tail.
// Arithmetic per entry is the same sum in the same column order grouped by 4, so results agree with the base class to
// rounding. Proposed upstream to lane L1 (la/ldlt.mjs is outside L7's write scope). License: GPL-3.0-or-later.

import { ComplexSupernodalLDLT } from '../la/ldlt.mjs';

function diagScaleC(sym, re, im) {
  const { n, lowerP, lowerI, lowerSrc } = sym;
  let amax = 0;
  for (let j = 0; j < n; j++) for (let p = lowerP[j]; p < lowerP[j + 1]; p++) if (lowerI[p] === j) amax = Math.max(amax, Math.hypot(re[lowerSrc[p]], im[lowerSrc[p]]));
  return amax > 0 ? amax : 1;
}

export class BlockedComplexLDLT extends ComplexSupernodalLDLT {
  factor(re, im, { pivotTol = 1e-13 } = {}) {
    const t0 = performance.now();
    const { nsuper, superStart, Sp, Si, Lxp, lowerP, lowerI, lowerSrc, childHead, childNext } = this.sym;
    const { Lr, Li, Dr, Di, Fr, Fi, rel, stackDim } = this;
    let sr = this.sr,
      si = this.si;
    const tau = pivotTol * diagScaleC(this.sym, re, im);
    let nPert = 0,
      top = 0;
    const stackPos = [];
    const W = new Float64Array(8);
    // optional progress: this.onProgress(fraction) about every 2 % of the estimated work (sum over supernodes of
    // ncols x rows^2), throttled to >= 200 ms between calls
    const prog = this.onProgress;
    let work = null,
      done = 0,
      nextFrac = 0.02,
      lastT = t0;
    if (prog) {
      work = new Float64Array(nsuper);
      let tot = 0;
      for (let q = 0; q < nsuper; q++) {
        const mq = Sp[q + 1] - Sp[q];
        work[q] = (superStart[q + 1] - superStart[q]) * mq * mq;
        tot += work[q];
      }
      for (let q = 0; q < nsuper; q++) work[q] /= tot;
    }
    for (let s = 0; s < nsuper; s++) {
      if (prog) {
        done += work[s];
        if (done >= nextFrac) {
          const t = performance.now();
          if (t - lastT >= 200) {
            prog(Math.min(done, 1));
            lastT = t;
          }
          nextFrac = done + 0.02;
        }
      }
      const f = superStart[s],
        nc = superStart[s + 1] - f;
      const r0 = Sp[s],
        m = Sp[s + 1] - r0;
      for (let r = 0; r < m; r++) rel[Si[r0 + r]] = r;
      for (let b = 0; b < m; b++) {
        Fr.fill(0, b * m + b, (b + 1) * m);
        Fi.fill(0, b * m + b, (b + 1) * m);
      }
      for (let c = 0; c < nc; c++) {
        const j = f + c,
          cb = c * m;
        for (let p = lowerP[j]; p < lowerP[j + 1]; p++) {
          const at = rel[lowerI[p]] + cb;
          Fr[at] += re[lowerSrc[p]];
          Fi[at] += im[lowerSrc[p]];
        }
      }
      for (let ch = childHead[s]; ch !== -1; ch = childNext[ch]) {
        const off = stackPos.pop();
        const mu = stackDim[ch];
        const cr0 = Sp[ch] + (superStart[ch + 1] - superStart[ch]);
        for (let b = 0; b < mu; b++) {
          const cb = rel[Si[cr0 + b]] * m,
            ub = off + b * mu;
          for (let a = b; a < mu; a++) {
            const at = rel[Si[cr0 + a]] + cb;
            Fr[at] += sr[ub + a];
            Fi[at] += si[ub + a];
          }
        }
        top = off;
      }
      const update = (k, lim) => this._update(k, lim, m, nc, f, W);
      for (let k = 0; k < nc; k++) {
        update(k, k);
        const kb = k * m;
        let dr = Fr[k + kb],
          di = Fi[k + kb];
        const mag = Math.hypot(dr, di);
        if (!(mag >= tau)) {
          if (!Number.isFinite(mag)) return { ok: false, nPerturbed: nPert, ms: performance.now() - t0 };
          if (mag === 0) dr = tau;
          else {
            dr *= tau / mag;
            di *= tau / mag;
          }
          nPert++;
        }
        Dr[f + k] = dr;
        Di[f + k] = di;
        Fr[k + kb] = 1;
        Fi[k + kb] = 0;
        const den = dr * dr + di * di,
          ir = dr / den,
          ii = -di / den;
        for (let i = k + 1; i < m; i++) {
          const ar = Fr[i + kb],
            ai = Fi[i + kb];
          Fr[i + kb] = ar * ir - ai * ii;
          Fi[i + kb] = ar * ii + ai * ir;
        }
      }
      this._trailing(m, nc, f, W);
      Lr.set(Fr.subarray(0, m * nc), Lxp[s]);
      Li.set(Fi.subarray(0, m * nc), Lxp[s]);
      const mu = m - nc;
      stackDim[s] = mu;
      if (mu > 0) {
        const need = top + mu * mu;
        if (need > sr.length) {
          const len = Math.max(need, 2 * sr.length);
          const br = new Float64Array(len),
            bi = new Float64Array(len);
          br.set(sr.subarray(0, top));
          bi.set(si.subarray(0, top));
          sr = this.sr = br;
          si = this.si = bi;
        }
        for (let b = 0; b < mu; b++) {
          const src = (nc + b) * m + nc,
            dst = top + b * mu;
          for (let a = b; a < mu; a++) {
            sr[dst + a] = Fr[src + a];
            si[dst + a] = Fi[src + a];
          }
        }
        stackPos.push(top);
        top = need;
      } else stackPos.push(top);
    }
    this.nPerturbed = nPert;
    this.ok = true;
    return { ok: true, nPerturbed: nPert, ms: performance.now() - t0 };
  }

  /** Schur-complement update of the trailing columns nc..m-1 (independent of each other). */
  _trailing(m, nc, f, W) {
    for (let j = nc; j < m; j++) this._update(j, j, m, nc, f, W);
  }

  /** F[lim:m, k] -= sum_{c < min(k, nc)} F[lim:m, c] D[f + c] F[k, c], 4 source columns per pass. */
  _update(k, lim, m, nc, f, W) {
    const { Fr, Fi, Dr, Di } = this;
    const kb = k * m;
    const cmax = Math.min(k, nc);
    let c = 0;
    for (; c + 3 < cmax; c += 4) {
      for (let q = 0; q < 4; q++) {
        const b0 = (c + q) * m;
        const lr = Fr[k + b0],
          li = Fi[k + b0],
          dr = Dr[f + c + q],
          di = Di[f + c + q];
        W[2 * q] = lr * dr - li * di;
        W[2 * q + 1] = lr * di + li * dr;
      }
      const w0r = W[0],
        w0i = W[1],
        w1r = W[2],
        w1i = W[3],
        w2r = W[4],
        w2i = W[5],
        w3r = W[6],
        w3i = W[7];
      const b0 = c * m,
        b1 = b0 + m,
        b2 = b1 + m,
        b3 = b2 + m;
      for (let i = lim; i < m; i++) {
        const a0r = Fr[i + b0],
          a0i = Fi[i + b0],
          a1r = Fr[i + b1],
          a1i = Fi[i + b1],
          a2r = Fr[i + b2],
          a2i = Fi[i + b2],
          a3r = Fr[i + b3],
          a3i = Fi[i + b3];
        Fr[i + kb] -= a0r * w0r - a0i * w0i + (a1r * w1r - a1i * w1i) + (a2r * w2r - a2i * w2i) + (a3r * w3r - a3i * w3i);
        Fi[i + kb] -= a0r * w0i + a0i * w0r + (a1r * w1i + a1i * w1r) + (a2r * w2i + a2i * w2r) + (a3r * w3i + a3i * w3r);
      }
    }
    for (; c < cmax; c++) {
      const b0 = c * m;
      const lr = Fr[k + b0],
        li = Fi[k + b0];
      const dr = Dr[f + c],
        di = Di[f + c];
      const wr = lr * dr - li * di,
        wi = lr * di + li * dr;
      if (wr === 0 && wi === 0) continue;
      for (let i = lim; i < m; i++) {
        const ar = Fr[i + b0],
          ai = Fi[i + b0];
        Fr[i + kb] -= ar * wr - ai * wi;
        Fi[i + kb] -= ar * wi + ai * wr;
      }
    }
  }
}
