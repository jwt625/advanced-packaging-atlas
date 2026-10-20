// Family -> solid pieces in true units (x, y in mm relative to the package center; z in um), plus the z map.
import { worstStatus } from './data';
import { materialClass } from './materials';
import { attachRouting, type RoutingModel } from './routing';
import type { Dim, DimStatus, Family, IcArray, Layer, Net, Part, ViaClass } from './types';

export interface Box {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
	z0: number;
	z1: number;
}

export type ItemType = 'part' | 'layer' | 'array' | 'via' | 'net';

/** Provenance level of a solid: every box dimension reported/derived, some template, or all template. */
export type Prov = 'reported' | 'mixed' | 'template';

export interface Item {
	id: string;
	type: ItemType;
	name: string;
	kind: string;
	material: string;
	label: string; // display material
	tid: string; // template_id (callouts may target it)
	cls: string;
	role: string;
	status: DimStatus; // worst status of the box dimensions
	prov: Prov;
	host: string; // part id hosting a layer (the instance) or embedding a part ('' otherwise)
	group: number;
	dims: Record<string, Dim>;
	box: Box;
	src: Part | Layer | IcArray | ViaClass | Net;
	filler: boolean;
	xrayDefault: boolean;
	/** routing: family layout_note (routed levels, via entries, nets) */
	routeNote?: string;
	/** routing: current level-of-detail statement (decimation factor, hidden below 1.5 px), set by the synthesizer */
	lod?: string;
}

export interface Picked {
	item: Item;
	slot: number;
	x: number;
	y: number;
}

export interface Piece {
	item: Item;
	box: Box;
}

export interface ArrModel {
	item: Item;
	arr: IcArray;
	z0: number;
	z1: number;
	pitch: number;
	r: number;
	nx: number;
	ny: number;
	gx0: number;
	gy0: number;
	shape: 'cyl' | 'ball';
	fill: number;
}

export interface Model {
	family: Family;
	cx: number;
	cy: number;
	items: Map<string, Item>;
	pieces: Piece[];
	arrays: ArrModel[];
	bounds: Box;
	zbreaks: number[];
	/** z breaks of parts and interconnect arrays only (illustrative map: layers share their part's interval) */
	zcoarse: number[];
	groups: number[];
	routing: RoutingModel | null;
}

const FILLER_RANK: Record<string, number> = { underfill: 2, mold: 1, encapsulant: 1 };
const PART_KEYS = ['w_mm', 'd_mm', 'h_um'];
const ARR_KEYS = ['pitch_um', 'diameter_um', 'height_um'];
const VERTICAL_KINDS = ['tsv', 'tgv', 'via', 'tmv', 'pth', 'tiv'];
const BALL_KINDS = ['bga', 'c4'];

function provOf(dims: Record<string, Dim> | undefined, keys: string[]): Prov {
	let t = 0;
	for (const k of keys) if ((dims?.[k]?.status ?? 'template') === 'template') t++;
	return t === 0 ? 'reported' : t === keys.length ? 'template' : 'mixed';
}

function overlaps(a: Box, b: Box): boolean {
	const e = 1e-9;
	return a.x0 < b.x1 - e && b.x0 < a.x1 - e && a.y0 < b.y1 - e && b.y0 < a.y1 - e && a.z0 < b.z1 - e && b.z0 < a.z1 - e;
}

/** a minus b as up to 6 axis-aligned boxes. */
export function subtract(a: Box, b: Box): Box[] {
	if (!overlaps(a, b)) return [a];
	const out: Box[] = [];
	const r = { ...a };
	if (b.x0 > r.x0) { out.push({ ...r, x1: b.x0 }); r.x0 = b.x0; }
	if (b.x1 < r.x1) { out.push({ ...r, x0: b.x1 }); r.x1 = b.x1; }
	if (b.y0 > r.y0) { out.push({ ...r, y1: b.y0 }); r.y0 = b.y0; }
	if (b.y1 < r.y1) { out.push({ ...r, y0: b.y1 }); r.y1 = b.y1; }
	if (b.z0 > r.z0) { out.push({ ...r, z1: b.z0 }); r.z0 = b.z0; }
	if (b.z1 < r.z1) { out.push({ ...r, z0: b.z1 }); r.z1 = b.z1; }
	return out;
}

