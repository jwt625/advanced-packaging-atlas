// Process viewer: one WebGL renderer, three scale scenes (work 1 mm/unit, block and cell 1 um/unit), a primary
// viewport with orbit controls and a picture-in-picture viewport for the secondary scale. Render on demand.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { v, type FlowIndex } from './data';
import { boxesGeometry, bandGeometry, mapSamples, tileGeometry, ZMapP, type ZM } from './geom';
import { createEnvironment, createMaterial, renderSettings } from './mat';
import { asmExtent, gridSites, ID_XF, liveZ, nearestSite, pieceZ, siteGrid, treeXfs, xyTo, zToRoot } from './model';
import { buildPrims, subAll, type BodyPrims, type PBox, type XY } from './prims';
import type { Evaluator } from './state';
import { createTool } from './tools/index';
import { OP_TOOL, type OpCall, type Placement, type ProcMaterial, type Readout, type Rect, type SceneState, type ScaleId, type Step, type ToolActor, type ToolArgs, type ToolCall, type ToolCtx, type Trace, type Window } from './types';

/** View layout (Wentao 2026-10-23): main only, inset (PiP corner), split side by side, split stacked. */
export type Layout = 'main' | 'inset' | 'side' | 'stack';
export interface SecOpts {
	scale: ScaleId | null; // null: Auto (the complement of the main view)
	illustrative: boolean | null; // null: follow the main view
	tool: boolean;
}
export interface ViewOpts {
	illustrative: boolean;
	scale: ScaleId | null; // primary override
	layout: Layout;
	swap: boolean; // exchange main and secondary content
	sec: SecOpts;
	reduceMotion: boolean;
}
export interface Rect2 { x: number; y: number; w: number; h: number } // CSS px, top-left origin
export interface Overlay {
	scaleBar: { px: number; label: string } | null;
	ticks: { x: number; y: number; label: string }[];
	pip: { x: number; y: number; w: number; h: number; label: string } | null; // the secondary view's rect
	main: Rect2;
	layout: Layout;
	primary: ScaleId;
	note: string;
}
export interface ProcStats {
	calls: number;
	triangles: number;
	instances: number;
	geometries: number;
	ms: number;
	frameMs: number;
	bodies: number;
	frames: number; // renders since creation (idle check: must not grow while nothing changes)
	toolMs?: number; // CPU ms of the tool actor's update + readouts in the last update
	workFrac?: number; // share of the primary viewport covered by the workpiece box (render check)
	cellOver?: string[]; // cell scale: bodies wider than the window whose material ignores the window clip (V2 N2)
	blockOver?: string[]; // the same at the block scale (final F1)
}
export interface ToolInfo {
	id: string;
	placeholder: boolean;
	readouts: Readout[];
	traces: Trace[];
	defaultDuration: number | null;
}
export interface Pick {
	kind: 'body' | 'tool';
	id: string;
	x: number;
	y: number;
	text?: string;
}

const FOV = 30;
const PIP = { w: 300, h: 190, m: 8 };
const DIRS: Record<string, THREE.Vector3> = {
	block: new THREE.Vector3(0.42, 0.32, 1).normalize(),
	cell: new THREE.Vector3(0.32, 0.22, 1).normalize(),
	work: new THREE.Vector3(0.75, 0.95, 1.25).normalize(),
	front: new THREE.Vector3(0, 0.0001, 1),
	top: new THREE.Vector3(0, 1, 0.0001),
	side: new THREE.Vector3(1, 0.0001, 0),
	iso: new THREE.Vector3(0.95, 0.8, 1.35).normalize()
};
const ASPECT: Record<'block' | 'cell', number> = { block: 0.55, cell: 1.3 }; // illustrative mapped height / window width

/** One ProcMaterial per mesh (the L36 material reads its own mesh's bounding box): a per-body slot pool, reused
 * across rebuilds. */
interface BodyMesh {
	group: THREE.Group;
	sig: string;
	key: string;
	umPerUnit: number;
	mats: ProcMaterial[];
	used: number;
	owned: THREE.BufferGeometry[];
	instances: number;
	/** slots of meshes larger than the cell window: clipped to the window column (V2 N2) */
	clipWin: ProcMaterial[];
}
function newBodyMesh(key: string, umPerUnit: number, name: string): BodyMesh {
	const g = new THREE.Group();
	g.name = name;
	return { group: g, sig: '', key, umPerUnit, mats: [], used: 0, owned: [], instances: 0, clipWin: [] };
}
/** Next material slot of a body (created on demand). */
function slot(bm: BodyMesh): ProcMaterial {
	let m = bm.mats[bm.used];
	if (!m) {
		m = createMaterial(bm.key, { instanced: true });
		m.setScale(bm.umPerUnit);
		bm.mats.push(m);
	}
	bm.used++;
	return m;
}
function resetBody(bm: BodyMesh) {
	for (const c of [...bm.group.children]) bm.group.remove(c);
	for (const g of bm.owned) g.dispose();
	bm.owned = [];
	bm.instances = 0;
	bm.used = 0;
	for (const pm of bm.clipWin) pm.setClipping(null);
	bm.clipWin = [];
}
function setMats(bm: BodyMesh, st: Partial<import('./types').MatState>) {
	for (let i = 0; i < bm.used; i++) bm.mats[i].set(st);
}

interface Pose { pos: THREE.Vector3; target: THREE.Vector3; ref?: { c: THREE.Vector3; size: number } | null }
interface Built {
	fit: THREE.Box3;
	fitCore?: THREE.Box3; // the workpiece box without transient swept bounds (camera follow reference)
	zm: ZM;
	ox: number;
	oy: number;
	cut: number;
	win: XY;
	surfaceY: number; // tool-facing surface (scene y, after orientation) at the current state
	umPerUnit: number;
	yMidUm: number; // orientation pivot height (mapped um)
	toScene: number; // scene units per mapped um (1 block / cell, 1e-3 work)
	ticksAt: { x: number; z: number; zs: number[] } | null; // ruler anchor (scene x, scene z) and true z values
}

/** One scale's scene. */
class ScaleView {
	readonly scene = new THREE.Scene();
	readonly pivot = new THREE.Group();
	readonly inner = new THREE.Group();
	readonly toolRoot = new THREE.Group();
	pieces = new Map<string, THREE.Group>();
	bodies = new Map<string, BodyMesh>();
	built: Built | null = null;
	tool: { id: string; actor: ToolActor; placeholder: boolean; key: string; placed: boolean; last?: { t: number; args: ToolArgs; ctx: ToolCtx } } | null = null;
	zcache = new Map<string, ZMapP>();
	readonly key: THREE.DirectionalLight;
	readonly fill: THREE.HemisphereLight;
	constructor(readonly scale: ScaleId) {
		// V1 C2: dim fill + one key light; the environment (L36 createProcEnvironment) at 0.45 as in L36's lab; AgX tone
		// mapping on the renderer keeps metals and Si from clipping to white
		const rs = renderSettings();
		this.key = new THREE.DirectionalLight(0xffffff, rs.directional);
		this.key.position.set(0.5, 1, 0.8);
		this.fill = new THREE.HemisphereLight(0xffffff, 0x2a2a2a, rs.hemisphere);
		this.scene.add(this.fill, this.key, this.pivot, this.toolRoot);
		this.scene.environmentIntensity = rs.environmentIntensity;
		this.pivot.add(this.inner);
	}
	pieceGroup(id: string): THREE.Group {
		let g = this.pieces.get(id);
		if (!g) {
			g = new THREE.Group();
			g.name = `piece:${id}`;
			this.pieces.set(id, g);
			this.inner.add(g);
		}
		return g;
	}
	clear() {
		for (const b of this.bodies.values()) this.disposeBody(b);
		this.bodies.clear();
		for (const g of this.pieces.values()) this.inner.remove(g);
		this.pieces.clear();
		this.zcache.clear();
		this.setTool(null);
	}
	disposeBody(b: BodyMesh) {
		b.group.parent?.remove(b.group);
		for (const g of b.owned) g.dispose();
		for (const m of b.mats) m.dispose();
	}
	setTool(t: ScaleView['tool']) {
		if (this.tool) {
			this.toolRoot.remove(this.tool.actor.group);
			this.tool.actor.dispose();
		}
		this.tool = t;
		if (t) this.toolRoot.add(t.actor.group);
	}
}

/** Default tool id per op, method-dependent (CONTRACT.md section 10). */
function defaultTool(op: OpCall, rootKind = ''): string | null {
	const m = (op as { method?: string }).method ?? '';
	if (op.op === 'coat' && m === 'dry_film' && rootKind === 'wafer') return 'laminator_roll'; // L37 roll laminator
	if ((op.op === 'etch_via' || op.op === 'etch_lines' || op.op === 'etch_recess') && m === 'laser') return 'laser_drill';
	if (op.op === 'etch_recess' && (m === 'route' || m === 'mill')) return null; // mechanical routing: no actor yet
	if (op.op === 'deposit') return ['cvd', 'pecvd', 'ald', 'thermal'].includes(m) ? 'cvd' : ['electroless', 'immersion'].includes(m) ? 'wet_bench' : 'pvd';
	if (op.op === 'coat' && (m === 'dry_film' || m === 'vacuum_laminate')) return 'laminator';
	return OP_TOOL[op.op];
}

/** Band samples (z ascending) clipped to [z0, z1]; segments crossing a bound get an interpolated end sample,
 * zero-height steps (annuli) inside the range are kept. */
function clipBand(ss: { z: number; rin: number; rout: number }[], z0: number, z1: number) {
	type S = { z: number; rin: number; rout: number };
	const at = (p: S, q: S, z: number): S => {
		const f = q.z > p.z ? (z - p.z) / (q.z - p.z) : 0;
		return { z, rin: p.rin + (q.rin - p.rin) * f, rout: p.rout + (q.rout - p.rout) * f };
	};
	const out: S[] = [];
	const add = (x: S) => {
		const l = out[out.length - 1];
		if (!l || l.z !== x.z || l.rin !== x.rin || l.rout !== x.rout) out.push(x);
	};
	if (ss.length === 1) return ss[0].z >= z0 && ss[0].z <= z1 ? [ss[0]] : [];
	for (let i = 0; i < ss.length - 1; i++) {
		const p = ss[i], q = ss[i + 1];
		const lo = Math.max(p.z, z0), hi = Math.min(q.z, z1);
		if (q.z === p.z) {
			if (p.z >= z0 && p.z <= z1) { add(p); add(q); }
			continue;
		}
		if (hi < lo) continue;
		add(at(p, q, lo));
		add(at(p, q, hi));
	}
	return out;
}

const sig = (x: unknown) => JSON.stringify(x, (_k, val) => (typeof val === 'number' ? Math.round(val * 1e4) / 1e4 : val));

