// Small dense complex linear algebra for the EM 2D lane (N x N RLGC matrices, 2N-port S): row-major split re/im storage.
// LU with partial pivoting, inverse, solve, Hessenberg + shifted complex QR eigen-decomposition (Schur back
// substitution), matrix exponential (scaling and squaring with a high-order Taylor series), largest singular value.
// Sizes are small (N <= ~50), so clarity beats speed. License: GPL-3.0-or-later.

import { cadd, csub, cmul, csqrt } from '../la/complex.mjs';

export class CMat {
  constructor(r, c = r, re = null, im = null) {
    this.r = r;
    this.c = c;
    this.re = re ?? new Float64Array(r * c);
    this.im = im ?? new Float64Array(r * c);
  }
  static eye(n, s = 1) {
    const m = new CMat(n);
    for (let i = 0; i < n; i++) m.re[i * n + i] = s;
    return m;
  }
  /** From nested arrays of numbers or {re, im}. */
  static from(rows) {
    const r = rows.length,
      c = rows[0].length;
    const m = new CMat(r, c);
    for (let i = 0; i < r; i++)
      for (let j = 0; j < c; j++) {
        const v = rows[i][j];
        if (typeof v === 'number') m.re[i * c + j] = v;
        else {
          m.re[i * c + j] = v.re;
          m.im[i * c + j] = v.im ?? 0;
        }
      }
    return m;
  }
  /** Real matrix (Float64Array row-major or nested arrays) with optional imaginary part. */
  static real(n, re, im = null) {
    const m = new CMat(n);
    m.re.set(re);
    if (im) m.im.set(im);
    return m;
  }
  clone() {
    return new CMat(this.r, this.c, this.re.slice(), this.im.slice());
  }
  get(i, j) {
    const k = i * this.c + j;
    return { re: this.re[k], im: this.im[k] };
  }
  set(i, j, v) {
    const k = i * this.c + j;
    this.re[k] = v.re;
    this.im[k] = v.im;
    return this;
  }
  toArray() {
    const out = [];
    for (let i = 0; i < this.r; i++) {
      const row = [];
      for (let j = 0; j < this.c; j++) row.push([this.re[i * this.c + j], this.im[i * this.c + j]]);
      out.push(row);
    }
    return out;
  }
}

export function cmatMul(A, B) {
  if (A.c !== B.r) throw new Error('cmatMul: shape mismatch');
  const C = new CMat(A.r, B.c);
  const n = A.c,
    m = B.c;
  for (let i = 0; i < A.r; i++)
    for (let k = 0; k < n; k++) {
      const ar = A.re[i * n + k],
        ai = A.im[i * n + k];
      if (ar === 0 && ai === 0) continue;
      for (let j = 0; j < m; j++) {
        const br = B.re[k * m + j],
          bi = B.im[k * m + j];
        C.re[i * m + j] += ar * br - ai * bi;
        C.im[i * m + j] += ar * bi + ai * br;
      }
    }
  return C;
}

export function cmatAdd(A, B, sa = 1, sb = 1) {
  const C = new CMat(A.r, A.c);
  for (let k = 0; k < A.re.length; k++) {
    C.re[k] = sa * A.re[k] + sb * B.re[k];
    C.im[k] = sa * A.im[k] + sb * B.im[k];
  }
  return C;
}

/** s * A for complex scalar s. */
export function cmatScale(A, s) {
  const C = new CMat(A.r, A.c);
  const sr = typeof s === 'number' ? s : s.re,
    si = typeof s === 'number' ? 0 : s.im;
  for (let k = 0; k < A.re.length; k++) {
    C.re[k] = sr * A.re[k] - si * A.im[k];
    C.im[k] = sr * A.im[k] + si * A.re[k];
  }
  return C;
}

export function cmatT(A, conj = false) {
  const C = new CMat(A.c, A.r);
  for (let i = 0; i < A.r; i++)
    for (let j = 0; j < A.c; j++) {
      C.re[j * A.r + i] = A.re[i * A.c + j];
      C.im[j * A.r + i] = conj ? -A.im[i * A.c + j] : A.im[i * A.c + j];
    }
  return C;
}

export function cmatNorm1(A) {
  let best = 0;
  for (let j = 0; j < A.c; j++) {
    let s = 0;
    for (let i = 0; i < A.r; i++) s += Math.hypot(A.re[i * A.c + j], A.im[i * A.c + j]);
    if (s > best) best = s;
  }
  return best;
}

