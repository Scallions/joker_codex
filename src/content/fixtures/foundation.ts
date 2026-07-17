import { createStandardDeck } from '../../game-core/model/cards';
import { stableId } from '../../game-core/model/ids';
import type {
  OwnedConsumable,
  OwnedJoker,
  RunState,
  ShopItemDefinition,
} from '../../game-core/model/run';
import { createRun } from '../../game-core/rules/createRun';

const FOUNDATION_JOKER_CONTENT_ID = 'fixture:joker:drum-master';
const FOUNDATION_CONSUMABLE_CONTENT_ID = 'fixture:consumable:ace-change';

export const FOUNDATION_JOKER: OwnedJoker = {
  instanceId: stableId<'joker-instance'>(`${FOUNDATION_JOKER_CONTENT_ID}:opening`),
  contentId: FOUNDATION_JOKER_CONTENT_ID,
  name: '压轴鼓师',
  description: '每次出牌结算时，倍率 ×1.5。',
  handMultiplier: 1.5,
  sellPrice: 2,
};

export const FOUNDATION_CONSUMABLE: OwnedConsumable = {
  instanceId: stableId<'consumable-instance'>(
    `${FOUNDATION_CONSUMABLE_CONTENT_ID}:opening`,
  ),
  contentId: FOUNDATION_CONSUMABLE_CONTENT_ID,
  name: '移花换点',
  description: '将手中一张牌的点数变为 A。',
  effect: { type: 'set-rank', rank: 'ace' },
  sellPrice: 1,
};

export const FOUNDATION_SHOP_POOL: readonly ShopItemDefinition[] = [
  {
    kind: 'joker',
    contentId: FOUNDATION_JOKER_CONTENT_ID,
    name: '压轴鼓师',
    description: '每次出牌结算时，倍率 ×1.5。',
    cost: 4,
    sellPrice: 2,
    handMultiplier: 1.5,
  },
  {
    kind: 'consumable',
    contentId: FOUNDATION_CONSUMABLE_CONTENT_ID,
    name: '移花换点',
    description: '将手中一张牌的点数变为 A。',
    effect: { type: 'set-rank', rank: 'ace' },
    cost: 3,
    sellPrice: 1,
  },
];

export function createFixtureRun(seed: string): RunState {
  return createRun({
    seed,
    deck: createStandardDeck(),
    targetScore: 160,
    hands: 4,
    discards: 3,
    handSize: 8,
    startingMoney: 6,
    jokers: [FOUNDATION_JOKER],
    consumables: [FOUNDATION_CONSUMABLE],
    shopPool: FOUNDATION_SHOP_POOL,
  });
}