export class ProcessViewer {
	readonly renderer: THREE.WebGLRenderer;
	readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 1e7);
	readonly pipCam = new THREE.PerspectiveCamera(FOV, PIP.w / PIP.h, 0.01, 1e7);
	readonly controls: OrbitControls;
	private views: Record<ScaleId, ScaleView> = { work: new ScaleView('work'), block: new ScaleView('block'), cell: new ScaleView('cell') };
	private el: HTMLElement;
	private ro: ResizeObserver;
	private w = 1;
	private h = 1;
	private pending = false;
	private disposed = false;
	/** Camera memory (Wentao 2026-10-23: no camera reset between steps): one pose per scale for the main view and for
	 * the PiP; a scale's first use fits once keeping the current view direction; Frame re-fits; flow change clears. */
	private poses: Partial<Record<ScaleId, Pose>> = {};
	private pipPoses: Partial<Record<ScaleId, Pose>> = {};
	private refit = false;
	private lastK = -1;
	private lastPrimary: ScaleId | null = null;
	private ix: FlowIndex | null = null;
	private ev: Evaluator | null = null;
	private state: SceneState | null = null;
	private opts: ViewOpts = { illustrative: true, scale: null, layout: 'inset', swap: false, sec: { scale: null, illustrative: null, tool: true }, reduceMotion: false };
	/** per-scale scale mode of the views on screen (main and secondary are independent) */
	private illOf: Partial<Record<ScaleId, boolean>> = {};
	private illFor(sc: ScaleId): boolean {
		return this.illOf[sc] ?? this.opts.illustrative;
	}
	private mainRect: Rect2 = { x: 0, y: 0, w: 1, h: 1 };
	private secRect: Rect2 | null = null;
	readonly controls2: OrbitControls;
	private mainEl: HTMLDivElement;
	private secEl: HTMLDivElement;
	/** the view last pointed at (toolbar Frame re-fits it) */
	focus: 'main' | 'sec' = 'main';
	private refitSec = false;
	private bg = new THREE.Color('#0d0d0d');
	private down: { x: number; y: number } | null = null;
	private ray = new THREE.Raycaster();
	primary: ScaleId = 'block';
	pipScale: ScaleId | null = null;
	stats: ProcStats = { calls: 0, triangles: 0, instances: 0, geometries: 0, ms: 0, frameMs: 0, bodies: 0, frames: 0 };
	toolInfo: ToolInfo = { id: '', placeholder: true, readouts: [], traces: [], defaultDuration: null };
	private toolTraces: Trace[] = [];
	private toolDefaultS: number | null = null;
	onOverlay: (o: Overlay) => void = () => {};
	onPick: (p: Pick | null) => void = () => {};
	onStats: (s: ProcStats) => void = () => {};

	constructor(el: HTMLElement, canvas: HTMLCanvasElement) {
		this.el = el;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		const rs = renderSettings();
		this.renderer.toneMapping = rs.toneMapping;
		this.renderer.toneMappingExposure = rs.exposure;
		this.renderer.localClippingEnabled = true;
		this.renderer.autoClear = false;
		this.renderer.info.autoReset = false;
		// one canvas, two viewports: each view has its own pointer surface and OrbitControls
		const mk = (cls: string) => {
			const d = document.createElement('div');
			d.className = cls;
			d.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;touch-action:none;';
			el.appendChild(d);
			return d;
		};
		this.mainEl = mk('pv-main');
		this.secEl = mk('pv-sec');
		this.controls = new OrbitControls(this.camera, this.mainEl);
		// no damping: a damping residual would be applied by any later controls.update() and drift the persistent pose
		this.controls.enableDamping = false;
		this.controls.screenSpacePanning = true;
		this.controls.zoomToCursor = true;
		this.controls.addEventListener('change', () => this.requestRender());
		this.controls.addEventListener('change', () => {
			// the user's orbit / pan / zoom is the pose of the current scale, relative to its workpiece box
			this.poses[this.primary] = { pos: this.camera.position.clone(), target: this.controls.target.clone(), ref: this.workBox(this.views[this.primary]) };
		});
		this.controls2 = new OrbitControls(this.pipCam, this.secEl);
		this.controls2.enableDamping = false;
		this.controls2.screenSpacePanning = true;
		this.controls2.zoomToCursor = true;
		this.controls2.addEventListener('change', () => {
			if (this.pipScale) this.pipPoses[this.pipScale] = { pos: this.pipCam.position.clone(), target: this.controls2.target.clone(), ref: this.workBox(this.views[this.pipScale]) };
			this.requestRender();
		});
		for (const [d, f] of [[this.mainEl, 'main'], [this.secEl, 'sec']] as const) {
			d.addEventListener('pointerdown', (e) => { this.focus = f; this.pDown(e); });
			d.addEventListener('pointerup', (e) => this.pUp(e, f));
		}
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(el);
		this.env = createEnvironment(this.renderer);
		for (const v of Object.values(this.views)) v.scene.environment = this.env;
		this.resize();
	}
	private env: THREE.Texture | null = null;

	setBackground(c: string) {
		this.bg = new THREE.Color(c.trim() || '#0d0d0d');
		this.requestRender();
	}

	setFlow(ix: FlowIndex, ev: Evaluator) {
		this.ix = ix;
		this.ev = ev;
		for (const v of Object.values(this.views)) v.clear();
		this.lastK = -1;
		this.poses = {};
		this.pipPoses = {};
		this.orderIdx.clear();
		this.tzCache.clear();
		this.idCache.clear();
		this.extCache.clear();
		this.workZ.clear();
	}

	setOpts(o: Partial<ViewOpts>) {
		const ill = o.illustrative != null && o.illustrative !== this.opts.illustrative;
		// illustrative <-> actual keeps the pose; the target height follows the same piece z (no orbit reset)
		const keep = ill ? this.targetZ() : null;
		this.opts = { ...this.opts, ...o, sec: { ...this.opts.sec, ...(o.sec ?? {}) } };
		if (o.layout) this.layoutRects();
		if (this.state) this.update(this.state);
		if (keep) this.restoreTargetZ(keep);
	}

	/** Viewport rects of the layout (side by side falls back to stacked below 640 px). */
	private layoutRects() {
		const W = this.w, H = this.h;
		let L = this.opts.layout;
		if (L === 'side' && W < 640) L = 'stack';
		const g = 2; // divider
		if (L === 'side') {
			const a = Math.floor((W - g) / 2);
			this.mainRect = { x: 0, y: 0, w: a, h: H };
			this.secRect = { x: a + g, y: 0, w: W - a - g, h: H };
		} else if (L === 'stack') {
			const a = Math.floor((H - g) / 2);
			this.mainRect = { x: 0, y: 0, w: W, h: a };
			this.secRect = { x: 0, y: a + g, w: W, h: H - a - g };
		} else {
			this.mainRect = { x: 0, y: 0, w: W, h: H };
			this.secRect = L === 'inset' && W > PIP.w * 1.8 && H > PIP.h * 1.8 ? { x: W - PIP.w - PIP.m, y: PIP.m, w: PIP.w, h: PIP.h } : null;
		}
		this.effLayout = L;
		const place = (d: HTMLDivElement, r: Rect2 | null) => {
			d.style.display = r ? 'block' : 'none';
			if (r) { d.style.left = `${r.x}px`; d.style.top = `${r.y}px`; d.style.width = `${r.w}px`; d.style.height = `${r.h}px`; }
		};
		place(this.mainEl, this.mainRect);
		place(this.secEl, this.secRect);
		this.camera.aspect = this.mainRect.w / Math.max(1, this.mainRect.h);
		this.camera.updateProjectionMatrix();
		if (this.secRect) {
			this.pipCam.aspect = this.secRect.w / Math.max(1, this.secRect.h);
			this.pipCam.updateProjectionMatrix();
		}
	}
	private effLayout: Layout = 'inset';

	/** Piece-frame z under the orbit target of the main view (for the scale-mode toggle). */
	private targetZ(): { sc: ScaleId; local: THREE.Vector3; z: number } | null {
		const v = this.views[this.primary];
		const b = v.built;
		const zm = b?.zm as (ZM & { inverse?: (y: number) => number }) | undefined;
		if (!b || !zm?.inverse) return null;
		v.inner.updateMatrixWorld(true);
		const local = v.inner.worldToLocal(this.controls.target.clone());
		return { sc: this.primary, local, z: zm.inverse(local.y / b.toScene) };
	}
	private restoreTargetZ(k: { sc: ScaleId; local: THREE.Vector3; z: number }) {
		const v = this.views[k.sc];
		if (k.sc !== this.primary || !v.built) return;
		v.inner.updateMatrixWorld(true);
		const before = v.inner.localToWorld(k.local.clone());
		const after = v.inner.localToWorld(new THREE.Vector3(k.local.x, v.built.zm.map(k.z) * v.built.toScene, k.local.z));
		const d = after.sub(before);
		this.setPose(this.camera.position.clone().add(d), this.controls.target.clone().add(d));
		this.render();
	}

	/** Set the main camera exactly: flush OrbitControls' damping residual first, so nothing drifts afterwards. */
	private setPose(pos: THREE.Vector3, target: THREE.Vector3) {
		const damp = this.controls.enableDamping;
		this.controls.enableDamping = false;
		this.controls.update(); // applies and clears any residual rotate / pan / zoom delta
		this.camera.position.copy(pos);
		this.controls.target.copy(target);
		this.camera.lookAt(target);
		this.controls.update();
		this.controls.enableDamping = damp;
		this.poses[this.primary] = { pos: pos.clone(), target: target.clone(), ref: this.workBox(this.views[this.primary]) };
	}

	/** World box of a view's workpiece (its fit box through the orientation pivot): centre and diagonal. */
	private workBox(view: ScaleView): { c: THREE.Vector3; size: number } | null {
		const b = view.built;
		if (!b) return null;
		view.pivot.updateMatrixWorld(true);
		const box = (b.fitCore ?? b.fit).clone().applyMatrix4(view.pivot.matrixWorld);
		return { c: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() };
	}
	/** V2 N1: a remembered pose follows its workpiece. When the box changes by more than 1.5x in size or its centre
	 * leaves the frustum (flip, join onto a larger piece, dice, singulate), re-target to the new box and scale the
	 * distance by the size ratio: the user's orbit angles and zoom relative to the workpiece are kept. Within an
	 * unchanged workpiece nothing moves. */
	private follow(p: Pose, view: ScaleView, cam: THREE.PerspectiveCamera, aspect: number, step?: Step): Pose | null {
		const cur = this.workBox(view);
		if (!cur || !p.ref || !(p.ref.size > 0) || !(cur.size > 0)) return null;
		const k = cur.size / p.ref.size;
		let out = k > 1.5 || k < 1 / 1.5;
		// the centre test only when the box itself moved (a user pan that leaves the part off-centre is kept)
		if (!out && cur.c.distanceTo(p.ref.c) > 0.25 * p.ref.size) {
			const c = new THREE.PerspectiveCamera(cam.fov, aspect, 1e-4, 1e9);
			c.position.copy(p.pos);
			c.lookAt(p.target);
			c.updateMatrixWorld(true);
			const q = cur.c.clone().project(c);
			out = !(Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1);
		}
		if (!out) return null;
		const target = cur.c.clone().add(p.target.clone().sub(p.ref.c).multiplyScalar(k));
		const off = p.pos.clone().sub(p.target).multiplyScalar(k);
		// final F9: the kept zoom never closer than 0.6 of the new workpiece's fit distance (its contact region in frame)
		const fit = step ? this.pose(view, step, aspect, cam, off.clone().normalize()) : null;
		if (fit) {
			const dMin = 0.6 * fit.pos.distanceTo(fit.target);
			if (off.length() < dMin) off.setLength(dMin);
		}
		const pos = target.clone().add(off);
		return { pos, target, ref: cur };
	}

	/** Frame button: re-fit the current scale (and the PiP) keeping the view direction. full: also the default
	 * direction and no remembered poses (automation: shots independent of the camera history). */
	resetCamera(full = false, which: 'main' | 'sec' | 'both' = 'both') {
		if (which !== 'sec') this.refit = true;
		if (which !== 'main') this.refitSec = true;
		if (full) { this.poses = {}; this.pipPoses = {}; }
		if (this.state) this.update(this.state);
	}

	// ---------------------------------------------------------------- per-frame update

	update(s: SceneState) {
		if (!this.ix || !this.ev) return;
		const t0 = performance.now();
		this.state = s;
		const step = this.ev.steps[s.k];
		// main content A and secondary content B (Auto: the complement of the main); Swap exchanges them
		const auto = this.opts.scale ?? step.view.primary;
		const comp = step.view.pip && step.view.pip !== auto ? step.view.pip : auto === 'work' ? 'block' : 'work';
		const so = this.opts.sec;
		let A = { sc: auto, ill: this.opts.illustrative, tool: true };
		let B = { sc: so.scale && so.scale !== auto ? so.scale : comp, ill: so.illustrative ?? this.opts.illustrative, tool: so.tool };
		if (this.opts.swap) [A, B] = [B, A];
		const primary = A.sc;
		const pip = this.secRect ? B.sc : null;
		this.primary = primary;
		this.pipScale = pip;
		this.illOf = { [A.sc]: A.ill, ...(pip ? { [B.sc]: B.ill } : {}) };
		let toolScale = this.toolScale(step, s, auto);
		if (toolScale && ((toolScale === A.sc && !A.tool) || (toolScale === pip && !B.tool))) toolScale = null;
		this.toolInfo = { id: '', placeholder: true, readouts: [], traces: [], defaultDuration: null };
		this.stats.cellOver = [];
		this.stats.blockOver = [];
		if (toolScale) this.ensureTool(this.views[toolScale], s, step);
		for (const sc of [primary, pip]) if (sc) this.buildScale(sc, s, step, sc === toolScale);
		for (const sc of ['work', 'block', 'cell'] as ScaleId[]) if (sc !== toolScale && this.views[sc].tool) this.views[sc].setTool(null);
		this.direct(s, step, primary);
		this.lastK = s.k;
		this.lastPrimary = primary;
		this.stats.ms = performance.now() - t0;
		this.render();
	}

	private activeOp(s: SceneState, step: Step): OpCall | null {
		const i = s.op >= 0 ? s.op : 0;
		return step.ops[i] ?? null;
	}
	private toolCall(s: SceneState, step: Step): ToolCall | null {
		const op = this.activeOp(s, step);
		if (!op) return null;
		if (op.tool === null) return null;
		if (op.tool) return op.tool;
		if (step.tool === null) return null;
		if (step.tool) return step.tool;
		const d = defaultTool(op, this.ix?.piece.get(s.root)?.kind ?? '');
		return d ? { id: d } : null;
	}
	private toolScale(step: Step, s: SceneState, p: ScaleId): ScaleId | null {
		const tc = this.toolCall(s, step);
		if (!tc) return null;
		if (tc.scale) return tc.scale;
		return p === 'cell' ? (step.view.pip === 'work' ? 'work' : 'block') : p;
	}

	// ---------------------------------------------------------------- scale builds

	private windowOf(step: Step): Window {
		const p = this.ix!.piece.get(step.piece)!;
		return step.view.block ?? p.block;
	}

	/** Cell-site grid in the root frame and the section row for the block. */
	private cellSite(step: Step, s: SceneState, w: Window): { grid: ReturnType<typeof siteGrid>; x: number; y: number } | null {
		const ix = this.ix!;
		const id = step.view.cell_site ?? ix.flow.sites.find((x) => x.piece === step.piece)?.id;
		const site = id ? ix.site.get(id) : undefined;
		if (!site) return null;
		const xf = treeXfs(s, s.root).get(site.piece)?.[0] ?? ID_XF;
		const g = siteGrid(site, xf);
		const cx = (w.x0_um + w.x1_um) / 2, cy = w.section_y_um ?? (w.y0_um + w.y1_um) / 2;
		const [x, y] = nearestSite(g, cx, cy);
		return { grid: g, x, y };
	}

	private zBreaks(ps: BodyPrims[], active?: Set<string>): { all: number[]; coarse: number[] } {
		const all: number[] = [], coarse: number[] = [];
		// final F2: a long uniform stack the step does not act on (PCB laminate, build-up, core: >= 10 inactive slab /
		// fill bodies of one piece) is one coarse band; its layers share it as fine breaks
		const perPiece = new Map<string, BodyPrims[]>();
		for (const p of ps) if ((p.body.kind === 'slab' || p.body.kind === 'fill') && !active?.has(p.body.id)) perPiece.set(p.piece, [...(perPiece.get(p.piece) ?? []), p]);
		const merged = new Set<string>();
		for (const list of perPiece.values()) {
			if (list.length < 10) continue;
			let lo = Infinity, hi = -Infinity;
			for (const p of list) { merged.add(p.id); for (const b of p.boxes) { lo = Math.min(lo, b.z0); hi = Math.max(hi, b.z1); } }
			if (Number.isFinite(lo)) coarse.push(lo, hi);
		}
		// hole floor films (and the tops of the stack on them) are no z breaks: they keep the via's scale (V2 M11)
		const floorTop = new Map<string, [number, number]>();
		for (const p of ps) for (const b of p.bands) if (b.key.startsWith('floor:') && b.samples.length) {
			const h = b.key.slice(6), r = floorTop.get(h) ?? [Infinity, -Infinity];
			floorTop.set(h, [Math.min(r[0], b.samples[0].z), Math.max(r[1], b.samples[b.samples.length - 1].z)]);
		}
		const inFloor = (key: string, z: number) => {
			const i = key.indexOf(':');
			const r = i > 0 ? floorTop.get(key.slice(i + 1)) : undefined;
			return !!r && z > r[0] + 1e-9 && z <= r[1] + 1e-9;
		};
		for (const p of ps) {
			const isC = !merged.has(p.id) && (p.body.kind === 'slab' || p.body.kind === 'fill' || p.body.kind === 'post' || p.body.kind === 'solder');
			for (const b of p.boxes) { all.push(b.z0, b.z1); if (isC) coarse.push(b.z0, b.z1); }
			for (const b of p.bands) {
				if (!b.samples.length || b.key.startsWith('floor:')) continue;
				const a = b.samples[0].z, c = b.samples[b.samples.length - 1].z;
				for (const z of [a, c]) {
					if (inFloor(b.key, z)) continue;
					all.push(z);
					if (isC) coarse.push(z);
				}
			}
		}
		return { all, coarse };
	}

	/** z map of step k at a scale: union of the breaks at step start and end, cached. */
	private zmapFor(k: number, sc: 'block' | 'cell', win: XY, crop: [number, number], floorUm: number): ZMapP {
		const view = this.views[sc];
		const ill = this.illFor(sc);
		const key = `${k}:${ill ? 1 : 0}:${crop[0]}:${crop[1]}:${win.x0}:${win.x1}`;
		const hit = view.zcache.get(key);
		if (hit) return hit;
		const ev = this.ev!, ix = this.ix!;
		const o = { floorUm, scallops: false, solderN: 6, win };
		const step = ev.steps[k];
		const act = this.targetIds(k, step);
		const a = this.zBreaks(buildPrims(ix, ev.evalAt(k, 0), o), act);
		const b = this.zBreaks(buildPrims(ix, ev.evalAt(k, 1), o), act);
		const H = ASPECT[sc] * (win.x1 - win.x0);
		const zm = new ZMapP([...a.all, ...b.all], [...a.coarse, ...b.coarse], crop[0], crop[1], ill, H, this.targetsZ(k, step));
		view.zcache.set(key, zm);
		return zm;
	}

	private buildScale(sc: ScaleId, s: SceneState, step: Step, withTool: boolean) {
		if (sc === 'work') this.buildWork(s, step, withTool);
		else this.buildSection(sc, s, step, withTool);
	}

	private buildSection(sc: 'block' | 'cell', s: SceneState, step: Step, withTool: boolean) {
		const ix = this.ix!;
		const view = this.views[sc];
		const W = this.windowOf(step);
		const cs = this.cellSite(step, s, W);
		// one z map per step (Wentao 2026-10-23: constant aspect within a step): the crop is the union of the step's
		// start and end extents, never the live extent (a live crop re-mapped every t and re-stretched ground bodies)
		const ext = this.stepExt(s.k);
		let win: XY, crop: [number, number], cut: number;
		if (sc === 'block' || !cs) {
			win = { x0: W.x0_um, x1: W.x1_um, y0: W.y0_um, y1: W.y1_um };
			crop = [W.z0_um ?? ext[0], W.z1_um ?? ext[1]];
			cut = W.section_y_um ?? cs?.y ?? (W.y0_um + W.y1_um) / 2;
		} else {
			const g = cs.grid;
			win = { x0: cs.x - g.px / 2, x1: cs.x + g.px / 2, y0: cs.y - g.py / 2, y1: cs.y + g.py / 2 };
			crop = step.view.cell_z_um ?? [W.z0_um ?? ext[0], W.z1_um ?? ext[1]];
			cut = cs.y;
		}
		// the bodies this step works on stay in view (e.g. BGA balls below a window cropped to the top layers, V1 M13)
		const tz = this.targetsZ(s.k, step);
		if (tz) crop = [Math.min(crop[0], tz[0]), Math.max(crop[1], tz[1])];
		// final F2: a joint step (its ops act on solder) centres the illustrative crop on the joint region: the longer
		// side is trimmed to the shorter one (at least 2x the region's height each side)
		if (tz && this.illFor(sc) && [...this.targetIds(s.k, step)].some((id) => ix.body.get(id)?.kind === 'solder')) {
			const c = (tz[0] + tz[1]) / 2, span = Math.max(tz[1] - tz[0], 1e-3);
			const h = Math.max(Math.min(c - crop[0], crop[1] - c), span / 2 + 2 * span);
			crop = [Math.max(crop[0], c - h), Math.min(crop[1], c + h)];
		}
		const pxW = sc === this.primary ? this.mainRect.w : (this.secRect?.w ?? PIP.w);
		const floorUm = this.illFor(sc) ? (2 * (win.x1 - win.x0)) / Math.max(200, pxW * 0.8) : 0;
		// fixed for all t of the step; it changes only at the step boundary (no blend: a blend of two piecewise maps
		// stretches one band while another holds)
		const zB = this.zmapFor(s.k, sc, win, crop, floorUm);
		const zm: ZM = zB;
		const ox = (win.x0 + win.x1) / 2, oy = (win.y0 + win.y1) / 2;
		// um per pixel along z at this scale (scallop sampling): lateral um/px times the mean z compression
		const zc = (zB.map(crop[1]) - zB.map(crop[0])) / Math.max(1e-9, crop[1] - crop[0]);
		const umPerPx = (win.x1 - win.x0) / Math.max(100, pxW * 0.55) / Math.max(1e-9, zc);
		const prims = buildPrims(ix, s, { floorUm, scallops: sc === 'cell', umPerPx, solderN: sc === 'cell' ? 20 : 16, win, sweepRange: [win.x0, win.x1] });
		const segs = sc === 'cell' ? 48 : 16;
		const seen = new Set<string>();
		const zkey = sig([zB.breaks, zB.mapped]);
		const lat = this.illFor(sc) ? bumpScales(prims, zm, crop) : new Map<string, BumpScale>();
		for (const p of prims) {
			seen.add(p.id);
			const key = sig([p.boxes, p.tiles.map((t) => [t.grid.key, t.rect, t.z0, t.z1, t.r]), p.bands.map((b) => [b.grid.key, b.rect, b.samples, b.xmax, b.exclude]), win, crop, cut, zkey, segs]);
			let bm = view.bodies.get(p.id);
			if (bm && bm.key !== p.key) { view.disposeBody(bm); view.bodies.delete(p.id); bm = undefined; } // material change (IMC)
			if (!bm) {
				bm = newBodyMesh(p.key, 1, `body:${p.id}`);
				view.bodies.set(p.id, bm);
			}
			view.pieceGroup(p.piece).add(bm.group);
			if (bm.sig !== key) {
				this.trueAspect = sc === 'block';
				this.cellBuild = sc === 'cell';
				this.buildPx = pxW;
				this.rebuildBody(bm, p, zm, win, crop, cut, ox, oy, segs, lat);
				this.orderBody(bm, p.id);
				bm.sig = key;
			}
			setMats(bm, (s.bodies[p.id] ?? s.bodies[p.body.id]).mat);
			this.applyXray(bm, s.xray);
		}
		for (const [id, bm] of view.bodies) if (!seen.has(id)) { view.disposeBody(bm); view.bodies.delete(id); }
		// pieces: lift / flip / detach animation in scene space
		const swept = this.animatePieces(view, s, (id) => {
			const pt = this.pieceTop(s, id);
			return pt ? zm.map(pt.top + this.liftUm(s, id)) - zm.map(pt.top) : 0;
		});
		// orientation: rotate about the view axis through the window center
		const yMid = (zm.map(crop[0]) + zm.map(crop[1])) / 2;
		view.pivot.position.set(0, yMid, 0);
		view.inner.position.set(0, -yMid, 0);
		view.pivot.rotation.z = Math.PI * s.orient;
		view.pivot.updateMatrixWorld(true);
		// fronts (fills)
		for (const p of prims) if (p.front) this.applyFront(view, p, zm, ox, oy, crop);
		// bodies wider than the window (a BGA ball under a uBump cell, edge lands at the block scale) are clipped to
		// the window column (V2 N2, final F1); render check: such a body whose material ignores the clip planes
		{
			view.inner.updateMatrixWorld(true);
			const mw = view.inner.matrixWorld;
			const pl = (n: THREE.Vector3, at: THREE.Vector3) => new THREE.Plane().setFromNormalAndCoplanarPoint(n, at).applyMatrix4(mw);
			const planes = [
				pl(new THREE.Vector3(1, 0, 0), new THREE.Vector3(win.x0 - ox, 0, 0)),
				pl(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(win.x1 - ox, 0, 0)),
				pl(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -(win.y1 - oy))),
				pl(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -(win.y0 - oy)))
			];
			const fw = new THREE.Box3(new THREE.Vector3(win.x0 - ox, -Infinity, -(win.y1 - oy)), new THREE.Vector3(win.x1 - ox, Infinity, -(win.y0 - oy)));
			const tx = 0.02 * (win.x1 - win.x0), tz = 0.02 * (win.y1 - win.y0);
			const inv = mw.clone().invert();
			const over: string[] = [];
			for (const [id, bm] of view.bodies) {
				const bb = new THREE.Box3().setFromObject(bm.group, false);
				if (bb.isEmpty()) continue;
				bb.applyMatrix4(inv);
				const out = bb.min.x < fw.min.x - tx || bb.max.x > fw.max.x + tx || bb.min.z < fw.min.z - tz || bb.max.z > fw.max.z + tz;
				if (out) for (let i = 0; i < bm.used; i++) if (!bm.clipWin.includes(bm.mats[i])) bm.clipWin.push(bm.mats[i]);
				for (const pm of bm.clipWin) pm.setClipping(planes);
				if (out && bm.clipWin.some((pm) => !pm.material.clippingPlanes?.length)) over.push(id);
			}
			if (sc === 'cell') this.stats.cellOver = over;
			else this.stats.blockOver = over;
		}
		this.grindCentre(view, new THREE.Vector3(-ox, 0, oy), s, (x, y) => new THREE.Vector3(x - ox, 0, -(y - oy)));
		const fit = new THREE.Box3(new THREE.Vector3(win.x0 - ox, zm.map(crop[0]), -(win.y1 - oy)), new THREE.Vector3(win.x1 - ox, zm.map(crop[1]), -(Math.max(win.y0, cut) - oy)));
		const fitCore = fit.clone();
		if (!swept.isEmpty()) fit.union(swept);
		const faceDown = (step.orient === 'down');
		const live = asmExtent(ix, s, s.root);
		const zFace = faceDown ? live[0] : live[1];
		const yFace = faceDown ? 2 * yMid - zm.map(zFace) : zm.map(zFace);
		view.built = { fit, fitCore, zm, ox, oy, cut, win, surfaceY: yFace, umPerUnit: 1, yMidUm: yMid, toScene: 1, ticksAt: { x: win.x1 - ox, z: -(cut - oy), zs: [] } };
		if (withTool) this.updateTool(view, s, step, { x: ox, y: oy });
	}

	private applyXray(bm: BodyMesh, x: number) {
		for (const m of bm.mats.slice(0, bm.used).map((pm) => pm.material)) {
			const want = x > 0;
			const op = 1 - 0.75 * x;
			if (want || m.userData.xr) {
				if (!m.userData.xr) m.userData.xr = { t: m.transparent, o: m.opacity, d: m.depthWrite };
				m.transparent = want || m.userData.xr.t;
				m.opacity = want ? Math.min(m.userData.xr.o, op) : m.userData.xr.o;
				m.depthWrite = want ? false : m.userData.xr.d;
				if (!want) delete m.userData.xr;
				m.needsUpdate = true;
			}
		}
	}

	private orderIdx = new Map<string, number>();
	/** Deterministic draw order (renderOrder from the body's place in the flow, then the mesh's place in the body), so
	 * coplanar and transparent ties never fall back to object / program ids, i.e. to the visit history. */
	private orderBody(bm: BodyMesh, id: string) {
		if (!this.orderIdx.size && this.ix) this.ix.flow.bodies.forEach((b, i) => this.orderIdx.set(b.id, i));
		const base = id.endsWith('#lines') ? (this.orderIdx.get(id.slice(0, -6)) ?? 9999) * 4 + 2 : id === '__kerf' ? 3999 * 4 : (this.orderIdx.get(id) ?? 9999) * 4;
		bm.group.children.forEach((c, i) => (c.renderOrder = base * 64 + i));
	}
	/** free balls at true aspect: block scale only (a cell window is far smaller than a ball) */
	private trueAspect = false;
	private cellBuild = false;
	private buildPx = 1;
	private rebuildBody(bm: BodyMesh, p: BodyPrims, zm: ZM, win: XY, crop: [number, number], cut: number, ox: number, oy: number, segs: number, lat?: Map<string, BumpScale>) {
		resetBody(bm);
		const bump = p.body.kind === 'solder' || isTallPost(p.body);
		const CAP = 20000;
		const drawn: PBox[] = [];
		// tiles
		for (const t of p.tiles) {
			const z0 = Math.max(t.z0, crop[0]), z1 = Math.min(t.z1, crop[1]);
			if (z1 <= z0) continue;
			const g = t.grid;
			const ylo = Math.max(t.rect.y0, win.y0, cut - g.py / 2), yhi = Math.min(t.rect.y1, win.y1);
			const sites = gridSites(g, Math.max(t.rect.x0, win.x0), Math.min(t.rect.x1, win.x1), ylo, yhi);
			if (!sites.length || sites.length > CAP) continue;
			const Y0 = zm.map(z0), Hh = zm.map(z1) - Y0;
			// openings around a bump site (resist / passivation holes) widen with the bump they hold
			const tl0 = lat?.get(g.key);
			const tl = tl0?.pillar ? tl0 : undefined;
			const tr = tl ? Math.min(t.r * tl.f, 0.49 * Math.min(g.px, g.py)) : t.r;
			const tilePx = (g.px / Math.max(1e-9, win.x1 - win.x0)) * this.buildPx;
			// final F4: a via / bump field under ~3 px per site aliases into dark hatching: the host stays solid and the
			// parts in the field are not drawn at this scale (the cell scale shows them)
			if (tilePx < 3) continue;
			const segsT = tilePx < 6 ? 4 : tilePx < 16 ? 8 : segs;
			const byDy = new Map<number, [number, number][]>();
			let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
			for (const [x, y] of sites) {
				const dy = cut - y;
				if (dy >= g.py / 2 - 1e-9) continue;
				const k = dy <= -g.py / 2 ? -g.py : Math.round(dy * 1e4) / 1e4;
				const l = byDy.get(k) ?? [];
				l.push([x, y]);
				byDy.set(k, l);
				x0 = Math.min(x0, x - g.px / 2); x1 = Math.max(x1, x + g.px / 2);
				y0 = Math.min(y0, Math.max(cut, y - g.py / 2)); y1 = Math.max(y1, y + g.py / 2);
			}
			if (!byDy.size) continue;
			drawn.push({ x0, x1, y0, y1, z0, z1 });
			for (const [dy, l] of byDy) {
				const geo = tileGeometry(g.px, g.py, tr, dy, Hh, segsT);
				const tpm = slot(bm);
				// a pitch cell wider than the cell window (a coarser via grid under a fine cell): clipped like large bands
				if (this.cellBuild && (x0 < win.x0 - 0.05 * (win.x1 - win.x0) || x1 > win.x1 + 0.05 * (win.x1 - win.x0) || y1 > win.y1 + 0.05 * (win.y1 - win.y0))) bm.clipWin.push(tpm);
				const im = new THREE.InstancedMesh(geo, tpm.material, l.length);
				const m = new THREE.Matrix4();
				l.forEach(([x, y], i) => im.setMatrixAt(i, m.makeTranslation(x - ox, Y0, -(y - oy))));
				im.userData.body = p.id;
				im.computeBoundingSphere();
				bm.group.add(im);
				bm.instances += l.length;
			}
		}
		// bands
		for (const b of p.bands) {
			// clipped (interpolated) at the crop, not filtered, so bands crossing it keep their outline
			const ss = clipBand(b.samples, crop[0], crop[1]);
			if (ss.length < 2) continue;
			let rmax = 0;
			for (const x of ss) rmax = Math.max(rmax, x.rout);
			const g = b.grid;
			const bl = bump ? lat?.get(g.key) : undefined;
			if (bl) rmax *= bl.f;
			const xr = Math.min(b.rect.x1, win.x1, b.xmax ?? Infinity);
			// on-screen LOD: a site a few px wide needs few segments (EMIB fine-pitch fields over a mm window)
			// (the view's own width: the PiP's LOD was taken from the main canvas, 2026-10-23 budget check)
			const sitePx = (g.px / Math.max(1e-9, win.x1 - win.x0)) * this.buildPx;
			if (sitePx < 3 && (bump || /^(ring|floor|fill|wall|solder)/.test(b.key))) continue; // the parts in that field (F4)
			// round bumps: segments by on-screen diameter (no faceted balls, V2 / L38 note), capped
			const ballPx = ((2 * rmax) / Math.max(1e-9, win.x1 - win.x0)) * this.buildPx;
			const segsB = sitePx < 6 ? 6 : sitePx < 16 ? 10 : bump ? Math.max(12, Math.min(48, Math.round(ballPx / 4))) : segs;
			const sites = gridSites(g, Math.max(b.rect.x0, win.x0), xr, Math.max(b.rect.y0, win.y0, cut - rmax), Math.min(b.rect.y1, win.y1));
			if (!sites.length || sites.length > CAP) continue;
			// bumps (solder, posts) in the illustrative map (V2 n1 / m4): one linear z scale over the site's bump stack (no
			// z-map kinks inside a cap) and the same scale laterally, clamped so neighbours never touch; free balls keep
			// that aspect from their pad plane
			const ms = bl
				? b.key.startsWith('solder-true')
					? (() => {
							const zp = b.key === 'solder-true-top' ? ss[ss.length - 1].z : ss[0].z;
							const yp = zm.map(zp);
							return ss.map((x) => ({ y: yp + bl.f * (x.z - zp), rin: x.rin * bl.f, rout: x.rout * bl.f }));
						})()
					: ss.map((x) => ({ y: bl.y0 + bl.s * (x.z - bl.z0), rin: x.rin * bl.f, rout: x.rout * bl.f }))
				: b.key.startsWith('solder-true') && this.trueAspect
					? (() => {
							const top = b.key === 'solder-true-top';
							const zp = top ? ss[ss.length - 1].z : ss[0].z;
							const yp = zm.map(zp);
							return ss.map((x) => ({ y: yp + (x.z - zp), rin: x.rin, rout: x.rout }));
						})()
					: mapSamples(ss, zm);
			if (ms.length < 2) continue;
			const full: [number, number][] = [], half: [number, number][] = [];
			for (const [x, y] of sites) {
				if (b.exclude && b.exclude.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)) continue;
				const dy = cut - y;
				if (dy >= rmax) continue;
				(dy <= -rmax ? full : half).push([x, y]);
			}
			const skipOuter = b.key.startsWith('wall:') || b.key.startsWith('ring:');
			for (const [list, h] of [[full, false], [half, true]] as const) {
				if (!list.length) continue;
				const bg = bandGeometry(ms, h ? Math.max(4, segsB / 2) : segsB, h, skipOuter);
				if (!bg.shared) bm.owned.push(bg.geo);
				const geo = bg.geo;
				const pm = slot(bm);
				if (this.cellBuild && rmax > 0.5 * Math.min(win.x1 - win.x0, win.y1 - win.y0)) bm.clipWin.push(pm);
				const im = new THREE.InstancedMesh(geo, pm.material, list.length);
				const m = new THREE.Matrix4();
				list.forEach(([x, y], i) => im.setMatrixAt(i, m.makeTranslation(x - ox, 0, -(y - oy))));
				im.userData.body = p.id;
				if (bl) im.userData.exag = bl.tip;
				im.computeBoundingSphere();
				bm.group.add(im);
				bm.instances += list.length;
			}
		}
		// boxes: window, section and crop clipped, minus the drawn tile regions
		const clipped: PBox[] = [];
		for (const b of p.boxes) {
			const c = { x0: Math.max(b.x0, win.x0), x1: Math.min(b.x1, win.x1), y0: Math.max(b.y0, win.y0, cut), y1: Math.min(b.y1, win.y1), z0: Math.max(b.z0, crop[0]), z1: Math.min(b.z1, crop[1]) };
			if (c.x1 > c.x0 && c.y1 > c.y0 && c.z1 > c.z0) clipped.push(c);
		}
		const geo = boxesGeometry(subAll(clipped, drawn), zm, ox, oy);
		if (geo) {
			const mesh = new THREE.Mesh(geo, slot(bm).material);
			mesh.userData.body = p.id;
			bm.group.add(mesh);
			bm.owned.push(geo);
		}
		// draw-call budget: the parts of one body (tiles per section offset, full / half bands, boxes) are static for
		// the build, so they are baked into one mesh when small enough (2026-10-23 budget check)
		mergeBody(bm);
		// unused slots from a previous build keep their materials (reused next time)
	}

	/** Joined pieces: lift (scene units, from the z map so tools holding them via hold_z_um stay in sync), in-flight
	 * flip about the piece center. */
	/** returns the swept bounds of pieces flipping now (inner-local coords; final F10: framing includes them) */
	private animatePieces(view: ScaleView, s: SceneState, liftScene: (id: string) => number): THREE.Box3 {
		const swept = new THREE.Box3();
		view.inner.updateMatrixWorld(true);
		const inv = view.inner.matrixWorld.clone().invert();
		for (const [id, g] of view.pieces) {
			const ps = s.pieces[id];
			g.position.set(0, 0, 0);
			g.rotation.set(0, 0, 0);
			g.updateMatrix();
			if (!ps?.join || id === s.root) continue;
			const box = new THREE.Box3().setFromObject(g, false);
			if (box.isEmpty()) continue;
			const c = box.getCenter(new THREE.Vector3());
			const lift = liftScene(id);
			const rot = ps.join.flip ? Math.PI * (1 - ps.flip) : 0;
			if (rot > 1e-6 && rot < Math.PI - 1e-6) {
				const lb = box.clone().applyMatrix4(inv), lc = lb.getCenter(new THREE.Vector3()), sz = lb.getSize(new THREE.Vector3());
				const r = Math.hypot(sz.y, sz.z) / 2;
				swept.union(new THREE.Box3(new THREE.Vector3(lb.min.x, lc.y - r, lc.z - r), new THREE.Vector3(lb.max.x, lc.y + r, lc.z + r)).translate(new THREE.Vector3(0, lift, 0)));
			}
			// rotate about the x axis through the piece center, then lift
			const m = new THREE.Matrix4().makeTranslation(c.x, c.y + lift, c.z)
				.multiply(new THREE.Matrix4().makeRotationX(rot))
				.multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
			g.matrix.copy(m);
			g.matrix.decompose(g.position, g.quaternion, g.scale);
		}
		return swept;
	}

	private applyFront(view: ScaleView, p: BodyPrims, zm: ZM, ox: number, oy: number, crop: [number, number]) {
		const bm = view.bodies.get(p.id);
		if (!bm || !p.front) return;
		const f = p.front;
		const r = f.region;
		const box = new THREE.Box3(new THREE.Vector3(r.x0 - ox, zm.map(crop[0]), -(r.y1 - oy)), new THREE.Vector3(r.x1 - ox, zm.map(crop[1]), -(r.y0 - oy)));
		box.applyMatrix4(view.inner.matrixWorld);
		const dirs: Record<string, THREE.Vector3> = { 'x-': new THREE.Vector3(1, 0, 0), 'x+': new THREE.Vector3(-1, 0, 0), 'y-': new THREE.Vector3(0, 0, -1), 'y+': new THREE.Vector3(0, 0, 1) };
		for (const pm of bm.mats.slice(0, bm.used)) {
			if (pm.setFront) {
				pm.setFront(f.from === 'center' || f.from === 'perimeter' ? 'radial' : dirs[f.from].clone().transformDirection(view.inner.matrixWorld), box);
				pm.set({ front: f.f });
				continue;
			}
			// stub: a clipping plane at the front (radial: plane normal from the region center toward the window center)
			let n: THREE.Vector3, at: THREE.Vector3;
			if (f.from === 'center' || f.from === 'perimeter') {
				const cx = (r.x0 + r.x1) / 2 - ox, cz = -((r.y0 + r.y1) / 2 - oy);
				const d = new THREE.Vector3(-cx, 0, -cz);
				if (d.lengthSq() < 1e-9) d.set(1, 0, 0);
				d.normalize();
				const R = Math.hypot(r.x1 - r.x0, r.y1 - r.y0) / 2;
				at = new THREE.Vector3(cx, 0, cz).addScaledVector(d, f.f * R);
				n = d.clone().negate();
			} else {
				const d = dirs[f.from];
				const span = Math.abs(d.x) > 0 ? r.x1 - r.x0 : r.y1 - r.y0;
				const start = new THREE.Vector3(d.x > 0 ? r.x0 - ox : d.x < 0 ? r.x1 - ox : 0, 0, d.z < 0 ? -(r.y0 - oy) : d.z > 0 ? -(r.y1 - oy) : 0);
				at = start.addScaledVector(d, f.f * span);
				n = d.clone().negate();
			}
			const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, at).applyMatrix4(view.inner.matrixWorld);
			pm.setClipping([plane]);
		}
	}

	private workZ = new Map<number, number[]>();
	/** Wafer-scale parts: full-area layers of the root (and carriers) and one box per joined-piece slab. */
	private workParts(s: SceneState, unitW: number, unitD: number) {
		const ix = this.ix!;
		const prims = buildPrims(ix, s, { floorUm: 0, scallops: false, solderN: 4, win: { x0: -unitW / 2, x1: unitW / 2, y0: -unitD / 2, y1: unitD / 2 } });
		const unitArea = unitW * unitD;
		const layers: { p: BodyPrims; z0: number; z1: number; radial: number }[] = [];
		const dies: { p: BodyPrims; boxes: PBox[] }[] = [];
		for (const p of prims) {
			// line conductors are sub-pixel at the wafer scale (their slab's texture carries them)
			if (!p.boxes.length || p.id.endsWith('#lines')) continue;
			let z0 = Infinity, z1 = -Infinity, area = 0;
			for (const b of p.boxes) { z0 = Math.min(z0, b.z0); z1 = Math.max(z1, b.z1); area = Math.max(area, (b.x1 - b.x0) * (b.y1 - b.y0)); }
			const pk = ix.piece.get(p.piece);
			if (p.piece !== s.root && pk?.kind !== 'carrier') {
				// joined pieces at the wafer scale: one bounding box per body (one instanced mesh, not one per box)
				if (p.body.kind === 'slab') {
					let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
					for (const b of p.boxes) { x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); }
					dies.push({ p, boxes: [{ x0, x1, y0, y1, z0, z1 }] });
				}
				continue;
			}
			if (area < 0.5 * unitArea && p.body.kind !== 'fill') continue;
			const radial = p.front && (p.front.from === 'center' || p.front.from === 'perimeter') ? p.front.f : p.front ? -1 : 1;
			if (radial < 0) continue;
			layers.push({ p, z0, z1, radial });
		}
		return { layers, dies };
	}

	private buildWork(s: SceneState, step: Step, withTool: boolean) {
		const ix = this.ix!;
		const view = this.views.work;
		const piece = ix.piece.get(s.root)!;
		const unitW = v(piece.unit.w_um), unitD = v(piece.unit.d_um);
		const sing = s.pieces[s.root]?.singulated ?? 0;
		const disk = piece.carrier.shape === 'disk';
		const D = piece.carrier.shape === 'disk' ? v(piece.carrier.diameter_mm) * 1000 : Math.max(v(piece.carrier.w_mm), v(piece.carrier.d_mm)) * 1000;
		const R = D / 2;
		const { layers, dies } = this.workParts(s, unitW, unitD);
		// z map: exaggerated stack (illustrative) or true; one map per step from the union of the start and end
		// stacks (Wentao 2026-10-23: a ground wafer shrinks at a constant scale, never re-stretched)
		let zs = this.workZ.get(s.k);
		if (!zs) {
			const zsOf = (q: SceneState) => { const r = this.workParts(q, unitW, unitD); return r.layers.flatMap((l) => [l.z0, l.z1]).concat(r.dies.flatMap((d) => d.boxes.flatMap((b) => [b.z0, b.z1]))); };
			zs = [...zsOf(this.ev!.evalAt(s.k, 0)), ...zsOf(this.ev!.evalAt(s.k, 1))];
			this.workZ.set(s.k, zs);
		}
		const zlo = zs.length ? Math.min(...zs) : 0, zhi = zs.length ? Math.max(...zs) : 1;
		const zm = new ZMapP(zs, zs, zlo, zhi, this.illFor('work'), 0.035 * (disk ? D : Math.max(unitW, unitD)));
		const MM = 1 / 1000;
		const seen = new Set<string>();
		const ensure = (id: string, key: string, pieceId: string) => {
			seen.add(id);
			let bm = view.bodies.get(id);
			if (!bm) {
				bm = newBodyMesh(key, 1000, `body:${id}`);
				view.bodies.set(id, bm);
			}
			view.pieceGroup(pieceId).add(bm.group);
			return bm;
		};
		const ill = this.illFor('work') ? 1 : 0;
		const units: [number, number][] = [];
		if (disk && piece.repeat) {
			const px = v(piece.repeat.pitch_x_um), py = v(piece.repeat.pitch_y_um), ex = v(piece.repeat.edge_exclusion_mm, 0) * 1000;
			const n = Math.ceil(R / Math.min(px, py)) + 1;
			for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
				const x = i * px, y = j * py;
				const far = Math.hypot(Math.abs(x) + px / 2, Math.abs(y) + py / 2);
				if (far <= R - ex) units.push([x, y]);
			}
		} else units.push([0, 0]);
		// final F3: in Actual the um films of a 300 mm wafer are coplanar to the depth buffer; the higher layer wins by
		// polygon offset (rank by top z), no z-fighting starburst
		const rankOf = new Map([...layers].sort((p, q) => p.z1 - q.z1 || p.z0 - q.z0).map((l, i) => [l.p.id, i + 1] as [string, number]));
		// after the saw every unit stays on the tape (V2 N3): the root's layers as one box per unit until the pick
		const diced = disk && sing >= 0.5 && !!piece.repeat;
		for (const l of layers) {
			const bm = ensure(l.p.id, l.p.key, l.p.piece);
			const Y0 = zm.map(l.z0) * MM, Y1 = zm.map(l.z1) * MM;
			const perUnit = diced && l.p.piece === s.root;
			const key = sig([Y0, Y1, disk, R, unitW, unitD, l.radial, ill, perUnit, units.length]);
			if (bm.sig !== key) {
				resetBody(bm);
				const h = Math.max(Y1 - Y0, 1e-6);
				if (perUnit) {
					const geo = new THREE.BoxGeometry(unitW * MM, h, unitD * MM);
					const im = new THREE.InstancedMesh(geo, slot(bm).material, units.length);
					const m = new THREE.Matrix4();
					units.forEach(([x, y], i) => im.setMatrixAt(i, m.makeTranslation(x * MM, Y0 + h / 2, -y * MM)));
					im.userData.body = l.p.id;
					im.computeBoundingSphere();
					bm.group.add(im);
					bm.owned.push(geo);
					bm.instances += units.length;
				} else {
					const geo = disk ? new THREE.CylinderGeometry(R * MM * l.radial, R * MM * l.radial, h, 96, 1) : new THREE.BoxGeometry(unitW * MM, h, unitD * MM);
					geo.translate(0, Y0 + h / 2, 0);
					const mesh = new THREE.Mesh(geo, slot(bm).material);
					mesh.userData.body = l.p.id;
					bm.group.add(mesh);
					bm.owned.push(geo);
				}
				bm.sig = key;
			}
			setMats(bm, (s.bodies[l.p.id] ?? s.bodies[l.p.body.id]).mat);
			depthRank(bm, ill ? -1 : rankOf.get(l.p.id) ?? 0);
		}
		// per-unit dies (instanced boxes)
		for (const d of dies) {
			const bm = ensure(d.p.id, d.p.key, d.p.piece);
			const key = sig([d.boxes, units.length, zm.mapped, ill]);
			if (bm.sig !== key) {
				resetBody(bm);
				for (const b of d.boxes) {
					const geo = new THREE.BoxGeometry((b.x1 - b.x0) * MM, Math.max((zm.map(b.z1) - zm.map(b.z0)) * MM, 1e-6), (b.y1 - b.y0) * MM);
					const im = new THREE.InstancedMesh(geo, slot(bm).material, units.length);
					const m = new THREE.Matrix4();
					// a hair above coplanar faces (ground die backs share the EMC top): no z-fighting
					const cy = ((zm.map(b.z0) + zm.map(b.z1)) / 2) * MM + (zm.map(zhi) - zm.map(zlo)) * MM * 2e-3;
					units.forEach(([x, y], i) => im.setMatrixAt(i, m.makeTranslation((x + (b.x0 + b.x1) / 2) * MM, cy, -(y + (b.y0 + b.y1) / 2) * MM)));
					im.userData.body = d.p.id;
					bm.group.add(im);
					bm.owned.push(geo);
				}
				bm.sig = key;
			}
			setMats(bm, (s.bodies[d.p.id] ?? s.bodies[d.p.body.id]).mat);
			depthRank(bm, ill ? -1 : layers.length + 1);
		}
		// dicing streets cut so far
		const lines = s.live.lines ?? 0, line = s.live.line ?? 0;
		const kid = '__kerf';
		if (lines > 0 && disk && piece.repeat) {
			const bm = ensure(kid, 'si', s.root);
			const key = sig([line, lines]);
			if (bm.sig !== key) {
				resetBody(bm);
				const px = v(piece.repeat.pitch_x_um), py = v(piece.repeat.pitch_y_um);
				const pos: [number, number, boolean][] = [];
				for (let x = px / 2; x < R; x += px) pos.push([x, 0, true], [-x, 0, true]);
				for (let y = py / 2; y < R; y += py) pos.push([0, y, false], [0, -y, false]);
				const nCut = Math.min(pos.length, Math.round((line / lines) * pos.length));
				const top = zm.map(zhi) * MM;
				const mat = new THREE.MeshBasicMaterial({ color: 0x050505 });
				for (let i = 0; i < nCut; i++) {
					const [x, y, alongY] = pos[i];
					const c = alongY ? 2 * Math.sqrt(Math.max(0, R * R - x * x)) : 2 * Math.sqrt(Math.max(0, R * R - y * y));
					const geo = new THREE.BoxGeometry(alongY ? D * 0.002 * MM : c * MM, top * 0.02 + 1e-3, alongY ? c * MM : D * 0.002 * MM);
					geo.translate(x * MM, top, -y * MM);
					bm.group.add(new THREE.Mesh(geo, mat));
					bm.owned.push(geo);
				}
				bm.sig = key;
			}
		}
		for (const [id, bm] of view.bodies) if (!seen.has(id)) { view.disposeBody(bm); view.bodies.delete(id); }
		for (const [id, bm] of view.bodies) this.orderBody(bm, id);
		this.animatePieces(view, s, (id) => {
			const pt = this.pieceTop(s, id);
			return pt ? (zm.map(pt.top + this.liftUm(s, id)) - zm.map(pt.top)) * MM : 0;
		});
		const yMid = ((zm.map(zlo) + zm.map(zhi)) / 2) * MM;
		view.pivot.position.set(0, yMid, 0);
		view.inner.position.set(0, -yMid, 0);
		// a face-down machine at this scale (cmp, ecp) turns the work scene over (L37 faceDown)
		const fd = withTool && !!view.tool?.actor.faceDown;
		view.pivot.rotation.z = Math.PI * (fd ? 1 - s.orient : s.orient);
		view.inner.rotation.y = 0;
		view.pivot.updateMatrixWorld(true);
		this.grindCentre(view, new THREE.Vector3(0, 0, 0), s, (x, y) => new THREE.Vector3(x / 1000, 0, -y / 1000));
		view.pivot.updateMatrixWorld(true);
		const half = disk ? R * MM : Math.max(unitW, unitD) * MM * 0.5;
		const fit = new THREE.Box3(new THREE.Vector3(-half, zm.map(zlo) * MM, -half), new THREE.Vector3(half, zm.map(zhi) * MM + half * 0.05, half));
		const ext = asmExtent(ix, s, s.root);
		const faceDown = step.orient === 'down';
		const yFace = faceDown ? 2 * yMid - zm.map(ext[0]) * MM : zm.map(ext[1]) * MM;
		view.built = { fit, zm, ox: 0, oy: 0, cut: 0, win: { x0: -R, x1: R, y0: -R, y1: R }, surfaceY: yFace, umPerUnit: 1000, yMidUm: yMid / MM, toScene: MM, ticksAt: null };
		if (withTool) this.updateTool(view, s, step, { x: step.view.focus?.x_um ?? 0, y: step.view.focus?.y_um ?? 0 });
	}

	/** Root-frame top of a joined piece (current transform) and its own height (piece frame). */
	private pieceTop(s: SceneState, id: string): { top: number; h: number } | null {
		const ps = s.pieces[id];
		const xf = treeXfs(s, s.root).get(id)?.[0];
		if (!ps?.join || !xf) return null;
		const [a, c] = zToRoot(xf, ps.join.zmin, ps.join.zmax);
		return { top: Math.max(a, c), h: ps.join.zmax - ps.join.zmin };
	}

	/** Lift of a joined piece in piece-frame um (pick / align / detach motion; view parameter). */
	private liftUm(s: SceneState, id: string): number {
		const ps = s.pieces[id];
		const pt = this.pieceTop(s, id);
		if (!ps || !pt) return 0;
		return (ps.lift * 1.2 + ps.detach * 1.5) * pt.h;
	}

	/** Op fields and target geometry merged into the tool args (contract v1.1, section 15). */
	private toolArgs(op: OpCall | null, tc: ToolCall, s: SceneState): ToolArgs {
		const ix = this.ix!;
		const out: ToolArgs = {};
		if (op) {
			const o = op as unknown as Record<string, unknown>;
			for (const k of ['dispense', 'mold_top_z_um', 'stencil_um', 'method', 'charge', 'force_n', 'kerf_um', 'feed_mm_s', 'spindle_rpm']) {
				const val = o[k];
				if (typeof val === 'string' || typeof val === 'boolean' || (val && typeof val === 'object' && 'status' in (val as object))) out[k] = val as ToolArgs[string];
			}
			const rectArgs = (pre: string, r: Rect | undefined) => {
				if (!r) return;
				out[`${pre}_x_um`] = r.x_um; out[`${pre}_y_um`] = r.y_um; out[`${pre}_w_um`] = r.w_um; out[`${pre}_d_um`] = r.d_um;
			};
			const bodyId = (o.fill ?? o.cut ?? o.hole ?? (Array.isArray(o.solder) ? (o.solder as string[])[0] : undefined)) as string | undefined;
			const body = bodyId ? ix.body.get(bodyId) : undefined;
			if (body?.kind === 'fill') rectArgs('fill', body.rect);
			if (body?.kind === 'cut') rectArgs('cut', body.rect);
			const siteId = body && 'site' in body ? (body as { site: string }).site : undefined;
			const site = siteId ? ix.site.get(siteId) : undefined;
			if (site) {
				rectArgs('site', site.rect);
				out.site_pitch_um = site.pitch_x_um;
			}
			if (body?.kind === 'solder') { out.ball_d_um = body.d_um; out.d_um = body.d_um; }
			if (body?.kind === 'hole') out.d_um = body.d_top_um;
			const at = (o.at as Placement[] | undefined)?.[0];
			if (at) { out.x_um = at.x_um; out.y_um = at.y_um; }
			const pid = (o.piece ?? o.carrier) as string | undefined;
			const pc = pid && pid !== s.root ? ix.piece.get(pid) : undefined;
			if (pc) {
				out.piece_w_um = pc.unit.w_um;
				out.piece_d_um = pc.unit.d_um;
				const [z0, z1] = pieceZ(ix, pc.id);
				out.piece_h_um = { value: z1 - z0, unit: 'um', status: 'derived', formula: 'extent of the piece bodies', refs: [] };
			}
			// debond: root-frame z of the release layer (its mid plane at the step start), the laser's focus (L37)
			if (op.op === 'debond') {
				const s0 = this.ev!.evalAt(s.k, 0);
				const rb = ix.body.get(op.release), rs = s0.bodies[op.release];
				const xf = rb ? treeXfs(s0, s0.root).get(rb.piece)?.[0] : undefined;
				if (rb && rs?.on && xf) {
					const [z0, z1] = zToRoot(xf, ...liveZ(ix, rb, rs));
					if (Number.isFinite(z0) && Number.isFinite(z1)) {
						out.release_z_um = { value: (z0 + z1) / 2, unit: 'um', status: 'derived', formula: 'mid plane of the release body, root frame, step start', refs: [] };
						out.release_h_um = { value: z1 - z0, unit: 'um', status: 'derived', formula: 'release body thickness', refs: [] };
					}
				}
			}
		}
		return { ...out, ...(tc.args ?? {}) };
	}

	private updateTool(view: ScaleView, s: SceneState, step: Step, focusUm: { x: number; y: number }) {
		const tc = this.toolCall(s, step);
		const b = view.built;
		if (!tc || !b) { view.setTool(null); return; }
		const ix = this.ix!, ev = this.ev!;
		const op = this.activeOp(s, step);
		const args = this.toolArgs(op, tc, s);
		const down = step.orient === 'down';
		const sgn = down ? -1 : 1;
		const key = `${s.k}:${s.op}:${tc.id}:${view.scale}:${this.illFor(view.scale)}`;
		const ext0 = asmExtent(ix, ev.evalAt(s.k, 0), s.root);
		const surf0 = down ? ext0[0] : ext0[1];
		this.ensureTool(view, s, step);
		if (!view.tool) return;
		const far0 = down ? ext0[1] : ext0[0];
		if (!view.tool.placed) {
			const t = view.tool;
			const piece = ix.piece.get(s.root)!;
			const W = this.windowOf(step);
			// zmap(surface_um) = 0, reversed when the root faces down; reads the current (possibly blended) map
			const zmapTool = (z: number) => sgn * (view.built!.zm.map(z) - view.built!.zm.map(surf0));
			t.actor.place({
				scale: view.scale,
				umPerUnit: b.umPerUnit,
				carrier: piece.carrier.shape === 'disk' ? { shape: 'disk', d_um: v(piece.carrier.diameter_mm) * 1000 } : { shape: 'rect', w_um: v(piece.carrier.w_mm) * 1000, dd_um: v(piece.carrier.d_mm) * 1000 },
				unit: { w_um: v(piece.unit.w_um), d_um: v(piece.unit.d_um) },
				focus_um: focusUm,
				surface_um: surf0,
				window: view.scale === 'work' ? undefined : W,
				illustrative: this.illFor(view.scale),
				zmap: zmapTool,
				repeat: piece.repeat ? { pitch_x_um: v(piece.repeat.pitch_x_um), pitch_y_um: v(piece.repeat.pitch_y_um) } : undefined,
				back_y: zmapTool(far0)
			});
			t.placed = true;
			this.toolTraces = t.actor.traces?.(args) ?? [];
			this.toolDefaultS = t.actor.defaultDuration?.(args) ?? null;
		}
		const tool = view.tool!;
		// face-down machines (cmp, ecp) turn the work scene 180 deg about z (L37): the view flips relative to orient
		const fd = view.scale === 'work' && !!tool.actor.faceDown;
		const flipView = down !== fd;
		// tool root: focus on the step-start facing surface (scene units), x mirrored when the view is flipped
		const yS = (flipView ? 2 * b.yMidUm - b.zm.map(surf0) : b.zm.map(surf0)) * b.toScene;
		const fx = (focusUm.x - b.ox) * b.toScene, fz = -(focusUm.y - b.oy) * b.toScene;
		view.toolRoot.position.set(flipView ? -fx : fx, yS, fz);
		view.toolRoot.rotation.set(0, 0, fd ? Math.PI : 0);
		view.toolRoot.scale.setScalar(1 / b.umPerUnit);
		const ext = asmExtent(ix, s, s.root);
		const live: Record<string, number> = { ...s.live, surface_um: down ? ext[0] : ext[1] };
		if (op?.op === 'underfill') {
			const f = s.bodies[op.fill]?.sub.front;
			if (f != null) live.front_frac = f;
		}
		if (op?.op === 'print' && s.live.sweep != null) {
			const [x0, x1] = this.sweepRange(view, s);
			live.front_x_um = x0 + s.live.sweep * (x1 - x0);
		}
		if (op?.op === 'coat') {
			const cb = ix.body.get(op.body);
			const cs = s.bodies[op.body];
			if (cb && (cb.kind === 'slab' || cb.kind === 'film') && cs) live.top_z_um = cs.down ? v(cb.z_um) + v(cb.h_um) - v(cb.h_um) * cs.g : v(cb.z_um) + v(cb.h_um) * cs.g;
		}
		if (op && (op.op === 'place' || op.op === 'bond_tcb' || op.op === 'bond_temp')) {
			const pid = op.op === 'bond_temp' ? op.carrier : op.piece;
			const pt = this.pieceTop(s, pid);
			const ps = s.pieces[pid];
			if (pt && ps) {
				live.hold_z_um = pt.top + this.liftUm(s, pid);
				live.contact_z_um = pt.top + ps.collapse_um;
				live.collapse_um = ps.collapse_um;
			}
		}
		const tm = ev.timing(s.k);
		const w = s.op >= 0 ? tm.ops[s.op] : null;
		const ctx: ToolCtx = {
			u: s.u, phase: s.phase, op: (op ?? step.ops[0])?.op ?? 'inspect', tReal_s: s.tReal_s,
			tPlay_s: s.t * tm.play_s, surface_um: live.surface_um, profile: s.temps, live, mat: createMaterial, reduceMotion: this.opts.reduceMotion,
			phases: [tm.a, tm.b], opPlay_s: w ? (w.t1 - w.t0) * tm.play_s * s.u : 0
		};
		const tt0 = performance.now();
		tool.actor.update(s.t, args, ctx);
		tool.last = { t: s.t, args, ctx };
		// point clouds (spray, flux, particles) move every update: a bounding sphere computed once would cull them
		// depending on the visit history (determinism)
		tool.actor.group.traverse((o) => { if ((o as THREE.Points).isPoints) o.frustumCulled = false; });
		// work piece rotation with the chuck / head (L37 workRot), work scale only
		if (view.scale === 'work') {
			let r = 0;
			try { r = tool.actor.workRot?.(s.t, args, ctx) ?? 0; } catch { r = 0; }
			view.inner.rotation.y = Number.isFinite(r) ? r : 0;
			view.inner.updateMatrixWorld(true);
		}
		// grind marks: wheel radius from the grinder spec (L36 setGrindWheel), on every grind step
		if (op?.op === 'grind') {
			const wd = tool.actor.spec?.wheel_d_mm?.value;
			if (wd && wd > 0) for (const vw of Object.values(this.views)) for (const bm of vw.bodies.values()) for (const pm of bm.mats) (pm as ProcMaterial & { setGrindWheel?: (r: number, o?: number) => void }).setGrindWheel?.((wd * 1000) / 2);
		}
		let readouts: Readout[] = [];
		try {
			readouts = tool.actor.readouts?.(s.t, args, ctx) ?? [];
		} catch (e) {
			console.warn(`[process3d] tool ${tc.id} readouts failed`, e);
		}
		this.stats.toolMs = performance.now() - tt0;
		this.toolInfo = { id: tc.id, placeholder: tool.placeholder, readouts, traces: this.toolTraces, defaultDuration: this.toolDefaultS };
	}

	/** Create the step's tool actor for this view (once per step, op, tool, scale and scale mode); placed later. */
	private ensureTool(view: ScaleView, s: SceneState, step: Step) {
		const tc = this.toolCall(s, step);
		if (!tc) { view.setTool(null); return; }
		const key = `${s.k}:${s.op}:${tc.id}:${view.scale}:${this.illFor(view.scale)}`;
		if (view.tool && view.tool.key === key) return;
		const args = this.toolArgs(this.activeOp(s, step), tc, s);
		const t = createTool(tc.id, args);
		view.setTool({ id: tc.id, actor: t.actor, placeholder: t.placeholder, key, placed: false });
	}

	/** Print sweep range along x (root frame): the window at block / cell scale, the unit at the work scale. */
	private sweepRange(view: ScaleView, s: SceneState): [number, number] {
		const b = view.built;
		if (view.scale !== 'work' && b) return [b.win.x0, b.win.x1];
		const p = this.ix!.piece.get(s.root)!;
		const w = v(p.unit.w_um);
		return [-w / 2, w / 2];
	}

	private tzCache = new Map<number, [number, number] | null>();
	private idCache = new Map<number, Set<string>>();
	/** Bodies the step's ops act on (incl. the solder of joins). */
	private targetIds(k: number, step: Step): Set<string> {
		const hit = this.idCache.get(k);
		if (hit) return hit;
		const ids = new Set<string>();
		for (const o of step.ops) {
			const r = o as unknown as Record<string, unknown>;
			for (const f of ['film', 'body', 'hole', 'cut', 'fill', 'release']) if (typeof r[f] === 'string') ids.add(r[f] as string);
			for (const f of ['bodies', 'solder', 'adhesive']) if (Array.isArray(r[f])) for (const x of r[f] as string[]) ids.add(x);
		}
		this.idCache.set(k, ids);
		return ids;
	}
	private extCache = new Map<number, [number, number]>();
	/** Root-frame z extent of step k over the whole step (the root is the step's piece all step). */
	private stepExt(k: number): [number, number] {
		const hit = this.extCache.get(k);
		if (hit) return hit;
		const ix = this.ix!, ev = this.ev!;
		// sampled over the step, not only its ends: a ball placed as a sphere and reflowed to a lower cap in the same
		// step reaches beyond both end extents (it was cropped flat)
		const out: [number, number] = [Infinity, -Infinity];
		const tm = ev.timing(k);
		const ts = new Set<number>([0, 1, ...Array.from({ length: 11 }, (_x, i) => i / 10), ...tm.ops.flatMap((o) => [o.t0, o.t1, (o.t0 + o.t1) / 2])]);
		for (const t of ts) {
			const q = ev.evalAt(k, t);
			const e = asmExtent(ix, q, q.root);
			if (Number.isFinite(e[0]) && Number.isFinite(e[1])) { out[0] = Math.min(out[0], e[0]); out[1] = Math.max(out[1], e[1]); }
		}
		if (!Number.isFinite(out[0])) { out[0] = 0; out[1] = 1; }
		this.extCache.set(k, out);
		return out;
	}
	/** Root-frame z extent (step end state) of the bodies the step's ops name. */
	private targetsZ(k: number, step: Step): [number, number] | null {
		if (this.tzCache.has(k)) return this.tzCache.get(k)!;
		const ix = this.ix!, s1 = this.ev!.evalAt(k, 1);
		const ids = this.targetIds(k, step);
		const tree = treeXfs(s1, step.piece);
		let lo = Infinity, hi = -Infinity;
		for (const id of ids) {
			const b = ix.body.get(id), st = s1.bodies[id];
			const xf = b ? tree.get(b.piece)?.[0] : undefined;
			if (!b || !st?.on || !xf || b.kind === 'cut' || b.kind === 'hole' || (st.gone >= 1 && !st.keep.length)) continue;
			const [z0, z1] = zToRoot(xf, ...liveZ(ix, b, st));
			if (Number.isFinite(z0) && Number.isFinite(z1)) { lo = Math.min(lo, z0); hi = Math.max(hi, z1); }
		}
		const out: [number, number] | null = Number.isFinite(lo) ? [lo, hi] : null;
		this.tzCache.set(k, out);
		return out;
	}

	/** Grind-mark centre (V1 M8): the root carrier centre in world space, for every material of the view (L36 API when
	 * present: setGrindCenter / setGrindCentre). */
	/** Grind marks in the frame of the wafer that was ground (V2 M8): the root's centre when the last grind of the
	 * body ran on the current root; else the centre of the piece that was the root then (its wafer), and when that
	 * wafer has since been diced, the centre seen from one unit's grid position. Which unit a part came from is not in
	 * the data: view parameter, the unit nearest (0.35 R, 0.2 R) from the centre. */
	private grindCentre(view: ScaleView, local: THREE.Vector3, s?: SceneState, toScene?: (x: number, y: number) => THREE.Vector3) {
		const w = local.clone().applyMatrix4(view.inner.matrixWorld);
		const ix = this.ix;
		const tree = s && ix ? treeXfs(s, s.root) : null;
		const per = new Map<string, THREE.Vector3 | null>();
		const centreOf = (gr: string): THREE.Vector3 | null => {
			if (per.has(gr)) return per.get(gr)!;
			let out: THREE.Vector3 | null = null;
			const pc = ix?.piece.get(gr);
			const xf = tree?.get(gr)?.[0];
			if (pc && xf && toScene && gr !== s!.root) {
				let cx = 0, cy = 0;
				// a wafer of units (disk with a unit grid) that is no longer the root was diced (or its units placed); a
				// part without a wafer in the data (rect piece: a supplied die / bridge) is drawn as cut from a 300 mm wafer
				// (view parameter, marks orientation only)
				const car = pc.carrier;
				const disk = car.shape === 'disk' && !!pc.repeat;
				const R = car.shape === 'disk' && pc.repeat ? (v(car.diameter_mm) * 1000) / 2 : 150000;
				const px = disk ? v(pc.repeat!.pitch_x_um) : v(pc.unit.w_um), py = disk ? v(pc.repeat!.pitch_y_um) : v(pc.unit.d_um);
				if (R > 0 && px > 0 && py > 0) { cx = -Math.round((0.35 * R) / px) * px; cy = -Math.round((0.2 * R) / py) * py; }
				const [x, y] = xyTo(xf, cx, cy);
				out = toScene(x, y).applyMatrix4(view.inner.matrixWorld);
			}
			per.set(gr, out);
			return out;
		};
		for (const [id, bm] of view.bodies) {
			const bid = id.replace(/#lines$/, '');
			// no grind in this flow (a part supplied thinned, e.g. a bridge die): its own piece's wafer when it is one
			const own = ix?.body.get(bid)?.piece;
			const gr = s?.bodies[bid]?.grindRoot ?? (own && own !== s?.root ? own : undefined);
			const c = (gr && centreOf(gr)) || w;
			for (const pm of bm.mats) {
				const m = pm as ProcMaterial & { setGrindCenter?: (p: THREE.Vector3) => void; setGrindCentre?: (p: THREE.Vector3) => void };
				if (m.setGrindCenter) m.setGrindCenter(c);
				else m.setGrindCentre?.(c);
			}
		}
	}

	/** Tool parts that contain the camera are hidden, parts between the camera and its target are faded, and at the
	 * block / cell scale parts far outside the window are faded (V1 C1, M5). Pure in the current poses. */
	private toolVisibility(view: ScaleView, cam: THREE.Camera, target: THREE.Vector3, fit: THREE.Box3) {
		if (!view.tool) return;
		const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
		const dir = target.clone().sub(camPos);
		const dist = dir.length();
		const ray = new THREE.Ray(camPos, dir.normalize());
		const size = fit.getSize(new THREE.Vector3()).length();
		const near = fit.clone().expandByScalar(size * 0.6);
		const hit = new THREE.Vector3();
		const g = view.tool.actor.group;
		g.updateMatrixWorld(true);
		const worldBox = (mesh: THREE.Mesh): THREE.Box3 | null => {
			const geo = mesh.geometry;
			if (!geo) return null;
			if (!geo.boundingBox) geo.computeBoundingBox();
			const im = mesh as unknown as THREE.InstancedMesh;
			let bb: THREE.Box3 | null = null;
			if (im.isInstancedMesh) {
				if (!im.boundingBox) im.computeBoundingBox();
				bb = im.boundingBox ? im.boundingBox.clone() : null;
			} else bb = geo.boundingBox ? geo.boundingBox.clone() : null;
			if (!bb || bb.isEmpty()) return null;
			return bb.applyMatrix4(mesh.matrixWorld);
		};
		const test = (bb: THREE.Box3) => {
			const inside = bb.clone().expandByScalar(size * 0.01).containsPoint(camPos);
			const p = ray.intersectBox(bb, hit);
			const occl = !!p && camPos.distanceTo(p) < dist * 0.98;
			const far = view.scale !== 'work' && !bb.intersectsBox(near);
			return { inside, occl, far };
		};
		const fade = (mesh: THREE.Mesh, want: number) => {
			if (Array.isArray(mesh.material)) return;
			const ud = mesh.userData;
			if (!ud.__orig) ud.__orig = mesh.material;
			if (want >= 1) { mesh.material = ud.__orig; return; }
			// the faded copy is re-synced from the actor's live material every time (the actor animates the original; a
			// stale copy would make the frame depend on the visit history)
			const k = `__fade${want}`;
			const orig = ud.__orig as THREE.Material;
			const m = (ud[k] as THREE.Material | undefined) ?? orig.clone();
			if (ud[k]) m.copy(orig);
			m.transparent = true;
			m.opacity = Math.min(orig.opacity, want);
			m.depthWrite = false;
			ud[k] = m;
			mesh.material = m;
		};
		// actors that name their occluders (L37 / L38): only those parts are faded / hidden; the working element never
		const occ = g.userData.occluders as THREE.Object3D[] | undefined;
		if (Array.isArray(occ) && occ.length) {
			const setOp = g.userData.setOccluderOpacity as ((a: number) => void) | undefined;
			let any = false, anyFar = false;
			for (const o of occ) o.traverse((c) => {
				const mesh = c as THREE.Mesh;
				if (!mesh.isMesh) return;
				const bb = worldBox(mesh);
				if (!bb) return;
				const r = test(bb);
				mesh.visible = !r.inside;
				if (r.occl) any = true;
				if (r.far) anyFar = true;
				if (!setOp) fade(mesh, r.occl ? 0.15 : r.far ? 0.25 : 1);
			});
			if (setOp) setOp(any ? 0.15 : anyFar ? 0.25 : 1);
			return;
		}
		// other actors: any part
		g.traverse((o) => {
			const mesh = o as THREE.Mesh;
			if (!mesh.isMesh) return;
			const bb = worldBox(mesh);
			if (!bb) return;
			const r = test(bb);
			mesh.visible = !r.inside;
			fade(mesh, r.occl ? 0.15 : r.far ? 0.25 : 1);
		});
	}

	// ---------------------------------------------------------------- camera director

	private pose(view: ScaleView, step: Step, aspect: number, cam: THREE.PerspectiveCamera, dirIn?: THREE.Vector3): { pos: THREE.Vector3; target: THREE.Vector3 } | null {
		const b = view.built;
		if (!b) return null;
		const cv = step.view.camera?.[view.scale];
		const dir = dirIn ?? (cv ? DIRS[cv.view] : DIRS[view.scale]) ?? DIRS.iso;
		const box = b.fit.clone();
		// wafer scale: the workpiece plus the tool's business end (actor.focusBox, tool frame um), never the machine
		if (view.scale === 'work' && view.tool?.last && view.tool.actor.focusBox) {
			try {
				const l = view.tool.last;
				const fb = view.tool.actor.focusBox(l.t, l.args, l.ctx);
				if (fb && !fb.isEmpty()) {
					view.toolRoot.updateMatrixWorld(true);
					// the tool's contact region may extend the frame, but never shrink the workpiece below half of it
					const lim = b.fit.clone().expandByScalar(b.fit.getSize(new THREE.Vector3()).length() * 0.5);
					const w = fb.clone().applyMatrix4(view.toolRoot.matrixWorld).intersect(lim);
					if (!w.isEmpty()) box.union(w);
				}
			} catch (e) {
				console.warn('[process3d] focusBox failed', e);
			}
		}
		const c = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		// projected half extents perpendicular to the view direction
		const up = new THREE.Vector3(0, 1, 0);
		const right = new THREE.Vector3().crossVectors(up, dir).normalize();
		if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
		const vup = new THREE.Vector3().crossVectors(dir, right).normalize();
		let hw = 0, hh = 0, hd = 0;
		for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) {
			const p = new THREE.Vector3(sx * size.x, sy * size.y, sz * size.z);
			hw = Math.max(hw, Math.abs(p.dot(right)));
			hh = Math.max(hh, Math.abs(p.dot(vup)));
			hd = Math.max(hd, Math.abs(p.dot(dir)));
		}
		const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
		// the near face of the box (hd in front of the center) must fit: distance to it, plus hd
		const dist = (Math.max(hh / tanV, hw / (tanV * aspect)) * 1.12) / (cv?.zoom ?? 1) + hd;
		return { pos: c.clone().addScaledVector(dir, dist), target: c };
	}

	private direct(s: SceneState, step: Step, primary: ScaleId) {
		const view = this.views[primary];
		const aspect = this.mainRect.w / Math.max(1, this.mainRect.h);
		const near = (cam: THREE.PerspectiveCamera, d: number) => {
			cam.near = Math.max(d / 2000, 1e-4);
			cam.far = d * 50 + 10;
			cam.updateProjectionMatrix();
		};
		// current view direction (kept across scale changes and re-fits)
		const haveDir = Object.keys(this.poses).length > 0;
		const dir = haveDir ? this.camera.position.clone().sub(this.controls.target).normalize() : undefined;
		const stored = this.poses[primary];
		let set: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
		if (!stored || this.refit) {
			// first use of this scale (or Frame): fit once with the current framing rule
			const p = this.pose(view, step, aspect, this.camera, dir);
			if (p) set = { pos: p.pos.clone(), target: p.target.clone() };
		} else {
			const f = this.follow(stored, view, this.camera, aspect, step);
			if (f) set = f;
			else if (primary !== this.lastPrimary) set = { pos: stored.pos.clone(), target: stored.target.clone() }; // re-entering a scale
		}
		if (set) this.setPose(set.pos, set.target);
		// otherwise the camera is not touched at all (no reset between steps, Wentao 2026-10-23)
		near(this.camera, this.camera.position.distanceTo(this.controls.target));
		let pipTarget: THREE.Vector3 | null = null;
		if (this.pipScale) {
			const pv = this.views[this.pipScale];
			const sa = this.secRect ? this.secRect.w / Math.max(1, this.secRect.h) : PIP.w / PIP.h;
			// the secondary keeps its own view direction once it has one (split layouts: independent cameras)
			const sdir = Object.keys(this.pipPoses).length ? this.pipCam.position.clone().sub(this.controls2.target).normalize() : dir;
			let pp = this.pipPoses[this.pipScale];
			if (!pp || this.refitSec) {
				const f = this.pose(pv, step, sa, this.pipCam, sdir);
				if (f) { pp = { pos: f.pos.clone(), target: f.target.clone(), ref: this.workBox(pv) }; this.pipPoses[this.pipScale] = pp; }
			} else {
				const f = this.follow(pp, pv, this.pipCam, sa, step);
				if (f) { pp = f; this.pipPoses[this.pipScale] = pp; }
			}
			if (pp) {
				this.pipCam.position.copy(pp.pos);
				this.controls2.target.copy(pp.target);
				this.pipCam.lookAt(pp.target);
				near(this.pipCam, pp.pos.distanceTo(pp.target));
				pipTarget = pp.target;
			}
		}
		this.refit = false;
		this.refitSec = false;
		// tool parts: hide / fade what hides the workpiece (per viewport camera)
		this.camera.updateMatrixWorld(true);
		this.pipCam.updateMatrixWorld(true);
		if (view.built) this.toolVisibility(view, this.camera, this.controls.target, view.built.fit);
		if (this.pipScale && pipTarget && this.views[this.pipScale].built) this.toolVisibility(this.views[this.pipScale], this.pipCam, pipTarget, this.views[this.pipScale].built!.fit);
		// share of the frame the workpiece box covers (render check, V1 C1)
		if (view.built) {
			const f = view.built.fit;
			let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
			for (const sx of [f.min.x, f.max.x]) for (const sy of [f.min.y, f.max.y]) for (const sz of [f.min.z, f.max.z]) {
				const q = new THREE.Vector3(sx, sy, sz).applyMatrix4(view.pivot.matrixWorld).project(this.camera);
				x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
			}
			const cx = (a: number) => Math.max(-1, Math.min(1, a));
			this.stats.workFrac = Math.max(0, cx(x1) - cx(x0)) * Math.max(0, cx(y1) - cx(y0)) / 4;
		}
	}

	// ---------------------------------------------------------------- render

	requestRender() {
		if (this.pending || this.disposed) return;
		this.pending = true;
		requestAnimationFrame(() => {
			this.pending = false;
			if (this.disposed) return;
			this.controls.update();
			// orbiting: keep the occluding-tool fade in step with the camera
			const v = this.views[this.primary];
			if (v.built && v.tool) { this.camera.updateMatrixWorld(true); this.toolVisibility(v, this.camera, this.controls.target, v.built.fit); }
			const sv = this.pipScale ? this.views[this.pipScale] : null;
			if (sv?.built && sv.tool) { this.pipCam.updateMatrixWorld(true); this.toolVisibility(sv, this.pipCam, this.controls2.target, sv.built.fit); }
			this.render();
		});
	}

	render() {
		if (this.disposed) return;
		const t0 = performance.now();
		const R = this.renderer;
		R.info.reset();
		R.setScissorTest(false);
		R.setViewport(0, 0, this.w, this.h);
		R.setClearColor(this.bg, 1);
		R.clear();
		const main = this.views[this.primary];
		const vp = (r: Rect2) => { const y = this.h - r.y - r.h; R.setScissor(r.x, y, r.w, r.h); R.setViewport(r.x, y, r.w, r.h); };
		R.setScissorTest(true);
		vp(this.mainRect);
		R.render(main.scene, this.camera);
		let pip: Overlay['pip'] = null;
		const sr = this.secRect;
		if (this.pipScale && sr) {
			vp(sr);
			// the inset sits on a slightly lifted background; split views share the page background
			if (this.effLayout === 'inset') {
				R.setClearColor(this.bg.clone().offsetHSL(0, 0, this.bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? -0.05 : 0.05), 1);
				R.clear();
				R.setClearColor(this.bg, 1);
			}
			R.render(this.views[this.pipScale].scene, this.pipCam);
			pip = { ...sr, label: `${this.pipScale}${this.illFor(this.pipScale) ? '' : ' · actual'}` };
		}
		R.setScissorTest(false);
		let inst = 0, bodies = 0;
		for (const v of [main, this.pipScale ? this.views[this.pipScale] : null]) if (v) for (const b of v.bodies.values()) { inst += b.instances; bodies++; }
		this.stats = { ...this.stats, frames: this.stats.frames + 1, calls: R.info.render.calls, triangles: R.info.render.triangles, instances: inst, geometries: R.info.memory.geometries, frameMs: performance.now() - t0, bodies };
		this.onStats(this.stats);
		this.onOverlay(this.overlay(pip));
		// (the secondary may also be the tool's view: its fade copies follow its own camera)
	}

	private overlay(pip: Overlay['pip']): Overlay {
		const v = this.views[this.primary];
		const b = v.built;
		const out: Overlay = { scaleBar: null, ticks: [], pip, main: { ...this.mainRect }, layout: this.effLayout, primary: this.primary, note: '' };
		if (!b) return out;
		// lateral scale bar at the orbit target
		const d = this.camera.position.distanceTo(this.controls.target);
		const wpp = (2 * d * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / Math.max(1, this.mainRect.h);
		const umpp = wpp * b.umPerUnit;
		const target = 110 * umpp;
		const p10 = Math.pow(10, Math.floor(Math.log10(target)));
		const nice = [1, 2, 5, 10].map((m) => m * p10).filter((x) => x <= target).pop() ?? p10;
		out.scaleBar = { px: nice / umpp, label: nice >= 1000 ? `${nice / 1000} mm` : nice >= 1 ? `${nice} um` : `${nice * 1000} nm` };
		// z ruler on the left edge of the section (block / cell)
		if (b.ticksAt && this.primary !== 'work') {
			const zm = b.zm as ZM;
			const z0 = zm.z0, z1 = zm.z1;
			let zs: number[];
			if (zm instanceof ZMapP && zm.illustrative) zs = zm.breaks;
			else {
				const span = z1 - z0;
				const st0 = Math.pow(10, Math.floor(Math.log10(span / 6)));
				const step = [1, 2, 5, 10].map((m) => m * st0).find((x) => span / x <= 8) ?? st0 * 10;
				zs = [];
				for (let z = Math.ceil(z0 / step) * step; z <= z1 + 1e-9; z += step) zs.push(z);
			}
			const tmp = new THREE.Vector3();
			let lastY = Infinity;
			const ticks: Overlay['ticks'] = [];
			for (const z of zs) {
				tmp.set(b.ticksAt.x, zm.map(z), b.ticksAt.z).applyMatrix4(v.inner.matrixWorld).project(this.camera);
				const x = this.mainRect.x + ((tmp.x + 1) / 2) * this.mainRect.w, y = this.mainRect.y + ((1 - tmp.y) / 2) * this.mainRect.h;
				if (Math.abs(y - lastY) < 13) continue;
				lastY = y;
				ticks.push({ x, y, label: `${Math.round(z * 10) / 10}` });
			}
			out.ticks = ticks;
			out.note = this.illFor(this.primary) ? 'illustrative: z mapped, true-um labels' : 'actual: true scale';
		} else out.note = this.illFor(this.primary) ? 'illustrative: stack exaggerated' : 'actual: true scale';
		return out;
	}

	private resize() {
		const r = this.el.getBoundingClientRect();
		this.w = Math.max(1, Math.floor(r.width));
		this.h = Math.max(1, Math.floor(r.height));
		this.renderer.setSize(this.w, this.h, false);
		this.layoutRects();
		if (this.state) this.update(this.state);
		else this.requestRender();
	}

	private pDown = (e: PointerEvent) => {
		this.down = { x: e.clientX, y: e.clientY };
	};
	private pUp = (e: PointerEvent, which: 'main' | 'sec' = 'main') => {
		const d = this.down;
		this.down = null;
		if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
		const r = this.renderer.domElement.getBoundingClientRect();
		const x = e.clientX - r.left, y = e.clientY - r.top;
		const vr = which === 'sec' && this.secRect ? this.secRect : this.mainRect;
		const sc = which === 'sec' && this.pipScale ? this.pipScale : this.primary;
		const ndc = new THREE.Vector2(((x - vr.x) / vr.w) * 2 - 1, -((y - vr.y) / vr.h) * 2 + 1);
		const v = this.views[sc];
		this.ray.setFromCamera(ndc, which === 'sec' ? this.pipCam : this.camera);
		const hit = this.ray.intersectObjects([v.inner, v.toolRoot], true)[0];
		if (!hit) return this.onPick(null);
		let o: THREE.Object3D | null = hit.object;
		while (o && !o.userData.body && o !== v.toolRoot) o = o.parent;
		if (o?.userData.body) return this.onPick({ kind: 'body', id: o.userData.body, x, y, text: hit.object.userData.exag });
		if (v.tool) return this.onPick({ kind: 'tool', id: v.tool.id, x, y, text: v.tool.actor.pick?.(hit.object) ?? v.tool.actor.name });
		this.onPick(null);
	};

	/** Diagnostics: screen-space box (CSS px) of bodies in the main view (constant-aspect checks). */
	screenBox(ids: string[]): Record<string, { x0: number; x1: number; y0: number; y1: number } | null> {
		const v = this.views[this.primary];
		const out: Record<string, { x0: number; x1: number; y0: number; y1: number } | null> = {};
		this.camera.updateMatrixWorld(true);
		v.pivot.updateMatrixWorld(true);
		for (const id of ids) {
			const bm = v.bodies.get(id);
			if (!bm) { out[id] = null; continue; }
			const box = new THREE.Box3().setFromObject(bm.group, true);
			if (box.isEmpty()) { out[id] = null; continue; }
			let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
			for (const sx of [box.min.x, box.max.x]) for (const sy of [box.min.y, box.max.y]) for (const sz of [box.min.z, box.max.z]) {
				const q = new THREE.Vector3(sx, sy, sz).project(this.camera);
				const X = this.mainRect.x + ((q.x + 1) / 2) * this.mainRect.w, Y = this.mainRect.y + ((1 - q.y) / 2) * this.mainRect.h;
				x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
			}
			out[id] = { x0, x1, y0, y1 };
		}
		return out;
	}

	/** Diagnostics: meshes per body (primary and PiP scenes) and the tool's mesh count. */
	debugScene(): Record<string, unknown> {
		const count = (o: THREE.Object3D) => {
			let n = 0, tris = 0;
			o.traverse((c) => {
				const m = c as THREE.Mesh;
				if (!m.isMesh || !m.visible) return;
				n++;
				const g = m.geometry;
				const per = g.index ? g.index.count / 3 : (g.getAttribute('position')?.count ?? 0) / 3;
				tris += per * ((m as unknown as THREE.InstancedMesh).isInstancedMesh ? (m as unknown as THREE.InstancedMesh).count : 1);
			});
			return `${n} meshes ${Math.round(tris)} tris`;
		};
		const out: Record<string, unknown> = {};
		for (const sc of [this.primary, this.pipScale]) {
			if (!sc) continue;
			const v = this.views[sc];
			let all = 0, trans = 0;
			v.scene.traverse((c) => {
				const m = c as THREE.Mesh;
				if (!m.isMesh || !m.visible) return;
				const g = m.geometry;
				const per = g.index ? g.index.count / 3 : (g.getAttribute('position')?.count ?? 0) / 3;
				all += per * ((m as unknown as THREE.InstancedMesh).isInstancedMesh ? (m as unknown as THREE.InstancedMesh).count : 1);
				if (((m.material as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0) trans++;
			});
			out[sc + ':total'] = { tris: Math.round(all), transmissive: trans };
			out[sc] = { bodies: [...v.bodies.entries()].map(([id, b]) => [id, count(b.group)]).sort((a, b) => parseInt(String(b[1]).split(' ')[2]) - parseInt(String(a[1]).split(' ')[2])).slice(0, 8), tool: v.tool ? [v.tool.id, count(v.tool.actor.group)] : null };
		}
		return out;
	}

	dispose() {
		this.disposed = true;
		this.ro.disconnect();
		this.controls.dispose();
		this.controls2.dispose();
		for (const v of Object.values(this.views)) v.clear();
		this.env?.dispose();
		this.mainEl.remove();
		this.secEl.remove();
		this.renderer.dispose();
	}
}

/** Polygon offset by stacking rank (-1: off). */
function depthRank(bm: BodyMesh, rank: number) {
	for (let i = 0; i < bm.used; i++) {
		const m = bm.mats[i].material;
		m.polygonOffset = rank >= 0;
		m.polygonOffsetFactor = rank >= 0 ? -rank : 0;
		m.polygonOffsetUnits = rank >= 0 ? -4 * rank : 0;
	}
}
const MERGE_TRIS = 200000;
/** Bake a body's part meshes (instances expanded) into one non-indexed position / normal mesh on the first slot. */
function mergeBody(bm: BodyMesh) {
	const parts = bm.group.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
	if (parts.length < 2 || parts.length !== bm.group.children.length) return;
	let verts = 0;
	for (const m of parts) {
		const g = m.geometry, n = g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0);
		verts += n * ((m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1);
	}
	if (!(verts > 0) || verts / 3 > MERGE_TRIS) return;
	const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3);
	const M = new THREE.Matrix4(), N = new THREE.Matrix3(), v = new THREE.Vector3();
	let o = 0;
	let exag: string | undefined;
	for (const m of parts) {
		exag ??= m.userData.exag;
		const g = m.geometry, P = g.getAttribute('position'), Q = g.getAttribute('normal'), I = g.index;
		const im = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh) : null;
		const count = im ? im.count : 1;
		const n = I ? I.count : P.count;
		for (let c = 0; c < count; c++) {
			if (im) im.getMatrixAt(c, M);
			else M.copy(m.matrix);
			N.getNormalMatrix(M);
			for (let i = 0; i < n; i++) {
				const k = I ? I.getX(i) : i;
				v.fromBufferAttribute(P, k).applyMatrix4(M);
				pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
				if (Q) { v.fromBufferAttribute(Q, k).applyMatrix3(N).normalize(); nor[o] = v.x; nor[o + 1] = v.y; nor[o + 2] = v.z; }
				o += 3;
			}
		}
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
	geo.computeBoundingSphere();
	const clip = bm.clipWin.length > 0;
	for (const c of [...bm.group.children]) bm.group.remove(c);
	for (const g of bm.owned) g.dispose();
	for (const pm of bm.clipWin) pm.setClipping(null);
	bm.owned = [geo];
	bm.used = 0;
	const pm = slot(bm);
	bm.clipWin = clip ? [pm] : [];
	const mesh = new THREE.Mesh(geo, pm.material);
	mesh.userData.body = parts[0].userData.body;
	if (exag) mesh.userData.exag = exag;
	bm.group.add(mesh);
}

interface BumpScale { z0: number; y0: number; s: number; f: number; tip: string; pillar: boolean }
/** Per bump site grid (posts and solder sharing a site): the stack's z range mapped linearly (s = mapped height /
 * true height) and one lateral factor f = s clamped to 0.48 of the pitch (V2 n1 / m4). */
function isTallPost(b: BodyPrims['body']): boolean {
	return b.kind === 'post' && (b.role === 'pillar' || v(b.h_um) >= 0.5 * v(b.d_um));
}
/** Openings at a site widen with its bump only when a pillar stands in them (resist holes), not around flat lands. */
function bumpScales(prims: BodyPrims[], zm: ZM, crop: [number, number]): Map<string, BumpScale> {
	const acc = new Map<string, { z0: number; z1: number; r: number; px: number; py: number; pillar: boolean }>();
	for (const p of prims) {
		// pads, lands, UBM and finishes keep their true diameter (final F1); pillars and solder scale
		if (p.body.kind !== 'solder' && !isTallPost(p.body)) continue;
		for (const b of p.bands) {
			const ss = b.samples;
			if (ss.length < 2) continue;
			const a = acc.get(b.grid.key) ?? { z0: Infinity, z1: -Infinity, r: 0, px: b.grid.px, py: b.grid.py, pillar: false };
			if (p.body.kind === 'post') a.pillar = true;
			a.z0 = Math.min(a.z0, Math.max(ss[0].z, crop[0]));
			a.z1 = Math.max(a.z1, Math.min(ss[ss.length - 1].z, crop[1]));
			for (const x of ss) a.r = Math.max(a.r, x.rout);
			acc.set(b.grid.key, a);
		}
	}
	const out = new Map<string, BumpScale>();
	for (const [k, a] of acc) {
		if (!(a.z1 > a.z0) || !(a.r > 0)) continue;
		const y0 = zm.map(a.z0), s = (zm.map(a.z1) - y0) / (a.z1 - a.z0);
		if (!(s > 0) || !Number.isFinite(s)) continue;
		const lim = (0.4 * Math.min(a.px, a.py)) / a.r;
		const f = Math.min(s, Math.max(lim, 1));
		const fmt = (x: number) => (x >= 10 ? x.toFixed(0) : x.toFixed(2));
		const tip = f === s ? `illustrative: bump drawn x${fmt(s)} (aspect kept)` : `illustrative: bump drawn x${fmt(s)} in z, x${fmt(f)} laterally (clamp 0.4 pitch)`;
		out.set(k, { z0: a.z0, y0, s, f, tip, pillar: a.pillar });
	}
	return out;
}
