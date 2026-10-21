// Ported from eo-modulator-atlas app/src/lib/sim/sweepValues.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: logspace(a, b, n) added (R7 2.2, frequency lists); EO device-column helpers removed.
// Sweep value specs: "3, 4, 5" (list), "start:step:stop" (inclusive range), "linspace(a, b, n)" or "logspace(a, b, n)"
// (a and b are the end values, not exponents; both > 0).

export const MAX_SWEEP_POINTS = 200;

export function parseSweepValues(spec: string): number[] {
	const s = spec.trim();
	if (!s) throw new Error('Empty sweep values');
	let out: number[];
	const lg = s.match(/^logspace\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
	if (lg) {
		const [a, b, n] = [Number(lg[1]), Number(lg[2]), Number(lg[3])];
		if (![a, b, n].every(Number.isFinite) || !(a > 0) || !(b > 0) || !Number.isInteger(n) || n < 1) throw new Error('logspace(a, b, n) needs end values > 0 and an integer n >= 1');
		if (n > MAX_SWEEP_POINTS) throw new Error(`At most ${MAX_SWEEP_POINTS} points`);
		const la = Math.log10(a), lb = Math.log10(b);
		return Array.from({ length: n }, (_, k) => Number((10 ** (n === 1 ? la : la + ((lb - la) * k) / (n - 1))).toPrecision(12)));
	}
	const lin = s.match(/^linspace\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
	if (lin) {
		const [a, b, n] = [Number(lin[1]), Number(lin[2]), Number(lin[3])];
		if (![a, b, n].every(Number.isFinite) || !Number.isInteger(n) || n < 1) throw new Error('linspace(a, b, n) needs numbers and an integer n >= 1');
		out = Array.from({ length: n }, (_, k) => (n === 1 ? a : a + ((b - a) * k) / (n - 1)));
	} else if (/^[^,]+:[^,]+:[^,]+$/.test(s)) {
		const [a, step, b] = s.split(':').map((v) => Number(v.trim()));
		if (![a, step, b].every(Number.isFinite) || step === 0 || Math.sign(b - a) * Math.sign(step) < 0) throw new Error('Range start:step:stop needs a nonzero step towards stop');
		const n = Math.floor((b - a) / step + 1e-9) + 1;
		if (n > MAX_SWEEP_POINTS) throw new Error(`At most ${MAX_SWEEP_POINTS} points`);
		out = Array.from({ length: n }, (_, k) => Number((a + k * step).toPrecision(12)));
	} else {
		out = s.split(/[,\s]+/).filter(Boolean).map((v) => {
			const n = Number(v);
			if (!Number.isFinite(n)) throw new Error(`Not a number: ${v}`);
			return n;
		});
	}
	if (!out.length) throw new Error('No sweep values');
	if (out.length > MAX_SWEEP_POINTS) throw new Error(`At most ${MAX_SWEEP_POINTS} points`);
	return out;
}
