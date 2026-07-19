import type { JokerPredicate, JokerValue } from '../../content/schema/catalog';
import type { CardId, JokerInstanceId } from '../model/ids';
import {
  isRunStateV3,
  isRunStateV4,
  type PlayingCardModifierStateV3,
} from '../model/runV3';
import type { EffectWindow, RunStateV2 } from '../model/runV2';
import type { HandFactsV3 } from '../poker/handFactsV3';
import { nextInteger, type RandomState } from '../rng/random';

export interface JokerDslRollV3 {
  readonly minimum: number;
  readonly maximum: number;
  readonly value: number;
}

export interface JokerDslContextV3 {
  readonly state: RunStateV2;
  readonly facts: HandFactsV3;
  readonly sourceInstanceId: JokerInstanceId;
  readonly window: EffectWindow;
  readonly cardId?: CardId;
  readonly rngState: RandomState;
  readonly originalStencilCount: number;
}

export type JokerDslFailureCode =
  'joker-context' | 'joker-state-key' | 'joker-value-range';

type JokerDslFailure = {
  readonly ok: false;
  readonly code: JokerDslFailureCode;
  readonly message: string;
};

export type JokerPredicateResolutionV3 =
  | {
      readonly ok: true;
      readonly matched: boolean;
      readonly rngState: RandomState;
      readonly rolls: readonly JokerDslRollV3[];
    }
  | JokerDslFailure;

export type JokerValueResolutionV3 =
  | {
      readonly ok: true;
      readonly value: number;
      readonly rngState: RandomState;
      readonly rolls: readonly JokerDslRollV3[];
    }
  | JokerDslFailure;

function cardIdentity(context: JokerDslContextV3) {
  return context.cardId ? context.facts.effectiveCards[context.cardId] : undefined;
}

function handContains(
  fact: Extract<JokerPredicate, { kind: 'hand-contains' }>['fact'],
  facts: HandFactsV3,
): boolean {
  switch (fact) {
    case 'pair':
      return facts.contains.pair;
    case 'three-of-a-kind':
      return facts.contains.threeOfAKind;
    case 'two-pair':
      return facts.contains.twoPair;
    case 'straight':
      return facts.contains.straight;
    case 'flush':
      return facts.contains.flush;
  }
}

function sourceStateValue(
  context: JokerDslContextV3,
  key: string,
): number | JokerDslFailure {
  if (!isRunStateV4(context.state)) {
    return {
      ok: false,
      code: 'joker-state-key',
      message: '当前牌局不支持奇牌能力状态',
    };
  }
  const modifier = context.state.modifiersV3.jokers.find(
    ({ instanceId }) => instanceId === context.sourceInstanceId,
  );
  const candidate = modifier?.abilityState[key];
  return typeof candidate === 'number' && Number.isFinite(candidate)
    ? candidate
    : {
        ok: false,
        code: 'joker-state-key',
        message: `奇牌能力状态键无效：${key}`,
      };
}

