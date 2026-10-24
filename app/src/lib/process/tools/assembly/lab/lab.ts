// Dev-only assembly tool lab (lane L38). Served raw by the Vite dev server at
// /src/lib/process/tools/assembly/lab/index.htm; nothing imports it, so `vite build` never emits it.
// Mounts each actor of ASSEMBLY_TOOLS on a dummy piece (lab-only stand-in geometry, not data) with a synthetic
// ToolFrame / ToolCtx as the engine would pass them. URL hash: #tool=<scenario>&scale=work|block&ill=0|1&t=0.300

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMaterial, createProcEnvironment } from '../../../materials/index';
import type { OpId, ScaleId, ToolArgs, ToolCtx, ToolFrame, Window } from '../../../types';
import { ASSEMBLY_TOOLS, specCounts, type AssemblyToolActor, type Hold, type Readout, type Trace } from '../index';
import { drawCalls, triCount } from '../common';

// ---------------------------------------------------------------- scenarios (dummy geometry: lab only)

type Layer = { z0: number; h: number; mat: string };
type Bx = { x: number; y: number; w: number; d: number; z0: number; h: number; mat: string };
type Cam = { tx: number; ty: number; tz: number; dist: number; az: number; el: number };
type Scn = {
	id: string;
	tool: string;
	label: string;
	op: OpId;
	args: ToolArgs;
	carrier: ToolFrame['carrier'];
	unit: { w_um: number; d_um: number };
	focus: { x: number; y: number };
	layers: Layer[];
	boxes: Bx[];
	pads?: { pitch: number; d: number; h: number; mat: string; w: number; dd: number };
	win: Window;
	held?: { w: number; d: number; h: number; mat: string; bump?: { pitch: number; d: number; h: number } };
	cam: { work: Cam; block: Cam };
	live?: (u: number) => Record<string, number>;
	blockFocus?: { x: number; y: number };
};

const P = (v: number) => ({ value: v, unit: 'um', status: 'template' as const, note: 'lab dummy' });
const WAFER: ToolFrame['carrier'] = { shape: 'disk', d_um: 300000 };
const SUB120: ToolFrame['carrier'] = { shape: 'rect', w_um: 120000, dd_um: 120000 };
const SUB_LAYERS: Layer[] = [
	{ z0: 0, h: 800, mat: 'core' },
	{ z0: 800, h: 200, mat: 'abf' },
	{ z0: 1000, h: 20, mat: 'solder_resist' }
];
const SI_WAFER: Layer[] = [
	{ z0: 0, h: 775, mat: 'si' },
	{ z0: 775, h: 5, mat: 'oxide' }
];

