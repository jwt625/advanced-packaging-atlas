<script lang="ts">
	// Parameters node = family configurator (R7 5.1, 6.3): Name / Expression / Value / Range / Status / Ref.
	// Expression edits splice into the case YAML `params` block (empty = remove the override); sliders only for params
	// whose generator supplies both bounds (none are invented here); generator warnings shown under their row.
	import type { Workbench } from './workbench.svelte';
	import type { ParamEntry, ParamStatus } from './protocol';
	import { STATUSES } from './protocol';
	import { STATUS_LETTER, STATUS_TIP, refIds, refTip } from './provenance';
	import { unitLabel, unitOf } from './units';
	import { coerce } from './yamlEdit';
	import { fmt } from '../logic';

	let { wb }: { wb: Workbench } = $props();
	let filter = $state('');
	let show = $state<Record<ParamStatus, boolean>>({ reported: true, derived: true, public: true, template: true, user: true });
	let preset = $state('');

	const params = $derived(wb.generated?.params ?? {});
	const refs = $derived(wb.p3d?.refs ?? {});
	const warnBy = $derived.by(() => {
		const m = new Map<string, { severity: string; message: string }[]>();
		for (const w of wb.generated?.warnings ?? []) if (w.param) m.set(w.param, [...(m.get(w.param) ?? []), w]);
		return m;
	});
	const rows = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		return Object.entries(params)
			.filter(([k, e]) => show[e.status] && (!q || k.toLowerCase().includes(q) || String(e.note ?? '').toLowerCase().includes(q)))
			.sort(([a], [b]) => a.localeCompare(b));
	});
	const counts = $derived.by(() => {
		const c: Record<ParamStatus, number> = { reported: 0, derived: 0, public: 0, template: 0, user: 0 };
		for (const e of Object.values(params)) c[e.status]++;
		return c;
	});

	const srcOf = (k: string): string => {
		const v = wb.params[k];
		return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
	};
	const valueText = (e: ParamEntry) => (typeof e.value === 'number' ? fmt(e.value, 6) : String(e.value));
	function rowTip(k: string, e: ParamEntry): string {
		const lines = [k];
		if (e.note) lines.push(String(e.note));
		if (e.formula) lines.push(`formula: ${e.formula}${e.values ? `\n= ${e.values}` : ''}`);
		if (e.inputs?.length) lines.push(`inputs: ${e.inputs.join(', ')}`);
		if (e.reevaluated) lines.push('re-evaluated from its formula after an input changed');
		if (e.original) lines.push(`original: ${String(e.original.value)} (${e.original.status})`);
		return lines.join('\n');
	}
	function commit(k: string, input: string) {
		if (input === srcOf(k)) return;
		if (input.trim() === '') {
			if (wb.params[k] !== undefined) wb.clear(`params.${k}`);
			return;
		}
		wb.edit(`params.${k}`, coerce(input));
	}
	const bounded = (e: ParamEntry) => typeof e.min === 'number' && typeof e.max === 'number' && Number.isFinite(e.min) && Number.isFinite(e.max) && e.max > e.min;
</script>

