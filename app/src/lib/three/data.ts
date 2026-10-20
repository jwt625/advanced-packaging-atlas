import { staticUrl } from '../paths';
import { FIXTURE } from './fixture';
import type { Dim, DimStatus, Family, Package3D, Ref } from './types';

export interface Loaded {
	data: Package3D;
	fixture: boolean;
	error: string;
}

let cache: Promise<Loaded> | null = null;

/** Load static/data/package3d.json; fall back to the fixture while the file does not exist (HTTP 404). */
export function loadPackage3d(): Promise<Loaded> {
	if (cache) return cache;
	cache = (async () => {
		try {
			const res = await fetch(staticUrl('data/package3d.json'));
			if (res.status === 404) return { data: FIXTURE, fixture: true, error: '' };
			if (!res.ok) throw new Error(`package3d.json: HTTP ${res.status}`);
			const ct = res.headers.get('content-type') ?? '';
			const text = await res.text();
			// Dev servers answer unknown paths with the HTML shell: treat that as "not there yet".
			if (!ct.includes('json') && text.trimStart().startsWith('<')) return { data: FIXTURE, fixture: true, error: '' };
			const d = JSON.parse(text) as Package3D;
			if (d.version !== 1) throw new Error(`package3d.json: unsupported version ${String(d.version)} (viewer expects 1)`);
			if (!Array.isArray(d.families) || !d.families.length) throw new Error('package3d.json: no families');
			d.refs ??= {};
			// DEV only: `?fixture=routing` prepends the hand-written routing fixture families (DevLog-011).
			if (import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('fixture') === 'routing') {
				const { addRoutingFixture } = await import('./fixture_routing');
				addRoutingFixture(d);
			}
			for (const f of d.families) {
				f.layers ??= [];
				f.arrays ??= [];
				f.callouts ??= [];
				f.insets ??= [];
			}
			return { data: d, fixture: false, error: '' };
		} catch (e) {
			return { data: FIXTURE, fixture: true, error: e instanceof Error ? e.message : String(e) };
		}
	})();
	return cache;
}

export const STATUS_TIP: Record<DimStatus, string> = {
	reported: 'reported: value from a database row of this family',
	derived: 'derived: arithmetic on reported values',
	template: 'template: not reported in the database; illustrative'
};

/** Reference ids attached to one dimension. */
export function dimRefs(d: Dim | undefined): string[] {
	if (!d) return [];
	const out: string[] = [];
	if (d.ref) out.push(d.ref);
	if (Array.isArray(d.refs)) for (const r of d.refs) if (!out.includes(r)) out.push(r);
	return out;
}

/** Every reference id used by a family (dims of parts, layers, arrays and callouts), in first-use order. */
export function familyRefs(f: Family): string[] {
	const seen = new Set<string>();
	const add = (ids: string[]) => ids.forEach((i) => seen.add(i));
	for (const it of [...f.parts, ...(f.layers ?? []), ...(f.arrays ?? [])]) for (const d of Object.values(it.dims ?? {})) add(dimRefs(d));
	for (const c of f.callouts ?? []) add(c.refs ?? []);
	return [...seen];
}

export function doiUrl(r: Ref | undefined): string {
	if (!r) return '';
	if (r.doi) return r.doi.startsWith('http') ? r.doi : `https://doi.org/${r.doi}`;
	return typeof r.url === 'string' ? r.url : '';
}

/** Worst status among the given dims (template > derived > reported); a missing dim counts as template. */
export function worstStatus(dims: Record<string, Dim> | undefined, keys: string[]): DimStatus {
	let w: DimStatus = 'reported';
	for (const k of keys) {
		const s = dims?.[k]?.status ?? 'template';
		if (s === 'template') return 'template';
		if (s === 'derived') w = 'derived';
	}
	return w;
}

export function fmtNum(v: number): string {
	if (!Number.isFinite(v)) return String(v);
	const a = Math.abs(v);
	if (a === 0) return '0';
	if (a >= 100) return v.toFixed(0);
	if (a >= 10) return v.toFixed(1).replace(/\.0$/, '');
	if (a >= 1) return v.toFixed(2).replace(/\.?0+$/, '');
	return v.toPrecision(2);
}

export function fieldUnit(field: string): string {
	if (field.endsWith('_mm')) return 'mm';
	if (field.endsWith('_um')) return 'µm';
	return '';
}
export function fieldLabel(field: string): string {
	return field.replace(/_(mm|um)$/, '');
}
