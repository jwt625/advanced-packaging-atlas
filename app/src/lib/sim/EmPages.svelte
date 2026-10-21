<script lang="ts">
	// EM results pages (R7 3.4, U3): S-parameters (dB, unwrapped phase; log-f toggle), Smith chart of the reflection
	// terms, RLGC(f) table and plots (em2d), modal table (em2d), targets, Touchstone downloads. Variant and block
	// (line / mixed-mode / reference) pickers. Data: runEm2d / runEm3d JSON held on the page.
	import type { Workbench } from './workbench.svelte';
	import LinePlot from './LinePlot.svelte';
	import SmithChart from './SmithChart.svelte';
	import { deembedText, rlgcSeries, sBlocks, sSeries, touchstones } from './emResults';
	import { downloadText } from './exportUtil';
	import { fmt } from '../logic';

	/* eslint-disable @typescript-eslint/no-explicit-any */
	let { wb, node }: { wb: Workbench; node: string } = $props();
	const em = $derived(wb.run?.result.em as Record<string, any> | undefined);
	const fam = $derived((wb.run?.result.type === 'em3d_sparams' ? 'em3d' : 'em2d') as 'em2d' | 'em3d');
	const variants = $derived(((em?.variants ?? (em ? [em] : [])) as Record<string, any>[]));
	let vi = $state(0);
	let bi = $state(0);
	let pairs = $state<string[]>(['0,0', '1,0']);
	let logX = $state(false);
	const v = $derived(variants[Math.min(vi, variants.length - 1)] ?? null);
	const blocks = $derived(v ? sBlocks(v, fam) : []);
	const b = $derived(blocks[Math.min(bi, blocks.length - 1)] ?? null);
	const n = $derived(b?.ports.length ?? 0);
	// default traces: reflection S11 and the through term (em2d 2N-port: port N + 1 is the far end of signal 1)
	let lastBlock = '';
	$effect(() => {
		if (!b || b.label === lastBlock) return;
		lastBlock = b.label;
		const thru = fam === 'em2d' && n >= 2 ? n / 2 : 1;
		pairs = ['0,0', `${Math.min(thru, n - 1)},0`];
	});
	const allPairs = $derived(Array.from({ length: n * n }, (_, k) => `${Math.floor(k / n)},${k % n}`));
	const sel = $derived(pairs.filter((p) => allPairs.includes(p)));
	const lab = (p: string) => { const [i, j] = p.split(',').map(Number); return `S${i + 1}${j + 1}`; };
	const series = $derived(b ? sel.map((p) => { const [i, j] = p.split(',').map(Number); return { p, ...sSeries(b, i, j) }; }) : []);
	const smith = $derived(b ? Array.from({ length: n }, (_, i) => ({ name: `S${i + 1}${i + 1}`, f: b.f_GHz, g: sSeries(b, i, i).z })) : []);
	let rk = $state<'R_ohm_per_m' | 'L_H_per_m' | 'G_S_per_m' | 'C_F_per_m'>('R_ohm_per_m');
	const RL: Record<string, [string, number, string]> = { R_ohm_per_m: ['R', 1, 'Ω/m'], L_H_per_m: ['L', 1e9, 'nH/m'], G_S_per_m: ['G', 1, 'S/m'], C_F_per_m: ['C', 1e12, 'pF/m'] };
	const nSig = $derived(Math.round(Math.sqrt((v?.derived?.rlgc?.[0]?.R_ohm_per_m ?? [0]).length)));
	const rlgc = $derived(v && fam === 'em2d' ? Array.from({ length: nSig * nSig }, (_, k) => ({ i: Math.floor(k / nSig), j: k % nSig, ...rlgcSeries(v, rk, Math.floor(k / nSig), k % nSig) })) : []);
	const files = $derived(em ? touchstones(em) : []);
	/** First numeric entry of a number, [re, im] or nested list (display only). */
	const n0 = (x: unknown): number => (typeof x === 'number' ? x : Array.isArray(x) ? n0(x[0]) : NaN);
	const f4 = (x: unknown) => { const v = n0(x); return Number.isFinite(v) ? fmt(v, 4) : '-'; };
	const caption = $derived(`case ${wb.caseId}, variant ${v?.variant ?? 'base'}, ${b?.label ?? ''}`);
