// Complex restarted GMRES with right preconditioning (lane L22, DevLog-014 D3).
// Adapted from awslabs/palace palace/linalg/iterative.cpp at 29ad351f (Apache-2.0); changes: JavaScript, complex
// vectors as separate re / im Float64Arrays, right preconditioning only, modified Gram-Schmidt with one
// re-orthogonalization pass (Palace offers MGS / CGS / CGS2), Givens rotations on the Hessenberg matrix,
// relative tolerance on the unpreconditioned residual ||b - A x|| / ||b||. License of this file: GPL-3.0-or-later;
// see engine/src/em3d/NOTICE for the Palace attribution.

/** Hermitian inner product x^H y of complex vectors. */
function dotc(xr, xi, yr, yi) {
  let sr = 0,
    si = 0;
  for (let k = 0; k < xr.length; k++) {
    sr += xr[k] * yr[k] + xi[k] * yi[k];
    si += xr[k] * yi[k] - xi[k] * yr[k];
  }
  return [sr, si];
}
const norm2 = (xr, xi) => {
  let s = 0;
  for (let k = 0; k < xr.length; k++) s += xr[k] * xr[k] + xi[k] * xi[k];
  return Math.sqrt(s);
};

/**
 * Solve A x = b. op(xr, xi, yr, yi): y = A x. pc(rr, ri, zr, zi): z = M^-1 r (null: identity).
 * Options: rtol (relative to ||b||), maxIter (total inner iterations), restart, x0 ({re, im}) .
 * Returns {re, im, iterations, relres, converged, history}.
 */
