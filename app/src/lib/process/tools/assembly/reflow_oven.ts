// Mass reflow oven (op reflow; Senju SNR-1065GT in the 00027 / 00155 flows, A40): N2 convection tunnel with 14
// heated + 2 cooling zones (A42), cross-nozzle heater plates above and below the conveyor (A46), labyrinth N2
// curtains at inlet / outlet (A46), edge-chain conveyor (A43). The piece stays at the tool-frame origin; the oven
// translates past it at the belt speed. Drawn as a cutaway: the upper heater half in front of the section plane is
// removed so the board stays visible. Zone set points are a template shaped to the J-STD-020E envelope (A48);
// the HUD gets them through readouts() / traces().

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, box, boxMM, carrierSize, cylZ, der, num, rep, smooth, tpl, type Readout, type Trace } from './common';

const ZONE_NOTE = 'zone set point not reported for SNR-1065GT (A47 gap); template shaped to the J-STD-020E Pb-free envelope (A48: Ts 150-200 C for 60-120 s, peak <= 260 C) and the 250-260 C SAC need (A50)';
// 14 heated zones (template set points, C); 2 cooling zones (forced N2 cooling, no set point drawn)
const ZONE_SET = [150, 160, 170, 175, 180, 185, 190, 195, 200, 205, 225, 245, 260, 255];

export const REFLOW_SPEC: Record<string, PDim> = {
	zones_heated: rep(14, '1', 'A42', 'SNR-1065GT heated zones'),
	zones_cool: rep(2, '1', 'A42', 'SNR-1065GT cooling zones'),
	machine_mm: rep(7900, 'mm', 'A41', 'machine length (incl. load / unload); heated length not reported (A47)'),
	belt_min_m_min: rep(0.3, 'm/min', 'A43'),
	belt_max_m_min: rep(2.0, 'm/min', 'A43'),
	belt_m_min: tpl(0.8, 'm/min', 'belt speed of the run not reported; inside the 0.3-2.0 m/min range (A43)', undefined, ['A43']),
	zone_pitch_mm: tpl(350, 'mm', 'zone length not reported (A47); equal zones, 16 x 350 = 5.6 m inside the 7.9 m machine (A41)', undefined, ['A41', 'A47']),
	curtain_mm: tpl(250, 'mm', 'labyrinth N2 curtain length at inlet / outlet (A46); length not reported', undefined, ['A46']),
	board_max_mm: rep(500, 'mm', 'A44', 'board W 50-500, L 100-500 mm'),
	comp_max_mm: rep(10, 'mm', 'A44', 'top component height <= 10 mm (option 35 mm)'),
	tunnel_w_mm: tpl(560, 'mm', 'tunnel inner width; board width max 500 mm (A44) + margin', undefined, ['A44']),
	upper_gap_mm: tpl(30, 'mm', 'upper nozzle plate above the conveyor; > 10 mm component limit (A44)', undefined, ['A44']),
	lower_gap_mm: tpl(40, 'mm', 'lower nozzle plate below the conveyor; not reported'),
	chain_pitch_mm: tpl(12.7, 'mm', 'edge-chain link pitch drawn (roller-chain class); not reported'),
	board_lag_s: tpl(25, 's', 'board temperature drawn as a first-order lag of the zone set point when no step profile is given; time constant not reported'),
	n2_l_min: rep(400, 'L/min', 'A45', 'N2 >= 99.999 %, >= 0.4 MPa'),
	dwell_s: der(420, 's', '(zones x zone pitch) / belt speed', ['A42', 'A43'], '16 x 0.35 m / 0.8 m/min (template inputs)')
};
for (let i = 0; i < ZONE_SET.length; i++) REFLOW_SPEC[`zone${String(i + 1).padStart(2, '0')}_c`] = tpl(ZONE_SET[i], 'C', ZONE_NOTE, undefined, ['A47', 'A48', 'A50']);

export class ReflowOven extends BaseActor {
	readonly id = 'reflow_oven';
	readonly name = 'Reflow oven (N2 convection)';
	readonly scales = ['work'] as 'work'[];
	readonly spec = REFLOW_SPEC;

