// Body + state -> root-frame primitives (um): boxes, per-site tiles (pitch cell minus a round hole) and per-site
// bands (solids of revolution with inner / outer radius per z sample). Window, section and z map are applied later.
import { v, type FlowIndex } from './data';
import {
	asmBodies, gridSites, liveZ, liningFilms, mouthTop, rectTo, siteGrid, swapsXY, trenchDepth, treeXfs, viaFillOf, xyTo, zToRoot, type AsmBody, type Grid, type Xf
} from './model';
import { solderProfile } from './solder';
import { allMembers, filletRings, freeH, hybridState, pasteTopR, solderVolume, wetR, zoneR, type Hybrid } from './joint';
import type { Body, BodyState, FilmBody, HoleBody, LineFillBody, PostBody, Rect, SceneState, SlabBody, SolderBody } from './types';

export interface PBox {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
	z0: number;
	z1: number;
}
export interface XY {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
}
export interface PTiles {
	grid: Grid;
	rect: XY; // sites considered (region bounds)
	z0: number;
	z1: number;
	r: number;
}
export interface Sample {
	z: number;
	rin: number;
	rout: number;
}
export interface PBands {
	grid: Grid;
	rect: XY;
	samples: Sample[]; // z ascending (root frame)
	xmax?: number; // print sweep: sites with x <= xmax only (root frame)
	sweep?: number; // piece-frame sweep fraction (resolved to xmax in the root frame)
	exclude?: XY[]; // site rects removed by cuts (piece frame before push, root frame after)
	key: string; // geometry identity within the body
}
export interface Front {
	from: string;
	f: number; // 0..1
	region: XY;
}
export interface BodyPrims {
	id: string; // body id, or '<slab>#lines' for the embedded conductor of an as-built line level
	body: Body;
	piece: string;
	key: string; // material key
	boxes: PBox[];
	tiles: PTiles[];
	bands: PBands[];
	front?: Front;
}

export interface PrimOpts {
	/** lateral thickness floor for films (um), illustrative only */
	floorUm: number;
	/** scallop rendering on hole walls */
	scallops: boolean;
	/** um per screen pixel at the primary view (scallop sampling density); 0 = unknown */
	umPerPx?: number;
	/** samples per solder profile */
	solderN: number;
	/** window (root frame) used to bound tile / band rects and line patterns for cost */
	win: XY;
	/** print sweep range along x (root frame): the unit at the work scale, the window at block / cell scale (the stroke
	 * is shown across the window); the tool gets the same front_x_um */
	sweepRange?: [number, number];
}

const rectXY = (r: Rect): XY => {
	const x = v(r.x_um, 0), y = v(r.y_um, 0), w = v(r.w_um), d = v(r.d_um);
	return { x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2 };
};
function unitXY(ix: FlowIndex, piece: string): XY {
	const p = ix.piece.get(piece);
	const w = v(p?.unit.w_um, 1), d = v(p?.unit.d_um, 1);
	return { x0: -w / 2, x1: w / 2, y0: -d / 2, y1: d / 2 };
}
const gridXY = (g: Grid): XY => ({ x0: g.cx - (g.nx * g.px) / 2, x1: g.cx + (g.nx * g.px) / 2, y0: g.cy - (g.ny * g.py) / 2, y1: g.cy + (g.ny * g.py) / 2 });
const isect = (a: XY, b: XY): XY | null => {
	const r = { x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) };
	return r.x1 > r.x0 && r.y1 > r.y0 ? r : null;
};

/** Grown / removed / trimmed z range of a layer-like body (piece frame). */
function layerZ(b: Body, st: BodyState, z0: number, h: number): [number, number] | null {
	const t = h * Math.min(1, st.g) * (1 - st.gone);
	if (!(t > 1e-9)) return null;
	let a = st.down ? z0 + h - t : z0, c = st.down ? z0 + h : z0 + t;
	if (st.trim_hi != null) c = Math.min(c, st.trim_hi);
	if (st.trim_lo != null) a = Math.max(a, st.trim_lo);
	return c - a > 1e-9 ? [a, c] : null;
}
function clipSamples(ss: Sample[], st: BodyState): Sample[] {
	let lo = -Infinity, hi = Infinity;
	if (st.trim_lo != null) lo = st.trim_lo;
	if (st.trim_hi != null) hi = st.trim_hi;
	if (lo === -Infinity && hi === Infinity) return ss;
	const out: Sample[] = [];
	const at = (a: Sample, b: Sample, z: number): Sample => {
		const f = (z - a.z) / (b.z - a.z || 1);
		return { z, rin: a.rin + (b.rin - a.rin) * f, rout: a.rout + (b.rout - a.rout) * f };
	};
	for (let i = 0; i < ss.length; i++) {
		const s = ss[i];
		if (s.z >= lo && s.z <= hi) {
			if (i > 0 && ss[i - 1].z < lo) out.push(at(ss[i - 1], s, lo));
			out.push(s);
			if (i < ss.length - 1 && ss[i + 1].z > hi) out.push(at(s, ss[i + 1], hi));
		} else if (i < ss.length - 1 && s.z < lo && ss[i + 1].z > hi) {
			out.push(at(s, ss[i + 1], lo), at(s, ss[i + 1], hi));
		}
	}
	return out.length >= 2 ? out : [];
}
const cyl = (z0: number, z1: number, rout: number, rin = 0): Sample[] => [{ z: z0, rin, rout }, { z: z1, rin, rout }];

// ---------------------------------------------------------------- hole context

