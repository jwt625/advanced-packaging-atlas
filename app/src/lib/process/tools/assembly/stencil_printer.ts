// Stencil printer (op print): stainless stencil foil (thickness = op stencil_um) in a frame on the board, metal
// squeegee blade at 60 deg pushing a rolling paste bead across the unit; paste fills the apertures behind the front
// (paste bodies: engine). Snap-off / separation in the retract phase. Squeegee angle, speed and pressure are common
// public guideline values (template with source), not values of the flows' (unnamed) printer.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, blockWin, boxMM, carrierSize, carrierCenter, cylZ, live, num, opt, perforated, seg, setInst, siteGrid, smooth, tpl, type Grid, type Readout } from './common';

const SMP = 'https://www.surfacemountprocess.com/solder-paste-printing-process.html';
const CN = 'https://www.circuitnet.com/experts/88766.html';
const ALLPCB = 'https://www.allpcb.com/blog/pcb-assembly/the-art-of-squeegee-selection-optimizing-stencil-printing-for-consistent-results.html';

export const PRINT_SPEC: Record<string, PDim> = {
	stencil_um: tpl(100, 'um', 'stencil foil thickness: the print op states stencil_um (required); this default only draws the tool standalone'),
	angle_deg: tpl(60, 'deg', 'standard 60 deg squeegee blade angle (public guideline; printer of the flows not named)', ALLPCB),
	speed_mm_s: tpl(25, 'mm/s', 'typical print speed setting 25 mm/s (public guideline; 20-30 mm/s starting point per a second source)', SMP),
	pressure_g_25mm: tpl(500, 'g', '500 g per 25 mm of blade (public guideline)', SMP),
	blade_t_um: tpl(250, 'um', 'metal squeegee blade thickness; not reported'),
	blade_free_mm: tpl(30, 'mm', 'blade free length below the holder; not reported'),
	roll_d_mm: tpl(15, 'mm', 'rolling paste bead diameter; not reported'),
	overtravel_mm: tpl(20, 'mm', 'stroke beyond the unit edge each side; not reported'),
	foil_mm: tpl(650, 'mm', 'stencil foil size inside the frame; not reported'),
	frame_mm: tpl(736, 'mm', 'stencil frame outer size (29 in frame class); not reported'),
	snap_mm: tpl(2, 'mm', 'stencil separation distance drawn in the retract phase; not reported'),
	aperture_ratio: tpl(0.55, '1', 'aperture diameter / site pitch when no aperture_um is passed; not reported'),
	pitch_um: tpl(1000, 'um', 'site pitch when no site_pitch_um is passed (BGA 1 mm pitch analog, A141)', undefined, ['A141'])
};

export class StencilPrinter extends BaseActor {
	readonly id = 'stencil_printer';
	readonly name = 'Stencil printer (squeegee + stencil)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = PRINT_SPEC;
	private args: ToolArgs = {};
	private grid: Grid | null = null;
	private roll: THREE.Mesh | null = null;
	private ap = 0;

