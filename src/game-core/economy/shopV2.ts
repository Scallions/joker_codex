import { RANKS, SUITS } from '../model/cards';
import { stableId } from '../model/ids';
import { isRunStateV3 } from '../model/runV3';
import { resolveEffectOperations } from '../effects/registry';
import type {
  ItemDefinitionV2,
  MaterializedItem,
  OwnedTagV2,
  PackDefinition,
  RunPlayingCard,
  RunStateV2,
  ShopCardOfferV2,
  ShopPackOfferV2,
  ShopStateV2,
  ShopVoucherOfferV2,
  VoucherDefinition,
} from '../model/runV2';
import { nextInteger, type RandomState } from '../rng/random';
import { pickStable, pickWeightedStable } from '../rng/weighted';
import { purchasePrice } from './pricing';
import { catalogRowIsExcludedBySemanticRules } from '../../content/runtime/eligibility';
import { resolveJokerPassiveCapabilities } from '../rules/jokerPassiveCapabilitiesV3';
import type { EffectQueueFailureCode } from '../effects/registry';
import { drawJokerDefinitionV3 } from './jokerRarityV3';

export interface MaterializedItemResultV2 {
  readonly item: MaterializedItem;
  readonly rngState: RandomState;
}

function definitionFamily(definition: ItemDefinitionV2): string {
  if (definition.kind === 'consumable') return definition.family;
  return definition.kind;
}

export function definitionIsEligibleV3(
  state: RunStateV2,
  definition: ItemDefinitionV2,
  source: 'shop' | 'pack' | 'generated',
): boolean {
  if (!isRunStateV3(state)) return true;
  if (
    source === 'shop' &&
    definition.kind === 'playing-card' &&
    !state.rulesV3.playingCardsInShop
  ) {
    return false;
  }
  if (source === 'shop' && definition.kind === 'joker' && !state.rulesV3.jokersInShop) {
    return false;
  }
  const family = definitionFamily(definition);
  if (
    source === 'shop' &&
    family === 'spectral' &&
    state.rulesV3.shopFamilyWeightMultipliers.spectral === undefined
  ) {
    return false;
  }
  if (
    state.rulesV3.excludedRuleKeys.includes('no-joker-routes') &&
    (family === 'joker' || family === 'tarot' || family === 'spectral')
  ) {
    return false;
  }
  if (state.rulesV3.bannedContentIds.includes(definition.contentId)) return false;
  const row = state.productionContentV3.rows.find(
    ({ definition: candidate }) => candidate.id === definition.contentId,
  )?.definition;
  if (!row) return true;
  if (
    catalogRowIsExcludedBySemanticRules(
      row,
      new Set([...state.rulesV3.bannedContentIds, ...state.rulesV3.excludedRuleKeys]),
    )
  ) {
    return false;
  }
  if (
    row.family !== 'joker' &&
    row.externalDependencyIds.some(
      (id) => !state.externalDependenciesV3.resolvedIds.includes(id),
    )
  ) {
    return false;
  }
  if (row.prerequisiteIds.some((id) => !state.inventory.voucherIds.includes(id))) {
    return false;
  }
  if (row.availability.kind === 'minimum-ante') {
    return state.progress.ante >= row.availability.value;
  }
  if (row.availability.kind === 'hand-played') {
    return state.history.playedHandTypes.includes(
      row.availability.value as (typeof state.history.playedHandTypes)[number],
    );
  }
  if (row.availability.kind === 'prerequisite') {
    if (row.availability.value.startsWith('bxqp:history:')) {
      return state.history.effectObservations.some(
        (observation) =>
          observation.key === row.availability.value && observation.value === true,
      );
    }
    return state.inventory.voucherIds.includes(row.availability.value);
  }
  if (row.availability.kind === 'challenge-only') {
    return state.setupV3.challengeId === row.availability.value;
  }
  if (row.availability.kind === 'deck-contains-modifier') {
    const requiredModifierId = row.availability.value;
    const mirrors = new Map(
      state.modifiersV3.playingCards.map((modifier) => [modifier.cardId, modifier]),
    );
    return state.deck.cards.some((card) => {
      const mirror = mirrors.get(card.id);
      return [
        mirror?.enhancementId ?? card.enhancementId,
        mirror?.sealId ?? card.sealId,
        mirror?.editionId ?? card.editionId,
      ].includes(requiredModifierId);
    });
  }
  return row.availability.kind !== 'profile-objective';
}

function definitionWeight(state: RunStateV2, definition: ItemDefinitionV2): number {
  if (!isRunStateV3(state)) return definition.weightUnits;
  const multiplier =
    state.rulesV3.shopFamilyWeightMultipliers[definitionFamily(definition)] ?? 1;
  return Math.max(0, Math.round(definition.weightUnits * multiplier));
}

