<script lang="ts">
	// Ported from eo-modulator-atlas app/src/lib/sim/Settings.svelte at eb97f96 (GPL-3.0-or-later).
	// Local changes: packaging node pages (Model, Parameters, Materials, Geometry by kind and part, Mesh, Heat
	// Transfer, Solid Mechanics and EM placeholders, Study, Results); provenance badges with reference tooltips.
	// Kept: Settings / YAML tabs (the YAML tab is the canonical text; form edits splice into it), title bar, styles.
	import type { Workbench } from './workbench.svelte';
	import ParamsTable from './ParamsTable.svelte';
	import MaterialsTable from './MaterialsTable.svelte';
	import ResultPages from './ResultPages.svelte';
	import EmPages from './EmPages.svelte';
	import Field from './Field.svelte';
	import LinePlot from './LinePlot.svelte';
	import { STATUS_LETTER, STATUS_TIP, partProv, refIds, refTip } from './provenance';
	import { engineStatus, MODULE_LANE, studyBlockReason } from './engine';
	import { derivedRows, partRows as partTemps, tLineAtMax } from './results';
	import { unitOf } from './units';
	import { downloadText } from './exportUtil';
	import { fmt } from '../logic';
	import type { ParamStatus, SimPart } from './protocol';

	let { wb }: { wb: Workbench } = $props();
	const raw = $derived(wb.raw);
	const node = $derived(wb.node);
	const refs = $derived(wb.p3d?.refs ?? {});
	const eng = engineStatus();
	const titles: Record<string, string> = {
		model: 'Model', gdef: 'Global Definitions', params: 'Parameters', gmat: 'Materials (library)', comp: 'Component 1: Package (3D)',
		geometry: 'Geometry', cmat: 'Materials (component)', mesh: 'Mesh', ht: 'Heat Transfer in Solids', 'ht.solid': 'Solid (default)',
		'ht.ins': 'Thermal insulation (default)', solid: 'Solid Mechanics', emw: 'Electromagnetic Waves, Frequency Domain', study: 'Study',
		results: 'Results', 'em.mat': 'Materials (EM)', 'em.geo': 'Geometry', 'em.ports': 'Ports', 'em.mesh': 'Mesh (EM)', 'em.var': 'Variants', 'study:em': 'Study: EM', 'res.em.info': 'Run', 'res.tt': '1D Plot Group: T(t)', 'res.em.s': '1D Plot Group: S-parameters', 'res.em.smith': 'Smith Plot Group', 'res.em.rlgc': 'RLGC(f) and modes', 'res.em.targets': 'Targets', 'res.em.ts': 'Export: Touchstone', 'res.derived': 'Derived Values', 'res.tline': 'T along z', 'res.datasets': 'Dataset: Solution', 'res.T': '3D Plot Group: Temperature',
		'res.mesh': '3D Plot Group: Mesh', 'res.probes': 'Probes', 'res.cutline': 'Cut Line 3D', 'res.disp': '3D Plot Group: Displacement', 'res.vm': '3D Plot Group: von Mises', 'res.warp': '1D Plot Group: Warpage vs T'
	};
	const title = $derived(
		(node === 'res.warp' && wb.run?.result.mech?.kind === 'process_sequence' ? '1D Plot Group: Warpage per step' : null) ??
		titles[node] ??
			(node.startsWith('kind:') ? `Parts: ${node.slice(5)}`
			: node.startsWith('part:') ? `Part: ${node.slice(5)}`
			: node.startsWith('study:') ? `Study: ${node.slice(6)}`
			: node.startsWith('ht.src:') ? `Heat source ${Number(node.slice(7)) + 1}`
			: node.startsWith('ht.bc:') ? `Boundary condition ${Number(node.slice(6)) + 1}`
			: node)
	);
	const part = $derived(node.startsWith('part:') ? (wb.parts.find((p) => p.id === node.slice(5)) ?? null) : null);
	const tline = $derived(wb.run ? tLineAtMax(wb.run.result) : null);
	const DIM_KEYS = ['x_mm', 'y_mm', 'w_mm', 'd_mm', 'z_um', 'h_um'];
	const st = (s: unknown): ParamStatus => (['reported', 'derived', 'public', 'template', 'user'].includes(String(s)) ? (s as ParamStatus) : 'template');
	const caseFile = $derived(`${wb.caseId.replace(/\//g, '_') || 'case'}.yaml`);
	const fam = $derived(wb.family);
