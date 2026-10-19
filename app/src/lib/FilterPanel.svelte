<script lang="ts">
	import { filters, resetFilters, store, tableState } from './state.svelte';
	import { countBy, stateFromHashChange } from './logic';

	let { charts = false, nShown = 0 }: { charts?: boolean; nShown?: number } = $props();

	const a = $derived(store.atlas);

	// search with 0.3 s debounce
	let qLocal = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastQ = '';
	function onInput(v: string) {
		qLocal = v;
		clearTimeout(timer);
		timer = setTimeout(() => {
			filters.q = v;
			lastQ = v;
		}, 300);
	}
	$effect(() => {
		if (filters.q !== lastQ) {
			lastQ = filters.q;
			qLocal = filters.q;
		}
	});

	function onHashChange(e: HashChangeEvent) {
		const next = stateFromHashChange(new URL(e.newURL).hash, filters, tableState.sort);
		if (!next) return;
		clearTimeout(timer);
		Object.assign(filters, next.filters);
		tableState.sort = next.sort;
	}

	let mobileOpen = $state(false);
	const open = $state<Record<string, boolean>>({ search: true, vehicle: true, paper: true, flags: true });

	type Opt = { value: string; label: string; n: number };
	function opts(en: string, counts: Map<string, number>): Opt[] {
		if (!a) return [];
		return (a.enums[en] ?? [])
			.map((e) => ({ value: e.value, label: e.label, n: counts.get(e.value) ?? 0 }))
			.filter((o) => o.n > 0);
	}

	const bucketOpts = $derived(a ? opts('bucket', countBy(a.papers, (p) => p.primary_bucket)) : []);
	const sourceOpts = $derived(a ? opts('source_status', countBy(a.papers, (p) => p.source_status)) : []);
	const classOpts = $derived(a ? opts('package_class', countBy(a.tvs, (t) => t.package_class)) : []);
	const kindOpts = $derived(a ? opts('tv_kind', countBy(a.tvs, (t) => t.tv_kind)) : []);
	const orgOpts = $derived.by(() => {
		if (!a) return [] as Opt[];
		const c = countBy(a.papers, (p) => p.orgs);
		return [...c.entries()]
			.sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
			.map(([value, n]) => ({ value, label: value, n }));
	});
	const yearBounds = $derived.by(() => {
		if (!a || !a.papers.length) return { min: 0, max: 0 };
		const ys = a.papers.map((p) => p.year);
		return { min: Math.min(...ys), max: Math.max(...ys) };
	});

	function toggle(list: string[], v: string): string[] {
		return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
	}
	function num(v: string): number | null {
		const n = Number(v);
		return v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n);
	}
	const active = $derived(
		!!(
			filters.q ||
			filters.buckets.length ||
			filters.packageClasses.length ||
			filters.tvKinds.length ||
			filters.sourceStatuses.length ||
			filters.orgs.length ||
			filters.yearMin !== null ||
			filters.yearMax !== null ||
			filters.hasHybrid ||
			filters.hasVia ||
			filters.hasOptical ||
			filters.hasElectrical ||
			filters.measuredOnly
		)
	);
</script>

