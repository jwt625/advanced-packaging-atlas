// Inspection (op inspect). Deliberately minimal.
//  - xray_ct (default): sealed X-ray tube below the piece, flat-panel detector above, oblique views about the
//    inspection point (Nordson Dage XD7600 named for ectc51687.2025.00027-F1-s17; geometry from public vendor /
//    reseller pages, template with source); CT = detector orbit at a fixed tilt. The cone is a guide (X-rays are
//    invisible). Block scale: a scan plane sweeping across the window (the engine turns the block view x-ray).
//  - sam (args.method = 'sam'): acoustic transducer with a water couplant column, raster scan over the unit.

import * as THREE from 'three';
import type { PDim, ToolArgs, ToolCtx, ToolFrame } from '../../types';
import { BaseActor, blockWin, box, cyl, str, tpl, type Readout } from './common';

const MOOV = 'https://moov.co/marketplace/xray-xrd-xrf/nordson-dage/nordson-dage-xd7600nt/25e25d8445ac43cd9fbdbcb259b29cd2';
const NNCI = 'https://nnci.net/tools/dage-x-ray-xd7600nt';
const XD7800 = 'https://oritech.straightsell.com.au/XD7800NT/Nordson-XD7800NT-Ruby-XL-X_dash_Ray-System/pd.php';

export const XRAY_SPEC: Record<string, PDim> = {
	tube_kv: tpl(160, 'kV', 'XD7600NT tube 30-160 kV (reseller listing; not a research row)', MOOV),
	oblique_max_deg: tpl(70, 'deg', 'up to 70 deg oblique views over the inspection area (tool page)', NNCI),
	area_w_mm: tpl(458, 'mm', 'max inspection area 458 x 407 mm (press / reseller text)', MOOV),
	area_d_mm: tpl(407, 'mm', 'max inspection area 458 x 407 mm', MOOV),
	tilt_deg: tpl(45, 'deg', 'CT orbit tilt drawn; within the 70 deg limit; run value not reported', NNCI),
	sod_mm: tpl(20, 'mm', 'focal spot to inspection point; not reported (tube below the detector per XD7800NT page, same family)', XD7800),
	sdd_mm: tpl(400, 'mm', 'focal spot to detector; not reported', XD7800),
	det_mm: tpl(200, 'mm', 'flat-panel detector size drawn; not reported'),
	tube_d_mm: tpl(90, 'mm', 'sealed tube housing diameter drawn; not reported'),
	sam_tr_d_mm: tpl(12, 'mm', 'SAM transducer diameter; not reported (no SAM step in the current flows)'),
	sam_wd_mm: tpl(8, 'mm', 'SAM water path (focal distance) drawn; not reported')
};

export class XrayCt extends BaseActor {
	readonly id = 'xray_ct';
	readonly name = 'Inspection (X-ray CT / SAM)';
	readonly scales = ['work', 'block'] as ('work' | 'block')[];
	readonly spec = XRAY_SPEC;
	private sam = false;
	private cone: THREE.Mesh | null = null;
	private planeM: THREE.Mesh | null = null;

	protected geomKey(args: ToolArgs): string {
		return str(args, 'method', 'xray_ct');
	}
	configure(args: ToolArgs): void {
		this.sam = str(args, 'method', 'xray_ct') === 'sam';
	}

	protected build(f: ToolFrame): void {
		const s = this.spec;
		if (f.scale === 'block') {
			const w = blockWin(f);
			const g = new THREE.PlaneGeometry(1, 1);
			g.rotateY(Math.PI / 2);
			this.planeM = this.glow('scan', g, this.sam ? '#6fb0ff' : '#9fd8ff', 0.18, this.sam ? 'acoustic scan line (guide)' : 'X-ray scan plane (guide; X-rays are invisible)');
			this.planeM.scale.set(1, w.h * 1.4, w.zSec - w.zBack);
			return;
		}
		if (this.sam) {
			const d = s.sam_tr_d_mm.value * 1000, wd = s.sam_wd_mm.value * 1000;
			this.add('tr', 'steel', cyl(d / 2, 40000, 0, wd + 20000, 0, 40), 'ultrasonic transducer (template)');
			this.add('tr', 'glass', cyl(d / 2, 3000, 0, wd + 1500, 0, 40, d / 2), 'acoustic lens');
			this.add('tr', 'glass', cyl(d * 0.45, wd, 0, wd / 2, 0, 40, d * 0.3), 'water couplant column (drawn with the clear-glass look)');
			this.addOcc('tr', 'al', box(30000, 30000, 30000, 0, wd + 55000, 0), 'scan axis carriage');
			return;
		}
		const td = s.tube_d_mm.value * 1000;
		// tube rig: origin at the focal spot, axis +Y toward the sample
		this.add('tube', 'steel', cyl(6000, 12000, 0, -6000, 0, 32, 2000), 'tube nose / transmission window');
		this.addOcc('tube', 'al', cyl(td / 2, 260000, 0, -12000 - 130000, 0, 48), 'sealed X-ray tube housing, 160 kV class (template with source)');
		const dm = s.det_mm.value * 1000;
		// detector rig: origin at the detector face center, normal -Y toward the sample
		this.add('det', 'si', box(dm * 0.85, 2000, dm * 0.85, 0, 1000, 0), 'flat-panel detector face (template size)');
		this.addOcc('det', 'al', box(dm, 40000, dm, 0, 2000 + 20000, 0), 'detector housing (tilts for oblique views up to 70 deg)');
		const cone = new THREE.ConeGeometry(1, 1, 4, 1, true);
		cone.rotateY(Math.PI / 4);
		cone.translate(0, -0.5, 0); // apex at origin, base at y = -1
		cone.rotateX(Math.PI); // apex at origin, base at y = +1
		this.cone = this.glow('cone', cone, '#9fd8ff', 0.1, 'X-ray cone from the focal spot to the detector (guide; X-rays are invisible)');
	}

