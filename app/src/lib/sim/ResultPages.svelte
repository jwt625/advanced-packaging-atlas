<script lang="ts">
	// Results node pages (R7 3.4, 6.3): Solution dataset, Temperature plot group (Surface + Slice features, plot
	// settings), Mesh view, Probes, Cut Line 3D, and the thermo-elastic placeholders (JEITA ED-7306 convention).
	// Pattern: eo-modulator-atlas app/src/lib/sim/PlotGroupSettings.svelte and ResultsPages.svelte (GPL-3.0-or-later).
	import type { Workbench } from './workbench.svelte';
	import LinePlot from './LinePlot.svelte';
	import { COLORMAPS, COLORMAP_TIPS } from './colormap';
	import { fieldDisplay } from './results';
	import { downloadText, toCsv } from './exportUtil';
	import { fmt } from '../logic';

	let { wb, node }: { wb: Workbench; node: string } = $props();
	const pg = $derived(wb.pg);
	const mech = $derived(wb.run?.result.mech ?? null);
	/** Mechanics result with field arrays held in the worker (else table-only: warpage / stress tables). */
	const mechF = $derived(mech && mech.fields !== 'none' ? mech : null);
	const seq = $derived(mech?.kind === 'process_sequence');
	/** Point label: process step (end temperature) or uniform temperature. */
	const ptLabel = (p: { T_C: number; step?: string; T_start_C?: number }) => (p.step != null ? `${p.step} (${p.T_start_C != null && p.T_start_C !== p.T_C ? `${p.T_start_C} -> ` : ''}${p.T_C} °C)` : `${p.T_C} °C`);
	// warpage vs T per surface, plus target points (case value or DB row from sim_targets.json, by metric_id)
	const warpSeries = $derived.by(() => {
		const series: { name: string; x: number[]; y: number[]; markers: boolean }[] = [];
		void wb.simTargets;
		const points: { x: number; y: number; label: string; detail?: string }[] = [];
		if (!mech) return { series, points };
		const by = new Map<string, { x: number[]; y: number[] }>();
		for (const p of mech.points)
			for (const w of p.warpage) {
				if (w.warpage_um == null) continue;
				const s = by.get(w.surface) ?? { x: [], y: [] };
				s.x.push(p.T_C);
				s.y.push(w.warpage_um);
				by.set(w.surface, s);
			}
		for (const [name, s] of by) series.push({ name: `${name} (sim)`, ...s, markers: true });
		for (const tg of wb.run?.result.targets ?? []) {
			// process_sequence targets name a step: plotted at that step's end temperature
			const stepT = tg.step != null ? mech.points.find((p) => p.step === String(tg.step))?.T_C : undefined;
			const tx = typeof tg.T_C === 'number' ? tg.T_C : stepT;
			if (tg.quantity !== 'warpage_um' || typeof tx !== 'number') continue;
			const db = tg.metric_id ? wb.simTargets?.[String(tg.metric_id)] : null;
			const v = typeof tg.value === 'number' ? tg.value : typeof tg.expected === 'number' ? tg.expected : db && typeof db.value === 'number' ? db.value : null;
			if (v == null) continue;
			const row = (db ?? tg.db) as Record<string, unknown> | undefined;
			const detail = row ? [`${row.basis ?? ''} ${row.parameter ?? ''}`.trim(), row.condition ? `condition: ${row.condition}` : '', row.variant ? `variant: ${row.variant}` : '', row.locator ? `locator: ${row.locator}` : '', 'sign as reported by the paper (not normalized to JEITA)'].filter(Boolean).join('; ') : 'case value';
			points.push({ x: tx, y: v, label: `${String(tg.metric_id ?? 'target')}${tg.step != null ? ` (${tg.step})` : ''}`, detail });
		}
		return { series, points };
	});
	const g = $derived(wb.run?.result.grid ?? null);
	const disp = $derived(fieldDisplay(pg.expr, pg.unit));
	// slice position range (mm) along the chosen axis
	const sRange = $derived.by(() => {
		if (!g) return [0, 1];
		const a = pg.sliceAxis === 'x' ? g.xs : pg.sliceAxis === 'y' ? g.ys : g.zs;
		return [a[0] * 1e3, a[a.length - 1] * 1e3];
	});
	// the slice position is kept inside the result grid by Graphics.svelte (always mounted; L24 G8)
	const AX = ['x', 'y', 'z'] as const;
	let vtuBusy = $state(false);
	let vtuMsg = $state('');
	async function exportVtu() {
		if (!wb.post || !wb.run) return;
		vtuBusy = true;
		vtuMsg = 'writing...';
		try {
			const t0 = performance.now();
			const xml = await wb.post.request<string>({ op: 'vtu', point: wb.pg.point, partIds: wb.run.result.grid.partIds ?? [] }, 'vtu');
			downloadText(`${wb.caseId.replace(/[^\w.-]+/g, '_')}-${wb.run.study}-${stamp()}.vtu`, xml, 'application/xml');
			vtuMsg = `${(xml.length / 1e6).toFixed(1)} MB in ${Math.round(performance.now() - t0)} ms`;
		} catch (e) {
			vtuMsg = e instanceof Error ? e.message : String(e);
		}
		vtuBusy = false;
	}
	const line = $derived(wb.cutLine);
	const lineXY = $derived.by(() => {
		if (!line) return null;
		const x: number[] = [], y: number[] = [];
		const d = fieldDisplay(wb.cutExpr, pg.unit);
		for (let i = 0; i < line.s.length; i++) if (Number.isFinite(line.v[i])) { x.push(line.s[i] * (line.axis === 'z' ? 1e6 : 1e3)); y.push(line.v[i] * d.a + d.b); }
		return { x, y, unit: d.unit, label: d.label };
	});
	function stamp() {
		const d = new Date();
		const p2 = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
	}
