// Shared helpers for the assembly / substrate tool actors (lane L38, DevLog-016; contract section 11).
// Tool frame: 1 unit = 1 um; origin = focus point on the tool-facing surface at step start; +Y toward the tool;
// +X = piece x; -Z = piece y. Kinematics are pure functions of (t, args, ctx); nothing integrates over frames.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CreateMaterial, DimStatus, MatState, PDim, ProcMaterial, ScaleId, ToolActor, ToolArgs, ToolCtx, ToolFrame } from '../../types';

/** Research file of this lane's numbers (row ids A1..A202). */
export const RES = 'config/process3d/RESEARCH_TOOLS_ASSEMBLY.md';

// ---------------------------------------------------------------- provenance builders

/** reported: a research row (RESEARCH_TOOLS_ASSEMBLY.md) that quotes a primary source. */
export function rep(value: number, unit: string, row: string, note?: string): PDim {
	return { value, unit, status: 'reported', ref: row, source: `${RES} ${row}`, ...(note ? { note } : {}) };
}
/** derived: formula over research rows. */
export function der(value: number, unit: string, formula: string, refs: string[], values?: string, note?: string): PDim {
	return { value, unit, status: 'derived', formula, refs, ...(values ? { values } : {}), ...(note ? { note } : {}) };
}
/** template: rationale required; public source when one exists; analog rows in refs. */
export function tpl(value: number, unit: string, note: string, source?: string, refs?: string[]): PDim {
	return { value, unit, status: 'template', note, ...(source ? { source } : {}), ...(refs ? { refs } : {}) };
}

export function specCounts(spec: Record<string, PDim>): Record<DimStatus, number> {
	const c: Record<DimStatus, number> = { reported: 0, derived: 0, template: 0 };
	for (const k in spec) c[spec[k].status]++;
	return c;
}

// ---------------------------------------------------------------- args

