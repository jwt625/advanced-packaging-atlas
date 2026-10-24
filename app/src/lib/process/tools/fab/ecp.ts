// Electroplating cell (op plate): wafer face down in a clamshell (cup with lip seal + cone) on a rotating spindle,
// ionically resistive perforated plate a few mm under the wafer with a cross-flow gap, cation exchange membrane,
// anode below; Cu2+ flux from the anode to the wafer and electrolyte cross flow (illustrative particles, density
// scaled by the op's plating rate). RESEARCH_TOOLS_FAB.md section 4 (F50-F74). Face-down process (see cmp.ts).

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
	der,
	engage,
	fract,
	hash,
	hw,
	live,
	num,
	patterned,
	ptsDone,
	rep,
	ringY,
	rod,
	setPt,
	spin,
	stat,
	tpl,
	type Readout
} from './common';

const LIFT_UM = 70_000; // view parameter: bath clearance before immersion

const PLATE_N = 9000; // midpoint of 6000-12000 holes (F51)
const OPEN = 0.035; // midpoint of 2-5 % open area (F51)
const PITCH_MM = Math.sqrt((Math.PI * 150 * 150) / PLATE_N);
const HOLE_MM = PITCH_MM * Math.sqrt((4 * OPEN) / Math.PI);

export const ECP_SPEC: Record<string, PDim> = {
	spin_rpm: rep(50, 'rpm', 'F54', '50-100 rpm during TSV plating; lower bound shown'),
	plate_gap_mm: rep(5, 'mm', 'F51', 'resistive element within about 5 mm (preferred) to 10 mm of the wafer'),
	cross_flow_mm: der(2.5, 'mm', 'midpoint of the 1-4 mm cross-flow manifold height', ['F51'], '(1 + 4) / 2'),
	holes_n: der(PLATE_N, '1', 'midpoint of 6000-12000 non-communicating holes', ['F51'], '(6000 + 12000) / 2'),
	open_area: der(OPEN, '1', 'midpoint of 2-5 % open area', ['F51'], '(0.02 + 0.05) / 2'),
	hole_pitch_mm: der(+PITCH_MM.toFixed(3), 'mm', 'sqrt(pi R^2 / N), square grid over a 300 mm plate', ['F51'], `sqrt(pi 150^2 / ${PLATE_N})`),
	hole_d_mm: der(+HOLE_MM.toFixed(3), 'mm', 'pitch sqrt(4 open / pi); inside the 0.01-0.08 in range', ['F51'], `${PITCH_MM.toFixed(3)} sqrt(4 x ${OPEN} / pi)`),
	plate_h_mm: tpl(12, 'mm', 'resistive element thickness not found'),
	membrane_mm: tpl(55, 'mm', 'cation exchange membrane position below the wafer not found (F50 names it only)', undefined, ['F50']),
	anode_mm: tpl(120, 'mm', 'wafer-to-anode distance not found (gap 6, F74)', undefined, ['F74']),
	lip_mm: tpl(3, 'mm', 'cup lip seal width (edge exclusion) not found'),
	cu_g_l: rep(60, 'g/L', 'F52', 'TSV bath'),
	acid_g_l: rep(60, 'g/L', 'F52', 'H2SO4'),
	cl_ppm: rep(50, 'ppm', 'F52'),
	bath_c: der(22.5, 'C', 'midpoint of 20-25 C', ['F52'], '(20 + 25) / 2'),
	j_tsv_max_ma_cm2: rep(10, 'mA/cm2', 'F53', 'TSV baseline 0.1-10 mA/cm2; pulse 2-5x baseline for 10-200 s')
};

