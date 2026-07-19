import { definitionIsEligibleV3, materializeItemV2 } from '../economy/shopV2';
import { drawJokerDefinitionV3 } from '../economy/jokerRarityV3';
import { saleValue } from '../economy/pricing';
import { stableId, type CardId, type JokerInstanceId } from '../model/ids';
import {
  isRunStateV3,
  isRunStateV4,
  materializeJokerStickersV3,
  synchronizeRunStateV3,
  type CatalogRunState as RunStateV3,
} from '../model/runV3';
import { RANKS, SUITS } from '../model/cards';
import type {
  EffectParameterValue,
  EffectWindow,
  ItemDefinitionV2,
  OwnedConsumableV2,
  OwnedJokerV2,
  RunPlayingCard,
  RunStateV2,
} from '../model/runV2';
import { POKER_HAND_TYPES, type PokerHandType } from '../poker/evaluate';
import type { HandFactsV3 } from '../poker/handFactsV3';
import { nextInteger, type RandomState } from '../rng/random';
import { pickWeightedStable } from '../rng/weighted';
import { eligibleBosses, materializeBlind } from '../rules/ante';
import {
  evaluateJokerPredicateV3,
  evaluateJokerValueV3,
  type JokerDslFailureCode,
} from '../rules/jokerEffectDslV3';
import type { EffectOperation } from './registry';
import { recordFirstAcquisitionDiscoveryV3 } from '../rules/discoveryV3';

export interface StateOperationContextV3 {
  readonly window: EffectWindow;
  readonly sourceInstanceId: string;
  readonly effectId: string;
  readonly selectedIds?: readonly string[];
}

export type StateOperationFailureCodeV3 =
  'insufficient-funds' | 'inventory-full' | 'pool-empty' | JokerDslFailureCode;

export type StateOperationResultV3 =
  | { readonly ok: true; readonly state: RunStateV2; readonly handled: boolean }
  | {
      readonly ok: false;
      readonly code: StateOperationFailureCodeV3;
      readonly message: string;
    };

function result(state: RunStateV2, handled = true): StateOperationResultV3 {
  return { ok: true, state, handled };
}

function destroyRightJokerAndGrow(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-destroy-right-grow' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  if (!isRunStateV4(state)) return state;
  const sourceIndex = state.inventory.jokers.findIndex(
    ({ instanceId }) => instanceId === context.sourceInstanceId,
  );
  const source = state.inventory.jokers[sourceIndex];
  const target = state.inventory.jokers[sourceIndex + 1];
  if (!source || !target) return state;
  const targetModifier = state.modifiersV3.jokers.find(
    ({ instanceId }) => instanceId === target.instanceId,
  );
  if (targetModifier?.stickerIds.includes('bxqp:sticker:permanent')) return state;
  const sourceModifier = state.modifiersV3.jokers.find(
    ({ instanceId }) => instanceId === source.instanceId,
  );
  const current = sourceModifier?.abilityState[operation.stateKey];
  if (typeof current !== 'number' || !Number.isFinite(current)) return state;
  const growth =
    saleValue(
      target.baseCost,
      target.editionCost,
      state.rules.priceDiscountBasisPoints,
      target.sellValueOverride,
    ) * operation.saleValueScale;
  const next = {
    ...state,
    inventory: {
      ...state.inventory,
      jokers: state.inventory.jokers.filter(
        ({ instanceId }) => instanceId !== target.instanceId,
      ),
    },
    modifiersV3: {
      ...state.modifiersV3,
      jokers: state.modifiersV3.jokers
        .filter(({ instanceId }) => instanceId !== target.instanceId)
        .map((modifier) =>
          modifier.instanceId === source.instanceId
            ? {
                ...modifier,
                abilityState: {
                  ...modifier.abilityState,
                  [operation.stateKey]: current + growth,
                },
              }
            : modifier,
        ),
    },
  };
  return next;
}

