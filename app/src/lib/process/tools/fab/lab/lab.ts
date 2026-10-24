// Dev-only fab tool lab (lane L37). Served raw by the Vite dev server at
// /src/lib/process/tools/fab/lab/index.htm; nothing imports it, so `vite build` never emits it.
// Mounts one FAB_TOOLS actor on a dummy work piece (lab-only stack, not data) with an engine-like frame and ctx.
// URL hash: #tool=cmp&t=0.3&scale=work|block&ill=1&flip=1&rot=0&view=iso&m=<method>

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMaterial, createProcEnvironment, type MatState, type ProcMaterial } from '../../../materials/index';
import type { OpId, ToolArgs, ToolCtx, ToolFrame } from '../../../types';
import { FAB_EXTRA_TOOLS, FAB_TOOLS } from '../index';

const ALL = { ...FAB_TOOLS, ...FAB_EXTRA_TOOLS };
import { drawCalls, specCounts, triCount, type FabToolActor } from '../common';

type Layer = { key: string; h: number; st?: Partial<MatState> };
type Cam = { az: number; el: number; dist: number; target?: [number, number, number] };
type LabCfg = {
	op: OpId;
	dur_s: number; // lab real duration of the op (for tReal_s), not data
	stack: Layer[]; // bottom -> top (top = tool-facing surface)
	methods?: string[];
	args?: (m: string) => ToolArgs;
	live?: (u: number, m: string) => Record<string, number>;
	profile?: (tr: number, m: string) => ToolCtx['profile'];
	work: Cam; // dist in mm, target in mm (tool frame)
	block?: Cam; // dist in um
	focus?: [number, number]; // block focus (piece frame, um)
};

