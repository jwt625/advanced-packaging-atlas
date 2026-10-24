// Body geometry queries (declared, piece frame) and assembly transforms (piece frame -> root frame).
import { v, type FlowIndex } from './data';
import { capHeight } from './physics';
import type { Body, BodyState, FilmBody, HoleBody, Join, LineFillBody, SceneState, SlabBody, Site, SolderBody, ViaFillBody } from './types';

/** Map piece -> root (A2 N3: quarter-turn rotations): [x'; y'] = [a b; c d] [x; y] + [tx; ty] with an orthogonal
 * integer matrix (flip about x then rotate, as the builder), z' = sz z + tz. */
export interface Xf {
	a: number;
	b: number;
	c: number;
	d: number;
	sz: number;
	tx: number;
	ty: number;
	tz: number;
}
export const ID_XF: Xf = { a: 1, b: 0, c: 0, d: 1, sz: 1, tx: 0, ty: 0, tz: 0 };

export function compose(P: Xf, L: Xf): Xf {
	return {
		a: P.a * L.a + P.b * L.c, b: P.a * L.b + P.b * L.d, c: P.c * L.a + P.d * L.c, d: P.c * L.b + P.d * L.d,
		tx: P.a * L.tx + P.b * L.ty + P.tx, ty: P.c * L.tx + P.d * L.ty + P.ty,
		sz: P.sz * L.sz, tz: P.sz * L.tz + P.tz
	};
}
/** Point piece -> root. */
export const xyTo = (f: Xf, x: number, y: number): [number, number] => [f.a * x + f.b * y + f.tx, f.c * x + f.d * y + f.ty];
/** Point root -> piece (orthogonal matrix: inverse = transpose). */
export const xyFrom = (f: Xf, x: number, y: number): [number, number] => {
	const dx = x - f.tx, dy = y - f.ty;
	return [f.a * dx + f.c * dy, f.b * dx + f.d * dy];
};
/** The map swaps the x and y axes (90 / 270 deg). */
export const swapsXY = (f: Xf) => Math.abs(f.a) < 0.5;
/** Axis-aligned rect through a map (corners -> bounding box). */
export function rectTo(f: Xf, r: { x0: number; x1: number; y0: number; y1: number }, inverse = false) {
	const m = inverse ? xyFrom : xyTo;
	const p = [m(f, r.x0, r.y0), m(f, r.x1, r.y0), m(f, r.x0, r.y1), m(f, r.x1, r.y1)];
	return { x0: Math.min(...p.map((q) => q[0])), x1: Math.max(...p.map((q) => q[0])), y0: Math.min(...p.map((q) => q[1])), y1: Math.max(...p.map((q) => q[1])) };
}

/** Root-frame z range of a piece-frame z range. */
export function zToRoot(xf: Xf, z0: number, z1: number): [number, number] {
	return xf.sz > 0 ? [z0 + xf.tz, z1 + xf.tz] : [xf.tz - z1, xf.tz - z0];
}
/** Piece-frame z of a root-frame z. */
export function zFromRoot(xf: Xf, z: number): number {
	return xf.sz > 0 ? z - xf.tz : xf.tz - z;
}

// ---------------------------------------------------------------- declared geometry

export function liningFilms(ix: FlowIndex, holeId: string): FilmBody[] {
	return ix.flow.bodies.filter((b): b is FilmBody => b.kind === 'film' && !!b.lines?.includes(holeId)).sort((a, b) => v(a.z_um) - v(b.z_um));
}
export function viaFillOf(ix: FlowIndex, holeId: string): ViaFillBody | undefined {
	return ix.flow.bodies.find((b): b is ViaFillBody => b.kind === 'via_fill' && b.hole === holeId);
}
/** Top of the field above a hole: the hole top or the highest lining film's field top. */
export function mouthTop(ix: FlowIndex, h: HoleBody): number {
	let z = v(h.z_top_um);
	for (const f of liningFilms(ix, h.id)) z = Math.max(z, v(f.z_um) + v(f.h_um));
	return z;
}

/** Declared z range (piece frame) of a body at full growth. */
export function declZ(ix: FlowIndex, b: Body): [number, number] {
	switch (b.kind) {
		case 'hole':
			return [v(b.z_top_um) - v(b.depth_um), v(b.z_top_um)];
		case 'via_fill': {
			const h = ix.body.get(b.hole) as HoleBody | undefined;
			if (!h) return [0, 0];
			return [v(h.z_top_um) - v(h.depth_um), mouthTop(ix, h) + v(b.overburden?.h_um, 0)];
		}
		case 'line_fill': {
			const h = ix.body.get(b.host) as SlabBody | undefined;
			if (!h) return [0, 0];
			const top = v(h.z_um) + v(h.h_um);
			return [top - trenchDepth(h), top + v(b.overburden?.h_um, 0)];
		}
		case 'solder':
			// v1.1: dir 'down' hangs below its base plane z_um
			return b.dir === 'down' ? [v(b.z_um) - v(b.h_um), v(b.z_um)] : [v(b.z_um), v(b.z_um) + v(b.h_um)];
		default:
			return [v(b.z_um), v(b.z_um) + v(b.h_um)];
	}
}

