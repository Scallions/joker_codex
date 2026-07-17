import type { PlayingCard } from '../model/cards';
import { stableId } from '../model/ids';
import type {
  OwnedConsumable,
  OwnedJoker,
  RunState,
  ShopItemDefinition,
} from '../model/run';
import { CONTENT_VERSION, RUN_SCHEMA_VERSION } from '../model/run';
import { createRandomState } from '../rng/random';
import { shuffle } from '../rng/shuffle';

export interface CreateRunConfig {
  readonly seed: string;
  readonly deck: readonly PlayingCard[];
  readonly targetScore: number;
  readonly hands: number;
  readonly discards: number;
  readonly handSize: number;
  readonly startingMoney: number;
  readonly jokers: readonly OwnedJoker[];
  readonly consumables: readonly OwnedConsumable[];
  readonly shopPool: readonly ShopItemDefinition[];
}

export function createRun(config: CreateRunConfig): RunState {
  const shuffled = shuffle(config.deck, createRandomState(config.seed));

  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    runId: stableId<'run'>(`run:foundation:${config.seed}`),
    checkpointId: 0,
    seed: config.seed,
    rngState: shuffled.state,
    phase: 'round',
    targetScore: config.targetScore,
    roundScore: 0,
    handsRemaining: config.hands,
    discardsRemaining: config.discards,
    money: config.startingMoney,
    handSize: config.handSize,
    drawPile: shuffled.value.slice(config.handSize),
    hand: shuffled.value.slice(0, config.handSize),
    discardPile: [],
    selectedCardIds: [],
    sortMode: 'rank',
    jokers: [...config.jokers],
    consumables: [...config.consumables],
    shopPool: [...config.shopPool],
    shop: null,
    lastHand: null,
  };
}
