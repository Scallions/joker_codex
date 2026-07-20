import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { destroyPlayingCardsV6 } from '../../src/game-core/effects/playingCardDestructionV6';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV6, type RunStateV6 } from '../../src/game-core/model/runV6';
import { usedConsumableSlotsForRun } from '../../src/game-core/rules/inventoryCapacityV6';
import { bossEffectsDisabledForRun } from '../../src/game-core/rules/runtimeV3';
import {
  abilityV6,
  acquireV6,
  commandV6,
  enterShopV6,
  initialV6,
  scoreV6,
  v6Card,
  withoutJokersV6,
} from '../helpers/jokerV6';

function asV6(state: RunStateV2): RunStateV6 {
  if (!isRunStateV6(state)) throw new Error('效果结算降级了 V6');
  return state;
}

describe('奇牌 J146-J150 执行合约', () => {
  it('J146 使用摧毁前有效人头身份，并接受“所有牌视为人头牌”投影', () => {
    let state = acquireV6(initialV6('j146-destruction'), 146);
    state = acquireV6(state, 37);
    const target = state.deck.cards.find(({ rank }) => rank === '2')!;
    const destroyed = destroyPlayingCardsV6(state, [target.id], 'j146-test');
    expect(destroyed.ok).toBe(true);
    if (!destroyed.ok) return;
    const next = asV6(destroyed.state);
    expect(abilityV6(next, 146, 'multFactorHundredths')).toBe(200);

    const card = v6Card('j146-score', 'clubs', 'ace');
    const control = scoreV6(withoutJokersV6(next), [card]);
    expect(scoreV6(next, [card]).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 2,
    );
  });

  it('J146 不计入摧毁前已失效的人头牌', () => {
    let state = acquireV6(initialV6('j146-debuffed'), 146);
    const target = state.deck.cards.find(({ rank }) => rank === 'king')!;
    state = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) =>
          modifier.cardId === target.id ? { ...modifier, debuffed: true } : modifier,
        ),
      },
    };
    const destroyed = destroyPlayingCardsV6(state, [target.id], 'j146-debuffed');
    expect(destroyed.ok).toBe(true);
    if (!destroyed.ok) return;
    expect(abilityV6(asV6(destroyed.state), 146, 'multFactorHundredths')).toBe(100);
  });

  it('J147 对同一次计分中的 K 与 Q 分别执行 ×2', () => {
    const state = acquireV6(initialV6('j147-kq'), 147);
    const cards = [
      v6Card('j147-k', 'hearts', 'king'),
      v6Card('j147-q', 'hearts', 'queen'),
      v6Card('j147-9', 'hearts', '9'),
      v6Card('j147-6', 'hearts', '6'),
      v6Card('j147-2', 'hearts', '2'),
    ];
    const control = scoreV6(withoutJokersV6(state), cards);
    expect(scoreV6(state, cards).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 4,
    );
  });

  it('J148 用 23 张整除成长并持久保留余数', () => {
    let state = acquireV6(initialV6('j148-threshold'), 148);
    const discard = (count: number, suffix: string) => {
      const ids = Array.from(
        { length: count },
        (_, index) => `j148:${suffix}:${index}` as CardId,
      );
      const applied = applyRunWindowEffectsV2(state, 'discard', {
        eventContext: {
          eventFacts: {
            kind: 'discard',
            discardedCardIds: ids,
            firstDiscardOfRound: false,
            forced: true,
            discardedHandType: null,
          },
          eventCardIdentities: {},
        },
      });
      expect(applied.ok).toBe(true);
      if (applied.ok) state = asV6(applied.state);
    };
    discard(25, 'a');
    expect(abilityV6(state, 148, 'multFactorHundredths')).toBe(200);
    expect(abilityV6(state, 148, 'discardRemainder')).toBe(2);
    discard(21, 'b');
    expect(abilityV6(state, 148, 'multFactorHundredths')).toBe(300);
    expect(abilityV6(state, 148, 'discardRemainder')).toBe(0);
  });

  it('J149 多来源仍是幂等班主禁令，全部失效后立即恢复', () => {
    let state = acquireV6(initialV6('j149-disable'), 149, 'a');
    state = acquireV6(state, 149, 'b');
    expect(bossEffectsDisabledForRun(state, state.progress.lineup.boss)).toBe(true);
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    expect(bossEffectsDisabledForRun(state, state.progress.lineup.boss)).toBe(false);
  });

  it('J150 离店时只从冻结原池独立复制，并生成零栏位剪影彩面消耗牌', () => {
    let state = acquireV6(initialV6('j150-shop-left'), 150, 'a');
    state = acquireV6(state, 150, 'b');
    const definition = state.content.items.find(
      (item) => item.kind === 'consumable' && item.family === 'tarot',
    )!;
    const acquired = acquireContentByIdV3(
      state,
      definition.contentId,
      'j150-original-consumable',
    );
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    state = asV6(acquired.state);
    state = {
      ...state,
      rules: { ...state.rules, consumableSlots: 1 },
    };
    const originalIds = new Set(
      state.inventory.consumables.map(({ instanceId }) => instanceId),
    );
    const beforeUsed = usedConsumableSlotsForRun(state);
    state = enterShopV6(state);
    const left = commandV6(state, { type: 'leave-shop' });
    const clones = left.inventory.consumables.filter(
      ({ instanceId }) => !originalIds.has(instanceId),
    );
    expect(clones).toHaveLength(2);
    expect(
      clones.every(({ editionId }) => editionId === 'bxqp:edition:shadow-cutout'),
    ).toBe(true);
    expect(clones.every(({ contentId }) => contentId === definition.contentId)).toBe(
      true,
    );
    expect(usedConsumableSlotsForRun(left)).toBe(beforeUsed);
  });
});
