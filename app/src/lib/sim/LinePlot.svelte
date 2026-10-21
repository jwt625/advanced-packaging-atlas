<script lang="ts" module>
	// Ported from eo-modulator-atlas app/src/lib/sim/LinePlot.svelte at eb97f96 (GPL-3.0-or-later).
	export interface Series {
		name: string;
		x: ArrayLike<number>;
		y: ArrayLike<number>;
		color?: string;
		markers?: boolean;
		line?: boolean;
		/** Right y axis (second axis, own range and label). */
		y2?: boolean;
	}
	export interface OverlayPoint {
		x: number;
		y: number;
		label: string;
		detail?: string;
		/** Not comparable with the curve (source.comparable: false): grey dashed marker, own legend key. */
		muted?: boolean;
	}
	export const SERIES_COLORS = ['#3987e5', '#e0803a', '#3fae7a', '#c160c1', '#c9a227', '#5bb5c9'];
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { ui } from '../state.svelte';
	import { linearTicks, logTicks, tickLabel } from './ticks';
	import { downloadText, downloadDataUrl, toCsv } from './exportUtil';

	interface Props {
		series: Series[];
		points?: OverlayPoint[];
		pointsName?: string;
		xLabel: string;
		yLabel: string;
		logX?: boolean;
		logY?: boolean;
		height?: number;
		ariaLabel: string;
		filename?: string;
		toggles?: boolean;
		/** Label of the right y axis (series with y2). */
		y2Label?: string;
		/** First comment line of the CSV (e.g. the solution). */
		csvNote?: string;
	}
	let { series, points = [], pointsName = 'Paper', xLabel, yLabel, logX = $bindable(false), logY = $bindable(false), height = 220, ariaLabel, filename = 'plot', toggles = true, y2Label = '', csvNote = '' }: Props = $props();
	const hasY2 = $derived(series.some((s) => s.y2));

	let wrap: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let width = $state(300);
	let hover = $state<{ px: number; py: number; lines: string[] } | null>(null);
	let frame: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; left: number; top: number; w: number; h: number } | null = null;

	const tx = (v: number) => (logX ? Math.log10(v) : v);
	const ty = (v: number) => (logY ? Math.log10(v) : v);
	const okX = (v: number) => Number.isFinite(v) && (!logX || v > 0);
	const okY = (v: number) => Number.isFinite(v) && (!logY || v > 0);

	function extent() {
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
		const add = (x: number, y: number, right = false) => {
			if (!okX(x) || !okY(y)) return;
			x0 = Math.min(x0, tx(x)); x1 = Math.max(x1, tx(x));
			if (right) { z0 = Math.min(z0, ty(y)); z1 = Math.max(z1, ty(y)); }
			else { y0 = Math.min(y0, ty(y)); y1 = Math.max(y1, ty(y)); }
		};
		for (const s of series) for (let i = 0; i < s.x.length; i++) add(s.x[i], s.y[i], !!s.y2);
		for (const p of points) add(p.x, p.y);
		if (!Number.isFinite(x0)) return null;
		const pad = (a: number, b: number) => (a === b ? [a - (Math.abs(a) || 1) * 0.05, b + (Math.abs(b) || 1) * 0.05] : [a - (b - a) * 0.04, b + (b - a) * 0.04]);
		if (!Number.isFinite(y0)) { y0 = 0; y1 = 1; }
		if (!Number.isFinite(z0)) { z0 = y0; z1 = y1; }
		[x0, x1] = pad(x0, x1);
		[y0, y1] = pad(y0, y1);
		[z0, z1] = pad(z0, z1);
		return { x0, x1, y0, y1, z0, z1 };
	}

	function css(name: string) {
		return getComputedStyle(wrap).getPropertyValue(name).trim() || '#888';
	}

	function draw() {
		if (!canvas || !wrap) return;
		const dpr = window.devicePixelRatio || 1;
		const W = width, H = height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		const ctx = canvas.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const ink = css('--ink-2'), ink3 = css('--ink-3'), grid = css('--grid'), line = css('--line');
		ctx.font = '10px system-ui, sans-serif';
		const e = extent();
		const left = 54, right = hasY2 ? 58 : 10, top = 8, bottom = 32;
		const w = Math.max(10, W - left - right), h = Math.max(10, H - top - bottom);
		ctx.fillStyle = ink3;
		ctx.textAlign = 'center';
		ctx.fillText(xLabel, left + w / 2, H - 4);
		ctx.save();
		ctx.translate(11, top + h / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.fillText(yLabel, 0, 0);
		ctx.restore();
		if (hasY2) {
			ctx.save();
			ctx.translate(W - 6, top + h / 2);
			ctx.rotate(Math.PI / 2);
			ctx.fillText(y2Label, 0, 0);
			ctx.restore();
		}
		ctx.strokeStyle = line;
		ctx.strokeRect(left + 0.5, top + 0.5, w, h);
		if (!e) {
			frame = null;
			ctx.fillText('No data', left + w / 2, top + h / 2);
			return;
		}
		frame = { ...e, left, top, w, h };
		const X = (v: number) => left + ((v - e.x0) / (e.x1 - e.x0)) * w;
		const Y = (v: number) => top + h - ((v - e.y0) / (e.y1 - e.y0)) * h;
		const Z = (v: number) => top + h - ((v - e.z0) / (e.z1 - e.z0)) * h;
		const xt = logX ? logTicks(10 ** e.x0, 10 ** e.x1) : linearTicks(e.x0, e.x1, Math.max(2, Math.floor(w / 70)));
		const yt = logY ? logTicks(10 ** e.y0, 10 ** e.y1) : linearTicks(e.y0, e.y1, Math.max(2, Math.floor(h / 40)));
		ctx.lineWidth = 1;
		for (const t of xt) {
			const px = Math.round(X(tx(t))) + 0.5;
			ctx.strokeStyle = grid;
			ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, top + h); ctx.stroke();
			ctx.fillStyle = ink;
			ctx.fillText(tickLabel(t), px, top + h + 12);
		}
		ctx.textAlign = 'right';
		for (const t of yt) {
			const py = Math.round(Y(ty(t))) + 0.5;
			ctx.strokeStyle = grid;
			ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(left + w, py); ctx.stroke();
			ctx.fillStyle = ink;
			ctx.fillText(tickLabel(t), left - 4, py + 3);
		}
		if (hasY2) {
			ctx.textAlign = 'left';
			const zt = logY ? logTicks(10 ** e.z0, 10 ** e.z1) : linearTicks(e.z0, e.z1, Math.max(2, Math.floor(h / 40)));
			for (const t of zt) {
				const py = Math.round(Z(ty(t))) + 0.5;
				ctx.strokeStyle = line;
				ctx.beginPath(); ctx.moveTo(left + w, py); ctx.lineTo(left + w + 4, py); ctx.stroke();
				ctx.fillStyle = ink;
				ctx.fillText(tickLabel(t), left + w + 6, py + 3);
			}
		}
		ctx.save();
		ctx.beginPath();
		ctx.rect(left, top, w, h);
		ctx.clip();
		series.forEach((s, k) => {
			const color = s.color ?? SERIES_COLORS[k % SERIES_COLORS.length];
			ctx.strokeStyle = color;
			ctx.fillStyle = color;
			ctx.lineWidth = 1.6;
			const YY = s.y2 ? Z : Y;
			if (s.y2) ctx.setLineDash([6, 3]);
			if (s.line !== false) {
				ctx.beginPath();
				let pen = false;
				for (let i = 0; i < s.x.length; i++) {
					if (!okX(s.x[i]) || !okY(s.y[i])) { pen = false; continue; }
					const px = X(tx(s.x[i])), py = YY(ty(s.y[i]));
					if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
					pen = true;
				}
				ctx.stroke();
			}
			ctx.setLineDash([]);
			if (s.markers) for (let i = 0; i < s.x.length; i++) {
				if (!okX(s.x[i]) || !okY(s.y[i])) continue;
				ctx.fillRect(X(tx(s.x[i])) - 2.5, YY(ty(s.y[i])) - 2.5, 5, 5);
			}
		});
		ctx.lineWidth = 1.5;
		for (const p of points) {
			if (!okX(p.x) || !okY(p.y)) continue;
			const px = X(tx(p.x)), py = Y(ty(p.y));
			ctx.strokeStyle = p.muted ? ink3 : css('--warn');
			ctx.setLineDash(p.muted ? [2, 2] : []);
			ctx.beginPath();
			ctx.moveTo(px, py - 5); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 5); ctx.lineTo(px - 5, py); ctx.closePath();
			ctx.stroke();
		}
		ctx.setLineDash([]);
		ctx.restore();
		if (hover) {
			ctx.strokeStyle = ink3;
			ctx.setLineDash([3, 3]);
			ctx.beginPath(); ctx.moveTo(hover.px + 0.5, top); ctx.lineTo(hover.px + 0.5, top + h); ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	function onMove(ev: PointerEvent) {
		if (!frame) return;
		const r = canvas.getBoundingClientRect();
		const mx = ev.clientX - r.left, my = ev.clientY - r.top;
		const f = frame;
		if (mx < f.left || mx > f.left + f.w || my < f.top || my > f.top + f.h) { hover = null; return; }
		const X = (v: number) => f.left + ((v - f.x0) / (f.x1 - f.x0)) * f.w;
		const Y = (v: number) => f.top + f.h - ((v - f.y0) / (f.y1 - f.y0)) * f.h;
		for (const p of points) {
			if (!okX(p.x) || !okY(p.y)) continue;
			if (Math.hypot(X(tx(p.x)) - mx, Y(ty(p.y)) - my) < 8) {
				hover = { px: mx, py: my, lines: [`${pointsName}: ${p.label}`, `${tickLabel(Number(p.x.toPrecision(5)))}, ${tickLabel(Number(p.y.toPrecision(5)))}`, ...(p.detail ? [p.detail] : [])] };
				return;
			}
		}
		const lines: string[] = [];
		let snap = mx;
		series.forEach((s) => {
			let best = -1, bd = Infinity;
			for (let i = 0; i < s.x.length; i++) {
				if (!okX(s.x[i]) || !okY(s.y[i])) continue;
				const d = Math.abs(X(tx(s.x[i])) - mx);
				if (d < bd) { bd = d; best = i; }
			}
			if (best >= 0 && bd < 40) {
				if (!lines.length) { lines.push(`${xLabel}: ${tickLabel(Number(s.x[best].toPrecision(6)))}`); snap = X(tx(s.x[best])); }
				lines.push(`${s.name}: ${tickLabel(Number(s.y[best].toPrecision(6)))}`);
			}
		});
		hover = lines.length ? { px: snap, py: my, lines } : null;
	}

	export function exportCsv() {
		const n = Math.max(0, ...series.map((s) => s.x.length));
		// H3: each column names its own series (with the series unit); x columns name the x quantity.
		const header = series.flatMap((s) => [`${xLabel} [${s.name}]`, s.name]);
		const rows: (string | number)[][] = [];
		for (let i = 0; i < n; i++) rows.push(series.flatMap((s): (string | number)[] => (i < s.x.length ? [s.x[i], s.y[i]] : ['', ''])));
		for (const p of points) rows.push([...series.flatMap(() => ['', '']), p.label, p.x, p.y]);
		downloadText(`${filename}.csv`, (csvNote ? `# ${csvNote}\n` : '') + toCsv(points.length ? [...header, pointsName, `${pointsName} x`, `${pointsName} y`] : header, rows));
	}

	onMount(() => {
		const ro = new ResizeObserver(() => { width = wrap.clientWidth; });
		ro.observe(wrap);
		width = wrap.clientWidth;
		return () => ro.disconnect();
	});

	$effect(() => {
		void [series, points, logX, logY, width, height, hover, ui.theme, xLabel, yLabel];
		draw();
	});
</script>

<div class="lp" bind:this={wrap} data-series={series.length} data-points={points.length}>
	{#if toggles}
		<div class="bar">
			<label data-tip="Logarithmic x axis"><input type="checkbox" bind:checked={logX} /> log x</label>
			<label data-tip="Logarithmic y axis"><input type="checkbox" bind:checked={logY} /> log y</label>
			<span class="grow"></span>
			{#each series as s, k}<span class="key" data-tip="{s.name}{s.y2 ? ' (right axis, dashed)' : ''}"><i class:dash={s.y2} style:background={s.color ?? SERIES_COLORS[k % SERIES_COLORS.length]}></i>{s.name}</span>{/each}
			{#if points.some((p) => !p.muted)}<span class="key" data-tip="Paper-reported points; hover a marker for its device_id"><i class="pt"></i>{pointsName}</span>{/if}
			{#if points.some((p) => p.muted)}<span class="key" data-key-muted data-tip="Paper points marked comparable: false in the config (different definition or device); shown for the record, not compared"><i class="pt muted"></i>{pointsName} (comparable: false)</span>{/if}
			<button data-tip="Download the plotted data as CSV" onclick={exportCsv}>CSV</button>
			<button data-tip="Download this plot as PNG" onclick={() => downloadDataUrl(`${filename}.png`, canvas.toDataURL('image/png'))}>PNG</button>
		</div>
	{/if}
	<div class="cv" style:height="{height}px" role="img" aria-label={ariaLabel}>
		<canvas bind:this={canvas} style:width="{width}px" style:height="{height}px" onpointermove={onMove} onpointerleave={() => (hover = null)}></canvas>
		{#if hover}
			<div class="tip" style:left="{Math.min(hover.px + 12, width - 170)}px" style:top="{Math.max(0, hover.py - 10)}px">
				{#each hover.lines as l}<div>{l}</div>{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.lp { min-width: 0; width: 100%; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 2px 0 4px; color: var(--ink-3); font-size: 11px; }
	.bar label { display: flex; align-items: center; gap: 4px; }
	.bar button { height: 20px; padding: 0 6px; font-size: 11px; border-radius: 0; }
	.grow { flex: 1; }
	.key { display: inline-flex; align-items: center; gap: 4px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.key i { display: inline-block; width: 10px; height: 2px; }
	.key i.dash { width: 4px; box-shadow: 6px 0 0 0 currentColor; }
	.key i.pt { width: 7px; height: 7px; border: 1.5px solid var(--warn); transform: rotate(45deg); background: none; }
	.key i.pt.muted { border: 1.5px dashed var(--ink-3); }
	.cv { position: relative; }
	canvas { display: block; touch-action: none; }
	.tip { position: absolute; pointer-events: none; background: var(--surface); border: 1px solid var(--line); padding: 4px 6px; font-size: 11px; white-space: nowrap; z-index: 2; border-radius: 0; }
</style>
