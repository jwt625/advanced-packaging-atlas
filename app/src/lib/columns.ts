import {
	BASIS_TIP,
	EM_DASH,
	enumLabel,
	fmt,
	hl,
	qualPrefix,
	qualWord,
	toCsv,
	type Metric,
	type SortVal
} from './logic';
import type { Atlas, Paper, TestVehicle } from './types';

export interface Cell {
	text: string;
	/** numeric value for CSV */
	num?: number | null;
	qual?: string;
	derived?: boolean;
	basis?: string | null;
	tip?: string;
	href?: string;
	muted?: boolean;
	multiline?: boolean;
}

export interface ColDef {
	id: string;
	label: string;
	unit?: string;
	tip: string;
	width: number;
	num?: boolean;
	level: 'paper' | 'tv';
	defaultOn: boolean;
}

export const COLS: ColDef[] = [
	{ id: 'paper', label: 'Paper', tip: 'First author, year. Hover for the full title.', width: 148, level: 'paper', defaultOn: true },
	{ id: 'year', label: 'Year', tip: 'Publication year', width: 50, num: true, level: 'paper', defaultOn: true },
	{ id: 'bucket', label: 'Bucket', tip: 'Primary packaging bucket assigned during triage', width: 148, level: 'paper', defaultOn: true },
	{ id: 'venue', label: 'Venue', tip: 'Journal / conference', width: 170, level: 'paper', defaultOn: false },
	{ id: 'status', label: 'Source', tip: 'How much of the source was read: full text, partial text, abstract only or needs download', width: 92, level: 'paper', defaultOn: false },
	{ id: 'orgs', label: 'Organizations', tip: 'Affiliations as printed on the paper, first author first', width: 250, level: 'paper', defaultOn: true },
	{ id: 'n_tvs', label: 'TVs', tip: 'Test vehicles extracted from this paper', width: 52, num: true, level: 'paper', defaultOn: true },
	{ id: 'verified_on', label: 'Verified', tip: 'Date the extraction was checked against the cached source', width: 88, level: 'paper', defaultOn: false },
	{ id: 'paper_tech', label: 'Platform', tip: 'Technology / brand name used by the paper', width: 150, level: 'paper', defaultOn: false },
	{ id: 'name', label: 'Test vehicle', tip: 'Test vehicle label as named or described by the paper', width: 190, level: 'tv', defaultOn: true },
	{ id: 'kind', label: 'Kind', tip: 'Test vehicle kind: package, coupon, wafer/panel level, die stack, simulation model', width: 110, level: 'tv', defaultOn: true },
	{ id: 'class', label: 'Package class', tip: 'Package architecture class', width: 156, level: 'tv', defaultOn: true },
	{ id: 'tech', label: 'Technology', tip: 'Technology / brand name used by the paper for this test vehicle', width: 140, level: 'tv', defaultOn: false },
	{ id: 'area', label: 'Area', unit: 'mm²', tip: 'Package body area (package_x × package_y)', width: 64, num: true, level: 'tv', defaultOn: true },
	{ id: 'interposer', label: 'Interposer', unit: 'mm²', tip: 'Interposer area as reported, or computed from its reported dimensions', width: 78, num: true, level: 'tv', defaultOn: false },
	{ id: 'substrate', label: 'Substrate', tip: 'Substrate layer count as written (e.g. 5-2-5, 14L)', width: 84, level: 'tv', defaultOn: false },
	{ id: 'dies', label: 'Dies', tip: 'Number of dies in the assembly', width: 46, num: true, level: 'tv', defaultOn: true },
	{ id: 'hbm', label: 'HBM', tip: 'Number of HBM stacks', width: 46, num: true, level: 'tv', defaultOn: false },
	{ id: 'min_pitch', label: 'Min pitch', unit: 'µm', tip: 'Smallest interconnect pitch on this test vehicle (centre-to-centre). Tooltip names the interconnect type, basis and locator.', width: 74, num: true, level: 'tv', defaultOn: true },
	{ id: 'hb_pitch', label: 'Hybrid bond', unit: 'µm', tip: 'Smallest Cu-Cu hybrid/direct bond pitch', width: 76, num: true, level: 'tv', defaultOn: true },
	{ id: 'ubump', label: 'µ-bump', unit: 'µm', tip: 'Smallest micro-bump / Cu-pillar / solder-ball pitch', width: 72, num: true, level: 'tv', defaultOn: true },
	{ id: 'c4', label: 'C4/BGA', unit: 'µm', tip: 'Smallest C4 or BGA pitch', width: 68, num: true, level: 'tv', defaultOn: false },
	{ id: 'via_dia', label: 'Via dia', unit: 'µm', tip: 'Smallest through-via diameter (TSV/TGV/TDV/TMV/PTH)', width: 68, num: true, level: 'tv', defaultOn: true },
	{ id: 'via_pitch', label: 'Via pitch', unit: 'µm', tip: 'Smallest through-via pitch', width: 72, num: true, level: 'tv', defaultOn: false },
	{ id: 'via_ar', label: 'Via AR', tip: 'Highest reported through-via aspect ratio', width: 58, num: true, level: 'tv', defaultOn: false },
	{ id: 'rdl_ls', label: 'RDL L/S', unit: 'µm', tip: 'Finest RDL line/space on this test vehicle (minimum reported line and space)', width: 76, num: true, level: 'tv', defaultOn: true },
	{ id: 'n_stack', label: 'Layers', tip: 'Stack-layer rows extracted (die, RDL, substrate, cavity, TIM, ...)', width: 60, num: true, level: 'tv', defaultOn: true },
	{ id: 'bond_temp', label: 'Bond T', unit: '°C', tip: 'Highest bonding temperature reported for an interconnect', width: 68, num: true, level: 'tv', defaultOn: false },
	{ id: 'proc_temp', label: 'Max T', unit: '°C', tip: 'Highest process temperature reported in a step', width: 64, num: true, level: 'tv', defaultOn: false },
	{ id: 'energy', label: 'Energy', unit: 'pJ/b', tip: 'Lowest reported interface energy per bit', width: 64, num: true, level: 'tv', defaultOn: false },
	{ id: 'lane_rate', label: 'Lane rate', unit: 'Gb/s', tip: 'Highest reported lane rate', width: 70, num: true, level: 'tv', defaultOn: false },
	{ id: 'coupling', label: 'Coupling', unit: 'dB', tip: 'Lowest reported optical coupling loss', width: 70, num: true, level: 'tv', defaultOn: false },
	{ id: 'warpage', label: 'Warpage', unit: 'µm', tip: 'Largest-magnitude warpage metric; tooltip names the variant and condition', width: 70, num: true, level: 'tv', defaultOn: false },
	{ id: 'yield', label: 'Yield', unit: '%', tip: 'Lowest reported yield (interconnect yield, else a yield metric)', width: 60, num: true, level: 'tv', defaultOn: false },
	{ id: 'n_rows', label: 'Rows', tip: 'Total extracted rows for this test vehicle (all child tables)', width: 56, num: true, level: 'tv', defaultOn: false },
	{ id: 'basis', label: 'Basis', tip: 'Basis of the headline dimensions: measured, design target, simulated, ...', width: 92, level: 'tv', defaultOn: true },
	{ id: 'locator', label: 'Locator', tip: 'Where in the source the test-vehicle row was read', width: 150, level: 'tv', defaultOn: false },
	{ id: 'purpose', label: 'Purpose', tip: 'What the test vehicle demonstrates', width: 260, level: 'tv', defaultOn: false },
	{ id: 'notes', label: 'Notes', tip: 'Extraction notes for this test vehicle', width: 260, level: 'tv', defaultOn: false }
];

