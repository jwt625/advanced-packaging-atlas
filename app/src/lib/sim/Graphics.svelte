<script lang="ts">
	// Graphics area of the /sim workbench (R7 6.1/6.4; concept from eo-modulator-atlas app/src/lib/sim/Graphics.svelte,
	// GPL-3.0-or-later): three.js geometry preview of the generated part list with camera presets, section trim,
	// z-exaggeration, x-ray of host volumes and hover readout; result field layers (surface, section cut face = slice of
	// the field, slice plane, wireframe, deformation) with colorbar, probe and pins; 2D overlay for triad and legend.
	import { onMount, untrack } from 'svelte';
	import * as THREE from 'three';
	import { CLASS_COLOR, arrayClass, materialClass, templateColor } from '../three/materials';
	import { ui } from '../state.svelte';
	import { BoxViewer, type BoxStyle, type Hit } from './graphics/BoxViewer';
	import { edgeStyle, partProv } from './provenance';
	import { VIEW_PRESETS } from './urlState';
	import { downloadDataUrl } from './exportUtil';
	import Icon from './Icon.svelte';
	import EmSection from './EmSection.svelte';
	import type { Workbench } from './workbench.svelte';
	import type { SimPart } from './protocol';
	import { fmt } from '../logic';
	import { colormapLut } from './colormap';
	import { drawLegend, legendTip, LEGEND_W, type LegendSpec } from './colorbar';
	import { StaleReply } from './postClient';
	import { loadModule } from './engine';
	import type { SurfaceOut } from './post';
	import { fieldDisplay } from './results';
	import type { PostClient } from './postClient';
	import type { FieldExpr } from './protocol';

	let { wb }: { wb: Workbench } = $props();
	let host: HTMLDivElement = $state()!;
	let canvas: HTMLCanvasElement = $state()!;
	let overlay: HTMLCanvasElement = $state()!;
	let viewer: BoxViewer | null = $state.raw(null);
	let hover = $state<{ hit: Hit; x: number; y: number } | null>(null);
	let webgl = $state(true);
	const KZ = [1, 2, 5, 10, 20];

	// boxes that contain others: `in` (embedded part) or `host` (layer box inside its part)
	const hosts = $derived(new Set(wb.parts.flatMap((p) => [p.in, p.host]).filter((x): x is string => typeof x === 'string' && !!x)));
	// package3d.json x-ray defaults by part id (generator boxes keep the package3d ids)
	const xrayIds = $derived(new Set((wb.family?.parts ?? []).filter((p) => p.xray_default).map((p) => p.id)));
	// per-box T max of the last run (thermal derived.parts keyed by the grid part ids = box ids)
	const tmax = $derived.by(() => {
		const parts = wb.run?.result.derived?.parts as Record<string, { Tmax_C?: number }> | undefined;
		if (!parts || wb.colorBy !== 'tmax') return null;
		const m = new Map<string, number>();
		let lo = Infinity, hi = -Infinity;
		for (const [id, s] of Object.entries(parts)) {
			const v = Number(s?.Tmax_C);
			if (!Number.isFinite(v)) continue;
			m.set(id, v);
			lo = Math.min(lo, v); hi = Math.max(hi, v);
		}
		if (!m.size) return null;
		if (lo === hi) { lo -= 0.5; hi += 0.5; }
		return { m, lo, hi };
	});
	const legend: LegendSpec | null = $derived(tmax ? { title: 'T max per box', unit: '°C', range: { min: tmax.lo, max: tmax.hi }, scale: 'linear', table: 'Thermal', reverse: false, note: `derived per-box maximum of run ${wb.run?.study ?? ''}${wb.stale.any ? ' (stale)' : ''}; boxes not in the run are grey` } : null);
	const lut = colormapLut('Thermal');
	function tColor(v: number | undefined): THREE.Color {
		if (v == null || !tmax) return new THREE.Color(0x6a6a66);
		const i = Math.max(0, Math.min(255, Math.round(((v - tmax.lo) / (tmax.hi - tmax.lo)) * 255)));
		return new THREE.Color(`rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`);
	}
	function styleOf(p: SimPart): BoxStyle {
		const cls = p.array ? arrayClass(p.kind) : materialClass(p.material, p.kind);
		const base = new THREE.Color(CLASS_COLOR[cls] ?? CLASS_COLOR.other);
		const pv = partProv(p);
		const xray = wb.xray && (hosts.has(p.id) || xrayIds.has(p.id) || p.kind === 'em_dielectric' || p.kind === 'mold' || p.kind === 'underfill' || p.xray_default === true);
		const color = tmax ? tColor(tmax.m.get(p.id)) : pv.prov === 'template' ? templateColor(base) : base;
		// EM solids carry per-solid refs, not the package dims provenance: plain edges
		return { color, edge: p.kind.startsWith('em_') ? 'solid' : edgeStyle(p), xray };
	}

	const extent = $derived.by(() => {
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
		for (const p of wb.parts) {
			x0 = Math.min(x0, p.x_mm - p.w_mm / 2); x1 = Math.max(x1, p.x_mm + p.w_mm / 2);
			y0 = Math.min(y0, p.y_mm - p.d_mm / 2); y1 = Math.max(y1, p.y_mm + p.d_mm / 2);
		}
		return Number.isFinite(x0) ? { x0, x1, y0, y1 } : { x0: -1, x1: 1, y0: -1, y1: 1 };
	});
	const clipRange = $derived(wb.clipAxis === 'x' ? [extent.x0, extent.x1] : [extent.y0, extent.y1]);
	// a section position from another case or the other axis can lie outside this model, which trims every box away
	// (blank view, degenerate camera fit): re-centre it once the parts exist (L24 G7)
	$effect(() => {
		const [lo, hi] = clipRange;
		if (!wb.parts.length) return;
		const p = untrack(() => wb.clipPos);
		if (!(p >= lo && p <= hi)) wb.clipPos = Number(((lo + hi) / 2).toPrecision(6));
	});
	// slice position inside the result grid along the slice normal (was only enforced while a Results page was open)
	$effect(() => {
		const g = wb.run?.result.grid;
		const a = !g ? null : wb.pg.sliceAxis === 'x' ? g.xs : wb.pg.sliceAxis === 'y' ? g.ys : g.zs;
		if (!a?.length) return;
		const lo = a[0] * 1e3, hi = a[a.length - 1] * 1e3;
		const p = untrack(() => wb.pg.slicePos);
		if (!(p >= lo && p <= hi)) wb.pg.slicePos = Number(((lo + hi) / 2).toPrecision(6));
	});

	// em2d section of the selected variant: the runner's own patch (engine em2d applyPatch) on the case em2d block (L24 O7)
	let emSec = $state.raw<{ id: string; section: Record<string, unknown> | null; err: string } | null>(null);
	$effect(() => {
		const e = wb.isEm && wb.emFamily === 'em2d' ? (wb.raw?.em2d as Record<string, unknown> | undefined) : undefined;
		const id = wb.emVariant;
		const v = id === 'base' ? null : ((e?.variants ?? []) as Record<string, unknown>[]).find((x) => x?.id === id);
		if (!e || !v?.patch) {
			emSec = null;
			return;
		}
		let live = true;
		const mod = loadModule('em2d');
		if (!mod) {
			emSec = { id, section: null, err: 'engine/src/em2d is not in this build' };
			return;
		}
		mod.then((m) => {
			if (!live) return;
			try {
				const out = (m.applyPatch as (b: unknown, p: unknown) => Record<string, unknown>)(e, v.patch);
				emSec = { id, section: (out.section as Record<string, unknown>) ?? null, err: '' };
			} catch (err) {
				emSec = { id, section: null, err: err instanceof Error ? err.message : String(err) };
			}
		});
		return () => {
			live = false;
		};
	});
	const emVariants = $derived(((wb.raw?.em2d?.variants ?? []) as unknown[]).length);

	// edges switched on by the Mesh plot group go off with any other expression (L24 G14, A10 M5)
	$effect(() => {
		if (wb.pg.expr !== 'cellsize') untrack(() => wb.dropMeshWire());
	});

	// ---- result field (U2) ------------------------------------------------------------------------------------
	const fieldOn = $derived(wb.gview === 'field' && !!wb.post);
	type Layer = { data: SurfaceOut; kind: 'surface' | 'slice' | 'iso'; scale: [number, number] };
	let layers = $state.raw<Layer[]>([]);
	let layersA = $state.raw<Layer[]>([]);
	const sideOn = $derived(wb.compareMode === 'side' && !!wb.compareA && fieldOn);
	let hostA: HTMLDivElement | undefined = $state();
	let canvasA: HTMLCanvasElement | undefined = $state();
	let viewerA = $state.raw<BoxViewer | null>(null);
	$effect(() => {
		if (sideOn && hostA && canvasA && !viewerA) {
			const v = new BoxViewer(hostA, canvasA);
			v.controls.enabled = false;
			v.setFieldMode(true);
			v.setBackground(getComputedStyle(hostA).getPropertyValue('--bg'));
			viewerA = v;
			if (debug) (window as unknown as Record<string, unknown>).__simViewerA = v;
		} else if (!sideOn && viewerA) {
			viewerA.dispose();
			viewerA = null;
			layersA = [];
		}
	});
	// refit when the panes split or join (the main pane changes width)
	$effect(() => {
		void sideOn;
		const v = untrack(() => viewer);
		if (v) setTimeout(() => v.preset(untrack(() => wb.view)), 60);
	});
	/** Camera of A follows the main view. */
	function syncA() {
		if (!viewer || !viewerA) return;
		viewerA.camera.position.copy(viewer.camera.position);
		viewerA.camera.quaternion.copy(viewer.camera.quaternion);
		viewerA.controls.target.copy(viewer.controls.target);
		viewerA.camera.near = viewer.camera.near;
		viewerA.camera.far = viewer.camera.far;
		viewerA.camera.updateProjectionMatrix();
		viewerA.requestRender();
	}
	$effect(() => {
		if (!viewerA) return;
		viewerA.setKz(wb.kz);
		viewerA.field.setLayers(layersA.map((l) => ({ data: l.data, opacity: l.kind === 'iso' ? 0.85 : 1, wire: false, scale: l.scale, clip: l.kind !== 'surface' })));
		// one colour range only when A and B show the same quantity; else A keeps its own automatic range (L24 G17)
		const rA = sameQtyA ? range : rangeA;
		const dA = sameQtyA ? disp : dispA;
		if (rA) viewerA.field.setStyle({ table: wb.pg.table, reverse: wb.pg.reverse, min: rA.min, max: rA.max, log: sameQtyA && wb.pg.scale === 'log', affA: dA.a, affB: dA.b, dscale: 0 }, ui.theme === 'dark');
		syncA();
	});
	let fieldErr = $state('');
	// difference only when A and B are both thermal on the same grid (wb.diffBlock; audit A10 M3)
	const diffOn = $derived(wb.compareMode === 'diff' && !wb.diffBlock);
	const disp = $derived(fieldDisplay(diffOn ? 'dT' : wb.pg.expr, wb.pg.unit));
	const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === '1';
	/** Display transforms: identity plus the mirrored copies of a symmetry crop (x = 0 and / or y = 0 planes). */
	function transformsOf(sym: string): [number, number][] {
		const mx = wb.pg.mirror && (sym === 'half_x' || sym === 'quarter'), my = wb.pg.mirror && (sym === 'half_y' || sym === 'quarter');
		const out: [number, number][] = [[1, 1]];
		if (mx) out.push([-1, 1]);
		if (my) out.push([1, -1]);
		if (mx && my) out.push([-1, -1]);
		return out;
	}
	const transforms = $derived(transformsOf(wb.run?.symmetry ?? 'none'));
	// requests per display transform: the clip / slice plane is mapped into the data frame of each copy, so a
	// section through a mirrored model is cut where it is drawn (a newer request on a channel drops the older reply)
	type LayerReq = { expr: FieldExpr; surface: boolean; slice: boolean; ax: 'x' | 'y' | 'z'; pos: number; clip: { axis: 'x' | 'y' | 'z'; pos_m: number; keep: '+' | '-' } | null; synthetic: boolean; point: number; iso: number[] | null };
	function requestLayers(post: PostClient, r: LayerReq, tr: [number, number][], ch: string): Promise<Layer[]> {
		const flip = (a: 'x' | 'y' | 'z', s: [number, number]) => (a === 'x' && s[0] < 0) || (a === 'y' && s[1] < 0);
		const jobs: Promise<Layer | null>[] = [];
		tr.forEach((s, i) => {
			if (r.surface) {
				const clip = r.clip && flip(r.clip.axis, s) ? { axis: r.clip.axis, pos_m: -r.clip.pos_m, keep: (r.clip.keep === '+' ? '-' : '+') as '+' | '-' } : r.clip;
				jobs.push(post.request<SurfaceOut>({ op: 'surface', expr: r.expr, clip, synthetic: r.synthetic, point: r.point }, `${ch}surface:${i}`).then((d) => ({ data: d, kind: 'surface' as const, scale: s })));
			}
			if (r.slice) {
				const p = flip(r.ax, s) ? -r.pos : r.pos;
				jobs.push(post.request<SurfaceOut>({ op: 'slice', expr: r.expr, axis: r.ax, pos_m: p / 1e3, point: r.point }, `${ch}slice:${i}`).then((d) => ({ data: d, kind: 'slice' as const, scale: s })));
			}
			if (r.iso?.length) jobs.push(post.request<SurfaceOut>({ op: 'iso', expr: r.expr, levels: r.iso, point: r.point }, `${ch}iso:${i}`).then((d) => ({ data: d, kind: 'iso' as const, scale: s })));
		});
		return Promise.all(jobs).then((ls) => ls.filter((l): l is Layer => !!l && l.data.faces > 0));
	}
	/** Iso levels (SI): explicit list in display units, or isoN levels evenly inside the current range. */
	const isoLevels = $derived.by((): number[] | null => {
		if (!wb.pg.iso) return null;
		const txt = wb.pg.isoLevels.trim();
		if (txt) return txt.split(/[,\s]+/).map(Number).filter(Number.isFinite).map((v) => (v - disp.b) / disp.a);
		const r = layerRange;
		if (!r) return null;
		const n = Math.max(1, Math.min(20, Math.round(wb.pg.isoN)));
		return Array.from({ length: n }, (_, k) => r[0] + ((k + 1) * (r[1] - r[0])) / (n + 1));
	});
	// range (SI) of the surface / slice layers, for automatic iso levels (iso layers excluded)
	let layerRange = $state.raw<[number, number] | null>(null);
	/** Display copies of the last fitted field layers (camera refit when they change). */
	let copiesFit = '';
	/** A's reference field as last sent, per B client: a new B worker (recompute) needs it again (L24 G5). */
	let refSent: { post: PostClient; ref: unknown } | null = null;
	let layersOf: PostClient | null = null;
	$effect(() => {
		const post = wb.post;
		if (post !== layersOf) {
			// layers of another solution (previous run, case) must not be drawn or ranged while the new ones load
			layersOf = post;
			layers = [];
			layerRange = null;
		}
		if (!fieldOn || !post) return;
		const pg = wb.pg;
		const req: LayerReq = {
			expr: diffOn ? 'dT' : pg.expr, surface: pg.surface, slice: pg.slice, ax: pg.sliceAxis, pos: pg.slicePos,
			clip: wb.clipOn ? { axis: wb.clipAxis, pos_m: wb.clipPos / 1e3, keep: (wb.clipAxis === 'x' ? '-' : '+') as '+' | '-' } : null,
			synthetic: debug && pg.deform && !wb.run?.result.mech, point: pg.point, iso: isoLevels
		};
		const tr = transforms;
		// difference A - B: A's nodal T is sent once to B's worker
		const refT = diffOn ? (wb.compareA!.run.result.fields.T_K ?? null) : null;
		const pre = diffOn && (refSent?.post !== post || refSent.ref !== refT) ? post.request({ op: 'setRef', field: refT ? Float64Array.from(refT) : null }, 'setRef').then(() => (refSent = { post, ref: refT })) : Promise.resolve();
		pre
			.then(() => requestLayers(post, req, tr, ''))
			.then((ls) => {
				layers = ls;
				fieldErr = '';
				const fr = ls.filter((l) => l.kind !== 'iso');
				layerRange = fr.length ? [Math.min(...fr.map((l) => l.data.range[0])), Math.max(...fr.map((l) => l.data.range[1]))] : null;
				const surf = ls.filter((l) => l.kind === 'surface'), sl = ls.filter((l) => l.kind === 'slice');
				wb.paint.surfaceMs = surf.length ? Math.max(...surf.map((l) => l.data.ms)) : null;
				wb.paint.sliceMs = sl.length ? Math.max(...sl.map((l) => l.data.ms)) : null;
				wb.paint.faces = ls.reduce((a, l) => a + l.data.faces, 0);
				// iso requested but no level crosses the field: the page says so instead of drawing nothing silently
				wb.paint.isoFaces = req.iso?.length ? ls.filter((l) => l.kind === 'iso').reduce((a, l) => a + l.data.faces, 0) : null;
			})
			.catch((e) => {
				if (!(e instanceof StaleReply)) fieldErr = e instanceof Error ? e.message : String(e);
			});
		// side-by-side A: same requests on A's worker (A keeps its own expression set: T or uz)
		if (wb.compareMode === 'side' && wb.compareA && viewerA) {
			const a = wb.compareA;
			const exprA = exprAOf(a.run.result.mech, req.expr);
			const nA = a.run.result.mech?.points.length ?? 1;
			requestLayers(a.post, { ...req, expr: exprA, synthetic: false, point: Math.max(0, Math.min(req.point, nA - 1)) }, transformsOf(a.run.symmetry), 'A:')
				.then((ls) => (layersA = ls))
				.catch(() => {});
		}
	});
	// arrows (heat flux or displacement), density = target count
	let arrowData = $state.raw<{ pos: Float32Array; vec: Float32Array; mag: Float32Array; n: number; stride: number; ms: number } | null>(null);
	$effect(() => {
		const post = wb.post;
		if (!fieldOn || !post || !wb.pg.arrows) {
			arrowData = null;
			return;
		}
		const kind = wb.run?.result.mech ? 'u' : wb.pg.arrowKind;
		post.request<typeof arrowData>({ op: 'arrows', kind, target: wb.pg.arrowN, point: wb.pg.point }, 'arrows').then((d) => (arrowData = d)).catch(() => {});
	});
	$effect(() => {
		if (!viewer) return;
		const L = Math.max(extent.x1 - extent.x0, extent.y1 - extent.y0);
		viewer.field.arrows.set(arrowData, { maxLen: 0.06 * L, normalized: wb.pg.arrowNorm, table: wb.pg.table, reverse: wb.pg.reverse, log: false, kz: wb.kz, transforms, clip: wb.clipOn ? { axis: wb.clipAxis, pos_mm: wb.clipPos } : null });
		viewer.requestRender();
	});
	/** Expression drawn for run A (A keeps its own expression set: T, or uz / |u| / vM for mechanics). */
	function exprAOf(mech: unknown, e: FieldExpr): FieldExpr {
		return mech ? (e === 'T' ? 'uz' : e) : e === 'uz' || e === 'umag' || e === 'vm' ? 'T' : e;
	}
	const exprA = $derived(wb.compareA ? exprAOf(wb.compareA.run.result.mech, wb.pg.expr) : null);
	const sameQtyA = $derived(exprA === wb.pg.expr);
	const dispA = $derived(fieldDisplay(exprA ?? wb.pg.expr, wb.pg.unit));
	const rangeA = $derived.by(() => {
		let lo = Infinity, hi = -Infinity;
		for (const l of layersA) { if (l.kind === 'iso') continue; lo = Math.min(lo, l.data.range[0]); hi = Math.max(hi, l.data.range[1]); }
		if (!Number.isFinite(lo)) return null;
		const a = lo * dispA.a + dispA.b, b = hi * dispA.a + dispA.b;
		return a === b ? { min: a - 0.5, max: b + 0.5 } : { min: a, max: b };
	});
	// automatic range over the shown layers (display units)
	const autoRange = $derived.by(() => {
		let lo = Infinity, hi = -Infinity;
		const shared = wb.compareMode === 'side' && wb.compareA && sameQtyA ? layersA : [];
		for (const l of [...layers, ...shared]) { if (l.kind === 'iso') continue; lo = Math.min(lo, l.data.range[0]); hi = Math.max(hi, l.data.range[1]); }
		if (!Number.isFinite(lo)) return null;
		const a = lo * disp.a + disp.b, b = hi * disp.a + disp.b;
		return a === b ? { min: a - 0.5, max: b + 0.5 } : { min: a, max: b };
	});
	const range = $derived(wb.pg.range === 'manual' ? { min: wb.pg.min, max: wb.pg.max } : autoRange);
	// COMSOL automatic deformation scale: max displacement drawn as about 10 % of the geometry size
	const dAuto = $derived.by(() => {
		const d = layers.find((l) => l.kind === 'surface')?.data.disp;
		if (!d) return 1;
		let m = 0;
		for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
		const L = Math.max(extent.x1 - extent.x0, extent.y1 - extent.y0);
		return m > 0 ? (0.1 * L) / (m * 1e3) : 1;
	});
	$effect(() => {
		if (wb.pg.dscaleAuto) wb.pg.dscale = Number(dAuto.toPrecision(3));
	});
	$effect(() => {
		if (!viewer) return;
		viewer.setFieldMode(fieldOn);
		const both = wb.pg.slice && wb.pg.surface;
		const isoOn = layers.some((l) => l.kind === 'iso');
		viewer.field.setLayers(layers.map((l) => ({ data: l.data, opacity: (both || isoOn) && l.kind === 'surface' ? 0.25 : l.kind === 'iso' ? 0.85 : 1, wire: wb.pg.wire && l.kind !== 'iso', scale: l.scale, clip: l.kind !== 'surface' })));
		// the drawn copies changed (mirror toggled): refit the camera to the new extent (L24 O1)
		const copies = [...new Set(layers.map((l) => l.scale.join(',')))].sort().join(' ');
		if (fieldOn && layers.length && copiesFit && copies !== copiesFit) viewer.preset(wb.view);
		if (fieldOn && layers.length) copiesFit = copies;
		const surf = layers.find((l) => l.kind === 'surface')?.data;
		if (fieldOn && surf)
			untrack(() => {
				if (wb.paint.firstMs != null || !wb.resultAt) return;
				wb.paint.firstMs = performance.now() - wb.resultAt;
				wb.addLog(`First field paint ${Math.round(wb.paint.firstMs)} ms after the result (surface ${surf.faces.toLocaleString()} faces, worker ${Math.round(surf.ms)} ms)`);
			});
		viewer.requestRender();
	});
	$effect(() => {
		void ui.theme;
		void layers;
		if (!viewer || !range) return;
		const pg = wb.pg;
		viewer.field.setStyle({ table: pg.table, reverse: pg.reverse, min: range.min, max: range.max, log: pg.scale === 'log', affA: disp.a, affB: disp.b, dscale: pg.deform ? pg.dscale : 0 }, ui.theme === 'dark');
		viewer.requestRender();
	});
	const fieldLegend: LegendSpec | null = $derived(fieldOn && range ? { title: disp.label, unit: disp.unit, range, scale: wb.pg.scale === 'log' ? 'log' : 'linear', table: wb.pg.table, reverse: wb.pg.reverse, note: `${wb.pg.range === 'manual' ? 'manual range' : 'automatic range over the shown layers'}; run ${wb.run?.study ?? ''}${wb.stale.any ? ' (stale)' : ''}` } : null);
	let fprobe = $state<{ x: number; y: number; lines: string[]; pin: { x: number; y: number; z: number; value: number; part: string; material: string } } | null>(null);
	function probeField(e: PointerEvent) {
		if (!viewer) return null;
		const h = viewer.pickField(e.clientX, e.clientY);
		if (!h) return null;
		const l = viewer.field.layers[h.layer];
		const vSI = viewer.field.valueAt(h.layer, h.face, h.p);
		const v = vSI * disp.a + disp.b;
		const g = wb.run?.result.grid;
		const cell = l.data.faceCell[h.face];
		const pi = g?.cellPart?.[cell] ?? -1;
		const part = pi >= 0 ? (g?.partIds?.[pi] ?? String(pi)) : 'void';
		const material = pi >= 0 ? (g?.partMats?.[pi] ?? '') : '';
		return { v, part, material, p: h.at };
	}

	onMount(() => {
		try {
			viewer = new BoxViewer(host, canvas);
		} catch (e) {
			webgl = false;
			wb.addNotice(`WebGL unavailable: ${e instanceof Error ? e.message : String(e)}`, 'error');
			return;
		}
		viewer.onRender = drawOverlay;
		(window as unknown as Record<string, unknown>).__simViewer = import.meta.env.DEV || new URLSearchParams(location.search).get('debug') === '1' ? viewer : undefined;
		return () => {
			viewer?.dispose();
			viewer = null;
		};
	});

	$effect(() => {
		void ui.theme;
		if (!viewer) return;
		viewer.setBackground(getComputedStyle(host).getPropertyValue('--bg'));
	});
	$effect(() => {
		const parts = wb.parts;
		void wb.xray;
		void hosts;
		void xrayIds;
		void tmax;
		if (!viewer) return;
		viewer.setParts(parts, parts.map(styleOf));
	});
	$effect(() => {
		if (!viewer) return;
		const c = wb.clipOn ? { axis: wb.clipAxis, pos_mm: wb.clipPos } : null;
		viewer.setClip(c);
		viewer.field.setClip(c);
		viewerA?.field.setClip(c);
	});
	$effect(() => {
		viewer?.setKz(wb.kz);
	});
	// pins are drawn on the overlay: repaint when they change (Clear, programmatic edits) or the mirror toggles (L24 O1)
	$effect(() => {
		void wb.probes;
		void wb.pg.mirror;
		viewer?.requestRender();
	});
	$effect(() => {
		viewer?.setSelected(wb.hoverPart ? [...wb.selectedParts, wb.hoverPart] : wb.selectedParts);
	});
	$effect(() => {
		void wb.zoomRequest;
		void wb.parts.length;
		viewer?.preset(wb.view);
	});

	function drawOverlay() {
		if (!overlay || !viewer) return;
		syncA();
		const dpr = window.devicePixelRatio || 1;
		const W = host.clientWidth, H = host.clientHeight;
		overlay.width = Math.round(W * dpr);
		overlay.height = Math.round(H * dpr);
		overlay.style.width = `${W}px`;
		overlay.style.height = `${H}px`;
		const ctx = overlay.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const cs = getComputedStyle(host);
		const ox = 34, oy = H - 34, L = 22;
		const ax = viewer.axes();
		ctx.font = '10px system-ui, sans-serif';
		ctx.lineWidth = 1.5;
		for (const [name, d, col] of [['x', ax.x, '#d0503b'], ['y', ax.y, '#3fae7a'], ['z', ax.z, '#3987e5']] as const) {
			ctx.strokeStyle = col;
			ctx.fillStyle = col;
			ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + d[0] * L, oy + d[1] * L); ctx.stroke();
			ctx.fillText(name, ox + d[0] * (L + 7) - 3, oy + d[1] * (L + 7) + 3);
		}
		ctx.fillStyle = cs.getPropertyValue('--ink-3');
		ctx.fillText(`z x${wb.kz}`, ox - 16, oy + 26);
		const lg = fieldOn ? fieldLegend : legend;
		if (lg) drawLegend(ctx, W - LEGEND_W - 8, 8, LEGEND_W, Math.min(220, H - 16), lg, ui.theme === 'dark');
		if (fieldOn) {
			// pinned probes
			ctx.fillStyle = cs.getPropertyValue('--accent');
			ctx.strokeStyle = ui.theme === 'dark' ? '#000' : '#fff';
			wb.probes.forEach((q, i) => {
				if (!wb.probeDrawn(q)) return; // pin on a mirrored copy that is not drawn (L24 O1)
				const s = viewer!.project(q.x, q.y, q.z * 1000);
				ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
				ctx.fillText(String(i + 1), s.x + 6, s.y - 4);
			});
			ctx.fillStyle = cs.getPropertyValue('--ink-3');
			ctx.fillText(`${disp.label}${wb.pg.deform ? `, deformation x${fmt(wb.pg.dscale, 3)}` : ''}`, 70, H - 8);
		}
	}

	let raf = 0;
	function onMove(e: PointerEvent) {
		if (!viewer || e.buttons) { hover = null; fprobe = null; return; }
		if (fieldOn) {
			hover = null;
			const ev = e;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const r = host.getBoundingClientRect();
				const q = probeField(ev);
				fprobe = q ? { x: ev.clientX - r.left, y: ev.clientY - r.top, lines: [`${disp.label} ${fmt(q.v, 5)} ${disp.unit}`, `${q.part}${q.material ? ` · ${q.material}` : ''}`, `x ${fmt(q.p.x, 4)} mm, y ${fmt(q.p.y, 4)} mm, z ${fmt(q.p.z * 1000, 5)} µm`, 'click: pin'], pin: { x: q.p.x, y: q.p.y, z: q.p.z, value: q.v, part: q.part, material: q.material } } : null;
			});
			return;
		}
		const hit = viewer.pick(e.clientX, e.clientY);
		const r = host.getBoundingClientRect();
		hover = hit ? { hit, x: e.clientX - r.left, y: e.clientY - r.top } : null;
	}
	let downAt: { x: number; y: number } | null = null;
	function onUp(e: PointerEvent) {
		if (!downAt || !viewer || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return;
		if (fieldOn) {
			const q = probeField(e);
			if (q) {
				wb.probes = [...wb.probes, { x: q.p.x, y: q.p.y, z: q.p.z, value: q.v, unit: disp.unit, part: q.part, material: q.material }];
				wb.addLog(`Probe ${wb.probes.length}: ${disp.label} ${fmt(q.v, 6)} ${disp.unit} at (${fmt(q.p.x, 5)}, ${fmt(q.p.y, 5)}, ${fmt(q.p.z, 5)}) mm, ${q.part}`);
				wb.node = 'res.probes';
				viewer.requestRender();
			}
			return;
		}
		const hit = viewer.pick(e.clientX, e.clientY);
		if (hit && wb.pickChannel) {
			void wb.openChannel(hit.part);
			return;
		}
		if (hit) {
			wb.selectedParts = [hit.part.id];
			wb.node = `part:${hit.part.id}`;
			wb.settingsTab = 'settings';
		} else wb.selectedParts = [];
	}
	function onKey(e: KeyboardEvent) {
		const el = e.target as HTMLElement | null;
		if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'f' || e.key === 'F') viewer?.preset(wb.view);
		else if (['1', '2', '3', '4'].includes(e.key)) {
			wb.view = VIEW_PRESETS[Number(e.key) - 1];
			viewer?.preset(wb.view);
		} else return;
		e.preventDefault();
	}
	function exportPng() {
		if (!viewer) return;
		const d = new Date();
		const p2 = (n: number) => String(n).padStart(2, '0');
		downloadDataUrl(`${wb.caseId.replace(/[^\w.-]+/g, '_')}-geometry-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.png`, viewer.toPng());
	}
	const hoverTip = $derived.by(() => {
		if (!hover) return [];
		const p = hover.hit.part;
		const pv = partProv(p);
		return [
			`${p.id}${p.name && p.name !== p.id ? ` · ${p.name}` : ''}`,
			`${p.kind} · ${p.material}`,
			`${fmt(p.w_mm, 4)} x ${fmt(p.d_mm, 4)} mm, h ${fmt(p.h_um, 4)} µm, z ${fmt(p.z_um, 5)} µm`,
			`provenance ${pv.prov}${pv.user ? ' (user)' : ''}`,
			`at x ${fmt(hover.hit.x_mm, 4)} mm, y ${fmt(hover.hit.y_mm, 4)} mm, z ${fmt(hover.hit.z_um, 5)} µm`
		];
	});
