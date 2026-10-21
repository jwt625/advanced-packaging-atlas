// Ported from eo-modulator-atlas app/src/lib/sim/yamlEdit.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: imports the local TypeScript port yamlSplice.ts (the atlas engine has no yaml-edit module);
// numericLeaves skips the packaging case blocks that are not inputs (targets, assumptions, missing).
// YAML round-trip edits (EO DevLog-023 D6, DevLog-027 U3/G3): every edit splices the source text; a scalar edit or a
// key insertion changes one line, and deleting an inserted key restores the original text byte for byte.
import {
	setIn as spliceSetIn,
	deleteIn as spliceDeleteIn,
	getIn as spliceGetIn,
	applyOverrides as spliceApplyOverrides,
	splitPath as spliceSplit,
	type PathKey
} from './yamlSplice';

export type { PathKey };

/** Split a dotted path; numeric segments index sequences (`physics.thermal.sources.0.power_W`). */
export function splitPath(path: string): PathKey[] {
	return spliceSplit(path);
}

/** Set a value at a path and return the new text; throws on unparsable input. */
export function setIn(text: string, path: PathKey[], value: unknown): string {
	return spliceSetIn(text, path, value);
}

/** Remove a key (form field cleared). */
export function deleteIn(text: string, path: PathKey[]): string {
	return spliceDeleteIn(text, path);
}

export function getIn(text: string, path: PathKey[]): unknown {
	return spliceGetIn(text, path);
}

/** Apply several path=value overrides in order. */
export function applyOverrides(text: string, overrides: [string, unknown][]): string {
	return spliceApplyOverrides(text, overrides);
}

/** Numeric leaves of a parsed config (for sweep path suggestions), skipping targets and provenance blocks. */
export function numericLeaves(raw: unknown, prefix = '', out: { path: string; value: number }[] = []): { path: string; value: number }[] {
	if (raw == null || typeof raw !== 'object') return out;
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		const p = prefix ? `${prefix}.${k}` : k;
		if (!prefix && ['targets', 'assumptions', 'missing', 'schema'].includes(k)) continue;
		if (typeof v === 'number' && Number.isFinite(v)) out.push({ path: p, value: v });
		else if (v && typeof v === 'object') numericLeaves(v, p, out);
	}
	return out;
}

/** Parse a form value: number when numeric, else the trimmed string. */
export function coerce(input: string): number | string {
	const s = input.trim();
	if (s !== '' && Number.isFinite(Number(s))) return Number(s);
	return s;
}
