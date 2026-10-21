<script lang="ts">
	// Global Definitions > Materials: template material key of each part -> library key (case map, else the L2 alias)
	// with k at 25 °C and its provenance (basis, source, locator) on hover. Library: engine/src/materials (L2).
	import type { Workbench } from './workbench.svelte';
	import { materialLibrary, engineStatus, loadModule, MODULE_LANE } from './engine';
	import { materialOf } from './engineRun';
	import { fmt } from '../logic';

	let { wb }: { wb: Workbench } = $props();
	const eng = engineStatus();
	let lib = $state.raw<Record<string, unknown> | null>(null);
	let libError = $state('');
	$effect(() => {
		if (!eng.materials) return;
		Promise.all([materialLibrary(), loadModule('materials')!]).then(([l, m]) => (lib = { ...l, COLUMN_KINDS: m.COLUMN_KINDS, LAYER_KINDS: m.LAYER_KINDS })).catch((e) => (libError = e instanceof Error ? e.message : String(e)));
	});

	interface Row { tpl: string; parts: string[]; key: string; err: string; k: number[] | null; tip: string }
	const rows: Row[] = $derived.by(() => {
		const by = new Map<string, string[]>();
		for (const p of wb.parts) by.set(p.material, [...(by.get(p.material) ?? []), p.id]);
		const map = (wb.raw?.materials?.map ?? {}) as Record<string, string>;
		const of = lib ? materialOf(map, lib) : null;
		const res = lib?.resolve as ((k: string, T: number, o: unknown) => Record<string, any>) | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
		return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tpl, ids]) => {
			const part = wb.parts.find((p) => p.id === ids[0])!;
			let key = map[part.id] ?? map[part.kind] ?? map[tpl] ?? '', err = '', k: number[] | null = null, tip = '';
			if (of && res) {
				try {
					key = of(part);
				} catch (e) {
					return { tpl, parts: ids, key: '', err: e instanceof Error ? e.message : String(e), k: null, tip: '' };
				}
				try {
					const r = res(key, 298.15, { need: ['k'] });
					k = Array.isArray(r.k_W_mK) ? r.k_W_mK : null;
					const pk = r.provenance?.k ?? r.provenance;
					tip = pk ? Object.entries(pk).filter(([, v]) => v != null && typeof v !== 'object').map(([a, v]) => `${a}: ${String(v)}`).join('\n') : '';
				} catch (e) {
					err = e instanceof Error ? e.message : String(e);
				}
			}
			return { tpl, parts: ids, key, err, k, tip };
		});
	});
</script>

<p class="muted small">{eng.materials ? (lib ? 'Template key -> library key (case materials.map, else the library alias); k at 25 °C.' : libError || 'Loading library...') : `Library not in this build (engine/src/materials, ${MODULE_LANE.materials}): keys only.`}</p>
<table class="grid"><thead><tr><th>Template key</th><th>Parts</th><th>Library key</th><th>k (W/(m·K))</th></tr></thead><tbody>
	{#each rows as r (r.tpl)}
		<tr><td class="mono small">{r.tpl}</td><td class="small" data-tip={r.parts.join(', ')}>{r.parts.length}</td>
			<td class="mono small" class:crit={!r.key && !!r.err} data-tip={r.key || r.err || undefined}>{r.key || (r.err ? 'unmapped' : '-')}</td>
			<td class="num small" class:crit={!!r.key && !!r.err} data-tip={r.err || r.tip || undefined}>{r.k ? r.k.map((v) => fmt(v, 4)).join(', ') : r.err ? 'N/A' : ''}</td></tr>
	{/each}
</tbody></table>

<style>
	.small { font-size: 11px; }
	.crit { color: var(--crit); }
	p { margin: 6px 0; }
	.grid { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; } .grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.grid th:nth-child(2) { width: 40px; }
</style>
