// TCB bond head (op bond_tcb): heated ceramic tool (collet) on a pulse heater, head body on a Z slide, heated vacuum
// chuck under the target. Sequence (A17-A19, A31): search descent -> contact -> force ramp -> head ramp -> melt at the
// joint -> solder chase (Z drop) -> hold -> exponential cool -> vacuum release -> retract.
// Set vs actual (A10): the head set point (440 C) and the joint temperature (max 250 C) are separate traces.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	BaseActor,
	blockWin,
	boxMM,
	box,
	carrierCenter,
	carrierSize,
	cyl,
	der,
	live,
	num,
	opt,
	phaseProgress,
	rep,
	smooth,
	tpl,
	type Readout,
	type Trace
} from './common';

const LIFT_WORK_UM = 8000; // view parameter: staging height above the site before the search descent

export const TCB_SPEC: Record<string, PDim> = {
	force_n: rep(1, 'N', 'A11', 'CoW TCB, Die A + Die B on a 12 in Si interposer wafer (FCB3); OCR "IN"'),
	force_range_max_n: rep(50, 'N', 'A2', 'MD-P300 VCM head 1-50 N (option 2-100 N); the 00027 bonder'),
	head_set_c: rep(440, 'C', 'A10', 'head set temperature'),
	joint_max_c: rep(250, 'C', 'A10', 'actual max temperature at the joint for the 440 C set point'),
	heat_s: rep(7, 's', 'A10', 'bonding time at the set temperature, read as contact-to-cool (ramp included)'),
	stage_c: rep(100, 'C', 'A9', 'stage (wafer chuck) temperature during bonding'),
	ramp_c_s: tpl(100, 'C/s', 'head ramp not reported for the FCB3 run; analog: Besi fluxless D2W TCB 100 C/s', undefined, ['A13']),
	head_idle_c: tpl(150, 'C', 'head temperature at contact not reported for FCB3; inside the 75 C (A15) to ~170 C (A23) contact range of other TCB heads', undefined, ['A15', 'A23']),
	cool_tau_s: tpl(0.8, 's', 'cooling is an exponential decay toward the initial temperature (A31); time constant not reported', undefined, ['A31']),
	force_ramp_s: tpl(0.2, 's', 'force step after contact at low search force (A18); ramp time not reported', undefined, ['A18']),
	liquidus_c: rep(221, 'C', 'A60', 'Sn-3.5Ag liquidus (NIST v4 Table 2.2.19)'),
	z_growth_um: rep(15, 'um', 'A20', 'head Z growth when heating 160 -> 280 C (K&S); needs compensation'),
	die_w_mm: rep(20, 'mm', 'A25', 'Die A 20 x 20 mm'),
	die_d_mm: rep(20, 'mm', 'A25'),
	die_h_um: rep(675, 'um', 'A25', 'die Si thickness 0.675 mm'),
	bump_h_um: der(24, 'um', 'Cu pillar + Ni + SnAg heights', ['A26'], '13 + 2 + 9'),
	chase_um: der(
		4.05,
		'um',
		'bump height + interposer pad finish (Ni + Au) - die-to-interposer gap',
		['A26', 'A27', 'A28'],
		'24 + 2 + 0.05 - 22',
		'low confidence: the 22 um gap is an OCR figure label (A28); the Al-Cu pad thickness is not reported'
	),
	tool_face_ratio: tpl(0.96, '1', 'flat heated tool face slightly smaller than or equal to the die (A30); ratio not reported (A29)', undefined, ['A30']),
	tool_h_mm: tpl(3, 'mm', 'ceramic tool (collet) plate thickness; no dimensioned public source (A29)', undefined, ['A29']),
	heater_h_mm: tpl(5, 'mm', 'pulse heater block (SiC pulse heater + vacuum tool named in ectc51846.2026.00204, A30); thickness not reported', undefined, ['A30']),
	heater_margin_mm: tpl(2, 'mm', 'heater overhang beyond the die edge per side; not reported (A29)', undefined, ['A29']),
	head_w_mm: tpl(40, 'mm', 'bond head body width; no dimensioned source (A29)', undefined, ['A29']),
	head_h_mm: tpl(70, 'mm', 'bond head body height drawn; not reported', undefined, ['A29']),
	vac_port_d_um: tpl(800, 'um', 'one central vacuum port in the tool face (vacuum pick, A17 / A30); layout not reported (A29)', undefined, ['A17', 'A29', 'A30']),
	chuck_margin_mm: tpl(10, 'mm', 'heated vacuum chuck extends past the wafer edge; not reported', undefined, ['A30']),
	chuck_h_mm: tpl(25, 'mm', 'chuck thickness; not reported', undefined, ['A30'])
};

