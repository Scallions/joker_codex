import { isRunStateV3, type CatalogRunState as RunStateV3 } from '../model/runV3';
import { isRunStateV5 } from '../model/runV5';
import type { CardId } from '../model/ids';
import type { BlindKind, MaterializedBlind, RunStateV2 } from '../model/runV2';
import { nextInteger } from '../rng/random';
import { getBlindTarget } from '../score/score';
import { resolveJokerPassiveCapabilities } from './jokerPassiveCapabilitiesV3';

function setupRowsForRun(state: RunStateV3) {
  const ids = new Set([
    state.setupV3.deckId,
    ...state.setupV3.appliedStakeIds,
    ...(state.setupV3.challengeId ? [state.setupV3.challengeId] : []),
  ]);
  return state.productionContentV3.rows.filter(({ definition }) =>
    ids.has(definition.id),
  );
}

export function applySetupDrawRulesV3(
  state: RunStateV2,
  drawnCardIds: readonly CardId[],
  identity: string,
): RunStateV2 {
  if (!isRunStateV3(state) || !state.round || drawnCardIds.length === 0) {
    return state;
  }
  const operations = setupRowsForRun(state).flatMap(({ definition }) =>
    definition.effects.flatMap((effect) =>
      effect.operations.flatMap((operation) =>
        operation.type === 'card-transform' &&
        operation.field === 'face-down' &&
        operation.selection === 'drawn' &&
        operation.count > 0
          ? [{ effectId: effect.id, operation }]
          : [],
      ),
    ),
  );
  if (operations.length === 0) return state;

  let next = state;
  for (const { effectId, operation } of operations) {
    let rngState = next.rngState;
    const rolls: number[] = [];
    const faceDownIds: CardId[] = [];
    for (const cardId of drawnCardIds) {
      const roll = nextInteger(rngState, operation.count);
      rngState = roll.state;
      rolls.push(roll.value);
      if (roll.value === 0) faceDownIds.push(cardId);
    }
    const materialized: RunStateV3 = {
      ...next,
      rngState,
      round: {
        ...next.round!,
        faceDownCardIds: [...new Set([...next.round!.faceDownCardIds, ...faceDownIds])],
      },
      materializedChoicesV3: [
        ...next.materializedChoicesV3,
        {
          id: `bxqp:choice:setup-draw:${identity}:${effectId}`,
          kind: 'setup-draw-face-down',
          valueIds: faceDownIds,
          valueNumbers: rolls,
          checkpointId: next.checkpointId + 1,
        },
      ],
    };
    next = materialized;
  }
  return next;
}

export function applyBossCompletionSetupRulesV3(state: RunStateV2): RunStateV2 {
  if (!isRunStateV3(state) || state.progress.blindPosition !== 'boss') return state;
  let next = state;
  const rows = setupRowsForRun(state);
  const copyTokenCount = rows.reduce(
    (total, { definition }) =>
      total +
      definition.effects.reduce(
        (effectTotal, effect) =>
          effectTotal +
          effect.operations.reduce(
            (operationTotal, operation) =>
              operation.type === 'tag-rule' &&
              operation.timing === 'next-boss' &&
              operation.key === 'copy-next-tag' &&
              typeof operation.value === 'number'
                ? operationTotal + Math.max(0, Math.floor(operation.value))
                : operationTotal,
            0,
          ),
        0,
      ),
    0,
  );
  const copyTag = [...state.content.tags]
    .sort((left, right) => left.id.localeCompare(right.id))
    .find((definition) =>
      definition.effects.some((effect) => effect.parameters.key === 'copy-next-tag'),
    );
  if (copyTag && copyTokenCount > 0) {
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        tags: [
          ...next.inventory.tags,
          ...Array.from({ length: copyTokenCount }, (_, index) => ({
            instanceId: `bxqp:tag-instance:boss-copy:${next.runId}:${next.progress.ante}:${next.checkpointId + 1}:${index}`,
            contentId: copyTag.id,
            consumed: false,
            deferredWindow: null,
          })),
        ],
      },
    };
  }

  if (
    next.progress.ante >= 4 &&
    next.rulesV3.excludedRuleKeys.includes('capacity-after-ante-four')
  ) {
    const existingModifiers = new Map(
      next.modifiersV3.jokers.map((modifier) => [modifier.instanceId, modifier]),
    );
    const closed: RunStateV3 = {
      ...next,
      rules: { ...next.rules, jokerSlots: 0 },
      modifiersV3: {
        ...next.modifiersV3,
        jokers: next.inventory.jokers.map((joker) => {
          const modifier = existingModifiers.get(joker.instanceId);
          return {
            instanceId: joker.instanceId,
            stickerIds: [
              ...new Set([...(modifier?.stickerIds ?? []), 'bxqp:sticker:permanent']),
            ],
            perishableRoundsRemaining: modifier?.perishableRoundsRemaining ?? null,
            rentalRoundCost: modifier?.rentalRoundCost ?? 0,
            saleAllowed: false,
            slotContribution: joker.slotContribution,
          };
        }),
      },
    };
    next = closed;
  }
  return next;
}

