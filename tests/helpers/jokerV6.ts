import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV6 } from '../../src/content/runtime/runSetupV6';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import { createShopV2 } from '../../src/game-core/economy/shopV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV6, type RunStateV6 } from '../../src/game-core/model/runV6';

export type CommandWithoutCheckpointV6 = RunCommandV2 extends infer Command
  ? Command extends RunCommandV2
    ? Omit<Command, 'checkpointId'>
    : never
  : never;

export function v6Card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
  patch: Partial<RunPlayingCard> = {},
): RunPlayingCard {
  return {
    id: `v6:${id}` as CardId,
    suit,
    rank,
    enhancementId: null,
    sealId: null,
    editionId: null,
    bonusChips: 0,
    ...patch,
  };
}

export function initialV6(seed: string): RunStateV6 {
  const state = createProductionRunV6(PRODUCTION_CATALOG, { seed });
  return {
    ...state,
    rules: {
      ...state.rules,
      jokerSlots: 20,
      consumableSlots: 10,
    },
    economy: { ...state.economy, money: 100 },
  };
}

export function acquireV6(
  state: RunStateV6,
  ordinal: number,
  suffix = String(state.inventory.jokers.length),
): RunStateV6 {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, contentId, `v6:${ordinal}:${suffix}`);
  if (!result.ok || !isRunStateV6(result.state)) {
    throw new Error(result.ok ? '获得奇牌后没有保持 V6' : result.message);
  }
  return result.state;
}

export function commandV6(
  state: RunStateV6,
  command: CommandWithoutCheckpointV6,
): RunStateV6 {
  const result = executeCommandV2(state, {
    ...command,
    checkpointId: state.checkpointId,
  });
  if (!result.ok || !isRunStateV6(result.state)) {
    throw new Error(result.ok ? '命令后没有保持 V6' : result.rejection.message);
  }
  return result.state;
}

export function scoreV6(state: RunStateV6, cards: readonly RunPlayingCard[]) {
  const result = resolveHandScoreV2(state, cards);
  if (!result.ok || !isRunStateV6(result.proposedState)) {
    throw new Error(result.ok ? '计分后没有保持 V6' : result.message);
  }
  return { ...result, proposedState: result.proposedState };
}

export function abilityV6(state: RunStateV6, ordinal: number, key: string): unknown {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const joker = state.inventory.jokers.find(
    (candidate) => candidate.contentId === contentId,
  );
  return state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === joker?.instanceId,
  )?.abilityState[key];
}

export function withoutJokersV6(state: RunStateV6): RunStateV6 {
  return {
    ...state,
    inventory: { ...state.inventory, jokers: [] },
    modifiersV3: { ...state.modifiersV3, jokers: [] },
    jokerRuntimeV6: { ...state.jokerRuntimeV6, jokerCapacityDebt: 0 },
  };
}

export function enterShopV6(state: RunStateV6): RunStateV6 {
  const created = createShopV2(state);
  if (!created.ok) throw new Error(created.message);
  return {
    ...state,
    rngState: created.rngState,
    phase: { kind: 'shop' },
    inventory: { ...state.inventory, tags: created.tags },
    progress: { ...state.progress, anteVoucherId: created.anteVoucherId },
    shop: created.shop,
  };
}