export interface TcbProfile {
	D: number; // total s
	tMelt: number | null;
	set: (t: number) => number;
	joint: (t: number) => number;
	force: (t: number) => number;
	tauJ: number;
	pts: { set: [number, number][]; joint: [number, number][]; force: [number, number][] };
}

/** Default TCB profile from the spec (template shape anchored at A9 / A10 / A11; joint lag fitted to A10's max). */
export function tcbProfile(args: ToolArgs, spec = TCB_SPEC): TcbProfile {
	const T0 = num(args, spec, 'head_idle_c');
	const Ts = num(args, spec, 'head_set_c');
	const r = num(args, spec, 'ramp_c_s');
	const H = num(args, spec, 'heat_s');
	const tau = num(args, spec, 'cool_tau_s');
	const Tst = num(args, spec, 'stage_c');
	const Tj = num(args, spec, 'joint_max_c');
	const F = num(args, spec, 'force_n');
	const fr = num(args, spec, 'force_ramp_s');
	const liq = num(args, spec, 'liquidus_c');
	const D = H + 4 * tau;
	const tr = Math.max(0, (Ts - T0) / r);
	const set = (t: number) => (t <= 0 ? T0 : t < Math.min(tr, H) ? T0 + r * t : t <= H ? Ts : T0 + (Math.min(Ts, T0 + r * H) - T0) * Math.exp(-(t - H) / tau));
	const dt = 0.002;
	const n = Math.ceil(D / dt);
	const integ = (tauJ: number) => {
		const a = new Float64Array(n + 1);
		a[0] = Tst;
		for (let i = 0; i < n; i++) a[i + 1] = a[i] + ((set(i * dt) - a[i]) / tauJ) * dt;
		return a;
	};
	// bisection on the lag time constant so that max(T_joint) = joint_max_c
	let lo = 0.01, hi = 200;
	let arr = integ(1);
	for (let k = 0; k < 50; k++) {
		const mid = Math.sqrt(lo * hi);
		arr = integ(mid);
		let mx = -Infinity;
		for (const v of arr) mx = Math.max(mx, v);
		if (mx > Tj) lo = mid;
		else hi = mid;
	}
	const tauJ = Math.sqrt(lo * hi);
	arr = integ(tauJ);
	const joint = (t: number) => {
		const x = Math.min(Math.max(t / dt, 0), n);
		const i = Math.floor(x);
		const f = x - i;
		return i >= n ? arr[n] : arr[i] * (1 - f) + arr[i + 1] * f;
	};
	let tMelt: number | null = null;
	for (let i = 0; i <= n; i++)
		if (arr[i] >= liq) {
			tMelt = i * dt;
			break;
		}
	const force = (t: number) => (t < 0 || t > D ? 0 : F * smooth(t / fr));
	const pts = { set: [] as [number, number][], joint: [] as [number, number][], force: [] as [number, number][] };
	for (let i = 0; i <= 120; i++) {
		const t = (i / 120) * D;
		pts.set.push([+t.toFixed(3), +set(t).toFixed(1)]);
		pts.joint.push([+t.toFixed(3), +joint(t).toFixed(1)]);
		pts.force.push([+t.toFixed(3), +force(t).toFixed(3)]);
	}
	return { D, tMelt, set, joint, force, tauJ, pts };
}

export class TcbHead extends BaseActor {
	readonly id = 'tcb_head';
	readonly name = 'TCB bond head';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = TCB_SPEC;
	private args: ToolArgs = {};
	private prof: TcbProfile | null = null;
	private profKey = '';

