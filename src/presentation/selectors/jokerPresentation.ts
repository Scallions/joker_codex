import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import type {
  JokerAbilityStateValue,
  JokerCatalogRow,
  JokerEnsemble,
  JokerRank,
  JokerRarity,
  JokerSuit,
  JokerValue,
} from '../../content/schema/catalog';
import { saleValue } from '../../game-core/economy/pricing';
import type { OwnedJokerV2, RunStateV2 } from '../../game-core/model/runV2';
import { isAbilityStateRun } from '../../game-core/model/runV4';
import { isRunStateV5 } from '../../game-core/model/runV5';
import { projectEffectivePlayingCardV3 } from '../../game-core/poker/effectiveCardV3';
import { POKER_HANDS, type PokerHandType } from '../../game-core/poker/evaluate';

const RARITY_LABELS: Readonly<Record<JokerRarity, string>> = {
  common: '常见',
  uncommon: '少见',
  rare: '稀有',
  legendary: '传奇',
};

export interface JokerPresentation {
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly flavor: string;
  readonly rarity: JokerRarity;
  readonly rarityLabel: string;
  readonly ensemble: JokerEnsemble;
  readonly assetPath: string;
  readonly focalKey: string;
  readonly currentValue: string | null;
}

const assetsByContentId = new Map(
  PRODUCTION_CATALOG.assets.map((asset) => [asset.contentId, asset]),
);

const RANK_LABELS: Readonly<Record<JokerRank, string>> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  jack: 'J',
  queen: 'Q',
  king: 'K',
  ace: 'A',
};

const SUIT_LABELS: Readonly<Record<JokerSuit, string>> = {
  hearts: '红桃',
  diamonds: '方片',
  clubs: '梅花',
  spades: '黑桃',
};

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function handLabel(value: string): string | null {
  return value in POKER_HANDS ? POKER_HANDS[value as PokerHandType].name : null;
}

function currentValueFromAbilityState(
  state: Readonly<Record<string, JokerAbilityStateValue>>,
): string | null {
  const remainingChips = state.remainingChips;
  if (typeof remainingChips === 'number') return `当前 +${remainingChips} 筹码`;
  const storedChips = state.storedChips;
  if (typeof storedChips === 'number') return `当前 +${storedChips} 筹码`;
  const storedMult = state.storedMult;
  if (typeof storedMult === 'number') return `当前 +${storedMult} 倍率`;
  const multFactorHundredths = state.multFactorHundredths;
  if (typeof multFactorHundredths === 'number') {
    return `当前 ×${formatNumber(multFactorHundredths / 100)}`;
  }
  const roundPayout = state.roundPayout;
  if (typeof roundPayout === 'number') return `当前 ${roundPayout} 戏票`;
  const handSizeBonus = state.handSizeBonus;
  if (typeof handSizeBonus === 'number') {
    return `当前 +${handSizeBonus} 手牌上限`;
  }
  const targetHand = state.targetHand;
  if (typeof targetHand === 'string') {
    const label = handLabel(targetHand);
    if (label) return `当前：${label}`;
  }
  const targetRank = state.targetRank;
  if (typeof targetRank === 'string' && targetRank in RANK_LABELS) {
    return `当前：${RANK_LABELS[targetRank as JokerRank]}`;
  }
  const targetSuit = state.targetSuit;
  if (typeof targetSuit === 'string' && targetSuit in SUIT_LABELS) {
    return `当前：${SUIT_LABELS[targetSuit as JokerSuit]}`;
  }
  return null;
}

function targetOperation(row: JokerCatalogRow) {
  return row.effects
    .flatMap((effect) => effect.operations)
    .find((operation) => operation.type === 'joker-set-target');
}

function initialTargetValue(row: JokerCatalogRow): string | null {
  const operation = targetOperation(row);
  if (!operation) return null;
  if (operation.target === 'hand') return '当前：高牌';
  if (operation.target === 'rank') return '当前：A';
  return '当前：红桃';
}

function currentTargetValue(run: RunStateV2, row: JokerCatalogRow): string | null {
  const operation = targetOperation(row);
  if (!operation || !isRunStateV5(run)) return null;
  if (operation.target === 'rank') {
    const rank = run.jokerRuntimeV5.sharedRoundTargetRank;
    return rank ? `当前：${RANK_LABELS[rank]}` : null;
  }
  if (operation.target === 'suit') {
    const suit = run.jokerRuntimeV5.sharedRoundTargetSuit;
    return suit ? `当前：${SUIT_LABELS[suit]}` : null;
  }
  return null;
}

function fullDeckModifierCount(run: RunStateV2, modifierId: string): number {
  if (!isAbilityStateRun(run)) return 0;
  const mirrors = new Map(
    run.modifiersV3.playingCards.map((candidate) => [candidate.cardId, candidate]),
  );
  return run.deck.cards.filter((card) => {
    const mirror = mirrors.get(card.id);
    return [
      mirror?.enhancementId ?? card.enhancementId,
      mirror?.sealId ?? card.sealId,
      mirror?.editionId ?? card.editionId,
    ].includes(modifierId);
  }).length;
}

