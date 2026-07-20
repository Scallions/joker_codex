import { getCardChipValue, evaluatePokerHand } from '../poker/evaluate';
import type { CatalogOperation, CatalogTrigger } from '../../content/schema/catalog';
import { stableId, type CardId, type JokerInstanceId } from '../model/ids';
import { isAbilityStateRun, isRunStateV3, type AbilityStateRun } from '../model/runV3';
import type {
  EffectWindow,
  RunPlayingCard,
  RunStateV2,
  ScoreBreakdownV2,
} from '../model/runV2';
import type { RandomState } from '../rng/random';
import { multiplyScore } from '../score/score';
import {
  effectiveCardForPokerV3,
  projectEffectivePlayingCardV3,
} from '../poker/effectiveCardV3';
import { buildHandFactsV3, type HandFactsV3 } from '../poker/handFactsV3';
import type { JokerEventContextV5 } from '../rules/jokerEventFactsV5';
import { resolveJokerPassiveCapabilities } from '../rules/jokerPassiveCapabilitiesV3';
import { resolveListedChanceV6 } from '../rules/listedChanceV6';
import {
  usedConsumableSlotsForRun,
  usedJokerSlotsForRun,
} from '../rules/inventoryCapacityV6';
import {
  evaluateJokerPredicateV3,
  evaluateJokerValueV3,
  type JokerDslFailureCode,
} from '../rules/jokerEffectDslV3';
import { applyStateOperationV3 } from './applyStateOperationV3';
import { applyResolvedRunOperationsV2 } from './runWindowV2';
import {
  resolveEffectQueue,
  type EffectOperation,
  type EffectQueueFailureCode,
  type ResolvedEffectOperation,
} from './registry';
import { bossEffectsDisabledForRun } from '../rules/runtimeV3';

const MAX_EFFECT_OPERATIONS = 10_000;

export type ScoreResolution =
  | {
      readonly ok: true;
      readonly breakdown: ScoreBreakdownV2;
      readonly rngState: RandomState;
      readonly moneyDelta: number;
      readonly destroyedCardIds: readonly CardId[];
      readonly modifierRolls: readonly {
        readonly sourceId: string;
        readonly value: number;
      }[];
      readonly proposedState: RunStateV2;
    }
  | {
      readonly ok: false;
      readonly code:
        | EffectQueueFailureCode
        | JokerDslFailureCode
        | 'insufficient-funds'
        | 'inventory-full'
        | 'pool-empty';
      readonly message: string;
    };

type ScoreResolutionFailure = Extract<ScoreResolution, { readonly ok: false }>;

type JokerScoreOperation = Extract<EffectOperation, { readonly type: 'joker-score' }>;

function resolveJokerScoreValue(
  state: RunStateV2,
  facts: HandFactsV3,
  source: ResolvedEffectOperation,
  operation: JokerScoreOperation,
  window: EffectWindow,
  cardId: CardId | undefined,
  rngState: RandomState,
  originalStencilCount: number,
  eventContext?: JokerEventContextV5,
):
  | {
      readonly ok: true;
      readonly applied: boolean;
      readonly value: number;
      readonly rngState: RandomState;
      readonly rolls: readonly number[];
    }
  | ScoreResolutionFailure {
  if (source.copiedBy.length > 0 && operation.copyFacet === 'none') {
    return { ok: true, applied: false, value: 0, rngState, rolls: [] };
  }
  const context = {
    state,
    facts,
    sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
    window,
    ...(cardId ? { cardId } : {}),
    rngState,
    originalStencilCount,
    ...(eventContext ? { eventContext } : {}),
  };
  const predicate = evaluateJokerPredicateV3(operation.predicate, context);
  if (!predicate.ok) return predicate;
  if (!predicate.matched) {
    return {
      ok: true,
      applied: false,
      value: 0,
      rngState: predicate.rngState,
      rolls: predicate.rolls.map(({ value }) => value),
    };
  }
  const value = evaluateJokerValueV3(operation.value, {
    ...context,
    rngState: predicate.rngState,
  });
  if (!value.ok) return value;
  return {
    ok: true,
    applied: true,
    value: value.value,
    rngState: value.rngState,
    rolls: [...predicate.rolls, ...value.rolls].map((roll) => roll.value),
  };
}

function modifierOperations(
  state: RunStateV2,
  card: RunPlayingCard,
  trigger: CatalogTrigger | 'identity',
): readonly { readonly sourceId: string; readonly operation: CatalogOperation }[] {
  if (!isRunStateV3(state)) return [];
  const durable = state.deck.cards.find(({ id }) => id === card.id) ?? card;
  const mirror = state.modifiersV3.playingCards.find(({ cardId }) => cardId === card.id);
  const ids = [
    mirror?.enhancementId ?? durable.enhancementId,
    mirror?.sealId ?? durable.sealId,
    mirror?.editionId ?? durable.editionId,
  ].filter((id): id is string => id !== null);
  return ids.flatMap((id) => {
    const row = state.productionContentV3.rows.find(
      ({ definition }) => definition.id === id,
    )?.definition;
    if (!row) return [];
    return row.effects.flatMap((effect) =>
      trigger === 'identity' ||
      effect.trigger === trigger ||
      (trigger === 'scored-card' && effect.trigger === 'passive')
        ? effect.operations.map((operation) => ({ sourceId: row.id, operation }))
        : [],
    );
  });
}

function compatibleCard(state: RunStateV2, card: RunPlayingCard) {
  return effectiveCardForPokerV3(card, projectEffectivePlayingCardV3(state, card));
}

function setupOperations(state: RunStateV2): readonly CatalogOperation[] {
  if (!isRunStateV3(state)) return [];
  const ids = new Set([
    state.setupV3.deckId,
    ...state.setupV3.appliedStakeIds,
    ...(state.setupV3.challengeId ? [state.setupV3.challengeId] : []),
  ]);
  return state.productionContentV3.rows
    .filter(({ definition }) => ids.has(definition.id))
    .flatMap(({ definition }) =>
      definition.effects.flatMap((effect) => effect.operations),
    );
}

function resolveJokerWindow(
  state: RunStateV2,
  window: EffectWindow,
):
  | {
      readonly ok: true;
      readonly operations: readonly ResolvedEffectOperation[];
      readonly operationCount: number;
    }
  | ScoreResolutionFailure {
  return resolveEffectQueue(
    state.inventory.jokers.map((joker, position) => ({
      instanceId: joker.instanceId,
      position,
      effects: joker.effects,
      debuffed: joker.debuffed,
      copyPolicy: joker.copyPolicy ?? 'none',
      copyTarget: joker.copyTarget ?? 'none',
    })),
    window,
    { state, maximumOperations: MAX_EFFECT_OPERATIONS },
  );
}