const HL: Record<string, string> = {
	min_pitch: 'min_pitch_um',
	hb_pitch: 'hb_pitch_um',
	ubump: 'ubump_pitch_um',
	c4: 'c4_pitch_um',
	via_dia: 'via_dia_um',
	via_pitch: 'via_pitch_um',
	via_ar: 'via_ar',
	n_stack: 'n_stack_layers',
	bond_temp: 'bond_temp_max_c',
	proc_temp: 'proc_temp_max_c',
	energy: 'energy_min_pj_per_bit',
	lane_rate: 'lane_rate_max_gbps',
	coupling: 'coupling_loss_min_db',
	warpage: 'warpage_um',
	yield: 'yield_pct',
	area: 'area_mm2',
	n_rows: 'n_rows'
};

export const NUMERIC_HEADLINE: Record<string, string> = HL;

function metricTip(a: Atlas, tv: TestVehicle, key: string, m: Metric, extra = ''): string {
	const parts: string[] = [];
	if (extra) parts.push(extra);
	if (m.qual) parts.push(qualWord(m.qual));
	if (m.basis) parts.push(`basis: ${BASIS_TIP[m.basis] ?? m.basis}`);
	if (m.locator) parts.push(`source: ${m.locator}`);
	if (m.note) parts.push(m.note);
	return parts.join('\n');
}