function createFixedEnhancedPlayingCard(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-create-playing-card' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  if (!isRunStateV3(state) || operation.predicate.kind !== 'always') return state;
  const suit = nextInteger(state.rngState, SUITS.length);
  const rank = nextInteger(suit.state, RANKS.length);
  const created: RunPlayingCard = {
    id: stableId<'playing-card'>(
      `playing:joker-created:${state.runId}:${state.checkpointId + 1}:${context.sourceInstanceId}:${context.effectId}:${state.deck.cards.length}`,
    ),
    suit: SUITS[suit.value]!,
    rank: RANKS[rank.value]!,
    enhancementId: operation.enhancementId,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
  const next: RunStateV2 = {
    ...state,
    rngState: rank.state,
    deck: { cards: [...state.deck.cards, created] },
    round: state.round
      ? {
          ...state.round,
          discardPileIds: [...state.round.discardPileIds, created.id],
        }
      : null,
  };
  return materializeChoice(
    synchronizeRunStateV3(next),
    context,
    'joker-created-playing-card',
    [created.id, operation.enhancementId],
    [suit.value, rank.value],
  );
}

function lifecycleFacts(state: RunStateV2): HandFactsV3 {
  const displayedHand = state.lastHand?.handType ?? 'high-card';
  return {
    contains: {
      pair: displayedHand === 'pair',
      threeOfAKind: displayedHand === 'three-of-a-kind',
      twoPair: displayedHand === 'two-pair',
      straight: displayedHand === 'straight' || displayedHand === 'straight-flush',
      flush:
        displayedHand === 'flush' ||
        displayedHand === 'straight-flush' ||
        displayedHand === 'flush-house' ||
        displayedHand === 'flush-five',
    },
    displayedHand,
    playedCardIds: state.lastHand?.playedCardIds ?? [],
    scoringCardIds: state.lastHand?.scoringCardIds ?? [],
    heldCardIds: state.round?.handIds ?? [],
    selectedHeldCardId: null,
    effectiveCards: {},
    rules: {
      straightSize: state.rules.straightSize,
      flushSize: state.rules.flushSize,
    },
  };
}

function applyLifecycleJokerScore(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-score' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  if (operation.metric !== 'money') return result(state, false);
  const dslContext = {
    state,
    facts: lifecycleFacts(state),
    sourceInstanceId: context.sourceInstanceId as JokerInstanceId,
    window: context.window,
    rngState: state.rngState,
    originalStencilCount: 0,
  };
  const predicate = evaluateJokerPredicateV3(operation.predicate, dslContext);
  if (!predicate.ok) return predicate;
  let next = { ...state, rngState: predicate.rngState };
  const predicateRolls = predicate.rolls.map(({ value }) => value);
  if (!predicate.matched) {
    return result(
      predicateRolls.length > 0
        ? materializeChoice(
            next,
            context,
            'joker-lifecycle-rolls',
            [context.sourceInstanceId],
            predicateRolls,
          )
        : next,
    );
  }
  const value = evaluateJokerValueV3(operation.value, {
    ...dslContext,
    state: next,
    rngState: next.rngState,
  });
  if (!value.ok) return value;
  next = {
    ...next,
    rngState: value.rngState,
    economy: {
      ...next.economy,
      money: next.economy.money + value.value,
    },
  };
  const rolls = [...predicateRolls, ...value.rolls.map(({ value: roll }) => roll)];
  return result(
    rolls.length > 0
      ? materializeChoice(
          next,
          context,
          'joker-lifecycle-rolls',
          [context.sourceInstanceId],
          rolls,
        )
      : next,
  );
}

function applyLifecycleJokerStateChange(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-state-change' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  if (!isRunStateV4(state)) return result(state);
  const dslContext = {
    state,
    facts: lifecycleFacts(state),
    sourceInstanceId: context.sourceInstanceId as JokerInstanceId,
    window: context.window,
    rngState: state.rngState,
    originalStencilCount: 0,
  };
  const predicate = evaluateJokerPredicateV3(operation.predicate, dslContext);
  if (!predicate.ok) return predicate;
  let next = { ...state, rngState: predicate.rngState };
  const rolls = predicate.rolls.map(({ value }) => value);
  if (!predicate.matched) {
    return result(
      rolls.length > 0
        ? materializeChoice(
            next,
            context,
            'joker-lifecycle-rolls',
            [context.sourceInstanceId],
            rolls,
          )
        : next,
    );
  }
  const value = evaluateJokerValueV3(operation.value, {
    ...dslContext,
    state: next,
    rngState: next.rngState,
  });
  if (!value.ok) return value;
  rolls.push(...value.rolls.map(({ value: roll }) => roll));
  const source = next.modifiersV3.jokers.find(
    ({ instanceId }) => instanceId === context.sourceInstanceId,
  );
  const current = source?.abilityState[operation.key];
  if (typeof current !== 'number' || !Number.isFinite(current)) {
    return {
      ok: false,
      code: 'joker-state-key',
      message: `奇牌能力状态键无效：${operation.key}`,
    };
  }
  const changed =
    operation.mode === 'set'
      ? value.value
      : operation.mode === 'add'
        ? current + value.value
        : Math.max(0, current - value.value);
  if (!Number.isFinite(changed)) {
    return {
      ok: false,
      code: 'joker-value-range',
      message: `奇牌能力状态结果无效：${operation.key}`,
    };
  }
  next = {
    ...next,
    rngState: value.rngState,
    modifiersV3: {
      ...next.modifiersV3,
      jokers: next.modifiersV3.jokers.map((modifier) =>
        modifier.instanceId === context.sourceInstanceId
          ? {
              ...modifier,
              abilityState: {
                ...modifier.abilityState,
                [operation.key]: changed,
              },
            }
          : modifier,
      ),
    },
  };
  return result(
    rolls.length > 0
      ? materializeChoice(
          next,
          context,
          'joker-lifecycle-rolls',
          [context.sourceInstanceId],
          rolls,
        )
      : next,
  );
}

function applyJokerSellValueAdd(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-sell-value-add' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  const predicate = evaluateJokerPredicateV3(operation.predicate, {
    state,
    facts: lifecycleFacts(state),
    sourceInstanceId: context.sourceInstanceId as JokerInstanceId,
    window: context.window,
    rngState: state.rngState,
    originalStencilCount: 0,
  });
  if (!predicate.ok) return predicate;
  let next: RunStateV2 = { ...state, rngState: predicate.rngState };
  if (predicate.rolls.length > 0) {
    next = materializeChoice(
      next,
      context,
      'joker-lifecycle-rolls',
      [context.sourceInstanceId],
      predicate.rolls.map(({ value }) => value),
    );
  }
  if (!predicate.matched) return result(next);
  const source = next.inventory.jokers.find(
    ({ instanceId }) => instanceId === context.sourceInstanceId,
  );
  if (!source) return result(next);
  const current = saleValue(
    source.baseCost,
    source.editionCost,
    next.rules.priceDiscountBasisPoints,
    source.sellValueOverride,
  );
  return result({
    ...next,
    inventory: {
      ...next.inventory,
      jokers: next.inventory.jokers.map((joker) =>
        joker.instanceId === context.sourceInstanceId
          ? { ...joker, sellValueOverride: current + operation.amount }
          : joker,
      ),
    },
  });
}

function applyJokerRoundResource(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-round-resource' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  const predicate = evaluateJokerPredicateV3(operation.predicate, {
    state,
    facts: lifecycleFacts(state),
    sourceInstanceId: context.sourceInstanceId as JokerInstanceId,
    window: context.window,
    rngState: state.rngState,
    originalStencilCount: 0,
  });
  if (!predicate.ok) return predicate;
  let next: RunStateV2 = { ...state, rngState: predicate.rngState };
  if (predicate.rolls.length > 0) {
    next = materializeChoice(
      next,
      context,
      'joker-lifecycle-rolls',
      [context.sourceInstanceId],
      predicate.rolls.map(({ value }) => value),
    );
  }
  if (!predicate.matched || !next.round) return result(next);
  const current =
    operation.resource === 'hands'
      ? next.round.handsRemaining
      : next.round.discardsRemaining;
  const changed = Math.max(
    0,
    operation.mode === 'set' ? operation.value : current + operation.value,
  );
  return result({
    ...next,
    round: {
      ...next.round,
      ...(operation.resource === 'hands'
        ? { handsRemaining: changed }
        : { discardsRemaining: changed }),
    },
  });
}

function destroySourceJoker(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'joker-destroy-source' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  if (!isRunStateV4(state)) return result(state);
  const sourceModifier = state.modifiersV3.jokers.find(
    ({ instanceId }) => instanceId === context.sourceInstanceId,
  );
  if (sourceModifier?.stickerIds.includes('bxqp:sticker:permanent')) {
    return result(state);
  }
  const predicate = evaluateJokerPredicateV3(operation.predicate, {
    state,
    facts: lifecycleFacts(state),
    sourceInstanceId: context.sourceInstanceId as JokerInstanceId,
    window: context.window,
    rngState: state.rngState,
    originalStencilCount: 0,
  });
  if (!predicate.ok) return predicate;
  let next: RunStateV2 = { ...state, rngState: predicate.rngState };
  if (predicate.rolls.length > 0) {
    next = materializeChoice(
      next,
      context,
      'joker-lifecycle-rolls',
      [context.sourceInstanceId],
      predicate.rolls.map(({ value }) => value),
    );
  }
  if (!predicate.matched) return result(next);
  const destroyed = {
    ...state,
    rngState: predicate.rngState,
    inventory: {
      ...state.inventory,
      jokers: state.inventory.jokers.filter(
        ({ instanceId }) => instanceId !== context.sourceInstanceId,
      ),
    },
    modifiersV3: {
      ...state.modifiersV3,
      jokers: state.modifiersV3.jokers.filter(
        ({ instanceId }) => instanceId !== context.sourceInstanceId,
      ),
    },
    materializedChoicesV3: isRunStateV3(next)
      ? next.materializedChoicesV3
      : state.materializedChoicesV3,
  };
  return result(
    operation.observationKey
      ? observe(destroyed, context, operation.observationKey, true)
      : destroyed,
  );
}

