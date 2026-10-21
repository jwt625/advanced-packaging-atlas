// Ported from eo-modulator-atlas app/src/lib/sim/colormap.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: EO material colors removed (packaging material colors come from app/src/lib/three/materials.ts).
// 256-entry color tables built by linear interpolation between anchor colors. Names follow COMSOL's color tables
// (Reference Manual, Results, color tables); the anchors are our own approximations of the described ramps, not
// COMSOL data. Viridis and Cividis anchors: matplotlib (sampled at equal steps). Wave: ColorBrewer RdBu 9-class
// (reversed, negative = blue). Linear sRGB interpolation between anchors is a display approximation.

export type ColormapName = 'Rainbow' | 'RainbowLight' | 'Thermal' | 'Wave' | 'Viridis' | 'Cividis' | 'GrayScale';

const ANCHORS: Record<ColormapName, string[]> = {
	Rainbow: ['#1c1a8a', '#2050c8', '#2b8fe0', '#3fc2d6', '#5fd39a', '#a5dc5a', '#e6d23a', '#f19a2d', '#d8452a', '#9c1a1a'],
	RainbowLight: ['#5a63c9', '#6f9ae6', '#7fc8ee', '#8fe3d4', '#a8e8a8', '#d2ea8a', '#f5e07a', '#f7b56e', '#ec8468', '#d65f5f'],
	Thermal: ['#000000', '#3b0a07', '#7a1408', '#b8250b', '#e0520f', '#f2861c', '#f8b73d', '#fbe27a', '#ffffff'],
	Wave: ['#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b'],
	Viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
	Cividis: ['#00224e', '#123570', '#3b496c', '#575d6d', '#707173', '#8a8779', '#a69d75', '#c4b56c', '#e4cf5b', '#fee838'],
	GrayScale: ['#000000', '#ffffff']
};

export const COLORMAPS: ColormapName[] = ['Rainbow', 'RainbowLight', 'Thermal', 'Wave', 'Viridis', 'Cividis', 'GrayScale'];
export const COLORMAP_TIPS: Record<ColormapName, string> = {
	Rainbow: 'Blue, cyan, green, yellow, red; general purpose (hard to read with red-green color vision deficiency)',
	RainbowLight: 'Lighter Rainbow; for overlays',
	Thermal: 'Heated metal: black, red, yellow, white (light = high)',
	Wave: 'Diverging: blue negative, white zero, red positive; use with the symmetric scale',
	Viridis: 'Perceptually uniform, color vision deficiency friendly',
	Cividis: 'Blue to yellow, readable with red-green color vision deficiency',
	GrayScale: 'Black to white'
};

export function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const cache = new Map<string, Uint8Array>();

/** RGBA8 table, 256 entries. */
export function colormapLut(name: ColormapName, reverse = false): Uint8Array {
	const key = `${name}${reverse ? ':r' : ''}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const anchors = (reverse ? [...ANCHORS[name]].reverse() : ANCHORS[name]).map(hexToRgb);
	const lut = new Uint8Array(256 * 4);
	for (let i = 0; i < 256; i++) {
		const u = (i / 255) * (anchors.length - 1);
		const k = Math.min(anchors.length - 2, Math.floor(u));
		const f = u - k;
		for (let c = 0; c < 3; c++) lut[4 * i + c] = Math.round(anchors[k][c] * (1 - f) + anchors[k + 1][c] * f);
		lut[4 * i + 3] = 255;
	}
	cache.set(key, lut);
	return lut;
}

export function lutColor(lut: Uint8Array, t: number): string {
	const i = Math.max(0, Math.min(255, Math.round(t * 255)));
	return `rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`;
}
