// Wafer benches: wet bench (op strip / deposit electroless / immersion: single-wafer spray or immersion tank; ash:
// O2 plasma chamber), cure oven / hot plate (op cure), temporary wafer bonder (op bond_temp), dry-film roll laminator
// (op coat, method dry_film). RESEARCH_TOOLS_FAB.md sections 5, 6, 11, 13, 14 (F79-F82, F92-F101, F152-F155,
// F170-F181). Minimal machines: the part that touches the wafer, in its real proportion.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { ChamberBase } from './chamber';
import {
	FabBase,
	backY,
	box,
	boxMM,
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
	ptsDone,
	rep,
	ringY,
	rod,
	setPt,
	smooth,
	spin,
	stat,
	str,
	tpl,
	yOf,
	setGlow,
	type Readout,
	type Trace
} from './common';

// ---------------------------------------------------------------- wet bench

export const WET_SPEC: Record<string, PDim> = {
	strip_c: der(57.5, 'C', 'midpoint of the 40-75 C solvent / DFR strip temperatures', ['F92', 'F93', 'F94'], '(40 + 75) / 2'),
	strip_min: der(4.5, 'min', 'midpoint of 4-5 min (EKC-162, 40 C)', ['F92'], '(4 + 5) / 2'),
	seed_etch_c: rep(30, 'C', 'F97', 'spray conveyor Cu seed etch'),
	seed_etch_s: rep(25, 's', 'F97'),
	eni_c: rep(70, 'C', 'F177', 'electroless Ni, 7 min -> 1.05 um'),
	eni_um_h: der(9, 'um/h', '1.05 um / 7 min', ['F177'], '1.05 / (7 / 60)'),
	spray_rpm: tpl(300, 'rpm', 'single-wafer spray chuck speed not found'),
	arm_sweep_mm: tpl(130, 'mm', 'spray arm sweep radius not found'),
	nozzle_h_mm: tpl(25, 'mm', 'spray nozzle height above the wafer not found'),
	film_um: tpl(200, 'um', 'liquid film on the spinning wafer not found; drawn layer only'),
	tank_margin_mm: tpl(60, 'mm', 'immersion tank clearance around the wafer not found'),
	bath_depth_mm: tpl(40, 'mm', 'liquid depth over the wafer in the immersion view not found'),
	ash_gap_mm: tpl(80, 'mm', 'O2 asher electrode / source gap not found (F96 names ICP O2 ashing only)', undefined, ['F96'])
};

const LIQ: Record<string, [string, string]> = {
	resist_strip: ['#d9c9a0', 'solvent resist stripper (EKC-162 / NMP class, F92-F95); tint template'],
	seed_etch: ['#cfe6f0', 'Cu seed etchant H3PO4 / H2O2 (F98); tint template'],
	flux_clean: ['#d6e8e0', 'flux cleaning solvent; tint template'],
	adhesive_clean: ['#e0d6c0', 'adhesive cleaning solvent; tint template'],
	wet_clean: ['#d8eaf5', 'rinse / clean; tint template'],
	electroless: ['#7fae8c', 'electroless Ni bath 70 C (F177); tint template'],
	immersion: ['#d9c070', 'immersion Au bath (F181: conditions not found); tint template']
};

export class WetBench extends ChamberBase {
	readonly id = 'wet_bench';
	readonly name = 'Wet bench';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = WET_SPEC;
	protected override blockParts(): string[] {
		return ['chuck|own', 'chuck|pts', 'arm|pts', 'arm|own', 'chamber|glow'];
	}
	protected override occluderParts(): string[] {
		return ['arm|steel'];
	}
	private liquid: THREE.Mesh | null = null;
	private fan: THREE.Mesh | null = null;
	private drops: THREE.Points | null = null;
	private mode: 'spray' | 'immersion' | 'ash' = 'spray';

