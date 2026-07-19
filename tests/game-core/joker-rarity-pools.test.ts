import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import {
  createShopV2,
  materializePackOptionsV2,
} from '../../src/game-core/economy/shopV2';
import {
  drawJokerDefinitionV3,
  type JokerRarityDrawCandidateV3,
} from '../../src/game-core/economy/jokerRarityV3';
import type { JokerDefinitionV2 } from '../../src/game-core/model/runV2';
import { createRandomState } from '../../src/game-core/rng/random';

function candidate(
  contentId: string,
  rarity: JokerDefinitionV2['rarity'],
  weightUnits = 1,
): JokerRarityDrawCandidateV3<string> {
  return { contentId, rarity, weightUnits, value: contentId };
}

describe('奇牌稀有度两阶段抽取', () => {
  it('普通来源只在非空常见/少见池之间重整 70/25 权重，再稳定抽行', () => {
    const pool = [
      candidate('joker:common:a', 'common'),
      candidate('joker:common:b', 'common'),
      candidate('joker:uncommon:a', 'uncommon'),
    ];
    const values = Array.from({ length: 128 }, (_, index) => {
      const result = drawJokerDefinitionV3(
        pool,
        createRandomState(`rarity:${index}`),
        'ordinary',
      );
      expect(result.ok).toBe(true);
      return result.ok ? result.value : '';
    });

    expect(values.some((value) => value.includes('common'))).toBe(true);
    expect(values.some((value) => value.includes('uncommon'))).toBe(true);
    expect(values.every((value) => pool.some(({ value: id }) => id === value))).toBe(
      true,
    );
  });

  it('空稀有度被跳过；强制空池返回 pool-empty 且不消耗 RNG', () => {
    const seed = createRandomState('forced-empty');
    const onlyUncommon = [candidate('joker:uncommon', 'uncommon')];
    const ordinary = drawJokerDefinitionV3(onlyUncommon, seed, 'ordinary');
    expect(ordinary).toMatchObject({ ok: true, value: 'joker:uncommon' });

    const forced = drawJokerDefinitionV3(onlyUncommon, seed, 'rare');
    expect(forced).toEqual({
      ok: false,
      code: 'pool-empty',
      message: '指定稀有度的奇牌候选池为空',
      rngState: seed,
    });
  });

  it('池输入顺序不影响相同种子结果', () => {
    const pool = [
      candidate('joker:c', 'common', 2),
      candidate('joker:a', 'common', 3),
      candidate('joker:b', 'uncommon', 4),
    ];
    const seed = createRandomState('stable-within-rarity');
    expect(drawJokerDefinitionV3(pool, seed, 'ordinary')).toEqual(
      drawJokerDefinitionV3([...pool].reverse(), seed, 'ordinary'),
    );
  });

  it('普通夜市和百戏包均使用真实 001-050 定义', () => {
    const shops = Array.from({ length: 80 }, (_, index) =>
      createShopV2(
        createProductionRunV4(PRODUCTION_CATALOG, { seed: `real-shop:${index}` }),
      ),
    );
    const jokerOffers = shops.flatMap((result) =>
      result.ok ? result.shop.cardOffers.filter(({ item }) => item.kind === 'joker') : [],
    );
    expect(jokerOffers.length).toBeGreaterThan(0);
    expect(
      jokerOffers.every(({ item }) =>
        /^bxqp:joker:0(?:[0-4]\d|50)$/.test(item.contentId),
      ),
    ).toBe(true);

    const state = createProductionRunV4(PRODUCTION_CATALOG, { seed: 'real-buffoon' });
    const buffoon = state.content.packs.find(({ family }) => family === 'buffoon')!;
    const options = materializePackOptionsV2(
      state,
      buffoon,
      'real-buffoon-pack',
      state.rngState,
    );
    expect(options.items.length).toBeGreaterThan(0);
    expect(
      options.items.every(({ contentId }) => contentId.startsWith('bxqp:joker:')),
    ).toBe(true);
  });

  it('J032 只有完整牌组含绸影强化时才进入夜市与百戏包候选池', () => {
    const drawIds = (hasSilk: boolean) => {
      let state = createProductionRunV4(PRODUCTION_CATALOG, {
        seed: `j032-eligibility:${hasSilk}`,
      });
      if (hasSilk) {
        const cardId = state.deck.cards[0]!.id;
        state = {
          ...state,
          deck: {
            cards: state.deck.cards.map((entry) =>
              entry.id === cardId
                ? { ...entry, enhancementId: 'bxqp:enhancement:silk-shadow' }
                : entry,
            ),
          },
          modifiersV3: {
            ...state.modifiersV3,
            playingCards: state.modifiersV3.playingCards.map((entry) =>
              entry.cardId === cardId
                ? { ...entry, enhancementId: 'bxqp:enhancement:silk-shadow' }
                : entry,
            ),
          },
        };
      }
      const buffoon = state.content.packs.find(({ family }) => family === 'buffoon')!;
      return Array.from({ length: 400 }, (_, index) =>
        materializePackOptionsV2(
          state,
          buffoon,
          `j032-pack:${index}`,
          createRandomState(`j032-eligibility:${hasSilk}:${index}`),
        ).items.map(({ contentId }) => contentId),
      ).flat();
    };

    expect(drawIds(false)).not.toContain('bxqp:joker:032');
    expect(drawIds(true)).toContain('bxqp:joker:032');
  });
});
