// FIXTURE 2 for engine development only (DevLog-016, lane L35): chip-on-wafer TCB on a TSV interposer wafer, CUF,
// compression mold, mold grind, glass carrier temporary bond (flip), backside grind / TSV reveal, backside dielectric
// and bumps, laser debond, dicing. Not data: every value is status "template" with a note that starts with "fixture".
// Values that match a DB row say so in the note, but are not resolved through refs.
import type { Body, Flow, PDim, PText, Profile, Rect, Site, Step } from './types';

const PH = 'fixture: illustrative placeholder, not from a source';
const fx = (value: number, unit: string, why = ''): PDim => ({ value, unit, status: 'template', note: why ? `fixture: ${why}` : PH });
const um = (v: number, why = '') => fx(v, 'um', why);
const rect = (x: number, y: number, w: number, d: number, why = ''): Rect => ({ x_um: um(x, why), y_um: um(y, why), w_um: um(w, why), d_um: um(d, why) });
const txt = (text: string, why: string): PText => ({ text, status: 'template', note: `fixture: ${why}` });

const P27 = (s: string) => `value as in ectc51687.2025.00027 ${s}; not resolved through refs`;
const DIE = P27('step 3 (Die A 20 x 20 mm, Si thickness 0.675 mm)');
const UB = P27('step 2 (40 um pitch, 20 um diameter; Cu 13 / Ni 2 / SnAg 9 um)');
const PAD = P27('step 1 (Ni 2 um pads, 20 um diameter)');
const ITP = P27('step 14 (42 x 46 mm interposer)');
const BS = P27('step 10 (150 um pitch, 75 um diameter; Cu 30 / SnAg 25 um)');
const TBA = P27('step 7 (release layer 1 um, adhesive 70 um; 215 C for 120 s)');
const GR8 = P27('step 8 (interposer backside ground to 100 um)');
const LIQ = fx(221, 'C', 'Sn-3.5Ag eutectic temperature (literature value), not resolved through refs');

// z (um) in the interposer frame (front up): Si 0-775 | TSV 670-775 | liner 775-775.5 | pad Ni 775.5-777.5
// | joint ~777.5-785.6 | Die A (flipped) ~800.6-1475.6 | CUF 775.5-800.5 | EMC 775.5-1600 -> ground to 1400
// | TBA 1400-1470 | carrier (flipped) release 1470-1471, glass 1471-2171.
// Backside after the 675 grind (orient down): dielectric 670-675 (openings), via 670-675, Cu 640-670, SnAg 615-640,
// resist 610-670.
const sites: Site[] = [
	{ id: 'ub', piece: 'itp', name: 'microbump pads', rect: rect(0, 0, 19960, 19960, 'pad field under Die A, 499 x 499 sites so a row lies at y = 0'), pitch_x_um: um(40, UB), pattern: 'grid' },
	{ id: 'tsv', piece: 'itp', name: 'TSV / backside bumps', rect: rect(0, 0, 41000, 45000), pitch_x_um: um(150, BS), pattern: 'grid' },
	{ id: 'dub', piece: 'dieA', name: 'Die A microbumps', rect: rect(0, 0, 19960, 19960, 'same grid as the interposer pads'), pitch_x_um: um(40, UB), pattern: 'grid' }
];

