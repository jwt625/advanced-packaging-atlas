// FIXTURE for engine development only (DevLog-016, lane L35). Not data: every value is status "template" with a
// note that starts with "fixture". Values that match a DB row say so in the note, but are not resolved through refs.
// Used only while app/static/data/process3d.json does not exist.
import type { Body, Flow, PDim, Process3D, Profile, Rect, Site, Step } from './types';

const PH = 'fixture: illustrative placeholder, not from a source';
/** template PDim; `why` replaces the generic placeholder note */
const fx = (value: number, unit: string, why = ''): PDim => ({ value, unit, status: 'template', note: why ? `fixture: ${why}` : PH });
const um = (v: number, why = '') => fx(v, 'um', why);
const rect = (x: number, y: number, w: number, d: number): Rect => ({ x_um: um(x), y_um: um(y), w_um: um(w), d_um: um(d) });

const AS_2013 = 'value as in ectc.2013.6575597 step 1 target (TSV 10 um diameter, 100 um deep); not resolved through refs';
const AS_00027 = 'value as in ectc51687.2025.00027 step 2 (40 um pitch, 20 um diameter; Cu 13 / Ni 2 / SnAg 9 um); not resolved through refs';

// z (um, piece frame): Si 0-775 | liner 775-775.5 | barrier 775.5-775.6 | seed 775.6-776.1 | overburden 776.1-779.1
// after CMP (stop on the liner top, 775.5): UBM Ti 775.5-775.6 | UBM Cu 775.6-775.9 | resist 775.9-805.9
// | pillar Cu 775.9-788.9 | Ni 788.9-790.9 | SnAg 790.9-799.9
const SI_H = 775;

const sites: Site[] = [
	{ id: 'tsv', piece: 'wafer', name: 'TSV / bump grid', rect: rect(0, 0, 400, 400), pitch_x_um: um(40, AS_00027), pattern: 'grid' }
];

const bodies: Body[] = [
	{ id: 'si', name: 'Si wafer', piece: 'wafer', kind: 'slab', material: 'si', initial: true, z_um: um(0), h_um: um(SI_H, '300 mm wafer thickness per SEMI M1 nominal; not resolved through refs') },
	{
		id: 'tsv_hole', name: 'TSV', piece: 'wafer', kind: 'hole', material: 'void', site: 'tsv', hosts: ['si'],
		z_top_um: um(SI_H), depth_um: um(100, AS_2013), d_top_um: um(10, AS_2013), d_bot_um: um(10, AS_2013),
		scallop: { period_um: um(0.5), amp_um: um(0.1) }
	},
	{ id: 'liner', name: 'liner oxide', piece: 'wafer', kind: 'film', material: 'oxide', z_um: um(SI_H), h_um: um(0.5), lines: ['tsv_hole'], cov_side_top: fx(0.8, '1'), cov_side_bot: fx(0.5, '1'), cov_bottom: fx(0.5, '1') },
	{ id: 'barrier', name: 'Ti barrier', piece: 'wafer', kind: 'film', material: 'ti', z_um: um(775.5), h_um: um(0.1), lines: ['tsv_hole'], cov_side_top: fx(0.3, '1'), cov_side_bot: fx(0.1, '1'), cov_bottom: fx(0.3, '1') },
	{ id: 'seed', name: 'Cu seed', piece: 'wafer', kind: 'film', material: 'cu', z_um: um(775.6), h_um: um(0.5), lines: ['tsv_hole'], cov_side_top: fx(0.3, '1'), cov_side_bot: fx(0.1, '1'), cov_bottom: fx(0.3, '1') },
	{ id: 'tsv_cu', name: 'TSV Cu', piece: 'wafer', kind: 'via_fill', material: 'cu', hole: 'tsv_hole', mode: 'full', overburden: { h_um: um(3) } },
	{ id: 'ubm_ti', name: 'UBM Ti', piece: 'wafer', kind: 'film', material: 'ti', z_um: um(775.5), h_um: um(0.1) },
	{ id: 'ubm_cu', name: 'UBM Cu seed', piece: 'wafer', kind: 'film', material: 'cu', z_um: um(775.6), h_um: um(0.3) },
	{ id: 'resist', name: 'bump resist', piece: 'wafer', kind: 'slab', material: 'resist', z_um: um(775.9), h_um: um(30), openings: [{ site: 'tsv', d_um: um(20, AS_00027) }] },
	{ id: 'pillar_cu', name: 'Cu pillar', piece: 'wafer', kind: 'post', material: 'cu', site: 'tsv', z_um: um(775.9), h_um: um(13, AS_00027), d_um: um(20, AS_00027), role: 'pillar' },
	{ id: 'pillar_ni', name: 'Ni barrier', piece: 'wafer', kind: 'post', material: 'ni', site: 'tsv', z_um: um(788.9), h_um: um(2, AS_00027), d_um: um(20, AS_00027), role: 'barrier' },
	{ id: 'cap', name: 'SnAg cap', piece: 'wafer', kind: 'solder', material: 'solder', label: 'SnAg', site: 'tsv', z_um: um(790.9), d_um: um(20, AS_00027), h_um: um(9, AS_00027), form: 'plated', wet_d_um: um(20, AS_00027) }
];