	private profile(args: ToolArgs): TcbProfile {
		const k = JSON.stringify(args);
		if (!this.prof || k !== this.profKey) {
			this.prof = tcbProfile(args, this.spec);
			this.profKey = k;
		}
		return this.prof;
	}
	protected geomKey(args: ToolArgs): string {
		return `${opt(args, 'x_um')}|${opt(args, 'y_um')}`;
	}
	configure(args: ToolArgs): void {
		this.args = args;
	}
	defaultDuration(args: ToolArgs): number {
		return this.profile(args).D;
	}
	traces(args: ToolArgs): Trace[] {
		const p = this.profile(args);
		return [
			{ key: 'T_set', label: 'head set', q: 'T', unit: 'C', pts: p.pts.set, status: 'template', note: 'template shape (idle -> ramp -> hold -> exponential cool) through the reported 440 C, 7 s (A10)' },
			{ key: 'T_joint', label: 'joint (actual)', q: 'T', unit: 'C', pts: p.pts.joint, status: 'derived', note: `first-order lag of the set profile, tau ${p.tauJ.toFixed(2)} s fitted to the reported joint max 250 C (A10), start at stage 100 C (A9)` },
			{ key: 'F', label: 'bond force', q: 'F', unit: 'N', pts: p.pts.force, status: 'template', note: 'force 1 N (A11) held contact to release; ramp template' }
		];
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const dw = s.die_w_mm.value * 1000, dd = s.die_d_mm.value * 1000;
		const r = s.tool_face_ratio.value;
		const toolH = s.tool_h_mm.value * 1000;
		const heatH = s.heater_h_mm.value * 1000;
		const hm = s.heater_margin_mm.value * 1000;
		const hw = s.head_w_mm.value * 1000;
		const hh = s.head_h_mm.value * 1000;
		if (f.scale === 'work') {
			// head rig origin = tool face (die back face); everything above it
			this.add('head', 'ceramic', box(dw * r, toolH, dd * r, 0, toolH / 2, 0), 'ceramic bond tool (collet), vacuum holds the die back face (A30; size template A29); no ceramic key in the library yet: neutral matte grey');
			this.add('head', 'si', box(dw + 2 * hm, heatH, dd + 2 * hm, 0, toolH + heatH / 2, 0), 'pulse heater block (SiC pulse heater, A30; size template; drawn with the Si look as the closest library key)');
			const y0 = toolH + heatH;
			this.addOcc('head', 'al', box(hw, hh, hw, 0, y0 + hh / 2, 0), 'bond head body (VCM force head; size template A29)');
			this.addOcc('head', 'steel', cyl(1500, 12000, hw / 2 + 1500, y0 + 3000, 0, 16), 'vacuum / cooling-air fitting (template)');
			this.addOcc('head', 'steel', box(hw * 0.7, hh * 0.9, 8000, 0, y0 + hh * 0.5, -hw / 2 - 4000), 'Z slide carriage');
			// static Z rail behind the head
			this.addOcc('frame', 'steel', box(hw * 0.5, hh * 2.4, 10000, 0, LIFT_WORK_UM + y0 + hh * 1.0, -hw / 2 - 13000), 'Z axis rail (machine frame)');
			// heated vacuum chuck under the target piece (top at the piece bottom)
			const cs = carrierSize(f);
			const c = carrierCenter(f);
			const m = s.chuck_margin_mm.value * 1000;
			const ch = s.chuck_h_mm.value * 1000;
			const yb = f.zmap(0);
			if (cs.disk) {
				this.add('stage', 'al', cyl(cs.w / 2 + m, ch, c.x, yb - ch / 2, c.z, 128), 'heated vacuum chuck, stage 100 C (A9); size template');
				this.add('stage', 'steel', cyl(cs.w / 2 + m + 2000, 400, c.x, yb - 200, c.z, 128, cs.w / 2 + m + 2000, true), 'chuck rim');
			} else {
				this.add('stage', 'al', box(cs.w + 2 * m, ch, cs.d + 2 * m, c.x, yb - ch / 2, c.z), 'heated vacuum stage (A4: MD-P300 stage up to 200 C, 330 x 220 mm); size template');
			}
		} else {
			// block: tool plate cropped to the window, behind the section plane, with the vacuum port in section
			const w = blockWin(f);
			const H = Math.min(toolH, Math.max(w.h * 0.6, 40));
			// port at the held die center: args x_um / y_um (piece frame), else the focus
			const ax = opt(this.args, 'x_um'), ay = opt(this.args, 'y_um');
			const cx = ax !== null ? ax - f.focus_um.x : 0;
			const cz = ay !== null ? -(ay - f.focus_um.y) : 0;
			const rp = s.vac_port_d_um.value / 2;
			const x0 = w.x0, x1 = w.x1;
			const z0 = w.zBack, z1 = w.zSec;
			const lo = Math.max(x0, cx - rp), hi = Math.min(x1, cx + rp);
			const parts: [number, number, number, number][] = [];
			if (cx - rp > x0) parts.push([x0, Math.min(x1, cx - rp), z0, z1]);
			if (cx + rp < x1) parts.push([Math.max(x0, cx + rp), x1, z0, z1]);
			if (hi > lo) {
				if (cz - rp > z0) parts.push([lo, hi, z0, Math.min(z1, cz - rp)]);
				if (cz + rp < z1) parts.push([lo, hi, Math.max(z0, cz + rp), z1]);
			}
			for (const [a, b, c, d] of parts) this.add('head', 'ceramic', boxMM(a, b, 0, H, c, d), 'ceramic bond tool face on the die back (cropped; vacuum port in section, template A29)');
		}
	}