const SCN: Scn[] = [
	{
		id: 'tcb_head',
		tool: 'tcb_head',
		label: 'TCB head: Die A onto a 12 in interposer wafer',
		op: 'bond_tcb',
		args: { x_um: P(-10500), y_um: P(0) },
		carrier: WAFER,
		unit: { w_um: 42000, d_um: 46000 },
		focus: { x: -10500, y: 0 },
		layers: SI_WAFER,
		boxes: [{ x: 10500, y: 0, w: 20000, d: 20000, z0: 780 + 22, h: 675, mat: 'si' }],
		pads: { pitch: 40, d: 20, h: 2, mat: 'au', w: 20000, dd: 20000 },
		held: { w: 20000, d: 20000, h: 675, mat: 'si', bump: { pitch: 40, d: 20, h: 24 } },
		win: { x0_um: -10500 + 6000 - 160, x1_um: -10500 + 6000 + 160, y0_um: -160, y1_um: 160 },
		blockFocus: { x: -10500 + 6000, y: 0 },
		cam: { work: { tx: 0, ty: 25000, tz: 0, dist: 300000, az: 35, el: 16 }, block: { tx: 0, ty: 260, tz: 0, dist: 1700, az: 30, el: 14 } }
	},
	{
		id: 'pick_place',
		tool: 'pick_place',
		label: 'Die bonder collet: EMIB bridge into its cavity',
		op: 'place',
		args: { head: 'collet' },
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [],
		held: { w: 8000, d: 8000, h: 50, mat: 'si' },
		win: { x0_um: -150, x1_um: 150, y0_um: -150, y1_um: 150 },
		cam: { work: { tx: -30000, ty: 10000, tz: 0, dist: 210000, az: 25, el: 22 }, block: { tx: 0, ty: 150, tz: 0, dist: 1100, az: 30, el: 14 } }
	},
	{
		id: 'pick_place_nozzle',
		tool: 'pick_place',
		label: 'Mounter nozzle head: 42 x 46 mm interposer onto a 120 mm substrate',
		op: 'place',
		args: { head: 'nozzle', piece_h_um: P(100) },
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [],
		held: { w: 42000, d: 46000, h: 100, mat: 'si' },
		win: { x0_um: -150, x1_um: 150, y0_um: -150, y1_um: 150 },
		cam: { work: { tx: -40000, ty: 90000, tz: 0, dist: 820000, az: 25, el: 16 }, block: { tx: 0, ty: 150, tz: 0, dist: 1100, az: 30, el: 14 } }
	},
	{
		id: 'jet_dispenser',
		tool: 'jet_dispenser',
		label: 'Jet dispenser: CUF L-pass along a 20 mm die (CoW wafer)',
		op: 'underfill',
		args: { dispense: 'L', fill_x_um: P(0), fill_y_um: P(0), fill_w_um: P(20000), fill_d_um: P(20000) },
		carrier: WAFER,
		unit: { w_um: 42000, d_um: 46000 },
		focus: { x: 0, y: 0 },
		layers: SI_WAFER,
		boxes: [{ x: 0, y: 0, w: 20000, d: 20000, z0: 780 + 22, h: 675, mat: 'si' }],
		win: { x0_um: -10100 - 450, x1_um: -10100 + 450, y0_um: -450, y1_um: 450 },
		blockFocus: { x: -10100, y: 0 },
		cam: { work: { tx: -8000, ty: 30000, tz: 0, dist: 330000, az: 40, el: 22 }, block: { tx: 0, ty: 600, tz: 0, dist: 4200, az: 35, el: 18 } }
	},
	{
		id: 'jet_dispenser_bead',
		tool: 'jet_dispenser',
		label: 'Needle dispense: stiffener adhesive bead (120 mm substrate)',
		op: 'place',
		args: { mode: 'bead' },
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [{ x: 0, y: 0, w: 42000, d: 46000, z0: 1020 + 81, h: 100, mat: 'si' }],
		win: { x0_um: -57000 - 1500, x1_um: -57000 + 1500, y0_um: -1500, y1_um: 1500 },
		blockFocus: { x: -57000, y: 0 },
		cam: { work: { tx: 0, ty: 5000, tz: 0, dist: 260000, az: 30, el: 35 }, block: { tx: 0, ty: 1200, tz: 0, dist: 11000, az: 35, el: 22 } }
	},
	{
		id: 'mold_chase',
		tool: 'mold_chase',
		label: 'Compression mold: 12 in CoW wafer, granular EMC',
		op: 'mold',
		args: {},
		carrier: WAFER,
		unit: { w_um: 42000, d_um: 46000 },
		focus: { x: 0, y: 0 },
		layers: SI_WAFER,
		boxes: [-2, -1, 0, 1, 2].flatMap((i) => [-2, -1, 0, 1, 2].map((j) => ({ x: i * 46000, y: j * 50000, w: 42000, d: 46000, z0: 802, h: 675, mat: 'si' }))),
		win: { x0_um: -300, x1_um: 300, y0_um: -300, y1_um: 300 },
		cam: { work: { tx: 0, ty: 30000, tz: 0, dist: 1350000, az: 30, el: 9 }, block: { tx: 0, ty: 600, tz: 0, dist: 3200, az: 30, el: 16 } }
	},
	{
		id: 'reflow_oven',
		tool: 'reflow_oven',
		label: 'Reflow oven: 120 mm package substrate through 16 zones',
		op: 'reflow',
		args: {},
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [{ x: 0, y: 0, w: 42000, d: 46000, z0: 1020 + 81, h: 100, mat: 'si' }],
		win: { x0_um: -150, x1_um: 150, y0_um: -150, y1_um: 150 },
		cam: { work: { tx: 0, ty: 20000, tz: 0, dist: 900000, az: 28, el: 24 }, block: { tx: 0, ty: 150, tz: 0, dist: 1100, az: 30, el: 14 } }
	},
	{
		id: 'ball_placer',
		tool: 'ball_placer',
		label: 'Ball mounter: 0.5 mm balls, 1 mm pitch, 120 mm substrate',
		op: 'ball_attach',
		args: {},
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [],
		pads: { pitch: 1000, d: 450, h: 15, mat: 'cu', w: 116000, dd: 116000 },
		win: { x0_um: -2600, x1_um: 2600, y0_um: -2600, y1_um: 2600 },
		cam: { work: { tx: 0, ty: 10000, tz: 0, dist: 330000, az: 30, el: 30 }, block: { tx: 0, ty: 1200, tz: 0, dist: 16000, az: 30, el: 22 } }
	},
	{
		id: 'stencil_printer',
		tool: 'stencil_printer',
		label: 'Stencil printer: paste print on a 160 mm PCB',
		op: 'print',
		args: { stencil_um: P(100), site_pitch_um: P(1000) },
		carrier: { shape: 'rect', w_um: 160000, dd_um: 160000 },
		unit: { w_um: 160000, d_um: 160000 },
		focus: { x: 0, y: 0 },
		layers: [{ z0: 0, h: 1600, mat: 'core' }, { z0: 1600, h: 20, mat: 'solder_resist' }],
		boxes: [],
		pads: { pitch: 1000, d: 450, h: 15, mat: 'cu', w: 158000, dd: 158000 },
		win: { x0_um: -2600, x1_um: 2600, y0_um: -2600, y1_um: 2600 },
		cam: { work: { tx: 0, ty: 20000, tz: 0, dist: 600000, az: 32, el: 24 }, block: { tx: 0, ty: 600, tz: 0, dist: 14000, az: 35, el: 22 } }
	},
	{
		id: 'laminator',
		tool: 'laminator',
		label: 'Vacuum laminator: ABF on a 120 mm substrate',
		op: 'coat',
		args: {},
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: [...SUB_LAYERS.slice(0, 2), { z0: 1000, h: 15, mat: 'abf' }],
		boxes: [],
		win: { x0_um: -150, x1_um: 150, y0_um: -150, y1_um: 150 },
		cam: { work: { tx: 0, ty: 20000, tz: 0, dist: 560000, az: 30, el: 20 }, block: { tx: 0, ty: 150, tz: 0, dist: 1100, az: 30, el: 14 } }
	},
	{
		id: 'laser_drill',
		tool: 'laser_drill',
		label: 'Laser drill: CO2 40 um vias in ABF',
		op: 'etch_via',
		args: { laser: 'co2', site_pitch_um: P(200), site_w_um: P(20000), site_d_um: P(20000) },
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS.slice(0, 2),
		boxes: [],
		win: { x0_um: -300, x1_um: 300, y0_um: -300, y1_um: 300 },
		live: (u) => ({ depth_um: 30 * u }),
		cam: { work: { tx: 0, ty: 90000, tz: 0, dist: 650000, az: 30, el: 18 }, block: { tx: 0, ty: 150, tz: 0, dist: 2200, az: 30, el: 18 } }
	},
	{
		id: 'laser_drill_recess',
		tool: 'laser_drill',
		label: 'Laser cavity raster (EMIB bridge cavity)',
		op: 'etch_recess',
		args: { laser: 'uv' },
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS.slice(0, 2),
		boxes: [],
		win: { x0_um: -300, x1_um: 300, y0_um: -300, y1_um: 300 },
		cam: { work: { tx: 0, ty: 90000, tz: 0, dist: 650000, az: 30, el: 18 }, block: { tx: 0, ty: 150, tz: 0, dist: 2200, az: 30, el: 18 } }
	},
	{
		id: 'xray_ct',
		tool: 'xray_ct',
		label: 'X-ray CT: interposer joints on a 120 mm substrate',
		op: 'inspect',
		args: {},
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [{ x: 0, y: 0, w: 42000, d: 46000, z0: 1020 + 81, h: 100, mat: 'si' }],
		win: { x0_um: -150, x1_um: 150, y0_um: -150, y1_um: 150 },
		cam: { work: { tx: 0, ty: 60000, tz: 0, dist: 1200000, az: 30, el: 10 }, block: { tx: 0, ty: 150, tz: 0, dist: 1100, az: 30, el: 14 } }
	},
	{
		id: 'xray_sam',
		tool: 'xray_ct',
		label: 'SAM: acoustic raster (method sam)',
		op: 'inspect',
		args: { method: 'sam' },
		carrier: SUB120,
		unit: { w_um: 120000, d_um: 120000 },
		focus: { x: 0, y: 0 },
		layers: SUB_LAYERS,
		boxes: [{ x: 0, y: 0, w: 42000, d: 46000, z0: 1020 + 81, h: 100, mat: 'si' }],
		win: { x0_um: -150, x1_um: 150, y0_um: -150, y1_um: 150 },
		cam: { work: { tx: 0, ty: 20000, tz: 0, dist: 300000, az: 30, el: 26 }, block: { tx: 0, ty: 150, tz: 0, dist: 1100, az: 30, el: 14 } }
	}
];