export function cmatMaxAbs(A) {
  let m = 0;
  for (let k = 0; k < A.re.length; k++) m = Math.max(m, Math.hypot(A.re[k], A.im[k]));
  return m;
}

/** Block helpers: extract rows r0..r0+nr, cols c0..c0+nc; place B into A at (r0, c0). */
export function cmatBlock(A, r0, c0, nr, nc) {
  const B = new CMat(nr, nc);
  for (let i = 0; i < nr; i++)
    for (let j = 0; j < nc; j++) {
      B.re[i * nc + j] = A.re[(r0 + i) * A.c + c0 + j];
      B.im[i * nc + j] = A.im[(r0 + i) * A.c + c0 + j];
    }
  return B;
}
export function cmatPlace(A, B, r0, c0, s = 1) {
  for (let i = 0; i < B.r; i++)
    for (let j = 0; j < B.c; j++) {
      A.re[(r0 + i) * A.c + c0 + j] = s * B.re[i * B.c + j];
      A.im[(r0 + i) * A.c + c0 + j] = s * B.im[i * B.c + j];
    }
  return A;
}

/** LU factorization with partial pivoting (in place on a copy). Throws on an exactly singular pivot. */
export function cluFactor(A) {
  const n = A.r;
  const re = A.re.slice(),
    im = A.im.slice();
  const piv = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    let p = k,
      best = -1;
    for (let i = k; i < n; i++) {
      const v = Math.hypot(re[i * n + k], im[i * n + k]);
      if (v > best) {
        best = v;
        p = i;
      }
    }
    piv[k] = p;
    if (best === 0) throw new Error('cluFactor: singular matrix');
    if (p !== k)
      for (let j = 0; j < n; j++) {
        let t = re[k * n + j];
        re[k * n + j] = re[p * n + j];
        re[p * n + j] = t;
        t = im[k * n + j];
        im[k * n + j] = im[p * n + j];
        im[p * n + j] = t;
      }
    const dr = re[k * n + k],
      di = im[k * n + k],
      dd = dr * dr + di * di;
    for (let i = k + 1; i < n; i++) {
      const ar = re[i * n + k],
        ai = im[i * n + k];
      if (ar === 0 && ai === 0) continue;
      const lr = (ar * dr + ai * di) / dd,
        li = (ai * dr - ar * di) / dd;
      re[i * n + k] = lr;
      im[i * n + k] = li;
      for (let j = k + 1; j < n; j++) {
        const ur = re[k * n + j],
          ui = im[k * n + j];
        re[i * n + j] -= lr * ur - li * ui;
        im[i * n + j] -= lr * ui + li * ur;
      }
    }
  }
  return { n, re, im, piv };
}

/** Solve A X = B (B: CMat n x m) from cluFactor output. */
export function cluSolve(lu, B) {
  const { n, re, im, piv } = lu;
  const m = B.c;
  const X = B.clone();
  for (let k = 0; k < n; k++) {
    const p = piv[k];
    if (p !== k)
      for (let j = 0; j < m; j++) {
        let t = X.re[k * m + j];
        X.re[k * m + j] = X.re[p * m + j];
        X.re[p * m + j] = t;
        t = X.im[k * m + j];
        X.im[k * m + j] = X.im[p * m + j];
        X.im[p * m + j] = t;
      }
  }
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) {
      let sr = X.re[i * m + j],
        si = X.im[i * m + j];
      for (let k = 0; k < i; k++) {
        const lr = re[i * n + k],
          li = im[i * n + k],
          xr = X.re[k * m + j],
          xi = X.im[k * m + j];
        sr -= lr * xr - li * xi;
        si -= lr * xi + li * xr;
      }
      X.re[i * m + j] = sr;
      X.im[i * m + j] = si;
    }
    for (let i = n - 1; i >= 0; i--) {
      let sr = X.re[i * m + j],
        si = X.im[i * m + j];
      for (let k = i + 1; k < n; k++) {
        const ur = re[i * n + k],
          ui = im[i * n + k],
          xr = X.re[k * m + j],
          xi = X.im[k * m + j];
        sr -= ur * xr - ui * xi;
        si -= ur * xi + ui * xr;
      }
      const dr = re[i * n + i],
        di = im[i * n + i],
        dd = dr * dr + di * di;
      X.re[i * m + j] = (sr * dr + si * di) / dd;
      X.im[i * m + j] = (si * dr - sr * di) / dd;
    }
  }
  return X;
}

