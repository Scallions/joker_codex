import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import {
  purchasePrice,
  roundHalfDown,
  saleValue,
} from '../../src/game-core/economy/pricing';
import { materializeItemV2 } from '../../src/game-core/economy/shopV2';
import { stableId } from '../../src/game-core/model/ids';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { validateRunStateV2 } from '../../src/game-core/invariants/validateRunStateV2';
import { runStateV2Schema } from '../../src/persistence/schemasV2';

function apply(state: RunStateV2, command: RunCommandV2): RunStateV2 {
  const result = executeCommandV2(state, command);
  if (!result.ok)
    throw new Error(`${result.rejection.code}: ${result.rejection.message}`);
  expect(validateRunStateV2(result.state)).toEqual({ ok: true });
  expect(runStateV2Schema.parse(structuredClone(result.state))).toEqual(result.state);
  return result.state;
}

function reachFirstShop(config: Parameters<typeof createRunEconomyFixtureRun>[0]) {
  let state = createRunEconomyFixtureRun({
    ...config,
    targetScaleBasisPoints: 1,
    startingJokerContentIds: [
      'fixture:run-economy:item:joker:brass-drum',
      ...(config.startingJokerContentIds ?? []),
    ],
  });
  state = apply(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: 'small',
  });
  const cardId = state.round?.handIds[0];
  if (!cardId) throw new Error('缺少手牌');
  state = apply(state, {
    type: 'toggle-card',
    checkpointId: state.checkpointId,
    cardId,
  });
  state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
  expect(state.phase.kind).toBe('round-reward');
  return apply(state, {
    type: 'claim-round-reward',
    checkpointId: state.checkpointId,
  });
}

describe('价格与奖励基准', () => {
  it('使用半值向下、折扣、最低价与动态售价', () => {
    expect([1.49, 1.5, 1.51].map(roundHalfDown)).toEqual([1, 1, 2]);
    expect(purchasePrice(6, 0, 7_500)).toBe(4);
    expect(purchasePrice(1, 0, 1_000)).toBe(1);
    expect(purchasePrice(0, 0, 7_500)).toBe(0);
    expect(saleValue(7, 0, 10_000, null)).toBe(3);
    expect(saleValue(7, 0, 10_000, 9)).toBe(9);
  });

  it('奖励收据冻结盲注、剩余出牌和利息，领取后只入账一次', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'reward-receipt',
      startingMoney: 10,
      targetScaleBasisPoints: 1,
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
    });
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    const cardId = state.round!.handIds[0]!;
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
    state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
    expect(state.economy.pendingReward).toMatchObject({
      blindReward: 3,
      remainingHandReward: 3,
      interestReward: 2,
      total: 8,
    });
    const receiptId = state.economy.pendingReward!.id;
    state = apply(state, {
      type: 'claim-round-reward',
      checkpointId: state.checkpointId,
    });
    expect(state.economy.money).toBe(18);
    expect(state.economy.claimedRewardIds).toContain(receiptId);
    const rejected = executeCommandV2(state, {
      type: 'claim-round-reward',
      checkpointId: state.checkpointId,
    });
    expect(rejected).toMatchObject({ ok: false, rejection: { code: 'illegal-phase' } });
  });

  it('回合末效果先改变余额，再计算利息并物化额外收据行', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'ordered-reward-effects',
      startingMoney: 10,
      targetScaleBasisPoints: 1,
      startingJokerContentIds: [
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:tip-jar',
      ],
    });
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.contentId.endsWith('tip-jar')
            ? {
                ...joker,
                effects: [
                  {
                    id: 'test:round-end-money',
                    handlerId: 'fixture:run-economy:handler:add-money',
                    windows: ['round-end'],
                    priority: -1,
                    parameters: { amount: 5 },
                  },
                  ...joker.effects,
                ],
              }
            : joker,
        ),
      },
    };
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    const cardId = state.round?.handIds[0];
    if (!cardId) throw new Error('缺少手牌');
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
    state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });

    expect(state.economy.money).toBe(15);
    expect(state.economy.pendingReward).toMatchObject({
      blindReward: 3,
      remainingHandReward: 3,
      interestReward: 3,
      effectLines: [{ label: '彩头奇牌', amount: 2 }],
      total: 11,
    });
    state = apply(state, {
      type: 'claim-round-reward',
      checkpointId: state.checkpointId,
    });
    expect(state.economy.money).toBe(26);
  });

  it('允许在欠票额度内支付，超额付款则不改变商品、随机和检查点', () => {
    let state = reachFirstShop({ seed: 'allowed-debt', startingMoney: 10 });
    const first = state.shop?.cardOffers[0];
    if (!first || !state.shop) throw new Error('缺少欠票测试商品');
    state = {
      ...state,
      rules: { ...state.rules, allowedDebt: 5 },
      economy: { ...state.economy, money: 0 },
      shop: {
        ...state.shop,
        cardOffers: [{ ...first, price: 4 }, ...state.shop.cardOffers.slice(1)],
      },
    };
    state = apply(state, {
      type: 'buy-shop-offer',
      checkpointId: state.checkpointId,
      offerId: first.id,
    });
    expect(state.economy.money).toBe(-4);

    const second = state.shop?.cardOffers[0];
    if (!second || !state.shop) throw new Error('缺少第二件商品');
    state = {
      ...state,
      shop: { ...state.shop, cardOffers: [{ ...second, price: 2 }] },
    };
    const before = structuredClone(state);
    expect(
      executeCommandV2(state, {
        type: 'buy-shop-offer',
        checkpointId: state.checkpointId,
        offerId: second.id,
      }),
    ).toMatchObject({ ok: false, rejection: { code: 'insufficient-funds' } });
    expect(state).toEqual(before);
  });
});