	private method(args: ToolArgs): string {
		return str(args, 'method', 'seed_etch');
	}
	private modeOf(m: string): 'spray' | 'immersion' | 'ash' {
		return m === 'ash' ? 'ash' : m === 'electroless' || m === 'immersion' || m === 'resist_strip' ? 'immersion' : 'spray';
	}

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const m = this.method(args);
		this.mode = this.modeOf(m);
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 775);
		const [col, tip] = LIQ[m] ?? LIQ.wet_clean;
		const liqM = hw(col, 0.05, 0, { transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
		if (this.mode === 'ash') {
			const gap = mm('ash_gap_mm');
			this.buildChamber(f, args, { gap_um: gap, wall_r_um: R + 70_000, lid: 'icp', tipLid: 'asher source window (template)' }, 'heated platen (template)');
			this.buildGlow(f, (R + 70_000) * 0.92, f.illustrative ? 3000 : 1000, gap, '#9fb4ff');
			return;
		}
		const ch = this.rig('chuck');
		ch.position.set(C.x, 0, C.z);
		if (this.mode === 'spray') {
			this.add('chuck', 'steel', cylY(R * 0.45, yb - 15_000, yb, 0, 0, 96), 'spin chuck (template)');
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2;
				this.add('chuck', 'steel', cylY(3500, yb - 4000, 1500, (R + 2000) * Math.cos(a), -(R + 2000) * Math.sin(a), 12), 'edge grip pins (show rotation; template)');
			}
			const cup = hw('#5a6068', 0.5, 0.2, { side: THREE.DoubleSide });
			this.addOwn('base', 'cup', cup, ringY(R + 30_000, R + 36_000, yb - 60_000, 30_000, 96, C.x, C.z, 0, Math.PI), 'splash cup (back half; template)');
			const h = Math.max(mm('film_um') / 1000, f.illustrative && f.scale === 'work' ? 600 : 0);
			this.liquid = this.ownMesh('chuck', liqM, cylY(R, 0, h, 0, 0, 96), `${tip}; film thickness template`);
			const arm = this.rig('arm');
			arm.position.set(C.x + R + 90_000, 0, C.z - R * 0.6);
			const yn = mm('nozzle_h_mm');
			this.add('arm', 'steel', cylY(14_000, yb - 60_000, yn + 30_000, 0, 0, 24), 'swing arm post (template)');
			const L = Math.hypot(R + 90_000, R * 0.6);
			this.add('arm', 'steel', box(L, 14_000, 16_000, -L / 2, yn + 22_000, 0), 'spray swing arm (template)');
			this.add('arm', 'steel', cylY(6000, yn, yn + 16_000, -L, 0, 16), 'spray nozzle');
			// flat fan spray (thin wedge) from the nozzle to the wafer
			const fan = new THREE.BufferGeometry();
			const half = yn * 0.9;
			fan.setAttribute('position', new THREE.Float32BufferAttribute([-L, yn, 0, -L - half, 0, 0, -L + half, 0, 0], 3));
			fan.computeVertexNormals();
			this.fan = this.ownMesh('arm', hw(col, 0.1, 0, { transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }), fan, 'flat-fan spray (F97: spray etch); fan geometry template');
			this.drops = this.points('arm', 300, col, 1.6, 0.9, 'spray droplets (illustrative)', false);
		} else {
			// immersion tank around the work piece (front wall cut away), liquid fills in the approach
			const tm = mm('tank_margin_mm');
			const D = mm('bath_depth_mm');
			const wall = hw('#8fb3c4', 0.15, 0, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
			const x0 = -R - tm, x1 = R + tm;
			const y0 = yb - 40_000;
			this.addOwn('chuck', 'tank', wall, boxMM(x0, x1, y0 - 8000, y0, x0, x1), 'immersion tank (PVDF / quartz class; size template)');
			this.addOwn('chuck', 'tank', wall, boxMM(x0, x1, y0, D + 30_000, x0 - 8000, x0), 'tank wall');
			this.addOwn('chuck', 'tank', wall, boxMM(x0 - 8000, x0, y0, D + 30_000, x0, x1), 'tank wall');
			this.addOwn('chuck', 'tank', wall, boxMM(x1, x1 + 8000, y0, D + 30_000, x0, x1), 'tank wall');
			this.add('chuck', 'steel', boxMM(-R * 0.8, R * 0.8, y0, yb, -8000, 8000), 'wafer holder bar (template)');
			this.liquid = this.ownMesh('chuck', liqM, boxMM(x0, x1, y0, D, x0, x1), `${tip}; level template`);
			this.liquid.userData.y0 = y0;
			this.liquid.userData.D = D;
			this.drops = this.points('chuck', 250, '#ffffff', 1.4, 0.6, 'bubbles / agitation (illustrative)');
		}
	}
	protected geomKey(args: ToolArgs): string {
		return this.method(args);
	}

	workRot(_t: number, args: ToolArgs, ctx: ToolCtx): number {
		return this.mode === 'spray' ? spin(num(args, this.spec, 'spray_rpm'), ctx, { features: 6, f: this.frame }) : 0;
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const e = engage(t, ctx);
		const on = ctx.phase === 'process' ? 1 : 0;
		if (this.mode === 'ash') {
			setGlow(this.glowM, 0.7 * on);
			if (this.glowMesh) this.glowMesh.visible = on > 0;
			return;
		}
		const W = carrierSize(f);
		const R = W.r;
		if (this.mode === 'spray') {
			this.rig('chuck').rotation.y = this.workRot(t, args, ctx);
			const sw = ctx.reduceMotion ? 0 : Math.sin(2 * Math.PI * 0.4 * ctx.tPlay_s);
			const L = Math.hypot(R + 90_000, R * 0.6);
			const aIn = Math.atan2(R * 0.6, R + 90_000);
			const arm = this.rig('arm');
			// arm pivots so the nozzle sweeps the wafer radius (park angle outside in approach / retract)
			arm.rotation.y = -aIn + (1 - e) * 0.9 + 0.25 * sw * e;
			if (this.fan) this.fan.visible = on > 0;
			if (this.liquid) {
				this.liquid.visible = e > 0.2;
				(this.liquid.material as THREE.MeshStandardMaterial).opacity = 0.38 * clamp01(on + 0.3 * e);
			}
			const p = this.drops!;
			const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
			let k = 0;
			const yn = num(args, this.spec, 'nozzle_h_mm') * 1000;
			for (let i = 0; i < n && on; i++) {
				const sP = fract(hash(i, 51) + 1.5 * ctx.tPlay_s);
				const off = (hash(i, 52) - 0.5) * 2 * yn * 0.9 * sP;
				setPt(p, k++, -L + off, yn * (1 - sP), (hash(i, 53) - 0.5) * 3000);
			}
			ptsDone(p, k);
		} else {
			const liq = this.liquid!;
			const y0 = liq.userData.y0 as number, D = liq.userData.D as number;
			const lvl = y0 + (D - y0) * smooth(e);
			liq.scale.y = Math.max(1e-3, (lvl - y0) / (D - y0));
			liq.position.y = y0 * (1 - liq.scale.y);
			const p = this.drops!;
			const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
			let k = 0;
			for (let i = 0; i < n && on; i++) {
				const sP = fract(hash(i, 61) + 0.25 * ctx.tPlay_s);
				const r = R * 1.1 * Math.sqrt(hash(i, 62));
				const a = hash(i, 63) * Math.PI * 2;
				setPt(p, k++, r * Math.cos(a), y0 + (lvl - y0) * sP, -r * Math.sin(a));
			}
			ptsDone(p, k);
		}
	}

	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const m = this.method(args);
		const T = m === 'seed_etch' ? 'seed_etch_c' : m === 'electroless' ? 'eni_c' : m === 'resist_strip' ? 'strip_c' : null;
		return [
			{ key: 'm', label: `${m} (${this.mode})`, value: null, unit: '', status: 'derived' },
			{ key: 'T', label: 'bath / spray T', value: T ? num(args, s, T) : null, unit: 'C', status: T ? stat(args, s, T) : 'template' },
			{ key: 'time', label: m === 'seed_etch' ? 'seed etch time' : m === 'resist_strip' ? 'strip time' : 'time', value: m === 'seed_etch' ? num(args, s, 'seed_etch_s') : m === 'resist_strip' ? num(args, s, 'strip_min') * 60 : null, unit: 's', status: m === 'seed_etch' ? 'reported' : m === 'resist_strip' ? 'derived' : 'template' },
			{ key: 'rate', label: 'EL-Ni rate', value: m === 'electroless' ? num(args, s, 'eni_um_h') : null, unit: 'um/h', status: 'derived' },
			{ key: 'th', label: 'film', value: live(ctx, 'thickness_um'), unit: 'um', status: 'derived' }
		];
	}
}

