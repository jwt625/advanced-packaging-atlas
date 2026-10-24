// Pick-and-place head (op place). Two heads:
//  - collet (default): die / bridge bonder head with a rubber collet pad (EMIB bridge into its cavity on adhesive,
//    A190-A192; die pick from a 12 in wafer frame, A5);
//  - nozzle: modular-mounter head (Panasonic NPM-WX, named for the interposer-to-substrate mount in
//    ectc51687.2025.00027-F1-s14) with three nozzles on an X gantry beam; the active nozzle carries the interposer.
// Contract u split for place: [0, .2) pick, [.2, .6) travel, [.6, .85) align, [.85, 1] place.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, blockWin, box, boxMM, carrierSize, cyl, live, num, opt, rep, seg, smooth, str, tpl, type Readout } from './common';

const NPM_URL = 'https://ap.connect.panasonic.com/sg/en/npm-wx';
const TRAVEL_WORK_UM = 10000; // view parameter: travel height of the held piece above the target surface

export const PP_SPEC: Record<string, PDim> = {
	accuracy_um: rep(5, 'um', 'A6', 'MD-P300 XY placement accuracy +/-5 um (3 sigma); not drawn (sub-pixel)'),
	cycle_s: rep(0.65, 's', 'A7', 'MD-P300 C4 cycle incl. dipping motion; real time shown, playback stretched'),
	force_max_n: rep(50, 'N', 'A2', 'MD-P300 VCM head load range 1-50 N'),
	die_max_mm: rep(25, 'mm', 'A5', 'MD-P300 die size up to 25 x 25 mm'),
	bridge_w_mm: rep(8, 'mm', 'A191', 'EMIB bridge 2 x 2 to 8 x 8 mm (largest drawn by default)'),
	bridge_h_um: rep(50, 'um', 'A192', 'thin bridge ~50 um (below 75 um in 2016)'),
	interposer_w_mm: rep(42, 'mm', 'A25', '42 x 46 mm interposer (nozzle head default)'),
	interposer_d_mm: rep(46, 'mm', 'A25'),
	interposer_h_um: tpl(100, 'um', 'interposer thickness not in the assembly research rows; the engine passes piece_h_um from the flow', undefined, ['A25']),
	mounter_comp_max_mm: tpl(150, 'mm', 'NPM-WX largest component 150 x 25 x 40 mm (vendor page, search-result quote; not in the research file)', NPM_URL),
	nozzles: tpl(3, '1', 'NPM-WX "3-nozzle head V2" (vendor spec sheet, search-result quote)', NPM_URL),
	nozzle_pitch_mm: tpl(40, 'mm', 'nozzle spacing on the head; not reported', NPM_URL),
	nozzle_pad_d_mm: tpl(16, 'mm', 'rubber pad of a large-component nozzle; not reported'),
	head_w_mm: tpl(120, 'mm', 'mounter head housing width; not reported', NPM_URL),
	collet_pad_ratio: tpl(0.9, '1', 'rubber collet pad slightly smaller than the picked die / bridge; not reported (A29 class gap)', undefined, ['A29', 'A30']),
	collet_pad_h_um: tpl(1000, 'um', 'collet rubber thickness; not reported'),
	pick_offset_mm: tpl(60, 'mm', 'pick position (wafer frame / tray) beside the target; layout not reported'),
	beam_len_mm: tpl(800, 'mm', 'X gantry beam length drawn; not reported')
};

export class PickPlace extends BaseActor {
	readonly id = 'pick_place';
	readonly name = 'Pick-and-place head';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = PP_SPEC;
	private mode: 'collet' | 'nozzle' = 'collet';
	private pw = 0;
	private pd = 0;

	protected geomKey(args: ToolArgs): string {
		return [str(args, 'head', 'collet'), opt(args, 'piece_w_um'), opt(args, 'piece_d_um')].join('|');
	}
	/** Mode and piece size are geometry (rebuilt when they change). */
	configure(args: ToolArgs): void {
		const s = this.spec;
		// default head: pieces larger than the die bonder's 25 mm die limit (A5) go on the mounter nozzle head
		const pwA = opt(args, 'piece_w_um'), pdA = opt(args, 'piece_d_um');
		const big = pwA !== null && pdA !== null && Math.max(pwA, pdA) > s.die_max_mm.value * 1000;
		this.mode = str(args, 'head', big ? 'nozzle' : 'collet') === 'nozzle' ? 'nozzle' : 'collet';
		this.pw = opt(args, 'piece_w_um') ?? (this.mode === 'nozzle' ? s.interposer_w_mm.value : s.bridge_w_mm.value) * 1000;
		this.pd = opt(args, 'piece_d_um') ?? (this.mode === 'nozzle' ? s.interposer_d_mm.value : s.bridge_w_mm.value) * 1000;
	}
	private pieceH(args: ToolArgs): number {
		return opt(args, 'piece_h_um') ?? (this.mode === 'nozzle' ? num(args, this.spec, 'interposer_h_um') : num(args, this.spec, 'bridge_h_um'));
	}

