// Scene content for one family: merged box meshes (opaque / x-ray), section cut caps, merged edges (solid for
// reported, dashed for partly or fully template), instanced interconnect arrays with LOD, and pad-region slabs.
// Rebuilt on state change (cheap: boxes only).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CLASS_COLOR, layerColor, templateColor } from './materials';
import { buildModel, subtract, ZMap, type ArrModel, type Box, type Item, type Model } from './model';
import { latticeShift, synthRouting, type RBox, type RCyl, type Rect } from './routing';
import type { Family } from './types';

export interface ViewState {
	illustrative: boolean;
	section: boolean;
	axis: 'x' | 'y'; // section plane normal: y keeps y >= cut (viewed from the front), x keeps x <= cut (viewed from the right)
	cut: number; // section plane position, mm (single view: from the package center; compare: offset from each family's default)
	explode: number; // 0..1
	xray: string[]; // material classes rendered translucent, plus '#<part id>' for single parts
	selected: string | null;
	routing: boolean; // synthesized routing (DevLog-011) for families that carry it
	/** x-ray tokens whose cut caps stay translucent (user choices); parts translucent only by the data default get an
	 * opaque cut face. Absent: every x-ray token. */
	xrayCap?: string[];
	/** Illustrative z compression while an inset is framed (L18): the inset's mapped z range shrinks so it frames the same
	 * lateral region as in-scale; thin layers keep their relative enlargement. 1 or absent: none. */
	zsquash?: number;
}

/** View inputs of the routing window: orbit target (family mm), half extent of the visible region, mm per pixel. */
export interface RoutingCtx {
	tx: number;
	ty: number;
	hw: number;
	wpp: number;
}

export interface Lod {
	mode: 'slab' | 'zoom';
	x0: number;
	x1: number;
	y0: number;
	y1: number;
	wpp?: number; // mm per pixel (segment LOD of balls / cylinders)
}

/** One instance of a unit shape (arrays and routing cylinders share the instanced meshes). */
interface Inst { shape: 'cyl' | 'ball'; hi: boolean; half: boolean; xr: boolean; m: THREE.Matrix4; c: THREE.Color; hat: number; tap: number; item: Item }
const HI_PX = 40; // a ball / cylinder wider than this on screen uses the high-segment unit geometry
const TRIS_HI: Record<'cyl' | 'ball', number> = { cyl: 128, ball: 1240 };

const ZOOM_CAP = 20000; // instances per array in the zoom window (M8: <= 2M triangles with routing)
const TOTAL_CAP = 25000; // instances per family; arrays beyond the budget fall back to slabs
const ARR_TRIS = 650000; // triangles per family for instanced arrays (M8: <= 2M with parts and routing)
const TRIS_PER: Record<'cyl' | 'ball', number> = { cyl: 40, ball: 100 }; // unit cylinder (10 seg) / sphere (10 x 6)
const XRAY_ALPHA = 0.14;
const XRAY_CAP_ALPHA = 0.28; // section face of a translucent part: translucent too, a little denser than its body so the cut stays legible
const CU_XRAY_ALPHA = 0.45; // routing Cu inside an x-ray host stays readable as a ghost
/** x-ray set token that makes every object translucent (toolbar X-ray button) */
export const XRAY_ALL = '*';
const CAP_LIFT = 1.18; // cut caps are unlit and slightly lifted so the section face reads apart from lit faces

/** Hatch strength for template geometry (0 = off). Set per viewport by the viewer: faint, close zoom only. */
export const HATCH = { value: 0 };

// Shared unit geometries for the instanced arrays (created once, never disposed).
let unitGeo: Record<'cyl' | 'cylHalf' | 'ball' | 'ballHalf' | 'cylHi' | 'ballHi', THREE.BufferGeometry> | null = null;
function unit() {
	if (unitGeo) return unitGeo;
	const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1);
	const halfSide = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, false, Math.PI / 2, Math.PI);
	const cylHalf = mergeGeometries([halfSide, new THREE.PlaneGeometry(1, 1)]) as THREE.BufferGeometry;
	const ball = new THREE.SphereGeometry(0.5, 10, 6);
	const halfBall = new THREE.SphereGeometry(0.5, 6, 6, Math.PI, Math.PI);
	const ballHalf = mergeGeometries([halfBall, new THREE.CircleGeometry(0.5, 10)]) as THREE.BufferGeometry;
	unitGeo = { cyl, cylHalf, ball, ballHalf, cylHi: new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1), ballHi: new THREE.SphereGeometry(0.5, 32, 20) };
	return unitGeo;
}

// Edges (M8: one draw call): solid dark edges for reported boxes and dashed light edges for template boxes share one
// LineDashedMaterial; per-vertex colour + alpha, and aDash = 1 enables the dash pattern.
const EDGE_SOLID = [0x0a / 255, 0x0a / 255, 0x0a / 255, 0.6];
const EDGE_DASH = [0x9a / 255, 0x9a / 255, 0x92 / 255, 0.38];
function edgeMaterial(): THREE.LineDashedMaterial {
	const m = new THREE.LineDashedMaterial({ vertexColors: true, transparent: true, dashSize: 1, gapSize: 0.6 });
	m.onBeforeCompile = (sh) => {
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aDash;\nvarying float vDash;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDash = aDash;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying float vDash;')
			.replace('if ( mod( vLineDistance, totalSize ) > dashSize ) {', 'if ( vDash > 0.5 && mod( vLineDistance, totalSize ) > dashSize ) {');
	};
	m.customProgramCacheKey = () => 'edges-merged';
	return m;
}

