<script lang="ts">
	import { link } from '../lib/paths';
	import { store } from '../lib/state.svelte';
	import Bars from '../lib/Bars.svelte';
	import { enumLabel } from '../lib/logic';

	const a = $derived(store.atlas);
	const i = $derived(a?.integrity);

	function labelMap(en: string, keys: string[]): Record<string, string> {
		const m: Record<string, string> = {};
		if (!a) return m;
		for (const k of keys) m[k] = enumLabel(a, en, k);
		return m;
	}

	const nHybrid = $derived(a ? a.tvs.filter((t) => 'hb_pitch_um' in t.headline).length : 0);
	const nVia = $derived(a ? a.tvs.filter((t) => 'via_dia_um' in t.headline || 'via_pitch_um' in t.headline).length : 0);

	const tiles = $derived(
		i
			? [
					['Papers', i.counts.papers, 'Publications in the verified database'],
					['Test vehicles', i.counts.test_vehicles, 'Test vehicles / packages / coupons extracted'],
					['Extracted rows', i.counts.rows_total, 'Rows across the nine child tables'],
					['Organizations', i.counts.organizations, 'Distinct organizations (canonical names) in the author affiliations'],
					['Hybrid-bond TVs', nHybrid, 'Test vehicles with a Cu-Cu hybrid/direct bond pitch'],
					['Through-via TVs', nVia, 'Test vehicles with a TSV / TGV / TDV / TMV']
				]
			: []
	);
</script>

<div class="page">
	{#if store.error}
		<div class="msg">Failed to load data: {store.error}</div>
	{:else}
		<div class="tiles">
			{#each tiles as [l, n, t] (l)}
				<div class="tile" title={t as string}>
					<div class="tv num">{n}</div>
					<div class="tl">{l}</div>
				</div>
			{:else}
				{#each [0, 1, 2, 3, 4, 5] as k (k)}<div class="tile"><div class="tv">&nbsp;</div><div class="tl">&nbsp;</div></div>{/each}
			{/each}
		</div>
		<div class="grid">
			<section>
				<h3 title="Papers per primary packaging bucket">Bucket</h3>
				{#if i}<Bars items={i.per_bucket} labels={labelMap('bucket', Object.keys(i.per_bucket))} />{/if}
			</section>
			<section>
				<h3 title="Test vehicles per package class">Package class</h3>
				{#if i}<Bars items={i.per_package_class} labels={labelMap('package_class', Object.keys(i.per_package_class))} />{/if}
			</section>
			<section>
				<h3 title="Test vehicles per kind">Test vehicle kind</h3>
				{#if i}<Bars items={i.per_tv_kind} labels={labelMap('tv_kind', Object.keys(i.per_tv_kind))} />{/if}
			</section>
			<section>
				<h3 title="Test vehicles per basis of their headline dimensions">Basis</h3>
				{#if i}<Bars items={i.per_basis} labels={labelMap('basis', Object.keys(i.per_basis))} />{/if}
			</section>
			<section>
				<h3 title="Rows per interconnect type">Interconnect type</h3>
				{#if i}<Bars items={i.per_ic_type} labels={labelMap('interconnect_type', Object.keys(i.per_ic_type))} />{/if}
			</section>
			<section>
				<h3 title="Rows per metric category">Metric category</h3>
				{#if i}<Bars items={i.per_metric_category} labels={labelMap('metric_category', Object.keys(i.per_metric_category))} />{/if}
			</section>
			<section>
				<h3 title="Papers per source status">Source status</h3>
				{#if i}<Bars items={i.per_source_status} labels={labelMap('source_status', Object.keys(i.per_source_status))} />{/if}
			</section>
			<section>
				<h3 title="Test vehicle rows per source kind">Row source</h3>
				{#if i}<Bars items={i.per_source} labels={labelMap('source', Object.keys(i.per_source))} />{/if}
			</section>
			<section>
				<h3 title="Rows per stack-layer structure">Stack structure</h3>
				{#if i}<Bars items={i.per_structure} labels={labelMap('structure', Object.keys(i.per_structure))} />{/if}
			</section>
		</div>
		<div class="links">
			<a href={link('/table')}>Table</a>
			<a href={link('/explore')}>Explore</a>
			<a href={link('/about')}>About</a>
		</div>
	{/if}
</div>

<style>
	.page {
		height: 100%;
		overflow-y: auto;
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 8px;
	}
	.tile {
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 8px 10px;
		height: 62px;
	}
	.tv {
		font-size: 22px;
		font-weight: 600;
		line-height: 1.1;
	}
	.tl {
		color: var(--ink-3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 10px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	section {
		background: var(--surface);
		border: 1px solid var(--border);
		padding: 8px 10px;
		min-height: 120px;
	}
	h3 {
		margin: 0 0 6px;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-3);
		font-weight: 600;
	}
	.links {
		display: flex;
		gap: 14px;
	}
	.msg {
		padding: 20px;
		color: var(--ink-3);
	}
	@media (max-width: 900px) {
		.tiles {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
