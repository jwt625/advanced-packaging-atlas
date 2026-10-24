// Jet dispenser (op underfill; Musashi FAD2500 in the CoW flows, A90): gantry X beam, Z carriage, heated syringe
// (72 C, A93), jet valve, nozzle 50 um ID / 150 um OD (A96). Dots (~50 um flying rod, ~100 um landed, A96) are fired
// at the jet frequency (300 Hz, A97) while the head traverses an I / L / U / perimeter pass along the die edges
// (A100), offset from the edge (A98 analog). Passes repeat after waits (A103). The capillary front itself is the
// fill body (engine); the tool draws the head, flying droplets and the landed dot bead (shrinking as it is drawn in).
// Mode `bead` (args.mode = 'bead'): needle dispense of a continuous adhesive bead along a ring path (stiffener /
// lid attach, A150-A154); bead geometry template (A154 N/A).

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	BaseActor,
	blockWin,
	box,
	carrierCenter,
	carrierSize,
	cyl,
	der,
	hash,
	live,
	num,
	opt,
	rep,
	ring,
	seg,
	setInst,
	smooth,
	str,
	tpl,
	type Readout
} from './common';

export const JET_SPEC: Record<string, PDim> = {
	nozzle_id_um: rep(50, 'um', 'A96', 'IBM DBHi fine jet nozzle 50 um ID'),
	nozzle_od_um: rep(150, 'um', 'A96', 'nozzle 150 um OD'),
	rod_d_um: rep(50, 'um', 'A96', 'flying dot forms a rod ~50 um diameter'),
	dot_d_um: rep(100, 'um', 'A96', 'landed dot ~100 um (max 120 um)'),
	freq_hz: rep(300, 'Hz', 'A97', 'Nordson NexJet 300 Hz continuous (med confidence)'),
	syringe_c: rep(72, 'C', 'A93', 'FAD2500 syringe temperature, 12 in CoW wafer'),
	stage_c: rep(100, 'C', 'A93', 'FAD2500 stage temperature'),
	cuf_mg: rep(60, 'mg', 'A93', 'CUF amount per unit'),
	area_mm: rep(500, 'mm', 'A91', 'FAD2500 work area 500 x 500 mm'),
	xy_max_mm_s: rep(1000, 'mm/s', 'A91', 'X, Y axis 1,000 mm/s (max)'),
	z_max_mm_s: rep(500, 'mm/s', 'A91', 'Z axis 500 mm/s (max)'),
	pass_s: rep(0.6, 's', 'A101', 'L-shaped pass ~0.6 s on a 12 x 12 mm die'),
	pass_mm_s: der(40, 'mm/s', 'L pass length (2 x 12 mm) / pass time', ['A101'], '24 / 0.6'),
	dot_pitch_um: der(133, 'um', 'pass speed / jet frequency', ['A101', 'A97'], '40 mm/s / 300 Hz'),
	edge_offset_um: tpl(100, 'um', 'needle dispense 76-127 um (0.003-0.005 in) from the die edge (A98) used as the jet line offset (analog)', undefined, ['A98']),
	standoff_um: tpl(1000, 'um', 'non-contact jet height above the substrate not reported; must exceed the flying rod length (A96)', undefined, ['A96']),
	dot_h_um: tpl(40, 'um', 'landed dot height not reported; flattened by wetting at 100 C stage (A93)', undefined, ['A93']),
	passes: rep(3, '1', 'A103', 'three 0.5 mg lines (Nordson DJ9000, 5 um gap)'),
	gap1_s: der(150, 's', 'midpoint of the 2-3 min wait between the first lines', ['A103'], '(120 + 180) / 2'),
	gap2_s: der(360, 's', 'midpoint of the 5-7 min wait before the last line', ['A103'], '(300 + 420) / 2'),
	syringe_d_mm: tpl(22, 'mm', 'syringe barrel diameter drawn (30 cc class); not reported'),
	jacket_d_mm: tpl(30, 'mm', 'syringe heater jacket diameter; not reported (heater at 72 C, A93)', undefined, ['A93']),
	beam_len_mm: der(700, 'mm', 'work area + carriage travel margin', ['A91'], '500 + 200 (margin template)'),
	bead_d_um: tpl(1000, 'um', 'adhesive bead diameter for stiffener / lid attach not reported (A154)', undefined, ['A154']),
	bead_mm_s: tpl(10, 'mm/s', 'adhesive bead dispense speed not reported (A154)', undefined, ['A154']),
	needle_od_um: tpl(800, 'um', 'adhesive needle outer diameter; not reported'),
	ring_inset_mm: tpl(3, 'mm', 'stiffener bead centerline inset from the substrate edge; not reported (2.0 mm-thick ring, A150)', undefined, ['A150'])
};