/** Routing instanced material: hatch plus the per-instance bottom-radius factor aTaper. */
function withTaper<M extends THREE.Material>(m: M, key: string): M {
	withHatch(m, key);
	const base = m.onBeforeCompile;
	m.onBeforeCompile = (sh, r) => {
		base.call(m, sh, r);
		// aHalf = 1: keep the part behind the section (local z <= 0) and flatten the front onto z = 0 (the cut face)
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aTaper;\nattribute float aHalf;')
			.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nif (aHalf > 0.5 && position.z > 1e-4) objectNormal = vec3(0.0, 0.0, 1.0);')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz *= mix(1.0, aTaper, 0.5 - position.y);\nif (aHalf > 0.5) transformed.z = min(transformed.z, 0.0);');
	};
	m.customProgramCacheKey = () => `taper-${key}`;
	return m;
}

/** Adds the hatch (template flag per vertex/instance, strength from HATCH) to a built-in material. */
function withHatch<M extends THREE.Material>(m: M, key: string): M {
	m.onBeforeCompile = (sh) => {
		sh.uniforms.uHatch = HATCH;
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aHatch;\nvarying float vHatch;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHatch = aHatch;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying float vHatch;\nuniform float uHatch;')
			.replace(
				'#include <color_fragment>',
				'#include <color_fragment>\nif (vHatch > 0.5 && uHatch > 0.0) { float s = mod(gl_FragCoord.x + gl_FragCoord.y, 10.0); if (s < 1.0) diffuseColor.rgb *= 1.0 - uHatch; }'
			);
	};
	m.customProgramCacheKey = () => `hatch-${key}`;
	return m;
}

// Depth order on coplanar faces: edges and instanced bumps (no offset) > section caps (offset 1) > bodies (offset 2).
// Translucent slabs carry no offset so the pad-region band shows over the cap it lies in.
type Mats = {
	opaque: THREE.MeshLambertMaterial;
	xray: THREE.MeshLambertMaterial;
	cap: THREE.MeshBasicMaterial;
	capX: THREE.MeshBasicMaterial;
	inst: THREE.MeshLambertMaterial;
	slab: THREE.MeshLambertMaterial;
	edge: THREE.LineBasicMaterial;
	dashed: THREE.LineDashedMaterial;
	sel: THREE.LineBasicMaterial;
	// routing: Cu features in front of the matrix on coplanar faces (offset 0 / caps -1); cores in front of their via
	rCu: THREE.MeshLambertMaterial;
	rCuX: THREE.MeshLambertMaterial;
	rInst: THREE.MeshLambertMaterial;
	rInstX: THREE.MeshLambertMaterial;
};
let mats: Mats | null = null;
function materials(): Mats {
	if (mats) return mats;
	const off = (n: number) => ({ polygonOffset: true, polygonOffsetFactor: n, polygonOffsetUnits: n });
	mats = {
		opaque: withHatch(new THREE.MeshLambertMaterial({ vertexColors: true, ...off(2) }), 'opaque'),
		xray: withHatch(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...off(2) }), 'xray'),
		cap: withHatch(new THREE.MeshBasicMaterial({ vertexColors: true, ...off(1) }), 'cap'),
		capX: withHatch(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...off(1) }), 'capX'),
		inst: withHatch(new THREE.MeshLambertMaterial({}), 'inst'),
		slab: withHatch(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false }), 'slab'),
		edge: new THREE.LineBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.6 }),
		dashed: edgeMaterial(),
		sel: new THREE.LineBasicMaterial({ color: 0x3987e5, depthTest: false, transparent: true }),
		rCu: withHatch(new THREE.MeshLambertMaterial({ vertexColors: true }), 'rCu'),
		rCuX: withHatch(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 'rCuX'),
		rInst: withTaper(new THREE.MeshLambertMaterial({}), 'rInst'),
		rInstX: withTaper(new THREE.MeshLambertMaterial({ transparent: true, opacity: CU_XRAY_ALPHA, depthWrite: false }), 'rInstX')
	};
	return mats;
}

/** Dash length for template edges in local units (keeps dashes about 5 px on screen). */
export function setDash(localPerPx: number) {
	const m = materials().dashed;
	m.dashSize = 5 * localPerPx;
	m.gapSize = 4 * localPerPx;
}

