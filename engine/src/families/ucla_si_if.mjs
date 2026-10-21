// License: GPL-3.0-or-later.
// ucla_si_if family generator (wafer_scale Si-IF): structure from specs/ucla_si_if.mjs (config/package3d/ucla_si_if.yaml).
// Knobs: dl_n (dielet count, square array), dielet size, Si-IF size (if_w_mm x if_d_mm, up to wafer scale), thickness.
import { templateFamily } from './generic.mjs';
import spec from './specs/ucla_si_if.mjs';

const fam = templateFamily(spec, {
  ext: { bounds: { dl_n: { min: 1, integer: true, hard: true, basis: 'layout rule: square dielet array (dl_nx = dl_n ** 0.5 must be an integer)' } } },
  preChecks: [(P) => (Number.isInteger(P.v('dl_nx')) ? null : { code: 'not_square', level: 'error', param: 'dl_n', message: `dl_n = ${P.v('dl_n')} is not a square number (dielets in a dl_nx x dl_nx array)` })],
  layout: { logic: ['dielet'], hbm: [], interposers: ['si_if'], bridges: [], substrate: ['si_if'] },
});
export const { ext, layout, preChecks, build, source } = fam;
