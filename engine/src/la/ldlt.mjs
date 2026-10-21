// Ported from eo-modulator-atlas engine/src/ldlt.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: none (verbatim copy).
// Sparse symmetric (indefinite) LDL^T factorisation with a reusable symbolic analysis.
//
// A = P^T L D L^T P with L unit lower triangular, D diagonal (1x1 pivots, no dynamic pivoting), P a fill-reducing
// symmetric permutation supplied by the caller (e.g. sparse.mjs ndOrder). Intended for quasi-definite matrices
// (positive definite (1,1) block, negative definite (2,2) block in some partition), which admit this factorisation
// for every symmetric ordering (R. J. Vanderbei, SIAM J. Optim. 5, 100-113 (1995)). For other symmetric matrices a
// static pivot perturbation keeps the factorisation finite (|d| < tau * max|a_kk| -> d = +-tau * max|a_kk|; counted
// in `nPerturbed`) and `solveRefined` applies iterative refinement against the unperturbed matrix.
//
// Algorithm: up-looking row-by-row LDL^T on the elimination tree (the textbook LDL / cs_ereach scheme of T. Davis,
// "Direct Methods for Sparse Linear Systems", SIAM 2006, and ACM TOMS 31, 587 (2005); re-implemented from the
// published description). The symbolic object (permuted pattern, etree, column counts) depends only on the pattern
// and the ordering and is shared by every numeric factorisation on that pattern (different shifts, wavelengths).
// Complex-symmetric variant (A = A^T, complex entries, no conjugation) in ComplexLDLT for lossy materials.
// License: GPL-3.0-or-later.

/**
 * Symbolic analysis of a symmetric CSR pattern (full storage, both triangles, diagonal present).
 * @param {{n:number,rowptr:Int32Array,colidx:Int32Array}} pat
 * @param {Int32Array} perm new -> old
 */
export class SymbolicLDLT {
  constructor(pat, perm) {
    const t0 = performance.now();
    const n = pat.n;
    this.n = n;
    this.perm = perm;
    const pinv = new Int32Array(n);
    for (let i = 0; i < n; i++) pinv[perm[i]] = i;
    this.pinv = pinv;
    // permuted upper triangle stored by columns (column k lists rows r <= k), with the source CSR index of each entry
    const Cp = new Int32Array(n + 1);
    for (let i = 0; i < n; i++)
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
        const pi = pinv[i], pj = pinv[pat.colidx[p]];
        if (pi <= pj) Cp[pj + 1]++;
      }
    for (let i = 0; i < n; i++) Cp[i + 1] += Cp[i];
    const Ci = new Int32Array(Cp[n]);
    const src = new Int32Array(Cp[n]);
    const next = Cp.slice(0, n);
    for (let i = 0; i < n; i++)
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
        const pi = pinv[i], pj = pinv[pat.colidx[p]];
        if (pi <= pj) {
          const q = next[pj]++;
          Ci[q] = pi;
          src[q] = p;
        }
      }
    this.Cp = Cp;
    this.Ci = Ci;
    this.src = src;
    // elimination tree (path compression with an ancestor array)
    const parent = new Int32Array(n).fill(-1);
    const anc = new Int32Array(n).fill(-1);
    for (let k = 0; k < n; k++)
      for (let p = Cp[k]; p < Cp[k + 1]; p++) {
        let i = Ci[p];
        while (i !== -1 && i < k) {
          const inext = anc[i];
          anc[i] = k;
          if (inext === -1) parent[i] = k;
          i = inext;
        }
      }
    this.parent = parent;
    // column counts of L (strictly lower part) by walking each row's reach
    const mark = new Int32Array(n).fill(-1);
    const cnt = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      mark[k] = k;
      for (let p = Cp[k]; p < Cp[k + 1]; p++) {
        let i = Ci[p];
        while (i < k && mark[i] !== k) {
          cnt[i]++;
          mark[i] = k;
          i = parent[i];
        }
      }
    }
    const Lp = new Int32Array(n + 1);
    for (let k = 0; k < n; k++) Lp[k + 1] = Lp[k] + cnt[k];
    this.Lp = Lp;
    this.nnzL = Lp[n];
    this.flops = 0;
    for (let k = 0; k < n; k++) this.flops += cnt[k] * cnt[k];
    this.ms = performance.now() - t0;
  }
}