// [normal, u, v] with u x v = normal
const FACES: [number[], number[], number[]][] = [
	[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
	[[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
	[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]
];

class BoxBuf {
	pos: number[] = [];
	nrm: number[] = [];
	col: number[] = [];
	hat: number[] = [];
	idx: number[] = [];
	items: Item[] = [];
	n = 0;
	/** Triangles per pick item: 12 for boxes, 2 for cap quads. */
	constructor(readonly per = 12) {}
	private face(c: number[], h: number[], f: [number[], number[], number[]], col: THREE.Color, a: number, hatch: boolean) {
		const [nn, u, v] = f;
		const base = this.n;
		for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
			this.pos.push(
				c[0] + (nn[0] + su * u[0] + sv * v[0]) * h[0],
				c[1] + (nn[1] + su * u[1] + sv * v[1]) * h[1],
				c[2] + (nn[2] + su * u[2] + sv * v[2]) * h[2]
			);
			this.nrm.push(nn[0], nn[1], nn[2]);
			this.col.push(col.r, col.g, col.b, a);
			this.hat.push(hatch ? 1 : 0);
			this.n++;
		}
		this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
	}
	add(X0: number, X1: number, Y0: number, Y1: number, Z0: number, Z1: number, c: THREE.Color, a: number, hatch: boolean, item: Item) {
		const ctr = [(X0 + X1) / 2, (Y0 + Y1) / 2, (Z0 + Z1) / 2], h = [(X1 - X0) / 2, (Y1 - Y0) / 2, (Z1 - Z0) / 2];
		for (const f of FACES) this.face(ctr, h, f, c, a, hatch);
		this.items.push(item);
	}
	/** One face of a box (cap quad): 0 = +x, 4 = +z. */
	addFace(fi: number, X0: number, X1: number, Y0: number, Y1: number, Z0: number, Z1: number, c: THREE.Color, hatch: boolean, item: Item, a = 1) {
		const ctr = [(X0 + X1) / 2, (Y0 + Y1) / 2, (Z0 + Z1) / 2], h = [(X1 - X0) / 2, (Y1 - Y0) / 2, (Z1 - Z0) / 2];
		this.face(ctr, h, FACES[fi], c, a, hatch);
		this.items.push(item);
	}
	/** a followed by b (same per). */
	static concat(a: BoxBuf, b: BoxBuf | null): BoxBuf {
		if (!b || !b.n) return a;
		if (!a.n) return b;
		const o = new BoxBuf(a.per);
		o.pos = a.pos.concat(b.pos);
		o.nrm = a.nrm.concat(b.nrm);
		o.col = a.col.concat(b.col);
		o.hat = a.hat.concat(b.hat);
		o.idx = a.idx.concat(b.idx.map((i) => i + a.n));
		o.items = a.items.concat(b.items);
		o.n = a.n + b.n;
		return o;
	}
	geometry(): THREE.BufferGeometry {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
		g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 4));
		g.setAttribute('aHatch', new THREE.Float32BufferAttribute(this.hat, 1));
		g.setIndex(this.idx);
		g.computeBoundingSphere();
		g.computeBoundingBox();
		return g;
	}
}

function edgesOf(out: number[], X0: number, X1: number, Y0: number, Y1: number, Z0: number, Z1: number) {
	const xs = [X0, X1], ys = [Y0, Y1], zs = [Z0, Z1];
	for (const y of ys) for (const z of zs) out.push(X0, y, z, X1, y, z);
	for (const x of xs) for (const z of zs) out.push(x, Y0, z, x, Y1, z);
	for (const x of xs) for (const y of ys) out.push(x, y, Z0, x, y, Z1);
}

/** Colour of one material of a composite joint (Cu column / solder cap), template look like the array. */
function compositeColor(cls: 'copper' | 'solder', it: Item): THREE.Color {
	const c = new THREE.Color(CLASS_COLOR[cls]);
	return it.prov === 'template' ? templateColor(c) : c;
}

/** Fill colour: material colour; desaturated only when every box dimension is template. */
export function itemColor(it: Item): THREE.Color {
	const c = it.type === 'layer' ? layerColor(it.material, it.role) : new THREE.Color(CLASS_COLOR[it.cls] ?? CLASS_COLOR.other);
	return it.prov === 'template' ? templateColor(c) : c;
}

export function isXray(it: Item, set: Set<string>): boolean {
	if (set.has(XRAY_ALL) || set.has(it.cls) || set.has(`#${it.id}`)) return true;
	return it.type === 'layer' && set.has(`#${it.host}`);
}

export class FamilyScene {
	readonly model: Model;
	zmap: ZMap;
	readonly group = new THREE.Group();
	/** Uniform scale of the whole family in the world (compare view fits each family to the same size). */
	scale = 1;
	/** Section base position, mm (compare view: this family's default cut; the shared slider is an offset). */
	cutBase = 0;
	private meshes: THREE.Object3D[] = [];
	private arrObjs: THREE.Object3D[] = [];
	private selObj: THREE.LineSegments | null = null;
	pickables: THREE.Object3D[] = [];
	private pickItems = new Map<THREE.Object3D, { items: Item[]; per: number }>();
	state: ViewState | null = null;
	private lodKey = '';
	instanceCount = 0;
	private rKey = '';
	// Draw-call merge (M8): box bodies / caps of the parts and of the routing share 4 meshes; array and routing
	// cylinders share the instanced meshes (per unit shape, opaque / x-ray).
	private boxObjs: THREE.Object3D[] = [];
	private instObjs: THREE.Object3D[] = [];
	private baseBufs: Record<'op' | 'cap' | 'xr' | 'capX', BoxBuf> | null = null;
	private rBufs: Record<'op' | 'cap' | 'xr' | 'capX', BoxBuf> | null = null;
	private aInst: Inst[] = [];
	/** Opaque part bodies and caps only (not rendered): label occlusion rays stay cheap with dense routing. */
	occluders: THREE.Mesh[] = [];
	private rInst: Inst[] = [];
	/** routing primitives of the last synthesis (instanced cylinders, boxes) and the band depth (mm) */
	routingStats = { cyls: 0, boxes: 0, depth: 0 };
	/** share of the triangle budget (compare view: 1 / panes), M8 */
	budgetScale = 1;

