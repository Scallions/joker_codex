import fc from 'fast-check';

import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';
import { createPlayingCard } from '../../src/game-core/model/cards';
import { evaluatePokerHand } from '../../src/game-core/poker/evaluate';

describe('规则属性', () => {
  it('任意非空种子都会稳定生成守恒的 52 张牌', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 64 }), (seed) => {
        const first = createFixtureRun(seed);
        const second = createFixtureRun(seed);
        const cards = [...first.drawPile, ...first.hand, ...first.discardPile];

        expect(first).toEqual(second);
        expect(cards).toHaveLength(52);
        expect(new Set(cards.map((card) => card.id))).toHaveLength(52);
      }),
      { numRuns: 100 },
    );
  });

  it('牌的排列顺序不会改变顺子分类', () => {
    const straight = [
      createPlayingCard('property:2', 'spades', '2'),
      createPlayingCard('property:3', 'hearts', '3'),
      createPlayingCard('property:4', 'clubs', '4'),
      createPlayingCard('property:5', 'diamonds', '5'),
      createPlayingCard('property:6', 'spades', '6'),
    ];

    fc.assert(
      fc.property(
        fc.array(fc.integer(), {
          minLength: straight.length,
          maxLength: straight.length,
        }),
        (priorities) => {
          const permuted = straight
            .map((card, index) => ({ card, priority: priorities[index] ?? 0 }))
            .sort((left, right) => left.priority - right.priority)
            .map(({ card }) => card);
          expect(evaluatePokerHand(permuted).type).toBe('straight');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('同一检查点上的相同指令永远给出相同结果', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 7 }), (cardIndex) => {
        const first = createFixtureRun('command-property');
        const second = createFixtureRun('command-property');
        const cardId = first.hand[cardIndex]!.id;
        const command = { type: 'toggle-card' as const, checkpointId: 0, cardId };
        expect(executeCommand(first, command)).toEqual(executeCommand(second, command));
      }),
      { numRuns: 50 },
    );
  });
});
