// Ported from eo-modulator-atlas engine/tests/vector-ldlt.test.mjs at eb97f96 (GPL-3.0-or-later).
// Local changes: import paths ../src/ldlt.mjs, ../src/sparse.mjs -> ../src/la/.
// LDL^T factor tests (DevLog-025 round 2, audit V3): static pivot perturbation followed by iterative refinement,
// real and complex-symmetric, up-looking and supernodal, against the exact solution of a constructed system.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SymbolicLDLT, LDLT, ComplexLDLT, SupernodalLDLT, ComplexSupernodalLDLT } from '../src/la/ldlt.mjs';
import { analyze } from '../src/la/sparse.mjs';

/** Symmetric sparse test matrix with 2x2 blocks [[0, a], [a, 0]] on the diagonal (1x1 pivots hit exact zeros). */
function system(nb, complex) {
  const n = 2 * nb;
  let seed = 4242;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296 - 0.5);
  const ent = new Map();
  const add = (i, j, re, im) => {
    for (const [a, b] of i === j ? [[i, j]] : [[i, j], [j, i]]) {
      const k = a * n + b, v = ent.get(k) ?? [0, 0];
      ent.set(k, [v[0] + re, v[1] + im]);
    }
  };
  for (let b = 0; b < nb; b++) {
    add(2 * b, 2 * b + 1, 2 + rnd(), complex ? 0.3 * rnd() : 0);
    add(2 * b, 2 * b, 0, 0);
    add(2 * b + 1, 2 * b + 1, 0, 0);
    if (b + 1 < nb) add(2 * b + 1, 2 * b + 2, 0.3 * rnd(), complex ? 0.1 * rnd() : 0);
  }
  const keys = [...ent.keys()].sort((p, q) => p - q);
  const rowptr = new Int32Array(n + 1), colidx = new Int32Array(keys.length), re = new Float64Array(keys.length), im = new Float64Array(keys.length);
  keys.forEach((k, q) => {
    rowptr[Math.floor(k / n) + 1]++;
    colidx[q] = k % n;
    [re[q], im[q]] = ent.get(k);
  });
  for (let i = 0; i < n; i++) rowptr[i + 1] += rowptr[i];
  const pat = { n, rowptr, colidx, nnz: keys.length };
  const xr = new Float64Array(n).map(() => rnd()), xi = new Float64Array(n).map(() => (complex ? rnd() : 0));
  const br = new Float64Array(n), bi = new Float64Array(n);
  for (let i = 0; i < n; i++)
    for (let p = rowptr[i]; p < rowptr[i + 1]; p++) {
      const j = colidx[p];
      br[i] += re[p] * xr[j] - im[p] * xi[j];
      bi[i] += re[p] * xi[j] + im[p] * xr[j];
    }
  return { pat, re, im, xr, xi, br, bi };
}

const err = (a, b) => {
  let e = 0, m = 0;
  for (let i = 0; i < a.length; i++) {
    e = Math.max(e, Math.abs(a[i] - b[i]));
    m = Math.max(m, Math.abs(b[i]));
  }
  return e / m;
};

test('real LDL^T: static pivot perturbation is counted and refinement recovers the exact solution', () => {
  const s = system(40, false);
  const ident = Int32Array.from({ length: s.pat.n }, (_, i) => i);
  for (const f of [new LDLT(new SymbolicLDLT(s.pat, ident)), new SupernodalLDLT(analyze(s.pat, { perm: ident }))]) {
    const r = f.factor(s.re);
    assert.ok(r.ok && r.nPerturbed > 0, `perturbed ${r.nPerturbed}`);
    const x = f.solveRefined(s.pat, s.re, s.br, { maxSteps: 30 });
    assert.ok(err(x.x, s.xr) < 1e-10, `refined error ${err(x.x, s.xr)}`);
  }
});

test('complex-symmetric LDL^T: static pivot perturbation and complex iterative refinement (audit V3)', () => {
  const s = system(40, true);
  const ident = Int32Array.from({ length: s.pat.n }, (_, i) => i);
  for (const f of [new ComplexLDLT(new SymbolicLDLT(s.pat, ident)), new ComplexSupernodalLDLT(analyze(s.pat, { perm: ident }))]) {
    const r = f.factor(s.re, s.im);
    assert.ok(r.ok && r.nPerturbed > 0, `perturbed ${r.nPerturbed}`);
    const plain = f.solve(s.br, s.bi);
    const ref = f.solveRefined(s.pat, s.re, s.im, s.br, s.bi, { maxSteps: 30 });
    assert.ok(err(ref.re, s.xr) < 1e-10 && err(ref.im, s.xi) < 1e-10, `refined error ${err(ref.re, s.xr)} ${err(ref.im, s.xi)}`);
    assert.ok(err(plain.re, s.xr) > 1e-6, 'unrefined solve is visibly wrong (the test exercises the refinement)');
  }
});
