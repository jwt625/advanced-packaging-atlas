// Ported from eo-modulator-atlas app/src/lib/sim/post/client.ts at eb97f96 (GPL-3.0-or-later).
// Local changes: packaging post ops (protocol.ts PostOp); one channel per feature: a newer request on the same channel
// makes the older reply stale (dropped, its promise rejects with `stale`), so a dragged slice coalesces.
import type { PostOp, WorkerOut } from './protocol';

export class StaleReply extends Error {
	constructor() {
		super('stale');
	}
}

export class PostClient {
	private seq = 0;
	private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; channel: string; t0: number }>();
	private latest = new Map<string, number>();
	/** Worker time of the last reply per channel (ms). */
	timing: Record<string, number> = {};

	constructor(private worker: Worker) {}

	request<T>(op: PostOp, channel: string): Promise<T> {
		const seq = ++this.seq;
		this.latest.set(channel, seq);
		return new Promise<T>((resolve, reject) => {
			this.pending.set(seq, { resolve: resolve as (v: unknown) => void, reject, channel, t0: performance.now() });
			this.worker.postMessage({ type: 'post', seq, ...op });
		});
	}

	/** Route a `post` reply from the worker. */
	handle(d: Extract<WorkerOut, { type: 'post' }>) {
		const p = this.pending.get(d.seq);
		if (!p) return;
		this.pending.delete(d.seq);
		if (this.latest.get(p.channel) !== d.seq) return p.reject(new StaleReply());
		this.timing[p.channel] = d.ms;
		if (d.error) p.reject(new Error(d.error));
		else p.resolve(d.data);
	}

	dispose() {
		for (const p of this.pending.values()) p.reject(new StaleReply());
		this.pending.clear();
	}
}