// ---------------------------------------------------------------- cure oven / hot plate

export const CURE_SPEC: Record<string, PDim> = {
	pi_cure_c: rep(350, 'C', 'F171', 'PI-2600, 30 min, N2 or forming gas'),
	pi_cure_min: rep(30, 'min', 'F171'),
	ramp_c_min: der(3, 'C/min', 'midpoint of 2-4 C/min', ['F171'], '(2 + 4) / 2'),
	soft_bake_c: rep(120, 'C', 'F75', 'resist hot plate 3 min'),
	oven_w_mm: tpl(520, 'mm', 'oven chamber size not found'),
	oven_h_mm: tpl(260, 'mm', 'oven chamber height not found'),
	pin_h_mm: tpl(0.3, 'mm', 'hot-plate proximity pin height not found')
};

export class CureOven extends FabBase {
	readonly id = 'cure_oven';
	readonly name = 'Cure oven / hot plate';
	readonly scales = ['work'] as 'work'[];
	readonly spec = CURE_SPEC;
	/** block / cell: no oven at all (audit V2 n3: the interior wall painted behind the block) */
	protected override blockParts(): string[] {
		return [];
	}
	private heat: THREE.MeshStandardMaterial | null = null;
	private flow: THREE.Points | null = null;

	private hot(args: ToolArgs): boolean {
		return str(args, 'method', 'oven') === 'hotplate';
	}
	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 775);
		const st = this.rig('oven');
		st.position.set(C.x, 0, C.z);
		this.heat = this.keep(hw('#5d5f63', 0.6, 0.4, { emissive: new THREE.Color('#ff6a2a'), emissiveIntensity: 0 }));
		if (this.hot(args)) {
			const ph = Math.max(mm('pin_h_mm'), f.illustrative ? 1500 : 0);
			this.addOwn('oven', 'plate', this.heat, cylY(R + 15_000, yb - ph - 25_000, yb - ph, 0, 0, 128), 'hot plate (aluminium, heater inside; size template); 120 C 3 min resist bake (F75)');
			for (let i = 0; i < 3; i++) {
				const a = (i / 3) * Math.PI * 2;
				this.add('oven', 'steel', cylY(2500, yb - ph, yb, R * 0.6 * Math.cos(a), -R * 0.6 * Math.sin(a), 12), 'proximity pins (height template)');
			}
			this.addOwn('oven', 'lid', hw('#9aa0a8', 0.4, 0.5, { side: THREE.DoubleSide }), ringY(R + 10_000, R + 16_000, yb - 20_000, 30_000, 96, 0, 0, 0, Math.PI), 'hot-plate cover (back half; template)');
		} else {
			const w = mm('oven_w_mm') / 2, h = mm('oven_h_mm');
			const wall = hw('#b9bec5', 0.45, 0.5, { side: THREE.DoubleSide });
			const y0 = yb - 40_000;
			this.addOwn('oven', 'wall', wall, boxMM(-w, w, y0 - 10_000, y0, -w, w), 'oven floor (chamber size template)');
			this.addOwn('oven', 'wall', wall, boxMM(-w, w, y0 + h, y0 + h + 10_000, -w, 0), 'oven top (front half cut away)');
			this.addOwn('oven', 'wall', wall, boxMM(-w - 10_000, -w, y0, y0 + h, -w, w), 'oven side wall');
			this.addOwn('oven', 'wall', wall, boxMM(w, w + 10_000, y0, y0 + h, -w, w), 'oven side wall');
			this.addOwn('oven', 'wall', wall, boxMM(-w, w, y0, y0 + h, -w - 10_000, -w), 'oven back wall');
			this.add('oven', 'steel', boxMM(-w, w, yb - 6000, yb, -w * 0.9, w * 0.9), 'wafer shelf (template)');
			for (let i = 0; i < 5; i++) this.addOwn('oven', 'heater', this.heat, rod(new THREE.Vector3(-w * 0.85, y0 + h * (0.25 + i * 0.13), -w + 12_000), new THREE.Vector3(w * 0.85, y0 + h * (0.25 + i * 0.13), -w + 12_000), 6000, 12), 'heater elements on the back wall (template; temperature in the HUD)');
			this.flow = this.points('oven', 300, '#cfe0ff', 1.3, 0.45, 'N2 circulation (F171: N2 or forming gas; illustrative)');
			this.flow.userData.box = [w, y0, h];
		}
	}
	protected geomKey(args: ToolArgs): string {
		return this.hot(args) ? 'hot' : 'oven';
	}
	private temp(args: ToolArgs, ctx: ToolCtx): { T: number | null; status: 'reported' | 'derived' | 'template' } {
		if (ctx.profile.T !== undefined) return { T: ctx.profile.T, status: 'reported' };
		const s = this.spec;
		if (this.hot(args)) return { T: ctx.phase === 'process' ? num(args, s, 'soft_bake_c') : 25, status: stat(args, s, 'soft_bake_c') };
		const pts = this.traces(args)[0].pts;
		const D = pts[pts.length - 1][0];
		const tr = ctx.tReal_s !== null ? ctx.tReal_s : ctx.phase === 'process' ? ctx.u * D : ctx.phase === 'retract' ? D : 0;
		let T = pts[0][1];
		for (let i = 1; i < pts.length; i++) if (tr <= pts[i][0]) {
			const [t0, a] = pts[i - 1], [t1, b] = pts[i];
			T = a + ((b - a) * (tr - t0)) / Math.max(1e-9, t1 - t0);
			break;
		} else T = pts[i][1];
		return { T, status: 'derived' };
	}
	protected animate(_t: number, args: ToolArgs, ctx: ToolCtx): void {
		const { T } = this.temp(args, ctx);
		// no incandescence below the Draper point (525 C, materials README convention): heater state is HUD-only
		if (this.heat) this.heat.emissiveIntensity = T === null || T < 525 ? 0 : 0.6 * clamp01((T - 525) / 400);
		const p = this.flow;
		if (!p) return;
		const [w, y0, h] = p.userData.box as number[];
		const n = (p.geometry.attributes.position as THREE.BufferAttribute).count;
		let k = 0;
		for (let i = 0; i < n && ctx.phase === 'process'; i++) {
			const sP = fract(hash(i, 71) + 0.3 * ctx.tPlay_s);
			const z = -w + 2 * w * hash(i, 72) * 0.5;
			setPt(p, k++, -w * 0.9 + 1.8 * w * sP, y0 + h * (0.6 + 0.35 * hash(i, 73)), z);
		}
		ptsDone(p, k);
	}
	/** Default PI cure profile: ramp at ramp_c_min from 25 C to the set point, hold, cool at the same rate (template). */
	traces(args: ToolArgs): Trace[] {
		const s = this.spec;
		if (this.hot(args)) {
			const T = num(args, s, 'soft_bake_c');
			return [{ key: 'T', label: 'hot plate', q: 'T', unit: 'C', pts: [[0, T], [180, T]], status: 'reported', note: '120 C, 3 min (F75)' }];
		}
		const Tc = num(args, s, 'pi_cure_c'), r = num(args, s, 'ramp_c_min') / 60, hold = num(args, s, 'pi_cure_min') * 60;
		const up = (Tc - 25) / r;
		return [{ key: 'T', label: 'oven (PI cure)', q: 'T', unit: 'C', pts: [[0, 25], [up, Tc], [up + hold, Tc], [2 * up + hold, 25]], status: 'derived', note: 'ramp 2-4 C/min (midpoint) to 350 C, 30 min (F171); cool-down at the ramp rate is a template' }];
	}
	defaultDuration(args: ToolArgs): number {
		const p = this.traces(args)[0].pts;
		return p[p.length - 1][0];
	}
	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const { T, status } = this.temp(args, ctx);
		return [
			{ key: 'T', label: 'temperature', value: T === null ? null : +T.toFixed(1), unit: 'C', status, note: 'op profile when given; else PI-2600 ramp 2-4 C/min to 350 C (F171)' },
			{ key: 'set', label: 'cure set point', value: num(args, s, 'pi_cure_c'), unit: 'C', status: stat(args, s, 'pi_cure_c'), note: `${num(args, s, 'pi_cure_min')} min (F171); packaging PI 200-250 C 1-2 h (F173)` },
			{ key: 'ramp', label: 'ramp', value: num(args, s, 'ramp_c_min'), unit: 'C/min', status: stat(args, s, 'ramp_c_min') }
		];
	}
}