/** args override spec by key (contract 11). PDim, plain number or numeric string accepted. */
export function num(args: ToolArgs, spec: Record<string, PDim>, key: string, fallback = NaN): number {
	const a = (args as Record<string, unknown>)[key];
	if (a && typeof a === 'object' && 'value' in (a as object)) {
		const v = (a as PDim).value;
		if (Number.isFinite(v)) return v;
	}
	if (typeof a === 'number' && Number.isFinite(a)) return a;
	if (typeof a === 'string' && a.trim() !== '' && Number.isFinite(Number(a))) return Number(a);
	const s = spec[key];
	return s && Number.isFinite(s.value) ? s.value : fallback;
}
/** Optional numeric arg (no spec fallback). */
export function opt(args: ToolArgs, key: string): number | null {
	const a = (args as Record<string, unknown>)[key];
	if (a && typeof a === 'object' && 'value' in (a as object)) return Number.isFinite((a as PDim).value) ? (a as PDim).value : null;
	if (typeof a === 'number' && Number.isFinite(a)) return a;
	return null;
}
export function str(args: ToolArgs, key: string, def: string): string {
	const a = (args as Record<string, unknown>)[key];
	return typeof a === 'string' ? a : def;
}
export function live(ctx: ToolCtx, key: string): number | null {
	const v = ctx.live?.[key];
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------- easing (pure)

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
export const smooth = (x: number) => {
	const t = clamp01(x);
	return t * t * (3 - 2 * t);
};
/** Contract default process window (types.ts DEFAULT_PHASES), used when the engine phase is unknown. */
export const PH: [number, number] = [0.12, 0.9];
/** Approach progress 0..1 (1 once the process window starts), retract progress 0..1 (0 until it ends). */
export function phaseProgress(t: number, ctx: ToolCtx): { app: number; ret: number } {
	if (ctx.phase === 'approach') return { app: clamp01(t / PH[0]), ret: 0 };
	if (ctx.phase === 'retract') return { app: 1, ret: clamp01((t - PH[1]) / (1 - PH[1])) };
	return { app: 1, ret: 0 };
}

// ---------------------------------------------------------------- frame helpers

/** Carrier center in the tool frame (work scale). */
export function carrierCenter(f: ToolFrame): THREE.Vector3 {
	return new THREE.Vector3(-f.focus_um.x, 0, f.focus_um.y);
}
export function carrierSize(f: ToolFrame): { w: number; d: number; disk: boolean } {
	return f.carrier.shape === 'disk' ? { w: f.carrier.d_um, d: f.carrier.d_um, disk: true } : { w: f.carrier.w_um, d: f.carrier.dd_um, disk: false };
}
/** Block window in the tool frame: lateral x range, z range kept behind the section plane, span. */
export function blockWin(f: ToolFrame): { x0: number; x1: number; zBack: number; zSec: number; span: number; h: number } {
	const w = f.window;
	if (!w) return { x0: -100, x1: 100, zBack: -100, zSec: 0, span: 200, h: 200 };
	const fy = f.focus_um.y;
	const sec = w.section_y_um ?? (w.y0_um + w.y1_um) / 2;
	const x0 = w.x0_um - f.focus_um.x;
	const x1 = w.x1_um - f.focus_um.x;
	const span = Math.max(x1 - x0, w.y1_um - w.y0_um);
	const h = w.z1_um !== undefined && w.z0_um !== undefined ? w.z1_um - w.z0_um : span;
	return { x0, x1, zBack: -(w.y1_um - fy), zSec: -(sec - fy), span, h };
}

// ---------------------------------------------------------------- geometry

export function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
	const g = new THREE.BoxGeometry(w, h, d);
	g.translate(x, y, z);
	return g;
}
/** Box from min / max corners. */
export function boxMM(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
	return box(Math.max(x1 - x0, 1e-6), Math.max(y1 - y0, 1e-6), Math.max(z1 - z0, 1e-6), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
export function cyl(r: number, h: number, x = 0, y = 0, z = 0, seg = 32, rTop = r, open = false): THREE.BufferGeometry {
	const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1, open);
	g.translate(x, y, z);
	return g;
}
/** Cylinder along x. */
export function cylX(r: number, len: number, x = 0, y = 0, z = 0, seg = 32): THREE.BufferGeometry {
	const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
	g.rotateZ(Math.PI / 2);
	g.translate(x, y, z);
	return g;
}
/** Cylinder along z. */
export function cylZ(r: number, len: number, x = 0, y = 0, z = 0, seg = 32): THREE.BufferGeometry {
	const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
	g.rotateX(Math.PI / 2);
	g.translate(x, y, z);
	return g;
}
/** Annular ring (washer) about y. */
export function ring(rIn: number, rOut: number, h: number, y = 0, seg = 64, x = 0, z = 0): THREE.BufferGeometry {
	const s = new THREE.Shape();
	s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
	const hole = new THREE.Path();
	hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
	s.holes.push(hole);
	const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: seg });
	g.rotateX(-Math.PI / 2);
	g.translate(x, y, z);
	return g;
}
/** Box with a rectangular or round pocket opening downward (cavity), built from slabs (no CSG). */
export function plateWithRoundPocket(w: number, d: number, h: number, pocketR: number, pocketDepth: number, seg = 96): THREE.BufferGeometry {
	// solid top part above the pocket + a ring-shaped skirt around the pocket (square outside, round inside)
	const top = box(w, h - pocketDepth, d, 0, pocketDepth + (h - pocketDepth) / 2, 0);
	const s = new THREE.Shape();
	s.moveTo(-w / 2, -d / 2);
	s.lineTo(w / 2, -d / 2);
	s.lineTo(w / 2, d / 2);
	s.lineTo(-w / 2, d / 2);
	s.lineTo(-w / 2, -d / 2);
	const hole = new THREE.Path();
	hole.absarc(0, 0, pocketR, 0, Math.PI * 2, true);
	s.holes.push(hole);
	const skirt = new THREE.ExtrudeGeometry(s, { depth: pocketDepth, bevelEnabled: false, curveSegments: seg });
	skirt.rotateX(-Math.PI / 2);
	return merge([top, skirt]);
}