function headlineCell(a: Atlas, tv: TestVehicle, id: string): Cell {
	const key = HL[id];
	const m = hl(tv, key);
	if (m.v === null) return { text: EM_DASH, num: null, muted: true, tip: 'not reported' };
	let extra = '';
	if (id === 'min_pitch' && typeof tv.headline.min_pitch_type === 'string') {
		extra = `${enumLabel(a, 'interconnect_type', String(tv.headline.min_pitch_type))}${tv.headline.min_pitch_level ? ' / ' + enumLabel(a, 'interconnect_level', String(tv.headline.min_pitch_level)) : ''}`;
	} else if (id === 'ubump' && typeof tv.headline.ubump_pitch_type === 'string') {
		extra = enumLabel(a, 'interconnect_type', String(tv.headline.ubump_pitch_type));
	} else if (id === 'via_dia' && typeof tv.headline.via_type === 'string') {
		extra = enumLabel(a, 'interconnect_type', String(tv.headline.via_type));
	}
	return { text: `${qualPrefix(m.qual)}${fmt(m.v)}`, num: m.v, qual: m.qual ?? undefined, basis: m.basis, tip: metricTip(a, tv, key, m, extra) };
}

function dash(tip = 'not reported'): Cell {
	return { text: EM_DASH, muted: true, tip };
}

export function cellFor(a: Atlas, id: string, p: Paper, tv: TestVehicle): Cell {
	if (HL[id]) return headlineCell(a, tv, id);
	switch (id) {
		case 'paper':
			return { text: p.label, tip: `${p.title}\n${p.first_author}\n${p.venue}`.trim() };
		case 'year':
			return { text: String(p.year), num: p.year };
		case 'bucket':
			return { text: enumLabel(a, 'bucket', p.primary_bucket), tip: p.buckets.map((b) => enumLabel(a, 'bucket', b)).join('; ') };
		case 'venue':
			return p.venue ? { text: p.venue, tip: p.venue } : dash();
		case 'status':
			return { text: enumLabel(a, 'source_status', p.source_status), tip: `pages read: ${p.pages_read || EM_DASH}` };
		case 'orgs': {
			const t = p.orgs.join('; ');
			return t ? { text: t, tip: t, multiline: true } : dash();
		}
		case 'n_tvs':
			return { text: String(p.n_tvs), num: p.n_tvs };
		case 'verified_on':
			return p.verified_on ? { text: p.verified_on, tip: 'Extraction verified against the cached source on this date' } : dash();
		case 'paper_tech':
			return p.technology_name ? { text: p.technology_name, tip: p.technology_name } : dash();
		case 'name': {
			const t = tv.name || tv.tv_id;
			return { text: t, tip: `${tv.tv_id}\n${tv.purpose}`.trim() };
		}
		case 'kind':
			return { text: enumLabel(a, 'tv_kind', tv.tv_kind) };
		case 'class':
			return { text: enumLabel(a, 'package_class', tv.package_class) };
		case 'tech':
			return tv.technology_name ? { text: tv.technology_name, tip: tv.technology_name } : dash();
		case 'interposer': {
			const v = tv.interposer_area_mm2 ?? (typeof tv.headline.interposer_area_calc_mm2 === 'number' ? tv.headline.interposer_area_calc_mm2 : null);
			if (v === null || v === undefined) return dash();
			const computed = tv.interposer_area_mm2 === undefined || tv.interposer_area_mm2 === null;
			return { text: fmt(v), num: v, tip: computed ? `computed from ${fmt(tv.interposer_x_mm ?? null)} × ${fmt(tv.interposer_y_mm ?? null)} mm` : 'as reported' };
		}
		case 'substrate':
			return tv.substrate_layer_count ? { text: tv.substrate_layer_count, tip: 'as written' } : dash();
		case 'dies':
			return tv.n_dies !== undefined ? { text: String(tv.n_dies), num: tv.n_dies } : dash();
		case 'hbm':
			return tv.n_hbm !== undefined ? { text: String(tv.n_hbm), num: tv.n_hbm } : dash();
		case 'rdl_ls': {
			const l = hl(tv, 'rdl_line_um');
			const s = hl(tv, 'rdl_space_um');
			if (l.v === null && s.v === null) return dash();
			const text = `${l.v === null ? EM_DASH : fmt(l.v)}/${s.v === null ? EM_DASH : fmt(s.v)}`;
			const tip = [l.locator ? `line: ${l.locator}` : '', s.locator ? `space: ${s.locator}` : '', l.basis ? `basis: ${BASIS_TIP[l.basis] ?? l.basis}` : '']
				.filter(Boolean)
				.join('\n');
			return { text, num: l.v ?? s.v, tip };
		}
		case 'basis':
			return { text: enumLabel(a, 'basis', tv.basis), tip: BASIS_TIP[tv.basis] ?? tv.basis };
		case 'locator':
			return tv.locator ? { text: tv.locator, tip: tv.locator } : dash();
		case 'purpose':
			return tv.purpose ? { text: tv.purpose, tip: tv.purpose, multiline: true } : dash();
		case 'notes':
			return tv.notes ? { text: tv.notes, tip: tv.notes, multiline: true } : dash();
		default:
			return dash();
	}
}

