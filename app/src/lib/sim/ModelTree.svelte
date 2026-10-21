<script lang="ts">
	// Ported from eo-modulator-atlas app/src/lib/sim/ModelTree.svelte at eb97f96 (GPL-3.0-or-later).
	// Local changes: packaging node set (R7 6.2 subset for U1: Global Definitions, Component 1 with Geometry by part
	// kind, Materials, Mesh, Heat Transfer, Solid Mechanics and EM placeholders, Study, Results); tags default,
	// template, stale, blocked, off; selecting geometry nodes highlights parts in the graphics. EO results context
	// menus, rename and undo removed (Results model is U2).
	import type { Workbench } from './workbench.svelte';
	import { studyBlockReason, engineStatus, MODULE_LANE } from './engine';
	import { partProv } from './provenance';

	let { wb }: { wb: Workbench } = $props();

	interface Node {
		id: string;
		label: string;
		depth: number;
		tip?: string;
		tag?: { text: string; kind: 'warn' | 'muted' | 'crit' | 'accent' };
		group?: string;
		parts?: string[];
	}

	let collapsed = $state<Record<string, boolean>>({ geometry: false, ht: false });
	const eng = engineStatus();

	const nodes: Node[] = $derived.by(() => {
		const raw = wb.raw;
		const out: Node[] = [];
		const st = wb.stale;
		const staleTag = (on: boolean): Node['tag'] => (on ? { text: 'stale', kind: 'warn' } : undefined);
		out.push({ id: 'model', label: wb.caseId || 'Model', depth: 0, tip: `${raw?.title ?? 'Model'}\nstatus: ${raw?.status ?? 'n/a'}`, tag: raw?.status ? { text: String(raw.status), kind: 'muted' } : undefined });
		if (wb.isEm) {
			// EM case (SPEC 9 / 14): section or block, materials, one study running every variant, EM results
			const e = (raw?.em2d ?? raw?.em3d ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
			const nv = (e.variants ?? []).length;
			out.push({ id: 'gdef', label: 'Global Definitions', depth: 0, group: 'gdef' });
			if (!collapsed.gdef) out.push({ id: 'em.mat', label: 'Materials', depth: 1, tip: 'Dielectric models and conductor materials of the case (with references)' });
			out.push({ id: 'comp', label: `Component 1: ${wb.emFamily === 'em2d' ? 'Cross-section (2D)' : 'EM block (3D)'}`, depth: 0, group: 'comp' });
			if (!collapsed.comp) {
				out.push({ id: 'em.geo', label: 'Geometry', depth: 1, tip: wb.emFamily === 'em2d' ? 'Section box, dielectrics and conductors' : 'Solids (painter order), ports, PML' });
				if (wb.emFamily === 'em3d') out.push({ id: 'em.ports', label: `Ports (${(e.ports ?? []).length})`, depth: 1, tip: 'Wave ports, de-embedding' });
				out.push({ id: 'em.mesh', label: 'Mesh', depth: 1, tip: 'EM mesh settings of the case' });
				out.push({ id: 'em.var', label: `Variants (${nv + 1})`, depth: 1, tip: 'base + variants (patches)' });
			}
			out.push({ id: 'study', label: 'Study', depth: 0, group: 'study' });
			if (!collapsed.study) {
				const why = studyBlockReason(wb.emFamily);
				out.push({ id: 'study:em', label: `${wb.emFamily === 'em2d' ? 'Frequency sweep (RLGC, MTL)' : 'Frequency domain (3D block)'}`, depth: 1, tip: why ?? 'Runs every variant in a worker', tag: why ? { text: 'blocked', kind: 'crit' } : undefined });
			}
			const tag: Node['tag'] = !wb.run?.result.em ? { text: 'empty', kind: 'muted' } : wb.stale.any ? { text: 'stale', kind: 'warn' } : undefined;
			out.push({ id: 'results', label: 'Results', depth: 0, group: 'results', tag });
			if (!collapsed.results) {
				out.push({ id: 'res.em.info', label: 'Run', depth: 1, tip: 'Runner, mesh and timing per variant', tag });
				out.push({ id: 'res.em.s', label: 'S-parameters', depth: 1, tip: '|S| (dB) and phase vs f; single-ended and mixed-mode', tag });
				out.push({ id: 'res.em.smith', label: 'Smith chart', depth: 1, tip: 'Reflection terms Sii', tag });
				if (wb.emFamily === 'em2d') out.push({ id: 'res.em.rlgc', label: 'RLGC(f) and modes', depth: 1, tip: 'Per-unit-length parameters, modal attenuation and eps_eff', tag });
				out.push({ id: 'res.em.targets', label: 'Targets', depth: 1, tip: 'Case targets: computed vs value', tag });
				out.push({ id: 'res.em.ts', label: 'Touchstone', depth: 1, tip: '.sNp downloads', tag });
			}
			return out;
		}
		out.push({ id: 'gdef', label: 'Global Definitions', depth: 0, group: 'gdef' });
		if (!collapsed.gdef) {
			const np = Object.keys(wb.generated?.params ?? {}).length;
			out.push({ id: 'params', label: 'Parameters', depth: 1, tip: `${np} family parameter(s); ${wb.nUser} user override(s) in the case params block`, tag: wb.nUser ? { text: `${wb.nUser} user`, kind: 'accent' } : undefined });
			out.push({ id: 'gmat', label: 'Materials', depth: 1, tip: eng.materials ? 'Material library keys used by the parts' : `Material keys used by the parts; library engine/src/materials (${MODULE_LANE.materials}) not in this build`, tag: eng.materials ? undefined : { text: 'keys only', kind: 'muted' } });
		}
		out.push({ id: 'comp', label: 'Component 1: Package (3D)', depth: 0, group: 'comp' });
		if (!collapsed.comp) {
			const src = wb.generated?.source;
			out.push({ id: 'geometry', label: 'Geometry', depth: 1, group: 'geometry', parts: [], tip: src === 'fixture' ? 'Box parts: package3d.json defaults (fixture; no family generator in this build)' : 'Box parts from the family generator', tag: wb.genError ? { text: 'error', kind: 'crit' } : src === 'fixture' ? { text: 'fixture', kind: 'muted' } : undefined });
			if (!collapsed.geometry)
				for (const { kind, n } of wb.kinds) {
					const ids = wb.parts.filter((p) => p.kind === kind).map((p) => p.id);
					out.push({ id: `kind:${kind}`, label: `${kind} (${n})`, depth: 2, group: `kind:${kind}`, parts: ids, tip: `${n} part(s) of kind ${kind}` });
					if (collapsed[`kind:${kind}`] !== false) continue;
					for (const p of wb.parts.filter((q) => q.kind === kind)) {
						const pv = partProv(p);
						out.push({ id: `part:${p.id}`, label: p.id, depth: 3, parts: [p.id], tip: `${p.name ?? p.id}\n${p.material}\nprovenance (w, d, h): ${pv.prov}${pv.user ? ', user-edited' : ''}`, tag: pv.user ? { text: 'user', kind: 'accent' } : pv.prov === 'template' ? { text: 'template', kind: 'muted' } : undefined });
					}
				}
			out.push({ id: 'cmat', label: 'Materials', depth: 1, tip: 'Material per part (case materials.map overrides)', tag: staleTag(st.physics && !st.mesh) });
			out.push({ id: 'mesh', label: 'Mesh', depth: 1, tip: 'Case mesh block (rectilinear grid, SPEC 3)', tag: staleTag(st.mesh) });
			out.push({ id: 'ht', label: 'Heat Transfer in Solids', depth: 1, group: 'ht', tip: 'Steady heat conduction (E1)', tag: eng.thermal ? staleTag(st.physics) : { text: 'pending', kind: 'muted' } });
			if (!collapsed.ht) {
				out.push({ id: 'ht.solid', label: 'Solid', depth: 2, tip: 'Default: conduction in every meshed part', tag: { text: 'default', kind: 'muted' } });
				out.push({ id: 'ht.ins', label: 'Thermal insulation', depth: 2, tip: 'Default: adiabatic on exterior faces not claimed by another boundary condition', tag: { text: 'default', kind: 'muted' } });
				const th = raw?.physics?.thermal ?? {};
				(Array.isArray(th.sources) ? th.sources : []).forEach((s: Record<string, unknown>, i: number) => out.push({ id: `ht.src:${i}`, label: `Heat source ${i + 1}`, depth: 2, tip: `parts ${String(s.parts)}${s.power_W != null ? `, ${s.power_W} W` : ''}`, tag: { text: '+', kind: 'muted' } }));
				(Array.isArray(th.bcs) ? th.bcs : []).forEach((b: Record<string, unknown>, i: number) => out.push({ id: `ht.bc:${i}`, label: `${String(b.type ?? 'bc')}: ${String(b.selection ?? '')}`, depth: 2, tip: JSON.stringify(b) }));
			}
			out.push({ id: 'solid', label: 'Solid Mechanics', depth: 1, tip: `Thermo-elasticity (warpage, stress): ${MODULE_LANE.mech}`, tag: eng.mech ? undefined : { text: 'E2', kind: 'muted' } });
			out.push({ id: 'emw', label: 'Electromagnetic Waves', depth: 1, tip: 'Regional EM (S-parameters): tranches E5/E6, U3', tag: { text: 'E5', kind: 'muted' } });
		}
		out.push({ id: 'study', label: 'Study', depth: 0, group: 'study', tip: 'Studies of the case (studies block)' });
		if (!collapsed.study)
			for (const s of wb.studies) {
				const why = studyBlockReason(s.type);
				out.push({ id: `study:${s.id}`, label: `${s.id}: ${s.type.replaceAll('_', ' ')}`, depth: 1, tip: why ?? 'Runnable: Compute', tag: why ? { text: 'blocked', kind: 'crit' } : wb.run?.study === s.id && wb.stale.any ? { text: 'stale', kind: 'warn' } : undefined });
			}
		const resTag: Node['tag'] = !wb.run ? { text: 'empty', kind: 'muted' } : wb.stale.any ? { text: 'stale', kind: 'warn' } : undefined;
		out.push({ id: 'results', label: 'Results', depth: 0, group: 'results', tip: 'Last Compute: datasets, derived values, plots', tag: resTag });
		if (!collapsed.results) {
			const held = !!wb.post;
			const fTag: Node['tag'] = !wb.run ? { text: 'empty', kind: 'muted' } : !held ? { text: 'not held', kind: 'muted' } : wb.stale.any ? { text: 'stale', kind: 'warn' } : undefined;
			out.push({ id: 'res.datasets', label: 'Datasets: Solution', depth: 1, tip: 'Solution of the last Compute (grid and nodal T held in the worker)', tag: fTag });
			out.push({ id: 'res.derived', label: 'Derived Values', depth: 1, tip: 'T max per part, heat balance, timing', tag: resTag });
			out.push({ id: 'res.T', label: 'Temperature', depth: 1, tip: '3D plot group: Surface (+ section cut = slice of T) and Slice; click to plot', tag: fTag });
			out.push({ id: 'res.mesh', label: 'Mesh (cell size)', depth: 1, tip: 'Surface cells colored by cell size, wireframe', tag: fTag });
			out.push({ id: 'res.probes', label: `Probes (${wb.probes.length})`, depth: 1, tip: 'Pinned point values (click on the result field)', tag: wb.probes.length ? undefined : { text: 'none', kind: 'muted' } });
			out.push({ id: 'res.cutline', label: 'Cut Line 3D', depth: 1, tip: 'Values along x, y or z through a pinned probe', tag: wb.cutLine ? undefined : { text: 'none', kind: 'muted' } });
			if (wb.run?.result.probes?.length) out.push({ id: 'res.tt', label: 'T(t) probes', depth: 1, tip: 'Transient study: temperature vs time at the case probes', tag: resTag });
			out.push({ id: 'res.tline', label: 'T along z (1D)', depth: 1, tip: 'Temperature along the vertical grid line through the Tmax node', tag: resTag });
			const m = wb.run?.result.mech;
			const mech = !!m;
			const seq = m?.kind === 'process_sequence';
			const tableOnly = m?.fields === 'none';
			for (const [id, label, tip] of [['res.disp', 'Displacement', 'Surface uz / |u| with deformation (COMSOL automatic scale)'], ['res.vm', 'von Mises stress', 'Cell-corner von Mises (unsmoothed) on the surface and slice; max per part'], ['res.warp', seq ? 'Warpage per step' : 'Warpage vs T', seq ? 'JEITA ED-7306 warpage per process step (step end temperature), target points by step' : 'JEITA ED-7306 warpage per temperature, target points']] as const) {
				const field = id !== 'res.warp';
				out.push({ id, label, depth: 1, tip: !mech ? `${tip}; needs a thermo-elastic or process_sequence study` : field && tableOnly ? `${tip}; ${m?.fields_note ?? 'no field in the result'}` : tip, tag: !mech ? { text: 'empty', kind: 'muted' } : field && tableOnly ? { text: 'table only', kind: 'muted' } : wb.stale.any ? { text: 'stale', kind: 'warn' } : undefined });
			}
		}
		return out;
	});

	function select(n: Node) {
		wb.node = n.id;
		wb.settingsTab = 'settings';
		if (n.parts) wb.selectedParts = n.parts;
		// COMSOL: selecting a plot group plots it; geometry nodes show the geometry
		if (n.id === 'res.T') {
			if (wb.post) wb.gview = 'field';
			if (wb.pg.expr !== 'T' && !wb.run?.result.mech) wb.pg.expr = 'T';
		} else if (n.id === 'res.disp' || n.id === 'res.vm') {
			if (wb.post && wb.run?.result.mech) {
				wb.gview = 'field';
				wb.pg.expr = n.id === 'res.vm' ? 'vm' : 'uz';
				if (wb.pg.expr === 'uz') wb.pg.scale = 'linear';
			}
		} else if (n.id === 'res.mesh') {
			if (wb.post) wb.gview = 'field';
			wb.pg.expr = 'cellsize';
			wb.pg.wire = true;
		} else if (n.parts || n.id === 'geometry' || n.id === 'gmat' || n.id === 'cmat' || n.id === 'params') wb.gview = 'geometry';
	}

	function onKey(e: KeyboardEvent) {
		const i = nodes.findIndex((n) => n.id === wb.node);
		let j = i;
		if (e.key === 'ArrowDown') j = Math.min(nodes.length - 1, i + 1);
		else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
		else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && nodes[i]?.group) {
			collapsed[nodes[i].group!] = e.key === 'ArrowLeft';
			e.preventDefault();
			return;
		} else return;
		e.preventDefault();
		select(nodes[j]);
		document.getElementById(`tree-${nodes[j].id}`)?.focus();
	}
	// a part picked in the graphics opens its kind group
	$effect(() => {
		const n = wb.node;
		if (!n.startsWith('part:')) return;
		const p = wb.parts.find((q) => q.id === n.slice(5));
		if (p && collapsed[`kind:${p.kind}`] !== false) collapsed[`kind:${p.kind}`] = false;
	});
	const isCollapsed = (g: string) => (g.startsWith('kind:') ? collapsed[g] !== false : !!collapsed[g]);
	function toggle(g: string) {
		collapsed[g] = !isCollapsed(g);
	}
