// PLACEHOLDER tool actor (lane L35): a grey wireframe head that approaches, works and retracts, so the engine runs
// before the real tools land (lanes L37 fab, L38 assembly). Sizes are view fractions of the frame, not tool data.
import * as THREE from 'three';
import type { ScaleId, ToolActor, ToolArgs, ToolCtx, ToolFrame } from '../types';

const SPIN = new Set(['cmp', 'grinder', 'dicing_blade', 'spin_coater']);

export function placeholderTool(id: string): ToolActor {
	const group = new THREE.Group();
	group.name = `tool:${id} (placeholder)`;
	const mat = new THREE.MeshBasicMaterial({ color: 0x9a9a92, wireframe: true, transparent: true, opacity: 0.55 });
	const head = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 1), mat);
	group.add(head);
	let size = 1;
	let height = 1;
	let fr: ToolFrame | null = null;
	const scales: ScaleId[] = ['work', 'block'];
	return {
		id,
		name: `${id} (placeholder)`,
		scales,
		spec: {},
		group,
		place(frame: ToolFrame) {
			fr = frame;
			// work: a third of the carrier; block: a quarter of the window width
			const span = frame.scale === 'work'
				? frame.carrier.shape === 'disk' ? frame.carrier.d_um : Math.max(frame.carrier.w_um, frame.carrier.dd_um)
				: frame.window ? frame.window.x1_um - frame.window.x0_um : frame.unit.w_um;
			size = span * (frame.scale === 'work' ? 0.35 : 0.25);
			height = size * 0.3;
			head.scale.set(size, height, size);
		},
		update(t: number, _args: ToolArgs, ctx: ToolCtx) {
			const a = ctx.phase === 'approach' ? 1 - t / 0.12 : ctx.phase === 'retract' ? (t - 0.9) / 0.1 : 0;
			const gap = Math.max(0, Math.min(1, a)) * size * 0.6;
			const y = fr ? fr.zmap(ctx.surface_um) : 0; // current surface in the tool frame (contract v1.1)
			head.position.set(0, y + height / 2 + gap + size * 0.02, 0);
			head.rotation.y = SPIN.has(id) && !ctx.reduceMotion ? ctx.tPlay_s * 2 : 0;
		},
		pick: () => `${id}: placeholder tool (real actor pending in lanes L37 / L38)`,
		dispose() {
			head.geometry.dispose();
			mat.dispose();
		}
	};
}