	constructor(f: Family) {
		this.model = buildModel(f);
		this.zmap = new ZMap(this.model, true);
	}

	get lateral(): number {
		const b = this.model.bounds;
		return Math.max(b.x1 - b.x0, b.y1 - b.y0);
	}

	setScale(s: number) {
		this.scale = s > 0 && Number.isFinite(s) ? s : 1;
		this.group.scale.setScalar(this.scale);
		this.group.updateMatrixWorld(true);
	}

	/** Section plane position in this family's coordinates (mm from its package center). */
	cutOf(st: ViewState): number {
		return this.cutBase + st.cut / this.scale;
	}

	gap(): number {
		return Math.max(0.5 * this.zmap.height, 0.04 * this.lateral);
	}

	offset(group: number, st: ViewState): number {
		const r = this.model.groups.indexOf(group);
		return Math.max(0, r) * this.gap() * st.explode;
	}

	/** Local scene-space box of a true box (trimmed by the section; null when fully cut away). */
	sceneBox(b: Box, group: number, st: ViewState): THREE.Box3 | null {
		let y0 = b.y0, x1 = b.x1;
		if (st.section) {
			const cut = this.cutOf(st);
			if (st.axis === 'y') y0 = Math.max(y0, cut);
			else x1 = Math.min(x1, cut);
		}
		if (y0 >= b.y1 - 1e-9 || x1 <= b.x0 + 1e-9) return null;
		const o = this.offset(group, st);
		return new THREE.Box3(new THREE.Vector3(b.x0, this.zmap.map(b.z0) + o, -b.y1), new THREE.Vector3(x1, this.zmap.map(b.z1) + o, -y0));
	}

	/** Local -> world (the group is at the origin with a uniform scale). */
	world<T extends THREE.Box3 | THREE.Vector3>(v: T): T {
		if (v instanceof THREE.Box3) { v.min.multiplyScalar(this.scale); v.max.multiplyScalar(this.scale); }
		else (v as THREE.Vector3).multiplyScalar(this.scale);
		return v;
	}

	itemBox(id: string, st: ViewState): THREE.Box3 | null {
		const it = this.model.items.get(id);
		return it ? this.sceneBox(it.box, it.group, st) : null;
	}

	/** Bounding box of the whole content in local scene space for the given state (section ignored). */
	bounds(st: ViewState): THREE.Box3 {
		const out = new THREE.Box3();
		const full = { ...st, section: false };
		for (const it of this.model.items.values()) {
			const b = this.sceneBox(it.box, it.group, full);
			if (b) out.union(b);
		}
		return out;
	}

	private clear(list: THREE.Object3D[]) {
		for (const o of list) {
			this.group.remove(o);
			if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
			if (o instanceof THREE.InstancedMesh) o.dispose();
			this.pickItems.delete(o);
		}
		list.length = 0;
	}

