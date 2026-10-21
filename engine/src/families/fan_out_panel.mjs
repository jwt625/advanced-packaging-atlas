// License: GPL-3.0-or-later.
// fan_out_panel family generator: structure from specs/fan_out_panel.mjs (config/package3d/fan_out_panel.yaml).
// The template is one package unit cut from the panel; knobs: package size, chip sizes, EMC thickness, RDL levels.
import { templateFamily } from './generic.mjs';
import spec from './specs/fan_out_panel.mjs';

const CHIPS = [['chip1', 'c1_x_mm', 'c1_y_mm'], ['chip2a', 'c2a_x_mm', 'c2a_y_mm'], ['chip2b', 'c2b_x_mm', 'c2b_y_mm']];

const fam = templateFamily(spec, {
  ext: { add: {
    units_nx: { value: 1, status: 'template', note: 'package units along x on the strip / panel model (1 = the single package of the template)' },
    units_ny: { value: 1, status: 'template', note: 'package units along y' },
    unit_px_mm: { alias: 'pkg_w_mm' },
    unit_py_mm: { alias: 'pkg_d_mm' },
    strip_w_mm: { formula: 'units_nx * unit_px_mm', status: 'template', note: 'strip / panel outline (units abut; set to the reported strip size when known)' },
    strip_d_mm: { formula: 'units_ny * unit_py_mm', status: 'template', note: 'strip / panel outline' },
  },
  bounds: { units_nx: { min: 1, integer: true, hard: true, basis: 'layout rule' }, units_ny: { min: 1, integer: true, hard: true, basis: 'layout rule' } } },
  edit(spec, P) {
    const nx = P.v('units_nx');
    const ny = P.v('units_ny');
    if (nx === 1 && ny === 1 && P.v('strip_w_mm') === P.v('pkg_w_mm') && P.v('strip_d_mm') === P.v('pkg_d_mm')) return spec;
    for (const id of ['rdl', 'mold']) { const p = spec.parts.find((q) => q.id === id); p.w = 'strip_w_mm'; p.d = 'strip_d_mm'; }
    const px = P.v('unit_px_mm');
    const py = P.v('unit_py_mm');
    const units = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) units.push([(i - (nx - 1) / 2) * px, ((ny - 1) / 2 - j) * py]);
    for (const [id, xk, yk] of CHIPS) {
      const p = spec.parts.find((q) => q.id === id);
      const cx = P.v(xk);
      const cy = P.v(yk);
      delete p.x; delete p.y;
      p.centers = { list: units.map(([ux, uy]) => [ux + cx, uy + cy]),
        x_mm: { status: 'template', formula: `unit center + ${xk}`, inputs: ['unit_px_mm', xk] }, y_mm: { status: 'template', formula: `unit center + ${yk}`, inputs: ['unit_py_mm', yk] } };
    }
    return spec;
  },
  layout: { logic: ['chip1', 'chip2a', 'chip2b'], hbm: [], interposers: ['rdl'], bridges: [], substrate: ['rdl'] },
});
export const { ext, layout, preChecks, build, source } = fam;