	private headY(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): { y: number; held: boolean; p: TcbProfile; tr: number } {
		const s = this.spec;
		const p = this.profile(args);
		const { app, ret } = phaseProgress(t, ctx);
		const tr = ctx.tReal_s ?? (ctx.phase === 'process' ? ctx.u * p.D : ctx.phase === 'retract' ? p.D : 0);
		const contactZ = live(ctx, 'contact_z_um') ?? f.surface_um + num(args, s, 'bump_h_um') + num(args, s, 'die_h_um');
		const yc = f.zmap(contactZ);
		const lift = f.scale === 'work' ? LIFT_WORK_UM : Math.max(blockWin(f).h * 0.9, 50);
		const chase = live(ctx, 'collapse_um') ?? (p.tMelt === null ? 0 : num(args, s, 'chase_um') * smooth((tr - p.tMelt) / 0.3));
		const hz = live(ctx, 'hold_z_um');
		let y: number;
		if (ctx.phase === 'approach') y = hz !== null ? f.zmap(hz) : yc + lift * (1 - smooth(app));
		else if (ctx.phase === 'process') y = hz !== null ? f.zmap(hz) : yc - chase;
		else y = yc - chase + lift * smooth(ret);
		return { y, held: ctx.phase !== 'retract', p, tr };
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const { y, held } = this.headY(t, args, ctx, f);
		const ax = opt(args, 'x_um'), ay = opt(args, 'y_um');
		// block: the cropped tool face is built in window coordinates (port placed in build), so the rig stays at 0
		const x = ax !== null && f.scale === 'work' ? ax - f.focus_um.x : 0;
		const z = ay !== null && f.scale === 'work' ? -(ay - f.focus_um.y) : 0;
		const head = this.rig('head');
		head.position.set(x, y, z);
		const fr = this.rigs.get('frame');
		if (fr) fr.position.set(x, 0, z);
		this.setHold({ on: held, x, y, z });
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const s = this.spec;
		const { y } = this.headY(t, args, ctx, f);
		const ax = opt(args, 'x_um'), ay = opt(args, 'y_um');
		const x = ax !== null ? ax - f.focus_um.x : 0, z = ay !== null ? -(ay - f.focus_um.y) : 0;
		const w = s.die_w_mm.value * 1000, d = s.die_d_mm.value * 1000;
		const top = y + (s.tool_h_mm.value + s.heater_h_mm.value) * 1000;
		return new THREE.Box3(new THREE.Vector3(x - w, f.back_y ?? -1000, z - d), new THREE.Vector3(x + w, top, z + d));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const f = this.frame;
		const p = this.profile(args);
		const tr = ctx.tReal_s ?? (ctx.phase === 'process' ? ctx.u * p.D : ctx.phase === 'retract' ? p.D : 0);
		const on = ctx.phase === 'process';
		const Tset = ctx.profile.T_set ?? (on ? p.set(tr) : null);
		const Tj = ctx.profile.T ?? (on ? p.joint(tr) : null);
		const F = ctx.profile.F ?? (on ? p.force(tr) : 0);
		const s = this.spec;
		const zg = Tset === null ? null : (s.z_growth_um.value * (Tset - 160)) / (280 - 160);
		const hy = f ? this.headY(t, args, ctx, f) : null;
		return [
			{ key: 'T_set', label: 'head set T', value: Tset, unit: 'C', status: ctx.profile.T_set !== undefined ? 'reported' : 'template', note: 'set point at the heater (A10: 440 C)' },
			{ key: 'T_joint', label: 'joint T (actual)', value: Tj, unit: 'C', status: ctx.profile.T !== undefined ? 'reported' : 'derived', note: 'joint lags the set point (A10: max 250 C at 440 C set)' },
			{ key: 'T_stage', label: 'stage T', value: num(args, s, 'stage_c'), unit: 'C', status: s.stage_c.status },
			{ key: 'F', label: 'bond force', value: F, unit: 'N', status: s.force_n.status },
			{ key: 'melt', label: 'joint above liquidus', value: Tj === null ? null : Tj >= num(args, s, 'liquidus_c') ? 1 : 0, unit: '1', status: 'derived' },
			{ key: 'z_growth', label: 'head Z growth (compensated)', value: zg, unit: 'um', status: 'derived', note: 'linear in T through A20 (15 um over 160 -> 280 C); extrapolated' },
			{ key: 'head_y', label: 'tool face height', value: hy ? hy.y : null, unit: 'um', status: 'derived' },
			{ key: 'vacuum', label: 'vacuum on die', value: hy && hy.held ? 1 : 0, unit: '1', status: 'reported', note: 'vacuum release before pull away (A17)' }
		];
	}
}

export const createTcbHead = (args?: ToolArgs) => {
	const a = new TcbHead();
	if (args) a.configure(args);
	return a;
};
