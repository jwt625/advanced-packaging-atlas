import { bucketGroup, GROUP_ORDER } from './colors';
import { hl, mean, median, type Metric } from './logic';
import type { Paper, Qual, TestVehicle } from './types';
import type { View } from './logic';

export interface Pt {
	id: string;
	x: number;
	y: number;
	group: string;
	/** basis is simulated / design target rather than measured or as-built */
	sim: boolean;
	qx: Qual | null;
	qy: Qual | null;
	panel: number;
}

export interface Omitted {
	total: number;
	plotted: number;
	missingX: number;
	missingY: number;
	missingBoth: number;
	invalid: number;
	nonpositive: number;
	uncertain: number;
	incomparable: number;
}

export type Getter = (tv: TestVehicle, p: Paper) => Metric;

const MODEL_BASES = new Set(['simulated', 'design_target']);

/** Build plotted points; values that are not reported are omitted (never plotted at 0) and counted. */
export function buildPoints(
	tvs: TestVehicle[],
	papers: Map<string, Paper>,
	gx: Getter,
	gy: Getter,
	panel = 0,
	axes: { xLog?: boolean; yLog?: boolean } = {}
): { pts: Pt[]; omitted: Omitted } {
	const pts: Pt[] = [];
	const om: Omitted = {
		total: tvs.length, plotted: 0, missingX: 0, missingY: 0, missingBoth: 0,
		invalid: 0, nonpositive: 0, uncertain: 0, incomparable: 0
	};
	for (const t of tvs) {
		const p = papers.get(t.paper_id);
		if (!p) {
			om.invalid++;
			continue;
		}
		const x = gx(t, p);
		const y = gy(t, p);
		if (x.v === null && y.v === null) om.missingBoth++;
		else if (x.v === null) om.missingX++;
		else if (y.v === null) om.missingY++;
		if (x.v === null || y.v === null) continue;
		if (!Number.isFinite(x.v) || !Number.isFinite(y.v)) {
			om.invalid++;
			continue;
		}
		if ((axes.xLog && x.v <= 0) || (axes.yLog && y.v <= 0)) {
			om.nonpositive++;
			continue;
		}
		pts.push({
			id: t.tv_id,
			x: x.v,
			y: y.v,
			group: bucketGroup(p.primary_bucket),
			sim: MODEL_BASES.has(x.basis ?? '') || MODEL_BASES.has(y.basis ?? ''),
			qx: x.qual,
			qy: y.qual,
			panel
		});
		om.plotted++;
	}
	return { pts, omitted: om };
}

export const yearOf: Getter = (_t, p) => ({ v: p.year, qual: null, basis: null, field: 'year' });
export const gMinPitch: Getter = (t) => hl(t, 'min_pitch_um');
export const gHbPitch: Getter = (t) => hl(t, 'hb_pitch_um');
export const gUbump: Getter = (t) => hl(t, 'ubump_pitch_um');
export const gC4: Getter = (t) => hl(t, 'c4_pitch_um');
export const gViaDia: Getter = (t) => hl(t, 'via_dia_um');
export const gViaPitch: Getter = (t) => hl(t, 'via_pitch_um');
export const gArea: Getter = (t) => hl(t, 'area_mm2');
export const gInterposer: Getter = (t) => {
	const m = hl(t, 'interposer_area_calc_mm2');
	if (m.v !== null) return m;
	if (typeof t.interposer_area_mm2 === 'number') return { v: t.interposer_area_mm2, qual: null, basis: null, field: 'interposer_area_mm2' };
	return { v: null, qual: null, basis: null, field: null };
};
export const gProcTemp: Getter = (t) => hl(t, 'proc_temp_max_c');
export const gBondTemp: Getter = (t) => hl(t, 'bond_temp_max_c');
export const gEnergy: Getter = (t) => hl(t, 'energy_min_pj_per_bit');
export const gLaneRate: Getter = (t) => hl(t, 'lane_rate_max_gbps');
export const gCoupling: Getter = (t) => hl(t, 'coupling_loss_min_db');
export const gWarpage: Getter = (t) => hl(t, 'warpage_um');
export const gYield: Getter = (t) => hl(t, 'yield_pct');

export function topCounts(map: Map<string, number>, n: number | null): [string, number][] {
	const e = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	return n === null ? e : e.slice(0, n);
}

export function papersPerYearByGroup(view: View): { years: number[]; groups: string[]; counts: Map<string, Map<number, number>> } {
	const counts = new Map<string, Map<number, number>>();
	const years = new Set<number>();
	for (const p of view.papers) {
		const g = bucketGroup(p.primary_bucket);
		const m = counts.get(g) ?? new Map<number, number>();
		m.set(p.year, (m.get(p.year) ?? 0) + 1);
		counts.set(g, m);
		years.add(p.year);
	}
	const ys = [...years].sort((a, b) => a - b);
	const full: number[] = [];
	if (ys.length) for (let y = ys[0]; y <= ys[ys.length - 1]; y++) full.push(y);
	return { years: full, groups: GROUP_ORDER.filter((g) => counts.has(g)), counts };
}

/** Deterministic jitter in [-1, 1] from an id string. */
export function jitter(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (((h >>> 0) % 2001) - 1000) / 1000;
}

export interface GroupStat {
	group: string;
	index: number;
	n: number;
	total: number;
	min: number | null;
	max: number | null;
	median: number | null;
	mean: number | null;
}

/** Per-category range, median and mean of y; `index` is the category position (order of appearance). */
export function groupStats(pts: Pt[], order: string[]): GroupStat[] {
	const by = new Map<string, number[]>();
	for (const p of pts) {
		if (!by.has(p.group)) by.set(p.group, []);
		if (!p.qx && !p.qy && !p.sim) by.get(p.group)!.push(p.y);
	}
	const present = order.filter((g) => by.has(g));
	return present.map((g, i) => {
		const ys = by.get(g) as number[];
		return {
			group: g,
			index: i,
			n: ys.length,
			total: pts.filter((p) => p.group === g).length,
			min: ys.length ? Math.min(...ys) : null,
			max: ys.length ? Math.max(...ys) : null,
			median: median(ys),
			mean: mean(ys)
		};
	});
}

/** Papers (rows) × child tables (columns): 1 where the paper has at least one row in that table. */
export function completenessMatrix(view: View, tables: string[]): { rows: Paper[]; z: number[][] } {
	const rows = view.papers
		.filter((p) => p.n_tvs > 0)
		.sort((a, b) => b.tables_present.length - a.tables_present.length || a.label.localeCompare(b.label));
	const z = rows.map((p) => tables.map((t) => (p.tables_present.includes(t) ? 1 : 0)));
	return { rows, z };
}