/** Trench depth of a slab with lines (default: the full slab). */
export function trenchDepth(h: SlabBody): number {
	return Math.min(v(h.h_um), v(h.lines?.depth_um, v(h.h_um)));
}
export function lineFillOf(ix: FlowIndex, slabId: string): LineFillBody | undefined {
	return ix.flow.bodies.find((b): b is LineFillBody => b.kind === 'line_fill' && b.host === slabId);
}

/** Declared z range clipped by the body's trim planes and growth-independent removal. */
export function liveZ(ix: FlowIndex, b: Body, st: BodyState): [number, number] {
	let [z0, z1] = b.kind === 'solder' ? solderZ(b, st) : declZ(ix, b);
	if (b.kind === 'fill' && st.sub.top != null) z1 = st.sub.top;
	if (st.trim_hi != null) z1 = Math.min(z1, st.trim_hi);
	if (st.trim_lo != null) z0 = Math.max(z0, st.trim_lo);
	return [z0, Math.max(z0, z1)];
}

/** z extent of a piece over its material bodies (holes, cuts excluded), declared. */
export function pieceZ(ix: FlowIndex, pieceId: string): [number, number] {
	let lo = Infinity, hi = -Infinity;
	for (const b of ix.byPiece.get(pieceId) ?? []) {
		if (b.kind === 'hole' || b.kind === 'cut') continue;
		const [a, c] = declZ(ix, b);
		lo = Math.min(lo, a);
		hi = Math.max(hi, c);
	}
	return Number.isFinite(lo) ? [lo, hi] : [0, 0];
}

/** Solder (metal) volume: spheres and plated caps as formed; paste only its metal volume fraction. */
export function solderVolume(b: SolderBody): number {
	const d = v(b.d_um), h = v(b.h_um);
	if (b.form === 'sphere') return (Math.PI * d * d * d) / 6;
	const geo = (Math.PI * d * d * h) / 4;
	return b.form === 'paste' ? geo * v(b.metal_vol_frac, 1) : geo;
}
export const wetR = (b: SolderBody) => v(b.wet_d_um, v(b.d_um)) / 2;
/** Current free (unjoined) height: as formed -> free cap by the free reflow progress `shape`, times the growth g. */
export function freeH(b: SolderBody, shape: number, g = 1): number {
	const h0 = (b.form === 'sphere' ? v(b.d_um) : v(b.h_um)) * Math.max(0, Math.min(1, g));
	return h0 + (capHeight(solderVolume(b), wetR(b)) - h0) * shape;
}
/** Current extent of a solder body (piece frame): free shape, direction; joined solder keeps its free extent here
 * (the joint shape is drawn by prims; the collapse moves the piece). */
function solderZ(b: SolderBody, st: BodyState): [number, number] {
	const h = freeH(b, st.shape, st.g);
	const hang = b.dir ? b.dir === 'down' : st.down;
	const base = b.dir ? v(b.z_um) : st.down ? v(b.z_um) + v(b.h_um) : v(b.z_um);
	return hang ? [base - h, base] : [base, base + h];
}

// ---------------------------------------------------------------- sites

export interface Grid {
	cx: number;
	cy: number;
	px: number;
	py: number;
	nx: number;
	ny: number;
	stagger: boolean;
	key: string;
}

export function siteGrid(s: Site, xf: Xf = ID_XF): Grid {
	const px = v(s.pitch_x_um), py = v(s.pitch_y_um, px);
	const single = s.pattern === 'single';
	const nx = single ? 1 : Math.max(1, Math.floor(v(s.rect.w_um) / px + 1e-9));
	const ny = single ? 1 : Math.max(1, Math.floor(v(s.rect.d_um) / py + 1e-9));
	const [cx, cy] = xyTo(xf, v(s.rect.x_um, 0), v(s.rect.y_um, 0));
	const sw = swapsXY(xf);
	return { cx, cy, px: sw ? py : px, py: sw ? px : py, nx: sw ? ny : nx, ny: sw ? nx : ny, stagger: s.pattern === 'stagger', key: `${s.id}@${cx},${cy}${sw ? 'r' : ''}` };
}