	protected build(f: ToolFrame): void {
		if (!this.pw) this.configure({});
		const s = this.spec;
		const pw = this.pw, pd = this.pd;
		if (f.scale === 'block') {
			const w = blockWin(f);
			const H = Math.max(w.h * 0.5, 30);
			const ph = this.mode === 'nozzle' ? 2000 : s.collet_pad_h_um.value;
			const ext = this.mode === 'nozzle' ? s.nozzle_pad_d_mm.value * 500 : (pw * s.collet_pad_ratio.value) / 2;
			const x0 = Math.max(-ext, w.x0), x1 = Math.min(ext, w.x1);
			this.add('tool', 'adhesive', boxMM(x0, x1, 0, Math.min(ph, H), w.zBack, w.zSec), this.mode === 'nozzle' ? 'nozzle rubber pad on the interposer back (cropped; template)' : 'rubber collet pad on the bridge / die back (cropped; template)');
			return;
		}
		if (this.mode === 'collet') {
			const r = s.collet_pad_ratio.value;
			const padH = s.collet_pad_h_um.value;
			this.add('tool', 'adhesive', box(pw * r, padH, pd * r, 0, padH / 2, 0), 'rubber collet pad (template)');
			this.add('tool', 'steel', box(pw * r + 2000, 4000, pd * r + 2000, 0, padH + 2000, 0), 'collet holder (template)');
			this.add('tool', 'steel', cyl(3000, 30000, 0, padH + 4000 + 15000, 0, 24), 'collet shank with vacuum bore');
			this.addOcc('tool', 'al', box(36000, 50000, 36000, 0, padH + 34000 + 25000, 0), 'bond / place head body (template)');
		} else {
			const n = Math.round(s.nozzles.value);
			const pitch = s.nozzle_pitch_mm.value * 1000;
			const padR = s.nozzle_pad_d_mm.value * 500;
			const hw = s.head_w_mm.value * 1000;
			// active nozzle (index 0) on its own rig; housing on the head rig
			this.add('nozzle', 'adhesive', cyl(padR, 2000, 0, 1000, 0, 48), 'large-component nozzle rubber pad (template)');
			this.add('nozzle', 'steel', cyl(padR * 0.6, 4000, 0, 4000, 0, 32, padR * 0.35), 'nozzle tip');
			this.add('nozzle', 'steel', cyl(3000, 60000, 0, 36000, 0, 24), 'nozzle shaft (Z stroke inside the head)');
			for (let i = 1; i < n; i++) {
				this.addOcc('head', 'steel', cyl(3000, 20000, i * pitch, -6000, 0, 24), 'idle nozzle (retracted)');
				this.addOcc('head', 'adhesive', cyl(4000, 1500, i * pitch, -16500, 0, 32), 'idle nozzle pad');
			}
			this.addOcc('head', 'al', box(hw, 90000, 50000, ((n - 1) * pitch) / 2, 45000, 0), 'mounter head housing ("3-nozzle head V2", NPM-WX; size template)');
			this.addOcc('head', 'steel', box(hw * 0.8, 70000, 12000, ((n - 1) * pitch) / 2, 50000, -31000), 'X carriage');
			const L = s.beam_len_mm.value * 1000;
			this.addOcc('beam', 'al', box(L, 90000, 60000, 0, 0, 0), 'X gantry beam (template)');
		}
	}

