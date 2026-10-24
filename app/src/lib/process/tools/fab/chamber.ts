// Plasma / vacuum chamber tools: DRIE Bosch (op etch_via, method bosch / rie), CVD (op deposit: pecvd, cvd / sacvd,
// thermal, ald). Shared minimal cut-away chamber: electrostatic chuck or heated pedestal under the wafer, focus ring,
// back half of the wall and lid, plasma glow above the wafer with a dark sheath gap. RESEARCH_TOOLS_FAB.md sections
// 1-2 (F1-F30). Glow colours are template (F18: not found); the alternation cadence follows the op's cycle counter.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	FabBase,
	backY,
	carrierCenter,
	carrierSize,
	cylY,
	der,
	engage,
	fract,
	glowMat,
	merge,
	hash,
	hw,
	live,
	num,
	patterned,
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

export interface ChamberOpts {
	gap_um: number; // wafer surface to lid / showerhead face
	wall_r_um: number;
	lid: 'icp' | 'showerhead';
	tipLid: string;
	hole_pitch_um?: number;
	hole_d_um?: number;
}

/** Chamber skeleton; subclasses add the plasma behaviour. */
export abstract class ChamberBase extends FabBase {
	protected glowMesh: THREE.Mesh | null = null;
	protected glowM: THREE.ShaderMaterial | null = null;
	protected ions: THREE.Points | null = null;
	protected gap = 150_000;
	protected sheath = 2000;

	protected buildChamber(f: ToolFrame, args: ToolArgs, o: ChamberOpts, specChuckTip: string): void {
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const Rw = W.r;
		this.gap = o.gap_um;
		const yb = backY(f, args, 775);
		const ch = this.rig('chamber');
		ch.position.set(C.x, 0, C.z);
		// chuck / pedestal
		this.addOwn('chamber', 'ceramic', hw('#d8d4cc', 0.7, 0), cylY(Rw - 2000, yb - 6000, yb, 0, 0, 160), specChuckTip);
		this.add('chamber', 'al', cylY(Rw + 45_000, yb - 90_000, yb - 6000, 0, 0, 160), 'cathode / pedestal body (aluminium; size template)');
		this.addOwn('chamber', 'ring', hw('#e9e5dc', 0.35, 0, { transparent: true, opacity: 0.85 }), ringY(Rw + 800, Rw + 32_000, yb - 4000, Math.max(800, -yb * 0.05), 160), 'focus / edge ring (quartz; size template)');
		// wall (back half), lid (back half)
		const Rc = o.wall_r_um;
		const wall = hw('#8d939b', 0.45, 0.6, { side: THREE.DoubleSide });
		this.addOwn('chamber', 'wall', wall, ringY(Rc, Rc + 18_000, yb - 120_000, o.gap_um + 30_000, 96, 0, 0, 0, Math.PI), 'chamber wall, front half cut away (size template)');
		this.addOwn('chamber', 'wall', wall, ringY(Rw + 45_000, Rc + 18_000, yb - 120_000, yb - 100_000, 96, 0, 0, 0, Math.PI), 'chamber floor (cut away)');
		if (o.lid === 'icp') {
			this.addOwn('chamber', 'window', hw('#cfd6dc', 0.15, 0, { transparent: true, opacity: 0.55, depthWrite: false }), ringY(1, Rc + 18_000, o.gap_um, o.gap_um + 28_000, 96, 0, 0, 0, Math.PI), o.tipLid);
		} else {
			const sh = patterned(hw('#b8bdc3', 0.35, 0.7, { side: THREE.DoubleSide }), 2, o.hole_pitch_um ?? 6000, o.hole_d_um ?? 900, '#2a2c30');
			this.addOwn('chamber', 'shower', sh, ringY(1, Rw + 25_000, o.gap_um, o.gap_um + 30_000, 160, 0, 0, 0, Math.PI), o.tipLid);
			this.add('chamber', 'al', ringY(Rw + 25_000, Rc + 18_000, o.gap_um + 10_000, o.gap_um + 40_000, 96, 0, 0, 0, Math.PI), 'lid (cut away; template)');
		}
	}

