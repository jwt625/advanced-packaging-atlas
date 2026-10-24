// FIXTURE 3 (contract v1.1 features) for engine development only (DevLog-016, lane L35): a substrate line level
// (lamination, line trenches, line fill, CMP), a die joined on substrate-side solder (`place` with `solder` from the
// `onto` piece, then reflow), a flux clean with a not-reported HUD value, and face-down BGA balls (`dir: down`).
// Not data: every value is status "template" with a note that starts with "fixture".
import type { Body, Flow, PDim, Profile, Rect, Site, Step } from './types';

const PH = 'fixture: illustrative placeholder, not from a source';
const fx = (value: number, unit: string, why = ''): PDim => ({ value, unit, status: 'template', note: why ? `fixture: ${why}` : PH });
const um = (v: number, why = '') => fx(v, 'um', why);
const rect = (x: number, y: number, w: number, d: number): Rect => ({ x_um: um(x), y_um: um(y), w_um: um(w), d_um: um(d) });

// z (um) in the substrate frame: BGA balls hang below 0 | core 0-400 | ABF 400-430 with line trenches 415-430
// | Cu lines (+ 3 um overburden before CMP) | substrate bump pad 430-440, SnAg 440-455 | die (flipped) above.
const sites: Site[] = [
	{ id: 'ub', piece: 'sub', name: 'substrate bumps', rect: rect(0, 0, 2900, 2900), pitch_x_um: um(100), pattern: 'grid' },
	{ id: 'dub', piece: 'die', name: 'die pads', rect: rect(0, 0, 2900, 2900), pitch_x_um: um(100), pattern: 'grid' },
	{ id: 'bga', piece: 'sub', name: 'BGA', rect: rect(0, 0, 29600, 29600), pitch_x_um: um(800), pattern: 'grid' }
];

const bodies: Body[] = [
	{ id: 'core', name: 'core', piece: 'sub', kind: 'slab', material: 'core', initial: true, z_um: um(0), h_um: um(400) },
	{ id: 'abf', name: 'ABF with line trenches', piece: 'sub', kind: 'slab', material: 'abf', z_um: um(400), h_um: um(30), lines: { line_um: um(10), space_um: um(10), dir: 'y', depth_um: um(15) } },
	{ id: 'cul', name: 'Cu lines', piece: 'sub', kind: 'line_fill', material: 'cu', host: 'abf', overburden: { h_um: um(3) } },
	{ id: 'sbp', name: 'substrate bump pad', piece: 'sub', kind: 'post', material: 'cu', initial: true, site: 'ub', z_um: um(430), h_um: um(10), d_um: um(30), role: 'pad' },
	{ id: 'scap', name: 'substrate-side solder', piece: 'sub', kind: 'solder', material: 'solder', initial: true, site: 'ub', z_um: um(440), h_um: um(15), d_um: um(30), form: 'plated', dir: 'up', joint_top_d_um: um(30), liquidus_c: fx(221, 'C', 'Sn-3.5Ag eutectic temperature (literature value), not resolved through refs') },
	{ id: 'flux', name: 'flux', piece: 'sub', kind: 'film', material: 'flux', z_um: um(430), h_um: um(5), rect: rect(0, 0, 3200, 3200) },
	{ id: 'bga', name: 'BGA balls', piece: 'sub', kind: 'solder', material: 'solder', label: 'SAC', site: 'bga', z_um: um(0), h_um: um(400), d_um: um(400), form: 'sphere', dir: 'down', wet_d_um: um(350), liquidus_c: fx(217, 'C', 'SAC305 liquidus about 217-220 C (literature range); placeholder') },
	{ id: 'dsi', name: 'die', piece: 'die', kind: 'slab', material: 'si', initial: true, z_um: um(0), h_um: um(300) },
	{ id: 'dpad', name: 'die pad', piece: 'die', kind: 'post', material: 'cu', initial: true, site: 'dub', z_um: um(300), h_um: um(5), d_um: um(30), role: 'pad' }
];

const profiles: Profile[] = [
	{ id: 'reflow_T', q: 'T', unit: 'C', status: 'template', note: 'fixture: placeholder profile shape, not a recommended or reported profile', pts: [[0, 25], [90, 150], [180, 180], [240, 250], [270, 250], [360, 100]] }
];
const LIQ = fx(221, 'C', 'Sn-3.5Ag eutectic temperature (literature value), not resolved through refs');
const BLK = { x0_um: 1300, x1_um: 1700, y0_um: -150, y1_um: 150, z0_um: -450, z1_um: 800, section_y_um: 0 };

