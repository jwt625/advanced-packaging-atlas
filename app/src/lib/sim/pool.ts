// Ported from eo-modulator-atlas app/src/lib/sim/pool.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: generic job/outcome types for the packaging worker protocol (sim.worker.ts); default pool size
// min(2, hardwareConcurrency - 1) for 3D points (R7 2.2: heavier than EO 2D points), `?pool=N` override kept.
// N module workers, one job per message, results streamed back. No SharedArrayBuffer (static hosting cannot set
// COOP/COEP); jobs carry only text and options.
import type { WorkerIn, WorkerOut } from './protocol';

export interface PoolJob {
	index: number;
	msg: WorkerIn;
}

export interface PoolCallbacks {
	onStart: (index: number) => void;
	onResult: (index: number, out: WorkerOut, ms: number) => void;
	onDone: () => void;
}

/** Pool size: min(2, hardwareConcurrency - 1) by default; `?pool=N` sets it, never above hardwareConcurrency - 1. */
export function poolSize(jobs: number): number {
	const hc = Math.max(1, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2) - 1);
	const cap = Number(typeof location !== 'undefined' ? new URLSearchParams(location.search).get('pool') : NaN);
	const want = Number.isInteger(cap) && cap > 0 ? cap : 2;
	return Math.max(1, Math.min(jobs, hc, want));
}

export function newSimWorker(): Worker {
	return new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
}

export class SweepPool {
	private workers: Worker[] = [];
	private cancelled = false;

	constructor(private size: number) {}

	run(jobs: PoolJob[], cb: PoolCallbacks): void {
		const queue = [...jobs];
		let active = 0;
		const next = (w: Worker) => {
			if (this.cancelled) return;
			const job = queue.shift();
			if (!job) {
				w.terminate();
				this.workers = this.workers.filter((x) => x !== w);
				if (--active === 0) cb.onDone();
				return;
			}
			const t0 = performance.now();
			cb.onStart(job.index);
			w.onmessage = (ev: MessageEvent<WorkerOut>) => {
				if (this.cancelled) return;
				const d = ev.data;
				if (d.type === 'progress') return;
				cb.onResult(job.index, d, performance.now() - t0);
				next(w);
			};
			w.onerror = (ev) => {
				if (this.cancelled) return;
				ev.preventDefault();
				cb.onResult(job.index, { type: 'error', message: ev.message || 'worker failed' }, performance.now() - t0);
				// A crashed worker is replaced so the remaining jobs still run.
				w.terminate();
				this.workers = this.workers.filter((x) => x !== w);
				next(this.spawn());
			};
			w.postMessage(job.msg);
		};
		const n = Math.min(this.size, jobs.length);
		if (!n) {
			cb.onDone();
			return;
		}
		for (let i = 0; i < n; i++) {
			active++;
			next(this.spawn());
		}
	}

	private spawn(): Worker {
		const w = newSimWorker();
		this.workers.push(w);
		return w;
	}

	get count(): number {
		return this.workers.length;
	}

	cancel(): void {
		this.cancelled = true;
		for (const w of this.workers) {
			w.onmessage = null;
			w.onerror = null;
			w.terminate();
		}
		this.workers = [];
	}
}
