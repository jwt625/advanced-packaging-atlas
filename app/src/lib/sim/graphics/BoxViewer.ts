// Minimal three.js box viewer for the /sim geometry preview (R7 6.1, DevLog-010 A10): instanced boxes, exact
// axis-aligned section trim (boxes stay closed, so the cut face is filled), camera presets, uniform z-exaggeration,
// render on demand, picking. World frame as /3d: X = x_mm, Y = z (mm) * kz, Z = -y_mm.
// Own module (not app/src/lib/three/viewer.ts): that Viewer is bound to the package3d Family model and is edited by
// the 3D session; only material colors are imported from it.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SimPart } from '../protocol';
import type { ViewPreset } from '../urlState';
import { FieldLayer } from './FieldLayer';

export type EdgeStyle = 'solid' | 'dashed' | 'user';

export interface BoxStyle {
	color: THREE.Color;
	edge: EdgeStyle;
	/** Drawn translucent (host volumes such as mold or underfill that contain other parts). */
	xray: boolean;
}

export interface Clip {
	axis: 'x' | 'y';
	pos_mm: number;
}

export interface Hit {
	part: SimPart;
	index: number;
	/** Hit point in package coordinates (mm, z in um). */
	x_mm: number;
	y_mm: number;
	z_um: number;
}

const FOV = 32;
const DIRS: Record<ViewPreset, THREE.Vector3> = {
	iso: new THREE.Vector3(1, 0.85, 1.25).normalize(),
	front: new THREE.Vector3(0, 0, 1),
	top: new THREE.Vector3(0, 1, 1e-4).normalize(),
	right: new THREE.Vector3(1, 0, 0)
};

interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