function observe(
  state: RunStateV2,
  context: StateOperationContextV3,
  key: string,
  value: EffectParameterValue,
): RunStateV2 {
  return {
    ...state,
    history: {
      ...state.history,
      effectObservations: [
        ...state.history.effectObservations,
        {
          window: context.window,
          key,
          value,
          sourceInstanceId: context.sourceInstanceId,
          effectId: context.effectId,
          checkpointId: state.checkpointId + 1,
        },
      ],
    },
  };
}

function materializeChoice(
  state: RunStateV2,
  context: StateOperationContextV3,
  kind: string,
  valueIds: readonly string[],
  valueNumbers: readonly number[],
): RunStateV2 {
  if (!isRunStateV3(state)) return state;
  const materialized: RunStateV3 = {
    ...state,
    materializedChoicesV3: [
      ...state.materializedChoicesV3,
      {
        id: `bxqp:choice:${kind}:${state.runId}:${state.checkpointId + 1}:${context.effectId}`,
        kind,
        valueIds,
        valueNumbers,
        checkpointId: state.checkpointId + 1,
      },
    ],
  };
  return materialized;
}

function numericPatch(
  current: number,
  mode: 'set' | 'add' | 'multiply',
  value: number,
): number {
  if (mode === 'set') return value;
  return mode === 'add' ? current + value : current * value;
}

function applyRulePatch(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'patch-rule' }>,
): RunStateV2 {
  const { key, mode, value } = operation;
  let rules = state.rules;
  if (key === 'interest-enabled' && typeof value === 'boolean') {
    rules = { ...rules, interestRate: value ? Math.max(1, rules.interestRate) : 0 };
  }
  if (typeof value === 'number') {
    const patch = (current: number, minimum = 0) =>
      Math.max(minimum, numericPatch(current, mode, value));
    switch (key) {
      case 'hands-per-round':
        rules = { ...rules, handsPerRound: patch(rules.handsPerRound) };
        break;
      case 'discards-per-round':
        rules = { ...rules, discardsPerRound: patch(rules.discardsPerRound) };
        break;
      case 'hand-size':
        rules = { ...rules, handSize: patch(rules.handSize) };
        break;
      case 'maximum-selected-cards':
        rules = {
          ...rules,
          maximumSelectedCards: patch(rules.maximumSelectedCards, 1),
        };
        break;
      case 'joker-slots':
        rules = { ...rules, jokerSlots: patch(rules.jokerSlots) };
        break;
      case 'consumable-slots':
        rules = { ...rules, consumableSlots: patch(rules.consumableSlots) };
        break;
      case 'interest-cap':
        rules = { ...rules, interestCap: patch(rules.interestCap) };
        break;
      case 'shop-offer-slots':
        rules = { ...rules, cardOfferSlots: patch(rules.cardOfferSlots) };
        break;
      case 'pack-offer-slots':
        rules = { ...rules, packOfferSlots: patch(rules.packOfferSlots) };
        break;
      case 'reroll-cost':
        rules = { ...rules, baseRerollCost: patch(rules.baseRerollCost) };
        break;
      case 'allowed-debt':
        rules = { ...rules, allowedDebt: patch(rules.allowedDebt) };
        break;
      case 'target-scale':
        rules = {
          ...rules,
          targetScaleBasisPoints: patch(rules.targetScaleBasisPoints, 1),
        };
        break;
    }
  }
  const next: RunStateV2 = { ...state, rules };
  if (!isRunStateV3(next) || typeof value !== 'number') return next;
  let rulesV3 = next.rulesV3;
  if (key === 'remaining-hand-reward') {
    rulesV3 = {
      ...rulesV3,
      remainingHandReward: Math.max(
        0,
        numericPatch(rulesV3.remainingHandReward, mode, value),
      ),
    };
  }
  if (key === 'remaining-discard-reward') {
    rulesV3 = {
      ...rulesV3,
      remainingDiscardReward: Math.max(
        0,
        numericPatch(rulesV3.remainingDiscardReward, mode, value),
      ),
    };
  }
  if (key === 'discard-cost') {
    rulesV3 = {
      ...rulesV3,
      discardCost: Math.max(0, numericPatch(rulesV3.discardCost, mode, value)),
    };
  }
  const patched: RunStateV3 = { ...next, rulesV3 };
  return patched;
}

function stableRandomIds(
  ids: readonly string[],
  count: number,
  initialState: RandomState,
): { readonly ids: readonly string[]; readonly rngState: RandomState } {
  const pool = [...new Set(ids)].sort((left, right) => left.localeCompare(right));
  const selected: string[] = [];
  let rngState = initialState;
  const limit = Math.min(count === 0 ? pool.length : count, pool.length);
  for (let index = 0; index < limit; index += 1) {
    const draw = nextInteger(rngState, pool.length);
    const [id] = pool.splice(draw.value, 1);
    if (id !== undefined) selected.push(id);
    rngState = draw.state;
  }
  return { ids: selected, rngState };
}

function isFaceCard(card: RunPlayingCard): boolean {
  return card.rank === 'jack' || card.rank === 'queen' || card.rank === 'king';
}

function operationTargets(
  state: RunStateV2,
  selection: string,
  count: number,
  context: StateOperationContextV3,
  preferJokers: boolean,
): { readonly ids: readonly string[]; readonly rngState: RandomState } {
  if (context.selectedIds !== undefined) {
    return { ids: context.selectedIds, rngState: state.rngState };
  }
  let ids: readonly string[];
  switch (selection) {
    case 'all':
      ids = state.deck.cards.map(({ id }) => id);
      break;
    case 'face-cards':
      ids = state.deck.cards.filter(isFaceCard).map(({ id }) => id);
      break;
    case 'drawn':
    case 'random-held':
      ids = state.round?.handIds ?? [];
      break;
    case 'played-this-ante':
      ids = state.history.playedCardIdsThisAnte;
      break;
    case 'other-jokers':
      ids = state.inventory.jokers.slice(0, -1).map(({ instanceId }) => instanceId);
      break;
    case 'random':
      ids = preferJokers
        ? state.inventory.jokers.map(({ instanceId }) => instanceId)
        : state.deck.cards.map(({ id }) => id);
      break;
    default:
      ids = state.deck.cards.map(({ id }) => id);
      break;
  }
  if (selection === 'random' || selection === 'random-held') {
    return stableRandomIds(ids, count, state.rngState);
  }
  return {
    ids: count === 0 ? ids : ids.slice(0, count),
    rngState: state.rngState,
  };
}

function weightedModifier(
  modifierId: string,
  rngState: RandomState,
): { readonly modifierId: string; readonly rngState: RandomState } {
  if (!modifierId.startsWith('weighted:')) return { modifierId, rngState };
  const entries = modifierId
    .slice('weighted:'.length)
    .split(',')
    .flatMap((entry) => {
      const separator = entry.lastIndexOf('=');
      const id = entry.slice(0, separator);
      const weightUnits = Number(entry.slice(separator + 1));
      return id && Number.isSafeInteger(weightUnits) && weightUnits > 0
        ? [{ id, weightUnits, value: id }]
        : [];
    });
  if (entries.length === 0) return { modifierId, rngState };
  const draw = pickWeightedStable(entries, rngState);
  return { modifierId: draw.value, rngState: draw.state };
}