function subtractAll(boxes: Box[], cut: Box[]): Box[] {
	let cur = boxes;
	for (const c of cut) cur = cur.flatMap((b) => subtract(b, c));
	return cur;
}

const insideXY = (b: Box, x: number, y: number) => x >= b.x0 - 1e-6 && x <= b.x1 + 1e-6 && y >= b.y0 - 1e-6 && y <= b.y1 + 1e-6;

export function buildModel(f: Family): Model {
	const parts = f.parts;
	// Package center from the part footprints.
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (const p of parts) {
		x0 = Math.min(x0, p.x_mm - p.w_mm / 2); x1 = Math.max(x1, p.x_mm + p.w_mm / 2);
		y0 = Math.min(y0, p.y_mm - p.d_mm / 2); y1 = Math.max(y1, p.y_mm + p.d_mm / 2);
	}
	const cx = Number.isFinite(x0) ? (x0 + x1) / 2 : 0;
	const cy = Number.isFinite(y0) ? (y0 + y1) / 2 : 0;
	const items = new Map<string, Item>();
	const partBox = (p: Part): Box => ({
		x0: p.x_mm - p.w_mm / 2 - cx, x1: p.x_mm + p.w_mm / 2 - cx,
		y0: p.y_mm - p.d_mm / 2 - cy, y1: p.y_mm + p.d_mm / 2 - cy,
		z0: p.z_um, z1: p.z_um + p.h_um
	});
	for (const p of parts) {
		items.set(p.id, {
			id: p.id, type: 'part', name: p.name, kind: p.kind, material: p.material, role: '', label: p.material_label ?? p.material, tid: p.template_id ?? '',
			cls: materialClass(p.material, p.kind), status: worstStatus(p.dims, PART_KEYS), prov: provOf(p.dims, PART_KEYS), host: '',
			group: p.explode_group ?? 0, dims: p.dims ?? {}, box: partBox(p), src: p, filler: p.kind in FILLER_RANK, xrayDefault: !!p.xray_default
		});
	}
	const partItems = [...items.values()];
	/** A part by id, or by template id (repeated hosts): the instance whose footprint holds (x, y), else the first. */
	const findPart = (id: string, x?: number, y?: number): Item | undefined => {
		const it = items.get(id);
		if (it && it.type === 'part') return it;
		const same = partItems.filter((o) => o.tid === id);
		if (x != null && y != null) return same.find((o) => insideXY(o.box, x, y)) ?? same[0];
		return same[0];
	};
	// Embedded parts: resolve `in` (instance id or template id) to the host instance holding the part's center.
	for (const it of partItems) {
		const p = it.src as Part;
		if (!p.in) continue;
		const h = findPart(p.in, (it.box.x0 + it.box.x1) / 2, (it.box.y0 + it.box.y1) / 2);
		if (h && h.id !== it.id) it.host = h.id;
	}
	for (const l of f.layers ?? []) {
		const hosts = Array.isArray(l.instances) && l.instances.length ? l.instances : [l.part];
		for (const h of hosts) {
			const parent = findPart(h);
			if (!parent) continue;
			const id = h === l.part || hosts.length === 1 ? l.id : `${l.id}@${parent.id}`;
			if (items.has(id)) continue;
			items.set(id, {
				id, type: 'layer', name: l.name ?? `${parent.name} ${l.role ?? 'layer'} ${l.seq ?? ''}`.trim(), kind: 'layer',
				material: l.material, role: l.role ?? '', label: l.material_label ?? l.material, tid: l.template_id ?? l.id, cls: materialClass(l.material, '', l.role ?? ''),
				status: worstStatus(l.dims, ['h_um']), prov: provOf(l.dims, ['h_um']), host: parent.id, group: parent.group, dims: l.dims ?? {},
				box: { ...parent.box, z0: l.z_um, z1: l.z_um + l.h_um }, src: { ...l, part: parent.id }, filler: false, xrayDefault: parent.xrayDefault
			});
		}
	}

	// Solid pieces: parents minus their layers; fillers minus every higher-priority part.
	const pieces: Piece[] = [];
	const layersOf = new Map<string, Item[]>();
	for (const it of items.values()) if (it.type === 'layer') layersOf.set(it.host, [...(layersOf.get(it.host) ?? []), it]);
	const solids = partItems.filter((i) => !i.filler);
	// Embedded solids (part.in = host) are cut out of the host and the host's layers.
	const embedded = new Map<string, Box[]>();
	for (const it of partItems) if (it.host) embedded.set(it.host, [...(embedded.get(it.host) ?? []), it.box]);
	for (const it of items.values()) {
		const host = it.type === 'layer' ? it.host : it.id;
		const emb = embedded.get(host) ?? [];
		if (it.type === 'layer') {
			for (const b of subtractAll([it.box], emb)) if (b.z1 - b.z0 > 1e-6) pieces.push({ item: it, box: b });
			continue;
		}
		let boxes = subtractAll([it.box], emb);
		const ls = layersOf.get(it.id);
		if (ls) boxes = subtractAll(boxes, ls.map((l) => l.box));
		if (it.filler) {
			const rank = FILLER_RANK[it.kind];
			const higher = partItems.filter((o) => o.filler && FILLER_RANK[o.kind] > rank);
			// an embedded filler (cavity fill `in:` a host) is not cut by its own host: it fills the host's cavity
			boxes = subtractAll(boxes, [...solids.filter((o) => o.id !== it.host), ...higher].map((o) => o.box));
		}
		for (const b of boxes) if (b.z1 - b.z0 > 1e-6 && b.x1 - b.x0 > 1e-9 && b.y1 - b.y0 > 1e-9) pieces.push({ item: it, box: b });
	}

	// Interconnect arrays.
	const arrays: ArrModel[] = [];
	for (const a of f.arrays ?? []) {
		const reg = a.region;
		const ps = (a.between ?? []).map((id) => findPart(id, reg.x_mm - cx, reg.y_mm - cy)).filter((i): i is Item => !!i);
		let z0: number, z1: number;
		const h = a.height_um ?? a.h_um ?? 0;
		if (typeof a.z_um === 'number') { z0 = a.z_um; z1 = a.z_um + (a.h_um ?? h); }
		else if (ps.length >= 2 && ps[0] !== ps[1]) {
			const [lo, hi] = ps[0].box.z0 <= ps[1].box.z0 ? [ps[0], ps[1]] : [ps[1], ps[0]];
			z0 = lo.box.z1; z1 = hi.box.z0;
			if (z1 - z0 < 0.01) z1 = z0 + h;
		} else if (ps.length >= 1) {
			const p = ps[0];
			if (VERTICAL_KINDS.includes(a.kind)) {
				z0 = p.box.z0;
				const lz = (layersOf.get(p.id) ?? []).map((l) => l.box.z0).filter((z) => z > p.box.z0 + 1e-6);
				z1 = lz.length ? Math.min(...lz) : p.box.z1;
			} else if (['bga', 'c4', 'lga'].includes(a.kind)) { z1 = p.box.z0; z0 = z1 - h; }
			else { z0 = p.box.z1; z1 = z0 + h; }
		} else { z0 = 0; z1 = h; }
		const pitch = a.pitch_um / 1000;
		if (!(pitch > 0) || !(reg.w_mm > 0) || !(reg.d_mm > 0)) continue;
		const nx = Math.max(1, Math.floor(reg.w_mm / pitch + 1e-9));
		const ny = Math.max(1, Math.floor(reg.d_mm / pitch + 1e-9));
		const rx = reg.x_mm - cx, ry = reg.y_mm - cy;
		const g = ps[0]?.group ?? 0;
		const box: Box = { x0: rx - reg.w_mm / 2, x1: rx + reg.w_mm / 2, y0: ry - reg.d_mm / 2, y1: ry + reg.d_mm / 2, z0, z1 };
		const item: Item = {
			id: a.id, type: 'array', name: a.name ?? a.id, kind: a.kind, material: a.material ?? '', role: '', label: a.material ?? a.kind, tid: a.template_id ?? '',
			cls: ['c4', 'bga', 'microbump'].includes(a.kind) ? 'solder' : 'copper', status: worstStatus(a.dims, ARR_KEYS), prov: provOf(a.dims, ARR_KEYS),
			host: ps[0]?.id ?? '', group: g, dims: a.dims ?? {}, box, src: a, filler: false, xrayDefault: false
		};
		items.set(a.id, item);
		const d = Math.min(a.diameter_um / 1000, pitch);
		arrays.push({
			item, arr: a, z0, z1, pitch, r: d / 2, nx, ny,
			gx0: rx - ((nx - 1) / 2) * pitch, gy0: ry - ((ny - 1) / 2) * pitch,
			shape: BALL_KINDS.includes(a.kind) ? 'ball' : 'cyl',
			fill: Math.min(1, (Math.PI * d * d) / 4 / (pitch * pitch))
		});
	}

	const bounds: Box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
	const zs = new Set<number>();
	const grow = (b: Box) => {
		bounds.x0 = Math.min(bounds.x0, b.x0); bounds.x1 = Math.max(bounds.x1, b.x1);
		bounds.y0 = Math.min(bounds.y0, b.y0); bounds.y1 = Math.max(bounds.y1, b.y1);
		bounds.z0 = Math.min(bounds.z0, b.z0); bounds.z1 = Math.max(bounds.z1, b.z1);
		zs.add(b.z0); zs.add(b.z1);
	};
	for (const p of pieces) grow(p.box);
	for (const a of arrays) grow(a.item.box);
	for (const it of items.values()) if (it.type === 'part') grow(it.box);
	if (!Number.isFinite(bounds.x0)) Object.assign(bounds, { x0: -1, x1: 1, y0: -1, y1: 1, z0: 0, z1: 1 });
	const zbreaks = [...zs].sort((a, b) => a - b).filter((z, i, s) => i === 0 || z - s[i - 1] > 1e-6);
	const zc = new Set<number>([zbreaks[0], zbreaks[zbreaks.length - 1]]);
	for (const it of items.values()) if (it.type === 'part' || it.type === 'array') { zc.add(it.box.z0); zc.add(it.box.z1); }
	// snap coarse breaks onto the fine list (same values, tolerance 1e-6)
	const zcoarse = zbreaks.filter((z) => [...zc].some((c) => Math.abs(c - z) <= 1e-6));
	const groups = [...new Set([...items.values()].map((i) => i.group))].sort((a, b) => a - b);
	const model: Model = { family: f, cx, cy, items, pieces, arrays, bounds, zbreaks, zcoarse, groups, routing: null };
	model.routing = attachRouting(model);
	return model;
}

