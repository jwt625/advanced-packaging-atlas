// Dev-only material lab (lane L36). Served raw by the Vite dev server at
// /src/lib/process/materials/lab/index.htm; nothing imports it, so `vite build` never emits it.
// URL hash: #key=cu&finish=1&um=10&mode=single|grid&shape=block|wafer|ball&cut=1&inst=1&wfront=1

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MATERIAL_KEYS, RENDER_SETTINGS, createMaterial, createProcEnvironment, createRoomEnvironment, type MatState, type ProcMaterial } from '../index';

// lighting rigs: 'engine' = the Process-mode viewer as of 2026-10-23 (no tone mapping, env 1, hemisphere 1.4,
// directional 1.6); 'rec' = README "Recommended renderer settings"; 'room' = engine rig with the old RoomEnvironment
const RIG = new URLSearchParams(location.hash.slice(1)).get('rig') ?? 'engine';

type Lab = {
	key: string;
	mode: 'single' | 'grid';
	shape: 'block' | 'wafer' | 'ball';
	um: number;
	cut: boolean;
	inst: boolean;
	wfront: boolean;
	spin: boolean;
	plain: boolean;
	wheel: number;
	offset: number;
	st: MatState;
};

const SLIDERS: [keyof MatState, number, number, number][] = [
	['finish', 0, 1, 0.01],
	['melt', 0, 1, 0.01],
	['cure', 0, 1, 0.01],
	['exposed', 0, 1, 0.01],
	['wet', 0, 1, 0.01],
	['temp_c', 25, 1000, 1],
	['front', 0, 1, 0.01]
];

const keys = MATERIAL_KEYS.filter((k) => !('alias_of' in k && k.alias_of));
const lab: Lab = {
	key: 'cu',
	mode: 'single',
	shape: 'block',
	um: 10,
	cut: false,
	inst: false,
	wfront: false,
	spin: false,
	plain: false,
	wheel: 150,
	offset: 150,
	st: { finish: 0, melt: 0, cure: 0, exposed: 0, wet: 0, temp_c: 25, front: 1 }
};

function readHash() {
	const h = new URLSearchParams(location.hash.slice(1));
	if (h.get('key')) lab.key = h.get('key')!;
	if (h.get('mode') === 'grid') lab.mode = 'grid';
	const sh = h.get('shape');
	if (sh === 'wafer' || sh === 'ball' || sh === 'block') lab.shape = sh;
	if (h.get('um')) lab.um = Number(h.get('um'));
	lab.cut = h.get('cut') === '1';
	lab.inst = h.get('inst') === '1';
	lab.wfront = h.get('wfront') === '1';
	lab.plain = h.get('plain') === '1';
	if (h.get('wheel_mm')) lab.wheel = Number(h.get('wheel_mm'));
	lab.offset = h.get('offset_mm') ? Number(h.get('offset_mm')) : lab.wheel;
	for (const [f] of SLIDERS) if (h.get(f) !== null) lab.st[f] = Number(h.get(f));
}
function writeHash() {
	const h = new URLSearchParams();
	h.set('key', lab.key);
	h.set('mode', lab.mode);
	h.set('shape', lab.shape);
	h.set('um', String(+lab.um.toPrecision(4)));
	if (lab.cut) h.set('cut', '1');
	if (lab.inst) h.set('inst', '1');
	if (lab.wfront) h.set('wfront', '1');
	h.set('wheel_mm', String(lab.wheel));
	h.set('offset_mm', String(lab.offset));
	h.set('rig', RIG);
	for (const [f] of SLIDERS) h.set(f, String(lab.st[f]));
	history.replaceState(null, '', '#' + h.toString());
}
readHash();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('cv');
const view = $<HTMLDivElement>('view');
const hud = $<HTMLDivElement>('hud');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.localClippingEnabled = true;
renderer.toneMapping = RIG === 'rec' ? RENDER_SETTINGS.toneMapping : THREE.NoToneMapping;
renderer.toneMappingExposure = RIG === 'rec' ? RENDER_SETTINGS.exposure : 1;
renderer.setScissorTest(true);
const env = RIG === 'room' ? createRoomEnvironment(renderer) : createProcEnvironment(renderer);

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(2.2, 2.0, 3.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.addEventListener('change', () => draw());

const CLIP = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];

type Spec = { scene: THREE.Scene; mats: ProcMaterial[]; root: THREE.Group };

function newScene(): THREE.Scene {
	const s = new THREE.Scene();
	s.environment = env;
	s.background = new THREE.Color('#0d0d0d');
	const rec = RIG === 'rec';
	s.environmentIntensity = rec ? RENDER_SETTINGS.environmentIntensity : 1;
	const key = new THREE.DirectionalLight(0xffffff, rec ? RENDER_SETTINGS.directional : 1.6);
	key.position.set(0.5, 1, 0.8);
	s.add(key, new THREE.HemisphereLight(0xffffff, 0x3a3a3a, rec ? RENDER_SETTINGS.hemisphere : 1.4));
	return s;
}

