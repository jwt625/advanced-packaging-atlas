// Per-key recipes (lane L36): static look + state -> uniform mapping. Numbers marked S<n> are sourced, T<n> are
// template (rationale in README.md, "Parameter sources"). set() only writes uniform / material scalar values.

import * as THREE from 'three';
import { F0, IOR, KAPTON_ALPHA, filmTint, type RGB } from './optics';
import type { FrontDir, MatKeyMeta, MatState } from './types';

export type Uni = {
	uUm: { value: number };
	uBoxMin: { value: THREE.Vector3 };
	uBoxMax: { value: THREE.Vector3 };
	uGrain: { value: THREE.Vector4 };
	uGrain2: { value: THREE.Vector4 };
	uPart: { value: THREE.Vector4 };
	uPartCol: { value: THREE.Color };
	uPart2: { value: THREE.Vector4 };
	uPart3: { value: THREE.Vector4 };
	uScr: { value: THREE.Vector4 };
	uScr2: { value: THREE.Vector4 };
	uGrind: { value: THREE.Vector2 };
	uGrindC: { value: THREE.Vector4 };
	uWeave: { value: THREE.Vector4 };
	uWeaveCol: { value: THREE.Color };
	uWeave2: { value: THREE.Vector4 };
	uFront: { value: THREE.Vector4 };
	uFront2: { value: THREE.Vector4 };
	uFrontAx: { value: THREE.Vector4 };
	uFrontC: { value: THREE.Vector4 };
	uFrontH: { value: THREE.Vector4 };
	uCoat: { value: THREE.Vector2 };
	uWet: { value: THREE.Vector2 };
	uEmit: { value: THREE.Color };
	uDish: { value: THREE.Vector4 };
	uMottle: { value: THREE.Vector4 };
	uAlphaFres: { value: number };
	uPathTint: { value: THREE.Vector4 };
};

/** S10: 300 mm grinder wheel, diameter 300 mm (DISCO DGP8761, RESEARCH_TOOLS_FAB F129); rim over the wafer centre
 * (F123), so the default wheel-centre offset equals the radius. Override per material with setGrindWheel(). */
export const GRIND_WHEEL_R_UM = 150_000;

export function makeUniforms(): Uni {
	return {
		uUm: { value: 1 },
		uBoxMin: { value: new THREE.Vector3(-0.5, -0.5, -0.5) },
		uBoxMax: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
		uGrain: { value: new THREE.Vector4(0, 0, 0, 0) },
		uGrain2: { value: new THREE.Vector4(0, 0, 0, 0) },
		uPart: { value: new THREE.Vector4(0, 0, 0, 0) },
		uPartCol: { value: new THREE.Color() },
		uPart2: { value: new THREE.Vector4(0, 0, 0, 0) },
		uPart3: { value: new THREE.Vector4(3, 0, 0, 0) },
		uScr: { value: new THREE.Vector4(0, 0, 0, 0) },
		uScr2: { value: new THREE.Vector4(0, 0, 0, 0) },
		uGrind: { value: new THREE.Vector2(GRIND_WHEEL_R_UM, GRIND_WHEEL_R_UM) },
		uGrindC: { value: new THREE.Vector4(0, 0, 0, 0) },
		uWeave: { value: new THREE.Vector4(0, 0, 0, 0) },
		uWeaveCol: { value: new THREE.Color() },
		uWeave2: { value: new THREE.Vector4(0, 0, 0, 0) },
		uFront: { value: new THREE.Vector4(1, 0, 0.06, 0.03) },
		uFront2: { value: new THREE.Vector4(0, 0, 0, 0) },
		uFrontAx: { value: new THREE.Vector4(1, 0, 0, 0) },
		uFrontC: { value: new THREE.Vector4(0, 0, 0, 1) },
		uFrontH: { value: new THREE.Vector4(1, 1, 1, 0) },
		uCoat: { value: new THREE.Vector2(0, 0.05) },
		uWet: { value: new THREE.Vector2(0, 0.25) },
		uEmit: { value: new THREE.Color(0, 0, 0) },
		uDish: { value: new THREE.Vector4(0, 0, 0, 0) },
		uMottle: { value: new THREE.Vector4(0, 0, 0, 0) },
		uAlphaFres: { value: 0 },
		uPathTint: { value: new THREE.Vector4(1, 1, 1, 0) }
	};
}

