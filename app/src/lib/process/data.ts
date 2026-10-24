// process3d.json loader (fixtures while the file does not exist), id maps, route filter, provenance helpers.
import { staticUrl } from '../paths';
import { FIXTURE } from './fixture';
import { FIXTURE2_FLOW } from './fixture2';
import { FIXTURE3_FLOW } from './fixture3';
import type { Body, Flow, PDim, PNa, PText, Piece, Process3D, Profile, Ref, Site, Step } from './types';

export interface LoadedProc {
	data: Process3D;
	fixture: boolean;
	error: string;
}

export function fixtureData(): Process3D {
	return { ...FIXTURE, flows: [...FIXTURE.flows, FIXTURE2_FLOW, FIXTURE3_FLOW] };
}

let cache: Promise<LoadedProc> | null = null;

/** Load static/data/process3d.json; fall back to the fixtures on 404 / HTML shell / parse errors. */
export function loadProcess3d(): Promise<LoadedProc> {
	if (cache) return cache;
	cache = (async () => {
		try {
			const res = await fetch(staticUrl('data/process3d.json'));
			if (res.status === 404) return { data: fixtureData(), fixture: true, error: '' };
			if (!res.ok) throw new Error(`process3d.json: HTTP ${res.status}`);
			const ct = res.headers.get('content-type') ?? '';
			const text = await res.text();
			if (!ct.includes('json') && text.trimStart().startsWith('<')) return { data: fixtureData(), fixture: true, error: '' };
			const d = JSON.parse(text) as Process3D;
			if (d.version !== 1) throw new Error(`process3d.json: unsupported version ${String(d.version)} (engine expects 1; contract 1.1 additions accepted)`);
			if (!Array.isArray(d.flows) || !d.flows.length) throw new Error('process3d.json: no flows');
			d.refs ??= {};
			for (const f of d.flows) {
				f.profiles ??= [];
				f.sites ??= [];
				for (const w of validateFlow(f)) console.warn(`[process3d] ${f.id}: ${w}`);
			}
			// DEV: ?fixture=process appends the development fixtures
			if (import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('fixture') === 'process') d.flows.push(...fixtureData().flows);
			return { data: d, fixture: false, error: '' };
		} catch (e) {
			return { data: fixtureData(), fixture: true, error: e instanceof Error ? e.message : String(e) };
		}
	})();
	return cache;
}

export interface FlowIndex {
	flow: Flow;
	body: Map<string, Body>;
	piece: Map<string, Piece>;
	site: Map<string, Site>;
	profile: Map<string, Profile>;
	/** bodies by piece, declaration order */
	byPiece: Map<string, Body[]>;
}

export function indexFlow(flow: Flow): FlowIndex {
	const byPiece = new Map<string, Body[]>();
	for (const b of flow.bodies) byPiece.set(b.piece, [...(byPiece.get(b.piece) ?? []), b]);
	return {
		flow,
		body: new Map(flow.bodies.map((b) => [b.id, b])),
		piece: new Map(flow.pieces.map((p) => [p.id, p])),
		site: new Map(flow.sites.map((s) => [s.id, s])),
		profile: new Map((flow.profiles ?? []).map((p) => [p.id, p])),
		byPiece
	};
}

export function defaultRoute(flow: Flow): string {
	return (flow.routes.find((r) => r.default) ?? flow.routes[0])?.id ?? '';
}

export function routeSteps(flow: Flow, route: string): Step[] {
	return flow.steps.filter((s) => !s.routes?.length || s.routes.includes(route));
}

/** Value of an optional PDim. */
export const v = (d: PDim | undefined, dflt = NaN): number => (d && Number.isFinite(d.value) ? d.value : dflt);