<div class="bar">
	<input type="search" placeholder="Filter" aria-label="Filter parameters" bind:value={filter} />
	{#each STATUSES as s}
		<label class="sf" data-tip="{STATUS_TIP[s]} ({counts[s]})"><input type="checkbox" bind:checked={show[s]} /><span class="b {s}">{STATUS_LETTER[s]}</span><span class="n num">{counts[s]}</span></label>
	{/each}
</div>
<div class="bar">
	<label class="pre" data-tip={wb.presetList.length ? 'Product preset: primary-source facts only; every other value stays template (DevLog-010 Decision 5)' : 'No product presets in this build (engine/src/families, lane L3)'}>Preset
		<select bind:value={preset} disabled={!wb.presetList.length || !!wb.busy} aria-label="Product preset">
			<option value="">{wb.presetList.length ? 'choose' : 'none'}</option>
			{#each wb.presetList as p}<option value={p.id}>{p.label}</option>{/each}
		</select>
	</label>
	<button disabled={!preset} onclick={() => { const p = wb.presetList.find((x) => x.id === preset); if (p) wb.applyPreset(p); }} data-tip="Write the preset values into the case params block">Apply</button>
	<span class="grow"></span>
	<span class="muted small" data-tip={wb.generated?.note ?? ''}>{wb.generated ? `${wb.generated.source}, ${Object.keys(params).length} params` : ''}</span>
</div>
{#if !wb.generated}
	<p class="muted">{wb.genError || 'No geometry generated yet.'}</p>
{:else}
	<table class="grid" aria-label="Parameters">
		<thead><tr><th>Name</th><th data-tip="Case override: number or =expression; empty = family default">Expression</th><th>Value</th><th data-tip="Generator bounds (min to max); slider when both exist">Range</th><th data-tip="R reported, D derived, P public, T template, U user">S</th><th>Ref</th></tr></thead>
		<tbody>
			{#each rows as [k, e] (k)}
				{@const u = e.unit != null ? unitLabel(e.unit) : unitOf(k)}
				{@const ws = warnBy.get(k) ?? []}
				<tr class:user={e.status === 'user'} data-param={k}>
					<td class="mono nm" data-tip={rowTip(k, e)}>{k}</td>
					<td class="ex"><input type="text" class="num" value={srcOf(k)} placeholder={valueText(e)} disabled={!!wb.busy} spellcheck="false" aria-label="{k} expression"
						data-tip="params.{k} in the case YAML (number or =expression); empty = family default"
						onchange={(ev) => commit(k, ev.currentTarget.value)} onkeydown={(ev) => { if (ev.key === 'Enter') commit(k, ev.currentTarget.value); }} /></td>
					<td class="num val" data-tip={e.formula ? `${e.formula}${e.values ? `\n= ${e.values}` : ''}` : undefined}>{valueText(e)}{#if u}<span class="u"> {u}</span>{/if}</td>
					<td class="rng">
						{#if bounded(e)}
							<input type="range" min={e.min} max={e.max} step={e.step ?? (e.integer ? 1 : ((e.max as number) - (e.min as number)) / 100)} value={typeof e.value === 'number' ? e.value : e.min} aria-label="{k} slider" data-tip="{e.min} to {e.max} {u}" disabled={!!wb.busy}
								onchange={(ev) => wb.edit(`params.${k}`, Number(ev.currentTarget.value))} />
						{:else}<span class="muted">-</span>{/if}
					</td>
					<td><span class="b {e.status}" data-tip="{STATUS_TIP[e.status]}{e.original ? `\noriginal: ${String(e.original.value)} (${e.original.status})` : ''}">{STATUS_LETTER[e.status]}</span></td>
					<td class="refs"><div>{#each refIds(e) as r}<span class="ref mono" data-tip={refTip(r, refs)}>{r}</span>{/each}</div></td>
				</tr>
				{#each ws as w}<tr class="msg {w.severity}"><td colspan="6">{w.message}</td></tr>{/each}
			{/each}
		</tbody>
	</table>
	{#if !rows.length}<p class="muted">No parameter matches.</p>{/if}
{/if}

<style>
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-bottom: 6px; }
	.bar input[type='search'] { flex: 1 1 120px; height: 22px; border-radius: 0; }
	.sf { display: flex; align-items: center; gap: 3px; color: var(--ink-3); font-size: 11px; }
	.sf .n { min-width: 14px; }
	.pre { display: flex; align-items: center; gap: 4px; color: var(--ink-2); }
	.pre select { height: 22px; border-radius: 0; max-width: 160px; }
	.bar button { height: 22px; border-radius: 0; }
	.grow { flex: 1; }
	.small { font-size: 11px; }
	.grid { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
	.grid th, .grid td { padding: 1px 3px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.grid th { color: var(--ink-3); font-weight: 500; position: sticky; top: -8px; background: var(--surface); z-index: 1; }
	.grid th:nth-child(1) { width: 30%; } .grid th:nth-child(2) { width: 20%; } .grid th:nth-child(3) { width: 19%; } .grid th:nth-child(4) { width: 11%; } .grid th:nth-child(5) { width: 20px; } .grid th:nth-child(6) { width: auto; }
	.nm { color: var(--ink-2); }
	tr.user .nm { color: var(--accent); }
	.ex input { width: 100%; height: 20px; padding: 0 3px; border-radius: 0; font-size: 11px; }
	.ex input::placeholder { color: var(--ink-3); opacity: 0.7; }
	.val { text-align: right; }
	.u { color: var(--ink-3); margin-left: 2px; }
	.rng input { width: 100%; height: 14px; margin: 0; accent-color: var(--accent); }
	.b { display: inline-block; width: 14px; height: 14px; line-height: 12px; text-align: center; font: 600 9px var(--mono); border: 1px solid currentColor; border-radius: 0; }
	.b.reported { color: var(--good); } .b.derived { color: #5bb5c9; } .b.public { color: #c160c1; } .b.template { color: var(--ink-3); border-style: dashed; } .b.user { color: var(--accent); }
	.refs div { display: flex; gap: 3px; overflow: hidden; }
	.ref { color: var(--ink-3); font-size: 10px; border-bottom: 1px dotted var(--ink-3); cursor: help; }
	tr.msg td { white-space: normal; padding: 1px 6px 3px 12px; }
	tr.msg.error td { color: var(--crit); } tr.msg.warn td { color: var(--warn); } tr.msg.info td { color: var(--ink-3); }
	p { margin: 6px 0; }
</style>
