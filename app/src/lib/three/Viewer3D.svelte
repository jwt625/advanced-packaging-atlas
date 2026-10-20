<script lang="ts">
	import { onMount } from 'svelte';
	import { Viewer, type Overlay, type Stats } from './viewer';
	import type { ViewState } from './build';
	import type { Item, Picked } from './model';
	import type { Callout, Dim, Family, Ref } from './types';
	import { dimRefs, doiUrl, fieldLabel, fieldUnit, fmtNum, STATUS_TIP } from './data';
	import { ui } from '../state.svelte';

	let {
		families,
		vs,
		labels,
		cellOn,
		cellArray,
		pipInset,
		refs,
		fixture,
		picked = $bindable(null),
		viewer = $bindable(null),
		stats = $bindable(null)
	}: {
		families: Family[];
		vs: ViewState;
		labels: boolean;
		cellOn: boolean;
		cellArray: string | null;
		pipInset: string | null;
		refs: Record<string, Ref>;
		fixture: boolean;
		picked?: Picked | null;
		viewer?: Viewer | null;
		stats?: Stats | null;
	} = $props();

	let host: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let ov = $state<Overlay | null>(null);
	let lastIds = '';

	let glError = $state('');
	onMount(() => {
		let v: Viewer;
		try {
			v = new Viewer(host, canvas);
		} catch (e) {
			glError = `WebGL unavailable: ${e instanceof Error ? e.message : String(e)}`;
			return;
		}
		v.onOverlay = (o) => (ov = o);
		v.onStats = (s) => (stats = s);
		v.onPick = (it, slot, x, y) => {
			picked = it ? { item: it, slot, x, y } : null;
			v.setState({ selected: it?.id ?? null });
		};
		viewer = v;
		(window as unknown as { __pkg3d?: Viewer }).__pkg3d = v;
		return () => {
			v.dispose();
			viewer = null;
			delete (window as unknown as { __pkg3d?: Viewer }).__pkg3d;
		};
	});

	$effect(() => {
		const v = viewer;
		if (!v) return;
		const fams = families;
		v.setFamilies(fams);
		const ids = fams.map((f) => f.id).join(',');
		if (ids !== lastIds) {
			lastIds = ids;
			picked = null;
			v.setState({ selected: null });
			v.preset('iso');
		}
	});

	$effect(() => {
		const v = viewer;
		if (!v) return;
		const s: ViewState = { illustrative: vs.illustrative, section: vs.section, axis: vs.axis, cut: vs.cut, explode: vs.explode, xray: [...vs.xray], selected: v.state.selected, routing: vs.routing, xrayCap: vs.xrayCap ? [...vs.xrayCap] : undefined };
		v.setState(s);
	});

	$effect(() => {
		const v = viewer;
		if (!v) return;
		v.labels = labels;
		v.cellOn = cellOn;
		v.cellArray = cellArray;
		v.pipInset = pipInset;
		v.requestRender();
	});

	$effect(() => {
		const v = viewer;
		void ui.theme;
		if (!v) return;
		queueMicrotask(() => v.setBackground(getComputedStyle(document.documentElement).getPropertyValue('--bg')));
	});

	// ---- click tooltip content ----
	interface Row { field: string; value: string; status: string; tip: string; refIds: string[]; note: string }
	const FIELDS: Record<string, string[]> = {
		part: ['w_mm', 'd_mm', 'h_um', 'x_mm', 'y_mm', 'z_um'],
		layer: ['h_um', 'z_um', 'line_um', 'space_um'],
		array: ['pitch_um', 'diameter_um', 'height_um', 'region', 'pad_um', 'opening_um'],
		via: ['diameter_um', 'bottom_diameter_um', 'land_um', 'pitch_um', 'h_um', 'wall_um', 'liner_um', 'z_um'],
		net: ['share', 'length_um']
	};
	const ROUTE_FIELDS = ['line_um', 'space_um', 'fill'];
	function rowsOf(it: Item): Row[] {
		const src = it.src as unknown as Record<string, unknown>;
		const out = rowsFrom(src, FIELDS[it.type], it.dims);
		const route = src.route as { dims?: Record<string, Dim> } | undefined;
		if (it.type === 'layer' && route) for (const r of rowsFrom(route as Record<string, unknown>, ROUTE_FIELDS, route.dims ?? {})) out.push({ ...r, field: `route ${r.field}` });
		return out;
	}
	/** Routing summary line of a routed level / via / net (use, direction, endpoints). */
	function routeLine(it: Item): string {
		const src = it.src as unknown as Record<string, unknown>;
		if (it.type === 'layer' && src.route) {
			const r = src.route as Record<string, unknown>;
			return [`routed ${r.use ?? ''}`, r.dir ? `dir ${r.dir}` : '', r.matrix ? `in ${r.matrix}` : ''].filter(Boolean).join(' · ');
		}
		if (it.type === 'via') return [String(src.kind ?? ''), String(src.fill ?? 'filled'), src.through ? `through ${src.through}` : '', `${src.upper ?? 'face'} -> ${src.lower ?? 'face'}`].filter(Boolean).join(' · ');
		if (it.type === 'net') return [String(src.kind ?? ''), src.style ? String(src.style) : '', `${src.from ?? ''}${src.to ? ` -> ${src.to}` : ''}`, src.plane ? `plane ${src.plane}` : '', Array.isArray(src.jog) && src.jog.length ? `jog ${src.jog.join(', ')}` : '', Array.isArray(src.levels) && src.levels.length ? `levels ${src.levels.join(', ')}` : ''].filter(Boolean).join(' · ');
		return '';
	}
	function rowsFrom(src: Record<string, unknown>, fields: string[], dims: Record<string, Dim>): Row[] {
		const out: Row[] = [];
		for (const f of fields) {
			const raw = src[f];
			if (raw == null) continue;
			let value: string;
			if (f === 'region' && typeof raw === 'object') {
				const r = raw as { w_mm: number; d_mm: number };
				value = `${fmtNum(r.w_mm)} x ${fmtNum(r.d_mm)} mm`;
			} else if (typeof raw === 'number') value = `${fmtNum(raw)} ${fieldUnit(f)}`;
			else continue;
			const d = dims[f];
			const ids = dimRefs(d);
			const tip = [d ? STATUS_TIP[d.status] : 'no status (treated as template)', d?.formula ? `formula: ${d.formula}` : '', d?.note ?? ''].filter(Boolean).join('\n');
			out.push({ field: fieldLabel(f), value, status: d?.status ?? 'template', tip, refIds: ids, note: d?.note ?? '' });
		}
		return out;
	}
	function refLine(id: string): string {
		const r = refs[id];
		if (!r) return id;
		return [r.basis, r.locator, r.table && r.row_id ? `${r.row_id}.${r.field ?? ''}` : ''].filter(Boolean).join(' · ');
	}
	const pk = $derived(picked);
	const popPos = $derived.by(() => {
		if (!pk || !host) return { x: 0, y: 0 };
		const W = host.clientWidth, H = host.clientHeight;
		const w = 340;
		return { x: Math.max(4, Math.min(pk.x + 14, W - w - 4)), y: Math.max(4, Math.min(pk.y + 10, H - 260)) };
	});
	/** Callouts that target the item (by id or template id), with full text, note and refs. */
	function calloutsOf(it: Item): Callout[] {
		const f = families[pk?.slot ?? 0] ?? families[0];
		if (!f) return [];
		return (f.callouts ?? []).filter((c) => c.target === it.id || (it.tid && c.target === it.tid));
	}
	function labelClick(e: MouseEvent, slot: number, id: string) {
		const r = host.getBoundingClientRect();
		viewer?.pickId(slot, id, e.clientX - r.left, e.clientY - r.top);
	}
	const cellA = $derived(ov?.cell?.arr ?? null);
	function cellDim(f: 'pitch_um' | 'diameter_um' | 'height_um'): string {
		if (!cellA) return '';
		const v = cellA.arr[f];
		return `${fmtNum(v)} µm`;
	}
