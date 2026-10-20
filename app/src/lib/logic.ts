import type { Atlas, Filters, Paper, Qual, SortKey, TestVehicle } from './types';

export const EM_DASH = '—';

export function defaultFilters(): Filters {
	return {
		q: '',
		buckets: [],
		packageClasses: [],
		tvKinds: [],
		sourceStatuses: [],
		orgs: [],
		yearMin: null,
		yearMax: null,
		hasHybrid: false,
		hasVia: false,
		hasOptical: false,
		hasElectrical: false,
		measuredOnly: false
	};
}

/** Three significant figures; null/NaN -> em dash. Never renders a missing value as 0. */
export function fmt(v: number | null | undefined, sig = 3): string {
	if (v === null || v === undefined || Number.isNaN(v)) return EM_DASH;
	if (v === 0) return '0';
	const a = Math.abs(v);
	if (a < 1e-3 || a >= 1e5) {
		const s = v.toExponential(sig - 1);
		const [m, e] = s.split('e');
		const mant = m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m;
		return `${mant}e${e.replace('+', '')}`;
	}
	return String(Number(v.toPrecision(sig)));
}

export function qualPrefix(q: Qual | null | undefined): string {
	return q === 'lt' ? '<' : q === 'gt' ? '>' : q === 'ge' ? '≥' : q === 'le' ? '≤' : q === 'approx' ? '~' : '';
}

export function qualWord(q: Qual | null | undefined): string {
	return q === 'lt'
		? 'upper bound (less than)'
		: q === 'gt'
			? 'lower bound (greater than)'
			: q === 'ge'
				? 'at least'
				: q === 'le'
					? 'at most'
					: q === 'approx'
						? 'approximate'
						: '';
}

// Only the value kinds that change how a number should be read carry a marker; measured, stated and
// unspecified values are unmarked so the table stays quiet.
export const BASIS_MARK: Record<string, string> = {
	simulated: 's',
	derived: 'd',
	author_estimate: 'e',
	design_target: 't'
};

export const BASIS_TIP: Record<string, string> = {
	measured: 'measured',
	design_target: 'design target / as-built',
	simulated: 'simulated',
	derived: "the paper's own calculation",
	author_estimate: 'author estimate',
	stated: 'non-numeric fact stated in the source',
	unspecified: 'basis not stated'
};

export const SOURCE_TIP: Record<string, string> = {
	text: 'text',
	table: 'table',
	figure_image: 'figure',
	schematic: 'schematic',
	caption: 'caption',
	mixed: 'mixed sources'
};

