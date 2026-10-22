// Routing synthesizer (DevLog-011): from routed conductor levels (`layer.route`), via entries and net classes
// (`family.routing`) generate deterministic mock-up geometry inside a routing window: traces, planes with antipads,
// pads / lands, vias (tapered, conformal, lined), solder-resist openings. Seeded by the family id; every decision
// hashes global lattice indices, so moving the window never reshuffles what is already drawn.
// Units: x, y in mm (package-centered, like the model); z in um. Sizes from the JSON (um) are converted to mm.
import * as THREE from 'three';
import { CLASS_COLOR, materialClass, templateColor } from './materials';
import { subtract, type ArrModel, type Box, type Item, type Model, type Piece } from './model';
import type { Dim, Layer, Net, Route, RouteRegion, ViaClass } from './types';

export interface Rect { x0: number; x1: number; y0: number; y1: number }

const MM = 1e-3;
const ZT = 0.01; // z tolerance, um
const BALL = ['bga', 'c4', 'lga'];
/** Instanced cylinders (pads, vias, lands, fillers) and boxes (traces, planes, pieces) per family and window. */
export const CYL_BUDGET = 16000;
export const BOX_BUDGET = 40000;
const TRI_BUDGET = 1100000; // routing triangles per family (boxes ~14 incl. caps, cylinders 40)
const MIN_PX = 1.5; // in-scale: a feature class is drawn when its width spans at least this many pixels
const ILL_PX = 2; // illustrative: minimum drawn width and gap, pixels

const COL = {
	cu: new THREE.Color(CLASS_COLOR.copper),
	solder: new THREE.Color(CLASS_COLOR.solder),
	plug: new THREE.Color('#2b2622'), // resin plug: dark, distinct from Cu and from the core laminate
	hollow: new THREE.Color('#0e0e0e'),
	liner: new THREE.Color(CLASS_COLOR.oxide)
};

export interface RLevel {
	item: Item; // the layer item (instance)
	host: Item; // host part item
	lid: string; // declared layer id
	route: Route;
	use: string;
	dir: 'x' | 'y';
	line: number; // mm (0 when not given)
	space: number; // mm
	fill: number;
	z0: number;
	z1: number;
	box: Box;
	matrixCls: string;
	matrixColor: THREE.Color;
	slabColor: THREE.Color;
	land: number; // mm: largest land of the vias that end on this level
	idx: number;
	zones: RZone[]; // per-region level properties (route.regions, L18): inside these footprints the zone's use / L/S apply
}

/** A footprint of a routed level with its own properties (route.regions). Lengths in mm, model coordinates. */
export interface RZone {
	rects: Rect[];
	use: string;
	dir: 'x' | 'y';
	line: number;
	space: number;
	fill: number;
}

export interface RVia {
	v: ViaClass;
	item: Item;
	host: Item;
	z0: number;
	z1: number;
	d0: number; // top diameter, mm
	d1: number; // bottom diameter, mm
	land: number; // mm
	pitch: number; // mm (grid vias)
	fill: string;
	plug: string; // resin | copper | none (plugged / conformal vias)
	wall: number; // mm
	liner: number; // mm
	grid: boolean;
	regions: Rect[] | null; // model coordinates; null = whole host
	cluster: [number, number][]; // offsets (mm) of the vias of one site (cluster n on a compact grid); [[0, 0]] if none
	span: number; // mm: extent of the cluster (0 for a single via)
	upper: RLevel | null;
	lower: RLevel | null;
	faceT: number; // um: thickness of a land drawn at a host face (upper / lower null)
	gx0: number;
	gy0: number;
	nx: number;
	ny: number;
}

export interface REp {
	arr: ArrModel;
	host: Item;
	side: 1 | -1; // 1: the array sits on the host's top face; -1: hangs below its bottom face
	level: RLevel; // outermost routed level on that side
	srs: Item[]; // solder resist / passivation layers between that level and the face (get openings)
	pad: number; // mm
	open: number; // mm
	fillCu: boolean[]; // per SR layer: the opening is filled by Cu (a via class spans that layer, or a Cu-Cu joint), else solder
	fillVia: (RVia | null)[]; // per SR layer: the via class spanning it (the opening is drawn with that via's profile, L18)
}

export interface RNet {
	n: Net;
	item: Item;
	from: ArrModel[];
	to: ArrModel[];
	jog: Set<string>;
	share: number;
	len: number; // mm
	est: number; // estimated cylinders per endpoint (budget)
}

export interface RPair {
	net: RNet;
	A: ArrModel;
	B: ArrModel;
	ax: 'x' | 'y'; // gap axis (wires run along it)
	sgn: 1 | -1; // B lies at +ax of A
	vlo: number;
	vhi: number;
	levels: RLevel[];
	nw: number[]; // wires per bump row per level
	cnt: number; // bump columns claimed from each facing edge
}

export interface RoutingModel {
	seed: number;
	note: string;
	levels: RLevel[];
	vias: RVia[];
	eps: REp[];
	nets: RNet[];
	pairs: RPair[];
	managed: Set<string>; // layer item ids drawn by the routing pass (routed levels, SR / passivation with openings)
	srItems: Item[];
	epArr: Set<ArrModel>; // arrays whose lattice is phase-aligned to the section (pads drawn under them)
	band: number; // mm
	pieces: Map<string, Piece[]>;
	emb: Map<string, Box[]>; // host part id -> embedded solids (bridge, cavity fill): routing features are cut there
}

export function strHash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Deterministic uniform [0, 1) from four integers. */
function rnd(a: number, b: number, c: number, d: number): number {
	let h = (a ^ 0x9e3779b9) | 0;
	h = Math.imul(h ^ (b | 0), 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h ^ (c | 0), 0xc2b2ae35);
	h ^= h >>> 16;
	h = Math.imul(h ^ (d | 0), 0x27d4eb2f);
	h ^= h >>> 15;
	return (h >>> 0) / 4294967296;
}

/** Shift of a lattice origin (mm) that puts its nearest row on the cut: the section is polished through a row. */
export function latticeShift(g0: number, p: number, cut: number): number {
	if (!(p > 0)) return 0;
	return cut - (g0 + Math.round((cut - g0) / p) * p);
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const inXY = (b: Box | Rect, x: number, y: number, m = 1e-6) => x >= b.x0 - m && x <= b.x1 + m && y >= b.y0 - m && y <= b.y1 + m;
const clipR = (a: Rect, b: Rect): Rect | null => {
	const r = { x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) };
	return r.x1 - r.x0 > 1e-9 && r.y1 - r.y0 > 1e-9 ? r : null;
};
const mod = (a: number, k: number) => ((a % k) + k) % k;

/** Rectangle minus axis-aligned holes as a set of rectangles (sweep over y bands; equal bands merged). */
export function sheet(R: Rect, holes: Rect[]): Rect[] {
	// sweep across the axis with fewer distinct hole edges (column-like holes: transpose)
	const ex = new Set<number>(), ey = new Set<number>();
	for (const h of holes) { ex.add(h.x0); ex.add(h.x1); ey.add(h.y0); ey.add(h.y1); }
	if (ex.size < ey.size) {
		const T = (r: Rect): Rect => ({ x0: r.y0, x1: r.y1, y0: r.x0, y1: r.x1 });
		return sheetY(T(R), holes.map(T)).map(T);
	}
	return sheetY(R, holes);
}

function sheetY(R: Rect, holes: Rect[]): Rect[] {
	const hs = holes.map((h) => clipR(h, R)).filter((h): h is Rect => !!h).sort((a, b) => a.y0 - b.y0);
	if (!hs.length) return [R];
	const ys = [...new Set([R.y0, R.y1, ...hs.flatMap((h) => [h.y0, h.y1])])].sort((a, b) => a - b);
	const out: Rect[] = [];
	let active: Rect[] = [];
	let hi = 0;
	let prevKey = '';
	let prev: Rect[] = [];
	for (let k = 0; k < ys.length - 1; k++) {
		const ya = ys[k], yb = ys[k + 1];
		if (yb - ya < 1e-9) continue;
		while (hi < hs.length && hs[hi].y0 <= ya + 1e-12) active.push(hs[hi++]);
		active = active.filter((h) => h.y1 > ya + 1e-12);
		const iv = active.filter((h) => h.y0 < yb - 1e-12).map((h) => [h.x0, h.x1]).sort((a, b) => a[0] - b[0]);
		const seg: number[][] = [];
		let x = R.x0;
		for (const [a, b] of iv) {
			if (a > x + 1e-9) seg.push([x, a]);
			x = Math.max(x, b);
		}
		if (R.x1 > x + 1e-9) seg.push([x, R.x1]);
		const key = seg.map((s) => `${s[0]},${s[1]}`).join(';');
		if (key === prevKey) {
			for (const r of prev) r.y1 = yb;
			continue;
		}
		prev = seg.map((s) => ({ x0: s[0], x1: s[1], y0: ya, y1: yb }));
		out.push(...prev);
		prevKey = key;
	}
	return out;
}

function worst(dims: Record<string, Dim> | undefined, keys: string[]): 'reported' | 'derived' | 'template' {
	let w: 'reported' | 'derived' | 'template' = 'reported';
	for (const k of keys) {
		const s = dims?.[k]?.status ?? 'template';
		if (s === 'template') return 'template';
		if (s === 'derived') w = 'derived';
	}
	return w;
}

// ---- model preparation ------------------------------------------------------------------------------------------

