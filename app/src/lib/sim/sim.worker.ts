// Solver worker of the packaging /sim workbench (pattern: eo-modulator-atlas app/src/lib/sim.worker.ts, GPL-3.0-or-later).
// `run`: case YAML text in, progress messages, one SPEC 5 result out (typed arrays transferred). The worker then
// keeps the grid and fields and answers `post` requests (surface, slice, line; EO DevLog-030 P1: postprocessing runs
// where the solution lives). Cancel or a new Compute = the page terminates the worker.
import { runCase } from './engineRun';
import { setRvePreference } from './engine';
import { PostSession } from './post';
import type { WorkerIn, WorkerOut } from './protocol';

const post = (msg: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);
let session: PostSession | null = null;
/**
 * package3d.json parsed once per worker (audit M12: the page sends its URL, not the 2.5 MB object). A failure is
 * reported with its reason (audit A3 M10): runCase refuses generator families without it.
 */
const dataCache = new Map<string, Promise<{ data: unknown; error: string }>>();
function dataOf(url: string): Promise<{ data: unknown; error: string }> {
	if (!url) return Promise.resolve({ data: null, error: 'the page did not load package3d.json (no URL)' });
	if (!dataCache.has(url))
		dataCache.set(
			url,
			fetch(url)
				.then(async (r) => (r.ok ? { data: (await r.json()) as unknown, error: '' } : { data: null, error: `HTTP ${r.status}` }))
				.catch((e) => ({ data: null, error: e instanceof Error ? e.message : String(e) }))
		);
	return dataCache.get(url)!;
}

const buffers = (...a: (ArrayBufferView | null | undefined)[]) => a.filter((x): x is ArrayBufferView => !!x).map((x) => x.buffer as ArrayBuffer);

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
	const job = ev.data;
	if (job.type === 'run') {
		const t0 = performance.now();
		setRvePreference(!!job.rveLive);
		try {
			const d = await dataOf(job.dataUrl);
			const out = await runCase(job.text, job.study, job.parts, (phase, message) => post({ type: 'progress', id: job.id, phase, message }), d.data, job.metrics ?? null, d.error);
			session = out.grid ? new PostSession(out.grid, out.T, out.U ?? [], out.VM ?? [], out.activeCells ?? null, out.masks ?? []) : null;
			if (session && out.kOf) session.kOf = out.kOf;
			const r = out.result;
			post({ type: 'result', id: job.id, result: r, ms: performance.now() - t0 }, buffers(r.grid.xs, r.grid.ys, r.grid.zs, r.grid.cellPart, r.fields.T_K));
		} catch (e) {
			post({ type: 'error', id: job.id, message: e instanceof Error ? e.message : String(e) });
		}
		return;
	}
	if (job.type === 'post') {
		const t0 = performance.now();
		try {
			if (!session) throw new Error('no solution in this worker');
			if (job.op === 'surface' || job.op === 'slice') {
				const s = job.op === 'surface' ? session.surface(job.expr, job.clip, !!job.synthetic, job.point ?? 0) : session.slice(job.expr, job.axis, job.pos_m, job.point ?? 0);
				post({ type: 'post', seq: job.seq, data: s, ms: performance.now() - t0 }, buffers(s.pos, s.val, s.disp, s.index, s.faceCell));
			} else if (job.op === 'iso') {
				const s = session.iso(job.expr, job.levels, job.point ?? 0);
				post({ type: 'post', seq: job.seq, data: s, ms: performance.now() - t0 }, buffers(s.pos, s.val, s.index, s.faceCell));
			} else if (job.op === 'arrows') {
				const r = session.arrows(job.kind, job.target, job.point ?? 0);
				post({ type: 'post', seq: job.seq, data: r, ms: performance.now() - t0 }, buffers(r.pos, r.vec, r.mag));
			} else if (job.op === 'vtu') {
				post({ type: 'post', seq: job.seq, data: session.vtu(job.point ?? 0, job.partIds ?? []), ms: performance.now() - t0 });
			} else if (job.op === 'setRef') {
				session.ref = job.field;
				post({ type: 'post', seq: job.seq, data: true, ms: performance.now() - t0 });
			} else if (job.op === 'line') {
				const l = session.line(job.axis, job.p, job.expr ?? 'T', job.point ?? 0);
				post({ type: 'post', seq: job.seq, data: l, ms: performance.now() - t0 }, buffers(l.s, l.v));
			}
		} catch (e) {
			post({ type: 'post', seq: job.seq, error: e instanceof Error ? e.message : String(e), ms: performance.now() - t0 });
		}
	}
};
