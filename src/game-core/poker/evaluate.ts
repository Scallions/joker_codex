import { RANKS, SUITS, type PlayingCard, type Rank, type Suit } from '../model/cards';
import type { CardId } from '../model/ids';

export const POKER_HAND_TYPES = [
  'flush-five',
  'flush-house',
  'five-of-a-kind',
  'straight-flush',
  'four-of-a-kind',
  'full-house',
  'flush',
  'straight',
  'three-of-a-kind',
  'two-pair',
  'pair',
  'high-card',
] as const;

export type PokerHandType = (typeof POKER_HAND_TYPES)[number];

export interface PokerHandDefinition {
  readonly type: PokerHandType;
  readonly name: string;
  readonly baseChips: number;
  readonly baseMultiplier: number;
  readonly chipsPerLevel: number;
  readonly multiplierPerLevel: number;
}

export interface PokerHandEvaluation extends PokerHandDefinition {
  readonly level: number;
  readonly scoringCardIds: readonly CardId[];
}

export interface PokerRuleContext {
  readonly straightSize: number;
  readonly flushSize: number;
  readonly straightMaximumStep?: 1 | 2;
  readonly rankOverrides?: Readonly<Partial<Record<CardId, Rank>>>;
  readonly suitOverrides?: Readonly<Partial<Record<CardId, Suit>>>;
  readonly wildSuitCardIds?: readonly CardId[];
  readonly ranklessCardIds?: readonly CardId[];
  readonly blockedHandTypes?: readonly PokerHandType[];
  readonly handLevels?: Readonly<Partial<Record<PokerHandType, number>>>;
  readonly baseValueOverrides?: Readonly<
    Partial<
      Record<PokerHandType, { readonly chips?: number; readonly multiplier?: number }>
    >
  >;
}

export const DEFAULT_POKER_RULE_CONTEXT: PokerRuleContext = {
  straightSize: 5,
  flushSize: 5,
};

export const DEFAULT_HAND_LEVELS: Readonly<Record<PokerHandType, number>> = {
  'high-card': 1,
  pair: 1,
  'two-pair': 1,
  'three-of-a-kind': 1,
  straight: 1,
  flush: 1,
  'full-house': 1,
  'four-of-a-kind': 1,
  'straight-flush': 1,
  'five-of-a-kind': 1,
  'flush-house': 1,
  'flush-five': 1,
};

export const POKER_HANDS: Record<PokerHandType, PokerHandDefinition> = {
  'high-card': {
    type: 'high-card',
    name: '高牌',
    baseChips: 5,
    baseMultiplier: 1,
    chipsPerLevel: 10,
    multiplierPerLevel: 1,
  },
  pair: {
    type: 'pair',
    name: '对子',
    baseChips: 10,
    baseMultiplier: 2,
    chipsPerLevel: 15,
    multiplierPerLevel: 1,
  },
  'two-pair': {
    type: 'two-pair',
    name: '两对',
    baseChips: 20,
    baseMultiplier: 2,
    chipsPerLevel: 20,
    multiplierPerLevel: 1,
  },
  'three-of-a-kind': {
    type: 'three-of-a-kind',
    name: '三条',
    baseChips: 30,
    baseMultiplier: 3,
    chipsPerLevel: 20,
    multiplierPerLevel: 2,
  },
  straight: {
    type: 'straight',
    name: '顺子',
    baseChips: 30,
    baseMultiplier: 4,
    chipsPerLevel: 30,
    multiplierPerLevel: 3,
  },
  flush: {
    type: 'flush',
    name: '同花',
    baseChips: 35,
    baseMultiplier: 4,
    chipsPerLevel: 15,
    multiplierPerLevel: 2,
  },
  'full-house': {
    type: 'full-house',
    name: '葫芦',
    baseChips: 40,
    baseMultiplier: 4,
    chipsPerLevel: 25,
    multiplierPerLevel: 2,
  },
  'four-of-a-kind': {
    type: 'four-of-a-kind',
    name: '四条',
    baseChips: 60,
    baseMultiplier: 7,
    chipsPerLevel: 30,
    multiplierPerLevel: 3,
  },
  'straight-flush': {
    type: 'straight-flush',
    name: '同花顺',
    baseChips: 100,
    baseMultiplier: 8,
    chipsPerLevel: 40,
    multiplierPerLevel: 4,
  },
  'five-of-a-kind': {
    type: 'five-of-a-kind',
    name: '五条',
    baseChips: 120,
    baseMultiplier: 12,
    chipsPerLevel: 35,
    multiplierPerLevel: 3,
  },
  'flush-house': {
    type: 'flush-house',
    name: '同花葫芦',
    baseChips: 140,
    baseMultiplier: 14,
    chipsPerLevel: 40,
    multiplierPerLevel: 4,
  },
  'flush-five': {
    type: 'flush-five',
    name: '同花五条',
    baseChips: 160,
    baseMultiplier: 16,
    chipsPerLevel: 50,
    multiplierPerLevel: 3,
  },
};