/** Resolve routed levels, via entries, endpoints, nets and D2D pairs of a family; registers via / net items. */
export function attachRouting(m: Model): RoutingModel | null {
	const f = m.family;
	const items = [...m.items.values()];
	const lvItems = items.filter((it) => it.type === 'layer' && it.role === 'conductor' && !!(it.src as Layer).route);
	if (!lvItems.length && !f.routing) return null;
	const note = f.routing?.layout_note ?? 'mock-up routing';
	const seed = strHash(f.id);
	const levels: RLevel[] = [];
	for (const it of lvItems) {
		const l = it.src as Layer;
		const r = l.route as Route;
		const host = m.items.get(it.host);
		if (!host) continue;
		const use = String(r.use ?? 'signal');
		const line = num(r.line_um) * MM, space = num(r.space_um) * MM;
		const fill = num(r.fill) > 0 ? Math.min(1, num(r.fill)) : use === 'plane' ? 0.85 : use === 'pad' ? 0.5 : line > 0 ? line / (line + space || line) : 0.5;
		const matrixCls = materialClass(String(r.matrix ?? 'organic_build_up'));
		let mc = new THREE.Color(CLASS_COLOR[matrixCls] ?? CLASS_COLOR.other);
		let slab = mc.clone().lerp(COL.cu, fill);
		// same look as the neighbouring dielectric layers (template = desaturated), so the Cu reads apart from the matrix
		if (it.prov === 'template') { slab = templateColor(slab); mc = templateColor(mc); }
		it.routeNote = note;
		const zones: RZone[] = [];
		for (const z of (Array.isArray(r.regions) ? r.regions : []) as RouteRegion[]) {
			const zu = String(z.use ?? use);
			const zl = num(z.line_um) * MM, zs = num(z.space_um) * MM;
			const rects = (z.rects ?? []).map((q) => ({ x0: q.x_mm - q.w_mm / 2 - m.cx, x1: q.x_mm + q.w_mm / 2 - m.cx, y0: q.y_mm - q.d_mm / 2 - m.cy, y1: q.y_mm + q.d_mm / 2 - m.cy }));
			if (!rects.length) continue;
			zones.push({ rects, use: zu, dir: z.dir === 'y' ? 'y' : 'x', line: zl, space: zs, fill: num(z.fill) > 0 ? Math.min(1, num(z.fill)) : fill });
		}
		levels.push({
			item: it, host, lid: l.id, route: r, use, dir: r.dir === 'y' ? 'y' : 'x', line, space, fill,
			z0: it.box.z0, z1: it.box.z1, box: host.box, matrixCls, matrixColor: mc, slabColor: slab, land: 0, idx: levels.length, zones
		});
	}
	const parts = items.filter((it) => it.type === 'part');
	const partsBy = (ref: string) => parts.filter((p) => p.id === ref || p.tid === ref);
	const levelIn = (host: Item, ref: string | null | undefined): RLevel | null => {
		if (!ref) return null;
		return levels.find((L) => L.host === host && (L.lid === ref || L.item.id === ref)) ?? levels.find((L) => L.item.id === ref) ?? null;
	};

	// Via entries: one per host instance.
	const vias: RVia[] = [];
	for (const v of f.routing?.vias ?? []) {
		let hosts: Item[] = [];
		if (Array.isArray(v.instances) && v.instances.length) hosts = v.instances.map((id) => m.items.get(id)).filter((h): h is Item => !!h && h.type === 'part');
		else if (v.through_kind === 'part') hosts = partsBy(v.through);
		else if (v.through_kind === 'layer' || v.through_kind == null) {
			const ls = items.filter((it) => it.type === 'layer' && ((it.src as Layer).id === v.through || it.id === v.through));
			hosts = [...new Set(ls.map((l) => m.items.get(l.host)).filter((h): h is Item => !!h))];
		}
		if (!hosts.length) hosts = partsBy(v.part);
		for (const host of hosts) {
			const id = hosts.length > 1 ? `${v.id}@${host.id}` : v.id;
			let z0 = num(v.z_um), z1 = z0 + num(v.h_um);
			if (!(z1 > z0)) {
				const tl = items.find((it) => it.type === 'layer' && it.host === host.id && (it.src as Layer).id === v.through);
				if (tl) { z0 = tl.box.z0; z1 = tl.box.z1; } else { z0 = host.box.z0; z1 = host.box.z1; }
			}
			const d0 = num(v.diameter_um) * MM;
			if (!(d0 > 0)) continue;
			const d1 = num(v.bottom_diameter_um) > 0 ? num(v.bottom_diameter_um) * MM : d0;
			const pitch = num(v.pitch_um) * MM;
			const item: Item = {
				id, type: 'via', name: v.name ?? v.id, kind: v.kind, material: 'copper', label: String(v.fill ?? 'filled'), tid: v.template_id ?? v.id,
				cls: 'copper', role: '', status: worst(v.dims, ['diameter_um']), prov: worst(v.dims, ['diameter_um']) === 'template' ? 'template' : 'reported',
				host: host.id, group: host.group, dims: v.dims ?? {}, box: { ...host.box, z0, z1 }, src: v, filler: false, xrayDefault: false, routeNote: note
			};
			const rg = Array.isArray(v.regions) && v.regions.length ? (v.regions as { x_mm: number; y_mm: number; w_mm: number; d_mm: number }[]) : null;
			if (rg) {
				// callouts on a region-restricted class anchor on its regions, not on the whole host
				const xs = rg.flatMap((r) => [r.x_mm - r.w_mm / 2 - m.cx, r.x_mm + r.w_mm / 2 - m.cx]), ys = rg.flatMap((r) => [r.y_mm - r.d_mm / 2 - m.cy, r.y_mm + r.d_mm / 2 - m.cy]);
				item.box = { x0: Math.max(host.box.x0, Math.min(...xs)), x1: Math.min(host.box.x1, Math.max(...xs)), y0: Math.max(host.box.y0, Math.min(...ys)), y1: Math.min(host.box.y1, Math.max(...ys)), z0, z1 };
			}
			if (!m.items.has(id)) m.items.set(id, item);
			let upper = levelIn(host, v.upper), lower = levelIn(host, v.lower);
			// Unnamed ends: the routed level directly above / below inside the same host (not for part spans).
			if (v.through_kind !== 'part') {
				upper ??= levels.find((L) => L.host === host && Math.abs(L.z0 - z1) < ZT) ?? null;
				lower ??= levels.find((L) => L.host === host && Math.abs(L.z1 - z0) < ZT) ?? null;
			}
			const hb = host.box;
			const nx = pitch > 0 ? Math.max(1, Math.floor((hb.x1 - hb.x0) / pitch + 1e-9)) : 0;
			const ny = pitch > 0 ? Math.max(1, Math.floor((hb.y1 - hb.y0) / pitch + 1e-9)) : 0;
			const wall = num(v.wall_um) * MM;
			const regs = Array.isArray(v.regions) ? (v.regions as { x_mm: number; y_mm: number; w_mm: number; d_mm: number }[]) : null;
			const regions = regs?.length ? regs.map((r) => ({ x0: r.x_mm - r.w_mm / 2 - m.cx, x1: r.x_mm + r.w_mm / 2 - m.cx, y0: r.y_mm - r.d_mm / 2 - m.cy, y1: r.y_mm + r.d_mm / 2 - m.cy })) : null;
			const fillS = String(v.fill ?? 'filled');
			const cl = v.cluster as { n?: number; pitch_um?: number } | undefined;
			const cn = Math.max(1, Math.round(num(cl?.n))), cp = num(cl?.pitch_um) * MM;
			const cluster: [number, number][] = [];
			let span = 0;
			if (cn > 1 && cp > 0) {
				// compact grid, ceil(sqrt n) columns; the middle row / column sits on the site (so it lies on the cut)
				const cols = Math.ceil(Math.sqrt(cn)), rows = Math.ceil(cn / cols);
				for (let k = 0; k < cn; k++) cluster.push([((k % cols) - Math.floor(cols / 2)) * cp, (Math.floor(k / cols) - Math.floor(rows / 2)) * cp]);
				span = (Math.max(cols, rows) - 1) * cp;
			} else cluster.push([0, 0]);
			vias.push({
				v, item, host, z0, z1, d0, d1, land: num(v.land_um) * MM, pitch, fill: fillS, plug: String(v.plug ?? (fillS === 'filled' ? 'copper' : 'resin')), wall, liner: num(v.liner_um) * MM,
				grid: pitch > 0, upper, lower, regions, cluster, span, faceT: Math.min(Math.max(num(v.wall_um) || 0.03 * (z1 - z0), 0.005 * (z1 - z0)), 20, 0.25 * (z1 - z0)),
				gx0: (hb.x0 + hb.x1) / 2 - ((nx - 1) / 2) * pitch, gy0: (hb.y0 + hb.y1) / 2 - ((ny - 1) / 2) * pitch, nx, ny
			});
		}
	}
	for (const V of vias) {
		const ld = (V.land || V.d0) + V.span;
		if (V.upper) V.upper.land = Math.max(V.upper.land, ld);
		if (V.lower) V.lower.land = Math.max(V.lower.land, ld);
	}

	// Endpoint arrays on the faces of routed hosts.
	const hosts = [...new Set(levels.map((L) => L.host))];
	const eps: REp[] = [];
	const srSet = new Map<string, Item>();
	for (const a of m.arrays) {
		const ab = a.item.box;
		for (const h of hosts) {
			const hb = h.box;
			if (!(ab.x0 < hb.x1 && hb.x0 < ab.x1 && ab.y0 < hb.y1 && hb.y0 < ab.y1)) continue;
			const side: 0 | 1 | -1 = Math.abs(a.z0 - hb.z1) < ZT ? 1 : Math.abs(a.z1 - hb.z0) < ZT ? -1 : 0;
			if (!side) continue;
			const hl = levels.filter((L) => L.host === h);
			const level = hl.reduce((b, L) => (side > 0 ? (L.z1 > b.z1 ? L : b) : L.z0 < b.z0 ? L : b), hl[0]);
			const between = items.filter((it) => it.type === 'layer' && it.host === h.id && (side > 0 ? it.box.z0 >= level.z1 - ZT : it.box.z1 <= level.z0 + ZT));
			// Only cover layers get openings: passivation / solder resist, or a dielectric forming the outer face. A core,
			// bonding or device layer between the level and the face means the array does not land on this level.
			const atFace = (it: Item) => (side > 0 ? Math.abs(it.box.z1 - hb.z1) < ZT : Math.abs(it.box.z0 - hb.z0) < ZT);
			if (between.some((it) => !(it.role === 'passivation' || (it.role === 'dielectric' && atFace(it))))) continue;
			const srs = between;
			for (const s of srs) srSet.set(s.id, s);
			const d = num(a.arr.diameter_um) * MM || 0.5 * a.pitch;
			const pad = num(a.arr.pad_um) * MM || (BALL.includes(a.arr.kind) ? 0.85 * d : d);
			const cuJoint = !['c4', 'bga', 'microbump', 'cu_pillar', 'lga'].includes(a.arr.kind);
			const fillVia = srs.map((sl) => vias.find((V) => V.host === h && !V.grid && Math.abs(V.z0 - sl.box.z0) < ZT && Math.abs(V.z1 - sl.box.z1) < ZT) ?? null);
			const fillCu = srs.map((_, si) => cuJoint || !!fillVia[si]);
			eps.push({ arr: a, host: h, side, level, srs, pad, open: num(a.arr.opening_um) * MM || 0.8 * pad, fillCu, fillVia });
		}
	}

	// Nets.
	const arrBy = (ref: string | undefined) => (ref ? m.arrays.filter((a) => a.item.id === ref || a.item.tid === ref || a.arr.id === ref) : []);
	const nets: RNet[] = [];
	for (const n of f.routing?.nets ?? []) {
		const from = arrBy(n.from), to = arrBy(n.to);
		if (!from.length) continue;
		const b0 = from[0].item.box;
		const box: Box = { ...b0 };
		for (const a of [...from, ...to]) {
			const b = a.item.box;
			box.x0 = Math.min(box.x0, b.x0); box.x1 = Math.max(box.x1, b.x1); box.y0 = Math.min(box.y0, b.y0); box.y1 = Math.max(box.y1, b.y1);
			box.z0 = Math.min(box.z0, b.z0); box.z1 = Math.max(box.z1, b.z1);
		}
		const item: Item = {
			id: n.id, type: 'net', name: `${n.id} net`, kind: n.kind, material: 'copper', label: n.kind, tid: n.id, cls: 'copper', role: '', status: 'template',
			prov: 'template', host: from[0].item.host, group: from[0].item.group, dims: n.dims ?? {}, box, src: n, filler: false, xrayDefault: false, routeNote: note
		};
		if (!m.items.has(n.id)) m.items.set(n.id, item);
		const lv = (n.kind === 'vertical' ? levels : levels.filter((L) => (n.levels ?? []).includes(L.lid) || L.lid === n.plane)).length;
		nets.push({ n, item, from, to, jog: new Set(n.jog ?? []), share: Math.max(0, num(n.share)), len: num(n.length_um) * MM, est: 2 * Math.max(2, Math.min(lv, 40)) + 2 });
	}

	// D2D pairs of lateral nets.
	const pairs: RPair[] = [];
	for (const N of nets) {
		if (N.n.kind !== 'lateral') continue;
		for (const A of N.from) for (const B of N.to) {
			if (A === B || Math.abs(A.z0 - B.z0) > 1) continue;
			const a = A.item.box, b = B.item.box;
			const xOv = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), yOv = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
			let ax: 'x' | 'y';
			if (xOv <= 0 && yOv > 0) ax = 'x';
			else if (yOv <= 0 && xOv > 0) ax = 'y';
			else continue;
			if (-(ax === 'x' ? xOv : yOv) > 5) continue;
			const sgn = (ax === 'x' ? b.x0 + b.x1 - a.x0 - a.x1 : b.y0 + b.y1 - a.y0 - a.y1) > 0 ? 1 : -1;
			const vlo = ax === 'x' ? Math.max(a.y0, b.y0) : Math.max(a.x0, b.x0), vhi = ax === 'x' ? Math.min(a.y1, b.y1) : Math.min(a.x1, b.x1);
			const vm = (vlo + vhi) / 2;
			const uA = ax === 'x' ? (sgn > 0 ? a.x1 : a.x0) : sgn > 0 ? a.y1 : a.y0;
			const uB = ax === 'x' ? (sgn > 0 ? b.x0 : b.x1) : sgn > 0 ? b.y0 : b.y1;
			const at = (u: number): [number, number] => (ax === 'x' ? [u, vm] : [vm, u]);
			const lv = (N.n.levels ?? [])
				.map((ref) => levels.find((L) => (L.lid === ref || L.item.id === ref) && inXY(L.box, ...at(uA)) && inXY(L.box, ...at(uB))))
				.filter((L): L is RLevel => !!L && L.line > 0);
			if (!lv.length) continue;
			const nw = lv.map((L) => Math.max(1, Math.floor(Math.floor((0.45 * A.pitch) / (L.line + L.space)) * Math.min(1, N.share))));
			pairs.push({ net: N, A, B, ax, sgn, vlo, vhi, levels: lv, nw, cnt: Math.max(...nw) * lv.length });
		}
	}

	const srItems = [...srSet.values()];
	const managed = new Set<string>([...levels.map((L) => L.item.id), ...srItems.map((s) => s.id)]);
	const pieces = new Map<string, Piece[]>();
	for (const p of m.pieces) if (managed.has(p.item.id)) pieces.set(p.item.id, [...(pieces.get(p.item.id) ?? []), p]);
	const epArr = new Set(eps.map((e) => e.arr));
	for (const N of nets) for (const a of [...N.from, ...N.to]) epArr.add(a);
	const band = Math.max(0.3, 3 * Math.max(0, ...[...epArr].map((a) => a.pitch)));
	for (const it of srItems) it.routeNote = note;
	const emb = new Map<string, Box[]>();
	for (const it of parts) if (it.host) emb.set(it.host, [...(emb.get(it.host) ?? []), it.box]);
	// Grid vias feeding an endpoint array of the same host at an integer pitch ratio (TSV under C4): same phase.
	for (const V of vias) {
		if (!V.grid) continue;
		// a region-restricted class phases to an endpoint array inside its regions first (EMIB-T bridge vias follow the
		// fine bumps over the bridge, not the BGA lattice of the same host)
		const within = (e: REp) => !V.regions || V.regions.some((r) => { const q = e.arr.item.box; return q.x0 >= r.x0 - 1e-6 && q.x1 <= r.x1 + 1e-6 && q.y0 >= r.y0 - 1e-6 && q.y1 <= r.y1 + 1e-6; });
		const src = eps.filter((e) => e.host === V.host && e.arr.pitch >= V.pitch - 1e-9 && Math.abs(e.arr.pitch / V.pitch - Math.round(e.arr.pitch / V.pitch)) < 1e-3).sort((a, b) => Number(within(b)) - Number(within(a)) || b.arr.pitch - a.arr.pitch)[0];
		if (!src) continue;
		V.gx0 = src.arr.gx0 + Math.round((V.gx0 - src.arr.gx0) / V.pitch) * V.pitch;
		V.gy0 = src.arr.gy0 + Math.round((V.gy0 - src.arr.gy0) / V.pitch) * V.pitch;
		V.nx = Math.max(1, Math.floor((V.host.box.x1 - V.gx0) / V.pitch + 1e-9) + 1);
		V.ny = Math.max(1, Math.floor((V.host.box.y1 - V.gy0) / V.pitch + 1e-9) + 1);
		if (V.gx0 < V.host.box.x0) { const k = Math.ceil((V.host.box.x0 - V.gx0) / V.pitch - 1e-9); V.gx0 += k * V.pitch; V.nx -= k; }
		if (V.gy0 < V.host.box.y0) { const k = Math.ceil((V.host.box.y0 - V.gy0) / V.pitch - 1e-9); V.gy0 += k * V.pitch; V.ny -= k; }
	}
	return { seed, note, levels, vias, eps, nets, pairs, managed, srItems, epArr, band, pieces, emb };
}