interface HoleCtx {
	hole: HoleBody;
	grid: Grid;
	zt: number;
	zb: number;
	D: number;
	R: number; // max wall radius (host tile hole)
	wall: (z: number) => number;
	zs: number[]; // sample z (ascending) over [zb, zt]
	films: { f: FilmBody; inner: number[]; outer: number[]; z0: number; zTop: number; floor: [number, number]; floorR: number }[];
	innerTop: number; // innermost radius at the mouth
	floorTop: number;
	mouth: number; // field top of the lining stack
}

function holeCtx(ix: FlowIndex, s: SceneState, h: HoleBody, o: PrimOpts): HoleCtx | null {
	const st = s.bodies[h.id];
	if (!st?.on || st.g <= 0) return null;
	const site = ix.site.get(h.site);
	if (!site) return null;
	const zt = v(h.z_top_um), D = v(h.depth_um);
	const zb = zt - st.g * D;
	const rt = v(h.d_top_um) / 2, rb = v(h.d_bot_um, v(h.d_top_um)) / 2;
	const per = v(h.scallop?.period_um, 0), amp = v(h.scallop?.amp_um, 0);
	// scallops only when one period spans >= 1.5 px; 2 (or 4 when >= 8 px) samples per period
	const perPx = o.umPerPx ? per / o.umPerPx : Infinity;
	const scal = o.scallops && per > 0 && amp > 0 && perPx >= 1.5;
	const wall = (z: number) => {
		const lin = rb + (rt - rb) * ((z - (zt - D)) / D);
		if (!scal || z > zt) return lin;
		const ph = ((zt - z) / per) % 1;
		return lin + amp * (1 - (2 * ph - 1) * (2 * ph - 1));
	};
	const zs: number[] = [];
	if (scal) {
		const n = Math.ceil((zt - zb) / per) * (perPx >= 8 ? 4 : 2);
		for (let i = 0; i <= n; i++) zs.push(zb + ((zt - zb) * i) / n);
	} else zs.push(zb, zt);
	const R = Math.max(rt, rb) + (scal ? amp : 0);
	const films: HoleCtx['films'] = [];
	let prev = zs.map(wall);
	let floorTop = zb;
	let mouth = zt;
	for (const f of liningFilms(ix, h.id)) {
		const fs = s.bodies[f.id];
		if (!fs?.on) continue;
		const t = v(f.h_um) * Math.min(1, fs.g) * (1 - fs.gone);
		if (!(t > 1e-9)) continue;
		const ct = v(f.cov_side_top, 1), cb = v(f.cov_side_bot, ct), cf = v(f.cov_bottom, 1);
		const side = (z: number) => Math.max(t * (ct + (cb - ct) * Math.min(1, Math.max(0, (zt - z) / D))), o.floorUm);
		const inner = zs.map((z, i) => Math.max(0, prev[i] - side(z)));
		// floor films at true thickness (V2 M11: a 0.17 um bottom liner floored to 2 px read as a plug at the TSV bottom)
		const fl = t * cf;
		const zTop = v(f.z_um) + t;
		const floorR = inner[0];
		films.push({ f, inner, outer: prev, z0: floorTop, zTop, floor: [floorTop, floorTop + fl], floorR });
		floorTop += fl;
		mouth = Math.max(mouth, zTop);
		prev = inner;
	}
	return { hole: h, grid: siteGrid(site), zt, zb, D, R, wall, zs, films, innerTop: prev[prev.length - 1], floorTop, mouth };
}

/** Band samples between two radius arrays over zs, clipped to [za, zb], extended vertically above the last z. */
function ringSamples(zs: number[], rin: number[] | ((i: number) => number), rout: number[], za: number, zTop: number): Sample[] {
	const out: Sample[] = [];
	const ri = (i: number) => (typeof rin === 'function' ? rin(i) : rin[i]);
	for (let i = 0; i < zs.length; i++) if (zs[i] >= za - 1e-9) out.push({ z: zs[i], rin: ri(i), rout: rout[i] });
	if (out.length && out[0].z > za + 1e-9) {
		const j = zs.findIndex((z) => z >= za);
		out.unshift({ z: za, rin: ri(Math.max(0, j)), rout: rout[Math.max(0, j)] });
	}
	const last = zs.length - 1;
	if (zTop > zs[last] + 1e-9) out.push({ z: zTop, rin: ri(last), rout: rout[last] });
	return out;
}

// ---------------------------------------------------------------- per body (piece frame)

interface Local {
	boxes: PBox[];
	tiles: PTiles[];
	bands: PBands[];
	lines?: PBox[]; // embedded conductor of an as-built line level (drawn as '<slab>#lines')
}

/** Trench / line stripes of a slab's line pattern inside `win` (piece frame), capped (view parameter). */
function linePattern(b: SlabBody, r: XY, win: XY): XY[] {
	const L = b.lines!;
	const lw = v(L.line_um), pitch = lw + v(L.space_um);
	if (!(lw > 0) || !(pitch > 0)) return [];
	const alongY = L.dir === 'y'; // lines run along y: stripes repeat in x
	const c = alongY ? (r.x0 + r.x1) / 2 : (r.y0 + r.y1) / 2;
	const lo = Math.max(alongY ? r.x0 : r.y0, alongY ? win.x0 : win.y0), hi = Math.min(alongY ? r.x1 : r.y1, alongY ? win.x1 : win.y1);
	const cap = Math.min(L.n ?? 400, 400);
	const out: XY[] = [];
	const j0 = Math.ceil((lo - c) / pitch - 0.5), j1 = Math.floor((hi - c) / pitch + 0.5);
	for (let j = j0; j <= j1 && out.length < cap; j++) {
		const m = c + j * pitch;
		const a = Math.max(m - lw / 2, alongY ? r.x0 : r.y0), e = Math.min(m + lw / 2, alongY ? r.x1 : r.y1);
		if (e <= a) continue;
		out.push(alongY ? { x0: a, x1: e, y0: r.y0, y1: r.y1 } : { x0: r.x0, x1: r.x1, y0: a, y1: e });
	}
	return out;
}
/** The rect minus parallel stripes (sorted), as stripes between them. */
function gapsBetween(stripes: XY[], r: XY, dir: 'x' | 'y'): XY[] {
	const alongY = dir === 'y';
	const out: XY[] = [];
	let cur = alongY ? r.x0 : r.y0;
	for (const s of stripes) {
		const a = alongY ? s.x0 : s.y0, e = alongY ? s.x1 : s.y1;
		if (a > cur + 1e-9) out.push(alongY ? { x0: cur, x1: a, y0: r.y0, y1: r.y1 } : { x0: r.x0, x1: r.x1, y0: cur, y1: a });
		cur = Math.max(cur, e);
	}
	const end = alongY ? r.x1 : r.y1;
	if (end > cur + 1e-9) out.push(alongY ? { x0: cur, x1: end, y0: r.y0, y1: r.y1 } : { x0: r.x0, x1: r.x1, y0: cur, y1: end });
	return out;
}

