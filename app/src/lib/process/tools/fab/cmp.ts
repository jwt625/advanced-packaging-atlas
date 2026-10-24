// CMP polisher (op cmp): rotating platen with a concentric-grooved pad, carrier head (retaining ring, membrane zones)
// holding the wafer face down, head rotation + radial oscillation, diamond pad conditioner sweeping on its arm,
// slurry arm with a stream onto the pad and a milky slurry film. RESEARCH_TOOLS_FAB.md section 7 (F102-F121).
// Face-down process: in the tool frame (+Y toward the tool) the pad is ABOVE the wafer face, the head BEHIND the
// wafer (y < 0), and gravity points +Y; the engine should draw the scene turned over (faceDown) so the machine
// reads as it stands. Kinematics in the wafer frame: the head is fixed on the wafer axis (it rotates), the platen
// (with conditioner and slurry arm) oscillates radially relative to it (equivalent to the head's slot oscillation).

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

const PSI_KPA = 6.894757; // 1 psi = 6.894757 kPa (exact definition via lbf and inch)
const LIFT_UM = 60_000; // view parameter: platen clearance before contact (approach / retract)
const PH_END = 0.93; // slurry stream off shortly after the process window (view parameter)

export const CMP_SPEC: Record<string, PDim> = {
	platen_d_mm: rep(762, 'mm', 'F110', '"about thirty inches" pad / platen for a 300 mm polisher'),
	pad_groove_w_mm: rep(0.508, 'mm', 'F113', 'concentric (1010) groove 0.020 in wide'),
	pad_groove_depth_mm: rep(0.762, 'mm', 'F113', '0.030 in deep'),
	pad_groove_pitch_mm: rep(3.048, 'mm', 'F113', '0.120 in pitch'),
	pad_h_mm: tpl(2.0, 'mm', 'pad thickness not in the research; must exceed the 0.76 mm groove depth (F113)', undefined, ['F113']),
	platen_h_mm: tpl(40, 'mm', 'platen thickness not found; drawn only for the machine read'),
	platen_rpm: rep(113, 'rpm', 'F102', 'Reflexion, IC1010 pad, Method 1'),
	head_rpm: rep(107, 'rpm', 'F102'),
	down_psi: rep(3.0, 'psi', 'F102', 'bulk Cu step; 1.4 psi soft landing in the same patent'),
	down_kpa: der(3.0 * PSI_KPA, 'kPa', 'down_psi x 6.894757 kPa/psi', ['F102'], '3.0 x 6.894757'),
	ring_psi: rep(8.7, 'psi', 'F103', 'retaining ring pressure at 3.0 psi'),
	zones_n: rep(5, '1', 'F103', 'membrane zones 1-5 + retaining ring'),
	wafer_offset_mm: tpl(180, 'mm', 'wafer-centre to platen-centre distance not found (F109 gap 1); chosen so wafer + ring fit inside the 381 mm pad radius', undefined, ['F109']),
	osc_amp_mm: tpl(15, 'mm', 'head oscillates radially in a slot (F111); amplitude not found (gap 1)', undefined, ['F111']),
	ring_w_mm: tpl(25, 'mm', 'retaining ring radial width not found (F111 names the ring only)', undefined, ['F111']),
	ring_h_mm: tpl(20, 'mm', 'retaining ring height not found', undefined, ['F111']),
	ring_gap_mm: tpl(1, 'mm', 'wafer-to-ring radial clearance not found'),
	ring_grooves_n: tpl(12, '1', 'radial slurry grooves on the ring face; count not found'),
	head_h_mm: tpl(90, 'mm', 'carrier head housing height not found'),
	cond_d_mm: rep(107.95, 'mm', 'F114', '3M A2810, 4.25 in, 181 um diamond, Cu bulk'),
	cond_rpm: rep(87, 'rpm', 'F104'),
	cond_sweeps_min: rep(10, '1/min', 'F104', 'sinusoidal sweep'),
	cond_force_lbf: rep(5, 'lbf', 'F104'),
	cond_r_in_mm: tpl(110, 'mm', 'inner end of the conditioner sweep on the pad not found', undefined, ['F104']),
	cond_r_out_mm: tpl(320, 'mm', 'outer end of the conditioner sweep on the pad not found', undefined, ['F104']),
	slurry_ml_min: rep(300, 'ml/min', 'F102'),
	slurry_r_mm: tpl(60, 'mm', 'dispense point radius on the pad not found (F111: arm wets the entire pad)', undefined, ['F111']),
	slurry_nozzle_d_mm: tpl(3, 'mm', 'nozzle bore not found'),
	slurry_film_um: tpl(20, 'um', 'slurry film thickness between pad and wafer not found; drawn gap only'),
	rr_um_min: der(1.0268, 'um/min', '10268 A/min at 3.0 psi (Table 4, 0.58 h)', ['F105'], '10268 A x 1e-4'),
	rr_soft_um_min: der(0.4591, 'um/min', '4591 A/min at 1.4 psi', ['F105'], '4591 A x 1e-4')
};