// ---- synthesis ----------------------------------------------------------------------------------------------------

export interface SynthOpts {
	section: boolean;
	axis: 'x' | 'y';
	cut: number; // mm, family coordinates
	wpp: number; // mm per pixel (quantized)
	illustrative: boolean;
	zoom: Rect | null; // visible region (quantized); null: no window, every routed level a tinted slab
	scale?: number; // budget share of this family (compare view: 1 / number of panes)
	colorOf: (it: Item) => THREE.Color;
}

export interface RBox extends Box {
	color: THREE.Color;
	cu: boolean; // Cu feature (drawn in front of the matrix on coplanar faces)
	cls: string; // material class for x-ray
	host: Item;
	item: Item;
}

export interface RCyl {
	x: number;
	y: number;
	z0: number;
	z1: number;
	r0: number; // top radius, mm
	r1: number; // bottom radius, mm
	core: boolean; // inner solid (plug / Cu inside a liner): drawn in front of the outer one on coplanar faces
	color: THREE.Color;
	cls: string;
	host: Item;
	item: Item;
}

export interface SynthOut {
	boxes: RBox[];
	cyls: RCyl[];
	win: Rect | null;
	depth: number;
}

interface Lat { x0: number; y0: number; p: number; nx: number; ny: number; k: number; ai: number; aj: number }
interface Pad { x: number; y: number; r: number; tied: boolean }
type El = { t: 'L'; L: RLevel; zc: number } | { t: 'V' | 'G'; V: RVia; zc: number } | { t: 'A'; A: ArrModel; zc: number };
interface Pt { x: number; y: number }

class Synth {
	boxes: RBox[] = [];
	cyls: RCyl[] = [];
	private pads = new Map<RLevel, Pad[]>();
	private keep = new Map<RLevel, Rect[]>();
	private cuRects = new Map<RLevel, Rect[]>(); // Cu boxes per level (the matrix is drawn around them, never overlapping)
	private used = new Map<RLevel, number>();
	private holes = new Map<string, Rect[]>();
	private landings = new Map<ArrModel, Set<string>>();
	private zones: { L: RLevel; r: Rect }[] = [];
	private usedGrid = new Set<string>(); // grid sites a net passes (others get a stand-alone stack in the cut)
	private lats = new Map<unknown, Lat>();
	readonly px: number;
	readonly ill: boolean;