/** Merge geometries (non-indexed, position + normal only). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
	const flat = gs.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
		if (!n.attributes.normal) n.computeVertexNormals();
		return n;
	});
	const m = mergeGeometries(flat, false);
	for (const g of gs) g.dispose();
	for (const g of flat) g.dispose();
	if (!m) throw new Error('merge failed');
	return m;
}

export function triCount(o: THREE.Object3D): number {
	let n = 0;
	o.traverse((c) => {
		const m = c as THREE.Mesh;
		if (!m.isMesh || !m.visible) return;
		const g = m.geometry;
		const per = (g.index ? g.index.count : g.attributes.position.count) / 3;
		const dr = g.drawRange.count === Infinity ? per : Math.min(per, g.drawRange.count / 3);
		const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
		n += dr * inst;
	});
	return Math.round(n);
}
export function drawCalls(o: THREE.Object3D): number {
	let n = 0;
	o.traverse((c) => {
		const m = c as THREE.Mesh;
		if (m.isMesh && m.visible && (!(m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.InstancedMesh).count > 0)) n++;
	});
	return n;
}

// ---------------------------------------------------------------- HUD extras (not in the contract; see lane note)

export interface Readout {
	key: string;
	label: string;
	value: number | null;
	unit: string;
	status: DimStatus;
	note?: string;
}
export interface Trace {
	key: string;
	label: string;
	q: 'T' | 'F' | 'P' | 'v';
	unit: string;
	pts: [number, number][]; // real seconds from the op start
	status: DimStatus;
	note?: string;
}
/** ToolActor plus the HUD extras proposed to L35 (readouts at t, default traces). */
export interface AssemblyToolActor extends ToolActor {
	readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[];
	traces?(args: ToolArgs): Trace[];
	/** real duration of the default process this tool models (lab / engine fallback), s; null = not determinable */
	defaultDuration?(args: ToolArgs): number | null;
	/**
	 * Contact region (tool frame, um) the camera should frame at this t: workpiece area under the working element plus
	 * the working element itself. null = frame the workpiece only (audit V1 C1).
	 */
	focusBox(t: number, args: ToolArgs, ctx: ToolCtx): THREE.Box3 | null;
}
/**
 * Fade group (audit V1 C1): group.userData.occluders = Mesh[] of tool parts that may be faded when they hide the
 * workpiece (head bodies, syringes, beams, lids); they own their material instances, so fading them never fades the
 * working element. group.userData.setOccluderOpacity(a) sets their opacity (1 = opaque).
 */
/** Held-piece pose the actor publishes on group.userData.hold every update (tool frame, um). */
export interface Hold {
	on: boolean;
	x: number;
	y: number; // held piece top (back) face
	z: number;
}

// ---------------------------------------------------------------- base actor

type Pending = { mesh: THREE.Mesh; key: string; state?: Partial<MatState> };

const PLACEHOLDER = new THREE.MeshBasicMaterial({ visible: false });

/**
 * Base: rigs (moving sub-groups), per-(rig, material) merged meshes, lazy ProcMaterial binding through ctx.mat
 * (place() has no ctx), light-like guide materials (beams, X-ray cones) as plain additive MeshBasicMaterial.
 */
export abstract class BaseActor implements AssemblyToolActor {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly scales: ScaleId[];
	abstract readonly spec: Record<string, PDim>;
	readonly group = new THREE.Group();
	protected frame: ToolFrame | null = null;
	protected rigs = new Map<string, THREE.Group>();
	private acc = new Map<string, { rig: string; key: string; geos: THREE.BufferGeometry[]; tip: string; occ: boolean }>();
	private occMeshes: THREE.Mesh[] = [];
	private pending: Pending[] = [];
	private mats = new Map<string, ProcMaterial>();
	private matFn: CreateMaterial | null = null;
	private own: THREE.Material[] = [];

