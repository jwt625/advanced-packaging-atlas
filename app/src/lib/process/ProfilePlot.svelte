<script lang="ts">
	// Mini profile plot: temperature traces (solid = actual / joint, dashed = set) on the left axis, force on the right
	// axis, real time on x, cursor at the current real time. Data only, absolute units.
	import { fmt, provTip } from './data';
	import type { Profile, Ref } from './types';

	let { profiles, cursor, refs }: { profiles: Profile[]; cursor: number | null; refs: Record<string, Ref> } = $props();

	const W = 252, H = 112, L = 34, Rm = 30, T = 8, B = 20;
	const temps = $derived(profiles.filter((p) => p.q === 'T'));
	const others = $derived(profiles.filter((p) => p.q !== 'T'));
	const t0 = $derived(Math.min(...profiles.map((p) => p.pts[0]?.[0] ?? 0)));
	const t1 = $derived(Math.max(...profiles.map((p) => p.pts[p.pts.length - 1]?.[0] ?? 1)));
	function range(ps: Profile[]): [number, number] {
		const vs = ps.flatMap((p) => p.pts.map((x) => x[1]));
		if (!vs.length) return [0, 1];
		let a = Math.min(...vs), b = Math.max(...vs);
		if (b - a < 1e-9) { a -= 1; b += 1; }
		const pad = (b - a) * 0.08;
		return [a - pad, b + pad];
	}
	const yl = $derived(range(temps.length ? temps : others));
	const yr = $derived(range(others));
	const X = (t: number) => L + ((t - t0) / Math.max(1e-9, t1 - t0)) * (W - L - Rm);
	const Yl = (v: number) => T + (1 - (v - yl[0]) / (yl[1] - yl[0])) * (H - T - B);
	const Yr = (v: number) => T + (1 - (v - yr[0]) / (yr[1] - yr[0])) * (H - T - B);
	const path = (p: Profile, y: (v: number) => number) => p.pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join('');
	function ticks(a: number, b: number, n = 3): number[] {
		const span = b - a;
		const s0 = Math.pow(10, Math.floor(Math.log10(span / n)));
		const st = [1, 2, 5, 10].map((m) => m * s0).find((x) => span / x <= n + 1) ?? s0 * 10;
		const out: number[] = [];
		for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(v);
		return out;
	}
	const leftUnit = $derived((temps[0] ?? others[0])?.unit ?? '');
	const rightUnit = $derived(temps.length ? others[0]?.unit ?? '' : '');
</script>

<svg width={W} height={H} class="pp" role="img" aria-label="process profile">
	<rect x={L} y={T} width={W - L - Rm} height={H - T - B} class="frame" />
	{#each ticks(yl[0], yl[1]) as v (v)}
		<line x1={L - 3} x2={L} y1={Yl(v)} y2={Yl(v)} class="ax" />
		<text x={L - 5} y={Yl(v) + 3} text-anchor="end">{fmt(v)}</text>
	{/each}
	<text x={2} y={T + 2} class="u" dominant-baseline="hanging">{leftUnit}</text>
	{#if temps.length && others.length}
		{#each ticks(yr[0], yr[1]) as v (v)}
			<line x1={W - Rm} x2={W - Rm + 3} y1={Yr(v)} y2={Yr(v)} class="ax" />
			<text x={W - Rm + 5} y={Yr(v) + 3}>{fmt(v)}</text>
		{/each}
		<text x={W - 2} y={T + 2} class="u" text-anchor="end" dominant-baseline="hanging">{rightUnit}</text>
	{/if}
	{#each ticks(t0, t1, 4) as v (v)}
		<line x1={X(v)} x2={X(v)} y1={H - B} y2={H - B + 3} class="ax" />
		<text x={X(v)} y={H - B + 12} text-anchor="middle">{fmt(v)}</text>
	{/each}
	<text x={W - Rm} y={H - 2} class="u" text-anchor="end">s</text>
	{#each temps as p (p.id)}
		<path d={path(p, Yl)} class="tr" class:set={p.trace === 'set'} class:tpl={p.status === 'template'}><title>{p.label ?? p.trace ?? p.q}: {provTip(p, refs)}</title></path>
	{/each}
	{#each others as p (p.id)}
		<path d={path(p, temps.length ? Yr : Yl)} class="tr f" class:tpl={p.status === 'template'}><title>{p.label ?? p.q}: {provTip(p, refs)}</title></path>
	{/each}
	{#if cursor != null && Number.isFinite(cursor)}
		<line x1={X(cursor + t0)} x2={X(cursor + t0)} y1={T} y2={H - B} class="cur" />
	{/if}
</svg>
<div class="lg">
	{#each [...temps, ...others] as p (p.id)}
		<span class:set={p.trace === 'set'} class:f={p.q !== 'T'} data-tip={provTip(p, refs)}><i></i>{p.label ?? p.trace ?? p.q} ({p.unit})</span>
	{/each}
</div>

<style>
	.pp { display: block; }
	.frame { fill: none; stroke: var(--grid); }
	.ax { stroke: var(--ink-3); }
	text { font-size: 9px; fill: var(--ink-3); font-family: var(--mono, monospace); }
	.u { fill: var(--ink-2); }
	.tr { fill: none; stroke: #e0703a; stroke-width: 1.5; }
	.tr.set { stroke-dasharray: 4 3; stroke: #d9a35c; }
	.tr.f { stroke: #6aa8d8; }
	.tr.tpl { opacity: 0.75; }
	.cur { stroke: var(--ink); stroke-width: 1; }
	.lg { display: flex; gap: 8px; flex-wrap: wrap; font-size: 10px; color: var(--ink-2); }
	.lg i { display: inline-block; width: 12px; height: 0; border-top: 2px solid #e0703a; margin-right: 3px; vertical-align: middle; }
	.lg .set i { border-top: 2px dashed #d9a35c; }
	.lg .f i { border-top-color: #6aa8d8; }
</style>
