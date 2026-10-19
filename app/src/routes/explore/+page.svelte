<script lang="ts">
	import { filters, store, ui } from '../../lib/state.svelte';
	import { applyFilters, countBy, enumLabel, mean, median } from '../../lib/logic';
	import {
		buildPoints,
		gArea,
		gC4,
		gHbPitch,
		gInterposer,
		gMinPitch,
		gUbump,
		gViaDia,
		gViaPitch,
		jitter,
		yearOf,
		type Omitted,
		type Pt
	} from '../../lib/charts';
	import { bucketGroup, plotTheme } from '../../lib/colors';
	import FilterPanel from '../../lib/FilterPanel.svelte';
	import ScatterChart from '../../lib/ScatterChart.svelte';
	import YearStack from '../../lib/YearStack.svelte';
	import TopBars from '../../lib/TopBars.svelte';
	import HeatChart from '../../lib/HeatChart.svelte';
	import type { Paper } from '../../lib/types';

	const a = $derived(store.atlas);
	const idx = $derived(store.index);
	const view = $derived(a && idx ? applyFilters(a, filters, idx) : null);
	const papersByIdx = $derived.by<Map<string, Paper>>(() => idx?.paperById ?? new Map());

	function emptyOm(): Omitted {
		return { total: 0, plotted: 0, missingX: 0, missingY: 0, missingBoth: 0, invalid: 0, nonpositive: 0, uncertain: 0, incomparable: 0 };
	}
	function comb(xs: Omitted[]): Omitted {
		const out = emptyOm();
		for (const x of xs) for (const k of Object.keys(out) as (keyof Omitted)[]) out[k] += x[k];
		return out;
	}
	function nnum(v: unknown): number | null {
		if (typeof v === 'number') return Number.isFinite(v) ? v : null;
		if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
		return null;
	}

	// (a) fine-pitch roadmap ---------------------------------------------------
	const aRes = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, yearOf, gMinPitch, 0, { yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));
	// (b) hybrid-bonding roadmap ----------------------------------------------
	const bRes = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, yearOf, gHbPitch, 0, { yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));
	// (c) through-via geometry -------------------------------------------------
	const cRes = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, gViaPitch, gViaDia, 0, { xLog: true, yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));
	// (d) bump pitch vs year (micro-bump top, C4/BGA bottom) --------------------
	const d0 = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, yearOf, gUbump, 0, { yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));
	const d1 = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, yearOf, gC4, 0, { yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));
	// (f) area vs year (package top, interposer bottom) -------------------------
	const f0 = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, yearOf, gArea, 0, { yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));
	const f1 = $derived.by(() => (view ? buildPoints(view.tvs, papersByIdx, yearOf, gInterposer, 0, { yLog: true }) : { pts: [] as Pt[], omitted: emptyOm() }));

	// (e) pitch distribution by interconnect type ------------------------------
	interface TypeStat {
		type: string;
		i: number;
		n: number;
		median: number;
	}
	const eRes = $derived.by(() => {
		const fail = { pts: [] as Pt[], stats: [] as TypeStat[], omitted: emptyOm() };
		if (!view || !idx) return fail;
		const recs: { type: string; pitch: number; group: string; sim: boolean }[] = [];
		let total = 0;
		for (const tv of view.tvs) {
			const p = idx.paperById.get(tv.paper_id);
			if (!p) continue;
			for (const r of tv.rows.interconnects ?? []) {
				total++;
				const v = nnum(r.pitch_um) ?? nnum(r.pitch_min_um);
				if (v === null || v <= 0) continue;
				recs.push({ type: String(r.ic_type ?? ''), pitch: v, group: bucketGroup(p.primary_bucket), sim: ['simulated', 'design_target'].includes(String(r.basis ?? '')) });
			}
		}
		const counts = new Map<string, number>();
		for (const r of recs) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
		const order = [...counts.entries()]
			.sort((x, y) => y[1] - x[1])
			.map((e) => e[0])
			.filter(Boolean)
			.slice(0, 12);
		const pos = new Map(order.map((t, i) => [t, i]));
		const pts: Pt[] = [];
		let n = 0;
		for (const r of recs) {
			const i = pos.get(r.type);
			if (i === undefined) continue;
			n++;
			pts.push({ id: `e-${r.type}-${n}`, x: i + 0.3 * jitter(`${i}-${n}`), y: r.pitch, group: r.group, sim: r.sim, qx: null, qy: null, panel: 0 });
		}
		const stats: TypeStat[] = order.map((t, i) => {
			const ys = recs.filter((r) => r.type === t).map((r) => r.pitch);
			return { type: t, i, n: ys.length, median: median(ys) ?? 0 };
		});
		const omitted = { ...emptyOm(), total, plotted: pts.length, missingY: total - pts.length };
		return { pts, stats, omitted };
	});
	const th = $derived(plotTheme(ui.theme));
	const eExtra = $derived(
		eRes.stats.length
			? [
					{
						type: 'scatter',
						mode: 'markers',
						x: eRes.stats.map((s) => s.i),
						y: eRes.stats.map((s) => s.median),
						marker: { symbol: 'line-ew', size: 16, color: th.ink, line: { width: 2 } },
						hovertemplate: 'median %{y} µm<extra></extra>',
						showlegend: false
					}
				]
			: []
	);

	// (h)/(i) organization and venue counts ------------------------------------
	const orgCounts = $derived.by(() => (view ? countBy(view.papers, (p) => p.orgs) : new Map<string, number>()));
	const venueCounts = $derived.by(() => (view ? countBy(view.papers, (p) => p.venue || '—') : new Map<string, number>()));
	const meanSummary = $derived.by(() => {
		if (!view) return '';
		const ys = view.papers.map((p) => p.year);
		return `${view.papers.length} papers, ${view.tvs.length} test vehicles, ${mean(ys)?.toFixed(1) ?? '—'} mean year`;
	});