const steps: Step[] = [
	{ id: 'abf', n: 1, name: 'ABF lamination', category: 'lamination', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'block', pip: 'work', cell_site: 'ub', block: BLK }, ops: [{ op: 'coat', body: 'abf', method: 'vacuum_laminate', planarization: fx(1, '1') }], hud: [{ key: 'h', label: 'ABF', q: um(30), kind: 'target' }] },
	{ id: 'trench', n: 2, name: 'line trenches (laser)', category: 'other', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'block', pip: 'cell', cell_site: 'ub', block: BLK }, ops: [{ op: 'etch_lines', body: 'abf', method: 'laser' }], hud: [{ key: 'ls', label: 'L / S', q: um(10), kind: 'target' }] },
	{ id: 'line_plate', n: 3, name: 'Cu line fill (plating)', category: 'electroplating', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'block', pip: 'work', cell_site: 'ub', block: BLK }, ops: [{ op: 'plate', bodies: ['cul'], mode: 'panel', current_density_ma_cm2: fx(10, 'mA/cm2') }], hud: [] },
	{ id: 'line_cmp', n: 4, name: 'overburden removal', category: 'cmp', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'block', pip: 'work', cell_site: 'ub', block: BLK }, ops: [{ op: 'cmp', stop_z_um: um(430), bodies: ['cul'], rr_nm_min: fx(500, 'nm/min') }], hud: [] },
	{ id: 'place', n: 5, name: 'die placement on substrate-side bumps (flux)', category: 'die_attach', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'block', pip: 'work', cell_site: 'ub', block: BLK }, ops: [{ op: 'place', piece: 'die', onto: 'sub', at: [{ x_um: um(0), y_um: um(0), z_um: um(455, 'substrate solder top') }], flip: true, medium: 'flux', medium_body: 'flux', solder: ['scap'] }], hud: [] },
	{ id: 'reflow', n: 6, name: 'mass reflow (joint from the substrate cap)', category: 'reflow', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'cell', pip: 'block', cell_site: 'ub', block: BLK, cell_z_um: [380, 800] }, ops: [{ op: 'reflow', solder: ['scap'], profile: 'reflow_T', liquidus_c: LIQ }], hud: [{ key: 'liq', label: 'liquidus', q: LIQ, kind: 'material' }] },
	{ id: 'clean', n: 7, name: 'flux clean', category: 'cleaning', db_step: null, piece: 'sub', orient: 'up', view: { primary: 'block', pip: 'work', cell_site: 'ub', block: BLK }, ops: [{ op: 'clean', method: 'flux_clean', bodies: ['flux'] }], hud: [{ key: 't', label: 'clean time', q: { status: 'na', unit: 's', note: 'fixture: not reported' }, kind: 'condition' }] },
	{ id: 'bga', n: 8, name: 'BGA ball attach (face down)', category: 'ball_attach', db_step: null, piece: 'sub', orient: 'down', view: { primary: 'block', pip: 'work', cell_site: 'ub', block: BLK }, ops: [{ op: 'ball_attach', solder: ['bga'], method: 'ball_drop', profile: 'reflow_T', liquidus_c: LIQ }], hud: [{ key: 'd', label: 'ball', q: um(400), kind: 'target' }] }
];

export const FIXTURE3_FLOW: Flow = {
	id: 'fixture_v11',
	name: 'Fixture: line level, substrate-side joint, clean, BGA (contract v1.1)',
	family: null,
	family_label: 'Fixture',
	kind: 'composite',
	source_flows: [],
	routes: [{ id: 'main', name: 'main', default: true }],
	summary: 'Hand-written development fixture for contract v1.1: line trenches and line fill, a joint whose solder belongs to the onto piece, a clean op with a not-reported HUD value, face-down BGA balls. Not data.',
	refs: [],
	pieces: [
		{ id: 'sub', name: 'substrate', kind: 'substrate', initial: true, carrier: { shape: 'rect', w_mm: fx(510, 'mm'), d_mm: fx(515, 'mm') }, unit: { w_um: um(30000), d_um: um(30000) }, repeat: { pitch_x_um: um(31000), pitch_y_um: um(31000) }, block: BLK },
		{ id: 'die', name: 'die', kind: 'die', initial: true, carrier: { shape: 'disk', diameter_mm: fx(300, 'mm') }, unit: { w_um: um(3000), d_um: um(3000) }, block: BLK }
	],
	sites,
	bodies,
	profiles,
	steps
};
