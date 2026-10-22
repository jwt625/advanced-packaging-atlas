// Ported from eo-modulator-atlas app/src/lib/sim/workbench.svelte.ts at eb97f96 (GPL-3.0-or-later).
// Local changes (generalized for 3D packaging): case YAML (sims/SPEC.md 1) instead of EO cross-section configs;
// family generator output (SPEC 2) as the geometry; staleness as a hash chain geometry -> mesh -> physics -> study
// (R7 5.5, COMSOL behavior: results kept and tagged stale); one solver worker per Compute (cancel = terminate);
// EO stage rules, sections, sweeps, results model and post client removed (U2+). Kept: runes state class, canonical
// YAML text with splice edits, URL overrides, timestamped log, notices, progress rows, clock().
import { parse as parseYaml } from 'yaml';
import type { Family, Package3D } from '../three/types';
import { applyOverrides, deleteIn, setIn, splitPath } from './yamlEdit';
import { GenerationIssues, generate, hasModule, presets as loadPresets, studyBlockReason } from './engine';
import { newSimWorker } from './pool';
import { PostClient } from './postClient';
import { addDefaultThermalStudy } from './defaults';
import { em3dParts } from './emResults';
import { channelCase, channelFor } from './channel';
import { materialLibrary } from './engine';
import type { ColormapName } from './colormap';
import type { FieldExpr, Generated, Preset, SimPart, ThermalResult, WorkerOut } from './protocol';
import type { ViewPreset } from './urlState';

export interface LogEntry {
	t: number;
	level: 'info' | 'warn' | 'error';
	msg: string;
}

