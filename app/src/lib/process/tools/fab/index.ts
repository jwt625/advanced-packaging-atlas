// Fab (wafer-level) tool actors, lane L37 (DevLog-016, contract section 11). Merged by tools/index.ts (lane L35).
// Every actor implements FabToolActor (common.ts): ToolActor + readouts / traces / defaultDuration / group.userData.hold
// (the HUD extras of tools/assembly) + faceDown / workRot (lane note L37, interface notes).
import type { ToolActor, ToolArgs } from '../../types';
import { createCmp } from './cmp';
import { createGrinder } from './grinder';
import { createDrie, createCvd } from './chamber';
import { createPvd } from './pvd';
import { createEcp } from './ecp';
import { createLitho, createSpinCoater } from './litho';
import { createCureOven, createRollLaminator, createWaferBonder, createWetBench } from './benches';
import { createDicingBlade, createLaserDebond } from './debond_dice';

export type { FabToolActor, Readout, Trace, Hold } from './common';

export const FAB_TOOLS: Record<string, (args?: ToolArgs) => ToolActor> = {
	cmp: createCmp,
	grinder: createGrinder,
	drie: createDrie,
	cvd: createCvd,
	pvd: createPvd,
	ecp: createEcp,
	litho: createLitho,
	spin_coater: createSpinCoater,
	wet_bench: createWetBench,
	cure_oven: createCureOven,
	wafer_bonder: createWaferBonder,
	laser_debond: createLaserDebond,
	dicing_blade: createDicingBlade
};

/**
 * Dry-film roll laminator (op coat, method dry_film on a wafer). Not in FAB_TOOLS: the contract id `laminator` is
 * owned by tools/assembly (vacuum laminator, lane L38). L35 may route coat/dry_film on a wafer piece here.
 */
export const FAB_EXTRA_TOOLS: Record<string, (args?: ToolArgs) => ToolActor> = {
	laminator_roll: createRollLaminator
};