const DIE_KINDS = ['die', 'hbm', 'chiplet', 'bridge'];

/** The largest die-like part of a family (by footprint). */
export function largestDie(f: Family): Part | null {
	const dies = f.parts.filter((p) => DIE_KINDS.includes(p.kind));
	if (!dies.length) return null;
	// Among the largest (within 5% of the maximum footprint), the one closest to the package center.
	const amax = Math.max(...dies.map((p) => p.w_mm * p.d_mm));
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (const p of f.parts) {
		x0 = Math.min(x0, p.x_mm - p.w_mm / 2); x1 = Math.max(x1, p.x_mm + p.w_mm / 2);
		y0 = Math.min(y0, p.y_mm - p.d_mm / 2); y1 = Math.max(y1, p.y_mm + p.d_mm / 2);
	}
	const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
	const big = dies.filter((p) => p.w_mm * p.d_mm >= 0.95 * amax);
	return big.sort((a, b) => Math.hypot(a.x_mm - cx, a.y_mm - cy) - Math.hypot(b.x_mm - cx, b.y_mm - cy))[0];
}

/** Default section position (mm from the package center along the axis): through the center of the largest die. */
export function defaultCut(f: Family | undefined, axis: 'x' | 'y' = 'y'): number {
	if (!f) return 0;
	const d = largestDie(f);
	if (!d) return 0;
	let a0 = Infinity, a1 = -Infinity;
	for (const p of f.parts) {
		const c = axis === 'y' ? p.y_mm : p.x_mm, e = axis === 'y' ? p.d_mm : p.w_mm;
		a0 = Math.min(a0, c - e / 2); a1 = Math.max(a1, c + e / 2);
	}
	return (axis === 'y' ? d.y_mm : d.x_mm) - (a0 + a1) / 2;
}