// ---------------------------------------------------------------- temporary wafer bonder

export const BOND_SPEC: Record<string, PDim> = {
	bond_c: rep(215, 'C', 'F152', 'AIMECHATEC bonder, 120 s'),
	bond_s: rep(120, 's', 'F152'),
	adhesive_um: rep(70, 'um', 'F152'),
	release_um: rep(1, 'um', 'F152'),
	carrier_um: rep(700, 'um', 'F154', 'glass carrier (1.1 mm in F156)'),
	chuck_margin_mm: tpl(15, 'mm', 'bond chuck margin beyond the wafer not found'),
	chuck_h_mm: tpl(35, 'mm', 'bond chuck thickness not found')
};
const BOND_LIFT_UM = 40_000; // view parameter: top chuck travel before contact

export class WaferBonder extends FabBase {
	readonly id = 'wafer_bonder';
	readonly name = 'Temporary wafer bonder';
	readonly scales = ['work'] as 'work'[];
	readonly spec = BOND_SPEC;
	protected override occluderParts(): string[] {
		return ['top|own:frame', 'top|steel', 'bottom|steel'];
	}
	private heatT: THREE.MeshStandardMaterial | null = null;
	private heatB: THREE.MeshStandardMaterial | null = null;

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 775);
		const m = mm('chuck_margin_mm');
		const h = mm('chuck_h_mm');
		this.heatB = this.keep(hw('#a9aeb5', 0.45, 0.55, { emissive: new THREE.Color('#ff7a30'), emissiveIntensity: 0 }));
		this.heatT = this.keep(hw('#a9aeb5', 0.45, 0.55, { emissive: new THREE.Color('#ff7a30'), emissiveIntensity: 0 }));
		const bot = this.rig('bottom');
		bot.position.set(C.x, 0, C.z);
		this.addOwn('bottom', 'chuckB', this.heatB, cylY(R + m, yb - h, yb, 0, 0, 128), 'heated bottom chuck, 215 C (F152); size template');
		this.addOwn('bottom', 'frame', hw('#3a3e44', 0.6, 0.3), box(2 * (R + m) + 120_000, 30_000, 2 * (R + m) + 120_000, 0, yb - h - 15_000, 0), 'bonder base (template)');
		// press drawn as a cut-away: back half of the top chuck / platen / ram, back columns only (audit V1 C1)
		for (const [dx, dz] of [[1, -1], [-1, -1]]) {
			this.add('bottom', 'steel', cylY(14_000, yb - h, 420_000, dx * (R + m + 40_000), dz * (R + m + 40_000), 24), 'guide column (template)');
		}
		const top = this.rig('top');
		top.position.set(C.x, 0, C.z);
		this.addOwn('top', 'chuckT', this.heatT, ringY(1, R + m, 0, h, 128, 0, 0, 0, Math.PI), 'heated top chuck / pressure plate holding the glass carrier (size template; front half cut away)');
		const a = R + m + 60_000;
		this.addOwn('top', 'frame', hw('#3a3e44', 0.6, 0.3), boxMM(-a, a, h, h + 40_000, -a, 0), 'top platen (template; front half cut away)');
		this.add('top', 'steel', ringY(1, 45_000, h + 40_000, h + 200_000, 32, 0, 0, 0, Math.PI), 'press ram (template)');
	}
	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		// carrier top after bonding: surface + adhesive + release + carrier (the engine moves the carrier itself)
		const zTop = f.surface_um + num(args, s, 'adhesive_um') + num(args, s, 'release_um') + num(args, s, 'carrier_um');
		const yc = yOf(f, zTop);
		const lift = BOND_LIFT_UM;
		const down = ctx.phase === 'approach' ? 0 : ctx.phase === 'retract' ? 1 - smooth((t - 0.9) / 0.1) : smooth((u - 0.3) / 0.2);
		this.rig('top').position.y = yc + (1 - down) * lift;
		this.setHold({ on: ctx.phase !== 'retract', x: 0, y: yc + (1 - down) * lift, z: 0 });
		const heat = ctx.phase === 'process' && u >= 0.5 ? 1 : 0;
		const g = 0.25 * heat * clamp01((num(args, s, 'bond_c') - 525) / 400); // 0 at 215 C (no visible glow below 525 C)
		if (this.heatB) this.heatB.emissiveIntensity = g;
		if (this.heatT) this.heatT.emissiveIntensity = g;
	}
	traces(args: ToolArgs): Trace[] {
		const s = this.spec;
		const T = num(args, s, 'bond_c'), t = num(args, s, 'bond_s');
		return [{ key: 'T', label: 'bond chuck', q: 'T', unit: 'C', pts: [[0, T], [t, T]], status: 'reported', note: '215 C for 120 s (F152); ramps not reported' }];
	}
	defaultDuration(args: ToolArgs): number {
		return num(args, this.spec, 'bond_s');
	}
	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const stg = u < 0.3 ? 'adhesive coat' : u < 0.5 ? 'align' : 'press + heat';
		return [
			{ key: 'stage', label: `stage: ${stg}`, value: null, unit: '', status: 'derived', note: 'op bond_temp phases (contract)' },
			{ key: 'T', label: 'bond temperature', value: num(args, s, 'bond_c'), unit: 'C', status: stat(args, s, 'bond_c') },
			{ key: 't', label: 'bond time', value: num(args, s, 'bond_s'), unit: 's', status: stat(args, s, 'bond_s') },
			{ key: 'stack', label: 'adhesive / release', value: num(args, s, 'adhesive_um'), unit: `/ ${num(args, s, 'release_um')} um`, status: stat(args, s, 'adhesive_um') },
			{ key: 'P', label: 'bond pressure', value: null, unit: 'MPa', status: 'template', note: 'not reported (F152)' }
		];
	}
}