export type Recipe = MatKeyMeta & {
	frontDir?: FrontDir;
	/** static look (called once) */
	init(m: THREE.MeshPhysicalMaterial, u: Uni): void;
	/** scale-dependent look (called on setScale; uniforms / scalars only) */
	scale?(umPerUnit: number, m: THREE.MeshPhysicalMaterial, u: Uni): void;
	/** state-dependent look (called on every set(); uniforms / scalars only) */
	apply?(s: MatState, m: THREE.MeshPhysicalMaterial, u: Uni): void;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.min(1, Math.max(0, x));
const lin = (c: RGB) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mulRGB = (a: RGB, b: RGB): RGB => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];

function metal(m: THREE.MeshPhysicalMaterial, f0: RGB, rough: number) {
	m.color.copy(lin(f0));
	m.metalness = 1;
	m.roughness = rough;
}
function dielectric(m: THREE.MeshPhysicalMaterial, srgb: string | RGB, rough: number, ior: number, opacity = 1) {
	if (typeof srgb === 'string') m.color.set(srgb);
	else m.color.copy(lin(srgb));
	m.metalness = 0;
	m.roughness = rough;
	m.ior = ior;
	m.opacity = opacity;
}

// --- sourced constants (README "Parameter sources") ---
const GRIND_COARSE_UM = 40; // T10: #325-class coarse wheel scratch spacing (S11 gives the mesh, the um value is template)
const GRIND_FINE_UM = 6; // T11: #2000 fine wheel scratch spacing (S11 mesh)
const CU_GRAIN_UM = 2.0; // S12: self-annealed ECD Cu grains "several um" (as-deposited 0.05-0.1 um)
const CMP_SCR_W_UM = 0.2; // S13: CMP micro-scratch width 100-300 nm, depth 50-90 nm
const CMP_SCR_D_UM = 0.07; // S13
const CU_DISH_UM = 0.03; // S14: dishing 10-50 nm for 4-10 um wide, 1 um deep Cu features
const EMC_D50_UM = 15; // T12: inside the 10-25 um mean filler size (S15); top cut 53 / 75 um (S16)
const EMC_FILL = 0.6; // T13: filler volume fraction (no vendor number obtained)
const PASTE_D50_UM = 29; // S17: J-STD-005 Type 4, 80 % of powder 20-38 um (midpoint)
const PASTE_METAL_VOL = 0.52; // T14: 89 wt% metal (template) -> 0.52 vol% (densities 7.4 / 1.0 g/cm3)
const WEAVE_WARP_UM = 25_400 / 60; // S18: style 2116, 60 x 58 ends / inch, 0.097 mm (Isola glass fabric 2022)
const WEAVE_FILL_UM = 25_400 / 58; // S18
const WEAVE_PLY_UM = 97; // S18
const FILAMENT_UM = 7; // T15: "E" filament (ECE 225 yarn of style 2116); diameter from the yarn-letter convention
const PI_FILM_UM = 10; // T16: reference PI film thickness for the colour (RDL dielectric layers are ~5-10 um)

