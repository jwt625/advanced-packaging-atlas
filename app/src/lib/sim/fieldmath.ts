// Ported from eo-modulator-atlas app/src/lib/sim/fieldmath.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: only the display-range part (Range, ScaleMode, autoRange, scaleT); the 2D mesh helpers are not used in 3D.

export type ScaleMode = 'linear' | 'symmetric' | 'log' | 'symlog';

export interface Range {
	min: number;
	max: number;
}

/** Display range for a scale mode: linear min/max, symmetric +-max|v|, log and symlog over positive |v| (range of |v|). */
export function autoRange(values: ArrayLike<number>, mode: ScaleMode): Range {
	let lo = Infinity, hi = -Infinity, amax = 0, aminPos = Infinity;
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if (!Number.isFinite(v)) continue;
		if (v < lo) lo = v;
		if (v > hi) hi = v;
		const a = Math.abs(v);
		if (a > amax) amax = a;
		if (a > 0 && a < aminPos) aminPos = a;
	}
	if (!Number.isFinite(lo)) return { min: 0, max: 1 };
	if (mode === 'symmetric') return amax > 0 ? { min: -amax, max: amax } : { min: -1, max: 1 };
	if (mode === 'log' || mode === 'symlog') {
		if (!(amax > 0)) return { min: 1e-6, max: 1 };
		// Clamp the dynamic range to 8 decades so a near-zero node does not flatten the map.
		return { min: Math.max(aminPos, amax * 1e-8), max: amax };
	}
	if (lo === hi) return { min: lo - (Math.abs(lo) || 1) * 0.5, max: hi + (Math.abs(hi) || 1) * 0.5 };
	return { min: lo, max: hi };
}

/**
 * Normalized colormap coordinate in [0, 1] (NaN when not mappable). Mirrors the fragment shader. symlog: t = 1/2 +
 * sign(v) u / 2 with u the log position of |v| in [min, max] (range of |v|); |v| < min maps to the centre.
 */
export function scaleT(v: number, mode: ScaleMode, r: Range): number {
	if (!Number.isFinite(v)) return NaN;
	let t: number;
	if (mode === 'symlog') {
		const a = Math.abs(v);
		if (!(a >= r.min) || !(r.max > r.min)) return 0.5;
		const u = Math.min(1, (Math.log10(a) - Math.log10(r.min)) / (Math.log10(r.max) - Math.log10(r.min)));
		return 0.5 + 0.5 * Math.sign(v) * u;
	}
	if (mode === 'log') {
		const a = Math.abs(v);
		if (!(a > 0)) return 0;
		t = (Math.log10(a) - Math.log10(r.min)) / (Math.log10(r.max) - Math.log10(r.min));
	} else t = (v - r.min) / (r.max - r.min);
	return t < 0 ? 0 : t > 1 ? 1 : t;
}