</script>

<div class="tree" role="tree" aria-label="Model Builder" tabindex="-1" onkeydown={onKey}>
	<div class="hdr"><span>Model Builder</span></div>
	{#each nodes as n (n.id)}
		<div class="row" style:padding-left="{4 + n.depth * 12}px" class:sel={wb.node === n.id} class:root={n.depth === 0} role="none">
			{#if n.group}
				<button class="tw" aria-label={isCollapsed(n.group) ? `Expand ${n.label}` : `Collapse ${n.label}`} onclick={() => toggle(n.group!)}>{isCollapsed(n.group) ? '+' : '-'}</button>
			{:else}<span class="tw"></span>{/if}
			<button id="tree-{n.id}" class="item" role="treeitem" aria-selected={wb.node === n.id} aria-level={n.depth + 1} data-tip={n.tip} data-node={n.id} onclick={() => select(n)} onpointerenter={() => (wb.hoverPart = n.parts?.length === 1 ? n.parts[0] : null)} onpointerleave={() => (wb.hoverPart = null)} tabindex={wb.node === n.id ? 0 : -1}>
				<span class="lbl">{n.label}</span>
				{#if n.tag}<span class="tag {n.tag.kind}">{n.tag.text}</span>{/if}
			</button>
		</div>
	{/each}
</div>

<style>
	.tree { height: 100%; overflow: auto; background: var(--surface); padding-bottom: 8px; }
	.hdr { display: flex; align-items: center; gap: 2px; height: 26px; padding: 0 8px; color: var(--ink-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 1; }
	.row { display: flex; align-items: center; min-width: 0; }
	.row.sel { background: var(--sel); }
	.row:hover { background: var(--hover); }
	.tw { width: 14px; height: 20px; flex: none; padding: 0; border: 0; background: none; color: var(--ink-3); font: 11px var(--mono); border-radius: 0; }
	.item { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 21px; padding: 0 6px 0 2px; border: 0; background: none; text-align: left; color: var(--ink-2); border-radius: 0; }
	.item:hover { background: none; }
	.root .item { color: var(--ink); font-weight: 600; }
	.sel .item { color: var(--ink); }
	.lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tag { margin-left: auto; font-size: 10px; padding: 0 3px; border: 1px solid currentColor; border-radius: 0; line-height: 13px; flex: none; font-weight: 400; }
	.tag.warn { color: var(--warn); }
	.tag.crit { color: var(--crit); }
	.tag.accent { color: var(--accent); }
	.tag.muted { color: var(--ink-3); border-color: var(--border); }
</style>