export const RECIPES: Recipe[] = [
	{
		key: 'si',
		name: 'Silicon (ground / polished)',
		cls: 'silicon',
		states: ['finish', 'wet'],
		transparent: false,
		basis: 'F0 from Green 2008 n,k; grind arcs of the wheel radius through the wafer centre (in-feed grinding)',
		init(m, u) {
			metal(m, F0.si, 0.4);
			u.uScr2.value.set(0, 180, 0.08, 0);
		},
		apply(s, m, u) {
			// finish 0 coarse ground .. 0.5 fine ground .. 1 polished mirror
			const f = cl(s.finish);
			const g = cl(f * 2); // 0 coarse -> 1 fine
			const p = cl(f * 2 - 1); // 0 fine -> 1 polished
			const sp = Math.exp(lerp(Math.log(GRIND_COARSE_UM), Math.log(GRIND_FINE_UM), g));
			m.roughness = lerp(lerp(0.55, 0.3, g), 0.03, p);
			u.uScr.value.set(sp, lerp(lerp(0.6, 0.08, g), 0.0, p), lerp(0.85, 0.0, p), p > 0.999 ? 0 : 1);
			u.uScr2.value.z = lerp(0.1, 0.0, p);
		}
	},
	{
		key: 'si_etched',
		name: 'Silicon (dry-etched / revealed)',
		cls: 'silicon',
		states: ['wet'],
		transparent: false,
		basis: 'F0 from Green 2008; uniform micro-roughness (template)',
		init(m, u) {
			metal(m, F0.si, 0.22);
			u.uMottle.value.set(40, 0.04, 0.05, 0);
		}
	},
	{
		key: 'oxide',
		name: 'SiO2 (PECVD / thermal)',
		cls: 'oxide',
		states: ['finish', 'wet'],
		transparent: true,
		basis: 'n = 1.461 (Malitson 1965); translucent film, tint template',
		init(m, u) {
			dielectric(m, '#c4d2dc', 0.12, IOR.sio2, 0.5);
			u.uAlphaFres.value = 1;
		},
		apply(s, m) {
			m.roughness = lerp(0.12, 0.03, cl(s.finish));
		}
	},
	{
		key: 'nitride',
		name: 'SiN (PECVD)',
		cls: 'oxide',
		states: ['wet'],
		transparent: true,
		basis: 'n = 2.056 (Luke 2015, LPCVD); PECVD slight yellow tint template',
		init(m, u) {
			dielectric(m, '#cdc5ad', 0.1, IOR.si3n4, 0.6);
			u.uAlphaFres.value = 1;
		}
	},
	{
		key: 'cu_seed',
		name: 'Cu seed (sputtered)',
		cls: 'copper',
		states: ['wet'],
		transparent: false,
		basis: 'F0 from Johnson and Christy 1972; smooth film replicating the substrate, faint sheen (template)',
		init(m, u) {
			metal(m, F0.cu, 0.1);
			u.uMottle.value.set(400, 0.03, 0.04, 0);
			u.uGrain.value.set(0.08, 0, 0, 0.05); // S12 as-deposited grain size; unresolved except at nm zoom
		}
	},
	{
		key: 'cu',
		name: 'Cu (plated / CMP)',
		cls: 'copper',
		states: ['finish', 'wet'],
		transparent: false,
		basis: 'F0 J&C 1972; plated grains several um (Harper 1999); CMP scratches and dishing (patent data)',
		init(m, u) {
			metal(m, F0.cu, 0.45);
			u.uScr2.value.set(0, 0, 0, CMP_SCR_W_UM);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			m.roughness = lerp(0.42, 0.04, f);
			// plated nodular grains fade to a polished section through the same grains (grain contrast only)
			u.uGrain.value.set(CU_GRAIN_UM, lerp(0.05, 0.0, f), lerp(0.035, 0.015, f), lerp(0.2, 0.02, f));
			u.uGrain2.value.set(lerp(0.04, 0.02, f), 0, 0, 0);
			u.uMottle.value.set(300, lerp(0.025, 0.0, f), lerp(0.04, 0.0, f), 0);
			// CMP micro-scratches and dishing appear with polishing
			u.uScr.value.set(150, CMP_SCR_D_UM * f, 0, f > 0.5 ? 2 : 0);
			u.uDish.value.set(CU_DISH_UM * f, 0, 0, 0);
		}
	},
	{
		key: 'al',
		name: 'Al (pad / RDL)',
		cls: 'copper',
		states: ['finish', 'wet'],
		transparent: false,
		basis: 'F0 from Rakic 1995 (evaporated Al film); sputtered hillock grain template',
		init(m, u) {
			metal(m, F0.al, 0.2);
			u.uGrain.value.set(1, 0.015, 0.02, 0.08);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			m.roughness = lerp(0.2, 0.05, f);
			u.uGrain.value.y = lerp(0.015, 0, f);
		}
	},
	{
		key: 'ti',
		name: 'Ti barrier / adhesion',
		cls: 'copper',
		states: ['wet'],
		transparent: false,
		basis: 'F0 from Johnson and Christy 1974',
		init(m) {
			metal(m, F0.ti, 0.18);
		}
	},
	{
		key: 'ta',
		name: 'Ta / TaN barrier',
		cls: 'copper',
		states: ['wet'],
		transparent: false,
		basis: 'F0 from Werner 2009 (Ta metal; TaN not tabulated)',
		init(m) {
			metal(m, F0.ta, 0.18);
		}
	},
	{
		key: 'ni',
		name: 'Ni (electroless Ni-P / plated)',
		cls: 'copper',
		states: ['wet'],
		transparent: false,
		basis: 'F0 from Johnson and Christy 1974 (pure Ni); nodular surface template',
		init(m, u) {
			metal(m, F0.ni, 0.3);
			u.uGrain.value.set(3, 0.1, 0.04, 0.15);
			u.uGrain2.value.set(0.05, 0, 0, 0);
		}
	},
	{
		key: 'au',
		name: 'Au (ENIG immersion)',
		cls: 'copper',
		states: ['wet'],
		transparent: false,
		basis: 'F0 J&C 1972; 0.05 um Au follows the Ni-P nodules (IPC-4552)',
		init(m, u) {
			metal(m, F0.au, 0.26);
			u.uGrain.value.set(3, 0.1, 0.03, 0.12);
			u.uGrain2.value.set(0.04, 0, 0, 0);
		}
	},
	{
		key: 'osp',
		name: 'OSP on Cu',
		cls: 'copper',
		states: ['wet'],
		transparent: false,
		basis: 'Cu F0 under a thin organic film; brownish tint template',
		init(m, u) {
			metal(m, mulRGB(F0.cu, [0.82, 0.72, 0.6]), 0.3);
			u.uMottle.value.set(150, 0.06, 0.05, 0);
		}
	},
	{
		key: 'solder',
		name: 'Solder SnAg (plated / reflowed)',
		cls: 'solder',
		states: ['finish', 'melt', 'wet'],
		transparent: false,
		basis: 'Sn F0 (Golovashkin 1964, 730 nm); matte plated, liquid mirror, frosted solidified (template)',
		init(m) {
			metal(m, F0.sn, 0.5);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			const L = cl(s.melt);
			// as plated (finish 0): fine matte grains (3 um, faded below 3 px); reflowed (finish 1): a liquid-formed
			// surface, smooth with a satin sheen (solidification texture is sub-um to a few um: roughness only, no relief)
			const solidR = lerp(0.45, 0.24, f);
			m.roughness = lerp(solidR, 0.05, L);
			const k = (1 - f) * (1 - L);
			u.uGrain.value.set(3, 0.06 * k, 0.03 * k, 0.15 * (1 - L) * (1 - f) + 0.04 * f * (1 - L));
			u.uGrain2.value.set(0.03 * k, 0, 0, 0);
			// oxide skin dulls the solid; liquid is bright
			m.color.copy(lin(mixRGB(mulRGB(F0.sn, [0.86, 0.86, 0.85]), F0.sn, L)));
		}
	},
	{
		key: 'solder_paste',
		name: 'Solder paste SAC (Type 4)',
		cls: 'solder',
		states: ['finish', 'melt'],
		transparent: false,
		basis: 'J-STD-005 Type 4 powder (20-38 um) in rosin flux; reflow -> liquid -> solid',
		init(m, u) {
			dielectric(m, '#7d7466', 0.25, 1.53);
			u.uPart3.value.x = 1.6; // T19: fine tail of Type 4 (<= 10 % below 20 um)
			u.uPartCol.value.copy(lin(mulRGB(F0.sn, [0.82, 0.82, 0.8])));
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			const L = cl(s.melt);
			// paste: metal powder spheres in glossy flux. Once molten (or reflowed) the surface is solder.
			const merged = Math.max(L, f);
			u.uPart.value.set(PASTE_D50_UM, PASTE_METAL_VOL, 6, 0);
			u.uPart2.value.set(1, 0.45, 0, 0);
			u.uCoat.value.set(0.7 * (1 - merged), 0.08);
			if (merged > 0) {
				u.uPart.value.y = lerp(PASTE_METAL_VOL, 1, merged);
				u.uPart.value.z = lerp(6, 0, merged);
				u.uPart2.value.y = lerp(0.45, lerp(0.24, 0.035, L), merged);
				u.uPartCol.value.copy(lin(mixRGB(mulRGB(F0.sn, [0.82, 0.82, 0.8]), F0.sn, L)));
			} else {
				u.uPartCol.value.copy(lin(mulRGB(F0.sn, [0.82, 0.82, 0.8])));
			}
			m.roughness = 0.25;
		}
	},
	{
		key: 'imc',
		name: 'IMC (Cu6Sn5 / Ni3Sn4)',
		cls: 'solder',
		states: [],
		transparent: false,
		basis: 'no optical constants found; grey metallic with scallop grains (template)',
		init(m, u) {
			metal(m, [0.42, 0.4, 0.37], 0.45);
			u.uGrain.value.set(2, 0.25, 0.06, 0.2);
			u.uGrain2.value.set(0.1, 0.3, 0, 0);
		}
	},
	{
		key: 'resist',
		name: 'Photoresist (positive i-line DNQ)',
		cls: 'polymer',
		states: ['exposed', 'wet'],
		transparent: true,
		basis: 'DNQ absorbs below ~440-490 nm and bleaches on exposure (MicroChemicals); tint template',
		init(m, u) {
			dielectric(m, [0.85, 0.42, 0.1], 0.08, 1.64, 0.78);
			u.uAlphaFres.value = 1;
		},
		apply(s, m) {
			const e = cl(s.exposed);
			m.color.copy(lin(mixRGB([0.85, 0.42, 0.1], [0.9, 0.78, 0.45], e)));
			m.opacity = lerp(0.78, 0.6, e);
		}
	},
	{
		key: 'dry_film',
		name: 'Dry film resist (negative)',
		cls: 'polymer',
		states: ['exposed', 'wet'],
		transparent: true,
		basis: 'blue / green leuco-dye resist, exposed areas darker (print-out image); tint template',
		init(m, u) {
			dielectric(m, '#3a8f86', 0.18, 1.55, 0.85);
			u.uAlphaFres.value = 1;
		},
		apply(s, m) {
			m.color.set('#3a8f86').lerp(new THREE.Color('#1d5560'), cl(s.exposed));
		}
	},
	{
		key: 'polyimide',
		name: 'Polyimide (amber)',
		cls: 'polymer',
		states: ['cure', 'wet'],
		transparent: true,
		basis: 'Kapton-H n and absorption (Kumar 2011), double pass through 10 um; cure deepens the amber (template)',
		init(m, u) {
			dielectric(m, filmTint(KAPTON_ALPHA, PI_FILM_UM), 0.12, IOR.kapton, 0.82);
			u.uAlphaFres.value = 1;
		},
		apply(s, m, u) {
			const c = cl(s.cure);
			const k = lerp(0.6, 1.0, c);
			m.color.copy(lin(filmTint([KAPTON_ALPHA[0] * k, KAPTON_ALPHA[1] * k, KAPTON_ALPHA[2] * k], PI_FILM_UM)));
			u.uCoat.value.set(lerp(0.5, 0.0, c), 0.06);
		}
	},
	{
		key: 'emc',
		name: 'EMC (black, silica filled)',
		cls: 'mold',
		states: ['finish', 'cure', 'front'],
		transparent: false,
		frontDir: 'radial',
		basis: 'black epoxy with fused silica filler d50 15 um; as-molded skin vs ground section (filler visible)',
		init(m, u) {
			dielectric(m, [0.022, 0.022, 0.024], 0.55, 1.57);
			u.uPartCol.value.copy(lin([0.2, 0.2, 0.21]));
			u.uPart3.value.x = 3.2; // T20: fine filler fraction (bimodal blends: S15b)
			u.uWet.value.y = 0;
			u.uFront2.value.set(0.9, 0.0, 0, 0);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			const c = cl(s.cure);
			// as molded: resin skin over the filler (cover 0.92); ground: filler sections exposed
			u.uPart.value.set(EMC_D50_UM, EMC_FILL, 0, lerp(0.96, 0, f));
			u.uPart2.value.set(0, lerp(0.5, 0.15, f), 0, lerp(0.15, 0, f));
			m.roughness = lerp(lerp(0.15, 0.6, c), 0.12, f);
			u.uCoat.value.set(lerp(0.6, 0.0, c), 0.08);
			u.uMottle.value.set(800, 0.0, lerp(0.06, 0.02, f), 0);
		}
	},
	{
		key: 'underfill',
		name: 'Capillary underfill (black)',
		cls: 'underfill',
		states: ['cure', 'front', 'wet'],
		transparent: false,
		frontDir: '+x',
		basis: 'black epoxy CUF (Henkel UF 9000AG class); wet glossy flow front, semi-gloss when cured',
		init(m, u) {
			dielectric(m, [0.03, 0.03, 0.032], 0.3, 1.55);
			u.uPartCol.value.copy(lin([0.12, 0.12, 0.125]));
			u.uFront2.value.set(1.0, 0.25, 0, 0);
		},
		apply(s, m, u) {
			const c = cl(s.cure);
			u.uPart.value.set(1, 0.5, 0, lerp(0.95, 0.85, c)); // T17: fine CUF filler, resin skin on free surfaces
			u.uPart2.value.set(0, 0.4, 0, 0);
			m.roughness = lerp(0.06, 0.32, c);
			u.uCoat.value.set(lerp(0.9, 0.15, c), 0.05);
		}
	},
	{
		key: 'abf',
		name: 'ABF build-up film',
		cls: 'organic',
		states: ['cure', 'wet'],
		transparent: false,
		basis: 'silica-filled epoxy film; colour template (no public appearance spec found)',
		init(m, u) {
			dielectric(m, '#a9a46c', 0.5, 1.6);
			u.uPartCol.value.set('#c9c6a8');
			u.uPart.value.set(0.5, 0.6, 0, 0.5); // T18: sub-um silica filler, unresolved except at um zoom
			u.uPart2.value.set(0, 0.5, 0, 0);
		},
		apply(s, m) {
			m.roughness = lerp(0.3, 0.55, cl(s.cure));
		}
	},
	{
		key: 'core',
		name: 'Core laminate (glass-fibre weave)',
		cls: 'organic',
		states: [],
		transparent: false,
		basis: 'style 2116 plain weave (Isola: 60 x 58 / inch, 0.097 mm) in BT / epoxy resin; colours template',
		init(m, u) {
			dielectric(m, '#6a5530', 0.45, 1.55);
			u.uWeave.value.set(WEAVE_WARP_UM, WEAVE_FILL_UM, WEAVE_PLY_UM, 1);
			u.uWeaveCol.value.set('#b9ad88');
			u.uWeave2.value.set(FILAMENT_UM, 0.86, 0.42, 0);
		}
	},
	{
		key: 'solder_resist',
		name: 'Solder resist (green)',
		cls: 'organic',
		states: ['cure', 'exposed', 'wet'],
		transparent: false,
		basis: 'Taiyo PSR-800 AUS SR1 (AUS410): green, 20 um; semi-gloss (template)',
		init(m, u) {
			dielectric(m, '#2e6b45', 0.3, 1.55);
			u.uMottle.value.set(500, 0.05, 0.04, 0);
		},
		apply(s, m) {
			m.roughness = lerp(0.18, 0.32, cl(s.cure));
		}
	},
	{
		key: 'glass',
		name: 'Glass carrier (borosilicate)',
		cls: 'glass',
		states: ['wet'],
		transparent: true,
		basis: 'n = 1.474 (SCHOTT BOROFLOAT 33); clear: alpha-blended, double-sided, path-length edge tint (no transmission pre-pass)',
		init(m, u) {
			// clear glass scatters no light: near-black base, low alpha. Blending: src + dst * (1 - a), so the specular
			// reflection is added at full strength and what is behind is transmitted at (1 - a), not washed to white
			dielectric(m, '#0b0e0d', 0.02, IOR.borofloat, 0.06);
			m.blending = THREE.CustomBlending;
			m.blendEquation = THREE.AddEquation;
			m.blendSrc = THREE.OneFactor;
			m.blendDst = THREE.OneMinusSrcAlphaFactor;
			// both sides: the far faces of the slab show through the near ones (volume cue, internal reflections)
			m.side = THREE.DoubleSide;
			u.uAlphaFres.value = 1;
			// T36: faint green-grey edge colour growing with the path through the glass (1 / |n.v|)
			u.uPathTint.value.set(0.05, 0.075, 0.07, 0.06);
		},
		scale(umPerUnit, m, u) {
			// work scale (>= 100 um per unit: a 300 mm carrier seen at grazing angles): reflection and edge tint
			// reduced (T37, illustrative) so layers under the carrier (laser-debond tracks on the release layer) read
			// through; block / cell keep the physical Fresnel reflection
			const work = umPerUnit >= 100;
			m.specularIntensity = work ? 0.3 : 1;
			u.uPathTint.value.w = work ? 0.015 : 0.06;
			u.uAlphaFres.value = work ? 0.3 : 1;
		}
	},
	{
		key: 'tba',
		name: 'Temporary bonding adhesive',
		cls: 'polymer',
		states: ['cure', 'melt'],
		transparent: true,
		basis: 'pale amber translucent thermoplastic / thermoset (template)',
		init(m, u) {
			dielectric(m, '#d6b16a', 0.2, 1.55, 0.75);
			u.uAlphaFres.value = 1;
		},
		apply(s, m, u) {
			m.roughness = lerp(0.12, 0.25, cl(s.cure)) * (1 - 0.7 * cl(s.melt));
			u.uCoat.value.set(Math.max(cl(s.melt), 0.4 * (1 - cl(s.cure))), 0.05);
		}
	},
	{
		key: 'release',
		name: 'Release layer (LTHC)',
		cls: 'polymer',
		states: ['exposed'],
		transparent: false,
		basis: 'carbon-black light-to-heat conversion layer, 1.5-2.5 um (US 10522526); scanned = decomposed (template)',
		init(m) {
			dielectric(m, [0.025, 0.025, 0.027], 0.35, 1.6);
		},
		apply(s, m, u) {
			const e = cl(s.exposed);
			m.roughness = lerp(0.35, 0.85, e);
			u.uMottle.value.set(60, 0.3 * e, 0.1 * e, 0);
		}
	},
	{
		key: 'daf',
		name: 'Die attach film',
		cls: 'polymer',
		states: ['cure'],
		transparent: true,
		basis: 'translucent milky film (template)',
		init(m, u) {
			dielectric(m, '#d9d3c1', 0.3, 1.55, 0.85);
			u.uAlphaFres.value = 1;
		},
		apply(s, m) {
			m.roughness = lerp(0.2, 0.35, cl(s.cure));
		}
	},
	{
		key: 'adhesive',
		name: 'Adhesive (lid / stiffener attach)',
		cls: 'polymer',
		states: ['cure', 'front'],
		transparent: false,
		frontDir: '+x',
		basis: 'grey filled adhesive (template)',
		init(m, u) {
			dielectric(m, '#8b8b86', 0.35, 1.55);
			u.uFront2.value.set(0.8, 0.1, 0, 0);
		},
		apply(s, m, u) {
			const c = cl(s.cure);
			m.roughness = lerp(0.12, 0.4, c);
			u.uCoat.value.set(lerp(0.7, 0.0, c), 0.06);
		}
	},
	{
		key: 'flux',
		name: 'Flux (liquid / residue)',
		cls: 'other',
		states: ['wet'],
		transparent: true,
		basis: 'rosin-based flux: amber translucent; wet = liquid film, 0 = residue (template)',
		init(m, u) {
			dielectric(m, '#c58f2c', 0.15, 1.53, 0.6);
			u.uAlphaFres.value = 1;
			u.uWet.value.y = 0;
		},
		apply(s, m, u) {
			const w = cl(s.wet);
			m.opacity = lerp(0.65, 0.45, w);
			u.uCoat.value.set(lerp(0.35, 1, w), lerp(0.12, 0.03, w));
			u.uMottle.value.set(200, 0.15 * (1 - w), 0.1 * (1 - w), 0);
		}
	},
	{
		key: 'slurry',
		name: 'CMP slurry film',
		cls: 'other',
		states: ['front'],
		transparent: true,
		frontDir: 'radial',
		basis: 'colloidal silica slurry: milky translucent liquid (template)',
		init(m, u) {
			dielectric(m, '#e9eef1', 0.05, 1.34, 0.5);
			u.uCoat.value.set(1, 0.03);
			u.uAlphaFres.value = 1;
			u.uMottle.value.set(3000, 0.12, 0, 0);
			u.uFront.value.z = 0.06;
		}
	},
	{
		key: 'electrolyte',
		name: 'Electrolyte (acid Cu sulfate)',
		cls: 'other',
		states: ['front'],
		transparent: true,
		basis: 'blue from the Cu(II) aquo ion red absorption band; tint and opacity template',
		init(m, u) {
			dielectric(m, '#4f8fcf', 0.03, 1.34, 0.35);
			u.uCoat.value.set(1, 0.02);
			u.uAlphaFres.value = 1;
		}
	},
	{
		key: 'ceramic',
		name: 'Ceramic AlN (TCB tool face)',
		cls: 'other',
		states: ['finish', 'wet'],
		transparent: false,
		basis: 'sintered AlN, grey (Maruwa AN-170 / AN-200, Kyocera AlN170-230); n = 2.162 (Pastrnak 1966)',
		init(m, u) {
			dielectric(m, '#9c9d98', 0.5, IOR.aln);
			u.uGrain.value.set(4, 0.08, 0.05, 0.2); // T31: sintered grain size, template
			u.uGrain2.value.set(0.06, 0.3, 0, 0);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			m.roughness = lerp(0.5, 0.15, f); // 0 as fired / ground .. 1 lapped
			u.uGrain.value.y = lerp(0.08, 0.0, f);
		}
	},
	{
		key: 'ceramic_sic',
		name: 'Ceramic SiC (sintered)',
		cls: 'other',
		states: ['finish', 'wet'],
		transparent: false,
		basis: 'n = 2.675 (Shaffer 1971, beta-SiC); dark grey colour template',
		init(m, u) {
			dielectric(m, '#3b3d3f', 0.45, IOR.sic);
			u.uGrain.value.set(5, 0.08, 0.04, 0.2);
			u.uGrain2.value.set(0.05, 0.3, 0, 0);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			m.roughness = lerp(0.45, 0.1, f);
			u.uGrain.value.y = lerp(0.08, 0.0, f);
		}
	},
	{
		key: 'silicone',
		name: 'Silicone adhesive (stiffener glue)',
		cls: 'polymer',
		states: ['cure', 'front'],
		transparent: false,
		frontDir: '+x',
		basis: 'grey filled silicone (DOWSIL EA-7300 / SE 9188 grey, distributor data); PDMS n = 1.435 (Sylgard 184)',
		init(m, u) {
			dielectric(m, '#8e9093', 0.45, IOR.pdms);
			u.uFront2.value.set(0.7, 0.05, 0, 0);
			u.uMottle.value.set(300, 0.04, 0.05, 0);
		},
		apply(s, m, u) {
			const c = cl(s.cure);
			m.roughness = lerp(0.2, 0.45, c);
			u.uCoat.value.set(lerp(0.6, 0.0, c), 0.08);
		}
	},
	{
		key: 'pet',
		name: 'PET film (laminator support)',
		cls: 'polymer',
		states: ['wet'],
		transparent: true,
		basis: 'clear colourless PET, n = 1.576 (Zhang 2020); opacity template',
		init(m, u) {
			dielectric(m, '#f2f4f4', 0.04, IOR.pet, 0.2);
			u.uAlphaFres.value = 1;
		}
	},
	{
		key: 'water',
		name: 'Water (DI coolant / SAM coupling)',
		cls: 'other',
		states: ['front'],
		transparent: true,
		frontDir: '+x',
		basis: 'n = 1.334 (Hale and Querry 1973); colourless at mm path (k ~ 1e-9 in the visible); opacity template',
		init(m, u) {
			dielectric(m, '#dfeef4', 0.02, IOR.water, 0.18);
			u.uCoat.value.set(1, 0.02);
			u.uAlphaFres.value = 1;
			u.uWet.value.y = 0;
		}
	},
	{
		key: 'steel',
		name: 'Stainless steel SUS430 (lid / stiffener)',
		cls: 'lid',
		states: ['finish'],
		transparent: false,
		basis: 'F0 from Karlsson and Ribbing 1982 (ferritic); rolled 2B vs bright finish (template)',
		init(m, u) {
			metal(m, F0.sus430, 0.3);
			u.uScr.value.set(4, 0.05, 0.5, 3);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			m.roughness = lerp(0.32, 0.08, f);
			u.uScr.value.set(4, lerp(0.08, 0.01, f), lerp(0.55, 0.2, f), 3);
		}
	},
	{
		key: 'cu_stiffener',
		name: 'Cu stiffener (bare, machined)',
		cls: 'lid',
		states: ['finish'],
		transparent: false,
		basis: 'Cu F0 (J&C 1972); rolled lines (template). Ni-plated stiffeners: use key ni',
		init(m, u) {
			metal(m, F0.cu, 0.3);
			u.uScr.value.set(5, 0.06, 0.5, 3);
		},
		apply(s, m, u) {
			const f = cl(s.finish);
			m.roughness = lerp(0.32, 0.07, f);
			u.uScr.value.set(5, lerp(0.08, 0.01, f), lerp(0.55, 0.2, f), 3);
		}
	}
];
