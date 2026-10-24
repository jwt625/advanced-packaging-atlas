// Assembly / substrate tool actors (lane L38, DevLog-016). Keyed by the contract tool ids (CONTRACT.md section 11).
// The engine registry (tools/index.ts, lane L35) merges this map with the fab tools. Factories take optional call
// args so that geometry-relevant args (head type, mode, piece / site sizes) are known before place(); they are also
// re-read on every update (a change rebuilds the geometry).

import type { ToolActor, ToolArgs } from '../../types';
import { createBallPlacer } from './ball_placer';
import { createJetDispenser } from './jet_dispenser';
import { createLaminator } from './laminator';
import { createLaserDrill } from './laser_drill';
import { createMoldChase } from './mold_chase';
import { createPickPlace } from './pick_place';
import { createReflowOven } from './reflow_oven';
import { createStencilPrinter } from './stencil_printer';
import { createTcbHead } from './tcb_head';
import { createXrayCt } from './xray_ct';

export type { AssemblyToolActor, Readout, Trace, Hold } from './common';
export { specCounts } from './common';

export const ASSEMBLY_TOOLS: Record<string, (args?: ToolArgs) => ToolActor> = {
	tcb_head: createTcbHead,
	pick_place: createPickPlace,
	jet_dispenser: createJetDispenser,
	mold_chase: createMoldChase,
	reflow_oven: () => createReflowOven(),
	ball_placer: createBallPlacer,
	stencil_printer: createStencilPrinter,
	laminator: () => createLaminator(),
	laser_drill: createLaserDrill,
	xray_ct: createXrayCt
};
