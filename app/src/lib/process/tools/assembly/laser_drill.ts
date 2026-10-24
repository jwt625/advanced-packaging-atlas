// Laser via drill (op etch_via method laser; op etch_recess for cavities): galvo scan head with an f-theta lens
// above the panel, beam focused to the via (CO2 9.3 um >= 40 um vias, A167; UV 355 nm down to ~5 um, A168-A169),
// ablation plume at the spot. The galvo visits vias one by one (about 800-900 holes/s on two-beam CO2 machines with
// a 1 kHz galvo, public source); here the spot jumps between sites at a visual rate. Both wavelengths are invisible
// or near-invisible: the beam is drawn as a faint guide. etch_recess: raster scan over the cavity rectangle.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, blockWin, box, cyl, hash, num, opt, rep, siteGrid, str, tpl, type Grid, type Readout } from './common';

const IPC_HVM = 'https://www.ipc.org/system/files/technical_resource/E33%26S04-3%20Sekin-Tran-Matsumura.pdf';
const NOVANTA = 'https://novantaphotonics.com/?p=12894';

export const LASER_SPEC: Record<string, PDim> = {
	co2_wl_um: rep(9.3, 'um', 'A167', 'CO2 laser wavelength for ~40 um ABF microvias'),
	co2_via_um: rep(40, 'um', 'A167', 'CO2 via diameter (practical minimum ~40 um)'),
	uv_wl_nm: rep(355, 'nm', 'A168', 'UV-YAG 355 nm'),
	uv_via_um: rep(5, 'um', 'A168', 'smallest UV via ~5 um'),
	uv_spot_um: rep(6.5, 'um', 'A169', 'ps UV percussion beam ~6.5 um'),
	via_top_um: rep(42, 'um', 'A170', '40 um target via: top ~42 um, bottom ~38 um on 30 um dielectric'),
	via_bot_um: rep(38, 'um', 'A170'),
	galvo_hz: tpl(1000, 'Hz', 'two-beam CO2 machines with a 1,000 Hz galvano scanner (Hitachi Via Mechanics, IPC paper; not in the research rows)', IPC_HVM),
	holes_s: tpl(850, '1/s', '800-900 holes/s for 60-70 um blind holes (same IPC paper)', IPC_HVM),
	beams: tpl(2, '1', 'two-beam CO2 machines in mass production (same IPC paper); one head drawn', IPC_HVM),
	f_theta_mm: tpl(100, 'mm', 'f-theta focal length 100 mm (galvo drilling reference, Novanta / Scanlab); machine of the flows not named (A181)', NOVANTA, ['A181']),
	beam_at_lens_mm: tpl(10, 'mm', 'beam diameter at the scan lens; not reported (A181)', undefined, ['A181']),
	head_w_mm: tpl(120, 'mm', 'galvo head housing width; not reported (A181)', undefined, ['A181']),
	site_pitch_um: tpl(200, 'um', 'via pitch when no site_pitch_um is passed; not reported'),
	cavity_mm: rep(8, 'mm', 'A191', 'EMIB bridge up to 8 x 8 mm: cavity raster area when no cut rect is passed'),
	raster_pitch_um: tpl(20, 'um', 'cavity raster line pitch when the op gives none; not reported (fs-laser half-cavity analog A200)', undefined, ['A200'])
};

export class LaserDrill extends BaseActor {
	readonly id = 'laser_drill';
	readonly name = 'Laser via drill (galvo scan head)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = LASER_SPEC;
	private args: ToolArgs = {};
	private grid: Grid | null = null;
	private beam: THREE.Mesh | null = null;
	private plume: THREE.Mesh | null = null;
	private uv = false;
	private lensY = 0;