/** Numeric real LDL^T on a SymbolicLDLT. factor() may be called repeatedly with new values on the same pattern. */
export class LDLT {
  /** @param {SymbolicLDLT} sym */
  constructor(sym) {
    this.sym = sym;
    const n = sym.n;
    this.Li = new Int32Array(sym.nnzL);
    this.Lx = new Float64Array(sym.nnzL);
    this.D = new Float64Array(n);
    this._y = new Float64Array(n);
    this._flag = new Int32Array(n);
    this._pattern = new Int32Array(n);
    this._lnz = new Int32Array(n);
    this.nNeg = 0;
    this.nPerturbed = 0;
    this.ok = false;
  }

  /**
   * @param {Float64Array} values aligned with the CSR pattern given to SymbolicLDLT
   * @param {{pivotTol?:number}} [opts] relative static pivot threshold (default 1e-13)
   * @returns {{ok:boolean, nNeg:number, nPerturbed:number, ms:number}}
   */
  factor(values, { pivotTol = 1e-13 } = {}) {
    const t0 = performance.now();
    const { n, Cp, Ci, src, parent, Lp } = this.sym;
    const { Li, Lx, D } = this;
    const Y = this._y, flag = this._flag, pattern = this._pattern, Lnz = this._lnz;
    let amax = 0;
    for (let k = 0; k < n; k++) {
      // diagonal is the last entry of column k (rows sorted? not guaranteed): scan
      for (let p = Cp[k]; p < Cp[k + 1]; p++) if (Ci[p] === k) amax = Math.max(amax, Math.abs(values[src[p]]));
    }
    const tau = pivotTol * (amax > 0 ? amax : 1);
    let nNeg = 0, nPert = 0;
    for (let k = 0; k < n; k++) {
      Lnz[k] = 0;
      Y[k] = 0;
      let top = n;
      flag[k] = k;
      for (let p = Cp[k]; p < Cp[k + 1]; p++) {
        let i = Ci[p];
        Y[i] += values[src[p]];
        let len = 0;
        for (; flag[i] !== k; i = parent[i]) {
          pattern[len++] = i;
          flag[i] = k;
        }
        while (len > 0) pattern[--top] = pattern[--len];
      }
      let d = Y[k];
      Y[k] = 0;
      for (; top < n; top++) {
        const i = pattern[top];
        const yi = Y[i];
        Y[i] = 0;
        const p2 = Lp[i] + Lnz[i];
        for (let p = Lp[i]; p < p2; p++) Y[Li[p]] -= Lx[p] * yi;
        const lki = yi / D[i];
        d -= lki * yi;
        Li[p2] = k;
        Lx[p2] = lki;
        Lnz[i]++;
      }
      if (!(Math.abs(d) >= tau)) {
        if (!Number.isFinite(d)) {
          this.ok = false;
          return { ok: false, nNeg, nPerturbed: nPert, ms: performance.now() - t0 };
        }
        d = d < 0 ? -tau : tau;
        nPert++;
      }
      if (d < 0) nNeg++;
      D[k] = d;
    }
    this.nNeg = nNeg;
    this.nPerturbed = nPert;
    this.ok = true;
    const ms = performance.now() - t0;
    this.factorMs = ms;
    return { ok: true, nNeg, nPerturbed: nPert, ms };
  }

  /** Solve A x = b with the factor (no refinement). b, x in original ordering. */
  solve(b, out) {
    const { n, perm, Lp } = this.sym;
    const { Li, Lx, D } = this;
    const y = this._y;
    for (let i = 0; i < n; i++) y[i] = b[perm[i]];
    for (let j = 0; j < n; j++) {
      const yj = y[j];
      if (yj !== 0) for (let p = Lp[j]; p < Lp[j + 1]; p++) y[Li[p]] -= Lx[p] * yj;
    }
    for (let j = 0; j < n; j++) y[j] /= D[j];
    for (let j = n - 1; j >= 0; j--) {
      let v = y[j];
      for (let p = Lp[j]; p < Lp[j + 1]; p++) v -= Lx[p] * y[Li[p]];
      y[j] = v;
    }
    out = out ?? new Float64Array(n);
    for (let i = 0; i < n; i++) out[perm[i]] = y[i];
    return out;
  }