	constructor(readonly m: Model, readonly rm: RoutingModel, readonly o: SynthOpts, readonly win: Rect) {
		this.px = o.wpp;
		this.ill = o.illustrative;
	}

	vis(w: number): boolean {
		return w > 0 && (this.ill || w >= MIN_PX * this.px);
	}
	dw(w: number): number {
		return this.ill ? Math.max(w, ILL_PX * this.px) : w;
	}
	kOf(p: number, wd: number): number {
		return this.ill && p > 0 ? Math.max(1, Math.ceil((wd + ILL_PX * this.px) / p - 1e-9)) : 1;
	}
	private full(): boolean {
		const k = this.o.scale ?? 1;
		return this.cyls.length > CYL_BUDGET * k * 1.3 || this.boxes.length > BOX_BUDGET * k * 1.3;
	}

	// lattices ------------------------------------------------------------------------------------------------
	lat(key: unknown, gx0: number, gy0: number, p: number, nx: number, ny: number, k: number): Lat {
		const c = this.lats.get(key);
		if (c) return c;
		let x0 = gx0, y0 = gy0, ai = 0, aj = 0;
		if (this.o.section) {
			if (this.o.axis === 'y') { y0 += latticeShift(gy0, p, this.o.cut); aj = Math.round((this.o.cut - y0) / p); }
			else { x0 += latticeShift(gx0, p, this.o.cut); ai = Math.round((this.o.cut - x0) / p); }
		}
		const L = { x0, y0, p, nx, ny, k, ai, aj };
		this.lats.set(key, L);
		return L;
	}
	epPad(a: ArrModel): number {
		const e = this.rm.eps.find((x) => x.arr === a);
		return e ? e.pad : (num(a.arr.diameter_um) * MM || 0.5 * a.pitch);
	}
	arrLat(a: ArrModel): Lat {
		return this.lat(a, a.gx0, a.gy0, a.pitch, a.nx, a.ny, this.kOf(a.pitch, this.dw(this.epPad(a))));
	}
	viaLat(V: RVia): Lat {
		return this.lat(V, V.gx0, V.gy0, V.pitch, V.nx, V.ny, this.kOf(V.pitch, this.dw(Math.max(V.land, V.d0))));
	}
	static range(n: number, g0: number, p: number, lo: number, hi: number, k: number, a: number): number[] {
		let i0 = Math.max(0, Math.ceil((lo - g0) / p - 1e-7));
		const i1 = Math.min(n - 1, Math.floor((hi - g0) / p + 1e-7));
		i0 += mod(a - i0, k);
		const out: number[] = [];
		for (let i = i0; i <= i1; i += k) out.push(i);
		return out;
	}
	static near(n: number, g0: number, p: number, v: number, k: number, a: number): number {
		let i = Math.round((v - g0) / p);
		i = a + Math.round((i - a) / k) * k;
		while (i > n - 1) i -= k;
		while (i < 0) i += k;
		return Math.min(n - 1, Math.max(0, i));
	}
	nearest(L: Lat, x: number, y: number): { x: number; y: number; i: number; j: number } {
		const i = Synth.near(L.nx, L.x0, L.p, x, L.k, L.ai), j = Synth.near(L.ny, L.y0, L.p, y, L.k, L.aj);
		return { x: L.x0 + i * L.p, y: L.y0 + j * L.p, i, j };
	}
	positions(L: Lat, R: Rect): { i: number[]; j: number[] } {
		return { i: Synth.range(L.nx, L.x0, L.p, R.x0, R.x1, L.k, L.ai), j: Synth.range(L.ny, L.y0, L.p, R.y0, R.y1, L.k, L.aj) };
	}
	region(b: Box | Rect): Rect | null {
		return clipR(this.win, b);
	}

	// emitters ------------------------------------------------------------------------------------------------
	cyl(x: number, y: number, z0: number, z1: number, d0: number, d1: number, color: THREE.Color, cls: string, host: Item, item: Item, core = false) {
		if (!(z1 > z0) || !(d0 > 0)) return;
		const emb = this.rm.emb.get(host.id);
		if (emb && emb.some((b) => inXY(b, x, y, 0) && z0 < b.z1 - ZT && b.z0 < z1 - ZT)) return;
		this.cyls.push({ x, y, z0, z1, r0: d0 / 2, r1: d1 / 2, core, color, cls, host, item });
	}
	box(r: Rect, z0: number, z1: number, color: THREE.Color, cu: boolean, cls: string, host: Item, item: Item) {
		const emb = this.rm.emb.get(host.id);
		let bs: Box[] = [{ x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z0, z1 }];
		if (emb) for (const e of emb) bs = bs.flatMap((b) => subtract(b, e));
		for (const b of bs) if (b.z1 - b.z0 > 1e-9) this.boxes.push({ ...b, color, cu, cls, host, item });
	}
	/** Cu box on a level, clipped to the level's window region and recorded so the matrix is cut around it. */
	cuBox(L: RLevel, r: Rect, item: Item) {
		const R = this.region(L.box);
		const c = R && clipR(r, R);
		if (!c) return;
		let l = this.cuRects.get(L);
		if (!l) this.cuRects.set(L, (l = []));
		l.push(c);
		this.box(c, L.z0, L.z1, COL.cu, true, 'copper', L.host, item);
	}
	bump(L: RLevel) {
		this.used.set(L, (this.used.get(L) ?? 0) + 1);
	}
	padAt(L: RLevel, x: number, y: number, d: number, item: Item, tied = false) {
		if (!this.vis(d)) return;
		const dd = this.dw(d);
		this.cyl(x, y, L.z0, L.z1, dd, dd, COL.cu, 'copper', L.host, item);
		let ps = this.pads.get(L);
		if (!ps) this.pads.set(L, (ps = []));
		ps.push({ x, y, r: dd / 2, tied });
		this.bump(L);
	}
	landOf(L: RLevel): number {
		return L.land || 3 * L.line || 0;
	}
	/** Land of a pad joining the given via classes (the ones actually used at this point), else the level default. */
	landNear(L: RLevel, vs: RVia[]): number {
		let ld = 0;
		for (const V of vs) ld = Math.max(ld, (V.land || 1.5 * V.d0) + V.span);
		return ld || this.landOf(L);
	}
	keepout(L: RLevel, r: Rect) {
		let k = this.keep.get(L);
		if (!k) this.keep.set(L, (k = []));
		k.push(r);
	}
	/** Axis-aligned trace segment on a level (ends extended by half the width so segments join). */
	seg(L: RLevel, x0: number, y0: number, x1: number, y1: number, w: number, item: Item) {
		if (!this.vis(w) || (Math.abs(x1 - x0) < 1e-9 && Math.abs(y1 - y0) < 1e-9)) return;
		const h = this.dw(w) / 2;
		const r = { x0: Math.min(x0, x1) - h, x1: Math.max(x0, x1) + h, y0: Math.min(y0, y1) - h, y1: Math.max(y0, y1) + h };
		// pad-only zones of the level (route.regions use pad) carry no traces: segments stop at their edge
		const pz = L.zones.filter((z) => z.use === 'pad').flatMap((z) => z.rects);
		for (const q of pz.length ? sheet(r, pz) : [r]) this.cuBox(L, q, item);
		const c = Math.max(L.space, this.ill ? ILL_PX * this.px : 0);
		this.keepout(L, { x0: r.x0 - c, x1: r.x1 + c, y0: r.y0 - c, y1: r.y1 + c });
		this.bump(L);
	}
	/** Route a to b on a level: along the level direction first, then the other axis (dirOnly: first leg only). */
	route(L: RLevel, ax: number, ay: number, bx: number, by: number, dirOnly: boolean, item: Item): Pt {
		const w = L.line || 0.5 * this.landOf(L);
		const c: Pt = L.dir === 'x' ? { x: bx, y: ay } : { x: ax, y: by };
		this.seg(L, ax, ay, c.x, c.y, w, item);
		if (dirOnly) return c;
		this.seg(L, c.x, c.y, bx, by, w, item);
		return { x: bx, y: by };
	}
	viaAt(V: RVia, x0: number, y0: number) {
		if (!this.vis(V.d0)) return;
		const s = this.dw(V.d0) / V.d0;
		const d0 = V.d0 * s, d1 = V.d1 * s;
		for (const [dx, dy] of V.cluster) {
			const x = x0 + dx, y = y0 + dy;
			this.cyl(x, y, V.z0, V.z1, d0, d1, COL.cu, 'copper', V.host, V.item);
			if (V.fill !== 'filled' && V.wall > 0 && V.plug !== 'copper') {
				const wd = this.ill ? Math.max(V.wall, ILL_PX * this.px * 0.5) : V.wall;
				const c0 = d0 - 2 * wd, c1 = d1 - 2 * wd;
				if (c0 > 0.5 * this.px && c1 > 0) this.cyl(x, y, V.z0, V.z1, c0, c1, V.plug === 'none' ? COL.hollow : COL.plug, 'copper', V.host, V.item, true);
			}
		}
	}

	/** Stand-alone via column above (up) or below a grid site: pads and vias through the contiguous routed stack. */
	column(V: RVia, x: number, y: number, up: boolean) {
		const els = this.elementsAt(x, y, up ? V.z1 : -Infinity, up ? Infinity : V.z0, new Set());
		if (up) els.reverse();
		let edge = up ? V.z1 : V.z0;
		const run: El[] = [];
		for (const e of els) {
			if (e.t === 'G' || e.t === 'A') break;
			const z0 = e.t === 'L' ? e.L.z0 : e.V.z0, z1 = e.t === 'L' ? e.L.z1 : e.V.z1;
			if (Math.abs((up ? z0 : z1) - edge) > 0.5) break; // not contiguous: another part
			edge = up ? z1 : z0;
			run.push(e);
		}
		run.forEach((e, k) => {
			if (e.t === 'L') {
				const nb = [k === 0 ? { t: 'V', V } : run[k - 1], run[k + 1]].filter((q): q is { t: 'V'; V: RVia } => !!q && q.t === 'V').map((q) => q.V);
				this.padAt(e.L, x, y, this.landNear(e.L, nb), V.item);
			} else if (e.t === 'V') this.viaAt(e.V, x, y);
		});
	}