const profiles: Profile[] = [
	{
		id: 'reflow_T', q: 'T', unit: 'C', status: 'template',
		note: 'fixture: placeholder profile shape (ramp, soak, peak, cool), not a recommended or reported profile',
		pts: [[0, 25], [90, 150], [180, 180], [240, 250], [270, 250], [360, 100]]
	}
];

const LIQ_SNAG = fx(221, 'C', 'Sn-3.5Ag eutectic temperature (literature value), not resolved through refs');

const steps: Step[] = [
	{
		id: 'tsv_etch', n: 1, name: 'TSV etch (Bosch DRIE)', category: 'tsv_tgv_formation', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'cell', pip: 'work', cell_site: 'tsv' },
		ops: [{ op: 'etch_via', hole: 'tsv_hole', method: 'bosch', etch_per_cycle_um: um(0.5), cycle_s: fx(5, 's') }],
		tool: { id: 'drie' },
		hud: [
			{ key: 'depth', label: 'depth', q: um(100, AS_2013), kind: 'target' },
			{ key: 'd', label: 'diameter', q: um(10, AS_2013), kind: 'target' }
		]
	},
	{
		id: 'liner', n: 2, name: 'liner oxide (PECVD)', category: 'deposition_other', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'cell', pip: 'block', cell_site: 'tsv' },
		ops: [{ op: 'deposit', film: 'liner', method: 'pecvd', rate_nm_min: fx(100, 'nm/min') }],
		tool: { id: 'cvd' },
		hud: [{ key: 'h', label: 'oxide (field)', q: um(0.5), kind: 'target' }]
	},
	{
		id: 'barrier_seed', n: 3, name: 'barrier and seed (PVD Ti / Cu)', category: 'deposition_other', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'cell', pip: 'work', cell_site: 'tsv' },
		ops: [
			{ op: 'deposit', film: 'barrier', method: 'pvd', rate_nm_min: fx(20, 'nm/min') },
			{ op: 'deposit', film: 'seed', method: 'pvd', rate_nm_min: fx(100, 'nm/min') }
		],
		tool: { id: 'pvd' },
		hud: [
			{ key: 'ti', label: 'Ti (field)', q: um(0.1), kind: 'target' },
			{ key: 'cu', label: 'Cu seed (field)', q: um(0.5), kind: 'target' }
		]
	},
	{
		id: 'ecp', n: 4, name: 'Cu via fill (ECP, bottom-up)', category: 'electroplating', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'cell', pip: 'work', cell_site: 'tsv' },
		ops: [{ op: 'plate', bodies: ['tsv_cu'], mode: 'superfill', current_density_ma_cm2: fx(10, 'mA/cm2') }],
		tool: { id: 'ecp' },
		hud: [
			{ key: 'j', label: 'current density', q: fx(10, 'mA/cm2'), kind: 'condition' },
			{ key: 'ob', label: 'overburden', q: um(3), kind: 'target' }
		]
	},
	{
		id: 'cmp', n: 5, name: 'Cu overburden CMP', category: 'cmp', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'work', pip: 'cell', cell_site: 'tsv' },
		ops: [{
			op: 'cmp', stop_z_um: um(775.5), bodies: ['tsv_cu', 'seed', 'barrier'], rr_nm_min: fx(500, 'nm/min'),
			overpolish_s: fx(30, 's'), dishing_um: um(0.1), dish_bodies: ['tsv_cu']
		}],
		tool: { id: 'cmp' },
		hud: [
			{ key: 'rr', label: 'removal rate', q: fx(500, 'nm/min'), kind: 'condition' },
			{ key: 'dish', label: 'Cu dishing', q: um(0.1), kind: 'result' }
		]
	},
	{
		id: 'bump', n: 6, name: 'microbump plating (Cu / Ni / SnAg, through mask)', category: 'bumping', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'block', pip: 'cell', cell_site: 'tsv' },
		ops: [
			{ op: 'deposit', label: 'UBM Ti', film: 'ubm_ti', method: 'pvd', rate_nm_min: fx(20, 'nm/min'), tool: { id: 'pvd' } },
			{ op: 'deposit', label: 'UBM Cu seed', film: 'ubm_cu', method: 'pvd', rate_nm_min: fx(100, 'nm/min'), tool: { id: 'pvd' } },
			{ op: 'coat', label: 'resist coat', body: 'resist', method: 'spin', planarization: fx(1, '1'), tool: { id: 'spin_coater' } },
			{ op: 'pattern', label: 'expose + develop', body: 'resist', method: 'stepper', tone: 'positive', dose_mj_cm2: fx(500, 'mJ/cm2'), tool: { id: 'litho' } },
			{
				op: 'plate', label: 'plate Cu / Ni / SnAg', bodies: ['pillar_cu', 'pillar_ni', 'cap'], mode: 'through_mask', w: 2,
				current_density_ma_cm2: [fx(10, 'mA/cm2'), fx(10, 'mA/cm2'), fx(10, 'mA/cm2')], tool: { id: 'ecp' }
			},
			{ op: 'strip', label: 'resist strip', bodies: ['resist'], method: 'resist_strip', tool: { id: 'wet_bench' } },
			{ op: 'strip', label: 'seed etch', bodies: ['ubm_cu', 'ubm_ti'], method: 'seed_etch', keep_under: ['pillar_cu'], tool: { id: 'wet_bench' } }
		],
		hud: [
			{ key: 'pitch', label: 'pitch', q: um(40, AS_00027), kind: 'target' },
			{ key: 'cu', label: 'Cu', q: um(13, AS_00027), kind: 'target' },
			{ key: 'ni', label: 'Ni', q: um(2, AS_00027), kind: 'target' },
			{ key: 'snag', label: 'SnAg', q: um(9, AS_00027), kind: 'target' }
		],
		weight: 2
	},
	{
		id: 'reflow', n: 7, name: 'bump reflow', category: 'reflow', step_kind: 'fab', db_step: null,
		piece: 'wafer', orient: 'up', view: { primary: 'cell', pip: 'work', cell_site: 'tsv' },
		ops: [{ op: 'reflow', solder: ['cap'], profile: 'reflow_T', liquidus_c: LIQ_SNAG }],
		tool: { id: 'reflow_oven' },
		hud: [{ key: 'liq', label: 'liquidus', q: LIQ_SNAG, kind: 'material' }]
	}
];