	protected geomKey(args: ToolArgs): string {
		return ['stencil_um', 'site_x_um', 'site_y_um', 'site_w_um', 'site_d_um', 'site_pitch_um', 'aperture_um'].map((k) => JSON.stringify(args[k] ?? null)).join('|');
	}
	configure(args: ToolArgs): void {
		this.args = args;
	}
	private st(): number {
		return num(this.args, this.spec, 'stencil_um');
	}
	/** Stroke x range (tool frame) for the squeegee front. */
	private stroke(f: ToolFrame): [number, number] {
		if (f.scale === 'block') {
			const w = blockWin(f);
			return [w.x0 - 0.3 * w.span, w.x1 + 0.3 * w.span];
		}
		const o = this.spec.overtravel_mm.value * 1000;
		const cx = -f.focus_um.x;
		return [cx - f.unit.w_um / 2 - o, cx + f.unit.w_um / 2 + o];
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		const st = this.st();
		const yS = f.zmap(f.surface_um);
		const pitch = num(this.args, s, 'pitch_um');
		this.ap = opt(this.args, 'aperture_um') ?? s.aperture_ratio.value * (opt(this.args, 'site_pitch_um') ?? pitch);
		const bt = s.blade_t_um.value;
		const bl = f.scale === 'work' ? s.blade_free_mm.value * 1000 : Math.min(s.blade_free_mm.value * 1000, 2.5 * blockWin(f).h); // block: blade cropped
		const ang = (s.angle_deg.value * Math.PI) / 180;
		let bladeLen: number;
		if (f.scale === 'work') {
			// cutaway (audit V1 C1): foil, frame bar, blade, holder and paste bead drawn behind the section plane only
			// (tool z <= 0), so the board, its pads and the printed paste stay visible in front
			const c = carrierCenter(f);
			const m = 15000;
			const ux0 = -f.focus_um.x - f.unit.w_um / 2 - m, ux1 = -f.focus_um.x + f.unit.w_um / 2 + m;
			const uz0 = f.focus_um.y - f.unit.d_um / 2 - m;
			this.add('stencil', 'steel', boxMM(ux0, ux1, yS, yS + st, uz0, 0), 'stainless stencil foil (thickness = op stencil_um), cut away at the section plane; apertures below a pixel at this scale');
			this.addOcc('stencil', 'al', boxMM(ux0 - 40000, ux1 + 40000, yS + st, yS + st + 30000, uz0 - 40000, uz0), 'stencil frame (29 in class; template), far bar only');
			void c;
			bladeLen = (f.unit.d_um + 40000) / 2;
		} else {
			const w = blockWin(f);
			const pitchB = opt(this.args, 'site_pitch_um') ?? pitch;
			const g = siteGrid(this.args, f, pitchB, 0, { x0: w.x0 - 2 * pitchB, x1: w.x1 + 2 * pitchB, z0: w.zBack - 2 * pitchB, z1: w.zSec + 2 * pitchB });
			this.grid = g;
			this.add('stencil', 'steel', perforated(w.x0, w.x1, w.zBack, w.zSec + this.ap, yS, st, g.pts, this.ap / 2, 40), 'stencil foil with apertures (cropped)');
			bladeLen = w.zSec - w.zBack;
		}
		// blade: rig origin = blade tip line on the stencil top; blade leans with its top ahead (acute 60 deg wedge ahead)
		const blade = boxMM(-bt / 2, bt / 2, 0, bl, -bladeLen / 2, bladeLen / 2);
		blade.rotateZ(-(Math.PI / 2 - ang));
		const zc = f.scale === 'work' ? -bladeLen / 2 : (blockWin(f).zSec + blockWin(f).zBack) / 2;
		blade.translate(0, 0, zc);
		this.add('blade', 'steel', blade, 'metal squeegee blade at 60 deg (public guideline value, template)');
		const hx = Math.cos(ang) * bl, hy = Math.sin(ang) * bl;
		if (f.scale === 'work') this.addOcc('blade', 'al', boxMM(hx - 6000, hx + 14000, hy, hy + 25000, zc - bladeLen / 2, zc + bladeLen / 2), 'squeegee holder');
		const rr = s.roll_d_mm.value * 500;
		this.roll = this.mesh('roll', 'solder_paste', cylZ(rr, bladeLen * 0.85, 0, 0, zc, 48), 'rolling solder paste bead (diameter template)', { melt: 0, finish: 0 });
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const st = this.st();
		const yS = f.zmap(f.surface_um);
		const [xa, xb] = this.stroke(f);
		const lf = live(ctx, 'front_x_um');
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const xf = lf !== null ? lf - f.focus_um.x : xa + (xb - xa) * u;
		const snap = ctx.phase === 'retract' ? smooth(seg(t, 0.9, 0.97)) * (f.scale === 'work' ? s.snap_mm.value * 1000 : Math.max(blockWin(f).h * 0.3, 2 * st)) : 0;
		const up = f.scale === 'work' ? 20000 : Math.max(blockWin(f).h * 0.8, 200);
		const down = ctx.phase === 'approach' ? 1 - smooth(t / 0.12) : ctx.phase === 'retract' ? smooth(seg(t, 0.9, 0.95)) : 0;
		this.rig('stencil').position.y = snap;
		this.rig('blade').position.set(xf, yS + st + up * down + snap, 0);
		const rr = s.roll_d_mm.value * 500;
		const roll = this.rig('roll');
		roll.position.set(xf + rr * 1.05, yS + st + rr + up * down + snap, 0);
		if (this.roll) this.roll.rotation.z = ctx.reduceMotion ? 0 : -((xf - xa) / rr); // rolls with the stroke (pure in x)
		this.setMat('solder_paste', { melt: 0, finish: 0 });
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const yS = f.zmap(f.surface_um);
		const cx = -f.focus_um.x, cz = f.focus_um.y;
		return new THREE.Box3(new THREE.Vector3(cx - f.unit.w_um / 2, f.back_y ?? yS - 2000, cz - f.unit.d_um / 2), new THREE.Vector3(cx + f.unit.w_um / 2, yS + 20000, cz + f.unit.d_um / 2));
	}

	defaultDuration(args: ToolArgs): number | null {
		const f = this.frame;
		if (!f) return null;
		const [xa, xb] = this.stroke(f);
		return (xb - xa) / 1000 / num(args, this.spec, 'speed_mm_s');
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const f = this.frame;
		const [xa, xb] = f ? this.stroke(f) : [0, 0];
		const u = ctx.phase === 'process' ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		return [
			{ key: 'front', label: 'squeegee front', value: f ? (xa + (xb - xa) * u + f.focus_um.x) / 1000 : null, unit: 'mm', status: 'derived' },
			{ key: 'speed', label: 'print speed', value: num(args, s, 'speed_mm_s'), unit: 'mm/s', status: 'template' },
			{ key: 'angle', label: 'squeegee angle', value: num(args, s, 'angle_deg'), unit: 'deg', status: 'template' },
			{ key: 'stencil', label: 'stencil thickness', value: this.st(), unit: 'um', status: opt(this.args, 'stencil_um') !== null ? 'reported' : 'template' },
			{ key: 'aperture', label: 'aperture', value: this.ap, unit: 'um', status: opt(this.args, 'aperture_um') !== null ? 'reported' : 'template' }
		];
	}
}

export const createStencilPrinter = (args?: ToolArgs) => {
	const a = new StencilPrinter();
	if (args) a.configure(args);
	return a;
};
