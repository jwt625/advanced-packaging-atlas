<script lang="ts">
	// Transport: reverse play, step back, play / pause, step forward, speed, loop; scrub bar with step ticks.
	import type { Step } from './types';

	let {
		steps, pos, playing, dir, speed, loop, onplay, onreverse, onstep, onseek, onspeed, onloop
	}: {
		steps: Step[]; pos: number; playing: boolean; dir: 1 | -1; speed: number; loop: boolean;
		onplay: () => void; onreverse: () => void; onstep: (d: 1 | -1) => void; onseek: (pos: number, end: boolean) => void;
		onspeed: (s: number) => void; onloop: () => void;
	} = $props();

	const SPEEDS = [0.25, 0.5, 1, 2, 4];
	const CAT_COL: Record<string, string> = {
		bonding: '#d9a35c', underfill: '#a48f5c', molding: '#6b7078', grinding_thinning: '#9aa3ad', temporary_bonding: '#6fb0bf',
		debonding: '#6fb0bf', dicing: '#b0b0a8', bumping: '#c27c45', electroplating: '#c27c45', cmp: '#93a8bf', reflow: '#e0703a',
		tsv_tgv_formation: '#66758c', deposition_other: '#8f9fb5'
	};
	let bar: HTMLDivElement;
	let drag = false;
	const N = $derived(steps.length);
	// displayed step and t: t = 1 at the end of the last step stays on that step
	const dk = $derived(Math.max(0, Math.min(N - 1, Math.floor(pos))));
	const dt = $derived(Math.max(0, Math.min(1, pos - dk)));
	function at(e: PointerEvent): number {
		const r = bar.getBoundingClientRect();
		return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * N;
	}
	function down(e: PointerEvent) {
		drag = true;
		bar.setPointerCapture(e.pointerId);
		onseek(at(e), false);
	}
	function move(e: PointerEvent) {
		if (drag) onseek(at(e), false);
	}
	function up(e: PointerEvent) {
		if (!drag) return;
		drag = false;
		onseek(at(e), true);
	}
</script>

<div class="ctl">
	<div class="seg">
		<button class:on={playing && dir < 0} onclick={onreverse} aria-label="Reverse play" data-tip="Reverse play (R)"><svg viewBox="0 0 12 12" width="11" height="11"><path d="M10 2 4 6l6 4z" fill="currentColor" /></svg></button>
		<button onclick={() => onstep(-1)} aria-label="Step back" data-tip="Step back (Left)"><svg viewBox="0 0 12 12" width="11" height="11"><path d="M2 2h1.5v8H2zM10 2 4.5 6 10 10z" fill="currentColor" /></svg></button>
		<button class:on={playing && dir > 0} onclick={onplay} aria-label={playing ? 'Pause' : 'Play'} data-tip="Play / pause (Space)">
			{#if playing}<svg viewBox="0 0 12 12" width="11" height="11"><path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" /></svg>{:else}<svg viewBox="0 0 12 12" width="11" height="11"><path d="M3 2l7 4-7 4z" fill="currentColor" /></svg>{/if}
		</button>
		<button onclick={() => onstep(1)} aria-label="Step forward" data-tip="Step forward (Right)"><svg viewBox="0 0 12 12" width="11" height="11"><path d="M8.5 2H10v8H8.5zM2 2l5.5 4L2 10z" fill="currentColor" /></svg></button>
	</div>
	<select value={speed} onchange={(e) => onspeed(Number((e.currentTarget as HTMLSelectElement).value))} aria-label="Speed" data-tip="Playback speed ([ and ]); per step 6 s x weight at 1x">
		{#each SPEEDS as s (s)}<option value={s}>{s}x</option>{/each}
	</select>
	<button class:on={loop} onclick={onloop} data-tip="Loop (L)">Loop</button>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="bar" bind:this={bar} onpointerdown={down} onpointermove={move} onpointerup={up} role="slider" aria-valuemin={0} aria-valuemax={N} aria-valuenow={pos} aria-label="Scrub" tabindex="-1">
		{#each steps as s, k (s.id)}
			<div class="seg-s" style:left="{(k / N) * 100}%" style:width="{(1 / N) * 100}%" data-tip="{k + 1}/{N} · {s.name} ({s.category})">
				<span class="cat" style:background={CAT_COL[s.category] ?? '#7d7d7a'}></span>
			</div>
		{/each}
		<div class="fill" style:width="{(pos / Math.max(1, N)) * 100}%"></div>
		<div class="head" style:left="{(pos / Math.max(1, N)) * 100}%"></div>
	</div>
	<span class="num pos">{dk + 1}/{N} · {Math.round(dt * 100).toString().padStart(2, '0')}%</span>
</div>

<style>
	.ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 4px 8px; background: var(--surface); border-top: 1px solid var(--border); min-width: 0; }
	/* narrow screens: transport on one line, the scrub bar on its own full-width line (V1 M4) */
	@media (max-width: 520px) { .bar { order: 10; flex-basis: 100%; } }
	.seg { display: inline-flex; }
	.seg button + button { border-left: none; }
	button { height: 22px; font-size: 11px; padding: 0 7px; display: inline-flex; align-items: center; }
	select { height: 22px; font-size: 11px; }
	.bar { position: relative; flex: 1; height: 18px; background: var(--grid); cursor: pointer; min-width: 120px; touch-action: none; }
	.seg-s { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--line); }
	.seg-s .cat { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; opacity: 0.85; }
	.fill { position: absolute; left: 0; top: 0; bottom: 3px; background: var(--accent); opacity: 0.25; pointer-events: none; }
	.head { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; background: var(--ink); pointer-events: none; }
	.pos { font-size: 10.5px; color: var(--ink-2); min-width: 64px; text-align: right; }
</style>
