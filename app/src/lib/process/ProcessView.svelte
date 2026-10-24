<script lang="ts">
	// Process mode of the 3D tab (DevLog-016): flow / route selection, playback, three linked scales, HUD.
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { ui } from '../state.svelte';
	import Controls from './Controls.svelte';
	import Hud from './Hud.svelte';
	import { defaultRoute, fmt, indexFlow, loadProcess3d, provTip, routeSteps, type FlowIndex, type LoadedProc } from './data';
	import { loadMaterials, materialSource } from './mat';
	import { opImpl } from './ops';
	import { liveZ } from './model';
	import { Evaluator, Player, stateKey } from './state';
	import { loadTools } from './tools/index';
	import { ProcessViewer, type Layout, type Overlay, type Pick, type ProcStats, type SecOpts, type ToolInfo } from './viewer';
	import type { Body, PDim, Profile, Ref, SceneState, ScaleId } from './types';

	let host = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let loaded = $state.raw<LoadedProc | null>(null);
	let flowId = $state('');
	let routeId = $state('');
	let illustrative = $state(true);
	let scaleOv = $state<ScaleId | null>(null);
	// layout and the secondary view (Wentao 2026-10-23): own scale / mode / tool; Swap exchanges the contents
	let layout = $state<Layout>('inset');
	let swap = $state(false);
	let sec = $state<SecOpts>({ scale: null, illustrative: null, tool: true });
	const secIll = $derived(sec.illustrative ?? illustrative);
	const LAYOUTS: { id: Layout; tip: string; d: string }[] = [
		{ id: 'main', tip: 'Main view only (P toggles the inset)', d: 'M1.5 1.5h13v9h-13z' },
		{ id: 'inset', tip: 'Inset: secondary view in the corner (P)', d: 'M1.5 1.5h13v9h-13zM9.5 2.5h4v3h-4z' },
		{ id: 'side', tip: 'Split side by side, 50 / 50 (stacked below 640 px)', d: 'M1.5 1.5h6v9h-6zM8.5 1.5h6v9h-6z' },
		{ id: 'stack', tip: 'Split stacked, top / bottom', d: 'M1.5 1.5h13v4h-13zM1.5 6.5h13v4h-13z' }
	];
	function setLayout(l: Layout) {
		layout = l;
		viewer?.setOpts({ layout: l });
		writeHash();
	}
	function setSwap(on: boolean) {
		swap = on;
		viewer?.setOpts({ swap: on });
		writeHash();
	}
	function setSec(o: Partial<SecOpts>) {
		sec = { ...sec, ...o };
		viewer?.setOpts({ sec: { ...sec } });
		writeHash();
	}
	let glError = $state('');
	let ov = $state<Overlay | null>(null);
	let stats = $state<ProcStats | null>(null);
	let pick = $state<Pick | null>(null);
	let sceneState = $state.raw<SceneState | null>(null);
	let pos = $state(0);
	let playing = $state(false);
	let dir = $state<1 | -1>(1);
	let speed = $state(1);
	let loop = $state(false);
	let matSrc = $state('stub');
	let realTools = $state<string[]>([]);
	let hudCollapsed = $state(typeof window !== 'undefined' && window.innerWidth < 520);
	let lastHash = '';

	let viewer = $state.raw<ProcessViewer | null>(null);
	let ix = $state.raw<FlowIndex | null>(null);
	let toolInfo = $state<ToolInfo>({ id: '', placeholder: true, readouts: [], traces: [], defaultDuration: null });
	let ev = $state<Evaluator | null>(null);
	let player: Player | null = null;
	let raf = 0;
	let last = 0;

	const flows = $derived(loaded?.data.flows ?? []);
	const flow = $derived(flows.find((f) => f.id === flowId) ?? flows[0] ?? null);
	const refs = $derived<Record<string, Ref>>(loaded?.data.refs ?? {});
	const steps = $derived(ev?.steps ?? []);
	const k = $derived(sceneState?.k ?? 0);
	const step = $derived(steps[k] ?? null);
	const groups = $derived.by(() => {
		const m = new Map<string, typeof flows>();
		for (const f of flows) {
			const g = f.family ?? f.family_label ?? 'other';
			m.set(g, [...(m.get(g) ?? []), f]);
		}
		return [...m.entries()];
	});

	// ---------------------------------------------------------------- profiles / timing for the HUD
	const total = $derived(ev && sceneState ? ev.timing(sceneState.k).total : null);
	const activeOp = $derived(step && sceneState ? step.ops[Math.max(0, sceneState.op)] ?? null : null);
	const opLabel = $derived(activeOp ? `${activeOp.label ?? activeOp.op}${step && step.ops.length > 1 ? ` (${Math.max(0, sceneState?.op ?? 0) + 1}/${step.ops.length})` : ''}` : '');
	const profiles = $derived.by<Profile[]>(() => {
		if (!step || !ix) return [];
		const op = activeOp ?? step.ops[0];
		const ids: string[] = [];
		if (!op) return [];
		if (op.op === 'bond_tcb') ids.push(op.profiles.T, op.profiles.T_set ?? '', op.profiles.F ?? '');
		else if ('profile' in op && typeof op.profile === 'string') ids.push(op.profile);
		const fromData = ids.map((i) => ix!.profile.get(i)).filter((p): p is Profile => !!p);
		if (fromData.length) return fromData;
		// no data profile: the tool model's default traces (template, labelled as tool)
		return toolInfo.traces.map((tr) => ({ id: `tool:${tr.key}`, q: tr.q, unit: tr.unit, pts: tr.pts, status: tr.status, note: `tool model trace${tr.note ? `: ${tr.note}` : ''}`, label: `${tr.label} (tool)` }) as Profile);
	});
	const cursor = $derived.by<number | null>(() => {
		if (!ev || !sceneState || !activeOp || sceneState.op < 0) return null;
		const impl = opImpl(activeOp);
		const d = impl.duration(activeOp, ev.ctx(sceneState.k));
		const r = impl.realAt ? impl.realAt(activeOp, sceneState.u, ev.ctx(sceneState.k)) : d != null ? sceneState.u * d : null;
		return r;
	});

	// ---------------------------------------------------------------- flow / route setup

	function setup() {
		if (!flow || !viewer) return;
		ix = indexFlow(flow);
		const r = flow.routes.some((x) => x.id === routeId) ? routeId : defaultRoute(flow);
		routeId = r;
		const e = new Evaluator(ix, r);
		ev = e;
		player = new Player(e.n, (kk) => e.timing(kk).play_s);
		player.speed = speed;
		player.loop = loop;
		viewer.setFlow(ix, e);
		refresh();
	}

	function refresh() {
		if (!ev || !player || !viewer) return;
		const s = ev.evalAt(player.k, player.t);
		sceneState = s;
		pos = player.pos;
		playing = player.playing;
		viewer.update(s);
		toolInfo = { ...viewer.toolInfo };
	}

	function loopFn(ts: number) {
		if (!player) return;
		const gap = last ? (ts - last) / 1000 : 0;
		const dt = gap > 0.5 ? 0.1 : gap; // wall time; a long gap (hidden tab, slow GPU) advances 0.1 s: no jump, no stall (V2 m8)
		last = ts;
		player.tick(dt);
		refresh();
		if (player.playing) raf = requestAnimationFrame(loopFn);
		else {
			raf = 0;
			last = 0;
			writeHash();
		}
	}
	function startLoop() {
		if (!raf && player?.playing) {
			last = 0;
			raf = requestAnimationFrame(loopFn);
		}
	}
	function play() {
		if (!player) return;
		if (player.playing && player.dir > 0) player.playing = false;
		else {
			if (player.k >= player.n - 1 && player.t >= 1 && !player.loop) player.seek(0, 0);
			player.dir = 1;
			player.playing = true;
		}
		dir = player.dir;
		refresh();
		startLoop();
	}
	function reverse() {
		if (!player) return;
		if (player.playing && player.dir < 0) player.playing = false;
		else {
			if (player.k <= 0 && player.t <= 0 && !player.loop) player.seek(player.n - 1, 1);
			player.dir = -1;
			player.playing = true;
		}
		dir = player.dir;
		refresh();
		startLoop();
	}
	function stepBy(d: 1 | -1) {
		if (!player) return;
		player.playing = false;
		const kk = player.k, t = player.t;
		if (d > 0) {
			if (kk >= player.n - 1) player.seek(kk, 1);
			else player.seek(kk + 1, 0);
		} else if (t > 0.02) player.seek(kk, 0);
		else player.seek(kk - 1, 0);
		refresh();
		writeHash();
	}
	function seekPos(p: number, end: boolean) {
		if (!player) return;
		player.playing = false;
		player.pos = Math.max(0, Math.min(player.n, p));
		refresh();
		if (end) writeHash();
	}
	function setSpeed(s: number) {
		speed = s;
		if (player) player.speed = s;
	}
	function toggleLoop() {
		loop = !loop;
		if (player) player.loop = loop;
	}

	// ---------------------------------------------------------------- URL hash

	let hashTimer: ReturnType<typeof setTimeout> | null = null;
	function writeHash() {
		if (hashTimer) return;
		hashTimer = setTimeout(() => {
			hashTimer = null;
			if (!flow || !player || !ev) return;
			const st = ev.steps[player.k];
			const parts = [`mode=process`, `flow=${encodeURIComponent(flow.id)}`, `route=${encodeURIComponent(routeId)}`, `step=${encodeURIComponent(st?.id ?? '')}`, `t=${player.t.toFixed(3)}`];
			if (scaleOv) parts.push(`scale=${scaleOv}`);
			if (!illustrative) parts.push('ill=0');
			if (layout !== 'inset') parts.push(`layout=${layout}`);
			if (swap) parts.push('swap=1');
			if (sec.scale) parts.push(`s2=${sec.scale}`);
			if (sec.illustrative !== null) parts.push(`m2=${sec.illustrative ? 'ill' : 'act'}`);
			if (!sec.tool) parts.push('t2=0');
			const h = `#${parts.join('&')}`;
			lastHash = h;
			if (location.hash !== h) {
				try {
					void goto(location.pathname + location.search + h, { replace: true, shallow: true, reset: false });
				} catch {
					/* router not ready */
				}
			}
		}, 250);
	}
	function readHash() {
		const h = new URLSearchParams(location.hash.slice(1));
		if (h.get('mode') !== 'process') return null;
		const lay = h.get('layout');
		const s2 = h.get('s2'), m2 = h.get('m2');
		return {
			flow: h.get('flow'), route: h.get('route'), step: h.get('step'), t: Number(h.get('t') ?? 0), scale: h.get('scale') as ScaleId | null, ill: h.get('ill'),
			layout: (lay && ['main', 'inset', 'side', 'stack'].includes(lay) ? lay : 'inset') as Layout,
			swap: h.get('swap') === '1',
			sec: { scale: s2 && ['work', 'block', 'cell'].includes(s2) ? (s2 as ScaleId) : null, illustrative: m2 === 'ill' ? true : m2 === 'act' ? false : null, tool: h.get('t2') !== '0' } as SecOpts
		};
	}

	// ---------------------------------------------------------------- keyboard

	function onKey(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return; // browser / OS shortcuts (V1 m11)
		const tg = e.target as HTMLElement | null;
		if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
		if (!player) return;
		const key = e.key;
		if (key === ' ') { e.preventDefault(); play(); }
		else if (key === 'ArrowRight' && e.shiftKey) { e.preventDefault(); seekPos(player.pos + 0.01, true); }
		else if (key === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); seekPos(player.pos - 0.01, true); }
		else if (key === 'ArrowRight') { e.preventDefault(); stepBy(1); }
		else if (key === 'ArrowLeft') { e.preventDefault(); stepBy(-1); }
		else if (key === 'Home') seekPos(0, true);
		else if (key === 'End') seekPos(player.n, true);
		else if (key === 'r' || key === 'R') reverse();
		else if (key === 'l' || key === 'L') toggleLoop();
		else if (key === '[') setSpeed(Math.max(0.25, speed / 2));
		else if (key === ']') setSpeed(Math.min(4, speed * 2));
		else if (key === '1') setScale('work');
		else if (key === '2') setScale('block');
		else if (key === '3') setScale('cell');
		else if (key === '0') setScale(null);
		else if (key === 'p' || key === 'P') setLayout(layout === 'main' ? 'inset' : 'main');
		else if (key === 'i' || key === 'I') setIll(!illustrative);
	}
	function setScale(s: ScaleId | null) {
		scaleOv = s;
		viewer?.setOpts({ scale: s }); // per-scale camera memory: no re-fit
		writeHash();
	}
	function setIll(on: boolean) {
		illustrative = on;
		viewer?.setOpts({ illustrative: on }); // keeps the pose (target height follows the z map)
		writeHash();
	}

	// ---------------------------------------------------------------- mount

	onMount(() => {
		const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
		window.addEventListener('keydown', onKey);
		window.addEventListener('hashchange', onHash);
		let alive = true;
		(async () => {
			const [l, ms, tools] = await Promise.all([loadProcess3d(), loadMaterials(), loadTools()]);
			if (!alive) return;
			matSrc = ms;
			realTools = tools;
			let v: ProcessViewer;
			try {
				v = new ProcessViewer(host!, canvas!);
			} catch (e) {
				glError = `WebGL unavailable: ${e instanceof Error ? e.message : String(e)}`;
				return;
			}
			v.onOverlay = (o) => (ov = o);
			v.onStats = (st) => (stats = { ...st });
			v.onPick = (p) => (pick = p);
			v.setBackground(getComputedStyle(document.documentElement).getPropertyValue('--bg'));
			v.setOpts({ reduceMotion: !!mq?.matches });
			viewer = v;
			loaded = l;
			const h = readHash();
			const f = l.data.flows.find((x) => x.id === h?.flow) ?? l.data.flows[0];
			flowId = f?.id ?? '';
			routeId = h?.route ?? '';
			if (h?.ill === '0') { illustrative = false; v.setOpts({ illustrative: false }); }
			if (h?.scale && ['work', 'block', 'cell'].includes(h.scale)) { scaleOv = h.scale; v.setOpts({ scale: h.scale }); }
			if (h) { layout = h.layout; swap = h.swap; sec = h.sec; v.setOpts({ layout: h.layout, swap: h.swap, sec: { ...h.sec } }); }
			await tick();
			setup();
			if (h?.step && ev && player) {
				const kk = ev.steps.findIndex((st) => st.id === h.step);
				if (kk >= 0) {
					player.seek(kk, Number.isFinite(h.t) ? h.t : 0);
					refresh();
				}
			}
			installHook();
		})();
		return () => {
			alive = false;
			if (raf) cancelAnimationFrame(raf);
			if (hashTimer) clearTimeout(hashTimer);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('hashchange', onHash);
			delete (window as unknown as { __apaProc?: unknown }).__apaProc;
			viewer?.dispose();
			viewer = null;
		};
	});

	function changeFlow(id: string) {
		flowId = id;
		routeId = '';
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		setup();
		writeHash();
	}
	function changeRoute(id: string) {
		const keep = ev && player ? { id: ev.steps[player.k]?.id, t: player.t } : null;
		routeId = id;
		setup();
		if (player && ev && keep?.id && flow) {
			// same step id when the new route has it, else the nearest shared step in flow order (V1 m9)
			let kk = ev.steps.findIndex((s) => s.id === keep.id);
			if (kk < 0) {
				const order = flow.steps.map((s) => s.id);
				const at = order.indexOf(keep.id);
				let best = 0, bd = Infinity;
				ev.steps.forEach((s, i) => { const d = Math.abs(order.indexOf(s.id) - at); if (d < bd) { bd = d; best = i; } });
				kk = best;
			}
			player.seek(kk, kk >= 0 && ev.steps[kk]?.id === keep.id ? keep.t : 0);
			refresh();
		}
		writeHash();
	}

	/** Hash edited / pasted in an open tab (V1 m10): apply flow, route, step, t, scale, mode. */
	function onHash() {
		if (location.hash === lastHash) return;
		const h = readHash();
		if (!h || !loaded || !viewer) return;
		if (h.flow && h.flow !== flowId && loaded.data.flows.some((f) => f.id === h.flow)) { flowId = h.flow; routeId = h.route ?? ''; setup(); }
		else if (h.route && h.route !== routeId) changeRoute(h.route);
		const ill = h.ill !== '0';
		if (ill !== illustrative) { illustrative = ill; viewer.setOpts({ illustrative: ill }); }
		const sc = h.scale && ['work', 'block', 'cell'].includes(h.scale) ? h.scale : null;
		if (sc !== scaleOv) { scaleOv = sc; viewer.setOpts({ scale: sc }); }
		if (h.layout !== layout || h.swap !== swap || JSON.stringify(h.sec) !== JSON.stringify(sec)) {
			layout = h.layout; swap = h.swap; sec = h.sec;
			viewer.setOpts({ layout: h.layout, swap: h.swap, sec: { ...h.sec } });
		}
		if (h.step && ev && player) {
			const kk = ev.steps.findIndex((s) => s.id === h.step);
			if (kk >= 0) { player.playing = false; player.seek(kk, Number.isFinite(h.t) ? h.t : 0); refresh(); }
		}
	}

	// live theme switch (V1 m1): the canvas background follows --bg
	$effect(() => {
		void ui.theme;
		const v = viewer;
		if (!v) return;
		requestAnimationFrame(() => v.setBackground(getComputedStyle(document.documentElement).getPropertyValue('--bg')));
	});

	// ---------------------------------------------------------------- automation hook (headless renders, checks)

	function installHook() {
		const frames = (n: number) => new Promise<void>((r) => { const f = (c: number) => (c <= 0 ? r() : requestAnimationFrame(() => f(c - 1))); f(n); });
		(window as unknown as { __apaProc?: unknown }).__apaProc = {
			flows: () => flows.map((f) => ({ id: f.id, steps: routeSteps(f, defaultRoute(f)).map((s) => s.id), routes: f.routes.map((r) => ({ id: r.id, default: !!r.default, steps: routeSteps(f, r.id).map((s) => s.id) })) })),
			setRoute: async (id: string) => { changeRoute(id); if (player) { player.seek(0, 0); refresh(); } await tick(); await frames(2); },
			setFlow: async (id: string) => { changeFlow(id); await tick(); await frames(2); },
			seek: async (kk: number, t: number) => { if (!player) return; player.playing = false; player.seek(kk, t); refresh(); await tick(); await frames(2); },
			setIllustrative: async (on: boolean) => { setIll(on); await tick(); await frames(2); },
			setScale: async (s: ScaleId | null) => { setScale(s); await tick(); await frames(2); },
			stats: () => (viewer ? { ...viewer.stats, primary: viewer.primary, pip: viewer.pipScale, tool: viewer.toolInfo, materials: materialSource() } : null),
			stateKey: (kk: number, t: number) => (ev ? stateKey(ev.evalAt(kk, t)) : ''),
			/** forward sweep then backward sweep through seek(); compares the evaluated states */
			reverseCheck: async (n = 20) => {
				if (!ev || !player) return null;
				const fwd: string[] = [], bwd: string[] = [];
				const N = ev.n;
				for (let i = 0; i <= n; i++) { const p = (i / n) * N; player.pos = p; refresh(); fwd.push(stateKey(sceneState!)); }
				for (let i = n; i >= 0; i--) { const p = (i / n) * N; player.pos = p; refresh(); bwd.unshift(stateKey(sceneState!)); }
				const bad = fwd.map((x, i) => (x === bwd[i] ? -1 : i)).filter((i) => i >= 0);
				return { points: n + 1, mismatches: bad.length, at: bad };
			},
			debugScene: () => viewer?.debugScene() ?? null,
			screenBox: (ids: string[]) => viewer?.screenBox(ids) ?? null,
			layout: async (l: Layout, sw = false, so: Partial<SecOpts> = {}) => { setLayout(l); setSwap(sw); setSec(so); await tick(); await frames(2); },
			/** Frame button (re-fit the current scale and the PiP) */
			frame: async (full = false) => { viewer?.resetCamera(full); await tick(); await frames(2); },
			/** live z ranges (piece frame) of bodies at (k, t): regression checks */
			bodyZ: (kk: number, t: number, ids: string[]) => {
				if (!ev || !ix) return null;
				const s = ev.evalAt(kk, t);
				const out: Record<string, [number, number] | null> = {};
				for (const id of ids) {
					const b = ix.body.get(id), st = s.bodies[id];
					out[id] = b && st?.on && !(st.gone >= 1 && !st.keep.length) ? liveZ(ix, b, st) : null;
				}
				return out;
			},
			camera: () => (viewer ? { pos: viewer.camera.position.toArray(), target: viewer.controls.target.toArray() } : null),
			ready: async () => { while (!viewer || !sceneState) await frames(2); await frames(3); return true; }
		};
	}

	// ---------------------------------------------------------------- pick tooltip

	function bodyDims(b: Body): [string, PDim][] {
		const out: [string, PDim][] = [];
		const walk = (o: unknown, path: string) => {
			if (!o || typeof o !== 'object') return;
			const r = o as Record<string, unknown>;
			if (typeof r.value === 'number' && typeof r.status === 'string') { out.push([path, r as unknown as PDim]); return; }
			for (const [kk, val] of Object.entries(r)) if (kk !== 'mat0') walk(val, path ? `${path}.${kk}` : kk);
		};
		walk(b, '');
		return out;
	}
	const pickBody = $derived(pick?.kind === 'body' && ix ? ix.body.get(pick.id) ?? null : null);
	const kfmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));