const SI: Layer = { key: 'si', h: 775 };
const LAB: Record<string, LabCfg> = {
	cmp: {
		op: 'cmp',
		dur_s: 300,
		stack: [SI, { key: 'oxide', h: 2 }, { key: 'cu', h: 3, st: { finish: 0 } }],
		live: (u) => ({ removed_um: 3 * u, rr_nm_min: 1026.8 }),
		work: { az: 35, el: 32, dist: 1500, target: [150, 0, 0] },
		block: { az: 35, el: 22, dist: 900 },
		focus: [60000, 0]
	},
	grinder: {
		op: 'grind',
		dur_s: 400,
		stack: [{ key: 'glass', h: 700 }, { key: 'tba', h: 70 }, { key: 'si', h: 775, st: { finish: 0, wet: 1 } }],
		live: (u) => ({ removed_um: 675 * u, stage: u < 0.8 ? 1 : 2, stages: 2 }),
		work: { az: 30, el: 14, dist: 1100, target: [70, 40, 0] },
		block: { az: 35, el: 20, dist: 1500 },
		focus: [60000, 0]
	},
	drie: {
		op: 'etch_via',
		dur_s: 1651,
		stack: [SI, { key: 'resist', h: 10 }],
		live: (u) => ({ cycle: Math.min(127, Math.floor(u * 127) + 1), cycles: 127, depth_um: 100 * u }),
		work: { az: 30, el: 28, dist: 1500, target: [0, 60, 0] },
		block: { az: 35, el: 20, dist: 900 },
		focus: [60000, 0]
	},
	cvd: {
		op: 'deposit',
		dur_s: 600,
		methods: ['pecvd', 'cvd'],
		stack: [SI],
		live: (u) => ({ thickness_um: 0.4 * u }),
		work: { az: 30, el: 16, dist: 1000, target: [0, 10, 0] },
		block: { az: 35, el: 20, dist: 900 },
		focus: [60000, 0]
	},
	pvd: {
		op: 'deposit',
		dur_s: 300,
		methods: ['', 'cu'],
		args: (m): ToolArgs => (m ? { material: m } : {}),
		stack: [SI, { key: 'oxide', h: 0.4 }],
		live: (u) => ({ thickness_um: 0.3 * u }),
		work: { az: 30, el: 18, dist: 1300, target: [0, 40, 0] },
		block: { az: 35, el: 20, dist: 900 },
		focus: [60000, 0]
	},
	ecp: {
		op: 'plate',
		dur_s: 1800,
		stack: [SI, { key: 'cu_seed', h: 0.3 }],
		live: (u) => ({ thickness_um: 3 * u, rate_um_min: 0.22 }),
		work: { az: 30, el: 25, dist: 1500, target: [0, 40, 0] },
		block: { az: 35, el: 15, dist: 1500 },
		focus: [60000, 0]
	},
	litho: {
		op: 'pattern',
		dur_s: 600,
		methods: ['stepper', 'aligner'],
		stack: [SI, { key: 'resist', h: 6 }],
		live: (u) => ({ dose_mj_cm2: 120 * Math.min(1, u / 0.5) }),
		work: { az: 30, el: 22, dist: 1500, target: [0, 120, 0] },
		block: { az: 35, el: 20, dist: 900 },
		focus: [26000, 17000]
	},
	spin_coater: {
		op: 'coat',
		dur_s: 63,
		methods: ['', 'polyimide'],
		args: (m): ToolArgs => (m ? { material: m } : {}),
		stack: [SI],
		live: (u) => ({ thickness_um: 6 * u }),
		work: { az: 30, el: 24, dist: 1100, target: [0, 10, 0] }
	},
	wet_bench: {
		op: 'strip',
		dur_s: 25,
		methods: ['seed_etch', 'resist_strip', 'electroless', 'ash'],
		stack: [SI, { key: 'cu_seed', h: 0.3 }],
		work: { az: 30, el: 22, dist: 1100, target: [0, 10, 0] },
		block: { az: 35, el: 20, dist: 900 },
		focus: [60000, 0]
	},
	cure_oven: {
		op: 'cure',
		dur_s: 16800,
		methods: ['oven', 'hotplate'],
		stack: [SI, { key: 'polyimide', h: 10, st: { cure: 0.5 } }],
		work: { az: 30, el: 22, dist: 1300, target: [0, 60, 0] }
	},
	wafer_bonder: {
		op: 'bond_temp',
		dur_s: 120,
		stack: [SI, { key: 'tba', h: 70 }, { key: 'release', h: 1 }, { key: 'glass', h: 700 }],
		work: { az: 30, el: 18, dist: 1400, target: [0, 80, 0] }
	},
	laser_debond: {
		op: 'debond',
		dur_s: 30,
		stack: [SI, { key: 'tba', h: 70 }, { key: 'release', h: 1, st: { exposed: 0.3 } }, { key: 'glass', h: 700 }],
		live: (u) => ({ scan: Math.min(1, u / 0.8) }),
		work: { az: 30, el: 30, dist: 1300, target: [0, 80, 0] },
		block: { az: 35, el: 20, dist: 2500 },
		focus: [60000, 0]
	},
	dicing_blade: {
		op: 'dice',
		dur_s: 3000,
		stack: [{ key: 'si', h: 100 }],
		work: { az: 30, el: 26, dist: 900, target: [0, 20, 0] },
		block: { az: 35, el: 20, dist: 1200 },
		focus: [0, 5050]
	},
	laminator_roll: {
		op: 'coat',
		dur_s: 9,
		stack: [SI],
		work: { az: 30, el: 22, dist: 1100, target: [0, 40, 0] }
	}
};

const SCALES = { work: 1000, block: 1 } as const;
const ILL_K = 10; // lab illustrative stack exaggeration at the work scale (view parameter)

type Lab = { tool: string; t: number; scale: 'work' | 'block'; ill: boolean; flip: boolean; rot: boolean; view: string; m: string; play: boolean };
const lab: Lab = { tool: 'cmp', t: 0.5, scale: 'work', ill: true, flip: true, rot: false, view: 'iso', m: '', play: false };

