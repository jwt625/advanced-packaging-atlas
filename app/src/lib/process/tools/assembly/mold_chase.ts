// Compression mold chase (op mold). Cavity-down machine (TOWA, A121; panel tool A122; film handling A124): the
// movable chase holds a wafer-shaped cavity lined with an ETFE release film (A125) sucked into it by vacuum; the EMC
// charge lies on the film in the cavity; the carrier is held face-down on the opposite chase. Drawn in the tool frame
// (front of the piece toward +Y), so the cavity chase is above the piece and closes downward.
// Contract u split: dispense [0, .2), close [.2, .6), cure [.6, 1]. Closing speed not reported (A136): linear.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import {
	BaseActor,
	blockWin,
	box,
	boxMM,
	carrierCenter,
	carrierSize,
	cyl,
	cylZ,
	der,
	hash,
	live,
	num,
	opt,
	halfCyl,
	halfPocketPlate,
	rep,
	seg,
	setInst,
	smooth,
	tpl,
	type Readout
} from './common';

export const MOLD_SPEC: Record<string, PDim> = {
	clamp_kn: rep(294, 'kN', 'A127', 'TOWA CPM1080, granular EMC, 12 in CoW wafer'),
	mold_c: rep(140, 'C', 'A127', 'in-mold cure temperature'),
	cure_s: rep(900, 's', 'A127', 'in-mold cure time'),
	pmc_c: rep(175, 'C', 'A127', 'post-mold cure 175 C, 5 h (separate cure step)'),
	mold_um: rep(895, 'um', 'A129', 'mold thickness (WCM330MS over-mold); the op mold_top_z_um overrides'),
	film_um: tpl(50, 'um', 'ETFE release film, preferred 16-75 um (A125); 50 um drawn as in the A6.2 summary', undefined, ['A125']),
	open_gap_mm: tpl(30, 'mm', 'open mold gap; gap-closure profile not reported (A136); linear closure', undefined, ['A136']),
	cavity_inset_mm: tpl(3, 'mm', 'cavity radius smaller than the wafer so the film-covered chase clamps the wafer rim; not reported', undefined, ['A121']),
	chase_margin_mm: tpl(60, 'mm', 'chase block beyond the cavity per side; not reported'),
	chase_h_mm: tpl(80, 'mm', 'chase block height drawn; not reported'),
	roll_d_mm: tpl(60, 'mm', 'release-film unwind / wind roll diameter; not reported (rolls per A124)', undefined, ['A124']),
	post_d_mm: tpl(40, 'mm', 'guide post diameter; not reported'),
	granule_mm: tpl(1.5, 'mm', 'granular EMC granule size not reported (granules per A122)', undefined, ['A122']),
	filler_max_um: rep(20, 'um', 'A132', 'granular EMC A max filler 20 um (material texture, not drawn here)'),
	charge_frac: der(1, '1', 'charge volume = cavity volume (mass = rho x area x thickness, A123; EMC density N/A)', ['A123'], 'drawn as a melt layer of cavity depth')
};

const MAX_GRAN = 900;

export class MoldChase extends BaseActor {
	readonly id = 'mold_chase';
	readonly name = 'Compression mold chase';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = MOLD_SPEC;
	private args: ToolArgs = {};
	private depthY = 0;
	private gran: THREE.InstancedMesh | null = null;
	private charge: THREE.Mesh | null = null;
	private cavR = 0;
	private cavW = 0;
	private cavD = 0;
	private disk = true;
	private zc = 0;