/** Reference checks (warnings only; the builder is the gate). */
export function validateFlow(f: Flow): string[] {
	const w: string[] = [];
	const bodies = new Set(f.bodies.map((b) => b.id));
	const pieces = new Set(f.pieces.map((p) => p.id));
	const sites = new Set(f.sites.map((s) => s.id));
	for (const b of f.bodies) {
		if (!pieces.has(b.piece)) w.push(`body ${b.id}: unknown piece ${b.piece}`);
		const site = (b as { site?: string }).site;
		if (site && !sites.has(site)) w.push(`body ${b.id}: unknown site ${site}`);
	}
	for (const s of f.steps) {
		if (!pieces.has(s.piece)) w.push(`step ${s.id}: unknown piece ${s.piece}`);
		for (const o of s.ops) {
			for (const [k, val] of Object.entries(o)) {
				if (['body', 'film', 'hole', 'cut', 'fill', 'release'].includes(k) && typeof val === 'string' && !bodies.has(val)) w.push(`step ${s.id} ${o.op}.${k}: unknown body ${val}`);
				if (['bodies', 'solder', 'adhesive'].includes(k) && Array.isArray(val)) for (const x of val) if (!bodies.has(x as string)) w.push(`step ${s.id} ${o.op}.${k}: unknown body ${String(x)}`);
				if (['piece', 'onto', 'carrier'].includes(k) && typeof val === 'string' && !pieces.has(val)) w.push(`step ${s.id} ${o.op}.${k}: unknown piece ${val}`);
			}
		}
	}
	return w;
}

// ---------------------------------------------------------------- provenance display

export const STATUS_TIP: Record<string, string> = {
	reported: 'reported: value from a database row',
	derived: 'derived: arithmetic on reported values',
	template: 'template: not reported; illustrative',
	na: 'N/A: not reported (no value)'
};

/** Draft pending (template without value, note "pending: ...") */
export function isPending(q: { status: string; note?: string; value?: unknown; text?: unknown }): boolean {
	return q.status === 'template' && (q.value == null || (typeof q.value === 'number' && !Number.isFinite(q.value))) && (q.text == null || q.text === '') && !!q.note?.startsWith('pending');
}

export function fmt(x: number): string {
	if (!Number.isFinite(x)) return 'N/A';
	const a = Math.abs(x);
	if (a === 0) return '0';
	if (a >= 1000) return x.toFixed(0);
	if (a >= 100) return x.toFixed(0);
	if (a >= 10) return x.toFixed(1).replace(/\.0$/, '');
	if (a >= 1) return x.toFixed(2).replace(/\.?0+$/, '');
	return x.toPrecision(2);
}

export function fmtTime(s: number | null): string {
	if (s == null || !Number.isFinite(s)) return 'N/A';
	if (s < 60) return `${fmt(s)} s`;
	if (s < 3600) return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
	return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
}

/** Tooltip text for a PDim / PText: value, status, note, refs (resolved), formula. */
export function provTip(q: PDim | PText | PNa | Profile, refs: Record<string, Ref>): string {
	const lines: string[] = [];
	if (q.status === 'na') lines.push('N/A, not reported');
	else if (isPending(q as PDim)) lines.push('missing: pending in this draft build');
	else if ('value' in q) lines.push(`${fmt(q.value)} ${q.unit}${q.qualifier ? ` (${q.qualifier})` : ''}`);
	else if ('text' in q) lines.push(q.text);
	lines.push(STATUS_TIP[q.status] ?? q.status);
	if (q.note) lines.push(q.note);
	const f = (q as PDim).formula;
	if (f) lines.push(`formula: ${f}${(q as PDim).values ? ` = ${(q as PDim).values}` : ''}`);
	const ids = [q.ref, ...(q.refs ?? [])].filter((x): x is string => !!x);
	for (const id of ids) {
		const r = refs[id];
		lines.push(r ? `${id}: ${r.paper_id ?? r.doi ?? ''} ${r.locator ?? ''}${r.table && r.row_id ? ` (${r.table}.${r.row_id}.${r.field ?? ''})` : ''}` : id);
	}
	const src = (q as PDim).source;
	if (src) lines.push(`source: ${src}`);
	return lines.join('\n');
}