/** Conductor in the trenches of its host slab plus overburden (v1.1 line_fill). */
function lineFillLocal(ix: FlowIndex, s: SceneState, b: LineFillBody, st: BodyState, o: PrimOpts & { winP?: XY }): Local {
	const out: Local = { boxes: [], tiles: [], bands: [] };
	const h = ix.body.get(b.host) as SlabBody | undefined;
	const hs = h ? s.bodies[h.id] : undefined;
	if (!h || !h.lines || !hs?.on || !st.on) return out;
	const hz = layerZ(h, { ...hs, gone: 0 }, v(h.z_um), v(h.h_um));
	if (!hz) return out;
	const top = hz[1], d = trenchDepth(h);
	const r = rectOf(ix, h);
	const fill = Math.min(1, st.sub.fill ?? st.g);
	const clip = (bx: PBox): PBox | null => {
		const z0 = Math.max(bx.z0, st.trim_lo ?? -Infinity), z1 = Math.min(bx.z1, st.trim_hi ?? Infinity);
		return z1 > z0 + 1e-9 ? { ...bx, z0, z1 } : null;
	};
	if (fill > 0) for (const l of linePattern(h, r, o.winP ?? r)) {
		const c = clip({ ...l, z0: top - d, z1: top - d + fill * d });
		if (c) out.boxes.push(c);
	}
	const ob = b.overburden ? v(b.overburden.h_um) * (st.sub.ob ?? 0) : 0;
	if (ob > 0) {
		const c = clip({ ...(b.overburden?.rect ? rectXY(b.overburden.rect) : r), z0: top, z1: top + ob });
		if (c) out.boxes.push(c);
	}
	return out;
}

function rectOf(ix: FlowIndex, b: { rect?: Rect; piece: string }): XY {
	return b.rect ? rectXY(b.rect) : unitXY(ix, b.piece);
}

function slabLocal(ix: FlowIndex, s: SceneState, b: SlabBody, st: BodyState, holes: HoleCtx[], o: PrimOpts & { winP?: XY }): Local {
	const out: Local = { boxes: [], tiles: [], bands: [] };
	const z = layerZ(b, st, v(b.z_um), v(b.h_um));
	if (!z) return out;
	const [z0, z1] = z;
	const r = rectOf(ix, b);
	const rects: XY[] = b.frame_inner
		? (() => {
				const iw = v(b.frame_inner.w_um) / 2, id = v(b.frame_inner.d_um) / 2;
				const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
				return [
					{ x0: r.x0, x1: r.x1, y0: r.y0, y1: cy - id },
					{ x0: r.x0, x1: r.x1, y0: cy + id, y1: r.y1 },
					{ x0: r.x0, x1: cx - iw, y0: cy - id, y1: cy + id },
					{ x0: cx + iw, x1: r.x1, y0: cy - id, y1: cy + id }
				];
			})()
		: [r];
	const lines = b.lines && rects.length === 1 ? linePattern(b, r, o.winP ?? r) : null;
	if (lines && lines.length) {
		const d = trenchDepth(b);
		const open = b.lines!.material ? 1 : Math.max(st.open, st.sub.trench ?? 0);
		const zt = z1 - Math.min(d, z1 - z0) * open;
		if (zt > z0 + 1e-9) out.boxes.push({ ...r, z0, z1: zt });
		if (z1 > zt + 1e-9) for (const g of gapsBetween(lines, r, b.lines!.dir)) out.boxes.push({ ...g, z0: zt, z1 });
		if (b.lines!.material && z1 > zt + 1e-9) out.lines = lines.map((l) => ({ ...l, z0: zt, z1 }));
	} else for (const q of rects) out.boxes.push({ ...q, z0, z1 });
	if (b.openings && st.open > 0) {
		const H = z1 - z0;
		const [oa, oc] = st.down ? [z0, z0 + st.open * H] : [z1 - st.open * H, z1];
		for (const op of b.openings) {
			const site = ix.site.get(op.site);
			if (!site) continue;
			const g = siteGrid(site);
			const rr = isect(gridXY(g), r);
			if (rr) out.tiles.push({ grid: g, rect: rr, z0: oa, z1: oc, r: v(op.d_um) / 2 });
		}
	}
	for (const hc of holes) {
		if (!hc.hole.hosts.includes(b.id)) continue;
		const za = Math.max(hc.zb, z0), zc = Math.min(hc.zt, z1);
		if (zc <= za) continue;
		const rr = isect(gridXY(hc.grid), r);
		if (!rr) continue;
		out.tiles.push({ grid: hc.grid, rect: rr, z0: za, z1: zc, r: hc.R });
		const wall = hc.zs.map(hc.wall);
		const ss = clipSamples(ringSamples(hc.zs, wall, hc.zs.map(() => hc.R), hc.zb, hc.zt), { ...st, trim_lo: za, trim_hi: zc });
		if (ss.length >= 2) out.bands.push({ grid: hc.grid, rect: rr, samples: ss, key: `wall:${hc.hole.id}` });
	}
	return out;
}