function specimen(key: string, shape: Lab['shape'], inst: boolean, cut: boolean): Spec {
	const scene = newScene();
	const root = new THREE.Group();
	scene.add(root);
	const mats: ProcMaterial[] = [];
	const add = (g: THREE.BufferGeometry, x: number, y: number, z: number, cap = false) => {
		const pm = createMaterial(key);
		mats.push(pm);
		const mesh = new THREE.Mesh(g, lab.plain ? plainOf(pm.material as THREE.MeshPhysicalMaterial) : pm.material);
		mesh.position.set(x, y, z);
		if (cut && !cap) pm.setClipping(CLIP);
		root.add(mesh);
		return mesh;
	};
	if (shape === 'wafer') {
		add(new THREE.CylinderGeometry(1, 1, 0.03, 256, 1), 0, 0, 0);
		if (cut) add(new THREE.PlaneGeometry(2, 0.03), 0, 0, 0, true);
	} else if (shape === 'ball') {
		add(new THREE.SphereGeometry(0.8, 128, 96), 0, 0, 0);
		if (cut) add(new THREE.CircleGeometry(0.8, 128), 0, 0, 0, true);
	} else {
		add(new THREE.BoxGeometry(2, 0.4, 2), 0, -0.2, 0);
		if (cut) add(new THREE.PlaneGeometry(2, 0.4), 0, -0.2, 0, true);
		if (inst) {
			const pm = createMaterial(key, { instanced: true });
			mats.push(pm);
			const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1);
			const im = new THREE.InstancedMesh(g, pm.material, 16);
			const M = new THREE.Matrix4();
			let i = 0;
			for (let a = 0; a < 4; a++)
				for (let b = 0; b < 4; b++) {
					M.compose(new THREE.Vector3(-0.66 + a * 0.44, 0.1, -0.66 + b * 0.44), new THREE.Quaternion(), new THREE.Vector3(0.26, 0.2, 0.26));
					im.setMatrixAt(i++, M);
				}
			if (cut) pm.setClipping(CLIP);
			root.add(im);
		} else {
			add(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 96, 1), -0.45, 0.15, 0);
			add(new THREE.SphereGeometry(0.3, 96, 64, 0, Math.PI * 2, 0, Math.PI / 2), 0.45, 0, 0);
			if (cut) {
				add(new THREE.PlaneGeometry(0.6, 0.3), -0.45, 0.15, 0, true);
				const half = new THREE.CircleGeometry(0.3, 64, 0, Math.PI);
				add(half, 0.45, 0, 0, true);
			}
		}
	}
	const box = new THREE.Box3().setFromObject(root);
	for (const m of mats) {
		m.setScale(lab.um);
		m.setGrindWheel(lab.wheel * 1000, lab.offset * 1000);
		if (lab.wfront) m.setFront('x', box);
		m.set(lab.st);
	}
	return { scene, mats, root };
}

/** reference: the same base scalars in a stock MeshPhysicalMaterial (no procedural layers) */
function plainOf(m: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
	return new THREE.MeshPhysicalMaterial({ color: m.color, roughness: m.roughness, metalness: m.metalness, ior: m.ior, transparent: m.transparent, opacity: m.opacity });
}

let single: Spec | null = null;
let grid: Spec[] = [];
const labels: HTMLDivElement[] = [];

function disposeSpec(s: Spec) {
	s.scene.traverse((o) => {
		if (o instanceof THREE.Mesh) o.geometry.dispose();
	});
	for (const m of s.mats) m.dispose();
}

function rebuild() {
	if (single) disposeSpec(single);
	for (const g of grid) disposeSpec(g);
	single = null;
	grid = [];
	for (const l of labels) l.remove();
	labels.length = 0;
	if (lab.mode === 'single') {
		single = specimen(lab.key, lab.shape, lab.inst, lab.cut);
		// debug handles for headless checks
		Object.assign(window, { __labSpec: single, __labDraw: draw, __labRenderer: renderer });
	} else {
		for (const k of keys) {
			grid.push(specimen(k.key, lab.shape, lab.inst, lab.cut));
			const d = document.createElement('div');
			d.style.cssText = 'position:absolute;color:#aeb2b9;font:11px ui-monospace,Menlo,monospace;pointer-events:none';
			d.textContent = k.key;
			view.appendChild(d);
			labels.push(d);
		}
	}
	draw();
}

function applyState() {
	const all = single ? [single] : grid;
	for (const s of all)
		for (const m of s.mats) {
			m.setScale(lab.um);
			m.setGrindWheel(lab.wheel * 1000, lab.offset * 1000);
			m.set(lab.st);
		}
	draw();
}