{#snippet group(id: string, lbl: string, body: import('svelte').Snippet)}
	<section>
		<button class="gh" onclick={() => (open[id] = !open[id])} aria-expanded={open[id]}>
			<svg viewBox="0 0 10 10" width="8" height="8" class:rot={open[id]} aria-hidden="true"><path d="M3 1 L7 5 L3 9" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
			{lbl}
		</button>
		{#if open[id]}<div class="gb">{@render body()}</div>{/if}
	</section>
{/snippet}

{#snippet checks(list: Opt[], sel: string[], key: 'buckets' | 'packageClasses' | 'tvKinds' | 'sourceStatuses' | 'orgs')}
	<div class="checks">
		{#each list as o (o.value)}
			<label title="{o.label}: {o.n}">
				<input type="checkbox" checked={sel.includes(o.value)} onchange={() => (filters[key] = toggle(sel, o.value))} />
				<span class="lbl">{o.label}</span>
				<span class="n num">{o.n}</span>
			</label>
		{/each}
	</div>
{/snippet}

<svelte:window onhashchange={onHashChange} />

<aside class:mopen={mobileOpen}>
	<div class="top">
		<span class="muted num" title="Test vehicles passing the filters">{nShown} shown</span>
		<span class="tb">
			<button class="mtoggle" onclick={() => (mobileOpen = !mobileOpen)} aria-expanded={mobileOpen} title="Show or hide the filters">Filters{active ? ' *' : ''}</button>
			<button onclick={resetFilters} disabled={!active} title="Clear all filters">Reset</button>
		</span>
	</div>
	<div class="scroll">
		{#snippet searchBody()}
			<input type="search" placeholder="Search" value={qLocal} oninput={(e) => onInput(e.currentTarget.value)} title="Paper, authors, organizations, technology, DOI" />
		{/snippet}
		{@render group('search', 'Search', searchBody)}

		{#snippet vehicleBody()}
			<div class="sub">Package class</div>
			{@render checks(classOpts, filters.packageClasses, 'packageClasses')}
			<div class="sub">Test vehicle kind</div>
			{@render checks(kindOpts, filters.tvKinds, 'tvKinds')}
		{/snippet}
		{@render group('vehicle', 'Test vehicle', vehicleBody)}

		{#snippet paperBody()}
			<div class="sub">Year</div>
			<div class="yr">
				<input type="number" placeholder={String(yearBounds.min)} value={filters.yearMin ?? ''} onchange={(e) => (filters.yearMin = num(e.currentTarget.value))} title="Earliest year" />
				<span class="muted">to</span>
				<input type="number" placeholder={String(yearBounds.max)} value={filters.yearMax ?? ''} onchange={(e) => (filters.yearMax = num(e.currentTarget.value))} title="Latest year" />
			</div>
			<div class="sub">Bucket</div>
			{@render checks(bucketOpts, filters.buckets, 'buckets')}
			<div class="sub">Source status</div>
			{@render checks(sourceOpts, filters.sourceStatuses, 'sourceStatuses')}
			<div class="sub">Organization</div>
			{@render checks(orgOpts, filters.orgs, 'orgs')}
		{/snippet}
		{@render group('paper', 'Paper', paperBody)}

		{#snippet flagBody()}
			<label class="row" title="Test vehicles with a Cu-Cu hybrid or direct bond pitch">
				<input type="checkbox" checked={filters.hasHybrid} onchange={(e) => (filters.hasHybrid = e.currentTarget.checked)} />
				<span class="lbl">Has hybrid bonding</span>
			</label>
			<label class="row" title="Test vehicles with a through-via (TSV / TGV / TDV / TMV)">
				<input type="checkbox" checked={filters.hasVia} onchange={(e) => (filters.hasVia = e.currentTarget.checked)} />
				<span class="lbl">Has through-via</span>
			</label>
			<label class="row" title="Test vehicles with an optical interface row">
				<input type="checkbox" checked={filters.hasOptical} onchange={(e) => (filters.hasOptical = e.currentTarget.checked)} />
				<span class="lbl">Has optical I/O</span>
			</label>
			<label class="row" title="Test vehicles with an electrical/protocol interface row">
				<input type="checkbox" checked={filters.hasElectrical} onchange={(e) => (filters.hasElectrical = e.currentTarget.checked)} />
				<span class="lbl">Has electrical IF</span>
			</label>
			<label class="row" title="Keep only test vehicles whose headline dimensions include a measured value">
				<input type="checkbox" checked={filters.measuredOnly} onchange={(e) => (filters.measuredOnly = e.currentTarget.checked)} />
				<span class="lbl">Measured headline</span>
			</label>
		{/snippet}
		{@render group('flags', 'Flags', flagBody)}
	</div>
</aside>

<style>
	aside {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		background: var(--surface);
		border-right: 1px solid var(--border);
		width: 100%;
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px;
		border-bottom: 1px solid var(--border);
		flex: none;
		height: 36px;
	}
	.scroll {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}
	.tb {
		display: flex;
		gap: 4px;
	}
	.mtoggle {
		display: none;
	}
	@media (max-width: 720px) {
		aside {
			height: auto;
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}
		.mtoggle {
			display: inline-block;
		}
		.scroll {
			display: none;
		}
		aside.mopen .scroll {
			display: block;
			max-height: 55vh;
		}
	}
	section {
		border-bottom: 1px solid var(--border);
	}
	.gh {
		width: 100%;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: 0;
		height: 26px;
		padding: 0 8px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 10px;
	}
	.gh svg {
		transition: transform 0.1s;
	}
	.gh svg.rot {
		transform: rotate(90deg);
	}
	.gb {
		padding: 2px 8px 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.sub {
		color: var(--ink-3);
		font-size: 10px;
		margin-top: 4px;
	}
	.checks {
		display: flex;
		flex-direction: column;
		max-height: 170px;
		overflow-y: auto;
	}
	label {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 1px 2px;
		cursor: pointer;
	}
	label:hover {
		background: var(--hover);
	}
	.lbl {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.n {
		color: var(--ink-3);
	}
	.yr {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.yr input {
		width: 64px;
	}
	input[type='search'] {
		width: 100%;
	}
	.row {
		padding: 2px;
	}
</style>
