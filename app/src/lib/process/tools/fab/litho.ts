// Lithography (op pattern): i-line stepper (reticle on its stage, projection lens column, exposure light onto one field,
// step-and-repeat across the field grid, then a developer puddle) or a mask aligner (method aligner: full-wafer mask
// and flood exposure). Spin coater (op coat, method spin): vacuum chuck, catch cup, dispense arm, spread / final
// spin, spin-off droplets, edge-bead removal. RESEARCH_TOOLS_FAB.md section 5 (F75-F91), section 13 (F170-F174).

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	FabBase,
	backY,
	box,
	boxMM,
	carrierCenter,
	carrierSize,
	blockWin,
	clamp01,
	cylY,
	der,
	engage,
	fract,
	glowMat,
	hash,
	hw,
	lathe,
	live,
	num,
	ptsDone,
	rep,
	ringY,
	rod,
	setInst,
	setPt,
	smooth,
	spin,
	stat,
	str,
	tpl,
	setGlow,
	type Readout
} from './common';

// ---------------------------------------------------------------- stepper / aligner

const NA = 0.22;
export const LITHO_SPEC: Record<string, PDim> = {
	field_w_mm: rep(52, 'mm', 'F86', 'FPA-5520iV base: 52 x 34 mm field at 2:1 (med); max i-line field 52 x 68 mm (F84, F85)'),
	field_d_mm: rep(34, 'mm', 'F86'),
	reduction: rep(2, '1', 'F86', '2:1 reduction (1:1 projection in F87)'),
	na: rep(NA, '1', 'F83', 'Ultratech AP200/300, NA 0.22 max; 0.12-0.24 adjustable (F84)'),
	wavelength_nm: rep(365, 'nm', 'F83', 'Hg i-line filter'),
	half_angle_deg: der(+((Math.asin(NA) * 180) / Math.PI).toFixed(2), 'deg', 'asin(NA) image-side cone half angle', ['F83'], 'asin(0.22)'),
	reticle_mm: tpl(152.4, 'mm', 'reticle size not found (F91); 6 x 6 x 0.25 in plate (SEMI 6025 format) assumed', 'SEMI P1 photomask substrate format 6025', ['F91']),
	reticle_h_mm: tpl(6.35, 'mm', '0.25 in plate thickness of the 6025 format (assumed, F91 gap)', 'SEMI P1 6025', ['F91']),
	pattern_w_mm: der(104, 'mm', 'field_w x reduction', ['F86'], '52 x 2'),
	pattern_d_mm: der(68, 'mm', 'field_d x reduction', ['F86'], '34 x 2'),
	lens_d_mm: tpl(260, 'mm', 'projection lens barrel diameter not found (F91)', undefined, ['F91']),
	lens_h_mm: tpl(420, 'mm', 'projection lens length not found (F91)', undefined, ['F91']),
	wd_mm: tpl(40, 'mm', 'lens working distance not found (F91)', undefined, ['F91']),
	dose_mj_cm2: rep(120, 'mJ/cm2', 'F88', 'panel stepper, 6 um resist; DB range 85-480 mJ/cm2 (F87-F90)'),
	develop_s: rep(60, 's', 'F89', 'TMAH 2.38 % puddle'),
	puddle_mm: tpl(1.5, 'mm', 'developer puddle height not found'),
	mask_gap_um: tpl(50, 'um', 'aligner proximity gap not found (contact exposure 85 mJ/cm2, F90)', undefined, ['F90'])
};

export class Litho extends FabBase {
	readonly id = 'litho';
	readonly name = 'i-line stepper';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = LITHO_SPEC;
	protected override blockParts(): string[] {
		return ['column|glow', 'stage|own'];
	}
	private fields: [number, number][] = [];
	private marks: THREE.InstancedMesh | null = null;
	private light: THREE.Mesh | null = null;
	private lightM: THREE.ShaderMaterial | null = null;
	private puddle: THREE.Mesh | null = null;
	private fw = 52_000;
	private fd = 34_000;