export function getBlindTargetForRun(state: RunStateV2, blindMultiplier: number): number {
  if (!isRunStateV3(state) || state.progress.ante < 1 || state.progress.ante > 8) {
    return getBlindTarget(
      state.progress.ante,
      blindMultiplier,
      state.rules.targetScaleBasisPoints,
    );
  }
  if (!Number.isFinite(blindMultiplier) || blindMultiplier <= 0) {
    throw new RangeError('盲注目标倍率必须为正有限数');
  }
  const base = state.rulesV3.anteOneThroughEightTargets[state.progress.ante - 1];
  if (base === undefined) throw new RangeError('V3 盲注目标曲线缺少当前幕次');
  const scaled = Math.floor(
    (base * blindMultiplier * state.rules.targetScaleBasisPoints) / 10_000,
  );
  return Number.isFinite(scaled) ? Math.max(1, scaled) : Number.POSITIVE_INFINITY;
}

export function effectiveHandSizeForRun(
  state: RunStateV2,
  blind: MaterializedBlind | null = state.round?.blind ?? null,
): number {
  let handSize = state.rules.handSize;
  const passives = resolveJokerPassiveCapabilities(state);
  if (passives.ok) handSize += passives.capabilities.handSizeDelta;
  if (
    isRunStateV3(state) &&
    state.rulesV3.excludedRuleKeys.includes('dynamic-hand-size')
  ) {
    handSize -= Math.floor(Math.max(0, state.economy.money) / 5);
  }
  const blindEffectsDisabled =
    isRunStateV5(state) &&
    state.jokerRuntimeV5.bossDisabledForRound &&
    (blind?.kind === 'boss' || blind?.kind === 'finisher');
  for (const effect of blindEffectsDisabled ? [] : (blind?.effects ?? [])) {
    const key = effect.parameters.key;
    const value = effect.parameters.value;
    const mode = effect.parameters.mode;
    if (key === 'hand-size' && typeof value === 'number') {
      handSize = mode === 'set' ? value : handSize + value;
    }
  }
  for (const tag of state.inventory.tags) {
    if (tag.consumed || tag.deferredWindow !== 'round-start') continue;
    const definition = state.content.tags.find(
      (candidate) => candidate.id === tag.contentId,
    );
    for (const effect of definition?.effects ?? []) {
      if (
        effect.parameters.key === 'hand-size' &&
        typeof effect.parameters.value === 'number'
      ) {
        handSize += effect.parameters.value;
      }
    }
  }
  return Math.max(1, Math.floor(handSize));
}

export function effectiveDiscardsPerRoundForRun(state: RunStateV2): number {
  const passives = resolveJokerPassiveCapabilities(state);
  return Math.max(
    0,
    state.rules.discardsPerRound +
      (passives.ok ? passives.capabilities.discardsPerRoundDelta : 0),
  );
}

export function activeBlindRuleValue(
  state: RunStateV2,
  key: string,
): string | number | boolean | null {
  if (
    isRunStateV5(state) &&
    state.jokerRuntimeV5.bossDisabledForRound &&
    (state.round?.blind.kind === 'boss' || state.round?.blind.kind === 'finisher')
  ) {
    return null;
  }
  for (const effect of state.round?.blind.effects ?? []) {
    if (effect.parameters.key !== key) continue;
    const value = effect.parameters.value;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
  }
  return null;
}