function ownedVoucherEffects(state: RunStateV2) {
  return state.inventory.voucherIds.flatMap(
    (voucherId) =>
      state.content.vouchers.find((voucher) => voucher.id === voucherId)?.effects ?? [],
  );
}

function ownedVoucherNumber(
  state: RunStateV2,
  parameter: string,
  predicate: (
    effect: RunStateV2['content']['vouchers'][number]['effects'][number],
  ) => boolean,
): number | null {
  const value = ownedVoucherEffects(state).find(predicate)?.parameters[parameter];
  return typeof value === 'number' ? value : null;
}

function ownsVoucherBaseline(state: RunStateV2, key: string): boolean {
  const observationKey = `baseline:${key}`;
  return ownedVoucherEffects(state).some((effect) => {
    const resolved = resolveEffectOperations(effect, 'item-acquired', state);
    return (
      resolved.ok &&
      resolved.operations.some(
        (operation) =>
          operation.type === 'record-observation' &&
          operation.key === observationKey &&
          operation.value === true,
      )
    );
  });
}

function rowForDefinition(state: RunStateV2, contentId: string) {
  return isRunStateV3(state)
    ? state.productionContentV3.rows.find(({ definition }) => definition.id === contentId)
        ?.definition
    : undefined;
}

function externalDependenciesResolved(
  state: RunStateV2,
  definition: ItemDefinitionV2,
): boolean {
  const row = rowForDefinition(state, definition.contentId);
  return (
    row === undefined ||
    !isRunStateV3(state) ||
    row.externalDependencyIds.every((id) =>
      state.externalDependenciesV3.resolvedIds.includes(id),
    )
  );
}

function mostPlayedHand(state: RunStateV2): string | null {
  const counts = new Map<string, number>();
  for (const handType of state.history.playedHandTypes) {
    counts.set(handType, (counts.get(handType) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0] ?? null
  );
}

function guaranteedPlanetDefinition(state: RunStateV2): ItemDefinitionV2 | null {
  if (!ownsVoucherBaseline(state, 'planet-pack-guarantees-most-played-hand')) {
    return null;
  }
  const handType = mostPlayedHand(state);
  if (!handType) return null;
  return (
    state.content.items.find(
      (definition) =>
        definition.kind === 'consumable' &&
        definition.family === 'planet' &&
        definition.effects.some((effect) => effect.parameters.hand === handType),
    ) ?? null
  );
}

function replacementPool(
  state: RunStateV2,
  kind: 'ordinary-spectral' | 'rare-spectral',
  excludedIds: ReadonlySet<string>,
): readonly ItemDefinitionV2[] {
  return state.content.items.filter((definition) => {
    if (
      definition.kind !== 'consumable' ||
      definition.family !== 'spectral' ||
      excludedIds.has(definition.contentId) ||
      !externalDependenciesResolved(state, definition)
    ) {
      return false;
    }
    const row = rowForDefinition(state, definition.contentId);
    const rare =
      row?.availability.kind === 'prerequisite' &&
      row.availability.value === 'bxqp:pool:spectral-rare-replacement';
    return kind === 'rare-spectral'
      ? rare
      : !rare && definitionIsEligibleV3(state, definition, 'pack');
  });
}

function purchasePriceForState(
  state: RunStateV2,
  baseCost: number,
  editionCost: number,
): number {
  const ordinary = purchasePrice(
    baseCost,
    editionCost,
    state.rules.priceDiscountBasisPoints,
  );
  return isRunStateV3(state)
    ? ordinary + state.rulesV3.priceInflationPerPurchase * state.rulesV3.purchasesMade
    : ordinary;
}

export type ShopCreationV2 =
  | {
      readonly ok: true;
      readonly shop: ShopStateV2;
      readonly rngState: RandomState;
      readonly tags: readonly OwnedTagV2[];
      readonly anteVoucherId: string | null;
    }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode;
      readonly message: string;
    };

function generatedPlayingCard(
  identity: string,
  rngState: RandomState,
): { readonly card: RunPlayingCard; readonly rngState: RandomState } {
  const suit = nextInteger(rngState, SUITS.length);
  const rank = nextInteger(suit.state, RANKS.length);
  return {
    card: {
      id: stableId<'playing-card'>(`playing:generated:${identity}`),
      suit: SUITS[suit.value]!,
      rank: RANKS[rank.value]!,
      enhancementId: null,
      sealId: null,
      editionId: null,
      bonusChips: 0,
    },
    rngState: rank.state,
  };
}