</script>

{#if !em}
	<p class="muted">No EM result. Compute the case.</p>
{:else}
	<div class="row">
		<label class="f" data-tip="Case variant (variants block; base = the case as written)">variant <select bind:value={vi} aria-label="Variant">{#each variants as x, i}<option value={i}>{x.variant ?? 'base'}{x.title && x.title !== x.variant ? ` · ${x.title}` : ''}</option>{/each}</select></label>
		{#if node === 'res.em.s' || node === 'res.em.smith'}
			<label class="f" data-tip="Network: per line (single-ended), mixed-mode blocks (Sdd / Scc / Sdc / Scd), or the 3D block: S at zref (de-embedded per the run's method) or the solver S referenced to Re Z0 of each terminal before renormalization (SPEC 14.1, 14.5)">network <select bind:value={bi} aria-label="Network">{#each blocks as x, i}<option value={i}>{x.label}</option>{/each}</select></label>
		{/if}
	</div>
	{#if node === 'res.em.s'}
		{#if b}
			<div class="pairs" data-tip="Ports: {b.ports.map((p, i) => `${i + 1} = ${p}`).join(', ')}">
				{#each allPairs as p}<label class="chk"><input type="checkbox" checked={pairs.includes(p)} onchange={(e) => (pairs = e.currentTarget.checked ? [...pairs, p] : pairs.filter((x) => x !== p))} />{lab(p)}</label>{/each}
			</div>
			<LinePlot series={series.map((s) => ({ name: `|${lab(s.p)}|`, x: s.f, y: s.db, markers: true }))} bind:logX xLabel="f (GHz)" yLabel="|S| (dB)" ariaLabel="S-parameter magnitude" filename="{wb.caseId.replace(/\//g, '_')}-S-dB" height={210} csvNote={caption} />
			<LinePlot series={series.map((s) => ({ name: `arg ${lab(s.p)}`, x: s.f, y: s.ph, markers: true }))} bind:logX xLabel="f (GHz)" yLabel="phase (deg, unwrapped)" ariaLabel="S-parameter phase" filename="{wb.caseId.replace(/\//g, '_')}-S-phase" height={180} csvNote={caption} />
			<p class="muted small">Ports: {b.ports.map((p, i) => `${i + 1} = ${p}`).join(', ')}; reference {b.zref}.</p>
		{:else}<p class="muted">No S-parameters in this variant.</p>{/if}
	{:else if node === 'res.em.smith'}
		{#if b}<SmithChart traces={smith} filename="{wb.caseId.replace(/\//g, '_')}-smith" note={caption} height={320} />{:else}<p class="muted">No S-parameters.</p>{/if}
	{:else if node === 'res.em.rlgc'}
		{#if fam === 'em2d' && rlgc.length}
			<label class="f">quantity <select bind:value={rk} aria-label="RLGC quantity">{#each Object.keys(RL) as k}<option value={k}>{RL[k][0]} ({RL[k][2]})</option>{/each}</select></label>
			<LinePlot series={rlgc.filter((r) => r.i <= r.j).map((r) => ({ name: `${RL[rk][0]}${r.i + 1}${r.j + 1}`, x: r.f, y: r.v.map((x) => x * RL[rk][1]), markers: true }))} xLabel="f (GHz)" yLabel="{RL[rk][0]} ({RL[rk][2]})" ariaLabel="RLGC" filename="{wb.caseId.replace(/\//g, '_')}-{RL[rk][0]}" height={220} csvNote={caption} />
			<table class="grid"><thead><tr><th>f (GHz)</th><th>R (Ω/m)</th><th>L (nH/m)</th><th>G (S/m)</th><th>C (pF/m)</th></tr></thead><tbody>
				{#each v?.derived?.rlgc ?? [] as r}<tr><td class="num">{f4(r.f_GHz)}</td><td class="num">{f4(r.R_ohm_per_m)}</td><td class="num">{f4(n0(r.L_H_per_m) * 1e9)}</td><td class="num">{f4(r.G_S_per_m)}</td><td class="num">{f4(n0(r.C_F_per_m) * 1e12)}</td></tr>{/each}
			</tbody></table>
			<p class="muted small">Table: diagonal entry 11; plots: all entries ij (i &lt;= j).</p>
			{#if v?.derived?.modes?.length}
				<h4>Modes</h4>
				<table class="grid"><thead><tr><th>f (GHz)</th><th>mode</th><th>α (dB/mm)</th><th>ε_eff</th><th>Zc (Ω)</th></tr></thead><tbody>
					{#each v.derived.modes as m}{#each m.modes as mo, k}<tr><td class="num">{f4(m.f_GHz)}</td><td>{mo.parity ?? k + 1}</td><td class="num">{f4(mo.alpha_dB_mm)}</td><td class="num">{f4(mo.eps_eff)}</td><td class="num" data-tip="Zc: first entry (real part) of the characteristic impedance row of this mode">{Array.isArray(m.Zc_ohm) ? f4(m.Zc_ohm[k]) : f4(m.Zc_ohm)}</td></tr>{/each}{/each}
				</tbody></table>
			{/if}
		{:else}<p class="muted">RLGC(f) is an em2d output (per-unit-length line parameters).</p>{/if}
	{:else if node === 'res.em.targets'}
		{@const ts = wb.run?.result.targets ?? []}
		{#if ts.length}
			<table class="grid"><thead><tr><th>metric_id</th><th>quantity</th><th>f (GHz)</th><th>variant</th><th>computed</th><th>value</th><th>pass</th></tr></thead><tbody>
				{#each ts as t}<tr data-tip={[t.locator, t.note].filter(Boolean).join('\n') || undefined}><td class="mono small">{t.metric_id ?? '-'}</td><td class="small">{t.quantity}</td><td class="num">{t.f_GHz ?? ''}</td><td class="small">{t.variant ?? ''}</td><td class="num">{f4(t.computed)}</td><td class="num">{f4(t.value)} {t.unit ?? ''}</td><td class:warn={t.pass === false}>{t.pass == null ? '-' : t.pass ? 'pass' : 'miss'}</td></tr>{/each}
			</tbody></table>
		{:else}<p class="muted">The case has no targets.</p>{/if}
	{:else if node === 'res.em.ts'}
		{#if files.length}
			<table class="grid"><thead><tr><th>variant</th><th>file</th><th></th></tr></thead><tbody>
				{#each files as f}<tr><td>{f.variant}</td><td class="mono small">{f.name}</td><td><button class="mini" onclick={() => downloadText(f.name, f.text, 'text/plain')}>Download</button></td></tr>{/each}
			</tbody></table>
		{:else}<p class="muted">No Touchstone output (em2d / em3d `touchstone: true`).</p>{/if}
	{:else if node === 'res.em.info'}
		<dl class="kv">
			<dt>runner</dt><dd class="mono small">{wb.run?.result.runner}</dd>
			<dt>wall</dt><dd class="num">{fmt((wb.run?.ms ?? 0) / 1000, 3)} s</dd>
			{#each variants as x}<dt>{x.variant ?? 'base'}</dt><dd class="small">{x.mesh ? `${x.mesh.nodes ?? '-'} nodes, ${x.mesh.tris ?? x.mesh.tets ?? '-'} elements` : ''}{x.timing?.total_ms != null ? `, ${fmt(x.timing.total_ms / 1000, 3)} s` : ''}</dd>{/each}
		</dl>
		{#if fam === 'em3d'}
			{#each variants as x}
				{@const d = x.derived ?? {}}
				{@const pcs = (d.port_checks ?? []) as Record<string, any>[]}
				{@const comps = ((d.companions ?? []) as (Record<string, any> | null)[])}
				<h4>Variant {x.variant ?? 'base'}: de-embedding and port checks</h4>
				<p class="small">{deembedText(x)} <span class="muted">(deembed_method {d.deembed_method ?? '-'})</span></p>
				{#if pcs.length}
					<table class="grid"><thead><tr><th>port</th><th data-tip="3D port impedance vs a converged 2D solve of the port cross-section (warn above 3 %); not_checked with the reason for multi-signal, full-wave and te10 ports, a signal not crossing the face, em2d errors">z_check</th><th>Z port (Ω)</th><th>Z em2d (Ω)</th><th>rel</th><th>f (GHz)</th><th>reason</th></tr></thead><tbody>
						{#each pcs as pc}<tr><td class="mono small">{pc.port ?? pc.name ?? '-'}</td><td class:warn={pc.z_check === 'warn'} class:muted={pc.z_check === 'not_checked'}>{pc.z_check ?? '-'}</td><td class="num">{f4(pc.z_port_ohm)}</td><td class="num">{f4(pc.z_em2d_ohm)}</td><td class="num">{Number.isFinite(n0(pc.z_rel)) ? `${fmt(100 * n0(pc.z_rel), 3)} %` : '-'}</td><td class="num">{pc.f_GHz ?? ''}</td><td class="small">{pc.z_check_reason ?? ''}</td></tr>{/each}
					</tbody></table>
				{/if}
				{#if comps.some(Boolean)}
					<table class="grid"><thead><tr><th>companion</th><th>reference plane</th><th>DOF</th><th>tets</th><th>layers</th><th>2D tris</th><th>PML sides</th><th data-tip="companion impedance at the port face and at the reference plane">Z face / ref (Ω)</th><th>setup / solve (s)</th></tr></thead><tbody>
						{#each comps as cp}{#if cp}<tr><td class="mono small">{cp.port}</td><td class="small">{cp.reference_plane ? `${cp.reference_plane.axis} = ${cp.reference_plane.at_um} µm` : '-'}</td><td class="num">{cp.dof ?? '-'}</td><td class="num">{cp.tets ?? '-'}</td><td class="num">{Array.isArray(cp.layers) ? cp.layers.length : (cp.layers ?? '-')}</td><td class="num">{cp.tris2d ?? '-'}</td><td class="small">{(cp.pml_sides ?? []).join(', ') || '-'}</td><td class="num">{f4(cp.z_face_ohm)} / {f4(cp.z_ref_ohm)}</td><td class="num">{cp.setup_ms != null ? fmt(cp.setup_ms / 1000, 3) : '-'} / {cp.ms != null ? fmt(n0(cp.ms) / 1000, 3) : '-'}</td></tr>{/if}{/each}
					</tbody></table>
				{/if}
			{/each}
		{/if}
		{#if wb.run?.result.warnings?.length}<h4>Warnings</h4><ul>{#each wb.run.result.warnings as w}<li class="small">{w}</li>{/each}</ul>{/if}
	{/if}
{/if}

<style>
	.row { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 6px; }
	.f { display: flex; align-items: center; gap: 6px; color: var(--ink-2); }
	.f select { height: 22px; border-radius: 0; max-width: 260px; }
	.pairs { display: flex; flex-wrap: wrap; gap: 2px 10px; margin: 4px 0 6px; }
	.chk { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--ink-2); }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; }
	p { margin: 6px 0; }
	.small { font-size: 11px; }
	.warn { color: var(--warn); }
	.muted { color: var(--ink-3); }
	ul { padding-left: 16px; margin: 4px 0; }
	.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 6px 0; }
	.kv dt { color: var(--ink-3); } .kv dd { margin: 0; }
	.grid { width: 100%; border-collapse: collapse; font-size: 11px; } .grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.mini { height: 18px; padding: 0 5px; font-size: 10px; border-radius: 0; }
</style>