	place(frame: ToolFrame): void {
		this.frame = frame;
		this.clear();
		this.build(frame);
		this.flush();
		this.setupWindowClip(frame);
		this.rebind();
		this.group.userData.tool = this.id;
	}
	protected abstract build(frame: ToolFrame): void;
	/** Geometry-relevant args (mode, piece size); a change rebuilds through configure() + place(). */
	protected geomKey(_args: ToolArgs): string {
		return '';
	}
	configure(_args: ToolArgs): void {}
	private gk = '';
	update(t: number, args: ToolArgs, ctx: ToolCtx): void {
		if (!this.frame) return;
		const gk = this.geomKey(args);
		if (gk !== this.gk) {
			this.gk = gk;
			this.configure(args);
			this.place(this.frame);
		}
		if (ctx.mat !== this.matFn) {
			this.matFn = ctx.mat;
			for (const m of this.mats.values()) m.dispose();
			this.mats.clear();
			this.rebind();
		}
		this.animate(t, args, ctx, this.frame);
		this.updateWindowClip();
	}
	/**
	 * Block / cell scale: every element is clipped to the block window and behind the section plane (same rule as
	 * L37 FabBase): four planes in the tool frame, re-expressed in world space from the group's world matrix on every
	 * update (ProcMaterial.setClipping for library materials, clippingPlanes for the guide materials).
	 */
	private winPlanes: THREE.Plane[] | null = null;
	private winLocal: THREE.Plane[] = [];
	private setupWindowClip(f: ToolFrame): void {
		this.winPlanes = null;
		if (f.scale === 'work' || !f.window) return;
		const w = blockWin(f);
		this.winLocal = [
			new THREE.Plane(new THREE.Vector3(1, 0, 0), -w.x0),
			new THREE.Plane(new THREE.Vector3(-1, 0, 0), w.x1),
			new THREE.Plane(new THREE.Vector3(0, 0, 1), -w.zBack),
			new THREE.Plane(new THREE.Vector3(0, 0, -1), w.zSec)
		];
		this.winPlanes = this.winLocal.map((p) => p.clone());
		for (const m of this.own) {
			m.clippingPlanes = this.winPlanes;
			m.needsUpdate = true;
		}
		this.updateWindowClip();
	}
	private updateWindowClip(): void {
		if (!this.winPlanes) return;
		this.group.updateWorldMatrix(true, false);
		const mw = this.group.matrixWorld;
		this.winLocal.forEach((p, i) => this.winPlanes![i].copy(p).applyMatrix4(mw));
	}
	protected abstract animate(t: number, args: ToolArgs, ctx: ToolCtx, f: ToolFrame): void;
	abstract readouts(t: number, args: ToolArgs, ctx: ToolCtx): Readout[];