function readHash() {
	const h = new URLSearchParams(location.hash.slice(1));
	if (h.get('tool') && LAB[h.get('tool')!]) lab.tool = h.get('tool')!;
	if (h.get('t') !== null) lab.t = Number(h.get('t'));
	if (h.get('scale') === 'block') lab.scale = 'block';
	if (h.get('ill') !== null) lab.ill = h.get('ill') === '1';
	if (h.get('flip') !== null) lab.flip = h.get('flip') === '1';
	if (h.get('rot') !== null) lab.rot = h.get('rot') === '1';
	if (h.get('view')) lab.view = h.get('view')!;
	lab.m = h.get('m') ?? '';
}
function writeHash() {
	const h = new URLSearchParams();
	h.set('tool', lab.tool);
	h.set('t', lab.t.toFixed(3));
	h.set('scale', lab.scale);
	h.set('ill', lab.ill ? '1' : '0');
	h.set('flip', lab.flip ? '1' : '0');
	h.set('rot', lab.rot ? '1' : '0');
	h.set('view', lab.view);
	if (lab.m) h.set('m', lab.m);
	history.replaceState(null, '', '#' + h.toString());
}
readHash();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('cv');
const viewEl = $<HTMLDivElement>('view');
const hud = $<HTMLDivElement>('hud');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const env = createProcEnvironment(renderer);
const scene = new THREE.Scene();
scene.environment = env;
scene.environmentIntensity = 0.45;
scene.background = new THREE.Color('#121316');
const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(3, 5, 2);
scene.add(key);
scene.add(new THREE.HemisphereLight(0x8090a0, 0x202020, 0.35));
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1e7);
const controls = new OrbitControls(camera, canvas);
controls.addEventListener('change', () => render());

const pivot = new THREE.Group(); // face-down flip
scene.add(pivot);
const work = new THREE.Group(); // dummy work piece (rotates with workRot)
pivot.add(work);
const toolRoot = new THREE.Group();
pivot.add(toolRoot);

let actor: FabToolActor | null = null;
let frame: ToolFrame | null = null;
let pieceMats: ProcMaterial[] = [];
let built = '';

function stackTop(c: LabCfg) {
	return c.stack.reduce((a, l) => a + l.h, 0);
}

function buildWork(c: LabCfg) {
	for (const o of [...work.children]) {
		work.remove(o);
		(o as THREE.Mesh).geometry?.dispose();
	}
	for (const m of pieceMats) m.dispose();
	pieceMats = [];
	const upu = SCALES[lab.scale];
	const k = lab.scale === 'work' && lab.ill ? ILL_K : 1;
	const top = stackTop(c);
	let z = 0;
	for (const l of c.stack) {
		const pm = createMaterial(l.key);
		pm.setScale(upu);
		if (l.st) pm.set(l.st);
		pieceMats.push(pm);
		const h = (l.h * k) / upu;
		const y0 = ((z - top) * k) / upu;
		let g: THREE.BufferGeometry;
		if (lab.scale === 'work') g = new THREE.CylinderGeometry(150, 150, h, 192, 1);
		else {
			// block: window 400 x 400 um, z crop to 400 um below the surface
			const yb = Math.max(y0, -400);
			const hh = y0 + h - yb;
			if (hh <= 0) {
				z += l.h;
				continue;
			}
			g = new THREE.BoxGeometry(400, hh, 400);
			g.translate(0, yb + hh / 2 - (y0 + h / 2), 0);
		}
		const mesh = new THREE.Mesh(g, pm.material);
		mesh.position.y = y0 + h / 2;
		work.add(mesh);
		z += l.h;
	}
}

function mount() {
	const c = LAB[lab.tool];
	const sig = `${lab.tool}|${lab.scale}|${lab.ill}|${lab.m}`;
	if (sig === built) return;
	built = sig;
	actor?.dispose();
	toolRoot.clear();
	const args = c.args ? c.args(lab.m) : lab.m ? { method: lab.m } : {};
	actor = ALL[lab.tool](args) as FabToolActor;
	toolRoot.add(actor.group);
	buildWork(c);
	const upu = SCALES[lab.scale];
	const k = lab.scale === 'work' && lab.ill ? ILL_K : 1;
	const top = stackTop(c);
	const focus = lab.scale === 'work' ? { x: 0, y: 0 } : { x: c.focus?.[0] ?? 0, y: c.focus?.[1] ?? 0 };
	frame = {
		scale: lab.scale,
		umPerUnit: upu,
		carrier: { shape: 'disk', d_um: 300_000 },
		unit: { w_um: 10_000, d_um: 10_000 },
		focus_um: focus,
		surface_um: top,
		window: lab.scale === 'block' ? { x0_um: focus.x - 200, x1_um: focus.x + 200, y0_um: focus.y - 200, y1_um: focus.y + 200 } : undefined,
		illustrative: lab.ill,
		zmap: (z: number) => z * k
	};
	toolRoot.scale.setScalar(1 / upu);
	toolRoot.position.set(0, 0, 0);
	actor.place(frame);
	// method select
	const ms = $<HTMLSelectElement>('method');
	ms.innerHTML = '';
	for (const m of c.methods ?? ['']) {
		const o = document.createElement('option');
		o.value = m;
		o.textContent = m || '(default)';
		ms.appendChild(o);
	}
	ms.value = lab.m;
	specTable();
	setCam();
}

