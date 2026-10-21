<script lang="ts">
	// Smith chart (R7 3.4, U3): Canvas 2D, constant-r circles and constant-x arcs (normalized), one trace per reflection
	// coefficient series, hover readout (f, |G|, angle, z = Z / Zref), CSV / PNG export. Conventions as LinePlot.svelte.
	import { onMount } from 'svelte';
	import { ui } from '../state.svelte';
	import { downloadText, downloadDataUrl, toCsv } from './exportUtil';
	import { SERIES_COLORS } from './LinePlot.svelte';
	import type { C } from './emResults';

	interface Trace { name: string; f: number[]; g: C[]; color?: string }
	let { traces, height = 300, filename = 'smith', ariaLabel = 'Smith chart', note = '' }: { traces: Trace[]; height?: number; filename?: string; ariaLabel?: string; note?: string } = $props();
	let wrap: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let width = $state(300);
	let hover = $state<{ x: number; y: number; lines: string[] } | null>(null);
	let geo = { cx: 0, cy: 0, R: 1 };

	const css = (n: string) => getComputedStyle(wrap).getPropertyValue(n).trim() || '#888';

	function draw() {
		if (!canvas || !wrap) return;
		const dpr = window.devicePixelRatio || 1;
		const W = width, H = height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		const ctx = canvas.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const R = Math.min(W, H) / 2 - 18, cx = W / 2, cy = H / 2;
		geo = { cx, cy, R };
		const P = (g: C): [number, number] => [cx + g[0] * R, cy - g[1] * R];
		ctx.strokeStyle = css('--grid');
		ctx.lineWidth = 1;
		ctx.save();
		ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip();
		// constant r circles: centre r / (1 + r), radius 1 / (1 + r)
		for (const r of [0.2, 0.5, 1, 2, 5]) {
			ctx.beginPath(); ctx.arc(cx + (r / (1 + r)) * R, cy, (1 / (1 + r)) * R, 0, 2 * Math.PI); ctx.stroke();
		}
		// constant x arcs: centre (1, 1 / x), radius 1 / |x|
		for (const x of [0.2, 0.5, 1, 2, 5, -0.2, -0.5, -1, -2, -5]) {
			ctx.beginPath(); ctx.arc(cx + R, cy - (1 / x) * R, Math.abs(1 / x) * R, 0, 2 * Math.PI); ctx.stroke();
		}
		ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
		ctx.restore();
		ctx.strokeStyle = css('--line');
		ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
		ctx.fillStyle = css('--ink-3');
		ctx.font = '10px system-ui, sans-serif';
		ctx.textAlign = 'center';
		for (const r of [0.2, 0.5, 1, 2, 5]) ctx.fillText(String(r), cx + ((r - 1) / (r + 1)) * R, cy - 3);
		traces.forEach((t, k) => {
			const col = t.color ?? SERIES_COLORS[k % SERIES_COLORS.length];
			ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
			ctx.beginPath();
			t.g.forEach((g, i) => { const [x, y] = P(g); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
			ctx.stroke();
			t.g.forEach((g) => { const [x, y] = P(g); ctx.fillRect(x - 2, y - 2, 4, 4); });
			// first frequency marked with a hollow square
			if (t.g.length) { const [x, y] = P(t.g[0]); ctx.strokeRect(x - 4, y - 4, 8, 8); }
		});
	}

	function onMove(ev: PointerEvent) {
		const r = canvas.getBoundingClientRect();
		const mx = ev.clientX - r.left, my = ev.clientY - r.top;
		let best: { d: number; t: Trace; i: number } | null = null;
		for (const t of traces) t.g.forEach((g, i) => {
			const d = Math.hypot(geo.cx + g[0] * geo.R - mx, geo.cy - g[1] * geo.R - my);
			if (d < 10 && (!best || d < best.d)) best = { d, t, i };
		});
		if (!best) { hover = null; return; }
		const { t, i } = best as { t: Trace; i: number };
		const g = t.g[i];
		const den = (1 - g[0]) ** 2 + g[1] ** 2;
		const zr = (1 - g[0] ** 2 - g[1] ** 2) / den, zi = (2 * g[1]) / den;
		hover = { x: mx, y: my, lines: [`${t.name} at ${t.f[i]} GHz`, `|G| ${Math.hypot(g[0], g[1]).toPrecision(4)}, ${((Math.atan2(g[1], g[0]) * 180) / Math.PI).toFixed(1)} deg`, `z = ${zr.toPrecision(4)} ${zi >= 0 ? '+' : '-'} j${Math.abs(zi).toPrecision(4)}`] };
	}

	function exportCsv() {
		const rows = traces.flatMap((t) => t.g.map((g, i) => [t.name, t.f[i], g[0], g[1]]));
		downloadText(`${filename}.csv`, (note ? `# ${note}\n` : '') + toCsv(['trace', 'f_GHz', 're', 'im'], rows));
	}

	onMount(() => {
		const ro = new ResizeObserver(() => (width = wrap.clientWidth));
		ro.observe(wrap);
		width = wrap.clientWidth;
		return () => ro.disconnect();
	});
	$effect(() => {
		void [traces, width, height, ui.theme];
		draw();
	});
</script>

<div class="sc" bind:this={wrap}>
	<div class="bar">
		{#each traces as t, k}<span class="key" data-tip="{t.name}; hollow square = first frequency"><i style:background={t.color ?? SERIES_COLORS[k % SERIES_COLORS.length]}></i>{t.name}</span>{/each}
		<span class="grow"></span>
		<button onclick={exportCsv} data-tip="Download the plotted reflection coefficients as CSV">CSV</button>
		<button onclick={() => downloadDataUrl(`${filename}.png`, canvas.toDataURL('image/png'))} data-tip="Download this chart as PNG">PNG</button>
	</div>
	<div class="cv" style:height="{height}px" role="img" aria-label={ariaLabel}>
		<canvas bind:this={canvas} style:width="{width}px" style:height="{height}px" onpointermove={onMove} onpointerleave={() => (hover = null)}></canvas>
		{#if hover}<div class="tip" style:left="{Math.min(hover.x + 12, width - 190)}px" style:top="{hover.y + 8}px">{#each hover.lines as l}<div>{l}</div>{/each}</div>{/if}
	</div>
</div>

<style>
	.sc { width: 100%; min-width: 0; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 2px 0 4px; color: var(--ink-3); font-size: 11px; }
	.bar button { height: 20px; padding: 0 6px; font-size: 11px; border-radius: 0; }
	.grow { flex: 1; }
	.key { display: inline-flex; align-items: center; gap: 4px; }
	.key i { display: inline-block; width: 10px; height: 2px; }
	.cv { position: relative; }
	canvas { display: block; }
	.tip { position: absolute; pointer-events: none; background: var(--surface); border: 1px solid var(--line); padding: 4px 6px; font-size: 11px; white-space: nowrap; border-radius: 0; z-index: 2; }
</style>