</script>

<div class="pv">
	<div class="bar2">
		<select value={flow?.id ?? ''} onchange={(e) => changeFlow((e.currentTarget as HTMLSelectElement).value)} aria-label="Process flow" data-tip={flow ? `${flow.name}\n${flow.summary}\nkind: ${flow.kind}${flow.source_flows.length ? `\nDB flows: ${flow.source_flows.join(', ')}` : ''}` : ''}>
			{#each groups as [g, fs] (g)}
				<optgroup label={g}>{#each fs as f (f.id)}<option value={f.id}>{f.name}</option>{/each}</optgroup>
			{/each}
		</select>
		{#if flow && flow.routes.length > 1}
			<select value={routeId} onchange={(e) => changeRoute((e.currentTarget as HTMLSelectElement).value)} aria-label="Route" data-tip="Route (variant of the flow)">
				{#each flow.routes as r (r.id)}<option value={r.id}>{r.name}{r.default ? ' (default)' : ''}</option>{/each}
			</select>
		{:else if flow}
			<span class="muted small" data-tip="single route">route {routeId}</span>
		{/if}
		<span class="sep"></span>
		<div class="seg">
			<button class:on={!illustrative} onclick={() => setIll(false)} data-tip="Actual: true scale on all axes, ruler and scale bar (I)">Actual</button>
			<button class:on={illustrative} onclick={() => setIll(true)} data-tip="Illustrative: lateral true, z mapped so every layer is visible; films enlarged to >= 2 px (I)">Illustrative</button>
		</div>
		<span class="sep"></span>
		<div class="seg">
			<button class:on={scaleOv === null} onclick={() => setScale(null)} data-tip="Scale chosen by each step (0)">Auto</button>
			<button class:on={scaleOv === 'work'} onclick={() => setScale('work')} data-tip="Wafer / panel with the tool (1)">Wafer</button>
			<button class:on={scaleOv === 'block'} onclick={() => setScale('block')} data-tip="Package cross-section block (2)">Block</button>
			<button class:on={scaleOv === 'cell'} onclick={() => setScale('cell')} data-tip="Feature unit cell (3)">Cell</button>
		</div>
		<span class="sep"></span>
		<div class="seg" role="group" aria-label="Layout">
			{#each LAYOUTS as L (L.id)}
				<button class="ico" class:on={layout === L.id} onclick={() => setLayout(L.id)} data-tip={L.tip} aria-label={L.tip}><svg viewBox="0 0 16 12" width="16" height="12"><path d={L.d} /></svg></button>
			{/each}
			<button class="ico" class:on={swap} onclick={() => setSwap(!swap)} data-tip="Swap: exchange the main and secondary content (scale, mode, tool)" aria-label="Swap views"><svg viewBox="0 0 16 12" width="16" height="12"><path d="M2 4h10M9.5 1.5L12 4l-2.5 2.5M14 8H4M6.5 5.5L4 8l2.5 2.5" /></svg></button>
		</div>
		{#if layout !== 'main'}
			<div class="seg sec" role="group" aria-label="Secondary view">
				<span class="lab" data-tip="Secondary view: scale, scale mode and tool (independent of the main view)">2nd</span>
				<button class:on={sec.scale === null} onclick={() => setSec({ scale: null })} data-tip="Auto: the complement of the main view's scale">A</button>
				<button class:on={sec.scale === 'work'} onclick={() => setSec({ scale: 'work' })} data-tip="Wafer / panel (Auto when the main view shows the same scale)">W</button>
				<button class:on={sec.scale === 'block'} onclick={() => setSec({ scale: 'block' })} data-tip="Block cross-section (Auto when the main view shows the same scale)">B</button>
				<button class:on={sec.scale === 'cell'} onclick={() => setSec({ scale: 'cell' })} data-tip="Unit cell (Auto when the main view shows the same scale)">C</button>
			</div>
			<div class="seg sec">
				<button class:on={!secIll} onclick={() => setSec({ illustrative: false })} data-tip="Secondary view: Actual (true scale){sec.illustrative === null ? '; now following the main view' : ''}">Act</button>
				<button class:on={secIll} onclick={() => setSec({ illustrative: true })} data-tip="Secondary view: Illustrative (z mapped){sec.illustrative === null ? '; now following the main view' : ''}">Ill</button>
				<button class:on={sec.tool} onclick={() => setSec({ tool: !sec.tool })} data-tip="Secondary view: show / hide the tool when it is drawn there">Tool</button>
			</div>
		{/if}
		<button onclick={() => viewer?.resetCamera(false, viewer.focus)} data-tip="Re-fit the camera of the view last pointed at (main by default); each view also has its own Frame button">Frame</button>
		<div class="grow"></div>
		{#if loaded?.data.draft}<span class="draft" data-tip={`DRAFT build of process3d.json: ${loaded.data.pending?.length ?? 0} pending values (template, no value; shown as missing). Not final data.\n${(loaded.data.pending ?? []).slice(0, 12).map((p) => { const q = p as { flow?: string; where?: string; quantity?: string }; return `${q.flow ?? ''} ${q.where ?? ''}: ${q.quantity ?? ''}`; }).join('\n')}`}>DRAFT</span>{/if}
		{#if loaded?.fixture}<span class="warn" data-tip="app/static/data/process3d.json not found: development fixtures (every value template)">fixtures</span>{/if}
		{#if loaded?.error}<span class="err" data-tip={loaded.error}>process3d.json error</span>{/if}
	</div>
	<div class="body">
		<div class="view" bind:this={host}>
			<canvas bind:this={canvas}></canvas>
			{#if glError}<div class="glerr">{glError}</div>{/if}
			{#if step && sceneState && ev}
				<div class="hudbox">
					<Hud {step} i={k} n={ev.n} route={routeId} state={sceneState} {total} {opLabel} {profiles} {cursor} {refs} tool={toolInfo.id} toolPlaceholder={toolInfo.placeholder} readouts={toolInfo.readouts} toolDefault={toolInfo.defaultDuration} opSrc={activeOp?.src ?? null} unknownOps={ev.timing(k).unknown} bind:collapsed={hudCollapsed} />
				</div>
			{/if}
			{#if ov}
				{#each ov.ticks as tk (tk.label + tk.y)}
					<div class="tick" class:flip={tk.x > ov.main.x + ov.main.w - 64} style:left="{tk.x}px" style:top="{tk.y}px"><span>{tk.label}</span></div>
				{/each}
				{#if ov.ticks.length}<div class="tickunit" class:flip={ov.ticks[0].x > ov.main.x + ov.main.w - 64} style:left="{ov.ticks[0].x}px" style:top="{Math.min(...ov.ticks.map((t) => t.y)) - 16}px">z um</div>{/if}
				<div class="scalebar" style:left="{ov.main.x + 8}px" style:bottom="{(host?.clientHeight ?? 0) - (ov.main.y + ov.main.h) + 8}px" style:max-width="{Math.max(60, ov.main.w - 64)}px">
					{#if ov.scaleBar}<div class="sb" style:width="{ov.scaleBar.px}px"></div><span class="num">{ov.scaleBar.label}</span>{/if}
					<span class="muted">{ov.primary} · {ov.note}</span>
				</div>
				{#if ov.pip}
					<div class="piplabel" class:split={ov.layout !== 'inset'} style:left="{ov.pip.x}px" style:top="{ov.pip.y}px" style:width="{ov.pip.w}px" style:height="{ov.pip.h}px"><span>{ov.pip.label}</span></div>
					<button class="vframe" style:left="{ov.pip.x + ov.pip.w - 44}px" style:top="{ov.pip.y + 4}px" onclick={() => viewer?.resetCamera(false, 'sec')} data-tip="Re-fit the secondary view's camera">Frame</button>
					{#if ov.layout !== 'inset'}<button class="vframe" style:left="{ov.main.x + ov.main.w - 44}px" style:top="{ov.main.y + 4}px" onclick={() => viewer?.resetCamera(false, 'main')} data-tip="Re-fit the main view's camera">Frame</button>{/if}
				{/if}
			{/if}
			{#if pick}
				<div class="pick" style:left="{Math.min(pick.x + 12, (host?.clientWidth ?? 600) - 290)}px" style:top="{pick.y + 12}px">
					<button class="x" onclick={() => (pick = null)} aria-label="Close">x</button>
					{#if pickBody}
						<div><b>{pickBody.name}</b> <span class="muted">{pickBody.kind} · {pickBody.material}{pickBody.label ? ` (${pickBody.label})` : ''}</span></div>
						{#if pick.text}<div class="muted">{pick.text}</div>{/if}
						{#each bodyDims(pickBody) as [kk, d] (kk)}
							<div class="dim" class:tpl={d.status === 'template'} data-tip={provTip(d, refs)}><span class="muted">{kk}</span><span class="num">{fmt(d.value)} {d.unit}</span><span class="st">{d.status}</span></div>
						{/each}
					{:else if pick.kind === 'tool'}
						<div>{pick.text}</div>
					{/if}
				</div>
			{/if}
		</div>
		<aside class="insp">
			{#if flow}
				<section>
					<div class="trow"><b>{flow.name}</b></div>
					<div class="muted small">{flow.kind}{flow.family ? ` · ${flow.family}` : flow.family_label ? ` · ${flow.family_label}` : ''}</div>
					<p class="summary">{flow.summary}</p>
				</section>
				<select class="stepsel" value={steps[k]?.id ?? ''} onchange={(e) => { const kk = steps.findIndex((s) => s.id === (e.currentTarget as HTMLSelectElement).value); if (player && kk >= 0) { player.playing = false; player.seek(kk, 0); refresh(); writeHash(); } }} aria-label="Step">
					{#each steps as s, i (s.id)}<option value={s.id}>{i + 1}. {s.name}</option>{/each}
				</select>
				<section class="steps">
					<h3>Steps</h3>
					{#each steps as s, i (s.id)}
						<button class="st" class:on={i === k} onclick={() => { if (player) { player.playing = false; player.seek(i, 0); refresh(); writeHash(); } }} data-tip="{s.name}\n{s.category}{s.db_step ? `\nDB: ${s.db_step}` : ''}">
							<span class="num muted">{i + 1}</span><span class="nm">{s.name}</span>
						</button>
					{/each}
				</section>
			{/if}
			{#if stats}
				<div class="stats mono" data-tip="renderer.info for the last frame (main + PiP): draw calls, triangles, instances; CPU ms of the state evaluation + scene update and of the render call. Materials: L36 library or stub. Tools: real actors loaded from L37 / L38, else placeholders.">
					{stats.calls} calls · {kfmt(stats.triangles)} tris · {kfmt(stats.instances)} inst · {stats.bodies} bodies<br />
					update {stats.ms.toFixed(1)} ms · render {stats.frameMs.toFixed(1)} ms · {stats.geometries} geo<br />
					materials {matSrc} · tools {realTools.length ? realTools.join(', ') : 'placeholders'}
				</div>
			{/if}
		</aside>
	</div>
	{#if ev}
		<Controls steps={ev.steps} {pos} {playing} {dir} {speed} {loop} onplay={play} onreverse={reverse} onstep={stepBy} onseek={seekPos} onspeed={setSpeed} onloop={toggleLoop} />
	{/if}
</div>

<style>
	.pv { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; grid-template-columns: minmax(0, 1fr); min-width: 0; min-height: 0; max-width: 100%; }
	.pv > * { min-width: 0; }
	.bar2 { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 4px 8px; background: var(--surface); border-bottom: 1px solid var(--border); }
	.bar2 button { height: 22px; font-size: 11px; padding: 0 7px; }
	.bar2 select { height: 22px; max-width: 360px; font-size: 11px; }
	.seg { display: inline-flex; }
	.seg button + button { border-left: none; }
	.sep { width: 1px; height: 16px; background: var(--line); }
	.grow { flex: 1; }
	.draft { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: var(--crit); border: 1px solid currentColor; padding: 0 5px; }
	.warn { font-size: 10.5px; color: var(--warn, #d9a35c); border: 1px solid currentColor; padding: 0 4px; }
	.err { color: var(--crit); font-size: 11px; }
	.body { display: grid; grid-template-columns: minmax(0, 1fr) 250px; min-height: 0; }
	.view { position: relative; min-width: 0; min-height: 0; overflow: hidden; }
	canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
	.glerr { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--crit); }
	.hudbox { position: absolute; z-index: 2; left: 8px; top: 8px; width: 290px; max-height: calc(100% - 44px); overflow-y: auto; padding: 6px 8px; background: color-mix(in srgb, var(--surface) 92%, transparent); border: 1px solid var(--border); }
	/* z ruler on the model's right edge (V1 M1), labels on a backing chip (V1 M5) */
	.tick { position: absolute; z-index: 1; width: 6px; height: 0; border-top: 1px solid var(--ink-2); pointer-events: none; }
	.tick span { position: absolute; left: 9px; top: -7px; font-size: 9.5px; line-height: 13px; padding: 0 3px; color: var(--ink-2); background: color-mix(in srgb, var(--bg) 78%, transparent); white-space: nowrap; font-family: var(--mono, monospace); }
	/* labels left of the tick when the ruler is near the right edge (narrow screens, V2 n8) */
	.tick.flip span { left: auto; right: 3px; }
	.tickunit.flip { transform: translate(calc(-100% - 3px), 0); }
	.tickunit { position: absolute; z-index: 1; transform: translate(9px, 0); font-size: 9.5px; padding: 0 3px; color: var(--ink-2); background: color-mix(in srgb, var(--bg) 78%, transparent); pointer-events: none; }
	.scalebar { position: absolute; z-index: 1; left: 8px; bottom: 8px; display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--ink-2); padding: 1px 5px; background: color-mix(in srgb, var(--bg) 78%, transparent); pointer-events: none; max-width: calc(100% - 64px); overflow: hidden; white-space: nowrap; }
	.sb { height: 4px; border: 1px solid var(--ink-2); border-top: none; }
	.piplabel { position: absolute; border: 1px solid var(--line); pointer-events: none; }
	.piplabel.split { border: none; border-left: 1px solid var(--line); border-top: 1px solid var(--line); }
	.vframe { position: absolute; z-index: 2; height: 18px; width: 40px; padding: 0; font-size: 10px; }
	.ico { width: 26px; padding: 0 !important; display: inline-flex; align-items: center; justify-content: center; }
	.ico svg { fill: none; stroke: currentColor; stroke-width: 1; }
	.sec .lab { font-size: 10px; color: var(--ink-3); padding: 0 4px 0 2px; align-self: center; }
	.sec button { padding: 0 5px; }
	.piplabel span { position: absolute; left: 4px; top: 2px; font-size: 10px; color: var(--ink-3); }
	.pick { position: absolute; width: 280px; max-height: 60%; overflow-y: auto; padding: 6px 8px; background: var(--surface); border: 1px solid var(--border); font-size: 11px; z-index: 3; }
	.pick .x { position: absolute; right: 4px; top: 4px; height: 18px; width: 18px; padding: 0; font-size: 10px; }
	.dim { display: grid; grid-template-columns: 1fr auto 56px; gap: 6px; border-bottom: 1px solid var(--grid); }
	.dim.tpl .num { color: var(--ink-3); text-decoration: underline dashed; text-underline-offset: 2px; }
	.dim .st { font-size: 9.5px; color: var(--ink-3); text-align: right; }
	.insp { min-height: 0; overflow-y: auto; border-left: 1px solid var(--border); background: var(--surface); padding: 6px 8px; display: flex; flex-direction: column; gap: 8px; }
	section { display: flex; flex-direction: column; gap: 3px; }
	h3 { margin: 0; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
	.summary { margin: 0; font-size: 11px; color: var(--ink-2); }
	.small { font-size: 10.5px; }
	.muted { color: var(--ink-3); }
	.trow { display: flex; gap: 6px; }
	.st { display: flex; gap: 6px; align-items: baseline; text-align: left; height: auto; min-height: 20px; padding: 2px 4px; font-size: 11px; border-color: transparent; background: transparent; }
	.st.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
	.st .nm { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.stats { margin-top: auto; font-size: 10px; color: var(--ink-3); border-top: 1px solid var(--grid); padding-top: 4px; }
	.stepsel { display: none; }
	@media (max-width: 720px) {
		.body { grid-template-columns: minmax(0, 1fr); grid-template-rows: 60vh auto; }
		.insp { border-left: none; border-top: 1px solid var(--border); }
		.hudbox { width: min(290px, calc(100% - 16px)); }
		.stepsel { display: block; width: 100%; height: 24px; font-size: 11px; }
		.steps { display: none; }
	}
	@media (max-width: 520px) {
		.pv { overflow-x: hidden; }
		.bar2 select { max-width: 100%; flex: 1 1 100%; }
		.hudbox { width: calc(100% - 16px); }
		.piplabel { display: none; }
	}
</style>
