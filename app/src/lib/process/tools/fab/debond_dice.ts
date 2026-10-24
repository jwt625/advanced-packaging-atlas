// Laser debond (op debond, method laser): fixed UV scanner head above the carrier-up stack, line beam through the
// glass onto the release layer, raster lines across the wafer (scan front from the op), processed tracks darkened at
// the release plane, then a vacuum lift plate takes the carrier. Blade dicing (op dice, method blade): hub blade on
// its spindle with blade cover and coolant nozzles, feed along the streets (engine line order), wafer on tape in a ring
// frame on the chuck. RESEARCH_TOOLS_FAB.md sections 11-12 (F152-F169).

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	FabBase,
	backY,
	blockWin,
	box,
	carrierCenter,
	carrierSize,
	clamp01,
	cylY,
	engage,
	fract,
	hash,
	hw,
	live,
	num,
	opt,
	patterned,
	phaseProgress,
	ptsDone,
	rep,
	ringY,
	rod,
	setInst,
	setPt,
	smooth,
	spin,
	stat,
	tpl,
	yOf,
	type Readout
} from './common';

// ---------------------------------------------------------------- laser debond

export const DEBOND_SPEC: Record<string, PDim> = {
	wavelength_nm: rep(308, 'nm', 'F157', 'XeCl excimer, raster scanned (SUSS ELD300); solid-state UV alternative (F159)'),
	scan_m_s: rep(12.2, 'm/s', 'F156', 'UV laser through 1.1 mm glass onto the release film'),
	glass_t308: rep(0.83, '1', 'F158', 'glass transmission at 308 nm (med)'),
	carrier_um: rep(700, 'um', 'F154', 'glass carrier'),
	release_um: rep(1, 'um', 'F152'),
	line_len_mm: tpl(10, 'mm', 'beam line length not found (F161); raster pitch = line length', undefined, ['F161']),
	line_w_um: tpl(300, 'um', 'beam line width not found (F161)', undefined, ['F161']),
	head_h_mm: tpl(150, 'mm', 'scanner head working gap above the carrier not found')
};

export class LaserDebond extends FabBase {
	readonly id = 'laser_debond';
	readonly name = 'Laser debonder (UV line scan)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = DEBOND_SPEC;
	protected override blockParts(): string[] {
		return ['stage|glow'];
	}
	protected override occluderParts(): string[] {
		return ['head|own:body', 'head|glass'];
	}
	private sheet: THREE.Mesh | null = null;
	private spot: THREE.Mesh | null = null;
	private tracks: THREE.InstancedMesh | null = null;
	private yRel = -700;
	private spotTop: THREE.Mesh | null = null;

