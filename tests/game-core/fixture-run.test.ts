import { createFixtureRun } from '../../src/content/fixtures/foundation';

describe('试玩局开场', () => {
  it('用相同种子发出相同八张手牌并守恒整副牌', () => {
    const first = createFixtureRun('foundation-seed');
    const second = createFixtureRun('foundation-seed');
    const allCards = [...first.drawPile, ...first.hand, ...first.discardPile];

    expect(first).toEqual(second);
    expect(first.phase).toBe('round');
    expect(first.checkpointId).toBe(0);
    expect(first.hand).toHaveLength(8);
    expect(first.drawPile).toHaveLength(44);
    expect(first.handsRemaining).toBe(4);
    expect(first.discardsRemaining).toBe(3);
    expect(first.jokers).toHaveLength(1);
    expect(first.consumables).toHaveLength(1);
    expect(allCards).toHaveLength(52);
    expect(new Set(allCards.map((card) => card.id))).toHaveLength(52);
  });
});
