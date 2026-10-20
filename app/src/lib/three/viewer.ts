// One WebGL renderer, one shared camera, N family slots drawn side by side with scissor viewports (compare view
// shares the camera, so cameras and lateral scale are synchronized by construction). Render on demand only.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FamilyScene, HATCH, itemColor, setDash, sharedMaterials, unitGeometries, type Lod, type ViewState } from './build';
import { defaultCut, defaultXray, type ArrModel, type Item } from './model';
import type { Family, Inset } from './types';

export type Preset = 'iso' | 'front' | 'top' | 'bottom';

export interface Rect { x: number; y: number; w: number; h: number }
export interface OvLabel { id: string; ax: number; ay: number; lx: number; ly: number; w: number; text: string; full: string; template: boolean }
export interface OvTick { x: number; y: number; label: string }
export interface SlotOverlay {
	rect: Rect;
	name: string;
	labels: OvLabel[];
	ruler: { pts: [number, number][]; ticks: OvTick[] } | null;
	scale: { px: number; label: string } | null;
}
export interface Overlay {
	slots: SlotOverlay[];
	cell: { rect: Rect; arr: ArrModel } | null;
	pip: { rect: Rect; label: string } | null;
}
export interface Stats { calls: number; triangles: number; lines: number; instances: number; geometries: number; textures: number; ms: number }

const n3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
const DIRS: Record<string, THREE.Vector3> = {
	iso: n3(0.95, 0.8, 1.35),
	front: n3(0, 0.0001, 1),
	back: n3(0, 0.0001, -1),
	right: n3(1, 0.0001, 0),
	left: n3(-1, 0.0001, 0),
	top: n3(0, 1, 0.0001),
	bottom: n3(0, -1, 0.0001)
};
const FOV = 30;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const MIN_D_PX = 3; // instance an array only when one bump/via diameter spans at least this many pixels (else pad slab)
const MIN_P_PX = 5; // ... and one pitch at least this many pixels (dense fields read as a surface, no moire)
const CONTENT_ASPECT = 2.2; // typical width/height of a package on screen, for choosing the compare grid
const HATCH_ZOOM = 0.2; // template hatch appears when the view spans less than this share of the package
const HATCH_STRENGTH = 0.1;
const CELL_PX = 190;
const PIP = { w: 280, h: 160 };

interface Slot { fs: FamilyScene; scene: THREE.Scene; light: THREE.DirectionalLight; rect: Rect }

/** Camera position that frames a box seen along dir (pointing from the target toward the camera). */
function fitPose(box: THREE.Box3, dir: THREE.Vector3, aspect: number, margin: number): { pos: THREE.Vector3; target: THREE.Vector3 } {
	const c = box.getCenter(new THREE.Vector3());
	const fwd = dir.clone().normalize();
	const up = Math.abs(fwd.y) > 0.99 ? new THREE.Vector3(0, 0, -Math.sign(fwd.y)) : new THREE.Vector3(0, 1, 0);
	const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
	const u = new THREE.Vector3().crossVectors(fwd, right).normalize();
	const th = TAN * aspect;
	let d = 0;
	for (let i = 0; i < 8; i++) {
		const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c);
		const zf = p.dot(fwd);
		d = Math.max(d, (Math.abs(p.dot(right)) * margin) / th + zf, (Math.abs(p.dot(u)) * margin) / TAN + zf);
	}
	d = Math.max(d, 1e-4);
	return { pos: c.clone().addScaledVector(fwd, d), target: c };
}

/** Tighten a pose: recenter the projected box in the view and scale the distance so it fills 1/margin of it. */
function refinePose(cam: THREE.PerspectiveCamera, box: THREE.Box3, pos: THREE.Vector3, target: THREE.Vector3, margin: number) {
	const v = new THREE.Vector3();
	for (let it = 0; it < 5; it++) {
		cam.position.copy(pos);
		cam.lookAt(target);
		cam.updateMatrixWorld();
		cam.updateProjectionMatrix();
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, ok = true;
		for (let i = 0; i < 8; i++) {
			v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
			if (!(v.z > -1 && v.z < 1)) { ok = false; break; }
			x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
		}
		if (!ok) return;
		const d = pos.distanceTo(target);
		const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
		const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
		const shift = right.multiplyScalar(((x0 + x1) / 2) * d * TAN * cam.aspect).add(up.multiplyScalar(((y0 + y1) / 2) * d * TAN));
		target.add(shift);
		pos.add(shift);
		const ext = Math.max((x1 - x0) / 2, (y1 - y0) / 2) * margin;
		if (!(ext > 1e-6)) return;
		pos.sub(target).multiplyScalar(Math.min(4, Math.max(0.25, ext))).add(target);
	}
}

