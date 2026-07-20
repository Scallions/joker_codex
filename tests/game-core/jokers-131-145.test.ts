import { materializeItemV2, repriceShopV2 } from '../../src/game-core/economy/shopV2';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import { validateRunStateV6 } from '../../src/game-core/invariants/validateRunStateV6';
import { resolveJokerPassiveCapabilities } from '../../src/game-core/rules/jokerPassiveCapabilitiesV3';
import {
  acquireV6,
  commandV6,
  enterShopV6,
  initialV6,
  scoreV6,
  v6Card,
  withoutJokersV6,
} from '../helpers/jokerV6';

describe('奇牌 J131-J145 执行合约', () => {
  it.each([
    {
      ordinal: 131,
      factor: 2,
      cards: [v6Card('j131-a', 'clubs', '6'), v6Card('j131-b', 'hearts', '6')],
    },
    {
      ordinal: 132,
      factor: 3,
      cards: [
        v6Card('j132-a', 'clubs', '6'),
        v6Card('j132-b', 'hearts', '6'),
        v6Card('j132-c', 'spades', '6'),
      ],
    },
    {
      ordinal: 133,
      factor: 4,
      cards: [
        v6Card('j133-a', 'clubs', '6'),
        v6Card('j133-b', 'hearts', '6'),
        v6Card('j133-c', 'spades', '6'),
        v6Card('j133-d', 'diamonds', '6'),
      ],
    },
    {
      ordinal: 134,
      factor: 3,
      cards: [
        v6Card('j134-a', 'clubs', '2'),
        v6Card('j134-b', 'hearts', '3'),
        v6Card('j134-c', 'spades', '4'),
        v6Card('j134-d', 'diamonds', '5'),
        v6Card('j134-e', 'clubs', '6'),
      ],
    },
    {
      ordinal: 135,
      factor: 2,
      cards: [
        v6Card('j135-a', 'clubs', '2'),
        v6Card('j135-b', 'clubs', '4'),
        v6Card('j135-c', 'clubs', '7'),
        v6Card('j135-d', 'clubs', '9'),
        v6Card('j135-e', 'clubs', 'king'),
      ],
    },
  ])('J$ordinal 对包含的目标牌型应用 ×$factor', ({ ordinal, factor, cards }) => {
    const state = acquireV6(initialV6(`j${ordinal}`), ordinal);
    const control = scoreV6(withoutJokersV6(state), cards);
    expect(scoreV6(state, cards).breakdown.multiplier).toBe(
      control.breakdown.multiplier * factor,
    );
  });

  it('J136 输出 +250 筹码，但手牌上限被动不可由路由复制', () => {
    const state = acquireV6(initialV6('j136'), 136);
    const card = v6Card('j136-card', 'clubs', 'ace');
    const control = scoreV6(withoutJokersV6(state), [card]);
    expect(scoreV6(state, [card]).breakdown.cardChips - control.breakdown.cardChips).toBe(
      250,
    );
    expect(resolveJokerPassiveCapabilities(state)).toMatchObject({
      ok: true,
      capabilities: { handSizeDelta: -2 },
    });
  });

  it('J137 满两场后出售，复制其他奇牌并可形成精确容量债务', () => {
    let state = acquireV6(initialV6('j137-sale-clone'), 137);
    state = acquireV6(state, 101);
    const source = state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:137',
    )!;
    state = {
      ...state,
      rules: { ...state.rules, jokerSlots: 1 },
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === source.instanceId
            ? {
                ...joker,
                editionId: 'bxqp:edition:shadow-cutout',
                editionCost: 5,
                slotContribution: 0,
              }
            : joker,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        jokers: state.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === source.instanceId
            ? {
                ...modifier,
                slotContribution: 0,
                abilityState: { ...modifier.abilityState, roundsReady: 2 },
              }
            : modifier,
        ),
      },
    };
    state = enterShopV6(state);
    const sold = commandV6(state, {
      type: 'sell-joker',
      jokerInstanceId: source.instanceId,
    });
    expect(
      sold.inventory.jokers.filter(({ contentId }) => contentId === 'bxqp:joker:101'),
    ).toHaveLength(2);
    expect(
      sold.inventory.jokers.some(({ contentId }) => contentId === 'bxqp:joker:137'),
    ).toBe(false);
    expect(sold.jokerRuntimeV6.jokerCapacityDebt).toBe(1);
    expect(validateRunStateV6(sold)).toEqual({ ok: true });
  });

  it('J139 按本牌局使用过的不同星谱数量在回合结束支付', () => {
    let state = acquireV6(initialV6('j139-history'), 139);
    const planetIds = state.content.items
      .filter((item) => item.kind === 'consumable' && item.family === 'planet')
      .slice(0, 2)
      .map(({ contentId }) => contentId);
    expect(planetIds).toHaveLength(2);
    state = {
      ...state,
      history: {
        ...state.history,
        effectObservations: [planetIds[0]!, planetIds[0]!, planetIds[1]!].map(
          (contentId, index) => ({
            window: 'item-acquired' as const,
            key: 'consumable-used',
            value: contentId,
            sourceInstanceId: `planet:${index}`,
            effectId: `planet:${index}`,
            checkpointId: state.checkpointId,
          }),
        ),
      },
    };
    const settled = applyRunWindowEffectsV2(state, 'round-end', {
      eventContext: {
        eventFacts: { kind: 'blind-result', position: 'small', defeated: true },
        eventCardIdentities: {},
      },
    });
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    expect(settled.state.economy.money - state.economy.money).toBe(2);
  });

  it('J140 对每张留手非失效 Q 给予 +13 倍率', () => {
    let state = commandV6(acquireV6(initialV6('j140-held'), 140), {
      type: 'select-blind',
      position: 'small',
    });
    const queen = v6Card('j140-queen', 'hearts', 'queen');
    const played = v6Card('j140-played', 'clubs', 'ace');
    state = {
      ...state,
      deck: { cards: [...state.deck.cards, queen, played] },
      round: state.round
        ? { ...state.round, handIds: [...state.round.handIds, queen.id] }
        : null,
    };
    const control = scoreV6(withoutJokersV6(state), [played]);
    expect(
      scoreV6(state, [played]).breakdown.multiplier - control.breakdown.multiplier,
    ).toBe(13);
  });

  it('J141 读取完整牌组的 16 张强化牌，不依赖当前出牌', () => {
    let state = acquireV6(initialV6('j141-enhanced'), 141);
    const enhanced = new Set(state.deck.cards.slice(0, 16).map(({ id }) => id));
    state = {
      ...state,
      deck: {
        cards: state.deck.cards.map((card) =>
          enhanced.has(card.id)
            ? { ...card, enhancementId: 'bxqp:enhancement:bonus-stitch' }
            : card,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) =>
          enhanced.has(modifier.cardId)
            ? { ...modifier, enhancementId: 'bxqp:enhancement:bonus-stitch' }
            : modifier,
        ),
      },
    };
    const card = v6Card('j141-card', 'clubs', 'ace');
    const control = scoreV6(withoutJokersV6(state), [card]);
    expect(scoreV6(state, [card]).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 3,
    );
  });

  it('J142 选择盲注后在容量足够时生成一张纸术牌', () => {
    const state = acquireV6(initialV6('j142-create'), 142);
    const started = commandV6(state, { type: 'select-blind', position: 'small' });
    expect(started.inventory.consumables).toHaveLength(
      state.inventory.consumables.length + 1,
    );
    expect(
      started.content.items.find(
        (item) => item.contentId === started.inventory.consumables.at(-1)?.contentId,
      ),
    ).toMatchObject({ kind: 'consumable', family: 'tarot' });
  });

  it('J143 将星谱和星谱牌包重定价为 0，其他家族维持普通价格', () => {
    const state = enterShopV6(acquireV6(initialV6('j143-free-planets'), 143));
    const planet = state.content.items.find(
      (item) => item.kind === 'consumable' && item.family === 'planet',
    )!;
    const celestial = state.content.packs.find((pack) => pack.family === 'celestial')!;
    const item = materializeItemV2(planet, 'j143-planet', state.rngState).item;
    const shop = state.shop!;
    const repriced = repriceShopV2(
      {
        ...shop,
        cardOffers: [{ ...shop.cardOffers[0]!, item, price: 99 }],
        packOffers: [
          {
            ...shop.packOffers[0]!,
            packId: celestial.id,
            name: celestial.name,
            description: celestial.description,
            price: 99,
          },
        ],
      },
      state,
    );
    expect(repriced.cardOffers[0]?.price).toBe(0);
    expect(repriced.packOffers[0]?.price).toBe(0);
    expect(repriced.voucherOffer?.price ?? 1).toBeGreaterThan(0);
  });

  it('J144 只在首弃时提升冻结弃牌牌型 1 级', () => {
    const state = acquireV6(initialV6('j144-first-discard'), 144);
    const before = state.rules.handLevels.pair;
    const applied = applyRunWindowEffectsV2(state, 'discard', {
      eventContext: {
        eventFacts: {
          kind: 'discard',
          discardedCardIds: [],
          firstDiscardOfRound: true,
          forced: false,
          discardedHandType: 'pair',
        },
        eventCardIdentities: {},
      },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.rules.handLevels.pair).toBe(before + 1);
  });

  it('J145 每完整 5 戏票给予 +2 倍率，负票按 0 计算', () => {
    let state = acquireV6(initialV6('j145-money'), 145);
    state = { ...state, economy: { ...state.economy, money: 14 } };
    const card = v6Card('j145-card', 'clubs', 'ace');
    const control = scoreV6(withoutJokersV6(state), [card]);
    expect(
      scoreV6(state, [card]).breakdown.multiplier - control.breakdown.multiplier,
    ).toBe(4);
    state = { ...state, economy: { ...state.economy, money: -10 } };
    expect(scoreV6(state, [card]).breakdown.multiplier).toBe(
      scoreV6(withoutJokersV6(state), [card]).breakdown.multiplier,
    );
  });
});
