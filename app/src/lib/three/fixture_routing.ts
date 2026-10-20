// DEV-ONLY routing fixture (DevLog-011), loaded with `?fixture=routing` in the dev server. Two routed families
// derived at load time from the real package3d.json: parts, arrays, refs and every dimension that exists there are
// copied as they are (status and refs kept); the per-level stack-ups, via classes and nets are hand-written here.
// Every number introduced here is status "template" with note FX ("fixture"). Keys follow the generator output
// (scripts/build_package3d.py, routing contract of DevLog-011 incl. through_kind / instances).
import type { Dim, Family, Layer, Net, Package3D, Route, ViaClass } from './types';

const FX = 'fixture: hand-written routing fixture for viewer development (DevLog-011); not from the database';
const NOTE = 'fixture: mock-up routing for viewer development; net layout, shares, jogs and all fixture dims are illustrative';
const fx = (value: number): Dim => ({ status: 'template', value, note: FX });
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

function layer(id: string, part: string, name: string, material: string, role: string, z: number, h: number, extra: Partial<Layer> = {}): Layer {
	return { id, part, name, material, role, z_um: z, h_um: h, template_id: extra.template_id ?? id, dims: { z_um: fx(z), h_um: fx(h) }, ...extra };
}
function route(use: string, matrix: string, o: { dir?: 'x' | 'y'; line?: number; space?: number; lineDim?: Dim; spaceDim?: Dim } = {}): Route {
	const r: Route = { use, matrix, fill: 0 };
	const dims: Record<string, Dim> = {};
	if (o.dir) r.dir = o.dir;
	if (o.line != null) { r.line_um = o.line; dims.line_um = o.lineDim ?? fx(o.line); }
	if (o.space != null) { r.space_um = o.space; dims.space_um = o.spaceDim ?? fx(o.space); }
	r.fill = use === 'plane' ? 0.85 : use === 'pad' ? 0.5 : o.line && o.space ? o.line / (o.line + o.space) : 0.5;
	dims.fill = { status: 'template', value: r.fill, note: `${FX}; default Cu fraction` };
	r.dims = dims;
	return r;
}
function via(v: ViaClass, dims: Record<string, Dim> = {}): ViaClass {
	const out: ViaClass = { ...v, dims: {} as Record<string, Dim> };
	for (const k of ['diameter_um', 'bottom_diameter_um', 'land_um', 'pitch_um', 'wall_um', 'liner_um', 'h_um', 'z_um'] as const) {
		const val = v[k];
		if (typeof val === 'number') out.dims![k] = dims[k] ?? fx(val);
	}
	return out;
}
function net(n: Net): Net {
	const dims: Record<string, Dim> = { share: { status: 'template', value: n.share, note: NOTE } };
	if (n.length_um != null) dims.length_um = { status: 'template', value: n.length_um, note: NOTE };
	return { ...n, dims };
}