  /**
   * Solve for m right-hand sides stored column after column in one array (length n*m); one pass over L.
   * @param {Float64Array} b n*m
   * @param {number} m
   */
  solveMany(b, m, out) {
    if (m === 1) return this.solve(b, out);
    const { n, perm, Lp } = this.sym;
    const { Li, Lx, D } = this;
    const y = new Float64Array(n * m); // interleaved: y[i*m + c]
    for (let i = 0; i < n; i++) {
      const pi = perm[i];
      for (let c = 0; c < m; c++) y[i * m + c] = b[c * n + pi];
    }
    for (let j = 0; j < n; j++) {
      const jm = j * m;
      for (let p = Lp[j]; p < Lp[j + 1]; p++) {
        const l = Lx[p], im = Li[p] * m;
        for (let c = 0; c < m; c++) y[im + c] -= l * y[jm + c];
      }
    }
    for (let j = 0; j < n; j++) {
      const dj = 1 / D[j];
      for (let c = 0; c < m; c++) y[j * m + c] *= dj;
    }
    for (let j = n - 1; j >= 0; j--) {
      const jm = j * m;
      for (let p = Lp[j]; p < Lp[j + 1]; p++) {
        const l = Lx[p], im = Li[p] * m;
        for (let c = 0; c < m; c++) y[jm + c] -= l * y[im + c];
      }
    }
    out = out ?? new Float64Array(n * m);
    for (let i = 0; i < n; i++) {
      const pi = perm[i];
      for (let c = 0; c < m; c++) out[c * n + pi] = y[i * m + c];
    }
    return out;
  }

  /**
   * Solve with iterative refinement against the (unperturbed) matrix values on the CSR pattern.
   * @returns {{x:Float64Array, relResidual:number, steps:number}}
   */
  solveRefined(pat, values, b, { maxSteps = 3, tol = 1e-14 } = {}) {
    const n = pat.n;
    const x = this.solve(b);
    const r = new Float64Array(n);
    let bn = 0;
    for (let i = 0; i < n; i++) bn += b[i] * b[i];
    bn = Math.sqrt(bn) || 1;
    let rel = Infinity, steps = 0;
    for (; steps <= maxSteps; steps++) {
      let rn = 0;
      for (let i = 0; i < n; i++) {
        let s = b[i];
        for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) s -= values[p] * x[pat.colidx[p]];
        r[i] = s;
        rn += s * s;
      }
      rel = Math.sqrt(rn) / bn;
      if (rel < tol || steps === maxSteps) break;
      const dx = this.solve(r);
      for (let i = 0; i < n; i++) x[i] += dx[i];
    }
    return { x, relResidual: rel, steps };
  }
}

/**
 * Complex-symmetric LDL^T (A = A^T with complex entries; no conjugation), split real/imaginary storage.
 * Same symbolic analysis and algorithm as LDLT; pivots are complex (no inertia).
 */
export class ComplexLDLT {
  /** @param {SymbolicLDLT} sym */
  constructor(sym) {
    this.sym = sym;
    const n = sym.n;
    this.Li = new Int32Array(sym.nnzL);
    this.Lr = new Float64Array(sym.nnzL);
    this.Lim = new Float64Array(sym.nnzL);
    this.Dr = new Float64Array(n);
    this.Di = new Float64Array(n);
    this._yr = new Float64Array(n);
    this._yi = new Float64Array(n);
    this._flag = new Int32Array(n);
    this._pattern = new Int32Array(n);
    this._lnz = new Int32Array(n);
    this.nPerturbed = 0;
  }

