// Conductor surface roughness loss factors K(f) >= 1 (EM 2D lane L7). License: GPL-3.0-or-later.
//
//   hammerstad  K = 1 + (2/pi) atan(1.4 (Rq/delta)^2), saturates at 2 (Hammerstad-Jensen; R3 Sec. 2.6, standard form
//               [unverified there]); input rq_um (RMS height).
//   huray       K = A_matte/A_flat + (3/2) sum_i (N_i 4 pi a_i^2 / A_flat) / (1 + delta/a_i + delta^2/(2 a_i^2))
//               (Huray snowball, R3 Sec. 2.6 citing Simonovich [S11] p.8 Eq. 4); inputs: spheres [{a_um, n}] per
//               tile of area tile_um2, area_ratio = A_matte/A_flat (default 1).
//   cannonball  Huray with 14 equal spheres of radius r = h_rms / (2 (1 + sqrt 2)) on a square tile of side 6 r
//               (R3 Sec. 2.6 reading of Simonovich [S11] Eq. 5; the tile-area reading is [unverified] per R3).
// Use: per-conductor factor applied to that conductor's share of the series resistance (rlgc.mjs).

import { skinDepth } from './closed-forms.mjs';

const fail = (m) => {
  throw new Error(`em2d roughness: ${m}`);
};

export function cannonballParams(hRmsUm) {
  const r = hRmsUm / (2 * (1 + Math.SQRT2));
  return { spheres: [{ a_um: r, n: 14 }], tile_um2: (6 * r) ** 2, area_ratio: 1 };
}

/** Roughness spec -> K(fHz, sigma) function (null spec -> K = 1). */
export function makeRoughness(spec) {
  if (!spec || spec.model === 'none') return { model: 'none', K: () => 1 };
  if (spec.model === 'hammerstad') {
    const rq = (spec.rq_um ?? fail('hammerstad needs rq_um')) * 1e-6;
    return { model: 'hammerstad', rq_um: spec.rq_um, K: (f, sigma) => (f > 0 ? 1 + (2 / Math.PI) * Math.atan(1.4 * (rq / skinDepth(f, sigma)) ** 2) : 1) };
  }
  if (spec.model === 'huray' || spec.model === 'cannonball') {
    const p = spec.model === 'cannonball' ? cannonballParams(spec.h_rms_um ?? fail('cannonball needs h_rms_um')) : spec;
    const tile = (p.tile_um2 ?? fail('huray needs tile_um2')) * 1e-12;
    const spheres = (p.spheres ?? fail('huray needs spheres')).map((s) => ({ a: s.a_um * 1e-6, n: s.n }));
    const ratio = p.area_ratio ?? 1;
    return {
      model: spec.model,
      params: { tile_um2: p.tile_um2, spheres: p.spheres, area_ratio: ratio },
      K: (f, sigma) => {
        if (!(f > 0)) return 1;
        const d = skinDepth(f, sigma);
        let s = 0;
        for (const { a, n } of spheres) s += (n * 4 * Math.PI * a * a) / tile / (1 + d / a + (d * d) / (2 * a * a));
        return ratio + 1.5 * s;
      },
    };
  }
  return fail(`unknown roughness model "${spec.model}"`);
}