/** Default x-ray set: material classes whose parts are all xray_default, plus '#id' entries for single parts. */
export function defaultXray(fams: Family[]): string[] {
	const out = new Set<string>();
	for (const f of fams) {
		const byCls = new Map<string, Part[]>();
		for (const p of f.parts) {
			const c = materialClass(p.material, p.kind);
			byCls.set(c, [...(byCls.get(c) ?? []), p]);
		}
		for (const [c, ps] of byCls) {
			const on = ps.filter((p) => p.xray_default);
			if (!on.length) continue;
			if (on.length === ps.length) out.add(c);
			else for (const p of on) out.add(`#${p.id}`);
		}
	}
	return [...out];
}

/** z (um, true) -> scene height (mm). In-scale: linear. Illustrative: piecewise linear, each interval t -> t^0.4. */
export class ZMap {
	readonly breaks: number[];
	readonly mapped: number[];
	readonly illustrative: boolean;
	readonly height: number;
	constructor(m: Model, illustrative: boolean) {
		this.illustrative = illustrative;
		const b = m.zbreaks.length >= 2 ? m.zbreaks : [m.bounds.z0, m.bounds.z1];
		this.breaks = b;
		const z0 = b[0];
		if (!illustrative) {
			this.mapped = b.map((z) => (z - z0) / 1000);
		} else {
			// Coarse intervals (between part / array boundaries) get t^0.4, so a part's drawn thickness grows with its true
			// thickness; the layers inside an interval share its height by thickness with a floor (each at least
			// FLOOR / n of the interval), so thin levels stay visible without outgrowing their part.
			const lat = Math.max(m.bounds.x1 - m.bounds.x0, m.bounds.y1 - m.bounds.y0);
			const H = Math.max(0.16 * lat, ((b[b.length - 1] - z0) / 1000) * 1.5);
			const c = m.zcoarse.length >= 2 ? m.zcoarse : [b[0], b[b.length - 1]];
			const wc = c.slice(1).map((z, i) => Math.pow(Math.max(z - c[i], 0), 0.4));
			const tot = wc.reduce((s, v) => s + v, 0) || 1;
			const FLOOR = 0.5;
			const out = [0];
			let bi = 0;
			for (let k = 0; k < c.length - 1; k++) {
				const Hk = (wc[k] / tot) * H, T = c[k + 1] - c[k];
				const sub: number[] = [];
				while (bi < b.length - 1 && b[bi + 1] <= c[k + 1] + 1e-6) { sub.push(b[bi + 1] - b[bi]); bi++; }
				const n = sub.length || 1;
				const ws = sub.map((t) => Math.max(t, (FLOOR * T) / n));
				const ts = ws.reduce((s, v) => s + v, 0) || 1;
				for (const v of ws) out.push(out[out.length - 1] + (v / ts) * Hk);
			}
			while (out.length < b.length) out.push(out[out.length - 1]);
			this.mapped = out;
		}
		this.height = this.mapped[this.mapped.length - 1];
	}
	map(z: number): number {
		const b = this.breaks, m = this.mapped, n = b.length;
		if (!this.illustrative || n < 2) return (z - b[0]) / 1000;
		if (z <= b[0]) return m[0] + (z - b[0]) / 1000;
		if (z >= b[n - 1]) return m[n - 1] + (z - b[n - 1]) / 1000;
		let lo = 0, hi = n - 1;
		while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (b[mid] <= z) lo = mid; else hi = mid; }
		const t = b[hi] - b[lo];
		return t > 0 ? m[lo] + ((z - b[lo]) / t) * (m[hi] - m[lo]) : m[lo];
	}
}
