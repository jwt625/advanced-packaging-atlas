<script lang="ts">
	// Step HUD (V1 M2): compact header (step, name, op, real time, temperatures, live values), the profile plot pinned
	// under it, then the typed parameters grouped by sub-op in collapsible sections (the active sub-op open), short
	// labels with the full text and provenance in tooltips. Collapsible to one line (narrow screens).
	import ProfilePlot from './ProfilePlot.svelte';
	import { fmt, fmtTime, isPending, provTip } from './data';
	import { LIVE_LABEL } from './ops';
	import type { HudParam, PDim, PNa, PText, Profile, Readout, Ref, SceneState, Step } from './types';

	let {
		step, i, n, route, state, total, opLabel, profiles, cursor, refs, tool, toolPlaceholder, readouts = [], toolDefault = null, opSrc = null,
		unknownOps = 0, collapsed = $bindable(false)
	}: {
		step: Step; i: number; n: number; route: string; state: SceneState; total: number | null; opLabel: string;
		profiles: Profile[]; cursor: number | null; refs: Record<string, Ref>; tool: string; toolPlaceholder: boolean;
		readouts?: Readout[]; toolDefault?: number | null; unknownOps?: number;
		opSrc?: { order_ref?: string; flow_id?: string; step_id?: string; note?: string } | null;
		collapsed?: boolean;
	} = $props();

	const opTip = $derived(opSrc ? ['op order from', opSrc.order_ref ? `${opSrc.order_ref}${refs[opSrc.order_ref] ? `: ${refs[opSrc.order_ref].paper_id ?? ''} ${refs[opSrc.order_ref].locator ?? ''}` : ''}` : '', opSrc.flow_id ?? '', opSrc.step_id ? `DB step ${opSrc.step_id}` : '', opSrc.note ?? ''].filter(Boolean).join('\n') : 'op order: as the step (no op-level source)');
	const unit = (u: string) => (u === '1' ? '' : ` ${u}`);
	function qText(q: PDim | PText | PNa): string {
		if (q.status === 'na') return 'N/A';
		if (isPending(q as PDim)) return 'missing';
		if ('value' in q) return `${fmt(q.value)}${unit(q.unit)}`;
		return 'text' in q ? q.text : '';
	}
	const missing = (q: PDim | PText | PNa) => q.status === 'na' || isPending(q as PDim);
	const live = $derived(Object.entries(state.live).filter(([k]) => !['cycles', 'stages', 'lines'].includes(k)));
	function liveText(k: string, val: number): string {
		const [label, u] = LIVE_LABEL[k] ?? [k.replace(/_/g, ' '), ''];
		const of = k === 'cycle' ? state.live.cycles : k === 'stage' ? state.live.stages : k === 'line' ? state.live.lines : null;
		if (of != null) return `${label} ${Math.round(val)} / ${Math.round(of)}`;
		if (u.startsWith('of')) return `${label} ${Math.round(val * 100)}% ${u}`;
		return `${label} ${fmt(val)}${unit(u)}`;
	}
	const srcTip = $derived([
		step.db_step ? `DB step: ${step.db_step}` : 'no DB step row (template expansion or fixture)',
		step.src?.order_ref ? `order from ${step.src.order_ref}${step.src.flow_id ? ` (${step.src.flow_id})` : ''}` : '',
		step.src?.note ?? '', step.note ?? ''
	].filter(Boolean).join('\n'));

	/** Group "Sub-op: quantity" labels by sub-op; short label = the quantity part. */
	const groups = $derived.by(() => {
		const m = new Map<string, { h: HudParam; short: string }[]>();
		for (const h of step.hud) {
			const k = h.label.lastIndexOf(': ');
			const g = k > 0 ? h.label.slice(0, k) : '';
			const short = (k > 0 ? h.label.slice(k + 2) : h.label).replace(/ (um|mm|nm|s|c|n|mpa|kpa|min)$/i, '');
			m.set(g, [...(m.get(g) ?? []), { h, short }]);
		}
		return [...m.entries()];
	});
	/** Step clock (V2 M3, compact form): known op durations; an op without one takes the tool model's default
	 * duration (template) when the tool states one; the rest is counted as N/A ops. */
	const clock = $derived.by(() => {
		const td = toolDefault != null && Number.isFinite(toolDefault) && unknownOps > 0 ? toolDefault : null;
		const tot = td != null ? (total ?? 0) + td : total;
		const naTot = Math.max(0, unknownOps - (td != null ? 1 : 0));
		const el = (state.tReal_s ?? 0) + (td != null && state.tActiveU != null ? state.tActiveU * td : 0);
		const naEl = Math.max(0, (state.tUnknown ?? 0) - (td != null && state.tActiveU != null ? 1 : 0));
		const tpl = td != null;
		const ops = (n: number) => `${n} op${n === 1 ? '' : 's'} N/A`;
		const text = `t ${fmtTime(el)} / total ${tot == null ? 'N/A' : fmtTime(tot)}${tpl ? ' (template)' : ''}${naTot && tot != null ? `, ${ops(naTot)}` : ''}`;
		const tip = [
			'real process time in this step / step total',
			total != null ? `from op data: ${fmtTime(total)}` : 'no op duration in the data',
			td != null ? `tool model default (template, tool research): ${fmtTime(td)} for 1 op without a duration` : '',
			naTot ? `${ops(naTot)}: duration not determinable (not counted)` : '',
			naEl ? `elapsed so far excludes ${ops(naEl)}` : ''
		].filter(Boolean).join('\n');
		return { text, tip, tpl };
	});
	const opKey = $derived(opLabel.toLowerCase().replace(/\s*\(\d+\/\d+\)$/, ''));
	const isActive = (g: string) => !g || groups.length <= 1 || g.toLowerCase().includes(opKey) || opKey.includes(g.toLowerCase());