	private lines(f: ToolFrame, args: ToolArgs): { n: number; L: number } {
		const L = num(args, this.spec, 'line_len_mm') * 1000;
		return { n: Math.max(1, Math.ceil((2 * carrierSize(f).r) / L)), L };
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 1546);
		this.yRel = this.relY(f, args);
		const ill = f.scale === 'work' && f.illustrative;
		const st = this.rig('stage');
		st.position.set(C.x, 0, C.z);
		this.addOwn('stage', 'chuck', patterned(hw('#cfccc4', 0.9, 0), 3, 250, 120, '#9c988e'), cylY(R + 5000, yb - 20_000, yb, 0, 0, 128), 'vacuum chuck, carrier side up (porous; size template)');
		this.addOwn('stage', 'base', hw('#2f3237', 0.6, 0.3), box(2 * R + 200_000, 30_000, 2 * R + 200_000, 0, yb - 35_000, 0), 'stage (template)');
		// scanner head fixed above the centre
		const H = mm('head_h_mm');
		this.addOwn('head', 'body', hw('#d9dce0', 0.4, 0.3), box(220_000, 120_000, 160_000, 0, H + 60_000, 0), 'UV scanner / beam delivery head (308 nm excimer F157 or solid-state UV F159); housing template');
		this.add('head', 'glass', cylY(30_000, H - 6000, H, 0, 0, 32), 'exit window (template)');
		this.rig('head').position.set(C.x, 0, C.z);
		const beamM = new THREE.MeshBasicMaterial({ color: '#9b7dff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
		this.sheet = this.glow('stage', g, beamM, 'UV line beam through the glass (308 nm drawn violet; geometry template F161)');
		this.sheet.frustumCulled = false;
		const fp = new THREE.PlaneGeometry(1, 1);
		fp.rotateX(-Math.PI / 2);
		this.spot = this.glow('stage', fp, new THREE.MeshBasicMaterial({ color: '#c8b8ff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }), 'beam footprint on the release layer');
		this.spotTop = this.glow('stage', fp.clone(), new THREE.MeshBasicMaterial({ color: '#b9a6ff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }), 'scan line entering the glass carrier top');
		const q = new THREE.PlaneGeometry(1, 1);
		q.rotateX(-Math.PI / 2);
		const tm = this.keep(new THREE.MeshBasicMaterial({ color: '#2a2018', transparent: true, opacity: f.scale === 'work' ? 0.4 : 0.22, depthWrite: false }));
		const { n } = this.lines(f, args);
		this.tracks = new THREE.InstancedMesh(q, tm, n + 1);
		this.tracks.count = 0;
		this.tracks.frustumCulled = false;
		this.tracks.userData.tip = 'scanned tracks: release layer decomposed (appearance template)';
		this.tracks.position.y = this.yRel + Math.min(ill ? 50 : 0.2, Math.abs(this.yRel) * 0.05);
		this.tracks.renderOrder = 5;
		st.add(this.tracks);
		// vacuum lift plate (takes the carrier in the lift phase)
		const lp = this.rig('lift');
		lp.position.set(C.x, 0, C.z);
		this.addOwn('lift', 'lp', patterned(hw('#b8bcc2', 0.6, 0.4), 3, 400, 150, '#7d828a'), cylY(R, 0, 15_000, 0, 0, 128), 'vacuum lift plate (template)');
	}

	/**
	 * Tool-frame y of the release layer (beam focus). args.release_z_um (piece z, engine) when given; else the carrier
	 * is assumed on the tool-facing side: z = surface - carrier (front up) or surface + carrier (stack face down, zmap
	 * reversed). The result is always below the facing surface (audit V2 N5: the beam ended in mid-air).
	 */
	private relY(f: ToolFrame, args: ToolArgs): number {
		const rz = opt(args, 'release_z_um');
		if (rz !== null) {
			// engine: mid plane + thickness of the release body; overlay on its tool-facing face
			const h = opt(args, 'release_h_um') ?? 0;
			return Math.max(yOf(f, rz + h / 2), yOf(f, rz - h / 2));
		}
		const c = num(args, this.spec, 'carrier_um');
		const down = Math.abs(yOf(f, 0)) < 1e-6; // facing surface at piece z 0: the stack faces down
		return -Math.abs(yOf(f, down ? f.surface_um + c : f.surface_um - c));
	}
	private scan(ctx: ToolCtx): number {
		const sc = live(ctx, 'scan');
		if (sc !== null) return clamp01(sc);
		return ctx.phase === 'process' ? clamp01(ctx.u / 0.8) : ctx.phase === 'retract' ? 1 : 0;
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const R = carrierSize(f).r;
		const { n, L } = this.lines(f, args);
		const fs = this.scan(ctx);
		const scanning = ctx.phase === 'process' && fs < 1 && ctx.u < 0.8;
		const x = fs * n;
		const i = Math.min(n - 1, Math.floor(x));
		const along = x - i;
		const z = -R + (i + 0.5) * L;
		const c = Math.sqrt(Math.max(0, R * R - z * z));
		const dir = i % 2 ? -1 : 1;
		const bx = dir * (-c + along * 2 * c);
		const H = num(args, s, 'head_h_mm') * 1000;
		const yr = this.yRel;
		const w = Math.max(num(args, s, 'line_w_um'), f.scale === 'work' && f.illustrative ? 1500 : 0);
		if (this.sheet) {
			const a = this.sheet.geometry.attributes.position as THREE.BufferAttribute;
			a.setXYZ(0, 0, H - 6000, 0);
			a.setXYZ(1, bx, yr, z - L / 2);
			a.setXYZ(2, bx, yr, z + L / 2);
			a.needsUpdate = true;
			this.sheet.geometry.computeBoundingSphere();
			this.sheet.visible = scanning;
		}
		if (this.spot) {
			this.spot.position.set(bx, yr + 5, z);
			this.spot.scale.set(w, 1, L);
			this.spot.visible = scanning;
		}
		if (this.spotTop) {
			this.spotTop.position.set(bx, f.scale === 'work' && f.illustrative ? 150 : 1, z);
			this.spotTop.scale.set(w, 1, L);
			this.spotTop.visible = scanning;
		}
		if (this.tracks) {
			// thin overlay on the release plane, confined to the piece outline and (block / cell) to the window (audit:
			// the full-wafer quads filled the block view)
			const W = carrierSize(f);
			const C = carrierCenter(f);
			const clip = f.scale === 'work' ? null : blockWin(f);
			const half = (zk: number) => (W.disk ? Math.sqrt(Math.max(0, R * R - zk * zk)) : W.w / 2);
			let cnt = 0;
			const put = (xa: number, xb: number, zc: number) => {
				let za = zc - (L * 0.98) / 2, zb = zc + (L * 0.98) / 2;
				if (!W.disk) {
					za = Math.max(za, -W.d / 2);
					zb = Math.min(zb, W.d / 2);
				}
				if (clip) {
					xa = Math.max(xa, clip.x0 - C.x);
					xb = Math.min(xb, clip.x1 - C.x);
					za = Math.max(za, clip.z0 - C.z);
					zb = Math.min(zb, Math.min(clip.z1, clip.zSec) - C.z);
				}
				if (xb - xa <= 0 || zb - za <= 0) return;
				setInst(this.tracks!, cnt++, (xa + xb) / 2, 0, (za + zb) / 2, xb - xa, 1, zb - za);
			};
			const done = fs >= 1 ? n : i;
			for (let k = 0; k < done; k++) {
				const zk = -R + (k + 0.5) * L;
				const hk = half(zk);
				put(-hk, hk, zk);
			}
			if (fs < 1) {
				const hc = half(z);
				const xe = Math.max(-hc, Math.min(hc, bx));
				if (dir > 0) put(-hc, xe, z);
				else put(xe, hc, z);
			}
			this.tracks.count = ctx.phase === 'approach' ? 0 : cnt;
			this.tracks.instanceMatrix.needsUpdate = true;
		}
		// lift plate: down onto the glass at u 0.8-0.86, lifts the carrier after (view travel 30 mm)
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const down = smooth((u - 0.74) / 0.12);
		const up = smooth((u - 0.88) / 0.12) * 30_000;
		const lift = this.rig('lift');
		lift.position.y = (1 - down) * 150_000 + up;
		lift.visible = u > 0.7 && engage(t, ctx) > 0.01;
		this.setHold({ on: u > 0.86, x: lift.position.x, y: lift.position.y, z: lift.position.z });
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const f = this.frame;
		const { n } = f ? this.lines(f, args) : { n: 0 };
		const fs = this.scan(ctx);
		return [
			{ key: 'lambda', label: 'wavelength', value: num(args, s, 'wavelength_nm'), unit: 'nm', status: stat(args, s, 'wavelength_nm') },
			{ key: 'v', label: 'scan speed', value: num(args, s, 'scan_m_s'), unit: 'm/s', status: stat(args, s, 'scan_m_s'), note: 'drawn at a visual cadence' },
			{ key: 'line', label: 'scan line', value: Math.min(n, Math.floor(fs * n) + 1), unit: `of ${n}`, status: 'template', note: 'line count from the template line length (F161 gap)' },
			{ key: 'T', label: 'glass transmission (308 nm)', value: num(args, s, 'glass_t308'), unit: '1', status: stat(args, s, 'glass_t308') },
			{ key: 'scan', label: 'scanned', value: +(fs * 100).toFixed(1), unit: '%', status: 'derived' }
		];
	}
	defaultDuration(args: ToolArgs): number | null {
		if (!this.frame) return null;
		const R = carrierSize(this.frame).r / 1e6;
		const L = num(args, this.spec, 'line_len_mm') / 1000;
		return (Math.PI * R * R) / (L * num(args, this.spec, 'scan_m_s'));
	}
}

// ---------------------------------------------------------------- blade dicing

export const DICE_SPEC: Record<string, PDim> = {
	blade_od_mm: rep(55.56, 'mm', 'F167', 'hub blade NBC-ZH2050 listing (low); max 58 mm on DAD322x (F165)'),
	kerf_um: rep(50, 'um', 'F164', '50 um kerf blade, single pass'),
	blade_t_um: tpl(50, 'um', 'blade thickness taken equal to the kerf (blade width not found; kerf >= blade)', undefined, ['F164', 'F167']),
	exposure_mm: tpl(0.64, 'mm', 'blade exposure not found (F169); set to the listed max cut depth 0.51-0.64 mm (F167)', undefined, ['F167', 'F169']),
	hub_t_mm: tpl(3, 'mm', 'hub width not found'),
	spindle_rpm: rep(20000, 'rpm', 'F163', 'DAD3361 rear cutting; 3000-40000 rpm range (F165)'),
	feed_mm_s: rep(0.5, 'mm/s', 'F163', '1 mm thick TV, 4 passes; transfer 0.1-500 mm/s (F165)'),
	tape_um: rep(120, 'um', 'F163', 'dicing tape on the frame'),
	tape_cut_um: tpl(30, 'um', 'cut depth into the tape not found'),
	frame_id_mm: tpl(350, 'mm', 'ring frame inner diameter not found (300 mm wafer frame)'),
	frame_od_mm: tpl(400, 'mm', 'ring frame outer diameter not found'),
	street_um: tpl(100, 'um', 'street width not in the tool frame (ToolFrame has no repeat pitch); unit + street used when args give no pitch')
};

export class DicingBlade extends FabBase {
	readonly id = 'dicing_blade';
	readonly name = 'Dicing saw (hub blade)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = DICE_SPEC;
	protected override blockParts(): string[] {
		return ['spin|own:edge', 'blade|pts'];
	}
	protected override occluderParts(): string[] {
		return ['blade|own:spindle'];
	}
	private mist: THREE.Points | null = null;
	private Rb = 27_780;

	/** Cut list in the engine's order (ops.ts dice / viewer kerf): streets at +-(p/2 + k p), along y first, then x. */
	private cuts(f: ToolFrame, args: ToolArgs): [number, number, boolean][] {
		const R = carrierSize(f).r;
		const st = num(args, this.spec, 'street_um');
		const px = opt(args, 'pitch_x_um') ?? f.unit.w_um + st;
		const py = opt(args, 'pitch_y_um') ?? f.unit.d_um + st;
		const pos: [number, number, boolean][] = [];
		for (let x = px / 2; x < R; x += px) pos.push([x, 0, true], [-x, 0, true]);
		for (let y = py / 2; y < R; y += py) pos.push([0, y, false], [0, -y, false]);
		return pos;
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 100);
		const tape = num(args, s, 'tape_um');
		const ill = f.scale === 'work' && f.illustrative;
		const tapeV = ill ? tape * 4 : tape;
		const ch = this.rig('chuck');
		ch.position.set(C.x, 0, C.z);
		const fi = mm('frame_id_mm') / 2, fo = mm('frame_od_mm') / 2;
		this.addOwn('chuck', 'tape', hw('#7fa8d8', 0.4, 0, { transparent: true, opacity: 0.75 }), cylY(fo - 2000, yb - tapeV, yb, 0, 0, 160), 'dicing tape 120 um (F163)');
		this.add('chuck', 'steel', ringY(fi, fo, yb - tapeV - 1500, yb - tapeV, 160), 'ring frame (size template)');
		this.addOwn('chuck', 'por', patterned(hw('#cfccc4', 0.9, 0), 3, 250, 120, '#9c988e'), cylY(R + 8000, yb - tapeV - 25_000, yb - tapeV, 0, 0, 128), 'porous vacuum chuck table (template)');
		this.addOwn('chuck', 'base', hw('#2f3237', 0.6, 0.3), box(fo * 2 + 100_000, 20_000, fo * 2 + 100_000, 0, yb - tapeV - 35_000, 0), 'theta table / X stage (template)');
		// blade assembly: axis along the rig's local z, blade plane = local xy, cut direction = local x
		const Rb = mm('blade_od_mm') / 2;
		this.Rb = Rb;
		const ex = mm('exposure_mm');
		const bt = Math.max(num(args, s, 'blade_t_um'), ill ? 400 : 0);
		const ht = mm('hub_t_mm');
		const bl = this.rig('blade');
		const sp = this.rig('spin', 'blade');
		const disk = (r: number, t: number, z0: number, seg = 128) => {
			const g = new THREE.CylinderGeometry(r, r, t, seg, 1);
			g.rotateX(Math.PI / 2);
			g.translate(0, 0, z0 + t / 2);
			return g;
		};
		this.addOwn('spin', 'edge', hw('#4a4c50', 0.5, 0.6), disk(Rb, bt, -bt / 2, 192), 'electroformed diamond blade edge, OD 55.56 mm (F167), kerf 50 um (F164); exposure template');
		this.add('spin', 'al', disk(Rb - ex, ht, -bt / 2 - ht, 128), 'aluminium hub (blade exposure = OD - hub, template)');
		this.add('spin', 'steel', disk(Rb * 0.55, 6000, -bt / 2 - ht - 6000, 64), 'flange nut');
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			const g = new THREE.CylinderGeometry(1500, 1500, 2000, 10);
			g.rotateX(Math.PI / 2);
			g.translate(Rb * 0.38 * Math.cos(a), Rb * 0.38 * Math.sin(a), -bt / 2 - ht - 7000);
			this.add('spin', 'al', g, 'flange screws (show rotation)');
		}
		const sh = new THREE.CylinderGeometry(25_000, 25_000, 140_000, 48);
		sh.rotateX(Math.PI / 2);
		sh.translate(0, 0, -bt / 2 - ht - 6000 - 70_000);
		const spM = hw('#d7dadd', 0.4, 0.4);
		this.addOwn('blade', 'spindle', spM, sh, 'air spindle, 20000 rpm (F163), 1.5 kW class (F165); size template');
		this.addOwn('blade', 'spindle', spM, box(Rb * 2 + 16_000, Rb + 12_000, 14_000, 0, (Rb + 12_000) / 2 + Rb * 0.25, -2000), 'blade cover (template)');
		const water = hw('#a8c8e8', 0.05, 0, { transparent: true, opacity: 0.5, depthWrite: false });
		for (const k of [-1, 1]) {
			const p0 = new THREE.Vector3(-Rb - 6000, Rb * 0.35, k * 6000);
			const p1 = new THREE.Vector3(-Rb * 0.3, -Rb + ex * 0.4, k * 1200);
			this.add('blade', 'steel', rod(new THREE.Vector3(Rb + 8000, Rb * 0.4, k * 6000), p0, 2200, 10), 'blade cooler nozzle pipe (F163: water jet cooling; layout template F169)');
			const j = this.ownMesh('blade', water, rod(p0, p1, 700, 8), 'coolant jet at the blade edge (flow not found, F169)');
			j.name = `jet${k}`;
		}
		this.mist = this.points('blade', 300, '#d9ecff', 1.4, 0.6, 'coolant spray at the cut (illustrative)', false);
	}

	private pose(args: ToolArgs, ctx: ToolCtx, f: ToolFrame): { x: number; z: number; alongY: boolean; i: number; n: number; cutting: boolean } {
		const cuts = this.cuts(f, args);
		const n = cuts.length;
		const R = carrierSize(f).r;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const xx = u * n;
		const i = Math.min(n - 1, Math.floor(xx));
		const along = xx - i;
		const [px, py, alongY] = cuts[i] ?? [0, 0, true];
		const o = alongY ? px : py;
		const c = Math.sqrt(Math.max(0, R * R - o * o)) + 5000;
		const t = -c + along * 2 * c;
		// piece frame (x, y) -> tool frame (x, -y)
		return alongY ? { x: px, z: -t, alongY, i, n, cutting: ctx.phase === 'process' } : { x: t, z: -py, alongY, i, n, cutting: ctx.phase === 'process' };
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const C = carrierCenter(f);
		const e = engage(t, ctx);
		const yb = backY(f, args, 100);
		const tape = num(args, s, 'tape_um') * (f.scale === 'work' && f.illustrative ? 4 : 1);
		const cutY = yb - Math.min(num(args, s, 'tape_cut_um'), tape * 0.8);
		const p = this.pose(args, ctx, f);
		const bl = this.rig('blade');
		let x = C.x + p.x, z = C.z + p.z;
		if (f.scale !== 'work') {
			// block: the street along x at the unit edge, swept through the window
			const bw = blockWin(f);
			const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
			x = bw.x0 - this.Rb - bw.span + u * (bw.x1 - bw.x0 + 2 * this.Rb + 2 * bw.span);
			z = -(f.unit.d_um / 2 + num(args, s, 'street_um') / 2 - f.focus_um.y); // street at the unit's +y edge
		}
		// approach: descend from 20 mm; retract (audit final F11): lift clear by 80 mm and exit past the piece edge, so at
		// t = 1 no part is over the wafer
		const { ret } = phaseProgress(t, ctx);
		const lift = (1 - e) * 20_000 + smooth(ret) * 80_000;
		if (f.scale === 'work' && ret > 0) {
			const out = smooth(ret) * (carrierSize(f).r + this.Rb + 60_000);
			if (p.alongY) z -= out;
			else x += out;
		}
		bl.position.set(x, cutY + this.Rb + lift, z);
		bl.visible = !(f.scale === 'work' && ret >= 0.999);
		bl.rotation.y = p.alongY && f.scale === 'work' ? Math.PI / 2 : 0;
		this.rig('spin').rotation.z = -spin(num(args, s, 'spindle_rpm'), ctx, { features: 3, f, r_um: this.Rb });
		for (const k of [-1, 1]) {
			const j = bl.getObjectByName(`jet${k}`);
			if (j) j.visible = e > 0.5;
		}
		const m = this.mist!;
		const nn = (m.geometry.attributes.position as THREE.BufferAttribute).count;
		let k = 0;
		for (let i = 0; i < nn && p.cutting; i++) {
			const sP = fract(hash(i, 81) + 1.4 * ctx.tPlay_s);
			const a = Math.PI * (0.55 + 0.4 * hash(i, 82));
			const r = this.Rb + sP * 25_000;
			setPt(m, k++, r * Math.cos(a), -this.Rb * 0.98 + sP * 12_000 * hash(i, 83) + (r - this.Rb) * 0.2, (hash(i, 84) - 0.5) * 6000);
		}
		ptsDone(m, k);
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const f = this.frame;
		const p = f ? this.pose(args, ctx, f) : null;
		return [
			{ key: 'rpm', label: 'spindle', value: num(args, s, 'spindle_rpm'), unit: 'rpm', status: stat(args, s, 'spindle_rpm') },
			{ key: 'feed', label: 'feed', value: num(args, s, 'feed_mm_s'), unit: 'mm/s', status: stat(args, s, 'feed_mm_s') },
			{ key: 'kerf', label: 'kerf', value: num(args, s, 'kerf_um'), unit: 'um', status: stat(args, s, 'kerf_um') },
			{ key: 'line', label: p?.alongY ? 'street (along y)' : 'street (along x)', value: live(ctx, 'line') ?? (p ? p.i + 1 : null), unit: `of ${live(ctx, 'lines') ?? p?.n ?? 'N/A'}`, status: 'derived', note: 'chuck turned 90 deg for the second direction (drawn as the blade turned, wafer frame)' },
			{ key: 'od', label: 'blade OD', value: num(args, s, 'blade_od_mm'), unit: 'mm', status: stat(args, s, 'blade_od_mm') }
		];
	}
	defaultDuration(args: ToolArgs): number | null {
		if (!this.frame) return null;
		const R = carrierSize(this.frame).r / 1000;
		let L = 0;
		for (const [x, y, ay] of this.cuts(this.frame, args)) {
			const o = (ay ? x : y) / 1000;
			L += 2 * Math.sqrt(Math.max(0, R * R - o * o));
		}
		return L / num(args, this.spec, 'feed_mm_s');
	}
}

export const createLaserDebond = (args?: ToolArgs) => new LaserDebond(args);
export const createDicingBlade = (args?: ToolArgs) => new DicingBlade(args);