export const cmatSolve = (A, B) => cluSolve(cluFactor(A), B);
export const cmatInv = (A) => cluSolve(cluFactor(A), CMat.eye(A.r));

/**
 * Matrix exponential exp(A): scaling so that ||A / 2^s||_1 <= 0.25, Taylor series to machine precision, then s
 * squarings. Truncation error of the series < 0.25^31 / 31! (negligible); squaring error grows with ||A|| as usual.
 */
export function cmatExp(A) {
  const n = A.r;
  const nrm = cmatNorm1(A);
  const s = nrm > 0.25 ? Math.ceil(Math.log2(nrm / 0.25)) : 0;
  const As = cmatScale(A, 1 / 2 ** s);
  let E = CMat.eye(n);
  let term = CMat.eye(n);
  for (let k = 1; k <= 30; k++) {
    term = cmatScale(cmatMul(term, As), 1 / k);
    E = cmatAdd(E, term);
    if (cmatMaxAbs(term) < 1e-18 * cmatMaxAbs(E)) break;
  }
  for (let i = 0; i < s; i++) E = cmatMul(E, E);
  return E;
}

// ---- eigen-decomposition ------------------------------------------------------------------

/**
 * Eigenvalues and right eigenvectors of a general complex matrix: Householder reduction to Hessenberg form,
 * complex single-shift QR with Wilkinson shifts and deflation (Schur form A = Q T Q^H), eigenvectors of T by back
 * substitution. Clustered eigenvalues (|T_ii - T_kk| <= tolCluster * ||A||) are treated as degenerate: the Schur
 * vectors of the cluster are kept as eigenvectors, which is exact when the cluster block is diagonal (e.g. lossless
 * homogeneous multiconductor lines, ZY = -w^2 mu eps I). Vectors are normalized to unit 2-norm.
 * @returns {{values: {re:Float64Array, im:Float64Array}, vectors: CMat, schurResidual:number}}
 */