let pending = false;
function draw() {
	if (pending) return;
	pending = true;
	requestAnimationFrame(frame);
}
function frame() {
	pending = false;
	const W = view.clientWidth, H = view.clientHeight;
	if (canvas.width !== Math.floor(W * renderer.getPixelRatio()) || canvas.height !== Math.floor(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
	if (lab.spin) {
		const all = single ? [single] : grid;
		for (const s of all) s.root.rotation.y += 0.01;
	}
	if (single) {
		renderer.setViewport(0, 0, W, H);
		renderer.setScissor(0, 0, W, H);
		camera.aspect = W / H;
		camera.updateProjectionMatrix();
		renderer.render(single.scene, camera);
	} else {
		const n = grid.length;
		const cols = Math.ceil(Math.sqrt((n * W) / H));
		const rows = Math.ceil(n / cols);
		const tw = W / cols, th = H / rows;
		const cam = camera.clone();
		cam.aspect = tw / th;
		cam.updateProjectionMatrix();
		grid.forEach((g, i) => {
			const cx = i % cols, cy = Math.floor(i / cols);
			const x = cx * tw, y = H - (cy + 1) * th;
			renderer.setViewport(x, y, tw, th);
			renderer.setScissor(x, y, tw, th);
			renderer.render(g.scene, cam);
			const l = labels[i];
			l.style.left = `${x + 4}px`;
			l.style.top = `${cy * th + 2}px`;
		});
	}
	const info = renderer.info;
	const w = lab.shape === 'wafer' ? 2 : 2;
	const span = w * lab.um;
	hud.textContent = `${lab.mode === 'single' ? lab.key : 'all keys'}  specimen ${span >= 1000 ? (span / 1000).toPrecision(3) + ' mm' : span.toPrecision(3) + ' um'} wide  programs ${info.programs?.length ?? '?'}  calls ${info.render.calls}`;
	(window as unknown as { __lab: unknown }).__lab = { ready: true, programs: info.programs?.length ?? 0, calls: info.render.calls };
	if (lab.spin) draw();
}

// ---- UI
const sl = $<HTMLDivElement>('sliders');
const rows: Partial<Record<keyof MatState, HTMLDivElement>> = {};
for (const [f, lo, hi, step] of SLIDERS) {
	const r = document.createElement('div');
	r.className = 'row';
	r.innerHTML = `<b>${f}</b><input type="range" min="${lo}" max="${hi}" step="${step}" value="${lab.st[f]}" /><span>${lab.st[f]}</span>`;
	const inp = r.querySelector('input')!;
	const sp = r.querySelector('span')!;
	inp.addEventListener('input', () => {
		lab.st[f] = Number(inp.value);
		sp.textContent = inp.value;
		writeHash();
		applyState();
	});
	sl.appendChild(r);
	rows[f] = r;
}
for (const id of ['wheel', 'offset'] as const) {
	const inp = $<HTMLInputElement>(id);
	inp.value = String(lab[id]);
	inp.addEventListener('change', () => {
		const v = Number(inp.value);
		if (!(v >= 0)) return;
		if (id === 'wheel' && lab.offset === lab.wheel) lab.offset = v;
		lab[id] = v;
		$<HTMLInputElement>('offset').value = String(lab.offset);
		writeHash();
		applyState();
	});
}
const um = $<HTMLInputElement>('um');
const umv = $<HTMLSpanElement>('umv');
um.value = String(Math.log10(lab.um));
umv.textContent = String(+lab.um.toPrecision(3));
um.addEventListener('input', () => {
	lab.um = 10 ** Number(um.value);
	umv.textContent = String(+lab.um.toPrecision(3));
	writeHash();
	applyState();
});
function markStates() {
	const meta = keys.find((k) => k.key === lab.key);
	for (const [f] of SLIDERS) rows[f]!.classList.toggle('off', lab.mode === 'single' && !!meta && f !== 'temp_c' && !meta.states.includes(f));
	$<HTMLDivElement>('basis').textContent = meta ? `${meta.name} [${meta.cls}]: ${meta.basis}` : '';
}
const kb = $<HTMLDivElement>('keys');
for (const k of keys) {
	const b = document.createElement('button');
	b.innerHTML = `${k.key}<span class="c">${k.states.join(' ')}</span>`;
	b.title = `${k.name}: ${k.basis}`;
	b.addEventListener('click', () => {
		lab.key = k.key;
		lab.mode = 'single';
		(document.querySelector('input[name=mode][value=single]') as HTMLInputElement).checked = true;
		for (const x of kb.querySelectorAll('button')) x.classList.toggle('on', x === b);
		writeHash();
		markStates();
		rebuild();
	});
	if (k.key === lab.key) b.classList.add('on');
	kb.appendChild(b);
}
for (const r of document.querySelectorAll<HTMLInputElement>('input[name=mode]')) {
	r.checked = r.value === lab.mode;
	r.addEventListener('change', () => {
		lab.mode = r.value as Lab['mode'];
		writeHash();
		markStates();
		rebuild();
	});
}
const shape = $<HTMLSelectElement>('shape');
shape.value = lab.shape;
shape.addEventListener('change', () => {
	lab.shape = shape.value as Lab['shape'];
	writeHash();
	rebuild();
});
for (const id of ['cut', 'inst', 'wfront', 'spin'] as const) {
	const c = $<HTMLInputElement>(id);
	c.checked = lab[id];
	c.addEventListener('change', () => {
		lab[id] = c.checked;
		writeHash();
		if (id === 'spin') draw();
		else rebuild();
	});
}
new ResizeObserver(() => draw()).observe(view);
markStates();
rebuild();