// ---------------------------------------------------------------- state

type Lab = { id: string; scale: ScaleId; ill: boolean; t: number; play: boolean };
const lab: Lab = { id: 'tcb_head', scale: 'work', ill: true, t: 0.5, play: false };
function readHash() {
	const h = new URLSearchParams(location.hash.slice(1));
	if (h.get('tool') && SCN.some((s) => s.id === h.get('tool'))) lab.id = h.get('tool')!;
	if (h.get('scale') === 'block' || h.get('scale') === 'work') lab.scale = h.get('scale') as ScaleId;
	if (h.get('ill') !== null) lab.ill = h.get('ill') !== '0';
	if (h.get('t') !== null) lab.t = Math.min(1, Math.max(0, Number(h.get('t'))));
}
function writeHash() {
	history.replaceState(null, '', `#tool=${lab.id}&scale=${lab.scale}&ill=${lab.ill ? 1 : 0}&t=${lab.t.toFixed(3)}`);
}
readHash();

// ---------------------------------------------------------------- renderer

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('cv');
const view = $<HTMLDivElement>('view');
const hud = $<HTMLDivElement>('hud');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.environment = createProcEnvironment(renderer);
scene.background = new THREE.Color('#121316');
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(3, 5, 2);
scene.add(key);
scene.add(new THREE.HemisphereLight(0xb8c4d6, 0x202024, 0.35));
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1e5);
const controls = new OrbitControls(camera, canvas);
controls.addEventListener('change', () => draw());