function filmLocal(ix: FlowIndex, s: SceneState, b: FilmBody, st: BodyState, holes: HoleCtx[]): Local {
	const out: Local = { boxes: [], tiles: [], bands: [] };
	const full = layerZ(b, { ...st, gone: 0 }, v(b.z_um), v(b.h_um));
	const z = layerZ(b, st, v(b.z_um), v(b.h_um));
	if (b.selective) {
		const site = ix.site.get(b.selective.site);
		if (site && z) {
			const g = siteGrid(site);
			out.bands.push({ grid: g, rect: gridXY(g), samples: cyl(z[0], z[1], v(b.selective.d_um) / 2), key: 'sel' });
		}
		return out;
	}
	const r = rectOf(ix, b);
	if (z) out.boxes.push({ ...r, z0: z[0], z1: z[1] });
	// field openings over the holes it lines
	for (const hc of holes) {
		const k = hc.films.findIndex((x) => x.f.id === b.id);
		if (k < 0 || !z) continue;
		const rr = isect(gridXY(hc.grid), r);
		if (rr) out.tiles.push({ grid: hc.grid, rect: rr, z0: z[0], z1: z[1], r: hc.films[k].outer[hc.films[k].outer.length - 1] });
	}
	// strip with keep_under: full-thickness disks under the protecting posts, field opened there
	if (st.gone > 0 && st.keep.length && full) {
		for (const pid of st.keep) {
			const p = ix.body.get(pid) as PostBody | undefined;
			const site = p && p.kind === 'post' ? ix.site.get(p.site) : undefined;
			if (!p || !site) continue;
			const g = siteGrid(site);
			const rp = v(p.d_um) / 2;
			out.bands.push({ grid: g, rect: gridXY(g), samples: cyl(full[0], full[1], rp), key: `keep:${pid}` });
			if (z) out.tiles.push({ grid: g, rect: isect(gridXY(g), r) ?? gridXY(g), z0: z[0], z1: z[1], r: rp });
		}
	}
	// wrap posts (finish over pads)
	if (b.over && z) {
		const t = z[1] - z[0];
		for (const pid of b.over) {
			const p = ix.body.get(pid) as PostBody | undefined;
			const site = p && p.kind === 'post' ? ix.site.get(p.site) : undefined;
			if (!p || !site) continue;
			const g = siteGrid(site);
			const rp = v(p.d_um) / 2, p0 = v(p.z_um), p1 = p0 + v(p.h_um);
			out.bands.push({ grid: g, rect: gridXY(g), samples: [{ z: p0, rin: rp, rout: rp + t }, { z: p1, rin: rp, rout: rp + t }, { z: p1, rin: 0, rout: rp + t }, { z: p1 + t, rin: 0, rout: rp + t }], key: `over:${pid}` });
		}
	}
	return out;
}

/** In-hole parts of lining films and via fills (assigned to those bodies). */
function holeParts(ix: FlowIndex, s: SceneState, hc: HoleCtx, add: (id: string, l: Local) => void) {
	const rect = gridXY(hc.grid);
	for (const fl of hc.films) {
		const st = s.bodies[fl.f.id];
		const ring = clipSamples(ringSamples(hc.zs, fl.inner, fl.outer, fl.z0, fl.zTop), st);
		const floor = clipSamples(cyl(fl.floor[0], fl.floor[1], fl.floorR), st);
		const l: Local = { boxes: [], tiles: [], bands: [] };
		if (ring.length) l.bands.push({ grid: hc.grid, rect, samples: ring, key: `ring:${hc.hole.id}` });
		if (floor.length) l.bands.push({ grid: hc.grid, rect, samples: floor, key: `floor:${hc.hole.id}` });
		add(fl.f.id, l);
	}
	const vf = viaFillOf(ix, hc.hole.id);
	const vs = vf ? s.bodies[vf.id] : undefined;
	if (!vf || !vs?.on) return;
	const last = hc.films.length ? hc.films[hc.films.length - 1].inner : hc.zs.map(hc.wall);
	const fillF = vs.sub.fill ?? vs.g;
	const top = hc.floorTop + Math.min(1, fillF) * (hc.mouth - hc.floorTop);
	const l: Local = { boxes: [], tiles: [], bands: [] };
	if (fillF > 0 && top > hc.floorTop) {
		const wall = v(vf.wall_um, 0) * Math.min(1, vs.g);
		const rin = vf.mode === 'conformal' ? (i: number) => Math.max(0, last[i] - wall) : () => 0;
		let ss = ringSamples(hc.zs, rin, last, hc.floorTop, Math.max(top, hc.zs[hc.zs.length - 1])).filter((x) => x.z <= top + 1e-9);
		if (ss.length && ss[ss.length - 1].z < top - 1e-9) ss.push({ ...ss[ss.length - 1], z: top });
		if (vs.dish_um > 0 && vs.sub.dishBottom) {
			const zc = (vs.trim_lo ?? -Infinity) + vs.dish_um; // dished on the polished bottom face
			ss = clipSamples(ss, { ...vs, trim_lo: Math.max(vs.trim_lo ?? -Infinity, zc) });
		} else if (vs.dish_um > 0) {
			const zc = (vs.trim_hi ?? Infinity) - vs.dish_um;
			ss = clipSamples(ss, { ...vs, trim_hi: Math.min(vs.trim_hi ?? Infinity, zc) });
		} else ss = clipSamples(ss, vs);
		if (ss.length >= 2) l.bands.push({ grid: hc.grid, rect, samples: ss, key: `fill:${hc.hole.id}` });
	}
	const ob = vf.overburden ? v(vf.overburden.h_um) * (vs.sub.ob ?? 0) : 0;
	if (ob > 0) {
		let a = hc.mouth, c = hc.mouth + ob;
		if (vs.trim_hi != null) c = Math.min(c, vs.trim_hi);
		if (vs.trim_lo != null) a = Math.max(a, vs.trim_lo);
		if (c > a) l.boxes.push({ ...(vf.overburden?.rect ? rectXY(vf.overburden.rect) : unitXY(ix, vf.piece)), z0: a, z1: c });
	}
	add(vf.id, l);
}