	protected animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void {
		const s = this.spec;
		const on = ctx.phase === 'process';
		const u = on ? ctx.u : ctx.phase === 'retract' ? 1 : 0;
		const yS = f.zmap(f.surface_um);
		if (f.scale === 'block') {
			const w = blockWin(f);
			const p = this.planeM!;
			p.visible = on;
			p.position.set(w.x0 + (w.x1 - w.x0) * u, yS - w.h * 0.3, (w.zSec + w.zBack) / 2);
			return;
		}
		if (this.sam) {
			const W = f.unit.w_um, D = f.unit.d_um;
			const lines = 16;
			const li = Math.min(lines - 1, Math.floor(u * lines));
			const fr = u * lines - li;
			const x = -f.focus_um.x - W / 2 + W * (li % 2 ? 1 - fr : fr);
			const z = f.focus_um.y - D / 2 + (D * (li + 0.5)) / lines;
			this.rig('tr').position.set(x, yS + (on ? 0 : 30000), z);
			return;
		}
		// CT: detector orbits the inspection point at a fixed tilt; tube opposite (relative motion of the stage)
		const tilt = ((on ? s.tilt_deg.value * Math.min(1, u * 8) : 0) * Math.PI) / 180;
		const az = on && !ctx.reduceMotion ? 2 * Math.PI * u : 0;
		const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
		const P = new THREE.Vector3(0, yS * 0.5, 0);
		const sod = s.sod_mm.value * 1000, sdd = s.sdd_mm.value * 1000;
		const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
		const tube = this.rig('tube');
		tube.position.copy(P).addScaledVector(dir, -sod);
		tube.quaternion.copy(q);
		const det = this.rig('det');
		det.position.copy(P).addScaledVector(dir, sdd - sod);
		det.quaternion.copy(q);
		const c = this.cone!;
		c.visible = on;
		const half = s.det_mm.value * 1000 * 0.85 * 0.5 * Math.SQRT2;
		c.position.copy(tube.position);
		c.quaternion.copy(q);
		c.scale.set(half, sdd, half);
	}

	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null {
		const f = this.frame;
		if (!f || f.scale !== 'work') return null;
		const yS = f.zmap(f.surface_um);
		const cx = -f.focus_um.x, cz = f.focus_um.y, w = f.unit.w_um / 2, d = f.unit.d_um / 2;
		return new THREE.Box3(new THREE.Vector3(cx - w, f.back_y ?? yS - 1000, cz - d), new THREE.Vector3(cx + w, yS + 5000, cz + d));
	}

	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[] {
		const s = this.spec;
		const u = ctx.phase === 'process' ? ctx.u : null;
		if (this.sam) return [{ key: 'scan', label: 'raster progress', value: u, unit: '1', status: 'derived' }];
		return [
			{ key: 'kv', label: 'tube voltage (max)', value: s.tube_kv.value, unit: 'kV', status: 'template' },
			{ key: 'tilt', label: 'oblique tilt', value: u === null ? null : s.tilt_deg.value, unit: 'deg', status: 'template' },
			{ key: 'az', label: 'orbit azimuth', value: u === null ? null : 360 * u, unit: 'deg', status: 'derived' },
			{ key: 'mag', label: 'geometric magnification', value: s.sdd_mm.value / s.sod_mm.value, unit: '1', status: 'derived', note: 'SDD / SOD (template inputs)' }
		];
	}
}

export const createXrayCt = (args?: ToolArgs) => {
	const a = new XrayCt();
	if (args) a.configure(args);
	return a;
};
