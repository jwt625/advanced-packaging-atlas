<script lang="ts">
	import Frame from './Frame.svelte';
	import Plot from './Plot.svelte';
	import { ui, store } from './state.svelte';
	import { plotTheme } from './colors';
	import { completenessMatrix } from './charts';
	import type { View } from './logic';

	let { view }: { view: View } = $props();
	const th = $derived(plotTheme(ui.theme));
	const tables = $derived(store.atlas?.meta.child_tables ?? []);
	const titles = $derived(store.atlas?.meta.table_titles ?? {});
	const m = $derived(completenessMatrix(view, tables));
	const cols = $derived(tables.map((t) => titles[t] ?? t));
	const height = $derived(Math.max(240, m.rows.length * 16 + 60));

	const traces = $derived([
		{
			type: 'heatmap',
			z: m.z,
			x: cols,
			y: m.rows.map((r) => r.label),
			customdata: m.rows.map((r) => r.paper_id),
			colorscale: [
				[0, th.surface],
				[0.5, th.surface],
				[0.5, th.accent],
				[1, th.accent]
			],
			zmin: 0,
			zmax: 1,
			xgap: 1,
			ygap: 1,
			showscale: false,
			hovertemplate: '%{y}<br>%{x}: %{z}<extra></extra>'
		}
	]);
	const layout = $derived({
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		margin: { l: 8, r: 8, t: 8, b: 8 },
		font: { family: 'system-ui, sans-serif', size: 10, color: th.ink2 },
		showlegend: false,
		xaxis: { side: 'top', tickfont: { size: 9, color: th.ink2 }, automargin: true, linecolor: th.line },
		yaxis: { autorange: 'reversed', tickfont: { size: 9, color: th.ink }, automargin: true, linecolor: th.line, ticklabelposition: 'outside' }
	});
</script>

<Frame
	letter="i"
	desc="Disclosure coverage: a filled cell means the paper has at least one extracted row in that table. A row that is empty for a table means the paper does not report it (or it was not extractable)."
	height={Math.min(760, height)}
	badge={`${m.rows.length}`}
	badgeTip="papers in the current filter"
>
	<div class="sc">
		<div style="height:{height}px"><Plot data={traces} {layout} /></div>
	</div>
</Frame>

<style>
	.sc {
		height: 100%;
		overflow: auto;
	}
</style>