/** Site centers inside [x0, x1] x [y0, y1] (inclusive). */
export function gridSites(g: Grid, x0: number, x1: number, y0: number, y1: number): [number, number][] {
	const out: [number, number][] = [];
	const ox = g.cx - ((g.nx - 1) / 2) * g.px, oy = g.cy - ((g.ny - 1) / 2) * g.py;
	const j0 = Math.max(0, Math.ceil((y0 - oy) / g.py - 1e-9)), j1 = Math.min(g.ny - 1, Math.floor((y1 - oy) / g.py + 1e-9));
	for (let j = j0; j <= j1; j++) {
		const sx = g.stagger && j % 2 ? g.px / 2 : 0;
		const i0 = Math.max(0, Math.ceil((x0 - ox - sx) / g.px - 1e-9)), i1 = Math.min(g.nx - 1, Math.floor((x1 - ox - sx) / g.px + 1e-9));
		for (let i = i0; i <= i1; i++) out.push([ox + sx + i * g.px, oy + j * g.py]);
		if (out.length > 200000) break;
	}
	return out;
}

/** Nearest site center to (x, y). */
export function nearestSite(g: Grid, x: number, y: number): [number, number] {
	const ox = g.cx - ((g.nx - 1) / 2) * g.px, oy = g.cy - ((g.ny - 1) / 2) * g.py;
	const j = Math.min(g.ny - 1, Math.max(0, Math.round((y - oy) / g.py)));
	const sx = g.stagger && j % 2 ? g.px / 2 : 0;
	const i = Math.min(g.nx - 1, Math.max(0, Math.round((x - ox - sx) / g.px)));
	return [ox + sx + i * g.px, oy + j * g.py];
}

// ---------------------------------------------------------------- assembly

/** Local transform of a joined piece for one placement. */
export function joinXf(j: Join, at: [number, number, number, number?], collapse: number): Xf {
	// flip about x (y -> -y), then rotate by rot_deg (quarter turns), then translate (builder convention)
	const q = ((Math.round((at[3] ?? 0) / 90) % 4) + 4) % 4;
	const cs = [1, 0, -1, 0][q], sn = [0, 1, 0, -1][q];
	const fy = j.flip ? -1 : 1;
	const m = { a: cs, b: -sn * fy, c: sn, d: cs * fy };
	return j.flip
		? { ...m, sz: -1, tx: at[0], ty: at[1], tz: at[2] + j.zmax - collapse }
		: { ...m, sz: 1, tx: at[0], ty: at[1], tz: at[2] - j.zmin - collapse };
}

/** Pieces in the root's tree with every instance transform to the root frame. */
export function treeXfs(s: SceneState, root: string): Map<string, Xf[]> {
	const out = new Map<string, Xf[]>();
	out.set(root, [ID_XF]);
	const resolve = (id: string, depth: number): Xf[] | null => {
		if (out.has(id)) return out.get(id)!;
		const p = s.pieces[id];
		if (!p || !p.on || !p.join || depth > 8) return null;
		const parent = resolve(p.join.onto, depth + 1);
		if (!parent) return null;
		const list: Xf[] = [];
		for (const P of parent) for (const at of p.join.at) list.push(compose(P, joinXf(p.join, at, p.collapse_um)));
		out.set(id, list);
		return list;
	};
	for (const id of Object.keys(s.pieces)) resolve(id, 0);
	return out;
}

export interface AsmBody {
	b: Body;
	st: BodyState;
	xfs: Xf[];
}

/** Bodies present in the root's tree (on, not fully removed). */
export function asmBodies(ix: FlowIndex, s: SceneState, root: string, tree = treeXfs(s, root)): AsmBody[] {
	const out: AsmBody[] = [];
	for (const b of ix.flow.bodies) {
		const xfs = tree.get(b.piece);
		const st = s.bodies[b.id];
		if (!xfs || !st || !st.on || (st.gone >= 1 && !st.keep.length)) continue;
		out.push({ b, st, xfs });
	}
	return out;
}

/** Root-frame z extent of the assembly (material bodies, trims applied). */
export function asmExtent(ix: FlowIndex, s: SceneState, root: string): [number, number] {
	let lo = Infinity, hi = -Infinity;
	for (const a of asmBodies(ix, s, root)) {
		if (a.b.kind === 'hole' || a.b.kind === 'cut') continue;
		const [z0, z1] = liveZ(ix, a.b, a.st);
		const [r0, r1] = zToRoot(a.xfs[0], z0, z1);
		lo = Math.min(lo, r0);
		hi = Math.max(hi, r1);
	}
	return Number.isFinite(lo) ? [lo, hi] : [0, 0];
}