</script>

<svelte:window onkeydown={onKey} />
<div class="gfx" class:nobar={wb.isEm && wb.emFamily === 'em2d'}>
	<div class="bar" class:hide={wb.isEm && wb.emFamily === 'em2d'}>
		<div class="seg" role="group" aria-label="Graphics content"><button class:on={wb.gview === 'geometry'} onclick={() => (wb.gview = 'geometry')} data-tip="Box geometry of the current parameters">geometry</button><button class:on={wb.gview === 'field'} disabled={!wb.post} onclick={() => (wb.gview = 'field')} data-tip={wb.post ? 'Result field of the last Compute' : 'No solution held (Compute a study)'}>result</button></div>
		<span class="sep"></span>
		{#each VIEW_PRESETS as p}<button class:on={wb.view === p} onclick={() => { wb.view = p; viewer?.preset(p); }} data-tip="Camera: {p}{p === 'front' && wb.clipOn ? ' (normal to the section face)' : ''}">{p}</button>{/each}
		<span class="sep"></span>
		<label class="chk" data-tip="Section: trim every box at the plane (exact; cut faces filled)"><input type="checkbox" bind:checked={wb.clipOn} /> section</label>
		<select bind:value={wb.clipAxis} aria-label="Section normal" disabled={!wb.clipOn} data-tip="Section plane normal (y: keeps y >= position; x: keeps x <= position)"><option value="y">y</option><option value="x">x</option></select>
		<input class="pos" type="range" min={clipRange[0]} max={clipRange[1]} step={(clipRange[1] - clipRange[0]) / 400 || 0.01} bind:value={wb.clipPos} disabled={!wb.clipOn} aria-label="Section position" data-tip="Section position {fmt(wb.clipPos, 4)} mm" />
		<span class="sep"></span>
		<label data-tip="Uniform z-exaggeration (display only; readouts stay in true units)">z <select bind:value={wb.kz} aria-label="z exaggeration">{#each KZ as k}<option value={k}>x{k}</option>{/each}</select></label>
{#if !fieldOn}
		<label data-tip="Box color: material class, or T max per box of the last thermal run (derived value; field plots are U2)">color <select bind:value={wb.colorBy} aria-label="Box color"><option value="material">material</option><option value="tmax" disabled={!wb.run?.result.derived?.parts}>T max</option></select></label>
		<label class="chk" data-tip="Draw host volumes (mold, underfill, parts that contain others) translucent"><input type="checkbox" bind:checked={wb.xray} /> x-ray</label>
		{/if}
		{#if !fieldOn && !wb.isEm}<button class:on={wb.pickChannel} onclick={() => (wb.pickChannel = !wb.pickChannel)} disabled={!wb.generated?.layers?.length} data-tip="Pick channel: click a routed conductor level (layer box) or a part with RDL / BEOL routing to open a regional EM 2D draft case (template set-up, every value with status)">pick channel</button>{/if}
		<span class="grow"></span>
		<button class="ib" onclick={() => viewer?.preset(wb.view)} disabled={!viewer} aria-label="Zoom extents" data-tip="Zoom extents (F); presets 1-4"><Icon name="extents" /></button>
		<button class="ib" onclick={exportPng} disabled={!viewer} aria-label="Export PNG" data-tip="Download the view as PNG (timestamped name)"><Icon name="image" /></button>
	</div>
	<div class="views" class:split={sideOn}>
	<div class="view" bind:this={host} onpointermove={onMove} onpointerleave={() => { hover = null; fprobe = null; }} onpointerdown={(e) => (downAt = { x: e.clientX, y: e.clientY })} onpointerup={onUp} role="img" aria-label="Geometry preview">
		<canvas bind:this={canvas}></canvas>
		<canvas class="ov" bind:this={overlay}></canvas>
		<div class="banner">
			{#if wb.generated?.source === 'fixture'}<span class="b muted" data-tip={wb.generated.note}>fixture geometry</span>{/if}
			{#if wb.genFailed}<span class="b crit" data-tip="The current parameters violate a generator constraint (Messages); the geometry shown is the last valid one">last valid geometry</span>{/if}
			{#if wb.stale.any && (fieldOn || wb.stale.geometry)}<span class="b warn" data-tip="Inputs changed since the last Compute; the result shown belongs to the previous run">stale</span>{/if}
			{#if fieldOn && wb.raw?.status === 'draft'}<span class="b warn" data-tip="Draft case: template loads and labelled material substitutions (Model node, assumptions); a UI exercise, not a prediction">draft inputs</span>{/if}
			{#if fieldOn && wb.pg.mirror && wb.run?.symmetry && wb.run.symmetry !== 'none'}<span class="b muted" data-tip="The model is a symmetry crop ({wb.run.symmetry}); mirrored copies are display only (COMSOL Mirror 3D)">mirrored ({wb.run.symmetry})</span>{/if}
			{#if sideOn}<span class="b muted" data-tip="Current run B (Compute); pinned run A in the right pane">B · {wb.caseId} · {wb.run?.study ?? '-'}</span>{/if}
			{#if fieldOn}<span class="b muted" data-tip="Triangles drawn (surface + slice, including mirrored copies)">{(wb.paint.faces * 2).toLocaleString()} tris</span>{:else}<span class="b muted" data-tip="Boxes in the grid input (parts, layer boxes, homogenized arrays)">{wb.parts.length} boxes</span>{/if}
		</div>
		<span class="legend" class:hide={fieldOn} data-tip="Edges: solid = w, d, h all non-template; dashed = some or all template (fill desaturated when all template); accent = user-edited"><i class="e solid"></i>R/D<i class="e dashed"></i>T<i class="e user"></i>U</span>
		{#if fieldOn ? fieldLegend : legend}<div class="legtip" style:width="{LEGEND_W}px" data-tip={legendTip((fieldOn ? fieldLegend : legend)!)}></div>{/if}
		
		{#if wb.isEm && wb.emFamily === 'em2d' && wb.raw?.em2d?.section}<div class="emsec"><EmSection section={emSec?.section ?? wb.raw.em2d.section} variant={emSec?.section ? emSec.id : emSec?.err ? `base (variant ${emSec.id} not drawn: ${emSec.err})` : emVariants ? 'base' : ''} /></div>{/if}
		{#if !webgl}<p class="nogl">WebGL is not available in this browser.</p>{/if}
		{#if fprobe}
			<div class="tip" style:left="{Math.min(fprobe.x + 14, host.clientWidth - 260)}px" style:top="{Math.min(fprobe.y + 14, host.clientHeight - 90)}px">{#each fprobe.lines as l}<div>{l}</div>{/each}</div>
		{/if}
		{#if fieldErr}<p class="nogl crit">{fieldErr}</p>{/if}
		{#if hover}
			<div class="tip" style:left="{Math.min(hover.x + 14, host.clientWidth - 260)}px" style:top="{Math.min(hover.y + 14, host.clientHeight - 90)}px">{#each hoverTip as l}<div>{l}</div>{/each}</div>
		{/if}
	</div>
	{#if sideOn}
		<div class="view viewA" bind:this={hostA} aria-label="Run A">
			<canvas bind:this={canvasA}></canvas>
			<div class="banner"><span class="b muted" data-tip={sameQtyA ? 'Pinned run A (camera follows the main view; shared color range)' : 'Pinned run A shows another quantity than B: own automatic range, same color table'}>A · {wb.compareA?.caseId} · {wb.compareA?.run.study}{!sameQtyA && rangeA ? ` · ${dispA.label} ${fmt(rangeA.min, 4)} to ${fmt(rangeA.max, 4)} ${dispA.unit}` : ''}</span></div>
		</div>
	{/if}
	</div>
</div>

<style>
	.gfx { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; background: var(--bg); }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; padding: 2px 4px; background: var(--surface); border-bottom: 1px solid var(--border); min-width: 0; }
	.bar button { height: 22px; padding: 0 6px; border-radius: 0; }
	.bar .ib { width: 24px; padding: 0; display: flex; align-items: center; justify-content: center; }
	.bar select { height: 22px; border-radius: 0; padding: 0 2px; }
	.bar label { display: flex; align-items: center; gap: 3px; color: var(--ink-2); }
	.sep { width: 1px; height: 16px; background: var(--border); margin: 0 3px; }
	.pos { width: 90px; accent-color: var(--accent); }
	.grow { flex: 1; }
	.legend { position: absolute; right: 8px; bottom: 6px; display: flex; align-items: center; gap: 4px; color: var(--ink-3); font-size: 11px; padding: 1px 4px; background: var(--surface); border: 1px solid var(--border); }
	.legend .e { display: inline-block; width: 14px; height: 0; border-top: 2px solid var(--ink-3); margin-left: 4px; }
	.legend .e.dashed { border-top-style: dashed; }
	.legend .e.user { border-top-color: var(--accent); }
	.views { position: relative; min-height: 0; display: flex; }
	.view { position: relative; min-height: 0; overflow: hidden; touch-action: none; flex: 1 1 0; min-width: 0; }
	.views.split .view { border-left: 1px solid var(--border); }
	canvas { position: absolute; inset: 0; display: block; }
	.ov { pointer-events: none; }
	.banner { position: absolute; top: 6px; left: 6px; display: flex; gap: 4px; pointer-events: auto; }
	.banner .b { font-size: 10px; padding: 0 4px; line-height: 15px; border: 1px solid currentColor; background: var(--surface); border-radius: 0; }
	.b.muted { color: var(--ink-3); border-color: var(--border); }
	.b.warn { color: var(--warn); }
	.b.crit { color: var(--crit); }
	.tip { position: absolute; pointer-events: none; background: var(--surface); border: 1px solid var(--line); padding: 4px 6px; font-size: 11px; white-space: nowrap; z-index: 2; border-radius: 0; max-width: 360px; overflow: hidden; text-overflow: ellipsis; }
	.legtip { position: absolute; top: 8px; right: 8px; height: 220px; }
	.emsec { position: absolute; inset: 0; z-index: 3; }
	.bar.hide { display: none; }
	.gfx.nobar { grid-template-rows: minmax(0, 1fr); }
	.seg { display: flex; }
	.seg button + button { border-left: 0; }
	.legend.hide { display: none; }
	.nogl.crit { color: var(--crit); }
	.nogl { position: absolute; inset: 40% 0 auto; text-align: center; color: var(--ink-3); }
</style>