function setCardModifier(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'set-card-modifier' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  const preferJokers = operation.selection === 'random';
  let chanceState = state;
  const chanceRolls: number[] = [];
  if (
    operation.numerator !== null &&
    operation.denominator !== null &&
    operation.denominator > 0
  ) {
    const draw = nextInteger(state.rngState, operation.denominator);
    chanceRolls.push(draw.value);
    chanceState = { ...state, rngState: draw.state };
    if (draw.value >= operation.numerator) {
      return materializeChoice(
        chanceState,
        context,
        'card-modifier-roll',
        [],
        chanceRolls,
      );
    }
  }
  const targetState =
    preferJokers && operation.family === 'edition'
      ? {
          ...chanceState,
          inventory: {
            ...chanceState.inventory,
            jokers: chanceState.inventory.jokers.filter(
              ({ editionId }) => editionId === null,
            ),
          },
        }
      : chanceState;
  const targets = operationTargets(
    targetState,
    operation.selection,
    operation.count,
    context,
    preferJokers,
  );
  let rngState = targets.rngState;
  let next = chanceState;
  const appliedModifierIds: string[] = [];
  for (const id of targets.ids) {
    const modifier = weightedModifier(operation.modifierId, rngState);
    rngState = modifier.rngState;
    appliedModifierIds.push(modifier.modifierId);
    if (next.deck.cards.some((card) => card.id === id)) {
      next = {
        ...next,
        deck: {
          cards: next.deck.cards.map((card) => {
            if (card.id !== id) return card;
            if (operation.family === 'enhancement') {
              return { ...card, enhancementId: modifier.modifierId };
            }
            if (operation.family === 'seal') {
              return { ...card, sealId: modifier.modifierId };
            }
            if (operation.family === 'edition') {
              return { ...card, editionId: modifier.modifierId };
            }
            return card;
          }),
        },
      };
      continue;
    }
    if (operation.family === 'edition') {
      next = {
        ...next,
        inventory: {
          ...next.inventory,
          jokers: next.inventory.jokers.map((joker) =>
            joker.instanceId === id
              ? {
                  ...joker,
                  editionId: modifier.modifierId,
                  slotContribution: modifier.modifierId.endsWith('shadow-cutout')
                    ? 0
                    : joker.slotContribution,
                }
              : joker,
          ),
        },
      };
    }
    if (operation.family === 'sticker' && isRunStateV3(next)) {
      const stickerUpdated: RunStateV3 = {
        ...next,
        modifiersV3: {
          ...next.modifiersV3,
          jokers: next.modifiersV3.jokers.map((joker) =>
            joker.instanceId === id
              ? {
                  ...joker,
                  stickerIds: [...new Set([...joker.stickerIds, modifier.modifierId])],
                }
              : joker,
          ),
        },
      };
      next = stickerUpdated;
    }
  }
  const modified = { ...next, rngState };
  return operation.selection === 'random' ||
    operation.modifierId.startsWith('weighted:') ||
    chanceRolls.length > 0
    ? materializeChoice(
        modified,
        context,
        'card-modifier-roll',
        [...targets.ids, ...appliedModifierIds],
        chanceRolls,
      )
    : modified;
}

const RANK_SEQUENCE = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
] as const;
const SUIT_SEQUENCE = ['clubs', 'diamonds', 'hearts', 'spades'] as const;

function transformCards(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'transform-card-field' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  const targets = operationTargets(
    state,
    operation.selection,
    operation.count,
    context,
    false,
  );
  if (operation.field === 'face-down') {
    if (!state.round) return { ...state, rngState: targets.rngState };
    const cardMap = new Map<string, RunPlayingCard>(
      state.deck.cards.map((card) => [card.id, card]),
    );
    const faceDownIds = targets.ids.flatMap((id) => {
      const card = cardMap.get(id);
      return card !== undefined && (operation.value !== 'face-card' || isFaceCard(card))
        ? [card.id]
        : [];
    });
    return {
      ...state,
      rngState: targets.rngState,
      round: {
        ...state.round,
        faceDownCardIds: [...new Set([...state.round.faceDownCardIds, ...faceDownIds])],
      },
    };
  }
  if (operation.field === 'debuff' || operation.field === 'full-state') {
    return { ...state, rngState: targets.rngState };
  }
  let rngState = targets.rngState;
  let sharedValue = operation.value;
  if (operation.value === 'random-materialized') {
    const values = operation.field === 'suit' ? SUIT_SEQUENCE : RANK_SEQUENCE;
    const draw = nextInteger(rngState, values.length);
    sharedValue = values[draw.value] as string;
    rngState = draw.state;
  }
  const selected = new Set(targets.ids);
  return {
    ...state,
    rngState,
    deck: {
      cards: state.deck.cards.map((card) => {
        if (!selected.has(card.id)) return card;
        if (operation.field === 'suit' && SUIT_SEQUENCE.includes(sharedValue as never)) {
          return { ...card, suit: sharedValue as RunPlayingCard['suit'] };
        }
        if (operation.field === 'rank') {
          if (sharedValue === 'next-with-king-ace-two-wrap') {
            const index = RANK_SEQUENCE.indexOf(card.rank);
            return {
              ...card,
              rank: RANK_SEQUENCE[(index + 1) % RANK_SEQUENCE.length]!,
            };
          }
          if (RANK_SEQUENCE.includes(sharedValue as never)) {
            return { ...card, rank: sharedValue as RunPlayingCard['rank'] };
          }
        }
        return card;
      }),
    },
  };
}

function removePlayingCards(state: RunStateV2, ids: ReadonlySet<string>): RunStateV2 {
  const round = state.round
    ? {
        ...state.round,
        drawPileIds: state.round.drawPileIds.filter((id) => !ids.has(id)),
        handIds: state.round.handIds.filter((id) => !ids.has(id)),
        playedIds: state.round.playedIds.filter((id) => !ids.has(id)),
        discardPileIds: state.round.discardPileIds.filter((id) => !ids.has(id)),
        selectedCardIds: state.round.selectedCardIds.filter((id) => !ids.has(id)),
        forcedSelectedCardIds: state.round.forcedSelectedCardIds.filter(
          (id) => !ids.has(id),
        ),
        faceDownCardIds: state.round.faceDownCardIds.filter((id) => !ids.has(id)),
      }
    : null;
  return {
    ...state,
    deck: { cards: state.deck.cards.filter((card) => !ids.has(card.id)) },
    round,
  };
}