describe('夜市物化与交易', () => {
  it('首次夜市完整物化商品、保底奇牌包和本幕木牌，存读不重抽', () => {
    const state = reachFirstShop({ seed: 'materialized-shop', startingMoney: 30 });
    expect(state.phase).toEqual({ kind: 'shop' });
    expect(state.shop?.cardOffers).toHaveLength(2);
    expect(state.shop?.packOffers).toHaveLength(2);
    expect(state.shop?.packOffers[0]?.packId).toBe(
      'fixture:run-economy:pack:buffoon-normal',
    );
    expect(state.shop?.voucherOffer).not.toBeNull();
    expect(runStateV2Schema.safeParse(structuredClone(state)).success).toBe(true);
    expect(structuredClone(state.shop)).toEqual(state.shop);
  });

  it('换摊仅替换剩余普通商品，费用按 5+n 增长且拒绝时不耗钱不耗随机', () => {
    let state = reachFirstShop({ seed: 'shop-reroll', startingMoney: 30 });
    const packs = state.shop!.packOffers;
    const voucher = state.shop!.voucherOffer;
    const money = state.economy.money;
    state = apply(state, { type: 'reroll-shop', checkpointId: state.checkpointId });
    expect(state.economy.money).toBe(money - 5);
    expect(state.shop?.rerollCost).toBe(6);
    expect(state.shop?.packOffers).toEqual(packs);
    expect(state.shop?.voucherOffer).toEqual(voucher);

    const poor: RunStateV2 = { ...state, economy: { ...state.economy, money: 0 } };
    const before = structuredClone(poor);
    const rejected = executeCommandV2(poor, {
      type: 'reroll-shop',
      checkpointId: poor.checkpointId,
    });
    expect(rejected).toMatchObject({
      ok: false,
      rejection: { code: 'insufficient-funds' },
    });
    expect(poor).toEqual(before);
  });

  it('购买普通商品、调整奇牌顺序并出售后都只结算一次', () => {
    let state = reachFirstShop({
      seed: 'shop-items',
      startingMoney: 50,
      startingJokerContentIds: ['fixture:run-economy:item:joker:double-mask'],
    });
    const originalFirst = state.inventory.jokers[0]!;
    const originalSecond = state.inventory.jokers[1]!;
    state = apply(state, {
      type: 'reorder-joker',
      checkpointId: state.checkpointId,
      jokerInstanceId: originalFirst.instanceId,
      toIndex: 1,
    });
    expect(state.inventory.jokers.map((joker) => joker.instanceId)).toEqual([
      originalSecond.instanceId,
      originalFirst.instanceId,
    ]);
    const beforeSale = state.economy.money;
    state = apply(state, {
      type: 'sell-joker',
      checkpointId: state.checkpointId,
      jokerInstanceId: originalFirst.instanceId,
    });
    expect(state.economy.money).toBeGreaterThan(beforeSale);

    const offer = state.shop!.cardOffers[0]!;
    const beforeBuy = state.economy.money;
    state = apply(state, {
      type: 'buy-shop-offer',
      checkpointId: state.checkpointId,
      offerId: offer.id,
    });
    expect(state.economy.money).toBe(beforeBuy - offer.price);
    expect(state.shop?.cardOffers.some((candidate) => candidate.id === offer.id)).toBe(
      false,
    );
  });

  it('奇牌栏位已满时仍可购买零栏位贡献的奇牌', () => {
    let state = reachFirstShop({
      seed: 'zero-slot-joker',
      startingMoney: 50,
      startingJokerContentIds: [
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:brass-drum',
      ],
    });
    expect(state.inventory.jokers).toHaveLength(state.rules.jokerSlots);
    const definition = state.content.items.find(
      (item) => item.contentId === 'fixture:run-economy:item:joker:paper-shadow',
    );
    const offer = state.shop?.cardOffers[0];
    if (!definition || !offer || !state.shop) {
      throw new Error('缺少零栏位商品测试数据');
    }
    const materialized = materializeItemV2(definition, offer.id, state.rngState);
    state = {
      ...state,
      shop: {
        ...state.shop,
        cardOffers: [
          { ...offer, item: materialized.item, price: definition.baseCost },
          ...state.shop.cardOffers.slice(1),
        ],
      },
    };

    state = apply(state, {
      type: 'buy-shop-offer',
      checkpointId: state.checkpointId,
      offerId: offer.id,
    });

    expect(state.inventory.jokers).toHaveLength(state.rules.jokerSlots + 1);
    expect(
      state.inventory.jokers.reduce((total, joker) => total + joker.slotContribution, 0),
    ).toBe(state.rules.jokerSlots);
    expect(state.inventory.jokers.at(-1)).toMatchObject({
      contentId: definition.contentId,
      slotContribution: 0,
    });
  });

  it('兑换折价木牌会永久记录并立即重标剩余商品', () => {
    let state = reachFirstShop({ seed: 'voucher-discount', startingMoney: 100 });
    const definition = state.content.vouchers.find(
      (voucher) => voucher.id === 'fixture:run-economy:voucher:half-price',
    )!;
    const offerId = stableId<'voucher-offer'>('test:voucher:half-price');
    state = {
      ...state,
      shop: {
        ...state.shop!,
        voucherOffer: {
          id: offerId,
          voucherId: definition.id,
          name: definition.name,
          description: definition.description,
          price: definition.cost,
        },
      },
    };
    const oldPrice = state.shop!.cardOffers[0]!.price;
    state = apply(state, {
      type: 'buy-voucher',
      checkpointId: state.checkpointId,
      offerId,
    });
    expect(state.rules.priceDiscountBasisPoints).toBe(7_500);
    expect(state.inventory.voucherIds).toContain(definition.id);
    expect(state.shop?.voucherOffer).toBeNull();
    expect(state.shop!.cardOffers[0]!.price).toBeLessThanOrEqual(oldPrice);
  });
});

