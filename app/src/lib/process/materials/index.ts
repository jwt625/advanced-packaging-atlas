// Procedural process-material library (lane L36, DevLog-016). Interface: README.md and config/process3d/CONTRACT.md
// section 9. No image textures: every pattern is GLSL noise in object-attached um coordinates.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DRAPER_C, planckRGB } from './optics';
import { RECIPES, makeUniforms, type Recipe } from './recipes';
import { PROGRAM_KEY, installShader } from './shader';
import { DEFAULT_STATE, type CreateOpts, type FrontAxis, type FrontDir, type MatKeyMeta, type MatState, type ProcMaterial } from './types';

export type { MatState, ProcMaterial, MatKeyMeta, CreateOpts, FrontDir, FrontAxis } from './types';
export { DEFAULT_STATE } from './types';
export { PROGRAM_KEY } from './shader';

const BY_KEY = new Map<string, Recipe>(RECIPES.map((r) => [r.key, r]));

/** Alias keys -> library key (same look). */
export const ALIASES: Record<string, string> = {
	prepreg: 'core', // glass-fabric prepreg: same weave in resin
	paste: 'solder_paste',
	sac: 'solder_paste',
	snag: 'solder',
	sus430: 'steel',
	tan: 'ta',
	lthc: 'release',
	pi: 'polyimide',
	cuf: 'underfill',
	mold: 'emc',
	seed: 'cu_seed',
	aln: 'ceramic',
	sic: 'ceramic_sic',
	pdms: 'silicone',
	di_water: 'water',
	coolant: 'water'
};

/** Every key with metadata (aliases listed with `alias_of`). */
export const MATERIAL_KEYS: (MatKeyMeta & { alias_of?: string })[] = [
	...RECIPES.map(({ key, name, cls, states, transparent, basis }) => ({ key, name, cls, states, transparent, basis })),
	...Object.entries(ALIASES).map(([key, to]) => {
		const r = BY_KEY.get(to)!;
		return { key, name: `${r.name} (alias of ${to})`, cls: r.cls, states: r.states, transparent: r.transparent, basis: r.basis, alias_of: to };
	})
];

const FRONT_MODE: Record<FrontDir, number> = { '+x': 1, '-x': 2, '+y': 3, '-y': 4, '+z': 5, '-z': 6, radial: 7 };

const NEUTRAL: Recipe = {
	key: 'unknown',
	name: 'Unknown (neutral grey)',
	cls: 'other',
	states: [],
	transparent: false,
	basis: 'fallback',
	init(m) {
		m.color.set('#808080');
		m.metalness = 0;
		m.roughness = 0.6;
	}
};

const _box = new THREE.Box3();
const _v = new THREE.Vector3();

/**
 * Create a material for a substance key. Unknown keys give a neutral grey material and a console warning.
 * opts.instanced is accepted for the contract; instancing needs no separate setup (three's USE_INSTANCING).
 */