const flow: Flow = {
	id: 'fixture_tsv_bump',
	name: 'Fixture: TSV + microbump (engine development)',
	family: null,
	family_label: 'Fixture',
	kind: 'composite',
	source_flows: [],
	routes: [{ id: 'main', name: 'main', default: true }],
	summary: 'Hand-written development fixture: Bosch TSV, liner, barrier/seed, bottom-up Cu fill, CMP, through-mask microbump plating, reflow. Not data.',
	refs: [],
	pieces: [{
		id: 'wafer', name: 'Si wafer', kind: 'wafer', initial: true,
		carrier: { shape: 'disk', diameter_mm: fx(300, 'mm', '300 mm wafer format'), notch: true },
		unit: { w_um: um(10000), d_um: um(10000) },
		repeat: { pitch_x_um: um(10000), pitch_y_um: um(10000) },
		block: { x0_um: -100, x1_um: 100, y0_um: -60, y1_um: 60, z0_um: 650, z1_um: 830 }
	}],
	sites,
	bodies,
	profiles,
	steps
};

export const FIXTURE: Process3D = {
	version: 1,
	generated: '2026-10-23',
	fixture: true,
	note: 'fixture: hand-written mini flow for engine development (lane L35); every value template',
	refs: {},
	flows: [flow]
};