	/** Glow volume between y0 and y1 (bright at y1 for ICP: source under the coil). */
	protected buildGlow(_f: ToolFrame, r: number, y0: number, y1: number, color: string): void {
		this.glowM = glowMat(color, 0.6, y1, y0);
		// back half of the volume + its section face (the front half of the chamber is cut away)
		const sec = new THREE.PlaneGeometry(2 * r, y1 - y0);
		sec.translate(0, (y0 + y1) / 2, 0);
		const g = merge([cylY(r, y0, y1, 0, 0, 96, r, true, 0, Math.PI), sec]);
		this.glowMesh = this.glow('chamber', g, this.glowM, 'plasma glow (colour and intensity template, F18)');
	}
	protected buildIons(n: number, color: string): void {
		this.ions = this.points('chamber', n, color, 1.6, 0.85, 'ion flux toward the wafer (illustrative)');
	}
	/** Ions falling through the sheath / glow (deterministic; positions from hashes and playback time). */
	protected animateIons(f: ToolFrame, ctx: ToolCtx, on: number, ySrc: number, rate: number): void {
		const p = this.ions;
		if (!p) return;
		const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
		const W = carrierSize(f);
		let k = 0;
		const blk = f.scale !== 'work';
		const C = carrierCenter(f);
		for (let i = 0; i < n && on > 0; i++) {
			if (hash(i, 7) > on) continue;
			const s = fract(hash(i, 3) + rate * ctx.tPlay_s);
			let x: number, z: number;
			if (blk) {
				const w = this.win();
				x = w.x0 + hash(i, 1) * (w.x1 - w.x0) - C.x;
				z = w.z0 + hash(i, 2) * (w.z1 - w.z0) - C.z;
			} else {
				const r = W.r * Math.sqrt(hash(i, 1));
				const a = hash(i, 2) * Math.PI * 2;
				x = r * Math.cos(a);
				z = -r * Math.sin(a);
			}
			setPt(p, k++, x, ySrc * (1 - s), z);
		}
		ptsDone(p, k);
	}
	protected win(): { x0: number; x1: number; z0: number; z1: number } {
		const f = this.frame!;
		const w = f.window!;
		return { x0: w.x0_um - f.focus_um.x, x1: w.x1_um - f.focus_um.x, z0: -(w.y1_um - f.focus_um.y), z1: -(w.y0_um - f.focus_um.y) };
	}
}

// ---------------------------------------------------------------- DRIE (Bosch)

export const DRIE_SPEC: Record<string, PDim> = {
	sf6_sccm: rep(200, 'sccm', 'F1', '70 x 300 um via recipe; etch : passivation time ~1 : 1'),
	c4f8_sccm: rep(150, 'sccm', 'F1'),
	pressure_mtorr: rep(25, 'mTorr', 'F1'),
	dep_s: rep(5, 's', 'F2', 'polymer deposition step (med: search excerpt)'),
	poly_etch_s: rep(3, 's', 'F2', 'polymer (bottom) etch step'),
	si_etch_s: rep(5, 's', 'F2', 'Si etch step'),
	cycle_s: der(13, 's', 'dep + polymer etch + Si etch', ['F2'], '5 + 3 + 5'),
	etch_per_cycle_um: rep(0.79, 'um', 'F2', '10 um pattern row'),
	scallop_nm: rep(265, 'nm', 'F3', '10 um pattern row'),
	source_w: rep(2200, 'W', 'F14', 'ICP coil, 13.56 MHz (SiC chamber analog; med)'),
	platen_w: rep(800, 'W', 'F14', 'platen bias, 13.56 MHz (med)'),
	chuck_c: rep(0, 'C', 'F14', 'chuck with backside He (med)'),
	gap_mm: tpl(150, 'mm', 'wafer-to-window distance of the ICP source not found'),
	wall_d_mm: tpl(520, 'mm', 'chamber inner diameter not found'),
	coil_turns: tpl(3, '1', 'ICP coil turn count / layout not found'),
	sheath_mm: tpl(2, 'mm', 'dark sheath above the wafer drawn as a gap; thickness not from a source'),
	recess_rate_um_min: { ...rep(9, 'um/min', 'F141', 'blanket Si reveal etch, > 9 um/min (SPTS Rapier XE; med)'), qualifier: 'gt' },
	recess_sel: rep(200, '1', 'F141', 'Si : oxide liner selectivity 200 : 1 (med)'),
	recess_um: rep(5, 'um', 'F140', 'reveal step ~5 um (2-5 um) after grinding to 5-10 um above the TSV ends (med)')
};
/** View parameter: playback seconds per drawn Bosch cycle when the real cadence (127 cycles per step) would flicker. */
const VIS_CYCLE_S = 0.9;