</script>

<div class="v3" bind:this={host}>
	<canvas bind:this={canvas}></canvas>
	{#if glError}<div class="glerr">{glError}</div>{/if}
	{#if ov}
		<svg class="ov" aria-hidden="true">
			{#each ov.slots as s, si (si)}
				{#each s.labels as l, li (li)}
					<line x1={l.ax} y1={l.ay} x2={l.lx < l.ax ? l.lx + l.w : l.lx} y2={l.ly + 8} class:tpl={l.template} />
					<circle cx={l.ax} cy={l.ay} r="2" />
				{/each}
				{#if s.ruler}
					<line class="rl" x1={s.ruler.pts[0][0]} y1={s.ruler.pts[0][1]} x2={s.ruler.pts[1][0]} y2={s.ruler.pts[1][1]} />
					{#each s.ruler.ticks as t, ti (ti)}
						<line class="rl" x1={t.x - 4} y1={t.y} x2={t.x} y2={t.y} />
					{/each}
				{/if}
				{#if ov.slots.length > 1 && s.rect.x > 0}
					<line class="sep" x1={s.rect.x - 0.5} y1={s.rect.y} x2={s.rect.x - 0.5} y2={s.rect.y + s.rect.h} />
				{/if}
				{#if ov.slots.length > 1 && s.rect.y > 0}
					<line class="sep" x1={s.rect.x} y1={s.rect.y - 0.5} x2={s.rect.x + s.rect.w} y2={s.rect.y - 0.5} />
				{/if}
			{/each}
		</svg>
		{#each ov.slots as s, si (si)}
			{#if ov.slots.length > 1}
				<div class="slotname" style:left="{s.rect.x + 6}px" style:top="{s.rect.y + 4}px">{s.name}</div>
			{/if}
			{#each s.labels as l, li (li)}
				<button class="lab" class:tpl={l.template} style:left="{l.lx}px" style:top="{l.ly}px" data-tip={l.full + (l.template ? '\n(geometry partly or fully template; click for values and references)' : '\n(click for values and references)')} onclick={(e) => labelClick(e, si, l.id)}>{l.text}</button>
			{/each}
			{#if s.scale}
				<div class="scale num" style:left="{s.rect.x + 6}px" style:top="{s.rect.y + s.rect.h - 20}px" data-tip="Lateral scale bar at the orbit target depth (true units{ov.slots.length > 1 ? '; each pane has its own scale when families are fitted' : ''})">
					<div class="bar" style:width="{s.scale.px}px"></div>
					<span>{s.scale.label}</span>
				</div>
			{/if}
			{#if s.ruler}
				{#each s.ruler.ticks as t, ti (ti)}
					<div class="tick num" style:left="{t.x - 6}px" style:top="{t.y - 7}px">{t.label}</div>
				{/each}
				{#if s.ruler.ticks.length}
					{@const top = s.ruler.ticks[s.ruler.ticks.length - 1]}
					<div class="tick unit" style:left="{top.x - 6}px" style:top="{top.y - 20}px" data-tip="True z above the package bottom, µm (ticks at layer boundaries; dense ones hidden)">z µm</div>
				{/if}
			{/if}
		{/each}
		{#if ov.cell}
			{@const c = ov.cell}
			<div class="cellbox" style:left="{c.rect.x}px" style:top="{c.rect.y}px" style:width="{c.rect.w}px" style:height="{c.rect.h}px">
				<div class="cellhd" data-tip="Unit cell at true scale (3 x 3 neighbourhood; center cell outlined). Values from the array row.">{c.arr.item.name}</div>
				<div class="celldims num">
					<span data-tip={STATUS_TIP[c.arr.item.dims.pitch_um?.status ?? 'template']}>p {cellDim('pitch_um')}</span>
					<span data-tip={STATUS_TIP[c.arr.item.dims.diameter_um?.status ?? 'template']}>d {cellDim('diameter_um')}</span>
					<span data-tip={STATUS_TIP[c.arr.item.dims.height_um?.status ?? 'template']}>h {cellDim('height_um')}</span>
				</div>
			</div>
		{/if}
		{#if ov.pip}
			{@const p = ov.pip}
			<div class="pipbox" style:left="{p.rect.x}px" style:top="{p.rect.y}px" style:width="{p.rect.w}px" style:height="{p.rect.h}px">
				<div class="cellhd" data-tip="In-scale inset: front view of the inset region at the section plane">{p.label}</div>
			</div>
		{/if}
	{/if}
	<div class="badges">
		{#if fixture}
			<span class="badge warn" data-tip="package3d.json not found: an invented fixture family is shown. Every dimension is template.">FIXTURE</span>
		{:else if families.some((f) => f.fixture)}
			<span class="badge warn" data-tip="Development fixture family (?fixture=routing): hand-written routing; numbers marked fixture are not from the database.">FIXTURE</span>
		{/if}
		{#if vs.illustrative}
			<span class="badge" data-tip="Illustrative scale: lateral (x, y) true; z mapped piecewise so every layer is visible. The ruler shows true z.">z not to scale</span>
		{:else}
			<span class="badge dim" data-tip="All axes at true scale">true scale</span>
		{/if}
	</div>
	<div class="legend" data-tip="Provenance of each solid's box dimensions (w, d, h):\nfull colour + solid edges = all reported or derived from database rows\nfull colour + dashed edges = some dimensions template\ngrey + dashed edges = all template (not reported; illustrative); faint hatch when zoomed in\nSection caps (cut faces) use the same colours.">
		<span class="sw solid"></span>reported <span class="sw mixed"></span>partly template <span class="sw tplsw"></span>template
	</div>
	{#if pk}
		{@const it = pk.item}
		<div class="pop" style:left="{popPos.x}px" style:top="{popPos.y}px">
			<div class="pophd">
				<b>{it.name}</b>
				<span class="muted">{it.type === 'array' ? it.kind : `${it.kind} · ${it.label}`}</span>
				<div class="grow"></div>
				<button class="x" aria-label="Frame selection" data-tip="Frame selection" onclick={() => viewer?.frameItem(it.id)}>
					<svg viewBox="0 0 12 12" width="11" height="11"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" fill="none" stroke="currentColor" stroke-width="1.3" /></svg>
				</button>
				<button class="x" aria-label="Close" onclick={() => { picked = null; viewer?.setState({ selected: null }); }}>
					<svg viewBox="0 0 12 12" width="10" height="10"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.4" /></svg>
				</button>
			</div>
			{#if routeLine(it)}<div class="co mono small">{routeLine(it)}</div>{/if}
			{#if it.routeNote}<div class="co muted" data-tip="Routing is synthesized by the viewer from the routing specs; only the listed dimensions carry provenance">mock-up layout: {it.routeNote}</div>{/if}
			{#if it.lod}<div class="co muted">{it.lod}</div>{/if}
			{#each calloutsOf(it) as c, ci (ci)}
				<div class="co">
					<div>{c.text}</div>
					{#if c.note}<div class="muted">{c.note}</div>{/if}
					{#each c.refs ?? [] as id (id)}
						{@const u = doiUrl(refs[id])}
						<div class="ref">
							{#if u}<a href={u} target="_blank" rel="noopener" data-tip="{id}: {refs[id]?.title ?? ''}">{refs[id]?.paper_id ?? id}</a>{:else}<span>{refs[id]?.paper_id ?? id}</span>{/if}
							<span class="muted" data-tip={refLine(id)}>{refLine(id)}</span>
						</div>
					{/each}
				</div>
			{/each}
			{#each rowsOf(it) as r (r.field)}
				<div class="row">
					<span class="f">{r.field}</span>
					<span class="v num">{r.value}</span>
					<span class="st {r.status}" data-tip={r.tip}>{r.status}</span>
				</div>
				{#if r.refIds.length}
					{#each r.refIds as id (id)}
						{@const u = doiUrl(refs[id])}
						<div class="ref">
							{#if u}<a href={u} target="_blank" rel="noopener" data-tip="{id}: {refs[id]?.title ?? ''}">{refs[id]?.paper_id ?? id}</a>{:else}<span>{refs[id]?.paper_id ?? id}</span>{/if}
							<span class="muted" data-tip={refLine(id)}>{refLine(id)}</span>
						</div>
					{/each}
				{:else if r.status === 'template'}
					<div class="ref muted" data-tip={r.note}>not reported; illustrative{r.note ? ` (${r.note})` : ''}</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.glerr { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--crit); }
	.v3 { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--bg); }
	canvas { display: block; width: 100%; height: 100%; touch-action: none; outline: none; }
	.ov { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
	.ov line { stroke: var(--ink-2); stroke-width: 1; }
	.ov line.tpl { stroke-dasharray: 3 2; }
	.ov line.rl { stroke: var(--ink-3); }
	.ov line.sep { stroke: var(--line); }
	.ov circle { fill: var(--ink); }
	.lab { position: absolute; height: 16px; padding: 0 4px; font: inherit; font-size: 10.5px; line-height: 14px; color: var(--ink); background: color-mix(in srgb, var(--surface) 88%, transparent); border: 1px solid var(--line); border-radius: 0; white-space: nowrap; cursor: pointer; }
	.lab:hover { border-color: var(--accent); }
	.lab.tpl { border-style: dashed; color: var(--ink-2); }
	.tick { position: absolute; transform: translateX(-100%); font-size: 9.5px; color: var(--ink-3); pointer-events: none; white-space: nowrap; }
	.tick.unit { pointer-events: auto; color: var(--ink-2); }
	.slotname { position: absolute; font-weight: 600; font-size: 11px; color: var(--ink); pointer-events: none; }
	.scale { position: absolute; padding: 1px 4px; background: color-mix(in srgb, var(--bg) 80%, transparent); display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--ink-2); }
	.scale .bar { height: 4px; border: 1px solid var(--ink-2); border-top: none; }
	.badges { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; }
	.badge { padding: 1px 6px; font-size: 10px; border: 1px solid var(--warn); color: var(--warn); background: var(--surface); }
	.badge.warn { border-color: var(--crit); color: var(--crit); font-weight: 600; }
	.badge.dim { border-color: var(--line); color: var(--ink-3); }
	.legend { position: absolute; right: 6px; bottom: 4px; padding: 1px 4px; background: color-mix(in srgb, var(--bg) 80%, transparent); display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--ink-3); }
	.sw { display: inline-block; width: 10px; height: 8px; border: 1px solid var(--ink-3); margin-left: 4px; }
	.sw.solid { background: #66758c; border-color: #0a0a0a; }
	.sw.mixed { background: #66758c; border-style: dashed; }
	.sw.tplsw { background: #6f7276; border-style: dashed; }
	.cellbox, .pipbox { position: absolute; border: 1px solid var(--line); pointer-events: none; }
	.cellhd { position: absolute; top: 0; left: 0; padding: 1px 4px; font-size: 10px; color: var(--ink-2); background: var(--surface); pointer-events: auto; }
	.celldims { position: absolute; bottom: 0; left: 0; right: 0; display: flex; gap: 6px; justify-content: space-between; padding: 1px 4px; font-size: 10px; color: var(--ink-2); background: color-mix(in srgb, var(--surface) 85%, transparent); pointer-events: auto; }
	.pop { position: absolute; width: 340px; max-height: 70%; overflow-y: auto; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); padding: 4px 6px 6px; font-size: 11px; z-index: 5; }
	.pophd { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
	.pophd .muted { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.grow { flex: 1; }
	.x { width: 20px; height: 20px; padding: 0; display: inline-flex; align-items: center; justify-content: center; background: transparent; border-color: transparent; flex: none; }
	.co { border-top: 1px solid var(--grid); padding: 2px 0; }
	.co.small { font-size: 10px; color: var(--ink-2); }
	.co .ref { padding-left: 0; }
	.row { display: grid; grid-template-columns: 72px 1fr auto; gap: 6px; align-items: center; border-top: 1px solid var(--grid); padding-top: 2px; margin-top: 2px; }
	.f { color: var(--ink-3); }
	.st { font-size: 10px; padding: 0 4px; border: 1px solid var(--line); }
	.st.reported { color: var(--good); border-color: var(--good); }
	.st.derived { color: var(--accent); border-color: var(--accent); }
	.st.template { color: var(--ink-3); border-style: dashed; }
	.ref { padding-left: 78px; font-size: 10px; display: flex; gap: 6px; overflow: hidden; white-space: nowrap; }
	.ref .muted { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
</style>
