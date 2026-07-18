import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { applyStateOperationV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { createShopV2 } from '../../src/game-core/economy/shopV2';
import { stableId } from '../../src/game-core/model/ids';
import type {
  ItemDefinitionV2,
  JokerDefinitionV2,
} from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';
import { createRandomState } from '../../src/game-core/rng/random';

function enterShop(run: RunStateV3): RunStateV3 {
  const created = createShopV2(run);
  if (!created.ok) throw new Error(created.message);
  return {
    ...run,
    rngState: created.rngState,
    phase: { kind: 'shop' },
    inventory: { ...run.inventory, tags: created.tags },
    progress: { ...run.progress, anteVoucherId: created.anteVoucherId },
    shop: created.shop,
  };
}

function onlyItems(run: RunStateV3, predicate: (item: ItemDefinitionV2) => boolean) {
  return {
    ...run,
    content: { ...run.content, items: run.content.items.filter(predicate) },
  };
}

const testJoker: JokerDefinitionV2 = {
  kind: 'joker',
  contentId: 'bxqp:joker:024',
  name: '夜市测试奇牌',
  description: '只用于验证目录资格开关。',
  baseCost: 6,
  weightUnits: 100,
  effects: [],
  targetKind: 'none',
  minimumTargets: 0,
  maximumTargets: 0,
  rarity: 'uncommon',
  slotContribution: 1,
};

describe('V3 夜市目录资格与价格合约', () => {
  it('默认不出售散牌或灵异牌，启用规则后同一候选池可达', () => {
    const initial = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'shop-family-gates',
    });
    const playingOnly = onlyItems(initial, (item) => item.kind === 'playing-card');
    expect(enterShop(playingOnly).shop?.cardOffers).toEqual([]);

    const playingEnabled = applyStateOperationV3(
      playingOnly,
      { type: 'catalog-shop-rule', key: 'playing-cards-enabled', value: true },
      {
        window: 'item-acquired',
        sourceInstanceId: 'test:voucher',
        effectId: 'test:playing-cards-enabled',
      },
    );
    if (!playingEnabled.ok) throw new Error(playingEnabled.message);
    expect(
      enterShop(playingEnabled.state as RunStateV3).shop?.cardOffers[0]?.item.kind,
    ).toBe('playing-card');

    const spirit = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'spectral-family-gate',
      deckId: 'bxqp:deck:spirit-stall',
    });
    const spectralOnly = onlyItems(
      spirit,
      (item) => item.kind === 'consumable' && item.family === 'spectral',
    );
    expect(enterShop(spectralOnly).shop?.cardOffers[0]?.item.contentId).toMatch(
      /^bxqp:spectral:/,
    );
  });

  it('挑战起始木牌会在首个命令前组成永久夜市规则', () => {
    const threeSigns = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'starting-voucher-three-signs',
      deckId: 'bxqp:deck:three-signs',
    });
    const ceiling = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'starting-voucher-ceiling',
      challengeId: 'bxqp:challenge:coin-ceiling',
    });
    const jokerless = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'starting-voucher-jokerless',
      challengeId: 'bxqp:challenge:jokerless-market',
    });

    expect(threeSigns.rules.cardOfferSlots).toBe(3);
    expect(threeSigns.rulesV3.shopFamilyWeightMultipliers).toMatchObject({
      tarot: 2,
      planet: 2,
    });
    expect(ceiling.rules.interestCap).toBe(20);
    expect(jokerless.rulesV3.playingCardsInShop).toBe(true);
    expect(jokerless.rulesV3.jokersInShop).toBe(false);
  });

  it('无奇牌挑战同时拦截普通奇牌商品与禁止的生成路线', () => {
    const challenge = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'empty-rail-shop',
      challengeId: 'bxqp:challenge:empty-rail',
    });
    const withDouble: RunStateV3 = {
      ...challenge,
      content: { ...challenge.content, items: [...challenge.content.items, testJoker] },
    };
    const shop = enterShop(withDouble);

    expect(shop.shop?.cardOffers.some(({ item }) => item.kind === 'joker')).toBe(false);
    expect(
      shop.shop?.cardOffers.some(
        ({ item }) =>
          item.kind === 'consumable' &&
          (item.contentId.startsWith('bxqp:tarot:') ||
            item.contentId.startsWith('bxqp:spectral:')),
      ),
    ).toBe(false);
  });

  it('每次购买涨价在同一检查点重标剩余商品', () => {
    let run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'rising-prices-shop',
      challengeId: 'bxqp:challenge:rising-prices',
    });
    run = enterShop({ ...run, economy: { ...run.economy, money: 100 } });
    const [purchased, remaining] = run.shop!.cardOffers;
    if (!purchased || !remaining) throw new Error('涨价测试需要两个商品');
    const before = remaining.price;
    const result = executeCommandV2(run, {
      type: 'buy-shop-offer',
      checkpointId: run.checkpointId,
      offerId: purchased.id,
    });
    if (!result.ok) throw new Error(result.rejection.message);
    const next = result.state as RunStateV3;

    expect(next.rulesV3.purchasesMade).toBe(1);
    expect(next.shop?.cardOffers.find(({ id }) => id === remaining.id)?.price).toBe(
      before + 1,
    );
  });

  it('扩摊木牌即时填充新增商品位且保留已有商品', () => {
    let run = enterShop(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'fill-voucher-slot' }),
    );
    const existingIds = run.shop!.cardOffers.map(({ id }) => id);
    run = {
      ...run,
      economy: { ...run.economy, money: 100 },
      shop: {
        ...run.shop!,
        voucherOffer: {
          id: stableId<'voucher-offer'>('test:voucher-offer:third-stall'),
          voucherId: 'bxqp:voucher:third-stall',
          name: '三摊木牌',
          description: '扩充夜市随机商品位。',
          price: 10,
        },
      },
    };
    const result = executeCommandV2(run, {
      type: 'buy-voucher',
      checkpointId: run.checkpointId,
      offerId: run.shop!.voucherOffer!.id,
    });
    if (!result.ok) throw new Error(result.rejection.message);
    const next = result.state as RunStateV3;

    expect(next.rules.cardOfferSlots).toBe(3);
    expect(next.shop?.cardOffers).toHaveLength(3);
    expect(next.shop?.cardOffers.slice(0, 2).map(({ id }) => id)).toEqual(existingIds);
  });

  it('回幕木牌各自后退一幕并分别减少每轮出牌与弃牌次数', () => {
    const initial = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'rewind-voucher-pair',
    });
    let run = enterShop({
      ...initial,
      economy: { ...initial.economy, money: 100 },
      progress: { ...initial.progress, ante: 3 },
    });
    const buy = (voucherId: string, identity: string) => {
      const definition = run.content.vouchers.find(({ id }) => id === voucherId);
      if (!definition) throw new Error(`缺少木牌：${voucherId}`);
      const offerId = stableId<'voucher-offer'>(identity);
      run = {
        ...run,
        shop: {
          ...run.shop!,
          voucherOffer: {
            id: offerId,
            voucherId,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
        },
      };
      const result = executeCommandV2(run, {
        type: 'buy-voucher',
        checkpointId: run.checkpointId,
        offerId,
      });
      if (!result.ok) throw new Error(result.rejection.message);
      run = result.state as RunStateV3;
    };

    buy('bxqp:voucher:rewind-hand', 'test:voucher:rewind-hand');
    expect(run.progress.ante).toBe(2);
    expect(run.shop?.ante).toBe(2);
    expect(run.rules.handsPerRound).toBe(3);

    buy('bxqp:voucher:rewind-discard', 'test:voucher:rewind-discard');
    expect(run.progress.ante).toBe(1);
    expect(run.shop?.ante).toBe(1);
    expect(run.rules.discardsPerRound).toBe(3);
  });

  it('V26 才允许夜市散牌带强化、版本和印记，V05/V06 逐级提高奇牌版本率', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'shop-modifier-rolls',
    });
    const playingOnly = onlyItems(base, (item) => item.kind === 'playing-card');
    const samplePlayingCards = (voucherIds: readonly string[]) =>
      Array.from({ length: 120 }, (_, index) => {
        const state: RunStateV3 = {
          ...playingOnly,
          rngState: createRandomState(`shop-card-modifiers-${index}`),
          inventory: { ...playingOnly.inventory, voucherIds },
          rulesV3: { ...playingOnly.rulesV3, playingCardsInShop: true },
        };
        const created = createShopV2(state);
        if (!created.ok) throw new Error(created.message);
        return created.shop.cardOffers[0]?.item.generatedCard;
      }).filter(
        (card): card is NonNullable<typeof card> => card !== null && card !== undefined,
      );
    const plain = samplePlayingCards(['bxqp:voucher:card-stall']);
    const decorated = samplePlayingCards([
      'bxqp:voucher:card-stall',
      'bxqp:voucher:decorated-card-stall',
    ]);

    expect(
      plain.every(
        (card) =>
          card.enhancementId === null && card.editionId === null && card.sealId === null,
      ),
    ).toBe(true);
    expect(decorated.some(({ enhancementId }) => enhancementId !== null)).toBe(true);
    expect(decorated.some(({ editionId }) => editionId !== null)).toBe(true);
    expect(decorated.some(({ sealId }) => sealId !== null)).toBe(true);

    const jokerOnly: RunStateV3 = {
      ...base,
      content: { ...base.content, items: [testJoker] },
    };
    const editionCount = (voucherIds: readonly string[]) =>
      Array.from({ length: 2_000 }, (_, index) => {
        const state: RunStateV3 = {
          ...jokerOnly,
          rngState: createRandomState(`joker-edition-weight-${index}`),
          inventory: { ...jokerOnly.inventory, voucherIds },
        };
        const created = createShopV2(state);
        if (!created.ok) throw new Error(created.message);
        return created.shop.cardOffers[0]?.item.editionId !== null;
      }).filter(Boolean).length;
    const ordinary = editionCount([]);
    const bright = editionCount(['bxqp:voucher:bright-pigment']);
    const brilliant = editionCount([
      'bxqp:voucher:bright-pigment',
      'bxqp:voucher:brilliant-pigment',
    ]);

    expect(bright).toBeGreaterThan(ordinary);
    expect(brilliant).toBeGreaterThan(bright);
  });
});
