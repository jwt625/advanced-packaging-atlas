// FIXTURE for UI development only (DevLog-008). Every number below is invented; every dimension is status
// "template". Used only while app/static/data/package3d.json does not exist.
import type { Dim, Family, IcArray, Layer, Package3D, Part } from './types';

const NOTE = 'fixture: invented value for UI development, not from any paper';
const t = (): Dim => ({ status: 'template', note: NOTE });
const dimsOf = (keys: string[]): Record<string, Dim> => Object.fromEntries(keys.map((k) => [k, t()]));
const PART_KEYS = ['x_mm', 'y_mm', 'w_mm', 'd_mm', 'z_um', 'h_um'];

function part(p: Omit<Part, 'dims'>): Part {
	return { ...p, dims: dimsOf(PART_KEYS) };
}
function layer(l: Omit<Layer, 'dims'>): Layer {
	return { ...l, dims: dimsOf(['z_um', 'h_um', ...(l.line_um != null ? ['line_um', 'space_um'] : [])]) };
}
function arr(a: Omit<IcArray, 'dims'>): IcArray {
	return { ...a, dims: dimsOf(['pitch_um', 'diameter_um', 'height_um', 'region']) };
}

// z stack (um, bottoms): BGA 0-400 | substrate 400-1600 | C4 1600-1680 | interposer 1680-1780 | ubump 1780-1810
// | dies 1810-2585 (HBM to 2530) | TIM 2585-2635 | lid 2635-3035; lid ring 1600-2635.
const hbm: Part[] = [
	[9.5, 6],
	[9.5, -6]
].map(([x, y], i) =>
	part({ id: `hbm${i + 1}`, name: `HBM ${i + 1}`, kind: 'hbm', material: 'silicon', x_mm: x, y_mm: y, w_mm: 8, d_mm: 11, z_um: 1810, h_um: 720, explode_group: 4 })
);

const ring: Part[] = [
	{ id: 'lid_ring_n', x: 0, y: 22, w: 46, d: 2 },
	{ id: 'lid_ring_s', x: 0, y: -22, w: 46, d: 2 },
	{ id: 'lid_ring_e', x: 22, y: 0, w: 2, d: 42 },
	{ id: 'lid_ring_w', x: -22, y: 0, w: 2, d: 42 }
].map((r) => part({ id: r.id, name: 'Lid ring', kind: 'lid', material: 'Cu (Ni plated)', x_mm: r.x, y_mm: r.y, w_mm: r.w, d_mm: r.d, z_um: 1600, h_um: 1035, explode_group: 6 }));