  /**
   * @param {Float64Array} re real parts aligned with the CSR pattern
   * @param {Float64Array} im imaginary parts aligned with the CSR pattern
   */
  factor(re, im, { pivotTol = 1e-13 } = {}) {
    const t0 = performance.now();
    const { n, Cp, Ci, src, parent, Lp } = this.sym;
    const { Li, Lr, Lim, Dr, Di } = this;
    const Yr = this._yr, Yi = this._yi, flag = this._flag, pattern = this._pattern, Lnz = this._lnz;
    let amax = 0;
    for (let k = 0; k < n; k++)
      for (let p = Cp[k]; p < Cp[k + 1]; p++) if (Ci[p] === k) amax = Math.max(amax, Math.hypot(re[src[p]], im[src[p]]));
    const tau = pivotTol * (amax > 0 ? amax : 1);
    let nPert = 0;
    for (let k = 0; k < n; k++) {
      Lnz[k] = 0;
      Yr[k] = 0;
      Yi[k] = 0;
      let top = n;
      flag[k] = k;
      for (let p = Cp[k]; p < Cp[k + 1]; p++) {
        let i = Ci[p];
        Yr[i] += re[src[p]];
        Yi[i] += im[src[p]];
        let len = 0;
        for (; flag[i] !== k; i = parent[i]) {
          pattern[len++] = i;
          flag[i] = k;
        }
        while (len > 0) pattern[--top] = pattern[--len];
      }
      let dr = Yr[k], di = Yi[k];
      Yr[k] = 0;
      Yi[k] = 0;
      for (; top < n; top++) {
        const i = pattern[top];
        const yr = Yr[i], yi = Yi[i];
        Yr[i] = 0;
        Yi[i] = 0;
        const p2 = Lp[i] + Lnz[i];
        for (let p = Lp[i]; p < p2; p++) {
          const r = Li[p];
          Yr[r] -= Lr[p] * yr - Lim[p] * yi;
          Yi[r] -= Lr[p] * yi + Lim[p] * yr;
        }
        // l = y / D[i]
        const ar = Dr[i], ai = Di[i], den = ar * ar + ai * ai;
        const lr = (yr * ar + yi * ai) / den, li = (yi * ar - yr * ai) / den;
        // d -= l * y
        dr -= lr * yr - li * yi;
        di -= lr * yi + li * yr;
        Li[p2] = k;
        Lr[p2] = lr;
        Lim[p2] = li;
        Lnz[i]++;
      }
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
      Dr[k] = dr;
      Di[k] = di;
    }
    this.nPerturbed = nPert;
    this.ok = true;
    return { ok: true, nPerturbed: nPert, ms: performance.now() - t0 };
  }

  /** Solve A x = b for complex b = (br, bi); returns {re, im}. */
  solve(br, bi) {
    const { n, perm, Lp } = this.sym;
    const { Li, Lr, Lim, Dr, Di } = this;
    const yr = new Float64Array(n), yi = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      yr[i] = br[perm[i]];
      yi[i] = bi[perm[i]];
    }
    for (let j = 0; j < n; j++) {
      const a = yr[j], b = yi[j];
      if (a === 0 && b === 0) continue;
      for (let p = Lp[j]; p < Lp[j + 1]; p++) {
        const r = Li[p];
        yr[r] -= Lr[p] * a - Lim[p] * b;
        yi[r] -= Lr[p] * b + Lim[p] * a;
      }
    }
    for (let j = 0; j < n; j++) {
      const ar = Dr[j], ai = Di[j], den = ar * ar + ai * ai;
      const a = yr[j], b = yi[j];
      yr[j] = (a * ar + b * ai) / den;
      yi[j] = (b * ar - a * ai) / den;
    }
    for (let j = n - 1; j >= 0; j--) {
      let a = yr[j], b = yi[j];
      for (let p = Lp[j]; p < Lp[j + 1]; p++) {
        const r = Li[p];
        a -= Lr[p] * yr[r] - Lim[p] * yi[r];
        b -= Lr[p] * yi[r] + Lim[p] * yr[r];
      }
      yr[j] = a;
      yi[j] = b;
    }
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      re[perm[i]] = yr[i];
      im[perm[i]] = yi[i];
    }
    return { re, im };
  }
}

// ---- supernodal multifrontal LDL^T on a sparse.mjs `analyze` symbolic structure ---------------------------------

function diagScale(sym, valAbs) {
  const { n, lowerP, lowerI, lowerSrc } = sym;
  let amax = 0;
  for (let j = 0; j < n; j++) for (let p = lowerP[j]; p < lowerP[j + 1]; p++) if (lowerI[p] === j) amax = Math.max(amax, valAbs(lowerSrc[p]));
  return amax > 0 ? amax : 1;
}

/**
 * Real symmetric LDL^T (1x1 pivots, static pivot perturbation, inertia), multifrontal over the supernodal tree of
 * `sym = analyze(pat, ...)` from sparse.mjs (L-PERF, DevLog-024) with dense column-major fronts. Same contract as
 * LDLT (factor / solve / solveMany / solveRefined); the ordering is sym.perm.
 */