export class Viewer {
	readonly renderer: THREE.WebGLRenderer;
	readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 1000);
	readonly controls: OrbitControls;
	private slots: Slot[] = [];
	private el: HTMLElement;
	private ro: ResizeObserver;
	private pending = false;
	private disposed = false;
	private w = 1;
	private h = 1;
	private bg = new THREE.Color('#0d0d0d');
	private cellBg = new THREE.Color('#171717');
	state: ViewState = { illustrative: true, section: true, axis: 'y', cut: 0, explode: 0, xray: [], selected: null };
	labels = true;
	cellArray: string | null = null;
	cellOn = false;
	pipInset: string | null = null;
	/** Compare view: scale each family to the same on-screen size (false: one common lateral scale). */
	fitEach = true;
	stats: Stats = { calls: 0, triangles: 0, lines: 0, instances: 0, geometries: 0, textures: 0, ms: 0 };
	onOverlay: (o: Overlay) => void = () => {};
	onPick: (it: Item | null, slot: number, x: number, y: number) => void = () => {};
	onStats: (s: Stats) => void = () => {};
	private cellScene = new THREE.Scene();
	private cellCam = new THREE.PerspectiveCamera(FOV, 1, 0.0001, 10);
	private cellLight = new THREE.DirectionalLight(0xffffff, 1.6);
	private cellKey = '';
	private pipCam = new THREE.PerspectiveCamera(FOV, PIP.w / PIP.h, 0.0001, 100);
	private down: { x: number; y: number } | null = null;
	private ray = new THREE.Raycaster();

	constructor(el: HTMLElement, canvas: HTMLCanvasElement) {
		this.el = el;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		this.renderer.info.autoReset = false;
		this.renderer.autoClear = false;
		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.15;
		this.controls.screenSpacePanning = true;
		this.controls.zoomToCursor = true;
		this.controls.addEventListener('change', () => this.requestRender());
		this.cellScene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.4), this.cellLight);
		canvas.addEventListener('pointerdown', this.pDown);
		canvas.addEventListener('pointerup', this.pUp);
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(el);
		this.resize();
	}

	setBackground(color: string) {
		this.bg = new THREE.Color(color.trim() || '#0d0d0d');
		this.cellBg = this.bg.clone().offsetHSL(0, 0, this.bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? -0.04 : 0.05);
		this.requestRender();
	}

	/** Replace the families on screen; slots of families that stay are kept. */
	setFamilies(fams: Family[]) {
		const keep = new Map(this.slots.map((s) => [s.fs.model.family, s]));
		const next: Slot[] = [];
		for (const f of fams) {
			const old = keep.get(f);
			if (old) { next.push(old); keep.delete(f); continue; }
			const fs = new FamilyScene(f);
			const scene = new THREE.Scene();
			const light = new THREE.DirectionalLight(0xffffff, 1.7);
			scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.5), light, fs.group);
			next.push({ fs, scene, light, rect: { x: 0, y: 0, w: 1, h: 1 } });
		}
		for (const s of keep.values()) s.fs.dispose();
		this.slots = next;
		this.layout();
		this.rebuild();
	}

	get families(): FamilyScene[] {
		return this.slots.map((s) => s.fs);
	}

	setState(p: Partial<ViewState>) {
		const onlySel = Object.keys(p).length === 1 && 'selected' in p;
		this.state = { ...this.state, ...p };
		if (onlySel) {
			for (const s of this.slots) s.fs.setSelected(this.state.selected);
			this.requestRender();
			return;
		}
		this.rebuild();
	}

	setFitEach(on: boolean) {
		this.fitEach = on;
		this.rebuild();
		this.preset('iso');
	}

	/** Compare view: per-family scale (fit each or common) and section base (each family's own default cut). */
	private applySlotFrames() {
		const multi = this.slots.length > 1;
		const flat = { ...this.state, explode: 0, section: false };
		const sizes = this.slots.map((s) => {
			const b = s.fs.bounds(flat);
			return b.isEmpty() ? 1 : b.getSize(new THREE.Vector3()).length();
		});
		const S = Math.max(...sizes, 1e-6);
		this.slots.forEach((s, i) => {
			s.fs.setScale(multi && this.fitEach ? S / sizes[i] : 1);
			s.fs.cutBase = multi ? defaultCut(s.fs.model.family, this.state.axis) : 0;
		});
	}

	private rebuild() {
		// The z map depends on the scale mode; build once so bounds use the current mode, then size and build.
		for (const s of this.slots) if (s.fs.zmap.illustrative !== this.state.illustrative) s.fs.build(this.state);
		this.applySlotFrames();
		for (const s of this.slots) s.fs.build(this.state);
		this.cellKey = '';
		this.updateLod();
		this.requestRender();
	}

	private resize() {
		const r = this.el.getBoundingClientRect();
		this.w = Math.max(1, Math.floor(r.width));
		this.h = Math.max(1, Math.floor(r.height));
		this.renderer.setSize(this.w, this.h, false);
		this.layout();
		this.updateLod();
		this.requestRender();
	}

	private layout() {
		const n = Math.max(1, this.slots.length);
		// Landscape tiles: the grid that gives each package the largest on-screen size.
		let cols = 1, best = -1;
		for (let c = 1; c <= n; c++) {
			const r = Math.ceil(n / c);
			const score = Math.min(this.w / c, (this.h / r) * CONTENT_ASPECT);
			if (score > best + 1) { best = score; cols = c; }
		}
		const rows = Math.ceil(n / cols);
		const cw = Math.floor(this.w / cols), ch = Math.floor(this.h / rows);
		this.slots.forEach((s, i) => {
			s.rect = { x: (i % cols) * cw, y: Math.floor(i / cols) * ch, w: cw - (cols > 1 ? 1 : 0), h: ch - (rows > 1 ? 1 : 0) };
		});
		this.camera.aspect = cw / ch;
		this.camera.updateProjectionMatrix();
	}

	requestRender() {
		if (this.pending || this.disposed) return;
		this.pending = true;
		requestAnimationFrame(this.frame);
	}

	private frame = () => {
		this.pending = false;
		if (this.disposed) return;
		this.controls.update(); // dispatches 'change' while damping, which schedules the next frame
		this.updateLod();
		this.render();
	};

	private updateNearFar() {
		const d = this.camera.position.distanceTo(this.controls.target);
		this.camera.near = Math.max(d / 400, 1e-5);
		this.camera.far = d * 20 + 400;
		this.camera.updateProjectionMatrix();
	}

	/** World units per pixel at the orbit target. */
	wpp(rectH: number): number {
		const d = this.camera.position.distanceTo(this.controls.target);
		return (2 * d * TAN) / Math.max(1, rectH);
	}

	private updateLod() {
		if (!this.slots.length) return;
		const r = this.slots[0].rect;
		const wppW = this.wpp(r.h);
		if (!(wppW > 0)) return;
		let changed = false;
		for (const s of this.slots) {
			// Local units per pixel and the orbit target in this family's coordinates.
			const wpp = wppW / s.fs.scale;
			const t = this.controls.target.clone().divideScalar(s.fs.scale);
			const hw = Math.max(r.w, r.h) * wpp * 0.75;
			changed = s.fs.updateArrays((a): Lod => {
				if ((2 * a.r) / wpp < MIN_D_PX || a.pitch / wpp < MIN_P_PX) return { mode: 'slab', x0: 0, x1: 0, y0: 0, y1: 0 };
				const q = Math.max(a.pitch * 8, hw / 4);
				const cx = t.x, cy = -t.z;
				return { mode: 'zoom', x0: Math.floor((cx - hw) / q) * q, x1: Math.ceil((cx + hw) / q) * q, y0: Math.floor((cy - hw) / q) * q, y1: Math.ceil((cy + hw) / q) * q };
			}) || changed;
		}
		if (changed) this.requestRender();
	}

	render() {
		const t0 = performance.now();
		const R = this.renderer;
		R.info.reset();
		this.updateNearFar();
		R.setScissorTest(true);
		R.setViewport(0, 0, this.w, this.h);
		R.setScissor(0, 0, this.w, this.h);
		R.setClearColor(this.bg, 1);
		R.clear();
		for (const s of this.slots) {
			const { x, y, w, h } = s.rect;
			if (w < 2 || h < 2) continue;
			this.camera.aspect = w / h;
			this.camera.updateProjectionMatrix();
			R.setViewport(x, this.h - y - h, w, h);
			R.setScissor(x, this.h - y - h, w, h);
			s.light.position.copy(this.camera.position).sub(this.controls.target).normalize().add(new THREE.Vector3(0.2, 0.6, 0.1));
			const wppL = this.wpp(h) / s.fs.scale;
			HATCH.value = (wppL * h) / Math.max(1e-9, s.fs.lateral) < HATCH_ZOOM ? HATCH_STRENGTH : 0;
			setDash(wppL);
			R.render(s.scene, this.camera);
		}
		const ov: Overlay = { slots: [], cell: null, pip: null };
		ov.pip = this.renderPip();
		ov.cell = this.renderCell();
		R.setScissorTest(false);
		for (const s of this.slots) ov.slots.push(this.slotOverlay(s));
		const info = R.info;
		this.stats = {
			calls: info.render.calls,
			triangles: info.render.triangles,
			lines: info.render.lines,
			instances: this.slots.reduce((a, s) => a + s.fs.instanceCount, 0),
			geometries: info.memory.geometries,
			textures: info.memory.textures,
			ms: performance.now() - t0
		};
		this.onOverlay(ov);
		this.onStats(this.stats);
	}

	// ---- camera ---------------------------------------------------------------------------------------------
	private fit(box: THREE.Box3, dir: THREE.Vector3, margin = 1.12) {
		const { pos, target } = fitPose(box, dir, this.camera.aspect, margin);
		this.camera.up.set(0, 1, 0);
		refinePose(this.camera, box, pos, target, margin);
		this.controls.target.copy(target);
		this.camera.position.copy(pos);
		this.camera.lookAt(target);
		this.controls.update();
		this.updateLod();
		this.requestRender();
	}

	private allBounds(sectionTrim: boolean): THREE.Box3 {
		const out = new THREE.Box3();
		for (const s of this.slots) {
			if (!sectionTrim || !this.state.section) { out.union(s.fs.world(s.fs.bounds(this.state))); continue; }
			for (const it of s.fs.model.items.values()) {
				const b = s.fs.sceneBox(it.box, it.group, this.state);
				if (b) out.union(s.fs.world(b));
			}
		}
		if (out.isEmpty()) out.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
		return out;
	}

	/** Direction looking at the section face (front for a y-normal plane, right for an x-normal plane). */
	private sectionDir(): THREE.Vector3 {
		return this.state.axis === 'x' ? DIRS.right : DIRS.front;
	}

	preset(p: Preset) {
		const b = this.allBounds(true); // visible (section-trimmed) content only
		// Leave room for the z ruler drawn beside the package (left of a y-section, in front of an x-section).
		const lat = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
		const room = this.slots.length > 1 ? 0.14 : 0.07; // compare panes are narrower: more room for tick text
		if (this.state.axis === 'y') b.min.x -= room * lat;
		else b.max.z += room * lat;
		if (p === 'front' && this.state.section) {
			if (this.state.axis === 'y') b.min.z = b.max.z;
			else b.min.x = b.max.x;
		}
		this.fit(b, p === 'front' ? this.sectionDir() : DIRS[p], p === 'iso' ? 1.15 : 1.1);
	}

	frameItem(id: string | null) {
		if (!id) { this.preset('iso'); return; }
		for (const s of this.slots) {
			const b0 = s.fs.itemBox(id, this.state);
			if (!b0) continue;
			const b = s.fs.world(b0);
			const dir = this.camera.position.clone().sub(this.controls.target).normalize();
			const size = b.getSize(new THREE.Vector3());
			const m = Math.max(size.x, size.y, size.z) * 0.15;
			b.expandByVector(new THREE.Vector3(m, m, m));
			this.fit(b, dir, 1.3);
			return;
		}
	}

	/** View normal to the section face of an interconnect array, about 24 pitches wide. */
	frameArray(id: string, slot = 0) {
		const s = this.slots[slot];
		const a = s?.fs.model.arrays.find((x) => x.item.id === id);
		if (!s || !a) return;
		const o = s.fs.offset(a.item.group, this.state);
		const Y0 = s.fs.zmap.map(a.z0) + o, Y1 = s.fs.zmap.map(a.z1) + o, h = Y1 - Y0;
		const half = 12 * a.pitch, rb = a.item.box;
		const cut = s.fs.cutOf(this.state);
		let box: THREE.Box3;
		if (this.state.axis === 'y') {
			const cx = (rb.x0 + rb.x1) / 2;
			const z = -(this.state.section ? Math.max(cut, rb.y0) : rb.y0);
			box = new THREE.Box3(new THREE.Vector3(cx - half, Y0 - 1.5 * h, z), new THREE.Vector3(cx + half, Y1 + 1.5 * h, z));
		} else {
			const cy = (rb.y0 + rb.y1) / 2;
			const x = this.state.section ? Math.min(cut, rb.x1) : rb.x1;
			box = new THREE.Box3(new THREE.Vector3(x, Y0 - 1.5 * h, -cy - half), new THREE.Vector3(x, Y1 + 1.5 * h, -cy + half));
		}
		this.fit(s.fs.world(box), this.sectionDir(), 1.1);
	}

	/** Section plane implied by an inset: front/back/iso views cut along y, right/left views along x. */
	insetSection(ins: Inset, slot = 0): { axis: 'x' | 'y'; cut: number } | null {
		const s = this.slots[slot];
		if (!s) return null;
		const { cx, cy } = s.fs.model;
		const [x0, y0, x1, y1] = ins.box_mm;
		const t = ins.camera?.target ?? [(x0 + x1) / 2, (y0 + y1) / 2, 0];
		const v = ins.camera?.view ?? 'front';
		return v === 'right' || v === 'left' ? { axis: 'x', cut: t[0] - cx } : { axis: 'y', cut: t[1] - cy };
	}

	/** Scene box and view direction of an inset (camera.view / target / span_mm, z_um range; explode ignored). */
	private insetFrame(ins: Inset, fs: FamilyScene): { box: THREE.Box3; dir: THREE.Vector3 } {
		const { cx, cy } = fs.model;
		const [x0, y0, x1, y1] = ins.box_mm;
		const cam = ins.camera ?? {};
		const view = typeof cam.view === 'string' && DIRS[cam.view] ? cam.view : 'front';
		const t = cam.target ?? [(x0 + x1) / 2, (y0 + y1) / 2, 0];
		const span = typeof cam.span_mm === 'number' && cam.span_mm > 0 ? cam.span_mm : 0;
		const zr = Array.isArray(ins.z_um) && ins.z_um.length === 2 ? ins.z_um : [fs.model.bounds.z0, fs.model.bounds.z1];
		const Y0 = fs.zmap.map(zr[0]), Y1 = fs.zmap.map(zr[1]);
		const X = t[0] - cx, Z = -(t[1] - cy);
		// Frame the whole region: the larger of span_mm and the box extent along the view's horizontal axis.
		const hx = Math.max(span, x1 - x0) / 2, hy = Math.max(span, y1 - y0) / 2;
		let box: THREE.Box3;
		if (view === 'right' || view === 'left') box = new THREE.Box3(new THREE.Vector3(X, Y0, Z - hy), new THREE.Vector3(X, Y1, Z + hy));
		else if (view === 'front' || view === 'back') box = new THREE.Box3(new THREE.Vector3(X - hx, Y0, Z), new THREE.Vector3(X + hx, Y1, Z));
		else box = new THREE.Box3(new THREE.Vector3(X - hx, Y0, Z - hy), new THREE.Vector3(X + hx, Y1, Z + hy));
		return { box: fs.world(box), dir: DIRS[view] };
	}

	frameInset(ins: Inset, slot = 0) {
		const s = this.slots[slot];
		if (!s) return;
		const { box, dir } = this.insetFrame(ins, s.fs);
		this.fit(box, dir, 1.2);
	}

	// ---- picking --------------------------------------------------------------------------------------------
	private slotAt(x: number, y: number): number {
		return this.slots.findIndex((s) => x >= s.rect.x && x < s.rect.x + s.rect.w && y >= s.rect.y && y < s.rect.y + s.rect.h);
	}

	private pDown = (e: PointerEvent) => {
		this.down = { x: e.clientX, y: e.clientY };
	};

	private pUp = (e: PointerEvent) => {
		if (!this.down) return;
		const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
		this.down = null;
		if (moved > 4 || e.button !== 0) return;
		const r = this.el.getBoundingClientRect();
		this.pickAt(e.clientX - r.left, e.clientY - r.top);
	};

	/** Pick the item under a point (CSS px relative to the viewer). */
	pickAt(x: number, y: number) {
		const i = this.slotAt(x, y);
		if (i < 0) { this.onPick(null, -1, x, y); return; }
		const s = this.slots[i];
		const ndc = new THREE.Vector2(((x - s.rect.x) / s.rect.w) * 2 - 1, -((y - s.rect.y) / s.rect.h) * 2 + 1);
		this.camera.aspect = s.rect.w / s.rect.h;
		this.camera.updateProjectionMatrix();
		this.ray.setFromCamera(ndc, this.camera);
		const hits = this.ray.intersectObjects(s.fs.pickables, false);
		// First opaque hit wins; a translucent (x-ray, slab) hit only when nothing opaque is behind it.
		let pick: Item | null = null;
		for (const h of hits) {
			const it = s.fs.itemOf(h);
			if (!it) continue;
			const m = (h.object as THREE.Mesh).material as THREE.Material;
			if (!m.transparent) { pick = it; break; }
			pick ??= it;
		}
		this.onPick(pick, i, x, y);
	}

	/** Select an item by id (callout label click). */
	pickId(slot: number, id: string, x: number, y: number) {
		const it = this.slots[slot]?.fs.model.items.get(id) ?? null;
		this.onPick(it, slot, x, y);
	}

	// ---- overlay --------------------------------------------------------------------------------------------
	private project(v: THREE.Vector3, r: Rect): [number, number, boolean] {
		const p = v.clone().project(this.camera);
		return [r.x + ((p.x + 1) / 2) * r.w, r.y + ((1 - p.y) / 2) * r.h, p.z > -1 && p.z < 1];
	}

	private slotOverlay(s: Slot): SlotOverlay {
		const r = s.rect;
		this.camera.aspect = r.w / r.h;
		this.camera.updateProjectionMatrix();
		const fs = s.fs;
		const wppL = this.wpp(r.h) / fs.scale;
		const out: SlotOverlay = { rect: r, name: fs.model.family.name, labels: [], ruler: null, scale: scaleBar(wppL) };
		const st = this.state;
		const ax = st.axis;
		if (st.explode < 1e-3) {
			const b = fs.bounds(st);
			const m = fs.lateral * 0.025;
			const cut = fs.cutOf(st);
			const base = ax === 'y'
				? new THREE.Vector3(b.min.x - m, 0, st.section ? Math.min(-cut, b.max.z) : b.max.z)
				: new THREE.Vector3(st.section ? Math.min(cut, b.max.x) : b.max.x, 0, b.max.z + m);
			const zm = fs.zmap;
			const z0 = zm.breaks[0];
			const pts: [number, number][] = [];
			const ticks: OvTick[] = [];
			let lastY = Infinity;
			const n = zm.breaks.length;
			for (let k = 0; k < n; k++) {
				const [px, py, ok] = this.project(fs.world(new THREE.Vector3(base.x, zm.mapped[k], base.z)), r);
				if (!ok) continue;
				if (k === 0 || k === n - 1) pts.push([px, py]);
				const label = fmtZ(zm.breaks[k] - z0);
				if (k === n - 1) {
					if (ticks.length && Math.abs(lastY - py) < 12) ticks.pop();
					ticks.push({ x: px, y: py, label });
				} else if (Math.abs(lastY - py) >= 12) {
					ticks.push({ x: px, y: py, label });
					lastY = py;
				}
			}
			if (pts.length === 2 && Math.abs(pts[0][1] - pts[1][1]) > 20) out.ruler = { pts, ticks };
		}
		// Labels avoid the z ruler and its tick text (right-aligned, left of the tick).
		const obst = (out.ruler?.ticks ?? []).map((t) => ({ x0: t.x - 64, y0: t.y - 9, x1: t.x + 4, y1: t.y + 9 }));
		if (out.ruler?.ticks.length) {
			const t = out.ruler.ticks[out.ruler.ticks.length - 1];
			obst.push({ x0: t.x - 40, y0: t.y - 24, x1: t.x + 4, y1: t.y - 8 });
		}
		if (this.labels) out.labels = this.placeLabels(s, obst);
		return out;
	}

	/** Callout candidates of a family: one per callout target (first callout's text), then one per part group. */
	private candidates(fs: FamilyScene): { ids: string[]; text: string; full: string; callout: boolean }[] {
		const f = fs.model.family;
		const items = [...fs.model.items.values()];
		const out: { ids: string[]; text: string; full: string; callout: boolean }[] = [];
		const seen = new Set<string>();
		const byTarget = new Map<string, string[]>();
		for (const c of f.callouts ?? []) {
			if (!c.text) continue;
			if (byTarget.has(c.target)) { byTarget.get(c.target)!.push(c.text); continue; }
			byTarget.set(c.target, [c.text]);
		}
		for (const [target, texts] of byTarget) {
			const ids = fs.model.items.has(target) ? [target] : items.filter((i) => i.tid === target).map((i) => i.id);
			if (!ids.length) continue;
			ids.forEach((i) => seen.add(i));
			const more = texts.length > 1 ? ` (+${texts.length - 1})` : '';
			out.push({ ids, text: shortLabel(texts[0]) + more, full: texts.join('\n'), callout: true });
		}
		const groups = new Map<string, Item[]>();
		for (const it of items) {
			if (it.type !== 'part' || seen.has(it.id)) continue;
			const k = it.tid || it.id;
			groups.set(k, [...(groups.get(k) ?? []), it]);
		}
		for (const g of groups.values()) {
			const name = g.length > 1 ? `${baseName(g[0].name)} x${g.length}` : g[0].name;
			out.push({ ids: g.map((i) => i.id), text: shortLabel(name), full: name, callout: false });
		}
		return out;
	}

	/** Visible, non-overlapping callouts; priority: selection, then on-screen size (callouts weighted up). */
	private placeLabels(s: Slot, obst: { x0: number; y0: number; x1: number; y1: number }[]): OvLabel[] {
		const r = s.rect, fs = s.fs, st = this.state, ax = st.axis;
		const camPos = this.camera.position;
		// Occlusion rays test the merged opaque meshes only (bodies and caps, not instanced arrays).
		const opaque = fs.pickables.filter((o) => !(o instanceof THREE.InstancedMesh) && !(((o as THREE.Mesh).material as THREE.Material).transparent));
		type Hit = { it: Item; ax: number; ay: number; score: number; text: string; full: string };
		const hits: Hit[] = [];
		let rank = 0;
		for (const c of this.candidates(fs)) {
			// Spread anchors of wide items along their face (golden-ratio sequence) so leaders do not stack.
			const frac = 0.3 + 0.4 * ((rank++ * 0.618034) % 1);
			let best: Hit | null = null;
			const sel = st.selected != null && c.ids.includes(st.selected);
			const ordered = sel ? [st.selected!, ...c.ids.filter((i) => i !== st.selected)] : c.ids;
			for (const id of ordered) {
				const it = fs.model.items.get(id)!;
				const lb = fs.sceneBox(it.box, it.group, st);
				if (!lb) continue;
				const b = fs.world(lb);
				let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity;
				for (let k = 0; k < 8; k++) {
					const [px, py] = this.project(new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z), r);
					sx0 = Math.min(sx0, px); sx1 = Math.max(sx1, px); sy0 = Math.min(sy0, py); sy1 = Math.max(sy1, py);
				}
				const area = Math.min(sx1 - sx0, r.w) * Math.min(sy1 - sy0, r.h);
				if (sy1 - sy0 < 3 || sx1 - sx0 < 10) continue;
				if (best && area <= best.score) continue;
				const mid = b.getCenter(new THREE.Vector3());
				const onCut = st.section || it.type !== 'part';
				const ux = b.min.x + frac * (b.max.x - b.min.x), uz = b.min.z + (1 - frac) * (b.max.z - b.min.z);
				const opts = !onCut ? [new THREE.Vector3(mid.x, b.max.y, mid.z)] : ax === 'y'
					? [new THREE.Vector3(ux, mid.y, b.max.z), new THREE.Vector3(mid.x, mid.y, b.max.z)]
					: [new THREE.Vector3(b.max.x, mid.y, uz), new THREE.Vector3(b.max.x, mid.y, mid.z)];
				let anchor: THREE.Vector3 | null = null, ax0 = 0, ay0 = 0;
				for (const o of opts) {
					const [px, py, inFront] = this.project(o, r);
					if (!inFront || px < r.x + 4 || px > r.x + r.w - 4 || py < r.y + 4 || py > r.y + r.h - 4) continue;
					anchor = o; ax0 = px; ay0 = py;
					break;
				}
				if (!anchor) continue;
				const dir = anchor.clone().sub(camPos);
				const dist = dir.length();
				this.ray.set(camPos, dir.normalize());
				this.ray.far = dist * (1 - 1e-4);
				const hit = this.ray.intersectObjects(opaque, false)[0];
				this.ray.far = Infinity;
				if (hit) {
					const hi = fs.itemOf(hit);
					const ok = hi && (hi.id === it.id || (hi.type === 'layer' && hi.host === it.id));
					if (!ok && hit.distance < dist * (1 - 2e-3)) continue;
				}
				best = { it, ax: ax0, ay: ay0, score: area, text: c.text, full: c.full };
				if (sel) break;
			}
			if (!best) continue;
			best.score = sel ? Infinity : best.score * (c.callout ? 1.5 : 1);
			hits.push(best);
		}
		hits.sort((a, b) => b.score - a.score);
		const max = this.slots.length > 1 ? 5 : 11;
		const placed: { x0: number; y0: number; x1: number; y1: number }[] = [...obst];
		const anchors: [number, number][] = hits.map((h) => [h.ax, h.ay]);
		const out: OvLabel[] = [];
		const H = 16;
		for (const h of hits) {
			if (out.length >= max) break;
			const w = textWidth(h.text) + 10;
			let done = false;
			for (const dist of [26, 46, 72]) {
				for (const dy of [-dist, dist * 0.7, -dist * 1.6, dist * 1.4, -H / 2]) {
					for (const side of [1, -1]) {
						const lx = side > 0 ? h.ax + dist : h.ax - dist - w;
						const ly = h.ay + dy - H / 2;
						const box = { x0: lx - 3, y0: ly - 3, x1: lx + w + 3, y1: ly + H + 3 };
						if (box.x0 < r.x + 2 || box.x1 > r.x + r.w - 2 || box.y0 < r.y + 20 || box.y1 > r.y + r.h - 44) continue;
						if (placed.some((p) => p.x0 < box.x1 && box.x0 < p.x1 && p.y0 < box.y1 && box.y0 < p.y1)) continue;
						if (anchors.some(([x, y]) => x > box.x0 - 3 && x < box.x1 + 3 && y > box.y0 - 3 && y < box.y1 + 3)) continue;
						const ex = side > 0 ? lx : lx + w, ey = ly + H / 2;
						if (placed.some((p) => segHitsBox(h.ax, h.ay, ex, ey, p))) continue;
						placed.push(box);
						out.push({ id: h.it.id, ax: h.ax, ay: h.ay, lx, ly, w, text: h.text, full: h.full, template: h.it.prov !== 'reported' });
						done = true;
						break;
					}
					if (done) break;
				}
				if (done) break;
			}
		}
		return out;
	}

	// ---- unit cell inset ------------------------------------------------------------------------------------
	private cellModel(): ArrModel | null {
		if (!this.cellOn || this.slots.length !== 1) return null;
		const fs = this.slots[0].fs;
		return fs.model.arrays.find((x) => x.item.id === this.cellArray) ?? fs.model.arrays[0] ?? null;
	}

	private renderCell(): Overlay['cell'] {
		const a = this.cellModel();
		if (!a) return null;
		const U = unitGeometries();
		const p = a.pitch, d = 2 * a.r, h = (a.z1 - a.z0) / 1000;
		if (a.item.id !== this.cellKey) {
			this.cellKey = a.item.id;
			for (const o of [...this.cellScene.children]) {
				if (o instanceof THREE.InstancedMesh || o instanceof THREE.LineSegments) {
					this.cellScene.remove(o);
					o.geometry.dispose();
				}
			}
			// 3 x 3 neighbourhood at true scale (mm), center cell outlined.
			const geo = U[a.shape === 'ball' ? 'ball' : 'cyl'].clone();
			geo.setAttribute('aHatch', new THREE.InstancedBufferAttribute(new Float32Array(9).fill(a.item.status === 'template' ? 1 : 0), 1));
			const im = new THREE.InstancedMesh(geo, sharedMaterials().inst, 9);
			const c = itemColor(a.item);
			const dim = c.clone().multiplyScalar(0.55);
			const m = new THREE.Matrix4();
			let k = 0;
			for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
				m.compose(new THREE.Vector3(i * p, h / 2, j * p), new THREE.Quaternion(), new THREE.Vector3(d, h, d));
				im.setMatrixAt(k, m);
				im.setColorAt(k, i === 0 && j === 0 ? c : dim);
				k++;
			}
			const pts: number[] = [];
			const X0 = -p / 2, X1 = p / 2, Y0 = 0, Y1 = h, Z0 = -p / 2, Z1 = p / 2;
			for (const y of [Y0, Y1]) for (const z of [Z0, Z1]) pts.push(X0, y, z, X1, y, z);
			for (const x of [X0, X1]) for (const z of [Z0, Z1]) pts.push(x, Y0, z, x, Y1, z);
			for (const x of [X0, X1]) for (const y of [Y0, Y1]) pts.push(x, y, Z0, x, y, Z1);
			const lg = new THREE.BufferGeometry();
			lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
			this.cellScene.add(im, new THREE.LineSegments(lg, sharedMaterials().sel));
		}
		const ext = Math.max(3 * p, h) * 0.5;
		// Follow the main camera's azimuth, but keep the cell seen from at least ~30 deg above.
		const dir = this.camera.position.clone().sub(this.controls.target).normalize();
		if (dir.y < 0.5) { dir.y = 0.5; dir.normalize(); }
		const dist = (Math.sqrt(3) * ext * 1.05) / TAN;
		this.cellCam.position.set(0, h / 2, 0).addScaledVector(dir, dist);
		this.cellCam.up.copy(this.camera.up);
		this.cellCam.lookAt(0, h / 2, 0);
		this.cellCam.near = dist / 50;
		this.cellCam.far = dist * 4;
		this.cellCam.aspect = 1;
		this.cellCam.updateProjectionMatrix();
		this.cellLight.position.copy(dir).add(new THREE.Vector3(0.2, 0.6, 0.1));
		const s = this.slots[0].rect;
		const sz = Math.min(CELL_PX, Math.floor(s.w * 0.45), Math.floor(s.h * 0.55));
		const rect: Rect = { x: s.x + s.w - sz - 8, y: s.y + s.h - sz - 8, w: sz, h: sz };
		const R = this.renderer;
		R.setViewport(rect.x, this.h - rect.y - rect.h, rect.w, rect.h);
		R.setScissor(rect.x, this.h - rect.y - rect.h, rect.w, rect.h);
		R.setClearColor(this.cellBg, 1);
		R.clear();
		R.render(this.cellScene, this.cellCam);
		R.setClearColor(this.bg, 1);
		return { rect, arr: a };
	}

	// ---- in-scale inset (picture in picture) ----------------------------------------------------------------
	private renderPip(): Overlay['pip'] {
		if (!this.pipInset || this.slots.length !== 1 || this.state.illustrative) return null;
		const s = this.slots[0];
		const ins = (s.fs.model.family.insets ?? []).find((i) => i.id === this.pipInset);
		if (!ins) return null;
		const r = s.rect;
		const w = Math.min(PIP.w, Math.floor(r.w * 0.5)), h = Math.round(w * (PIP.h / PIP.w));
		const cam = this.pipCam;
		cam.aspect = w / h;
		const { box, dir } = this.insetFrame(ins, s.fs);
		const { pos, target } = fitPose(box, dir, cam.aspect, 1.05);
		const dist = pos.distanceTo(target);
		cam.up.set(0, 1, 0);
		cam.position.copy(pos);
		cam.lookAt(target);
		cam.near = dist / 200;
		cam.far = dist * 50;
		cam.updateProjectionMatrix();
		const rect: Rect = { x: r.x + 8, y: r.y + r.h - h - 44, w, h };
		const R = this.renderer;
		R.setViewport(rect.x, this.h - rect.y - rect.h, rect.w, rect.h);
		R.setScissor(rect.x, this.h - rect.y - rect.h, rect.w, rect.h);
		R.setClearColor(this.cellBg, 1);
		R.clear();
		R.setClearColor(this.bg, 1);
		s.light.position.copy(dir).add(new THREE.Vector3(0.2, 0.6, 0.1));
		const wppL = (2 * dist * TAN) / h / s.fs.scale;
		HATCH.value = (wppL * h) / Math.max(1e-9, s.fs.lateral) < HATCH_ZOOM ? HATCH_STRENGTH : 0;
		setDash(wppL);
		R.render(s.scene, cam);
		return { rect, label: ins.label };
	}

	/** Measure frames per second over n forced renders while orbiting (for reporting only). */
	async benchmark(n = 120): Promise<{ fps: number; ms: number; calls: number; triangles: number }> {
		const t = this.controls.target;
		const off = this.camera.position.clone().sub(t);
		const t0 = performance.now();
		for (let i = 0; i < n; i++) {
			await new Promise((r) => requestAnimationFrame(r));
			off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (2 * Math.PI) / n);
			this.camera.position.copy(t).add(off);
			this.camera.lookAt(t);
			this.updateLod();
			this.render();
		}
		const ms = performance.now() - t0;
		return { fps: (n * 1000) / ms, ms: ms / n, calls: this.stats.calls, triangles: this.stats.triangles };
	}

	dispose() {
		this.disposed = true;
		this.ro.disconnect();
		this.controls.dispose();
		this.renderer.domElement.removeEventListener('pointerdown', this.pDown);
		this.renderer.domElement.removeEventListener('pointerup', this.pUp);
		for (const s of this.slots) s.fs.dispose();
		this.slots = [];
		for (const o of [...this.cellScene.children]) if (o instanceof THREE.InstancedMesh || o instanceof THREE.LineSegments) o.geometry.dispose();
		this.renderer.dispose();
	}
}

