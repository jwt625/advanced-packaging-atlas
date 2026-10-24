// Ball mounter (op ball_attach): pin-transfer flux head (Shibuya SBM, A145) and a ball-mount head whose mask holes
// (<= 1.5 x ball diameter, A146) hold one ball each by vacuum, then release them onto the fluxed pads (A140-A141).
// Contract u split: flux [0, .25), drop [.25, .5), reflow [.5, 1] (reflow is drawn by the bodies; the heads are away).
// The landed balls are drawn by the tool until u = 0.5; from then on the solder bodies (engine) carry the shape.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, blockWin, boxMM, hash, num, perforated, rep, seg, setInst, siteGrid, smooth, tpl, type Grid, type Readout } from './common';

export const BALL_SPEC: Record<string, PDim> = {
	ball_d_um: rep(500, 'um', 'A140', '0.5 mm SAC or Sn-58Bi balls on the 120 mm substrate'),
	pitch_um: rep(1000, 'um', 'A141', '1 mm ball pitch of the 100 mm TV (00155); the 00027 pitch is not reported'),
	height_after_um: rep(478, 'um', 'A141', 'average ball height after attach (600 um balls); shape from the reflow model'),
	ball_range_max_um: rep(1000, 'um', 'A144', 'Shibuya SBM 350 / 360: 200-1000 um balls'),
	hole_ratio: tpl(1.2, '1', 'mask hole / ball diameter; patent limit <= 1.5 (A146), value not reported', undefined, ['A146']),
	mask_h_ratio: tpl(0.6, '1', 'mask thickness / ball diameter; not reported'),
	drop_gap_ratio: tpl(0.6, '1', 'mask-to-pad gap at release / ball diameter; not reported'),
	field_inset_mm: tpl(2, 'mm', 'ball field inset from the substrate edge when no site region is passed'),
	pin_d_ratio: tpl(0.5, '1', 'flux transfer pin tip / ball diameter; pin transfer per A145, size not reported', undefined, ['A145']),
	pin_len_mm: tpl(3, 'mm', 'flux transfer pin length; not reported', undefined, ['A145']),
	head_margin_mm: tpl(10, 'mm', 'head plate beyond the ball field per side; not reported'),
	head_h_mm: tpl(40, 'mm', 'head body height drawn; not reported')
};

const MAX_BALLS = 16000;
const PIN_LOD = 3000; // above this many sites the work-scale pin array is drawn as a pin bed (sub-pixel pins)

export class BallPlacer extends BaseActor {
	readonly id = 'ball_placer';
	readonly name = 'Ball mounter (flux pins + ball mask)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = BALL_SPEC;
	private args: ToolArgs = {};
	private grid: Grid | null = null;
	private balls: THREE.InstancedMesh | null = null;
	private pins: THREE.InstancedMesh | null = null;
	private ballSy = 1;