const DRIE_COL = { pass: '#b49cff', poly: '#8fa6ff', etch: '#a9c4ff' }; // template (F18)

export class Drie extends ChamberBase {
	readonly id = 'drie';
	readonly name = 'DRIE (ICP, Bosch)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = DRIE_SPEC;
	protected override blockParts(): string[] {
		return ['chamber|glow', 'chamber|pts'];
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const gap = mm('gap_mm');
		this.sheath = Math.max(mm('sheath_mm'), f.scale === 'work' && f.illustrative ? 4000 : 0);
		this.buildChamber(f, args, { gap_um: gap, wall_r_um: mm('wall_d_mm') / 2, lid: 'icp', tipLid: 'dielectric window under the ICP coil (template)' }, 'electrostatic chuck with clamp, backside He, 0 C (F14, F15; med)');
		// ICP coil on the window (back half)
		const n = Math.round(num(args, s, 'coil_turns'));
		const Rc = mm('wall_d_mm') / 2;
		for (let i = 0; i < n; i++) {
			const r = Rc * (0.3 + (0.6 * i) / Math.max(1, n - 1));
			const g = new THREE.TorusGeometry(r, 6000, 10, 64, Math.PI);
			g.rotateX(-Math.PI / 2);
			g.translate(0, gap + 36_000, 0);
			this.add('chamber', 'cu', g, `ICP coil, 2200 W at 13.56 MHz (F14; turns template)`);
		}
		this.buildGlow(f, Rc * 0.92, this.sheath, gap, DRIE_COL.etch);
		this.buildIons(500, '#dfe6ff');
	}

