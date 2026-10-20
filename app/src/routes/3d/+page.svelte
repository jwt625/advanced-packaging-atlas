<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Viewer3D from '../../lib/three/Viewer3D.svelte';
	import { doiUrl, familyRefs, fmtNum, loadPackage3d, type Loaded } from '../../lib/three/data';
	import { materialClass, CLASS_COLOR } from '../../lib/three/materials';
	import { renderThumbnails, type Preset, type Stats, type Viewer } from '../../lib/three/viewer';
	import { XRAY_ALL, type ViewState } from '../../lib/three/build';
	import { defaultCut, defaultXray, largestDie, type Picked } from '../../lib/three/model';
	import type { Family } from '../../lib/three/types';
	import { ui } from '../../lib/state.svelte';
	import { goto } from '$app/navigation';
	import type { Inset } from '../../lib/three/types';

	type Mode = 'single' | 'compare' | 'gallery';
	const COMPARE_DEFAULT = ['cowos_s', 'cowos_l', 'emib', 'emib_t'];

	let loaded = $state<Loaded | null>(null);
	let mode = $state<Mode>('single');
	let famId = $state('');
	let cmp = $state<string[]>([]);
	let illustrative = $state(true);
	let section = $state(true);
	let axis = $state<'x' | 'y'>('y');
	let cut = $state(0);
	let explode = $state(0);
	/** toolbar X-ray: every object translucent; off = the per-material set (data defaults + inspector chips) */
	let xrayAll = $state(false);
	let xraySet = $state<string[]>([]);
	/** data-default x-ray tokens and the ones the user has toggled (their cut caps follow the x-ray) */
	let xrayDefaults = $state<string[]>([]);
	let xrayTouched = $state<string[]>([]);
	let labels = $state(true);
	let routing = $state(true);
	let cellOn = $state(false);
	let cellArray = $state<string | null>(null);
	let pipInset = $state<string | null>(null);
	let picked = $state<Picked | null>(null);
	let viewer = $state<Viewer | null>(null);
	let stats = $state<Stats | null>(null);
	let fitEach = $state(true);
	let thumbs = $state<Record<string, string>>({});
	let thumbBusy = false;

	const fams = $derived(loaded?.data.families ?? []);
	const byId = $derived(new Map(fams.map((f) => [f.id, f])));
	const fam = $derived(byId.get(famId) ?? fams[0] ?? null);
	const shown = $derived.by<Family[]>(() => {
		if (mode === 'compare') {
			const l = cmp.map((id) => byId.get(id)).filter((f): f is Family => !!f);
			return l.length ? l : fams.slice(0, 2);
		}
		return fam ? [fam] : [];
	});
	const single = $derived(shown.length === 1);

	const XRAY_FIRST = ['mold', 'underfill', 'lid', 'tim'];
	const classes = $derived.by(() => {
		const s = new Set<string>();
		for (const f of shown) {
			for (const p of f.parts) s.add(materialClass(p.material, p.kind));
			for (const l of f.layers ?? []) s.add(materialClass(l.material, '', l.role ?? ''));
		}
		return [...s].sort((a, b) => {
			const ia = XRAY_FIRST.indexOf(a), ib = XRAY_FIRST.indexOf(b);
			return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
		});
	});
	const halfDepth = $derived.by(() => {
		let m = 1;
		for (const f of shown) {
			let a0 = Infinity, a1 = -Infinity;
			for (const p of f.parts) {
				const c = axis === 'y' ? p.y_mm : p.x_mm, e = axis === 'y' ? p.d_mm : p.w_mm;
				a0 = Math.min(a0, c - e / 2); a1 = Math.max(a1, c + e / 2);
			}
			if (Number.isFinite(a0)) m = Math.max(m, (a1 - a0) / 2);
		}
		return m;
	});
	const arrays = $derived(single && fam ? (fam.arrays ?? []) : []);
	const insets = $derived(single && fam ? (fam.insets ?? []) : []);

	const vs = $derived<ViewState>({
		illustrative, section, axis, cut, explode, xray: xrayAll ? [XRAY_ALL] : xraySet, selected: null, routing,
		// cut faces stay opaque for parts translucent only by the data default; the user's X-ray choices make them translucent
		xrayCap: xrayAll ? [XRAY_ALL] : xraySet.filter((x) => !xrayDefaults.includes(x) || xrayTouched.includes(x))
	});
	const hasRouting = $derived(shown.some((f) => !!f.routing || (f.layers ?? []).some((l) => !!l.route)));

	// Reset per-family defaults when the families on screen change.
	let lastShown = '';
	$effect(() => {
		const key = shown.map((f) => f.id).join(',');
		if (key === lastShown) return;
		lastShown = key;
		// X-ray defaults come from the data (xray_default parts); compare: cut offset 0 from each family's default.
		xraySet = defaultXray(shown);
		xrayDefaults = [...xraySet];
		xrayTouched = [];
		xrayAll = false;
		cut = shown.length > 1 ? 0 : defaultCut(shown[0]);
		axis = 'y';
		explode = 0;
		pipInset = null;
		picked = null;
		const a = shown[0]?.arrays ?? [];
		cellArray = (a.find((x) => ['microbump', 'cu_pillar', 'hybrid_bond'].includes(x.kind)) ?? a[0])?.id ?? null;
	});

	// Automation hook for headless scripts (render checks, scorer): small and stable.
	onMount(() => {
		const w = window as unknown as { __apa3d?: unknown };
		const frames = (n: number) => new Promise<void>((r) => { const f = (k: number) => (k <= 0 ? r() : requestAnimationFrame(() => f(k - 1))); f(n); });
		w.__apa3d = {
			stats: () => viewer?.stats ?? null,
			preset: (name: Preset) => viewer?.preset(name),
			// inset(id): in-scale, like the inspector button; keepScale: frame in the current scale mode (after the state
			// change has reached the viewer, so the illustrative z map is the one used for framing)
			inset: async (id: string, keepScale = false) => {
				const ins = insets.find((i) => i.id === id);
				if (!ins) return false;
				if (!keepScale) illustrative = false;
				insetCut(ins);
				await tick();
				await frames(2);
				viewer?.frameInset(ins);
				await frames(2);
				return true;
			},
			setSection: async (a: 'x' | 'y', c: number) => { section = true; axis = a; cut = c; await tick(); await frames(2); },
			setIllustrative: async (on: boolean) => { illustrative = on; if (on) pipInset = null; await tick(); await frames(2); },
			ready: async () => {
				while (!loaded || !viewer || !shown.length) await frames(2);
				await frames(3);
				return true;
			}
		};
		return () => { delete w.__apa3d; };
	});

	onMount(() => {
		loadPackage3d().then((l) => {
			loaded = l;
			const h = new URLSearchParams(location.hash.slice(1));
			const f = h.get('f');
			const hasF = !!f && l.data.families.some((x) => x.id === f);
			famId = hasF ? f! : l.data.families[0]?.id ?? '';
			const def = COMPARE_DEFAULT.filter((id) => l.data.families.some((x) => x.id === id));
			cmp = def.length >= 2 ? def : l.data.families.slice(0, Math.min(3, l.data.families.length)).map((x) => x.id);
			// default landing: compare (two CoWoS, two EMIB); a #f=<family> link opens that family in single view
			if (!hasF) mode = 'compare';
		});
	});

	$effect(() => {
		if (!famId || mode !== 'single') return;
		const want = `#f=${encodeURIComponent(famId)}`;
		if (location.hash !== want) {
			try {
				void goto(location.pathname + location.search + want, { replace: true, shallow: true, reset: false });
			} catch {
				/* router not ready */
			}
		}
	});

	$effect(() => {
		if (mode !== 'gallery' || !fams.length || thumbBusy) return;
		const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg');
		const key = `${ui.theme}:`;
		const missing = fams.filter((f) => !thumbs[key + f.id]);
		if (!missing.length) return;
		thumbBusy = true;
		renderThumbnails(missing, 480, 270, bg).then((m) => {
			const next = { ...thumbs };
			for (const [id, u] of m) next[key + id] = u;
			thumbs = next;
			thumbBusy = false;
		});
	});

	function toggleCmp(id: string) {
		if (cmp.includes(id)) { if (cmp.length > 1) cmp = cmp.filter((x) => x !== id); }
		else if (cmp.length < 4) cmp = [...cmp, id];
	}
	/** Part ids (as '#id') of a material class in the families on screen. */
	function idsOfClass(c: string): string[] {
		return shown.flatMap((f) => f.parts.filter((p) => materialClass(p.material, p.kind) === c).map((p) => `#${p.id}`));
	}
	function xrayHas(c: string): boolean {
		if (xraySet.includes(c)) return true;
		const ids = idsOfClass(c);
		return ids.some((i) => xraySet.includes(i));
	}
	function toggleX(c: string) {
		xrayTouched = [...new Set([...xrayTouched, c, ...idsOfClass(c)])];
		if (xrayAll) {
			// leaving "all": keep every class translucent except the one clicked
			xrayAll = false;
			xraySet = classes.filter((x) => x !== c);
			return;
		}
		if (xrayHas(c)) {
			const ids = new Set(idsOfClass(c));
			xraySet = xraySet.filter((x) => x !== c && !ids.has(x));
		} else xraySet = [...xraySet, c];
	}
	$effect(() => {
		const v = viewer;
		if (v && v.fitEach !== fitEach) v.setFitEach(fitEach);
	});
	function cam(p: Preset) {
		viewer?.preset(p);
	}
	function zoomDie() {
		if (fam) viewer?.frameItem(largestDie(fam)?.id ?? null);
	}
	function zoomBumps() {
		const id = cellArray ?? arrays[0]?.id;
		if (!id) return;
		illustrative = false;
		explode = 0;
		setTimeout(() => viewer?.frameArray(id), 0);
	}
	function insetCut(ins: Inset) {
		const sc = viewer?.insetSection(ins);
		if (!sc) return;
		section = true;
		axis = sc.axis;
		cut = sc.cut;
		explode = 0;
	}
	function showInset(ins: Inset) {
		pipInset = pipInset === ins.id ? null : ins.id;
		if (pipInset) { insetCut(ins); illustrative = false; }
	}
	function goInset(ins: Inset) {
		// Insets are defined in true units: frame them in-scale so the region keeps its real proportions.
		illustrative = false;
		insetCut(ins);
		// The state change reaches the viewer in an effect; frame after it has been applied.
		setTimeout(() => viewer?.frameInset(ins), 0);
	}
	function openFamily(id: string) {
		famId = id;
		mode = 'single';
	}
	const pct = (v: number | undefined) => `${Math.round((v ?? 0) * 100)}%`;
	function shareTip(f: Family): string {
		const c = f.completeness ?? { reported: 0, derived: 0, template: 1 };
		return `Completeness of the model geometry (share of dimensions):\nreported ${pct(c.reported)} · derived ${pct(c.derived)} · template ${pct(c.template)}`;
	}
	const kfmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));