export function hasActiveBlindRule(state: RunStateV2, key: string): boolean {
  return activeBlindRuleValue(state, key) !== null;
}

export function replacementDrawCountForRun(
  state: RunStateV2,
  keptCardCount: number,
): number {
  const exact = activeBlindRuleValue(state, 'draw-exactly');
  if (typeof exact === 'number') {
    return Math.min(Math.max(0, Math.floor(exact)), state.round?.drawPileIds.length ?? 0);
  }
  return Math.min(
    Math.max(0, effectiveHandSizeForRun(state) - keptCardCount),
    state.round?.drawPileIds.length ?? 0,
  );
}

export function blindRewardForRun(
  state: RunStateV2,
  kind: BlindKind,
  ordinaryReward: number,
): number {
  if (!isRunStateV3(state)) return ordinaryReward;
  const policy = state.rulesV3.blindRewardPolicy;
  if (policy === 'all-zero') return 0;
  if (policy === 'small-zero' && kind === 'small') return 0;
  if (policy === 'small-big-zero' && (kind === 'small' || kind === 'big')) return 0;
  return ordinaryReward;
}

export function remainingHandRewardForRun(
  state: RunStateV2,
  handsRemaining: number,
): number {
  return handsRemaining * (isRunStateV3(state) ? state.rulesV3.remainingHandReward : 1);
}

export function remainingDiscardRewardForRun(
  state: RunStateV2,
  discardsRemaining: number,
): number {
  return isRunStateV3(state)
    ? discardsRemaining * state.rulesV3.remainingDiscardReward
    : 0;
}

export function discardCostForRun(state: RunStateV2): number {
  return isRunStateV3(state) ? state.rulesV3.discardCost : 0;
}

export function recordPurchaseForRun(state: RunStateV2): RunStateV2 {
  if (!isRunStateV3(state)) return state;
  const next: RunStateV3 = {
    ...state,
    rulesV3: {
      ...state.rulesV3,
      purchasesMade: state.rulesV3.purchasesMade + 1,
    },
  };
  return next;
}

export function canSellJokerForRun(state: RunStateV2, instanceId: string): boolean {
  if (!isRunStateV3(state)) return true;
  return (
    state.modifiersV3.jokers.find((modifier) => modifier.instanceId === instanceId)
      ?.saleAllowed ?? true
  );
}

export type StickerSettlementV3 =
  | { readonly ok: true; readonly state: RunStateV2; readonly upkeep: number }
  | {
      readonly ok: false;
      readonly code: 'insufficient-funds';
      readonly message: string;
    };

export function settleJokerStickersV3(state: RunStateV2): StickerSettlementV3 {
  if (!isRunStateV3(state)) return { ok: true, state, upkeep: 0 };
  const upkeep = state.modifiersV3.jokers.reduce(
    (total, modifier) => total + modifier.rentalRoundCost,
    0,
  );
  if (state.economy.money - upkeep < -state.rules.allowedDebt) {
    return {
      ok: false,
      code: 'insufficient-funds',
      message: '租借贴签的回合费用会超出当前欠票额度',
    };
  }
  const modifiers = state.modifiersV3.jokers.map((modifier) => ({
    ...modifier,
    perishableRoundsRemaining:
      modifier.perishableRoundsRemaining === null
        ? null
        : Math.max(0, modifier.perishableRoundsRemaining - 1),
  }));
  const expired = new Set(
    modifiers
      .filter((modifier) => modifier.perishableRoundsRemaining === 0)
      .map((modifier) => modifier.instanceId),
  );
  const next: RunStateV3 = {
    ...state,
    inventory: {
      ...state.inventory,
      jokers: state.inventory.jokers.map((joker) =>
        expired.has(joker.instanceId) ? { ...joker, debuffed: true } : joker,
      ),
    },
    modifiersV3: { ...state.modifiersV3, jokers: modifiers },
  };
  return { ok: true, state: next, upkeep };
}