const bodies: Body[] = [
	// interposer wafer (front side finished: TSV, liner, Cu fill, Ni pads)
	{ id: 'si', name: 'interposer Si', piece: 'itp', kind: 'slab', material: 'si', initial: true, z_um: um(0), h_um: um(775, '300 mm wafer thickness per SEMI M1 nominal; not resolved through refs') },
	{ id: 'tsv_hole', name: 'TSV', piece: 'itp', kind: 'hole', material: 'void', initial: true, site: 'tsv', hosts: ['si'], z_top_um: um(775), depth_um: um(105, 'chosen so the 100 um thickness target reveals the Cu'), d_top_um: um(10), d_bot_um: um(10), scallop: { period_um: um(0.5), amp_um: um(0.1) } },
	{ id: 'liner', name: 'liner oxide', piece: 'itp', kind: 'film', material: 'oxide', initial: true, z_um: um(775), h_um: um(0.5), lines: ['tsv_hole'], cov_side_top: fx(0.8, '1'), cov_side_bot: fx(0.5, '1'), cov_bottom: fx(0.5, '1') },
	{ id: 'tsv_cu', name: 'TSV Cu', piece: 'itp', kind: 'via_fill', material: 'cu', initial: true, hole: 'tsv_hole', mode: 'full' },
	{ id: 'pad', name: 'Ni pad', piece: 'itp', kind: 'post', material: 'ni', initial: true, site: 'ub', z_um: um(775.5), h_um: um(2, PAD), d_um: um(20, PAD), role: 'pad' },
	{ id: 'cuf', name: 'CUF', piece: 'itp', kind: 'fill', material: 'underfill', rect: rect(0, 0, 20400, 20400, 'Die A footprint plus a 200 um fillet zone (placeholder)'), z_um: um(775.5), h_um: um(25, 'gap from the joint solution of the fixture bumps'), flow: { from: 'x-' } },
	{ id: 'emc', name: 'EMC', piece: 'itp', kind: 'fill', material: 'emc', rect: rect(0, 0, 42000, 46000, ITP), z_um: um(775.5), h_um: um(824.5), flow: { from: 'center' } },
	{ id: 'tba', name: 'TBA adhesive', piece: 'itp', kind: 'slab', material: 'tba', z_um: um(1400), h_um: um(70, TBA) },
	{ id: 'bsd', name: 'backside dielectric', piece: 'itp', kind: 'slab', material: 'polyimide', label: 'dielectric (not specified)', z_um: um(670), h_um: um(5), openings: [{ site: 'tsv', d_um: um(60) }] },
	{ id: 'bs_resist', name: 'backside resist', piece: 'itp', kind: 'slab', material: 'resist', z_um: um(610), h_um: um(60), openings: [{ site: 'tsv', d_um: um(75, BS) }] },
	{ id: 'bs_via', name: 'Cu in dielectric opening', piece: 'itp', kind: 'post', material: 'cu', site: 'tsv', z_um: um(670), h_um: um(5), d_um: um(60), role: 'via_land' },
	{ id: 'bs_cu', name: 'backside Cu bump', piece: 'itp', kind: 'post', material: 'cu', site: 'tsv', z_um: um(640), h_um: um(30, BS), d_um: um(75, BS), role: 'pillar' },
	{ id: 'bs_snag', name: 'backside SnAg', piece: 'itp', kind: 'solder', material: 'solder', label: 'SnAg', site: 'tsv', z_um: um(640, 'base plane: bottom of the Cu bump'), h_um: um(25, BS), d_um: um(75, BS), form: 'plated', dir: 'down', wet_d_um: um(75, BS) },
	{ id: 'kerf', name: 'dicing kerf', piece: 'itp', kind: 'cut', material: 'void', hosts: ['si', 'emc', 'bsd'], rect: rect(20950, 0, 60, 46000, 'kerf placed just inside the unit edge so both kerf walls show (only one unit is modelled)'), z_um: um(600), h_um: um(1100) },
	// Die A (bumped die, from its own wafer)
	{ id: 'dsi', name: 'Die A Si', piece: 'dieA', kind: 'slab', material: 'si', initial: true, z_um: um(0), h_um: um(675, DIE) },
	{ id: 'dcu', name: 'Cu pillar', piece: 'dieA', kind: 'post', material: 'cu', initial: true, site: 'dub', z_um: um(675), h_um: um(13, UB), d_um: um(20, UB), role: 'pillar' },
	{ id: 'dni', name: 'Ni barrier', piece: 'dieA', kind: 'post', material: 'ni', initial: true, site: 'dub', z_um: um(688), h_um: um(2, UB), d_um: um(20, UB), role: 'barrier' },
	{ id: 'dcap', name: 'SnAg cap', piece: 'dieA', kind: 'solder', material: 'solder', label: 'SnAg', initial: true, site: 'dub', z_um: um(690), h_um: um(9, UB), d_um: um(20, UB), form: 'plated', wet_d_um: um(20, UB), joint_top_d_um: um(20, PAD) },
	// glass carrier
	{ id: 'glass', name: 'glass carrier', piece: 'glass', kind: 'slab', material: 'glass', initial: true, z_um: um(0), h_um: um(700) },
	{ id: 'release', name: 'release layer', piece: 'glass', kind: 'slab', material: 'release', z_um: um(700), h_um: um(1, TBA) }
];

