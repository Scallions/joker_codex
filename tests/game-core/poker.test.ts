import {
  createPlayingCard,
  type CardEnhancement,
  type Rank,
  type Suit,
} from '../../src/game-core/model/cards';
import {
  evaluatePokerHand,
  type PokerHandType,
} from '../../src/game-core/poker/evaluate';

function card(id: string, suit: Suit, rank: Rank, enhancement: CardEnhancement = 'none') {
  return createPlayingCard(`test:${id}`, suit, rank, enhancement);
}

describe('十二种牌型', () => {
  it('按冻结的强度顺序识别全部基础与隐藏牌型', () => {
    const fixtures: ReadonlyArray<
      readonly [PokerHandType, ReturnType<typeof createPlayingCard>[]]
    > = [
      [
        'high-card',
        [
          card('h1', 'spades', '2'),
          card('h2', 'hearts', '5'),
          card('h3', 'clubs', '9'),
          card('h4', 'diamonds', 'jack'),
          card('h5', 'spades', 'king'),
        ],
      ],
      [
        'pair',
        [
          card('p1', 'spades', '2'),
          card('p2', 'hearts', '2'),
          card('p3', 'clubs', '5'),
          card('p4', 'diamonds', '9'),
          card('p5', 'spades', 'king'),
        ],
      ],
      [
        'two-pair',
        [
          card('t1', 'spades', '2'),
          card('t2', 'hearts', '2'),
          card('t3', 'clubs', '5'),
          card('t4', 'diamonds', '5'),
          card('t5', 'spades', 'king'),
        ],
      ],
      [
        'three-of-a-kind',
        [
          card('r1', 'spades', '2'),
          card('r2', 'hearts', '2'),
          card('r3', 'clubs', '2'),
          card('r4', 'diamonds', '5'),
          card('r5', 'spades', 'king'),
        ],
      ],
      [
        'straight',
        [
          card('s1', 'spades', '2'),
          card('s2', 'hearts', '3'),
          card('s3', 'clubs', '4'),
          card('s4', 'diamonds', '5'),
          card('s5', 'spades', '6'),
        ],
      ],
      [
        'flush',
        [
          card('f1', 'spades', '2'),
          card('f2', 'spades', '5'),
          card('f3', 'spades', '7'),
          card('f4', 'spades', '9'),
          card('f5', 'spades', 'king'),
        ],
      ],
      [
        'full-house',
        [
          card('u1', 'spades', '2'),
          card('u2', 'hearts', '2'),
          card('u3', 'clubs', '2'),
          card('u4', 'diamonds', '5'),
          card('u5', 'spades', '5'),
        ],
      ],
      [
        'four-of-a-kind',
        [
          card('q1', 'spades', '2'),
          card('q2', 'hearts', '2'),
          card('q3', 'clubs', '2'),
          card('q4', 'diamonds', '2'),
          card('q5', 'spades', 'king'),
        ],
      ],
      [
        'straight-flush',
        [
          card('sf1', 'spades', '2'),
          card('sf2', 'spades', '3'),
          card('sf3', 'spades', '4'),
          card('sf4', 'spades', '5'),
          card('sf5', 'spades', '6'),
        ],
      ],
      [
        'five-of-a-kind',
        [
          card('v1', 'spades', '2'),
          card('v2', 'hearts', '2'),
          card('v3', 'clubs', '2'),
          card('v4', 'diamonds', '2'),
          card('v5', 'hearts', '2'),
        ],
      ],
      [
        'flush-house',
        [
          card('fh1', 'spades', '2'),
          card('fh2', 'spades', '2'),
          card('fh3', 'spades', '2'),
          card('fh4', 'spades', '5'),
          card('fh5', 'spades', '5'),
        ],
      ],
      [
        'flush-five',
        [
          card('ff1', 'spades', '2'),
          card('ff2', 'spades', '2'),
          card('ff3', 'spades', '2'),
          card('ff4', 'spades', '2'),
          card('ff5', 'spades', '2'),
        ],
      ],
    ];

    expect(
      fixtures.map(([expected, cards]) => [expected, evaluatePokerHand(cards).type]),
    ).toEqual(fixtures.map(([expected]) => [expected, expected]));
  });
});