export class SupernodalLDLT {
  constructor(sym) {
    this.sym = sym;
    this.Lx = new Float64Array(sym.Lxp[sym.nsuper]);
    this.D = new Float64Array(sym.n);
    this.F = new Float64Array(sym.maxFront * sym.maxFront);
    this.rel = new Int32Array(sym.n);
    this.stack = new Float64Array(1024);
    this.stackDim = new Int32Array(sym.nsuper);
    this.nnzL = sym.nnzL;
    this.nNeg = 0;
    this.nPerturbed = 0;
    this.ok = false;
  }

  factor(values, { pivotTol = 1e-13 } = {}) {
    const t0 = performance.now();
    const { nsuper, superStart, Sp, Si, Lxp, lowerP, lowerI, lowerSrc, childHead, childNext } = this.sym;
    const { Lx, D, F, rel, stackDim } = this;
    let stack = this.stack;
    const tau = pivotTol * diagScale(this.sym, (p) => Math.abs(values[p]));
    let nNeg = 0, nPert = 0, top = 0;
    const stackPos = [];
    for (let s = 0; s < nsuper; s++) {
      const f = superStart[s], nc = superStart[s + 1] - f;
      const r0 = Sp[s], m = Sp[s + 1] - r0;
      for (let r = 0; r < m; r++) rel[Si[r0 + r]] = r;
      for (let b = 0; b < m; b++) F.fill(0, b * m + b, (b + 1) * m);
      for (let c = 0; c < nc; c++) {
        const j = f + c, cb = c * m;
        for (let p = lowerP[j]; p < lowerP[j + 1]; p++) F[rel[lowerI[p]] + cb] += values[lowerSrc[p]];
      }
      for (let ch = childHead[s]; ch !== -1; ch = childNext[ch]) {
        const off = stackPos.pop();
        const mu = stackDim[ch];
        const cr0 = Sp[ch] + (superStart[ch + 1] - superStart[ch]);
        for (let b = 0; b < mu; b++) {
          const cb = rel[Si[cr0 + b]] * m, ub = off + b * mu;
          for (let a = b; a < mu; a++) F[rel[Si[cr0 + a]] + cb] += stack[ub + a];
        }
        top = off;
      }
      // panel: left-looking within the supernode; column c holds unit L, D[f + c] the pivot
      for (let k = 0; k < nc; k++) {
        const kb = k * m;
        let c = 0;
        for (; c + 3 < k; c += 4) {
          const b0 = c * m, b1 = b0 + m, b2 = b1 + m, b3 = b2 + m;
          const w0 = F[k + b0] * D[f + c], w1 = F[k + b1] * D[f + c + 1], w2 = F[k + b2] * D[f + c + 2], w3 = F[k + b3] * D[f + c + 3];
          for (let i = k; i < m; i++) F[i + kb] -= F[i + b0] * w0 + F[i + b1] * w1 + F[i + b2] * w2 + F[i + b3] * w3;
        }
        for (; c < k; c++) {
          const b0 = c * m, w0 = F[k + b0] * D[f + c];
          if (w0 === 0) continue;
          for (let i = k; i < m; i++) F[i + kb] -= F[i + b0] * w0;
        }
        let d = F[k + kb];
        if (!(Math.abs(d) >= tau)) {
          if (!Number.isFinite(d)) {
            this.ok = false;
            return { ok: false, nNeg, nPerturbed: nPert, ms: performance.now() - t0 };
          }
          d = d < 0 ? -tau : tau;
          nPert++;
        }
        if (d < 0) nNeg++;
        D[f + k] = d;
        F[k + kb] = 1;
        const inv = 1 / d;
        for (let i = k + 1; i < m; i++) F[i + kb] *= inv;
      }
      // Schur complement of the trailing block: U -= L21 D L21^T (lower part)
      for (let j = nc; j < m; j++) {
        const jb = j * m;
        let c = 0;
        for (; c + 3 < nc; c += 4) {
          const b0 = c * m, b1 = b0 + m, b2 = b1 + m, b3 = b2 + m;
          const w0 = F[j + b0] * D[f + c], w1 = F[j + b1] * D[f + c + 1], w2 = F[j + b2] * D[f + c + 2], w3 = F[j + b3] * D[f + c + 3];
          for (let i = j; i < m; i++) F[i + jb] -= F[i + b0] * w0 + F[i + b1] * w1 + F[i + b2] * w2 + F[i + b3] * w3;
        }
        for (; c < nc; c++) {
          const b0 = c * m, w0 = F[j + b0] * D[f + c];
          if (w0 === 0) continue;
          for (let i = j; i < m; i++) F[i + jb] -= F[i + b0] * w0;
        }
      }
      Lx.set(F.subarray(0, m * nc), Lxp[s]);
      const mu = m - nc;
      stackDim[s] = mu;
      if (mu > 0) {
        const need = top + mu * mu;
        if (need > stack.length) {
          const bigger = new Float64Array(Math.max(need, 2 * stack.length));
          bigger.set(stack.subarray(0, top));
          stack = bigger;
          this.stack = stack;
        }
        for (let b = 0; b < mu; b++) {
          const src = (nc + b) * m + nc, dst = top + b * mu;
          for (let a = b; a < mu; a++) stack[dst + a] = F[src + a];
        }
        stackPos.push(top);
        top = need;
      } else stackPos.push(top);
    }
    this.nNeg = nNeg;
    this.nPerturbed = nPert;
    this.ok = true;
    const ms = performance.now() - t0;
    this.factorMs = ms;
    return { ok: true, nNeg, nPerturbed: nPert, ms };
  }

