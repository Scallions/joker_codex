import { RANKS, SUITS } from '../model/cards';
import { stableId } from '../model/ids';
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

export interface MaterializedItemResultV2 {
  readonly item: MaterializedItem;
  readonly rngState: RandomState;
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
      readonly code: 'effect-handler-missing';
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
): { readonly definitions: readonly ItemDefinitionV2[]; readonly rngState: RandomState } {
  const pool = state.content.items.filter(
    (definition) =>
      allowedKinds.includes(definition.kind) &&
      definition.weightUnits > 0 &&
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
    const draw = pickWeightedStable(
      eligible.map((definition) => ({
        id: definition.contentId,
        weightUnits: definition.weightUnits,
        value: definition,
      })),
      currentRng,
    );
    definitions.push(draw.value);
    currentRng = draw.state;
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
    false,
    familyPredicate,
  );
  const items: MaterializedItem[] = [];
  let currentRng = drawn.rngState;
  for (const [index, definition] of drawn.definitions.entries()) {
    const materialized = materializeItemV2(
      definition,
      `${identity}:option:${index}:${definition.contentId}`,
      currentRng,
    );
    items.push(materialized.item);
    currentRng = materialized.rngState;
  }
  return { items, rngState: currentRng };
}

function materializeCardOffers(
  state: RunStateV2,
  shopId: ShopStateV2['id'],
  rerollCount: number,
  count: number,
  rngState: RandomState,
): { readonly offers: readonly ShopCardOfferV2[]; readonly rngState: RandomState } {
  const drawn = drawItemDefinitions(state, count, rngState);
  const offers: ShopCardOfferV2[] = [];
  let currentRng = drawn.rngState;
  for (const [index, definition] of drawn.definitions.entries()) {
    const offerId = stableId<'shop-offer'>(
      `${shopId}:card:${rerollCount}:${index}:${definition.contentId}`,
    );
    const materialized = materializeItemV2(definition, offerId, currentRng);
    offers.push({
      id: offerId,
      item: materialized.item,
      price: purchasePrice(
        materialized.item.baseCost,
        materialized.item.editionCost,
        state.rules.priceDiscountBasisPoints,
      ),
    });
    currentRng = materialized.rngState;
  }
  return { offers, rngState: currentRng };
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
  return state.content.vouchers.filter(
    (voucher) =>
      !state.inventory.voucherIds.includes(voucher.id) &&
      (voucher.prerequisiteId === null ||
        state.inventory.voucherIds.includes(voucher.prerequisiteId)),
  );
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
      price: purchasePrice(draw.value.cost, 0, state.rules.priceDiscountBasisPoints),
    },
    anteVoucherId: draw.value.id,
    rngState: draw.state,
  };
}

export function createShopV2(state: RunStateV2): ShopCreationV2 {
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
    }
  }
  const packOffers: ShopPackOfferV2[] = packs.packs.map((pack, index) => ({
    id: stableId<'pack-offer'>(`${shopId}:pack:${index}:${pack.id}`),
    packId: pack.id,
    name: pack.name,
    description: pack.description,
    price:
      grantsFreePack && index === 0
        ? 0
        : purchasePrice(pack.cost, 0, state.rules.priceDiscountBasisPoints),
  }));
  const voucher = voucherForShop(state, shopId, packs.rngState);
  return {
    ok: true,
    shop: {
      id: shopId,
      ante: state.progress.ante,
      afterBlind: state.progress.blindPosition,
      cardOffers: cards.offers,
      packOffers,
      voucherOffer: voucher.offer,
      rerollCount: 0,
      rerollCost: state.rules.baseRerollCost,
      purchasedOfferIds: [],
      freeRerollAvailable: grantsFreeReroll,
    },
    rngState: voucher.rngState,
    tags: state.inventory.tags.map((tag) =>
      deferredTags.some((deferred) => deferred.instanceId === tag.instanceId)
        ? { ...tag, consumed: true }
        : tag,
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
      price: purchasePrice(
        offer.item.baseCost,
        offer.item.editionCost,
        state.rules.priceDiscountBasisPoints,
      ),
    })),
    packOffers: shop.packOffers.map((offer) => ({
      ...offer,
      price:
        offer.price === 0
          ? 0
          : purchasePrice(
              packCosts.get(offer.packId) ?? offer.price,
              0,
              state.rules.priceDiscountBasisPoints,
            ),
    })),
    voucherOffer: shop.voucherOffer
      ? {
          ...shop.voucherOffer,
          price: purchasePrice(
            voucherCosts.get(shop.voucherOffer.voucherId) ?? shop.voucherOffer.price,
            0,
            state.rules.priceDiscountBasisPoints,
          ),
        }
      : null,
  };
}