	private kin(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame) {
		const s = this.spec;
		const ph = this.pieceH(args);
		const contactZ = live(ctx, 'contact_z_um') ?? f.surface_um + ph;
		const yc = f.zmap(contactZ);
		const ax = opt(args, 'x_um'), ay = opt(args, 'y_um');
		const tx = ax !== null ? ax - f.focus_um.x : 0;
		const tz = ay !== null ? -(ay - f.focus_um.y) : 0;
		let px: number, travel: number;
		if (f.scale === 'work') {
			const cs = carrierSize(f);
			px = -(cs.w / 2 + f.focus_um.x) - s.pick_offset_mm.value * 1000 - this.pw / 2;
			travel = TRAVEL_WORK_UM;
		} else {
			const w = blockWin(f);
			px = w.x0 - 3 * w.span;
			travel = Math.max(w.h * 0.9, 50);
		}
		const alignH = travel * 0.15;
		let x = px, y = yc + travel, held = false;
		const u = ctx.u;
		if (ctx.phase === 'approach') {
			x = px;
			y = yc + travel;
		} else if (ctx.phase === 'process') {
			if (u < 0.2) {
				// pick: descend onto the source, vacuum, rise
				const d = smooth(seg(u, 0, 0.07)) - smooth(seg(u, 0.12, 0.2));
				y = yc + travel * (1 - d);
				held = u >= 0.09;
			} else if (u < 0.6) {
				const k = smooth(seg(u, 0.2, 0.6));
				x = px + (tx - px) * k;
				y = yc + travel - (travel - alignH) * smooth(seg(u, 0.45, 0.6));
				held = true;
			} else if (u < 0.85) {
				x = tx;
				y = yc + alignH;
				held = true;
			} else {
				x = tx;
				const dn = smooth(seg(u, 0.85, 0.94));
				const up = smooth(seg(u, 0.97, 1));
				y = yc + alignH * (1 - dn) + alignH * up;
				held = u < 0.955;
			}
		} else {
			const r = smooth(seg(t, 0.9, 1));
			x = tx + (f.scale === 'work' ? 1 : 0) * r * (this.pw + 40000);
			y = yc + alignH + (travel - alignH) * r;
		}
		const hz = live(ctx, 'hold_z_um');
		if (hz !== null && held) y = f.zmap(hz);
		return { x, y, z: tz, held, yc, travel };
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const k = this.kin(t, args, ctx, f);
		if (f.scale === 'block' || this.mode === 'collet') {
			this.rig('tool').position.set(k.x, k.y, k.z);
		} else {
			// nozzle mounter: housing at a fixed travel level, active nozzle strokes in Z
			const hy = k.yc + k.travel + 20000;
			this.rig('head').position.set(k.x, hy, k.z);
			this.rig('nozzle').position.set(k.x, k.y, k.z);
			this.rig('beam').position.set(0, hy + 90000 + 45000, k.z - 25000 - 50000);
		}
		this.setHold({ on: k.held, x: k.x, y: k.y, z: k.z });
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const k = this.kin(t, args, ctx, f);
		const ax = opt(args, 'x_um'), ay = opt(args, 'y_um');
		const tx = ax !== null ? ax - f.focus_um.x : 0, tz = ay !== null ? -(ay - f.focus_um.y) : 0;
		// target site and the piece at its current height (the head travels in from the side: frame the target)
		const w = this.pw, d = this.pd;
		return new THREE.Box3(new THREE.Vector3(tx - w, f.back_y ?? -1000, tz - d), new THREE.Vector3(tx + w, Math.max(k.y, k.yc) + 5000, tz + d));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const u = ctx.u;
		const stage = ctx.phase !== 'process' ? (ctx.phase === 'approach' ? 0 : 5) : u < 0.2 ? 1 : u < 0.6 ? 2 : u < 0.85 ? 3 : 4;
		const k = this.frame ? this.kin(t, args, ctx, this.frame) : null;
		return [
			{ key: 'stage', label: 'motion (1 pick 2 travel 3 align 4 place)', value: stage, unit: '1', status: 'derived' },
			{ key: 'vacuum', label: 'vacuum on piece', value: k ? (k.held ? 1 : 0) : null, unit: '1', status: 'template' },
			{ key: 'force', label: 'placement force', value: opt(args, 'force_n'), unit: 'N', status: opt(args, 'force_n') === null ? 'template' : 'reported', note: 'from the place op force_n when stated' },
			{ key: 'accuracy', label: 'placement accuracy (3 sigma)', value: this.spec.accuracy_um.value, unit: 'um', status: 'reported', note: 'A6 (MD-P300)' }
		];
	}
}

export const createPickPlace = (args?: ToolArgs) => {
	const a = new PickPlace();
	if (args) a.configure(args);
	return a;
};