function postLocal(ix: FlowIndex, b: PostBody, st: BodyState): Local {
	const out: Local = { boxes: [], tiles: [], bands: [] };
	const z = layerZ(b, st, v(b.z_um), v(b.h_um));
	const site = ix.site.get(b.site);
	if (!z || !site) return out;
	const g = siteGrid(site);
	const r0 = v(b.d_um) / 2, r1 = v(b.d_top_um, v(b.d_um)) / 2;
	const H = v(b.h_um);
	const rAt = (zz: number) => r0 + (r1 - r0) * ((zz - v(b.z_um)) / (H || 1));
	out.bands.push({ grid: g, rect: gridXY(g), samples: [{ z: z[0], rin: 0, rout: rAt(z[0]) }, { z: z[1], rin: 0, rout: rAt(z[1]) }], key: 'post' });
	return out;
}

interface JointInfo {
	members: Map<string, string>; // solder -> placed piece of its joint
	hy: Map<string, { h: Hybrid; role: 'ball' | 'paste' }>;
}

/** Samples of a profile laid from the base plane (hang: downward). */
function laySamples(r: number[], h: number, base: number, hang: boolean, drop: number): Sample[] {
	const n = r.length - 1;
	const ss: Sample[] = r.map((ri, i) => ({ z: hang ? base - drop - (i / n) * h : base + drop + (i / n) * h, rin: 0, rout: ri }));
	if (hang) ss.reverse();
	return ss;
}

function solderLocal(ix: FlowIndex, s: SceneState, b: SolderBody, st: BodyState, o: PrimOpts, ji: JointInfo): Local {
	const out: Local = { boxes: [], tiles: [], bands: [] };
	const site = ix.site.get(b.site);
	if (!st.on || !site || st.gone >= 1) return out;
	const g = siteGrid(site);
	const drop = (st.sub.drop ?? 0) * 1.5 * v(b.h_um);
	// v1.1 dir: 'down' hangs below the base plane z_um, 'up' stands on it; absent: v1 (runtime orientation)
	const hang = b.dir ? b.dir === 'down' : st.down;
	const base = b.dir ? v(b.z_um) : st.down ? v(b.z_um) + v(b.h_um) : v(b.z_um);
	// sites never outside the piece (V1 M12: balls past the substrate edge)
	const rect = isect(gridXY(g), unitXY(ix, b.piece)) ?? gridXY(g);
	const push = (ss: Sample[], key: string) => {
		ss = clipSamples(ss, st);
		const band: PBands = { grid: g, rect, samples: ss, key };
		if (st.sub.sweep != null && st.sub.sweep < 1) band.sweep = st.sub.sweep;
		if (ss.length >= 2) out.bands.push(band);
	};
	const pid = ji.members.get(b.id);
	const col = pid ? (s.pieces[pid]?.collapse_um ?? 0) : 0;
	const hyb = ji.hy.get(b.id);
	if (hyb) {
		// ball (placed piece) + paste / cap (onto piece) at the same sites (audit A1 m2)
		const hs = hybridState(hyb.h, s);
		const ball = hyb.h.ball, paste = hyb.h.paste;
		const sb = s.bodies[ball.id], sp = s.bodies[paste.id];
		if (hs.mode === 'both') {
			// one joint between the board pad (paste) and the package pad (ball), the combined volume, height = gap
			if (hyb.role === 'ball') return out;
			const H = hs.hb + hs.hp - col;
			const js = Math.min(sb.sub.jshape ?? 0, sp.sub.jshape ?? 0);
			const n = o.solderN;
			const a = wetR(paste), bt = wetR(ball);
			const free = solderProfile(paste, sp.shape, sp.g, 0, n);
			const r = free.r.map((rf, i) => rf + (zoneR(a, bt, H, (i / n) * H) - rf) * js);
			push(laySamples(r, H, base, hang, drop), 'solder-hybrid');
			return out;
		}
		if (hs.mode === 'paste') {
			if (hyb.role === 'ball') {
				const p = solderProfile(b, st.shape, st.g, 0, o.solderN); // solid ball, sinks with the piece
				push(laySamples(p.r, p.h, base, hang, drop), 'solder');
				return out;
			}
			// molten paste: a fillet ring around the solid ball resting on the pad
			const bp = solderProfile(ball, sb.shape, sb.g, 0, 16);
			const n = bp.r.length - 1;
			const ballR = (z: number) => {
				const zeta = Math.max(0, Math.min(1, 1 - z / Math.max(1e-9, bp.h)));
				const f = zeta * n, i = Math.min(n - 1, Math.floor(f));
				return bp.r[i] + (bp.r[i + 1] - bp.r[i]) * (f - i);
			};
			const rings = filletRings(solderVolume(paste), wetR(paste), ballR, bp.h);
			const jp = sp.sub.jshape ?? 0;
			const free = solderProfile(paste, sp.shape, sp.g, 0, rings.length - 1);
			const ss = rings.map((q, i) => ({ z: (hang ? -1 : 1) * q.z * jp + (hang ? -1 : 1) * (i / (rings.length - 1)) * free.h * (1 - jp), rin: q.rin * jp, rout: free.r[i] + (q.rout - free.r[i]) * jp }));
			push((hang ? ss.reverse() : ss).map((x) => ({ ...x, z: base + x.z })), 'solder-fillet');
			return out;
		}
		if (hs.mode === 'ball' && hyb.role === 'ball') {
			// molten ball wets the solid deposit's top
			const js = sb.sub.jshape ?? 0;
			const p = solderProfile(b, st.shape, st.g, js, o.solderN, hs.hb - col, pasteTopR(paste, sp.shape));
			push(laySamples(p.r, p.h, base, hang, drop), 'solder');
			return out;
		}
		// 'none', or the solid paste of mode 'ball': free shapes below
	}
	const js = pid ? (st.sub.jshape ?? 0) : 0;
	const hJ = js > 0 ? freeH(b, st.shape, st.g) - col : undefined;
	const p = solderProfile(b, st.shape, st.g, js, o.solderN, hJ);
	if (!(p.h > 1e-6)) return out;
	// a free ball (sphere, not in a joint) keeps its true aspect from its pad plane (V1 M12): key carries the pad side
	const free = b.form === 'sphere' && js === 0 && !hyb;
	push(laySamples(p.r, p.h, base, hang, drop), free ? (hang ? 'solder-true-top' : 'solder-true-bottom') : 'solder');
	return out;
}