	// element walk ----------------------------------------------------------------------------------------------
	elementsAt(x: number, y: number, zlo: number, zhi: number, excl: Set<ArrModel>): El[] {
		const out: El[] = [];
		const inZ = (a: number, b: number) => a >= zlo - ZT && b <= zhi + ZT;
		for (const L of this.rm.levels) if (inXY(L.box, x, y) && inZ(L.z0, L.z1)) out.push({ t: 'L', L, zc: (L.z0 + L.z1) / 2 });
		const vs: RVia[] = [];
		for (const V of this.rm.vias) {
			if (!inXY(V.host.box, x, y) || !inZ(V.z0, V.z1)) continue;
			if (V.regions && !V.regions.some((r) => inXY(r, x, y, 0))) continue;
			// one via class per dielectric at a point: a class restricted to regions wins over a general one
			const j = vs.findIndex((o) => o.host === V.host && o.z0 < V.z1 - ZT && V.z0 < o.z1 - ZT);
			if (j >= 0) { if (V.regions && !vs[j].regions) vs[j] = V; continue; }
			vs.push(V);
		}
		for (const V of vs) out.push({ t: V.grid ? 'G' : 'V', V, zc: (V.z0 + V.z1) / 2 });
		for (const A of this.m.arrays) {
			if (excl.has(A) || !inXY(A.item.box, x, y, A.pitch) || !inZ(A.z0, A.z1)) continue;
			if (!this.rm.epArr.has(A)) continue;
			out.push({ t: 'A', A, zc: (A.z0 + A.z1) / 2 });
		}
		return out.sort((a, b) => b.zc - a.zc);
	}

	/** Grid / array position nearest to (x, y) of a section-ending connector. */
	gridNearest(e: El, x: number, y: number): Pt {
		if (e.t === 'G') {
			const n = this.nearest(this.viaLat(e.V), x, y);
			this.usedGrid.add(`${e.V.item.id}|${n.i},${n.j}`);
			return n;
		}
		if (e.t === 'A') return this.nearest(this.arrLat(e.A), x, y);
		return { x, y };
	}

	toNearest(to: ArrModel[], x: number, y: number): { x: number; y: number; arr: ArrModel; i: number; j: number } | null {
		if (!to.length) return null;
		let best = to.find((a) => inXY(a.item.box, x, y, a.pitch / 2));
		if (!best) {
			let bd = Infinity;
			for (const a of to) {
				const b = a.item.box;
				const d = Math.hypot((b.x0 + b.x1) / 2 - x, (b.y0 + b.y1) / 2 - y);
				if (d < bd) { bd = d; best = a; }
			}
		}
		if (!best) return null;
		const n = this.nearest(this.arrLat(best), x, y);
		return { ...n, arr: best };
	}

	/**
	 * Chain from an endpoint at (x, y) of array A: down (or up) through the routed levels, one via per gap, jogging on
	 * jog levels toward the next grid connector (grid via / intermediate array) or the destination array.
	 * stop: end at that level (plane_tie, escape, D2D stacks). Returns the end point (and the reached `to` lattice slot).
	 */
	walk(
		x: number, y: number, A: ArrModel,
		o: { down: boolean; to: ArrModel[]; stop?: RLevel; jog: Set<string>; stagger: boolean; item: Item; tie?: boolean }
	): { x: number; y: number; land: { arr: ArrModel; i: number; j: number } | null } | null {
		const zA = o.down ? A.z0 : A.z1;
		let zlo: number, zhi: number;
		if (o.to.length && !o.stop) {
			const T = o.to[0];
			zlo = o.down ? T.z1 : zA; zhi = o.down ? zA : T.z0;
			if (!(zhi > zlo)) return null;
		} else { zlo = o.down ? -Infinity : zA; zhi = o.down ? zA : Infinity; }
		const els = this.elementsAt(x, y, zlo, zhi, new Set([A, ...o.to]));
		if (!o.down) els.reverse();
		const Ls: RLevel[] = [], gaps: El[][] = [];
		for (const e of els) {
			if (e.t === 'L') { Ls.push(e.L); gaps.push([]); }
			else if (Ls.length) gaps[Ls.length - 1].push(e);
		}
		if (!Ls.length) return null;
		if (o.stop) {
			const si = Ls.indexOf(o.stop);
			if (si < 0) return null;
			Ls.length = si + 1;
			gaps.length = si + 1;
			gaps[si] = [];
		}
		const isJog = (L: RLevel) => o.jog.has(L.lid) || o.jog.has(L.item.id);
		const isGrid = (e: El) => e.t === 'G' || e.t === 'A';
		let px = x, py = y, ax = x, ay = y, tog = false;
		let T: Pt | null = null;
		let land: { arr: ArrModel; i: number; j: number } | null = null;
		let jogsLeft = 0, secStart = true;
		for (let li = 0; li < Ls.length; li++) {
			const L = Ls[li];
			if (secStart) {
				let g = li;
				while (g < Ls.length && !gaps[g].some(isGrid)) g++;
				const ge = g < Ls.length ? gaps[g].find(isGrid) ?? null : null;
				T = null;
				land = null;
				if (ge) T = this.gridNearest(ge, px, py);
				else if (!o.stop) {
					const tn = this.toNearest(o.to, px, py);
					if (tn) { T = tn; land = { arr: tn.arr, i: tn.i, j: tn.j }; }
				}
				jogsLeft = 0;
				for (let q = li; q <= Math.min(g, Ls.length - 1); q++) if (isJog(Ls[q])) jogsLeft++;
				secStart = false;
			}
			const adj = [...(li > 0 ? gaps[li - 1] : []), ...gaps[li]].filter((e): e is { t: 'V' | 'G'; V: RVia; zc: number } => e.t === 'V' || e.t === 'G').map((e) => e.V);
			const ld = this.landNear(L, adj);
			const tie = !!o.tie && L === o.stop;
			const enX = px, enY = py;
			this.padAt(L, px, py, ld, o.item, tie);
			let cx = px, cy = py;
			const gap = gaps[li];
			const hasGrid = gap.some(isGrid);
			const last = li === Ls.length - 1;
			const jog = isJog(L);
			if (T && (jog || ((hasGrid || last) && (Math.abs(cx - T.x) > 1e-9 || Math.abs(cy - T.y) > 1e-9)))) {
				const p = this.route(L, cx, cy, T.x, T.y, jog && jogsLeft >= 2, o.item);
				cx = p.x; cy = p.y;
				if (jog) jogsLeft--;
				ax = cx; ay = cy; tog = false;
			}
			let ex = cx, ey = cy;
			if (!hasGrid && o.stagger && !last && gap.some((e) => e.t === 'V')) {
				tog = !tog;
				const off = this.dw(ld);
				ex = ax; ey = ay;
				if (tog) { if (L.dir === 'x') ex += off; else ey += off; }
			}
			if (Math.abs(ex - cx) > 1e-9 || Math.abs(ey - cy) > 1e-9) this.seg(L, cx, cy, ex, ey, 0.7 * ld, o.item);
			if (Math.abs(ex - enX) > 1e-9 || Math.abs(ey - enY) > 1e-9) this.padAt(L, ex, ey, ld, o.item, tie);
			for (const e of gap) if (e.t === 'V') this.viaAt(e.V, ex, ey);
			px = ex; py = ey;
			if (hasGrid) secStart = true;
		}
		return { x: px, y: py, land: o.stop ? null : land };
	}

	// generators --------------------------------------------------------------------------------------------------
	claimed(A: ArrModel, i: number, j: number, L: Lat): boolean {
		for (const P of this.rm.pairs) {
			const isA = P.A === A, isB = P.B === A;
			if (!isA && !isB) continue;
			const u = P.ax === 'x' ? i : j, nU = P.ax === 'x' ? A.nx : A.ny;
			const v = P.ax === 'x' ? L.y0 + j * L.p : L.x0 + i * L.p;
			if (v < P.vlo - 1e-9 || v > P.vhi + 1e-9) continue;
			const nearHi = (isA ? P.sgn > 0 : P.sgn < 0);
			if (nearHi ? u >= nU - P.cnt : u < P.cnt) return true;
		}
		return false;
	}

	uv(P: RPair, u: number, v: number): Pt {
		return P.ax === 'x' ? { x: u, y: v } : { x: v, y: u };
	}

	/** D2D zones (keepouts for background traces and grid vias on the pair's levels). */
	pairZones() {
		for (const P of this.rm.pairs) {
			const LA = this.arrLat(P.A), LB = this.arrLat(P.B);
			const uOf = (L: Lat, c: number) => (P.ax === 'x' ? L.x0 + c * L.p : L.y0 + c * L.p);
			const nA = P.ax === 'x' ? P.A.nx : P.A.ny, nB = P.ax === 'x' ? P.B.nx : P.B.ny;
			const farA = uOf(LA, P.sgn > 0 ? nA - P.cnt : P.cnt - 1), farB = uOf(LB, P.sgn > 0 ? P.cnt - 1 : nB - P.cnt);
			const u0 = Math.min(farA, farB) - P.A.pitch / 2, u1 = Math.max(farA, farB) + P.A.pitch / 2;
			const r = P.ax === 'x' ? { x0: u0, x1: u1, y0: P.vlo, y1: P.vhi } : { x0: P.vlo, x1: P.vhi, y0: u0, y1: u1 };
			// grid vias are kept out of the die-to-die gap only (TSVs stay under the bump fields)
			const a = P.A.item.box, b = P.B.item.box;
			const g0 = P.ax === 'x' ? (P.sgn > 0 ? a.x1 : b.x1) : P.sgn > 0 ? a.y1 : b.y1;
			const g1 = P.ax === 'x' ? (P.sgn > 0 ? b.x0 : a.x0) : P.sgn > 0 ? b.y0 : a.y0;
			const gap = P.ax === 'x' ? { x0: g0, x1: g1, y0: P.vlo, y1: P.vhi } : { x0: P.vlo, x1: P.vhi, y0: g0, y1: g1 };
			for (const L of P.levels) {
				this.zones.push({ L, r: gap });
				this.keepout(L, r);
			}
		}
	}