  /** Solve for q right-hand sides stored one after another in b (length n * q); one pass over L. */
  solveMany(b, q, out) {
    const { n, perm, nsuper, superStart, Sp, Si, Lxp } = this.sym;
    const { Lx, D } = this;
    const y = new Float64Array(n * q);
    for (let i = 0; i < n; i++) {
      const pi = perm[i];
      for (let k = 0; k < q; k++) y[i * q + k] = b[k * n + pi];
    }
    for (let s = 0; s < nsuper; s++) {
      const f = superStart[s], nc = superStart[s + 1] - f, r0 = Sp[s], m = Sp[s + 1] - r0, lo = Lxp[s];
      for (let c = 0; c < nc; c++) {
        const cb = lo + c * m, jq = (f + c) * q;
        for (let r = c + 1; r < m; r++) {
          const l = Lx[cb + r];
          if (l === 0) continue;
          const iq = Si[r0 + r] * q;
          for (let k = 0; k < q; k++) y[iq + k] -= l * y[jq + k];
        }
      }
    }
    for (let j = 0; j < n; j++) {
      const dj = 1 / D[j];
      for (let k = 0; k < q; k++) y[j * q + k] *= dj;
    }
    const v = new Float64Array(q);
    for (let s = nsuper - 1; s >= 0; s--) {
      const f = superStart[s], nc = superStart[s + 1] - f, r0 = Sp[s], m = Sp[s + 1] - r0, lo = Lxp[s];
      for (let c = nc - 1; c >= 0; c--) {
        const cb = lo + c * m, jq = (f + c) * q;
        for (let k = 0; k < q; k++) v[k] = y[jq + k];
        for (let r = c + 1; r < m; r++) {
          const l = Lx[cb + r];
          if (l === 0) continue;
          const iq = Si[r0 + r] * q;
          for (let k = 0; k < q; k++) v[k] -= l * y[iq + k];
        }
        for (let k = 0; k < q; k++) y[jq + k] = v[k];
      }
    }
    out = out ?? new Float64Array(n * q);
    for (let i = 0; i < n; i++) {
      const pi = perm[i];
      for (let k = 0; k < q; k++) out[k * n + pi] = y[i * q + k];
    }
    return out;
  }

  solve(b, out) {
    const { n, perm, nsuper, superStart, Sp, Si, Lxp } = this.sym;
    const { Lx, D } = this;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = b[perm[i]];
    for (let s = 0; s < nsuper; s++) {
      const f = superStart[s], nc = superStart[s + 1] - f, r0 = Sp[s], m = Sp[s + 1] - r0, lo = Lxp[s];
      // within the supernode (dense lower triangle), then the rows below
      for (let c = 0; c < nc; c++) {
        const cb = lo + c * m, yj = y[f + c];
        if (yj === 0) continue;
        for (let r = c + 1; r < nc; r++) y[f + r] -= Lx[cb + r] * yj;
        for (let r = nc; r < m; r++) y[Si[r0 + r]] -= Lx[cb + r] * yj;
      }
    }
    for (let j = 0; j < n; j++) y[j] /= D[j];
    for (let s = nsuper - 1; s >= 0; s--) {
      const f = superStart[s], nc = superStart[s + 1] - f, r0 = Sp[s], m = Sp[s + 1] - r0, lo = Lxp[s];
      for (let c = nc - 1; c >= 0; c--) {
        const cb = lo + c * m;
        let v = y[f + c];
        for (let r = c + 1; r < nc; r++) v -= Lx[cb + r] * y[f + r];
        for (let r = nc; r < m; r++) v -= Lx[cb + r] * y[Si[r0 + r]];
        y[f + c] = v;
      }
    }
    out = out ?? new Float64Array(n);
    for (let i = 0; i < n; i++) out[perm[i]] = y[i];
    return out;
  }
}
SupernodalLDLT.prototype.solveRefined = LDLT.prototype.solveRefined;