</script>

{#if !wb.run}
	<p class="muted">No results. Compute a study.</p>
{:else if node === 'res.datasets'}
	<dl class="kv">
		<dt>study</dt><dd class="mono">{wb.run.study} · {wb.run.result.type}</dd>
		<dt>computed</dt><dd>{new Date(wb.run.at).toISOString()}{wb.stale.any ? ' (stale)' : ''}</dd>
		<dt>grid</dt><dd class="num">{wb.run.result.grid.nx} x {wb.run.result.grid.ny} x {wb.run.result.grid.nz} cells, {((wb.run.result.grid.nx + 1) * (wb.run.result.grid.ny + 1) * (wb.run.result.grid.nz + 1)).toLocaleString()} nodes</dd>
		<dt>held</dt><dd data-tip="The worker keeps grid and nodal fields for plots (cleared by Cancel or the next Compute)">{wb.post ? 'yes (worker)' : 'no'}</dd>
		<dt>wall</dt><dd class="num">{fmt(wb.run.ms / 1000, 3)} s</dd>
	</dl>
{:else if node === 'res.T' || node === 'res.mesh' || ((node === 'res.disp' || node === 'res.vm') && mechF)}
	{#if node === 'res.T' && mech}<p class="muted small">Mechanics run: the study temperature is uniform per point (no temperature field); the plot shows the mechanics expression below.</p>{/if}
	{#if !wb.post}<p class="warn small">The field of run {wb.run.study} is no longer held (a newer Compute started, failed or was cancelled): tables and derived values remain; Compute again for field plots.</p>{/if}
	<h4>Expression</h4>
	<label class="f" data-tip="Field shown on the surface and slice">expression
		<select bind:value={wb.pg.expr} aria-label="Expression" onchange={() => { if (wb.pg.expr === 'uz') wb.pg.scale = 'linear'; }}>
			{#if mechF}<option value="uz">Displacement z (uz)</option><option value="umag">Displacement magnitude (|u|)</option><option value="vm">von Mises stress (cell corners, unsmoothed)</option>{:else}<option value="T">Temperature (T)</option>{/if}
			<option value="cellsize">Cell size (largest edge)</option>
		</select></label>
	{#if mechF && seq}<label class="f" data-tip="Process step (start -> end temperature); only the parts active at the step are drawn">step <select bind:value={wb.pg.point} aria-label="Process step">{#each mechF.points as p, i}<option value={i} disabled={p.fields === false}>{ptLabel(p)}{p.fields === false ? ' (no field)' : ''}</option>{/each}</select></label>
	{:else if mechF}<label class="f" data-tip="Uniform temperature of the thermo-elastic point (stress-free temperature from the case)">temperature <select bind:value={wb.pg.point} aria-label="Temperature point">{#each mechF.points as p, i}<option value={i}>{p.T_C} °C</option>{/each}</select></label>{/if}
	{#if pg.expr === 'T'}<label class="f">unit <select bind:value={wb.pg.unit} aria-label="Unit"><option value="degC">°C</option><option value="K">K</option></select></label>{/if}
	<h4>Range and color</h4>
	<label class="f" data-tip={pg.expr === 'uz' ? 'uz is signed: linear scale only (log would need |uz|)' : 'log: positive values only'}>scale <select bind:value={wb.pg.scale} aria-label="Scale"><option value="linear">linear</option><option value="log" disabled={pg.expr === 'uz'}>log</option></select></label>
	<label class="f" data-tip="auto: range of the shown layers; manual: locked range (kept across Computes for comparison)">range
		<select bind:value={wb.pg.range} aria-label="Range mode"><option value="auto">auto</option><option value="manual">manual</option></select></label>
	{#if pg.range === 'manual'}
		<label class="f">min <input type="number" step="any" bind:value={wb.pg.min} aria-label="Range min" /><span class="u">{disp.unit}</span></label>
		<label class="f">max <input type="number" step="any" bind:value={wb.pg.max} aria-label="Range max" /><span class="u">{disp.unit}</span></label>
	{/if}
	<label class="f" data-tip={COLORMAP_TIPS[pg.table]}>color table <select bind:value={wb.pg.table} aria-label="Color table">{#each COLORMAPS as c}<option value={c}>{c}</option>{/each}</select></label>
	<label class="chk"><input type="checkbox" bind:checked={wb.pg.reverse} /> reverse color table</label>
	<h4>Features</h4>
	<label class="chk" data-tip="Exterior surface of the meshed parts; with the section on, the cut face is the slice of the expression at the plane"><input type="checkbox" bind:checked={wb.pg.surface} /> Surface</label>
	<label class="chk" data-tip="Axis-aligned slice through the grid (exact for Q1 on the rectilinear grid)"><input type="checkbox" bind:checked={wb.pg.slice} /> Slice</label>
	{#if pg.slice}
		<label class="f">normal <select bind:value={wb.pg.sliceAxis} aria-label="Slice normal">{#each AX as a}<option value={a}>{a}</option>{/each}</select></label>
		<label class="f" data-tip="Slice position ({pg.sliceAxis === 'z' ? 'mm from the package bottom' : 'mm'})">position <input type="range" min={sRange[0]} max={sRange[1]} step={(sRange[1] - sRange[0]) / 500} bind:value={wb.pg.slicePos} aria-label="Slice position" /><span class="u num">{fmt(pg.slicePos, 4)}</span></label>
	{/if}
	{#if wb.run.symmetry !== 'none'}<label class="chk" data-tip="The case is a symmetry crop ({wb.run.symmetry}): draw mirrored copies (display only, COMSOL Mirror 3D); probes on a copy report the mirrored position"><input type="checkbox" bind:checked={wb.pg.mirror} /> mirror ({wb.run.symmetry})</label>{/if}
	<label class="chk" data-tip="Isosurfaces by marching tetrahedra on the nodal field (6 tets per cell; exact for the linear interpolant on each tet)"><input type="checkbox" bind:checked={wb.pg.iso} disabled={pg.expr === 'vm' || pg.expr === 'cellsize'} /> Isosurface</label>
	{#if pg.iso}
		<label class="f" data-tip="Number of levels evenly inside the color range (used when no explicit list)">levels <input type="number" min="1" max="20" step="1" bind:value={wb.pg.isoN} aria-label="Iso level count" /></label>
		<label class="f" data-tip="Explicit levels in display units, comma separated (overrides the count)">list <input type="text" bind:value={wb.pg.isoLevels} placeholder="e.g. 90, 95" aria-label="Iso levels" /><span class="u">{disp.unit}</span></label>
		{#if wb.paint.isoFaces === 0}<p class="warn small">No isosurface: no level lies inside the field range of the shown solution.</p>{/if}
	{/if}
	<label class="chk" data-tip={mech ? 'Displacement arrows (cell-centre mean of the corner u)' : 'Heat-flux arrows q = -k grad T at cell centres (k from the case resolver at the cell-mean T)'}><input type="checkbox" bind:checked={wb.pg.arrows} /> Arrows</label>
	{#if pg.arrows}
		{#if !mech}<label class="f">quantity <select bind:value={wb.pg.arrowKind} aria-label="Arrow quantity"><option value="flux">heat flux (-k grad T)</option></select></label>{/if}
		<label class="f" data-tip="Target number of arrows (cells sampled on a stride grid; fewer layers in z)">density <input type="number" min="20" max="20000" step="20" bind:value={wb.pg.arrowN} aria-label="Arrow count" /></label>
		<label class="chk" data-tip="All arrows the same length (direction only); color still |v|"><input type="checkbox" bind:checked={wb.pg.arrowNorm} /> normalized length</label>
		<p class="muted small">With z-exaggeration the arrow direction follows the exaggerated geometry; length and shape are not scaled.</p>
	{/if}
	<label class="chk" data-tip="Face outlines of the surface cells"><input type="checkbox" bind:checked={wb.pg.wire} onchange={() => (wb.meshWire = false)} /> mesh edges</label>
	{@const dbg = new URLSearchParams(location.search).get('debug') === '1'}
	<label class="chk" data-tip={mech ? 'Deformed shape p + s u (display only)' : dbg ? 'Synthetic test displacement (debug only; not a result): checks the deformation path' : 'Deformation needs a thermo-elastic study'}><input type="checkbox" bind:checked={wb.pg.deform} disabled={!mech && !dbg} /> deformation</label>
	{#if pg.deform}
		<label class="chk" data-tip="Automatic: the maximum displacement is drawn as about 10 % of the geometry size (COMSOL rule)"><input type="checkbox" bind:checked={wb.pg.dscaleAuto} /> automatic scale</label>
		<label class="f">scale factor <input type="number" step="any" bind:value={wb.pg.dscale} disabled={pg.dscaleAuto} aria-label="Deformation scale" /></label>
		{#if !mech}<p class="warn small">Synthetic test displacement (debug), not a result.</p>{/if}
	{/if}
	<h4>Compare runs</h4>
	<div class="actions">
		{#if !wb.compareA}<button disabled={!wb.post} onclick={() => wb.pinA()} data-tip="Keep this solution (and its worker) as run A; change inputs and Compute to get run B">Pin as A</button>
		{:else}
			<select bind:value={wb.compareMode} aria-label="Compare mode">
				<option value="off">off</option>
				<option value="side">side by side (A | B)</option>
				<option value="diff" disabled={!!wb.diffBlock} data-tip={wb.diffBlock ?? 'B - A of the temperature fields (same grid)'}>difference B - A{wb.diffBlock ? ` (off: ${wb.diffBlock})` : ''}</option>
			</select>
			<button onclick={() => wb.unpinA()}>Unpin A</button>
		{/if}
	</div>
	{#if wb.compareA}<p class="muted small">A: {wb.compareA.caseId} · {wb.compareA.run.study} · {new Date(wb.compareA.run.at).toISOString()}; {wb.diffBlock ? `difference off: ${wb.diffBlock} (side by side only)` : 'same grid, both thermal (difference available)'}.</p>{/if}
	<h4>Export</h4>
	<div class="actions"><button disabled={!wb.post || vtuBusy} onclick={exportVtu} data-tip="VTK XML UnstructuredGrid (.vtu) of the active cells: nodal T and u, cell part id and von Mises; for ParaView cross-checks">VTU</button>{#if vtuMsg}<span class="muted small">{vtuMsg}</span>{/if}</div>
	<p class="muted small num">surface {wb.paint.surfaceMs != null ? `${fmt(wb.paint.surfaceMs, 3)} ms` : '-'} · slice {wb.paint.sliceMs != null ? `${fmt(wb.paint.sliceMs, 3)} ms` : '-'} (worker) · {(wb.paint.faces * 2).toLocaleString()} triangles{wb.paint.firstMs != null ? ` · first paint ${fmt(wb.paint.firstMs, 3)} ms after the result` : ''}</p>
	{#if node === 'res.vm' && mech}
		{@const pt = mech.points[pg.point] ?? mech.points[0]}
		<h4>Max von Mises per part ({ptLabel(pt)})</h4>
		<table class="grid"><thead><tr><th>part</th><th>Gauss pt (MPa)</th><th>node (MPa)</th><th>flag</th></tr></thead><tbody>
			{#each Object.entries(pt.von_mises_per_part).sort((a, b) => b[1].vm_max_gp_Pa - a[1].vm_max_gp_Pa).slice(0, 40) as [id, v]}
				<tr><td class="small">{id}</td><td class="num">{fmt(v.vm_max_gp_Pa / 1e6, 4)}</td><td class="num">{fmt(v.vm_max_node_Pa / 1e6, 4)}</td><td class="small" data-tip="re-entrant corner flags (L8 classifyCorner): values there are mesh-dependent">{v.vm_max_node_flag ?? v.vm_max_gp_flag ?? ''}</td></tr>
			{/each}
		</tbody></table>
	{/if}
{:else if node === 'res.probes'}
	{#if wb.probes.length}
		<table class="grid"><thead><tr><th>#</th><th>Value</th><th>Part</th><th>x, y (mm)</th><th>z (µm)</th><th>Cut line</th></tr></thead><tbody>
			{#each wb.probes as q, i}<tr class:hid={!wb.probeDrawn(q)} data-tip={wb.probeDrawn(q) ? undefined : 'On a mirrored copy: not drawn while the mirror is off'}><td>{i + 1}</td><td class="num">{fmt(q.value, 5)} {q.unit}</td><td class="small" data-tip={q.material}>{q.part}</td><td class="num">{fmt(q.x, 4)}, {fmt(q.y, 4)}</td><td class="num">{fmt(q.z * 1000, 5)}</td>
				<td>{#each AX as a}<button class="mini" disabled={!wb.post} onclick={() => wb.lineThrough(i, a)} data-tip="Values along {a} through probe {i + 1}">{a}</button>{/each}</td></tr>{/each}
		</tbody></table>
		<div class="actions"><button onclick={() => (wb.probes = [])}>Clear</button><button onclick={() => downloadText(`${wb.caseId.replace(/[^\w.-]+/g, '_')}-probes-${stamp()}.csv`, `# case ${wb.caseId}, study ${wb.run?.study}${wb.stale.any ? ', stale' : ''}\n` + toCsv(['n', 'value', 'unit', 'part', 'material', 'x_mm', 'y_mm', 'z_um'], wb.probes.map((q, i) => [i + 1, q.value, q.unit, q.part, q.material, q.x, q.y, q.z * 1000])))}>CSV</button></div>
	{:else}<p class="muted">Click on the result field to pin a probe.</p>{/if}
{:else if node === 'res.cutline'}
	{#if line && lineXY}
		<p class="small muted">along {line.axis} through ({fmt(line.at[0] * 1e3, 4)}, {fmt(line.at[1] * 1e3, 4)}) mm, z {fmt(line.at[2] * 1e6, 5)} µm{wb.stale.any ? ' · stale' : ''}</p>
		<LinePlot series={[{ name: lineXY.label, x: lineXY.x, y: lineXY.y, markers: true }]} xLabel="{line.axis} ({line.axis === 'z' ? 'µm' : 'mm'})" yLabel="{lineXY.label} ({lineXY.unit})" ariaLabel="Cut line" filename="{wb.caseId.replace(/\//g, '_')}-cutline-{line.axis}" height={240} csvNote="case {wb.caseId}, study {wb.run?.study}, line along {line.axis}" />
	{:else}<p class="muted">Pin a probe, then choose x, y or z in the Probes table.</p>{/if}
{:else if node === 'res.tt'}
	{@const pr = wb.run.result.probes ?? []}
	{#if pr.length}
		<LinePlot series={pr.map((p) => ({ name: p.name, x: p.t_s, y: p.T_C }))} xLabel="t (s)" yLabel="T (°C)" ariaLabel="Temperature vs time" filename="{wb.caseId.replace(/\//g, '_')}-T-t" height={240} csvNote="case {wb.caseId}, study {wb.run.study} (thermal_transient)" />
		<table class="grid"><thead><tr><th>probe</th><th>x, y, z (mm)</th><th>T end (°C)</th></tr></thead><tbody>
			{#each pr as p}<tr><td>{p.name}</td><td class="num">{p.at_m.map((v) => fmt(v * 1e3, 4)).join(', ')}</td><td class="num">{fmt(p.T_C[p.T_C.length - 1], 5)}</td></tr>{/each}
		</tbody></table>
		<p class="muted small">The field shown under Temperature is the final time step.</p>
	{:else}<p class="muted">No transient probes in this run (study probes list).</p>{/if}
{:else if node === 'res.warp' && mech}
	{@const ws = warpSeries}
	<p class="small" data-tip={mech.sign_convention}>JEITA ED-7306 sign: + = top (+z) surface convex (dome); view side: top (+z). Hover for the full definition.</p>
	{#if mech.fields === 'none'}<p class="warn small">{mech.fields_note ?? 'Table-only result (no field arrays).'}</p>{/if}
	{#if ws.points.length}<p class="warn small" data-tip="DB points carry the paper's own sign; whether each paper uses the JEITA convention (+ = top convex) is under investigation (lane L9). Hover a point for the paper's condition and variant.">DB points: sign as reported by each paper (convention under review, lane L9).</p>{/if}
	{#if ws.series.length}
		<LinePlot series={ws.series} points={ws.points} pointsName="DB / case target" xLabel={seq ? 'step end T (°C), steps in order' : 'T (°C)'} yLabel="warpage (µm, JEITA ED-7306)" ariaLabel={seq ? 'Warpage per process step' : 'Warpage vs T'} filename="{wb.caseId.replace(/\//g, '_')}-warpage-{seq ? 'per-step' : 'vs-T'}" height={240} csvNote="case {wb.caseId}, study {wb.run.study}{seq ? ' (process_sequence; x = step end temperature, steps in order)' : ''}; warpage per JEITA ED-7306 ({mech.sign_convention}); view side top (+z)" />
	{:else}<p class="muted">No warpage surface requested by the case targets.</p>{/if}
	{#if seq}
		<table class="grid"><thead><tr><th>step</th><th>T start (°C)</th><th>T end (°C)</th><th data-tip="parts active after the step (activated in this step)">active</th><th>surface</th><th>warpage (µm)</th><th data-tip="L8 shape class of the surface (dome, bowl, W, saddle, flat)">shape</th><th>coplanarity (µm)</th><th>centre - corner (µm)</th><th>max |u| (µm)</th></tr></thead><tbody>
			{#each mech.points as p}
				{#each p.warpage.length ? p.warpage : [null] as w}<tr data-tip={p.activated?.length ? `activated: ${p.activated.join(', ')}` : undefined}><td class="mono small">{p.step}</td><td class="num">{p.T_start_C ?? '-'}</td><td class="num">{p.T_C}</td><td class="num">{p.active_n ?? '-'}{p.activated?.length ? ` (+${p.activated.length})` : ''}</td>
					{#if w}<td class="mono small">{w.surface}</td><td class="num">{fmt(w.warpage_um, 4)}</td><td>{w.shape_class ?? '-'}</td><td class="num">{fmt(w.coplanarity_um, 4)}</td><td class="num">{w.centre_minus_corner_um != null ? fmt(w.centre_minus_corner_um, 4) : '-'}</td>{:else}<td class="muted small" colspan="5">no warpage surface active at this step</td>{/if}
					<td class="num">{p.max_abs_u_m != null ? fmt(p.max_abs_u_m * 1e6, 4) : '-'}</td></tr>{/each}
			{/each}
		</tbody></table>
	{:else}
		<table class="grid"><thead><tr><th>T (°C)</th><th>surface</th><th>warpage (µm)</th><th data-tip="L8 shape class of the surface (dome, bowl, W, saddle, flat)">shape</th><th>coplanarity (µm)</th><th>centre - corner (µm)</th></tr></thead><tbody>
			{#each mech.points as p}{#each p.warpage as w}<tr><td class="num">{p.T_C}</td><td class="mono small">{w.surface}</td><td class="num">{fmt(w.warpage_um, 4)}</td><td>{w.shape_class ?? '-'}</td><td class="num">{fmt(w.coplanarity_um, 4)}</td><td class="num">{w.centre_minus_corner_um != null ? fmt(w.centre_minus_corner_um, 4) : '-'}</td></tr>{/each}{/each}
		</tbody></table>
	{/if}
{:else if (node === 'res.disp' || node === 'res.vm') && mech}
	<p class="warn small">{mech.fields_note ?? 'Table-only result (no field arrays).'} Warpage tables: Warpage node.</p>
	{#if node === 'res.vm'}
		{#each mech.points as pt}
			<h4>Max von Mises per part ({ptLabel(pt)})</h4>
			<table class="grid"><thead><tr><th>part</th><th>Gauss pt (MPa)</th><th>node (MPa)</th><th>flag</th></tr></thead><tbody>
				{#each Object.entries(pt.von_mises_per_part ?? {}).sort((a, b) => b[1].vm_max_gp_Pa - a[1].vm_max_gp_Pa).slice(0, 20) as [id, v]}
					<tr><td class="small">{id}</td><td class="num">{fmt(v.vm_max_gp_Pa / 1e6, 4)}</td><td class="num">{fmt(v.vm_max_node_Pa / 1e6, 4)}</td><td class="small">{v.vm_max_node_flag ?? v.vm_max_gp_flag ?? ''}</td></tr>
				{/each}
			</tbody></table>
		{/each}
	{/if}
{:else if node === 'res.disp' || node === 'res.vm' || node === 'res.warp'}
	<p class="muted small">No mechanics result in run {wb.run.study}: compute a thermo-elastic or process_sequence study. Deformation: automatic scale, about 10 % of the geometry size (COMSOL rule), factor shown and editable.</p>
	{#if node === 'res.warp'}<p class="small">Warpage sign convention: JEITA ED-7306; every output states the surface (default: substrate bottom) and the viewing side.</p>{/if}
{/if}

<style>
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; }
	p { margin: 6px 0; }
	.small { font-size: 11px; }
	.warn { color: var(--warn); }
	.f { display: grid; grid-template-columns: minmax(80px, 38%) minmax(0, 1fr) 40px; align-items: center; gap: 6px; padding: 1px 0; color: var(--ink-2); }
	.f select, .f input[type='number'] { width: 100%; height: 22px; border-radius: 0; }
	.f input[type='range'] { width: 100%; accent-color: var(--accent); }
	.u { color: var(--ink-3); font-size: 11px; }
	.chk { display: flex; align-items: center; gap: 6px; padding: 2px 0; color: var(--ink-2); }
	.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 6px 0; }
	.kv dt { color: var(--ink-3); } .kv dd { margin: 0; }
	.grid { width: 100%; border-collapse: collapse; font-size: 11px; } .grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.hid td { color: var(--ink-3); }
	.mini { height: 18px; padding: 0 5px; font-size: 10px; border-radius: 0; }
	.actions { display: flex; gap: 6px; margin: 8px 0; }
	.actions button, .actions select { border-radius: 0; height: 22px; }
	button:disabled { opacity: 0.5; }
</style>