export function materializeItemV2(
  definition: ItemDefinitionV2,
  identity: string,
  rngState: RandomState,
): MaterializedItemResultV2 {
  const generated =
    definition.kind === 'playing-card'
      ? generatedPlayingCard(identity, rngState)
      : { card: null, rngState };
  return {
    item: {
      contentId: definition.contentId,
      kind: definition.kind,
      name: definition.name,
      description: definition.description,
      baseCost: definition.baseCost,
      editionCost: 0,
      editionId: null,
      effects: definition.effects,
      targetKind: definition.targetKind,
      minimumTargets: definition.minimumTargets,
      maximumTargets: definition.maximumTargets,
      slotContribution: definition.kind === 'joker' ? definition.slotContribution : 1,
      generatedCard: generated.card,
    },
    rngState: generated.rngState,
  };
}

interface MaterializedModifierPolicyV3 {
  readonly playingCardModifiers: boolean;
  readonly jokerEdition: boolean;
}

function modifierRows(state: RunStateV2, family: 'enhancement' | 'seal' | 'edition') {
  return isRunStateV3(state)
    ? state.productionContentV3.rows
        .filter(({ definition }) => definition.family === family)
        .sort((left, right) => left.definition.ordinal - right.definition.ordinal)
    : [];
}

function editionWeightMultiplier(state: RunStateV2): number {
  return Math.max(
    1,
    ...ownedVoucherEffects(state)
      .filter((effect) => effect.parameters.key === 'edition-weight')
      .map((effect) => effect.parameters.value)
      .filter((value): value is number => typeof value === 'number'),
  );
}

function editionCost(ordinal: number): number {
  return [0, 2, 3, 5, 5][ordinal - 1] ?? 0;
}

function rollEdition(
  state: RunStateV2,
  kind: 'playing-card' | 'joker',
  rngState: RandomState,
): {
  readonly rowId: string | null;
  readonly ordinal: number;
  readonly rngState: RandomState;
} {
  const editions = modifierRows(state, 'edition').filter(
    ({ definition }) =>
      definition.ordinal > 1 && (kind === 'joker' || definition.ordinal < 5),
  );
  if (editions.length === 0) return { rowId: null, ordinal: 1, rngState };
  const multiplier = editionWeightMultiplier(state);
  const baseWeights = kind === 'joker' ? [200, 140, 30, 30] : [200, 140, 30];
  const roll = nextInteger(rngState, 10_000);
  let cursor = 0;
  for (const row of editions) {
    cursor += (baseWeights[row.definition.ordinal - 2] ?? 0) * multiplier;
    if (roll.value < cursor) {
      return {
        rowId: row.definition.id,
        ordinal: row.definition.ordinal,
        rngState: roll.state,
      };
    }
  }
  return { rowId: null, ordinal: 1, rngState: roll.state };
}

function applyMaterializedModifierRollsV3(
  state: RunStateV2,
  item: MaterializedItem,
  initialRngState: RandomState,
  policy: MaterializedModifierPolicyV3,
): MaterializedItemResultV2 {
  if (!isRunStateV3(state)) return { item, rngState: initialRngState };
  let rngState = initialRngState;
  if (item.kind === 'joker' && policy.jokerEdition) {
    const edition = rollEdition(state, 'joker', rngState);
    rngState = edition.rngState;
    if (edition.rowId !== null) {
      return {
        item: {
          ...item,
          editionId: edition.rowId,
          editionCost: editionCost(edition.ordinal),
          slotContribution: edition.ordinal === 5 ? 0 : item.slotContribution,
        },
        rngState,
      };
    }
    return { item, rngState };
  }
  if (
    item.kind !== 'playing-card' ||
    !item.generatedCard ||
    !policy.playingCardModifiers
  ) {
    return { item, rngState };
  }

  let enhancementId: string | null = null;
  let sealId: string | null = null;
  const enhancements = modifierRows(state, 'enhancement');
  if (enhancements.length > 0) {
    const roll = nextInteger(rngState, 10_000);
    rngState = roll.state;
    if (roll.value < 4_000) {
      const selected = pickStable(
        enhancements,
        ({ definition }) => definition.id,
        rngState,
      );
      enhancementId = selected.value.definition.id;
      rngState = selected.state;
    }
  }

  const edition = rollEdition(state, 'playing-card', rngState);
  rngState = edition.rngState;

  const seals = modifierRows(state, 'seal');
  if (seals.length > 0) {
    const roll = nextInteger(rngState, 10_000);
    rngState = roll.state;
    if (roll.value < 2_000) {
      const selected = pickStable(seals, ({ definition }) => definition.id, rngState);
      sealId = selected.value.definition.id;
      rngState = selected.state;
    }
  }

  return {
    item: {
      ...item,
      editionId: edition.rowId,
      editionCost: editionCost(edition.ordinal),
      generatedCard: {
        ...item.generatedCard,
        enhancementId,
        sealId,
        editionId: edition.rowId,
      },
    },
    rngState,
  };
}

