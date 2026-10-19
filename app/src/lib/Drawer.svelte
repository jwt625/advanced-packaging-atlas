<script lang="ts">
	import { store, ui } from './state.svelte';
	import { BASIS_MARK, BASIS_TIP, EM_DASH, enumLabel, fmt, qualPrefix, qualWord } from './logic';
	import type { ColumnMeta, Row, TestVehicle } from './types';

	const a = $derived(store.atlas);
	const idx = $derived(store.index);
	const tv = $derived(ui.drawerTv && idx ? (idx.tvById.get(ui.drawerTv) ?? null) : null);
	const paper = $derived(tv && idx ? (idx.paperById.get(tv.paper_id) ?? null) : null);
	const siblings = $derived(paper && idx ? (idx.tvsByPaper.get(paper.paper_id) ?? []) : []);
	let hideEmpty = $state(true);

	function close() {
		ui.drawerTv = null;
	}
	function onkey(e: KeyboardEvent) {
		if (e.key === 'Escape' && ui.drawerTv) close();
	}

	const HEAD_ROWS: [string, string, string][] = [
		['min_pitch_um', 'Min interconnect pitch', 'µm'],
		['hb_pitch_um', 'Hybrid bond pitch', 'µm'],
		['ubump_pitch_um', 'Micro-bump pitch', 'µm'],
		['c4_pitch_um', 'C4 / BGA pitch', 'µm'],
		['via_dia_um', 'Through-via diameter', 'µm'],
		['via_pitch_um', 'Through-via pitch', 'µm'],
		['via_ar', 'Through-via aspect ratio', ''],
		['rdl_line_um', 'RDL line (min)', 'µm'],
		['rdl_space_um', 'RDL space (min)', 'µm'],
		['rdl_via_um', 'RDL via diameter', 'µm'],
		['die_thickness_um', 'Die thickness', 'µm'],
		['core_thickness_um', 'Core thickness', 'µm'],
		['area_mm2', 'Package area', 'mm²'],
		['interposer_area_calc_mm2', 'Interposer area (computed)', 'mm²'],
		['n_stack_layers', 'Stack-layer rows', ''],
		['bond_temp_max_c', 'Max bonding temperature', '°C'],
		['bond_pressure_mpa', 'Max bonding pressure', 'MPa'],
		['anneal_temp_max_c', 'Max anneal temperature', '°C'],
		['n_process_steps', 'Process-step rows', ''],
		['proc_temp_max_c', 'Max process temperature', '°C'],
		['energy_min_pj_per_bit', 'Min interface energy', 'pJ/bit'],
		['lane_rate_max_gbps', 'Max lane rate', 'Gb/s'],
		['agg_bw_max_tbps', 'Max aggregate bandwidth', 'Tb/s'],
		['coupling_loss_min_db', 'Min coupling loss', 'dB'],
		['fiber_pitch_min_um', 'Fiber pitch', 'µm'],
		['wavelength_nm', 'Wavelength', 'nm'],
		['warpage_um', 'Warpage (largest |value|)', 'µm'],
		['yield_pct', 'Yield (lowest)', '%'],
		['n_metrics', 'Metric rows', ''],
		['n_rows', 'Total extracted rows', '']
	];
	const headlineRows = $derived.by(() => {
		if (!tv) return [];
		return HEAD_ROWS.filter(([k]) => typeof tv.headline[k] === 'number').map(([k, l, u]) => ({ k, l, u, v: tv.headline[k] as number, m: tv.headline_meta[k] ?? {} }));
	});

	const SKIP = new Set(['comp_id', 'tv_id', 'layer_id', 'ic_id', 'step_id', 'ei_id', 'oi_id', 'metric_id', 'basis', 'source', 'locator', 'notes', 'overrides', 'qualifiers']);

	function colsFor(table: string): ColumnMeta[] {
		return a?.columns[table] ?? [];
	}
	function unitOf(name: string): string {
		const u: [string, string][] = [
			['_um', 'µm'], ['_mm2', 'mm²'], ['_mm', 'mm'], ['_nm', 'nm'], ['_c', '°C'], ['_mpa', 'MPa'],
			['_force_n', 'N'], ['_min', 'min'], ['_pct', '%'], ['_gbps', 'Gb/s'], ['_tbps_per_mm2', 'Tb/s/mm²'],
			['_tbps_per_mm', 'Tb/s/mm'], ['_tbps', 'Tb/s'], ['_pj_per_bit', 'pJ/bit'], ['_db', 'dB'],
			['_mohm', 'mΩ'], ['_ghz', 'GHz'], ['_ns', 'ns'], ['_s', 's']
		];
		for (const [suf, unit] of u) if (name.endsWith(suf)) return unit;
		return '';
	}
	function valueText(table: string, row: Row, name: string): string {
		const v = row[name];
		if (v === null || v === undefined || v === '') return '';
		if (Array.isArray(v)) return v.join('; ');
		if (typeof v === 'object') return '';
		const m = colsFor(table).find((c) => c.name === name);
		if (m?.enum) return enumLabel(a!, m.enum, String(v));
		if (m?.type === 'float' || m?.type === 'int') {
			const q = row.quals?.[name];
			const n = Number(v);
			return Number.isFinite(n) ? `${qualPrefix(q)}${fmt(n)}` : String(v);
		}
		return String(v);
	}
	function fieldList(table: string, row: Row): { name: string; label: string; value: string; unit: string; enum?: string }[] {
		const all = colsFor(table)
			.filter((c) => !SKIP.has(c.name))
			.map((c) => ({ name: c.name, label: c.label, value: valueText(table, row, c.name), unit: unitOf(c.name), enum: c.enum }));
		return hideEmpty ? all.filter((f) => f.value !== '') : all;
	}
	function rowTitle(table: string, row: Row): string {
		switch (table) {
			case 'components':
				return [enumLabel(a!, 'component_type', String(row.component_type ?? '')), String(row.name ?? '')].filter(Boolean).join(' · ');
			case 'stack_layers':
				return [`${row.seq ?? ''}`, enumLabel(a!, 'structure', String(row.structure ?? '')), String(row.layer_name ?? '')].filter(Boolean).join(' ');
			case 'interconnects':
				return [enumLabel(a!, 'interconnect_level', String(row.level ?? '')), enumLabel(a!, 'interconnect_type', String(row.ic_type ?? ''))].filter(Boolean).join(' · ');
			case 'process_steps':
				return [`${row.seq ?? ''}.`, String(row.step ?? '')].filter(Boolean).join(' ');
			case 'electrical_interfaces':
				return [enumLabel(a!, 'protocol', String(row.protocol ?? '')), String(row.protocol_as_written ?? '')].filter(Boolean).join(' · ');
			case 'optical_interfaces':
				return enumLabel(a!, 'coupler_type', String(row.coupler_type ?? ''));
			case 'metrics':
				return [String(row.parameter ?? ''), String(row.variant ?? '')].filter(Boolean).join(' · ');
			default:
				return '';
		}
	}
	function tablesWithRows(t: TestVehicle): string[] {
		return (a?.meta.child_tables ?? []).filter((tb) => (t.rows as unknown as Record<string, Row[]>)[tb]?.length);
	}
	const shownTables = $derived(tv ? tablesWithRows(tv) : []);
	const dim = (x?: number) => (typeof x === 'number' ? fmt(x) : EM_DASH);
	const tvMeta = $derived.by(() => {
		if (!tv || !a) return [] as [string, string][];
		return [
			['Carrier', tv.carrier_format ? `${enumLabel(a, 'carrier_format', tv.carrier_format)}${tv.carrier_size_mm ? ' ' + tv.carrier_size_mm + ' mm' : ''}` : EM_DASH],
			['Package x × y × t', `${dim(tv.package_x_mm)} × ${dim(tv.package_y_mm)} × ${dim(tv.package_thickness_mm)} mm`],
			['Interposer x × y', `${dim(tv.interposer_x_mm)} × ${dim(tv.interposer_y_mm)} mm`],
			['Substrate x × y', `${dim(tv.substrate_x_mm)} × ${dim(tv.substrate_y_mm)} mm`],
			['Substrate layers', tv.substrate_layer_count || EM_DASH],
			['Reticle multiple', tv.reticle_multiple !== undefined ? fmt(tv.reticle_multiple) : EM_DASH],
			['Dies / HBM', `${tv.n_dies ?? EM_DASH} / ${tv.n_hbm ?? EM_DASH}`],
			['Basis', enumLabel(a, 'basis', tv.basis)],
			['Source', enumLabel(a, 'source', tv.source)],
			['Locator', tv.locator || EM_DASH]
		] as [string, string][];
	});