	/** Rig = rigid moving sub-group (created on demand, parent default = the actor group). */
	protected rig(name: string, parent?: string): THREE.Group {
		let g = this.rigs.get(name);
		if (!g) {
			g = new THREE.Group();
			g.name = name;
			(parent ? this.rig(parent) : this.group).add(g);
			this.rigs.set(name, g);
		}
		return g;
	}
	/** Accumulate a static-shape geometry into the (rig, material) batch. */
	protected add(rig: string, key: string, geo: THREE.BufferGeometry, tip: string, occ = false): void {
		this.rig(rig);
		const k = `${rig}|${key}|${occ ? 'o' : ''}`;
		let a = this.acc.get(k);
		if (!a) {
			a = { rig, key, geos: [], tip, occ };
			this.acc.set(k, a);
		} else if (!a.tip.split('; ').includes(tip)) a.tip += `; ${tip}`;
		a.geos.push(geo);
	}
	/** A separately transformed mesh (own geometry), material from the library. */
	protected mesh(rig: string, key: string, geo: THREE.BufferGeometry, tip: string, state?: Partial<MatState>): THREE.Mesh {
		const m = new THREE.Mesh(geo, PLACEHOLDER);
		m.userData.tip = tip;
		this.rig(rig).add(m);
		this.pending.push({ mesh: m, key, state });
		return m;
	}
	protected inst(rig: string, key: string, geo: THREE.BufferGeometry, count: number, tip: string, state?: Partial<MatState>): THREE.InstancedMesh {
		const m = new THREE.InstancedMesh(geo, PLACEHOLDER, Math.max(1, count));
		m.count = 0;
		m.frustumCulled = false;
		m.userData.tip = tip;
		this.rig(rig).add(m);
		this.pending.push({ mesh: m, key, state });
		return m;
	}
	/** Light-like guide (laser beam, X-ray cone, plume): additive, no depth write; not a substance. */
	protected glow(rig: string, geo: THREE.BufferGeometry, color: string, opacity: number, tip: string): THREE.Mesh {
		const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
		this.own.push(mat);
		if (this.winPlanes) mat.clippingPlanes = this.winPlanes;
		const m = new THREE.Mesh(geo, mat);
		m.userData.tip = tip;
		m.renderOrder = 10;
		this.rig(rig).add(m);
		return m;
	}
	/** Occluder part (fade group): same as add(), with its own material instance. */
	protected addOcc(rig: string, key: string, geo: THREE.BufferGeometry, tip: string): void {
		this.add(rig, key, geo, tip, true);
	}
	private flush(): void {
		for (const a of this.acc.values()) {
			const g = a.geos.length === 1 ? a.geos[0] : merge(a.geos);
			const m = this.mesh(a.rig, a.occ ? `occ:${a.key}` : a.key, g, a.tip);
			if (a.occ) this.occMeshes.push(m);
		}
		this.acc.clear();
		this.group.userData.occluders = this.occMeshes;
		this.group.userData.setOccluderOpacity = (o: number) => this.setOccluderOpacity(o);
	}
	/** Separately transformed occluder mesh (own material instance), e.g. a deforming diaphragm. */
	protected meshOcc(rig: string, key: string, geo: THREE.BufferGeometry, tip: string): THREE.Mesh {
		const m = this.mesh(rig, `occ:${key}`, geo, tip);
		this.occMeshes.push(m);
		this.group.userData.occluders = this.occMeshes;
		return m;
	}
	private occAlpha = 1;
	private partAlpha = new Map<string, number>();
	setOccluderOpacity(o: number): void {
		this.occAlpha = Math.min(1, Math.max(0, o));
		for (const [k, m] of this.mats) if (k.startsWith('occ:')) this.fadeMat(m.material, this.partAlpha.get(k) ?? 1);
	}
	/** Actor-driven translucency of one occluder material (combined with the engine fade by min). */
	protected setPartOpacity(key: string, a: number): void {
		const k = `occ:${key}`;
		this.partAlpha.set(k, a);
		const m = this.mats.get(k);
		if (m) this.fadeMat(m.material, a);
	}
	private fadeMat(m: THREE.Material, part = 1): void {
		const a = Math.min(this.occAlpha, part);
		if (!m.userData.occ0) m.userData.occ0 = { t: m.transparent, o: m.opacity, d: m.depthWrite };
		const o0 = m.userData.occ0 as { t: boolean; o: number; d: boolean };
		const tr = a < 1 || o0.t;
		if (m.transparent !== tr) m.needsUpdate = true;
		m.transparent = tr;
		m.opacity = a < 1 ? Math.min(o0.o, a) : o0.o;
		m.depthWrite = a < 1 ? false : o0.d;
	}
	focusBox(_t: number, _args: ToolArgs, _ctx: ToolCtx): THREE.Box3 | null {
		return null;
	}
	/** Library material per key (shared by every mesh of that key). */
	protected mat(key: string): ProcMaterial | null {
		if (!this.matFn) return null;
		let m = this.mats.get(key);
		if (!m) {
			m = this.matFn(key.startsWith('occ:') ? key.slice(4) : key);
			if (this.frame) m.setScale(this.frame.umPerUnit);
			this.mats.set(key, m);
			if (this.winPlanes) m.setClipping(this.winPlanes);
			this.dim(m);
			if (key.startsWith('occ:')) this.fadeMat(m.material, this.partAlpha.get(key) ?? 1);
		}
		return m;
	}
	protected setMat(key: string, s: Partial<MatState>): void {
		this.mat(key)?.set(s);
		this.mats.get(`occ:${key}`)?.set(s);
	}
	/** Block / cell scale: tool parts dimmed (less environment reflection) so they do not swamp the section (V1 M5). */
	private dim(m: ProcMaterial): void {
		const pm = m.material as THREE.MeshPhysicalMaterial;
		const on = !!this.frame && this.frame.scale !== 'work';
		if ('envMapIntensity' in pm) pm.envMapIntensity = on ? 0.3 : 1;
		// view dimming of this actor's own instances only (not a substance property): 0.55 of the base colour
		if (pm.color && on !== !!pm.userData.dimmed) {
			pm.color.multiplyScalar(on ? 0.55 : 1 / 0.55);
			pm.userData.dimmed = on;
		}
	}
	private rebind(): void {
		if (!this.matFn) return;
		for (const p of this.pending) {
			const m = this.mat(p.key);
			if (!m) continue;
			p.mesh.material = m.material;
			if (p.state) m.set(p.state);
		}
		for (const m of this.mats.values()) {
			if (this.frame) m.setScale(this.frame.umPerUnit);
			m.setClipping(this.winPlanes);
			this.dim(m);
		}
	}
	protected setHold(h: Hold): void {
		this.group.userData.hold = h;
	}
	private clear(): void {
		this.group.traverse((o) => {
			const m = o as THREE.Mesh;
			if (m.isMesh) m.geometry.dispose();
		});
		for (const g of this.rigs.values()) g.removeFromParent();
		this.group.clear();
		this.rigs.clear();
		this.pending = [];
		this.occMeshes = [];
		for (const m of this.own) m.dispose();
		this.own = [];
	}
	pick(obj: THREE.Object3D): string | null {
		let o: THREE.Object3D | null = obj;
		while (o && o !== this.group) {
			if (typeof o.userData.tip === 'string') return `${this.name}: ${o.userData.tip}`;
			o = o.parent;
		}
		return null;
	}
	dispose(): void {
		this.clear();
		for (const m of this.mats.values()) m.dispose();
		this.mats.clear();
	}
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
/** Set instance i of an InstancedMesh from position + scale (+ optional quaternion). */
export function setInst(im: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, q?: THREE.Quaternion): void {
	_p.set(x, y, z);
	_s.set(sx, sy, sz);
	_m.compose(_p, q ?? _q.identity(), _s);
	im.setMatrixAt(i, _m);
}
/** Deterministic hash noise in [0, 1) (no Math.random: kinematics stay pure). */
export function hash(i: number, salt = 0): number {
	const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
	return x - Math.floor(x);
}

// ---------------------------------------------------------------- site grids (balls, apertures, vias)

export interface Grid {
	pts: [number, number][]; // tool frame (x, z) of every site
	pitch: number;
	cx: number;
	cz: number;
	w: number;
	d: number;
}
/**
 * Site grid in the tool frame. args (piece frame, um): site_x_um / site_y_um (region center, default unit center),
 * site_w_um / site_d_um (region size, default unit minus 2 x inset), site_pitch_um (default `pitch`).
 * `clip`: keep only sites inside [x0, x1] x [z0, z1] (block windows).
 */
export function siteGrid(args: ToolArgs, f: ToolFrame, pitch: number, inset: number, clip?: { x0: number; x1: number; z0: number; z1: number }, max = 40000): Grid {
	const p = opt(args, 'site_pitch_um') ?? pitch;
	const w = opt(args, 'site_w_um') ?? Math.max(f.unit.w_um - 2 * inset, p);
	const d = opt(args, 'site_d_um') ?? Math.max(f.unit.d_um - 2 * inset, p);
	const cx = (opt(args, 'site_x_um') ?? 0) - f.focus_um.x;
	const cz = -((opt(args, 'site_y_um') ?? 0) - f.focus_um.y);
	const nx = Math.max(1, Math.floor(w / p + 1e-9) + 1), nz = Math.max(1, Math.floor(d / p + 1e-9) + 1);
	const pts: [number, number][] = [];
	let i0 = 0, i1 = nx - 1, j0 = 0, j1 = nz - 1;
	if (clip) {
		i0 = Math.max(0, Math.floor((clip.x0 - cx) / p + (nx - 1) / 2));
		i1 = Math.min(nx - 1, Math.ceil((clip.x1 - cx) / p + (nx - 1) / 2));
		j0 = Math.max(0, Math.floor((clip.z0 - cz) / p + (nz - 1) / 2));
		j1 = Math.min(nz - 1, Math.ceil((clip.z1 - cz) / p + (nz - 1) / 2));
	}
	for (let i = i0; i <= i1; i++)
		for (let j = j0; j <= j1; j++) {
			if (pts.length >= max) break;
			pts.push([cx + (i - (nx - 1) / 2) * p, cz + (j - (nz - 1) / 2) * p]);
		}
	return { pts, pitch: p, cx, cz, w, d };
}

/** Plate in xz (thickness along +y from y0) with round holes at pts; rectangle [x0, x1] x [z0, z1]. */
export function perforated(x0: number, x1: number, z0: number, z1: number, y0: number, h: number, pts: [number, number][], r: number, seg = 24): THREE.BufferGeometry {
	const s = new THREE.Shape();
	// shape coords (x, -z): rotateX(-pi/2) maps shape y to world -z, extrusion depth to +y
	s.moveTo(x0, -z1);
	s.lineTo(x0, -z0);
	s.lineTo(x1, -z0);
	s.lineTo(x1, -z1);
	s.lineTo(x0, -z1);
	for (const [x, z] of pts) {
		if (x - r <= x0 || x + r >= x1 || z - r <= z0 || z + r >= z1) continue;
		const hp = new THREE.Path();
		hp.absarc(x, -z, r, 0, Math.PI * 2, true);
		s.holes.push(hp);
	}
	const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: seg });
	g.rotateX(-Math.PI / 2);
	g.translate(0, y0, 0);
	return g;
}

