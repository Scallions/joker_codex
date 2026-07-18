import { getCardChipValue, evaluatePokerHand } from '../poker/evaluate';
import type { CardId } from '../model/ids';
import type {
  EffectWindow,
  RunPlayingCard,
  RunStateV2,
  ScoreBreakdownV2,
} from '../model/runV2';
import { multiplyScore } from '../score/score';
import {
  resolveEffectQueue,
  type EffectOperation,
  type EffectQueueFailureCode,
  type ResolvedEffectOperation,
} from './registry';

const MAX_EFFECT_OPERATIONS = 10_000;

export type ScoreResolution =
  | { readonly ok: true; readonly breakdown: ScoreBreakdownV2 }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode;
      readonly message: string;
    };

type ScoreResolutionFailure = Extract<ScoreResolution, { readonly ok: false }>;

function compatibleCard(card: RunPlayingCard) {
  return {
    id: card.id,
    suit: card.suit,
    rank: card.rank,
    enhancement:
      card.enhancementId?.endsWith(':wild') === true
        ? ('wild' as const)
        : card.enhancementId?.endsWith(':stone') === true
          ? ('stone' as const)
          : ('none' as const),
  };
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
  return resolveEffectQueue(
    [
      ...(state.round
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
  cards: readonly RunPlayingCard[],
  operations: readonly EffectOperation[],
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
  const resolved = resolveBeforeHandWindow(state);
  if (!resolved.ok) return resolved.message;
  for (const { operation } of resolved.operations) {
    if (operation.type === 'require-play-count' && cards.length !== operation.count) {
      return `${state.round?.blind.name ?? '当前班主'}要求每次恰好打出${operation.count}张牌`;
    }
  }
  return null;
}

export function resolveHandScoreV2(
  state: RunStateV2,
  cards: readonly RunPlayingCard[],
): ScoreResolution {
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

  const compatibleCards = cards.map(compatibleCard);
  const evaluation = evaluatePokerHand(compatibleCards, {
    straightSize: state.rules.straightSize,
    flushSize: state.rules.flushSize,
    handLevels: state.rules.handLevels,
  });
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const scoringIds = new Set(evaluation.scoringCardIds);
  const scoringCards = cards.filter((card) => scoringIds.has(card.id));
  const beforeHandOperations = beforeHand.operations.map((entry) => entry.operation);
  const debuffed = debuffedCardIds(cards, beforeHandOperations);
  let operationCount =
    beforeHand.operationCount +
    scoredCardEffects.operationCount +
    heldCardEffects.operationCount +
    independentEffects.operationCount +
    afterHandEffects.operationCount +
    globalAfterHandEffects.operationCount;
  let cardChips = 0;
  let multiplier = evaluation.baseMultiplier;
  let finalScoreFactor = 1;
  const trace: string[] = [
    `window:before-hand`,
    `hand:${evaluation.type}`,
    `base:${evaluation.baseChips}x${multiplier}`,
    `window:scored-card`,
  ];
  for (const source of beforeHand.operations) {
    const operation = source.operation;
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
    const value = getCardChipValue(compatibleCard(card)) + card.bonusChips;
    cardChips += value;
    trace.push(`card:${card.id}:chips+${value}`);
    for (const source of scoredCardEffects.operations) {
      const operation = source.operation;
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
      if (
        operation.type !== 'retrigger-card' ||
        (operation.onlyFirst && cardIndex !== 0)
      ) {
        continue;
      }
      operationCount += operation.count;
      if (operationCount > MAX_EFFECT_OPERATIONS) {
        return {
          ok: false,
          code: 'effect-budget',
          message: '效果操作超过安全上限，已拒绝本次结算',
        };
      }
      cardChips += value * operation.count;
      for (let repeat = 0; repeat < operation.count; repeat += 1) {
        trace.push(`retrigger:${source.effectId}:${card.id}:chips+${value}`);
      }
    }
  }

  trace.push('window:held-card');
  const playedIds = new Set(cards.map((card) => card.id));
  const stateCardMap = new Map(state.deck.cards.map((card) => [card.id, card]));
  const heldCards = (state.round?.handIds ?? [])
    .filter((cardId) => !playedIds.has(cardId))
    .map((cardId) => stateCardMap.get(cardId))
    .filter((card): card is RunPlayingCard => card !== undefined);
  for (const card of heldCards) {
    if (debuffed.has(card.id)) continue;
    for (const source of heldCardEffects.operations) {
      const operation = source.operation;
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
  for (const source of independentEffects.operations) {
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
  }

  for (const source of afterHandEffects.operations) {
    if (source.operation.type === 'multiply-final-score') {
      finalScoreFactor = multiplyScore(finalScoreFactor, source.operation.factor);
      trace.push(`after:${source.effectId}:scorex${source.operation.factor}`);
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
  if (operationCount > MAX_EFFECT_OPERATIONS) {
    return {
      ok: false,
      code: 'effect-budget',
      message: '效果操作超过安全上限，已拒绝本次结算',
    };
  }
  const score = Math.floor(
    multiplyScore(
      multiplyScore(evaluation.baseChips + cardChips, multiplier),
      finalScoreFactor,
    ),
  );
  trace.push('window:after-hand', `score:${score}`);
  return {
    ok: true,
    breakdown: {
      handType: evaluation.type,
      handName: evaluation.name,
      handLevel: evaluation.level,
      baseChips: evaluation.baseChips,
      cardChips,
      multiplier,
      score,
      playedCardIds: cards.map((card) => card.id),
      scoringCardIds: evaluation.scoringCardIds.filter((cardId) => cardMap.has(cardId)),
      trace,
    },
  };
}