	endpoints() {
		for (const E of this.rm.eps) {
			const A = E.arr;
			const R = clipR(this.win, A.item.box);
			const R2 = R && clipR(R, E.host.box);
			if (!R2) continue;
			const L = this.arrLat(A);
			const pv = this.vis(E.pad), ov = this.vis(E.open) && E.srs.length > 0;
			if (!pv && !ov) continue;
			const { i: is, j: js } = this.positions(L, R2);
			const od = this.dw(E.open);
			// via classes drawn as a cluster per pad (hybrid-bond vias under each bond pad)
			// and via classes under hybrid-bond pads: one (or one cluster) under every pad, not only where a net passes
			const hb = A.arr.kind === 'hybrid_bond';
			const cv = this.rm.vias.filter((V) => !V.grid && (V.cluster.length > 1 || hb) && V.host === E.host && (V.upper === E.level || V.lower === E.level));
			for (const j of js) {
				for (const i of is) {
					const x = L.x0 + i * L.p, y = L.y0 + j * L.p;
					if (pv) this.padAt(E.level, x, y, E.pad, E.level.item);
					for (const V of cv) {
						this.viaAt(V, x, y);
						const far = V.upper === E.level ? V.lower : V.upper;
						if (far) this.padAt(far, x, y, this.landNear(far, [V]), V.item);
					}
					if (ov) E.srs.forEach((s, si) => {
						let h = this.holes.get(s.id);
						if (!h) this.holes.set(s.id, (h = []));
						// an opening filled by a via class takes that via's (tapered) profile, e.g. the Si-IF pillar in its oxide
						const fv = E.fillVia[si];
						const t0 = fv ? this.dw(fv.d0) : od, t1 = fv ? this.dw(fv.d1) : od, hw = Math.max(t0, t1) / 2;
						h.push({ x0: x - hw, x1: x + hw, y0: y - hw, y1: y + hw });
						const cu = E.fillCu[si];
						this.cyl(x, y, s.box.z0, s.box.z1, t0, t1, cu ? COL.cu : COL.solder, cu ? 'copper' : 'solder', E.host, A.item);
					});
				}
				if (this.full()) return;
			}
			A.item.lod = L.k > 1 ? `illustrative: 1 of ${L.k} x ${L.k} pads drawn` : undefined;
		}
	}

	grids() {
		for (const V of this.rm.vias) {
			if (!V.grid) continue;
			const ld = (V.land || 1.5 * V.d0) + V.span;
			const bv = this.vis(V.d0), lv = this.vis(ld);
			if (!bv && !lv) { V.item.lod = `below ${MIN_PX} px: not drawn`; continue; }
			const R = this.region(V.host.box);
			if (!R) continue;
			const L = this.viaLat(V);
			V.item.lod = L.k > 1 ? `illustrative: 1 of ${L.k} x ${L.k} vias drawn, widths >= ${ILL_PX} px` : undefined;
			const zs = this.zones.filter((z) => z.L === V.upper || z.L === V.lower).map((z) => z.r);
			const { i: is, j: js } = this.positions(L, R);
			const s = this.dw(V.d0) / V.d0;
			const d0 = V.d0 * s, d1 = V.d1 * s;
			const lined = V.liner > 0 && (this.ill || V.liner >= 0.5 * this.px);
			const plugged = V.fill !== 'filled' && V.wall > 0;
			for (const j of js) {
				for (const i of is) {
					const sx = L.x0 + i * L.p, sy = L.y0 + j * L.p;
					if (zs.some((r) => inXY(r, sx, sy))) continue;
					if (V.regions && !V.regions.some((r) => inXY(r, sx, sy, 0))) continue;
					if (bv) for (const [dx, dy] of V.cluster) {
						const x = sx + dx, y = sy + dy;
						if (lined) {
							const lw = this.ill ? Math.max(V.liner, 0.5 * ILL_PX * this.px) : V.liner;
							this.cyl(x, y, V.z0, V.z1, d0 + 2 * lw, d1 + 2 * lw, COL.liner, 'copper', V.host, V.item);
							this.cyl(x, y, V.z0, V.z1, d0, d1, COL.cu, 'copper', V.host, V.item, true);
						} else {
							this.cyl(x, y, V.z0, V.z1, d0, d1, COL.cu, 'copper', V.host, V.item);
							if (plugged && V.plug !== 'copper') {
								const wd = this.ill ? Math.max(V.wall, 0.5 * ILL_PX * this.px) : V.wall;
								const lo = V.lower ? 0 : V.faceT, hi = V.upper ? 0 : V.faceT;
								if (d0 - 2 * wd > 0.5 * this.px) this.cyl(x, y, V.z0 + lo, V.z1 - hi, d0 - 2 * wd, d1 - 2 * wd, V.plug === 'none' ? COL.hollow : COL.plug, 'copper', V.host, V.item, true);
							}
						}
					}
					const x = sx, y = sy;
					if (lv) {
						if (V.upper) this.padAt(V.upper, x, y, ld, V.item);
						else { const dd = this.dw(ld); this.cyl(x, y, V.z1 - V.faceT, V.z1, dd, dd, COL.cu, 'copper', V.host, V.item); }
						if (V.lower) this.padAt(V.lower, x, y, ld, V.item);
						else { const dd = this.dw(ld); this.cyl(x, y, V.z0, V.z0 + V.faceT, dd, dd, COL.cu, 'copper', V.host, V.item); }
					}
				}
				if (this.full()) return;
			}
		}
	}

	/** Every grid through-via on the cut row that no net passes gets a via column above and below (PTH / TGV / TSV
	 * stacks, as in real sections), so the cut never shows a bare barrel. */
	gridColumns() {
		const o = this.o;
		if (!o.section) return;
		for (const V of this.rm.vias) {
			if (!V.grid || !this.vis(V.d0)) continue;
			const R = this.region(V.host.box);
			if (!R) continue;
			const L = this.viaLat(V);
			const zs = this.zones.filter((z) => z.L === V.upper || z.L === V.lower).map((z) => z.r);
			const { i: is, j: js } = this.positions(L, R);
			const rows = o.axis === 'y' ? js.filter((j) => Math.abs(L.y0 + j * L.p - o.cut) < 1e-6) : js;
			const cols = o.axis === 'x' ? is.filter((i) => Math.abs(L.x0 + i * L.p - o.cut) < 1e-6) : is;
			for (const j of rows) for (const i of cols) {
				if (this.usedGrid.has(`${V.item.id}|${i},${j}`)) continue;
				const x = L.x0 + i * L.p, y = L.y0 + j * L.p;
				if (zs.some((r) => inXY(r, x, y))) continue;
				if (V.regions && !V.regions.some((r) => inXY(r, x, y, 0))) continue;
				this.column(V, x, y, true);
				this.column(V, x, y, false);
			}
			if (this.full()) return;
		}
	}

	lateral() {
		for (const P of this.rm.pairs) {
			const LA = this.arrLat(P.A), LB = this.arrLat(P.B);
			const vAx: 'x' | 'y' = P.ax === 'x' ? 'y' : 'x';
			const rows = P.ax === 'x'
				? Synth.range(P.A.ny, LA.y0, LA.p, Math.max(P.vlo, this.win.y0), Math.min(P.vhi, this.win.y1), LA.k, LA.aj)
				: Synth.range(P.A.nx, LA.x0, LA.p, Math.max(P.vlo, this.win.x0), Math.min(P.vhi, this.win.x1), LA.k, LA.ai);
			const sv = this.o.section && this.o.axis === vAx && this.o.axis === 'x' ? -1 : 1;
			const nA = P.ax === 'x' ? P.A.nx : P.A.ny, nB = P.ax === 'x' ? P.B.nx : P.B.ny;
			const uA = (c: number) => (P.ax === 'x' ? LA.x0 + c * LA.p : LA.y0 + c * LA.p);
			const uB = (c: number) => (P.ax === 'x' ? LB.x0 + c * LB.p : LB.y0 + c * LB.p);
			const downA = P.levels[0].z1 <= P.A.z0 + ZT;
			let kmax = 1;
			for (const r of rows) {
				const vA = P.ax === 'x' ? LA.y0 + r * LA.p : LA.x0 + r * LA.p;
				const rb = P.ax === 'x' ? Synth.near(P.B.ny, LB.y0, LB.p, vA, LB.k, LB.aj) : Synth.near(P.B.nx, LB.x0, LB.p, vA, LB.k, LB.ai);
				const vB = P.ax === 'x' ? LB.y0 + rb * LB.p : LB.x0 + rb * LB.p;
				P.levels.forEach((L, lk) => {
					const Pp = L.line + L.space;
					const kd = this.kOf(Pp, this.dw(L.line));
					kmax = Math.max(kmax, kd);
					if (!this.vis(L.line)) return;
					for (let t = 0; t < P.nw[lk]; t += kd) {
						const c = t * P.levels.length + lk;
						const ca = P.sgn > 0 ? nA - 1 - c : c, cb = P.sgn > 0 ? c : nB - 1 - c;
						if (ca < 0 || cb < 0 || ca >= nA || cb >= nB) continue;
						const a = this.uv(P, uA(ca), vA), b = this.uv(P, uB(cb), vB);
						const vt = vA + sv * t * Pp;
						const a2 = this.uv(P, uA(ca), vt), b2 = this.uv(P, uB(cb), vt);
						const st = { down: downA, to: [], stop: L, jog: new Set<string>(), stagger: false, item: P.net.item };
						this.walk(a.x, a.y, P.A, st);
						this.walk(b.x, b.y, P.B, st);
						this.seg(L, a.x, a.y, a2.x, a2.y, L.line, P.net.item);
						this.seg(L, a2.x, a2.y, b2.x, b2.y, L.line, P.net.item);
						this.seg(L, b2.x, b2.y, b.x, b.y, L.line, P.net.item);
					}
				});
				if (this.full()) break;
			}
			P.net.item.lod = kmax > 1 || LA.k > 1 ? `illustrative: 1 of ${kmax} wires per level and 1 of ${LA.k} bump rows drawn, widths >= ${ILL_PX} px` : undefined;
		}
	}