export function evaluateJokerPredicateV3(
  predicate: JokerPredicate,
  context: JokerDslContextV3,
): JokerPredicateResolutionV3 {
  if (predicate.kind === 'all' || predicate.kind === 'any') {
    let rngState = context.rngState;
    const rolls: JokerDslRollV3[] = [];
    for (const child of predicate.predicates) {
      const resolved = evaluateJokerPredicateV3(child, { ...context, rngState });
      if (!resolved.ok) return resolved;
      rngState = resolved.rngState;
      rolls.push(...resolved.rolls);
      if (predicate.kind === 'all' && !resolved.matched) {
        return { ok: true, matched: false, rngState, rolls };
      }
      if (predicate.kind === 'any' && resolved.matched) {
        return { ok: true, matched: true, rngState, rolls };
      }
    }
    return {
      ok: true,
      matched: predicate.kind === 'all',
      rngState,
      rolls,
    };
  }
  let matched: boolean;
  switch (predicate.kind) {
    case 'always':
      matched = true;
      break;
    case 'hand-contains':
      matched = handContains(predicate.fact, context.facts);
      break;
    case 'played-card-count-at-most':
      matched = context.facts.playedCardIds.length <= predicate.count;
      break;
    case 'scored-card-suit':
      matched = cardIdentity(context)?.suits.includes(predicate.suit) ?? false;
      break;
    case 'scored-card-rank-in':
      matched =
        cardIdentity(context)?.rank !== null &&
        predicate.ranks.includes(cardIdentity(context)!.rank!) === true;
      break;
    case 'scored-card-face':
      matched = cardIdentity(context)?.face === true;
      break;
    case 'scoring-cards-face': {
      const anyFace = context.facts.scoringCardIds.some((cardId) => {
        const identity = context.facts.effectiveCards[cardId];
        return identity?.debuffed === false && identity.face;
      });
      matched = predicate.comparison === 'any' ? anyFace : !anyFace;
      break;
    }
    case 'held-lowest-rank':
      matched = context.cardId === context.facts.selectedHeldCardId;
      break;
    case 'all-held-suits':
      matched = context.facts.heldCardIds.every((cardId) => {
        const identity = context.facts.effectiveCards[cardId];
        return (
          identity !== undefined &&
          !identity.stone &&
          identity.suits.some((suit) => predicate.suits.includes(suit))
        );
      });
      break;
    case 'remaining-discards': {
      const remaining = context.state.round?.discardsRemaining ?? 0;
      matched = predicate.comparison === 'zero' ? remaining === 0 : remaining > 0;
      break;
    }
    case 'final-hand':
      matched = context.state.round?.handsRemaining === 1;
      break;
    case 'no-discards-used':
      matched = context.state.round?.discardsUsed === 0;
      break;
    case 'run-hand-modulo':
      matched =
        (context.state.history.playedHandTypes.length + 1) % predicate.divisor ===
        predicate.equals;
      break;
    case 'source-state-comparison': {
      const candidate = sourceStateValue(context, predicate.key);
      if (typeof candidate !== 'number') return candidate;
      if (predicate.comparison === 'equal') matched = candidate === predicate.value;
      else if (predicate.comparison === 'at-most') matched = candidate <= predicate.value;
      else matched = candidate >= predicate.value;
      break;
    }
    case 'chance': {
      const draw = nextInteger(context.rngState, predicate.denominator);
      return {
        ok: true,
        matched: draw.value < predicate.numerator,
        rngState: draw.state,
        rolls: [{ minimum: 0, maximum: predicate.denominator - 1, value: draw.value }],
      };
    }
  }
  return { ok: true, matched, rngState: context.rngState, rolls: [] };
}

function fullDeckModifierCount(context: JokerDslContextV3, modifierId: string): number {
  const mirrors = new Map<CardId, PlayingCardModifierStateV3>();
  if (isRunStateV3(context.state)) {
    for (const modifier of context.state.modifiersV3.playingCards) {
      mirrors.set(modifier.cardId, modifier);
    }
  }
  return context.state.deck.cards.filter((card) => {
    const mirror = mirrors.get(card.id);
    return [
      mirror?.enhancementId ?? card.enhancementId,
      mirror?.sealId ?? card.sealId,
      mirror?.editionId ?? card.editionId,
    ].includes(modifierId);
  }).length;
}

export function evaluateJokerValueV3(
  value: JokerValue,
  context: JokerDslContextV3,
): JokerValueResolutionV3 {
  let resolved: number;
  switch (value.kind) {
    case 'fixed':
      resolved = value.value;
      break;
    case 'remaining-discards':
      resolved = (context.state.round?.discardsRemaining ?? 0) * value.scale;
      break;
    case 'empty-joker-slots-with-stencils': {
      const used = context.state.inventory.jokers.reduce(
        (total, joker) => total + joker.slotContribution,
        0,
      );
      resolved = Math.max(
        1,
        context.state.rules.jokerSlots - used + context.originalStencilCount,
      );
      break;
    }
    case 'full-deck-modifier-count':
      resolved =
        value.base + fullDeckModifierCount(context, value.modifierId) * value.scale;
      break;
    case 'owned-joker-count':
      resolved = context.state.inventory.jokers.length * value.scale;
      break;
    case 'matching-hand-history':
      resolved =
        context.state.history.playedHandTypes.filter(
          (handType) => handType === context.facts.displayedHand,
        ).length + (value.includeCurrent ? 1 : 0);
      break;
    case 'selected-held-rank': {
      const selected = context.facts.selectedHeldCardId
        ? context.facts.effectiveCards[context.facts.selectedHeldCardId]
        : undefined;
      resolved = selected?.debuffed ? 0 : (selected?.rankValue ?? 0) * value.scale;
      break;
    }
    case 'source-state': {
      const candidate = sourceStateValue(context, value.key);
      if (typeof candidate !== 'number') return candidate;
      resolved = candidate;
      break;
    }
    case 'uniform-integer': {
      const width = value.maximum - value.minimum + 1;
      if (!Number.isSafeInteger(width) || width < 1) {
        return {
          ok: false,
          code: 'joker-value-range',
          message: '奇牌随机值范围无效',
        };
      }
      const draw = nextInteger(context.rngState, width);
      const result = value.minimum + draw.value;
      return {
        ok: true,
        value: result,
        rngState: draw.state,
        rolls: [{ minimum: value.minimum, maximum: value.maximum, value: result }],
      };
    }
  }
  return {
    ok: true,
    value: resolved,
    rngState: context.rngState,
    rolls: [],
  };
}