function ctxAt(t: number): ToolCtx {
	const c = LAB[lab.tool];
	const [a, b] = [0.12, 0.9];
	const phase = t < a ? 'approach' : t > b ? 'retract' : 'process';
	const u = phase === 'approach' ? 0 : phase === 'retract' ? 1 : (t - a) / (b - a);
	const tr = u * c.dur_s;
	return {
		u,
		phase,
		op: c.op,
		tReal_s: tr,
		tPlay_s: t * 6,
		surface_um: frame!.surface_um,
		profile: c.profile ? c.profile(tr, lab.m) : {},
		live: c.live ? c.live(u, lab.m) : {},
		mat: (key: string, opts?: { instanced?: boolean }) => createMaterial(key, opts),
		reduceMotion: false
	};
}

function setCam() {
	const c = LAB[lab.tool];
	const cam = lab.scale === 'work' ? c.work : (c.block ?? { az: 35, el: 25, dist: 900 });
	const views: Record<string, [number, number]> = { iso: [cam.az, cam.el], low: [cam.az, 6], front: [0, 2], top: [0, 89], side: [90, 2] };
	const [az, el] = views[lab.view] ?? views.iso;
	const tg = new THREE.Vector3(...(cam.target ?? [0, 0, 0]));
	// target in tool-frame units of the scale (work: mm, block: um) -> world through the flip pivot
	const flip = actor?.faceDown && lab.flip;
	if (flip) tg.set(-tg.x, -tg.y, tg.z);
	const d = cam.dist;
	const A = (az * Math.PI) / 180, E = (el * Math.PI) / 180;
	camera.position.set(tg.x + d * Math.cos(E) * Math.sin(A), tg.y + d * Math.sin(E), tg.z + d * Math.cos(E) * Math.cos(A));
	camera.near = d / 2000;
	camera.far = d * 50;
	camera.updateProjectionMatrix();
	controls.target.copy(tg);
	controls.update();
}

function specTable() {
	if (!actor) return;
	const tb = $<HTMLTableElement>('spec');
	const cnt = specCounts(actor.spec);
	let h = `<tr><td colspan=3><b>spec</b> reported ${cnt.reported} / derived ${cnt.derived} / template ${cnt.template}</td></tr>`;
	for (const [k, d] of Object.entries(actor.spec)) {
		const tip = (d.note ?? '') + (d.formula ? ` | ${d.formula}` : '') + (d.ref ? ` | ${d.refs ? d.refs.join(', ') : d.ref}` : d.refs ? ` | ${d.refs.join(', ')}` : '');
		h += `<tr class="${d.status}" title="${tip.replace(/"/g, '&quot;')}"><td>${k}</td><td class="v">${+d.value.toPrecision(5)} ${d.unit}</td><td>${d.ref ?? (d.refs ?? []).join(',')}</td></tr>`;
	}
	tb.innerHTML = h;
}