function historyEventCount(run: RunStateV2, value: JokerValue): number | null {
  if (value.kind !== 'history-event-count' || value.event !== 'tarot-used') {
    return null;
  }
  return (
    run.history.effectObservations.filter((observation) => {
      if (observation.key === 'tarot-used') return true;
      if (
        observation.key !== 'consumable-used' ||
        typeof observation.value !== 'string'
      ) {
        return false;
      }
      return run.content.items.some(
        (item) =>
          item.kind === 'consumable' &&
          item.family === 'tarot' &&
          item.contentId === observation.value,
      );
    }).length * value.scale
  );
}

function evaluatePresentableValue(run: RunStateV2, value: JokerValue): number | null {
  switch (value.kind) {
    case 'remaining-discards':
      return (run.round?.discardsRemaining ?? 0) * value.scale;
    case 'owned-joker-count':
      return run.inventory.jokers.length * value.scale;
    case 'draw-pile-count':
      return (run.round?.drawPileIds.length ?? 0) * value.scale;
    case 'full-deck-modifier-count':
      return value.base + fullDeckModifierCount(run, value.modifierId) * value.scale;
    case 'full-deck-rank-count':
      return (
        run.deck.cards.filter((card) => {
          if (value.identity === 'printed') return card.rank === value.rank;
          const identity = projectEffectivePlayingCardV3(run, card);
          return !identity.stone && identity.rank === value.rank;
        }).length * value.scale
      );
    case 'initial-deck-size-delta': {
      const initial = isRunStateV5(run)
        ? run.jokerRuntimeV5.initialDeckSize
        : run.deck.cards.length;
      return Math.max(value.floor, initial - run.deck.cards.length) * value.scale;
    }
    case 'history-event-count':
      return historyEventCount(run, value);
    case 'money':
      return Math.max(value.floor, run.economy.money) * value.scale;
    default:
      return null;
  }
}

function formatMetric(
  metric: 'chips' | 'mult' | 'mult-factor' | 'money',
  value: number,
): string {
  const formatted = formatNumber(value);
  if (metric === 'chips') return `当前 +${formatted} 筹码`;
  if (metric === 'mult') return `当前 +${formatted} 倍率`;
  if (metric === 'mult-factor') return `当前 ×${formatted}`;
  return `当前 ${formatted} 戏票`;
}

function currentValueFromOperations(
  run: RunStateV2,
  row: JokerCatalogRow,
): string | null {
  for (const effect of row.effects) {
    for (const operation of effect.operations) {
      if (operation.type !== 'joker-score') continue;
      const value = evaluatePresentableValue(run, operation.value);
      if (value !== null) return formatMetric(operation.metric, value);
    }
  }
  return null;
}

export function selectJokerPresentation(
  contentId: string,
): JokerPresentation | undefined {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) => candidate.family === 'joker' && candidate.id === contentId,
  );
  if (!row || row.family !== 'joker') return undefined;
  const asset = assetsByContentId.get(contentId);
  if (!asset || asset.source !== 'generated-raster') return undefined;
  return {
    contentId,
    name: PRODUCTION_CATALOG.localization[row.nameKey] as string,
    description: PRODUCTION_CATALOG.localization[row.descriptionKey] as string,
    flavor: PRODUCTION_CATALOG.localization[row.flavorKey] as string,
    rarity: row.rarity,
    rarityLabel: RARITY_LABELS[row.rarity],
    ensemble: row.ensemble,
    assetPath: asset.assetPath,
    focalKey: asset.focalKey,
    currentValue:
      currentValueFromAbilityState(row.initialAbilityState) ?? initialTargetValue(row),
  };
}

function dynamicCurrentValue(run: RunStateV2, joker: OwnedJokerV2): string | null {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) => candidate.family === 'joker' && candidate.id === joker.contentId,
  );
  if (!row || row.family !== 'joker') return null;

  if (isAbilityStateRun(run)) {
    const modifier = run.modifiersV3.jokers.find(
      (candidate) => candidate.instanceId === joker.instanceId,
    );
    const stored = modifier ? currentValueFromAbilityState(modifier.abilityState) : null;
    if (stored) return stored;
    const target = currentTargetValue(run, row);
    if (target) return target;
    const computed = currentValueFromOperations(run, row);
    if (computed) return computed;
  }

  const growsSaleValue = row.effects.some((effect) =>
    effect.operations.some((operation) => operation.type === 'joker-sell-value-add'),
  );
  if (growsSaleValue) {
    return `当前售价 ¥${saleValue(
      joker.baseCost,
      joker.editionCost,
      run.rules.priceDiscountBasisPoints,
      joker.sellValueOverride,
    )}`;
  }
  return null;
}

export function selectOwnedJokerPresentation(
  run: RunStateV2,
  joker: OwnedJokerV2,
): JokerPresentation | undefined {
  const base = selectJokerPresentation(joker.contentId);
  if (!base) return undefined;
  return {
    ...base,
    currentValue: dynamicCurrentValue(run, joker) ?? base.currentValue,
  };
}