	chains() {
		const byArr = new Map<ArrModel, RNet[]>();
		for (const N of this.rm.nets) {
			if (N.n.kind === 'lateral') continue;
			for (const a of N.from) byArr.set(a, [...(byArr.get(a) ?? []), N]);
		}
		const order = [...byArr.keys()].sort((a, b) => b.z0 - a.z0);
		for (const A of order) {
			const nets = byArr.get(A)!;
			const R = this.region(A.item.box);
			if (!R) continue;
			const L = this.arrLat(A);
			const lands = this.landings.get(A);
			const prefer = nets.find((n) => n.n.kind === 'vertical' && n.to.length) ?? null;
			const ah = strHash(A.item.id);
			const { i: is, j: js } = this.positions(L, R);
			for (const N of nets) N.item.lod = L.k > 1 ? `illustrative: 1 of ${L.k} x ${L.k} endpoints drawn, widths >= ${ILL_PX} px` : undefined;
			for (const j of js) {
				for (const i of is) {
					if (this.rm.pairs.length && this.claimed(A, i, j, L)) continue;
					let N: RNet | null = null;
					if (prefer && lands?.has(`${i},${j}`)) N = prefer;
					else {
						const u = rnd(this.rm.seed, ah, i, j);
						let acc = 0;
						for (const n of nets) { acc += n.share; if (u < acc) { N = n; break; } }
					}
					if (!N) continue;
					this.chain(N, A, L.x0 + i * L.p, L.y0 + j * L.p, i, j);
				}
				if (this.full()) return;
			}
		}
	}

	chain(N: RNet, A: ArrModel, x: number, y: number, i: number, j: number) {
		const k = N.n.kind;
		const stagger = N.n.style === 'staggered';
		if (k === 'vertical') {
			if (!N.to.length) return;
			const down = A.z0 >= N.to[0].z1 - ZT;
			const r = this.walk(x, y, A, { down, to: N.to, jog: N.jog, stagger, item: N.item });
			if (r?.land) {
				let s = this.landings.get(r.land.arr);
				if (!s) this.landings.set(r.land.arr, (s = new Set()));
				s.add(`${r.land.i},${r.land.j}`);
			}
			return;
		}
		const ref = k === 'plane_tie' ? N.n.plane : (N.n.levels ?? [])[Math.floor(rnd(this.rm.seed, 7, i, j) * Math.max(1, (N.n.levels ?? []).length))];
		if (!ref) return;
		const L = this.rm.levels.find((l) => (l.lid === ref || l.item.id === ref) && inXY(l.box, x, y));
		if (!L) return;
		const down = L.z1 <= A.z0 + ZT;
		const r = this.walk(x, y, A, { down, to: [], stop: L, jog: new Set(), stagger: false, item: N.item, tie: k === 'plane_tie' });
		if (!r || k !== 'escape') return;
		const len = N.len || 20 * (L.line || 0.01);
		const b = A.item.box;
		if (L.dir === 'x') {
			const s = r.x >= (b.x0 + b.x1) / 2 ? 1 : -1;
			this.seg(L, r.x, r.y, r.x + s * len, r.y, L.line || 0.5 * this.landOf(L), N.item);
		} else {
			const s = r.y >= (b.y0 + b.y1) / 2 ? 1 : -1;
			this.seg(L, r.x, r.y, r.x, r.y + s * len, L.line || 0.5 * this.landOf(L), N.item);
		}
	}

	planes() {
		for (const L of this.rm.levels) {
			// the level's own plane outside its zones, and every plane zone with its own antipad clearance
			const runs: { R: Rect; space: number; skip: Rect[] }[] = [];
			const R0 = this.region(L.box);
			if (!R0) continue;
			if (L.use === 'plane') runs.push({ R: R0, space: L.space, skip: L.zones.flatMap((z) => z.rects) });
			for (const z of L.zones) if (z.use === 'plane') for (const zr of z.rects) { const c = clipR(R0, zr); if (c) runs.push({ R: c, space: z.space, skip: [] }); }
			let nh = 0;
			for (const run of runs) {
				const clr = run.space > 0 ? run.space : 0.5 * (L.land || 0.05);
				const holes: Rect[] = [...run.skip];
				for (const p of this.pads.get(L) ?? []) {
					if (p.tied) continue;
					const hr = p.r + Math.max(clr, this.ill ? ILL_PX * this.px : 0);
					if (!this.vis(2 * hr)) continue;
					holes.push({ x0: p.x - hr, x1: p.x + hr, y0: p.y - hr, y1: p.y + hr });
					nh++;
				}
				for (const r of sheet(run.R, holes)) this.cuBox(L, r, L.item);
			}
			if (!runs.length) continue;
			this.bump(L);
			L.item.lod = nh ? undefined : 'plane drawn without antipads (none in view or below 1.5 px)';
		}
	}

	traces() {
		for (const L of this.rm.levels) {
			const R0 = this.region(L.box);
			if (!R0) continue;
			// the level's own L/S outside its zones (zone footprints are keepouts), then each signal / mixed zone
			const zr = L.zones.flatMap((z) => z.rects);
			const runs: { p: { line: number; space: number; fill: number; dir: 'x' | 'y' }; R: Rect; keep: Rect[]; salt: number }[] = [];
			if (L.use === 'signal' || L.use === 'mixed') runs.push({ p: L, R: R0, keep: zr, salt: 0 });
			L.zones.forEach((z, zi) => {
				if (z.use !== 'signal' && z.use !== 'mixed') return;
				for (const q of z.rects) { const c = clipR(R0, q); if (c) runs.push({ p: z, R: c, keep: [], salt: zi + 1 }); }
			});
			for (const run of runs) {
				if (this.traceRun(L, run.p, run.R, run.keep, run.salt)) return;
			}
		}
	}

	/** Lines of one L/S set on a level inside R (extra keepouts: other zones). True when the box budget is spent. */
	traceRun(L: RLevel, Lp: { line: number; space: number; fill: number; dir: 'x' | 'y' }, R: Rect, extra: Rect[], salt: number): boolean {
		const o = this.o;
		{
			if (!(Lp.line > 0)) return false;
			if (!this.vis(Lp.line)) { L.item.lod = `L/S below ${MIN_PX} px: level drawn as a slab tinted by its Cu fill`; return false; }
			const P = Lp.line + Lp.space;
			const w = this.dw(Lp.line);
			const k = this.kOf(P, w);
			L.item.lod = k > 1 ? `illustrative: 1 of ${k} lines drawn (each drawn line stands for ${k}), widths >= ${ILL_PX} px` : undefined;
			const idx = L.idx + 101 * salt;
			const runX = Lp.dir === 'x'; // runs along x; channels spaced along y
			const perpAxis: 'x' | 'y' = runX ? 'y' : 'x';
			const c0 = o.section && o.axis === perpAxis ? o.cut : (runX ? L.box.y0 : L.box.x0) + P / 2;
			const p0 = runX ? R.y0 : R.x0, p1 = runX ? R.y1 : R.x1;
			const s0 = runX ? L.box.x0 : L.box.y0;
			const r0 = runX ? R.x0 : R.y0, r1 = runX ? R.x1 : R.y1;
			const Lc = Math.min(1.5, Math.max(0.05, 25 * P));
			const occ = Math.min(1, (Lp.fill * P) / Lp.line);
			// lines crossing the section plane are never broken at the cut (every channel shows its cross-section)
			const atCut = o.section && o.axis === (runX ? 'x' : 'y');
			const cutRun = o.cut;
			// Keepouts sorted by their perpendicular start for a strip query per channel.
			const ks = [...(this.keep.get(L) ?? []), ...extra].map((r) => (runX ? { a0: r.y0, a1: r.y1, b0: r.x0, b1: r.x1 } : { a0: r.x0, a1: r.x1, b0: r.y0, b1: r.y1 }));
			ks.sort((a, b) => a.a0 - b.a0);
			const maxW = ks.reduce((mx, q) => Math.max(mx, q.a1 - q.a0), 0);
			let m0 = Math.ceil((p0 - c0) / P - 1e-7);
			const m1 = Math.floor((p1 - c0) / P + 1e-7);
			m0 += mod(-m0, k);
			for (let m = m0; m <= m1; m += k) {
				const c = c0 + m * P;
				const lo = c - w / 2, hi = c + w / 2;
				// keepouts overlapping the channel strip
				let a = 0, b = ks.length;
				while (a < b) { const mid = (a + b) >> 1; if (ks[mid].a0 < lo - maxW) a = mid + 1; else b = mid; }
				const iv: number[][] = [];
				for (let q = a; q < ks.length && ks[q].a0 < hi; q++) if (ks[q].a1 > lo) iv.push([ks[q].b0, ks[q].b1]);
				iv.sort((x, y) => x[0] - y[0]);
				const sm = s0 - Lc * rnd(this.rm.seed, idx * 31 + 5, m, 0); // per-channel cell phase: a cut never sits on a common cell edge
				const cc0 = Math.floor((r0 - sm) / Lc), cc1 = Math.floor((r1 - sm) / Lc);
				const ccCut = atCut ? Math.floor((cutRun - sm) / Lc) : NaN;
				for (let cc = cc0; cc <= cc1; cc++) {
					const isCut = cc === ccCut;
					if (!isCut && rnd(this.rm.seed, idx * 7919 + 1, m, cc) >= occ) continue;
					let t0 = sm + cc * Lc + Lc * (0.04 + 0.3 * rnd(this.rm.seed, idx, m, cc * 2 + 1));
					let t1 = sm + (cc + 1) * Lc - Lc * (0.04 + 0.3 * rnd(this.rm.seed, idx, m, cc * 2 + 2));
					if (isCut) { if (o.axis === 'y') t0 = Math.min(t0, cutRun); else t1 = Math.max(t1, cutRun); }
					t0 = Math.max(t0, r0); t1 = Math.min(t1, r1);
					if (t1 - t0 < w) continue;
					let x = t0;
					const emit = (u0: number, u1: number) => {
						if (u1 - u0 < 0.5 * w) return;
						const rr = runX ? { x0: u0, x1: u1, y0: lo, y1: hi } : { x0: lo, x1: hi, y0: u0, y1: u1 };
						this.cuBox(L, rr, L.item);
					};
					for (const [k0, k1] of iv) {
						if (k1 <= x) continue;
						if (k0 >= t1) break;
						emit(x, Math.min(k0, t1));
						x = Math.max(x, k1);
					}
					if (x < t1) emit(x, t1);
				}
				if (this.boxes.length > BOX_BUDGET * (o.scale ?? 1) * 1.3) return true;
			}
			this.bump(L);
		}
		return false;
	}