export class BoxViewer {
	readonly renderer: THREE.WebGLRenderer;
	readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 5000);
	readonly controls: OrbitControls;
	private scene = new THREE.Scene();
	private group = new THREE.Group();
	private unit = new THREE.BoxGeometry(1, 1, 1);
	/** Unit cylinder along world Y (= package z), radius 0.5, for `shape: cyl` parts (em3d bumps). */
	private unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
	private matSolid = new THREE.MeshLambertMaterial({ color: 0xffffff });
	private matXray = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false });
	private lineSolid = new THREE.LineBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.55 });
	private lineDashed = new THREE.LineDashedMaterial({ color: 0x9a9a92, transparent: true, opacity: 0.75, dashSize: 0.5, gapSize: 0.35 });
	private lineUser = new THREE.LineBasicMaterial({ color: 0x3987e5 });
	private lineSel = new THREE.LineBasicMaterial({ color: 0xfab219 });
	private meshes: { mesh: THREE.InstancedMesh; index: number[] }[] = [];
	private lines: THREE.LineSegments[] = [];
	private parts: SimPart[] = [];
	private styles: BoxStyle[] = [];
	private boxes: (Box | null)[] = [];
	private clip: Clip | null = null;
	private kz = 1;
	private selected = new Set<string>();
	private pending = false;
	private disposed = false;
	private ro: ResizeObserver;
	private ray = new THREE.Raycaster();
	private bg = new THREE.Color('#0d0d0d');
	private lastPreset: ViewPreset = 'iso';
	readonly field = new FieldLayer();
	private fieldMode = false;
	onRender: () => void = () => {};
	lost = false;

	constructor(private el: HTMLElement, private canvas: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.15;
		this.controls.screenSpacePanning = true;
		this.controls.zoomToCursor = true;
		this.controls.addEventListener('change', () => this.requestRender());
		const key = new THREE.DirectionalLight(0xffffff, 1.6);
		key.position.set(0.6, 1, 0.8);
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.5), key, this.group, this.field.group, this.field.arrowGroup);
		this.field.setKz(1);
		this.field.group.visible = false;
		this.field.arrowGroup.visible = false;
		canvas.addEventListener('webglcontextlost', this.onLost, false);
		canvas.addEventListener('webglcontextrestored', this.onRestored, false);
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(el);
		this.resize();
	}

	private onLost = (e: Event) => {
		e.preventDefault();
		this.lost = true;
	};
	private onRestored = () => {
		this.lost = false;
		this.rebuild();
	};

	setBackground(color: string) {
		this.bg = new THREE.Color(color.trim() || '#0d0d0d');
		const light = this.bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
		this.lineSolid.color.set(light ? 0x2a2a28 : 0x050505);
		this.lineDashed.color.set(light ? 0x55544f : 0xb4b4ab);
		this.requestRender();
	}

	setParts(parts: SimPart[], styles: BoxStyle[]) {
		const first = !this.parts.length;
		this.parts = parts;
		this.styles = styles;
		this.rebuild();
		if (first) this.preset(this.lastPreset);
	}

	setClip(c: Clip | null) {
		this.clip = c;
		this.rebuild();
	}

	setKz(k: number) {
		if (!(k > 0) || k === this.kz) return;
		this.kz = k;
		this.field.setKz(k);
		this.rebuild();
		this.preset(this.lastPreset);
	}

	/** Field view (result layers) instead of the box geometry. */
	setFieldMode(on: boolean) {
		this.fieldMode = on;
		this.group.visible = !on;
		this.field.group.visible = on;
		this.field.arrowGroup.visible = on;
		this.requestRender();
	}

	pickField(clientX: number, clientY: number) {
		if (!this.fieldMode) return null;
		const r = this.canvas.getBoundingClientRect();
		const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
		this.ray.setFromCamera(ndc, this.camera);
		return this.field.pick(this.ray);
	}

	setSelected(ids: string[]) {
		this.selected = new Set(ids);
		this.rebuild();
	}

	/** Package extent (mm, z in um) of all parts, untrimmed. */
	extent(): Box | null {
		let b: Box | null = null;
		for (const p of this.parts) {
			const q = boxOf(p);
			b = b ? { x0: Math.min(b.x0, q.x0), x1: Math.max(b.x1, q.x1), y0: Math.min(b.y0, q.y0), y1: Math.max(b.y1, q.y1), z0: Math.min(b.z0, q.z0), z1: Math.max(b.z1, q.z1) } : q;
		}
		return b;
	}

	private trimmed(p: SimPart): Box | null {
		const b = boxOf(p);
		const c = this.clip;
		if (!c) return b;
		if (c.axis === 'y') {
			if (b.y1 <= c.pos_mm) return null;
			b.y0 = Math.max(b.y0, c.pos_mm);
		} else {
			if (b.x0 >= c.pos_mm) return null;
			b.x1 = Math.min(b.x1, c.pos_mm);
		}
		return b;
	}

	private rebuild() {
		for (const m of this.meshes) {
			this.group.remove(m.mesh);
			m.mesh.dispose();
		}
		for (const l of this.lines) {
			this.group.remove(l);
			l.geometry.dispose();
		}
		this.meshes = [];
		this.lines = [];
		this.boxes = this.parts.map((p) => this.trimmed(p));
		const kz = this.kz;
		const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
		const sel = new THREE.Color(0xfab219);
		for (const [xray, cyl] of [[false, false], [true, false], [false, true], [true, true]] as const) {
			const idx = this.boxes.map((b, i) => (b && this.styles[i]?.xray === xray && (this.parts[i].shape === 'cyl') === cyl ? i : -1)).filter((i) => i >= 0);
			if (!idx.length) continue;
			const mesh = new THREE.InstancedMesh(cyl ? this.unitCyl : this.unit, xray ? this.matXray : this.matSolid, idx.length);
			idx.forEach((i, k) => {
				const b = this.boxes[i]!;
				pos.set((b.x0 + b.x1) / 2, ((b.z0 + b.z1) / 2 / 1000) * kz, -(b.y0 + b.y1) / 2);
				scl.set(Math.max(b.x1 - b.x0, 1e-6), Math.max(((b.z1 - b.z0) / 1000) * kz, 1e-6), Math.max(b.y1 - b.y0, 1e-6));
				m4.compose(pos, q, scl);
				mesh.setMatrixAt(k, m4);
				mesh.setColorAt(k, this.selected.has(this.parts[i].id) ? sel : this.styles[i].color);
			});
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
			if (xray) mesh.renderOrder = 2;
			this.group.add(mesh);
			this.meshes.push({ mesh, index: idx });
		}
		// edges: one merged LineSegments per style (12 edges per box)
		const ext = this.extent();
		const lat = ext ? Math.max(ext.x1 - ext.x0, ext.y1 - ext.y0) : 10;
		this.lineDashed.dashSize = lat * 0.008;
		this.lineDashed.gapSize = lat * 0.006;
		const groups: Record<EdgeStyle | 'sel', number[]> = { solid: [], dashed: [], user: [], sel: [] };
		this.boxes.forEach((b, i) => {
			if (!b || this.parts[i].shape === 'cyl') return;
			const g = this.selected.has(this.parts[i].id) ? 'sel' : this.styles[i]?.edge ?? 'solid';
			pushEdges(groups[g], b, kz);
		});
		const mats: Record<string, THREE.LineBasicMaterial | THREE.LineDashedMaterial> = { solid: this.lineSolid, dashed: this.lineDashed, user: this.lineUser, sel: this.lineSel };
		for (const [g, arr] of Object.entries(groups)) {
			if (!arr.length) continue;
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
			const l = new THREE.LineSegments(geo, mats[g]);
			if (g === 'dashed') l.computeLineDistances();
			l.renderOrder = 3;
			this.group.add(l);
			this.lines.push(l);
		}
		this.requestRender();
	}

	/** World box of the visible (trimmed) content. */
	private worldBounds(): THREE.Box3 {
		if (this.fieldMode && this.field.layers.length) {
			this.field.group.updateMatrixWorld(true);
			const fb = new THREE.Box3().setFromObject(this.field.group);
			if (!fb.isEmpty()) return fb;
		}
		const out = new THREE.Box3();
		for (const b of this.boxes) {
			if (!b) continue;
			out.expandByPoint(new THREE.Vector3(b.x0, (b.z0 / 1000) * this.kz, -b.y1));
			out.expandByPoint(new THREE.Vector3(b.x1, (b.z1 / 1000) * this.kz, -b.y0));
		}
		if (out.isEmpty()) out.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
		return out;
	}

	preset(p: ViewPreset) {
		this.lastPreset = p;
		let dir = DIRS[p];
		// a section is viewed normal to its cut face
		if (this.clip && p === 'front') dir = this.clip.axis === 'y' ? DIRS.front : DIRS.right;
		const b = this.worldBounds();
		const c = b.getCenter(new THREE.Vector3());
		const r = b.getSize(new THREE.Vector3()).length() / 2;
		// fit the bounding sphere inside the narrower of the vertical and horizontal fields of view
		const half = Math.min((FOV / 2) * (Math.PI / 180), Math.atan(Math.tan(((FOV / 2) * Math.PI) / 180) * Math.max(this.camera.aspect, 1e-3)));
		const dist = (r / Math.sin(half)) * (p === 'iso' ? 1.0 : 0.95);
		this.controls.target.copy(c);
		this.camera.position.copy(c).addScaledVector(dir, dist);
		this.camera.near = Math.max(dist / 1000, 1e-4);
		this.camera.far = dist * 20;
		this.camera.updateProjectionMatrix();
		this.controls.update();
		this.requestRender();
	}

	pick(clientX: number, clientY: number): Hit | null {
		if (this.fieldMode) return null;
		const r = this.canvas.getBoundingClientRect();
		const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
		this.ray.setFromCamera(ndc, this.camera);
		let best: { d: number; i: number; p: THREE.Vector3; xray: boolean } | null = null;
		for (const m of this.meshes) {
			const hits = this.ray.intersectObject(m.mesh, false);
			const h = hits[0];
			if (!h || h.instanceId == null) continue;
			const xray = m.mesh.material === this.matXray;
			// opaque parts win over translucent hosts (a die inside the mold is what the user sees)
			if (!best || (best.xray && !xray) || (best.xray === xray && h.distance < best.d)) best = { d: h.distance, i: m.index[h.instanceId], p: h.point, xray };
		}
		if (!best) return null;
		return { part: this.parts[best.i], index: best.i, x_mm: best.p.x, y_mm: -best.p.z, z_um: (best.p.y / this.kz) * 1000 };
	}

	requestRender() {
		if (this.pending || this.disposed) return;
		this.pending = true;
		requestAnimationFrame(() => {
			this.pending = false;
			if (this.disposed || this.lost) return;
			const moving = this.controls.update();
			this.renderer.setClearColor(this.bg, 1);
			this.renderer.render(this.scene, this.camera);
			this.onRender();
			if (moving) this.requestRender();
		});
	}

	/** World-to-screen projection of a package point (mm, z in um), CSS px in the canvas. */
	project(x_mm: number, y_mm: number, z_um: number): { x: number; y: number } {
		const v = new THREE.Vector3(x_mm, (z_um / 1000) * this.kz, -y_mm).project(this.camera);
		return { x: ((v.x + 1) / 2) * this.el.clientWidth, y: ((1 - v.y) / 2) * this.el.clientHeight };
	}

	/** Screen directions of the package axes (unit vectors, y down) for the axis triad. */
	axes(): { x: [number, number]; y: [number, number]; z: [number, number] } {
		const m = this.camera.matrixWorldInverse;
		const dir = (v: THREE.Vector3): [number, number] => {
			const d = v.clone().transformDirection(m);
			return [d.x, -d.y];
		};
		return { x: dir(new THREE.Vector3(1, 0, 0)), y: dir(new THREE.Vector3(0, 0, -1)), z: dir(new THREE.Vector3(0, 1, 0)) };
	}

	resize() {
		const w = Math.max(1, this.el.clientWidth), h = Math.max(1, this.el.clientHeight);
		this.renderer.setSize(w, h, false);
		this.canvas.style.width = `${w}px`;
		this.canvas.style.height = `${h}px`;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.requestRender();
	}

	get info(): { calls: number; triangles: number; lines: number } {
		const i = this.renderer.info.render;
		return { calls: i.calls, triangles: i.triangles, lines: i.lines };
	}

	toPng(): string {
		return this.canvas.toDataURL('image/png');
	}

	dispose() {
		this.disposed = true;
		this.ro.disconnect();
		this.canvas.removeEventListener('webglcontextlost', this.onLost);
		this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
		this.controls.dispose();
		for (const m of this.meshes) m.mesh.dispose();
		for (const l of this.lines) l.geometry.dispose();
		this.unit.dispose();
		this.unitCyl.dispose();
		for (const m of [this.matSolid, this.matXray, this.lineSolid, this.lineDashed, this.lineUser, this.lineSel]) m.dispose();
		this.field.dispose();
		this.renderer.dispose();
	}
}

function boxOf(p: SimPart): Box {
	return { x0: p.x_mm - p.w_mm / 2, x1: p.x_mm + p.w_mm / 2, y0: p.y_mm - p.d_mm / 2, y1: p.y_mm + p.d_mm / 2, z0: p.z_um, z1: p.z_um + p.h_um };
}

function pushEdges(out: number[], b: Box, kz: number) {
	const X = [b.x0, b.x1], Y = [(b.z0 / 1000) * kz, (b.z1 / 1000) * kz], Z = [-b.y0, -b.y1];
	const v = (i: number, j: number, k: number) => [X[i], Y[j], Z[k]];
	const E: [number[], number[]][] = [];
	for (const j of [0, 1]) for (const k of [0, 1]) E.push([v(0, j, k), v(1, j, k)]);
	for (const i of [0, 1]) for (const k of [0, 1]) E.push([v(i, 0, k), v(i, 1, k)]);
	for (const i of [0, 1]) for (const j of [0, 1]) E.push([v(i, j, 0), v(i, j, 1)]);
	for (const [a, c] of E) out.push(...a, ...c);
}