	private geo(args: ToolArgs) {
		const s = this.spec;
		const nh = Math.round(num(args, s, 'zones_heated')), nc = Math.round(num(args, s, 'zones_cool'));
		const p = num(args, s, 'zone_pitch_mm') * 1000;
		const a = num(args, s, 'curtain_mm') * 1000;
		const v = (num(args, s, 'belt_m_min') * 1e6) / 60; // um/s
		const Lz = (nh + nc) * p;
		return { nh, nc, p, a, v, Lz, D: (Lz + 2 * a) / v };
	}
	defaultDuration(args: ToolArgs): number {
		return this.geo(args).D;
	}
	private zoneAt(x: number, args: ToolArgs): number {
		const g = this.geo(args);
		if (x < 0) return 0;
		const k = Math.floor(x / g.p) + 1;
		return k > g.nh + g.nc ? g.nh + g.nc + 1 : k;
	}
	private setAt(k: number, args: ToolArgs): number | null {
		const g = this.geo(args);
		if (k < 1 || k > g.nh) return null;
		return num(args, this.spec, `zone${String(k).padStart(2, '0')}_c`);
	}
	/** Board x along the tunnel (oven coords, um) at real time tr. */
	private xb(tr: number, args: ToolArgs): number {
		const g = this.geo(args);
		return -g.a + g.v * tr;
	}

	traces(args: ToolArgs): Trace[] {
		const g = this.geo(args);
		const set: [number, number][] = [];
		const board: [number, number][] = [];
		const tau = num(args, this.spec, 'board_lag_s');
		let T = 25;
		const dt = 0.5;
		for (let i = 0; i * dt <= g.D; i++) {
			const t = i * dt;
			const k = this.zoneAt(this.xb(t, args), args);
			const zs = this.setAt(k, args);
			const target = zs ?? (k > g.nh && k <= g.nh + g.nc ? 25 : T);
			T += ((target - T) / tau) * dt;
			if (i % 10 === 0) {
				set.push([t, zs ?? NaN]);
				board.push([t, +T.toFixed(1)]);
			}
		}
		return [
			{ key: 'zone_set', label: 'zone set point', q: 'T', unit: 'C', pts: set.filter((p) => Number.isFinite(p[1])), status: 'template', note: ZONE_NOTE },
			{ key: 'board_T', label: 'board T (lag model)', q: 'T', unit: 'C', pts: board, status: 'template', note: 'first-order lag of the zone set point (board_lag_s template); the step profile, when given, replaces it' }
		];
	}