export function median(xs: number[]): number | null {
	if (!xs.length) return null;
	const s = [...xs].sort((a, b) => a - b);
	const m = s.length >> 1;
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mean(xs: number[]): number | null {
	return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function countBy<T>(items: T[], key: (t: T) => string | string[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const it of items) {
		const k = key(it);
		for (const kk of Array.isArray(k) ? k : [k]) if (kk) m.set(kk, (m.get(kk) ?? 0) + 1);
	}
	return m;
}

export function enumLabel(a: Atlas, en: string, v: string | null | undefined): string {
	if (v === null || v === undefined || v === '') return EM_DASH;
	return a.enums[en]?.find((e) => e.value === v)?.label ?? v;
}

// ---------- headline metric access ----------

export interface Metric {
	v: number | null;
	qual: Qual | null;
	basis: string | null;
	field: string | null;
	locator?: string;
	note?: string;
}

const NONE: Metric = { v: null, qual: null, basis: null, field: null };

/** Read a derived headline number off a test vehicle, keeping its provenance. */
export function hl(tv: TestVehicle, key: string): Metric {
	const raw = tv.headline[key];
	const m = tv.headline_meta[key];
	if (typeof raw !== 'number' || !Number.isFinite(raw)) return NONE;
	return { v: raw, qual: null, basis: m?.basis ?? null, field: key, locator: m?.locator, note: m?.note };
}

export function headlineText(tv: TestVehicle, key: string): Metric {
	return hl(tv, key);
}

// ---------- filtering ----------

export interface TvFlags {
	hybrid: boolean;
	via: boolean;
	optical: boolean;
	electrical: boolean;
	measured: boolean;
}

export interface Index {
	paperById: Map<string, Paper>;
	tvById: Map<string, TestVehicle>;
	tvsByPaper: Map<string, TestVehicle[]>;
	flags: Map<string, TvFlags>;
	search: Map<string, string>;
}

export function tvFlags(tv: TestVehicle): TvFlags {
	return {
		hybrid: 'hb_pitch_um' in tv.headline,
		via: 'via_dia_um' in tv.headline || 'via_pitch_um' in tv.headline,
		optical: (tv.rows.optical_interfaces?.length ?? 0) > 0,
		electrical: (tv.rows.electrical_interfaces?.length ?? 0) > 0,
		measured: tv.basis === 'measured' || Object.values(tv.headline_meta).some((m) => m.basis === 'measured')
	};
}

export function buildIndex(a: Atlas): Index {
	const paperById = new Map(a.papers.map((p) => [p.paper_id, p]));
	const tvById = new Map(a.tvs.map((t) => [t.tv_id, t]));
	const tvsByPaper = new Map<string, TestVehicle[]>();
	for (const t of a.tvs) {
		const l = tvsByPaper.get(t.paper_id) ?? [];
		l.push(t);
		tvsByPaper.set(t.paper_id, l);
	}
	const flags = new Map<string, TvFlags>();
	for (const t of a.tvs) flags.set(t.tv_id, tvFlags(t));
	const lbl = (en: string, v: string | null) => a.enums[en]?.find((e) => e.value === v)?.label ?? v ?? '';
	const search = new Map<string, string>();
	for (const p of a.papers) {
		const tvs = tvsByPaper.get(p.paper_id) ?? [];
		const parts = [
			p.paper_id,
			p.label,
			p.title,
			p.first_author,
			p.venue,
			p.doi,
			p.technology_name,
			(p.orgs_canonical ?? []).join(' '),
			p.buckets.map((b) => lbl('bucket', b)).join(' '),
			tvs
				.map((t) => `${t.name} ${lbl('tv_kind', t.tv_kind)} ${lbl('package_class', t.package_class)} ${t.technology_name}`)
				.join(' ')
		];
		search.set(p.paper_id, parts.join(' ').toLowerCase());
	}
	return { paperById, tvById, tvsByPaper, flags, search };
}

export function tvMatches(tv: TestVehicle, f: Filters, idx: Index): boolean {
	if (f.packageClasses.length && !f.packageClasses.includes(tv.package_class)) return false;
	if (f.tvKinds.length && !f.tvKinds.includes(tv.tv_kind)) return false;
	const fl = idx.flags.get(tv.tv_id);
	if (f.hasHybrid && !fl?.hybrid) return false;
	if (f.hasVia && !fl?.via) return false;
	if (f.hasOptical && !fl?.optical) return false;
	if (f.hasElectrical && !fl?.electrical) return false;
	if (f.measuredOnly && !fl?.measured) return false;
	return true;
}

export function paperMatches(p: Paper, f: Filters, idx: Index): boolean {
	if (f.yearMin !== null && p.year < f.yearMin) return false;
	if (f.yearMax !== null && p.year > f.yearMax) return false;
	if (f.buckets.length && !p.buckets.some((b) => f.buckets.includes(b))) return false;
	if (f.sourceStatuses.length && !f.sourceStatuses.includes(p.source_status)) return false;
	if (f.orgs.length && !(p.orgs_canonical ?? []).some((o) => f.orgs.includes(o))) return false;
	const q = f.q.trim().toLowerCase();
	if (q) {
		const hay = idx.search.get(p.paper_id) ?? '';
		for (const tok of q.split(/\s+/)) if (!hay.includes(tok)) return false;
	}
	return true;
}

export interface View {
	papers: Paper[];
	tvs: TestVehicle[];
	matched: Set<string>;
}

export function applyFilters(a: Atlas, f: Filters, idx: Index): View {
	const papers: Paper[] = [];
	const tvs: TestVehicle[] = [];
	const matched = new Set<string>();
	for (const p of a.papers) {
		if (!paperMatches(p, f, idx)) continue;
		const ts = (idx.tvsByPaper.get(p.paper_id) ?? []).filter((t) => tvMatches(t, f, idx));
		if (!ts.length) continue;
		papers.push(p);
		for (const t of ts) {
			tvs.push(t);
			matched.add(t.tv_id);
		}
	}
	return { papers, tvs, matched };
}

// ---------- sorting ----------

export type SortVal = number | string | null;

export function compareVals(a: SortVal, b: SortVal, dir: 'asc' | 'desc'): number {
	if (a === null && b === null) return 0;
	if (a === null) return 1; // empty always last
	if (b === null) return -1;
	let r: number;
	if (typeof a === 'number' && typeof b === 'number') r = a - b;
	else r = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
	return dir === 'asc' ? r : -r;
}

export function sortRows<T>(rows: T[], keys: SortKey[], val: (row: T, key: string) => SortVal): T[] {
	if (!keys.length) return rows;
	return rows
		.map((r, i) => ({ r, i }))
		.sort((x, y) => {
			for (const k of keys) {
				const c = compareVals(val(x.r, k.key), val(y.r, k.key), k.dir);
				if (c) return c;
			}
			return x.i - y.i;
		})
		.map((x) => x.r);
}

/** none -> asc -> desc -> none. With `multi`, keeps other sort keys. */
export function cycleSort(keys: SortKey[], key: string, multi: boolean): SortKey[] {
	const cur = keys.find((k) => k.key === key);
	const others = multi ? keys.filter((k) => k.key !== key) : [];
	if (!cur) return [...others, { key, dir: 'asc' }];
	if (cur.dir === 'asc') return multi ? keys.map((k) => (k.key === key ? { key, dir: 'desc' as const } : k)) : [{ key, dir: 'desc' }];
	return others;
}

// ---------- URL hash ----------

export interface HashExtras {
	sort: SortKey[];
}

const list = (s: string | null): string[] => (s ? s.split(',').filter(Boolean) : []);

export function toHash(f: Filters, extras: HashExtras = { sort: [] }): string {
	const p = new URLSearchParams();
	if (f.q) p.set('q', f.q);
	if (f.buckets.length) p.set('b', f.buckets.join(','));
	if (f.packageClasses.length) p.set('pc', f.packageClasses.join(','));
	if (f.tvKinds.length) p.set('tk', f.tvKinds.join(','));
	if (f.sourceStatuses.length) p.set('ss', f.sourceStatuses.join(','));
	// org names can contain commas ("MEC Co., Ltd."), so the org list is '|'-separated
	if (f.orgs.length) p.set('o', f.orgs.join('|'));
	if (f.yearMin !== null) p.set('y0', String(f.yearMin));
	if (f.yearMax !== null) p.set('y1', String(f.yearMax));
	if (f.hasHybrid) p.set('hb', '1');
	if (f.hasVia) p.set('via', '1');
	if (f.hasOptical) p.set('opt', '1');
	if (f.hasElectrical) p.set('el', '1');
	if (f.measuredOnly) p.set('mo', '1');
	if (extras.sort.length) p.set('sort', extras.sort.map((k) => `${k.key}:${k.dir}`).join(','));
	return p.toString();
}

export function fromHash(hash: string): { filters: Filters; extras: HashExtras } {
	const p = new URLSearchParams(hash.replace(/^#/, ''));
	const f = defaultFilters();
	f.q = p.get('q') ?? '';
	f.buckets = list(p.get('b'));
	f.packageClasses = list(p.get('pc'));
	f.tvKinds = list(p.get('tk'));
	f.sourceStatuses = list(p.get('ss'));
	const o = p.get('o');
	// '|'-separated; an older comma-separated list stays one raw item until normalizeOrgs() resolves it
	f.orgs = o ? o.split('|').filter(Boolean) : [];
	const y0 = Number(p.get('y0'));
	const y1 = Number(p.get('y1'));
	f.yearMin = p.get('y0') && Number.isFinite(y0) ? y0 : null;
	f.yearMax = p.get('y1') && Number.isFinite(y1) ? y1 : null;
	f.hasHybrid = p.get('hb') === '1';
	f.hasVia = p.get('via') === '1';
	f.hasOptical = p.get('opt') === '1';
	f.hasElectrical = p.get('el') === '1';
	f.measuredOnly = p.get('mo') === '1';
	const sort: SortKey[] = list(p.get('sort'))
		.map((s) => {
			const [key, dir] = s.split(':');
			return { key, dir: dir === 'desc' ? ('desc' as const) : ('asc' as const) };
		})
		.filter((k) => k.key);
	return { filters: f, extras: { sort } };
}

/** State to adopt when the URL hash changed outside the app; null when it already matches. */
export function stateFromHashChange(hash: string, filters: Filters, sort: SortKey[]): { filters: Filters; sort: SortKey[] } | null {
	const next = fromHash(hash);
	const nextSort = next.extras.sort.length ? next.extras.sort : sort;
	return toHash(next.filters, { sort: nextSort }) === toHash(filters, { sort }) ? null : { filters: next.filters, sort: nextSort };
}

/**
 * Map org filter values (possibly from an old URL with printed names or a comma-separated list) onto the
 * canonical org names in the atlas. Unknown names are dropped; never throws.
 */
export function normalizeOrgs(a: Atlas, orgs: string[]): string[] {
	const known = new Set<string>();
	for (const p of a.papers) for (const o of p.orgs_canonical ?? []) known.add(o);
	const alias = a.org_aliases ?? {};
	const resolve = (s: string): string | null => {
		const v = s.trim();
		if (known.has(v)) return v;
		const c = alias[v];
		return c && known.has(c) ? c : null;
	};
	const out: string[] = [];
	for (const raw of orgs) {
		const whole = resolve(raw);
		const got = whole ? [whole] : raw.split(',').map(resolve);
		for (const g of got) if (g && !out.includes(g)) out.push(g);
	}
	return out;
}

// ---------- CSV ----------

export function csvEscape(s: string): string {
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: string[][]): string {
	return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';
}