type P2 = [number, number]; // tool frame (x, z)

function pathLen(p: P2[]): number[] {
	const L = [0];
	for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
	return L;
}
function along(p: P2[], L: number[], s: number): P2 {
	const d = Math.min(Math.max(s, 0), 1) * L[L.length - 1];
	for (let i = 1; i < p.length; i++)
		if (d <= L[i] || i === p.length - 1) {
			const k = (d - L[i - 1]) / Math.max(L[i] - L[i - 1], 1e-9);
			return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
		}
	return p[p.length - 1];
}

const MAX_DOTS = 1200;
const FLY = 3;

export class JetDispenser extends BaseActor {
	readonly id = 'jet_dispenser';
	readonly name = 'Jet dispenser';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = JET_SPEC;
	private mode: 'jet' | 'bead' = 'jet';
	private path: P2[] = [];
	private L: number[] = [0];
	private dots: THREE.InstancedMesh | null = null;
	private fly: THREE.InstancedMesh | null = null;
	private bead: THREE.Mesh | null = null;
	private beadIdx = 0;
	private args: ToolArgs = {};
	private winRange: [number, number] | null = null; // block: path-parameter range inside the window

	protected geomKey(args: ToolArgs): string {
		return [str(args, 'mode', 'jet'), str(args, 'dispense', 'L'), opt(args, 'fill_x_um'), opt(args, 'fill_y_um'), opt(args, 'fill_w_um'), opt(args, 'fill_d_um')].join('|');
	}
	configure(args: ToolArgs): void {
		this.args = args;
		this.mode = str(args, 'mode', 'jet') === 'bead' ? 'bead' : 'jet';
	}

