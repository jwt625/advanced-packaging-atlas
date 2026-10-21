<script lang="ts">
	// Ported from eo-modulator-atlas app/src/lib/sim/Field.svelte at eb97f96 (GPL-3.0-or-later).
	// Local changes: reads the case YAML only (no resolved/expanded document: family defaults live in the Parameters
	// node); unit default from the key suffix.
	// One editable YAML value: reads the parsed case at `path`, writes back through Workbench.edit (YAML round trip).
	import type { Workbench } from './workbench.svelte';
	import { coerce } from './yamlEdit';
	import { unitOf } from './units';

	interface Props {
		wb: Workbench;
		path: string;
		label: string;
		unit?: string;
		tip?: string;
		options?: readonly string[];
		bool?: boolean;
		readonly?: boolean;
		/** Input only (no label or unit column), for tables. */
		bare?: boolean;
	}
	let { wb, path, label, unit = '', tip = '', options, bool = false, readonly = false, bare = false }: Props = $props();
	// Case document value (may be an "=expr" expression).
	const src = $derived(wb.rawAt(path));
	const value = $derived(src);
	const inherited = false;
	const shownUnit = $derived(unit || unitOf(path));
	// Large numbers (doping in cm^-3) in exponent form: 5e+17, not 500000000000000000.
	const shown = $derived(value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : typeof value === 'number' && Math.abs(value) >= 1e9 ? value.toExponential() : String(value));
	const editable = $derived(!readonly && !wb.busy && (value == null || typeof value !== 'object'));
	const note = $derived(typeof src === 'string' && src.startsWith('=') ? 'Expression (EO params grammar)' : '');

	function commit(input: string) {
		if (input === shown) return;
		// An emptied field removes the key (U16); nothing happens when it was not set.
		if (input.trim() === '') {
			if (src !== undefined) wb.clear(path);
			return;
		}
		wb.edit(path, coerce(input));
	}
</script>

<label class="f" class:bare class:inh={inherited} data-tip={`${tip ? tip + '\n' : ''}${note ? note + '\n' : ''}YAML: ${path} (empty = remove the key)`}>
	{#if !bare}<span class="k">{label}</span>{/if}
	{#if bool}
		<input type="checkbox" checked={value === true} disabled={!editable} onchange={(e) => wb.edit(path, e.currentTarget.checked)} />
	{:else if options}
		<select value={shown} disabled={!editable} onchange={(e) => commit(e.currentTarget.value)}>
			{#if !options.includes(shown)}<option value={shown}>{shown || 'not set'}</option>{/if}
			{#each options as o}<option value={o}>{o}</option>{/each}
		</select>
	{:else}
		<input type="text" class="num" value={shown} placeholder="not set" disabled={!editable} spellcheck="false"
			onchange={(e) => commit(e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') commit(e.currentTarget.value); }} />
	{/if}
	{#if !bare}<span class="u">{shownUnit}</span>{/if}
</label>

<style>
	.f { display: grid; grid-template-columns: minmax(70px, 42%) minmax(0, 1fr) 42px; align-items: center; gap: 6px; padding: 1px 0; }
	.f.bare { grid-template-columns: minmax(0, 1fr); }
	.k { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.u { color: var(--ink-3); font-size: 11px; }
	input[type='text'], select { width: 100%; height: 22px; border-radius: 0; }
	input:disabled, select:disabled { opacity: 0.7; }
	input[type='checkbox'] { justify-self: start; }
	.inh input[type='text'], .inh select { color: var(--ink-3); font-style: italic; }
</style>