	private aligner(args: ToolArgs): boolean {
		return str(args, 'method', 'stepper') === 'aligner';
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const fw = mm('field_w_mm'), fd = mm('field_d_mm');
		this.fw = fw;
		this.fd = fd;
		const yb = backY(f, args, 775);
		const ill = f.scale === 'work' && f.illustrative;
		// wafer stage (static in the wafer frame)
		const st = this.rig('stage');
		st.position.set(C.x, 0, C.z);
		this.addOwn('stage', 'chuck', hw('#3b3f45', 0.55, 0.4), cylY(R + 10_000, yb - 30_000, yb, 0, 0, 128), 'wafer chuck on the X-Y stage (template)');
		this.addOwn('stage', 'chuck', hw('#3b3f45', 0.55, 0.4), box(2 * R + 160_000, 40_000, 2 * R + 160_000, 0, yb - 50_000, 0), 'X-Y stage (template)');
		const pud = hw('#cfe4f2', 0.05, 0, { transparent: true, opacity: 0.35, depthWrite: false });
		this.puddle = this.ownMesh('stage', pud, cylY(1, 0, 1, 0, 0, 96), 'developer puddle, TMAH 2.38 % 60 s (F89); height template');
		this.puddle.visible = false;
		if (this.aligner(args)) {
			// full-wafer mask above the wafer, flood light
			const g = Math.max(mm('mask_gap_um') / 1000, ill ? 1500 : 0);
			const mk = this.rig('column');
			mk.position.set(C.x, 0, C.z);
			this.add('column', 'glass', box(2 * R + 50_000, 2300, 2 * R + 50_000, 0, g + 1150, 0), 'mask plate above the wafer (proximity gap template)');
			this.addOwn('column', 'chrome', hw('#2b2c2f', 0.3, 0.8, { transparent: true, opacity: 0.6 }), box(2 * R - 10_000, 300, 2 * R - 10_000, 0, g + 150, 0), 'chrome pattern area (illustrative)');
			this.lightM = glowMat('#8e7bff', 0.35, 0, 400_000);
			this.light = this.glow('column', box(2 * R, 400_000, 2 * R, 0, g + 2300 + 200_000, 0), this.lightM, 'flood exposure, Hg lamp (365 nm drawn violet)');
			this.addOwn('column', 'lamp', hw('#2f3237', 0.6, 0.3), box(2 * R + 120_000, 60_000, 2 * R + 120_000, 0, g + 440_000, 0), 'lamp house (template)');
		} else {
			// field grid (serpentine), fields whose centre lies within R - min(w, d) / 4
			this.fields = [];
			const nx = Math.ceil(R / fw) + 1, nz = Math.ceil(R / fd) + 1;
			for (let j = -nz; j <= nz; j++) {
				const row: [number, number][] = [];
				for (let i = -nx; i <= nx; i++) {
					const x = (i + 0.5) * fw, z = (j + 0.5) * fd;
					if (Math.hypot(x, z) <= R - Math.min(fw, fd) / 4) row.push([x, z]);
				}
				if ((j + nz) % 2) row.reverse();
				this.fields.push(...row);
			}
			// field outlines (all) as thin frames, exposed latent fields as instanced tinted quads
			const yl = ill ? 250 : 20;
			const lines: number[] = [];
			for (const [x, z] of this.fields) {
				const a = [x - fw / 2, z - fd / 2], b = [x + fw / 2, z + fd / 2];
				lines.push(a[0], yl, a[1], b[0], yl, a[1], b[0], yl, a[1], b[0], yl, b[1], b[0], yl, b[1], a[0], yl, b[1], a[0], yl, b[1], a[0], yl, a[1]);
			}
			const lg = new THREE.BufferGeometry();
			lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
			const lm = this.keep(new THREE.LineBasicMaterial({ color: '#6c7380', transparent: true, opacity: 0.6 }));
			const ls = new THREE.LineSegments(lg, lm);
			ls.userData.tip = `step-and-repeat field grid, ${fw / 1000} x ${fd / 1000} mm fields (F86), ${this.fields.length} fields`;
			this.rig('stage').add(ls);
			const q = new THREE.PlaneGeometry(1, 1);
			q.rotateX(-Math.PI / 2);
			const qm = this.keep(new THREE.MeshBasicMaterial({ color: '#7a68e0', transparent: true, opacity: 0.22, depthWrite: false }));
			this.marks = new THREE.InstancedMesh(q, qm, Math.max(1, this.fields.length));
			this.marks.count = 0;
			this.marks.userData.tip = 'exposed fields (latent image; illustrative tint)';
			this.marks.frustumCulled = false;
			this.marks.position.y = yl;
			this.rig('stage').add(this.marks);
			// projection column (moves field to field in the wafer frame; the real stage moves the wafer)
			const col = this.rig('column');
			const wd = mm('wd_mm');
			const Rl = mm('lens_d_mm') / 2;
			const Hl = mm('lens_h_mm');
			const barrel = hw('#2e3136', 0.5, 0.35);
			const rn = Math.hypot(fw, fd) / 2 + wd * Math.tan(Math.asin(num(args, s, 'na'))) + 8000; // nose clears the field cone
			this.addOwn('column', 'barrel', barrel, lathe([new THREE.Vector2(rn * 0.6, wd), new THREE.Vector2(rn, wd), new THREE.Vector2(rn, wd + 30_000), new THREE.Vector2(Rl, wd + 140_000), new THREE.Vector2(Rl, wd + Hl), new THREE.Vector2(rn * 0.6, wd + Hl), new THREE.Vector2(rn * 0.6, wd)], 96), 'projection lens column, NA 0.22, 2:1 (F83, F86); barrel geometry template (F91)');
			this.add('column', 'glass', cylY(rn * 0.6, wd - 1000, wd + 2000, 0, 0, 64), 'last lens element (template)');
			const yr = wd + Hl + 40_000;
			const rp = mm('reticle_mm');
			this.add('column', 'glass', box(rp, mm('reticle_h_mm'), rp, 0, yr, 0), 'reticle, 6025 plate (template, F91 gap)');
			this.addOwn('column', 'chrome', hw('#202124', 0.3, 0.85), box(mm('pattern_w_mm'), 200, mm('pattern_d_mm'), 0, yr - mm('reticle_h_mm') / 2 - 100, 0), 'chrome pattern area = field x reduction (derived, F86)');
			this.addOwn('column', 'barrel', barrel, ringY(rp * 0.62, rp * 0.95, yr - 12_000, yr - 5000, 4, 0, 0, Math.PI / 4), 'reticle stage frame (template)');
			this.addOwn('column', 'barrel', barrel, box(rp * 1.3, 80_000, rp * 1.3, 0, yr + 120_000, 0), 'illuminator (Hg lamp, 365 nm filter, F83; housing template)');
			// exposure light: rectangular frustum from the lens exit to the field (cone half angle asin NA)
			const ta = Math.tan(Math.asin(num(args, s, 'na')));
			const e = wd * ta;
			const fr = new THREE.BufferGeometry();
			const v = (x: number, y: number, z: number) => [x, y, z];
			const top = [v(-fw / 2 - e, wd, -fd / 2 - e), v(fw / 2 + e, wd, -fd / 2 - e), v(fw / 2 + e, wd, fd / 2 + e), v(-fw / 2 - e, wd, fd / 2 + e)];
			const bot = [v(-fw / 2, 0, -fd / 2), v(fw / 2, 0, -fd / 2), v(fw / 2, 0, fd / 2), v(-fw / 2, 0, fd / 2)];
			const pos: number[] = [];
			for (let i = 0; i < 4; i++) {
				const j = (i + 1) % 4;
				pos.push(...top[i], ...bot[i], ...bot[j], ...top[i], ...bot[j], ...top[j]);
			}
			fr.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
			fr.computeVertexNormals();
			this.lightM = glowMat('#8e7bff', 0.9, 0, wd);
			this.light = this.glow('column', fr, this.lightM, `exposure light onto one ${fw / 1000} x ${fd / 1000} mm field (365 nm drawn violet; cone half angle asin(NA))`);
			const fp = new THREE.PlaneGeometry(fw, fd);
			fp.rotateX(-Math.PI / 2);
			fp.translate(0, ill ? 300 : 30, 0);
			const fm = new THREE.MeshBasicMaterial({ color: '#9d8cff', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
			this.glow('column', fp, fm, 'illuminated field').name = 'spot';
		}
	}

	private at(u: number): { i: number; move: number; open: boolean } {
		const n = Math.max(1, this.fields.length);
		const x = clamp01(u / 0.5) * n;
		const i = Math.min(n - 1, Math.floor(x));
		const fr = x - i;
		return { i, move: smooth(fr / 0.35), open: u < 0.5 && fr >= 0.35 && fr < 0.95 };
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const e = engage(t, ctx);
		const u = ctx.phase === 'approach' ? 0 : ctx.phase === 'retract' ? 1 : ctx.u;
		const C = carrierCenter(f);
		const col = this.rig('column');
		const away = 350_000 * (1 - e) + (u >= 0.5 ? 350_000 * smooth((u - 0.5) / 0.08) : 0);
		const ill = f.scale === 'work' && f.illustrative;
		if (this.aligner(args)) {
			col.position.set(C.x, away, C.z);
			setGlow(this.lightM, u > 0 && u < 0.5 ? 0.35 : 0);
		} else {
			const { i, move, open } = this.at(u);
			const p0 = this.fields[Math.max(0, i - 1)] ?? [0, 0];
			const p1 = this.fields[i] ?? [0, 0];
			const x = p0[0] + (p1[0] - p0[0]) * move, z = p0[1] + (p1[1] - p0[1]) * move;
			col.position.set(C.x + x, away, C.z + z);
			const on = open && ctx.phase === 'process';
			if (this.light) this.light.visible = on;
			const spot = col.getObjectByName('spot');
			if (spot) spot.visible = on;
			if (this.marks) {
				const done = u >= 0.5 ? this.fields.length : i + (open ? 1 : 0);
				for (let k = 0; k < done; k++) setInst(this.marks, k, this.fields[k][0], 0, this.fields[k][1], this.fw * 0.985, 1, this.fd * 0.985);
				this.marks.count = done;
				this.marks.instanceMatrix.needsUpdate = true;
				this.marks.visible = u < 0.5 || u < 0.75;
			}
		}
		// developer puddle in the second half (develop)
		if (this.puddle) {
			const d = u >= 0.5 && ctx.phase === 'process' ? smooth((u - 0.55) / 0.1) * (1 - smooth((u - 0.95) / 0.05)) : 0;
			const W = carrierSize(f);
			const h = Math.max(num(args, this.spec, 'puddle_mm') * 1000, ill ? 3000 : 0);
			this.puddle.visible = d > 0.01;
			this.puddle.scale.set(W.r * Math.max(0.05, d), h * Math.max(0.05, d), W.r * Math.max(0.05, d));
		}
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const al = this.aligner(args);
		const { i } = this.at(u);
		return [
			{ key: 'mode', label: al ? 'mask aligner (flood)' : 'stepper', value: null, unit: '', status: 'derived' },
			{ key: 'field', label: 'field', value: al ? null : Math.min(this.fields.length, i + 1), unit: `of ${al ? 'N/A' : this.fields.length}`, status: 'derived', note: `${num(args, s, 'field_w_mm')} x ${num(args, s, 'field_d_mm')} mm (F86)` },
			{ key: 'na', label: 'NA / lambda', value: num(args, s, 'na'), unit: `/ ${num(args, s, 'wavelength_nm')} nm`, status: stat(args, s, 'na') },
			{ key: 'dose', label: 'dose', value: live(ctx, 'dose_mj_cm2') ?? num(args, s, 'dose_mj_cm2'), unit: 'mJ/cm2', status: live(ctx, 'dose_mj_cm2') !== null ? 'derived' : stat(args, s, 'dose_mj_cm2') },
			{ key: 'step', label: 'stage step / shutter time', value: null, unit: 's', status: 'template', note: 'not found (F91); drawn at a visual cadence' },
			{ key: 'dev', label: 'develop (puddle)', value: num(args, s, 'develop_s'), unit: 's', status: stat(args, s, 'develop_s') }
		];
	}
}

// ---------------------------------------------------------------- spin coater

export const SPIN_SPEC: Record<string, PDim> = {
	dispense_s: tpl(3, 's', 'static dispense time not found (F76 lists a static dispense without a time)', undefined, ['F76']),
	spread_rpm: rep(500, 'rpm', 'F76', 'PI-2600 spread'),
	spread_s: rep(5, 's', 'F76'),
	final_rpm: rep(2200, 'rpm', 'F75', 'i-line resist; PI final speed per spin curve (F172)'),
	final_s: rep(30, 's', 'F76'),
	ebr_s: rep(10, 's', 'F76', 'edge bead / backside rinse'),
	dry_s: rep(15, 's', 'F76', 'spin dry'),
	bake_c: rep(120, 'C', 'F75', 'hot plate 3 min (resist); PI 90 C 90 s + 150 C 90 s (F76)'),
	dispense_ml: tpl(3, 'ml', 'dispensed volume not found'),
	puddle_mm: tpl(1, 'mm', 'puddle height at the end of the static dispense not found'),
	chuck_d_mm: tpl(100, 'mm', 'vacuum chuck diameter not found'),
	cup_d_mm: tpl(420, 'mm', 'catch cup diameter not found')
};

export class SpinCoater extends FabBase {
	readonly id = 'spin_coater';
	readonly name = 'Spin coater';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = SPIN_SPEC;
	protected override blockParts(): string[] {
		return ['blkfilm|own'];
	}
	private film: THREE.Mesh | null = null;
	private drops: THREE.Points | null = null;
	private ebr: THREE.Mesh | null = null;
	private stream: THREE.Mesh | null = null;

	private key(args: ToolArgs): string {
		const m = str(args, 'material', 'resist');
		return m === 'polyimide' || m === 'pi' ? 'polyimide' : m === 'dry_film' ? 'dry_film' : 'resist';
	}
	protected geomKey(args: ToolArgs): string {
		return this.key(args);
	}
	/** Real-time sequence from the spec (s): [dispense, spread, final, ebr, dry]. */
	private seq(args: ToolArgs): number[] {
		const s = this.spec;
		return ['dispense_s', 'spread_s', 'final_s', 'ebr_s', 'dry_s'].map((k) => num(args, s, k));
	}
	private stage(args: ToolArgs, ctx: ToolCtx): { k: number; f: number; tr: number; T: number } {
		const q = this.seq(args);
		const T = q.reduce((a, b) => a + b, 0);
		const tr = ctx.phase === 'process' ? (ctx.tReal_s !== null && ctx.tReal_s <= T * 1.0001 ? ctx.tReal_s : ctx.u * T) : ctx.phase === 'retract' ? T : 0;
		let acc = 0;
		for (let k = 0; k < q.length; k++) {
			if (tr < acc + q[k] || k === q.length - 1) return { k, f: clamp01((tr - acc) / q[k]), tr, T };
			acc += q[k];
		}
		return { k: 4, f: 1, tr, T };
	}
	private rpm(args: ToolArgs, k: number): number {
		const s = this.spec;
		return k === 0 ? 0 : k === 1 ? num(args, s, 'spread_rpm') : num(args, s, 'final_rpm');
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 775);
		const ch = this.rig('chuck');
		ch.position.set(C.x, 0, C.z);
		const rc = mm('chuck_d_mm') / 2;
		this.add('chuck', 'steel', cylY(rc, yb - 12_000, yb, 0, 0, 64), 'vacuum chuck (diameter template)');
		this.add('chuck', 'steel', box(rc * 0.9, 4000, 8000, rc * 0.4, yb - 14_000, 0), 'chuck key (shows rotation)');
		this.add('chuck', 'steel', cylY(14_000, yb - 120_000, yb - 12_000, 0, 0, 24), 'spindle (template)');
		// catch cup (back half, section faces)
		const Rc = mm('cup_d_mm') / 2;
		const cupM = hw('#e2e4e6', 0.4, 0, { side: THREE.DoubleSide });
		const prof = [
			new THREE.Vector2(rc + 8000, yb - 70_000),
			new THREE.Vector2(Rc, yb - 70_000),
			new THREE.Vector2(Rc, 30_000),
			new THREE.Vector2(R + 25_000, 45_000),
			new THREE.Vector2(R + 25_000, 39_000),
			new THREE.Vector2(Rc - 6000, 25_000),
			new THREE.Vector2(Rc - 6000, yb - 64_000),
			new THREE.Vector2(rc + 8000, yb - 64_000),
			new THREE.Vector2(rc + 8000, yb - 70_000)
		];
		this.addOwn('base', 'cup', cupM, lathe(prof, 96, C.x, C.z, 0, Math.PI), 'catch cup, front half cut away (template)');
		// dispense arm over the centre, EBR nozzle at the edge
		const arm = this.rig('arm');
		arm.position.set(C.x, 0, C.z);
		const ya = 60_000;
		this.add('arm', 'steel', rod(new THREE.Vector3(Rc + 40_000, ya, -Rc * 0.4), new THREE.Vector3(0, ya, 0), 6000, 12), 'dispense arm (template)');
		this.add('arm', 'steel', cylY(4000, 18_000, ya, 0, 0, 12), 'dispense nozzle');
		this.add('base', 'steel', rod(new THREE.Vector3(C.x - Rc - 20_000, 20_000, C.z), new THREE.Vector3(C.x - R + 4000, 8000, C.z), 3000, 10), 'edge bead removal nozzle (template)');
		const key = this.key(args);
		this.stream = this.mesh('arm', `${key}#stream`, cylY(1500, 0, 18_000, 0, 0, 10), 'dispense stream');
		// unit film (radius / half size 1, height 1), scaled in animate; rect pieces get a box so it stays on the piece
		const fg = W.disk ? cylY(1, 0, 1, 0, 0, 96) : box(2, 1, 2, 0, 0.5, 0);
		const tipF = `${key} puddle / spreading film (volume template; final thickness is the coat op's)`;
		if (f.scale === 'work') this.film = this.mesh('chuck', key, fg, tipF);
		else {
			// block / cell: a thin, dim film over the window only (audits V1 / V2: the wafer-wide puddle and the bowl
			// formed a backdrop behind the block); the coat body itself is the engine's
			const col = key === 'polyimide' ? '#b98a2e' : key === 'dry_film' ? '#6fa8d8' : '#c9a060';
			const bw = blockWin(f);
			// window, behind the section plane only (the engine draws the block's back half; audit final F12)
			this.film = this.ownMesh('blkfilm', hw(col, 0.3, 0, { transparent: true, opacity: 0.25, depthWrite: false }), boxMM(bw.x0, bw.x1, 0, 1, bw.z0, Math.min(bw.z1, bw.zSec)), tipF);
			fg.dispose();
		}
		const ebrM = hw('#d8ecff', 0.05, 0, { transparent: true, opacity: 0.6, depthWrite: false });
		this.ebr = this.ownMesh('base', ebrM, rod(new THREE.Vector3(C.x - R + 4000, 8000, C.z), new THREE.Vector3(C.x - R + 2500, 0, C.z), 600, 8), 'EBR solvent jet (F76)');
		this.drops = this.points('base', 400, key === 'polyimide' ? '#d8a040' : '#e0b070', 2, 0.85, 'spin-off droplets (illustrative)', false);
	}

	workRot(_t: number, args: ToolArgs, ctx: ToolCtx): number {
		const r = this.rpm(args, this.stage(args, ctx).k);
		return spin(r, ctx, { features: 2, f: this.frame });
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const { k, f: fr } = this.stage(args, ctx);
		const e = engage(t, ctx);
		const W = carrierSize(f);
		const R = W.disk ? W.r : Math.min(W.w, W.d) / 2; // spread front confined to the piece
		const C = carrierCenter(f);
		this.rig('chuck').rotation.y = this.workRot(t, args, ctx);
		// arm swings in for the dispense, out afterwards
		const armIn = ctx.phase === 'process' && k <= 1 ? (k === 0 ? 1 : 1 - smooth(fr / 0.4)) : ctx.phase === 'approach' ? smooth(e) : 0;
		const arm = this.rig('arm');
		arm.position.set(C.x + (1 - armIn) * (R + 80_000), 0, C.z);
		if (this.stream) this.stream.visible = ctx.phase === 'process' && k === 0;
		// puddle / film: volume-conserving disk (template volume), dispense grows r at fixed height, spread to the edge
		const V = num(args, s, 'dispense_ml') * 1e12; // ml -> um3
		const h0 = num(args, s, 'puddle_mm') * 1000;
		const r0 = Math.sqrt(V / (Math.PI * h0));
		let r = 0, vis = false;
		if (ctx.phase === 'process') {
			if (k === 0) r = r0 * Math.sqrt(fr);
			else if (k === 1) r = r0 + (R - r0) * smooth(fr);
			else r = R;
			vis = k <= 2 && !(k === 2 && fr > 0.25);
		}
		const blk = f.scale !== 'work';
		const hmin = f.illustrative && !blk ? 100 : 1;
		let h = r > 0 ? Math.max((V * (k === 0 ? fr : 1)) / (Math.PI * r * r), hmin) : 0;
		if (blk) h = Math.min(h, 0.15 * blockWin(f).span); // thin at block / cell scale (real puddle is mm thick)
		if (this.film) {
			this.film.visible = vis && r > 0;
			if (blk) {
				// the spreading front reaches the window when r passes the window's distance from the piece centre
				this.film.visible = vis && r >= Math.hypot(f.focus_um.x, f.focus_um.y);
				this.film.scale.set(1, Math.max(h, 1), 1);
			} else {
				const sx = W.disk ? r : Math.min(r, W.w / 2), sz = W.disk ? r : Math.min(r, W.d / 2);
				this.film.scale.set(Math.max(sx, 1), Math.max(h, 1), Math.max(sz, 1));
			}
		}
		if (this.ebr) this.ebr.visible = ctx.phase === 'process' && k === 3;
		// spin-off droplets during spread / early final spin: straight lines tangent to the rim (lab frame)
		const p = this.drops!;
		const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
		let m = 0;
		const fling = ctx.phase === 'process' && (k === 1 || (k === 2 && fr < 0.3)) ? 1 : 0;
		const Rc = num(args, s, 'cup_d_mm') * 500;
		const rot = this.workRot(t, args, ctx);
		for (let i = 0; i < n && fling; i++) {
			const sP = fract(hash(i, 41) + 1.2 * ctx.tPlay_s);
			const a = hash(i, 42) * Math.PI * 2 + rot;
			const d = sP * (Rc - R) * 1.6;
			const px = R * Math.cos(a) + d * (-Math.sin(a) * 0.8 + Math.cos(a) * 0.6);
			const pz = -R * Math.sin(a) + d * (-Math.cos(a) * 0.8 - Math.sin(a) * 0.6);
			if (Math.hypot(px, pz) > Rc - 8000) continue;
			setPt(p, m++, C.x + px, 2000 + 4000 * hash(i, 43), C.z + pz);
		}
		ptsDone(p, m);
	}

	defaultDuration(args: ToolArgs): number {
		return this.seq(args).reduce((a, b) => a + b, 0);
	}
	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const { k, tr, T } = this.stage(args, ctx);
		const names = ['static dispense', 'spread', 'final spin', 'edge bead removal', 'spin dry'];
		const keys = ['dispense_s', 'spread_s', 'final_s', 'ebr_s', 'dry_s'];
		return [
			{ key: 'stage', label: `stage: ${names[k]}`, value: num(args, s, keys[k]), unit: 's', status: stat(args, s, keys[k]) },
			{ key: 'rpm', label: 'spin speed', value: this.rpm(args, k), unit: 'rpm', status: k === 0 ? 'derived' : stat(args, s, k === 1 ? 'spread_rpm' : 'final_rpm'), note: k >= 3 ? 'EBR / dry speed not found; final speed shown (template)' : undefined },
			{ key: 't', label: 'sequence time', value: +tr.toFixed(1), unit: `of ${T} s`, status: 'derived' },
			{ key: 'bake', label: 'soft bake (next)', value: num(args, s, 'bake_c'), unit: 'C', status: stat(args, s, 'bake_c') },
			{ key: 'th', label: 'film', value: live(ctx, 'thickness_um'), unit: 'um', status: 'derived' }
		];
	}
}

export const createLitho = (args?: ToolArgs) => new Litho(args);
export const createSpinCoater = (args?: ToolArgs) => new SpinCoater(args);