	/** Phase inside a Bosch cycle: real (from the op's cycle counter) when slow enough, else visual cadence. */
	private blanket(args: ToolArgs, ctx: ToolCtx): boolean {
		const m = str(args, 'method', 'bosch');
		return ctx.op === 'etch_recess' || (m !== 'bosch' && m !== '');
	}
	private phase(args: ToolArgs, ctx: ToolCtx): { name: 'pass' | 'poly' | 'etch'; cycle: number | null; cycles: number | null; real: boolean } {
		const s = this.spec;
		const cyc = live(ctx, 'cycle');
		const N = live(ctx, 'cycles');
		const pe = num(args, s, 'poly_etch_s');
		const se = num(args, s, 'si_etch_s');
		// engine boschDepth: passivation first half of each cycle, etch second half
		// blanket recess etch (op etch_recess, e.g. TSV reveal from the backside on a carrier) or a non-Bosch method:
		// continuous SF6 etch, no passivation cycles
		if (this.blanket(args, ctx)) return { name: 'etch', cycle: null, cycles: null, real: true };
		let fr: number;
		let real = false;
		// real cadence when the drawn cycles stay <= 2 per playback second (op playback length from opPlay_s / u)
		const opTot = ctx.opPlay_s && ctx.u > 0.02 ? ctx.opPlay_s / ctx.u : null;
		if (N !== null && (opTot !== null ? N / opTot <= 2 : N <= 12)) {
			fr = fract(ctx.u * N);
			real = true;
		} else fr = fract(ctx.tPlay_s / VIS_CYCLE_S);
		const name = fr < 0.5 ? 'pass' : fr < 0.5 + (0.5 * pe) / (pe + se) ? 'poly' : 'etch';
		return { name, cycle: cyc, cycles: N, real };
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const e = engage(t, ctx);
		const on = ctx.phase === 'process' ? 1 : 0.15 * e;
		const ph = this.phase(args, ctx);
		if (this.glowM) {
			const c = new THREE.Color(DRIE_COL[ph.name]);
			this.glowM.uniforms.uCol.value.copy(c);
			setGlow(this.glowM, on * (ph.name === 'pass' ? 0.55 : ph.name === 'poly' ? 0.85 : 1.0));
		}
		if (this.glowMesh) this.glowMesh.visible = on > 0.01;
		const ionOn = ctx.phase === 'process' && ph.name !== 'pass' ? 1 : 0;
		this.animateIons(f, ctx, ionOn * (ph.name === 'poly' ? 1 : 0.6), f.scale === 'work' ? Math.min(this.gap * 0.5, 60_000) : blockH(f), 1.6);
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const ph = this.phase(args, ctx);
		if (this.blanket(args, ctx))
			return [
				{ key: 'mode', label: 'blanket Si etch (SF6, continuous)', value: null, unit: '', status: 'derived', note: 'etch_recess / non-Bosch method; wafer face down on its carrier, backside to the plasma' },
				{ key: 'rate', label: 'Si etch rate', value: num(args, s, 'recess_rate_um_min'), unit: 'um/min (>)', status: stat(args, s, 'recess_rate_um_min') },
				{ key: 'sel', label: 'selectivity to liner', value: num(args, s, 'recess_sel'), unit: ': 1', status: stat(args, s, 'recess_sel') },
				{ key: 'step', label: 'reveal step', value: num(args, s, 'recess_um'), unit: 'um', status: stat(args, s, 'recess_um') },
				{ key: 'depth', label: 'depth', value: live(ctx, 'depth_um'), unit: 'um', status: 'derived' }
			];
		const names = { pass: 'passivation (C4F8)', poly: 'polymer etch (SF6, bias)', etch: 'Si etch (SF6)' };
		return [
			{ key: 'cycle', label: 'Bosch cycle', value: ph.cycle, unit: `of ${ph.cycles ?? 'N/A'}`, status: 'derived', note: 'engine cycle counter (depth / etch per cycle)' },
			{ key: 'phase', label: `phase: ${names[ph.name]}`, value: null, unit: '', status: 'template', note: ph.real ? 'real cadence' : `glow alternates at a visual cadence (${VIS_CYCLE_S} s of playback per cycle); real cycle ${num(args, s, 'cycle_s')} s (F2)` },
			{ key: 'cycle_s', label: 'cycle time', value: num(args, s, 'cycle_s'), unit: 's', status: stat(args, s, 'cycle_s'), note: '5 s dep / 3 s polymer etch / 5 s Si etch (F2)' },
			{ key: 'etch', label: 'etch per cycle', value: num(args, s, 'etch_per_cycle_um'), unit: 'um', status: stat(args, s, 'etch_per_cycle_um') },
			{ key: 'gas', label: 'SF6 / C4F8', value: num(args, s, 'sf6_sccm'), unit: `/ ${num(args, s, 'c4f8_sccm')} sccm`, status: stat(args, s, 'sf6_sccm') },
			{ key: 'p', label: 'pressure', value: num(args, s, 'pressure_mtorr'), unit: 'mTorr', status: stat(args, s, 'pressure_mtorr') },
			{ key: 'rf', label: 'source / platen RF', value: num(args, s, 'source_w'), unit: `/ ${num(args, s, 'platen_w')} W`, status: stat(args, s, 'source_w') },
			{ key: 'depth', label: 'depth', value: live(ctx, 'depth_um'), unit: 'um', status: 'derived' }
		];
	}
}

function blockH(f: ToolFrame): number {
	const w = f.window;
	return w ? Math.max(w.x1_um - w.x0_um, w.y1_um - w.y0_um) * 0.6 : 200;
}

// ---------------------------------------------------------------- CVD (PECVD / SACVD / thermal)

export const CVD_SPEC: Record<string, PDim> = {
	pecvd_c: der(190, 'C', 'midpoint of 180-200 C low-T liner depositions', ['F25', 'F26'], '(180 + 200) / 2'),
	sacvd_torr: rep(100, 'Torr', 'F22', 'O3 / TEOS SACVD 100-600 Torr; lower bound shown'),
	teos_stage_c: rep(150, 'C', 'F27', 'TEOS liner on a bonded wafer, stage 423 K'),
	sacvd_conformality: rep(0.43, '1', 'F20', 'AR > 16'),
	pecvd_bottom_corner: rep(0.06, '1', 'F24', 'PECVD SiO2 at 180 C, 10:1 (med)'),
	gap_mm: tpl(12, 'mm', 'showerhead-to-wafer spacing not found'),
	wall_d_mm: tpl(480, 'mm', 'chamber inner diameter not found'),
	hole_pitch_mm: tpl(6, 'mm', 'showerhead hole pitch not found'),
	hole_d_mm: tpl(0.9, 'mm', 'showerhead hole diameter not found')
};