function fcbga(src: Family): Family {
	const f = clone(src);
	f.id = 'fcbga_routed';
	f.name = 'FCBGA (routing fixture)';
	f.fixture = true;
	f.note = FX;
	const old = new Map((src.layers ?? []).map((l) => [l.id, l]));
	const bu = old.get('bu_top_1');
	const rs = (src.layers ?? []).find((l) => l.route?.use === 'signal')?.route;
	const mv = (src.routing?.vias ?? []).find((v) => v.kind === 'microvia');
	const lineDim = rs?.dims?.line_um ?? bu?.dims?.line_um, spaceDim = rs?.dims?.space_um ?? bu?.dims?.space_um, viaDim = mv?.dims?.diameter_um ?? bu?.dims?.via_um;
	const line = rs?.line_um ?? bu?.line_um ?? 30, space = rs?.space_um ?? bu?.space_um ?? 50, vd = mv?.diameter_um ?? (bu as { via_um?: number } | undefined)?.via_um ?? 60;
	const sig = (dir: 'x' | 'y') => route('signal', 'organic_build_up', { dir, line, space, lineDim, spaceDim });
	const plane = (m = 'organic_build_up') => route('plane', m, { space, spaceDim });
	const L: Layer[] = [];
	const srTop = old.get('sr_top');
	if (srTop) L.push(clone(srTop));
	const topUse = ['pad', 'x', 'plane', 'y', 'plane', 'x', 'plane', 'y'];
	const CU = 10, BU = 22.5;
	for (let k = 1; k <= 8; k++) {
		const T = 2258 - BU * (k - 1);
		const u = topUse[k - 1];
		const r = u === 'pad' ? route('pad', 'organic_build_up') : u === 'plane' ? plane() : sig(u as 'x' | 'y');
		L.push(layer(`bu_cu_${k}`, 'sbt_bu_top', `L${k} Cu`, 'copper', 'conductor', T - CU, CU, { template_id: 'bu_cu', route: r }));
		L.push(layer(`bu_d_${k}`, 'sbt_bu_top', `L${k} build-up dielectric`, 'organic_build_up', 'dielectric', T - BU, BU - CU, { template_id: 'bu_d' }));
	}
	L.push(layer('core_cu_t', 'sbt_core', 'Core Cu (top)', 'copper', 'conductor', 2063, 15, { route: plane('organic_laminate') }));
	L.push(layer('core_lam', 'sbt_core', 'Core laminate', 'organic_laminate', 'core', 693, 1370));
	L.push(layer('core_cu_b', 'sbt_core', 'Core Cu (bottom)', 'copper', 'conductor', 678, 15, { route: plane('organic_laminate') }));
	const botUse = ['plane', 'y', 'plane', 'x', 'plane', 'y', 'plane', 'pad'];
	for (let k = 1; k <= 8; k++) {
		const T = 678 - BU * (k - 1);
		const u = botUse[k - 1];
		const r = u === 'pad' ? route('pad', 'organic_build_up') : u === 'plane' ? plane() : sig(u as 'x' | 'y');
		L.push(layer(`bb_d_${k}`, 'sbt_bu_bot', `B${k} build-up dielectric`, 'organic_build_up', 'dielectric', T - (BU - CU), BU - CU, { template_id: 'bb_d' }));
		L.push(layer(`bb_cu_${k}`, 'sbt_bu_bot', `B${k} Cu`, 'copper', 'conductor', T - BU, CU, { template_id: 'bb_cu', route: r }));
	}
	const srBot = old.get('sr_bot');
	if (srBot) L.push(clone(srBot));
	f.layers = L;
	const pth = (src.arrays ?? []).find((a) => a.id === 'pth');
	f.arrays = (f.arrays ?? []).filter((a) => a.id !== 'mvia' && a.id !== 'pth');
	const vias: ViaClass[] = [];
	for (let k = 1; k <= 8; k++) {
		const T = 2258 - BU * (k - 1);
		vias.push(via({ id: `mv_top_${k}`, template_id: 'mv_top', name: 'Front microvia', kind: 'microvia', part: 'sbt_bu_top', through: `bu_d_${k}`, through_kind: 'layer', z_um: T - BU, h_um: BU - CU, upper: `bu_cu_${k}`, lower: k < 8 ? `bu_cu_${k + 1}` : null, diameter_um: vd, bottom_diameter_um: 45, land_um: 90, fill: 'filled' }, viaDim ? { diameter_um: viaDim } : {}));
	}
	vias.push(via({ id: 'pth', template_id: 'pth', name: 'Core PTH', kind: 'pth', part: 'sbt_core', through: 'core_lam', through_kind: 'layer', z_um: 693, h_um: 1370, upper: 'core_cu_t', lower: 'core_cu_b', diameter_um: pth?.diameter_um ?? 200, pitch_um: pth?.pitch_um ?? 500, land_um: 350, fill: 'plugged', wall_um: 25 }, { diameter_um: pth?.dims?.diameter_um ?? fx(200), pitch_um: pth?.dims?.pitch_um ?? fx(500) }));
	for (let k = 1; k <= 8; k++) {
		const T = 678 - BU * (k - 1);
		vias.push(via({ id: `mv_bot_${k}`, template_id: 'mv_bot', name: 'Back microvia (drilled from the BGA side)', kind: 'microvia', part: 'sbt_bu_bot', through: `bb_d_${k}`, through_kind: 'layer', z_um: T - (BU - CU), h_um: BU - CU, upper: k === 1 ? null : `bb_cu_${k - 1}`, lower: `bb_cu_${k}`, diameter_um: 45, bottom_diameter_um: vd, land_um: 90, fill: 'filled' }, viaDim ? { bottom_diameter_um: viaDim } : {}));
	}
	f.routing = {
		layout_note: NOTE,
		vias,
		nets: [
			net({ id: 'io', kind: 'vertical', from: 'bump', to: 'bga', style: 'stacked', jog: ['bu_cu_2', 'bu_cu_6', 'bb_cu_4', 'bb_cu_6'], share: 0.35 }),
			net({ id: 'io_st', kind: 'vertical', from: 'bump', to: 'bga', style: 'staggered', jog: ['bu_cu_4', 'bb_cu_2'], share: 0.1 }),
			net({ id: 'pg', kind: 'plane_tie', from: 'bump', plane: 'bu_cu_3', share: 0.3 }),
			net({ id: 'esc', kind: 'escape', from: 'bump', levels: ['bu_cu_2', 'bu_cu_6'], share: 0.15, length_um: 600 }),
			net({ id: 'bga_pg', kind: 'plane_tie', from: 'bga', plane: 'bb_cu_7', share: 0.3 })
		]
	};
	f.callouts = (f.callouts ?? []).map((c) => (c.target === 'bu_top' ? { ...c, target: 'bu_cu' } : c));
	f.insets = [
		...(f.insets ?? []),
		{ id: 'rt_2mm', label: 'Routing 2 mm (fixture)', box_mm: [-1, -0.05, 1, 0.05], z_um: [478, 2323], camera: { view: 'front', target: [0, 0, 1400], span_mm: 2 } },
		{ id: 'rt_05mm', label: 'Routing 0.5 mm (fixture)', box_mm: [-0.25, -0.05, 0.25, 0.05], z_um: [2040, 2330], camera: { view: 'front', target: [0, 0, 2185], span_mm: 0.5 } }
	];
	return f;
}