function cutBoxes(ix: FlowIndex, s: SceneState, hostId: string): PBox[] {
	const out: PBox[] = [];
	const by = s.bodies[hostId]?.cutBy ?? [];
	for (const b of ix.flow.bodies) {
		if (b.kind !== 'cut' || !(b.hosts.includes(hostId) || by.includes(b.id))) continue;
		const st = s.bodies[b.id];
		if (!st?.on || st.g <= 0) continue;
		// removal advances from the exposed (tool-facing) side: from the top, or from the bottom when the root faced
		// down at the cut (e.g. the TSV-reveal recess on a flipped wafer)
		const z0 = v(b.z_um), z1 = z0 + v(b.h_um), d = st.g * v(b.h_um);
		out.push({ ...rectXY(b.rect), ...(st.down ? { z0, z1: z0 + d } : { z0: z1 - d, z1 }) });
	}
	return out;
}

// ---------------------------------------------------------------- to root

function xfBox(b: PBox, xf: Xf): PBox {
	const [z0, z1] = zToRoot(xf, b.z0, b.z1);
	return { ...rectTo(xf, b), z0, z1 };
}
function xfXY(r: XY, xf: Xf): XY {
	return rectTo(xf, r);
}
function xfGrid(g: Grid, xf: Xf): Grid {
	const [cx, cy] = xyTo(xf, g.cx, g.cy);
	const sw = swapsXY(xf);
	return { ...g, cx, cy, px: sw ? g.py : g.px, py: sw ? g.px : g.py, nx: sw ? g.ny : g.nx, ny: sw ? g.nx : g.ny, key: `${g.key}|${cx},${cy}${sw ? 'r' : ''}` };
}
function xfSamples(ss: Sample[], xf: Xf): Sample[] {
	if (xf.sz > 0) return xf.tz ? ss.map((s) => ({ ...s, z: s.z + xf.tz })) : ss;
	return ss.map((s) => ({ ...s, z: xf.tz - s.z })).reverse();
}

/** Subtract box b from box a (up to 6 boxes). */
export function subBox(a: PBox, b: PBox): PBox[] {
	const e = 1e-9;
	if (!(a.x0 < b.x1 - e && b.x0 < a.x1 - e && a.y0 < b.y1 - e && b.y0 < a.y1 - e && a.z0 < b.z1 - e && b.z0 < a.z1 - e)) return [a];
	const out: PBox[] = [];
	const r = { ...a };
	if (b.x0 > r.x0) { out.push({ ...r, x1: b.x0 }); r.x0 = b.x0; }
	if (b.x1 < r.x1) { out.push({ ...r, x0: b.x1 }); r.x1 = b.x1; }
	if (b.y0 > r.y0) { out.push({ ...r, y1: b.y0 }); r.y0 = b.y0; }
	if (b.y1 < r.y1) { out.push({ ...r, y0: b.y1 }); r.y1 = b.y1; }
	if (b.z0 > r.z0) { out.push({ ...r, z1: b.z0 }); r.z0 = b.z0; }
	if (b.z1 < r.z1) { out.push({ ...r, z0: b.z1 }); r.z1 = b.z1; }
	return out;
}
/** a minus every cut; cuts that miss the bounding box of `bs` are skipped first (fills vs thousands of line stripes). */
export function subAll(bs: PBox[], cut: PBox[]): PBox[] {
	if (!bs.length || !cut.length) return bs;
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
	for (const b of bs) { x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); z0 = Math.min(z0, b.z0); z1 = Math.max(z1, b.z1); }
	const e = 1e-9;
	let cur = bs;
	for (const c of cut) {
		if (!(c.x0 < x1 - e && x0 < c.x1 - e && c.y0 < y1 - e && y0 < c.y1 - e && c.z0 < z1 - e && z0 < c.z1 - e)) continue;
		cur = cur.flatMap((b) => subBox(b, c));
	}
	return cur;
}

const FILL_RANK: Record<string, number> = { underfill: 2, adhesive: 2, daf: 2, emc: 1 };

/** All primitives of the root assembly in the root frame. */
const warned = new Set<string>();

