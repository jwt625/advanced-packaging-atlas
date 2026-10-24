// Vacuum laminator (op coat with method vacuum_laminate / dry_film; build-up film): heated lower platen, vacuum
// chamber lid with a flexible diaphragm urged down by air pressure (diaphragm press class, US11312123B2), ABF film
// on its PET support (A160, A161) laid on the panel. Two pressure stages 0.7 then 0.55 MPa, 30 s each at 100 C
// (A163). The ABF body itself is the engine's; the tool draws the PET support film, which stays until after cure
// (A165). The flat-press planarization stage that follows in some lines (US11325365B1) is not drawn.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, blockWin, boxMM, carrierCenter, carrierSize, live, num, opt, rep, seg, smooth, tpl, type Readout, type Trace } from './common';

const DIA = 'https://patents.google.com/patent/US11312123';

export const LAM_SPEC: Record<string, PDim> = {
	temp_c: rep(100, 'C', 'A163', 'ABF vacuum lamination over die / glass'),
	p1_mpa: rep(0.7, 'MPa', 'A163', 'first stage'),
	t1_s: rep(30, 's', 'A163'),
	p2_mpa: rep(0.55, 'MPa', 'A163', 'second stage'),
	t2_s: rep(30, 's', 'A163'),
	abf_um: rep(15, 'um', 'A162', 'GX92 15 um (Meiki vacuum laminator); 5-30 um across rows'),
	pet_um: rep(38, 'um', 'A161', '38 um PET support on 10 um ABF'),
	diaphragm_mm: tpl(3, 'mm', 'flexible diaphragm urged by fluid pressure (patent class); thickness not reported', DIA),
	chamber_margin_mm: tpl(40, 'mm', 'chamber opening beyond the panel per side; not reported'),
	lid_gap_mm: tpl(8, 'mm', 'diaphragm rest plane above the panel with the chamber closed; not reported'),
	open_mm: tpl(80, 'mm', 'chamber opening stroke drawn; not reported'),
	platen_h_mm: tpl(40, 'mm', 'heated lower platen thickness; not reported')
};

const NG = 72;

export class Laminator extends BaseActor {
	readonly id = 'laminator';
	readonly name = 'Vacuum laminator (diaphragm)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = LAM_SPEC;
	private dia: THREE.Mesh | null = null;
	private base: Float32Array | null = null;
	private half = { w: 0, d: 0, pw: 0, pd: 0, cx: 0, cz: 0 };

