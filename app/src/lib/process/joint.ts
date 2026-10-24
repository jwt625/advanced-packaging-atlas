// Joints (fix round 1): which solder bodies are in a join, free (unjoined) reflow vs joint formation, contact
// heights from the current shapes, hybrid ball + paste joints (audit A1 m2), and the rigid-piece collapse (A1 M4).
// Pure functions of the state.
import { v, type FlowIndex } from './data';
import { freeH, joinXf, siteGrid, solderVolume, wetR, type Grid } from './model';
import { jointHeight, zoneRadius } from './physics';

export { freeH, solderVolume, wetR };
import type { SceneState, SolderBody } from './types';

/** Solder body -> the joined piece whose joint it forms (join.solder, else the placed piece's own solder). */
export function jointMembers(ix: FlowIndex, s: SceneState): Map<string, string> {
	const m = new Map<string, string>();
	for (const [pid, ps] of Object.entries(s.pieces)) {
		if (!ps.join) continue;
		const ids = ps.join.solder ?? (ix.byPiece.get(pid) ?? []).filter((b) => b.kind === 'solder').map((b) => b.id);
		for (const id of ids) m.set(id, pid);
	}
	return m;
}

export interface Hybrid {
	piece: string; // placed piece
	ball: SolderBody; // on the placed piece
	paste: SolderBody; // on the onto piece, same sites
}

const near = (a: number, b: number) => Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));
function aligned(g: Grid, h: Grid): boolean {
	return near(g.cx, h.cx) && near(g.cy, h.cy) && near(g.px, h.px) && near(g.py, h.py) && g.nx === h.nx && g.ny === h.ny;
}

/** Ball (placed piece) + paste / cap (onto piece) pairs at coinciding sites: one joint once either melts. */
export function hybrids(ix: FlowIndex, s: SceneState): Hybrid[] {
	const out: Hybrid[] = [];
	for (const [pid, ps] of Object.entries(s.pieces)) {
		const j = ps.join;
		if (!j || !j.at.length) continue;
		const xf = joinXf(j, j.at[0], 0);
		const own = (ix.byPiece.get(pid) ?? []).filter((b): b is SolderBody => b.kind === 'solder' && !!s.bodies[b.id]?.on && (!j.solder || j.solder.includes(b.id)));
		const other = (ix.byPiece.get(j.onto) ?? []).filter((b): b is SolderBody => b.kind === 'solder' && !!s.bodies[b.id]?.on);
		for (const b of own) {
			const sb = ix.site.get(b.site);
			if (!sb) continue;
			const gb = siteGrid(sb, xf);
			for (const q of other) {
				const sq = ix.site.get(q.site);
				if (sq && aligned(gb, siteGrid(sq))) out.push({ piece: pid, ball: b, paste: q });
			}
		}
	}
	return out;
}

/** Joint members incl. hybrid partners (the onto-side paste of a ball joint): solder id -> placed piece. */
export function allMembers(ix: FlowIndex, s: SceneState): { members: Map<string, string>; hy: Hybrid[] } {
	const members = jointMembers(ix, s);
	const hy = hybrids(ix, s);
	for (const h of hy) {
		members.set(h.ball.id, h.piece);
		members.set(h.paste.id, h.piece);
	}
	return { members, hy };
}

/** Collapse of one hybrid pair and the drawing parameters. jb / jp: joint progress (melted while joined). */
export function hybridState(h: Hybrid, s: SceneState): { c: number; mode: 'none' | 'both' | 'paste' | 'ball'; hb: number; hp: number } {
	const sb = s.bodies[h.ball.id], sp = s.bodies[h.paste.id];
	const jb = sb.sub.jshape ?? 0, jp = sp.sub.jshape ?? 0;
	const hb = freeH(h.ball, sb.shape, sb.g), hp = freeH(h.paste, sp.shape, sp.g);
	if (jb > 0 && jp > 0) {
		const H = jointHeight(solderVolume(h.ball) + solderVolume(h.paste), wetR(h.ball), wetR(h.paste));
		return { c: Math.min(jb, jp) * Math.max(0, hb + hp - H), mode: 'both', hb, hp };
	}
	if (jp > 0) return { c: jp * hp, mode: 'paste', hb, hp }; // solid ball sinks through the molten paste to the pad
	if (jb > 0) {
		const rp = pasteTopR(h.paste, sp.shape);
		const H = jointHeight(solderVolume(h.ball), wetR(h.ball), rp);
		return { c: jb * Math.max(0, hb - H), mode: 'ball', hb, hp };
	}
	return { c: 0, mode: 'none', hb, hp };
}

/** Top radius of a paste / cap deposit (the pad a molten ball wets when the paste stays solid). */
export function pasteTopR(b: SolderBody, shape: number): number {
	const top = b.form === 'paste' ? (v(b.d_um) / 2) * 0.85 : v(b.d_um) / 2;
	return top * (1 - shape) + Math.min(top, wetR(b) * 0.6) * shape;
}

/** Rigid-piece collapse: the smallest over its joint fields (a field not yet molten holds the piece). */
export function pieceCollapse(ix: FlowIndex, s: SceneState, pid: string, members: Map<string, string>, hy: Hybrid[]): number {
	let c = Infinity;
	const inHy = new Set<string>();
	for (const h of hy) if (h.piece === pid) {
		c = Math.min(c, hybridState(h, s).c);
		inHy.add(h.ball.id);
		inHy.add(h.paste.id);
	}
	for (const [id, p] of members) {
		if (p !== pid || inHy.has(id)) continue;
		const b = ix.body.get(id);
		if (!b || b.kind !== 'solder') continue;
		const st = s.bodies[id];
		if (!st?.on) continue;
		const js = st.sub.jshape ?? 0;
		const H = jointHeight(solderVolume(b), wetR(b), v(b.joint_top_d_um, v(b.d_um)) / 2);
		const hf = freeH(b, st.shape, st.g);
		if (Number.isFinite(H) && Number.isFinite(hf)) c = Math.min(c, js * Math.max(0, hf - H));
	}
	return Number.isFinite(c) ? c : 0;
}

/** Paste fillet around a solid ball resting on the pad (mode 'paste'): rings (z from the pad, inner = ball surface,
 * outer tapering from the pad radius) holding the paste volume. ballR(z): ball radius at height z above its tip. */
export function filletRings(Vp: number, rPad: number, ballR: (z: number) => number, hMax: number, n = 10): { z: number; rin: number; rout: number }[] {
	const vol = (hf: number) => {
		let V = 0;
		const m = 24;
		for (let i = 0; i < m; i++) {
			const z = ((i + 0.5) / m) * hf;
			const ro = rPad + (ballR(hf) - rPad) * (z / hf), ri = Math.min(ballR(z), ro);
			V += Math.PI * Math.max(0, ro * ro - ri * ri) * (hf / m);
		}
		return V;
	};
	let lo = 0, hi = Math.max(1e-6, hMax);
	if (vol(hi) < Vp) lo = hi;
	else for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (vol(m) < Vp) lo = m; else hi = m; }
	const hf = Math.max(1e-6, (lo + hi) / 2);
	const out: { z: number; rin: number; rout: number }[] = [];
	for (let i = 0; i <= n; i++) {
		const z = (i / n) * hf;
		const ro = rPad + (ballR(hf) - rPad) * (z / hf);
		out.push({ z, rin: Math.min(ballR(z), ro), rout: ro });
	}
	return out;
}

/** Zone (joint) radius profile between pads a (bottom) and b (top) over height H. */
export const zoneR = (a: number, b: number, H: number, z: number) => zoneRadius(a, b, H, z);