const family: Family = {
	id: 'fixture_2p5d',
	name: 'Fixture 2.5D',
	company: 'fixture',
	package_class: 'si_interposer',
	summary: 'Fixture for UI development: a generic 2.5D Si-interposer package. All dimensions are invented (template).',
	source_tvs: [],
	completeness: { reported: 0, derived: 0, template: 1 },
	parts: [
		part({ id: 'substrate', name: 'Substrate', kind: 'substrate', material: 'organic', x_mm: 0, y_mm: 0, w_mm: 50, d_mm: 50, z_um: 400, h_um: 1200, explode_group: 0 }),
		part({ id: 'interposer', name: 'Si interposer', kind: 'interposer', material: 'silicon', x_mm: 0, y_mm: 0, w_mm: 30, d_mm: 26, z_um: 1680, h_um: 100, explode_group: 2 }),
		part({ id: 'underfill', name: 'Underfill', kind: 'underfill', material: 'underfill', x_mm: 0, y_mm: 0, w_mm: 28, d_mm: 24.5, z_um: 1780, h_um: 30, explode_group: 3, xray_default: true }),
		part({ id: 'soc', name: 'SoC', kind: 'die', material: 'silicon', x_mm: -4.5, y_mm: 0, w_mm: 18, d_mm: 16, z_um: 1810, h_um: 775, explode_group: 4 }),
		...hbm,
		part({ id: 'mold', name: 'Mold', kind: 'mold', material: 'EMC', x_mm: 0, y_mm: 0, w_mm: 30, d_mm: 26, z_um: 1780, h_um: 805, explode_group: 3, xray_default: true }),
		part({ id: 'tim', name: 'TIM', kind: 'tim', material: 'indium', x_mm: -4.5, y_mm: 0, w_mm: 18, d_mm: 16, z_um: 2585, h_um: 50, explode_group: 5 }),
		part({ id: 'lid', name: 'Lid', kind: 'lid', material: 'Cu (Ni plated)', x_mm: 0, y_mm: 0, w_mm: 46, d_mm: 46, z_um: 2635, h_um: 400, explode_group: 6, xray_default: true }),
		...ring
	],
	layers: [
		layer({ id: 'sub_bu_bot', part: 'substrate', seq: 1, name: 'Build-up (bottom)', material: 'ABF / Cu', role: 'buildup', z_um: 400, h_um: 200 }),
		layer({ id: 'sub_core', part: 'substrate', seq: 2, name: 'Core', material: 'glass-epoxy core', role: 'core', z_um: 600, h_um: 800 }),
		layer({ id: 'sub_bu_top', part: 'substrate', seq: 3, name: 'Build-up (top)', material: 'ABF / Cu', role: 'buildup', z_um: 1400, h_um: 200 }),
		layer({ id: 'beol_m1', part: 'interposer', seq: 1, name: 'M1', material: 'Cu / SiO2', role: 'conductor', z_um: 1772, h_um: 2, line_um: 0.8, space_um: 0.8 }),
		layer({ id: 'beol_v1', part: 'interposer', seq: 2, name: 'Dielectric', material: 'SiO2', role: 'dielectric', z_um: 1774, h_um: 2 }),
		layer({ id: 'beol_m2', part: 'interposer', seq: 3, name: 'M2', material: 'Cu / SiO2', role: 'conductor', z_um: 1776, h_um: 2, line_um: 0.8, space_um: 0.8 }),
		layer({ id: 'beol_pass', part: 'interposer', seq: 4, name: 'Passivation', material: 'SiN / PI', role: 'dielectric', z_um: 1778, h_um: 2 })
	],
	arrays: [
		arr({ id: 'bga', name: 'BGA', kind: 'bga', between: ['substrate'], region: { x_mm: 0, y_mm: 0, w_mm: 48, d_mm: 48 }, pitch_um: 1000, diameter_um: 600, height_um: 400 }),
		arr({ id: 'c4', name: 'C4', kind: 'c4', between: ['interposer', 'substrate'], region: { x_mm: 0, y_mm: 0, w_mm: 29, d_mm: 25 }, pitch_um: 150, diameter_um: 100, height_um: 80 }),
		arr({ id: 'tsv', name: 'TSV', kind: 'tsv', between: ['interposer'], region: { x_mm: 0, y_mm: 0, w_mm: 26, d_mm: 22 }, pitch_um: 150, diameter_um: 10, height_um: 92 }),
		arr({ id: 'ubump_soc', name: 'SoC micro-bumps', kind: 'microbump', between: ['soc', 'interposer'], region: { x_mm: -4.5, y_mm: 0, w_mm: 17.6, d_mm: 15.6 }, pitch_um: 40, diameter_um: 25, height_um: 30 }),
		...hbm.map((h, i) =>
			arr({ id: `ubump_hbm${i + 1}`, name: `HBM ${i + 1} micro-bumps`, kind: 'microbump', between: [h.id, 'interposer'], region: { x_mm: h.x_mm, y_mm: h.y_mm, w_mm: 6, d_mm: 3 }, pitch_um: 55, diameter_um: 25, height_um: 30 })
		)
	],
	callouts: [
		{ target: 'beol_m2', text: 'BEOL 2 metal layers, 0.8/0.8 um L/S (fixture)' },
		{ target: 'ubump_soc', text: 'Micro-bump 40 um pitch (fixture)' },
		{ target: 'c4', text: 'C4 150 um pitch (fixture)' },
		{ target: 'tsv', text: 'TSV 10 um dia (fixture)' },
		{ target: 'sub_core', text: 'Substrate core (fixture)' }
	],
	insets: [
		{ id: 'die_edge', label: 'SoC-HBM edge', box_mm: [3, 4.5, 6.5, 7.5] },
		{ id: 'interposer_edge', label: 'Interposer edge', box_mm: [13, -1.5, 17, 1.5] }
	]
};

export const FIXTURE: Package3D = {
	version: 1,
	generated: '2026-10-19',
	fixture: true,
	note: 'fixture: app/static/data/package3d.json not found; showing an invented, all-template family',
	refs: {},
	families: [family]
};