describe('卡包与目标选择栈', () => {
  it('购买保底奇牌包后物化选项，选择一次即获得奇牌并返回夜市', () => {
    let state = reachFirstShop({ seed: 'buffoon-pack', startingMoney: 50 });
    const offer = state.shop!.packOffers.find((pack) =>
      pack.packId.endsWith('buffoon-normal'),
    )!;
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId: offer.id,
    });
    expect(state.pendingChoice?.current).toMatchObject({
      kind: 'pack',
      remainingPicks: 1,
    });
    const savedOptions = structuredClone(state.pendingChoice?.current);
    expect(structuredClone(state.pendingChoice?.current)).toEqual(savedOptions);
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少卡包选择');
    const choice = state.pendingChoice.current;
    const option = choice.options[0]!;
    const jokerCount = state.inventory.jokers.length;
    state = apply(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
      optionId: option.id,
    });
    expect(state.phase).toEqual({ kind: 'shop' });
    expect(state.inventory.jokers).toHaveLength(jokerCount + 1);
  });

  it('栏位已满时拒绝卡包奇牌且不消耗选项', () => {
    let state = reachFirstShop({
      seed: 'full-joker-rack',
      startingMoney: 50,
      startingJokerContentIds: [
        'fixture:run-economy:item:joker:double-mask',
        'fixture:run-economy:item:joker:echo',
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:double-mask',
      ],
    });
    const offer = state.shop!.packOffers.find((pack) =>
      pack.packId.endsWith('buffoon-normal'),
    )!;
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId: offer.id,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少卡包选择');
    const choice = state.pendingChoice.current;
    const before = structuredClone(state);
    const rejected = executeCommandV2(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
      optionId: choice.options[0]!.id,
    });
    expect(rejected).toMatchObject({ ok: false, rejection: { code: 'inventory-full' } });
    expect(state).toEqual(before);
  });

  it('卡包临时栏位仅消耗一次，并物化为该奇牌实例的栏位豁免', () => {
    let state = reachFirstShop({
      seed: 'temporary-pack-capacity',
      startingMoney: 50,
      startingJokerContentIds: [
        'fixture:run-economy:item:joker:double-mask',
        'fixture:run-economy:item:joker:echo',
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:double-mask',
      ],
    });
    const definition = state.content.packs.find((pack) =>
      pack.id.endsWith('buffoon-mega'),
    );
    const offer = state.shop?.packOffers[0];
    if (!definition || !offer || !state.shop) throw new Error('缺少临时栏位卡包');
    state = {
      ...state,
      shop: {
        ...state.shop,
        packOffers: [
          {
            ...offer,
            packId: definition.id,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
          ...state.shop.packOffers.slice(1),
        ],
      },
    };
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId: offer.id,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少卡包选择');
    const choice = state.pendingChoice.current;
    const option = choice.options.find(
      (candidate) =>
        candidate.item.kind === 'joker' && candidate.item.slotContribution === 1,
    );
    if (!option) throw new Error('缺少占用栏位的卡包奇牌');

    state = apply(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
      optionId: option.id,
    });

    expect(state.pendingChoice?.current).toMatchObject({
      kind: 'pack',
      remainingPicks: 1,
      temporaryJokerSlots: 0,
    });
    expect(state.inventory.jokers).toHaveLength(state.rules.jokerSlots + 1);
    expect(state.inventory.jokers.at(-1)?.slotContribution).toBe(0);
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少剩余卡包');
    state = apply(state, {
      type: 'skip-pack',
      checkpointId: state.checkpointId,
      choiceId: state.pendingChoice.current.id,
    });
    expect(state.phase).toEqual({ kind: 'shop' });
  });

  it('消耗牌目标选择可保存、确认后改牌并消费来源', () => {
    let state = reachFirstShop({
      seed: 'target-choice',
      startingMoney: 30,
      startingConsumableContentIds: ['fixture:run-economy:item:consumable:ace-paint'],
    });
    const consumable = state.inventory.consumables[0]!;
    const target = state.deck.cards.find((card) => card.rank !== 'ace')!;
    state = apply(state, {
      type: 'begin-consumable-choice',
      checkpointId: state.checkpointId,
      consumableInstanceId: consumable.instanceId,
    });
    if (state.pendingChoice?.current.kind !== 'targets') throw new Error('缺少目标选择');
    const choice = state.pendingChoice.current;
    state = apply(state, {
      type: 'toggle-choice-target',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
      targetId: target.id,
    });
    expect(state.pendingChoice?.current).toMatchObject({ selectedIds: [target.id] });
    state = apply(state, {
      type: 'confirm-choice',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
    });
    expect(state.phase).toEqual({ kind: 'shop' });
    expect(state.deck.cards.find((card) => card.id === target.id)?.rank).toBe('ace');
    expect(state.inventory.consumables).toHaveLength(0);
  });

  it('目标效果可转化卡牌增强且存读后不重复执行', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'transform-card',
      startingConsumableContentIds: ['fixture:run-economy:item:consumable:ace-paint'],
    });
    const source = state.inventory.consumables[0];
    if (!source) throw new Error('缺少转化消耗牌');
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        consumables: [
          {
            ...source,
            effects: [
              {
                id: 'test:transform:wild',
                handlerId: 'fixture:run-economy:handler:transform-card',
                windows: ['item-acquired'],
                priority: 0,
                parameters: {
                  enhancementId: 'fixture:run-economy:enhancement:wild',
                },
              },
            ],
          },
        ],
      },
    };
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    const targetId = state.round?.handIds[0];
    if (!targetId) throw new Error('缺少转化目标');
    state = apply(state, {
      type: 'begin-consumable-choice',
      checkpointId: state.checkpointId,
      consumableInstanceId: source.instanceId,
    });
    if (state.pendingChoice?.current.kind !== 'targets') throw new Error('缺少目标选择');
    const choiceId = state.pendingChoice.current.id;
    state = apply(state, {
      type: 'toggle-choice-target',
      checkpointId: state.checkpointId,
      choiceId,
      targetId,
    });
    state = apply(state, {
      type: 'confirm-choice',
      checkpointId: state.checkpointId,
      choiceId,
    });

    expect(state.deck.cards.find((card) => card.id === targetId)?.enhancementId).toBe(
      'fixture:run-economy:enhancement:wild',
    );
    expect(runStateV2Schema.parse(structuredClone(state))).toEqual(state);
  });

  it('销毁效果同时守恒永久牌组与回合牌区并结算收益', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'destroy-card',
      startingMoney: 7,
      startingConsumableContentIds: ['fixture:run-economy:item:consumable:burn-card'],
    });
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    const consumable = state.inventory.consumables[0];
    const targetId = state.round?.handIds[0];
    if (!consumable || !targetId) throw new Error('缺少销毁效果夹具');
    const deckSize = state.deck.cards.length;
    const money = state.economy.money;
    state = apply(state, {
      type: 'begin-consumable-choice',
      checkpointId: state.checkpointId,
      consumableInstanceId: consumable.instanceId,
    });
    if (state.pendingChoice?.current.kind !== 'targets') throw new Error('缺少目标选择');
    const choiceId = state.pendingChoice.current.id;
    state = apply(state, {
      type: 'toggle-choice-target',
      checkpointId: state.checkpointId,
      choiceId,
      targetId,
    });
    state = apply(state, {
      type: 'confirm-choice',
      checkpointId: state.checkpointId,
      choiceId,
    });

    expect(state.deck.cards).toHaveLength(deckSize - 1);
    expect(state.deck.cards.some((card) => card.id === targetId)).toBe(false);
    expect(state.round?.handIds).not.toContain(targetId);
    expect(state.economy.money).toBe(money + 3);
    expect(state.inventory.consumables).toHaveLength(0);
  });

  it('戏牌包会把已物化的新牌加入永久牌组', () => {
    let state = reachFirstShop({ seed: 'standard-pack', startingMoney: 50 });
    const definition = state.content.packs.find((pack) =>
      pack.id.endsWith('standard-normal'),
    )!;
    const offerId = stableId<'pack-offer'>('test:pack:standard');
    state = {
      ...state,
      shop: {
        ...state.shop!,
        packOffers: [
          {
            id: offerId,
            packId: definition.id,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
        ],
      },
    };
    const deckSize = state.deck.cards.length;
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少卡包选择');
    const choice = state.pendingChoice.current;
    state = apply(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
      optionId: choice.options[0]!.id,
    });
    expect(state.deck.cards).toHaveLength(deckSize + 1);
    expect(state.deck.cards.at(-1)?.id).toContain('playing:generated:');
  });

  it('戏谱包选中后立即提升牌型，不占用消耗牌栏位', () => {
    let state = reachFirstShop({ seed: 'celestial-pack', startingMoney: 50 });
    const definition = state.content.packs.find((pack) =>
      pack.id.endsWith('celestial-normal'),
    )!;
    const offerId = stableId<'pack-offer'>('test:pack:celestial');
    state = {
      ...state,
      shop: {
        ...state.shop!,
        packOffers: [
          {
            id: offerId,
            packId: definition.id,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
        ],
      },
    };
    const consumableCount = state.inventory.consumables.length;
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少戏谱选择');
    const choice = state.pendingChoice.current;
    expect(choice.options).toHaveLength(3);
    expect(
      choice.options.every((option) => option.item.contentId.endsWith('pair-script')),
    ).toBe(true);
    state = apply(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
      optionId: choice.options[0]!.id,
    });

    expect(state.phase).toEqual({ kind: 'shop' });
    expect(state.rules.handLevels.pair).toBe(2);
    expect(state.inventory.consumables).toHaveLength(consumableCount);
  });

  it('持有的无目标戏谱可在回合中立即使用并移出栏位', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'owned-level-card',
      startingConsumableContentIds: ['fixture:run-economy:item:consumable:pair-script'],
    });
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    const consumable = state.inventory.consumables[0];
    if (!consumable) throw new Error('缺少戏谱');
    state = apply(state, {
      type: 'begin-consumable-choice',
      checkpointId: state.checkpointId,
      consumableInstanceId: consumable.instanceId,
    });

    expect(state.phase).toEqual({ kind: 'round' });
    expect(state.rules.handLevels.pair).toBe(2);
    expect(state.inventory.consumables).toHaveLength(0);
  });

  it('卡包候选池为空时显式拒绝，不扣款、不移除商品、不消耗随机', () => {
    let state = reachFirstShop({ seed: 'empty-pack-pool', startingMoney: 50 });
    const definition = state.content.packs.find((pack) =>
      pack.id.endsWith('celestial-normal'),
    )!;
    const offerId = stableId<'pack-offer'>('test:pack:empty');
    state = {
      ...state,
      content: {
        ...state.content,
        items: state.content.items.filter(
          (item) => item.kind !== 'consumable' || item.family !== 'planet',
        ),
      },
      shop: {
        ...state.shop!,
        packOffers: [
          {
            id: offerId,
            packId: definition.id,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
        ],
      },
    };
    const before = structuredClone(state);
    expect(
      executeCommandV2(state, {
        type: 'buy-pack',
        checkpointId: state.checkpointId,
        offerId,
      }),
    ).toMatchObject({ ok: false, rejection: { code: 'pool-empty' } });
    expect(state).toEqual(before);
  });

  it('变牌包通过子目标帧结算并恢复父卡包，不重新生成选项', () => {
    let state = reachFirstShop({ seed: 'arcana-pack', startingMoney: 50 });
    const definition = state.content.packs.find((pack) =>
      pack.id.endsWith('arcana-normal'),
    )!;
    const offerId = stableId<'pack-offer'>('test:pack:arcana');
    state = {
      ...state,
      shop: {
        ...state.shop!,
        packOffers: [
          {
            id: offerId,
            packId: definition.id,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
        ],
      },
    };
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少父卡包');
    const parent = structuredClone(state.pendingChoice.current);
    const option = state.pendingChoice.current.options[0]!;
    state = apply(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: parent.id,
      optionId: option.id,
    });
    expect(state.pendingChoice?.suspended).toEqual([parent]);
    if (state.pendingChoice?.current.kind !== 'targets') throw new Error('缺少目标子帧');
    const targetChoice = state.pendingChoice.current;
    state = apply(state, {
      type: 'toggle-choice-target',
      checkpointId: state.checkpointId,
      choiceId: targetChoice.id,
      targetId: targetChoice.eligibleIds[0]!,
    });
    state = apply(state, {
      type: 'confirm-choice',
      checkpointId: state.checkpointId,
      choiceId: targetChoice.id,
    });
    expect(state.phase).toEqual({ kind: 'shop' });
    expect(state.pendingChoice).toBeNull();
  });

  it('压轴奇牌包支持四选二，并可主动跳过剩余选择', () => {
    let state = reachFirstShop({ seed: 'mega-pack', startingMoney: 50 });
    const definition = state.content.packs.find((pack) =>
      pack.id.endsWith('buffoon-mega'),
    )!;
    const offerId = stableId<'pack-offer'>('test:pack:mega');
    state = {
      ...state,
      shop: {
        ...state.shop!,
        packOffers: [
          {
            id: offerId,
            packId: definition.id,
            name: definition.name,
            description: definition.description,
            price: definition.cost,
          },
        ],
      },
    };
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少卡包选择');
    const first = state.pendingChoice.current;
    expect(first.options).toHaveLength(4);
    expect(first.remainingPicks).toBe(2);
    state = apply(state, {
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: first.id,
      optionId: first.options[0]!.id,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少第二次选择');
    expect(state.pendingChoice.current.remainingPicks).toBe(1);
    state = apply(state, {
      type: 'skip-pack',
      checkpointId: state.checkpointId,
      choiceId: state.pendingChoice.current.id,
    });
    expect(state.phase).toEqual({ kind: 'shop' });
  });
});

describe('木牌与本幕持久性', () => {
  it('未购买的本幕木牌会在下一间夜市保持同一内容', () => {
    let state = reachFirstShop({ seed: 'stable-ante-voucher', startingMoney: 50 });
    const voucherId = state.shop?.voucherOffer?.voucherId;
    expect(voucherId).toBeDefined();
    state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'big',
    });
    const cardId = state.round!.handIds[0]!;
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
    state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
    state = apply(state, {
      type: 'claim-round-reward',
      checkpointId: state.checkpointId,
    });
    expect(state.shop?.voucherOffer?.voucherId).toBe(voucherId);
  });

  it.each([
    ['fixture:run-economy:voucher:wide-rack', 'jokerSlots', 6],
    ['fixture:run-economy:voucher:interest', 'interestCap', 10],
    ['fixture:run-economy:voucher:quick-turn', 'baseRerollCost', 3],
  ] as const)('%s 兑换后立即并永久修改运行规则', (voucherId, field, value) => {
    let state = reachFirstShop({
      seed: `voucher-rule:${voucherId}`,
      startingMoney: 100,
    });
    const definition = state.content.vouchers.find((voucher) => voucher.id === voucherId);
    if (!definition || !state.shop) throw new Error('缺少木牌定义');
    const offerId = stableId<'voucher-offer'>(`test:${voucherId}`);
    state = {
      ...state,
      progress: { ...state.progress, anteVoucherId: definition.id },
      shop: {
        ...state.shop,
        voucherOffer: {
          id: offerId,
          voucherId: definition.id,
          name: definition.name,
          description: definition.description,
          price: definition.cost,
        },
      },
    };

    state = apply(state, {
      type: 'buy-voucher',
      checkpointId: state.checkpointId,
      offerId,
    });

    expect(state.rules[field]).toBe(value);
    expect(state.inventory.voucherIds).toContain(voucherId);
    if (field === 'baseRerollCost') expect(state.shop?.rerollCost).toBe(value);
  });

  it('木牌前置条件在物化和兑换时都强制执行', () => {
    let state = reachFirstShop({ seed: 'voucher-prerequisite', startingMoney: 100 });
    const prerequisiteId = 'fixture:run-economy:voucher:wide-rack';
    const definition = state.content.vouchers.find((voucher) =>
      voucher.id.endsWith('wide-rack-plus'),
    );
    if (!definition || !state.shop) throw new Error('缺少前置木牌');
    const offerId = stableId<'voucher-offer'>('test:voucher:wide-rack-plus');
    const offered: RunStateV2 = {
      ...state,
      progress: { ...state.progress, anteVoucherId: definition.id },
      shop: {
        ...state.shop,
        voucherOffer: {
          id: offerId,
          voucherId: definition.id,
          name: definition.name,
          description: definition.description,
          price: definition.cost,
        },
      },
    };
    const before = structuredClone(offered);
    expect(
      executeCommandV2(offered, {
        type: 'buy-voucher',
        checkpointId: offered.checkpointId,
        offerId,
      }),
    ).toMatchObject({ ok: false, rejection: { code: 'offer-not-found' } });
    expect(offered).toEqual(before);

    state = {
      ...offered,
      rules: { ...offered.rules, jokerSlots: offered.rules.jokerSlots + 1 },
      inventory: {
        ...offered.inventory,
        voucherIds: [prerequisiteId],
      },
    };
    state = apply(state, {
      type: 'buy-voucher',
      checkpointId: state.checkpointId,
      offerId,
    });
    expect(state.inventory.voucherIds).toEqual([prerequisiteId, definition.id]);
    expect(state.rules.jokerSlots).toBe(7);
  });

  it('换班木牌冻结确认帧，确认时扣款并持久替换班主', () => {
    let state = reachFirstShop({ seed: 'boss-reroll-voucher', startingMoney: 100 });
    const definition = state.content.vouchers.find((voucher) =>
      voucher.id.endsWith('boss-reroll'),
    )!;
    const offerId = stableId<'voucher-offer'>('test:voucher:boss-reroll');
    state = {
      ...state,
      shop: {
        ...state.shop!,
        voucherOffer: {
          id: offerId,
          voucherId: definition.id,
          name: definition.name,
          description: definition.description,
          price: definition.cost,
        },
      },
    };
    state = apply(state, {
      type: 'buy-voucher',
      checkpointId: state.checkpointId,
      offerId,
    });
    state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
    state = apply(state, {
      type: 'skip-blind',
      checkpointId: state.checkpointId,
      position: 'big',
    });
    const oldBoss = state.progress.lineup.boss.definitionId;
    const beforeMoney = state.economy.money;
    state = apply(state, {
      type: 'request-boss-reroll',
      checkpointId: state.checkpointId,
    });
    expect(state.economy.money).toBe(beforeMoney);
    if (state.pendingChoice?.current.kind !== 'boss-reroll') {
      throw new Error('缺少换班确认');
    }
    const choice = state.pendingChoice.current;
    state = apply(state, {
      type: 'confirm-choice',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
    });
    expect(state.economy.money).toBe(beforeMoney - 10);
    expect(state.progress.lineup.boss.definitionId).not.toBe(oldBoss);
    expect(state.progress.bossRerollCount).toBe(1);
  });
});

