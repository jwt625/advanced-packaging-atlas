<script lang="ts">
	import { store } from './state.svelte';
	import { EM_DASH, BASIS_MARK, enumLabel, fmt, hl, type Metric } from './logic';

	let { id }: { id: string } = $props();
	const a = $derived(store.atlas);
	const tv = $derived(store.index?.tvById.get(id) ?? null);
	const paper = $derived(tv ? (store.index?.paperById.get(tv.paper_id) ?? null) : null);

	const keys: [string, string, string][] = [
		['min_pitch_um', 'Min pitch', 'µm'],
		['hb_pitch_um', 'Hybrid bond', 'µm'],
		['ubump_pitch_um', 'µ-bump', 'µm'],
		['via_dia_um', 'Via dia', 'µm'],
		['via_ar', 'Via AR', ''],
		['area_mm2', 'Area', 'mm²'],
		['n_stack_layers', 'Layers', ''],
		['proc_temp_max_c', 'Max T', '°C'],
		['energy_min_pj_per_bit', 'Energy', 'pJ/b'],
		['lane_rate_max_gbps', 'Lane rate', 'Gb/s'],
		['coupling_loss_min_db', 'Coupling', 'dB'],
		['warpage_um', 'Warpage', 'µm'],
		['yield_pct', 'Yield', '%'],
		['n_rows', 'Extracted', 'rows']
	];
	const rows = $derived.by(() => {
		if (!tv) return [] as { l: string; u: string; m: Metric }[];
		const out = keys.map(([k, l, u]) => ({ l, u, m: hl(tv, k) })).filter((r) => r.m.v !== null);
		const ll = hl(tv, 'rdl_line_um');
		const ss = hl(tv, 'rdl_space_um');
		if (ll.v !== null || ss.v !== null) out.splice(5, 0, { l: 'RDL L/S', u: 'µm', m: { v: ll.v ?? ss.v, qual: null, basis: ll.basis ?? ss.basis, field: 'rdl' } });
		return out;
	});
	const kind = $derived(tv && a ? `${enumLabel(a, 'tv_kind', tv.tv_kind)} · ${enumLabel(a, 'package_class', tv.package_class)}` : '');
</script>

{#if tv && paper && a}
	<div class="tip">
		<div class="tt">{paper.title}</div>
		<div class="sub">{paper.label} · {tv.name || tv.tv_id}</div>
		<div class="sub">{kind}</div>
		<div class="org">{(paper.orgs_canonical ?? []).join('; ') || EM_DASH}</div>
		<table>
			<tbody>
				{#each rows as r (r.l)}
					<tr>
						<td class="l">{r.l}</td>
						<td class="v num">{fmt(r.m.v)}{#if r.m.basis && BASIS_MARK[r.m.basis]}<sup>{BASIS_MARK[r.m.basis]}</sup>{/if}</td>
						<td class="u">{r.u}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="sub">click a point to pin its card; click empty space to unpin</div>
	</div>
{/if}

<style>
	.tip {
		background: var(--surface);
		border: 1px solid var(--line);
		padding: 6px 8px;
		width: 280px;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
		font-size: 11px;
		pointer-events: none;
	}
	.tt {
		font-weight: 600;
		line-height: 1.25;
		margin-bottom: 2px;
	}
	.sub {
		color: var(--ink-2);
	}
	.org {
		color: var(--ink-3);
		margin-bottom: 3px;
	}
	table {
		border-collapse: collapse;
		margin: 3px 0;
	}
	td {
		padding: 0 6px 0 0;
	}
	.v {
		color: var(--ink);
		font-weight: 600;
		text-align: right;
		min-width: 56px;
	}
	.l,
	.u {
		color: var(--ink-3);
	}
	sup {
		color: var(--warn);
		font-size: 9px;
	}
</style>