function drawItemDefinitions(
  state: RunStateV2,
  count: number,
  rngState: RandomState,
  allowedKinds: readonly ItemDefinitionV2['kind'][] = [
    'joker',
    'consumable',
    'playing-card',
  ],
  uniqueByContent = true,
  predicate: (definition: ItemDefinitionV2) => boolean = () => true,
  source: 'shop' | 'pack' | 'generated' = 'shop',
): { readonly definitions: readonly ItemDefinitionV2[]; readonly rngState: RandomState } {
  const pool = state.content.items.filter(
    (definition) =>
      allowedKinds.includes(definition.kind) &&
      definitionWeight(state, definition) > 0 &&
      definitionIsEligibleV3(state, definition, source) &&
      predicate(definition),
  );
  if (pool.length === 0) return { definitions: [], rngState };
  const definitions: ItemDefinitionV2[] = [];
  let currentRng = rngState;
  for (let index = 0; index < count; index += 1) {
    const eligible = uniqueByContent
      ? pool.filter(
          (definition) =>
            !definitions.some((selected) => selected.contentId === definition.contentId),
        )
      : pool;
    if (eligible.length === 0) break;
    const jokerPool = eligible.filter(
      (definition): definition is Extract<ItemDefinitionV2, { kind: 'joker' }> =>
        definition.kind === 'joker',
    );
    if (jokerPool.length === eligible.length) {
      const jokerDraw = drawJokerDefinitionV3(
        jokerPool.map((definition) => ({
          contentId: definition.contentId,
          rarity: definition.rarity,
          weightUnits: definitionWeight(state, definition),
          value: definition,
        })),
        currentRng,
        'ordinary',
      );
      if (!jokerDraw.ok) break;
      definitions.push(jokerDraw.value);
      currentRng = jokerDraw.rngState;
      continue;
    }
    const nonJokers = eligible.filter((definition) => definition.kind !== 'joker');
    type DrawGroup =
      | { readonly kind: 'definition'; readonly definition: ItemDefinitionV2 }
      | { readonly kind: 'joker' };
    const groupDraw = pickWeightedStable<DrawGroup>(
      [
        ...nonJokers.map((definition) => ({
          id: `definition:${definition.contentId}`,
          weightUnits: definitionWeight(state, definition),
          value: { kind: 'definition', definition } as const,
        })),
        ...(jokerPool.length > 0
          ? [
              {
                id: 'family:joker',
                weightUnits: jokerPool.reduce(
                  (total, definition) => total + definitionWeight(state, definition),
                  0,
                ),
                value: { kind: 'joker' } as const,
              },
            ]
          : []),
      ],
      currentRng,
    );
    currentRng = groupDraw.state;
    if (groupDraw.value.kind === 'definition') {
      definitions.push(groupDraw.value.definition);
      continue;
    }
    const jokerDraw = drawJokerDefinitionV3(
      jokerPool.map((definition) => ({
        contentId: definition.contentId,
        rarity: definition.rarity,
        weightUnits: definitionWeight(state, definition),
        value: definition,
      })),
      currentRng,
      'ordinary',
    );
    if (!jokerDraw.ok) break;
    definitions.push(jokerDraw.value);
    currentRng = jokerDraw.rngState;
  }
  return { definitions, rngState: currentRng };
}