export function buildPrims(ix: FlowIndex, s: SceneState, o: PrimOpts): BodyPrims[] {
	const tree = treeXfs(s, s.root);
	const asm = asmBodies(ix, s, s.root, tree);
	const byId = new Map<string, BodyPrims>();
	const get = (a: AsmBody) => {
		let p = byId.get(a.b.id);
		if (!p) {
			p = { id: a.b.id, body: a.b, piece: a.b.piece, key: a.b.material, boxes: [], tiles: [], bands: [] };
			byId.set(a.b.id, p);
		}
		return p;
	};
	const asmById = new Map(asm.map((a) => [a.b.id, a]));
	const finite = (...xs: number[]) => xs.every((x) => Number.isFinite(x));
	const warnOnce = (id: string) => {
		if (warned.has(id)) return;
		warned.add(id);
		console.warn(`[process3d] ${id}: geometry with missing values (draft pending?) skipped`);
	};
	const push = (a: AsmBody, l: Local) => {
		// draft pendings: drop primitives with missing values (never geometry from nothing)
		const nb = l.boxes.length + l.tiles.length + l.bands.length;
		l.boxes = l.boxes.filter((b) => finite(b.x0, b.x1, b.y0, b.y1, b.z0, b.z1));
		l.tiles = l.tiles.filter((t) => finite(t.z0, t.z1, t.r, t.grid.px, t.grid.py, t.grid.cx, t.grid.cy));
		l.bands = l.bands.filter((b) => b.samples.every((x) => finite(x.z, x.rin, x.rout)) && finite(b.grid.px, b.grid.py, b.grid.cx, b.grid.cy));
		if (l.boxes.length + l.tiles.length + l.bands.length < nb) warnOnce(a.b.id);
		if (l.lines?.length) {
			const key = a.b.kind === 'slab' && a.b.lines?.material ? a.b.lines.material : a.b.material;
			const lid = `${a.b.id}#lines`;
			let lp = byId.get(lid);
			if (!lp) { lp = { id: lid, body: a.b, piece: a.b.piece, key, boxes: [], tiles: [], bands: [] }; byId.set(lid, lp); }
			for (const xf of a.xfs) for (const b of l.lines) if (finite(b.x0, b.x1, b.y0, b.y1, b.z0, b.z1)) lp.boxes.push(xfBox(b, xf));
		}
		const p = get(a);
		for (const xf of a.xfs) {
			for (const b of l.boxes) p.boxes.push(xfBox(b, xf));
			for (const t of l.tiles) {
				const [z0, z1] = zToRoot(xf, t.z0, t.z1);
				p.tiles.push({ grid: xfGrid(t.grid, xf), rect: xfXY(t.rect, xf), z0, z1, r: t.r });
			}
			for (const bd of l.bands) {
				const ss = xfSamples(bd.samples, xf);
				let xmax: number | undefined;
				if (bd.sweep != null) {
					const u = xfXY(unitXY(ix, a.b.piece), xf);
					const [x0, x1] = o.sweepRange ?? [u.x0, u.x1];
					xmax = x0 + bd.sweep * (x1 - x0);
				}
				p.bands.push({ grid: xfGrid(bd.grid, xf), rect: xfXY(bd.rect, xf), samples: ss, xmax, key: bd.key, exclude: bd.exclude?.map((r) => xfXY(r, xf)) });
			}
		}
	};
	// holes per piece
	const holes: HoleCtx[] = [];
	for (const a of asm) if (a.b.kind === 'hole') {
		const hc = holeCtx(ix, s, a.b, o);
		if (hc) holes.push(hc);
	}
	// solder bodies in a joint: the join's list (v1.1, either piece) or the joined piece's own (v1)
	// joints: members (solder -> placed piece) and hybrid ball + paste pairs
	const am = allMembers(ix, s);
	const ji: JointInfo = { members: am.members, hy: new Map() };
	for (const h of am.hy) {
		ji.hy.set(h.ball.id, { h, role: 'ball' });
		ji.hy.set(h.paste.id, { h, role: 'paste' });
	}
	for (const a of asm) {
		const b = a.b;
		const ph = holes.filter((h) => h.hole.piece === b.piece);
		// the window in this body's piece frame (first instance) bounds line patterns
		const xf0 = a.xfs[0];
		const winP: XY = rectTo(xf0, o.win, true);
		const oo = { ...o, winP };
		let l: Local | null = null;
		if (b.kind === 'slab') l = slabLocal(ix, s, b, a.st, ph, oo);
		else if (b.kind === 'film') l = filmLocal(ix, s, b, a.st, ph);
		else if (b.kind === 'post') l = postLocal(ix, b, a.st);
		else if (b.kind === 'solder') {
			l = solderLocal(ix, s, b, a.st, o, ji);
			if (b.to_imc && (a.st.sub.jshape ?? 0) >= 1) get(a).key = 'imc'; // full-IMC joint (A2 n12)
		}
		else if (b.kind === 'line_fill') l = lineFillLocal(ix, s, b, a.st, oo);
		if (!l) continue;
		// dicing kerf / cavity cuts on hosted boxes
		const cuts = cutBoxes(ix, s, b.id);
		if (cuts.length) {
			l.boxes = subAll(l.boxes, cuts);
			if (l.lines) l.lines = subAll(l.lines, cuts);
			l.tiles = l.tiles.flatMap((t) => splitTilesByCuts(t, cuts));
			// per-site features inside a cut are removed with the material
			for (const bd of l.bands) {
				const z0 = bd.samples[0]?.z ?? 0, z1 = bd.samples[bd.samples.length - 1]?.z ?? 0;
				const ex = cuts.filter((c) => c.z1 > z0 && c.z0 < z1).map((c) => ({ x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1 }));
				if (ex.length) bd.exclude = [...(bd.exclude ?? []), ...ex];
			}
		}
		push(a, l);
	}
	for (const hc of holes) {
		const hostPiece = hc.hole.piece;
		holeParts(ix, s, hc, (id, l) => {
			const a = asmById.get(id);
			if (a && a.b.piece === hostPiece) push(a, l);
		});
	}
	// fills (root frame): region minus solids, minus higher-ranked fills, tiled around posts / solder
	const solids: PBox[] = [];
	for (const p of byId.values()) if (p.body.kind === 'slab') solids.push(...p.boxes);
	const fills = asm.filter((a) => a.b.kind === 'fill');
	const bandsAll = [...byId.values()].filter((p) => p.body.kind === 'post' || p.body.kind === 'solder').flatMap((p) => p.bands);
	for (const a of fills) {
		const b = a.b as Extract<Body, { kind: 'fill' }>;
		const [z0, z1] = liveZ(ix, b, a.st);
		if (!(z1 > z0)) continue;
		const xf = a.xfs[0];
		const full = xfBox({ ...rectXY(b.rect), z0, z1 }, xf);
		// flow front: the filled part of the region (geometry clip; the material front only shades the meniscus)
		const ff = a.st.sub.front;
		const reg = ff != null && ff < 1 ? frontClip(full, b.flow.from, ff) : full;
		if (!(reg.x1 > reg.x0 && reg.y1 > reg.y0)) continue;
		const rank = FILL_RANK[b.material] ?? 0;
		const higher: PBox[] = [];
		for (const f of fills) {
			if (f === a || (FILL_RANK[f.b.material] ?? 0) <= rank) continue;
			const fb = f.b as Extract<Body, { kind: 'fill' }>;
			const [fz0, fz1] = liveZ(ix, fb, f.st);
			if (fz1 > fz0) higher.push(xfBox({ ...rectXY(fb.rect), z0: fz0, z1: fz1 }, f.xfs[0]));
		}
		let boxes = subAll([reg], [...solids, ...higher]);
		const cuts = cutBoxes(ix, s, b.id).map((c) => xfBox(c, xf));
		boxes = subAll(boxes, cuts);
		const p = get(a);
		p.boxes.push(...boxes);
		// tiles around per-site features inside the region
		const groups = new Map<string, { g: Grid; r: number; z0: number; z1: number }>();
		for (const bd of bandsAll) {
			const r0 = isect(bd.rect, reg);
			if (!r0 || !bd.samples.length) continue;
			const bz0 = bd.samples[0].z, bz1 = bd.samples[bd.samples.length - 1].z;
			const za = Math.max(bz0, z0), zc = Math.min(bz1, z1);
			if (zc <= za) continue;
			let r = 0;
			for (const sm of bd.samples) if (sm.z >= za - 1e-6 && sm.z <= zc + 1e-6) r = Math.max(r, sm.rout);
			const k = bd.grid.key;
			const gr = groups.get(k);
			if (gr) { gr.r = Math.max(gr.r, r); gr.z0 = Math.min(gr.z0, za); gr.z1 = Math.max(gr.z1, zc); }
			else groups.set(k, { g: bd.grid, r, z0: za, z1: zc });
		}
		for (const gr of groups.values()) {
			const rr = isect(gridXY(gr.g), reg);
			if (!rr) continue;
			// the tile region replaces the boxes there (scene builder subtracts the drawn tiles from p.boxes); the z
			// spans of higher-ranked fills covering the region are removed (final F4: an ABF cavity fill and the bridge
			// underfill overlapped there and z-fought into dark hatching)
			let spans: [number, number][] = [[gr.z0, gr.z1]];
			for (const h of higher) {
				if (!(h.x0 <= rr.x0 + 1e-6 && h.x1 >= rr.x1 - 1e-6 && h.y0 <= rr.y0 + 1e-6 && h.y1 >= rr.y1 - 1e-6)) continue;
				spans = spans.flatMap(([u0, u1]) => [[u0, Math.min(u1, h.z0)], [Math.max(u0, h.z1), u1]] as [number, number][]).filter(([u0, u1]) => u1 - u0 > 1e-6);
			}
			for (const [u0, u1] of spans) p.tiles.push({ grid: gr.g, rect: rr, z0: u0, z1: u1, r: gr.r * 1.0001 });
		}
		const f = a.st.sub.front;
		if (f != null && f < 1) p.front = { from: b.flow.from, f, region: { x0: full.x0, x1: full.x1, y0: full.y0, y1: full.y1 } };
	}
	void gridSites;
	return [...byId.values()];
}

