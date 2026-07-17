import { createStandardDeck } from '../../src/game-core/model/cards';
import { createRandomState } from '../../src/game-core/rng/random';
import { shuffle } from '../../src/game-core/rng/shuffle';

describe('标准牌组', () => {
  it('以相同种子洗出相同顺序且不增减任何牌', () => {
    const deck = createStandardDeck();
    const first = shuffle(deck, createRandomState('戏台一号'));
    const second = shuffle(deck, createRandomState('戏台一号'));

    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id))).toHaveLength(52);
    expect(first.value.map((card) => card.id)).toEqual(
      second.value.map((card) => card.id),
    );
    expect(first.value.map((card) => card.id).sort()).toEqual(
      deck.map((card) => card.id).sort(),
    );
    expect(first.state).toBe(second.state);
    expect(first.value.map((card) => card.id)).not.toEqual(deck.map((card) => card.id));
  });
});
