<script lang="ts">
	// Ported from eo-modulator-atlas app/src/lib/sim/BottomPanel.svelte at eb97f96 (GPL-3.0-or-later).
	// Local changes: packaging messages (case parse, family generator warnings and constraint errors, Compute
	// readiness, staleness); Table tab shows the derived values of the last run. Kept: tabs, first-seen timestamps
	// per message (EO U13), Messages forward on new errors, log save as a timestamped file, CSV export.
	import { clock, type Workbench } from './workbench.svelte';
	import { downloadText, toCsv } from './exportUtil';
	import { fmt } from '../logic';
	import { derivedRows } from './results';

	let { wb }: { wb: Workbench } = $props();
	let paneEl: HTMLDivElement | undefined = $state();
	let prevErrors = 0;

	interface Msg { key: string; kind: 'crit' | 'notice' | 'muted'; alert?: boolean; text: string; t?: number }
	const messages: Msg[] = $derived.by(() => {
		const out: Msg[] = [];
		if (wb.parsed.error) out.push({ key: `parse:${wb.parsed.error}`, kind: 'crit', alert: true, text: `Case YAML: ${wb.parsed.error}` });
		if (wb.genError) out.push({ key: `gen:${wb.genError}`, kind: 'crit', alert: true, text: `Geometry: ${wb.genError}` });
		for (const w of wb.generated?.warnings ?? []) out.push({ key: `w:${w.severity}:${w.message}`, kind: w.severity === 'error' ? 'crit' : w.severity === 'warn' ? 'notice' : 'muted', alert: w.severity === 'error', text: `${w.param ? `${w.param}: ` : ''}${w.message}` });
		if (wb.error) out.push({ key: `err:${wb.error}`, kind: 'crit', alert: true, text: wb.error });
		if (wb.p3dError) out.push({ key: `p3d:${wb.p3dError}`, kind: 'crit', alert: true, text: wb.p3dError });
		if (wb.computeBlock && wb.raw) out.push({ key: `block:${wb.computeBlock}`, kind: 'muted', text: `Compute disabled: ${wb.computeBlock}` });
		if (wb.stale.any) out.push({ key: 'stale', kind: 'notice', text: `Inputs changed (${(['geometry', 'mesh', 'physics', 'study'] as const).filter((k) => wb.stale[k]).join(', ')}). Results belong to the previous run.` });
		for (const n of wb.notices) out.push({ key: `notice:${n.t}:${n.msg}`, kind: n.level === 'info' ? 'muted' : 'notice', text: n.msg, t: n.t });
		return out;
	});
	const nErrors = $derived(messages.filter((m) => m.kind === 'crit').length);
	const nMessages = $derived(messages.filter((m) => m.kind !== 'muted').length);
	const firstSeen = new Map<string, number>();
	const seenAt = (m: Msg) => {
		if (m.t) return m.t;
		if (!firstSeen.has(m.key)) firstSeen.set(m.key, Date.now());
		return firstSeen.get(m.key)!;
	};
	$effect(() => {
		const keys = new Set(messages.map((m) => m.key));
		for (const k of [...firstSeen.keys()]) if (!keys.has(k)) firstSeen.delete(k);
	});
	const tabs = [
		['messages', 'Messages'],
		['progress', 'Progress'],
		['log', 'Log'],
		['table', 'Table']
	] as const;

	$effect(() => {
		void wb.log.length;
		if (paneEl && wb.bottomTab === 'log') paneEl.scrollTop = paneEl.scrollHeight;
	});
	$effect(() => {
		const n = nErrors;
		if (n > prevErrors) wb.bottomTab = 'messages';
		prevErrors = n;
	});

	function stamp() {
		const d = new Date();
		const p2 = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
	}
	function saveLog() {
		downloadText(`sim-log-${stamp()}.txt`, wb.log.map((e) => `${new Date(e.t).toISOString()} ${e.level.toUpperCase()} ${e.msg}`).join('\n') + '\n', 'text/plain');
	}
	const rows = $derived(wb.run ? derivedRows(wb.run.result) : []);
	function exportDerived() {
		if (!wb.run) return;
		downloadText(`${wb.caseId.replace(/[^\w.-]+/g, '_')}-${wb.run.study}-derived-${stamp()}.csv`, `# case ${wb.caseId}, study ${wb.run.study}, run ${new Date(wb.run.at).toISOString()}${wb.stale.any ? ', stale' : ''}\n` + toCsv(['quantity', 'value', 'unit', 'where'], rows.map((r) => [r.label, r.value, r.unit, r.where])));
	}