function destroyCards(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'destroy-card' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  const selection = operation.selection ?? 'selected';
  const targets = operationTargets(
    state,
    selection,
    operation.count ?? 0,
    context,
    selection === 'other-jokers',
  );
  const selected = new Set(targets.ids);
  let next = removePlayingCards({ ...state, rngState: targets.rngState }, selected);
  if (selection === 'other-jokers' || targets.ids.some((id) => id.includes('joker'))) {
    const protectedIds = new Set(
      isRunStateV3(next)
        ? next.modifiersV3.jokers
            .filter((modifier) => !modifier.saleAllowed)
            .map(({ instanceId }) => instanceId)
        : [],
    );
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        jokers: next.inventory.jokers.filter(
          (joker) =>
            !selected.has(joker.instanceId) || protectedIds.has(joker.instanceId),
        ),
      },
    };
  }
  if (operation.money !== 0) {
    next = {
      ...next,
      economy: {
        ...next.economy,
        money: next.economy.money + operation.money * selected.size,
      },
    };
  }
  return next;
}

function copyCardState(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'copy-card-state' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  if (operation.source === 'selected-right') {
    const [leftId, rightId] = context.selectedIds ?? [];
    const source = state.deck.cards.find((card) => card.id === rightId);
    if (!leftId || !source) return result(state);
    return result({
      ...state,
      deck: {
        cards: state.deck.cards.map((card) =>
          card.id === leftId ? { ...source, id: card.id } : card,
        ),
      },
    });
  }
  if (operation.source === 'selected') {
    const sourceId = context.selectedIds?.[0];
    const source = state.deck.cards.find((card) => card.id === sourceId);
    if (!source) return result(state);
    const copies = Array.from({ length: operation.count }, (_, index) => ({
      ...source,
      id: stableId<'playing-card'>(
        `playing:copy:${state.runId}:${state.checkpointId + 1}:${context.sourceInstanceId}:${index}`,
      ),
    }));
    return result({
      ...state,
      deck: { cards: [...state.deck.cards, ...copies] },
      round: state.round
        ? {
            ...state.round,
            discardPileIds: [
              ...state.round.discardPileIds,
              ...copies.map(({ id }) => id),
            ],
          }
        : null,
    });
  }
  if (operation.source === 'random-joker') {
    if (state.inventory.jokers.length === 0) {
      return { ok: false, code: 'pool-empty', message: '没有可复制的奇牌' };
    }
    if (
      state.inventory.jokers.reduce(
        (total, joker) => total + joker.slotContribution,
        0,
      ) >= state.rules.jokerSlots
    ) {
      return { ok: false, code: 'inventory-full', message: '奇牌栏位已满' };
    }
    const draw = stableRandomIds(
      state.inventory.jokers.map(({ instanceId }) => instanceId),
      1,
      state.rngState,
    );
    const source = state.inventory.jokers.find(
      (joker) => joker.instanceId === draw.ids[0],
    );
    if (!source) return { ok: false, code: 'pool-empty', message: '没有可复制的奇牌' };
    const instanceId = stableId<'joker-instance'>(
      `joker:copy:${state.runId}:${state.checkpointId + 1}:${context.sourceInstanceId}`,
    );
    return result({
      ...state,
      rngState: draw.rngState,
      inventory: {
        ...state.inventory,
        jokers: [...state.inventory.jokers, { ...source, instanceId }],
      },
    });
  }
  return result(state);
}

function contentFamilyMatches(
  definition: ItemDefinitionV2,
  family: Extract<EffectOperation, { readonly type: 'create-content-family' }>['family'],
  rarity: string,
): boolean {
  if (family === 'playing-card') return definition.kind === 'playing-card';
  if (family === 'joker') {
    return (
      definition.kind === 'joker' && (rarity === 'any' || definition.rarity === rarity)
    );
  }
  return definition.kind === 'consumable' && definition.family === family;
}

function acquireMaterialized(
  state: RunStateV2,
  definition: ItemDefinitionV2,
  identity: string,
  stickerPolicy: string,
  discoveryCheckpointId = state.checkpointId,
): StateOperationResultV3 {
  const materialized = materializeItemV2(definition, identity, state.rngState);
  const item = materialized.item;
  let next: RunStateV2 = { ...state, rngState: materialized.rngState };
  if (item.kind === 'joker') {
    const used = next.inventory.jokers.reduce(
      (total, joker) => total + joker.slotContribution,
      0,
    );
    if (used + item.slotContribution > next.rules.jokerSlots) {
      return { ok: false, code: 'inventory-full', message: '奇牌栏位已满' };
    }
    const instanceId = stableId<'joker-instance'>(`joker:${identity}`);
    const owned: OwnedJokerV2 = {
      instanceId,
      contentId: item.contentId,
      name: item.name,
      description: item.description,
      baseCost: item.baseCost,
      editionCost: item.editionCost,
      editionId: item.editionId,
      effects: item.effects,
      slotContribution: item.slotContribution,
      sellValueOverride: null,
      debuffed: false,
    };
    next = {
      ...next,
      inventory: { ...next.inventory, jokers: [...next.inventory.jokers, owned] },
    };
    const stickered =
      stickerPolicy === 'none'
        ? synchronizeRunStateV3(next)
        : materializeJokerStickersV3(next, instanceId, identity);
    return result(
      recordFirstAcquisitionDiscoveryV3(
        stickered,
        item.contentId,
        instanceId,
        discoveryCheckpointId,
      ),
    );
  }
  if (item.kind === 'consumable') {
    if (next.inventory.consumables.length >= next.rules.consumableSlots) {
      return { ok: false, code: 'inventory-full', message: '消耗牌栏位已满' };
    }
    const owned: OwnedConsumableV2 = {
      instanceId: stableId<'consumable-instance'>(`consumable:${identity}`),
      contentId: item.contentId,
      name: item.name,
      description: item.description,
      baseCost: item.baseCost,
      editionCost: item.editionCost,
      editionId: item.editionId,
      effects: item.effects,
      targetKind: item.targetKind,
      minimumTargets: item.minimumTargets,
      maximumTargets: item.maximumTargets,
      sellValueOverride: null,
    };
    return result({
      ...next,
      inventory: {
        ...next.inventory,
        consumables: [...next.inventory.consumables, owned],
      },
    });
  }
  if (!item.generatedCard) {
    return { ok: false, code: 'pool-empty', message: '生成的戏牌资料缺失' };
  }
  return result({
    ...next,
    deck: { cards: [...next.deck.cards, item.generatedCard] },
    round: next.round
      ? {
          ...next.round,
          discardPileIds: [...next.round.discardPileIds, item.generatedCard.id],
        }
      : null,
  });
}

export function acquireContentByIdV3(
  state: RunStateV2,
  contentId: string,
  identity: string,
  stickerPolicy = 'none',
): StateOperationResultV3 {
  const definition = state.content.items.find(
    (candidate) => candidate.contentId === contentId,
  );
  return definition
    ? acquireMaterialized(state, definition, identity, stickerPolicy)
    : { ok: false, code: 'pool-empty', message: `生成内容定义缺失：${contentId}` };
}

