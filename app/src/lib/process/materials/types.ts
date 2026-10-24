import type * as THREE from 'three';

/** Process state of a material. Every field is optional in `set()`; omitted fields keep their last value. */
export type MatState = {
	/** 0 as-deposited / as-plated / ground .. 1 polished (CMP / dry polish); solder: 0 as-plated / paste, 1 reflowed */
	finish: number;
	/** 0 solid (or paste) .. 1 liquid (molten solder, softened thermoplastic) */
	melt: number;
	/** 0 uncured (liquid / B-stage) .. 1 fully cured */
	cure: number;
	/** resist / dry film / LTHC dose fraction 0..1 (1 = full exposure dose; LTHC: laser scanned) */
	exposed: number;
	/** liquid film on the surface (rinse water, coolant, slurry, developer, flux) 0..1 */
	wet: number;
	/** temperature in C; visible only as blackbody emission above the Draper point (525 C), so none in packaging flows */
	temp_c: number;
	/** flow front 0..1 along the material's declared front direction (0 = nothing yet, 1 = fully filled) */
	front: number;
};

export type ProcMaterial = {
	key: string;
	material: THREE.Material;
	set(state: Partial<MatState>): void;
	/** um per world unit (the texture feature sizes are in um) */
	setScale(umPerUnit: number): void;
	setClipping(planes: THREE.Plane[] | null): void;
	/**
	 * Grinding-wheel geometry for the `si` grind marks (L37 request, 2026-10-23): wheel radius and wheel-centre offset
	 * from the wafer centre, um (offset default = radius: rim over the wafer centre). Uniform-only, no recompile.
	 */
	setGrindWheel(radiusUm: number, offsetUm?: number): void;
	/**
	 * Wafer (chuck) centre in world coordinates for the grind marks (audit V1 M8): marks are evaluated in world xz
	 * relative to it, so a die cut from a ground wafer carries its own near-straight arc segment. null = each mesh's
	 * own centre (default). Uniform-only.
	 */
	setGrindCentre(world: THREE.Vector3 | null): void;
	/** world-space flow front shared by all tiles of a fill (engine request L35, 2026-10-23) */
	setFront(axis: FrontAxis, box: THREE.Box3): void;
	dispose(): void;
};

/** Flow-front direction in the mesh's local (pre-instance) frame, normalised by the geometry bounding box. */
export type FrontDir = '+x' | '-x' | '+y' | '-y' | '+z' | '-z' | 'radial';

/** World-space flow-front axis for setFront(): a named axis, a (signed) direction, or radial in xz from the box centre. */
export type FrontAxis = 'x' | 'y' | 'z' | 'radial' | THREE.Vector3;

export type CreateOpts = {
	instanced?: boolean;
	/** flow-front direction (default per key, e.g. underfill '+x', emc 'radial') */
	frontDir?: FrontDir;
	/** grinding wheel for grind marks: radius and wheel-centre offset in um (default 150000 / 150000, F129) */
	grindWheel?: { radius_um: number; offset_um?: number };
};

export type MatKeyMeta = {
	key: string;
	name: string;
	/** class in the 3D tab CLASS_COLOR map (app/src/lib/three/materials.ts) */
	cls: string;
	/** MatState fields this key responds to (temp_c is accepted by every key; listed only where it matters) */
	states: (keyof MatState)[];
	transparent: boolean;
	/** one-line appearance basis; full sources in README.md */
	basis: string;
};

export const DEFAULT_STATE: MatState = { finish: 0, melt: 0, cure: 0, exposed: 0, wet: 0, temp_c: 25, front: 1 };