/** Short on-screen label: the whole text if <= 6 words, else the longest leading clause of 2-6 words, else the
 * first 6 words. Never cuts inside a word; an ellipsis marks shortened text. */
export function shortLabel(t: string): string {
	const text = t.trim().replace(/\s+/g, ' ');
	const words = text.split(' ');
	if (words.length <= 6) return text;
	let best = '';
	const re = /[;,:](?=\s)|\s\(|\s-\s/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const pre = text.slice(0, m.index).trim();
		const n = pre.split(' ').length;
		if (n >= 2 && n <= 6) best = pre;
		if (n > 6) break;
	}
	const s = best || words.slice(0, 6).join(' ');
	return s.replace(/[\s,;:(-]+$/, '') + '\u2026';
}

function baseName(name: string): string {
	return name.replace(/[\s_-]*\d+$/, '') || name;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(t: string): number {
	if (typeof document === 'undefined') return t.length * 6.2;
	if (!measureCtx) {
		measureCtx = document.createElement('canvas').getContext('2d');
		if (measureCtx) measureCtx.font = `10.5px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
	}
	return measureCtx ? Math.ceil(measureCtx.measureText(t).width) : t.length * 6.2;
}

/** Does segment (x0,y0)-(x1,y1) cross the box (Liang-Barsky)? */
function segHitsBox(x0: number, y0: number, x1: number, y1: number, b: { x0: number; y0: number; x1: number; y1: number }): boolean {
	let t0 = 0, t1 = 1;
	const dx = x1 - x0, dy = y1 - y0;
	const p = [-dx, dx, -dy, dy], q = [x0 - b.x0, b.x1 - x0, y0 - b.y0, b.y1 - y0];
	for (let i = 0; i < 4; i++) {
		if (p[i] === 0) { if (q[i] < 0) return false; continue; }
		const t = q[i] / p[i];
		if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
		else { if (t < t0) return false; if (t < t1) t1 = t; }
	}
	return t0 <= t1;
}

function fmtZ(um: number): string {
	if (Math.abs(um) >= 1000) return `${+(um / 1000).toFixed(3)} mm`;
	return `${Math.round(um * 10) / 10}`;
}

export function scaleBar(wpp: number): { px: number; label: string } | null {
	if (!(wpp > 0)) return null;
	const target = 90 * wpp;
	const e = Math.pow(10, Math.floor(Math.log10(target)));
	const m = [1, 2, 5, 10].find((k) => k * e >= target * 0.7) ?? 10;
	const v = m * e;
	const label = v >= 1 ? `${+v.toPrecision(3)} mm` : `${+(v * 1000).toPrecision(3)} µm`;
	return { px: v / wpp, label };
}

/** Render one image per family with a temporary renderer (gallery thumbnails); the renderer is disposed after.
 * Each image is rendered at 2x, then cropped to the drawn content (tight framing) and scaled to w x h. */
export async function renderThumbnails(fams: Family[], w: number, h: number, bg: string): Promise<Map<string, string>> {
	const out = new Map<string, string>();
	const W = w * 2, H = h * 2;
	const canvas = document.createElement('canvas');
	const R = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
	R.setPixelRatio(1);
	R.setSize(W, H, false);
	const bgc = new THREE.Color(bg.trim() || '#0d0d0d');
	R.setClearColor(bgc);
	const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 1000);
	const c2 = document.createElement('canvas');
	c2.width = W; c2.height = H;
	const ctx = c2.getContext('2d', { willReadFrequently: true });
	const outC = document.createElement('canvas');
	outC.width = w; outC.height = h;
	const octx = outC.getContext('2d');
	const bg8 = [bgc.clone().convertLinearToSRGB()].map((c) => [c.r * 255, c.g * 255, c.b * 255])[0];
	for (const f of fams) {
		const st: ViewState = { illustrative: true, section: true, axis: 'y', cut: defaultCut(f, 'y'), explode: 0, xray: defaultXray([f]), selected: null };
		const fs = new FamilyScene(f);
		fs.build(st);
		fs.updateArrays(() => ({ mode: 'slab', x0: 0, x1: 0, y0: 0, y1: 0 }));
		const scene = new THREE.Scene();
		const light = new THREE.DirectionalLight(0xffffff, 1.7);
		light.position.copy(DIRS.iso).add(new THREE.Vector3(0.2, 0.6, 0.1));
		scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.5), light, fs.group);
		const { pos, target } = fitPose(fs.bounds(st), DIRS.iso, W / H, 1.0);
		const d = pos.distanceTo(target);
		cam.position.copy(pos);
		cam.lookAt(target);
		cam.near = d / 100;
		cam.far = d * 10;
		cam.updateProjectionMatrix();
		HATCH.value = 0;
		setDash((2 * d * TAN) / H);
		R.render(scene, cam);
		let url = canvas.toDataURL('image/png');
		if (ctx && octx) {
			ctx.drawImage(canvas, 0, 0);
			const px = ctx.getImageData(0, 0, W, H).data;
			let x0 = W, x1 = -1, y0 = H, y1 = -1;
			for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
				const i = (y * W + x) * 4;
				if (Math.abs(px[i] - bg8[0]) + Math.abs(px[i + 1] - bg8[1]) + Math.abs(px[i + 2] - bg8[2]) > 12) {
					if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
				}
			}
			if (x1 > x0 && y1 > y0) {
				// Crop to the content plus a 5% margin at the output aspect, centered on the content.
				let cw = (x1 - x0) * 1.1, ch = (y1 - y0) * 1.1;
				if (cw / ch > w / h) ch = cw * (h / w); else cw = ch * (w / h);
				const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
				octx.fillStyle = `rgb(${bg8.map((v) => Math.round(v)).join(',')})`;
				octx.fillRect(0, 0, w, h);
				octx.drawImage(canvas, cx - cw / 2, cy - ch / 2, cw, ch, 0, 0, w, h);
				url = outC.toDataURL('image/png');
			}
		}
		out.set(f.id, url);
		fs.dispose();
		await new Promise((res) => setTimeout(res, 0));
	}
	R.dispose();
	R.forceContextLoss();
	return out;
}
