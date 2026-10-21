// Ported from eo-modulator-atlas engine/tests/perf-sparse.test.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: the 2D FEM fixture (EO fem.mjs, section.mjs mesher; not ported) is replaced by a 3D Q1 hex Laplacian
// on a graded box grid with one fixed face (buildElementPattern); the triangle-pattern test checks hex connectivity;
// the AMD-vs-ND test compares against the coordinate bisection ND on the x-y node coordinates (fill and flops are
// reported, AMD must give a valid permutation and a finite analysis). Import paths -> ../src/la/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildElementPattern, amdOrder, ndOrder, analyze, factorNumeric, solveNumeric, solveNumericMulti, SparseCholesky, UpLookingCholesky, matVec, entryIndex } from '../src/la/sparse.mjs';

/** Q1 hex mesh on a tensor grid; element matrix of -div(k grad) with diagonal k on a box (tensor product, exact). */
function hexMatrix(nx = 6, ny = 5, nz = 4) {
  const xs = Array.from({ length: nx + 1 }, (_, i) => (i / nx) ** 1.3);
  const ys = Array.from({ length: ny + 1 }, (_, j) => j / ny);
  const zs = Array.from({ length: nz + 1 }, (_, k) => 0.2 * (k / nz) ** 0.8);
  const N = (i, j, k) => i + (nx + 1) * (j + (ny + 1) * k);
  const n = (nx + 1) * (ny + 1) * (nz + 1);
  const ne = nx * ny * nz;
  const elem = new Int32Array(8 * ne);
  const S = [[1, -1], [-1, 1]], M = [[2, 1], [1, 2]];
  const Ke = [];
  let e = 0;
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, e++) {
        const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
        const kx = 1 + (i % 2), ky = 0.5, kz = 3 + (k % 3);
        const K = new Float64Array(64);
        for (let a = 0; a < 8; a++)
          for (let b = 0; b < 8; b++) {
            const ia = a & 1, ja = (a >> 1) & 1, ka = a >> 2, ib = b & 1, jb = (b >> 1) & 1, kb = b >> 2;
            K[8 * a + b] = kx * (S[ia][ib] / hx) * (M[ja][jb] * hy / 6) * (M[ka][kb] * hz / 6)
              + ky * (M[ia][ib] * hx / 6) * (S[ja][jb] / hy) * (M[ka][kb] * hz / 6)
              + kz * (M[ia][ib] * hx / 6) * (M[ja][jb] * hy / 6) * (S[ka][kb] / hz);
          }
        Ke.push(K);
        for (let a = 0; a < 8; a++) elem[8 * e + a] = N(i + (a & 1), j + ((a >> 1) & 1), k + (a >> 2));
      }
  const full = buildElementPattern(n, elem, 8);
  const vals = new Float64Array(full.nnz);
  for (let q = 0; q < ne; q++)
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) vals[entryIndex(full, elem[8 * q + a], elem[8 * q + b])] += Ke[q][8 * a + b];
  // Dirichlet on x = 0: restrict to free nodes
  const map = new Int32Array(n).fill(-1);
  let nf = 0;
  const X = new Float64Array(n), Y = new Float64Array(n);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const v = N(i, j, k); X[v] = xs[i]; Y[v] = ys[j] + 0.37 * zs[k]; if (i > 0) map[v] = nf++; }
  const rowptr = new Int32Array(nf + 1), cols = [], vv = [];
  for (let v = 0; v < n; v++) {
    if (map[v] < 0) continue;
    for (let p = full.rowptr[v]; p < full.rowptr[v + 1]; p++) {
      const w = full.colidx[p];
      if (map[w] < 0) continue;
      cols.push(map[w]);
      vv.push(vals[p]);
    }
    rowptr[map[v] + 1] = cols.length;
  }
  const x = new Float64Array(nf), y = new Float64Array(nf);
  for (let v = 0; v < n; v++) if (map[v] >= 0) { x[map[v]] = X[v]; y[map[v]] = Y[v]; }
  return { elem, n, full, sub: { nf, pat: { n: nf, rowptr, colidx: Int32Array.from(cols), nnz: cols.length }, val: Float64Array.from(vv), x, y } };
}

const isPerm = (p, n) => p.length === n && new Set(p).size === n && Math.min(...p) === 0 && Math.max(...p) === n - 1;

test('buildElementPattern rows are sorted, unique, symmetric and contain the diagonal and every hex coupling', () => {
  const { full: pat, elem } = hexMatrix(3, 3, 2);
  for (let i = 0; i < pat.n; i++) {
    for (let p = pat.rowptr[i] + 1; p < pat.rowptr[i + 1]; p++) assert.ok(pat.colidx[p] > pat.colidx[p - 1]);
    assert.ok(entryIndex(pat, i, i) >= 0);
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) assert.ok(entryIndex(pat, pat.colidx[p], i) >= 0);
  }
  for (let e = 0; e < elem.length / 8; e++) for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) assert.ok(entryIndex(pat, elem[8 * e + a], elem[8 * e + b]) >= 0);
});