export function clock(t: number): string {
	const d = new Date(t);
	const p = (n: number, w = 2) => String(n).padStart(w, '0');
	return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

export interface Study {
	id: string;
	type: string;
	[k: string]: unknown;
}

export interface RunRecord {
	study: string;
	keys: { geometry: string; mesh: string; physics: string; study: string };
	result: ThermalResult;
	ms: number;
	at: number;
	/** geometry.symmetry of the case at Compute time (field mirroring). */
	symmetry: string;
}

const stable = (v: unknown) => JSON.stringify(v ?? null);

export class Workbench {
	/** Canonical case YAML text (form edits splice into it). */
	text = $state('');
	/** Case id (`family/case`) or `family/session` for a family-only session. */
	caseId = $state('');
	fromFile = $state(false);
	node = $state('model');
	settingsTab = $state<'settings' | 'yaml'>('settings');
	bottomTab = $state<'messages' | 'progress' | 'log' | 'table'>('messages');
	loading = $state(false);
	busy = $state<null | 'run'>(null);
	progress = $state('');
	error = $state('');
	overrides = $state<[string, number | string][]>([]);
	log = $state<LogEntry[]>([]);
	progressRows = $state<LogEntry[]>([]);
	notices = $state<LogEntry[]>([]);
	// package3d.json (families, refs) for fixture geometry and reference tooltips
	p3d = $state.raw<Package3D | null>(null);
	/** URL of package3d.json for the worker (fetched once per worker and cached by the browser; audit M12). */
	p3dUrl = '';
	p3dFixture = $state(false);
	// geometry
	generated = $state.raw<Generated | null>(null);
	genError = $state('');
	genKey = $state('');
	/** The last parameter set violates a generator constraint; the geometry shown is the last valid one. */
	genFailed = $state(false);
	presetList = $state.raw<Preset[]>([]);
	// graphics
	view = $state<ViewPreset>('iso');
	clipOn = $state(false);
	clipAxis = $state<'x' | 'y'>('y');
	clipPos = $state(0);
	kz = $state(1);
	xray = $state(true);
	/** Box coloring: material class, or the per-box T max of the last thermal run (derived value, not a field plot). */
	colorBy = $state<'material' | 'tmax'>('material');
	selectedParts = $state<string[]>([]);
	hoverPart = $state<string | null>(null);
	zoomRequest = $state(0);
	/** Incremented on every case load: geometry and presets reload even when the new case has the same family,
	 * params and geometry block as the previous one (equal derived keys do not re-trigger the effects; L24 G1). */
	loadSeq = $state(0);
	// runs
	run = $state.raw<RunRecord | null>(null);
	studyId = $state('');
	baseText = '';
	private worker: Worker | null = null;
	/** Client of the worker that holds the last solution (null when no solution is held). */
	post = $state.raw<PostClient | null>(null);
	resultAt = 0;
	/** Graphics content: box geometry or result field layers. */
	gview = $state<'geometry' | 'field'>('geometry');
	/** Temperature plot group (R7 3.4 Surface + Slice features, 6.3 plot settings). */
	pg = $state({
		expr: 'T' as FieldExpr,
		/** Mechanics temperature point shown (index into the run's uniform_C list). */
		point: 0,
		unit: 'degC' as 'degC' | 'K',
		scale: 'linear' as 'linear' | 'log',
		range: 'auto' as 'auto' | 'manual',
		min: 0,
		max: 1,
		table: 'Rainbow' as ColormapName,
		reverse: false,
		surface: true,
		slice: false,
		sliceAxis: 'z' as 'x' | 'y' | 'z',
		slicePos: 0,
		wire: false,
		deform: false,
		dscaleAuto: true,
		dscale: 1,
		mirror: true,
		iso: false,
		isoN: 5,
		/** Explicit iso levels in display units (comma list); empty = isoN levels evenly inside the range. */
		isoLevels: '',
		arrows: false,
		arrowKind: 'flux' as 'flux' | 'u',
		arrowN: 400,
		arrowNorm: false
	});
	/** Compare runs (U4): run A pinned with its solution worker; the current run is B. */
	compareA = $state.raw<{ run: RunRecord; post: PostClient; worker: Worker; caseId: string } | null>(null);
	compareMode = $state<'off' | 'side' | 'diff'>('off');
	/** Pinned probes (package mm; value in display units at pin time). */
	probes = $state<{ x: number; y: number; z: number; value: number; unit: string; part: string; material: string }[]>([]);
	/** Expression of the last cut line. */
	cutExpr = $state<FieldExpr>('T');
	cutLine = $state.raw<{ axis: 'x' | 'y' | 'z'; at: [number, number, number]; s: Float64Array; v: Float64Array } | null>(null);
	/** First field paint after the result arrived (ms), and the last surface / slice worker times. */
	paint = $state<{ firstMs: number | null; surfaceMs: number | null; sliceMs: number | null; faces: number; isoFaces?: number | null }>({ firstMs: null, surfaceMs: null, sliceMs: null, faces: 0 });
	/** Mesh edges switched on by the Mesh plot group, not by the user: the field plot groups switch them off again
	 * (L24 G14; workbench state so a ModelTree remount keeps it, audit A10 M5). */
	meshWire = $state(false);
	/** EM variant shown on the result pages and on the em2d section canvas ('base' = the case as written; L24 O7). */
	emVariant = $state('base');
	private jobId = 0;
	private genSeq = 0;
	private presetSeq = 0;

	parsed: { raw: Raw | null; error: string } = $derived.by(() => {
		if (!this.text) return { raw: null, error: '' };
		try {
			const r = parseYaml(this.text) as unknown;
			if (!r || typeof r !== 'object' || Array.isArray(r)) return { raw: null, error: 'Case YAML is not a mapping' };
			return { raw: r as Raw, error: '' };
		} catch (e) {
			return { raw: null, error: e instanceof Error ? e.message : String(e) };
		}
	});
	raw = $derived(this.parsed.raw);
	familyId = $derived(typeof this.raw?.family === 'string' ? (this.raw.family as string) : '');
	family: (Family & { params?: Record<string, unknown> }) | null = $derived((this.p3d?.families.find((f) => f.id === this.familyId) as Family & { params?: Record<string, unknown> }) ?? null);
	/** 2D EM cross-section case (L7 em2d block): no 3D part list; its UI is tranche U3. */
	/** EM case (SPEC 9 em2d / SPEC 14 em3d): no 3D part list; one virtual study runs every variant. */
	isEm = $derived(this.familyId === 'em2d' || this.familyId === 'em3d' || !!this.raw?.em2d || !!this.raw?.em3d);
	emFamily = $derived((this.familyId === 'em3d' || this.raw?.em3d ? 'em3d' : 'em2d') as 'em2d' | 'em3d');
	/** DB target rows for the browser (app/static/data/sim_targets.json, L1), keyed by metric_id; null until loaded. */
	simTargets = $state.raw<Record<string, Record<string, unknown>> | null>(null);
	/** Load of sim_targets.json (set by the page); compute() awaits it so the first run gets the DB rows (audit A3 M10). */
	simTargetsLoad: Promise<unknown> | null = null;
	/** package3d.json did not load (404 or error): the page shows a banner; generator studies are refused (audit A3 M10). */
	p3dError = $state('');
	params = $derived((this.raw?.params && typeof this.raw.params === 'object' ? this.raw.params : {}) as Record<string, unknown>);
	studies: Study[] = $derived(this.isEm ? [{ id: 'em', type: this.emFamily }] : Array.isArray(this.raw?.studies) ? (this.raw!.studies as Study[]).filter((s) => s && typeof s.id === 'string') : []);
	parts = $derived(this.generated?.parts ?? []);
	/** Part kinds in first-use order with counts. */
	kinds = $derived.by(() => {
		const m = new Map<string, number>();
		for (const p of this.parts) m.set(p.kind, (m.get(p.kind) ?? 0) + 1);
		return [...m.entries()].map(([kind, n]) => ({ kind, n }));
	});
	// staleness chain (R7 5.5): each key includes its upstream key
	geometryKey = $derived(stable([this.familyId, this.params, this.raw?.geometry]));
	meshKey = $derived(stable([this.geometryKey, this.raw?.mesh]));
	physicsKey = $derived(stable([this.meshKey, this.raw?.materials, this.raw?.physics]));
	/** Study hash of one study id (its block plus the physics key). */
	studyKeyOf(id: string): string {
		return stable([this.physicsKey, this.studies.find((s) => s.id === id) ?? null]);
	}
	stale = $derived.by(() => {
		const r = this.run;
		if (!r) return { geometry: false, mesh: false, physics: false, study: false, any: false };
		const s = { geometry: r.keys.geometry !== this.geometryKey, mesh: r.keys.mesh !== this.meshKey, physics: r.keys.physics !== this.physicsKey, study: r.keys.study !== this.studyKeyOf(r.study) };
		return { ...s, any: s.geometry || s.mesh || s.physics || s.study };
	});
	study = $derived(this.studies.find((s) => s.id === this.studyId) ?? this.studies[0] ?? null);
	/** Why Compute is disabled now (null = runnable). */
	computeBlock = $derived.by(() => {
		if (this.loading) return 'Loading case';
		if (this.parsed.error) return `Case YAML does not parse: ${this.parsed.error}`;
		if (!this.raw) return 'No case loaded';
		if (!this.study) return 'The case has no studies block (add one in the YAML tab)';
		if (this.genError) return `Geometry: ${this.genError}`;
		if (this.p3dError && !this.isEm) return this.p3dError;
		if (this.generated?.warnings.some((w) => w.severity === 'error')) return 'Geometry has errors (Messages)';
		return studyBlockReason(this.study.type);
	});
	canRun = $derived(!this.busy && !this.computeBlock);
	/** Count of user overrides in the params block. */
	nUser = $derived(Object.keys(this.params).length);

	rawAt(path: string, doc: unknown = this.raw): any {
		let v: unknown = doc;
		for (const k of splitPath(path)) v = v == null ? undefined : (v as Record<string | number, unknown>)[k];
		return v;
	}

	addLog(msg: string, level: LogEntry['level'] = 'info') {
		this.log = [...this.log.slice(-499), { t: Date.now(), level, msg }];
		if (level === 'error') this.bottomTab = 'messages';
	}

	addNotice(msg: string, level: LogEntry['level'] = 'warn') {
		this.notices = [...this.notices.slice(-20), { t: Date.now(), level, msg }];
		this.addLog(msg, level);
	}

	/** Reset every per-case state (EO DevLog-043 R3 pattern); the log, view toggles and panel sizes are kept. */
	resetCaseState() {
		this.stopWorker();
		this.text = '';
		this.baseText = '';
		this.caseId = '';
		this.fromFile = false;
		this.node = 'model';
		this.settingsTab = 'settings';
		this.busy = null;
		this.progress = '';
		this.error = '';
		this.overrides = [];
		this.progressRows = [];
		this.notices = [];
		this.generated = null;
		this.genError = '';
		this.genKey = '';
		this.genFailed = false;
		this.presetList = [];
		this.selectedParts = [];
		this.hoverPart = null;
		this.run = null;
		this.studyId = '';
		this.colorBy = 'material';
		this.gview = 'geometry';
		this.probes = [];
		this.cutLine = null;
		this.emVariant = 'base';
	}

	/** Load a case text and apply URL overrides. */
	load(caseId: string, text: string, fromFile: boolean, overrides: [string, number | string][] = []) {
		this.resetCaseState();
		let t = text;
		if (overrides.length) {
			try {
				t = applyOverrides(text, overrides);
				this.overrides = overrides;
				this.addLog(`Applied ${overrides.length} URL override(s): ${overrides.map(([k, v]) => `${k}=${v}`).join(', ')}`);
			} catch (e) {
				this.addLog(`URL overrides not applied: ${e instanceof Error ? e.message : e}`, 'warn');
			}
		}
		this.caseId = caseId;
		this.fromFile = fromFile;
		this.text = t;
		this.baseText = text;
		this.loadSeq++;
		this.zoomRequest++;
	}

	/** Form edit: set a YAML path in the canonical text (comments and layout preserved). */
	edit(path: string, value: number | string | boolean) {
		try {
			this.text = setIn(this.text, splitPath(path), value);
			if (typeof value !== 'boolean') this.overrides = [...this.overrides.filter(([k]) => k !== path), [path, value]];
			this.addLog(`Set ${path} = ${value}`);
		} catch (e) {
			this.addLog(`Edit of ${path} failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Form field cleared: remove the key from the YAML. */
	clear(path: string) {
		try {
			this.text = deleteIn(this.text, splitPath(path));
			this.overrides = this.overrides.filter(([k]) => k !== path);
			this.addLog(`Removed ${path}`);
		} catch (e) {
			this.addLog(`Removal of ${path} failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Apply a product preset: each preset value becomes a params override (one log line). */
	applyPreset(p: Preset) {
		if (hasModule('families')) {
			// the generator expands `params.preset` itself (values and provenance from presets.mjs)
			this.edit('params.preset', p.id);
			return;
		}
		let t = this.text;
		try {
			for (const [k, v] of Object.entries(p.params)) t = setIn(t, ['params', k], v);
			this.text = t;
			this.overrides = [...this.overrides.filter(([k]) => !Object.hasOwn(p.params, k.replace(/^params\./, ''))), ...Object.entries(p.params).map(([k, v]) => [`params.${k}`, v as number | string] as [string, number | string])];
			this.addLog(`Preset ${p.label}: ${Object.entries(p.params).map(([k, v]) => `${k}=${v}`).join(', ')}`);
		} catch (e) {
			this.addLog(`Preset ${p.label} failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Cut line along an axis through a pinned probe (worker `line` op). */
	async lineThrough(i: number, axis: 'x' | 'y' | 'z') {
		const q = this.probes[i];
		if (!q || !this.post) return;
		try {
			// a pin on a mirrored copy of a symmetry crop maps back into the solved domain (x >= 0 and / or y >= 0)
			const sym = this.run?.symmetry ?? 'none';
			const mx = sym === 'half_x' || sym === 'quarter', my = sym === 'half_y' || sym === 'quarter';
			const at: [number, number, number] = [(mx ? Math.abs(q.x) : q.x) / 1e3, (my ? Math.abs(q.y) : q.y) / 1e3, q.z / 1e3];
			// the active plot expression (a mechanics session has no T field); cell-corner von Mises and cell size have no nodal line
			const ex = this.pg.expr;
			const lineExpr: FieldExpr = ex === 'uz' || ex === 'umag' || ex === 'T' ? ex : this.run?.result.mech ? 'uz' : 'T';
			if (ex !== lineExpr) this.addLog(`Cut line: ${ex} has no nodal values; plotting ${lineExpr}`, 'warn');
			const r = await this.post.request<{ s: Float64Array; v: Float64Array }>({ op: 'line', axis, p: at, expr: lineExpr, point: this.pg.point }, 'line');
			this.cutExpr = lineExpr;
			this.cutLine = { axis, at, s: r.s, v: r.v };
			this.node = 'res.cutline';
		} catch (e) {
			if (!(e instanceof Error && e.message === 'stale')) this.addLog(`Cut line failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Graphics click mode: pick a routed level to open a regional EM draft case. */
	pickChannel = $state(false);

	/** Open the em2d draft case of a picked level (channel.ts); the package case stays in the Case picker. */
	async openChannel(p: SimPart) {
		this.pickChannel = false;
		const layers = this.generated?.layers ?? [];
		const pick = channelFor(p, layers);
		if (!pick) {
			this.addNotice(`No routed conductor level at ${p.id} (pick a layer box or a part with RDL / BEOL routing)`, 'warn');
			return;
		}
		const lib = await materialLibrary().catch(() => null);
		const { id, text } = channelCase(pick, layers, this.familyId, lib);
		this.load(id, text, false);
		this.node = 'em.geo';
		this.addLog(`Pick channel: ${pick.layer.id} in ${pick.host} -> draft em2d case ${id} (template set-up; see assumptions and missing)`, 'warn');
	}

	/** Pin the current run (and its worker) as A; the next Compute becomes B. */
	pinA() {
		if (!this.run || !this.post || !this.worker) return;
		this.compareA?.worker.terminate();
		const w = this.worker, client = this.post;
		this.compareA = { run: this.run, post: client, worker: w, caseId: this.caseId };
		// replies of A's worker now go straight to A's client (the compute handler ignores a detached worker)
		w.onmessage = (ev: MessageEvent<WorkerOut>) => {
			if (ev.data.type === 'post') client.handle(ev.data);
		};
		// detach so the next Compute does not terminate it
		this.worker = null;
		this.post = null;
		// the main view holds no field until B arrives (A is drawn next to B then; L24 G10)
		if (this.gview === 'field') this.gview = 'geometry';
		this.compareMode = 'side';
		this.addLog(`Pinned run ${this.run.study} (${new Date(this.run.at).toISOString()}) as A; Compute again for B`);
	}

	unpinA() {
		this.compareA?.post.dispose();
		this.compareA?.worker.terminate();
		this.compareA = null;
		this.compareMode = 'off';
	}

	/** Why difference B - A is not available (null = available): both runs thermal (nodal T, the worker's dT op)
	 * on identical grids (audit A10 M3: A was not checked). */
	get diffBlock(): string | null {
		const a = this.compareA?.run.result, b = this.run?.result;
		if (!a || !b) return 'needs a pinned run A and a run B with fields';
		if (a.mech || b.mech || !a.fields?.T_K || !b.fields?.T_K) return `difference of temperature fields only (A ${a.mech ? 'mechanics' : 'thermal'}, B ${b.mech ? 'mechanics' : 'thermal'})`;
		if (!this.gridsMatch) return 'grids differ';
		return null;
	}

	/** A pinned probe lies on a drawn copy: the solved domain of a symmetry crop (x >= 0 and / or y >= 0) is always
	 * drawn, mirrored copies only while the mirror is on (L24 O1). */
	probeDrawn(q: { x: number; y: number }): boolean {
		if (this.pg.mirror) return true;
		const sym = this.run?.symmetry ?? 'none';
		const mx = sym === 'half_x' || sym === 'quarter', my = sym === 'half_y' || sym === 'quarter';
		return !(mx && q.x < -1e-9) && !(my && q.y < -1e-9);
	}

	/** Switch off mesh edges that the Mesh plot group switched on (a user's own setting is kept; L24 G14). */
	dropMeshWire() {
		if (!this.meshWire) return;
		this.pg.wire = false;
		this.meshWire = false;
	}

	/** A and B solved on identical grids (difference plot possible). */
	get gridsMatch(): boolean {
		const a = this.compareA?.run.result.grid, b = this.run?.result.grid;
		if (!a || !b || a.nx !== b.nx || a.ny !== b.ny || a.nz !== b.nz) return false;
		const eq = (x: Float64Array, y: Float64Array) => x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) <= 1e-12);
		return eq(a.xs, b.xs) && eq(a.ys, b.ys) && eq(a.zs, b.zs);
	}

	/** Splice the in-memory draft thermal study (defaults.ts; template loads, labelled substitutions). */
	async addDefaultStudy() {
		if (!this.raw || !this.parts.length) return;
		try {
			const lib = await materialLibrary();
			const { text, notes } = addDefaultThermalStudy(this.text, this.raw, $state.snapshot(this.parts) as SimPart[], lib);
			this.text = text;
			for (const n of notes) this.addLog(n, 'warn');
			this.node = 'study:s1';
		} catch (e) {
			this.addLog(`Default study not added: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** True when the text has edits that the shareable link cannot carry (free YAML-tab edits or removals). */
	get hasFreeEdits(): boolean {
		try {
			return applyOverrides(this.baseText, this.overrides) !== this.text;
		} catch {
			return true;
		}
	}

	/** Regenerate the part list when the family or params changed (coalesced; stale replies dropped). */
	async regenerate() {
		const fam = this.familyId;
		const params = $state.snapshot(this.params) as Record<string, unknown>;
		const key = stable([fam, params, !!this.p3d, this.isEm ? this.raw?.em3d ?? this.raw?.em2d ?? null : null]);
		if (!fam || key === this.genKey) return;
		this.genKey = key;
		if (this.isEm) {
			// em3d solids drawn in the box viewer; em2d sections on the 2D canvas (no 3D part list)
			this.generated = this.emFamily === 'em3d' ? { params: {}, parts: em3dParts(this.raw?.em3d), warnings: [], source: 'engine', note: 'em3d solids (case)', ms: 0 } : null;
			this.genError = '';
			return;
		}
		// generator families need package3d.json (data); the key includes !!p3d, so this runs again once it loaded
		// (a run before it threw an empty issue list: a "Geometry not regenerated" flash on first load; L24)
		if (!this.p3d) return;
		const seq = ++this.genSeq;
		try {
			const g = await generate(fam, params, this.family, this.p3d);
			if (seq !== this.genSeq) return;
			this.generated = g;
			this.genError = '';
			this.genFailed = false;
			const nErr = g.warnings.filter((w) => w.severity === 'error').length;
			this.addLog(`Geometry (${g.source}): ${g.parts.length} boxes in ${g.ms.toFixed(1)} ms${nErr ? `, ${nErr} error(s)` : ''}`);
		} catch (e) {
			if (seq !== this.genSeq) return;
			if (e instanceof GenerationIssues) {
				// constraint errors: keep the last valid geometry on screen, list the issues (Compute blocked)
				let prev = this.generated;
				if (!prev) prev = await generate(fam, {}, this.family, this.p3d).catch(() => null); // first load: family defaults
				if (seq !== this.genSeq) return;
				this.generated = prev ? { ...prev, warnings: e.issues } : { params: {}, parts: [], warnings: e.issues, source: 'engine', ms: 0 };
				this.genError = '';
				this.genFailed = true;
				this.addLog(`Geometry not regenerated: ${e.issues.map((i) => i.message).join('; ') || e.message}`, 'warn');
				return;
			}
			this.genError = e instanceof Error ? e.message : String(e);
			this.addLog(`Geometry failed: ${this.genError}`, 'error');
		}
	}

	async refreshPresets() {
		const fam = this.familyId;
		// a reply for an earlier case must not overwrite the presets of the current one (audit A10 M4)
		const seq = ++this.presetSeq;
		const list = fam ? await loadPresets(fam).catch(() => []) : [];
		if (seq === this.presetSeq) this.presetList = list;
	}

	private stopWorker() {
		this.post?.dispose();
		this.post = null;
		// no field is held any more: the graphics toggle must not stay on a disabled "result" (L24 G10)
		if (this.gview === 'field') this.gview = 'geometry';
		if (this.worker) {
			this.worker.onmessage = null;
			this.worker.onerror = null;
			this.worker.terminate();
		}
		this.worker = null;
	}

	stopAll() {
		this.unpinA();
		this.stopWorker();
		this.busy = null;
	}

	cancel() {
		if (!this.busy) return;
		this.stopWorker();
		this.busy = null;
		this.progress = 'Cancelled';
		this.progressRows = [...this.progressRows, { t: Date.now(), level: 'warn', msg: 'Cancelled (worker terminated)' }];
		this.addLog('Compute cancelled', 'warn');
	}

	async compute() {
		if (!this.canRun || !this.study) return;
		this.stopWorker();
		const study = this.study.id;
		// inputs as of the click (the targets wait below must not pick up later edits)
		const text = this.text, parts = $state.snapshot(this.parts) as SimPart[];
		const sym = String(this.raw?.geometry?.symmetry ?? 'none');
		const keys = { geometry: this.geometryKey, mesh: this.meshKey, physics: this.physicsKey, study: this.studyKeyOf(study) };
		const id = ++this.jobId;
		const started = performance.now();
		let last = started;
		this.error = '';
		this.busy = 'run';
		this.progress = `Compute ${study}`;
		this.paint = { firstMs: null, surfaceMs: null, sliceMs: null, faces: 0 };
		this.probes = [];
		this.cutLine = null;
		this.progressRows = [{ t: Date.now(), level: 'info', msg: `Compute: case ${this.caseId}, study ${study} (${this.study.type})` }];
		this.addLog(this.progressRows[0].msg);
		// the first Compute after page load may come before sim_targets.json arrived: wait for it (bounded)
		if (this.simTargetsLoad) {
			let timedOut = false;
			await Promise.race([this.simTargetsLoad.catch(() => null), new Promise((r) => setTimeout(() => { timedOut = true; r(null); }, 10000))]);
			if (this.jobId !== id || this.busy !== 'run') return; // cancelled or superseded meanwhile
			if (timedOut) this.addLog('sim_targets.json did not load within 10 s: targets of this run carry no DB values', 'warn');
		}
		try {
			const w = newSimWorker();
			this.worker = w;
			w.onmessage = (ev: MessageEvent<WorkerOut>) => {
				if (this.worker !== w) return;
				const d = ev.data;
				const now = performance.now();
				if (d.type === 'progress') {
					this.progress = d.message;
					if (d.phase === 'tick') return; // status line only (frequent events: frequency start, factor fraction)
					this.progressRows = [...this.progressRows, { t: Date.now(), level: 'info', msg: `${d.phase}: ${d.message} (previous step ${Math.round(now - last)} ms)` }];
					last = now;
					return;
				}
				if (d.type === 'post') {
					this.post?.handle(d);
					return;
				}
				if (d.type === 'result') {
					this.run = { study, keys, result: d.result, ms: now - started, at: Date.now(), symmetry: sym };
					this.resultAt = now;
					if (d.result.derived?.parts) this.colorBy = 'tmax';
					this.progress = 'Complete';
					this.progressRows = [...this.progressRows, { t: Date.now(), level: 'info', msg: `Complete in ${Math.round(now - started)} ms wall` }];
					this.addLog(`Compute ${study} complete in ${Math.round(now - started)} ms`);
					// the worker keeps the solution and serves Results requests (EO DevLog-030 P1)
					this.busy = null;
					if (d.result.em) {
						// EM results are JSON (no fields): the worker is not kept
						this.stopWorker();
						this.node = 'res.em.s';
						return;
					}
					if (d.result.mech?.fields === 'none' || (!d.result.mech && !d.result.fields?.T_K)) {
						// table-only result (no field arrays): no postprocessing session in the worker
						this.stopWorker();
						this.addLog(`Results: ${d.result.mech?.fields_note ?? 'no field in the result'}`, 'warn');
						this.node = d.result.mech ? 'res.warp' : 'res.derived';
						return;
					}
					this.post = new PostClient(w);
					this.gview = 'field';
					const why = this.compareMode === 'diff' ? this.diffBlock : null;
					if (why) {
						// B - A needs thermal A and B on identical grids: fall back to side by side and say why (L24 G6, A10 M3)
						this.compareMode = 'side';
						this.addLog(`Compare: difference B - A off (${why}); side by side shown`, 'warn');
					}
					if (d.result.mech) {
						this.dropMeshWire();
						this.pg.expr = 'uz';
						this.pg.scale = 'linear';
						this.pg.point = Math.max(0, d.result.mech.points.findIndex((p) => p.fields !== false));
						this.pg.deform = true;
						this.pg.dscaleAuto = true;
						this.node = 'res.disp';
					} else {
						if (this.pg.expr !== 'T' && this.pg.expr !== 'cellsize') this.pg.expr = 'T';
						this.pg.deform = false;
						// a mechanics page left open from an earlier run would show its placeholder (L24 G18)
						if (!this.node.startsWith('res') || ['res.disp', 'res.vm', 'res.warp'].includes(this.node)) this.node = 'res.T';
					}
					return;
				} else if (d.type === 'error') {
					// draft studies (template loads) can heat a model past the material data range: say what to change
					this.error = /outside valid_T_C/.test(d.message) && this.raw?.status === 'draft' ? `${d.message}. Draft study with template loads: lower physics.thermal.sources[0].power_W or raise the HTC in the YAML tab.` : d.message;
					this.progress = 'Stopped';
					this.progressRows = [...this.progressRows, { t: Date.now(), level: 'error', msg: d.message }];
					this.addLog(`Compute failed: ${this.error}`, 'error');
				}
				this.stopWorker();
				this.busy = null;
			};
			w.onerror = (ev) => {
				if (this.worker !== w) return;
				ev.preventDefault();
				this.error = ev.message || 'Worker failed';
				this.addLog(this.error, 'error');
				this.stopWorker();
				this.busy = null;
			};
			w.postMessage({ type: 'run', id, text, study, parts, dataUrl: this.p3dUrl, metrics: this.simTargets, rveLive: typeof location !== 'undefined' && new URLSearchParams(location.search).get('rve') === 'live' });
		} catch (e) {
			this.error = String(e);
			this.stopWorker();
			this.busy = null;
		}
	}
}