function frameUpdate() {
	if (!actor || !frame) return;
	const c = LAB[lab.tool];
	const ctx = ctxAt(lab.t);
	const args = c.args ? c.args(lab.m) : lab.m ? { method: lab.m } : {};
	const flip = actor.faceDown && lab.flip;
	pivot.rotation.z = flip ? Math.PI : 0;
	pivot.updateMatrixWorld(true);
	actor.update(lab.t, args, ctx);
	work.rotation.y = lab.rot ? actor.workRot(lab.t, args, ctx) : 0;
	const ro = actor.readouts(lab.t, args, ctx);
	$<HTMLTableElement>('ro').innerHTML =
		'<tr><td colspan=2><b>readouts (real)</b></td></tr>' +
		ro.map((r) => `<tr class="${r.status}" title="${(r.note ?? '').replace(/"/g, '&quot;')}"><td>${r.label}</td><td class="v">${r.value === null ? 'N/A' : +Number(r.value).toPrecision(5)} ${r.unit}</td></tr>`).join('');
	const st = { calls: drawCalls(actor.group), tris: triCount(actor.group) };
	const dd = actor.defaultDuration?.(args);
	const tr = actor.traces?.(args) ?? [];
	$<HTMLDivElement>('stats').textContent = `tool draw calls ${st.calls}, triangles ${st.tris}; default duration ${dd == null ? 'N/A' : dd.toFixed(0) + ' s'}; traces ${tr.map((x) => x.key + ':' + x.pts.length).join(' ') || 'none'}; hold ${actor.group.userData.hold ? JSON.stringify(actor.group.userData.hold.on) : 'none'}`;
	hud.textContent = `${actor.name} (${actor.id})  scale ${lab.scale}  ${lab.ill ? 'illustrative' : 'actual'}  t ${lab.t.toFixed(3)}  ${ctx.phase} u ${ctx.u.toFixed(3)}  tReal ${ctx.tReal_s?.toFixed(1)} s${flip ? '  [face-down: drawn turned over]' : ''}`;
	$<HTMLSpanElement>('tv').textContent = lab.t.toFixed(3);
	(window as unknown as { __lab: unknown }).__lab = { ready: true, tool: lab.tool, t: lab.t, scale: lab.scale, stats: st, faceDown: actor.faceDown };
}

function render() {
	const w = viewEl.clientWidth, h = viewEl.clientHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	renderer.render(scene, camera);
}

function refresh() {
	mount();
	frameUpdate();
	render();
	writeHash();
}

// ---------------- UI
const toolSel = $<HTMLSelectElement>('tool');
for (const id of Object.keys(LAB)) {
	const o = document.createElement('option');
	o.value = id;
	o.textContent = id;
	toolSel.appendChild(o);
}
toolSel.value = lab.tool;
toolSel.onchange = () => {
	lab.tool = toolSel.value;
	lab.m = '';
	refresh();
	setCam();
	render();
};
$<HTMLSelectElement>('method').onchange = (e) => {
	lab.m = (e.target as HTMLSelectElement).value;
	refresh();
};
const tIn = $<HTMLInputElement>('t');
tIn.value = String(lab.t);
tIn.oninput = () => {
	lab.t = Number(tIn.value);
	frameUpdate();
	render();
	writeHash();
};
for (const r of document.querySelectorAll<HTMLInputElement>('input[name=scale]')) {
	r.checked = r.value === lab.scale;
	r.onchange = () => {
		lab.scale = r.value as Lab['scale'];
		refresh();
		setCam();
		render();
	};
}
const bind = (id: 'ill' | 'flip' | 'rot' | 'play') => {
	const el = $<HTMLInputElement>(id);
	el.checked = lab[id];
	el.onchange = () => {
		lab[id] = el.checked;
		refresh();
		setCam();
		render();
		if (id === 'play' && lab.play) tick();
	};
};
bind('ill');
bind('flip');
bind('rot');
bind('play');
const vs = $<HTMLSelectElement>('vsel');
vs.value = lab.view;
vs.onchange = () => {
	lab.view = vs.value;
	setCam();
	render();
	writeHash();
};
canvas.addEventListener('pointermove', (e) => {
	if (!actor) return;
	const r = canvas.getBoundingClientRect();
	const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
	const rc = new THREE.Raycaster();
	rc.setFromCamera(p, camera);
	const hit = rc.intersectObject(actor.group, true)[0];
	$<HTMLDivElement>('tip').textContent = hit ? (actor.pick?.(hit.object) ?? '') : '';
});
let last = 0;
function tick(ts = 0) {
	if (!lab.play) return;
	if (last) lab.t = (lab.t + (ts - last) / 6000) % 1;
	last = ts;
	tIn.value = String(lab.t);
	frameUpdate();
	render();
	requestAnimationFrame(tick);
}
addEventListener('resize', () => render());
addEventListener('hashchange', () => {
	readHash();
	refresh();
	setCam();
	render();
});
refresh();
setCam();
render();
