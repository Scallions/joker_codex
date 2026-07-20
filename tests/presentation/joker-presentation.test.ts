import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { createProductionRunV6 } from '../../src/content/runtime/runSetupV6';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import { isRunStateV6, type RunStateV6 } from '../../src/game-core/model/runV6';
import {
  selectJokerPresentation,
  selectOwnedJokerPresentation,
} from '../../src/presentation/selectors/jokerPresentation';

function acquireV5(state: RunStateV5, ordinal: number): RunStateV5 {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const acquired = acquireContentByIdV3(state, contentId, `presentation:${ordinal}`);
  if (!acquired.ok || !isRunStateV5(acquired.state)) {
    throw new Error(acquired.ok ? '没有保持 V5' : acquired.message);
  }
  return acquired.state;
}

function ownedPresentation(state: RunStateV5, ordinal: number) {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const joker = state.inventory.jokers.find(
    (candidate) => candidate.contentId === contentId,
  );
  if (!joker) throw new Error(`没有持有 ${contentId}`);
  return selectOwnedJokerPresentation(state, joker);
}

function acquireV6(state: RunStateV6, ordinal: number): RunStateV6 {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const acquired = acquireContentByIdV3(state, contentId, `presentation-v6:${ordinal}`);
  if (!acquired.ok || !isRunStateV6(acquired.state)) {
    throw new Error(acquired.ok ? '没有保持 V6' : acquired.message);
  }
  return acquired.state;
}

function ownedPresentationV6(state: RunStateV6, ordinal: number) {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const joker = state.inventory.jokers.find(
    (candidate) => candidate.contentId === contentId,
  );
  if (!joker) throw new Error(`没有持有 ${contentId}`);
  return selectOwnedJokerPresentation(state, joker);
}

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

  it('按通用状态键展示百分倍率、目标、赏金与手牌上限', () => {
    expect(selectJokerPresentation('bxqp:joker:055')?.currentValue).toBe('当前 ×1');
    expect(selectJokerPresentation('bxqp:joker:060')?.currentValue).toBe('当前：高牌');
    expect(selectJokerPresentation('bxqp:joker:074')?.currentValue).toBe('当前 1 戏票');
    expect(selectJokerPresentation('bxqp:joker:080')?.currentValue).toBe(
      '当前 +5 手牌上限',
    );
    expect(selectJokerPresentation('bxqp:joker:083')?.currentValue).toBe('当前：A');
    expect(selectJokerPresentation('bxqp:joker:100')?.currentValue).toBe('当前 ×2');
  });

  it('从已提交运行态投影牌堆、初始牌组、历史、钱与共享目标', () => {
    const base = (seed: string): RunStateV5 => {
      const initial = createProductionRunV5(PRODUCTION_CATALOG, { seed });
      return {
        ...initial,
        rules: { ...initial.rules, jokerSlots: 10 },
      };
    };

    let drawPile = acquireV5(base('presentation-draw-pile'), 53);
    const selected = executeCommandV2(drawPile, {
      type: 'select-blind',
      checkpointId: drawPile.checkpointId,
      position: 'small',
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok || !isRunStateV5(selected.state)) return;
    drawPile = selected.state;
    expect(ownedPresentation(drawPile, 53)?.currentValue).toBe(
      `当前 +${drawPile.round!.drawPileIds.length * 2} 筹码`,
    );

    let initialDelta = acquireV5(base('presentation-initial-size'), 81);
    initialDelta = {
      ...initialDelta,
      deck: { cards: initialDelta.deck.cards.slice(0, -2) },
    };
    expect(ownedPresentation(initialDelta, 81)?.currentValue).toBe('当前 +8 倍率');

    let history = acquireV5(base('presentation-history'), 86);
    history = {
      ...history,
      history: {
        ...history.history,
        effectObservations: [
          ...history.history.effectObservations,
          {
            window: 'consumable-used',
            key: 'tarot-used',
            value: 'bxqp:tarot:001',
            sourceInstanceId: 'presentation:tarot:1',
            effectId: 'presentation:tarot-used:1',
            checkpointId: history.checkpointId,
          },
          {
            window: 'consumable-used',
            key: 'tarot-used',
            value: 'bxqp:tarot:002',
            sourceInstanceId: 'presentation:tarot:2',
            effectId: 'presentation:tarot-used:2',
            checkpointId: history.checkpointId,
          },
        ],
      },
    };
    expect(ownedPresentation(history, 86)?.currentValue).toBe('当前 +2 倍率');

    let money = acquireV5(base('presentation-money'), 93);
    money = { ...money, economy: { ...money.economy, money: 7 } };
    expect(ownedPresentation(money, 93)?.currentValue).toBe('当前 +14 筹码');

    let target = acquireV5(base('presentation-shared-suit'), 99);
    target = {
      ...target,
      jokerRuntimeV5: {
        ...target.jokerRuntimeV5,
        sharedRoundTargetSuit: 'spades',
      },
    };
    expect(ownedPresentation(target, 99)?.currentValue).toBe('当前：黑桃');
  });

  it('投影 V6 次数、独立目标、进度、概率、路由、定价、禁令与容量债务', () => {
    expect(selectJokerPresentation('bxqp:joker:102')?.currentValue).toBe(
      '剩余 10 次出牌',
    );
    expect(selectJokerPresentation('bxqp:joker:126')?.currentValue).toBe('明确概率 ×2');
    expect(selectJokerPresentation('bxqp:joker:138')?.currentValue).toBe('路由：最左侧');
    expect(selectJokerPresentation('bxqp:joker:143')?.currentValue).toBe('星谱价格 0');
    expect(selectJokerPresentation('bxqp:joker:149')?.currentValue).toBe('班主能力失效');

    let target = createProductionRunV6(PRODUCTION_CATALOG, {
      seed: 'presentation-v6-target',
    });
    target = { ...target, rules: { ...target.rules, jokerSlots: 10 } };
    target = acquireV6(target, 103);
    expect(target.jokerRuntimeV6.castleTargetSuit).not.toBeNull();
    expect(ownedPresentationV6(target, 103)?.currentValue).toMatch(/^目标花色：/);

    let progress = acquireV6(target, 148);
    const progressJoker = progress.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:148',
    )!;
    progress = {
      ...progress,
      modifiersV3: {
        ...progress.modifiersV3,
        jokers: progress.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === progressJoker.instanceId
            ? {
                ...modifier,
                abilityState: {
                  ...modifier.abilityState,
                  multFactorHundredths: 300,
                  discardRemainder: 5,
                },
              }
            : modifier,
        ),
      },
      jokerRuntimeV6: { ...progress.jokerRuntimeV6, jokerCapacityDebt: 1 },
    };
    expect(ownedPresentationV6(progress, 148)?.currentValue).toBe(
      '当前 ×3 · 进度 5/23 · 容量债务 1',
    );
  });
});
