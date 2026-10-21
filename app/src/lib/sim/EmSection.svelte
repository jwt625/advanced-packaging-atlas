<script lang="ts">
	// EM 2D cross-section view (SPEC 9 em2d.section): box with boundary conditions, dielectrics, conductors (rect, poly,
	// circle, half annulus) on a Canvas 2D; fit to the box or to the conductors; wheel zoom, drag pan; hover names the
	// shape, material and status. Units um.
	import { onMount } from 'svelte';
	import { ui } from '../state.svelte';
	import { CLASS_COLOR } from '../three/materials';
	import { downloadDataUrl } from './exportUtil';

	/* eslint-disable @typescript-eslint/no-explicit-any */
	let { section, variant = '' }: { section: Record<string, any>; variant?: string } = $props();
	let wrap: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let W = $state(400), H = $state(300);
	let fit = $state<'box' | 'conductors'>('conductors');
	let view = $state<{ cx: number; cy: number; s: number } | null>(null);
	let hover = $state<{ x: number; y: number; lines: string[] } | null>(null);

	type Shape = { name: string; kind: 'dielectric' | 'conductor'; role?: string; material: string; path: [number, number][]; status?: string; ref?: string };
	function circle(c: number[], r: number, n = 48, a0 = 0, a1 = 2 * Math.PI): [number, number][] {
		return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as [number, number]; });
	}
	function pathOf(s: Record<string, any>): [number, number][] {
		if (s.rect_um) { const { x, y } = s.rect_um; return [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]]; }
		if (s.poly_um) return s.poly_um as [number, number][];
		if (s.circle_um) return circle(s.circle_um.c, s.circle_um.r, Math.max(24, s.circle_um.n ?? 24));
		if (s.half_annulus_um) {
			const { c, r_in, r_out, upper } = s.half_annulus_um;
			const [a0, a1] = upper === false ? [Math.PI, 2 * Math.PI] : [0, Math.PI];
			return [...circle(c, r_out, 32, a0, a1), ...circle(c, r_in, 32, a1, a0)];
		}
		return [];
	}
	const shapes = $derived.by((): Shape[] => [
		...((section.dielectrics ?? []) as any[]).map((d) => ({ name: d.name, kind: 'dielectric' as const, material: d.material, path: pathOf(d), status: d.status, ref: d.ref })),
		...((section.conductors ?? []) as any[]).map((c) => ({ name: c.name, kind: 'conductor' as const, role: c.role, material: String(c.conductor ?? `sigma ${c.sigma_S_m}`), path: pathOf(c), status: c.status, ref: c.ref }))
	]);
	const box = $derived(section.box ?? { x_um: [-1, 1], y_um: [-1, 1] });
	function extentOf(which: 'box' | 'conductors') {
		if (which === 'box') return { x0: box.x_um[0], x1: box.x_um[1], y0: box.y_um[0], y1: box.y_um[1] };
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
		for (const s of shapes) if (s.kind === 'conductor') for (const [x, y] of s.path) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
		if (!Number.isFinite(x0)) return extentOf('box');
		const px = (x1 - x0) * 0.25 + 2, py = (y1 - y0) * 0.6 + 2;
		return { x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py };
	}
	function fitView() {
		const e = extentOf(fit);
		const s = Math.min((W - 40) / (e.x1 - e.x0), (H - 30) / (e.y1 - e.y0));
		view = { cx: (e.x0 + e.x1) / 2, cy: (e.y0 + e.y1) / 2, s };
	}
	const toPx = (x: number, y: number): [number, number] => [W / 2 + (x - view!.cx) * view!.s, H / 2 - (y - view!.cy) * view!.s];
	const colorOf = (s: Shape) => (s.kind === 'conductor' ? CLASS_COLOR.copper : /air|vacuum/.test(s.material) ? 'transparent' : /oxide|sio2/.test(s.material) ? CLASS_COLOR.oxide : /glass/.test(s.material) ? CLASS_COLOR.glass : /si\b|silicon/.test(s.material) ? CLASS_COLOR.silicon : CLASS_COLOR.polymer);

	function draw() {
		if (!canvas || !view) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
		const ctx = canvas.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const cs = getComputedStyle(wrap);
		ctx.fillStyle = cs.getPropertyValue('--bg'); ctx.fillRect(0, 0, W, H);
		const [bx0, by0] = toPx(box.x_um[0], box.y_um[1]), [bx1, by1] = toPx(box.x_um[1], box.y_um[0]);
		ctx.strokeStyle = cs.getPropertyValue('--ink-3'); ctx.setLineDash([4, 3]); ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0); ctx.setLineDash([]);
		for (const s of shapes) {
			if (s.path.length < 3) continue;
			ctx.beginPath();
			s.path.forEach(([x, y], i) => { const [px, py] = toPx(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
			ctx.closePath();
			const c = colorOf(s);
			if (c !== 'transparent') { ctx.globalAlpha = s.kind === 'conductor' ? 1 : 0.55; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1; }
			ctx.strokeStyle = s.kind === 'conductor' && s.role === 'signal' ? cs.getPropertyValue('--accent') : cs.getPropertyValue('--line');
			ctx.lineWidth = s.kind === 'conductor' && s.role === 'signal' ? 2 : 1;
			if (s.status === 'template') ctx.setLineDash([4, 3]);
			ctx.stroke(); ctx.setLineDash([]);
		}
		ctx.fillStyle = cs.getPropertyValue('--ink-3'); ctx.font = '10px system-ui, sans-serif';
		const bc = box.bc ?? {};
		ctx.fillText(`bc: left ${bc.left ?? '-'}, right ${bc.right ?? '-'}, bottom ${bc.bottom ?? '-'}, top ${bc.top ?? '-'}${variant ? ` · variant ${variant}` : ''}`, 8, H - 8);
		// scale bar
		const target = 80 / view.s, mag = 10 ** Math.floor(Math.log10(target)), step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= target) ?? target;
		ctx.fillRect(W - 12 - step * view.s, H - 14, step * view.s, 2);
		ctx.textAlign = 'right'; ctx.fillText(`${step} µm`, W - 12, H - 18); ctx.textAlign = 'left';
	}
	function inside(p: [number, number][], x: number, y: number) {
		let c = false;
		for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (p[i][1] > y !== p[j][1] > y && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
		return c;
	}
	let drag: { x: number; y: number } | null = null;
	function onMove(e: PointerEvent) {
		if (!view) return;
		const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
		if (drag) { view = { ...view, cx: view.cx - (mx - drag.x) / view.s, cy: view.cy + (my - drag.y) / view.s }; drag = { x: mx, y: my }; return; }
		const x = view.cx + (mx - W / 2) / view.s, y = view.cy - (my - H / 2) / view.s;
		const hit = [...shapes].reverse().find((s) => s.path.length > 2 && inside(s.path, x, y));
		hover = { x: mx, y: my, lines: [`x ${x.toFixed(2)} µm, y ${y.toFixed(2)} µm`, ...(hit ? [`${hit.name} (${hit.kind}${hit.role ? `, ${hit.role}` : ''})`, hit.material, ...(hit.status ? [`status ${hit.status}`] : []), ...(hit.ref ? [String(hit.ref).slice(0, 120)] : [])] : [String(section.background ?? 'background')])] };
	}
	function onWheel(e: WheelEvent) {
		if (!view) return;
		e.preventDefault();
		const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
		const x = view.cx + (mx - W / 2) / view.s, y = view.cy - (my - H / 2) / view.s, k = Math.exp(-e.deltaY * 0.0015), s = view.s * k;
		view = { s, cx: x - (mx - W / 2) / s, cy: y + (my - H / 2) / s };
	}
	onMount(() => {
		const ro = new ResizeObserver(() => { W = wrap.clientWidth; H = wrap.clientHeight - 26; fitView(); });
		ro.observe(wrap);
		W = wrap.clientWidth; H = wrap.clientHeight - 26;
		fitView();
		return () => ro.disconnect();
	});
	$effect(() => { void [section, fit]; if (W) fitView(); });
	$effect(() => { void [view, W, H, ui.theme, shapes]; draw(); });
</script>

<div class="es" bind:this={wrap}>
	<div class="bar">
		<button class:on={fit === 'conductors'} onclick={() => (fit = 'conductors')} data-tip="Fit the conductors">conductors</button>
		<button class:on={fit === 'box'} onclick={() => (fit = 'box')} data-tip="Fit the whole solution box (dashed)">box</button>
		<span class="muted small">wheel zoom, drag pan; signal conductors outlined in accent, template dims dashed</span>
		<span class="grow"></span>
		<button onclick={() => downloadDataUrl('em2d-section.png', canvas.toDataURL('image/png'))} data-tip="Download PNG">PNG</button>
	</div>
	<canvas bind:this={canvas} style:width="{W}px" style:height="{H}px" onpointermove={onMove} onpointerdown={(e) => { const r = canvas.getBoundingClientRect(); drag = { x: e.clientX - r.left, y: e.clientY - r.top }; }} onpointerup={() => (drag = null)} onpointerleave={() => { drag = null; hover = null; }} onwheel={onWheel} aria-label="EM cross-section"></canvas>
	{#if hover}<div class="tip" style:left="{Math.min(hover.x + 12, W - 240)}px" style:top="{hover.y + 34}px">{#each hover.lines as l}<div>{l}</div>{/each}</div>{/if}
</div>

<style>
	.es { position: relative; height: 100%; min-height: 0; background: var(--bg); overflow: hidden; }
	.bar { display: flex; align-items: center; gap: 4px 8px; height: 26px; padding: 0 4px; background: var(--surface); border-bottom: 1px solid var(--border); }
	.bar button { height: 20px; padding: 0 6px; border-radius: 0; font-size: 11px; }
	.grow { flex: 1; }
	.small { font-size: 11px; }
	canvas { display: block; touch-action: none; }
	.tip { position: absolute; pointer-events: none; background: var(--surface); border: 1px solid var(--line); padding: 4px 6px; font-size: 11px; white-space: nowrap; border-radius: 0; z-index: 2; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
</style>