</script>

<div class="page">
	<div class="side"><FilterPanel charts nShown={view?.tvs.length ?? 0} /></div>
	<div class="main">
		{#if store.error}
			<div class="msg">Failed to load data: {store.error}</div>
		{:else if !view}
			<div class="msg"><span class="spinner"></span></div>
		{:else}
			<div class="intro muted">{meanSummary}. Each point is one test vehicle, coloured by its paper's primary bucket. No geographic view: affiliations are recorded as names, not coordinates.</div>
			<div class="grid">
				<ScatterChart
					letter="a"
					desc="Minimum interconnect pitch per test vehicle against publication year, coloured by packaging bucket. Lower is finer. Diamond marks a modelled (simulated or design-target) value."
					panels={[{ pts: aRes.pts, yTitle: 'Min interconnect pitch (µm)' }]}
					xTitle="Publication year"
					xDtick={1}
					omitted={aRes.omitted}
					yLog={true}
				/>
				<ScatterChart
					letter="b"
					desc="Cu-Cu hybrid / direct bond pitch per test vehicle against publication year, coloured by packaging bucket."
					panels={[{ pts: bRes.pts, yTitle: 'Hybrid-bond pitch (µm)' }]}
					xTitle="Publication year"
					xDtick={1}
					omitted={bRes.omitted}
					yLog={true}
				/>
				<ScatterChart
					letter="c"
					desc="Through-via diameter against through-via pitch per test vehicle, log-log, coloured by packaging bucket. Only test vehicles that report both are plotted."
					panels={[{ pts: cRes.pts, yTitle: 'Via diameter (µm)' }]}
					xTitle="Via pitch (µm)"
					omitted={cRes.omitted}
					xLog={true}
					yLog={true}
				/>
				<div class="wide">
					<ScatterChart
						letter="d"
						desc="Micro-bump / Cu-pillar pitch (top) and C4 / BGA pitch (bottom) against publication year, coloured by packaging bucket."
						panels={[
							{ pts: d0.pts, yTitle: 'Micro-bump pitch (µm)' },
							{ pts: d1.pts, yTitle: 'C4 / BGA pitch (µm)' }
						]}
						xTitle="Publication year"
						xDtick={1}
						omitted={comb([d0.omitted, d1.omitted])}
						yLog={true}
					/>
				</div>
				<div class="wide">
					<ScatterChart
						letter="e"
						desc="Every reported interconnect pitch, grouped by interconnect type (top types by row count), log scale. Points are jittered horizontally; the horizontal bar marks each type's median."
						panels={[{ pts: eRes.pts, yTitle: 'Interconnect pitch (µm)' }]}
						xTitle="Interconnect type"
						xTickvals={eRes.stats.map((s) => s.i)}
						xTicktext={eRes.stats.map((s) => enumLabel(a!, 'interconnect_type', s.type))}
						allowX={false}
						omitted={eRes.omitted}
						extraTraces={eExtra}
						yLog={true}
					/>
				</div>
				<div class="wide">
					<ScatterChart
						letter="f"
						desc="Package body area (top) and interposer area (bottom) against publication year, log scale, coloured by packaging bucket."
						panels={[
							{ pts: f0.pts, yTitle: 'Package area (mm²)' },
							{ pts: f1.pts, yTitle: 'Interposer area (mm²)' }
						]}
						xTitle="Publication year"
						xDtick={1}
						omitted={comb([f0.omitted, f1.omitted])}
						yLog={true}
					/>
				</div>
				<YearStack {view} />
				<TopBars letter="h" desc="Papers per organization (affiliations as printed on the paper)" counts={orgCounts} />
				<TopBars letter="i" desc="Papers per conference / journal" counts={venueCounts} />
				<div class="wide"><HeatChart {view} /></div>
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		height: 100%;
	}
	.side {
		min-height: 0;
	}
	.main {
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		padding: 8px;
	}
	.intro {
		margin: 0 2px 8px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		align-items: start;
	}
	.grid > :global(.wide) {
		grid-column: 1 / -1;
	}
	.msg {
		padding: 20px;
		color: var(--ink-3);
		display: flex;
		gap: 10px;
		align-items: center;
	}
	@media (max-width: 900px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 720px) {
		.page {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto minmax(0, 1fr);
		}
	}
</style>