function createContentFamily(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'create-content-family' }>,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  let next = state;
  const selected = new Set<string>();
  for (let index = 0; index < operation.count; index += 1) {
    const pool = next.content.items.filter(
      (definition) =>
        definition.weightUnits > 0 &&
        !selected.has(definition.contentId) &&
        contentFamilyMatches(definition, operation.family, operation.rarity) &&
        definitionIsEligibleV3(next, definition, 'generated') &&
        (!isRunStateV3(next) ||
          !next.rulesV3.bannedContentIds.includes(definition.contentId)),
    );
    if (pool.length === 0) {
      return { ok: false, code: 'pool-empty', message: '生成内容候选池为空' };
    }
    let selectedDefinition: ItemDefinitionV2;
    let selectedRngState: RandomState;
    if (operation.family === 'joker') {
      const jokerPool = pool.filter(
        (definition): definition is Extract<ItemDefinitionV2, { kind: 'joker' }> =>
          definition.kind === 'joker',
      );
      const policy =
        operation.rarity === 'any'
          ? 'ordinary'
          : operation.rarity === 'common' ||
              operation.rarity === 'uncommon' ||
              operation.rarity === 'rare' ||
              operation.rarity === 'legendary'
            ? operation.rarity
            : null;
      if (policy === null) {
        return { ok: false, code: 'pool-empty', message: '奇牌稀有度来源无效' };
      }
      const draw = drawJokerDefinitionV3(
        jokerPool.map((definition) => ({
          contentId: definition.contentId,
          rarity: definition.rarity,
          weightUnits: definition.weightUnits,
          value: definition,
        })),
        next.rngState,
        policy,
      );
      if (!draw.ok) return draw;
      selectedDefinition = draw.value;
      selectedRngState = draw.rngState;
    } else {
      const draw = pickWeightedStable(
        pool.map((definition) => ({
          id: definition.contentId,
          weightUnits: definition.weightUnits,
          value: definition,
        })),
        next.rngState,
      );
      selectedDefinition = draw.value;
      selectedRngState = draw.state;
    }
    selected.add(selectedDefinition.contentId);
    const acquired = acquireMaterialized(
      { ...next, rngState: selectedRngState },
      selectedDefinition,
      `effect-created:${next.runId}:${next.checkpointId + 1}:${context.sourceInstanceId}:${context.effectId}:${index}`,
      operation.stickerPolicy,
      next.checkpointId + 1,
    );
    if (!acquired.ok) {
      if (operation.capacityRequired && acquired.code === 'inventory-full') {
        return result(next);
      }
      return acquired;
    }
    next = acquired.state;
  }
  return result(next);
}

function createPlayingCards(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'create-playing-cards' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  if (!isRunStateV3(state)) return state;
  const rankPool =
    operation.rankPool === 'face'
      ? (['jack', 'queen', 'king'] as const)
      : operation.rankPool === 'ace'
        ? (['ace'] as const)
        : RANK_SEQUENCE.slice(0, 9);
  const enhancementIds = state.productionContentV3.rows
    .filter(({ definition }) => definition.family === 'enhancement')
    .sort((left, right) => left.definition.ordinal - right.definition.ordinal)
    .map(({ definition }) => definition.id);
  if (enhancementIds.length === 0 || rankPool.length === 0) return state;
  let rngState = state.rngState;
  const cards: RunPlayingCard[] = [];
  const rolls: number[] = [];
  for (let index = 0; index < operation.count; index += 1) {
    const suit = nextInteger(rngState, SUIT_SEQUENCE.length);
    const rank = nextInteger(suit.state, rankPool.length);
    const enhancement = nextInteger(rank.state, enhancementIds.length);
    rngState = enhancement.state;
    rolls.push(suit.value, rank.value, enhancement.value);
    cards.push({
      id: stableId<'playing-card'>(
        `playing:created:${state.runId}:${state.checkpointId + 1}:${context.effectId}:${index}`,
      ),
      suit: SUIT_SEQUENCE[suit.value]!,
      rank: rankPool[rank.value]!,
      enhancementId: enhancementIds[enhancement.value]!,
      sealId: null,
      editionId: null,
      bonusChips: 0,
    });
  }
  const created: RunStateV3 = {
    ...state,
    rngState,
    deck: { cards: [...state.deck.cards, ...cards] },
    round: state.round
      ? {
          ...state.round,
          discardPileIds: [...state.round.discardPileIds, ...cards.map(({ id }) => id)],
        }
      : null,
  };
  return materializeChoice(
    created,
    context,
    'created-playing-cards',
    cards.map(({ id, enhancementId }) => `${id}|${enhancementId ?? ''}`),
    rolls,
  );
}

function applyCatalogMoney(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'catalog-money' }>,
): RunStateV2 {
  let delta = operation.amount;
  if (operation.mode === 'cap-add') {
    delta = Math.min(
      operation.cap ?? Number.POSITIVE_INFINITY,
      Math.max(0, state.economy.money),
    );
  }
  if (operation.mode === 'per-history') {
    if (operation.historyKey === 'joker-sell-value') {
      delta = state.inventory.jokers.reduce(
        (total, joker) =>
          total +
          saleValue(
            joker.baseCost,
            joker.editionCost,
            state.rules.priceDiscountBasisPoints,
            joker.sellValueOverride,
          ),
        0,
      );
    } else {
      const units =
        operation.historyKey === 'skipped-blinds-including-current'
          ? state.history.skippedBlindIds.length
          : operation.historyKey === 'hands-played'
            ? state.history.playedHandTypes.length
            : operation.historyKey === 'unused-discards'
              ? (state.round?.discardsRemaining ?? 0)
              : 0;
      delta = units * operation.amount;
    }
    if (operation.cap !== null) delta = Math.min(delta, operation.cap);
  }
  return {
    ...state,
    economy: { ...state.economy, money: state.economy.money + delta },
  };
}

function applyCatalogShopRule(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'catalog-shop-rule' }>,
): RunStateV2 {
  if (operation.key === 'discount-basis-points' && typeof operation.value === 'number') {
    return {
      ...state,
      rules: {
        ...state.rules,
        priceDiscountBasisPoints: Math.max(0, Math.min(10_000, operation.value)),
      },
    };
  }
  if (operation.key === 'reroll-discount' && typeof operation.value === 'number') {
    return {
      ...state,
      rules: {
        ...state.rules,
        baseRerollCost: Math.max(0, state.rules.baseRerollCost - operation.value),
      },
    };
  }
  if (isRunStateV3(state)) {
    if (
      operation.key === 'playing-cards-enabled' &&
      typeof operation.value === 'boolean'
    ) {
      const enabled: RunStateV3 = {
        ...state,
        rulesV3: { ...state.rulesV3, playingCardsInShop: operation.value },
      };
      return enabled;
    }
    if (
      operation.key === 'joker-offers-enabled' &&
      typeof operation.value === 'boolean'
    ) {
      const enabled: RunStateV3 = {
        ...state,
        rulesV3: { ...state.rulesV3, jokersInShop: operation.value },
      };
      return enabled;
    }
    if (operation.key === 'boss-reroll' && typeof operation.value === 'string') {
      const reroll: RunStateV3 = {
        ...state,
        rulesV3: {
          ...state.rulesV3,
          bossRerollCost: 10,
          bossRerollLimitPerAnte: operation.value.includes('unlimited') ? null : 1,
        },
      };
      return reroll;
    }
  }
  if (
    operation.key === 'family-weight' &&
    typeof operation.value === 'string' &&
    isRunStateV3(state)
  ) {
    const [rawFamily, rawMultiplier] = operation.value.split(':');
    const family = operation.value === 'spectral-enabled' ? 'spectral' : rawFamily;
    const multiplier = operation.value === 'spectral-enabled' ? 1 : Number(rawMultiplier);
    if (family && Number.isFinite(multiplier) && multiplier > 0) {
      const weighted: RunStateV3 = {
        ...state,
        rulesV3: {
          ...state.rulesV3,
          shopFamilyWeightMultipliers: {
            ...state.rulesV3.shopFamilyWeightMultipliers,
            [family]: multiplier,
          },
        },
      };
      return weighted;
    }
  }
  return state;
}

