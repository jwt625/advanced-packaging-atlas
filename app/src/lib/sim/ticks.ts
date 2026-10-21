// Ported from eo-modulator-atlas app/src/lib/sim/ticks.ts at eb97f96 (GPL-3.0-or-later).
// Axis tick generation for linear and log axes, and compact tick labels.

/** "Nice" linear ticks covering [min, max] with about `target` intervals. */
export function linearTicks(min: number, max: number, target = 5): number[] {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
	if (min === max) return [min];
	if (min > max) [min, max] = [max, min];
	const raw = (max - min) / Math.max(1, target);
	const mag = Math.pow(10, Math.floor(Math.log10(raw)));
	const norm = raw / mag;
	const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
	const out: number[] = [];
	const start = Math.ceil(min / step - 1e-9);
	const end = Math.floor(max / step + 1e-9);
	for (let k = start; k <= end; k++) out.push(Math.abs(k * step) < step * 1e-9 ? 0 : Number((k * step).toPrecision(12)));
	return out;
}

/** Decade ticks (and 2, 5 subdivisions when the range spans few decades) for a positive range. */
export function logTicks(min: number, max: number): number[] {
	if (!(min > 0) || !(max > 0)) return [];
	if (min > max) [min, max] = [max, min];
	const d0 = Math.floor(Math.log10(min)), d1 = Math.ceil(Math.log10(max));
	const span = d1 - d0;
	const mult = span <= 2 ? [1, 2, 5] : [1];
	const stride = span > 10 ? Math.ceil(span / 8) : 1;
	const out: number[] = [];
	for (let d = d0; d <= d1; d += stride)
		for (const m of mult) {
			const v = m * Math.pow(10, d);
			if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9)) out.push(v);
		}
	return out;
}

/** Tick label with no trailing zeros; exponent form outside [1e-3, 1e5). */
export function tickLabel(v: number): string {
	if (v === 0) return '0';
	const a = Math.abs(v);
	if (a < 1e-3 || a >= 1e5) {
		const [m, e] = v.toExponential(2).split('e');
		return `${m.replace(/\.?0+$/, '')}e${e.replace('+', '')}`;
	}
	return String(Number(v.toPrecision(6)));
}