</script>

<svelte:window onkeydown={onkey} />

{#if tv && paper && a}
	<div class="drawer" role="dialog" aria-label="Test vehicle detail">
		<div class="dh">
			<div class="ttl" title={paper.title}>{paper.title}</div>
			<button onclick={close} aria-label="Close" title="Close (Esc)">
				<svg viewBox="0 0 10 10" width="10" height="10"><path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" stroke-width="1.4" /></svg>
			</button>
		</div>
		<div class="body">
			<div class="meta">
				<div class="k">Authors</div>
				<div>{paper.first_author}{paper.orgs.length ? ` — ${paper.orgs.length} org${paper.orgs.length > 1 ? 's' : ''}` : ''}</div>
				<div class="k">Venue</div>
				<div>{paper.venue || EM_DASH} <span class="muted num">{paper.year}</span></div>
				<div class="k">Link</div>
				<div class="links">{#if paper.url}<a href={paper.url} target="_blank" rel="noreferrer" title="Open DOI">DOI {paper.doi || paper.url}</a>{/if}</div>
				<div class="k">Bucket</div>
				<div>{paper.buckets.map((b) => enumLabel(a, 'bucket', b)).join('; ') || EM_DASH}</div>
				<div class="k">Source</div>
				<div>{enumLabel(a, 'source_status', paper.source_status)}; pages {paper.pages_read || EM_DASH}</div>
				<div class="k">Organizations</div>
				<div>{paper.orgs.join('; ') || EM_DASH}</div>
				<div class="k">Verified</div>
				<div>{paper.verified_on || EM_DASH}{#if paper.evidence} · {paper.evidence.n_entries} evidence entries{/if}</div>
				{#if paper.technology_name}<div class="k">Platform</div><div>{paper.technology_name}</div>{/if}
			</div>

			{#if siblings.length > 1}
				<div class="tabs" role="tablist">
					{#each siblings as s (s.tv_id)}
						<button role="tab" class:on={s.tv_id === tv.tv_id} onclick={() => (ui.drawerTv = s.tv_id)} title={s.name || s.tv_id}>
							{s.tv_id.replace(paper.paper_id + '-', '')}
						</button>
					{/each}
				</div>
			{/if}
			<div class="dtitle" title={tv.tv_id}>{tv.name || tv.tv_id}</div>
			<div class="sub2">{enumLabel(a, 'tv_kind', tv.tv_kind)} · {enumLabel(a, 'package_class', tv.package_class)}{tv.technology_name ? ` · ${tv.technology_name}` : ''}</div>
			{#if tv.purpose}<div class="purpose">{tv.purpose}</div>{/if}

			<div class="sec">Test vehicle row</div>
			<table>
				<tbody>
					{#each tvMeta as [k, v] (k)}
						<tr><td class="f">{k}</td><td class="v" colspan="3">{v}</td></tr>
					{/each}
				</tbody>
			</table>

			{#if headlineRows.length}
				<div class="sec">Derived headline (extreme matching row; nothing estimated)</div>
				<table>
					<tbody>
						{#each headlineRows as r (r.k)}
							<tr title={[r.m.locator ? `source: ${r.m.locator}` : '', r.m.note ?? ''].filter(Boolean).join('\n')}>
								<td class="f">{r.l}</td>
								<td class="v num">{fmt(r.v)}{#if r.m.basis && BASIS_MARK[r.m.basis]}<sup>{BASIS_MARK[r.m.basis]}</sup>{/if}</td>
								<td class="u">{r.u}</td>
								<td class="e muted">{r.m.locator ?? ''}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}

			<label class="he"><input type="checkbox" bind:checked={hideEmpty} /> Hide fields that are not reported</label>

			{#each shownTables as table (table)}
				{@const rows = (tv.rows as unknown as Record<string, Row[]>)[table]}
				<div class="sec">{a.meta.table_titles[table] ?? table} <span class="muted">({rows.length})</span></div>
				{#each rows as row, i (i)}
					<div class="card">
						<div class="ct">{rowTitle(table, row)}</div>
						<div class="fields">
							{#each fieldList(table, row) as f (f.name)}
								<div class="fl" title={f.label}>{f.label}</div>
								<div class="fv" title={(row.quals?.[f.name] ? qualWord(row.quals[f.name]) + ' ' : '') + f.label}>{f.value}{#if f.unit}&nbsp;<span class="fu">{f.unit}</span>{/if}</div>
							{/each}
						</div>
						<div class="prov" title={row.notes ? String(row.notes) : ''}>
							{#if row.basis}<span class="chip" class:sim={['simulated', 'design_target'].includes(String(row.basis))}>{enumLabel(a, 'basis', String(row.basis))}</span>{/if}
							{#if row.source}<span class="chip">{enumLabel(a, 'source', String(row.source))}</span>{/if}
							{#if row.locator}<span class="loc">{row.locator}</span>{/if}
							{#if row.overrides?.length}<span class="ov" title={row.overrides.map((o) => `${o.field}: ${o.value}`).join('\n')}>{row.overrides.length} override{row.overrides.length > 1 ? 's' : ''}</span>{/if}
						</div>
						{#if row.notes}<div class="note">{row.notes}</div>{/if}
					</div>
				{/each}
			{/each}

			{#if paper.evidence}
				<div class="sec">Evidence notes</div>
				{#if paper.evidence.figure_reading_method}<div class="note"><b>Figure reading:</b> {paper.evidence.figure_reading_method}</div>{/if}
				{#if paper.evidence.conflicts.length}
					<div class="note"><b>Conflicts resolved ({paper.evidence.conflicts.length}):</b>
						<ul>{#each paper.evidence.conflicts as c, i (i)}<li>{c.table}.{c.field} on {c.row_id}: {JSON.stringify(c.values)} → {JSON.stringify(c.chosen)} ({c.why})</li>{/each}</ul>
					</div>
				{/if}
				{#if paper.evidence.not_reported.length}<div class="note"><b>Not reported:</b> {paper.evidence.not_reported.join('; ')}</div>{/if}
				{#if paper.evidence.excluded.length}<div class="note"><b>Excluded (not this paper's own data):</b> {paper.evidence.excluded.join('; ')}</div>{/if}
				{#if paper.evidence.notes}<div class="note">{paper.evidence.notes}</div>{/if}
			{/if}

			<div class="foot muted">Basis markers: {Object.entries(BASIS_MARK).map(([k, m]) => `${m} ${BASIS_TIP[k]}`).join(', ')}. Measured, stated and unspecified values are unmarked.</div>
		</div>
	</div>
{/if}

<style>
	.drawer {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(640px, 66%);
		background: var(--surface);
		border-left: 1px solid var(--line);
		display: flex;
		flex-direction: column;
		z-index: 20;
		box-shadow: -8px 0 16px rgba(0, 0, 0, 0.25);
	}
	.dh {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		padding: 8px 10px;
		border-bottom: 1px solid var(--border);
		flex: none;
	}
	.ttl {
		flex: 1;
		font-weight: 600;
		font-size: 13px;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.dh button {
		width: 24px;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}
	.body {
		overflow-y: auto;
		min-height: 0;
		padding: 8px 10px 16px;
	}
	.meta {
		display: grid;
		grid-template-columns: 96px 1fr;
		gap: 2px 8px;
		margin-bottom: 8px;
	}
	.k {
		color: var(--ink-3);
	}
	.links {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.tabs {
		display: flex;
		gap: 2px;
		flex-wrap: wrap;
		margin: 6px 0;
	}
	.dtitle {
		font-weight: 600;
		margin: 6px 0 2px;
	}
	.sub2 {
		color: var(--ink-2);
	}
	.purpose {
		color: var(--ink-3);
		margin-top: 2px;
	}
	.sec {
		margin: 12px 0 4px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 10px;
		color: var(--ink-3);
		border-bottom: 1px solid var(--border);
		padding-bottom: 2px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	td {
		padding: 1px 4px;
		vertical-align: top;
		border-bottom: 1px solid var(--grid);
	}
	tr:hover td {
		background: var(--hover);
	}
	.f {
		width: 40%;
		color: var(--ink-2);
	}
	.v {
		width: 22%;
	}
	.u {
		width: 10%;
		color: var(--ink-3);
	}
	.e {
		width: 28%;
		font-size: 11px;
	}
	.card {
		border: 1px solid var(--border);
		border-left: 2px solid var(--accent);
		padding: 6px 8px;
		margin: 6px 0;
	}
	.ct {
		font-weight: 600;
		margin-bottom: 4px;
	}
	.fields {
		display: grid;
		grid-template-columns: minmax(90px, 34%) 1fr;
		gap: 1px 8px;
	}
	.fl {
		color: var(--ink-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fv {
		word-break: break-word;
	}
	.fu {
		color: var(--ink-3);
	}
	.prov {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		margin-top: 4px;
	}
	.chip {
		font-size: 10px;
		padding: 0 4px;
		border: 1px solid var(--line);
		color: var(--ink-2);
		white-space: nowrap;
	}
	.chip.sim {
		border-color: var(--warn);
		color: var(--warn);
	}
	.loc {
		color: var(--ink-3);
		font-size: 11px;
	}
	.ov {
		color: var(--warn);
		font-size: 11px;
	}
	.note {
		color: var(--ink-2);
		font-size: 11px;
		margin-top: 4px;
		line-height: 1.45;
	}
	.note ul {
		margin: 2px 0 0 16px;
		padding: 0;
	}
	.he {
		display: flex;
		gap: 6px;
		align-items: center;
		margin-top: 8px;
	}
	.foot {
		margin-top: 12px;
		font-size: 10px;
	}
	@media (max-width: 720px) {
		.drawer {
			width: 100%;
			border-left: 0;
		}
		.meta {
			grid-template-columns: 76px 1fr;
		}
		.fields {
			grid-template-columns: minmax(80px, 40%) 1fr;
		}
	}
</style>
