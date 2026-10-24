// PVD magnetron (op deposit, method pvd): disk target above the wafer at the target-to-substrate distance, racetrack
// erosion grooves in the target face, rotating magnet pack behind the backing plate, racetrack plasma ring under the
// target, grounded shield, clamp ring and RF-biased pedestal, sputtered flux from the racetrack to the wafer.
// RESEARCH_TOOLS_FAB.md section 3 (F31-F49).

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	FabBase,
	backY,
	blockWin,
	carrierCenter,
	carrierSize,
	cylY,
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
	setPt,
	stat,
	str,
	tpl,
	setGlow,
	type Readout
} from './common';

export const PVD_SPEC: Record<string, PDim> = {
	target_d_mm: tpl(450, 'mm', '300 mm target serves a 200 mm wafer (F31); scaled by the same 1.5 ratio for 300 mm wafers; 300 mm-tool target geometry not found (F49)', undefined, ['F31', 'F49']),
	gap_mm: rep(60, 'mm', 'F32', 'basic magnetron TSV seed; 50-80 mm adjustable in the HIPIMS source'),
	target_h_mm: tpl(12, 'mm', 'target thickness not found'),
	backing_h_mm: tpl(15, 'mm', 'backing plate thickness not found'),
	erosion_depth_mm: tpl(4, 'mm', 'racetrack erosion groove depth (target-life dependent) not found'),
	racetrack_off: tpl(0.42, '1', 'racetrack loop centre offset / target radius not found (off-axis rotating magnet, F31)'),
	racetrack_r: tpl(0.36, '1', 'racetrack loop radius / target radius not found'),
	clamp_w_mm: tpl(10, 'mm', 'mechanical clamp ring overlap / width not found (F33 names the clamp only)', undefined, ['F33']),
	rate_ti_nm_s: rep(2.8, 'nm/s', 'F37', 'HIPIMS, 200 mm'),
	rate_ta_nm_s: rep(3.2, 'nm/s', 'F37'),
	rate_cu_nm_s: rep(6.6, 'nm/s', 'F37'),
	bottom_cov_ti: rep(0.2, '1', 'F34', 'AR 10:1 trench'),
	wafer_max_c: rep(100, 'C', 'F39', 'ionized PVD wafer temperature stays below ~100 C')
};

const MAG_VIS_RPS = 0.25; // view parameter: magnet rotation in playback (real rate not found)
const FLUX_COL: Record<string, string> = { ti: '#c3c7cf', ta: '#a5abbb', cu: '#f0a070', ni: '#c8c4b8', al: '#d8dce2' };

export class Pvd extends FabBase {
	readonly id = 'pvd';
	readonly name = 'PVD magnetron';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = PVD_SPEC;
	protected override blockParts(): string[] {
		return ['chamber|pts'];
	}
	private flux: THREE.Points | null = null;
	private loop: THREE.Mesh | null = null;
	private glowM: THREE.ShaderMaterial | null = null;
	private Rt = 225_000;
	private gap = 60_000;