function applyCatalogBlindRule(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'catalog-blind-rule' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  if (!state.round) return state;
  if (operation.key === 'random-held-discard' && typeof operation.value === 'number') {
    const chosen = stableRandomIds(state.round.handIds, operation.value, state.rngState);
    const ids = new Set(chosen.ids);
    const discarded = {
      ...state,
      rngState: chosen.rngState,
      round: {
        ...state.round,
        handIds: state.round.handIds.filter((id) => !ids.has(id)),
        discardPileIds: [
          ...state.round.discardPileIds,
          ...(chosen.ids as readonly CardId[]),
        ],
        selectedCardIds: state.round.selectedCardIds.filter((id) => !ids.has(id)),
        forcedSelectedCardIds: state.round.forcedSelectedCardIds.filter(
          (id) => !ids.has(id),
        ),
        faceDownCardIds: state.round.faceDownCardIds.filter((id) => !ids.has(id)),
      },
    };
    return materializeChoice(
      discarded,
      context,
      'blind-random-held-discard',
      chosen.ids,
      [],
    );
  }
  if (operation.key === 'money-reset-on-most-played' && operation.value === true) {
    const handType = state.lastHand?.handType;
    if (!handType) return state;
    const counts = new Map<string, number>();
    for (const played of state.history.playedHandTypes) {
      counts.set(played, (counts.get(played) ?? 0) + 1);
    }
    const currentCount = counts.get(handType) ?? 0;
    const maximum = Math.max(0, ...counts.values());
    return currentCount === maximum
      ? { ...state, economy: { ...state.economy, money: 0 } }
      : state;
  }
  if (operation.key === 'random-draw-face-down' && typeof operation.value === 'number') {
    const cardIds = new Set(state.deck.cards.map(({ id }) => id));
    const candidates = (context.selectedIds ?? state.round.handIds).flatMap((id) =>
      cardIds.has(id as CardId) ? [id as CardId] : [],
    );
    let rngState = state.rngState;
    const rolls: number[] = [];
    const faceDownIds: CardId[] = [];
    for (const cardId of candidates) {
      const roll = nextInteger(rngState, operation.value);
      rolls.push(roll.value);
      rngState = roll.state;
      if (roll.value === 0) faceDownIds.push(cardId);
    }
    const rolled = {
      ...state,
      rngState,
      round: {
        ...state.round,
        faceDownCardIds: [...new Set([...state.round.faceDownCardIds, ...faceDownIds])],
      },
    };
    return materializeChoice(
      rolled,
      context,
      'blind-face-down-rolls',
      faceDownIds,
      rolls,
    );
  }
  if (operation.key === 'draw-replacements-face-down' && operation.value === true) {
    const faceDownIds = context.selectedIds ?? [];
    return {
      ...state,
      round: {
        ...state.round,
        faceDownCardIds: [
          ...new Set([
            ...state.round.faceDownCardIds,
            ...(faceDownIds as readonly CardId[]),
          ]),
        ],
      },
    };
  }
  if (operation.key === 'played-card-cost' && typeof operation.value === 'number') {
    const cost = (state.lastHand?.playedCardIds.length ?? 0) * operation.value;
    const charged = Math.max(-state.rules.allowedDebt, state.economy.money - cost);
    return {
      ...state,
      economy: {
        ...state.economy,
        money: Object.is(charged, -0) ? 0 : charged,
      },
    };
  }
  if (operation.key === 'draw-exactly' && typeof operation.value === 'number') {
    return state;
  }
  if (operation.key === 'conceal-reorder-jokers' && operation.value === true) {
    if (state.inventory.jokers.length < 2) return state;
    const chosen = stableRandomIds(
      state.inventory.jokers.map(({ instanceId }) => instanceId),
      0,
      state.rngState,
    );
    const positions = new Map(chosen.ids.map((id, index) => [id, index]));
    const reordered = {
      ...state,
      rngState: chosen.rngState,
      inventory: {
        ...state.inventory,
        jokers: [...state.inventory.jokers].sort(
          (left, right) =>
            (positions.get(left.instanceId) ?? 0) -
            (positions.get(right.instanceId) ?? 0),
        ),
      },
    };
    return materializeChoice(reordered, context, 'blind-joker-order', chosen.ids, []);
  }
  if (
    operation.key === 'debuff-until-joker-sold' &&
    operation.value === true &&
    isRunStateV3(state)
  ) {
    const debuffed: RunStateV3 = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) => ({
          ...modifier,
          debuffed: true,
        })),
      },
    };
    return debuffed;
  }
  if (operation.key === 'disable-random-joker' && typeof operation.value === 'number') {
    const resetJokers = state.inventory.jokers.map((joker) => ({
      ...joker,
      debuffed:
        isRunStateV3(state) &&
        state.modifiersV3.jokers.some(
          (modifier) =>
            modifier.instanceId === joker.instanceId &&
            modifier.perishableRoundsRemaining === 0,
        ),
    }));
    if (
      context.window === 'after-hand' &&
      (state.round.score >= state.round.targetScore || state.round.handsRemaining <= 0)
    ) {
      return {
        ...state,
        inventory: { ...state.inventory, jokers: resetJokers },
      };
    }
    const chosen = stableRandomIds(
      resetJokers.map(({ instanceId }) => instanceId),
      operation.value,
      state.rngState,
    );
    const ids = new Set(chosen.ids);
    const disabled = {
      ...state,
      rngState: chosen.rngState,
      inventory: {
        ...state.inventory,
        jokers: resetJokers.map((joker) =>
          ids.has(joker.instanceId) ? { ...joker, debuffed: true } : joker,
        ),
      },
    };
    return materializeChoice(disabled, context, 'blind-disabled-joker', chosen.ids, []);
  }
  return state;
}