	/** Managed layer pieces: inside the window the matrix (or SR with openings), outside a tinted slab. */
	pieces(win: Rect | null) {
		for (const L of this.rm.levels) {
			const R = win && clipR(win, L.box);
			const inC = (this.used.get(L) ?? 0) > 0 ? L.matrixColor : L.slabColor;
			const cu = this.cuRects.get(L) ?? null;
			for (const pc of this.rm.pieces.get(L.item.id) ?? []) this.split(pc.box, R, inC, L.slabColor, L.matrixCls, L.host, L.item, cu);
		}
		for (const s of this.rm.srItems) {
			const host = this.m.items.get(s.host) ?? s;
			const R = win && clipR(win, host.box);
			const c = this.o.colorOf(s);
			for (const pc of this.rm.pieces.get(s.id) ?? []) this.split(pc.box, R, c, c, s.cls, host, s, this.holes.get(s.id) ?? null);
		}
	}

	split(b: Box, R: Rect | null, inC: THREE.Color, outC: THREE.Color, cls: string, host: Item, item: Item, holes: Rect[] | null) {
		const inside = R && clipR(b, R);
		if (!inside) { this.boxes.push({ ...b, color: outC, cu: false, cls, host, item }); return; }
		for (const r of subtract(b, { ...inside, z0: b.z0, z1: b.z1 })) this.boxes.push({ ...r, color: outC, cu: false, cls, host, item });
		if (!holes || !holes.length) { this.box(inside, b.z0, b.z1, inC, false, cls, host, item); return; }
		// Exact matrix (around the Cu / openings) only in a thin slab at the cut; behind it one box (its faces that
		// coincide with Cu are hidden by the neighbouring layers). Keeps the box count low.
		const o = this.o;
		const t = Math.max(1e-6, 2 * this.px);
		let front: Rect | null = null, back: Rect | null = null;
		if (o.section && o.axis === 'y') {
			front = clipR(inside, { ...inside, y0: o.cut, y1: o.cut + t });
			back = clipR(inside, { ...inside, y0: o.cut + t, y1: inside.y1 });
		} else if (o.section) {
			front = clipR(inside, { ...inside, x0: o.cut - t, x1: o.cut });
			back = clipR(inside, { ...inside, x0: inside.x0, x1: o.cut - t });
		}
		if (!front) { for (const r of sheet(inside, holes)) this.box(r, b.z0, b.z1, inC, false, cls, host, item); return; }
		for (const r of sheet(front, holes.filter((h) => clipR(h, front!)))) this.box(r, b.z0, b.z1, inC, false, cls, host, item);
		if (back) this.box(back, b.z0, b.z1, inC, false, cls, host, item);
	}

	/** Cylinders and boxes per mm of band depth (budget). */
	density(zoom: Rect): { c: number; b: number } {
		const o = this.o;
		const bAx = o.section && o.axis === 'x' ? 'y' : 'x';
		const wB = (b: Box | Rect) => Math.max(0, bAx === 'x' ? Math.min(zoom.x1, b.x1) - Math.max(zoom.x0, b.x0) : Math.min(zoom.y1, b.y1) - Math.max(zoom.y0, b.y0));
		let c = 0, bx = 0;
		const per = (w: number, p: number, k: number) => (w / (k * p)) * (1 / (k * p));
		for (const E of this.rm.eps) {
			if (!this.vis(E.pad)) continue;
			const k = this.kOf(E.arr.pitch, this.dw(E.pad));
			c += per(wB(E.arr.item.box), E.arr.pitch, k) * (1 + E.srs.length);
		}
		for (const V of this.rm.vias) {
			if (!V.grid || (!this.vis(V.d0) && !this.vis(V.land))) continue;
			const k = this.kOf(V.pitch, this.dw(Math.max(V.land, V.d0)));
			c += per(wB(V.host.box), V.pitch, k) * (3 + V.cluster.length);
		}
		const byArr = new Map<ArrModel, number>();
		for (const N of this.rm.nets) if (N.n.kind !== 'lateral') for (const a of N.from) byArr.set(a, (byArr.get(a) ?? 0) + N.share * N.est);
		for (const [a, e] of byArr) {
			const k = this.kOf(a.pitch, this.dw(this.epPad(a)));
			const d = per(wB(a.item.box), a.pitch, k);
			c += d * e;
			bx += d * e * 0.3;
		}
		for (const P of this.rm.pairs) {
			const k = this.kOf(P.A.pitch, this.dw(this.epPad(P.A)));
			let w = 0;
			P.levels.forEach((L, i) => { if (this.vis(L.line)) w += P.nw[i] / this.kOf(L.line + L.space, this.dw(L.line)); });
			c += (1 / (k * P.A.pitch)) * w * 12;
			bx += (1 / (k * P.A.pitch)) * w * 3;
		}
		for (const L of this.rm.levels) {
			if ((L.use !== 'signal' && L.use !== 'mixed') || !(L.line > 0) || !this.vis(L.line)) continue;
			const P = L.line + L.space;
			const k = this.kOf(P, this.dw(L.line));
			const Lc = Math.min(1.5, Math.max(0.05, 25 * P));
			bx += (wB(L.box) / (Lc * k * P)) * 1.5;
		}
		return { c, b: bx };
	}
}

/** Synthesize the routing primitives of a family for a window (or tinted slabs only when zoom is null). */
export function synthRouting(m: Model, rm: RoutingModel, o: SynthOpts): SynthOut {
	const empty: Rect = { x0: 0, x1: 0, y0: 0, y1: 0 };
	if (!o.zoom || !(o.wpp > 0)) {
		const s = new Synth(m, rm, o, empty);
		for (const L of rm.levels) L.item.lod = 'routing window not active: level drawn as a tinted slab';
		s.pieces(null);
		return { boxes: s.boxes, cyls: [], win: null, depth: 0 };
	}
	const mg = Math.min(2, Math.max(0, ...[...rm.epArr].map((a) => a.pitch)));
	const z = { x0: o.zoom.x0 - mg, x1: o.zoom.x1 + mg, y0: o.zoom.y0 - mg, y1: o.zoom.y1 + mg }; // chains entering the view from just outside
	const probe = new Synth(m, rm, o, z);
	const dn = probe.density(z);
	let D = rm.band;
	const sc = o.scale ?? 1;
	if (dn.c > 0) D = Math.min(D, (CYL_BUDGET * sc) / dn.c);
	if (dn.b > 0) D = Math.min(D, (BOX_BUDGET * sc) / dn.b);
	D = Math.max(0, D);
	let win: Rect;
	if (o.section) win = o.axis === 'y' ? { x0: z.x0, x1: z.x1, y0: o.cut, y1: o.cut + D } : { x0: o.cut - D, x1: o.cut, y0: z.y0, y1: z.y1 };
	else {
		const ty = (z.y0 + z.y1) / 2;
		win = { x0: z.x0, x1: z.x1, y0: Math.max(z.y0, ty - D / 2), y1: Math.min(z.y1, ty + D / 2) };
	}
	// zero-depth band: keep the rows on the cut (a thin window so clipping stays well defined)
	if (o.section && D < 1e-6) {
		if (o.axis === 'y') win.y1 = o.cut + 1e-6;
		else win.x0 = o.cut - 1e-6;
	}
	// Hard triangle cap (M8): if the estimate was optimistic (dense planes / matrix around Cu), halve the band and
	// redo; at depth 0 only the rows on the cut remain.
	for (let iter = 0; ; iter++) {
		const s = new Synth(m, rm, o, win);
		for (const L of rm.levels) L.item.lod = undefined;
		s.pairZones();
		s.endpoints();
		s.grids();
		s.lateral();
		s.chains();
		s.gridColumns();
		s.planes();
		s.traces();
		s.pieces(win);
		const tris = s.boxes.length * 14 + s.cyls.length * 40;
		if (tris <= TRI_BUDGET * sc || iter >= 4 || !o.section || D < 1e-6) return { boxes: s.boxes, cyls: s.cyls, win, depth: D };
		D = D * Math.min(0.5, (TRI_BUDGET * sc) / tris);
		if (D < 0.02 * rm.band) D = 0;
		win = o.axis === 'y' ? { ...win, y1: o.cut + Math.max(D, 1e-6) } : { ...win, x0: o.cut - Math.max(D, 1e-6) };
	}
}