/** Complex-symmetric multifrontal LDL^T (A = A^T, complex, no conjugation) on a sparse.mjs `analyze` structure. */
export class ComplexSupernodalLDLT {
  constructor(sym) {
    this.sym = sym;
    const nL = sym.Lxp[sym.nsuper];
    this.Lr = new Float64Array(nL);
    this.Li = new Float64Array(nL);
    this.Dr = new Float64Array(sym.n);
    this.Di = new Float64Array(sym.n);
    this.Fr = new Float64Array(sym.maxFront * sym.maxFront);
    this.Fi = new Float64Array(sym.maxFront * sym.maxFront);
    this.rel = new Int32Array(sym.n);
    this.sr = new Float64Array(1024);
    this.si = new Float64Array(1024);
    this.stackDim = new Int32Array(sym.nsuper);
    this.nPerturbed = 0;
  }

  factor(re, im, { pivotTol = 1e-13 } = {}) {
    const t0 = performance.now();
    const { nsuper, superStart, Sp, Si, Lxp, lowerP, lowerI, lowerSrc, childHead, childNext } = this.sym;
    const { Lr, Li, Dr, Di, Fr, Fi, rel, stackDim } = this;
    let sr = this.sr, si = this.si;
    const tau = pivotTol * diagScale(this.sym, (p) => Math.hypot(re[p], im[p]));
    let nPert = 0, top = 0;
    const stackPos = [];
    for (let s = 0; s < nsuper; s++) {
      const f = superStart[s], nc = superStart[s + 1] - f;
      const r0 = Sp[s], m = Sp[s + 1] - r0;
      for (let r = 0; r < m; r++) rel[Si[r0 + r]] = r;
      for (let b = 0; b < m; b++) {
        Fr.fill(0, b * m + b, (b + 1) * m);
        Fi.fill(0, b * m + b, (b + 1) * m);
      }
      for (let c = 0; c < nc; c++) {
        const j = f + c, cb = c * m;
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
          const cb = rel[Si[cr0 + b]] * m, ub = off + b * mu;
          for (let a = b; a < mu; a++) {
            const at = rel[Si[cr0 + a]] + cb;
            Fr[at] += sr[ub + a];
            Fi[at] += si[ub + a];
          }
        }
        top = off;
      }
      const update = (k, lim) => {
        // column k (rows i >= lim) -= sum_{c < min(k, nc)} L[:, c] D[c] L[k, c]
        const kb = k * m;
        const cmax = Math.min(k, nc);
        for (let c = 0; c < cmax; c++) {
          const b0 = c * m;
          const lr = Fr[k + b0], li = Fi[k + b0];
          const dr = Dr[f + c], di = Di[f + c];
          const wr = lr * dr - li * di, wi = lr * di + li * dr;
          if (wr === 0 && wi === 0) continue;
          for (let i = lim; i < m; i++) {
            const ar = Fr[i + b0], ai = Fi[i + b0];
            Fr[i + kb] -= ar * wr - ai * wi;
            Fi[i + kb] -= ar * wi + ai * wr;
          }
        }
      };
      for (let k = 0; k < nc; k++) {
        update(k, k);
        const kb = k * m;
        let dr = Fr[k + kb], di = Fi[k + kb];
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
        const den = dr * dr + di * di, ir = dr / den, ii = -di / den;
        for (let i = k + 1; i < m; i++) {
          const ar = Fr[i + kb], ai = Fi[i + kb];
          Fr[i + kb] = ar * ir - ai * ii;
          Fi[i + kb] = ar * ii + ai * ir;
        }
      }
      for (let j = nc; j < m; j++) update(j, j);
      Lr.set(Fr.subarray(0, m * nc), Lxp[s]);
      Li.set(Fi.subarray(0, m * nc), Lxp[s]);
      const mu = m - nc;
      stackDim[s] = mu;
      if (mu > 0) {
        const need = top + mu * mu;
        if (need > sr.length) {
          const len = Math.max(need, 2 * sr.length);
          const br = new Float64Array(len), bi = new Float64Array(len);
          br.set(sr.subarray(0, top));
          bi.set(si.subarray(0, top));
          sr = this.sr = br;
          si = this.si = bi;
        }
        for (let b = 0; b < mu; b++) {
          const src = (nc + b) * m + nc, dst = top + b * mu;
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

  /** Solve A x = b for complex b = (br, bi); returns {re, im}. */
  solve(br, bi) {
    const { n, perm, nsuper, superStart, Sp, Si, Lxp } = this.sym;
    const { Lr, Li, Dr, Di } = this;
    const yr = new Float64Array(n), yi = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      yr[i] = br[perm[i]];
      yi[i] = bi[perm[i]];
    }
    for (let s = 0; s < nsuper; s++) {
      const f = superStart[s], nc = superStart[s + 1] - f, r0 = Sp[s], m = Sp[s + 1] - r0, lo = Lxp[s];
      for (let c = 0; c < nc; c++) {
        const cb = lo + c * m, a = yr[f + c], b = yi[f + c];
        if (a === 0 && b === 0) continue;
        for (let r = c + 1; r < m; r++) {
          const lr = Lr[cb + r], li = Li[cb + r], t = Si[r0 + r];
          yr[t] -= lr * a - li * b;
          yi[t] -= lr * b + li * a;
        }
      }
    }
    for (let j = 0; j < n; j++) {
      const ar = Dr[j], ai = Di[j], den = ar * ar + ai * ai, a = yr[j], b = yi[j];
      yr[j] = (a * ar + b * ai) / den;
      yi[j] = (b * ar - a * ai) / den;
    }
    for (let s = nsuper - 1; s >= 0; s--) {
      const f = superStart[s], nc = superStart[s + 1] - f, r0 = Sp[s], m = Sp[s + 1] - r0, lo = Lxp[s];
      for (let c = nc - 1; c >= 0; c--) {
        const cb = lo + c * m;
        let a = yr[f + c], b = yi[f + c];
        for (let r = c + 1; r < m; r++) {
          const lr = Lr[cb + r], li = Li[cb + r], t = Si[r0 + r];
          a -= lr * yr[t] - li * yi[t];
          b -= lr * yi[t] + li * yr[t];
        }
        yr[f + c] = a;
        yi[f + c] = b;
      }
    }
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      re[perm[i]] = yr[i];
      im[perm[i]] = yi[i];
    }
    return { re, im };
  }
}

/**
 * Iterative refinement for the complex-symmetric factors (ComplexLDLT, ComplexSupernodalLDLT) against the
 * unperturbed matrix (re + j im on the CSR pattern). Used after static pivot perturbation (audit V3).
 * @returns {{re:Float64Array, im:Float64Array, relResidual:number, steps:number}}
 */
function complexSolveRefined(pat, re, im, br, bi, { maxSteps = 3, tol = 1e-14 } = {}) {
  const n = pat.n;
  const x = this.solve(br, bi);
  const rr = new Float64Array(n), ri = new Float64Array(n);
  let bn = 0;
  for (let i = 0; i < n; i++) bn += br[i] * br[i] + bi[i] * bi[i];
  bn = Math.sqrt(bn) || 1;
  let rel = Infinity, steps = 0;
  for (; steps <= maxSteps; steps++) {
    let rn = 0;
    for (let i = 0; i < n; i++) {
      let sr = br[i], si = bi[i];
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
        const j = pat.colidx[p];
        sr -= re[p] * x.re[j] - im[p] * x.im[j];
        si -= re[p] * x.im[j] + im[p] * x.re[j];
      }
      rr[i] = sr;
      ri[i] = si;
      rn += sr * sr + si * si;
    }
    rel = Math.sqrt(rn) / bn;
    if (rel < tol || steps === maxSteps) break;
    const d = this.solve(rr, ri);
    for (let i = 0; i < n; i++) {
      x.re[i] += d.re[i];
      x.im[i] += d.im[i];
    }
  }
  return { re: x.re, im: x.im, relResidual: rel, steps };
}
ComplexLDLT.prototype.solveRefined = complexSolveRefined;
ComplexSupernodalLDLT.prototype.solveRefined = complexSolveRefined;