export function cmatEig(A0, { tolCluster = 1e-10, maxIter = 100 } = {}) {
  const n = A0.r;
  const re = A0.re.slice(),
    im = A0.im.slice();
  const Q = CMat.eye(n);
  const qr = Q.re,
    qi = Q.im;
  const anorm = Math.max(cmatMaxAbs(A0), 1e-300);
  // Householder to Hessenberg
  for (let k = 0; k < n - 2; k++) {
    let alpha = 0;
    for (let i = k + 1; i < n; i++) alpha += re[i * n + k] ** 2 + im[i * n + k] ** 2;
    alpha = Math.sqrt(alpha);
    if (alpha < 1e-300) continue;
    const x0r = re[(k + 1) * n + k],
      x0i = im[(k + 1) * n + k];
    const x0a = Math.hypot(x0r, x0i);
    const phr = x0a > 0 ? x0r / x0a : 1,
      phi = x0a > 0 ? x0i / x0a : 0;
    // v = x + e^{i arg x0} alpha e1
    const m = n - k - 1;
    const vr = new Float64Array(m),
      vi = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      vr[i] = re[(k + 1 + i) * n + k];
      vi[i] = im[(k + 1 + i) * n + k];
    }
    vr[0] += phr * alpha;
    vi[0] += phi * alpha;
    let vn = 0;
    for (let i = 0; i < m; i++) vn += vr[i] ** 2 + vi[i] ** 2;
    if (vn < 1e-300) continue;
    // H = I - 2 v v^H / (v^H v). Apply from the left to rows k+1.. (all columns), from the right to columns k+1..
    for (let j = 0; j < n; j++) {
      let sr = 0,
        si = 0; // v^H x
      for (let i = 0; i < m; i++) {
        const xr = re[(k + 1 + i) * n + j],
          xi = im[(k + 1 + i) * n + j];
        sr += vr[i] * xr + vi[i] * xi;
        si += vr[i] * xi - vi[i] * xr;
      }
      const fr = (2 * sr) / vn,
        fi = (2 * si) / vn;
      for (let i = 0; i < m; i++) {
        re[(k + 1 + i) * n + j] -= vr[i] * fr - vi[i] * fi;
        im[(k + 1 + i) * n + j] -= vr[i] * fi + vi[i] * fr;
      }
    }
    const applyRight = (R, I) => {
      for (let r = 0; r < n; r++) {
        let sr = 0,
          si = 0; // x v
        for (let i = 0; i < m; i++) {
          const xr = R[r * n + k + 1 + i],
            xi = I[r * n + k + 1 + i];
          sr += xr * vr[i] - xi * vi[i];
          si += xr * vi[i] + xi * vr[i];
        }
        const fr = (2 * sr) / vn,
          fi = (2 * si) / vn;
        for (let i = 0; i < m; i++) {
          // x -= f v^H
          R[r * n + k + 1 + i] -= fr * vr[i] + fi * vi[i];
          I[r * n + k + 1 + i] -= fi * vr[i] - fr * vi[i];
        }
      }
    };
    applyRight(re, im);
    applyRight(qr, qi);
    for (let i = k + 2; i < n; i++) re[i * n + k] = im[i * n + k] = 0;
  }
  // shifted QR on the Hessenberg matrix (Givens), accumulate Q
  const rot = (p, cr, sR, sI, lo, hi) => {
    // G = [c, s; -conj(s), c] acting on rows p, p+1 (columns lo..n-1) and columns p, p+1 via G^H (rows 0..hi)
    for (let j = lo; j < n; j++) {
      const ar = re[p * n + j],
        ai = im[p * n + j],
        br = re[(p + 1) * n + j],
        bi = im[(p + 1) * n + j];
      re[p * n + j] = cr * ar + (sR * br - sI * bi);
      im[p * n + j] = cr * ai + (sR * bi + sI * br);
      re[(p + 1) * n + j] = -(sR * ar + sI * ai) + cr * br;
      im[(p + 1) * n + j] = -(sR * ai - sI * ar) + cr * bi;
    }
    const colRot = (R, I, rmax) => {
      for (let r = 0; r <= rmax; r++) {
        const ar = R[r * n + p],
          ai = I[r * n + p],
          br = R[r * n + p + 1],
          bi = I[r * n + p + 1];
        // [a b] G^H = [a c + b conj(s), -a s + b c]
        R[r * n + p] = cr * ar + (br * sR + bi * sI);
        I[r * n + p] = cr * ai + (bi * sR - br * sI);
        R[r * n + p + 1] = -(ar * sR - ai * sI) + cr * br;
        I[r * n + p + 1] = -(ar * sI + ai * sR) + cr * bi;
      }
    };
    colRot(re, im, hi);
    colRot(qr, qi, n - 1);
  };
  let hiIdx = n - 1;
  let iter = 0,
    totalIter = 0;
  while (hiIdx > 0) {
    // deflation search
    let l = hiIdx;
    while (l > 0) {
      const sub = Math.hypot(re[l * n + l - 1], im[l * n + l - 1]);
      const d = Math.hypot(re[l * n + l], im[l * n + l]) + Math.hypot(re[(l - 1) * n + l - 1], im[(l - 1) * n + l - 1]);
      if (sub <= 1e-15 * (d > 0 ? d : anorm)) {
        re[l * n + l - 1] = im[l * n + l - 1] = 0;
        break;
      }
      l--;
    }
    if (l === hiIdx) {
      hiIdx--;
      iter = 0;
      continue;
    }
    if (++iter > maxIter) throw new Error('cmatEig: QR iteration did not converge');
    totalIter++;
    // Wilkinson shift from the trailing 2x2 of the active block
    const a = { re: re[(hiIdx - 1) * n + hiIdx - 1], im: im[(hiIdx - 1) * n + hiIdx - 1] };
    const b = { re: re[(hiIdx - 1) * n + hiIdx], im: im[(hiIdx - 1) * n + hiIdx] };
    const c = { re: re[hiIdx * n + hiIdx - 1], im: im[hiIdx * n + hiIdx - 1] };
    const d = { re: re[hiIdx * n + hiIdx], im: im[hiIdx * n + hiIdx] };
    let mu;
    if (iter % 11 === 10) mu = { re: d.re + Math.hypot(c.re, c.im), im: d.im }; // exceptional shift
    else {
      const tr2 = { re: (a.re + d.re) / 2, im: (a.im + d.im) / 2 };
      const amd = { re: (a.re - d.re) / 2, im: (a.im - d.im) / 2 };
      const sq = csqrt(cadd(cmul(amd, amd), cmul(b, c)));
      const m1 = cadd(tr2, sq),
        m2 = csub(tr2, sq);
      mu = Math.hypot(m1.re - d.re, m1.im - d.im) < Math.hypot(m2.re - d.re, m2.im - d.im) ? m1 : m2;
    }
    // implicit single-shift sweep on rows/cols l..hiIdx: first rotation from (H_ll - mu, H_l+1,l)
    let xr = re[l * n + l] - mu.re,
      xi = im[l * n + l] - mu.im,
      yr = re[(l + 1) * n + l],
      yi = im[(l + 1) * n + l];
    for (let p = l; p < hiIdx; p++) {
      const nx = Math.hypot(xr, xi),
        ny = Math.hypot(yr, yi);
      const rr = Math.hypot(nx, ny);
      let cr, sR, sI;
      if (rr === 0) {
        cr = 1;
        sR = 0;
        sI = 0;
      } else if (nx === 0) {
        cr = 0;
        // s = conj(y)/|y| scaled so that G [x;y] = [r;0]
        sR = yr / ny;
        sI = -yi / ny;
      } else {
        cr = nx / rr;
        // s = (x/|x|) conj(y) / r
        const ur = xr / nx,
          ui = xi / nx;
        sR = (ur * yr + ui * yi) / rr;
        sI = (ui * yr - ur * yi) / rr;
      }
      rot(p, cr, sR, sI, p > l ? p - 1 : l, Math.min(p + 2, hiIdx));
      if (p < hiIdx - 1) {
        xr = re[(p + 1) * n + p];
        xi = im[(p + 1) * n + p];
        yr = re[(p + 2) * n + p];
        yi = im[(p + 2) * n + p];
      }
    }
  }
  // eigenvalues = diag(T); eigenvectors of T by back substitution
  const lr = new Float64Array(n),
    li = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lr[i] = re[i * n + i];
    li[i] = im[i * n + i];
  }
  const tnorm = anorm;
  const Y = new CMat(n);
  for (let k = 0; k < n; k++) {
    Y.re[k * n + k] = 1;
    for (let i = k - 1; i >= 0; i--) {
      let sr = 0,
        si = 0;
      for (let j = i + 1; j <= k; j++) {
        const tr = re[i * n + j],
          ti = im[i * n + j],
          yr2 = Y.re[j * n + k],
          yi2 = Y.im[j * n + k];
        sr += tr * yr2 - ti * yi2;
        si += tr * yi2 + ti * yr2;
      }
      const dr = re[i * n + i] - lr[k],
        di = im[i * n + i] - li[k];
      const dd = dr * dr + di * di;
      if (Math.sqrt(dd) <= tolCluster * tnorm) {
        // degenerate pair: keep the Schur vector (exact if the coupling is negligible)
        Y.re[i * n + k] = 0;
        Y.im[i * n + k] = 0;
        continue;
      }
      Y.re[i * n + k] = -(sr * dr + si * di) / dd;
      Y.im[i * n + k] = -(si * dr - sr * di) / dd;
    }
  }
  const V = cmatMul(Q, Y);
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += V.re[i * n + k] ** 2 + V.im[i * n + k] ** 2;
    s = Math.sqrt(s);
    for (let i = 0; i < n; i++) {
      V.re[i * n + k] /= s;
      V.im[i * n + k] /= s;
    }
  }
  // residual ||A V - V Lambda|| / ||A||
  const AV = cmatMul(A0, V);
  let res = 0;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const vr2 = V.re[i * n + k],
        vi2 = V.im[i * n + k];
      res = Math.max(res, Math.hypot(AV.re[i * n + k] - (vr2 * lr[k] - vi2 * li[k]), AV.im[i * n + k] - (vr2 * li[k] + vi2 * lr[k])));
    }
  return { values: { re: lr, im: li }, vectors: V, residual: res / anorm, iterations: totalIter };
}

/** Largest singular value of A (sqrt of the largest eigenvalue of A^H A). */
export function cmatMaxSingular(A) {
  const H = cmatMul(cmatT(A, true), A);
  const { values } = cmatEig(H);
  let m = 0;
  for (let i = 0; i < values.re.length; i++) m = Math.max(m, values.re[i]);
  return Math.sqrt(Math.max(m, 0));
}

/** 1-norm condition estimate (exact: ||A||_1 ||A^-1||_1). */
export function cmatCond1(A) {
  return cmatNorm1(A) * cmatNorm1(cmatInv(A));
}
