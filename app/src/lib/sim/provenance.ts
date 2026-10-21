// Provenance display for the /sim workbench (DevLog-010 A11, R7 5.2): geometry status badges, reference tooltips,
// part edge style. Status vocabulary extends the /3d one (app/src/lib/three/data.ts) with `public` and `user`.
import { STATUS_TIP as STATUS_TIP_3D } from '../three/data';
import type { Ref } from '../three/types';
import type { DimEntry, ParamEntry, ParamStatus, SimPart } from './protocol';
import type { EdgeStyle } from './graphics/BoxViewer';

export const STATUS_LETTER: Record<ParamStatus, string> = { reported: 'R', derived: 'D', public: 'P', template: 'T', user: 'U' };

export const STATUS_TIP: Record<ParamStatus, string> = {
	reported: STATUS_TIP_3D.reported,
	derived: STATUS_TIP_3D.derived,
	public: 'public: value from a public primary source outside the database (datasheet, standard, vendor disclosure)',
	template: STATUS_TIP_3D.template,
	user: 'user: edited in this session (original value and status in the row tooltip)'
};

/** Reference ids of a dim or param entry (ref + refs, first-use order). */
export function refIds(e: DimEntry | ParamEntry | undefined): string[] {
	if (!e) return [];
	const out: string[] = [];
	if (typeof e.ref === 'string') out.push(e.ref);
	if (Array.isArray(e.refs)) for (const r of e.refs) if (typeof r === 'string' && !out.includes(r)) out.push(r);
	return out;
}

/** Multi-line hover text of one reference (source and locator). */
export function refTip(id: string, refs: Record<string, Ref> | null | undefined): string {
	const r = refs?.[id];
	if (!r) return `${id}: reference not in package3d.json refs`;
	const lines = [`${id}: ${r.paper_id ?? 'source'}${r.year ? ` (${r.year})` : ''}`];
	if (r.title) lines.push(String(r.title));
	const loc = [r.table, r.row_id, r.field].filter(Boolean).join(' / ');
	const val = r.value != null ? ` = ${String(r.value)}${r.unit ? ` ${String(r.unit)}` : ''}` : '';
	if (loc || val) lines.push(`${loc}${val}`);
	if (r.locator) lines.push(`locator: ${r.locator}`);
	if (r.basis) lines.push(`basis: ${r.basis}`);
	if (r.note) lines.push(String(r.note));
	return lines.join('\n');
}

const PART_KEYS = ['w_mm', 'd_mm', 'h_um'];
const ARR_KEYS = ['pitch_um', 'diameter_um', 'height_um'];

export type Prov = 'reported' | 'mixed' | 'template';

/**
 * Part provenance as in /3d (app/src/lib/three/model.ts provOf): over w, d, h (arrays: pitch, diameter, height),
 * `reported` when none is template, `template` when all are, `mixed` otherwise; `user` when any dim was edited.
 */
export function partProv(p: SimPart): { prov: Prov; user: boolean } {
	const keys = p.array ? ARR_KEYS : PART_KEYS;
	let t = 0, user = false;
	for (const k of keys) {
		const s = p.dims?.[k]?.status ?? 'template';
		if (s === 'template') t++;
		if (s === 'user') user = true;
	}
	return { prov: t === 0 ? 'reported' : t === keys.length ? 'template' : 'mixed', user };
}

/** Edge style in the 3D preview: solid = no template dimension, dashed = some or all template, accent = user. */
export function edgeStyle(p: SimPart): EdgeStyle {
	const { prov, user } = partProv(p);
	return user ? 'user' : prov === 'reported' ? 'solid' : 'dashed';
}

/** Share of each status among the given entries (completeness bars). */
export function statusShares(entries: { status: ParamStatus }[]): Record<ParamStatus, number> {
	const out: Record<ParamStatus, number> = { reported: 0, derived: 0, public: 0, template: 0, user: 0 };
	for (const e of entries) out[e.status] = (out[e.status] ?? 0) + 1;
	const n = entries.length || 1;
	for (const k of Object.keys(out) as ParamStatus[]) out[k] /= n;
	return out;
}