describe('戏签', () => {
  it('立即赏钱戏签在跳盲命令中入账并标记已消费', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'money-tag', startingMoney: 4 });
    const state: RunStateV2 = {
      ...initial,
      progress: {
        ...initial.progress,
        lineup: {
          ...initial.progress.lineup,
          smallTagId: 'fixture:run-economy:tag:coin-purse',
        },
      },
    };
    const next = apply(state, {
      type: 'skip-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    expect(next.economy.money).toBe(7);
    expect(next.inventory.tags[0]).toMatchObject({ consumed: true });
  });

  it('赠包和换摊戏签只在下一间夜市生效一次', () => {
    let initial = createRunEconomyFixtureRun({
      seed: 'shop-tags',
      startingMoney: 20,
      targetScaleBasisPoints: 1,
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
    });
    initial = {
      ...initial,
      inventory: {
        ...initial.inventory,
        tags: [
          {
            instanceId: 'test:free-pack',
            contentId: 'fixture:run-economy:tag:free-pack',
            consumed: false,
            deferredWindow: 'shop-entered',
          },
          {
            instanceId: 'test:free-reroll',
            contentId: 'fixture:run-economy:tag:free-reroll',
            consumed: false,
            deferredWindow: 'shop-entered',
          },
        ],
      },
    };
    let state = apply(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    const cardId = state.round!.handIds[0]!;
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
    state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
    state = apply(state, {
      type: 'claim-round-reward',
      checkpointId: state.checkpointId,
    });
    expect(state.shop?.packOffers.some((offer) => offer.price === 0)).toBe(true);
    expect(state.shop?.freeRerollAvailable).toBe(true);
    expect(state.inventory.tags.every((tag) => tag.consumed)).toBe(true);
    const money = state.economy.money;
    state = apply(state, { type: 'reroll-shop', checkpointId: state.checkpointId });
    expect(state.economy.money).toBe(money);
    expect(state.shop?.freeRerollAvailable).toBe(false);
  });
});
