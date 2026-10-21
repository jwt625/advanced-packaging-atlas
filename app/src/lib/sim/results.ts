// Results helpers for the U1 shell (SPEC 5): derived-value rows and a vertical temperature line through the Tmax node.
// Field rendering (surface, slice, deformation) is tranche U2.
import type { ThermalResult } from './protocol';

export interface DerivedRow {
	label: string;
	value: number | string;
	unit: string;
	where: string;
}

const LABEL: Record<string, [string, string]> = {
	Tmax_C: ['T max', '°C'],
	Tmin_C: ['T min', '°C'],
	heat_in_W: ['Heat in', 'W'],
	heat_out_W: ['Heat out', 'W'],
	balance_rel: ['Energy balance (relative)', '']
};

/** One row per derived value (`{value, part}` objects or plain numbers), then grid and timing statistics. */
export function derivedRows(r: ThermalResult): DerivedRow[] {
	const out: DerivedRow[] = [];
	for (const [k, v] of Object.entries(r.derived ?? {})) {
		const [label, unit] = LABEL[k] ?? [k, k.match(/_(C|K|W|m|Pa|um)$/)?.[1] ?? ''];
		if (v && typeof v === 'object' && 'value' in (v as object)) {
			const o = v as { value: number; part?: string };
			out.push({ label, value: o.value, unit, where: o.part ?? '' });
		} else if (typeof v === 'number' || typeof v === 'string') out.push({ label, value: v, unit, where: '' });
		else if (v && typeof v === 'object' && k !== 'parts')
			for (const [k2, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'number') out.push({ label: `${label}.${k2}`, value: x, unit: k2.match(/_(W|K|C)$/)?.[1] ?? unit, where: '' });
	}
	const g = r.grid;
	if (g && g.nx) out.push({ label: 'Grid cells (nx, ny, nz)', value: `${g.nx} x ${g.ny} x ${g.nz}`, unit: '', where: '' });
	for (const [k, v] of Object.entries(g?.stats ?? {})) if (typeof v === 'number') out.push({ label: `grid ${k}`, value: v, unit: '', where: '' });
	for (const [k, v] of Object.entries(r.timing ?? {})) if (typeof v === 'number') out.push({ label: k, value: v, unit: k.endsWith('_ms') ? 'ms' : '', where: '' });
	return out;
}

/** Temperature (degC) along z on the grid line through the hottest node; z in um. */
export function tLineAtMax(r: ThermalResult): { z_um: Float64Array; T_C: Float64Array; x_mm: number; y_mm: number } | null {
	const T = r.fields?.T_K;
	const g = r.grid;
	if (!T || !g?.xs || !g.ys || !g.zs) return null;
	const nxp = g.xs.length, nyp = g.ys.length, nzp = g.zs.length;
	if (T.length !== nxp * nyp * nzp) return null;
	let imax = 0;
	for (let n = 1; n < T.length; n++) if (T[n] > T[imax]) imax = n;
	const i = imax % nxp, j = Math.floor(imax / nxp) % nyp;
	const z = new Float64Array(nzp), t = new Float64Array(nzp);
	for (let k = 0; k < nzp; k++) {
		z[k] = g.zs[k] * 1e6;
		t[k] = T[i + nxp * (j + nyp * k)] - 273.15;
	}
	return { z_um: z, T_C: t, x_mm: g.xs[i] * 1e3, y_mm: g.ys[j] * 1e3 };
}

/** Per-part temperature statistics (thermal derived.parts: {Tmax_C, Tavg_C, ...}), hottest first. */
export function partRows(r: ThermalResult): { part: string; Tmax_C: number; Tavg_C: number }[] {
	const p = (r.derived?.parts ?? {}) as Record<string, { Tmax_C?: number; Tavg_C?: number }>;
	return Object.entries(p)
		.map(([part, s]) => ({ part, Tmax_C: Number(s.Tmax_C), Tavg_C: Number(s.Tavg_C) }))
		.sort((a, b) => b.Tmax_C - a.Tmax_C);
}

/** Display conversion of a field expression: display = SI * a + b, with label and unit. */
export function fieldDisplay(expr: 'T' | 'cellsize' | 'uz' | 'umag' | 'vm' | 'dT', unit: 'degC' | 'K'): { a: number; b: number; label: string; unit: string } {
	if (expr === 'cellsize') return { a: 1e3, b: 0, label: 'Cell size (largest edge)', unit: 'mm' };
	if (expr === 'uz') return { a: 1e6, b: 0, label: 'Displacement z', unit: 'µm' };
	if (expr === 'dT') return { a: 1, b: 0, label: 'T difference (B - A)', unit: 'K' };
	if (expr === 'vm') return { a: 1e-6, b: 0, label: 'von Mises stress', unit: 'MPa' };
	if (expr === 'umag') return { a: 1e6, b: 0, label: 'Displacement magnitude', unit: 'µm' };
	return unit === 'K' ? { a: 1, b: 0, label: 'Temperature', unit: 'K' } : { a: 1, b: -273.15, label: 'Temperature', unit: '°C' };
}