/** Filled part of a fill region at front f: linear fronts clip along their axis; radial ('center') and 'perimeter'
 * keep a rectangle scaled by f about the center (inscribed in the front circle when the region is square). */
function frontClip(b: PBox, from: string, f: number): PBox {
	const w = b.x1 - b.x0, d = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
	switch (from) {
		case 'x-': return { ...b, x1: b.x0 + f * w };
		case 'x+': return { ...b, x0: b.x1 - f * w };
		case 'y-': return { ...b, y1: b.y0 + f * d };
		case 'y+': return { ...b, y0: b.y1 - f * d };
		case 'perimeter': return b; // outer ring first: not clipped geometrically (material front only)
		default: return { ...b, x0: cx - (f * w) / 2, x1: cx + (f * w) / 2, y0: cy - (f * d) / 2, y1: cy + (f * d) / 2 };
	}
}

function splitTilesByCuts(t: PTiles, cuts: PBox[]): PTiles[] {
	// drop the tile region columns inside a cut (sites in kerfs / cavities are removed with the material)
	let rects: XY[] = [t.rect];
	for (const c of cuts) {
		if (c.z1 <= t.z0 || c.z0 >= t.z1) continue;
		rects = rects.flatMap((r) => subBox({ ...r, z0: 0, z1: 1 }, { ...c, z0: 0, z1: 1 }).map((b) => ({ x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 })));
	}
	return rects.map((r) => ({ ...t, rect: r }));
}