export class Cmp extends FabBase {
	readonly id = 'cmp';
	readonly name = 'CMP polisher';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = CMP_SPEC;
	protected override blockParts(): string[] {
		return ['platen|own:pad', 'platen|slurry'];
	}
	override readonly faceDown = true;
	private yPad = 20;
	private condPivot = new THREE.Vector3();
	private condArm = 0;
	private condTh: [number, number] = [0, 0];

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const Rp = mm('platen_d_mm') / 2;
		const Rcc = mm('wafer_offset_mm');
		const padH = mm('pad_h_mm');
		const platH = mm('platen_h_mm');
		const film = num(args, s, 'slurry_film_um');
		// film thickness floor so the slurry layer resolves at the work scale (illustrative only)
		this.yPad = f.illustrative && f.scale === 'work' ? Math.max(film, 300) : film;
		const yP = this.yPad;
		const Rw = W.r;

		// ---------------- machine (platen + pad + film + conditioner + slurry arm), oscillates in x
		const mach = this.rig('machine');
		mach.position.set(0, 0, 0);
		const plat = this.rig('platen', 'machine');
		plat.position.set(C.x + Rcc, 0, C.z);
		this.add('platen', 'steel', cylY(Rp, yP + padH, yP + padH + platH, 0, 0, 160), 'platen (F110: ~30 in for a 300 mm polisher; thickness template)');
		this.add('platen', 'steel', ringY(Rp - 6000, Rp + 4000, yP + padH + platH * 0.5, yP + padH + platH + 6000, 160), 'platen rim (template)');
		const pad = patterned(
			hw('#c9b46e', 0.88, 0, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }),
			1,
			mm('pad_groove_pitch_mm'),
			mm('pad_groove_w_mm'),
			'#5b4d28',
			undefined,
			0.12
		);
		this.addOwn('platen', 'pad', pad, cylY(Rp, yP, yP + padH, 0, 0, 200), 'polishing pad, concentric grooves 0.51 wide x 0.76 deep at 3.05 mm pitch (F113); polyurethane colour template; wear streaks illustrative');
		const sl = this.mesh('platen', 'slurry', cylY(Rp - 3000, yP * 0.15, yP * 0.95, 0, 0, 160), 'slurry film on the pad: milky-white silica dispersion (F115), 300 ml/min (F102); film thickness template');
		sl.renderOrder = 2;

		// conditioner: pivot outside the platen at +30 deg (toward -z), arm sweeps the disk between two pad radii
		const aPiv = (30 * Math.PI) / 180;
		const rPiv = Rp + 70_000;
		this.condPivot.set(C.x + Rcc + rPiv * Math.cos(aPiv), 0, C.z - rPiv * Math.sin(aPiv));
		const L = 400_000;
		this.condArm = L;
		// arm angles where the disk centre sits at r_in / r_out from the platen centre (law of cosines)
		const P = new THREE.Vector2(rPiv * Math.cos(aPiv), rPiv * Math.sin(aPiv)); // angle plane: (x, -z)
		const angAt = (r: number) => {
			const d = P.length();
			const cosB = (d * d + L * L - r * r) / (2 * d * L);
			const b = Math.acos(Math.max(-1, Math.min(1, cosB)));
			const toC = Math.atan2(-P.y, -P.x); // direction pivot -> platen centre
			return toC + b;
		};
		this.condTh = [angAt(mm('cond_r_in_mm')), angAt(mm('cond_r_out_mm'))];
		const cRig = this.rig('cond', 'machine');
		cRig.position.copy(this.condPivot);
		const Rc = mm('cond_d_mm') / 2;
		const yArm = yP - 70_000;
		const disk = this.rig('condDisk', 'cond');
		disk.position.set(L, 0, 0);
		const dia = patterned(hw('#55585c', 0.55, 0.6), 3, 400, 180, '#c9d2d8');
		this.addOwn('condDisk', 'dia', dia, cylY(Rc, yP - 8000, yP, 0, 0, 64), 'pad conditioner disk, 4.25 in (107.95 mm), 181 um diamond (F114), 87 rpm, 5 lbf (F104); thickness template');
		this.add('condDisk', 'steel', cylY(Rc * 0.75, yP - 38_000, yP - 8000, 0, 0, 48), 'conditioner holder / gimbal (template)');
		this.add('condDisk', 'steel', box(16_000, 8000, 16_000, Rc * 0.55, yP - 34_000, 0), 'holder key (shows disk rotation)');
		this.add('cond', 'steel', box(L, 26_000, 50_000, L / 2, yArm, 0), 'conditioner arm, 10 sinusoidal sweeps/min (F104); arm geometry template');
		this.add('cond', 'steel', cylY(30_000, yArm - 13_000, yP + padH + platH + 70_000, 0, 0, 32), 'conditioner pivot post (template)');

		// slurry arm: pivot outside the platen at -60 deg, tip over the dispense radius
		const aS = (-60 * Math.PI) / 180;
		const sRig = this.rig('slurryArm', 'machine');
		const piv = new THREE.Vector3(C.x + Rcc + (Rp + 60_000) * Math.cos(aS), 0, C.z - (Rp + 60_000) * Math.sin(aS));
		sRig.position.copy(piv);
		const tip = new THREE.Vector3(C.x + Rcc + mm('slurry_r_mm') * Math.cos(aS + 0.5), 0, C.z - mm('slurry_r_mm') * Math.sin(aS + 0.5)).sub(piv);
		const yS = yP - 40_000;
		this.add('slurryArm', 'steel', rod(new THREE.Vector3(0, yS, 0), new THREE.Vector3(tip.x, yS, tip.z), 9000, 16), 'combined slurry / rinse arm (F111); geometry template');
		this.add('slurryArm', 'steel', cylY(22_000, yS - 9000, yP + padH + platH + 70_000, 0, 0, 24), 'slurry arm post (template)');
		const rN = mm('slurry_nozzle_d_mm') / 2;
		this.add('slurryArm', 'steel', cylY(rN + 2500, yS, yS + 25_000, tip.x, tip.z, 16), 'slurry nozzle (bore template)');
		const st = this.mesh('slurryArm', 'slurry#stream', cylY(rN, yS + 25_000, yP, tip.x, tip.z, 12, rN * 1.15), 'slurry stream 300 ml/min (F102)');
		st.name = 'stream';
		st.renderOrder = 3;

		// machine deck under the platen (far side in the tool frame)
		const yDeck = yP + padH + platH + 70_000;
		this.addOwn('machine', 'deck', hw('#2b2e33', 0.7, 0.2), box(1_500_000, 12_000, 1_250_000, C.x + Rcc, yDeck + 6000, C.z), 'machine deck (template)');
		this.add('platen', 'steel', cylY(Rp * 0.35, yP + padH + platH, yDeck, 0, 0, 64), 'platen drive (template)');

		// ---------------- carrier head on the wafer axis (behind the wafer, y < 0)
		const head = this.rig('head');
		head.position.set(C.x, 0, C.z);
		const g = mm('ring_gap_mm');
		const rI = Rw + g;
		const rO = rI + mm('ring_w_mm');
		const rH = mm('ring_h_mm');
		const gd = 3000;
		const ng = Math.round(num(args, s, 'ring_grooves_n'));
		const ring = hw('#d8cfb8', 0.6, 0);
		this.addOwn('head', 'ring', ring, ringY(rI, rO, -rH, -gd, 160), 'retaining ring, 8.7 psi at 3.0 psi down force (F103); size template');
		const gw = 3000 / ((rI + rO) / 2);
		for (let i = 0; i < ng; i++) {
			const a0 = (i / ng) * Math.PI * 2 + gw / 2;
			const a1 = ((i + 1) / ng) * Math.PI * 2 - gw / 2;
			this.addOwn('head', 'ring', ring, sector(rI, rO, a0, a1, -gd, 0, 10), 'retaining ring face with radial slurry grooves (count template)');
		}
		const yb = backY(f, args, 775);
		const hh = mm('head_h_mm');
		this.addOwn('head', 'membrane', hw('#2a2b2e', 0.8, 0), cylY(Rw - 1000, -rH, Math.min(yb, -1), 0, 0, 128), `flexible membrane, ${num(args, s, 'zones_n')} pressure zones (F103, F111)`);
		this.add('head', 'al', cylY(rO + 8000, -rH - hh, -rH, 0, 0, 128), 'carrier head housing (F111; size template)');
		this.add('head', 'al', cylY(rO * 0.7, -rH - hh - 25_000, -rH - hh, 0, 0, 96), 'head top (template)');
		this.add('head', 'al', cylY(35_000, -rH - hh - 200_000, -rH - hh - 25_000, 0, 0, 32), 'head spindle (template)');
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			this.add('head', 'al', cylY(7000, -rH - hh - 5000, -rH - hh, (rO - 20_000) * Math.cos(a), -(rO - 20_000) * Math.sin(a), 12), 'housing bolts (show head rotation)');
		}
	}

	private condAngle(ctx: ToolCtx): number {
		const [a, b] = this.condTh;
		const fq = ctx.reduceMotion ? 0 : 0.35; // visual sweep rate; real 10 sweeps/min (F104)
		return (a + b) / 2 + ((b - a) / 2) * Math.sin(2 * Math.PI * fq * ctx.tPlay_s);
	}
	workRot(_t: number, args: ToolArgs, ctx: ToolCtx): number {
		return spin(num(args, this.spec, 'head_rpm'), ctx, { features: 8, f: this.frame });
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const e = engage(t, ctx);
		const amp = num(args, s, 'osc_amp_mm') * 1000;
		const Rcc = num(args, s, 'wafer_offset_mm') * 1000;
		const osc = ctx.reduceMotion ? 0 : amp * Math.sin(2 * Math.PI * 0.15 * ctx.tPlay_s);
		// removal: the wafer face moves away from the pad by the removed thickness; the machine follows (contact)
		const yPl = planeY(f, ctx);
		this.rig('machine').position.set(-osc, yPl + (1 - e) * LIFT_UM, 0);
		this.rig('platen').rotation.y = spin(num(args, s, 'platen_rpm'), ctx, { features: 1, f, r_um: Rcc });
		this.rig('head').rotation.y = this.workRot(t, args, ctx);
		const cond = this.rig('cond');
		cond.rotation.y = this.condAngle(ctx);
		this.rig('condDisk').rotation.y = spin(num(args, s, 'cond_rpm'), ctx, { features: 2 });
		const on = t > 0.01 && t < PH_END;
		const stream = this.rig('slurryArm').getObjectByName('stream');
		if (stream) stream.visible = on;
		this.setMat('slurry', { front: Math.min(1, 0.15 + e * 0.85), wet: 1 });
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const v = (2 * Math.PI * num(args, s, 'platen_rpm') * (num(args, s, 'wafer_offset_mm') / 1000)) / 60;
		const rr = live(ctx, 'rr_nm_min');
		return [
			{ key: 'platen_rpm', label: 'platen', value: num(args, s, 'platen_rpm'), unit: 'rpm', status: stat(args, s, 'platen_rpm') },
			{ key: 'head_rpm', label: 'head', value: num(args, s, 'head_rpm'), unit: 'rpm', status: stat(args, s, 'head_rpm'), note: 'same direction as the platen (direction not stated in F102; assumption)' },
			{ key: 'down', label: 'down force', value: num(args, s, 'down_psi'), unit: 'psi', status: stat(args, s, 'down_psi'), note: `${num(args, s, 'down_kpa').toFixed(1)} kPa; ring ${num(args, s, 'ring_psi')} psi (F103)` },
			{ key: 'slurry', label: 'slurry flow', value: num(args, s, 'slurry_ml_min'), unit: 'ml/min', status: stat(args, s, 'slurry_ml_min') },
			{ key: 'cond', label: 'conditioner', value: num(args, s, 'cond_rpm'), unit: 'rpm', status: stat(args, s, 'cond_rpm'), note: `${num(args, s, 'cond_force_lbf')} lbf, ${num(args, s, 'cond_sweeps_min')} sweeps/min (F104)` },
			{ key: 'v_rel', label: 'pad speed at wafer centre', value: +v.toFixed(2), unit: 'm/s', status: 'template', note: '2 pi n_platen R_cc; R_cc is template (F109 gap)' },
			{ key: 'rr', label: 'removal rate', value: rr !== null ? rr : num(args, s, 'rr_um_min') * 1000, unit: 'nm/min', status: rr !== null ? 'reported' : 'derived', note: 'op value when given, else F105 at 3.0 psi' },
			{ key: 'removed', label: 'removed', value: live(ctx, 'removed_um'), unit: 'um', status: 'derived' },
			{ key: 'engaged', label: 'pad contact', value: engage(t, ctx) > 0.98 ? 1 : 0, unit: '1', status: 'derived' }
		];
	}
}


export const createCmp = (args?: ToolArgs) => new Cmp(args);