let root = new THREE.Group();
scene.add(root);
let actor: AssemblyToolActor | null = null;
let dummy: THREE.Group | null = null;
let heldG: THREE.Group | null = null;
let frame: ToolFrame | null = null;
const mats: ReturnType<typeof createMaterial>[] = [];
const matCache = new Map<string, ReturnType<typeof createMaterial>>();
function dmat(k: string) {
	let m = matCache.get(k);
	if (!m) {
		m = createMaterial(k);
		matCache.set(k, m);
		mats.push(m);
	}
	return m;
}

// ---------------------------------------------------------------- z map (lab stand-in for the engine's ZMap)

function makeZmap(scn: Scn, scale: ScaleId, ill: boolean): { zmap: (z: number) => number; surface: number } {
	const surface = Math.max(...scn.layers.map((l) => l.z0 + l.h));
	const br = new Set<number>([0, surface]);
	for (const l of scn.layers) {
		br.add(l.z0);
		br.add(l.z0 + l.h);
	}
	for (const b of scn.boxes) {
		br.add(b.z0);
		br.add(b.z0 + b.h);
	}
	if (scn.held) {
		const bh = scn.held.bump?.h ?? 0;
		br.add(surface + bh);
		br.add(surface + bh + scn.held.h);
	}
	const B = [...br].sort((a, b) => a - b);
	if (!ill) return { zmap: (z) => z - surface, surface };
	const map = (h: number) => (scale === 'work' ? h * 5 : Math.max(8, 6 * Math.pow(h, 0.6)));
	const Y = [0];
	for (let i = 1; i < B.length; i++) Y.push(Y[i - 1] + map(B[i] - B[i - 1]));
	const raw = (z: number) => {
		if (z <= B[0]) return Y[0] + (z - B[0]);
		for (let i = 1; i < B.length; i++) if (z <= B[i]) return Y[i - 1] + ((z - B[i - 1]) / (B[i] - B[i - 1])) * (Y[i] - Y[i - 1]);
		return Y[Y.length - 1] + (z - B[B.length - 1]);
	};
	const y0 = raw(surface);
	return { zmap: (z) => raw(z) - y0, surface };
}

// ---------------------------------------------------------------- dummy piece

