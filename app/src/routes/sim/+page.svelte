<script lang="ts">
	// Ported from eo-modulator-atlas app/src/routes/sim/+page.svelte at eb97f96 (GPL-3.0-or-later).
	// Local changes: packaging cases (sims/<family>/<case>.yaml, bundled by cases.ts) or a family-only session; case
	// picker, study picker, Compute / Cancel / Link; panels Model Builder | Settings | Graphics over the output panel.
	import { onDestroy, onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { link, staticUrl } from '../../lib/paths';
	import { loadPackage3d } from '../../lib/three/data';
	import { Workbench } from '../../lib/sim/workbench.svelte';
	import { readUrlState, writeUrlState } from '../../lib/sim/urlState';
	import { CASES, familyCaseText } from '../../lib/sim/cases';
	import { LINK_TEXT_MAX, packText, unpackText } from '../../lib/sim/linkText';
	import ModelTree from '../../lib/sim/ModelTree.svelte';
	import Settings from '../../lib/sim/Settings.svelte';
	import Graphics from '../../lib/sim/Graphics.svelte';
	import BottomPanel from '../../lib/sim/BottomPanel.svelte';
	import Splitter from '../../lib/sim/Splitter.svelte';

	const wb = new Workbench();
	const urlState = $derived(readUrlState(page.url.searchParams));
	const families = $derived(wb.p3d?.families ?? []);
	const DEFAULT_FAMILY = 'cowos_l';
	/** Selected session: `case:<id>` or `fam:<family>`. */
	const chosen = $derived.by(() => {
		const s = urlState;
		if (s.text) return 'text:';
		if (s.caseId) return `case:${s.caseId}`;
		if (s.family) return `fam:${s.family}`;
		// default: the first 3D package case (sims/em holds EM 2D cross-sections, U3), else the CoWoS-L family defaults
		const first = CASES.find((c) => c.family === DEFAULT_FAMILY) ?? CASES.find((c) => c.family !== 'em');
		if (first) return `case:${first.id}`;
		return `fam:${DEFAULT_FAMILY}`;
	});

	/** A case opened in memory (pick channel draft) that is neither the URL case nor the URL family session. */
	const inMemory = $derived(!!wb.caseId && !wb.fromFile && (chosen === 'text:' || wb.caseId !== `${chosen.slice(4)}/session`));
	const SIZE_KEY = 'ap-atlas-sim-panels';
	let treeW = $state(230);
	let setW = $state(430);
	let botH = $state(150);
	onMount(() => {
		try {
			const s = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null');
			if (s && [s.treeW, s.setW, s.botH].every(Number.isFinite)) ({ treeW, setW, botH } = s);
		} catch {
			/* storage unavailable */
		}
		if (import.meta.env.DEV || page.url.searchParams.get('debug') === '1') (window as unknown as Record<string, unknown>).__simWorkbench = wb;
		// DB target rows for browser target checks (L1 scripts/build_sim_targets.py); absent until generated
		// kept as a promise: compute() awaits it, so a Compute before it arrives still gets the DB rows (audit A3 M10)
		wb.simTargetsLoad = fetch(staticUrl('data/sim_targets.json'))
			.then(async (res) => {
				if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return;
				const d = (await res.json()) as unknown;
				const rows = (Array.isArray(d) ? d : ((d as Record<string, unknown>)?.rows ?? (d as Record<string, unknown>)?.targets ?? d)) as unknown;
				const map: Record<string, Record<string, unknown>> = {};
				if (Array.isArray(rows)) for (const r of rows as Record<string, unknown>[]) { if (r?.metric_id) map[String(r.metric_id)] = r; }
				else if (rows && typeof rows === 'object') Object.assign(map, rows);
				wb.simTargets = Object.keys(map).length ? map : null;
				if (wb.simTargets) wb.addLog(`sim_targets.json: ${Object.keys(map).length} DB target rows`);
			})
			.catch(() => {});
		loadPackage3d().then((r) => {
			wb.p3d = r.data;
			if (!r.fixture) wb.p3dUrl = new URL(staticUrl('data/package3d.json'), location.href).href;
			wb.p3dFixture = r.fixture;
			// no silent fallback (audit A3 M10): the built-in fixture is for display only; generator studies are refused
			if (r.fixture) {
				wb.p3dError = `package3d.json did not load${r.error ? ` (${r.error})` : ' (not found)'}: geometry shows the built-in fixture families; Compute of generator families is refused`;
				wb.addLog(wb.p3dError, 'error');
			}
		});
	});
	function saveSizes() {
		try {
			localStorage.setItem(SIZE_KEY, JSON.stringify({ treeW, setW, botH }));
		} catch {
			/* storage unavailable */
		}
	}
	const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
	onDestroy(() => wb.stopAll());

	// load the chosen case (family-only sessions wait for package3d.json for the family title)
	$effect(() => {
		const sel = chosen;
		const st = untrack(() => urlState);
		if (sel === 'text:' && st.text) {
			// in-memory case carried in the link (packed text)
			let live = true;
			unpackText(st.text)
				.then((text) => {
					if (!live) return;
					const id = /^id:\s*(.+)$/m.exec(text)?.[1]?.trim().replace(/^"|"$/g, '') ?? 'link/case';
					wb.load(id, text, false, st.overrides);
					wb.addLog(`Loaded in-memory case ${id} from the link (${text.length} characters)`);
					applyView(st);
				})
				.catch((e) => untrack(() => wb.addLog(`Link case text not readable: ${e instanceof Error ? e.message : e}`, 'error')));
			return () => (live = false);
		}
		if (sel.startsWith('case:')) {
			const c = CASES.find((x) => x.id === sel.slice(5));
			if (!c) {
				untrack(() => {
					wb.resetCaseState();
					wb.addLog(`Case ${sel.slice(5)} is not in this build`, 'error');
					wb.error = `Case ${sel.slice(5)} is not in this build (sims/<family>/<case>.yaml)`;
				});
				return;
			}
			let live = true;
			wb.loading = true;
			c.load()
				.then((text) => {
					if (!live) return;
					wb.loading = false;
					wb.load(c.id, text, true, st.overrides);
					wb.addLog(`Loaded case ${c.id}`);
					applyView(st);
				})
				.catch((e) => {
					if (!live) return;
					wb.loading = false;
					wb.error = String(e);
					wb.addLog(String(e), 'error');
				});
			return () => (live = false);
		}
		const fam = sel.slice(4);
		const f = families.find((x) => x.id === fam);
		if (!wb.p3d) return;
		untrack(() => {
			if (!f) {
				wb.resetCaseState();
				wb.error = `Family ${fam} is not in package3d.json`;
				wb.addLog(wb.error, 'error');
				return;
			}
			wb.load(`${fam}/session`, familyCaseText(fam, f.name), false, st.overrides);
			wb.addLog(`Family session ${fam} (no case file)`);
			applyView(st);
		});
	});
	function applyView(st: typeof urlState) {
		if (st.node) wb.node = st.node;
		if (st.view) wb.view = st.view;
		if (st.kz) wb.kz = st.kz;
		if (st.clip) {
			wb.clipOn = true;
			wb.clipAxis = st.clip.axis;
			wb.clipPos = st.clip.pos_mm;
		}
		if (st.study) wb.studyId = st.study;
	}

	// geometry follows family + params (generator or fixture); presets follow the family
	$effect(() => {
		void wb.geometryKey;
		void wb.family;
		untrack(() => void wb.regenerate());
	});
	$effect(() => {
		void wb.familyId;
		untrack(() => void wb.refreshPresets());
	});

	function switchTo(sel: string) {
		if (sel === 'mem:') return;
		const keep = new URLSearchParams();
		if (sel.startsWith('case:')) keep.set('case', sel.slice(5));
		else keep.set('fam', sel.slice(4));
		for (const k of ['pool', 'debug']) {
			const v = page.url.searchParams.get(k);
			if (v != null) keep.set(k, v);
		}
		void goto(link(`/sim?${keep.toString()}`));
	}

	async function copyLink() {
		// in-memory cases and free YAML edits travel as packed text when short enough
		const needText = inMemory || wb.hasFreeEdits;
		let packed: string | null = null;
		if (needText) {
			try {
				packed = await packText(wb.text);
			} catch {
				packed = null;
			}
			if (packed && packed.length > LINK_TEXT_MAX) {
				wb.addLog(`Link: the case text packs to ${packed.length} characters (> ${LINK_TEXT_MAX}); the link carries only case, overrides and view. Use Download YAML on the Model node to share the full text.`, 'warn');
				packed = null;
			}
		}
		const qs = writeUrlState({
			text: packed,
			caseId: packed ? null : wb.fromFile ? wb.caseId : null, family: packed ? null : wb.familyId || null, overrides: packed ? [] : wb.overrides, study: wb.study?.id ?? null, node: wb.node,
			view: wb.view, clip: wb.clipOn ? { axis: wb.clipAxis, pos_mm: Number(wb.clipPos.toPrecision(6)) } : null, kz: wb.kz, dscale: null
		});
		const url = `${location.origin}${link('/sim')}?${qs}`;
		if (needText && packed) wb.addLog(`Link carries the case text packed (${packed.length} characters).`);
		try {
			await navigator.clipboard.writeText(url);
			wb.addLog(`Link copied: ${url}`);
		} catch {
			wb.addLog(`Link (copy blocked by the browser): ${url}`, 'warn');
			wb.bottomTab = 'log';
		}
	}
</script>

<svelte:head><title>Simulation · Advanced Packaging Atlas</title></svelte:head>
<div class="sim-page" style:--tree-w="{treeW}px" style:--set-w="{setW}px" style:--bot-h="{botH}px" data-run={wb.run ? 1 : 0}>
	<div class="toolbar">
		<label data-tip="Case config (sims/<family>/<case>.yaml) or a family with its default parameters (no case file)">Case
			<select aria-label="Case" value={inMemory ? 'mem:' : chosen} onchange={(e) => switchTo(e.currentTarget.value)}>
				{#if inMemory}<option value="mem:">{wb.caseId} (in memory)</option>{/if}
				{#if CASES.length}<optgroup label="Cases">{#each CASES as c}<option value="case:{c.id}">{c.id}</option>{/each}</optgroup>{/if}
				<optgroup label="Family defaults">
					{#if !families.length}<option value={chosen}>{chosen.slice(4)}</option>{/if}
					{#each families as f}<option value="fam:{f.id}">{f.id} · {f.name}</option>{/each}
				</optgroup>
			</select>
		</label>
		<label data-tip="Study of the case (studies block)">Study
			<select aria-label="Study" value={wb.study?.id ?? ''} disabled={!wb.studies.length || !!wb.busy} onchange={(e) => (wb.studyId = e.currentTarget.value)}>
				{#if !wb.studies.length}<option value="">none</option>{/if}
				{#each wb.studies as s}<option value={s.id}>{s.id} · {s.type}</option>{/each}
			</select>
		</label>
		<div class="acts">
			<button class="on" onclick={() => wb.compute()} disabled={!wb.canRun} data-tip={wb.computeBlock ?? `Run ${wb.study?.id ?? 'the study'} in a worker`}>Compute</button>
			<button onclick={() => wb.cancel()} disabled={!wb.busy} data-tip="Stop the running solve (terminates the worker)">Cancel</button>
			<button onclick={copyLink} disabled={!wb.raw} data-tip="Copy a link with case, parameter overrides, study, node and view. Free YAML-tab edits are not encoded.">Link</button>
		</div>
		{#if wb.p3dError}<div class="p3d-err" role="alert">{wb.p3dError}</div>{/if}
	</div>
	<div class="busyline" class:on={!!wb.busy}></div>
	<div class="main">
		<div class="p p-tree"><ModelTree {wb} /></div>
		<Splitter dir="x" label="Resize model tree" onmove={(d) => { treeW = clamp(treeW + d, 150, 480); saveSizes(); }} />
		<div class="p p-set"><Settings {wb} /></div>
		<Splitter dir="x" label="Resize settings" onmove={(d) => { setW = clamp(setW + d, 260, 900); saveSizes(); }} />
		<div class="p p-gfx"><Graphics {wb} /></div>
	</div>
	<Splitter dir="y" label="Resize output panel" onmove={(d) => { botH = clamp(botH - d, 60, 600); saveSizes(); }} />
	<div class="p p-bot"><BottomPanel {wb} /></div>
</div>

<style>
	.sim-page { height: 100%; display: grid; grid-template-rows: auto 2px minmax(0, 1fr) 4px var(--bot-h); min-width: 0; background: var(--bg); }
	.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 3px 8px; background: var(--surface); border-bottom: 1px solid var(--border); min-width: 0; }
	.toolbar label { display: flex; align-items: center; gap: 4px; color: var(--ink-2); min-width: 0; }
	.toolbar select { max-width: 260px; border-radius: 0; }
	.acts { display: flex; gap: 4px; margin-left: auto; }
	.acts button { border-radius: 0; }
	.p3d-err { flex: 1 1 100%; color: var(--crit); border: 1px solid var(--crit); padding: 1px 6px; font-size: 11px; border-radius: 0; }
	button:disabled { opacity: 0.5; cursor: default; }
	.busyline { background: transparent; overflow: hidden; position: relative; }
	.busyline.on::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 30%; background: var(--accent); animation: slide 1.2s linear infinite; }
	@keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
	.main { display: grid; grid-template-columns: var(--tree-w) 4px var(--set-w) 4px minmax(0, 1fr); min-height: 0; min-width: 0; }
	.p { min-width: 0; min-height: 0; overflow: hidden; }
	@media (max-width: 760px) {
		.sim-page { display: block; overflow-y: auto; overflow-x: hidden; }
		.toolbar { gap: 4px 8px; }
		.toolbar select { max-width: 100%; width: 100%; }
		.toolbar label { flex: 1 1 100%; }
		.acts { margin-left: 0; width: 100%; }
		.acts button { flex: 1; }
		.main { display: flex; flex-direction: column; }
		.main > :global(.split), .sim-page > :global(.split) { display: none; }
		.p-gfx { order: -1; height: 340px; border-bottom: 1px solid var(--border); }
		.p-tree { height: 220px; border-bottom: 1px solid var(--border); }
		.p-set { height: auto; max-height: 70vh; display: flex; flex-direction: column; border-bottom: 1px solid var(--border); }
		.p-set > :global(.settings) { height: auto; max-height: 70vh; }
		.p-bot { height: 220px; }
	}
</style>