	protected geomKey(args: ToolArgs): string {
		return String(opt(args, 'mold_top_z_um'));
	}
	configure(args: ToolArgs): void {
		this.args = args;
	}
	private moldTop(f: ToolFrame): number {
		return opt(this.args, 'mold_top_z_um') ?? f.surface_um + this.spec.mold_um.value;
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const yS = f.zmap(f.surface_um);
		this.depthY = Math.max(f.zmap(this.moldTop(f)) - yS, 1);
		const film = s.film_um.value;
		if (f.scale === 'block') {
			const w = blockWin(f);
			const H = Math.max(w.h * 0.6, 50);
			const x0 = w.x0, x1 = w.x1, z0 = w.zBack;
			this.add('chase', 'steel', boxMM(x0, x1, film, film + H, z0, w.zSec), 'cavity chase face (cropped)');
			this.add('chase', 'daf', boxMM(x0, x1, 0, film, z0, w.zSec), 'ETFE release film 50 um (A125)');
			return;
		}
		const cs = carrierSize(f);
		const c = carrierCenter(f);
		this.disk = cs.disk;
		const inset = s.cavity_inset_mm.value * 1000;
		const m = s.chase_margin_mm.value * 1000;
		const H = s.chase_h_mm.value * 1000;
		const W = cs.w + 2 * m, Dd = cs.d + 2 * m;
		const dep = this.depthY;
		// Work scale is a cutaway (audit V1 C1): every machine part is cut at the section plane through the focus
		// (tool z = 0) and only the far half (z <= 0) is drawn, so the cavity, film, charge and closing gap stay visible.
		// Rig-local coordinates are centred on the carrier; zc is the cut plane in them (0 when the focus is the centre).
		const zc = -c.z;
		this.zc = zc;
		if (cs.disk) {
			this.cavR = cs.w / 2 - inset;
			const g = halfPocketPlate(W, Dd, H, this.cavR, dep + film, 192);
			g.translate(0, film, zc);
			this.add('chase', 'steel', g, 'movable cavity chase, cut away at the section plane (wafer-shaped cavity, A121 / A124)');
			this.add('chase', 'daf', halfCyl(this.cavR, film, 0, film + dep + film / 2, zc, 192), 'ETFE release film (A125), vacuum-sucked onto the cavity (A124)');
			this.add('chase', 'daf', halfCyl(this.cavR, dep, 0, film + dep / 2, zc, 192, true), 'release film on the cavity wall');
		} else {
			this.cavW = cs.w - 2 * inset;
			this.cavD = cs.d - 2 * inset;
			const cw = this.cavW, cd = this.cavD;
			this.add('chase', 'steel', boxMM(-W / 2, W / 2, film + dep, film + H, -Dd / 2, zc), 'movable cavity chase, cut away (panel cavity, A122)');
			for (const [x0, x1, z0, z1] of [[-W / 2, -cw / 2, -Dd / 2, zc], [cw / 2, W / 2, -Dd / 2, zc], [-cw / 2, cw / 2, -Dd / 2, -cd / 2]])
				this.add('chase', 'steel', boxMM(x0, x1, film, film + dep, z0, Math.min(z1, zc)), 'cavity side wall');
			this.add('chase', 'daf', boxMM(-cw / 2, cw / 2, film + dep, film + dep + film, -cd / 2, zc), 'ETFE release film (A125)');
		}
		this.add('chase', 'daf', boxMM(-W / 2 - 80000, W / 2 + 80000, 0, film, -Dd * 0.45, zc), 'release film between unwind and wind rolls (A124)');
		const rr = s.roll_d_mm.value * 500;
		const rl = Dd * 0.46 + zc;
		for (const sx of [-1, 1]) {
			this.addOcc('chase', 'daf', cylZ(rr, rl, sx * (W / 2 + 80000 + rr), film - rr, zc - rl / 2, 48), sx < 0 ? 'film unwind roll (A124)' : 'film wind roll (A124)');
			this.addOcc('chase', 'steel', cylZ(rr * 0.35, rl + 20000, sx * (W / 2 + 80000 + rr), film - rr, zc - (rl + 20000) / 2, 24), 'roll core');
		}
		// stationary holding chase under the carrier back face (physically the upper chase, A121), cut the same way
		const yb = f.zmap(0);
		this.add('base', 'steel', boxMM(c.x - W / 2, c.x + W / 2, yb - H, yb, c.z - Dd / 2, 0), 'holding chase: carrier held by vacuum (A121, A124), cut away');
		const pr = s.post_d_mm.value * 500;
		const gap = s.open_gap_mm.value * 1000 * (f.illustrative ? 2 : 1);
		for (const sx of [-1, 1]) this.addOcc('base', 'steel', cyl(pr, H + gap + H, c.x + sx * (W / 2 - pr * 2), yb + (gap + H) / 2, c.z - (Dd / 2 - pr * 2), 32), 'guide post (far pair; near pair cut away)');
		// charge: melt layer (half, cut at the section) + granules on its free face
		const chG = cs.disk ? halfCyl(this.cavR * 0.98, dep, 0, 0, zc, 160) : boxMM(-this.cavW * 0.49, this.cavW * 0.49, -dep / 2, dep / 2, -this.cavD * 0.49, zc);
		this.charge = this.mesh('charge', 'emc', chG, 'EMC charge in the cavity (granular, A122; colour black A135), sectioned', { cure: 0, front: 1 });
		this.gran = this.inst('charge', 'emc', new THREE.IcosahedronGeometry(1, 0), MAX_GRAN, 'EMC granules (size template)', { cure: 0 });
		this.rig('chase').position.copy(c);
		this.rig('charge').position.copy(c);
	}