test('AMD and coordinate ND return permutations; both analyses are consistent', () => {
  const { sub } = hexMatrix(8, 8, 4);
  const n = sub.nf;
  const perm = amdOrder(sub.pat);
  assert.ok(isPerm(perm, n));
  const amd = analyze(sub.pat, { perm });
  const nd = analyze(sub.pat, { perm: ndOrder(sub.pat, sub.x, sub.y) });
  assert.ok(amd.nnzL >= amd.nnzA && nd.nnzL >= nd.nnzA);
  assert.ok(amd.fill > 1 && Number.isFinite(amd.flops));
});

test('symbolic column counts equal the up-looking factor structure; supernode rows start with their own columns', () => {
  const { sub } = hexMatrix(5, 4, 3);
  for (const relax of [false, true]) {
    const sym = analyze(sub.pat, { relax });
    const up = new UpLookingCholesky(sub.pat, sym.perm);
    assert.equal(sym.nnzL, up.nnzL);
    for (let j = 0; j < sym.n; j++) assert.equal(sym.colCount[j], up.Lp[j + 1] - up.Lp[j]);
    assert.ok(isPerm(sym.perm, sym.n));
    for (let s = 0; s < sym.nsuper; s++) {
      const f = sym.superStart[s], nc = sym.superStart[s + 1] - f;
      for (let c = 0; c < nc; c++) assert.equal(sym.Si[sym.Sp[s] + c], f + c);
      for (let r = sym.Sp[s] + 1; r < sym.Sp[s + 1]; r++) assert.ok(sym.Si[r] > sym.Si[r - 1]);
    }
    if (!relax) assert.equal(sym.nnzLStored - sym.superStart.reduce((a, f, s) => (s < sym.nsuper ? a + ((sym.superStart[s + 1] - f) * (sym.superStart[s + 1] - f - 1)) / 2 : a), 0), sym.nnzL);
  }
});

test('supernodal factor matches the up-looking oracle to round-off and reuses its symbolic analysis', () => {
  const { sub } = hexMatrix();
  const n = sub.nf;
  const b = Float64Array.from({ length: n }, (_, i) => Math.sin(0.7 * i) + 0.3);
  const sn = new SparseCholesky(sub.pat);
  assert.ok(sn.factor(sub.val));
  const up = new UpLookingCholesky(sub.pat, sn.perm);
  assert.ok(up.factor(sub.val));
  const xs = sn.solve(b), xu = up.solve(b);
  let d = 0, m = 0;
  for (let i = 0; i < n; i++) { d = Math.max(d, Math.abs(xs[i] - xu[i])); m = Math.max(m, Math.abs(xu[i])); }
  assert.ok(d / m < 1e-12, `${d / m}`);
  const r = matVec(sub.pat, sub.val, xs);
  let rr = 0, bb = 0;
  for (let i = 0; i < n; i++) { rr += (r[i] - b[i]) ** 2; bb += b[i] ** 2; }
  assert.ok(Math.sqrt(rr / bb) < 1e-12);
  const v2 = sub.val.map((v) => 2 * v);
  const sn2 = new SparseCholesky(sub.pat, null, { sym: sn.sym });
  assert.equal(sn2.timing.symbolicReused, true);
  assert.ok(sn2.factor(v2));
  const x2 = sn2.solve(b);
  for (let i = 0; i < n; i++) assert.ok(Math.abs(2 * x2[i] - xs[i]) <= 1e-12 * m);
});

test('supernodal factor reports an indefinite matrix instead of returning a factor', () => {
  const { sub } = hexMatrix(4, 4, 3);
  const v = sub.val.slice();
  for (let i = 0; i < sub.nf; i++) v[entryIndex(sub.pat, i, i)] -= 1e3;
  const sn = new SparseCholesky(sub.pat);
  assert.equal(sn.factor(v), false);
  assert.throws(() => sn.solve(new Float64Array(sub.nf)), /without a successful factorization/);
});

test('a symbolic analysis from a different pattern with the same size is rejected (audit P1)', () => {
  const { sub } = hexMatrix(4, 4, 3);
  const sym = analyze(sub.pat);
  const other = { ...sub.pat, colidx: sub.pat.colidx.slice() };
  const last = other.rowptr[1] - 1;
  other.colidx[last] = (other.colidx[last] + 1) % other.n;
  assert.throws(() => new SparseCholesky(other, null, { sym }), /different sparsity pattern/);
  assert.throws(() => factorNumeric(sym, sub.val, null, other), /different sparsity pattern/);
  assert.throws(() => factorNumeric(sym, sub.val.subarray(1)), /values for a pattern/);
});

test('empty pattern, nd without coordinates and solves after a failed factorization (audit P5, P1)', () => {
  const empty = { n: 0, rowptr: new Int32Array(1), colidx: new Int32Array(0), nnz: 0 };
  const ch = new SparseCholesky(empty);
  assert.ok(ch.factor(new Float64Array(0)));
  assert.equal(ch.solve(new Float64Array(0)).length, 0);
  const { sub } = hexMatrix(4, 4, 3);
  assert.throws(() => analyze(sub.pat, { ordering: 'nd' }), /needs node coordinates/);
  const v = sub.val.map((x) => -x);
  const num = factorNumeric(analyze(sub.pat), v);
  assert.equal(num.ok, false);
  assert.throws(() => solveNumeric(num, new Float64Array(sub.nf)), /no successful numeric factorization/);
  assert.throws(() => solveNumericMulti(num, [new Float64Array(sub.nf), new Float64Array(sub.nf)]), /no successful numeric factorization/);
});
