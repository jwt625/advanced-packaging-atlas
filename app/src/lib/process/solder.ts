// Solder shapes: as formed (plated cylinder, paste, sphere) -> free cap (free reflow, `shape`) -> joint (melted while
// joined, `jshape`), volume-conserving at the end states (zero-load truncated sphere).
import { v } from './data';
import { freeH, solderVolume, wetR } from './model';
import { capHeight, capRadius, jointHeight, zoneRadius } from './physics';
import type { SolderBody } from './types';

export function capHeightFor(b: SolderBody): number {
	return capHeight(solderVolume(b), wetR(b));
}
export function jointHeightFor(b: SolderBody): number {
	return jointHeight(solderVolume(b), wetR(b), v(b.joint_top_d_um, v(b.d_um)) / 2);
}

/** Profile [r per zeta in 0..1 from the base] and height.
 * shape: free reflow progress (as formed -> free cap); g: growth; js: joint progress (free -> joint);
 * hJoint: drawn joint height (the gap: free height minus the piece's collapse); topR: radius of the pad / deposit the
 * joint wets at its far end (default joint_top_d_um / 2). */
export function solderProfile(b: SolderBody, shape: number, g: number, js: number, n: number, hJoint?: number, topR?: number): { h: number; r: number[] } {
	const d = v(b.d_um);
	const h0 = (b.form === 'sphere' ? d : v(b.h_um)) * Math.max(0, Math.min(1, g));
	const a = wetR(b);
	const hCap = capHeightFor(b);
	const hF = freeH(b, shape, g);
	const top = topR ?? v(b.joint_top_d_um, d) / 2;
	const hJ = hJoint != null && Number.isFinite(hJoint) && hJoint > 0 ? hJoint : jointHeight(solderVolume(b), a, top);
	const joint = js > 0 && Number.isFinite(hJ) && hJ > 0;
	const h = joint ? (hJoint != null ? hJ : hF + (hJ - hF) * js) : hF;
	const r: number[] = [];
	for (let i = 0; i <= n; i++) {
		const zeta = i / n;
		let r0: number;
		if (b.form === 'sphere') {
			const R = d / 2;
			const z = zeta * h0;
			r0 = Math.sqrt(Math.max(0, R * R - (z - R) * (z - R)));
			// a solid ball touches its pad at a point; the wetted foot grows only once it melts (V2 n2)
			if (i === 0) r0 = Math.min(a, R) * Math.max(0, Math.min(1, shape));
		} else if (b.form === 'paste') r0 = (d / 2) * (1 - 0.15 * zeta * zeta);
		else r0 = d / 2;
		const rc = capRadius(a, hCap, zeta * hCap);
		const rf = r0 + (rc - r0) * shape;
		const rj = joint ? zoneRadius(a, top, hJ, zeta * hJ) : rf;
		r.push(rf + (rj - rf) * (joint ? js : 0));
	}
	return { h, r };
}