</script>

<div class="hud" class:collapsed>
	<div class="row top">
		<button class="col" onclick={() => (collapsed = !collapsed)} aria-label={collapsed ? 'Expand HUD' : 'Collapse HUD'} data-tip={collapsed ? 'Expand' : 'Collapse'}>{collapsed ? '+' : '-'}</button>
		<span class="num">{i + 1}/{n}</span>
		<span class="cat" data-tip="DB category">{step.category}</span>
		{#if route}<span class="muted" data-tip="route">{route}</span>{/if}
		<span class="muted" data-tip="step number in the source flow">n {step.n}</span>
	</div>
	<div class="name" data-tip={`${step.name}\n${srcTip}`}>{step.name}</div>
	<div class="row">
		<span class="op" data-tip={opTip}>{opLabel}</span><span class="muted">{state.phase}</span>
		<span class="num rt" class:tpl={clock.tpl} data-tip={clock.tip}>{clock.text}</span>
	</div>
	{#if !collapsed}
		{#if state.temps.T != null || state.temps.T_set != null || state.temps.F != null || live.length}
			<div class="row num live">
				{#if state.temps.T != null}<span data-tip="joint (actual) temperature from the profile">T {fmt(state.temps.T)} C</span>{/if}
				{#if state.temps.T_set != null}<span data-tip="bond-head set temperature from the profile (differs from the joint temperature)">T set {fmt(state.temps.T_set)} C</span>{/if}
				{#if state.temps.F != null}<span>F {fmt(state.temps.F)} N</span>{/if}
				{#each live as [k, val] (k)}<span>{liveText(k, val)}</span>{/each}
			</div>
		{/if}
		{#if profiles.length}
			<ProfilePlot {profiles} {cursor} {refs} />
		{/if}
		{#if step.equipment || tool}
			<div class="row small">
				{#if step.equipment}<span class:tpl={step.equipment.status === 'template'} data-tip={`equipment\n${provTip(step.equipment, refs)}`}>{step.equipment.text}</span>{/if}
				{#if tool}<span class="muted" data-tip={toolPlaceholder ? 'tool geometry is a placeholder (no actor from lanes L37 / L38)' : 'tool model'}>tool {tool}{toolPlaceholder ? ' (placeholder)' : ''}</span>{/if}
			</div>
		{/if}
		{#each groups as [g, items] (g)}
			<details class="grp" open={isActive(g)}>
				<summary data-tip={g || 'step parameters'}>{g || 'parameters'} <span class="muted">{items.length}</span></summary>
				<div class="params">
					{#each items as { h, short } (h.key)}
						<div class="p" class:wide={'text' in h.q} class:tpl={h.q.status === 'template'} class:der={h.q.status === 'derived'} class:miss={missing(h.q)} data-tip={`${h.label}: ${qText(h.q)}\n${provTip(h.q, refs)}`}>
							<span class="muted lbl">{short}</span>
							<span class="num">{qText(h.q)}</span>
						</div>
					{/each}
				</div>
			</details>
		{/each}
		{#if readouts.length}
			<details class="grp">
				<summary data-tip="values of the tool model (tool research; status per value)">tool <span class="muted">{readouts.length}</span></summary>
				<div class="params">
					{#each readouts as r (r.key)}
						<div class="p" class:tpl={r.status === 'template'} class:der={r.status === 'derived'} data-tip={`${r.label} (tool model)\n${r.status}${r.note ? `\n${r.note}` : ''}`}>
							<span class="muted lbl">{r.label}</span><span class="num">{r.value == null ? 'N/A' : `${fmt(r.value)}${unit(r.unit)}`}</span>
						</div>
					{/each}
				</div>
			</details>
		{/if}
	{/if}
</div>

<style>
	.hud { display: flex; flex-direction: column; gap: 3px; font-size: 11px; min-width: 0; }
	.row { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; min-width: 0; }
	.top .num { font-weight: 600; }
	.col { height: 16px; width: 16px; padding: 0; font-size: 11px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
	.cat { font-size: 10px; padding: 0 4px; border: 1px solid var(--line); color: var(--ink-2); }
	.name { font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.op { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.rt { margin-left: auto; color: var(--ink-2); }
	.muted { color: var(--ink-3); }
	.small { font-size: 10.5px; }
	.small > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
	.live { color: var(--ink-2); }
	.grp { border-top: 1px solid var(--grid); }
	.grp summary { cursor: pointer; font-size: 10.5px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 1px 0; }
	.params { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 8px; }
	.p { display: flex; justify-content: space-between; gap: 4px; border-bottom: 1px solid var(--grid); min-width: 0; }
	.lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
	.p .num { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
	.p.wide { grid-column: 1 / -1; }
	.p.wide .lbl { flex: none; }
	.p.tpl .num { color: var(--ink-3); text-decoration: underline dashed; text-underline-offset: 2px; }
	.p.der .num { color: var(--accent); }
	.p.miss .num { color: var(--crit); text-decoration: line-through dashed; }
	.tpl { color: var(--ink-3); text-decoration: underline dashed; text-underline-offset: 2px; }
</style>