function applyForcedCardChoice(
  state: RunStateV2,
  operation: Extract<EffectOperation, { readonly type: 'force-card-choice' }>,
  context: StateOperationContextV3,
): RunStateV2 {
  if (
    !state.round ||
    state.round.forcedSelectedCardIds.length > 0 ||
    state.round.handIds.length === 0
  ) {
    return state;
  }
  const chosen = stableRandomIds(state.round.handIds, operation.count, state.rngState);
  const forced = {
    ...state,
    rngState: chosen.rngState,
    round: {
      ...state.round,
      forcedSelectedCardIds: chosen.ids as readonly CardId[],
      selectedCardIds: [
        ...new Set([
          ...state.round.selectedCardIds,
          ...(chosen.ids as readonly CardId[]),
        ]),
      ],
    },
  };
  return materializeChoice(forced, context, 'blind-forced-card', chosen.ids, []);
}

export function applyStateOperationV3(
  state: RunStateV2,
  operation: EffectOperation,
  context: StateOperationContextV3,
): StateOperationResultV3 {
  switch (operation.type) {
    case 'joker-score':
      return applyLifecycleJokerScore(state, operation, context);
    case 'joker-state-change':
      return applyLifecycleJokerStateChange(state, operation, context);
    case 'joker-sell-value-add':
      return applyJokerSellValueAdd(state, operation, context);
    case 'joker-round-resource':
      return applyJokerRoundResource(state, operation, context);
    case 'joker-level-current-hand':
      return result(state, false);
    case 'joker-destroy-source':
      return destroySourceJoker(state, operation, context);
    case 'joker-destroy-right-grow':
      return result(destroyRightJokerAndGrow(state, operation, context));
    case 'joker-create-playing-card':
      return result(createFixedEnhancedPlayingCard(state, operation, context));
    case 'patch-rule':
      if (context.sourceInstanceId.startsWith('blind:')) return result(state);
      return result(applyRulePatch(state, operation));
    case 'force-card-choice':
      return result(applyForcedCardChoice(state, operation, context));
    case 'set-card-modifier':
      return result(setCardModifier(state, operation, context));
    case 'transform-card-field':
      return result(transformCards(state, operation, context));
    case 'destroy-card':
      if (operation.selection === undefined) return result(state, false);
      return result(destroyCards(state, operation, context));
    case 'copy-card-state':
      return copyCardState(state, operation, context);
    case 'create-content-family':
      return createContentFamily(state, operation, context);
    case 'create-playing-cards':
      return result(createPlayingCards(state, operation, context));
    case 'level-all-hands':
      return result({
        ...state,
        rules: {
          ...state.rules,
          handLevels: Object.fromEntries(
            POKER_HAND_TYPES.map((handType) => [
              handType,
              Math.max(1, state.rules.handLevels[handType] + operation.amount),
            ]),
          ) as Readonly<Record<PokerHandType, number>>,
        },
      });
    case 'catalog-money':
      return result(applyCatalogMoney(state, operation));
    case 'catalog-shop-rule':
      return result(
        observe(
          applyCatalogShopRule(state, operation),
          context,
          `shop-rule:${operation.key}`,
          operation.value,
        ),
      );
    case 'catalog-blind-rule': {
      const next = applyCatalogBlindRule(state, operation, context);
      if (next.economy.money < -next.rules.allowedDebt) {
        return {
          ok: false,
          code: 'insufficient-funds',
          message: '班主效果会超出当前允许的欠票额度',
        };
      }
      return result(
        observe(next, context, `blind-rule:${operation.key}`, operation.value),
      );
    }
    case 'catalog-tag-rule':
      if (operation.key === 'hand-levels' && typeof operation.value === 'number') {
        const secretHands = new Set<PokerHandType>([
          'five-of-a-kind',
          'flush-house',
          'flush-five',
        ]);
        const eligible = POKER_HAND_TYPES.filter(
          (handType) =>
            !secretHands.has(handType) ||
            state.history.playedHandTypes.includes(handType),
        );
        const chosen = stableRandomIds(eligible, 1, state.rngState);
        const handType = chosen.ids[0] as PokerHandType | undefined;
        if (!handType) return result(state);
        const leveled = {
          ...state,
          rngState: chosen.rngState,
          rules: {
            ...state.rules,
            handLevels: {
              ...state.rules.handLevels,
              [handType]: Math.max(1, state.rules.handLevels[handType] + operation.value),
            },
          },
        };
        return result(
          materializeChoice(leveled, context, 'tag-hand-level', [handType], []),
        );
      }
      if (operation.key === 'hand-size' && typeof operation.value === 'number') {
        return result(
          observe(
            state,
            context,
            `tag-rule:${operation.timing}:${operation.key}`,
            operation.value,
          ),
        );
      }
      if (operation.key === 'history-money' && typeof operation.value === 'string') {
        const units =
          operation.value === 'hands-played'
            ? state.history.playedHandTypes.length
            : operation.value === 'unused-discards'
              ? state.history.effectObservations.reduce(
                  (total, observation) =>
                    observation.key === 'unused-discards-bank' &&
                    typeof observation.value === 'number'
                      ? total + observation.value
                      : total,
                  0,
                )
              : 0;
        return result({
          ...state,
          economy: { ...state.economy, money: state.economy.money + units },
        });
      }
      if (operation.key === 'boss-reroll') {
        const finisher = state.progress.ante % 8 === 0;
        const seen = finisher
          ? state.progress.seenFinisherBossIds
          : state.progress.seenNormalBossIds;
        const pool = eligibleBosses(state.content, state.progress.ante, seen);
        const chosen = stableRandomIds(
          pool.map(({ id }) => id),
          1,
          state.rngState,
        );
        const definition = pool.find(({ id }) => id === chosen.ids[0]);
        if (!definition) return result(state);
        const available = state.content.blinds.filter(
          (blind) =>
            blind.kind === (finisher ? 'finisher' : 'boss') &&
            blind.minimumAnte <= state.progress.ante,
        );
        const resetSeen = available.every(({ id }) => seen.includes(id));
        const nextSeen = resetSeen
          ? [definition.id]
          : [...new Set([...seen, definition.id])];
        const rerolled = {
          ...state,
          rngState: chosen.rngState,
          progress: {
            ...state.progress,
            lineup: {
              ...state.progress.lineup,
              boss: materializeBlind(definition),
            },
            seenNormalBossIds: finisher ? state.progress.seenNormalBossIds : nextSeen,
            seenFinisherBossIds: finisher ? nextSeen : state.progress.seenFinisherBossIds,
          },
        };
        return result(
          materializeChoice(rerolled, context, 'tag-boss-reroll', [definition.id], []),
        );
      }
      return result(
        observe(
          state,
          context,
          `tag-rule:${operation.timing}:${operation.key}`,
          operation.value,
        ),
      );
    case 'catalog-score-rule':
      return result(
        observe(state, context, `score-rule:${operation.key}`, operation.amount),
      );
    case 'catalog-rule':
      return result(
        observe(
          state,
          context,
          `${operation.category}:${operation.key}`,
          operation.value,
        ),
      );
    default:
      return result(state, false);
  }
}