function buildDummy(scn: Scn, f: ToolFrame): THREE.Group {
	const g = new THREE.Group();
	const fx = f.focus_um.x, fy = f.focus_um.y;
	const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: string) => {
		// piece frame -> tool frame
		const a = f.zmap(z0), b = f.zmap(z1);
		const geo = new THREE.BoxGeometry(x1 - x0, Math.max(b - a, 1e-3), y1 - y0);
		geo.translate((x0 + x1) / 2 - fx, (a + b) / 2, -((y0 + y1) / 2 - fy));
		const m = new THREE.Mesh(geo, dmat(mat).material);
		g.add(m);
	};
	if (f.scale === 'work') {
		for (const l of scn.layers) {
			const a = f.zmap(l.z0), b = f.zmap(l.z0 + l.h);
			if (f.carrier.shape === 'disk') {
				const geo = new THREE.CylinderGeometry(f.carrier.d_um / 2, f.carrier.d_um / 2, Math.max(b - a, 1e-3), 160);
				geo.translate(-fx, (a + b) / 2, fy);
				g.add(new THREE.Mesh(geo, dmat(l.mat).material));
			} else slab(-f.carrier.w_um / 2, f.carrier.w_um / 2, -f.carrier.dd_um / 2, f.carrier.dd_um / 2, l.z0, l.z0 + l.h, l.mat);
		}
		for (const b of scn.boxes) slab(b.x - b.w / 2, b.x + b.w / 2, b.y - b.d / 2, b.y + b.d / 2, b.z0, b.z0 + b.h, b.mat);
	} else {
		const w = f.window!;
		const ys = w.section_y_um ?? (w.y0_um + w.y1_um) / 2;
		const cx0 = w.x0_um, cx1 = w.x1_um, cy0 = ys, cy1 = w.y1_um;
		for (const l of scn.layers) slab(cx0, cx1, cy0, cy1, l.z0, l.z0 + l.h, l.mat);
		for (const b of scn.boxes) {
			const x0 = Math.max(cx0, b.x - b.w / 2), x1 = Math.min(cx1, b.x + b.w / 2), y0 = Math.max(cy0, b.y - b.d / 2), y1 = Math.min(cy1, b.y + b.d / 2);
			if (x1 > x0 && y1 > y0) slab(x0, x1, y0, y1, b.z0, b.z0 + b.h, b.mat);
		}
		if (scn.pads) {
			const p = scn.pads;
			const surface = Math.max(...scn.layers.map((l) => l.z0 + l.h));
			const geo = new THREE.CylinderGeometry(p.d / 2, p.d / 2, Math.max(f.zmap(surface + p.h) - f.zmap(surface), 0.5), 32);
			const pts: [number, number][] = [];
			for (let x = Math.ceil((cx0 + p.d / 2) / p.pitch) * p.pitch; x <= cx1 - p.d / 2; x += p.pitch) for (let y = Math.ceil(cy0 / p.pitch) * p.pitch; y <= cy1 - p.d / 2; y += p.pitch) pts.push([x, y]);
			const im = new THREE.InstancedMesh(geo, dmat(p.mat).material, Math.max(1, pts.length));
			const M = new THREE.Matrix4();
			pts.forEach(([x, y], i) => {
				M.makeTranslation(x - fx, (f.zmap(surface + p.h) + f.zmap(surface)) / 2, -(y - fy));
				im.setMatrixAt(i, M);
			});
			g.add(im);
		}
	}
	return g;
}

/** Held piece drawn at the actor's published hold point (the engine draws the real piece). */
function buildHeld(scn: Scn, f: ToolFrame): THREE.Group | null {
	if (!scn.held) return null;
	const h = scn.held;
	const g = new THREE.Group();
	const surface = Math.max(...scn.layers.map((l) => l.z0 + l.h));
	const bh = h.bump?.h ?? 0;
	const hm = f.zmap(surface + bh + h.h) - f.zmap(surface + bh);
	const bm = f.zmap(surface + bh) - f.zmap(surface);
	let w = h.w, d = h.d, cx = 0, cz = 0;
	if (f.scale === 'block') {
		// die cropped to the window, behind the section plane (window center row)
		const win = f.window!;
		const x0 = win.x0_um - f.focus_um.x, x1 = win.x1_um - f.focus_um.x;
		w = x1 - x0;
		cx = (x0 + x1) / 2;
		d = win.y1_um - (win.y0_um + win.y1_um) / 2;
		cz = -d / 2;
	}
	const geo = new THREE.BoxGeometry(w, hm, d);
	geo.translate(cx, -hm / 2, cz);
	g.add(new THREE.Mesh(geo, dmat(h.mat).material));
	if (h.bump && f.scale === 'block') {
		const win = f.window!;
		const cg = new THREE.CylinderGeometry(h.bump.d / 2, h.bump.d / 2, bm, 24);
		const pts: [number, number][] = [];
		for (let x = Math.ceil(win.x0_um / h.bump.pitch) * h.bump.pitch; x <= win.x1_um; x += h.bump.pitch) for (let y = 0; y <= win.y1_um; y += h.bump.pitch) pts.push([x - f.focus_um.x, -(y - f.focus_um.y)]);
		const im = new THREE.InstancedMesh(cg, dmat('solder').material, Math.max(1, pts.length));
		const M = new THREE.Matrix4();
		pts.forEach(([x, z], i) => {
			M.makeTranslation(x, -hm - bm / 2, z);
			im.setMatrixAt(i, M);
		});
		g.add(im);
	}
	return g;
}