	build(st: ViewState) {
		const m = materials();
		if (!this.state || this.state.illustrative !== st.illustrative || this.zmap.squash !== (st.zsquash ?? 1)) this.zmap = new ZMap(this.model, st.illustrative, st.zsquash ?? 1);
		this.state = { ...st, xray: [...st.xray] };
		this.lodKey = '';
		this.clear(this.meshes);
		const op = new BoxBuf(), xr = new BoxBuf(), cap = new BoxBuf(2), capX = new BoxBuf(2);
		const xray = new Set(st.xray);
		const xcap = new Set(st.xrayCap ?? st.xray);
		const cut = this.cutOf(st);
		const managed = st.routing && this.model.routing ? this.model.routing.managed : null;
		this.rKey = '';
		for (const p of this.model.pieces) {
			if (managed?.has(p.item.id)) continue; // drawn by the routing pass
			const sb = this.sceneBox(p.box, p.item.group, st);
			if (!sb) continue;
			const isX = isXray(p.item, xray);
			const col = itemColor(p.item);
			const tpl = p.item.prov === 'template';
			(isX ? xr : op).add(sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z, col, isX ? XRAY_ALPHA : 1, tpl, p.item);
			// Cut cap: the face on the section plane in the material colour; translucent when the part is x-ray.
			if (st.section) {
				const cc = col.clone().multiplyScalar(CAP_LIFT);
				const capT = isX && isXray(p.item, xcap);
				const cb = capT ? capX : cap, ca = capT ? XRAY_CAP_ALPHA : 1;
				if (st.axis === 'y' && p.box.y0 < cut - 1e-9) cb.addFace(4, sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z, cc, tpl, p.item, ca);
				if (st.axis === 'x' && p.box.x1 > cut + 1e-9) cb.addFace(0, sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z, cc, tpl, p.item, ca);
			}
		}
		this.baseBufs = { op, cap, xr, capX };
		for (const o of this.occluders) { this.group.remove(o); o.geometry.dispose(); this.pickItems.delete(o); }
		this.occluders = [];
		for (const [buf, mat] of [[op, m.opaque], [cap, m.cap]] as const) {
			if (!buf.n) continue;
			const mesh = new THREE.Mesh(buf.geometry(), mat);
			mesh.visible = false; // raycast only (follows the group transform)
			this.group.add(mesh);
			this.occluders.push(mesh);
			this.pickItems.set(mesh, { items: buf.items, per: buf.per });
		}
		this.assembleBoxes();
		const solid: number[] = [], dashed: number[] = [];
		for (const it of this.model.items.values()) {
			if (it.type === 'array' || it.type === 'via' || it.type === 'net') continue;
			const sb = this.sceneBox(it.box, it.group, st);
			if (!sb) continue;
			edgesOf(it.prov === 'reported' ? solid : dashed, sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z);
		}
		// solid first, then dashed, in one LineSegments
		const nS = solid.length / 3, nD = dashed.length / 3;
		const lcol = new Float32Array((nS + nD) * 4), ldash = new Float32Array(nS + nD);
		for (let i = 0; i < nS + nD; i++) { lcol.set(i < nS ? EDGE_SOLID : EDGE_DASH, i * 4); ldash[i] = i < nS ? 0 : 1; }
		const add = (o: THREE.Object3D, buf?: BoxBuf) => {
			this.group.add(o);
			this.meshes.push(o);
			if (buf) this.pickItems.set(o, { items: buf.items, per: buf.per });
		};
		if (nS + nD) {
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.Float32BufferAttribute(solid.concat(dashed), 3));
			g.setAttribute('color', new THREE.BufferAttribute(lcol, 4));
			g.setAttribute('aDash', new THREE.BufferAttribute(ldash, 1));
			const l = new THREE.LineSegments(g, m.dashed);
			l.computeLineDistances();
			l.renderOrder = 3;
			add(l);
		}
		this.setSelected(st.selected);
		this.refreshPickables();
	}

	/** (Re)create the 4 merged box meshes from the part pieces and the current routing boxes. */
	private assembleBoxes() {
		this.clear(this.boxObjs);
		const b = this.baseBufs;
		if (!b) return;
		const r = this.rBufs;
		const m = materials();
		const mk = (buf: BoxBuf, mat: THREE.Material, order: number) => {
			if (!buf.n) return;
			const mesh = new THREE.Mesh(buf.geometry(), mat);
			mesh.renderOrder = order;
			this.group.add(mesh);
			this.boxObjs.push(mesh);
			this.pickItems.set(mesh, { items: buf.items, per: buf.per });
		};
		mk(BoxBuf.concat(b.op, r?.op ?? null), m.opaque, 0);
		mk(BoxBuf.concat(b.cap, r?.cap ?? null), m.cap, 0);
		mk(BoxBuf.concat(b.xr, r?.xr ?? null), m.xray, 2);
		mk(BoxBuf.concat(b.capX, r?.capX ?? null), m.capX, 2);
		this.refreshPickables();
	}

	/** (Re)create the instanced meshes from the array and routing instances. */
	private assembleInst() {
		this.clear(this.instObjs);
		const m = materials();
		const U = unit();
		const bk = new Map<string, Inst[]>();
		for (const it of [...this.aInst, ...this.rInst]) {
			const k = `${it.shape}${it.hi ? 'Hi' : ''}|${it.xr}`;
			let l = bk.get(k);
			if (!l) bk.set(k, (l = []));
			l.push(it);
		}
		for (const [k, l] of bk) {
			const [shape, xr] = k.split('|') as [keyof ReturnType<typeof unit>, string];
			const geo = U[shape].clone();
			geo.setAttribute('aHatch', new THREE.InstancedBufferAttribute(new Float32Array(l.map((i) => i.hat)), 1));
			geo.setAttribute('aTaper', new THREE.InstancedBufferAttribute(new Float32Array(l.map((i) => i.tap)), 1));
			geo.setAttribute('aHalf', new THREE.InstancedBufferAttribute(new Float32Array(l.map((i) => (i.half ? 1 : 0))), 1));
			const im = new THREE.InstancedMesh(geo, xr === 'true' ? m.rInstX : m.rInst, l.length);
			l.forEach((i, n) => { im.setMatrixAt(n, i.m); im.setColorAt(n, i.c); });
			im.instanceMatrix.needsUpdate = true;
			if (im.instanceColor) im.instanceColor.needsUpdate = true;
			im.computeBoundingSphere();
			im.computeBoundingBox();
			im.renderOrder = xr === 'true' ? 2 : 0;
			this.group.add(im);
			this.instObjs.push(im);
			this.pickItems.set(im, { items: l.map((i) => i.item), per: 1 });
		}
		this.refreshPickables();
	}

	setSelected(id: string | null) {
		if (this.selObj) {
			this.group.remove(this.selObj);
			this.selObj.geometry.dispose();
			this.selObj = null;
		}
		if (this.state) this.state.selected = id;
		if (!id || !this.state) return;
		const b = this.itemBox(id, this.state);
		if (!b) return;
		const pts: number[] = [];
		edgesOf(pts, b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z);
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
		this.selObj = new THREE.LineSegments(g, materials().sel);
		this.selObj.renderOrder = 10;
		this.group.add(this.selObj);
	}

	private refreshPickables() {
		this.pickables = [...this.pickItems.keys()];
	}

	/** Rebuild instanced arrays and slabs when the LOD decision changes. Returns true when something changed. */
	updateArrays(lodFor: (a: ArrModel) => Lod): boolean {
		const st = this.state;
		if (!st) return false;
		const lods = this.model.arrays.map((a) => lodFor(a));
		const key = lods.map((l) => (l.mode === 'zoom' ? `${l.x0.toFixed(4)},${l.x1.toFixed(4)},${l.y0.toFixed(4)},${l.y1.toFixed(4)},${l.wpp ? Math.round(Math.log2(l.wpp)) : ''}` : l.mode)).join('|');
		if (key === this.lodKey) return false;
		this.lodKey = key;
		this.clear(this.arrObjs);
		const m = materials();
		const inst: Inst[] = [];
		const slabs = new BoxBuf();
		const ax = st.axis;
		const cut = this.cutOf(st);
		// Work in (A, B): A runs into the kept side of the section (A >= cutA is kept), B along the plane.
		const cutA = ax === 'y' ? cut : -cut;
		const qHalf = new THREE.Quaternion();
		if (ax === 'x') qHalf.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
		const q0 = new THREE.Quaternion();
		const mtx = new THREE.Matrix4();
		const pos = new THREE.Vector3(), scl = new THREE.Vector3();
		let budget = TOTAL_CAP * this.budgetScale;
		let tris = ARR_TRIS * this.budgetScale;
		// Routed families: endpoint lattices are phase-aligned so a row lies on the cut (section polished through a row).
		const snap = st.routing && st.section && this.model.routing ? this.model.routing.epArr : null;
		this.instanceCount = 0;
		this.model.arrays.forEach((a, k) => {
			const lod = lods[k];
			const it = a.item;
			const o = this.offset(it.group, st);
			const Y0 = this.zmap.map(a.z0) + o, Y1 = this.zmap.map(a.z1) + o;
			const color = itemColor(it);
			const tpl = it.prov === 'template';
			const rb = it.box;
			const p = a.pitch;
			const nA = ax === 'y' ? a.ny : a.nx, nB = ax === 'y' ? a.nx : a.ny;
			let A0 = ax === 'y' ? a.gy0 : -(a.gx0 + (a.nx - 1) * p);
			if (snap?.has(a)) A0 += ax === 'y' ? latticeShift(a.gy0, p, cut) : -latticeShift(a.gx0, p, cut);
			const B0 = ax === 'y' ? a.gx0 : a.gy0;
			// composite joint (array cap_h_um): Cu column + solder cap at the lower end, both cylinders
			const capH = typeof a.arr.cap_h_um === 'number' && a.arr.cap_h_um > 0 && a.arr.cap_h_um < a.z1 - a.z0 ? a.arr.cap_h_um : 0;
			const shape: 'cyl' | 'ball' = capH ? 'cyl' : a.shape;
			const hi = !!lod.wpp && (2 * a.r) / lod.wpp > HI_PX;
			const cost = (hi ? TRIS_HI : TRIS_PER)[shape] * (capH ? 2 : 1);
			let k0 = 0, k1 = nA - 1, m0 = 0, m1 = nB - 1;
			let n = 0;
			if (lod.mode === 'zoom') {
				const wA: [number, number] = ax === 'y' ? [lod.y0, lod.y1] : [-lod.x1, -lod.x0];
				const wB: [number, number] = ax === 'y' ? [lod.x0, lod.x1] : [lod.y0, lod.y1];
				k0 = Math.max(k0, Math.floor((wA[0] - A0) / p)); k1 = Math.min(k1, Math.ceil((wA[1] - A0) / p));
				m0 = Math.max(m0, Math.floor((wB[0] - B0) / p)); m1 = Math.min(m1, Math.ceil((wB[1] - B0) / p));
				if (st.section) k0 = Math.max(k0, Math.floor((cutA - a.r - A0) / p) + 1);
				n = Math.max(0, k1 - k0 + 1) * Math.max(0, m1 - m0 + 1);
				const cap = Math.min(ZOOM_CAP, budget, Math.floor(tris / cost));
				if (n > cap && cap > 0) {
					// Shrink the window around its center (count_est can reach millions); keep the rows at the cut.
					const f = Math.sqrt(cap / n);
					const nk = Math.max(1, Math.floor((k1 - k0 + 1) * f)), nm = Math.max(1, Math.floor((m1 - m0 + 1) * f));
					const cm = Math.floor((m0 + m1) / 2);
					m0 = cm - Math.floor(nm / 2); m1 = m0 + nm - 1;
					if (st.section) k1 = k0 + nk - 1;
					else { const ck = Math.floor((k0 + k1) / 2); k0 = ck - Math.floor(nk / 2); k1 = k0 + nk - 1; }
					n = nk * nm;
				}
				if (n > budget || cap <= 0) n = 0;
			}
			if (n > 0) {
				budget -= n;
				tris -= n * cost;
				const d = 2 * a.r;
				const Yc = capH ? this.zmap.map(a.z0 + capH) + o : Y0;
				const parts: [number, number, THREE.Color][] = capH
					? [[Yc, Y1, compositeColor('copper', it)], [Y0, Yc, compositeColor('solder', it)]]
					: [[Y0, Y1, color]];
				for (let kk = k0; kk <= k1; kk++) {
					const A = A0 + kk * p;
					const half = st.section && Math.abs(A - cutA) < a.r;
					const Ap = half ? cutA : A;
					for (let mm = m0; mm <= m1; mm++) {
						const B = B0 + mm * p;
						const x = ax === 'y' ? B : -Ap, y = ax === 'y' ? Ap : B;
						for (const [ya, yb, c] of parts) {
							pos.set(x, (ya + yb) / 2, -y);
							scl.set(d, yb - ya, d);
							mtx.compose(pos, half ? qHalf : q0, scl);
							inst.push({ shape, hi, half, xr: false, m: mtx.clone(), c, hat: tpl ? 1 : 0, tap: 1, item: it });
						}
						this.instanceCount++;
					}
				}
			}
			// Pad-region slab over the part of the region (kept by the section) that is not instanced.
			const reg: Box = { ...rb, z0: 0, z1: 1 };
			if (st.section) {
				if (ax === 'y') reg.y0 = Math.max(reg.y0, cut);
				else reg.x1 = Math.min(reg.x1, cut);
			}
			if (reg.y1 - reg.y0 <= 1e-9 || reg.x1 - reg.x0 <= 1e-9) return;
			let rest: Box[] = [reg];
			if (n > 0) {
				const a0 = A0 + (k0 - 0.5) * p, a1 = A0 + (k1 + 0.5) * p, b0 = B0 + (m0 - 0.5) * p, b1 = B0 + (m1 + 0.5) * p;
				const inst: Box = ax === 'y' ? { x0: b0, x1: b1, y0: a0, y1: a1, z0: 0, z1: 1 } : { x0: -a1, x1: -a0, y0: b0, y1: b1, z0: 0, z1: 1 };
				rest = subtract(reg, inst);
			}
			for (const r of rest) {
				if (r.x1 - r.x0 < 1e-9 || r.y1 - r.y0 < 1e-9) continue;
				slabs.add(r.x0, r.x1, Y0, Y1, -r.y1, -r.y0, color, 0.25 + 0.5 * a.fill, tpl, it);
			}
		});
		this.aInst = inst;
		this.assembleInst();
		if (slabs.n) {
			const mesh = new THREE.Mesh(slabs.geometry(), m.slab);
			mesh.renderOrder = 1;
			this.group.add(mesh);
			this.arrObjs.push(mesh);
			this.pickItems.set(mesh, { items: slabs.items, per: 12 });
		}
		this.refreshPickables();
		return true;
	}

	/**
	 * Rebuild the routing geometry (DevLog-011) when its window or LOD key changes. ctx null: no window (every
	 * routed level a tinted slab, e.g. thumbnails). Returns true when something changed.
	 */
	updateRouting(ctx: RoutingCtx | null): boolean {
		const st = this.state, rm = this.model.routing;
		if (!st || !rm || !st.routing) {
			if (!this.rBufs && !this.rInst.length) return false;
			this.rBufs = null;
			this.rInst = [];
			this.rKey = '';
			this.routingStats = { cyls: 0, boxes: 0, depth: 0 };
			this.assembleBoxes();
			this.assembleInst();
			return true;
		}
		let zoom: Rect | null = null, wq = 0, key = 'none';
		if (ctx && ctx.wpp > 0 && ctx.hw > 0) {
			wq = Math.pow(2, Math.round(Math.log2(ctx.wpp) * 2) / 2); // half-octave steps
			const q = Math.max(ctx.hw / 4, 1e-4);
			zoom = { x0: Math.floor((ctx.tx - ctx.hw) / q) * q, x1: Math.ceil((ctx.tx + ctx.hw) / q) * q, y0: Math.floor((ctx.ty - ctx.hw) / q) * q, y1: Math.ceil((ctx.ty + ctx.hw) / q) * q };
			key = `${zoom.x0.toFixed(4)},${zoom.x1.toFixed(4)},${zoom.y0.toFixed(4)},${zoom.y1.toFixed(4)}|${wq}`;
		}
		if (key === this.rKey) return false;
		this.rKey = key;
		const cut = this.cutOf(st);
		const out = synthRouting(this.model, rm, { section: st.section, axis: st.axis, cut, wpp: wq, illustrative: st.illustrative, zoom, colorOf: itemColor, scale: this.budgetScale });
		const xray = new Set(st.xray);
		const xcap = new Set(st.xrayCap ?? st.xray);
		const xrIn = (p: RBox | RCyl, set: Set<string>) => set.has(XRAY_ALL) || set.has(p.cls) || isXray(p.host, set) || set.has(`#${p.item.id}`);
		const xr = (p: RBox | RCyl) => xrIn(p, xray);
		// Boxes (matrix, Cu, SR; the synthesizer never overlaps them) join the part meshes: bodies + unlit caps.
		const bufs = { op: new BoxBuf(), cap: new BoxBuf(2), xr: new BoxBuf(), capX: new BoxBuf(2) };
		for (const b of out.boxes) {
			const sb = this.sceneBox(b, b.host.group, st);
			if (!sb) continue;
			const x = xr(b);
			const a = x ? (b.cu ? CU_XRAY_ALPHA : XRAY_ALPHA) : 1;
			(x ? bufs.xr : bufs.op).add(sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z, b.color, a, false, b.item);
			if (!st.section) continue;
			const xc = x && xrIn(b, xcap);
			const capB = xc ? bufs.capX : bufs.cap;
			const cc = b.color.clone().multiplyScalar(CAP_LIFT);
			const ca = xc ? (b.cu ? CU_XRAY_ALPHA : XRAY_CAP_ALPHA) : 1;
			if (st.axis === 'y' && b.y0 <= cut + 1e-7) capB.addFace(4, sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z, cc, false, b.item, ca);
			if (st.axis === 'x' && b.x1 >= cut - 1e-7) capB.addFace(0, sb.min.x, sb.max.x, sb.min.y, sb.max.y, sb.min.z, sb.max.z, cc, false, b.item, ca);
		}
		this.rBufs = bufs;
		// Cylinders join the array instanced meshes (unit cyl / cylHalf, bottom radius per instance). A core (plug,
		// Cu inside a liner) is nudged toward the viewer on the cut face and made a hair taller, so it shows in front of
		// its outer solid without polygon offsets.
		this.rInst = [];
		const ax = st.axis;
		const cutA = ax === 'y' ? cut : -cut;
		const qHalf = new THREE.Quaternion();
		if (ax === 'x') qHalf.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
		const q0 = new THREE.Quaternion();
		const pos = new THREE.Vector3(), scl = new THREE.Vector3();
		const hiN = out.cyls.filter((c) => (2 * c.r0) / Math.max(wq, 1e-12) > HI_PX).length;
		const hiOk = hiN * TRIS_HI.cyl <= 300000 * this.budgetScale;
		for (const c of out.cyls) {
			const r = Math.max(c.r0, c.r1);
			let x = c.x, y = c.y, half = false;
			if (st.section) {
				const A = ax === 'y' ? y : -x;
				if (A < cutA - r) continue;
				if (A - cutA < r) {
					half = true;
					if (ax === 'y') y = cut; else x = cut;
				}
			}
			const o = this.offset(c.host.group, st);
			const Y0 = this.zmap.map(c.z0) + o, Y1 = this.zmap.map(c.z1) + o;
			if (!(Y1 > Y0)) continue;
			pos.set(x, (Y0 + Y1) / 2, -y);
			if (half && c.core) { if (ax === 'y') pos.z += 0.08 * c.r0; else pos.x += 0.08 * c.r0; }
			scl.set(2 * c.r0, (Y1 - Y0) * (c.core ? 1.002 : 1), 2 * c.r0);
			this.rInst.push({ shape: 'cyl', hi: hiOk && (2 * c.r0) / Math.max(wq, 1e-12) > HI_PX, half, xr: xr(c), m: new THREE.Matrix4().compose(pos, half ? qHalf : q0, scl), c: c.color, hat: 0, tap: c.r0 > 0 ? c.r1 / c.r0 : 1, item: c.item });
		}
		this.routingStats = { cyls: this.rInst.length, boxes: out.boxes.length, depth: out.depth };
		this.assembleBoxes();
		this.assembleInst();
		return true;
	}

	/** Item hit by a raycast intersection. */
	itemOf(hit: THREE.Intersection): Item | null {
		const e = this.pickItems.get(hit.object);
		if (!e) return null;
		if (hit.object instanceof THREE.InstancedMesh) return hit.instanceId != null ? (e.items[hit.instanceId] ?? null) : null;
		return hit.faceIndex != null ? (e.items[Math.floor(hit.faceIndex / e.per)] ?? null) : null;
	}

	dispose() {
		this.clear(this.meshes);
		this.clear(this.arrObjs);
		this.clear(this.boxObjs);
		this.clear(this.instObjs);
		for (const o of this.occluders) { this.group.remove(o); o.geometry.dispose(); }
		this.occluders = [];
		this.setSelected(null);
	}
}

export { materials as sharedMaterials, unit as unitGeometries };
