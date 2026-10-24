// Tool registry (contract ids, CONTRACT.md section 11). Merges FAB_TOOLS (lane L37, ./fab/index.ts) and
// ASSEMBLY_TOOLS (lane L38, ./assembly/index.ts) when those modules exist; any other id gets the placeholder actor.
import type { ToolActor, ToolArgs } from '../types';
import { placeholderTool } from './placeholder';

export type ToolFactory = (args?: ToolArgs) => ToolActor;

export const TOOL_IDS = [
	'cmp', 'grinder', 'drie', 'laser_drill', 'pvd', 'cvd', 'ecp', 'litho', 'spin_coater', 'laminator', 'wet_bench', 'tcb_head',
	'pick_place', 'wafer_bonder', 'jet_dispenser', 'mold_chase', 'reflow_oven', 'cure_oven', 'laser_debond', 'dicing_blade',
	'ball_placer', 'stencil_printer', 'xray_ct', 'laminator_roll'
] as const;

const mods = import.meta.glob(['./fab/index.ts', './assembly/index.ts']);
const real: Record<string, ToolFactory> = {};
let loaded: Promise<string[]> | null = null;

/** Load the lane tool maps (once). Returns the ids that have a real actor. */
export function loadTools(): Promise<string[]> {
	if (loaded) return loaded;
	loaded = (async () => {
		for (const [path, load] of Object.entries(mods)) {
			try {
				const m = (await load()) as { FAB_TOOLS?: Record<string, ToolFactory>; FAB_EXTRA_TOOLS?: Record<string, ToolFactory>; ASSEMBLY_TOOLS?: Record<string, ToolFactory> };
				Object.assign(real, m.FAB_TOOLS ?? {}, m.FAB_EXTRA_TOOLS ?? {}, m.ASSEMBLY_TOOLS ?? {});
			} catch (e) {
				console.warn(`[process3d] tool module ${path} failed to load; placeholders used`, e);
			}
		}
		return Object.keys(real);
	})();
	return loaded;
}

export function createTool(id: string, args?: ToolArgs): { actor: ToolActor; placeholder: boolean } {
	const f = real[id];
	if (f) {
		try {
			return { actor: f(args), placeholder: false };
		} catch (e) {
			console.warn(`[process3d] tool ${id} failed to construct; placeholder used`, e);
		}
	}
	return { actor: placeholderTool(id), placeholder: true };
}