export function createMaterial(key: string, opts: CreateOpts = {}): ProcMaterial & { readonly state: Readonly<MatState> } {
	const k = ALIASES[key] ?? key;
	let r = BY_KEY.get(k);
	if (!r) {
		console.warn(`procmat: unknown material key "${key}", using neutral grey`);
		r = NEUTRAL;
	}
	const recipe = r;
	const u = makeUniforms();
	const m = new THREE.MeshPhysicalMaterial({
		transparent: recipe.transparent,
		depthWrite: !recipe.transparent,
		side: THREE.FrontSide,
		// constant non-zero values keep USE_CLEARCOAT / USE_ANISOTROPY in every program; the shader sets the
		// per-fragment weights (so no state change ever recompiles)
		clearcoat: 1,
		anisotropy: 1
	});
	m.name = `procmat:${key}`;
	recipe.init(m, u);
	recipe.scale?.(1, m, u);
	const mode = opts.frontDir ?? recipe.frontDir;
	if (mode) u.uFront.value.y = FRONT_MODE[mode];
	const setGrindWheel = (radiusUm: number, offsetUm?: number) => {
		if (!(radiusUm > 0) || !Number.isFinite(radiusUm)) return;
		const d = offsetUm !== undefined && Number.isFinite(offsetUm) && offsetUm >= 0 ? offsetUm : radiusUm;
		u.uGrind.value.set(radiusUm, d);
	};
	if (opts.grindWheel) setGrindWheel(opts.grindWheel.radius_um, opts.grindWheel.offset_um);
	installShader(m, u as unknown as Record<string, { value: unknown }>);

	// bbox of the drawn geometry (pre-instance), for the dishing bowl and the default local flow front
	m.onBeforeRender = (_r, _sc, _c, geometry) => {
		if (!geometry.boundingBox) geometry.computeBoundingBox();
		const b = geometry.boundingBox!;
		u.uBoxMin.value.copy(b.min);
		u.uBoxMax.value.copy(b.max);
	};

	const state: MatState = { ...DEFAULT_STATE };
	const apply = () => {
		recipe.apply?.(state, m, u);
		u.uWet.value.x = recipe.key === 'flux' ? 0 : Math.min(1, Math.max(0, state.wet));
		u.uFront.value.x = Math.min(1, Math.max(0, state.front));
		// visible incandescence only above the Draper point; intensity ramp is a template (README T30)
		if (state.temp_c > DRAPER_C) {
			const c = planckRGB(state.temp_c);
			const i = Math.min(1, (state.temp_c - DRAPER_C) / 400) ** 2;
			u.uEmit.value.setRGB(c[0] * i, c[1] * i, c[2] * i, THREE.LinearSRGBColorSpace);
		} else u.uEmit.value.setRGB(0, 0, 0);
	};
	apply();

	return {
		key,
		material: m,
		get state() {
			return state;
		},
		set(s: Partial<MatState>) {
			for (const f in s) {
				const v = s[f as keyof MatState];
				if (typeof v === 'number' && Number.isFinite(v)) state[f as keyof MatState] = v;
			}
			apply();
		},
		setGrindWheel,
		setGrindCentre(world: THREE.Vector3 | null) {
			if (world) u.uGrindC.value.set(world.x, world.y, world.z, 1);
			else u.uGrindC.value.w = 0;
		},
		setScale(umPerUnit: number) {
			if (umPerUnit > 0 && Number.isFinite(umPerUnit)) {
				u.uUm.value = umPerUnit;
				recipe.scale?.(umPerUnit, m, u);
			}
		},
		setClipping(planes: THREE.Plane[] | null) {
			const n0 = m.clippingPlanes?.length ?? 0;
			m.clippingPlanes = planes && planes.length ? planes : null;
			// three recompiles only when the plane count changes (program parameter); no needsUpdate otherwise
			if ((m.clippingPlanes?.length ?? 0) !== n0) m.needsUpdate = true;
		},
		/**
		 * One continuous flow front in world space: axis 'x' | 'y' | 'z' or a (signed) direction vector, or 'radial'
		 * (outward from the box centre in the xz plane). `box` is the whole fill region in world coordinates, shared by
		 * every instanced tile. MatState.front is the 0..1 position along the axis inside the box.
		 */
		setFront(axis: FrontAxis, box: THREE.Box3) {
			const c = box.getCenter(_v);
			const h = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
			u.uFrontC.value.set(c.x, c.y, c.z, 1);
			u.uFrontH.value.set(h.x, h.y, h.z, 0);
			if (axis === 'radial') {
				u.uFront.value.y = 9;
				return;
			}
			const a = axis === 'x' ? new THREE.Vector3(1, 0, 0) : axis === 'y' ? new THREE.Vector3(0, 1, 0) : axis === 'z' ? new THREE.Vector3(0, 0, 1) : axis.clone().normalize();
			// projection range of the box corners on the axis
			let lo = Infinity, hi = -Infinity;
			_box.copy(box);
			for (let i = 0; i < 8; i++) {
				const p = new THREE.Vector3(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z);
				const d = p.dot(a);
				lo = Math.min(lo, d);
				hi = Math.max(hi, d);
			}
			u.uFrontAx.value.set(a.x, a.y, a.z, lo);
			u.uFrontC.value.w = Math.max(hi - lo, 1e-9);
			u.uFront.value.y = 8;
		},
		dispose() {
			m.dispose();
		}
	};
}