	/** Die / ring footprint in the tool frame. */
	private footprint(f: ToolFrame): { xa: number; xb: number; za: number; zb: number } {
		const a = this.args;
		const fx = opt(a, 'fill_x_um'), fy = opt(a, 'fill_y_um'), fw = opt(a, 'fill_w_um'), fd = opt(a, 'fill_d_um');
		if (fw !== null && fd !== null) {
			const cx = (fx ?? f.focus_um.x) - f.focus_um.x, cz = -((fy ?? f.focus_um.y) - f.focus_um.y);
			return { xa: cx - fw / 2, xb: cx + fw / 2, za: cz - fd / 2, zb: cz + fd / 2 };
		}
		if (f.scale === 'work' || this.mode === 'bead') {
			const w = f.unit.w_um, d = f.unit.d_um;
			const cx = -f.focus_um.x, cz = f.focus_um.y;
			return { xa: cx - w / 2, xb: cx + w / 2, za: cz - d / 2, zb: cz + d / 2 };
		}
		// block fallback: a die whose -x edge sits one offset right of the window center (line through the center)
		const o = this.spec.edge_offset_um.value;
		return { xa: o, xb: o + 20000, za: -10000, zb: 10000 };
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const fp = this.footprint(f);
		if (this.mode === 'jet') {
			const o = s.edge_offset_um.value;
			const pat = str(this.args, 'dispense', 'L');
			const A: P2 = [fp.xa - o, fp.za - o], B: P2 = [fp.xa - o, fp.zb + o], C: P2 = [fp.xb + o, fp.zb + o], Dd: P2 = [fp.xb + o, fp.za - o];
			this.path = pat === 'one_side' ? [[fp.xa - o, fp.za], [fp.xa - o, fp.zb]] : pat === 'U' ? [Dd, A, B, C] : pat === 'perimeter' ? [A, B, C, Dd, A] : [[fp.xa - o, fp.za], B, [fp.xb, fp.zb + o]];
		} else {
			const ins = s.ring_inset_mm.value * 1000;
			const A: P2 = [fp.xa + ins, fp.za + ins], B: P2 = [fp.xa + ins, fp.zb - ins], C: P2 = [fp.xb - ins, fp.zb - ins], Dd: P2 = [fp.xb - ins, fp.za + ins];
			this.path = [A, B, C, Dd, A];
		}
		this.L = pathLen(this.path);
		this.winRange = null;
		if (f.scale === 'block') {
			const w = blockWin(f);
			const m = 3 * s.dot_d_um.value;
			let a = -1, b = -1;
			for (let i = 0; i <= 2000; i++) {
				const p = along(this.path, this.L, i / 2000);
				if (p[0] >= w.x0 - m && p[0] <= w.x1 + m && p[1] >= w.zBack - m && p[1] <= w.zSec + m) {
					if (a < 0) a = i / 2000;
					b = i / 2000;
				}
			}
			if (a >= 0) this.winRange = [a, b];
		}
		const sd = s.standoff_um.value;
		const yS = f.zmap(f.surface_um);
		if (this.mode === 'jet') {
			const od = s.nozzle_od_um.value, id = s.nozzle_id_um.value;
			this.add('head', 'steel', ring(id / 2, od / 2, 1000, 0, 24), 'nozzle 50 um ID / 150 um OD (A96)');
			this.add('head', 'steel', cyl(1500, 5000, 0, 1000 + 2500, 0, 32, 250), 'nozzle holder (template)');
			if (f.scale === 'work') {
				this.addOcc('head', 'steel', box(22000, 30000, 22000, 0, 6000 + 15000, 0), 'jet valve body (piezo / pneumatic; template)');
				const jd = s.jacket_d_mm.value * 1000, sdm = s.syringe_d_mm.value * 1000;
				this.addOcc('head', 'al', cyl(jd / 2, 60000, 0, 36000 + 30000, 0, 40), 'syringe heater jacket, 72 C (A93)');
				this.addOcc('head', 'glass', cyl(sdm / 2, 30000, 0, 96000 + 15000, 0, 40), 'syringe barrel (template size)');
				this.addOcc('head', 'al', cyl(sdm / 2 + 1500, 6000, 0, 126000 + 3000, 0, 40), 'air adapter cap');
				this.addOcc('head', 'al', box(60000, 140000, 8000, 0, 70000, -jd / 2 - 6000), 'Z carriage plate');
			}
		} else {
			const nd = s.needle_od_um.value;
			this.add('head', 'steel', ring(nd * 0.3, nd / 2, 12000, 0, 24), 'dispense needle (template)');
			if (f.scale === 'work') {
				this.add('head', 'steel', cyl(4000, 8000, 0, 12000 + 4000, 0, 24, 2000), 'needle hub');
				this.addOcc('head', 'glass', cyl(11000, 70000, 0, 20000 + 35000, 0, 40), 'adhesive syringe (template)');
				this.addOcc('head', 'al', box(50000, 110000, 8000, 0, 55000, -18000), 'Z carriage plate');
			}
		}
		if (f.scale === 'work') {
			const L = s.beam_len_mm.value * 1000;
			this.addOcc('beam', 'al', box(L, 100000, 80000, 0, 0, 0), 'X gantry beam (FAD2500 500 x 500 mm area, A91)');
			const cs = carrierSize(f);
			const c = carrierCenter(f);
			const ch = 20000, m = 15000;
			const yb = f.zmap(0);
			if (cs.disk) this.add('stage', 'al', cyl(cs.w / 2 + m, ch, c.x, yb - ch / 2, c.z, 128), 'heated stage 100-110 C (A93, A94); size template');
			else this.add('stage', 'al', box(cs.w + 2 * m, ch, cs.d + 2 * m, c.x, yb - ch / 2, c.z), 'heated stage; size template');
		}
		if (this.mode === 'jet') {
			const dotG = f.scale === 'work' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 2);
			this.dots = this.inst('dots', 'underfill', dotG, MAX_DOTS, 'landed CUF dots ~100 um forming the bead (A96)', { cure: 0, wet: 1 });
			this.fly = this.inst('dots', 'underfill', new THREE.SphereGeometry(1, 16, 12), FLY, 'flying dot: rod ~50 um diameter (A96)', { cure: 0, wet: 1 });
		} else {
			const curve = new THREE.CurvePath<THREE.Vector3>();
			for (let i = 1; i < this.path.length; i++)
				curve.add(new THREE.LineCurve3(new THREE.Vector3(this.path[i - 1][0], 0, this.path[i - 1][1]), new THREE.Vector3(this.path[i][0], 0, this.path[i][1])));
			const tubSeg = 400;
			const g = new THREE.TubeGeometry(curve, tubSeg, s.bead_d_um.value / 2, 12, false);
			g.scale(1, 0.6, 1);
			g.translate(0, yS + s.bead_d_um.value * 0.3 * 0.6, 0);
			this.bead = this.mesh('dots', 'adhesive', g, 'adhesive bead (geometry template, A154)', { cure: 0 });
			this.beadIdx = g.index ? g.index.count : g.attributes.position.count;
		}
		void sd;
	}

	/** Pass schedule in real seconds from the op start; window = max(real pass time, a visible share). */
	private passes(args: ToolArgs, D: number | null): { s: number; w: number; real: number }[] {
		const s = this.spec;
		const P = this.L[this.L.length - 1] / 1000; // mm
		if (this.mode === 'bead') {
			const real = P / num(args, s, 'bead_mm_s');
			return [{ s: 0, w: D ? Math.max(real, 0.8 * D) : real, real }];
		}
		const v = num(args, s, 'pass_mm_s');
		const real = P / v;
		const n = Math.max(1, Math.round(num(args, s, 'passes')));
		const g = [0, num(args, s, 'gap1_s'), num(args, s, 'gap2_s')];
		const out: { s: number; w: number; real: number }[] = [];
		let t0 = 0;
		for (let k = 0; k < n; k++) {
			if (k > 0) t0 += (g[Math.min(k, 2)] ?? g[2]) + real;
			out.push({ s: t0, w: D ? Math.max(real, 0.07 * D) : real, real });
		}
		return out;
	}

	defaultDuration(args: ToolArgs): number {
		const p = this.passes(args, null);
		const last = p[p.length - 1];
		return this.mode === 'bead' ? last.real : last.s + last.real + num(args, this.spec, 'gap2_s');
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const D = ctx.tReal_s !== null ? Math.max(this.defaultDuration(args), 1e-6) : null;
		const tr = ctx.phase === 'process' ? (ctx.tReal_s ?? ctx.u * this.defaultDuration(args)) : ctx.phase === 'retract' ? Infinity : -1;
		const ps = this.passes(args, D ?? this.defaultDuration(args));
		const sd = this.mode === 'jet' ? num(args, s, 'standoff_um') : s.bead_d_um.value * 0.5;
		const yS = f.zmap(live(ctx, 'surface_um') ?? f.surface_um);
		const park = f.scale === 'work' ? 20000 : Math.max(blockWin(f).h, 200);
		// active pass and progress
		let k = -1, q = 0;
		for (let i = 0; i < ps.length; i++) if (tr >= ps[i].s) {
			k = i;
			q = (tr - ps[i].s) / ps[i].w;
		}
		const active = k >= 0 && q <= 1;
		// block scale: the stretched pass window is spent where the path crosses the window (dots outside it are not
		// in view anyway), so the nozzle is seen crossing the block during each pass
		const wr = this.winRange;
		const qe = (x: number) => (wr ? wr[0] + (wr[1] - wr[0]) * Math.min(Math.max(x, 0), 1) : x);
		let hx: P2, hy: number;
		if (ctx.phase === 'approach') {
			hx = along(this.path, this.L, 0);
			hy = yS + sd + park * (1 - smooth(t / 0.12));
		} else if (ctx.phase === 'retract') {
			hx = along(this.path, this.L, 1);
			hy = yS + sd + park * smooth((t - 0.9) / 0.1);
		} else if (active) {
			hx = along(this.path, this.L, qe(q));
			hy = yS + sd;
		} else {
			// waiting between passes: parked above the start of the next line
			const lift = Math.min(1, (tr - (ps[k]?.s ?? 0) - (ps[k]?.w ?? 0)) / Math.max(ps[k]?.w ?? 1, 1e-6));
			hx = along(this.path, this.L, k < 0 ? 0 : 1 - smooth(lift));
			hy = yS + sd + park * 0.5 * smooth(lift);
		}
		this.rig('head').position.set(hx[0], hy, hx[1]);
		const beam = this.rigs.get('beam');
		if (beam) beam.position.set(0, hy + 150000, hx[1] - 60000);
		if (this.mode === 'bead' && this.bead) {
			const p = ctx.phase === 'approach' ? 0 : ctx.phase === 'retract' ? 1 : Math.min(1, Math.max(0, q));
			this.bead.geometry.setDrawRange(0, Math.floor((p * this.beadIdx) / 3) * 3);
			this.setMat('adhesive', { cure: 0 });
			return;
		}
		// dots: every pass up to the active one; earlier passes shrink as the bead is drawn under the die
		const dots = this.dots!, fly = this.fly!;
		const P = this.L[this.L.length - 1];
		const pitch = num(args, s, 'dot_pitch_um');
		const N = Math.max(1, Math.round(P / pitch));
		const dd = num(args, s, 'dot_d_um'), dh = s.dot_h_um.value;
		const win = f.scale === 'block' ? blockWin(f) : null;
		let n = 0;
		const front = live(ctx, 'front_frac');
		for (let i = 0; i <= Math.min(k, ps.length - 1) && ctx.phase !== 'approach'; i++) {
			const qi = i === k ? qe(Math.min(1, q)) : 1;
			const end = ps[i].s + ps[i].w;
			const next = ps[i + 1]?.s ?? end + num(args, s, 'gap2_s');
			const absorbed = front !== null ? front : smooth((tr - end) / Math.max((next - end) * 0.8, 1e-6));
			const sc = i === k && q <= 1 ? 1 : 1 - 0.75 * absorbed;
			const m = Math.floor(qi * N);
			for (let j = 0; j < m && n < MAX_DOTS; j++) {
				const p = along(this.path, this.L, (j + 0.5) / N);
				if (win && (p[0] < win.x0 - 2 * dd || p[0] > win.x1 + 2 * dd || p[1] < win.zBack - 2 * dd || p[1] > win.zSec + dd)) continue;
				const jit = (hash(j, i) - 0.5) * 0.15 * dd;
				const r = (dd / 2) * sc * (0.92 + 0.16 * hash(j, i + 7));
				setInst(dots, n++, p[0] + jit, yS + dh * 0.35 * sc, p[1] + jit * 0.5, r, (dh / 2) * sc, r);
			}
		}
		dots.count = n;
		dots.instanceMatrix.needsUpdate = true;
		// flying dots under the nozzle while a pass is active (visual rate, playback time)
		let nf = 0;
		if (active && ctx.phase === 'process' && !ctx.reduceMotion) {
			const rod = num(args, s, 'rod_d_um');
			for (let i = 0; i < FLY; i++) {
				const fr = (ctx.tPlay_s * 2.5 + i / FLY) % 1;
				setInst(fly, nf++, hx[0], hy - sd * fr, hx[1], rod / 2, rod * 1.5, rod / 2);
			}
		}
		fly.count = nf;
		fly.instanceMatrix.needsUpdate = true;
		this.setMat('underfill', { cure: 0, wet: 1 });
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const fp = this.footprint(f);
		const m = 3000;
		const yS = f.zmap(f.surface_um);
		return new THREE.Box3(new THREE.Vector3(fp.xa - m, f.back_y ?? yS - 1000, fp.za - m), new THREE.Vector3(fp.xb + m, yS + 12000, fp.zb + m));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const D = this.defaultDuration(args);
		const tr = ctx.phase === 'process' ? (ctx.tReal_s ?? ctx.u * D) : null;
		const ps = this.passes(args, D);
		let k = 0;
		if (tr !== null) for (let i = 0; i < ps.length; i++) if (tr >= ps[i].s) k = i + 1;
		const P = this.L[this.L.length - 1];
		if (this.mode === 'bead')
			return [
				{ key: 'bead_len', label: 'bead path', value: P / 1000, unit: 'mm', status: 'template' },
				{ key: 'bead_speed', label: 'dispense speed', value: num(args, s, 'bead_mm_s'), unit: 'mm/s', status: 'template', note: 'A154 N/A' }
			];
		return [
			{ key: 'pass', label: 'pass', value: tr === null ? null : k, unit: '1', status: 'reported', note: `of ${ps.length} lines (A103)` },
			{ key: 'pass_s', label: 'pass time (real)', value: ps[0].real, unit: 's', status: 'derived', note: 'path length / pass speed; playback window stretched for visibility' },
			{ key: 'freq', label: 'jet frequency', value: num(args, s, 'freq_hz'), unit: 'Hz', status: s.freq_hz.status, note: 'droplets drawn at a visual rate' },
			{ key: 'dots', label: 'dots per pass', value: Math.round(P / num(args, s, 'dot_pitch_um')), unit: '1', status: 'derived' },
			{ key: 'syringe', label: 'syringe T', value: num(args, s, 'syringe_c'), unit: 'C', status: s.syringe_c.status },
			{ key: 'stage', label: 'stage T', value: num(args, s, 'stage_c'), unit: 'C', status: s.stage_c.status }
		];
	}
}

export const createJetDispenser = (args?: ToolArgs) => {
	const a = new JetDispenser();
	if (args) a.configure(args);
	return a;
};