	protected geomKey(args: ToolArgs): string {
		return ['site_x_um', 'site_y_um', 'site_w_um', 'site_d_um', 'site_pitch_um', 'ball_d_um'].map((k) => JSON.stringify(args[k] ?? null)).join('|');
	}
	configure(args: ToolArgs): void {
		this.args = args;
	}
	private bd(): number {
		return num(this.args, this.spec, 'ball_d_um');
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const bd = this.bd();
		const pitch = num(this.args, s, 'pitch_um');
		const inset = s.field_inset_mm.value * 1000;
		const win = f.scale === 'block' ? blockWin(f) : null;
		const clip = win ? { x0: win.x0, x1: win.x1, z0: win.zBack, z1: win.zSec } : undefined;
		const g0 = siteGrid(this.args, f, pitch, inset, clip, MAX_BALLS);
		const bdh = this.bd() / 2;
		// block: sites fully inside the window; work: cutaway, sites behind the section plane only (audit V1 C1)
		const g = clip ? { ...g0, pts: g0.pts.filter(([x, z]) => x - bdh >= clip.x0 && x + bdh <= clip.x1 && z - bdh >= clip.z0 && z <= clip.z1) } : { ...g0, pts: g0.pts.filter(([, z]) => z <= 0) };
		// Illustrative map, same rule as the engine for free balls (CONTRACT 20.2, viewer bumpScales): s = mapped height /
		// true height of the ball interval outside the piece; one uniform factor f = min(s, max(0.4 pitch / r, 1)) on all
		// three axes from the pad plane, so a landing ball matches the engine's solder body with no jump.
		const za = f.surface_um + bd, zb = f.surface_um - bd;
		const ya = f.zmap(za), yb = f.zmap(zb);
		const sz = Math.max(0.05, Math.max(ya, yb) / bd);
		this.ballSy = f.illustrative ? Math.min(sz, Math.max((0.4 * g0.pitch) / (bd / 2), 1)) : 1;
		this.grid = g;
		const mh = s.mask_h_ratio.value * bd;
		const hr = (s.hole_ratio.value * bd) / 2;
		const pinL = s.pin_len_mm.value * 1000;
		const pr = (s.pin_d_ratio.value * bd) / 2;
		const hm = s.head_margin_mm.value * 1000;
		const HH = s.head_h_mm.value * 1000;
		if (f.scale === 'work') {
			const x0 = g.cx - g.w / 2 - hm, x1 = g.cx + g.w / 2 + hm, z0 = g.cz - g.d / 2 - hm, z1 = Math.min(g.cz + g.d / 2 + hm, 0);
			// ball head: mask plate (rig origin = mask bottom face) + vacuum head body
			this.add('mask', 'steel', boxMM(x0, x1, 0, mh, z0, z1), 'ball mask: one hole per pad, hole <= 1.5 x ball (A146; ratio template); cut away at the section plane');
			this.addOcc('mask', 'al', boxMM(x0 + hm * 0.3, x1 - hm * 0.3, mh, mh + HH, z0 + hm * 0.3, z1), 'ball-mount head with vacuum plenum (template), cut away');
			// flux pin head (rig origin = pin tips)
			this.addOcc('pins', 'al', boxMM(x0, x1, pinL, pinL + HH * 0.6, z0, z1), 'pin-transfer flux head (A145), cut away');
			if (g.pts.length > PIN_LOD) this.add('pins', 'steel', boxMM(g.cx - g.w / 2, g.cx + g.w / 2, 0, pinL, g.cz - g.d / 2, Math.min(g.cz + g.d / 2, 0)), `pin array, ${g.pts.length} pins at ${pitch} um pitch (drawn as a pin bed at this scale)`);
			else this.pins = this.inst('pins', 'steel', new THREE.CylinderGeometry(pr, pr, pinL, 8, 1), g.pts.length, 'flux transfer pin (template size)');
		} else {
			const w = win!;
			const x0 = w.x0, x1 = w.x1, z0 = w.zBack, z1 = w.zSec;
			this.add('mask', 'steel', perforated(x0, x1, z0, z1 + hr * 4, 0, mh, g.pts, Math.min(hr * this.ballSy, 0.49 * g.pitch), 32), 'ball mask (cropped), holes 1.2 x ball (template, limit A146)');
			this.add('mask', 'al', boxMM(x0, x1, mh, mh + Math.max(w.h * 0.4, bd), z0, z1), 'vacuum head body (cropped)');
			this.add('pins', 'al', boxMM(x0, x1, pinL, pinL + Math.max(w.h * 0.4, bd), z0, z1), 'pin-transfer flux head (cropped)');
			this.pins = this.inst('pins', 'steel', new THREE.CylinderGeometry(pr, pr, pinL, 24, 1), g.pts.length, 'flux transfer pin (template size)');
		}
		if (this.pins) {
			for (let i = 0; i < g.pts.length; i++) setInst(this.pins, i, g.pts[i][0], pinL / 2, g.pts[i][1], 1);
			this.pins.count = g.pts.length;
			this.pins.instanceMatrix.needsUpdate = true;
		}
		// LOD by instance count (triangle budget 40k): ico 80 tris up to 400 balls, octahedron 8 up to 4000, tetrahedron 4
		// above (balls are a few px at the work scale)
		const n = g.pts.length;
		const ballG = f.scale !== 'work' ? new THREE.IcosahedronGeometry(1, n <= 8 ? 4 : 3) : n <= 400 ? new THREE.IcosahedronGeometry(1, 1) : n <= 4000 ? new THREE.OctahedronGeometry(1, 0) : new THREE.TetrahedronGeometry(1, 0);
		this.balls = this.inst('balls', 'solder', ballG, g.pts.length, 'solder ball (A140); held in the mask, then dropped', { finish: 0, melt: 0 });
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const g = this.grid!;
		const bd = this.bd();
		const yS = f.zmap(f.surface_um);
		const work = f.scale === 'work';
		const lift = work ? 15000 : Math.max(blockWin(f).h * 1.0, 3 * bd);
		const park = work ? g.w + 120000 : Math.max(blockWin(f).span * 4, 2000);
		const gap = s.drop_gap_ratio.value * bd;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const inP = ctx.phase === 'process';
		// pins: slide in, dip to the pads (contact at u = .12), lift, slide out
		const pinIn = inP ? smooth(seg(u, 0, 0.05)) * (1 - smooth(seg(u, 0.2, 0.25))) : 0;
		const pinDn = inP ? smooth(seg(u, 0.05, 0.11)) * (1 - smooth(seg(u, 0.14, 0.2))) : 0;
		this.rig('pins').position.set(-park * (1 - pinIn), yS + lift * (1 - pinDn) + 2, 0);
		// mask: slide in, lower to the drop gap, release (u = .36), lift, slide out
		const mIn = inP ? smooth(seg(u, 0.25, 0.3)) * (1 - smooth(seg(u, 0.45, 0.5))) : 0;
		const mDn = inP ? smooth(seg(u, 0.3, 0.35)) * (1 - smooth(seg(u, 0.4, 0.45))) : 0;
		const hb = bd * this.ballSy; // mapped ball height (illustrative z map)
		const my = yS + hb + gap * this.ballSy + (lift - gap * this.ballSy) * (1 - mDn);
		const mx = park * (1 - mIn);
		this.rig('mask').position.set(mx, my, 0);
		// balls: in the mask (center 0.3 d below the mask bottom), fall after release, rest on the pads
		const im = this.balls!;
		let n = 0;
		const r = bd / 2;
		const show = inP && u < 0.5;
		if (show && u >= 0.25) {
			for (let i = 0; i < g.pts.length; i++) {
				const [x, z] = g.pts[i];
				const st = 0.012 * hash(i, 3);
				const fp = seg(u, 0.36 + st, 0.4 + st);
				const yHeld = my - 0.3 * hb + hb / 2; // held ball protrudes 0.3 d below the mask bottom
				const ry = r * this.ballSy; // uniform: true sphere at the engine's per-site factor
				const yLand = yS + ry;
				if (fp >= 1) continue; // landed: the solder body (engine) carries the ball from here
				const y = fp <= 0 ? yHeld : yHeld + (yLand - yHeld) * fp * fp;
				const xx = fp <= 0 ? x + mx : x;
				setInst(im, n++, xx, y, z, ry, ry, ry);
			}
		}
		im.count = n;
		im.instanceMatrix.needsUpdate = true;
		this.setMat('solder', { finish: 0, melt: 0 });
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame, g = this.grid;
		if (!f || !g || f.scale !== 'work') return null;
		const yS = f.zmap(f.surface_um);
		return new THREE.Box3(new THREE.Vector3(g.cx - g.w / 2, f.back_y ?? yS - 2000, g.cz - g.d / 2), new THREE.Vector3(g.cx + g.w / 2, yS + 15000, g.cz + g.d / 2));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const stage = ctx.phase !== 'process' ? (ctx.phase === 'approach' ? 0 : 4) : u < 0.25 ? 1 : u < 0.5 ? 2 : 3;
		return [
			{ key: 'stage', label: 'stage (1 flux 2 ball drop 3 reflow)', value: stage, unit: '1', status: 'derived' },
			{ key: 'balls', label: 'balls on this head', value: this.grid ? this.grid.pts.length : null, unit: '1', status: 'derived', note: 'site region / pitch' },
			{ key: 'ball_d', label: 'ball diameter', value: this.bd(), unit: 'um', status: this.spec.ball_d_um.status },
			{ key: 'pitch', label: 'pitch', value: this.grid?.pitch ?? null, unit: 'um', status: this.spec.pitch_um.status }
		];
	}
}

export const createBallPlacer = (args?: ToolArgs) => {
	const a = new BallPlacer();
	if (args) a.configure(args);
	return a;
};