/**
 * Procedural image-free studio environment for scene.environment (audit V1 C2): a dark neutral surround (floor 0.03,
 * horizon 0.16, ceiling 0.10 linear) with four soft boxes (top key 2.0, left strip 1.0, front-right fill 0.6, large
 * back panel 0.6). A
 * uniformly bright room (three's RoomEnvironment, used before) made every polished metal and Si reflect near-white;
 * with a dark surround a mirror reads as its F0 times a dark grey plus soft-box streaks, rough metal reads as F0 times
 * the mean radiance (about 0.4-0.5), so Si is dark grey (polished) or mid grey (ground), Cu copper and Sn grey-silver.
 * Radiance values are a template (README T35). Dispose the returned texture with the scene.
 */
export function createProcEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
	const scene = new THREE.Scene();
	const lin = (v: number) => new THREE.Color().setRGB(v, v, v, THREE.LinearSRGBColorSpace);
	// surround: inside of a box, vertical gradient by vertex colour
	const room = new THREE.BoxGeometry(20, 20, 20, 1, 8, 1);
	const pos = room.attributes.position;
	const col = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i) / 10; // -1 floor .. 1 ceiling
		const v = y < 0 ? 0.03 + (0.16 - 0.03) * (1 + y) : 0.16 + (0.1 - 0.16) * y;
		col.set([v, v, v], i * 3);
	}
	room.setAttribute('color', new THREE.BufferAttribute(col, 3));
	const roomMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
	scene.add(new THREE.Mesh(room, roomMat));
	const boxes: [number, number, number, number, number, number, number, number][] = [
		// w, h, x, y, z, rotX, rotY, radiance
		[9, 9, 0, 9.9, 0, Math.PI / 2, 0, 2.0], // top key
		[2.2, 11, -9.9, 2, 0, 0, Math.PI / 2, 1.0], // left strip
		[6, 4, 4, 3, 9.9, 0, Math.PI, 0.6], // front-right fill
		[16, 7, 0, 3.5, -9.9, 0, 0, 0.6] // back panel: what horizontal mirrors reflect from elevated views
	];
	const disp: THREE.BufferGeometry[] = [room];
	const mats: THREE.Material[] = [roomMat];
	for (const [w, h, x, y, z, rx, ry, L] of boxes) {
		const g = new THREE.PlaneGeometry(w, h);
		const mt = new THREE.MeshBasicMaterial({ color: lin(L), side: THREE.DoubleSide });
		const me = new THREE.Mesh(g, mt);
		me.position.set(x, y, z);
		me.rotation.set(rx, ry, 0);
		scene.add(me);
		disp.push(g);
		mats.push(mt);
	}
	const pm = new THREE.PMREMGenerator(renderer);
	const tex = pm.fromScene(scene, 0.03).texture;
	pm.dispose();
	for (const g of disp) g.dispose();
	for (const m of mats) m.dispose();
	return tex;
}

/** The previous environment (three RoomEnvironment through PMREM), kept for comparison in the lab. */
export function createRoomEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
	const pm = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const tex = pm.fromScene(room, 0.04).texture;
	room.dispose();
	pm.dispose();
	return tex;
}

/**
 * Recommended renderer / scene settings for the procedural materials (README "Recommended renderer settings"; owner
 * of the viewer: engine lane L35). Neutral tone mapping keeps base-colour hue (Cu stays copper, not clipped pink-white).
 */
export const RENDER_SETTINGS = {
	toneMapping: THREE.NeutralToneMapping as THREE.ToneMapping,
	exposure: 1.0,
	environmentIntensity: 1.0,
	hemisphere: 0.6,
	directional: 1.2
};

/** Shared program key: all procedural materials resolve to the same three program family. */
export const PROGRAM_FAMILY = PROGRAM_KEY;