export class Cvd extends ChamberBase {
	readonly id = 'cvd';
	readonly name = 'CVD chamber (showerhead)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = CVD_SPEC;
	protected override blockParts(): string[] {
		return ['chamber|glow', 'chamber|pts'];
	}
	private gas: THREE.Points | null = null;

	private plasma(args: ToolArgs): boolean {
		const m = str(args, 'method', 'pecvd');
		return m === 'pecvd' || m === 'ash';
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const gap = mm('gap_mm');
		this.sheath = f.scale === 'work' && f.illustrative ? 1500 : 500;
		this.buildChamber(f, args, { gap_um: gap, wall_r_um: mm('wall_d_mm') / 2, lid: 'showerhead', tipLid: 'gas showerhead (hole pitch / size template; front half cut away)', hole_pitch_um: mm('hole_pitch_mm'), hole_d_um: mm('hole_d_mm') }, 'heated pedestal (temperature per method: 180-200 C PECVD, F25 / F26)');
		const W = carrierSize(f);
		if (this.plasma(args)) this.buildGlow(f, W.r + 20_000, this.sheath, gap, '#d79cf0');
		this.gas = this.points('chamber', 700, '#cfe3ff', 1.4, 0.55, 'precursor gas flow from the showerhead (illustrative)');
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const e = engage(t, ctx);
		const on = ctx.phase === 'process' ? 1 : 0.2 * e;
		setGlow(this.glowM, 0.55 * on);
		if (this.glowMesh) this.glowMesh.visible = on > 0.01;
		// gas: down from the showerhead holes, then radial out over the wafer
		const p = this.gas;
		if (!p) return;
		const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
		const W = carrierSize(f);
		const C = carrierCenter(f);
		const blk = f.scale !== 'work';
		const H = blk ? blockH(f) : this.gap;
		let k = 0;
		for (let i = 0; i < n && on > 0.01; i++) {
			const s = fract(hash(i, 5) + 0.35 * ctx.tPlay_s);
			let x: number, z: number;
			if (blk) {
				const w = this.win();
				x = w.x0 + hash(i, 1) * (w.x1 - w.x0) - C.x;
				z = w.z0 + hash(i, 2) * (w.z1 - w.z0) - C.z;
				setPt(p, k++, x, H * (1 - s), z);
				continue;
			}
			const r0 = W.r * Math.sqrt(hash(i, 1));
			const a = hash(i, 2) * Math.PI * 2;
			// vertical drop in the first 60 %, then radial drift outward near the wafer
			const y = s < 0.6 ? H * (1 - s / 0.6) : 0.15 * H * (1 - (s - 0.6) / 0.4) + 300;
			const r = s < 0.6 ? r0 : r0 + (W.r * 0.5 * (s - 0.6)) / 0.4;
			x = r * Math.cos(a);
			z = -r * Math.sin(a);
			setPt(p, k++, x, y, z);
		}
		ptsDone(p, k);
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const m = str(args, 'method', 'pecvd');
		return [
			{ key: 'method', label: `method: ${m}`, value: null, unit: '', status: 'derived' },
			{ key: 'T', label: 'pedestal', value: m === 'pecvd' ? num(args, s, 'pecvd_c') : num(args, s, 'teos_stage_c'), unit: 'C', status: m === 'pecvd' ? stat(args, s, 'pecvd_c') : stat(args, s, 'teos_stage_c') },
			{ key: 'P', label: 'SACVD pressure', value: m === 'pecvd' ? null : num(args, s, 'sacvd_torr'), unit: 'Torr', status: stat(args, s, 'sacvd_torr') },
			{ key: 'conf', label: 'bottom coverage', value: m === 'pecvd' ? num(args, s, 'pecvd_bottom_corner') : num(args, s, 'sacvd_conformality'), unit: '1', status: 'reported' },
			{ key: 'th', label: 'film', value: live(ctx, 'thickness_um'), unit: 'um', status: 'derived' }
		];
	}
}

export const createDrie = (args?: ToolArgs) => new Drie(args);
export const createCvd = (args?: ToolArgs) => new Cvd(args);