const HAND_STRENGTH: readonly PokerHandType[] = POKER_HAND_TYPES;

const RANK_VALUE: Record<Rank, number> = Object.fromEntries(
  RANKS.map((rank, index) => [rank, index + 2]),
) as Record<Rank, number>;

interface EffectiveCard {
  readonly original: PlayingCard;
  readonly rank: Rank;
  readonly suit: Suit;
  readonly wildSuit: boolean;
}

interface Candidate {
  readonly type: PokerHandType;
  readonly cards: readonly EffectiveCard[];
}

function combinations<T>(values: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (values.length < size) return [];
  const output: T[][] = [];
  for (let index = 0; index <= values.length - size; index += 1) {
    const head = values[index]!;
    for (const tail of combinations(values.slice(index + 1), size - 1)) {
      output.push([head, ...tail]);
    }
  }
  return output;
}

function cardKey(cards: readonly EffectiveCard[]): string {
  return cards
    .map((card) => card.original.id)
    .sort()
    .join('|');
}

function straightHigh(
  cards: readonly EffectiveCard[],
  maximumStep: 1 | 2 = 1,
): number | null {
  const values = [...new Set(cards.map((card) => RANK_VALUE[card.rank]))].sort(
    (left, right) => left - right,
  );
  if (values.length !== cards.length) return null;
  if (values.length === 5 && values.join(',') === '2,3,4,5,14') return 5;
  return values.every(
    (value, index) =>
      index === 0 ||
      (value > values[index - 1]! && value <= values[index - 1]! + maximumStep),
  )
    ? values.at(-1)!
    : null;
}

function flushSuit(cards: readonly EffectiveCard[]): Suit | null {
  return (
    SUITS.find((suit) => cards.every((card) => card.wildSuit || card.suit === suit)) ??
    null
  );
}

function bestSubset(
  cards: readonly EffectiveCard[],
  size: number,
  predicate: (candidate: readonly EffectiveCard[]) => number | null,
): readonly EffectiveCard[] | null {
  const candidates = combinations(cards, size)
    .map((candidate) => ({ candidate, quality: predicate(candidate) }))
    .filter(
      (entry): entry is { candidate: EffectiveCard[]; quality: number } =>
        entry.quality !== null,
    )
    .sort(
      (left, right) =>
        right.quality - left.quality ||
        cardKey(left.candidate).localeCompare(cardKey(right.candidate)),
    );
  return candidates[0]?.candidate ?? null;
}

function effectiveCards(
  cards: readonly PlayingCard[],
  context: PokerRuleContext,
): {
  readonly rankCards: readonly EffectiveCard[];
  readonly stoneCards: readonly PlayingCard[];
} {
  const rankless = new Set(context.ranklessCardIds ?? []);
  const wild = new Set(context.wildSuitCardIds ?? []);
  const stoneCards = cards.filter(
    (card) => card.enhancement === 'stone' || rankless.has(card.id),
  );
  const rankCards = cards
    .filter((card) => !stoneCards.includes(card))
    .map((card) => ({
      original: card,
      rank: context.rankOverrides?.[card.id] ?? card.rank,
      suit: context.suitOverrides?.[card.id] ?? card.suit,
      wildSuit: card.enhancement === 'wild' || wild.has(card.id),
    }));
  return { rankCards, stoneCards };
}

function rankGroups(cards: readonly EffectiveCard[]): EffectiveCard[][] {
  const groups = new Map<Rank, EffectiveCard[]>();
  for (const card of cards) {
    groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  }
  return [...groups.values()].sort(
    (left, right) =>
      right.length - left.length ||
      RANK_VALUE[right[0]!.rank] - RANK_VALUE[left[0]!.rank] ||
      cardKey(left).localeCompare(cardKey(right)),
  );
}