</script>

<svelte:head><title>3D · Advanced Packaging Atlas</title></svelte:head>

{#snippet meter(f: Family)}
	{@const c = f.completeness ?? { reported: 0, derived: 0, template: 1 }}
	<div class="meter" data-tip={shareTip(f)}>
		<span class="m-r" style:width={pct(c.reported)}></span><span class="m-d" style:width={pct(c.derived)}></span><span class="m-t" style:width={pct(c.template)}></span>
	</div>
{/snippet}

<div class="page">
	<div class="bar">
		<div class="seg">
			{#each [['single', 'Single'], ['compare', 'Compare'], ['gallery', 'Gallery']] as [m, l] (m)}
				<button class:on={mode === m} onclick={() => (mode = m as Mode)}>{l}</button>
			{/each}
		</div>
		{#if mode === 'single'}
			<select bind:value={famId} aria-label="Packaging family" data-tip="Packaging family (one illustration per family)">
				{#each fams as f (f.id)}<option value={f.id}>{f.name} · {f.company}</option>{/each}
			</select>
		{:else if mode === 'compare'}
			<div class="chips" data-tip="Families to compare (2-4), same lateral scale, synchronized camera and section">
				{#each fams as f (f.id)}
					<button class:on={cmp.includes(f.id)} onclick={() => toggleCmp(f.id)}>{f.name}</button>
				{/each}
			</div>
			<button class:on={fitEach} onclick={() => (fitEach = !fitEach)} data-tip={fitEach ? 'Each family fitted to its pane (own scale bar per pane). Click for one common lateral scale.' : 'One common lateral scale for all panes. Click to fit each family to its pane.'}>Fit each</button>
		{/if}
		{#if mode !== 'gallery'}
			<span class="sep"></span>
			<div class="seg">
				<button class:on={!illustrative} onclick={() => (illustrative = false)} data-tip="In-scale: true dimensions on all axes; use insets and zoom presets for the core regions">In-scale</button>
				<button class:on={illustrative} onclick={() => { illustrative = true; pipInset = null; }} data-tip="Illustrative: lateral true, z mapped so every layer is visible">Illustrative</button>
			</div>
			<span class="sep"></span>
			<button class:on={section} onclick={() => (section = !section)} data-tip="Section cutaway (plane normal to y; position in the inspector)">Section</button>
			<button class:on={explode > 0} onclick={() => (explode = explode > 0 ? 0 : 0.6)} data-tip="Exploded view by assembly group (slider in the inspector)">Explode</button>
			<button class:on={xrayAll} onclick={() => (xrayAll = !xrayAll)} data-tip="X-ray: every object translucent, section faces included (per-material choice in the inspector)">X-ray</button>
			<button class:on={cellOn && single} disabled={!single} onclick={() => (cellOn = !cellOn)} data-tip={single ? 'Interconnect unit cell inset at true scale' : 'Unit cell: single view only'}>Cell</button>
			<button class:on={labels} onclick={() => (labels = !labels)} data-tip="Leader-line callouts (only visible features; decluttered by zoom)">Labels</button>
			<button class:on={routing && hasRouting} disabled={!hasRouting} onclick={() => (routing = !routing)} data-tip={hasRouting ? 'Mock-up routing (traces, planes, vias, pads) synthesized inside a band at the section; outside it, routed levels are slabs tinted by their Cu fill. Click any routed feature for dims and provenance.' : 'No routing specs in the families on screen'}>Routing</button>
			<span class="sep"></span>
			<div class="seg">
				<button onclick={() => cam('iso')} data-tip="Isometric view">Iso</button>
				<button onclick={() => cam('front')} data-tip="Front view of the section">Front</button>
				<button onclick={() => cam('top')} data-tip="Top view">Top</button>
				<button onclick={() => cam('bottom')} data-tip="Bottom view">Bottom</button>
				<button disabled={!picked} onclick={() => viewer?.frameItem(picked?.item.id ?? null)} data-tip="Frame the selection (click geometry to select)">Frame</button>
			</div>
		{/if}
		<div class="grow"></div>
		{#if loaded?.error}<span class="err" data-tip={loaded.error}>package3d.json error</span>{/if}
	</div>

	{#if mode === 'gallery'}
		<div class="gallery">
			{#each fams as f (f.id)}
				<div class="tile">
					<button class="thumb" onclick={() => openFamily(f.id)} aria-label="Open {f.name}" data-tip="{f.name}: {f.summary ?? ''}\n{shareTip(f)}">
						{#if thumbs[`${ui.theme}:${f.id}`]}<img src={thumbs[`${ui.theme}:${f.id}`]} alt="" />{:else}<span class="spinner"></span>{/if}
					</button>
					<div class="tmeta">
						<div class="trow"><b>{f.name}</b><span class="muted">{f.company}</span></div>
						{#if f.package_class}<div class="muted small">{f.package_class}</div>{/if}
						{@render meter(f)}
						<div class="share num" data-tip={shareTip(f)}>reported {pct(f.completeness?.reported)} · derived {pct(f.completeness?.derived)} · template {pct(f.completeness?.template ?? 1)}</div>
						<div class="trow">
							<button onclick={() => openFamily(f.id)}>Open</button>
							<label class="cb" data-tip="Add to compare (2-4)"><input type="checkbox" checked={cmp.includes(f.id)} onchange={() => toggleCmp(f.id)} /> compare</label>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="body">
			<div class="view">
				<Viewer3D families={shown} {vs} {labels} cellOn={cellOn && single} {cellArray} {pipInset} refs={loaded?.data.refs ?? {}} fixture={loaded?.fixture ?? false} bind:picked bind:viewer bind:stats />
			</div>
			<aside class="insp">
				{#each shown as f (f.id)}
					<section class="fam">
						<div class="trow"><b>{f.name}</b><span class="muted">{f.company}</span></div>
						{#if f.package_class}<div class="muted small">{f.package_class}</div>{/if}
						{#if single && f.summary}<p class="summary">{f.summary}</p>{/if}
						{@render meter(f)}
					</section>
				{/each}

				<section>
					<h3>Section</h3>
					<div class="ctl">
						<input type="checkbox" bind:checked={section} aria-label="Section on" />
						<div class="seg" data-tip="Section plane normal: y (viewed from the front) or x (viewed from the right)">
							<button class:on={axis === 'y'} onclick={() => { axis = 'y'; cut = 0; }}>y</button>
							<button class:on={axis === 'x'} onclick={() => { axis = 'x'; cut = 0; }}>x</button>
						</div>
						<input type="range" min={-halfDepth} max={halfDepth} step={halfDepth / 500} bind:value={cut} disabled={!section} aria-label="Section plane position" />
						<span class="num val" data-tip="Section plane position from the package center">{fmtNum(cut)} mm</span>
					</div>
				</section>
				<section>
					<h3>Explode</h3>
					<div class="ctl">
						<input type="range" min="0" max="1" step="0.01" bind:value={explode} aria-label="Explode" />
						<span class="num val">{Math.round(explode * 100)}%</span>
					</div>
				</section>
				<section>
					<h3>X-ray <label class="all" data-tip="every object translucent (same as the toolbar X-ray button)"><input type="checkbox" bind:checked={xrayAll} aria-label="X-ray all objects" /> all</label></h3>
					<div class="chips wrap">
						{#each classes as c (c)}
							<button class="chip" class:on={xrayAll || xrayHas(c)} onclick={() => toggleX(c)} data-tip="Translucent: {c}{!xraySet.includes(c) && xrayHas(c) ? ' (default: only the parts flagged x-ray in the data)' : ''}">
								<span class="sw" style:background={CLASS_COLOR[c] ?? CLASS_COLOR.other}></span>{c}
							</button>
						{/each}
					</div>
				</section>
				{#if single && arrays.length}
					<section>
						<h3>Interconnect</h3>
						<div class="ctl">
							<input type="checkbox" bind:checked={cellOn} aria-label="Unit cell inset" data-tip="Unit cell inset" />
							<select bind:value={cellArray} aria-label="Interconnect array">
								{#each arrays as a (a.id)}<option value={a.id}>{a.name ?? a.id} · {fmtNum(a.pitch_um)} µm</option>{/each}
							</select>
						</div>
					</section>
				{/if}
				{#if single}
					<section>
						<h3>Zoom</h3>
						<div class="chips wrap">
							<button onclick={() => cam('iso')} data-tip="Whole package">Package</button>
							<button onclick={zoomDie} data-tip="Frame the largest die">Die</button>
							<button disabled={!arrays.length} onclick={zoomBumps} data-tip="In-scale view of the selected interconnect array at the section plane">Bumps</button>
						</div>
						{#if insets.length}
							<div class="insets">
								{#each insets as ins (ins.id)}
									<div class="ins">
										<button class:on={pipInset === ins.id} onclick={() => showInset(ins)} data-tip="Show as in-scale inset (switches to in-scale)">{ins.label}</button>
										<button class="ico" onclick={() => goInset(ins)} aria-label="Frame {ins.label}" data-tip="Move the main camera to this region">
											<svg viewBox="0 0 12 12" width="11" height="11"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" fill="none" stroke="currentColor" stroke-width="1.3" /></svg>
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}
				<section class="refs">
					<h3>References</h3>
					{#each shown as f (f.id)}
						{@const ids = familyRefs(f)}
						{#if shown.length > 1}<div class="muted small">{f.name}</div>{/if}
						{#if !ids.length}
							<div class="muted small">No references: every dimension is template{loaded?.fixture ? ' (fixture)' : ''}.</div>
						{/if}
						{#each ids as id (id)}
							{@const r = loaded?.data.refs[id]}
							{@const u = doiUrl(r)}
							<div class="ref" data-tip={[r?.title, r?.table && r?.row_id ? `${r.table}.${r.row_id}.${r.field ?? ''}` : '', r?.basis ? `basis: ${r.basis}` : ''].filter(Boolean).join('\n')}>
								<span class="rid mono">{id}</span>
								{#if u}<a href={u} target="_blank" rel="noopener">{r?.paper_id ?? r?.doi}</a>{:else}<span>{r?.paper_id ?? '?'}</span>{/if}
								<span class="muted">{r?.year ?? ''} {r?.locator ?? ''}</span>
							</div>
						{/each}
					{/each}
				</section>
				{#if stats}
					<div class="stats mono" data-tip="renderer.info for the last frame (all viewports): draw calls, triangles, instanced interconnects, geometries in GPU memory, CPU time of the frame">
						{stats.calls} calls · {kfmt(stats.triangles)} tris · {kfmt(stats.instances)} inst · {stats.geometries} geo · {stats.ms.toFixed(1)} ms{#if stats.routing.cyls || stats.routing.boxes}<br />routing {kfmt(stats.routing.cyls)} cyl · {kfmt(stats.routing.boxes)} box · band {fmtNum(stats.routing.depth)} mm{/if}
					</div>
				{/if}
			</aside>
		</div>
	{/if}
</div>

<style>
	.page { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 4px 8px; background: var(--surface); border-bottom: 1px solid var(--border); min-width: 0; }
	.bar button { height: 22px; font-size: 11px; padding: 0 7px; }
	.bar select { height: 22px; max-width: 260px; }
	.seg { display: inline-flex; }
	.seg button + button { border-left: none; }
	.chips { display: inline-flex; flex-wrap: wrap; gap: 3px; }
	.sep { width: 1px; height: 16px; background: var(--line); }
	.grow { flex: 1; }
	.err { color: var(--crit); font-size: 11px; }
	button:disabled { opacity: 0.45; cursor: default; }
	.body { display: grid; grid-template-columns: minmax(0, 1fr) 270px; min-height: 0; }
	.view { min-width: 0; min-height: 0; position: relative; }
	.insp { min-height: 0; overflow-y: auto; border-left: 1px solid var(--border); background: var(--surface); padding: 6px 8px 8px; display: flex; flex-direction: column; gap: 8px; }
	.insp section { display: flex; flex-direction: column; gap: 4px; }
	h3 { margin: 0; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); display: flex; align-items: center; gap: 6px; }
	.trow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
	.small { font-size: 10.5px; }
	.summary { margin: 0; color: var(--ink-2); font-size: 11px; }
	.meter { display: flex; height: 6px; width: 100%; background: var(--grid); }
	.meter span { display: block; height: 100%; }
	.m-r { background: var(--good); }
	.m-d { background: var(--accent); }
	.m-t { background: repeating-linear-gradient(135deg, #7d7d7a 0 2px, #4a4a48 2px 4px); }
	.ctl { display: flex; align-items: center; gap: 6px; }
	.ctl input[type='range'] { flex: 1; min-width: 0; accent-color: var(--accent); }
	.ctl select { flex: 1; min-width: 0; height: 22px; }
	.val { width: 64px; text-align: right; color: var(--ink-2); }
	.chip, .insp button { height: 22px; font-size: 11px; padding: 0 6px; display: inline-flex; align-items: center; gap: 4px; }
	.sw { display: inline-block; width: 9px; height: 9px; border: 1px solid var(--line); }
	.insets { display: flex; flex-direction: column; gap: 3px; }
	.ins { display: flex; gap: 2px; }
	.ins button:first-child { flex: 1; justify-content: flex-start; }
	.ico { width: 24px; justify-content: center; padding: 0; }
	.refs .ref { display: flex; gap: 6px; font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.rid { color: var(--ink-3); }
	.stats { margin-top: auto; font-size: 10px; color: var(--ink-3); border-top: 1px solid var(--grid); padding-top: 4px; }
	.share { font-size: 10px; color: var(--ink-3); }
	.gallery { overflow-y: auto; padding: 8px; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); gap: 8px; align-content: start; }
	.tile { background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; }
	.thumb { height: auto; aspect-ratio: 16 / 9; padding: 0; border: none; border-bottom: 1px solid var(--border); background: var(--bg); display: flex; align-items: center; justify-content: center; }
	.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.tmeta { padding: 6px; display: flex; flex-direction: column; gap: 4px; }
	.tmeta button { height: 22px; font-size: 11px; }
	.cb { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-2); font-size: 11px; }
	@media (max-width: 720px) {
		.page { overflow-y: auto; grid-template-rows: auto auto; }
		.body { grid-template-columns: minmax(0, 1fr); grid-template-rows: 58vh auto; }
		.insp { border-left: none; border-top: 1px solid var(--border); overflow: visible; }
		.bar select { max-width: 100%; flex: 1 1 200px; }
	}
</style>