// ---------------------------------------------------------------- mount

function scn(): Scn {
	return SCN.find((s) => s.id === lab.id)!;
}
function mount() {
	if (actor) actor.dispose();
	root.removeFromParent();
	root = new THREE.Group();
	scene.add(root);
	const s = scn();
	const umPerUnit = lab.scale === 'work' ? 1000 : 1;
	root.scale.setScalar(1 / umPerUnit);
	const { zmap, surface } = makeZmap(s, lab.scale, lab.ill);
	const focus = lab.scale === 'block' ? (s.blockFocus ?? { x: (s.win.x0_um + s.win.x1_um) / 2, y: (s.win.y0_um + s.win.y1_um) / 2 }) : s.focus;
	frame = {
		scale: lab.scale,
		umPerUnit,
		carrier: s.carrier,
		unit: s.unit,
		focus_um: focus,
		surface_um: surface,
		window: lab.scale === 'block' ? s.win : undefined,
		illustrative: lab.ill,
		zmap
	};
	for (const m of mats) m.setScale(umPerUnit);
	dummy = buildDummy(s, frame);
	root.add(dummy);
	heldG = buildHeld(s, frame);
	if (heldG) root.add(heldG);
	actor = ASSEMBLY_TOOLS[s.tool](s.args) as AssemblyToolActor;
	if (actor.scales.includes(lab.scale)) {
		actor.place(frame);
		root.add(actor.group);
	}
	for (const m of mats) m.setScale(umPerUnit);
	const c = s.cam[lab.scale === 'block' ? 'block' : 'work'];
	const tgt = new THREE.Vector3(c.tx, c.ty, c.tz).divideScalar(umPerUnit);
	const az = (c.az * Math.PI) / 180, el = (c.el * Math.PI) / 180;
	const d = c.dist / umPerUnit;
	camera.position.set(tgt.x + d * Math.cos(el) * Math.sin(az), tgt.y + d * Math.sin(el), tgt.z + d * Math.cos(el) * Math.cos(az));
	camera.near = d / 2000;
	camera.far = d * 50;
	camera.updateProjectionMatrix();
	controls.target.copy(tgt);
	controls.update();
	renderInfo();
	draw();
}

function ctxAt(t: number): ToolCtx {
	const s = scn();
	const [a, b] = [0.12, 0.9];
	const phase: ToolCtx['phase'] = t < a ? 'approach' : t > b ? 'retract' : 'process';
	const u = phase === 'process' ? (t - a) / (b - a) : phase === 'retract' ? 1 : 0;
	const D = actor?.defaultDuration?.(s.args) ?? null;
	return {
		u,
		phase,
		op: s.op,
		tReal_s: D === null ? null : phase === 'process' ? u * D : phase === 'retract' ? D : 0,
		tPlay_s: t * 6,
		surface_um: frame?.surface_um ?? 0,
		profile: {},
		live: s.live ? s.live(u) : {},
		mat: (k, o) => {
			const m = createMaterial(k, o);
			mats.push(m);
			return m;
		},
		reduceMotion: false
	};
}
// one shared ctx.mat function per mount (the actor caches materials per ctx.mat identity)
let matFn: ToolCtx['mat'] = (k, o) => {
	const m = createMaterial(k, o);
	mats.push(m);
	return m;
};

