// Material factory: lane L36's library (materials/index.ts, createMaterial) when it exists, else a stub with the same
// signature (flat MeshStandardMaterial per substance key; state shown only coarsely).
import * as THREE from 'three';
import type { CreateMaterial, MatState, ProcMaterial } from './types';

// Stub colours: substance classes of the 3D tab palette (app/src/lib/three/materials.ts CLASS_COLOR) where one exists.
const STUB: Record<string, [string, number, number]> = {
	// key: [colour, metalness, roughness]
	si: ['#66758c', 0.2, 0.45], oxide: ['#93a8bf', 0, 0.3], nitride: ['#8f9fb5', 0, 0.35], cu: ['#c27c45', 0.9, 0.4],
	ti: ['#9a9aa0', 0.8, 0.45], ni: ['#b5b2a8', 0.85, 0.4], au: ['#d4a73c', 0.95, 0.3], osp: ['#b07a50', 0.6, 0.5],
	solder: ['#b4b4ab', 0.75, 0.45], imc: ['#8d8f86', 0.6, 0.6], resist: ['#c9a227', 0, 0.35], dry_film: ['#4f8f5a', 0, 0.4],
	polyimide: ['#b98a2e', 0, 0.35], emc: ['#3b3f45', 0, 0.75], underfill: ['#a48f5c', 0, 0.5], abf: ['#47704a', 0, 0.6],
	core: ['#47704a', 0, 0.65], prepreg: ['#47704a', 0, 0.65], solder_resist: ['#2f6b3a', 0, 0.4], glass: ['#6fb0bf', 0, 0.1],
	tba: ['#c7b98a', 0, 0.4], release: ['#5a4f45', 0, 0.5], daf: ['#a49a7a', 0, 0.5], adhesive: ['#a49a7a', 0, 0.5],
	flux: ['#d8c27a', 0, 0.2], slurry: ['#d9dfe6', 0, 0.2], electrolyte: ['#5f8fb0', 0, 0.1], steel: ['#9097a1', 0.8, 0.4],
	al: ['#c8ccd2', 0.85, 0.35]
};

function stubMaterial(key: string, opts?: { instanced?: boolean }): ProcMaterial {
	const [hex, metal, rough] = STUB[key] ?? ['#808080', 0, 0.6];
	if (!STUB[key]) console.warn(`[process3d] material stub: unknown key "${key}"`);
	const m = new THREE.MeshStandardMaterial({ color: hex, metalness: metal, roughness: rough, transparent: key === 'glass', opacity: key === 'glass' ? 0.45 : 1 });
	const base = new THREE.Color(hex);
	const st: MatState = { finish: 0, melt: 0, cure: 0, exposed: 0, wet: 0, temp_c: 25, front: 1 };
	void opts;
	return {
		key,
		material: m,
		set(p: Partial<MatState>) {
			Object.assign(st, p);
			m.roughness = Math.max(0.05, rough * (1 - 0.7 * st.finish) * (1 - 0.6 * st.melt) * (1 - 0.5 * st.wet));
			const c = base.clone();
			if (key === 'resist' || key === 'dry_film') c.lerp(new THREE.Color('#7a5a14'), 0.6 * st.exposed);
			if (key === 'underfill' || key === 'emc' || key === 'tba' || key === 'adhesive') c.multiplyScalar(1 - 0.25 * st.cure);
			if (key === 'release') c.lerp(new THREE.Color('#1c1712'), st.exposed);
			m.color.copy(c);
		},
		setScale() {},
		setClipping(planes) {
			m.clippingPlanes = planes;
			m.needsUpdate = true;
		},
		dispose() {
			m.dispose();
		}
	};
}

let factory: CreateMaterial = stubMaterial;
let source: 'stub' | 'L36' = 'stub';
let envFactory: ((r: THREE.WebGLRenderer) => THREE.Texture) | null = null;
export interface RenderSettings { toneMapping: THREE.ToneMapping; exposure: number; environmentIntensity: number; hemisphere: number; directional: number }
/** Renderer / light settings: L36's RENDER_SETTINGS when the library is loaded (V1 C2), else the stub's. */
let settings: RenderSettings = { toneMapping: THREE.AgXToneMapping, exposure: 1.35, environmentIntensity: 0.6, hemisphere: 0.35, directional: 1.3 };
export const renderSettings = () => settings;

// materials/index.ts is optional: import.meta.glob returns {} while it does not exist (no build error).
const mods = import.meta.glob('./materials/index.ts');

export async function loadMaterials(): Promise<'stub' | 'L36'> {
	const load = mods['./materials/index.ts'];
	if (!load) return source;
	try {
		const m = (await load()) as { createMaterial?: CreateMaterial; createProcEnvironment?: (r: THREE.WebGLRenderer) => THREE.Texture; RENDER_SETTINGS?: RenderSettings };
		if (m.RENDER_SETTINGS) settings = { ...settings, ...m.RENDER_SETTINGS };
		if (typeof m.createMaterial === 'function') {
			factory = m.createMaterial;
			source = 'L36';
		}
		if (typeof m.createProcEnvironment === 'function') envFactory = m.createProcEnvironment;
	} catch (e) {
		console.warn('[process3d] materials library failed to load; using the stub', e);
	}
	return source;
}

export function createMaterial(key: string, opts?: { instanced?: boolean }): ProcMaterial {
	try {
		return factory(key, opts);
	} catch (e) {
		console.warn(`[process3d] createMaterial(${key}) failed; stub used`, e);
		return stubMaterial(key, opts);
	}
}

export function materialSource(): 'stub' | 'L36' {
	return source;
}

/** Image-free environment map from the materials library (metals need one); null with the stub. */
export function createEnvironment(r: THREE.WebGLRenderer): THREE.Texture | null {
	try {
		return envFactory ? envFactory(r) : null;
	} catch (e) {
		console.warn('[process3d] environment failed', e);
		return null;
	}
}