// ---------------------------------------------------------------- dry-film roll laminator

export const ROLL_SPEC: Record<string, PDim> = {
	roll_c: der(115, 'C', 'midpoint of the 105-125 C hot roll window (PCB dry film, low)', ['F79'], '(105 + 125) / 2'),
	roll_bar: der(3, 'bar', 'midpoint of 2.5-3.5 bar', ['F79'], '(2.5 + 3.5) / 2'),
	speed_m_min: der(2, 'm/min', 'midpoint of 1-3 m/min', ['F79'], '(1 + 3) / 2'),
	film_um: rep(19, 'um', 'F78', 'one of the DB dry-film thicknesses (5, 7, 19, 80 um)'),
	roll_d_mm: tpl(100, 'mm', 'hot roll diameter not found'),
	roll_len_mm: tpl(380, 'mm', 'roll face length not found')
};

export class RollLaminator extends FabBase {
	readonly id = 'laminator';
	readonly name = 'Dry-film roll laminator';
	readonly scales = ['work'] as 'work'[];
	readonly spec = ROLL_SPEC;
	private laid: THREE.Mesh | null = null;
	private web: THREE.Mesh | null = null;

	protected build(f: ToolFrame, args: ToolArgs): void {
		const s = this.spec;
		const mm = (k: string) => num(args, s, k) * 1000;
		const C = carrierCenter(f);
		const W = carrierSize(f);
		const R = W.r;
		const yb = backY(f, args, 775);
		const rr = mm('roll_d_mm') / 2;
		const L = mm('roll_len_mm');
		const fh = Math.max(mm('film_um') / 1000, f.illustrative ? 400 : 0);
		const g = new THREE.CylinderGeometry(rr, rr, L, 64);
		g.rotateX(Math.PI / 2);
		const roll = this.rig('roll');
		roll.position.set(0, 0, C.z);
		this.addOwn('roll', 'rubber', hw('#3a3c3f', 0.8, 0), g.clone().translate(0, fh + rr, 0), 'heated top roll, 105-125 C, 2.5-3.5 bar (F79, PCB dry film); size template');
		this.addOwn('roll', 'rubber', hw('#3a3c3f', 0.8, 0), g.translate(0, yb - rr, 0), 'bottom roll');
		const axle = new THREE.CylinderGeometry(rr * 0.25, rr * 0.25, L + 80_000, 16);
		axle.rotateX(Math.PI / 2);
		this.add('roll', 'steel', axle.clone().translate(0, fh + rr, 0), 'roll shaft');
		this.add('roll', 'steel', axle.translate(0, yb - rr, 0), 'roll shaft');
		const sup = new THREE.CylinderGeometry(rr * 0.9, rr * 0.9, L * 0.95, 48);
		sup.rotateX(Math.PI / 2);
		this.add('roll', 'dry_film', sup.translate(rr * 2.2, fh + rr * 4.2, 0), 'dry film supply roll (template)');
		// web from the supply roll down onto the top roll (moves with the roll)
		const web = new THREE.BoxGeometry(1, 1, L * 0.92);
		this.web = this.mesh('roll', 'dry_film', web, 'dry film web');
		this.web.userData.a = new THREE.Vector3(rr * 2.2 - rr * 0.6, fh + rr * 4.2 - rr * 0.7, 0);
		this.web.userData.b = new THREE.Vector3(rr * 0.85, fh + rr * 1.5, 0);
		// laid film behind the nip (grows with the roll position)
		this.laid = this.mesh('base', 'dry_film', box(1, fh, 2 * R + 20_000, 0.5, fh / 2, 0), 'laminated dry film, light blue (F80); thickness F78');
		this.laid.position.set(C.x - R - 20_000, 0, C.z);
	}
	private xRoll(ctx: ToolCtx, f: ToolFrame): number {
		const R = carrierSize(f).r;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		return -R - 20_000 + u * (2 * R + 40_000);
	}
	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const C = carrierCenter(f);
		const e = engage(t, ctx);
		const x = this.xRoll(ctx, f);
		const roll = this.rig('roll');
		roll.position.set(C.x + x, (1 - e) * 40_000 * 0, C.z);
		const rr = num(args, this.spec, 'roll_d_mm') * 500;
		// rolls turn with the traverse (no slip): angle = distance / radius (scaled visual)
		for (const c of roll.children) if (c.userData.tip?.startsWith('heated') || c.userData.tip === 'bottom roll') c.rotation.z = -(x / rr) * 0.05;
		if (this.laid) {
			const len = Math.max(1, x + carrierSize(f).r + 20_000);
			this.laid.scale.x = len;
			this.laid.visible = ctx.phase !== 'approach';
		}
		if (this.web) {
			const a = this.web.userData.a as THREE.Vector3, b = this.web.userData.b as THREE.Vector3;
			const d = new THREE.Vector3().subVectors(b, a);
			const fh = Math.max(num(args, this.spec, 'film_um'), f.illustrative ? 400 : 0);
			this.web.position.copy(a).addScaledVector(d, 0.5);
			this.web.scale.set(d.length(), fh, 1);
			this.web.rotation.z = Math.atan2(d.y, d.x);
		}
	}
	readouts(_t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const R = this.frame ? carrierSize(this.frame).r : 150_000;
		return [
			{ key: 'T', label: 'hot roll', value: num(args, s, 'roll_c'), unit: 'C', status: stat(args, s, 'roll_c') },
			{ key: 'P', label: 'roll pressure', value: num(args, s, 'roll_bar'), unit: 'bar', status: stat(args, s, 'roll_bar') },
			{ key: 'v', label: 'speed', value: num(args, s, 'speed_m_min'), unit: 'm/min', status: stat(args, s, 'speed_m_min'), note: `one pass over ${(2 * R) / 1000} mm takes ${((2 * R) / 1e6 / num(args, s, 'speed_m_min')) * 60} s` },
			{ key: 'x', label: 'nip position', value: this.frame ? +(this.xRoll(ctx, this.frame) / 1000).toFixed(1) : null, unit: 'mm', status: 'derived' }
		];
	}
}

export const createWetBench = (args?: ToolArgs) => new WetBench(args);
export const createCureOven = (args?: ToolArgs) => new CureOven(args);
export const createWaferBonder = (args?: ToolArgs) => new WaferBonder(args);
export const createRollLaminator = (args?: ToolArgs) => new RollLaminator(args);