const SETVS = 'placeholder shape; the set vs joint gap only illustrates the L33 research note (440 C set / 250 C joint in one FCB3 run), not this process';
const profiles: Profile[] = [
	{ id: 'tcb_T', q: 'T', trace: 'actual', label: 'joint', unit: 'C', status: 'template', note: `fixture: ${SETVS}`, pts: [[0, 150], [2, 150], [5, 250], [9, 250], [11, 150]] },
	{ id: 'tcb_Tset', q: 'T', trace: 'set', label: 'head set', unit: 'C', status: 'template', note: `fixture: ${SETVS}`, pts: [[0, 150], [2, 150], [3, 440], [9, 440], [10, 150]] },
	{ id: 'tcb_F', q: 'F', unit: 'N', status: 'template', note: PH, pts: [[0, 0], [1, 50], [9, 50], [11, 0]] }
];

const view = (primary: 'work' | 'block' | 'cell', pip: 'work' | 'block' | 'cell' | null, cell_site = 'ub') => ({ primary, pip, cell_site });
const BLK = { x0_um: 9700, x1_um: 10300, y0_um: -150, y1_um: 150, z0_um: 600, z1_um: 1700, section_y_um: 0 };
const BLK_HI = { ...BLK, z1_um: 2200 };

const steps: Step[] = [
	{
		id: 'tcb', n: 1, name: 'TCB Die A onto the interposer wafer', category: 'bonding', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: { ...view('block', 'work'), cell_z_um: [760, 830] },
		ops: [{ op: 'bond_tcb', piece: 'dieA', onto: 'itp', at: [{ x_um: um(0), y_um: um(0), z_um: um(777.5, 'pad top') }], flip: true, solder: ['dcap'], profiles: { T: 'tcb_T', T_set: 'tcb_Tset', F: 'tcb_F' }, liquidus_c: LIQ }],
		tool: { id: 'tcb_head' },
		equipment: txt('MD-P300 flip chip bonder (Panasonic Connect)', P27('step 3 equipment')),
		hud: [
			{ key: 'pitch', label: 'bump pitch', q: um(40, UB), kind: 'target' },
			{ key: 'die', label: 'Die A', q: fx(20, 'mm', DIE), kind: 'material' }
		]
	},
	{
		id: 'cuf', n: 2, name: 'capillary underfill (jet dispense)', category: 'underfill', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: { ...view('block', 'work'), cell_z_um: [760, 830] },
		ops: [{ op: 'underfill', fill: 'cuf', gap_um: um(25, 'joint gap of the fixture bumps'), gamma_n_m: fx(0.03, 'N/m'), mu_pa_s: fx(0.5, 'Pa.s'), theta_deg: fx(30, 'deg'), length_mm: fx(20, 'mm', DIE), dispense: 'one_side', stage_c: fx(100, 'C', P27('step 4 (stage 100 C)')) }],
		tool: { id: 'jet_dispenser' },
		equipment: txt('FAD2500 jet dispenser (MUSASHI ENGINEERING)', P27('step 4 equipment')),
		hud: [{ key: 'stage', label: 'stage', q: fx(100, 'C', P27('step 4 (stage 100 C)')), kind: 'condition' }]
	},
	{
		id: 'mold', n: 3, name: 'compression mold (EMC)', category: 'molding', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: view('work', 'block'),
		ops: [{ op: 'mold', fill: 'emc', method: 'compression', charge: 'granular', mold_top_z_um: um(1600), temp_c: fx(175, 'C'), time_s: fx(600, 's') }],
		tool: { id: 'mold_chase' },
		equipment: txt('VCM-330MS (APIC YAMADA)', P27('step 5 equipment')),
		hud: [{ key: 'T', label: 'mold T', q: fx(175, 'C'), kind: 'condition' }]
	},
	{
		id: 'mold_grind', n: 4, name: 'grind mold top to expose dies', category: 'grinding_thinning', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: view('work', 'block'),
		ops: [{ op: 'grind', face: 'top', to_z_um: um(1400), stages: [{ name: 'coarse', removal_um: um(150), feed_um_s: fx(1, 'um/s') }, { name: 'fine', removal_um: um(50), feed_um_s: fx(0.3, 'um/s') }], reveal: ['dsi'] }],
		tool: { id: 'grinder' },
		equipment: txt('DAG810 surface grinder (DISCO)', P27('step 6 equipment')),
		hud: [{ key: 'depth', label: 'grinding depth', q: um(200, P27('step 6 (grinding depth 200 um)')), kind: 'condition' }]
	},
	{
		id: 'temp_bond', n: 5, name: 'glass carrier temporary bond (TBA)', category: 'temporary_bonding', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: { ...view('block', 'work'), block: BLK_HI },
		ops: [{ op: 'bond_temp', carrier: 'glass', onto: 'itp', adhesive: ['tba', 'release'], temp_c: fx(215, 'C', TBA), time_s: fx(120, 's', TBA) }],
		tool: { id: 'wafer_bonder' },
		equipment: txt('wafer bonder (AIMECHATEC)', P27('step 7 equipment')),
		hud: [
			{ key: 'T', label: 'bond T', q: fx(215, 'C', TBA), kind: 'condition' },
			{ key: 't', label: 'bond time', q: fx(120, 's', TBA), kind: 'condition' },
			{ key: 'adh', label: 'adhesive', q: um(70, TBA), kind: 'material' }
		]
	},
	{
		id: 'bs_grind', n: 6, name: 'backside grind to 100 um (TSV reveal)', category: 'grinding_thinning', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'down', view: { ...view('work', 'cell', 'tsv'), block: BLK_HI, cell_z_um: [600, 800] },
		ops: [{ op: 'grind', face: 'bottom', to_z_um: um(675, GR8), stages: [{ name: 'coarse', removal_um: um(600), feed_um_s: fx(3, 'um/s') }, { name: 'fine', removal_um: um(75), feed_um_s: fx(0.5, 'um/s') }], reveal: ['tsv_cu'] }],
		tool: { id: 'grinder' },
		equipment: txt('DAG810 surface grinder (DISCO)', P27('step 8 equipment')),
		hud: [{ key: 'h', label: 'interposer', q: um(100, GR8), kind: 'target' }]
	},
	{
		id: 'bs_diel', n: 7, name: 'backside dielectric with via openings', category: 'deposition_other', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'down', view: { ...view('cell', 'block', 'tsv'), block: BLK_HI, cell_z_um: [600, 800] },
		ops: [
			{ op: 'coat', body: 'bsd', method: 'spin', planarization: fx(1, '1'), tool: { id: 'spin_coater' } },
			{ op: 'pattern', body: 'bsd', method: 'stepper', tone: 'positive', tool: { id: 'litho' } }
		],
		hud: [{ key: 'h', label: 'dielectric', q: um(5), kind: 'target' }]
	},
	{
		id: 'bs_bump', n: 8, name: 'backside Cu / SnAg bumps (through mask)', category: 'bumping', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'down', view: { ...view('block', 'cell', 'tsv'), block: BLK_HI, cell_z_um: [590, 800] },
		ops: [
			{ op: 'coat', label: 'resist coat', body: 'bs_resist', method: 'spin', planarization: fx(1, '1'), tool: { id: 'spin_coater' } },
			{ op: 'pattern', label: 'expose + develop', body: 'bs_resist', method: 'stepper', tone: 'positive', tool: { id: 'litho' } },
			{ op: 'plate', label: 'plate Cu / SnAg', bodies: ['bs_via', 'bs_cu', 'bs_snag'], mode: 'through_mask', w: 2, current_density_ma_cm2: [fx(10, 'mA/cm2'), fx(10, 'mA/cm2'), fx(10, 'mA/cm2')], tool: { id: 'ecp' } },
			{ op: 'strip', label: 'resist strip', bodies: ['bs_resist'], method: 'resist_strip', tool: { id: 'wet_bench' } }
		],
		hud: [
			{ key: 'pitch', label: 'pitch', q: um(150, BS), kind: 'target' },
			{ key: 'd', label: 'diameter', q: um(75, BS), kind: 'target' },
			{ key: 'h', label: 'Cu / SnAg', q: um(55, BS), kind: 'target' }
		],
		weight: 1.5
	},
	{
		id: 'debond', n: 9, name: 'laser debond and adhesive removal', category: 'debonding', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: { ...view('work', 'block'), block: BLK_HI },
		ops: [
			{ op: 'debond', carrier: 'glass', method: 'laser', release: 'release', scan: { pattern: 'raster', pitch_um: um(100), speed_mm_s: fx(2000, 'mm/s') }, w: 2 },
			{ op: 'strip', label: 'adhesive removal', bodies: ['tba'], method: 'adhesive_clean', tool: { id: 'wet_bench' } }
		],
		tool: { id: 'laser_debond' },
		equipment: txt('laser debonding system (AIMECHATEC)', P27('step 11 equipment')),
		hud: []
	},
	{
		id: 'dice', n: 10, name: 'dice the interposer wafer', category: 'dicing', step_kind: 'fab', db_step: null,
		piece: 'itp', orient: 'up', view: { ...view('block', 'work'), block: { x0_um: 20600, x1_um: 21100, y0_um: -150, y1_um: 150, z0_um: 600, z1_um: 1500, section_y_um: 0 } },
		ops: [{ op: 'dice', piece: 'itp', method: 'blade', kerf_um: um(60), feed_mm_s: fx(50, 'mm/s'), cut: 'kerf' }],
		tool: { id: 'dicing_blade' },
		equipment: txt('DAD3360 dicing saw (DISCO)', P27('step 12 equipment')),
		hud: [{ key: 'kerf', label: 'kerf', q: um(60), kind: 'condition' }]
	}
];