function cowos(src: Family): Family {
	const f = clone(src);
	f.id = 'cowos_s_routed';
	f.name = 'CoWoS-S (routing fixture)';
	f.fixture = true;
	f.note = FX;
	const inst = { instances: ['interposer_1', 'interposer_2'] };
	const P = f.parts.find((p) => p.id === 'interposer_1')!;
	const S = f.parts.find((p) => p.id === 'substrate')!;
	const IT = P.z_um + P.h_um, IB = P.z_um; // interposer top / bottom
	const ST = S.z_um + S.h_um, SB = S.z_um;
	const ip = (id: string, name: string, material: string, role: string, z: number, h: number, extra: Partial<Layer> = {}) =>
		layer(id, 'interposer_1', name, material, role, z, h, { ...inst, ...extra });
	const beol = (dir: 'x' | 'y') => route('signal', 'oxide', { dir, line: 0.4, space: 0.4 });
	const L: Layer[] = [
		ip('ip_pass', 'Passivation', 'oxide', 'passivation', IT - 1, 1),
		ip('ip_al', 'Al pad level', 'other', 'conductor', IT - 2, 1, { material_label: 'Al', route: route('pad', 'oxide') }),
		ip('ip_v0', 'ILD (Al via)', 'oxide', 'dielectric', IT - 3, 1),
		ip('ip_cu_3', 'BEOL Cu 3 (D2D)', 'copper', 'conductor', IT - 4, 1, { route: beol('x') }),
		ip('ip_v3', 'ILD 3', 'oxide', 'dielectric', IT - 5, 1),
		ip('ip_cu_2', 'BEOL Cu 2 (ground plane)', 'copper', 'conductor', IT - 6, 1, { route: route('plane', 'oxide', { space: 0.4 }) }),
		ip('ip_v2', 'ILD 2', 'oxide', 'dielectric', IT - 7, 1),
		ip('ip_cu_1', 'BEOL Cu 1 (D2D, TSV landing)', 'copper', 'conductor', IT - 8, 1, { route: beol('y') }),
		ip('ip_si', 'Si core (TSV)', 'silicon', 'core', IB + 6, IT - 8 - IB - 6),
		ip('ip_bs_cu', 'Backside RDL', 'copper', 'conductor', IB + 3, 3, { route: route('signal', 'polymer_dielectric', { dir: 'x', line: 5, space: 5 }) }),
		ip('ip_bs_pass', 'Backside passivation', 'polymer_dielectric', 'passivation', IB, 3)
	];
	const sub = (id: string, name: string, material: string, role: string, z: number, h: number, extra: Partial<Layer> = {}) => layer(id, 'substrate', name, material, role, z, h, extra);
	const ssig = (dir: 'x' | 'y') => route('signal', 'organic_build_up', { dir, line: 15, space: 15 });
	const spl = (m = 'organic_build_up') => route('plane', m, { space: 30 });
	L.push(sub('sr_top', 'Solder resist (C4 side)', 'polymer_dielectric', 'passivation', ST - 20, 20));
	const topUse = ['pad', 'plane', 'y', 'plane', 'x'];
	for (let k = 1; k <= 5; k++) {
		const T = ST - 20 - 26 * (k - 1);
		const u = topUse[k - 1];
		L.push(sub(`sc_cu_${k}`, `FL${k} Cu`, 'copper', 'conductor', T - 10, 10, { template_id: 'sc_cu', route: u === 'pad' ? route('pad', 'organic_build_up') : u === 'plane' ? spl() : ssig(u as 'x' | 'y') }));
		L.push(sub(`sc_d_${k}`, `FL${k} dielectric`, 'organic_build_up', 'dielectric', T - 26, 16, { template_id: 'sc_d' }));
	}
	const CT = ST - 150, CB = SB + 150; // core top / bottom
	L.push(sub('core_cu_t', 'Core Cu (top)', 'copper', 'conductor', CT - 15, 15, { route: spl('organic_laminate') }));
	L.push(sub('core_lam', 'Core laminate', 'organic_laminate', 'core', CB + 15, CT - CB - 30));
	L.push(sub('core_cu_b', 'Core Cu (bottom)', 'copper', 'conductor', CB, 15, { route: spl('organic_laminate') }));
	const botUse = ['plane', 'y', 'plane', 'x', 'pad'];
	for (let k = 1; k <= 5; k++) {
		const T = CB - 26 * (k - 1);
		const u = botUse[k - 1];
		L.push(sub(`sb_d_${k}`, `BL${k} dielectric`, 'organic_build_up', 'dielectric', T - 16, 16, { template_id: 'sb_d' }));
		L.push(sub(`sb_cu_${k}`, `BL${k} Cu`, 'copper', 'conductor', T - 26, 10, { template_id: 'sb_cu', route: u === 'pad' ? route('pad', 'organic_build_up') : u === 'plane' ? spl() : ssig(u as 'x' | 'y') }));
	}
	L.push(sub('sr_bot', 'Solder resist (BGA side)', 'polymer_dielectric', 'passivation', SB, 20));
	f.layers = L;
	const tsv = (src.arrays ?? []).find((a) => a.template_id === 'tsv');
	f.arrays = (f.arrays ?? []).filter((a) => a.template_id !== 'tsv');
	const vi = { part: 'interposer', through_kind: 'layer', instances: ['interposer_1', 'interposer_2'] };
	const vias: ViaClass[] = [
		via({ id: 'v_al', name: 'Al via', kind: 'beol_via', ...vi, through: 'ip_v0', z_um: IT - 3, h_um: 1, upper: 'ip_al', lower: 'ip_cu_3', diameter_um: 0.5, land_um: 1, fill: 'filled' }),
		via({ id: 'v3', name: 'BEOL via 3', kind: 'beol_via', ...vi, through: 'ip_v3', z_um: IT - 5, h_um: 1, upper: 'ip_cu_3', lower: 'ip_cu_2', diameter_um: 0.4, land_um: 0.8, fill: 'filled' }),
		via({ id: 'v2', name: 'BEOL via 2', kind: 'beol_via', ...vi, through: 'ip_v2', z_um: IT - 7, h_um: 1, upper: 'ip_cu_2', lower: 'ip_cu_1', diameter_um: 0.4, land_um: 0.8, fill: 'filled' }),
		via({ id: 'tsv', name: 'TSV', kind: 'tsv', ...vi, through: 'ip_si', z_um: IB + 6, h_um: IT - 8 - IB - 6, upper: 'ip_cu_1', lower: 'ip_bs_cu', diameter_um: tsv?.diameter_um ?? 10, pitch_um: tsv?.pitch_um ?? 50, land_um: 15, liner_um: 0.5, fill: 'filled' }, { diameter_um: tsv?.dims?.diameter_um ?? fx(10), pitch_um: tsv?.dims?.pitch_um ?? fx(50) })
	];
	for (let k = 1; k <= 5; k++) {
		const T = ST - 20 - 26 * (k - 1);
		vias.push(via({ id: `mv_sc_${k}`, template_id: 'mv_sc', name: 'Front microvia', kind: 'microvia', part: 'substrate', through: `sc_d_${k}`, through_kind: 'layer', z_um: T - 26, h_um: 16, upper: `sc_cu_${k}`, lower: k < 5 ? `sc_cu_${k + 1}` : 'core_cu_t', diameter_um: 50, bottom_diameter_um: 38, land_um: 80, fill: 'filled' }));
	}
	vias.push(via({ id: 'pth', name: 'Core PTH', kind: 'pth', part: 'substrate', through: 'core_lam', through_kind: 'layer', z_um: CB + 15, h_um: CT - CB - 30, upper: 'core_cu_t', lower: 'core_cu_b', diameter_um: 150, pitch_um: 400, land_um: 280, fill: 'plugged', wall_um: 20 }));
	for (let k = 1; k <= 5; k++) {
		const T = CB - 26 * (k - 1);
		vias.push(via({ id: `mv_sb_${k}`, template_id: 'mv_sb', name: 'Back microvia', kind: 'microvia', part: 'substrate', through: `sb_d_${k}`, through_kind: 'layer', z_um: T - 16, h_um: 16, upper: k === 1 ? 'core_cu_b' : `sb_cu_${k - 1}`, lower: `sb_cu_${k}`, diameter_um: 38, bottom_diameter_um: 50, land_um: 80, fill: 'filled' }));
	}
	f.routing = {
		layout_note: NOTE,
		vias,
		nets: [
			net({ id: 'd2d_a', kind: 'lateral', from: 'ubump_soc', to: 'ubump_hbm_a', levels: ['ip_cu_3', 'ip_cu_1'], share: 0.6 }),
			net({ id: 'd2d_b', kind: 'lateral', from: 'ubump_soc', to: 'ubump_hbm_b', levels: ['ip_cu_3', 'ip_cu_1'], share: 0.6 }),
			net({ id: 'ip_io', kind: 'vertical', from: 'ubump_soc', to: 'c4', style: 'stacked', jog: ['ip_cu_3', 'ip_bs_cu'], share: 0.4 }),
			net({ id: 'sub_io', kind: 'vertical', from: 'c4', to: 'bga', style: 'stacked', jog: ['sc_cu_3', 'sc_cu_5', 'sb_cu_2', 'sb_cu_4'], share: 0.25 }),
			net({ id: 'pg_soc', kind: 'plane_tie', from: 'ubump_soc', plane: 'ip_cu_2', share: 0.3 }),
			net({ id: 'pg_hbm_a', kind: 'plane_tie', from: 'ubump_hbm_a', plane: 'ip_cu_2', share: 0.3 }),
			net({ id: 'pg_hbm_b', kind: 'plane_tie', from: 'ubump_hbm_b', plane: 'ip_cu_2', share: 0.3 }),
			net({ id: 'pg_c4', kind: 'plane_tie', from: 'c4', plane: 'sc_cu_2', share: 0.3 }),
			net({ id: 'pg_bga', kind: 'plane_tie', from: 'bga', plane: 'sb_cu_3', share: 0.3 })
		]
	};
	f.insets = [
		...(f.insets ?? []),
		{ id: 'd2h_mid', label: 'SoC-HBM gap 0.6 mm (fixture)', box_mm: [8.775, 23.95, 9.375, 24.07], z_um: [ST, IT + 25], camera: { view: 'front', target: [9.075, 24.0087, (ST + IT + 25) / 2], span_mm: 0.6 } },
		{ id: 'd2h_fine', label: 'SoC edge BEOL 0.1 mm (fixture)', box_mm: [8.9, 23.95, 9.0, 24.07], z_um: [IT - 30, IT + 25], camera: { view: 'front', target: [8.95, 24.0087, IT - 2], span_mm: 0.1 } }
	];
	return f;
}

/** Prepend the routed fixture families (built from fcbga_organic and cowos_s when present). */
export function addRoutingFixture(d: Package3D): void {
	const out: Family[] = [];
	const a = d.families.find((f) => f.id === 'fcbga_organic');
	const b = d.families.find((f) => f.id === 'cowos_s');
	if (a) out.push(fcbga(a));
	if (b) out.push(cowos(b));
	d.families = [...out, ...d.families];
}
