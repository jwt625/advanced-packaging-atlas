<script lang="ts">
	import { store } from '../../lib/state.svelte';
	import { link } from '../../lib/paths';
	import { BASIS_TIP } from '../../lib/logic';

	const a = $derived(store.atlas);
	const c = $derived(a?.integrity.counts);
	const tt = $derived(a?.meta.table_titles ?? {});
	const tables = $derived(a?.meta.child_tables ?? []);
</script>

<svelte:head><title>About · Advanced Packaging Atlas</title></svelte:head>

<article>
	<h1>About the atlas</h1>
	<p>
		A literature database of advanced-packaging demonstrations — Si interposers, organic RDL and fan-out, Si bridges, glass,
		panel-level, hybrid bonding, micro-bump 3D, co-packaged optics and thermal/power-delivery test vehicles. Every row is
		traced back to the page, table or figure it was read from.
	</p>
	{#if c}
		<p>
			The current verified collection holds <b>{c.papers}</b> papers, <b>{c.test_vehicles}</b> test vehicles and
			<b>{c.rows_total}</b> extracted child rows ({c.organizations} organizations).
		</p>
	{/if}

	<h2>Read the evidence with the number</h2>
	<p>
		Each extracted value carries its <b>basis</b> and <b>source</b>, plus a locator into the paper. Open a test vehicle in the
		<a href={link('/table')}>table</a> to inspect every row and its provenance.
	</p>
	<ul>
		{#each Object.entries(BASIS_TIP) as [k, v] (k)}<li><b>{k}</b> — {v}</li>{/each}
	</ul>
	<p>An empty cell means the value is not reported. Where a source gives a bound (&lt;, &gt;) or an approximation (~), the number keeps that qualifier. Nothing is estimated or filled in.</p>

	<h2>What each panel shows</h2>
	<p>
		Charts plot <b>minimum interconnect pitch</b>, <b>hybrid-bond pitch</b>, <b>through-via geometry</b>, <b>bump pitch</b>,
		<b>package and interposer area</b> against publication year, plus papers per year/bucket and the disclosure heat map.
		Points are test vehicles; a diamond marks a modelled (simulated or design-target) value. Only reported pairs are plotted —
		the badge on each panel says how many test vehicles were omitted for lack of a value.
	</p>

	<h2>Data model</h2>
	<p>One paper yields many test vehicles; each test vehicle has rows in up to nine tables:</p>
	<ul>
		{#each tables as t (t)}<li>{tt[t] ?? t}</li>{/each}
	</ul>

	<h2>Derived headline numbers</h2>
	<p>
		The table ranks test vehicles by derived extremes — smallest pitch, smallest via diameter, finest RDL line/space, highest
		bonding or process temperature, lowest energy per bit, largest-magnitude warpage metric. Each extreme is a real extracted
		row; its tooltip names the row's basis and locator. These are views, not new measurements.
	</p>

	<h2>What is not here</h2>
	<p>
		No geographic map: affiliations are recorded as printed names, not coordinates. No simulator: this atlas shows reported
		data only. PDFs, extracted text and figures stay local (they carry a licensed-download stamp); the site ships only the CSV
		database projected into one JSON document.
	</p>
	<p class="muted">Schema version {a?.meta.schema_version ?? '—'}; view generated {a?.meta.generated_on ?? '—'}.</p>
</article>

<style>
	article {
		height: 100%;
		overflow-y: auto;
		padding: 16px 20px 40px;
		max-width: 820px;
	}
	h1 {
		font-size: 20px;
		margin: 0 0 8px;
	}
	h2 {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-3);
		margin: 20px 0 6px;
	}
	p,
	li {
		line-height: 1.5;
		color: var(--ink-2);
	}
	ul {
		margin: 6px 0;
		padding-left: 18px;
	}
	b {
		color: var(--ink);
	}
</style>
