import { stableId } from '../model/ids';
import type { FixtureShopState, ShopItemDefinition } from '../model/run';
import type { RandomState } from '../rng/random';
import { shuffle } from '../rng/shuffle';

export interface CreatedShop {
  readonly shop: FixtureShopState;
  readonly rngState: RandomState;
}

export function createShop(
  pool: readonly ShopItemDefinition[],
  rngState: RandomState,
  rerollCount: number,
): CreatedShop {
  const shuffled = shuffle(pool, rngState);
  const offers = shuffled.value.slice(0, 2).map((definition, index) => ({
    ...definition,
    id: stableId<'shop-offer'>(
      `fixture:offer:${rerollCount}:${index}:${definition.contentId}`,
    ),
  }));

  return {
    shop: {
      offers,
      rerollCost: 1 + rerollCount,
      rerollCount,
    },
    rngState: shuffled.state,
  };
}
