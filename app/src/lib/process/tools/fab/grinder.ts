// Surface grinder (op grind; backgrind, mold grind, TSV-reveal grind): cup wheel with discrete diamond segments on the
// rim, spindle on a Z infeed, porous ceramic vacuum chuck table rotating opposite to the wheel, coolant into the cup.
// The rim passes over the chuck centre (F123), so the wheel axis sits one rim radius from the wafer centre and the
// contact is one arc from centre to edge; saw marks are arcs of the rim radius radiating from the centre (F128, F133).
// RESEARCH_TOOLS_FAB.md sections 8-10 (F122-F151). Same actor for Si thinning, TSV reveal and mold grind (F122).

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	FabBase,
	backY,
	box,
	carrierCenter,
	carrierSize,
	cylY,
	der,
	engage,
	hw,
	live,
	num,
	patterned,
	planeY,
	rep,
	ringY,
	rod,
	sector,
	spin,
	stat,
	tpl,
	type Readout
} from './common';

const LIFT_UM = 25_000; // view parameter: wheel clearance before the infeed starts
/** View parameter: wheel axis direction from the wafer centre (rad, from +x toward -z), away from the default work
 * camera (+x +z) so the spindle never sits between the camera and the wafer (audit V1 C1). */
const WHEEL_DIR = (2 * Math.PI) / 3;

export const GRINDER_SPEC: Record<string, PDim> = {
	wheel_d_mm: rep(300, 'mm', 'F129', 'phi 300 mm diamond wheel for 300 mm wafers (DGP8761); 200 mm wafers use the phi 200 mm wheel (DAG811, same row)'),
	seg_n: rep(42, '1', 'F132', '42 diamond teeth (4-in wafers, bronze-bond #325/400 wheel; med)'),
	seg_h_mm: tpl(5, 'mm', 'segment height not found; inside the 1-10 mm abrasive-layer options listed in F138', undefined, ['F138']),
	seg_w_mm: tpl(3, 'mm', 'segment (rim) radial width not found (F138)', undefined, ['F138']),
	seg_fill: tpl(0.72, '1', 'segment arc length / segment pitch not found (F138)', undefined, ['F138']),
	wheel_rpm: rep(6000, 'rpm', 'F128', 'example; 3000-5000 rpm rough (F126), 1000-6000 rpm fine (F127)'),
	chuck_rpm: rep(300, 'rpm', 'F128', 'example; 100-300 rpm (F126), 100-400 rpm (F127)'),
	feed_rough_um_s: der(5, 'um/s', 'midpoint of the 4-6 um/s rough lowering speed', ['F126'], '(4 + 6) / 2'),
	feed_p1_um_s: rep(0.25, 'um/s', 'F124', '#2000 wheel, phase 1'),
	feed_p2_um_s: rep(0.12, 'um/s', 'F124'),
	feed_p3_um_s: rep(0.05, 'um/s', 'F124'),
	rough_stop_um: der(30, 'um', 'midpoint of 20-40 um above the final thickness', ['F125'], '(20 + 40) / 2'),
	coolant_l_min: der(6, 'L/min', 'midpoint of the 2-10 L/min range', ['F127'], '(2 + 10) / 2'),
	ra_rough_um: der(0.8, 'um', 'midpoint of Ra 0.486-1.118 um after the #325/400 wheel', ['F132'], '(0.486 + 1.118) / 2'),
	ra_fine_um: rep(0.015, 'um', 'F134', '#2000 grind'),
	wheel_base_h_mm: tpl(22, 'mm', 'aluminium wheel base (cup) height not found'),
	chuck_margin_mm: tpl(6, 'mm', 'chuck frame ring beyond the porous area not found'),
	chuck_h_mm: tpl(45, 'mm', 'chuck table height not found'),
	spindle_d_mm: tpl(180, 'mm', 'spindle housing diameter not found (DAG811: 4.2 kW spindle, F130)', undefined, ['F130']),
	nozzle_d_mm: tpl(4, 'mm', 'coolant nozzle bore and layout not found (F138 gap)', undefined, ['F138'])
};

export class Grinder extends FabBase {
	readonly id = 'grinder';
	readonly name = 'Surface grinder (cup wheel)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = GRINDER_SPEC;
	protected override blockParts(): string[] {
		return ['wheel|own:seg'];
	}
	protected override occluderParts(): string[] {
		return ['spindle|own:housing', 'spindle|steel', 'spindle|own'];
	}
	private Rw = 150_000; // wheel radius (outer)
	private off = 0;

