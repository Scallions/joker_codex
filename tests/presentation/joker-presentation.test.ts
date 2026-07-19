import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import {
  selectJokerPresentation,
  selectOwnedJokerPresentation,
} from '../../src/presentation/selectors/jokerPresentation';

describe('奇牌展示选择器', () => {
  it('从生产目录统一解析图像、中文身份、风味与稀有度', () => {
    expect(selectJokerPresentation('bxqp:joker:021')).toMatchObject({
      contentId: 'bxqp:joker:021',
      name: '右厢断绳',
      rarity: 'uncommon',
      rarityLabel: '少见',
      assetPath: '/assets/jokers/021.webp',
      flavor: '右厢一落，左边便更重。',
      currentValue: '当前 +0 倍率',
    });
    expect(selectJokerPresentation('fixture:joker')).toBeUndefined();
  });

  it('只读取已提交 V4 能力状态，形成牌桌与夜市共用当前值', () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'joker-presentation-state',
    });
    const acquired = acquireContentByIdV3(initial, 'bxqp:joker:044', 'ui-state');
    expect(acquired.ok).toBe(true);
    if (!acquired.ok || !isRunStateV4(acquired.state)) return;
    const joker = acquired.state.inventory.jokers.at(-1);
    expect(joker).toBeDefined();
    if (!joker) return;
    const run = {
      ...acquired.state,
      modifiersV3: {
        ...acquired.state.modifiersV3,
        jokers: acquired.state.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === joker.instanceId
            ? { ...modifier, abilityState: { storedMult: 3 } }
            : modifier,
        ),
      },
    };

    expect(selectOwnedJokerPresentation(run, joker)).toMatchObject({
      contentId: 'bxqp:joker:044',
      currentValue: '当前 +3 倍率',
    });
  });

  it('按目录操作描述解析整副牌修饰倍率与成长售价', () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'joker-presentation-operations',
    });
    const cardId = initial.deck.cards[0]!.id;
    const withSilk = {
      ...initial,
      deck: {
        cards: initial.deck.cards.map((card) =>
          card.id === cardId
            ? { ...card, enhancementId: 'bxqp:enhancement:silk-shadow' }
            : card,
        ),
      },
      modifiersV3: {
        ...initial.modifiersV3,
        playingCards: initial.modifiersV3.playingCards.map((modifier) =>
          modifier.cardId === cardId
            ? { ...modifier, enhancementId: 'bxqp:enhancement:silk-shadow' }
            : modifier,
        ),
      },
    };
    const silkAcquired = acquireContentByIdV3(withSilk, 'bxqp:joker:032', 'ui-silk');
    expect(silkAcquired.ok).toBe(true);
    if (!silkAcquired.ok || !isRunStateV4(silkAcquired.state)) return;
    const silkJoker = silkAcquired.state.inventory.jokers.at(-1);
    expect(silkJoker).toBeDefined();
    if (!silkJoker) return;
    expect(selectOwnedJokerPresentation(silkAcquired.state, silkJoker)).toMatchObject({
      currentValue: '当前 ×1.2',
    });

    const saleAcquired = acquireContentByIdV3(initial, 'bxqp:joker:046', 'ui-sale');
    expect(saleAcquired.ok).toBe(true);
    if (!saleAcquired.ok || !isRunStateV4(saleAcquired.state)) return;
    const saleJoker = saleAcquired.state.inventory.jokers.at(-1);
    expect(saleJoker).toBeDefined();
    if (!saleJoker) return;
    expect(selectOwnedJokerPresentation(saleAcquired.state, saleJoker)).toMatchObject({
      currentValue: '当前售价 ¥2',
    });
  });
});