</script>

<div class="bottom">
	<div class="tabs" role="tablist" aria-label="Output panels">
		{#each tabs as [id, label]}
			<button role="tab" aria-selected={wb.bottomTab === id} class:on={wb.bottomTab === id} onclick={() => (wb.bottomTab = id)}>
				{label}{#if id === 'messages' && nMessages}<span class="count" class:err={nErrors > 0}>{nMessages}</span>{/if}
			</button>
		{/each}
		<span class="grow"></span>
		<span class="status" role="status" data-status={wb.progress}>{#if wb.busy}<span class="spinner"></span>{/if}{wb.progress}</span>
	</div>
	<div class="pane" bind:this={paneEl}>
		{#if wb.bottomTab === 'messages'}
			{#each messages as m (m.key)}
				<div class="row msg {m.kind}" role={m.alert ? 'alert' : undefined}><span class="t">{clock(seenAt(m))}</span><span>{m.text}</span></div>
			{/each}
			{#if wb.notices.length}<button class="clear" onclick={() => (wb.notices = [])} data-tip="Clear runtime notices">Clear notices</button>{/if}
			{#if !messages.length}<p class="muted">No messages.</p>{/if}
		{:else if wb.bottomTab === 'progress'}
			{#each wb.progressRows as e}<div class="row {e.level}"><span class="t">{clock(e.t)}</span><span>{e.msg}</span></div>{/each}
			{#if !wb.progressRows.length}<p class="muted">Idle.</p>{/if}
		{:else if wb.bottomTab === 'log'}
			<div class="logtools"><button onclick={saveLog} data-tip="Download the log as a timestamped text file">Save</button><button onclick={() => (wb.log = [])}>Clear</button></div>
			{#each wb.log as e}<div class="row {e.level}"><span class="t">{clock(e.t)}</span><span>{e.msg}</span></div>{/each}
		{:else if wb.run}
			<div class="logtools"><span class="muted">{wb.caseId} · {wb.run.study}{wb.stale.any ? ' · stale' : ''}</span><button onclick={exportDerived}>CSV</button></div>
			<table class="grid" aria-label="Derived values"><thead><tr><th>Quantity</th><th>Value</th><th>Unit</th><th>Where</th></tr></thead><tbody>
				{#each rows as r}<tr><td>{r.label}</td><td class="num">{typeof r.value === 'number' ? fmt(r.value, 6) : r.value}</td><td>{r.unit}</td><td>{r.where}</td></tr>{/each}
			</tbody></table>
		{:else}<p class="muted">No results.</p>{/if}
	</div>
</div>

<style>
	.bottom { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; background: var(--surface); }
	.tabs { display: flex; align-items: center; border-bottom: 1px solid var(--border); min-width: 0; }
	.tabs button { border: 0; border-right: 1px solid var(--border); height: 26px; background: none; color: var(--ink-3); display: flex; align-items: center; gap: 4px; border-radius: 0; }
	.tabs button.on { color: var(--ink); background: var(--surface-2); box-shadow: inset 0 -2px var(--accent); }
	.count { font-size: 10px; padding: 0 4px; border: 1px solid var(--ink-3); border-radius: 0; line-height: 13px; }
	.count.err { color: var(--crit); border-color: var(--crit); }
	.grow { flex: 1; }
	.status { display: flex; align-items: center; gap: 6px; padding: 0 8px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; }
	.status .spinner { border-radius: 0; }
	.pane { overflow: auto; padding: 4px 8px; min-height: 0; }
	p { margin: 4px 0; line-height: 1.45; overflow-wrap: anywhere; }
	.row { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 8px; font: 11px/1.45 var(--mono); }
	.row .t { color: var(--ink-3); }
	.row.error { color: var(--crit); } .row.warn { color: var(--warn); }
	.row.msg { font: 12px/1.45 var(--sans); } .row.msg .t { font: 11px/1.6 var(--mono); }
	.row.crit { color: var(--crit); } .row.notice { color: var(--warn); } .row.muted { color: var(--ink-3); }
	.clear { height: 20px; font-size: 11px; margin-top: 4px; border-radius: 0; }
	.logtools { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
	.logtools button { height: 20px; font-size: 11px; border-radius: 0; }
	.grid { border-collapse: collapse; } .grid th, .grid td { padding: 2px 8px; text-align: left; border: 1px solid var(--border); white-space: nowrap; } .grid th { color: var(--ink-3); font-weight: 500; }
</style>