let last: { ro: Readout[]; tr: Trace[] } = { ro: [], tr: [] };
function apply() {
	if (!actor || !frame) return;
	const ctx = { ...ctxAt(lab.t), mat: matFn };
	if (actor.scales.includes(lab.scale)) actor.update(lab.t, scn().args, ctx);
	for (const m of mats) m.setScale(frame.umPerUnit);
	const hold = actor.group.userData.hold as Hold | undefined;
	if (heldG) {
		heldG.visible = !!hold && hold.on;
		if (hold) heldG.position.set(hold.x, hold.y, hold.z);
	}
	last = { ro: actor.readouts(lab.t, scn().args, ctx), tr: actor.traces?.(scn().args) ?? [] };
	renderInfo(ctx);
}

function fmt(v: number | null, unit: string) {
	if (v === null || !Number.isFinite(v)) return 'N/A';
	const a = Math.abs(v);
	const s = a >= 1000 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 0.1 ? v.toFixed(2) : v.toPrecision(2);
	return `${s} ${unit}`;
}
function renderInfo(ctx?: ToolCtx) {
	const s = scn();
	if (!actor) return;
	const sc = specCounts(actor.spec);
	const rows = Object.entries(actor.spec)
		.map(([k, p]) => `<tr class="${p.status}" title="${(p.note ?? p.formula ?? '').replace(/"/g, "'")}${p.source ? ' | ' + p.source : ''}${p.ref ? ' | ' + p.ref : ''}${p.refs ? ' | ' + p.refs.join(', ') : ''}"><td>${k}</td><td class="v">${p.value} ${p.unit}</td><td>${p.status[0]}${p.ref ? ' ' + p.ref : p.refs ? ' ' + p.refs.join(',') : ''}</td></tr>`)
		.join('');
	const ro = last.ro.map((r) => `<tr class="${r.status}" title="${(r.note ?? '').replace(/"/g, "'")}"><td>${r.label}</td><td class="v">${fmt(r.value, r.unit)}</td><td>${r.status[0]}</td></tr>`).join('');
	$<HTMLDivElement>('info').innerHTML = `<div>${s.label}</div><div style="color:var(--dim)">spec: ${sc.reported} reported, ${sc.derived} derived, ${sc.template} template</div><table>${ro}</table><table>${rows}</table>`;
	const tris = triCount(actor.group), calls = drawCalls(actor.group);
	const scOk = actor.scales.includes(lab.scale);
	hud.textContent = `${actor.id}  ${lab.scale}${lab.ill ? ' illustrative' : ' actual'}  t ${lab.t.toFixed(3)}  ${ctx ? ctx.phase + '  u ' + ctx.u.toFixed(3) + '  tReal ' + (ctx.tReal_s === null ? 'N/A' : ctx.tReal_s.toFixed(2) + ' s') : ''}\n${scOk ? `tool tris ${tris}  draw calls ${calls}` : `tool not drawn at the ${lab.scale} scale (scales: ${actor.scales.join(', ')})`}`;
	(window as unknown as { __toolLab: unknown }).__toolLab = { ready: true, id: s.id, tris, calls, scales: actor.scales, readouts: last.ro };
	plot(ctx);
}