export function materializePackOptionsV2(
  state: RunStateV2,
  pack: PackDefinition,
  identity: string,
  rngState: RandomState,
): { readonly items: readonly MaterializedItem[]; readonly rngState: RandomState } {
  const familyPredicate = (definition: ItemDefinitionV2): boolean => {
    if (definition.kind !== 'consumable') return true;
    if (pack.family === 'celestial') return definition.family === 'planet';
    if (pack.family === 'spectral') return definition.family === 'spectral';
    if (pack.family === 'arcana') {
      return definition.family === 'tarot' || definition.family === 'fixture';
    }
    return true;
  };
  const drawn = drawItemDefinitions(
    state,
    pack.optionCount,
    rngState,
    pack.allowedItemKinds,
    isRunStateV3(state) && pack.family !== 'standard',
    familyPredicate,
    'pack',
  );
  const definitions = [...drawn.definitions];
  let currentRng = drawn.rngState;

  if (pack.family === 'celestial') {
    const guaranteed = guaranteedPlanetDefinition(state);
    if (guaranteed && definitions.length > 0) {
      const existingIndex = definitions.findIndex(
        ({ contentId }) => contentId === guaranteed.contentId,
      );
      if (existingIndex > 0) {
        [definitions[0], definitions[existingIndex]] = [
          definitions[existingIndex]!,
          definitions[0]!,
        ];
      } else if (existingIndex < 0) {
        definitions[0] = guaranteed;
      }
    }
  }

  const tarotReplacementBasisPoints =
    pack.family === 'arcana'
      ? (ownedVoucherNumber(
          state,
          'rareReplacementBasisPoints',
          (effect) =>
            effect.parameters.profileId === 'bxqp:profile:tarot-spectral-replacement',
        ) ?? 0)
      : 0;
  const rareSpectralBasisPoints =
    pack.family === 'spectral'
      ? (pack.effects.find(
          (effect) => effect.parameters.rareReplacementBasisPoints !== undefined,
        )?.parameters.rareReplacementBasisPoints ?? 0)
      : 0;
  const replacementBasisPoints =
    typeof rareSpectralBasisPoints === 'number'
      ? Math.max(tarotReplacementBasisPoints, rareSpectralBasisPoints)
      : tarotReplacementBasisPoints;
  const replacementKind =
    pack.family === 'spectral' ? 'rare-spectral' : 'ordinary-spectral';
  if (replacementBasisPoints > 0) {
    for (let index = 0; index < definitions.length; index += 1) {
      const excluded = new Set(
        definitions
          .filter((_, candidateIndex) => candidateIndex !== index)
          .map(({ contentId }) => contentId),
      );
      const pool = replacementPool(state, replacementKind, excluded);
      if (pool.length === 0) continue;
      const roll = nextInteger(currentRng, 10_000);
      currentRng = roll.state;
      if (roll.value >= replacementBasisPoints) continue;
      const replacement = pickWeightedStable(
        pool.map((definition) => ({
          id: definition.contentId,
          weightUnits: definition.weightUnits,
          value: definition,
        })),
        currentRng,
      );
      definitions[index] = replacement.value;
      currentRng = replacement.state;
    }
  }

  const items: MaterializedItem[] = [];
  for (const [index, definition] of definitions.entries()) {
    const materialized = materializeItemV2(
      definition,
      `${identity}:option:${index}:${definition.contentId}`,
      currentRng,
    );
    const modified = applyMaterializedModifierRollsV3(
      state,
      materialized.item,
      materialized.rngState,
      {
        playingCardModifiers: pack.family === 'standard',
        jokerEdition: pack.family === 'buffoon',
      },
    );
    items.push(modified.item);
    currentRng = modified.rngState;
  }
  return { items, rngState: currentRng };
}

function materializeCardOffers(
  state: RunStateV2,
  shopId: ShopStateV2['id'],
  rerollCount: number,
  count: number,
  rngState: RandomState,
  startIndex = 0,
  excludedContentIds: ReadonlySet<string> = new Set(),
): { readonly offers: readonly ShopCardOfferV2[]; readonly rngState: RandomState } {
  const drawn = drawItemDefinitions(
    state,
    count,
    rngState,
    ['joker', 'consumable', 'playing-card'],
    true,
    (definition) => !excludedContentIds.has(definition.contentId),
  );
  const offers: ShopCardOfferV2[] = [];
  let currentRng = drawn.rngState;
  for (const [index, definition] of drawn.definitions.entries()) {
    const offerId = stableId<'shop-offer'>(
      `${shopId}:card:${rerollCount}:${startIndex + index}:${definition.contentId}`,
    );
    const materialized = materializeItemV2(definition, offerId, currentRng);
    const modified = applyMaterializedModifierRollsV3(
      state,
      materialized.item,
      materialized.rngState,
      {
        playingCardModifiers: ownsVoucherBaseline(
          state,
          'shop-playing-card-modifier-rolls-including-seals',
        ),
        jokerEdition: true,
      },
    );
    offers.push({
      id: offerId,
      item: modified.item,
      price: purchasePriceForState(
        state,
        modified.item.baseCost,
        modified.item.editionCost,
      ),
    });
    currentRng = modified.rngState;
  }
  return { offers, rngState: currentRng };
}

export function fillShopCardOffersV2(state: RunStateV2): {
  readonly offers: readonly ShopCardOfferV2[];
  readonly rngState: RandomState;
} {
  if (!state.shop) return { offers: [], rngState: state.rngState };
  const missing = Math.max(0, state.rules.cardOfferSlots - state.shop.cardOffers.length);
  if (missing === 0) return { offers: [], rngState: state.rngState };
  return materializeCardOffers(
    state,
    state.shop.id,
    state.shop.rerollCount,
    missing,
    state.rngState,
    state.shop.cardOffers.length,
    new Set(state.shop.cardOffers.map(({ item }) => item.contentId)),
  );
}