	protected geomKey(args: ToolArgs): string {
		return [str(args, 'laser', 'co2'), ...['site_x_um', 'site_y_um', 'site_w_um', 'site_d_um', 'site_pitch_um', 'd_um'].map((k) => JSON.stringify(args[k] ?? null))].join('|');
	}
	configure(args: ToolArgs): void {
		this.args = args;
		const l = str(args, 'laser', 'co2').toLowerCase();
		this.uv = l === 'uv' || l.includes('355') || l.includes('uv');
	}
	private viaD(): number {
		return opt(this.args, 'd_um') ?? (this.uv ? this.spec.uv_spot_um.value : this.spec.via_top_um.value);
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const pitch = num(this.args, s, 'site_pitch_um');
		const win = f.scale === 'block' ? blockWin(f) : null;
		const clip = win ? { x0: win.x0, x1: win.x1, z0: win.zBack, z1: win.zSec + pitch } : { x0: -f.unit.w_um / 2, x1: f.unit.w_um / 2, z0: -f.unit.d_um / 2, z1: f.unit.d_um / 2 };
		this.grid = siteGrid(this.args, f, pitch, 0, clip, 4000);
		const yS = f.zmap(f.surface_um);
		const F = s.f_theta_mm.value * 1000;
		this.lensY = yS + F;
		// colour by wavelength class: IR (CO2 9.3 / 10.6 um, IR fs) is invisible -> faint neutral guide; UV 355 nm -> faint violet
		const color = this.uv ? '#6a4fd8' : '#8a9096';
		const wl = this.uv ? '355 nm (near-UV, A168); faint violet guide' : 'IR (CO2 9.3 um A167 / IR fs): invisible, drawn as a faint neutral guide';
		if (f.scale === 'work') {
			const hw = s.head_w_mm.value * 1000;
			this.add('head', 'glass', cyl(28000, 4000, 0, this.lensY + 2000, 0, 48), 'f-theta scan lens (focal 100 mm, template with source)');
			this.addOcc('head', 'al', cyl(34000, 40000, 0, this.lensY + 4000 + 20000, 0, 48), 'scan lens barrel');
			this.addOcc('head', 'al', box(hw, 90000, hw, 0, this.lensY + 44000 + 45000, 0), 'galvo scan head (X / Y mirrors inside; 1 kHz galvo, template with source)');
			this.addOcc('head', 'al', cyl(18000, 300000, 0, this.lensY + 134000 + 150000, 0, 32), 'beam delivery tube');
		}
		const rTop = f.scale === 'work' ? (s.beam_at_lens_mm.value * 1000) / 2 : this.viaD() * 0.9;
		const cone = new THREE.CylinderGeometry(rTop, this.viaD() / 2, 1, 32, 1, true);
		cone.translate(0, 0.5, 0);
		this.beam = this.glow('beam', cone, color, f.scale === 'work' ? 0.12 : 0.14, `laser beam guide, ${wl}`);
		this.plume = this.glow('beam', new THREE.SphereGeometry(1, 24, 16), this.uv ? '#c9b8ff' : '#ffb36a', 0.55, 'ablation plume at the via (look template)');
	}