export class Ecp extends FabBase {
	readonly id = 'ecp';
	readonly name = 'Electroplating cell (clamshell)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = ECP_SPEC;
	protected override blockParts(): string[] {
		return ['bath|pts'];
	}
	protected override occluderParts(): string[] {
		return ['holder|steel'];
	}
	override readonly faceDown = true;
	private ions: THREE.Points | null = null;
	private flow: THREE.Points | null = null;
	private ys = { plate: 5000, mem: 55_000, anode: 120_000 };
	private anodeM: THREE.MeshStandardMaterial | null = null;

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const Rw = W.r;
		const yb = backY(f, args, 775);
		// ---------------- clamshell holder (rotates)
		const hd = this.rig('holder');
		hd.position.set(C.x, 0, C.z);
		const lip = mm('lip_mm');
		this.addOwn('holder', 'seal', hw('#202224', 0.6, 0), ringY(Rw - lip, Rw + 6000, 0, 3000, 160), 'cup lip seal + contacts on the wafer edge (width template)');
		const cupM = hw('#3d4044', 0.45, 0.3);
		this.addOwn('holder', 'cup', cupM, ringY(Rw + 6000, Rw + 22_000, Math.min(yb, -1000) - 18_000, 3000, 160), 'clamshell cup (F50); size template');
		this.addOwn('holder', 'cup', cupM, cylY(Rw - 4000, Math.min(yb, -1000) - 30_000, Math.min(yb, -1000), 0, 0, 160), 'clamshell cone pressing the wafer back (F50); size template');
		this.add('holder', 'steel', cylY(40_000, -220_000, Math.min(yb, -1000) - 30_000, 0, 0, 32), 'spindle (rotation 50-100 rpm, F54)');
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			const p0 = new THREE.Vector3((Rw + 14_000) * Math.cos(a), Math.min(yb, -1000) - 18_000, -(Rw + 14_000) * Math.sin(a));
			const p1 = new THREE.Vector3(45_000 * Math.cos(a), -110_000, -45_000 * Math.sin(a));
			this.addOwn('holder', 'cup', cupM, rod(p0, p1, 7000, 12), 'clamshell struts (show rotation)');
		}
		// ---------------- bath (moves for immersion)
		const bath = this.rig('bath');
		bath.position.set(C.x, 0, C.z);
		const Rv = Rw + 55_000;
		const depth = mm('anode_mm') + 40_000;
		const ves = hw('#596068', 0.5, 0.2, { side: THREE.DoubleSide });
		this.addOwn('bath', 'vessel', ves, ringY(Rv, Rv + 12_000, -9000, depth, 96, 0, 0, 0, Math.PI), 'plating cell vessel, front half cut away (template)');
		this.addOwn('bath', 'vessel', ves, ringY(1, Rv + 12_000, depth, depth + 12_000, 96, 0, 0, 0, Math.PI), 'vessel floor (template)');
		this.mesh('bath', 'electrolyte', ringY(1, Rv, 0, depth, 96, 0, 0, 0, Math.PI), 'electrolyte: Cu 60 g/L, H2SO4 60 g/L, Cl 50 ppm, 20-25 C (F52)');
		const cap = new THREE.PlaneGeometry(2 * Rv, depth);
		cap.translate(0, depth / 2, 0);
		this.mesh('bath', 'electrolyte', cap, 'electrolyte (section)');
		this.ys.plate = mm('plate_gap_mm');
		const plate = patterned(hw('#d9dde0', 0.5, 0, { side: THREE.DoubleSide }), 2, PITCH_MM * 1000, HOLE_MM * 1000, '#16181b');
		this.addOwn('bath', 'plate', plate, ringY(1, Rw + 5000, this.ys.plate, this.ys.plate + mm('plate_h_mm'), 128, 0, 0, 0, Math.PI), `ionically resistive plate, ${PLATE_N} holes of ${HOLE_MM.toFixed(2)} mm at ${PITCH_MM.toFixed(2)} mm pitch (F51, midpoints)`);
		this.ys.mem = mm('membrane_mm');
		this.addOwn('bath', 'mem', hw('#c08a3a', 0.5, 0, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), ringY(1, Rv, this.ys.mem, this.ys.mem + 1500, 96, 0, 0, 0, Math.PI), 'cation exchange membrane (F50; position template)');
		this.ys.anode = mm('anode_mm');
		const an = hw('#4b4f55', 0.65, 0.4, { emissive: new THREE.Color('#ff8a3a'), emissiveIntensity: 0 });
		this.anodeM = an;
		this.addOwn('bath', 'anode', an, ringY(1, Rw - 10_000, this.ys.anode, this.ys.anode + 15_000, 96, 0, 0, 0, Math.PI), 'anode below the wafer (F50); material and distance not found (F74), emissive tint = current on (illustrative)');
		this.addOwn('bath', 'vessel', ves, box(30_000, 30_000, 30_000, Rv - 40_000, depth - 15_000, -Rv * 0.5), 'electrolyte inlet manifold (template)');
		this.ions = this.points('bath', 900, '#ffb27a', 1.6, 0.9, 'Cu2+ flux anode -> wafer (illustrative; density follows the plating rate)');
		this.flow = this.points('bath', 500, '#e8f2ff', 1.3, 0.6, 'electrolyte cross flow in the gap under the wafer (F51; illustrative)');
	}

	workRot(_t: number, args: ToolArgs, ctx: ToolCtx): number {
		return spin(num(args, this.spec, 'spin_rpm'), ctx, { features: 3, f: this.frame });
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const e = engage(t, ctx);
		this.rig('bath').position.y = (1 - e) * LIFT_UM;
		this.rig('holder').rotation.y = this.workRot(t, args, ctx);
		const rate = live(ctx, 'rate_um_min');
		const on = ctx.phase === 'process' ? 0.35 + 0.65 * clamp01((rate ?? 0.5) / 1.2) : 0;
		if (this.anodeM) this.anodeM.emissiveIntensity = 0.35 * on;
		const W = carrierSize(f);
		const blk = f.scale !== 'work';
		const bw = blk ? blockWin(f) : null;
		const C = carrierCenter(f);
		const pick = (i: number, salt: number): [number, number] => {
			if (bw) return [bw.x0 + hash(i, salt) * (bw.x1 - bw.x0) - C.x, bw.z0 + hash(i, salt + 1) * (bw.z1 - bw.z0) - C.z];
			const r = W.r * 0.97 * Math.sqrt(hash(i, salt));
			const a = hash(i, salt + 1) * Math.PI; // back half (z <= 0)
			return [r * Math.cos(a), -r * Math.sin(a)];
		};
		const ip = this.ions!;
		const n = (ip.geometry.attributes.position as THREE.BufferAttribute).count;
		let k = 0;
		const H = blk ? bw!.span * 0.8 : this.ys.anode;
		for (let i = 0; i < n; i++) {
			if (hash(i, 21) > on) continue;
			const s = fract(hash(i, 22) + 0.45 * ctx.tPlay_s);
			const [x, z] = pick(i, 23);
			setPt(ip, k++, x, H * (1 - s), z);
		}
		ptsDone(ip, k);
		const fp = this.flow!;
		const m = (fp.geometry.attributes.position as THREE.BufferAttribute).count;
		k = 0;
		const gap = blk ? Math.min(this.ys.plate, bw!.span * 0.6) : this.ys.plate;
		for (let i = 0; i < m && ctx.phase !== 'approach'; i++) {
			const s = fract(hash(i, 31) + 0.3 * ctx.tPlay_s);
			const [, z] = pick(i, 33);
			const x0 = blk ? bw!.x0 - C.x : -W.r;
			const x1 = blk ? bw!.x1 - C.x : W.r;
			setPt(fp, k++, x0 + (x1 - x0) * s, gap * (0.15 + 0.7 * hash(i, 35)), z);
		}
		ptsDone(fp, k);
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		return [
			{ key: 'rpm', label: 'wafer rotation', value: num(args, s, 'spin_rpm'), unit: 'rpm', status: stat(args, s, 'spin_rpm') },
			{ key: 'rate', label: 'plating rate', value: live(ctx, 'rate_um_min'), unit: 'um/min', status: 'derived', note: 'Faraday rate of the op (F70)' },
			{ key: 'th', label: 'plated', value: live(ctx, 'thickness_um'), unit: 'um', status: 'derived' },
			{ key: 'gap', label: 'wafer-to-plate gap', value: num(args, s, 'plate_gap_mm'), unit: 'mm', status: stat(args, s, 'plate_gap_mm') },
			{ key: 'bath', label: 'Cu / H2SO4', value: num(args, s, 'cu_g_l'), unit: `/ ${num(args, s, 'acid_g_l')} g/L`, status: stat(args, s, 'cu_g_l'), note: `Cl ${num(args, s, 'cl_ppm')} ppm (F52)` },
			{ key: 'T', label: 'bath', value: num(args, s, 'bath_c'), unit: 'C', status: stat(args, s, 'bath_c') }
		];
	}
}

export const createEcp = (args?: ToolArgs) => new Ecp(args);