function drawPackDefinitions(
  packs: readonly PackDefinition[],
  count: number,
  rngState: RandomState,
  guaranteedId: string | null,
): { readonly packs: readonly PackDefinition[]; readonly rngState: RandomState } {
  const selected: PackDefinition[] = [];
  let currentRng = rngState;
  if (guaranteedId) {
    const guaranteed = packs.find((pack) => pack.id === guaranteedId);
    if (guaranteed) selected.push(guaranteed);
  }
  while (selected.length < count) {
    const eligible = packs.filter(
      (pack) => pack.weightUnits > 0 && !selected.some((entry) => entry.id === pack.id),
    );
    if (eligible.length === 0) break;
    const draw = pickWeightedStable(
      eligible.map((pack) => ({
        id: pack.id,
        weightUnits: pack.weightUnits,
        value: pack,
      })),
      currentRng,
    );
    selected.push(draw.value);
    currentRng = draw.state;
  }
  return { packs: selected, rngState: currentRng };
}

function eligibleVouchers(state: RunStateV2): VoucherDefinition[] {
  return state.content.vouchers.filter((voucher) => {
    if (
      state.inventory.voucherIds.includes(voucher.id) ||
      (voucher.prerequisiteId !== null &&
        !state.inventory.voucherIds.includes(voucher.prerequisiteId))
    ) {
      return false;
    }
    if (!isRunStateV3(state)) return true;
    const row = state.productionContentV3.rows.find(
      ({ definition }) => definition.id === voucher.id,
    )?.definition;
    return (
      row === undefined ||
      !catalogRowIsExcludedBySemanticRules(
        row,
        new Set([...state.rulesV3.bannedContentIds, ...state.rulesV3.excludedRuleKeys]),
      )
    );
  });
}

function voucherForShop(
  state: RunStateV2,
  shopId: ShopStateV2['id'],
  rngState: RandomState,
): {
  readonly offer: ShopVoucherOfferV2 | null;
  readonly anteVoucherId: string | null;
  readonly rngState: RandomState;
} {
  const eligible = eligibleVouchers(state);
  if (eligible.length === 0) {
    return { offer: null, anteVoucherId: null, rngState };
  }
  const existing = eligible.find(
    (voucher) => voucher.id === state.progress.anteVoucherId,
  );
  const draw = existing
    ? { value: existing, state: rngState }
    : pickStable(eligible, (voucher) => voucher.id, rngState);
  return {
    offer: {
      id: stableId<'voucher-offer'>(`${shopId}:voucher:${draw.value.id}`),
      voucherId: draw.value.id,
      name: draw.value.name,
      description: draw.value.description,
      price: purchasePriceForState(state, draw.value.cost, 0),
    },
    anteVoucherId: draw.value.id,
    rngState: draw.state,
  };
}

function extraVoucherOffersForShop(
  state: RunStateV2,
  shopId: ShopStateV2['id'],
  tags: readonly OwnedTagV2[],
  primaryOffer: ShopVoucherOfferV2 | null,
  initialRngState: RandomState,
): {
  readonly offers: readonly ShopVoucherOfferV2[];
  readonly rngState: RandomState;
  readonly consumedTagIds: ReadonlySet<string>;
} {
  const offers: ShopVoucherOfferV2[] = [];
  const consumedTagIds = new Set<string>();
  const usedVoucherIds = new Set(primaryOffer === null ? [] : [primaryOffer.voucherId]);
  let rngState = initialRngState;
  for (const tag of tags) {
    const count = tagRuleValue(state, tag, 'voucher');
    if (typeof count !== 'number' || count <= 0) continue;
    let materialized = 0;
    for (let index = 0; index < count; index += 1) {
      const eligible = eligibleVouchers(state).filter(
        ({ id }) => !usedVoucherIds.has(id),
      );
      if (eligible.length === 0) break;
      const draw = pickStable(eligible, ({ id }) => id, rngState);
      rngState = draw.state;
      usedVoucherIds.add(draw.value.id);
      offers.push({
        id: stableId<'voucher-offer'>(
          `${shopId}:tag-voucher:${offers.length}:${draw.value.id}`,
        ),
        voucherId: draw.value.id,
        name: draw.value.name,
        description: draw.value.description,
        price: purchasePriceForState(state, draw.value.cost, 0),
      });
      materialized += 1;
    }
    if (materialized > 0) consumedTagIds.add(tag.instanceId);
  }
  return { offers, rngState, consumedTagIds };
}