	private metal(args: ToolArgs): string {
		const m = str(args, 'material', 'ti').toLowerCase();
		return FLUX_COL[m] ? m : m.startsWith('cu') ? 'cu' : 'ti';
	}
	protected geomKey(args: ToolArgs): string {
		return this.metal(args);
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const Rw = W.r;
		const Rt = mm('target_d_mm') / 2;
		this.Rt = Rt;
		const gap = mm('gap_mm');
		this.gap = gap;
		const th = mm('target_h_mm');
		const ed = mm('erosion_depth_mm');
		const yb = backY(f, args, 775);
		const ch = this.rig('chamber');
		ch.position.set(C.x, 0, C.z);
		this.sectionAt.copy(C);
		const met = this.metal(args);
		// target face: two erosion grooves (time average of the off-axis racetrack, template)
		const ro = num(args, s, 'racetrack_off') * Rt;
		const rr = num(args, s, 'racetrack_r') * Rt;
		const g1 = ro - rr * 0.8, g2 = ro + rr * 0.8;
		const pts: THREE.Vector2[] = [new THREE.Vector2(0, gap)];
		const N = 48;
		for (let i = 1; i <= N; i++) {
			const r = (i / N) * Rt;
			const d = ed * (Math.exp(-(((r - g1) / (0.09 * Rt)) ** 2)) * 0.7 + Math.exp(-(((r - g2) / (0.08 * Rt)) ** 2)));
			pts.push(new THREE.Vector2(r, gap + Math.min(d, th * 0.6)));
		}
		pts.push(new THREE.Vector2(Rt, gap + th), new THREE.Vector2(0.01, gap + th));
		const tkey = met === 'cu' ? 'cu' : met === 'ta' ? 'ta' : met === 'al' ? 'al' : met === 'ni' ? 'ni' : 'ti';
		this.add('chamber', tkey, lathe(pts, 96, 0, 0, 0, Math.PI), `sputter target (${tkey}), erosion grooves from the racetrack (profile template); diameter template (F31, F49)`);
		this.add('chamber', 'cu', ringY(1, Rt + 15_000, gap + th, gap + th + mm('backing_h_mm'), 96, 0, 0, 0, Math.PI), 'water-cooled backing plate (template; front half cut away)');
		const mag = this.rig('magnet', 'chamber');
		const mg = hw('#3a3d44', 0.5, 0.6, { side: THREE.DoubleSide });
		this.sectionMats.push(mg); // rotating magnet cut by the fixed section plane
		this.addOwn('magnet', 'mag', mg, cylY(rr * 1.15, gap + th + mm('backing_h_mm') + 3000, gap + th + mm('backing_h_mm') + 40_000, ro, 0, 64), 'rotating magnet pack (off-axis; rate template)');
		this.addOwn('magnet', 'mag', mg, cylY(30_000, gap + th + mm('backing_h_mm') + 40_000, gap + th + mm('backing_h_mm') + 160_000, 0, 0, 24), 'magnet drive shaft (template)');
		this.addOwn('magnet', 'mag', mg, cylY(ro + rr * 1.15, gap + th + mm('backing_h_mm') + 40_000, gap + th + mm('backing_h_mm') + 52_000, 0, 0, 64), 'magnet carrier plate (template)');
		// racetrack plasma loop under the target face (rotates with the magnet)
		const curve = new THREE.CatmullRomCurve3(
			Array.from({ length: 32 }, (_, i) => {
				const a = (i / 32) * Math.PI * 2;
				return new THREE.Vector3(ro + rr * Math.cos(a), gap - 6000, -rr * 1.1 * Math.sin(a));
			}),
			true
		);
		this.glowM = glowMat('#b58cff', 1.0, gap - 14_000, gap);
		this.loop = this.glow('magnet', new THREE.TubeGeometry(curve, 96, 7000, 10, true), this.glowM, 'racetrack plasma (Ar; colour template) under the magnet');
		// shield, pedestal, clamp ring
		const sh = hw('#8d939b', 0.5, 0.6, { side: THREE.DoubleSide });
		this.addOwn('chamber', 'shield', sh, ringY(Rt + 25_000, Rt + 32_000, yb - 20_000, gap + th, 96, 0, 0, 0, Math.PI), 'grounded shield (back half; template)');
		this.addOwn('chamber', 'shield', sh, ringY(Rw + 25_000, Rt + 32_000, yb - 25_000, yb - 20_000, 96, 0, 0, 0, Math.PI), 'lower shield (template)');
		this.add('chamber', 'al', cylY(Rw + 20_000, yb - 70_000, yb, 0, 0, 160), 'pedestal: backside gas cooling, RF bias (F33); size template');
		const cw = mm('clamp_w_mm');
		this.add('chamber', 'steel', ringY(Rw - 3000, Rw + cw, 200, 2500, 160), 'mechanical clamp ring on the wafer edge (F33; size template)');
		this.flux = this.points('chamber', 900, FLUX_COL[met] ?? '#c3c7cf', 1.5, 0.9, 'sputtered flux (ballistic, illustrative density)');
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const e = engage(t, ctx);
		const on = ctx.phase === 'process' ? 1 : 0;
		const magA = ctx.reduceMotion ? 0 : 2 * Math.PI * MAG_VIS_RPS * ctx.tPlay_s;
		this.rig('magnet').rotation.y = magA;
		setGlow(this.glowM, 0.25 + 0.75 * on * e);
		if (this.loop) this.loop.visible = e > 0.05;
		const p = this.flux;
		if (!p) return;
		const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
		const W = carrierSize(f);
		const C = carrierCenter(f);
		const ro = num(args, s, 'racetrack_off') * this.Rt;
		const rr = num(args, s, 'racetrack_r') * this.Rt;
		const blk = f.scale !== 'work';
		const bw = blk ? blockWin(f) : null;
		const H = blk ? bw!.span * 0.8 : this.gap;
		const rate = 0.9; // visual transits per playback second
		let k = 0;
		const src = new THREE.Vector3();
		const dst = new THREE.Vector3();
		for (let i = 0; i < n && on > 0; i++) {
			const ph = hash(i, 11);
			const sP = fract(ph + rate * ctx.tPlay_s);
			const birth = ctx.tPlay_s - sP / rate;
			const ma = ctx.reduceMotion ? 0 : 2 * Math.PI * MAG_VIS_RPS * birth;
			const a = hash(i, 12) * Math.PI * 2;
			const lx = ro + rr * Math.cos(a), lz = -rr * 1.1 * Math.sin(a);
			src.set(lx * Math.cos(ma) + lz * Math.sin(ma), this.gap - 6000, -lx * Math.sin(ma) + lz * Math.cos(ma));
			if (!blk) {
				const r = W.r * Math.sqrt(hash(i, 13)) * 1.05;
				const b = hash(i, 14) * Math.PI * 2;
				dst.set(r * Math.cos(b), 0, -r * Math.sin(b));
				p.geometry.attributes.position.setXYZ(k++, src.x + (dst.x - src.x) * sP, src.y + (dst.y - src.y) * sP, src.z + (dst.z - src.z) * sP);
			} else {
				// block: only the last H of each path, arriving inside the window
				dst.set(bw!.x0 + hash(i, 13) * (bw!.x1 - bw!.x0) - C.x, 0, bw!.z0 + hash(i, 14) * (bw!.z1 - bw!.z0) - C.z);
				const d = new THREE.Vector3().subVectors(src, dst).normalize();
				const L = H / Math.max(0.2, d.y);
				setPt(p, k++, dst.x + d.x * L * (1 - sP), dst.y + d.y * L * (1 - sP), dst.z + d.z * L * (1 - sP));
			}
		}
		ptsDone(p, k);
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const met = this.metal(args);
		const rk = met === 'cu' ? 'rate_cu_nm_s' : met === 'ta' ? 'rate_ta_nm_s' : 'rate_ti_nm_s';
		return [
			{ key: 'target', label: `target: ${met}`, value: num(args, s, 'target_d_mm'), unit: 'mm', status: stat(args, s, 'target_d_mm') },
			{ key: 'gap', label: 'target-to-wafer', value: num(args, s, 'gap_mm'), unit: 'mm', status: stat(args, s, 'gap_mm') },
			{ key: 'rate', label: 'HIPIMS rate (200 mm)', value: num(args, s, rk), unit: 'nm/s', status: stat(args, s, rk), note: 'F37; the op rate (if any) drives the film' },
			{ key: 'th', label: 'film', value: live(ctx, 'thickness_um'), unit: 'um', status: 'derived' },
			{ key: 'cov', label: 'Ti bottom coverage AR 10', value: num(args, s, 'bottom_cov_ti'), unit: '1', status: 'reported', note: 'Cu / Ta about half of Ti (F35)' },
			{ key: 'Tw', label: 'wafer T (ionized PVD)', value: num(args, s, 'wafer_max_c'), unit: 'C', status: 'reported', note: '<= ~100 C (F39)' },
			{ key: 'magnet', label: 'magnet rotation', value: null, unit: 'rpm', status: 'template', note: 'rate not found (F49); drawn at a visual rate' }
		];
	}
}

export const createPvd = (args?: ToolArgs) => new Pvd(args);