	/** Mold gap (tool-frame um) at this t: open in approach, linear close [.2, .6) (A136 N/A), open in retract. */
	private gapAt(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): { gap: number; disp: number } {
		// illustrative work scale: stroke drawn at 2x the template open gap so the closing reads (view exaggeration)
		const open = f.scale === 'work' ? num(args, this.spec, 'open_gap_mm') * 1000 * (f.illustrative ? 2 : 1) : Math.max(blockWin(f).h * 1.2, 100);
		let gap: number, disp = 1;
		if (ctx.phase === 'approach') {
			gap = open;
			disp = 0;
		} else if (ctx.phase === 'process') {
			disp = smooth(seg(ctx.u, 0, 0.2));
			gap = open * (1 - smooth(seg(ctx.u, 0.2, 0.6)));
		} else gap = open * smooth((t - 0.9) / 0.1);
		// The engine's live gap_um is the cavity height of its squeeze model (sub-mm), not the chase stroke: the stroke
		// is drawn from the op phases (open -> close -> clamp / cure hold -> open) so the closing reads at the work scale.
		return { gap, disp };
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const cs = carrierSize(f);
		const c = carrierCenter(f);
		const yS = f.zmap(f.surface_um);
		const { gap } = this.gapAt(t, args, ctx, f);
		const top = yS + gap + this.spec.film_um.value * 2 + this.depthY;
		return new THREE.Box3(new THREE.Vector3(c.x - cs.w / 2, f.zmap(0), c.z - cs.d / 2), new THREE.Vector3(c.x + cs.w / 2, top, c.z + cs.d / 2));
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const yS = f.zmap(f.surface_um);
		const { gap, disp } = this.gapAt(t, args, ctx, f);
		const chase = this.rig('chase');
		if (f.scale === 'block') {
			chase.position.set(0, f.zmap(this.moldTop(f)) + gap, 0);
			return;
		}
		chase.position.y = yS + gap;
		// charge hangs on the film at the cavity ceiling; it is shown until it meets the piece (then the fill body takes over)
		const ceil = yS + gap + s.film_um.value + this.depthY;
		// rolls, roll cores and guide posts are context: drawn at 35 % opacity so the cavity and the wafer read
		this.setPartOpacity('daf', 0.35);
		this.setPartOpacity('steel', 0.35);
		// charge: granules melt (shrink into the melt layer) while the chase closes; at clamp the fill body takes over
		const melt = ctx.phase === 'process' ? smooth(seg(ctx.u, 0.3, 0.58)) : 0;
		const show = ctx.phase === 'process' && ctx.u < 0.6;
		const ch = this.charge!;
		ch.visible = show && disp > 0;
		ch.scale.set(1, Math.max(disp, 0.001), 1);
		ch.position.set(0, ceil - (this.depthY * disp) / 2, 0);
		const g = this.gran!;
		let n = 0;
		if (show && disp > 0) {
			const gr = s.granule_mm.value * 500;
			const cnt = Math.floor(MAX_GRAN * disp);
			for (let i = 0; i < cnt; i++) {
				const a = hash(i, 1) * Math.PI * 2;
				const rad = this.disk ? Math.sqrt(hash(i, 2)) * this.cavR * 0.95 : 0;
				const x = this.disk ? Math.cos(a) * rad : (hash(i, 3) - 0.5) * this.cavW * 0.95;
				const z = this.disk ? Math.sin(a) * rad : (hash(i, 4) - 0.5) * this.cavD * 0.95;
				if (z > this.zc) continue; // cutaway: far half only
				setInst(g, n++, x, ceil - this.depthY * disp - gr * 0.6 * (1 - melt), z, gr * (0.7 + 0.6 * hash(i, 5)) * (1 - 0.9 * melt));
			}
		}
		g.count = n;
		g.instanceMatrix.needsUpdate = true;
		this.setMat('emc', { cure: 0 });
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const stage = ctx.phase !== 'process' ? (ctx.phase === 'approach' ? 0 : 4) : u < 0.2 ? 1 : u < 0.6 ? 2 : 3;
		const cure = ctx.phase === 'process' ? seg(u, 0.6, 1) : ctx.phase === 'retract' ? 1 : 0;
		const f = this.frame;
		return [
			{ key: 'stage', label: 'stage (1 charge 2 close 3 cure 4 open)', value: stage, unit: '1', status: 'derived' },
			{ key: 'clamp', label: 'clamp force', value: u >= 0.6 && ctx.phase === 'process' ? num(args, s, 'clamp_kn') : 0, unit: 'kN', status: s.clamp_kn.status },
			{ key: 'T', label: 'mold T', value: num(args, s, 'mold_c'), unit: 'C', status: s.mold_c.status },
			{ key: 'cure', label: 'in-mold cure (fraction of schedule)', value: cure, unit: '1', status: 'derived', note: `of ${s.cure_s.value} s (A127); PMC ${s.pmc_c.value} C 5 h is a separate step` },
			{ key: 'mold_top', label: 'mold top', value: f ? this.moldTop(f) : null, unit: 'um', status: opt(this.args, 'mold_top_z_um') !== null ? 'reported' : 'reported', note: 'op mold_top_z_um, else A129 895 um above the surface' },
			{ key: 'charge_mass', label: 'EMC charge mass', value: null, unit: 'g', status: 'template', note: 'EMC density not found (A123 rule; gap 2)' }
		];
	}
}

export const createMoldChase = (args?: ToolArgs) => {
	const a = new MoldChase();
	if (args) a.configure(args);
	return a;
};