	/** Spot position (tool frame x, z) at this time: via sites (etch_via) or a cavity raster (etch_recess). */
	private spot(ctx: ToolCtx, f: ToolFrame): [number, number] {
		const g = this.grid!;
		if (ctx.op === 'etch_recess') {
			const s = this.spec;
			const w = opt(this.args, 'cut_w_um') ?? s.cavity_mm.value * 1000;
			const d = opt(this.args, 'cut_d_um') ?? s.cavity_mm.value * 1000;
			const cx = (opt(this.args, 'cut_x_um') ?? f.focus_um.x) - f.focus_um.x;
			const cz = -((opt(this.args, 'cut_y_um') ?? f.focus_um.y) - f.focus_um.y);
			let [x0, x1, z0, z1] = [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2];
			if (f.scale === 'block') {
				const bw = blockWin(f);
				[x0, x1, z0, z1] = [Math.max(x0, bw.x0), Math.min(x1, bw.x1), Math.max(z0, bw.zBack), Math.min(z1, bw.zSec)];
			}
			const lines = f.scale === 'work' ? 24 : Math.max(2, Math.round((z1 - z0) / num(this.args, s, 'raster_pitch_um')));
			const p = (ctx.tPlay_s * (f.scale === 'work' ? 0.6 : 0.15)) % 1;
			const li = Math.floor(p * lines);
			const fr = p * lines - li;
			const x = x0 + (x1 - x0) * (li % 2 ? 1 - fr : fr);
			return [x, z0 + ((z1 - z0) * (li + 0.5)) / lines];
		}
		if (!g.pts.length) return [0, 0];
		const k = Math.floor(ctx.tPlay_s * 6);
		if (f.scale === 'block') {
			// most of the time on the site nearest the window center, with short jumps to neighbours
			let best = 0, bd = Infinity;
			for (let i = 0; i < g.pts.length; i++) {
				const d2 = g.pts[i][0] ** 2 + g.pts[i][1] ** 2;
				if (d2 < bd) {
					bd = d2;
					best = i;
				}
			}
			const i = k % 4 === 0 ? Math.floor(hash(k, 5) * g.pts.length) : best;
			return g.pts[i];
		}
		return g.pts[Math.floor(hash(k, 9) * g.pts.length)];
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const yS = f.zmap(f.surface_um);
		const on = ctx.phase === 'process';
		const [sx, sz] = this.spot(ctx, f);
		const head = this.rigs.get('head');
		const lift = ctx.phase === 'approach' ? (1 - t / 0.12) * 60000 : ctx.phase === 'retract' ? ((t - 0.9) / 0.1) * 60000 : 0;
		if (head) head.position.set(0, lift, 0);
		const beam = this.beam!, plume = this.plume!;
		beam.visible = on;
		plume.visible = on;
		if (!on) return;
		// depth of the current via (engine live depth_um when given), the beam ends at the via floor
		const dep = ctx.live?.depth_um ?? 0;
		const yBot = f.zmap(f.surface_um - dep);
		const top = new THREE.Vector3(f.scale === 'work' ? 0 : sx, f.scale === 'work' ? this.lensY : yS + Math.max(blockWin(f).h * 2, 400), f.scale === 'work' ? 0 : sz);
		const bot = new THREE.Vector3(sx, yBot, sz);
		const dir = top.clone().sub(bot);
		const L = dir.length();
		beam.position.copy(bot);
		beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
		beam.scale.set(1, L, 1);
		const flick = ctx.reduceMotion ? 1 : 0.75 + 0.25 * hash(Math.floor(ctx.tPlay_s * 30), 2);
		const pr = this.viaD() * (f.scale === 'work' ? 40 : 0.9) * flick;
		plume.position.set(sx, yS + pr * 0.6, sz);
		plume.scale.set(pr, pr * 1.4, pr);
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const yS = f.zmap(f.surface_um);
		const cx = -f.focus_um.x, cz = f.focus_um.y, w = f.unit.w_um / 2, d = f.unit.d_um / 2;
		return new THREE.Box3(new THREE.Vector3(cx - w, f.back_y ?? yS - 1000, cz - d), new THREE.Vector3(cx + w, yS + 30000, cz + d));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		return [
			this.uv
				? { key: 'laser', label: 'UV wavelength', value: s.uv_wl_nm.value, unit: 'nm', status: 'reported' }
				: typeof args.laser === 'string' || ctx.op !== 'etch_recess'
					? { key: 'laser', label: 'CO2 wavelength', value: s.co2_wl_um.value, unit: 'um', status: 'reported', note: 'A167' }
					: { key: 'laser', label: 'laser wavelength', value: null, unit: 'um', status: 'template', note: 'not stated for the femtosecond cavity tool (A200); beam drawn as a neutral guide' },
			{ key: 'via', label: 'via (spot) diameter', value: this.viaD(), unit: 'um', status: opt(this.args, 'd_um') !== null ? 'reported' : 'reported' },
			{ key: 'rate', label: 'drill rate (real)', value: s.holes_s.value, unit: 'holes/s', status: 'template', note: 'spot jumps drawn at a visual rate' },
			{ key: 'depth', label: 'via depth', value: ctx.live?.depth_um ?? null, unit: 'um', status: 'derived' },
			{ key: 'sites', label: 'vias in view', value: this.grid?.pts.length ?? null, unit: '1', status: 'derived' }
		];
	}
}

export const createLaserDrill = (args?: ToolArgs) => {
	const a = new LaserDrill();
	if (args) a.configure(args);
	return a;
};