export function gmres(op, pc, br, bi, { rtol = 1e-10, maxIter = 300, restart = 40, x0 = null, onIter = null, work = null } = {}) {
  const n = br.length;
  const xr = x0 ? Float64Array.from(x0.re) : new Float64Array(n),
    xi = x0 ? Float64Array.from(x0.im) : new Float64Array(n);
  const bn = norm2(br, bi);
  const history = [];
  if (bn === 0) return { re: xr, im: xi, iterations: 0, relres: 0, converged: true, history };
  const m = restart;
  // Krylov basis (m + 1 complex vectors): reused from work when the sizes match
  if (work && !(work.n === n && work.m === m)) Object.assign(work, { n, m, Vr: null, Vi: null });
  let Vr = work?.Vr,
    Vi = work?.Vi;
  if (!Vr) {
    Vr = [];
    Vi = [];
    for (let j = 0; j <= m; j++) {
      Vr.push(new Float64Array(n));
      Vi.push(new Float64Array(n));
    }
    if (work) Object.assign(work, { Vr, Vi });
  }
  const Hr = new Float64Array((m + 1) * m),
    Hi = new Float64Array((m + 1) * m);
  const cs = new Float64Array(m),
    snr = new Float64Array(m),
    sni = new Float64Array(m);
  const gr = new Float64Array(m + 1),
    gi = new Float64Array(m + 1);
  const wr = new Float64Array(n),
    wi = new Float64Array(n),
    zr = new Float64Array(n),
    zi = new Float64Array(n);
  let it = 0,
    relres = 1,
    converged = false;
  while (it < maxIter) {
    // r = b - A x
    op(xr, xi, wr, wi);
    for (let k = 0; k < n; k++) {
      wr[k] = br[k] - wr[k];
      wi[k] = bi[k] - wi[k];
    }
    let beta = norm2(wr, wi);
    relres = beta / bn;
    history.push(relres);
    if (relres <= rtol) {
      converged = true;
      break;
    }
    for (let k = 0; k < n; k++) {
      Vr[0][k] = wr[k] / beta;
      Vi[0][k] = wi[k] / beta;
    }
    gr.fill(0);
    gi.fill(0);
    gr[0] = beta;
    let j = 0;
    for (; j < m && it < maxIter; j++, it++) {
      // w = A M^-1 v_j
      if (pc) pc(Vr[j], Vi[j], zr, zi);
      else {
        zr.set(Vr[j]);
        zi.set(Vi[j]);
      }
      op(zr, zi, wr, wi);
      // modified Gram-Schmidt, two passes
      for (let pass = 0; pass < 2; pass++)
        for (let i = 0; i <= j; i++) {
          const [hr, hi] = dotc(Vr[i], Vi[i], wr, wi);
          Hr[i * m + j] += hr;
          Hi[i * m + j] += hi;
          const vr = Vr[i],
            vi = Vi[i];
          for (let k = 0; k < n; k++) {
            wr[k] -= hr * vr[k] - hi * vi[k];
            wi[k] -= hr * vi[k] + hi * vr[k];
          }
        }
      const h = norm2(wr, wi);
      Hr[(j + 1) * m + j] = h;
      Hi[(j + 1) * m + j] = 0;
      if (h > 0)
        for (let k = 0; k < n; k++) {
          Vr[j + 1][k] = wr[k] / h;
          Vi[j + 1][k] = wi[k] / h;
        }
      // apply previous Givens rotations to column j: [c s; -conj(s) c]
      for (let i = 0; i < j; i++) {
        const ar = Hr[i * m + j],
          ai = Hi[i * m + j],
          br2 = Hr[(i + 1) * m + j],
          bi2 = Hi[(i + 1) * m + j];
        // t = c a + s b ; b' = -conj(s) a + c b
        Hr[i * m + j] = cs[i] * ar + (snr[i] * br2 - sni[i] * bi2);
        Hi[i * m + j] = cs[i] * ai + (snr[i] * bi2 + sni[i] * br2);
        Hr[(i + 1) * m + j] = -(snr[i] * ar + sni[i] * ai) + cs[i] * br2;
        Hi[(i + 1) * m + j] = -(snr[i] * ai - sni[i] * ar) + cs[i] * bi2;
      }
      // new rotation zeroing H[j+1][j]
      const ar = Hr[j * m + j],
        ai = Hi[j * m + j],
        bb = Hr[(j + 1) * m + j];
      const na = Math.hypot(ar, ai);
      const r = Math.hypot(na, bb);
      let c, sr, si;
      if (na === 0) {
        c = 0;
        sr = 1;
        si = 0;
      } else {
        c = na / r;
        // s = (a / |a|) conj(b) / r with b real
        sr = ((ar / na) * bb) / r;
        si = ((ai / na) * bb) / r;
      }
      cs[j] = c;
      snr[j] = sr;
      sni[j] = si;
      Hr[j * m + j] = c * ar + (sr * bb);
      Hi[j * m + j] = c * ai + (si * bb);
      Hr[(j + 1) * m + j] = 0;
      // g: [g_j, g_j+1] = [c g_j, -conj(s) g_j]
      const g0r = gr[j],
        g0i = gi[j];
      gr[j] = c * g0r;
      gi[j] = c * g0i;
      gr[j + 1] = -(sr * g0r + si * g0i);
      gi[j + 1] = -(sr * g0i - si * g0r);
      relres = Math.hypot(gr[j + 1], gi[j + 1]) / bn;
      history.push(relres);
      onIter?.(it + 1, relres);
      if (relres <= rtol || h === 0) {
        j++;
        it++;
        break;
      }
    }
    // y = H^-1 g (upper triangular j x j), x += M^-1 (V y)
    const yr = new Float64Array(j),
      yi = new Float64Array(j);
    for (let i = j - 1; i >= 0; i--) {
      let sr2 = gr[i],
        si2 = gi[i];
      for (let k = i + 1; k < j; k++) {
        sr2 -= Hr[i * m + k] * yr[k] - Hi[i * m + k] * yi[k];
        si2 -= Hr[i * m + k] * yi[k] + Hi[i * m + k] * yr[k];
      }
      const dr = Hr[i * m + i],
        di = Hi[i * m + i];
      const d = dr * dr + di * di;
      yr[i] = (sr2 * dr + si2 * di) / d;
      yi[i] = (si2 * dr - sr2 * di) / d;
    }
    wr.fill(0);
    wi.fill(0);
    for (let i = 0; i < j; i++) {
      const vr = Vr[i],
        vi = Vi[i];
      for (let k = 0; k < n; k++) {
        wr[k] += yr[i] * vr[k] - yi[i] * vi[k];
        wi[k] += yr[i] * vi[k] + yi[i] * vr[k];
      }
    }
    if (pc) pc(wr, wi, zr, zi);
    else {
      zr.set(wr);
      zi.set(wi);
    }
    for (let k = 0; k < n; k++) {
      xr[k] += zr[k];
      xi[k] += zi[k];
    }
    Hr.fill(0);
    Hi.fill(0);
    if (relres <= rtol) {
      // confirm with the true residual
      op(xr, xi, wr, wi);
      for (let k = 0; k < n; k++) {
        wr[k] = br[k] - wr[k];
        wi[k] = bi[k] - wi[k];
      }
      relres = norm2(wr, wi) / bn;
      history.push(relres);
      if (relres <= rtol * 10) {
        converged = true;
        break;
      }
    }
  }
  return { re: xr, im: xi, iterations: it, relres, converged, history };
}