</script>

{#snippet badge(s: ParamStatus, extra = '')}<span class="b {s}" data-tip="{STATUS_TIP[s]}{extra ? `\n${extra}` : ''}">{STATUS_LETTER[s]}</span>{/snippet}
{#snippet refChips(e: Record<string, unknown> | undefined)}{#each refIds(e as never) as r}<span class="ref mono" data-tip={refTip(r, refs)}>{r}</span>{/each}{/snippet}
{#snippet partRows(list: SimPart[])}
	<table class="grid" aria-label="Parts"><thead><tr><th>Part</th><th>Material</th><th>w x d (mm)</th><th>z, h (µm)</th><th>Prov</th></tr></thead><tbody>
		{#each list as p (p.id)}
			{@const pv = partProv(p)}
			<tr class:sel={wb.selectedParts.includes(p.id)} onpointerenter={() => (wb.hoverPart = p.id)} onpointerleave={() => (wb.hoverPart = null)}>
				<td><button class="link" onclick={() => { wb.node = `part:${p.id}`; wb.selectedParts = [p.id]; }}>{p.id}</button></td>
				<td class="mono small">{p.material}</td>
				<td class="num">{fmt(p.w_mm, 4)} x {fmt(p.d_mm, 4)}</td>
				<td class="num">{fmt(p.z_um, 5)}, {fmt(p.h_um, 4)}</td>
				<td class="small" data-tip="w, d, h: {pv.prov}">{pv.prov}</td>
			</tr>
		{/each}
	</tbody></table>
{/snippet}

<div class="settings">
	<div class="head">
		<span class="title" data-tip={title}>{title}</span>
		<span class="grow"></span>
		<div class="tabs" role="tablist" aria-label="Settings view">
			<button role="tab" aria-selected={wb.settingsTab === 'settings'} class:on={wb.settingsTab === 'settings'} onclick={() => (wb.settingsTab = 'settings')}>Settings</button>
			<button role="tab" aria-selected={wb.settingsTab === 'yaml'} class:on={wb.settingsTab === 'yaml'} onclick={() => (wb.settingsTab = 'yaml')} data-tip="Canonical case YAML; form edits write here (splice: comments and layout kept)">YAML</button>
		</div>
	</div>
	<div class="body" class:tight={wb.settingsTab === 'yaml'}>
		{#if wb.settingsTab === 'yaml'}
			<textarea aria-label="Case YAML" spellcheck="false" bind:value={wb.text} disabled={!!wb.busy || wb.loading}></textarea>
		{:else if !raw}
			<p class="muted">{wb.loading ? 'Loading case...' : wb.parsed.error ? 'Case YAML does not parse; fix it in the YAML tab.' : 'No case loaded.'}</p>
		{:else if node.startsWith('res.em.')}
			<EmPages {wb} {node} />
		{:else if node.startsWith('em.')}
			{@const e = raw.em2d ?? raw.em3d ?? {}}
			{#if node === 'em.mat'}
				<table class="grid"><thead><tr><th>key</th><th>model</th><th>ε_r</th><th>tan δ</th><th>ref</th></tr></thead><tbody>
					{#each Object.entries(e.materials ?? {}) as [k, m]}{@const mm = m as Record<string, unknown>}<tr data-tip={[mm.ref, mm.note].filter(Boolean).join('\n') || undefined}><td class="mono small">{k}</td><td class="small">{mm.model}</td><td class="num">{mm.eps_r ?? '-'}</td><td class="num">{mm.tan_delta ?? '-'}</td><td class="small refs">{mm.ref ? 'hover' : '-'}</td></tr>{/each}
				</tbody></table>
				<h4>Conductors</h4>
				<table class="grid"><thead><tr><th>key</th><th>σ (S/m)</th><th>status</th></tr></thead><tbody>
					{#each Object.entries(e.conductor_materials ?? {}) as [k, m]}{@const mm = m as Record<string, unknown>}<tr data-tip={[mm.ref, mm.note].filter(Boolean).join('\n') || undefined}><td class="mono small">{k}</td><td class="num">{mm.sigma_S_m}</td><td class="small">{mm.status ?? ''}</td></tr>{/each}
				</tbody></table>
			{:else if node === 'em.geo'}
				{#if raw.em2d}
					<table class="grid"><thead><tr><th>shape</th><th>kind</th><th>material</th><th>status</th></tr></thead><tbody>
						{#each e.section?.dielectrics ?? [] as d}<tr data-tip={d.ref ?? undefined}><td class="small">{d.name}</td><td>dielectric</td><td class="mono small">{d.material}</td><td class="small">{d.status ?? ''}</td></tr>{/each}
						{#each e.section?.conductors ?? [] as c}<tr data-tip={c.ref ?? undefined}><td class="small">{c.name}</td><td>{c.role}</td><td class="mono small">{c.conductor ?? c.sigma_S_m}</td><td class="small">{c.status ?? ''}</td></tr>{/each}
					</tbody></table>
				{:else}
					<table class="grid"><thead><tr><th>solid</th><th>kind</th><th>material</th><th>model</th></tr></thead><tbody>
						{#each e.solids ?? [] as s}<tr data-tip={s.ref ?? undefined}><td class="small">{s.name}</td><td>{s.kind}</td><td class="mono small">{s.material ?? s.conductor ?? ''}</td><td class="small">{s.model ?? ''}</td></tr>{/each}
					</tbody></table>
				{/if}
			{:else if node === 'em.ports'}
				<table class="grid"><thead><tr><th>port</th><th>side</th><th>signal</th><th>de-embed (µm)</th></tr></thead><tbody>
					{#each e.ports ?? [] as p, i}<tr data-tip={p.note ?? undefined}><td>{i + 1} {p.name}</td><td>{p.side}</td><td class="small">{p.signal ?? JSON.stringify(p.mode ?? '')}</td><td class="num">{p.deembed_um ?? ''}</td></tr>{/each}
				</tbody></table>
			{:else if node === 'em.mesh'}
				<pre class="mono small">{JSON.stringify(e.mesh ?? {}, null, 1)}</pre>
				<p class="muted small">Sweep: {JSON.stringify(e.sweep ?? {})}{e.max_dof ? `; max_dof ${e.max_dof}` : ''}</p>
			{:else if node === 'em.var'}
				<ul><li>base: the case as written</li>{#each e.variants ?? [] as v}<li><span class="mono">{v.id}</span>{v.title ? `: ${v.title}` : ''}</li>{/each}</ul>
			{/if}
		{:else if node === 'model'}
			<h3>{raw.title ?? wb.caseId}</h3>
			<dl class="kv">
				<dt>case</dt><dd class="mono">{wb.caseId}{wb.fromFile ? '' : ' (in memory)'}</dd>
				<dt>family</dt><dd class="mono">{wb.familyId}{fam ? ` · ${fam.name}` : ''}</dd>
				<dt>status</dt><dd data-tip="Case validation status (SPEC 1)">{raw.status ?? 'n/a'}</dd>
				<dt>schema</dt><dd class="mono">{raw.schema ?? 'n/a'}</dd>
				<dt>geometry</dt><dd data-tip={wb.generated?.note ?? ''}>{wb.generated ? `${wb.generated.source}, ${wb.parts.length} parts` : wb.genError || 'n/a'}</dd>
				{#if fam?.completeness}<dt>dims</dt><dd data-tip="Share of family dimensions by status (package3d.json completeness)">R {fmt(100 * fam.completeness.reported, 2)} % · D {fmt(100 * fam.completeness.derived, 2)} % · T {fmt(100 * fam.completeness.template, 2)} %</dd>{/if}
				<dt>engine</dt><dd class="small">{#each Object.entries(eng) as [k, on]}<span class="eng" class:on data-tip="engine/src/{k}: {on ? 'in this build' : 'not in this build'}">{k}</span>{/each}</dd>
			</dl>
			{#if wb.p3dFixture}<p class="warn small">package3d.json could not be loaded; the /3d fixture families are shown.</p>{/if}
			<p><button class="small" onclick={() => downloadText(caseFile, wb.text, 'text/yaml')} data-tip="Download the case YAML with the session edits">Download YAML</button></p>
			{#if raw.assumptions?.length}<h4>Assumptions</h4><ul>{#each raw.assumptions as a}<li>{typeof a === 'string' ? a : JSON.stringify(a)}</li>{/each}</ul>{/if}
			{#if raw.missing?.length}<h4>Missing inputs</h4><ul>{#each raw.missing as a}<li>{typeof a === 'string' ? a : JSON.stringify(a)}</li>{/each}</ul>{/if}
			{#if raw.targets?.length}<h4>Targets</h4>
				<table class="grid"><thead><tr><th>metric_id</th><th>quantity</th><th>T (°C)</th><th>tier</th></tr></thead><tbody>
					{#each raw.targets as t}<tr data-tip={JSON.stringify(t)}><td class="mono small">{t.metric_id}</td><td>{t.quantity}</td><td class="num">{t.T_C ?? ''}</td><td>{t.tier ?? ''}</td></tr>{/each}
				</tbody></table>{/if}
		{:else if node === 'gdef'}
			<p class="muted small">Parameters (family configurator) and the material library.</p>
		{:else if node === 'params'}
			<ParamsTable {wb} />
		{:else if node === 'gmat'}
			<MaterialsTable {wb} />
		{:else if node === 'comp'}
			<p class="muted small">One 3D component: the package box model from the family generator.</p>
		{:else if node === 'geometry'}
			<dl class="kv">
				<dt>source</dt><dd data-tip={wb.generated?.note ?? ''}>{wb.generated?.source ?? 'n/a'}{wb.generated ? ` (${fmt(wb.generated.ms, 3)} ms)` : ''}</dd>
				<dt>boxes</dt><dd data-tip="Grid input: parts, layer boxes, homogenized array boxes">{wb.parts.length} ({wb.parts.filter((p) => p.array).length} homogenized arrays)</dd>
				<dt>symmetry</dt><dd>{raw.geometry?.symmetry ?? 'none'}</dd>
				<dt>dropped</dt><dd class="mono small">{(raw.geometry?.drop_kinds ?? []).join(', ') || 'none'}</dd>
			</dl>
			<table class="grid"><thead><tr><th>Kind</th><th>Count</th><th>template (w, d, h)</th></tr></thead><tbody>
				{#each wb.kinds as k}<tr><td><button class="link" onclick={() => { wb.node = `kind:${k.kind}`; wb.selectedParts = wb.parts.filter((p) => p.kind === k.kind).map((p) => p.id); }}>{k.kind}</button></td><td class="num">{k.n}</td><td class="num">{wb.parts.filter((p) => p.kind === k.kind && partProv(p).prov === 'template').length}</td></tr>{/each}
			</tbody></table>
		{:else if node.startsWith('kind:')}
			{@render partRows(wb.parts.filter((p) => p.kind === node.slice(5)))}
		{:else if node.startsWith('part:')}
			{#if part}
				<dl class="kv">
					<dt>name</dt><dd>{part.name ?? part.id}</dd>
					<dt>kind</dt><dd>{part.kind}{part.array ? ' (homogenized array)' : ''}</dd>
					<dt>material</dt><dd class="mono">{part.material}</dd>
					{#if part.in}<dt>in</dt><dd><button class="link" onclick={() => { wb.node = `part:${part.in}`; wb.selectedParts = [String(part.in)]; }}>{part.in}</button></dd>{/if}
				</dl>
				<table class="grid"><thead><tr><th>Dim</th><th>Value</th><th>S</th><th>Ref</th></tr></thead><tbody>
					{#each DIM_KEYS as k}
						{@const d = part.dims?.[k]}
						<tr data-tip={[d?.note, d?.formula ? `formula: ${d.formula}` : ''].filter(Boolean).join('\n') || undefined}><td class="mono">{k}</td><td class="num">{fmt(Number(part[k]), 6)} {unitOf(k)}</td>
							<td>{#if d}{@render badge(st(d.status))}{:else}<span class="muted" data-tip="No dims entry (placement or not carried)">-</span>{/if}</td><td class="refs">{@render refChips(d)}</td></tr>
					{/each}
					{#each Object.entries(part.dims ?? {}).filter(([k]) => !DIM_KEYS.includes(k)) as [k, d]}
						<tr data-tip={d.note ?? undefined}><td class="mono">{k}</td><td class="num">{d.value != null ? String(d.value) : ''}</td><td>{@render badge(st(d.status))}</td><td class="refs">{@render refChips(d)}</td></tr>
					{/each}
				</tbody></table>
			{:else}<p class="muted">Part not in the current geometry.</p>{/if}
		{:else if node === 'cmat'}
			<p class="muted small">Material per part; case <span class="mono">materials.map</span> entries override by part id, part kind or template key (SPEC 1).</p>
			<table class="grid"><thead><tr><th>Part</th><th>Template key</th><th>Mapped to</th></tr></thead><tbody>
				{#each wb.parts as p (p.id)}
					{@const m = raw.materials?.map ?? {}}
					{@const to = m[p.id] ?? m[p.kind] ?? m[p.material]}
					<tr><td class="small">{p.id}</td><td class="mono small">{p.material}</td><td class="mono small" class:accent={!!to}>{to ?? '-'}</td></tr>
				{/each}
			</tbody></table>
		{:else if node === 'mesh'}
			<p class="muted small">Rectilinear grid aligned to every box face (SPEC 3). Exceeding max_nodes is an error, never a silent coarsening.</p>
			<Field {wb} path="mesh.max_xy_mm" label="max_xy" tip="In-plane target cell size" />
			<Field {wb} path="mesh.min_cells_per_layer" label="min cells / layer" tip="Through-thickness cells per box layer (>= 2 for elastic bending, A3)" />
			<Field {wb} path="mesh.grading" label="grading" tip="Max neighbor size ratio in x and y" />
			<Field {wb} path="mesh.max_nodes" label="max_nodes" tip="Hard node budget" />
			{#if wb.run}<h4>Last grid</h4><p class="small num">{wb.run.result.grid.nx} x {wb.run.result.grid.ny} x {wb.run.result.grid.nz} cells{wb.stale.mesh ? ' (stale)' : ''}</p>{/if}
		{:else if node === 'ht' || node.startsWith('ht.')}
			{@const th = raw.physics?.thermal ?? {}}
			{#if !eng.thermal}<p class="muted small">Solver engine/src/thermal ({MODULE_LANE.thermal}) not in this build; settings are edited in the case YAML.</p>{/if}
			{#if node.startsWith('ht.src:')}
				{@const i = Number(node.slice(7))}
				<Field {wb} path="physics.thermal.sources.{i}.parts" label="parts" tip="Part id glob (e.g. soc_*)" />
				<Field {wb} path="physics.thermal.sources.{i}.power_W" label="power" />
				<Field {wb} path="physics.thermal.sources.{i}.distribution" label="distribution" options={['uniform_volume']} />
			{:else if node.startsWith('ht.bc:')}
				{@const i = Number(node.slice(6))}
				<Field {wb} path="physics.thermal.bcs.{i}.selection" label="selection" tip="Named selection: top:<part>, bottom:<part>, side:<part>, default, sym:x, sym:y" />
				<Field {wb} path="physics.thermal.bcs.{i}.type" label="type" options={['htc', 'temperature', 'heat_flux', 'adiabatic', 'symmetry']} />
				{#if th.bcs?.[i]?.type === 'htc'}<Field {wb} path="physics.thermal.bcs.{i}.h_W_m2K" label="h" /><Field {wb} path="physics.thermal.bcs.{i}.T_inf_C" label="T_inf" />{/if}
				{#if th.bcs?.[i]?.type === 'temperature'}<Field {wb} path="physics.thermal.bcs.{i}.T_C" label="T" />{/if}
			{:else if node === 'ht.solid'}<p class="small">Conduction in every meshed part with the library conductivity of its material (L2).</p>
			{:else if node === 'ht.ins'}<p class="small">Adiabatic on exterior faces that no other boundary condition claims (selection <span class="mono">default</span>).</p>
			{:else}
				<table class="grid"><thead><tr><th>Feature</th><th>Settings</th></tr></thead><tbody>
					{#each th.sources ?? [] as s, i}<tr><td><button class="link" onclick={() => (wb.node = `ht.src:${i}`)}>Heat source {i + 1}</button></td><td class="mono small">{JSON.stringify(s)}</td></tr>{/each}
					{#each th.bcs ?? [] as b, i}<tr><td><button class="link" onclick={() => (wb.node = `ht.bc:${i}`)}>{b.type}</button></td><td class="mono small">{JSON.stringify(b)}</td></tr>{/each}
				</tbody></table>
				{#if !th.sources?.length && !th.bcs?.length}<p class="muted small">No <span class="mono">physics.thermal</span> block in the case.</p>{/if}
			{/if}
		{:else if node === 'solid'}
			<p class="muted small">Thermo-elasticity (warpage per JEITA ED-7306, stress) arrives with {MODULE_LANE.mech}. Deformation display: automatic scale (about 10 % of the geometry size, COMSOL rule), factor shown and editable (DevLog-010 Decision 5).</p>
			{#if raw.physics?.mechanics}<pre class="mono small">{JSON.stringify(raw.physics.mechanics, null, 1)}</pre>{/if}
		{:else if node === 'emw'}
			<p class="muted small">Regional EM (channel cut-out, PML, numbered ports, S-parameters) is tranche E5/E6 with UI U3.</p>
		{:else if node === 'study' || node.startsWith('study:')}
			{@const s = node.startsWith('study:') ? wb.studies.find((x) => x.id === node.slice(6)) : wb.study}
			{#if s}
				{@const why = studyBlockReason(s.type)}
				<dl class="kv"><dt>id</dt><dd class="mono">{s.id}</dd><dt>type</dt><dd>{s.type}</dd>{#if s.temperature}<dt>temperature</dt><dd class="mono small">{JSON.stringify(s.temperature)}</dd>{/if}</dl>
				<div class="actions">
					<button class="on" disabled={!wb.canRun || !!why} onclick={() => { wb.studyId = s.id; wb.compute(); }} data-tip={why ?? wb.computeBlock ?? 'Run this study in a worker'}>Compute</button>
					<button disabled={!wb.busy} onclick={() => wb.cancel()} data-tip="Terminate the solver worker">Cancel</button>
				</div>
				{#if why}<p class="crit small">{why}</p>{/if}
			{:else}
				<p class="muted">The case has no studies block.</p>
				<div class="actions"><button disabled={!wb.parts.length || !!wb.busy || wb.isEm} onclick={() => wb.addDefaultStudy()} data-tip="Splice a draft steady thermal study into the YAML: die power, top HTC (lid or die tops), bottom HTC, BGA dropped; every number template and listed in assumptions; organics without library k substituted by epoxy_generic (labelled). A UI exercise, not a prediction.">Add default thermal study (template)</button></div>
			{/if}
		{:else if node === 'results' || node === 'res.derived'}
			{#if wb.run}
				<p class="small">{wb.run.study} · {new Date(wb.run.at).toISOString()}{#if wb.stale.any} · <span class="warn">stale</span>{/if}{wb.run.result.runner ? ` · ${wb.run.result.runner}` : ''}</p>
				{#if wb.run.result.homog}
					{@const h = wb.run.result.homog}
					{@const c = h.counts}
					{@const miss = (c.table_miss_fingerprint ?? 0) + (c.table_miss_unverified ?? 0) + (c.table_miss_absent ?? 0) + (c.table_cfg_mismatch ?? 0)}
					<h4>RVE homogenization use</h4>
					<p class="small" data-tip={`lib.homogStats() (L11) summed over ${h.libraries} librar${h.libraries === 1 ? 'y' : 'ies'} of this run (the base library and those derived by materials overrides); ROM fallbacks over the attachment family.\n${Object.entries(c).map(([k, v]) => `${k}: ${v}`).join('\n')}`}>
						table {h.table_loaded ? 'loaded' : 'not loaded (live RVE)'} · exact {c.table_exact ?? 0} · interpolated {c.table_interpolated ?? 0} · misses {miss} · live {(c.live_full ?? 0) + (c.live_k ?? 0)} · cache {c.cache ?? 0} · void ROM {c.void_rom ?? 0}
						{#if h.rom_fallback}<span class="crit" data-tip={h.rom_fallback_events.map((e) => JSON.stringify(e)).join('\n')}> · RVE -> ROM fallbacks {h.rom_fallback} ({h.rom_fallback_keys.join(', ')})</span>{:else} · RVE -> ROM fallbacks 0{/if}
					</p>
				{/if}
				{#if wb.run.result.mech}
					{@const sq = wb.run.result.mech.kind === 'process_sequence'}
					<h4>Warpage (JEITA ED-7306){sq ? ', per process step' : ''}</h4>
					{#if wb.run.result.mech.fields === 'none'}<p class="crit small">{wb.run.result.mech.fields_note}</p>{/if}
					<table class="grid"><thead><tr>{#if sq}<th>step</th>{/if}<th>T (°C)</th><th>surface</th><th>warpage (µm)</th><th>shape</th><th>coplanarity (µm)</th><th>centre - corner (µm)</th><th>max |u| (µm)</th></tr></thead><tbody>
						{#each wb.run.result.mech.points as p}{#each p.warpage as w}<tr data-tip={wb.run.result.mech.sign_convention}>{#if sq}<td class="mono small">{p.step}</td>{/if}<td class="num">{p.T_C}</td><td class="mono small">{w.surface}</td><td class="num">{fmt(w.warpage_um, 5)}</td><td>{w.shape_class ?? '-'}</td><td class="num">{fmt(w.coplanarity_um, 5)}</td><td class="num">{w.centre_minus_corner_um != null ? fmt(w.centre_minus_corner_um, 5) : '-'}</td><td class="num">{p.max_abs_u_m != null ? fmt(p.max_abs_u_m * 1e6, 4) : '-'}</td></tr>{/each}{/each}
					</tbody></table>
				{/if}
				<table class="grid"><tbody>{#each derivedRows(wb.run.result) as r}<tr><td>{r.label}</td><td class="num">{typeof r.value === 'number' ? fmt(r.value, 6) : r.value} {r.unit}</td><td class="small">{r.where}</td></tr>{/each}</tbody></table>
				{#if partTemps(wb.run.result).length}<h4>Per part</h4>
					<table class="grid"><thead><tr><th>Part</th><th>T max (°C)</th><th>T avg (°C)</th></tr></thead><tbody>
						{#each partTemps(wb.run.result) as r}<tr onpointerenter={() => (wb.hoverPart = r.part)} onpointerleave={() => (wb.hoverPart = null)}><td class="small">{r.part}</td><td class="num">{fmt(r.Tmax_C, 5)}</td><td class="num">{fmt(r.Tavg_C, 5)}</td></tr>{/each}
					</tbody></table>{/if}
				{#if wb.run.result.targets?.length}<h4>Targets</h4>
					<table class="grid"><thead><tr><th>metric_id</th><th>quantity</th><th>study</th><th>got</th><th>expected</th><th>status</th></tr></thead><tbody>
						{#each wb.run.result.targets as tg}{@const dbr = tg.db as Record<string, unknown> | undefined}<tr data-tip={[tg.reason, dbr ? `DB: ${dbr.basis ?? ''} ${dbr.parameter ?? ''}; condition: ${dbr.condition ?? '-'}; variant: ${dbr.variant ?? '-'}; locator: ${dbr.locator ?? '-'}` : ''].filter(Boolean).join('\n') || undefined}><td class="mono small">{tg.metric_id ?? '-'}</td><td class="small">{tg.quantity}</td><td>{tg.study ?? ''}{tg.step != null ? ` / ${tg.step}` : ''}</td><td class="num">{typeof tg.got === 'number' ? fmt(tg.got, 5) : '-'}</td><td class="num">{typeof tg.expected === 'number' ? fmt(tg.expected, 5) : '-'}</td><td class:warn={tg.status === 'miss'}>{tg.status}</td></tr>{/each}
					</tbody></table>{/if}
				{#if wb.run.result.warnings?.length}<h4>Warnings</h4><ul>{#each wb.run.result.warnings as w}<li>{w}</li>{/each}</ul>{/if}
			{:else}<p class="muted">No results. Compute a study.</p>{/if}
		{:else if ['res.datasets', 'res.T', 'res.mesh', 'res.probes', 'res.cutline', 'res.disp', 'res.vm', 'res.warp', 'res.tt'].includes(node)}
			<ResultPages {wb} {node} />
		{:else if node === 'res.tline'}
			{#if tline}
				<p class="small muted">x {fmt(tline.x_mm, 4)} mm, y {fmt(tline.y_mm, 4)} mm{wb.stale.any ? ' · stale' : ''}</p>
				<LinePlot series={[{ name: 'T', x: tline.z_um, y: tline.T_C }]} xLabel="z (µm)" yLabel="T (°C)" ariaLabel="Temperature along z" filename="{wb.caseId.replace(/\//g, '_')}-T-z" height={240} />
			{:else}<p class="muted">No temperature field. Compute a thermal study.</p>{/if}
		{/if}
	</div>
</div>

<style>
	.settings { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; background: var(--surface); }
	.head { display: flex; align-items: center; gap: 8px; padding: 0 0 0 8px; border-bottom: 1px solid var(--border); min-width: 0; }
	.title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.grow { flex: 1; }
	.tabs { display: flex; }
	.tabs button { border: 0; border-left: 1px solid var(--border); height: 26px; background: none; color: var(--ink-3); border-radius: 0; }
	.tabs button.on { color: var(--ink); background: var(--surface-2); box-shadow: inset 0 -2px var(--accent); }
	.body { overflow: auto; padding: 8px; min-height: 0; }
	.body.tight { padding: 0; overflow: hidden; }
	textarea { width: 100%; height: 100%; min-height: 300px; resize: none; color: var(--ink); background: var(--bg); border: 0; font: 11px/1.5 var(--mono); padding: 8px; white-space: pre; border-radius: 0; display: block; }
	h3 { font-size: 13px; margin: 0 0 8px; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	pre { white-space: pre-wrap; margin: 4px 0; }
	.small { font-size: 11px; }
	.crit { color: var(--crit); }
	.warn { color: var(--warn); }
	.accent { color: var(--accent); }
	ul { padding-left: 16px; margin: 4px 0; } li { margin: 3px 0; overflow-wrap: anywhere; }
	.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 6px 0; }
	.kv dt { color: var(--ink-3); } .kv dd { margin: 0; overflow-wrap: anywhere; }
	.eng { display: inline-block; margin-right: 4px; padding: 0 3px; border: 1px solid var(--border); color: var(--ink-3); border-radius: 0; }
	.eng.on { color: var(--good); border-color: var(--good); }
	.grid { width: 100%; border-collapse: collapse; font-size: 11px; } .grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.grid tr.sel { background: var(--sel); }
	.link { border: 0; background: none; padding: 0; height: auto; color: var(--accent); border-radius: 0; text-align: left; }
	.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 10px 0; }
	.actions button { border-radius: 0; }
	button:disabled { opacity: 0.5; cursor: default; }
	.b { display: inline-block; width: 14px; height: 14px; line-height: 12px; text-align: center; font: 600 9px var(--mono); border: 1px solid currentColor; border-radius: 0; }
	.b.reported { color: var(--good); } .b.derived { color: #5bb5c9; } .b.public { color: #c160c1; } .b.template { color: var(--ink-3); border-style: dashed; } .b.user { color: var(--accent); }
	.refs { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
	.ref { color: var(--ink-3); font-size: 10px; border-bottom: 1px dotted var(--ink-3); cursor: help; margin-right: 3px; }
</style>
