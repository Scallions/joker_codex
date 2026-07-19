import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import type {
  JokerAbilityStateValue,
  JokerEnsemble,
  JokerRarity,
} from '../../content/schema/catalog';
import { saleValue } from '../../game-core/economy/pricing';
import type { OwnedJokerV2, RunStateV2 } from '../../game-core/model/runV2';
import { isRunStateV4 } from '../../game-core/model/runV4';

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

function currentValueFromAbilityState(
  state: Readonly<Record<string, JokerAbilityStateValue>>,
): string | null {
  const remainingChips = state.remainingChips;
  if (typeof remainingChips === 'number') return `当前 +${remainingChips} 筹码`;
  const storedChips = state.storedChips;
  if (typeof storedChips === 'number') return `当前 +${storedChips} 筹码`;
  const storedMult = state.storedMult;
  if (typeof storedMult === 'number') return `当前 +${storedMult} 倍率`;
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
    currentValue: currentValueFromAbilityState(row.initialAbilityState),
  };
}

function dynamicCurrentValue(run: RunStateV2, joker: OwnedJokerV2): string | null {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) => candidate.family === 'joker' && candidate.id === joker.contentId,
  );
  if (!row || row.family !== 'joker') return null;

  if (isRunStateV4(run)) {
    const modifier = run.modifiersV3.jokers.find(
      (candidate) => candidate.instanceId === joker.instanceId,
    );
    const stored = modifier ? currentValueFromAbilityState(modifier.abilityState) : null;
    if (stored) return stored;

    const mirrors = new Map(
      run.modifiersV3.playingCards.map((candidate) => [candidate.cardId, candidate]),
    );
    for (const effect of row.effects) {
      for (const operation of effect.operations) {
        if (
          operation.type !== 'joker-score' ||
          operation.metric !== 'mult-factor' ||
          operation.value.kind !== 'full-deck-modifier-count'
        ) {
          continue;
        }
        const value = operation.value;
        const modifierCount = run.deck.cards.filter((card) => {
          const mirror = mirrors.get(card.id);
          return [
            mirror?.enhancementId ?? card.enhancementId,
            mirror?.sealId ?? card.sealId,
            mirror?.editionId ?? card.editionId,
          ].includes(value.modifierId);
        }).length;
        const factor = value.base + modifierCount * value.scale;
        return `当前 ×${factor.toFixed(1)}`;
      }
    }
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