	private wheelR(f: ToolFrame, args: ToolArgs): number {
		const a = num(args, this.spec, 'wheel_d_mm');
		const W = carrierSize(f);
		// F129: 300 mm wheel for 300 mm wafers, 200 mm wheel for 200 mm wafers
		const d = (args as Record<string, unknown>).wheel_d_mm !== undefined ? a : W.disk && W.w <= 200_000 + 1 ? 200 : a;
		return (d * 1000) / 2;
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = this.wheelR(f, args);
		this.Rw = R;
		const sw = mm('seg_w_mm');
		const sh = mm('seg_h_mm');
		this.off = R - sw / 2; // F123: rim over the chuck centre
		const n = Math.round(num(args, s, 'seg_n'));
		const fill = num(args, s, 'seg_fill');

		// ---------------- chuck table (rotates with the wafer)
		const ch = this.rig('chuck');
		ch.position.set(C.x, 0, C.z);
		const yb = backY(f, args, 1545);
		const cm = mm('chuck_margin_mm');
		const chH = mm('chuck_h_mm');
		const Rc = W.disk ? W.r : Math.max(W.w, W.d) / 2;
		const por = patterned(hw('#cfccc4', 0.95, 0), 3, 250, 120, '#9c988e');
		this.addOwn('chuck', 'porous', por, cylY(Rc - 500, yb - 6000, yb, 0, 0, 160), 'porous ceramic vacuum chuck (F123: wafer clamped to a rotating chuck table); pore look template');
		this.add('chuck', 'steel', ringY(Rc - 500, Rc + cm, yb - 6000, yb - 200, 160), 'chuck frame ring (dense ceramic / steel; size template)');
		const tableM = hw('#5d6168', 0.5, 0.5);
		this.addOwn('chuck', 'table', tableM, cylY(Rc + cm + 4000, yb - chH, yb - 6000, 0, 0, 128), 'chuck table, 300 rpm (F128); size template');
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			this.addOwn('chuck', 'table', tableM, box(9000, 3000, 4000, (Rc + cm + 1500) * Math.cos(a), yb - chH * 0.5, -(Rc + cm + 1500) * Math.sin(a)), 'table clamp blocks (show chuck rotation)');
		}
		this.addOwn('base', 'deck', hw('#2b2e33', 0.7, 0.2), cylY(Rc * 3.2, yb - chH - 15_000, yb - chH, C.x - Rc * 0.9 * Math.cos(WHEEL_DIR), C.z + Rc * 0.9 * Math.sin(WHEEL_DIR), 96), 'turntable (F131: 4 chuck tables on a turntable; one shown)');