export function sortValue(a: Atlas, id: string, p: Paper, tv: TestVehicle): SortVal {
	if (!COLS.some((c) => c.id === id)) return null;
	if (HL[id]) return hl(tv, HL[id]).v;
	switch (id) {
		case 'paper':
			return p.label.toLowerCase();
		case 'year':
			return p.year;
		case 'bucket':
			return enumLabel(a, 'bucket', p.primary_bucket).toLowerCase();
		case 'orgs':
			return p.orgs.join('; ').toLowerCase();
		case 'n_tvs':
			return p.n_tvs;
		case 'verified_on':
			return p.verified_on;
		case 'dies':
			return tv.n_dies ?? null;
		case 'hbm':
			return tv.n_hbm ?? null;
		case 'interposer': {
			const v = tv.interposer_area_mm2 ?? (typeof tv.headline.interposer_area_calc_mm2 === 'number' ? tv.headline.interposer_area_calc_mm2 : null);
			return v ?? null;
		}
		default: {
			const c = cellFor(a, id, p, tv);
			return c.text === EM_DASH ? null : c.text.toLowerCase();
		}
	}
}

export function defaultColumns(): string[] {
	return COLS.filter((c) => c.defaultOn).map((c) => c.id);
}

/** Visible rows, with stable identity and the provenance needed to interpret numbers. */
export function tableCsv(
	a: Atlas,
	columns: ColDef[],
	rows: { kind: 'paper' | 'tv'; paper: Paper; tv: TestVehicle; dim: boolean }[]
): string {
	const header = ['Row', 'paper_id', 'tv_id', 'matches_filters', 'tv_basis', 'locator'];
	for (const c of columns) {
		header.push(c.unit ? `${c.label} (${c.unit})` : c.label);
		if (c.num) header.push(`${c.label} basis`, `${c.label} context`);
	}
	const lines = rows.map((r) => {
		const out = [
			r.kind === 'paper' ? 'paper' : 'test vehicle',
			r.paper.paper_id,
			r.tv.tv_id,
			String(!r.dim),
			r.tv.basis,
			r.tv.locator
		];
		for (const c of columns) {
			const x: Cell = r.kind === 'tv' && c.level === 'paper' ? { text: '' } : cellFor(a, c.id, r.paper, r.tv);
			if (c.num) out.push(x.num == null ? '' : String(x.num), x.basis ?? '', x.tip ?? '');
			else out.push(x.text === EM_DASH ? '' : x.text);
		}
		return out;
	});
	return toCsv(header, lines);
}