function resolveBeforeHandWindow(state: RunStateV2):
  | {
      readonly ok: true;
      readonly operations: readonly ResolvedEffectOperation[];
      readonly operationCount: number;
    }
  | ScoreResolutionFailure {
  const bossRulesDisabled = bossEffectsDisabledForRun(state);
  return resolveEffectQueue(
    [
      ...(state.round && !bossRulesDisabled
        ? [
            {
              instanceId: `blind:${state.round.blind.definitionId}`,
              position: 0,
              effects: state.round.blind.effects,
            },
          ]
        : []),
      ...state.inventory.voucherIds.flatMap((voucherId, index) => {
        const definition = state.content.vouchers.find(
          (candidate) => candidate.id === voucherId,
        );
        return definition
          ? [
              {
                instanceId: `voucher:${voucherId}`,
                position: 300 + index,
                effects: definition.effects,
              },
            ]
          : [];
      }),
      ...state.inventory.jokers.map((joker, index) => ({
        instanceId: joker.instanceId,
        position: 1_000 + index,
        effects: joker.effects,
        debuffed: joker.debuffed,
        copyPolicy: joker.copyPolicy ?? 'none',
        copyTarget: joker.copyTarget ?? 'none',
      })),
      ...state.inventory.consumables.map((item, index) => ({
        instanceId: item.instanceId,
        position: 2_000 + index,
        effects: item.effects,
      })),
    ],
    'before-hand',
    { state, maximumOperations: MAX_EFFECT_OPERATIONS },
  );
}

function resolveGlobalAfterHandWindow(state: RunStateV2):
  | {
      readonly ok: true;
      readonly operations: readonly ResolvedEffectOperation[];
      readonly operationCount: number;
    }
  | ScoreResolutionFailure {
  return resolveEffectQueue(
    [
      ...state.inventory.voucherIds.flatMap((voucherId, index) => {
        const definition = state.content.vouchers.find(
          (candidate) => candidate.id === voucherId,
        );
        return definition
          ? [
              {
                instanceId: `voucher:${voucherId}`,
                position: 300 + index,
                effects: definition.effects,
              },
            ]
          : [];
      }),
      ...state.inventory.consumables.map((item, index) => ({
        instanceId: item.instanceId,
        position: 2_000 + index,
        effects: item.effects,
      })),
    ],
    'after-hand',
    { state, maximumOperations: MAX_EFFECT_OPERATIONS },
  );
}

function debuffedCardIds(
  state: RunStateV2,
  cards: readonly RunPlayingCard[],
  operations: readonly EffectOperation[],
  allCardsFace: boolean,
): ReadonlySet<CardId> {
  const suits = operations
    .filter(
      (
        operation,
      ): operation is Extract<EffectOperation, { readonly type: 'debuff-suit' }> =>
        operation.type === 'debuff-suit',
    )
    .map((operation) => operation.suit);
  const explicit = new Set(
    operations
      .filter(
        (
          operation,
        ): operation is Extract<EffectOperation, { readonly type: 'debuff-card' }> =>
          operation.type === 'debuff-card',
      )
      .map((operation) => operation.cardId),
  );
  for (const operation of operations) {
    if (operation.type === 'enable-card') explicit.delete(operation.cardId);
    if (operation.type !== 'transform-card-field' || operation.field !== 'debuff') {
      continue;
    }
    for (const card of cards) {
      const matches =
        operation.value === true ||
        operation.value === card.suit ||
        (operation.value === 'face-card' &&
          projectEffectivePlayingCardV3(state, card, { allCardsFace }).face) ||
        (operation.selection === 'played-this-ante' &&
          state.history.playedCardIdsThisAnte.includes(card.id));
      if (matches) explicit.add(card.id);
    }
  }
  if (isRunStateV3(state)) {
    for (const modifier of state.modifiersV3.playingCards) {
      if (modifier.debuffed) explicit.add(modifier.cardId);
    }
  }
  return new Set(
    cards
      .filter((card) => suits.includes(card.suit) || explicit.has(card.id))
      .map((card) => card.id),
  );
}

export function validateBeforeHandV2(
  state: RunStateV2,
  cards: readonly RunPlayingCard[],
): string | null {
  const passives = resolveJokerPassiveCapabilities(state);
  if (!passives.ok) return passives.message;
  const resolved = resolveBeforeHandWindow(state);
  if (!resolved.ok) return resolved.message;
  const evaluation = evaluatePokerHand(
    cards.map((card) => compatibleCard(state, card)),
    {
      straightSize: passives.capabilities.straightSize,
      flushSize: passives.capabilities.flushSize,
      straightMaximumStep: passives.capabilities.straightMaximumStep,
      handLevels: state.rules.handLevels,
    },
  );
  for (const { operation } of resolved.operations) {
    if (operation.type === 'require-play-count' && cards.length !== operation.count) {
      return `${state.round?.blind.name ?? '当前班主'}要求每次恰好打出${operation.count}张牌`;
    }
    if (
      operation.type === 'catalog-blind-rule' &&
      operation.key === 'hand-type-no-repeat'
    ) {
      const handsThisRound = state.history.playedHandTypes.slice(
        -(state.round?.handsPlayed ?? 0),
      );
      if (handsThisRound.includes(evaluation.type)) {
        return `${state.round?.blind.name ?? '当前班主'}不允许重复牌型`;
      }
    }
    if (
      operation.type === 'catalog-blind-rule' &&
      operation.key === 'first-hand-type-only' &&
      (state.round?.handsPlayed ?? 0) > 0
    ) {
      const firstType = state.history.playedHandTypes.at(
        -(state.round?.handsPlayed ?? 0),
      );
      if (firstType !== evaluation.type) {
        return `${state.round?.blind.name ?? '当前班主'}只允许首个牌型`;
      }
    }
  }
  return null;
}