	protected build(f: ToolFrame): void {
		// block / cell: the oven has no element inside a sub-mm window (audit V1 M5): nothing drawn, HUD only
		if (f.scale !== 'work') return;
		const s = this.spec;
		const g = this.geo({});
		const W = s.tunnel_w_mm.value * 1000;
		const zB = -W / 2;
		const yb = f.zmap(0);
		const up = s.upper_gap_mm.value * 1000, lo = s.lower_gap_mm.value * 1000;
		const cs = carrierSize(f);
		const N = g.nh + g.nc;
		for (let i = 0; i < N; i++) {
			const x0 = i * g.p, xm = x0 + g.p / 2;
			const cool = i >= g.nh;
			const tip = cool ? `cooling zone ${i - g.nh + 1} (A42)` : `heated zone ${i + 1} (A42)`;
			// lower nozzle plate + nozzle bars (cross-nozzle look, A46)
			this.add('oven', 'al', box(g.p * 0.92, 8000, W, xm, yb - lo - 4000, 0), tip + ': lower nozzle plate');
			for (let j = 0; j < 4; j++) this.add('oven', 'steel', box(g.p * 0.8, 3000, 12000, xm, yb - lo + 1500, zB + (W * (j + 0.5)) / 4), 'nozzle bar (template)');
			// upper plate: cutaway, behind the section plane (z <= 0)
			this.add('oven', 'al', boxMM(x0 + g.p * 0.04, x0 + g.p * 0.96, yb + up, yb + up + 8000, zB, 0), tip + ': upper nozzle plate (cutaway)');
			for (let j = 0; j < 2; j++) this.add('oven', 'steel', boxMM(x0 + g.p * 0.1, x0 + g.p * 0.9, yb + up - 3000, yb + up, zB + (W / 2) * (j + 0.3) / 2, zB + (W / 2) * (j + 0.3) / 2 + 12000), 'nozzle bar (template)');
			// zone divider (labyrinth wall) above and below
			this.add('oven', 'steel', boxMM(x0 - 3000, x0 + 3000, yb + up, yb + up + 160000, zB, 0), 'zone divider');
			this.add('oven', 'steel', boxMM(x0 - 3000, x0 + 3000, yb - lo - 120000, yb - lo, zB, W / 2), 'zone divider');
		}
		const L0 = -g.a, L1 = g.Lz + g.a;
		// shell: floor, back wall, roof (cutaway)
		this.add('oven', 'steel', boxMM(L0, L1, yb - lo - 128000, yb - lo - 120000, zB, W / 2), 'tunnel floor');
		this.add('oven', 'steel', boxMM(L0, L1, yb - lo - 128000, yb + up + 168000, zB - 8000, zB), 'tunnel back wall');
		this.add('oven', 'steel', boxMM(L0, L1, yb + up + 160000, yb + up + 168000, zB, 0), 'tunnel roof (cutaway)');
		// labyrinth N2 curtains (A46): hanging plates at inlet and outlet
		for (const xs of [L0, g.Lz]) for (let j = 0; j < 5; j++) {
			const x = xs + (g.a * (j + 0.5)) / 5;
			this.add('oven', 'steel', boxMM(x - 1500, x + 1500, yb + 12000, yb + up + 160000, zB, 0), 'labyrinth N2 curtain (A46)');
			this.add('oven', 'steel', boxMM(x - 1500, x + 1500, yb - lo - 120000, yb - 6000, zB, W / 2), 'labyrinth N2 curtain (A46)');
		}
		// conveyor rails (oven-fixed) at the board edges
		const rz = cs.d / 2 + 4000;
		for (const sz of [-1, 1]) this.add('oven', 'steel', boxMM(L0 - 400000, L1 + 400000, yb - 16000, yb - 6000, sz * rz - 5000, sz * rz + 5000), 'edge-chain conveyor rail (A43)');
		// edge chain moving with the board (board frame): links + support pins
		const cp = s.chain_pitch_mm.value * 1000;
		const span = Math.max(cs.w * 1.5, 600000);
		for (const sz of [-1, 1])
			for (let x = -span / 2; x <= span / 2; x += cp) {
				this.add('chain', 'steel', box(cp * 0.8, 6000, 6000, x, yb - 3000, sz * rz), 'edge chain link (pitch template)');
				if (Math.round(x / cp) % 2 === 0) this.add('chain', 'steel', cylZ(900, 7000, x, yb - 900, sz * (rz - 6000), 8), 'board support pin');
			}
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const g = this.geo(args);
		let x: number;
		if (ctx.phase === 'approach') x = -g.a - 400000 * (1 - smooth(t / 0.12));
		else if (ctx.phase === 'process') x = this.xb(ctx.tReal_s ?? ctx.u * g.D, args);
		else x = g.Lz + g.a + 400000 * smooth((t - 0.9) / 0.1);
		const oven = this.rig('oven');
		oven.position.x = -x;
		void f;
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const cs = carrierSize(f);
		const yb = f.zmap(0);
		return new THREE.Box3(new THREE.Vector3(-f.focus_um.x - cs.w / 2, yb - 20000, f.focus_um.y - cs.d / 2), new THREE.Vector3(-f.focus_um.x + cs.w / 2, yb + 40000, f.focus_um.y + cs.d / 2));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const g = this.geo(args);
		const tr = ctx.phase === 'process' ? (ctx.tReal_s ?? ctx.u * g.D) : null;
		const x = tr === null ? null : this.xb(tr, args);
		const k = x === null ? null : this.zoneAt(x, args);
		const zs = k === null ? null : this.setAt(k, args);
		let bT: number | null = ctx.profile.T ?? null;
		if (bT === null && tr !== null) {
			const tb = this.traces(args)[1].pts;
			const i = Math.min(tb.length - 1, Math.max(0, Math.round(tr / 5)));
			bT = tb[i][1];
		}
		return [
			{ key: 'zone', label: 'zone (0 inlet, 15-16 cooling, 17 outlet)', value: k, unit: '1', status: 'derived' },
			{ key: 'zone_set', label: 'zone set point', value: zs, unit: 'C', status: 'template', note: ZONE_NOTE },
			{ key: 'board_T', label: 'board T', value: bT, unit: 'C', status: ctx.profile.T !== undefined ? 'reported' : 'template' },
			{ key: 'pos', label: 'position in tunnel', value: x === null ? null : x / 1e6, unit: 'm', status: 'derived' },
			{ key: 'belt', label: 'belt speed', value: num(args, this.spec, 'belt_m_min'), unit: 'm/min', status: this.spec.belt_m_min.status },
			{ key: 'dwell', label: 'dwell (inlet to outlet)', value: g.D, unit: 's', status: 'derived' }
		];
	}
}

export const createReflowOven = () => new ReflowOven();