		// ---------------- wheel (rotates) on the spindle (translates in Z)
		const sp = this.rig('spindle');
		sp.position.set(C.x + this.off * Math.cos(WHEEL_DIR), 0, C.z - this.off * Math.sin(WHEEL_DIR));
		sp.rotation.y = WHEEL_DIR; // spindle local +x points away from the wafer centre
		const wh = this.rig('wheel', 'spindle');
		const segMat = hw('#3c3a37', 0.75, 0.25);
		const pitch = (Math.PI * 2) / n;
		for (let i = 0; i < n; i++) {
			const a0 = i * pitch;
			this.addOwn('wheel', 'seg', segMat, sector(R - sw, R, a0, a0 + pitch * fill, 0, sh, 4), `diamond segments (${n} teeth, F132; size template F138)`);
		}
		const bh = mm('wheel_base_h_mm');
		this.add('wheel', 'al', ringY(R - sw - 4000, R + 1500, sh, sh + 10_000, 160), 'wheel base rim (aluminium; template)');
		this.add('wheel', 'al', ringY(55_000, R + 1500, sh + 10_000, sh + bh, 160), 'wheel base web (template)');
		this.add('wheel', 'steel', box(30_000, 4000, 8000, R - 30_000, sh + bh + 2000, 0), 'wheel key (shows rotation)');
		this.add('wheel', 'steel', cylY(55_000, sh + 10_000, sh + bh + 18_000, 0, 0, 64), 'wheel mount / flange (template)');
		this.add('wheel', 'steel', cylY(35_000, sh + bh + 18_000, sh + bh + 70_000, 0, 0, 48), 'spindle shaft (template)');
		const Rs = mm('spindle_d_mm') / 2;
		const ys = sh + bh + 70_000;
		const houseM = hw('#c9ccd0', 0.45, 0.35);
		this.addOwn('spindle', 'housing', houseM, cylY(Rs, ys, ys + 200_000, 0, 0, 96), 'air spindle housing, 1000-7000 rpm, 4.2 kW class (F130); size template');
		this.addOwn('spindle', 'housing', houseM, box(Rs * 1.5, 30_000, Rs * 1.1, -Rs * 0.2, ys + 215_000, 0), 'Z infeed carriage (template)');
		// coolant nozzles (fixed to the housing) aiming into the cup, near the contact arc
		const rn = mm('nozzle_d_mm') / 2;
		const water = hw('#a8c8e8', 0.05, 0, { transparent: true, opacity: 0.45, depthWrite: false });
		for (const k of [-1, 1]) {
			const ox = -this.off * 0.55;
			const oz = k * 40_000;
			const n0 = new THREE.Vector3(-R * 0.35, ys - 10_000, k * 70_000);
			const n1 = new THREE.Vector3(ox, sh + 6000, oz);
			this.add('spindle', 'steel', rod(new THREE.Vector3(-Rs * 0.6, ys, k * 60_000), n0, rn + 3000, 12), 'coolant pipe (layout template, F138 gap)');
			const st = this.ownMesh('spindle', water, rod(n0, n1, rn, 10, rn * 1.6), 'coolant (water) into the cup, 2-10 L/min (F127)');
			st.name = `jet${k}`;
			st.renderOrder = 4;
		}
	}

	/** Wafer on the chuck plus the wheel rim over it (the contact arc runs from the centre to the edge, F123). */
	override focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 {
		const b = super.focusBox(t, args, ctx);
		const f = this.frame;
		if (f?.scale === 'work') {
			b.max.y = Math.max(b.max.y, num(args, this.spec, 'seg_h_mm') * 1000 + num(args, this.spec, 'wheel_base_h_mm') * 1000);
			// include a stretch of the rim beyond the piece toward the wheel axis (small pieces sit under a 300 mm wheel)
			const W = carrierSize(f);
			const C = carrierCenter(f);
			const ext = Math.min(this.off, Math.max(W.w, W.d) * 0.6);
			b.expandByPoint(new THREE.Vector3(C.x + (W.r + ext) * Math.cos(WHEEL_DIR), 0, C.z - (W.r + ext) * Math.sin(WHEEL_DIR)));
		}
		return b;
	}
	workRot(_t: number, args: ToolArgs, ctx: ToolCtx): number {
		return spin(num(args, this.spec, 'chuck_rpm'), ctx, { features: 6, f: this.frame, dir: -1 });
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const e = engage(t, ctx);
		const yPl = planeY(f, ctx);
		const sp = this.rig('spindle');
		const C = carrierCenter(f);
		const chuckA = this.workRot(t, args, ctx);
		if (f.scale === 'work') sp.position.set(C.x + this.off * Math.cos(WHEEL_DIR), yPl + (1 - e) * LIFT_UM, C.z - this.off * Math.sin(WHEEL_DIR));
		else {
			// block: wafer frame (the block does not rotate); the wheel axis orbits the wafer centre at the chuck rate
			const a = WHEEL_DIR - chuckA;
			sp.position.set(C.x + this.off * Math.cos(a), yPl + (1 - e) * LIFT_UM, C.z - this.off * Math.sin(a));
		}
		this.rig('wheel').rotation.y = spin(num(args, s, 'wheel_rpm'), ctx, { features: Math.round(num(args, s, 'seg_n')), f, r_um: this.Rw });
		this.rig('chuck').rotation.y = chuckA;
		const on = e > 0.6;
		for (const k of [-1, 1]) {
			const j = sp.getObjectByName(`jet${k}`);
			if (j) j.visible = on;
		}
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const st = live(ctx, 'stage');
		const nst = live(ctx, 'stages');
		const fine = st !== null && nst !== null && nst > 1 && st >= nst;
		return [
			{ key: 'wheel', label: 'wheel', value: num(args, s, 'wheel_rpm'), unit: 'rpm', status: stat(args, s, 'wheel_rpm') },
			{ key: 'chuck', label: 'chuck table (opposite)', value: num(args, s, 'chuck_rpm'), unit: 'rpm', status: stat(args, s, 'chuck_rpm') },
			{ key: 'wheel_d', label: 'wheel diameter', value: (this.Rw * 2) / 1000, unit: 'mm', status: 'reported', note: 'F129 (300 mm / 200 mm by wafer size)' },
			{ key: 'stage', label: 'stage', value: st, unit: `of ${nst ?? 'N/A'}`, status: 'derived', note: 'Z1 rough #320-#400, Z2 fine #2000 (F125, F131)' },
			{ key: 'feed', label: 'infeed', value: fine ? num(args, s, 'feed_p1_um_s') : num(args, s, 'feed_rough_um_s'), unit: 'um/s', status: fine ? stat(args, s, 'feed_p1_um_s') : stat(args, s, 'feed_rough_um_s'), note: 'op stage feeds override (engine HUD)' },
			{ key: 'removed', label: 'removed', value: live(ctx, 'removed_um'), unit: 'um', status: 'derived' },
			{ key: 'coolant', label: 'coolant', value: num(args, s, 'coolant_l_min'), unit: 'L/min', status: stat(args, s, 'coolant_l_min') },
			{ key: 'ra', label: 'Ra after stage', value: fine ? num(args, s, 'ra_fine_um') : num(args, s, 'ra_rough_um'), unit: 'um', status: fine ? 'reported' : 'derived' },
			{ key: 'contact', label: 'wheel on wafer', value: engage(t, ctx) > 0.98 ? 1 : 0, unit: '1', status: 'derived' }
		];
	}
}

export const createGrinder = (args?: ToolArgs) => new Grinder(args);