export const FIXTURE2_FLOW: Flow = {
	id: 'fixture_cow_carrier',
	name: 'Fixture: CoW, mold, carrier, TSV reveal, debond, dice (engine development)',
	family: null,
	family_label: 'Fixture',
	kind: 'composite',
	source_flows: [],
	routes: [{ id: 'main', name: 'main', default: true }],
	summary: 'Hand-written development fixture with a join and flip (TCB), capillary underfill, compression mold, mold grind, carrier bond with flip, backside grind and bumps facing down, laser debond and dicing. Not data.',
	refs: [],
	pieces: [
		{ id: 'itp', name: 'interposer wafer', kind: 'wafer', initial: true, carrier: { shape: 'disk', diameter_mm: fx(300, 'mm', '300 mm wafer format'), notch: true }, unit: { w_um: um(42000, ITP), d_um: um(46000, ITP) }, repeat: { pitch_x_um: um(42000, ITP), pitch_y_um: um(46000, ITP), edge_exclusion_mm: fx(3, 'mm') }, block: BLK },
		{ id: 'dieA', name: 'Die A', kind: 'die', initial: true, carrier: { shape: 'disk', diameter_mm: fx(300, 'mm', '300 mm wafer format') }, unit: { w_um: um(20000, DIE), d_um: um(20000, DIE) }, block: { x0_um: 9700, x1_um: 10300, y0_um: -150, y1_um: 150 } },
		{ id: 'glass', name: 'glass carrier', kind: 'carrier', initial: true, carrier: { shape: 'disk', diameter_mm: fx(300, 'mm', '300 mm carrier format') }, unit: { w_um: um(42000, ITP), d_um: um(46000, ITP) }, block: BLK_HI }
	],
	sites,
	bodies,
	profiles,
	steps
};
