// Ported from eo-modulator-atlas app/src/lib/sim/units.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: packaging key suffixes (sims/SPEC.md: _mm, _um, _C, _K, _W, _GPa, _MPa, _ppmK, _GHz, _W_m2K ...);
// EO-only suffixes removed; unitLabel for display; leaves unchanged.

const SUFFIX: [RegExp, string][] = [
	[/_um$/, 'µm'],
	[/_nm$/, 'nm'],
	[/_mm$/, 'mm'],
	[/_m$/, 'm'],
	[/_C$/, '°C'],
	[/_K$/, 'K'],
	[/_W$/, 'W'],
	[/_W_m2K$|_Wpm2K$/, 'W/(m²·K)'],
	[/_W_mK$/, 'W/(m·K)'],
	[/_W_m2$/, 'W/m²'],
	[/_GPa$/, 'GPa'],
	[/_MPa$/, 'MPa'],
	[/_Pa$/, 'Pa'],
	[/_ppmK$/, 'ppm/K'],
	[/_GHz$|_ghz$/, 'GHz'],
	[/_Hz$/, 'Hz'],
	[/_ohm$/, 'Ω'],
	[/_deg$/, 'deg'],
	[/_S_m$|_Sm$/, 'S/m'],
	[/_kg_m3$/, 'kg/m³'],
	[/_J_kgK$/, 'J/(kg·K)']
];

/** Display unit from a config key (sims/SPEC.md: explicit unit suffixes in keys); '' when the key carries none. */
export function unitOf(path: string): string {
	const k = path.split('.').filter((s) => !/^\d+$/.test(s)).pop() ?? '';
	for (const [re, u] of SUFFIX) if (re.test(k)) return u;
	return '';
}

/** Key without its unit suffix (`hbm_d_mm` -> `hbm_d`). */
export function stripUnit(key: string): string {
	for (const [re] of SUFFIX) if (re.test(key)) return key.replace(re, '');
	return key;
}

/** Flatten scalar leaves of an object (arrays of numbers kept as one leaf per element). */
export function leaves(obj: unknown, prefix: string): { path: string; key: string; value: unknown }[] {
	const out: { path: string; key: string; value: unknown }[] = [];
	const walk = (v: unknown, p: string, key: string) => {
		if (Array.isArray(v)) {
			if (v.every((x) => typeof x === 'number')) v.forEach((x, i) => out.push({ path: `${p}.${i}`, key: `${key}[${i}]`, value: x }));
			else out.push({ path: p, key, value: v });
		} else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`, key ? `${key}.${k}` : k);
		else out.push({ path: p, key, value: v });
	};
	if (obj && typeof obj === 'object') for (const [k, x] of Object.entries(obj)) walk(x, `${prefix}.${k}`, k);
	return out;
}

/** Display form of a unit string from the engine or a config (`um` -> `µm`; `-`, `1`, `count` -> no unit label). */
export function unitLabel(u: string | null | undefined): string {
	if (u == null) return '';
	const s = String(u).trim();
	if (s === '-' || s === '1' || s === '' || s === 'count' || s === 'none') return '';
	return s.replace(/\bum\b/g, 'µm').replace(/\bdegC\b/g, '°C');
}