	defaultDuration(args: ToolArgs): number {
		return num(args, this.spec, 't1_s') + num(args, this.spec, 't2_s');
	}
	traces(args: ToolArgs): Trace[] {
		const t1 = num(args, this.spec, 't1_s'), t2 = num(args, this.spec, 't2_s');
		const p1 = num(args, this.spec, 'p1_mpa'), p2 = num(args, this.spec, 'p2_mpa');
		return [{ key: 'P', label: 'diaphragm pressure', q: 'P', unit: 'MPa', pts: [[0, p1], [t1, p1], [t1, p2], [t1 + t2, p2]], status: 'reported', note: 'A163 two stages' }];
	}
	private topY(f: ToolFrame, ctx?: ToolCtx, args: ToolArgs = {}): number {
		const top = (ctx && live(ctx, 'top_z_um')) ?? f.surface_um + (opt(args, 'film_um') ?? this.spec.abf_um.value);
		return f.zmap(top);
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const pet = s.pet_um.value;
		const dh = s.diaphragm_mm.value * 1000;
		if (f.scale === 'block') {
			const w = blockWin(f);
			const x0 = w.x0, x1 = w.x1, z0 = w.zBack;
			this.add('pet', 'pet', boxMM(x0, x1, 0, pet, z0, w.zSec), 'PET support film 38 um (A161)');
			this.add('dia', 'adhesive', boxMM(x0, x1, 0, Math.min(dh, Math.max(w.h * 0.5, 40)), z0, w.zSec), 'diaphragm pressing the film (cropped; elastomer drawn with the grey filled-polymer look)');
			return;
		}
		const cs = carrierSize(f);
		const c = carrierCenter(f);
		const m = s.chamber_margin_mm.value * 1000;
		const W = cs.w + 2 * m, D = cs.d + 2 * m;
		this.half = { w: W / 2, d: D / 2, pw: cs.w / 2, pd: cs.d / 2, cx: c.x, cz: c.z };
		const yb = f.zmap(0);
		const ph = s.platen_h_mm.value * 1000;
		this.add('base', 'steel', boxMM(c.x - W / 2 - 30000, c.x + W / 2 + 30000, yb - ph, yb, c.z - D / 2 - 30000, c.z + D / 2 + 30000), 'heated lower platen, 100 C (A163)');
		// PET support film over the panel (moves with the film rig)
		this.add('pet', 'pet', boxMM(c.x - cs.w / 2 - 3000, c.x + cs.w / 2 + 3000, 0, pet, c.z - cs.d / 2 - 3000, c.z + cs.d / 2 + 3000), 'PET support film 38 um (A161); ABF (A160) under it is the coat body');
		// lid: frame around the opening (rig origin = diaphragm rest plane)
		const fw = 30000, lh = 50000;
		// cutaway (audit V2 n5): lid frame and diaphragm behind the section plane only (tool z <= 0)
		for (const [x0, x1, z0, z1] of [[-W / 2 - fw, W / 2 + fw, -D / 2 - fw, -D / 2], [-W / 2 - fw, -W / 2, -D / 2, -c.z], [W / 2, W / 2 + fw, -D / 2, -c.z]])
			this.addOcc('lid', 'al', boxMM(c.x + x0, c.x + x1, 0, lh, c.z + z0, c.z + z1), 'vacuum chamber lid frame (template)');
		// back half of the lid top only (cutaway, so the diaphragm stays visible)
		this.addOcc('lid', 'al', boxMM(c.x - W / 2 - fw, c.x + W / 2 + fw, lh, lh + 10000, c.z - D / 2 - fw, c.z), 'pressure chamber cover (cutaway)');
		// diaphragm: grid deformed every update
		const Dh = D / 2 - c.z; // from the back edge to the section plane (tool z = 0)
		const g = new THREE.PlaneGeometry(W, Dh, NG, Math.max(8, Math.round(NG / 2)));
		g.rotateX(-Math.PI / 2);
		g.translate(c.x, 0, c.z - D / 2 + Dh / 2);
		this.base = (g.attributes.position.array as Float32Array).slice();
		this.dia = this.meshOcc('lid', 'adhesive', g, 'diaphragm (flexible element urged by air pressure, patent class; elastomer drawn with the grey filled-polymer look)');
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const yT = this.topY(f, ctx, args);
		const work = f.scale === 'work';
		const open = work ? s.open_mm.value * 1000 : Math.max(blockWin(f).h, 100);
		const gapC = work ? s.lid_gap_mm.value * 1000 : Math.max(blockWin(f).h * 0.4, 40);
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		// film settles in the approach phase; lid closes [0, .1); vacuum [.1, .2); pressure [.2, .95); vent [.95, 1]
		const filmDrop = ctx.phase === 'approach' ? (1 - smooth(t / 0.12)) * open * 0.5 : 0;
		this.rig('pet').position.y = yT + filmDrop;
		const close = ctx.phase === 'process' ? smooth(seg(u, 0, 0.1)) : ctx.phase === 'retract' ? 1 - smooth(seg(t, 0.9, 1)) : 0;
		const lidY = yT + s.pet_um.value + gapC + open * (1 - close);
		const press = ctx.phase === 'process' ? smooth(seg(u, 0.2, 0.3)) * (1 - smooth(seg(u, 0.95, 1))) : 0;
		if (!work) {
			this.rig('dia').position.y = yT + s.pet_um.value + (gapC + open * (1 - close)) * (1 - press);
			return;
		}
		this.rig('lid').position.y = lidY;
		// the diaphragm turns translucent while it conforms, so the panel and the laminated film stay readable
		this.setPartOpacity('adhesive', 0.55 - 0.4 * press);
		const dm = this.dia, b = this.base;
		if (!dm || !b) return;
		const pos = dm.geometry.attributes.position as THREE.BufferAttribute;
		const a = pos.array as Float32Array;
		const H = this.half;
		const depth = gapC; // diaphragm travel from the rest plane to the film top
		for (let i = 0; i < a.length; i += 3) {
			const x = b[i] - H.cx, z = b[i + 2] - H.cz;
			// 1 over the panel, smooth fall-off to the clamped chamber edge
			const fx = Math.abs(x) <= H.pw ? 1 : 1 - smooth((Math.abs(x) - H.pw) / (H.w - H.pw));
			const fz = Math.abs(z) <= H.pd ? 1 : 1 - smooth((Math.abs(z) - H.pd) / (H.d - H.pd));
			a[i + 1] = -depth * press * fx * fz;
		}
		pos.needsUpdate = true;
		dm.geometry.computeVertexNormals();
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const cs = carrierSize(f), c = carrierCenter(f);
		const yT = this.topY(f, ctx, args);
		return new THREE.Box3(new THREE.Vector3(c.x - cs.w / 2, f.back_y ?? yT - 2000, c.z - cs.d / 2), new THREE.Vector3(c.x + cs.w / 2, yT + 12000, c.z + cs.d / 2));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const u = ctx.phase === 'process' ? ctx.u : null;
		const t1 = num(args, s, 't1_s');
		const tr = ctx.tReal_s ?? (u === null ? null : u * this.defaultDuration(args));
		const P = u === null || u < 0.2 || u > 0.95 ? 0 : tr !== null && tr > t1 ? num(args, s, 'p2_mpa') : num(args, s, 'p1_mpa');
		return [
			{ key: 'P', label: 'diaphragm pressure', value: ctx.profile.P ?? P, unit: 'MPa', status: 'reported', note: 'A163 two stages' },
			{ key: 'T', label: 'platen T', value: ctx.profile.T ?? num(args, s, 'temp_c'), unit: 'C', status: 'reported' },
			{ key: 'pet', label: 'PET support', value: s.pet_um.value, unit: 'um', status: 'reported' }
		];
	}
}

export const createLaminator = () => new Laminator();