function plot(ctx?: ToolCtx) {
	const svg = $<HTMLElement>('plot') as unknown as SVGSVGElement;
	const tr = last.tr;
	if (!tr.length) {
		svg.style.display = 'none';
		return;
	}
	svg.style.display = 'block';
	const W = 300, H = 130, L = 34, R = 6, T = 8, B = 18;
	const T_ = tr.filter((x) => x.q === tr[0].q);
	const xs = T_.flatMap((x) => x.pts.map((p) => p[0])), ys = T_.flatMap((x) => x.pts.map((p) => p[1]));
	const x0 = 0, x1 = Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(...ys) * 1.05;
	const X = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
	const Y = (v: number) => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - T - B);
	const col = ['#c27c45', '#6fb0bf', '#b4b4ab'];
	let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="none"/>`;
	s += `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#555"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#555"/>`;
	s += `<text x="${L - 3}" y="${T + 8}" fill="#8a8f98" font-size="9" text-anchor="end">${y1.toFixed(0)}</text><text x="${L - 3}" y="${H - B}" fill="#8a8f98" font-size="9" text-anchor="end">${y0.toFixed(0)}</text>`;
	s += `<text x="${W - R}" y="${H - 4}" fill="#8a8f98" font-size="9" text-anchor="end">${x1.toFixed(x1 < 20 ? 1 : 0)} s</text><text x="${L}" y="${H - 4}" fill="#8a8f98" font-size="9">0</text>`;
	T_.forEach((x, i) => {
		const d = x.pts.map((p, j) => `${j ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
		s += `<path d="${d}" fill="none" stroke="${col[i % 3]}" stroke-width="1.3" ${x.status === 'template' ? 'stroke-dasharray="4 3"' : ''}/>`;
		s += `<text x="${L + 4}" y="${T + 10 + i * 11}" fill="${col[i % 3]}" font-size="9">${x.label} (${x.unit}, ${x.status})</text>`;
	});
	if (ctx && ctx.tReal_s !== null) s += `<line x1="${X(ctx.tReal_s)}" y1="${T}" x2="${X(ctx.tReal_s)}" y2="${H - B}" stroke="#fff" stroke-opacity="0.6"/>`;
	svg.innerHTML = s;
}

let pending = false;
function draw() {
	if (pending) return;
	pending = true;
	requestAnimationFrame(frameFn);
}
let lastT = performance.now();
function frameFn(now: number) {
	pending = false;
	const W = view.clientWidth, H = view.clientHeight;
	if (canvas.width !== Math.floor(W * renderer.getPixelRatio()) || canvas.height !== Math.floor(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
	camera.aspect = W / H;
	camera.updateProjectionMatrix();
	if (lab.play) {
		lab.t = (lab.t + (now - lastT) / 1000 / 6) % 1;
		tIn.value = String(lab.t);
		tv.textContent = lab.t.toFixed(3);
	}
	lastT = now;
	apply();
	renderer.render(scene, camera);
	if (lab.play) draw();
}

// ---------------------------------------------------------------- UI

const tIn = $<HTMLInputElement>('t');
const tv = $<HTMLSpanElement>('tv');
tIn.value = String(lab.t);
tv.textContent = lab.t.toFixed(3);
tIn.addEventListener('input', () => {
	lab.t = Number(tIn.value);
	tv.textContent = lab.t.toFixed(3);
	writeHash();
	draw();
});
const tb = $<HTMLDivElement>('tools');
for (const s of SCN) {
	const b = document.createElement('button');
	const a = ASSEMBLY_TOOLS[s.tool]() as AssemblyToolActor;
	const c = specCounts(a.spec);
	a.dispose();
	b.innerHTML = `${s.id}<span class="c">${c.reported}/${c.derived}/${c.template}</span>`;
	b.title = s.label;
	b.addEventListener('click', () => {
		lab.id = s.id;
		for (const x of tb.querySelectorAll('button')) x.classList.toggle('on', x === b);
		writeHash();
		matFn = (k, o) => {
			const m = createMaterial(k, o);
			mats.push(m);
			return m;
		};
		mount();
	});
	if (s.id === lab.id) b.classList.add('on');
	tb.appendChild(b);
}
for (const r of document.querySelectorAll<HTMLInputElement>('input[name=scale]')) {
	r.checked = r.value === lab.scale;
	r.addEventListener('change', () => {
		lab.scale = r.value as ScaleId;
		writeHash();
		mount();
	});
}
const ill = $<HTMLInputElement>('ill');
ill.checked = lab.ill;
ill.addEventListener('change', () => {
	lab.ill = ill.checked;
	writeHash();
	mount();
});
const play = $<HTMLInputElement>('play');
play.addEventListener('change', () => {
	lab.play = play.checked;
	lastT = performance.now();
	draw();
});
// tooltips through actor.pick
const tip = $<HTMLDivElement>('tip');
const ray = new THREE.Raycaster();
canvas.addEventListener('pointermove', (e) => {
	if (!actor) return;
	const r = canvas.getBoundingClientRect();
	ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
	const hit = ray.intersectObject(actor.group, true)[0];
	const txt = hit ? actor.pick?.(hit.object) : null;
	tip.style.display = txt ? 'block' : 'none';
	if (txt) {
		tip.textContent = txt;
		tip.style.left = `${e.clientX - r.left + 12}px`;
		tip.style.top = `${e.clientY - r.top + 12}px`;
	}
});
window.addEventListener('hashchange', () => {
	readHash();
	tIn.value = String(lab.t);
	tv.textContent = lab.t.toFixed(3);
	mount();
});
new ResizeObserver(() => draw()).observe(view);
mount();