function detectCandidates(
  rankCards: readonly EffectiveCard[],
  context: PokerRuleContext,
): Candidate[] {
  const groups = rankGroups(rankCards);
  const counts = groups.map((group) => group.length);
  const straight = bestSubset(rankCards, context.straightSize, (candidate) =>
    straightHigh(candidate, context.straightMaximumStep),
  );
  const flush = bestSubset(rankCards, context.flushSize, (candidate) =>
    flushSuit(candidate)
      ? Math.max(...candidate.map((card) => RANK_VALUE[card.rank]))
      : null,
  );
  const straightFlushSize = Math.max(context.straightSize, context.flushSize);
  const sameSubsetStraightFlush = bestSubset(
    rankCards,
    straightFlushSize,
    (candidate) => {
      const straightCandidate = bestSubset(candidate, context.straightSize, (subset) =>
        straightHigh(subset, context.straightMaximumStep),
      );
      const flushCandidate = bestSubset(candidate, context.flushSize, (subset) =>
        flushSuit(subset) ? 1 : null,
      );
      if (!straightCandidate || !flushCandidate || !flushSuit(candidate)) return null;
      return straightHigh(straightCandidate);
    },
  );
  const mixedFourCardStraightFlush =
    context.straightSize === 4 && context.flushSize === 4 && straight && flush
      ? rankCards.filter((card) => straight.includes(card) || flush.includes(card))
      : null;
  const straightFlush = sameSubsetStraightFlush ?? mixedFourCardStraightFlush;
  const allFlush = flushSuit(rankCards) !== null;
  const candidates: Candidate[] = [];
  if (counts[0] === 5 && allFlush)
    candidates.push({ type: 'flush-five', cards: rankCards });
  if (counts[0] === 3 && counts[1] === 2 && allFlush) {
    candidates.push({ type: 'flush-house', cards: rankCards });
  }
  if (counts[0] === 5) candidates.push({ type: 'five-of-a-kind', cards: groups[0]! });
  if (straightFlush) candidates.push({ type: 'straight-flush', cards: straightFlush });
  if ((counts[0] ?? 0) >= 4) {
    candidates.push({ type: 'four-of-a-kind', cards: groups[0]!.slice(0, 4) });
  }
  if ((counts[0] ?? 0) >= 3 && (counts[1] ?? 0) >= 2) {
    candidates.push({
      type: 'full-house',
      cards: [...groups[0]!.slice(0, 3), ...groups[1]!.slice(0, 2)],
    });
  }
  if (flush) candidates.push({ type: 'flush', cards: flush });
  if (straight) candidates.push({ type: 'straight', cards: straight });
  if ((counts[0] ?? 0) >= 3) {
    candidates.push({ type: 'three-of-a-kind', cards: groups[0]!.slice(0, 3) });
  }
  if ((counts[0] ?? 0) >= 2 && (counts[1] ?? 0) >= 2) {
    candidates.push({
      type: 'two-pair',
      cards: [...groups[0]!.slice(0, 2), ...groups[1]!.slice(0, 2)],
    });
  }
  if ((counts[0] ?? 0) >= 2) {
    candidates.push({ type: 'pair', cards: groups[0]!.slice(0, 2) });
  }
  const highest = [...rankCards].sort(
    (left, right) =>
      RANK_VALUE[right.rank] - RANK_VALUE[left.rank] ||
      left.original.id.localeCompare(right.original.id),
  )[0];
  candidates.push({ type: 'high-card', cards: highest ? [highest] : [] });
  return candidates.sort(
    (left, right) => HAND_STRENGTH.indexOf(left.type) - HAND_STRENGTH.indexOf(right.type),
  );
}

function leveledDefinition(
  type: PokerHandType,
  context: PokerRuleContext,
): PokerHandDefinition & { readonly level: number } {
  const definition = POKER_HANDS[type];
  const requestedLevel = context.handLevels?.[type] ?? 1;
  const level =
    Number.isSafeInteger(requestedLevel) && requestedLevel > 0 ? requestedLevel : 1;
  const override = context.baseValueOverrides?.[type];
  const baseChips = override?.chips ?? definition.baseChips;
  const baseMultiplier = override?.multiplier ?? definition.baseMultiplier;
  return {
    ...definition,
    level,
    baseChips: baseChips + definition.chipsPerLevel * (level - 1),
    baseMultiplier: baseMultiplier + definition.multiplierPerLevel * (level - 1),
  };
}

export function detectPokerCandidates(
  cards: readonly PlayingCard[],
  context: PokerRuleContext = DEFAULT_POKER_RULE_CONTEXT,
): readonly PokerHandEvaluation[] {
  if (context.straightSize < 2 || context.flushSize < 2) {
    throw new RangeError('顺子与同花所需牌数至少为二');
  }
  const { rankCards, stoneCards } = effectiveCards(cards, context);
  const stoneIds = stoneCards.map((card) => card.id);
  return detectCandidates(rankCards, context).map((candidate) => ({
    ...leveledDefinition(candidate.type, context),
    scoringCardIds: [...candidate.cards.map((card) => card.original.id), ...stoneIds],
  }));
}

export function evaluatePokerHand(
  cards: readonly PlayingCard[],
  context: PokerRuleContext = DEFAULT_POKER_RULE_CONTEXT,
): PokerHandEvaluation {
  const blocked = new Set(context.blockedHandTypes ?? []);
  const candidate = detectPokerCandidates(cards, context).find(
    (evaluation) => !blocked.has(evaluation.type),
  );
  if (!candidate) throw new Error('当前规则禁止所有可识别牌型');
  return candidate;
}

export function getCardChipValue(card: PlayingCard): number {
  if (card.enhancement === 'stone') return 50;
  if (card.rank === 'ace') return 11;
  if (card.rank === 'jack' || card.rank === 'queen' || card.rank === 'king') return 10;
  return Number(card.rank);
}