// ---------------------------------------------------------------- cutaway helpers (work scale, keep z <= zc)

/** Solid half cylinder about y (the part with z <= z0 of a cylinder centred at (x, y, z0)), closed at the cut. */
export function halfCyl(r: number, h: number, x: number, y: number, z0: number, seg = 48, open = false): THREE.BufferGeometry {
	const g = new THREE.CylinderGeometry(r, r, h, seg, 1, open, Math.PI / 2, Math.PI);
	g.translate(x, y, z0);
	if (open) return g;
	const cap = new THREE.PlaneGeometry(2 * r, h);
	cap.translate(x, y, z0);
	return merge([g, cap]);
}
/** Plate (x in [-W/2, W/2], z in [-D/2, z0]) of height H with a round pocket of radius R and depth `depth` opening
 * downward (y from 0 to depth is the skirt), cut at z = z0 (z0 = 0: the section through the pocket centre). */
export function halfPocketPlate(W: number, D: number, H: number, R: number, depth: number, seg = 96): THREE.BufferGeometry {
	const top = boxMM(-W / 2, W / 2, depth, H, -D / 2, 0);
	const s = new THREE.Shape();
	s.moveTo(-W / 2, 0);
	s.lineTo(-R, 0);
	s.absarc(0, 0, R, Math.PI, 0, true);
	s.lineTo(W / 2, 0);
	s.lineTo(W / 2, D / 2);
	s.lineTo(-W / 2, D / 2);
	s.lineTo(-W / 2, 0);
	const skirt = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: seg });
	skirt.rotateX(-Math.PI / 2);
	return merge([top, skirt]);
}