function tagRuleValue(
  state: RunStateV2,
  tag: OwnedTagV2,
  key: string,
): string | number | boolean | null {
  const definition = state.content.tags.find(
    (candidate) => candidate.id === tag.contentId,
  );
  for (const effect of definition?.effects ?? []) {
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

function materializeFreeJokerTags(
  state: RunStateV2,
  shopId: ShopStateV2['id'],
  tags: readonly OwnedTagV2[],
  existingOffers: readonly ShopCardOfferV2[],
  initialRngState: RandomState,
): {
  readonly offers: readonly ShopCardOfferV2[];
  readonly rngState: RandomState;
  readonly consumedTagIds: ReadonlySet<string>;
} {
  const offers: ShopCardOfferV2[] = [];
  const consumedTagIds = new Set<string>();
  let rngState = initialRngState;
  const usedContentIds = new Set(existingOffers.map(({ item }) => item.contentId));
  for (const tag of tags) {
    const rarity = tagRuleValue(state, tag, 'free-joker');
    if (typeof rarity !== 'string') continue;
    const pool = state.content.items.filter(
      (definition): definition is Extract<ItemDefinitionV2, { kind: 'joker' }> =>
        definition.kind === 'joker' &&
        definition.rarity === rarity &&
        !usedContentIds.has(definition.contentId) &&
        definitionIsEligibleV3(state, definition, 'shop'),
    );
    if (pool.length === 0) continue;
    const draw = drawJokerDefinitionV3(
      pool.map((definition) => ({
        contentId: definition.contentId,
        rarity: definition.rarity,
        weightUnits: definitionWeight(state, definition),
        value: definition,
      })),
      rngState,
      rarity as Extract<ItemDefinitionV2, { kind: 'joker' }>['rarity'],
    );
    if (!draw.ok) continue;
    rngState = draw.rngState;
    usedContentIds.add(draw.value.contentId);
    const offerId = stableId<'shop-offer'>(
      `${shopId}:tag-joker:${offers.length}:${draw.value.contentId}`,
    );
    const materialized = materializeItemV2(draw.value, offerId, rngState);
    rngState = materialized.rngState;
    offers.push({ id: offerId, item: materialized.item, price: 0 });
    consumedTagIds.add(tag.instanceId);
  }
  return { offers, rngState, consumedTagIds };
}

function applyEditionTags(
  state: RunStateV2,
  tags: readonly OwnedTagV2[],
  offers: readonly ShopCardOfferV2[],
): {
  readonly offers: readonly ShopCardOfferV2[];
  readonly consumedTagIds: ReadonlySet<string>;
} {
  let nextOffers = [...offers];
  const consumedTagIds = new Set<string>();
  const targetedOfferIds = new Set<string>();
  for (const tag of tags) {
    const editionId = tagRuleValue(state, tag, 'edition-joker');
    if (typeof editionId !== 'string') continue;
    const target = nextOffers.find(
      ({ id, item }) =>
        item.kind === 'joker' && item.editionId === null && !targetedOfferIds.has(id),
    );
    if (!target) continue;
    targetedOfferIds.add(target.id);
    nextOffers = nextOffers.map((offer) =>
      offer.id === target.id
        ? {
            ...offer,
            price: 0,
            item: {
              ...offer.item,
              editionId,
              slotContribution: editionId.endsWith('shadow-cutout')
                ? 0
                : offer.item.slotContribution,
            },
          }
        : offer,
    );
    consumedTagIds.add(tag.instanceId);
  }
  return { offers: nextOffers, consumedTagIds };
}

export function createShopV2(state: RunStateV2): ShopCreationV2 {
  const passives = resolveJokerPassiveCapabilities(state);
  if (!passives.ok) return passives;
  const shopId = stableId<'shop'>(
    `shop:${state.runId}:${state.progress.ante}:${state.progress.blindPosition}:${state.history.completedBlindIds.length + 1}`,
  );
  const cards = materializeCardOffers(
    state,
    shopId,
    0,
    state.rules.cardOfferSlots,
    state.rngState,
  );
  const firstShop = state.history.completedBlindIds.length === 0;
  const guaranteedFirstPackId = firstShop
    ? ([...state.content.packs]
        .filter((pack) => pack.family === 'buffoon' && pack.size === 'normal')
        .sort((left, right) => left.id.localeCompare(right.id))[0]?.id ?? null)
    : null;
  const packs = drawPackDefinitions(
    state.content.packs,
    state.rules.packOfferSlots,
    cards.rngState,
    guaranteedFirstPackId,
  );
  const deferredTags = state.inventory.tags.filter(
    (tag) => !tag.consumed && tag.deferredWindow === 'shop-entered',
  );
  let grantsFreePack = false;
  let grantsFreeReroll = false;
  let grantsFreeShop = false;
  for (const tag of deferredTags) {
    const definition = state.content.tags.find(
      (candidate) => candidate.id === tag.contentId,
    );
    for (const effect of definition?.effects ?? []) {
      const resolved = resolveEffectOperations(effect, 'shop-entered', state);
      if (!resolved.ok) return resolved;
      grantsFreePack ||= resolved.operations.some(
        (operation) => operation.type === 'create-free-pack',
      );
      grantsFreeReroll ||= resolved.operations.some(
        (operation) => operation.type === 'free-reroll',
      );
      grantsFreeShop ||= effect.parameters.key === 'free-shop';
    }
  }
  const freeJokers = materializeFreeJokerTags(
    state,
    shopId,
    deferredTags,
    cards.offers,
    packs.rngState,
  );
  const editionTags = applyEditionTags(state, deferredTags, [
    ...cards.offers,
    ...freeJokers.offers,
  ]);
  const cardOffers = editionTags.offers.map((offer) =>
    grantsFreeShop ? { ...offer, price: 0 } : offer,
  );
  const packOffers: ShopPackOfferV2[] = packs.packs.map((pack, index) => ({
    id: stableId<'pack-offer'>(`${shopId}:pack:${index}:${pack.id}`),
    packId: pack.id,
    name: pack.name,
    description: pack.description,
    price:
      grantsFreeShop || (grantsFreePack && index === 0)
        ? 0
        : purchasePriceForState(state, pack.cost, 0),
  }));
  const voucher = voucherForShop(state, shopId, freeJokers.rngState);
  const extraVouchers = extraVoucherOffersForShop(
    state,
    shopId,
    deferredTags,
    voucher.offer,
    voucher.rngState,
  );
  const consumedDeferredTagIds = new Set([
    ...deferredTags
      .filter(
        (tag) =>
          tagRuleValue(state, tag, 'edition-joker') === null &&
          tagRuleValue(state, tag, 'free-joker') === null &&
          tagRuleValue(state, tag, 'voucher') === null,
      )
      .map(({ instanceId }) => instanceId),
    ...freeJokers.consumedTagIds,
    ...editionTags.consumedTagIds,
    ...extraVouchers.consumedTagIds,
  ]);
  return {
    ok: true,
    shop: {
      id: shopId,
      ante: state.progress.ante,
      afterBlind: state.progress.blindPosition,
      cardOffers,
      packOffers,
      voucherOffer: voucher.offer,
      extraVoucherOffers: extraVouchers.offers,
      rerollCount: 0,
      rerollCost: state.rules.baseRerollCost,
      purchasedOfferIds: [],
      freeRerollAvailable: grantsFreeReroll || passives.capabilities.freeRerollPerShop,
    },
    rngState: extraVouchers.rngState,
    tags: state.inventory.tags.map((tag) =>
      consumedDeferredTagIds.has(tag.instanceId) ? { ...tag, consumed: true } : tag,
    ),
    anteVoucherId: voucher.anteVoucherId,
  };
}

export function rerollShopCardsV2(state: RunStateV2): {
  readonly offers: readonly ShopCardOfferV2[];
  readonly rngState: RandomState;
} {
  if (!state.shop) throw new Error('缺少商店状态');
  return materializeCardOffers(
    state,
    state.shop.id,
    state.shop.rerollCount + 1,
    state.shop.cardOffers.length,
    state.rngState,
  );
}

export function repriceShopV2(shop: ShopStateV2, state: RunStateV2): ShopStateV2 {
  const packCosts = new Map(state.content.packs.map((pack) => [pack.id, pack.cost]));
  const voucherCosts = new Map(
    state.content.vouchers.map((voucher) => [voucher.id, voucher.cost]),
  );
  return {
    ...shop,
    cardOffers: shop.cardOffers.map((offer) => ({
      ...offer,
      price:
        offer.price === 0
          ? 0
          : purchasePriceForState(state, offer.item.baseCost, offer.item.editionCost),
    })),
    packOffers: shop.packOffers.map((offer) => ({
      ...offer,
      price:
        offer.price === 0
          ? 0
          : purchasePriceForState(state, packCosts.get(offer.packId) ?? offer.price, 0),
    })),
    voucherOffer: shop.voucherOffer
      ? {
          ...shop.voucherOffer,
          price: purchasePriceForState(
            state,
            voucherCosts.get(shop.voucherOffer.voucherId) ?? shop.voucherOffer.price,
            0,
          ),
        }
      : null,
    extraVoucherOffers: (shop.extraVoucherOffers ?? []).map((offer) => ({
      ...offer,
      price: purchasePriceForState(
        state,
        voucherCosts.get(offer.voucherId) ?? offer.price,
        0,
      ),
    })),
  };
}