export function resolveHandScoreV2(
  state: RunStateV2,
  cards: readonly RunPlayingCard[],
): ScoreResolution {
  const passives = resolveJokerPassiveCapabilities(state);
  if (!passives.ok) return passives;
  const beforeHand = resolveBeforeHandWindow(state);
  if (!beforeHand.ok) return beforeHand;
  const scoredCardEffects = resolveJokerWindow(state, 'scored-card');
  if (!scoredCardEffects.ok) return scoredCardEffects;
  const heldCardEffects = resolveJokerWindow(state, 'held-card');
  if (!heldCardEffects.ok) return heldCardEffects;
  const independentEffects = resolveJokerWindow(state, 'joker-independent');
  if (!independentEffects.ok) return independentEffects;
  const afterHandEffects = resolveJokerWindow(state, 'after-hand');
  if (!afterHandEffects.ok) return afterHandEffects;
  const globalAfterHandEffects = resolveGlobalAfterHandWindow(state);
  if (!globalAfterHandEffects.ok) return globalAfterHandEffects;

  const beforeHandOperations = beforeHand.operations.map((entry) => entry.operation);
  const playedIds = new Set(cards.map((card) => card.id));
  const stateCardMap = new Map(state.deck.cards.map((card) => [card.id, card]));
  const heldCards = (state.round?.handIds ?? [])
    .filter((cardId) => !playedIds.has(cardId))
    .map((cardId) => stateCardMap.get(cardId))
    .filter((card): card is RunPlayingCard => card !== undefined);
  const debuffed = debuffedCardIds(
    state,
    [...cards, ...heldCards],
    beforeHandOperations,
    passives.capabilities.allCardsFace,
  );
  const handFacts = buildHandFactsV3(state, cards, heldCards, {
    debuffedCardIds: debuffed,
  });
  if (!handFacts.ok) return handFacts;
  const facts = handFacts.facts;
  const playedEventContext: JokerEventContextV5 = {
    eventFacts: {
      kind: 'played-hand',
      playedCardIds: facts.playedCardIds,
      firstHandOfRound: (state.round?.handsPlayed ?? 0) === 0,
      displayedHand: facts.displayedHand,
      previousRoundHandTypes: state.history.playedHandTypes.slice(
        -(state.round?.handsPlayed ?? 0),
      ),
    },
    eventCardIdentities: Object.fromEntries(
      facts.playedCardIds.flatMap((cardId) => {
        const identity = facts.effectiveCards[cardId];
        return identity ? [[cardId, identity] as const] : [];
      }),
    ),
  };
  const compatibleCards = cards.map((card) =>
    effectiveCardForPokerV3(card, facts.effectiveCards[card.id]!),
  );
  const suitCandidates = Object.fromEntries(
    facts.playedCardIds.flatMap((cardId) => {
      const identity = facts.effectiveCards[cardId];
      return identity ? [[cardId, identity.suits] as const] : [];
    }),
  );
  let rngState = state.rngState;
  let proposedState = state;
  const modifierRolls: { sourceId: string; value: number }[] = [];
  let evaluation = evaluatePokerHand(compatibleCards, {
    straightSize: passives.capabilities.straightSize,
    flushSize: passives.capabilities.flushSize,
    straightMaximumStep: passives.capabilities.straightMaximumStep,
    handLevels: state.rules.handLevels,
    suitCandidates,
  });
  for (const source of beforeHand.operations) {
    const operation = source.operation;
    if (operation.type !== 'joker-level-current-hand') continue;
    const predicate = evaluateJokerPredicateV3(operation.predicate, {
      state: proposedState,
      facts,
      sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
      window: 'before-hand',
      rngState,
      originalStencilCount: 0,
      eventContext: playedEventContext,
    });
    if (!predicate.ok) return predicate;
    rngState = predicate.rngState;
    modifierRolls.push(
      ...predicate.rolls.map(({ value }) => ({ sourceId: source.effectId, value })),
    );
    if (!predicate.matched) continue;
    proposedState = {
      ...proposedState,
      rules: {
        ...proposedState.rules,
        handLevels: {
          ...proposedState.rules.handLevels,
          [evaluation.type]: Math.max(
            1,
            proposedState.rules.handLevels[evaluation.type] + operation.levels,
          ),
        },
      },
    };
  }
  evaluation = evaluatePokerHand(compatibleCards, {
    straightSize: passives.capabilities.straightSize,
    flushSize: passives.capabilities.flushSize,
    straightMaximumStep: passives.capabilities.straightMaximumStep,
    handLevels: proposedState.rules.handLevels,
    suitCandidates,
  });
  const levelDecrease = beforeHandOperations.find(
    (operation) =>
      operation.type === 'catalog-blind-rule' &&
      operation.key === 'decrease-hand-level' &&
      typeof operation.value === 'number',
  );
  if (
    levelDecrease?.type === 'catalog-blind-rule' &&
    typeof levelDecrease.value === 'number'
  ) {
    evaluation = evaluatePokerHand(compatibleCards, {
      straightSize: passives.capabilities.straightSize,
      flushSize: passives.capabilities.flushSize,
      straightMaximumStep: passives.capabilities.straightMaximumStep,
      handLevels: {
        ...proposedState.rules.handLevels,
        [evaluation.type]: Math.max(
          1,
          proposedState.rules.handLevels[evaluation.type] - levelDecrease.value,
        ),
      },
      suitCandidates,
    });
  }
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const scoringIds = new Set(facts.scoringCardIds);
  const scoringCards = cards.filter((card) => scoringIds.has(card.id));
  let operationCount =
    beforeHand.operationCount +
    scoredCardEffects.operationCount +
    heldCardEffects.operationCount +
    independentEffects.operationCount +
    afterHandEffects.operationCount +
    globalAfterHandEffects.operationCount;
  let cardChips = 0;
  let baseChips = evaluation.baseChips;
  let multiplier = evaluation.baseMultiplier;
  let finalScoreFactor = 1;
  let moneyDelta = 0;
  const destroyedCardIds = new Set<CardId>();
  const deferredCloneSources: ResolvedEffectOperation[] = [];
  const trace: string[] = [
    `window:before-hand`,
    `hand:${evaluation.type}`,
    `base:${evaluation.baseChips}x${multiplier}`,
    `window:scored-card`,
  ];
  const originalStencilCount = new Set(
    independentEffects.operations
      .filter(
        (source) =>
          source.copiedBy.length === 0 &&
          source.operation.type === 'joker-score' &&
          source.operation.value.kind === 'empty-joker-slots-with-stencils',
      )
      .map(({ sourceInstanceId }) => sourceInstanceId),
  ).size;
  const applyJokerScore = (
    source: ResolvedEffectOperation,
    window: EffectWindow,
    cardId?: CardId,
    eventContext: JokerEventContextV5 = playedEventContext,
  ): ScoreResolutionFailure | null => {
    if (source.operation.type !== 'joker-score') return null;
    const resolved = resolveJokerScoreValue(
      proposedState,
      facts,
      source,
      source.operation,
      window,
      cardId,
      rngState,
      originalStencilCount,
      eventContext,
    );
    if (!resolved.ok) return resolved;
    rngState = resolved.rngState;
    modifierRolls.push(
      ...resolved.rolls.map((value) => ({ sourceId: source.effectId, value })),
    );
    if (!resolved.applied) return null;
    const sourceTrace = source.copiedBy.length
      ? `${source.copiedBy.join('>')}=>${source.sourceInstanceId}`
      : source.sourceInstanceId;
    if (source.operation.metric === 'chips') cardChips += resolved.value;
    if (source.operation.metric === 'mult') multiplier += resolved.value;
    if (source.operation.metric === 'mult-factor') {
      multiplier = multiplyScore(multiplier, resolved.value);
    }
    if (source.operation.metric === 'money') moneyDelta += resolved.value;
    trace.push(
      `joker-dsl:${window}:${sourceTrace}:${source.effectId}:${source.operation.metric}:${resolved.value}`,
    );
    return null;
  };
  const applyJokerStateChange = (
    source: ResolvedEffectOperation,
    window: EffectWindow,
    cardId?: CardId,
  ): ScoreResolutionFailure | null => {
    const operation = source.operation;
    if (operation.type !== 'joker-state-change') return null;
    if (source.copiedBy.length > 0 && operation.copyFacet === 'none') return null;
    const context = {
      state: proposedState,
      facts,
      sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
      window,
      ...(cardId ? { cardId } : {}),
      rngState,
      originalStencilCount,
      eventContext: playedEventContext,
    };
    const predicate = evaluateJokerPredicateV3(operation.predicate, context);
    if (!predicate.ok) return predicate;
    rngState = predicate.rngState;
    modifierRolls.push(
      ...predicate.rolls.map(({ value }) => ({ sourceId: source.effectId, value })),
    );
    if (!predicate.matched) return null;
    const value = evaluateJokerValueV3(operation.value, {
      ...context,
      state: proposedState,
      rngState,
    });
    if (!value.ok) return value;
    rngState = value.rngState;
    modifierRolls.push(
      ...value.rolls.map(({ value: roll }) => ({
        sourceId: source.effectId,
        value: roll,
      })),
    );
    if (!isAbilityStateRun(proposedState)) {
      return {
        ok: false,
        code: 'joker-state-key',
        message: '当前牌局不支持奇牌能力状态',
      };
    }
    const stateV4 = proposedState;
    const modifier = stateV4.modifiersV3.jokers.find(
      ({ instanceId }) => instanceId === source.sourceInstanceId,
    );
    const current = modifier?.abilityState[operation.key];
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
    const changedState: AbilityStateRun = {
      ...stateV4,
      modifiersV3: {
        ...stateV4.modifiersV3,
        jokers: stateV4.modifiersV3.jokers.map((candidate) =>
          candidate.instanceId === source.sourceInstanceId
            ? {
                ...candidate,
                abilityState: {
                  ...candidate.abilityState,
                  [operation.key]: changed,
                },
              }
            : candidate,
        ),
      },
    };
    proposedState = changedState;
    trace.push(
      `joker-state:${window}:${source.sourceInstanceId}:${source.effectId}:${operation.key}:${changed}`,
    );
    return null;
  };
  const jokerRetriggerSourcesFor = (
    sources: readonly ResolvedEffectOperation[],
    target: 'scored-card' | 'held-card',
    window: EffectWindow,
    cardId: CardId,
  ):
    | { readonly ok: true; readonly sources: readonly string[] }
    | ScoreResolutionFailure => {
    const output: string[] = [];
    for (const source of sources) {
      const operation = source.operation;
      if (operation.type !== 'joker-retrigger-card' || operation.target !== target) {
        continue;
      }
      if (source.copiedBy.length > 0 && operation.copyFacet === 'none') continue;
      const predicate = evaluateJokerPredicateV3(operation.predicate, {
        state: proposedState,
        facts,
        sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
        window,
        cardId,
        rngState,
        originalStencilCount,
        eventContext: playedEventContext,
      });
      if (!predicate.ok) return predicate;
      rngState = predicate.rngState;
      modifierRolls.push(
        ...predicate.rolls.map(({ value }) => ({ sourceId: source.effectId, value })),
      );
      if (!predicate.matched) continue;
      output.push(
        ...Array.from({ length: operation.count }, () => `joker:${source.effectId}`),
      );
    }
    return { ok: true, sources: output };
  };
  const applyJokerCreateContent = (
    source: ResolvedEffectOperation,
    window: EffectWindow,
    cardId?: CardId,
  ): ScoreResolutionFailure | null => {
    const operation = source.operation;
    if (operation.type !== 'joker-create-content') return null;
    if (source.copiedBy.length > 0 && operation.copyFacet === 'none') return null;
    const lacksCapacity =
      operation.capacityRequired &&
      ((operation.family === 'joker' &&
        usedJokerSlotsForRun(proposedState) >= proposedState.rules.jokerSlots) ||
        ((operation.family === 'tarot' ||
          operation.family === 'planet' ||
          operation.family === 'spectral') &&
          usedConsumableSlotsForRun(proposedState) >=
            proposedState.rules.consumableSlots));
    if (lacksCapacity) return null;
    const predicate = evaluateJokerPredicateV3(operation.predicate, {
      state: proposedState,
      facts,
      sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
      window,
      ...(cardId ? { cardId } : {}),
      rngState,
      originalStencilCount,
      eventContext: playedEventContext,
    });
    if (!predicate.ok) return predicate;
    rngState = predicate.rngState;
    modifierRolls.push(
      ...predicate.rolls.map(({ value }) => ({ sourceId: source.effectId, value })),
    );
    if (!predicate.matched) return null;
    const created = applyStateOperationV3(
      { ...proposedState, rngState },
      {
        type: 'create-content-family',
        family: operation.family,
        count: operation.count,
        rarity: operation.rarity,
        capacityRequired: operation.capacityRequired,
        stickerPolicy: operation.stickerPolicy,
      },
      {
        window,
        sourceInstanceId: source.sourceInstanceId,
        effectId: source.effectId,
      },
    );
    if (!created.ok) {
      return { ok: false, code: created.code, message: created.message };
    }
    proposedState = created.state;
    rngState = created.state.rngState;
    return null;
  };
  const applyProposedStateOperation = (
    source: ResolvedEffectOperation,
    window: EffectWindow,
    cardId?: CardId,
    eventContext: JokerEventContextV5 = playedEventContext,
  ): ScoreResolutionFailure | null => {
    const operation = source.operation;
    if (
      source.copiedBy.length > 0 &&
      'copyFacet' in operation &&
      operation.copyFacet === 'none'
    ) {
      return null;
    }
    const applied = applyStateOperationV3({ ...proposedState, rngState }, operation, {
      window,
      sourceInstanceId: source.sourceInstanceId,
      effectId: source.effectId,
      copiedBy: source.copiedBy,
      handFacts: facts,
      eventContext,
      ...(cardId ? { cardId } : {}),
    });
    if (!applied.ok) return applied;
    if (applied.handled) {
      proposedState = applied.state;
      rngState = applied.state.rngState;
    }
    return null;
  };
  const emitStateOnlyJokerWindow = (
    window: EffectWindow,
    eventContext: JokerEventContextV5,
  ): ScoreResolutionFailure | null => {
    const resolved = resolveJokerWindow(proposedState, window);
    if (!resolved.ok) return resolved;
    operationCount += resolved.operationCount;
    if (operationCount > MAX_EFFECT_OPERATIONS) {
      return {
        ok: false,
        code: 'effect-budget',
        message: '效果操作超过安全上限，已拒绝本次结算',
      };
    }
    for (const source of resolved.operations) {
      operationCount += 1;
      if (operationCount > MAX_EFFECT_OPERATIONS) {
        return {
          ok: false,
          code: 'effect-budget',
          message: '效果操作超过安全上限，已拒绝本次结算',
        };
      }
      const failure = applyProposedStateOperation(
        source,
        window,
        undefined,
        eventContext,
      );
      if (failure) return failure;
    }
    return null;
  };
  for (const source of beforeHand.operations) {
    const operation = source.operation;
    if (
      operation.type === 'joker-clone-played-card' ||
      operation.type === 'joker-destroy-event-card'
    ) {
      if (!(source.copiedBy.length > 0 && operation.copyFacet === 'none')) {
        const predicate = evaluateJokerPredicateV3(operation.predicate, {
          state: proposedState,
          facts,
          sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
          window: 'before-hand',
          rngState,
          originalStencilCount,
          eventContext: playedEventContext,
        });
        if (!predicate.ok) return predicate;
        rngState = predicate.rngState;
        modifierRolls.push(
          ...predicate.rolls.map(({ value }) => ({
            sourceId: source.effectId,
            value,
          })),
        );
        if (predicate.matched) {
          if (operation.type === 'joker-clone-played-card') {
            deferredCloneSources.push(source);
          } else {
            for (const cardId of facts.playedCardIds) destroyedCardIds.add(cardId);
          }
        }
      }
    }
    if (operation.type === 'joker-create-content') {
      const createFailure = applyJokerCreateContent(source, 'before-hand');
      if (createFailure) return createFailure;
    }
    if (operation.type === 'add-chips') {
      cardChips += operation.amount;
      trace.splice(-1, 0, `before:${source.effectId}:chips+${operation.amount}`);
    }
    if (operation.type === 'add-multiplier') {
      multiplier += operation.amount;
      trace.splice(-1, 0, `before:${source.effectId}:mult+${operation.amount}`);
    }
    if (operation.type === 'multiply-multiplier') {
      multiplier = multiplyScore(multiplier, operation.factor);
      trace.splice(-1, 0, `before:${source.effectId}:multx${operation.factor}`);
    }
    if (operation.type === 'multiply-final-score') {
      finalScoreFactor = multiplyScore(finalScoreFactor, operation.factor);
      trace.splice(-1, 0, `before:${source.effectId}:scorex${operation.factor}`);
    }
    if (operation.type === 'catalog-score-rule' && operation.key === 'halve-base') {
      baseChips = Math.floor(baseChips * operation.amount);
      multiplier = multiplyScore(multiplier, operation.amount);
      trace.splice(-1, 0, `before:${source.effectId}:base-x${operation.amount}`);
    }
    if (
      operation.type === 'record-observation' &&
      operation.key === 'baseline:held-matching-planet-multiplies-1.5' &&
      state.inventory.consumables.some((item) =>
        item.effects.some((effect) => effect.parameters.hand === evaluation.type),
      )
    ) {
      multiplier = multiplyScore(multiplier, 1.5);
      trace.splice(-1, 0, `before:${source.effectId}:held-planet-x1.5`);
    }
  }

  // Hand identity and scoring membership are already frozen in `facts`. Card
  // enhancement mutations now run in Joker/source order before the first card
  // pass, so later sources observe earlier transformations without changing the
  // displayed hand that was admitted at command entry.
  for (const card of scoringCards) {
    if (debuffed.has(card.id)) continue;
    for (const source of scoredCardEffects.operations) {
      if (
        source.operation.type !== 'joker-state-change-clamped' &&
        source.operation.type !== 'joker-transform-enhancement'
      ) {
        continue;
      }
      operationCount += 1;
      const failure = applyProposedStateOperation(source, 'scored-card', card.id);
      if (failure) return failure;
    }
  }

  for (const [cardIndex, card] of scoringCards.entries()) {
    operationCount += 1;
    if (operationCount > MAX_EFFECT_OPERATIONS) {
      return {
        ok: false,
        code: 'effect-budget',
        message: '效果操作超过安全上限，已拒绝本次结算',
      };
    }
    if (debuffed.has(card.id)) {
      trace.push(`card:${card.id}:debuffed`);
      continue;
    }
    const catalogOperations = modifierOperations(proposedState, card, 'scored-card');
    const catalogRetriggerSources = catalogOperations
      .filter(
        ({ operation }) =>
          operation.type === 'baseline' &&
          operation.key === 'retrigger-scored-or-held-card-once',
      )
      .map(({ sourceId }) => sourceId);
    const jokerRetriggerSources = scoredCardEffects.operations.flatMap((source) =>
      source.operation.type === 'retrigger-card' &&
      (!source.operation.onlyFirst || cardIndex === 0)
        ? Array.from({ length: source.operation.count }, () => source.effectId)
        : [],
    );
    const dslRetriggers = jokerRetriggerSourcesFor(
      scoredCardEffects.operations,
      'scored-card',
      'scored-card',
      card.id,
    );
    if (!dslRetriggers.ok) return dslRetriggers;
    const retriggerSources = [
      ...catalogRetriggerSources,
      ...jokerRetriggerSources,
      ...dslRetriggers.sources,
    ];
    const passes = 1 + retriggerSources.length;
    for (let pass = 0; pass < passes; pass += 1) {
      operationCount += 1;
      for (const source of scoredCardEffects.operations) {
        if (source.operation.type !== 'joker-state-change') continue;
        operationCount += 1;
        const stateFailure = applyJokerStateChange(source, 'scored-card', card.id);
        if (stateFailure) return stateFailure;
      }
      const currentCard =
        proposedState.deck.cards.find(({ id }) => id === card.id) ?? card;
      const value =
        getCardChipValue(compatibleCard(proposedState, currentCard)) +
        currentCard.bonusChips;
      cardChips += value;
      trace.push(
        pass === 0
          ? `card:${card.id}:chips+${value}`
          : `retrigger:${retriggerSources[pass - 1]}:${card.id}:chips+${value}`,
      );
      let successfulLuckyBranches = 0;
      for (const { sourceId, operation } of catalogOperations) {
        operationCount += 1;
        let applied = true;
        if (
          operation.type === 'score-rule' &&
          operation.numerator !== null &&
          operation.denominator !== null
        ) {
          const draw = resolveListedChanceV6(
            {
              numerator: operation.numerator,
              denominator: operation.denominator,
              sourceId,
              reason: 'playing-card-modifier',
            },
            passives.capabilities.listedChancePower,
            rngState,
          );
          rngState = draw.rngState;
          if (draw.roll !== null) modifierRolls.push({ sourceId, value: draw.roll });
          applied = draw.succeeded;
        }
        if (!applied) continue;
        if (
          sourceId === 'bxqp:enhancement:lucky-knot' &&
          operation.type === 'score-rule' &&
          operation.numerator !== null &&
          operation.denominator !== null
        ) {
          successfulLuckyBranches += 1;
        }
        if (operation.type === 'score-rule' && operation.key === 'add-chips') {
          const stoneIdentity = catalogOperations.some(
            (entry) =>
              entry.operation.type === 'baseline' &&
              entry.operation.key === 'playing-card-has-no-effective-rank-or-suit',
          );
          if (!stoneIdentity) cardChips += operation.amount;
        }
        if (operation.type === 'score-rule' && operation.key === 'add-mult') {
          multiplier += operation.amount;
        }
        if (operation.type === 'score-rule' && operation.key === 'multiply-mult') {
          multiplier = multiplyScore(multiplier, operation.amount);
        }
        if (operation.type === 'score-rule' && operation.key === 'chance-money') {
          moneyDelta += operation.amount;
        }
        if (operation.type === 'money' && operation.mode === 'add') {
          moneyDelta += operation.amount;
        }
        if (
          operation.type === 'baseline' &&
          operation.key === 'post-score-independent-destroy-1-in-4'
        ) {
          const draw = resolveListedChanceV6(
            {
              numerator: 1,
              denominator: 4,
              sourceId,
              reason: 'glass-break',
            },
            passives.capabilities.listedChancePower,
            rngState,
          );
          rngState = draw.rngState;
          if (draw.roll !== null) modifierRolls.push({ sourceId, value: draw.roll });
          if (draw.succeeded) destroyedCardIds.add(card.id);
        }
      }
      if (successfulLuckyBranches > 0) {
        const modifierEventContext: JokerEventContextV5 = {
          eventFacts: {
            kind: 'modifier-success',
            cardId: card.id,
            modifierId: 'bxqp:enhancement:lucky-knot',
            successfulBranches: successfulLuckyBranches,
            passIndex: pass,
          },
          eventCardIdentities: {
            [card.id]: facts.effectiveCards[card.id]!,
          },
        };
        const modifierFailure = emitStateOnlyJokerWindow(
          'playing-card-modifier-succeeded',
          modifierEventContext,
        );
        if (modifierFailure) return modifierFailure;
      }
      for (const source of scoredCardEffects.operations) {
        const operation = source.operation;
        if (
          operation.type === 'joker-state-change-clamped' ||
          operation.type === 'joker-transform-enhancement' ||
          operation.type === 'joker-add-card-bonus'
        ) {
          continue;
        }
        const sourceTrace = source.copiedBy.length
          ? `${source.copiedBy.join('>')}=>${source.sourceInstanceId}`
          : source.sourceInstanceId;
        if (operation.type === 'add-chips') {
          operationCount += 1;
          cardChips += operation.amount;
          trace.push(
            `card-effect:${sourceTrace}:${source.effectId}:${card.id}:chips+${operation.amount}`,
          );
        }
        if (operation.type === 'add-multiplier') {
          operationCount += 1;
          multiplier += operation.amount;
          trace.push(
            `card-effect:${sourceTrace}:${source.effectId}:${card.id}:mult+${operation.amount}`,
          );
        }
        if (operation.type === 'multiply-multiplier') {
          operationCount += 1;
          multiplier = multiplyScore(multiplier, operation.factor);
          trace.push(
            `card-effect:${sourceTrace}:${source.effectId}:${card.id}:multx${operation.factor}`,
          );
        }
        if (operation.type === 'joker-score') operationCount += 1;
        const dslFailure = applyJokerScore(source, 'scored-card', card.id);
        if (dslFailure) return dslFailure;
        if (operation.type === 'joker-create-content') operationCount += 1;
        const createFailure = applyJokerCreateContent(source, 'scored-card', card.id);
        if (createFailure) return createFailure;
      }
      for (const source of scoredCardEffects.operations) {
        if (source.operation.type !== 'joker-add-card-bonus') continue;
        operationCount += 1;
        const bonusFailure = applyProposedStateOperation(source, 'scored-card', card.id);
        if (bonusFailure) return bonusFailure;
      }
    }
  }

  trace.push('window:held-card');
  for (const card of heldCards) {
    if (debuffed.has(card.id)) continue;
    const heldOperations = modifierOperations(proposedState, card, 'held-card');
    const heldRetrigger = modifierOperations(proposedState, card, 'identity').some(
      ({ operation }) =>
        operation.type === 'baseline' &&
        operation.key === 'retrigger-scored-or-held-card-once',
    );
    const dslRetriggers = jokerRetriggerSourcesFor(
      heldCardEffects.operations,
      'held-card',
      'held-card',
      card.id,
    );
    if (!dslRetriggers.ok) return dslRetriggers;
    const heldPasses = 1 + (heldRetrigger ? 1 : 0) + dslRetriggers.sources.length;
    for (let pass = 0; pass < heldPasses; pass += 1) {
      for (const { sourceId, operation } of heldOperations) {
        operationCount += 1;
        if (operation.type === 'score-rule' && operation.key === 'add-chips') {
          cardChips += operation.amount;
        }
        if (operation.type === 'score-rule' && operation.key === 'add-mult') {
          multiplier += operation.amount;
        }
        if (operation.type === 'score-rule' && operation.key === 'multiply-mult') {
          multiplier = multiplyScore(multiplier, operation.amount);
        }
        trace.push(`held-modifier:${sourceId}:${card.id}:pass:${pass + 1}`);
      }
      for (const source of heldCardEffects.operations) {
        if (source.operation.type === 'joker-score') operationCount += 1;
        const dslFailure = applyJokerScore(source, 'held-card', card.id);
        if (dslFailure) return dslFailure;
      }
    }
    for (const source of heldCardEffects.operations) {
      const operation = source.operation;
      if (operation.type === 'joker-score') continue;
      operationCount += 1;
      if (operation.type === 'add-chips') cardChips += operation.amount;
      if (operation.type === 'add-multiplier') multiplier += operation.amount;
      if (operation.type === 'multiply-multiplier') {
        multiplier = multiplyScore(multiplier, operation.factor);
      }
      if (
        operation.type === 'add-chips' ||
        operation.type === 'add-multiplier' ||
        operation.type === 'multiply-multiplier'
      ) {
        trace.push(`held:${source.effectId}:${card.id}:${operation.type}`);
      }
    }
  }

  trace.push('window:joker-independent');
  const independentOperationsByRoot = new Map<string, ResolvedEffectOperation[]>();
  for (const source of independentEffects.operations) {
    const rootInstanceId = source.copiedBy[0] ?? source.sourceInstanceId;
    const collected = independentOperationsByRoot.get(rootInstanceId) ?? [];
    collected.push(source);
    independentOperationsByRoot.set(rootInstanceId, collected);
  }
  for (const [position, ownedJoker] of state.inventory.jokers.entries()) {
    const ownedOperations = independentOperationsByRoot.get(ownedJoker.instanceId) ?? [];
    for (const source of ownedOperations) {
      const operation = source.operation;
      const sourceTrace = source.copiedBy.length
        ? `${source.copiedBy.join('>')}=>${source.sourceInstanceId}`
        : source.sourceInstanceId;
      if (operation.type === 'add-chips') {
        cardChips += operation.amount;
        trace.push(`joker:${sourceTrace}:${source.effectId}:chips+${operation.amount}`);
      }
      if (operation.type === 'add-multiplier') {
        multiplier += operation.amount;
        trace.push(`joker:${sourceTrace}:${source.effectId}:mult+${operation.amount}`);
      }
      if (operation.type === 'multiply-multiplier') {
        multiplier = multiplyScore(multiplier, operation.factor);
        trace.push(`joker:${sourceTrace}:${source.effectId}:multx${operation.factor}`);
      }
      if (operation.type === 'joker-state-change') operationCount += 1;
      const stateFailure = applyJokerStateChange(source, 'joker-independent');
      if (stateFailure) return stateFailure;
      if (operation.type === 'joker-state-change-clamped') {
        operationCount += 1;
        const clampedFailure = applyProposedStateOperation(source, 'joker-independent');
        if (clampedFailure) return clampedFailure;
      }
      if (operation.type === 'joker-score') operationCount += 1;
      const dslFailure = applyJokerScore(source, 'joker-independent');
      if (dslFailure) return dslFailure;
    }

    const afterRarity = resolveJokerWindow(proposedState, 'other-joker-resolved');
    if (!afterRarity.ok) return afterRarity;
    if (
      !afterRarity.operations.some(
        ({ operation }) => operation.type === 'joker-after-rarity',
      )
    ) {
      continue;
    }
    const definition = state.content.items.find(
      (candidate) =>
        candidate.kind === 'joker' && candidate.contentId === ownedJoker.contentId,
    );
    if (!definition || definition.kind !== 'joker') {
      return {
        ok: false,
        code: 'pool-empty',
        message: `奇牌定义缺失：${ownedJoker.contentId}`,
      };
    }
    const otherEventContext: JokerEventContextV5 = {
      eventFacts: {
        kind: 'other-joker',
        instanceId: ownedJoker.instanceId,
        rarity: definition.rarity,
        debuffed: ownedJoker.debuffed,
        position,
      },
      eventCardIdentities: {},
    };
    operationCount += afterRarity.operationCount;
    for (const source of afterRarity.operations) {
      const operation = source.operation;
      if (operation.type !== 'joker-after-rarity') continue;
      operationCount += 1;
      const predicate = evaluateJokerPredicateV3(operation.predicate, {
        state: proposedState,
        facts,
        sourceInstanceId: source.sourceInstanceId as JokerInstanceId,
        window: 'other-joker-resolved',
        rngState,
        originalStencilCount,
        eventContext: otherEventContext,
      });
      if (!predicate.ok) return predicate;
      rngState = predicate.rngState;
      modifierRolls.push(
        ...predicate.rolls.map(({ value }) => ({
          sourceId: source.effectId,
          value,
        })),
      );
      if (!predicate.matched) continue;
      multiplier = multiplyScore(multiplier, operation.factor);
      trace.push(
        `joker-after-rarity:${ownedJoker.instanceId}:${source.sourceInstanceId}:${operation.factor}`,
      );
    }
  }

  const appliedAfterHandState = applyResolvedRunOperationsV2(
    { ...proposedState, rngState },
    'after-hand',
    afterHandEffects.operations,
    undefined,
    playedEventContext,
  );
  if (!appliedAfterHandState.ok) return appliedAfterHandState;
  proposedState = appliedAfterHandState.state;
  rngState = appliedAfterHandState.state.rngState;
  for (const source of afterHandEffects.operations) {
    const operation = source.operation;
    if (operation.type === 'multiply-final-score') {
      finalScoreFactor = multiplyScore(finalScoreFactor, operation.factor);
      trace.push(`after:${source.effectId}:scorex${operation.factor}`);
    }
    if (operation.type === 'joker-create-content') {
      operationCount += 1;
      const createFailure = applyJokerCreateContent(source, 'after-hand');
      if (createFailure) return createFailure;
    }
  }
  for (const source of globalAfterHandEffects.operations) {
    if (source.operation.type === 'multiply-final-score') {
      finalScoreFactor = multiplyScore(finalScoreFactor, source.operation.factor);
      trace.push(`global:${source.effectId}:scorex${source.operation.factor}`);
    }
    if (source.operation.type === 'add-chips') {
      cardChips += source.operation.amount;
      trace.push(`global:${source.effectId}:chips+${source.operation.amount}`);
    }
    if (source.operation.type === 'add-multiplier') {
      multiplier += source.operation.amount;
      trace.push(`global:${source.effectId}:mult+${source.operation.amount}`);
    }
    if (source.operation.type === 'multiply-multiplier') {
      multiplier = multiplyScore(multiplier, source.operation.factor);
      trace.push(`global:${source.effectId}:multx${source.operation.factor}`);
    }
  }

  const commandEntryCloneCard =
    facts.playedCardIds.length === 1
      ? state.deck.cards.find(({ id }) => id === facts.playedCardIds[0])
      : undefined;
  const commandEntryCloneModifier =
    commandEntryCloneCard && isRunStateV3(state)
      ? state.modifiersV3.playingCards.find(
          ({ cardId }) => cardId === commandEntryCloneCard.id,
        )
      : undefined;
  for (const [cloneIndex, source] of deferredCloneSources.entries()) {
    if (!commandEntryCloneCard || !proposedState.round) continue;
    const cloneId = stableId<'playing-card'>(
      `playing:joker-clone:${state.runId}:${state.checkpointId + 1}:${source.sourceInstanceId}:${source.effectId}:${cloneIndex}`,
    );
    const clonedCard: RunPlayingCard = {
      ...commandEntryCloneCard,
      id: cloneId,
      enhancementId:
        commandEntryCloneModifier?.enhancementId ?? commandEntryCloneCard.enhancementId,
      sealId: commandEntryCloneModifier?.sealId ?? commandEntryCloneCard.sealId,
      editionId: commandEntryCloneModifier?.editionId ?? commandEntryCloneCard.editionId,
    };
    proposedState = {
      ...proposedState,
      deck: { cards: [...proposedState.deck.cards, clonedCard] },
      round: {
        ...proposedState.round,
        handIds: [...proposedState.round.handIds, cloneId],
      },
      ...(isRunStateV3(proposedState)
        ? {
            modifiersV3: {
              ...proposedState.modifiersV3,
              playingCards: [
                ...proposedState.modifiersV3.playingCards,
                {
                  cardId: cloneId,
                  enhancementId: clonedCard.enhancementId,
                  sealId: clonedCard.sealId,
                  editionId: clonedCard.editionId,
                  debuffed: false,
                },
              ],
            },
          }
        : {}),
    };
    trace.push(`playing-card-cloned:${commandEntryCloneCard.id}:${cloneId}`);
  }
  const bossAppliedRuleIds =
    state.round &&
    (state.round.blind.kind === 'boss' || state.round.blind.kind === 'finisher') &&
    !bossEffectsDisabledForRun(state)
      ? [
          ...new Set(
            beforeHand.operations.flatMap((source) => {
              if (!source.sourceInstanceId.startsWith('blind:')) return [];
              const operation = source.operation;
              if (
                operation.type === 'debuff-suit' &&
                !cards.some((card) => card.suit === operation.suit)
              ) {
                return [];
              }
              if (
                operation.type === 'debuff-card' &&
                !facts.playedCardIds.includes(operation.cardId as CardId)
              ) {
                return [];
              }
              if (
                operation.type === 'transform-card-field' &&
                operation.field === 'debuff'
              ) {
                const applies = cards.some((card) => {
                  if (
                    operation.value === 'clubs' ||
                    operation.value === 'diamonds' ||
                    operation.value === 'hearts' ||
                    operation.value === 'spades'
                  ) {
                    return card.suit === operation.value;
                  }
                  if (operation.value === 'face-card') {
                    return (
                      card.rank === 'jack' ||
                      card.rank === 'queen' ||
                      card.rank === 'king'
                    );
                  }
                  return (
                    operation.value === true &&
                    operation.selection === 'played-this-ante' &&
                    state.history.playedCardIdsThisAnte.includes(card.id)
                  );
                });
                if (!applies) return [];
              }
              if (
                operation.type === 'catalog-blind-rule' &&
                (operation.key === 'hand-type-no-repeat' ||
                  operation.key === 'first-hand-type-only')
              ) {
                return [];
              }
              return [source.effectId];
            }),
          ),
        ]
      : [];
  if (bossAppliedRuleIds.length > 0 && state.round) {
    const bossEventContext: JokerEventContextV5 = {
      eventFacts: {
        kind: 'boss-ability-triggered',
        bossId: state.round.blind.definitionId,
        ruleIds: bossAppliedRuleIds,
        affectedCardIds: [...debuffed].filter((cardId) =>
          facts.playedCardIds.includes(cardId),
        ),
      },
      eventCardIdentities: Object.fromEntries(
        facts.playedCardIds.flatMap((cardId) => {
          const identity = facts.effectiveCards[cardId];
          return identity ? [[cardId, identity] as const] : [];
        }),
      ),
    };
    const bossFailure = emitStateOnlyJokerWindow(
      'boss-ability-triggered',
      bossEventContext,
    );
    if (bossFailure) return bossFailure;
    trace.push(`boss-ability:${bossAppliedRuleIds.join(',')}`);
  }
  if (operationCount > MAX_EFFECT_OPERATIONS) {
    return {
      ok: false,
      code: 'effect-budget',
      message: '效果操作超过安全上限，已拒绝本次结算',
    };
  }
  let totalChips = baseChips + cardChips;
  for (const operation of setupOperations(state)) {
    if (operation.type !== 'score-rule') continue;
    if (operation.key === 'average-chips-mult') {
      const average = (totalChips + multiplier) / 2;
      totalChips = average;
      multiplier = average;
      trace.push('setup:average-chips-mult');
    }
    if (operation.key === 'money-chip-cap') {
      totalChips = Math.min(totalChips, Math.max(0, state.economy.money));
      trace.push(`setup:money-chip-cap:${totalChips}`);
    }
  }
  const score = Math.floor(
    multiplyScore(multiplyScore(totalChips, multiplier), finalScoreFactor),
  );
  trace.push('window:after-hand', `score:${score}`);
  return {
    ok: true,
    breakdown: {
      handType: evaluation.type,
      handName: evaluation.name,
      handLevel: evaluation.level,
      baseChips,
      cardChips,
      multiplier,
      score,
      playedCardIds: cards.map((card) => card.id),
      scoringCardIds: facts.scoringCardIds.filter((cardId) => cardMap.has(cardId)),
      trace,
    },
    rngState,
    moneyDelta,
    destroyedCardIds: [...destroyedCardIds],
    modifierRolls,
    proposedState: { ...proposedState, rngState },
  };
}
