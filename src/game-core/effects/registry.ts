import { RANKS, SUITS, type Rank, type Suit } from '../model/cards';
import {
  EFFECT_WINDOWS,
  type EffectReference,
  type EffectWindow,
  type RunStateV2,
} from '../model/runV2';
import { POKER_HAND_TYPES, type PokerHandType } from '../poker/evaluate';
import {
  jokerPredicateSchema,
  jokerValueSchema,
  validateJokerPredicateDepth,
  type JokerCopyFacet,
  type JokerPredicate,
  type JokerValue,
} from '../../content/schema/catalog';

export type EffectOperation =
  | { readonly type: 'add-chips'; readonly amount: number }
  | { readonly type: 'add-multiplier'; readonly amount: number }
  | { readonly type: 'multiply-multiplier'; readonly factor: number }
  | { readonly type: 'multiply-final-score'; readonly factor: number }
  | { readonly type: 'add-money'; readonly amount: number }
  | { readonly type: 'spend-money'; readonly amount: number }
  | { readonly type: 'set-money'; readonly value: number }
  | {
      readonly type: 'append-reward-line';
      readonly label: string;
      readonly amount: number;
    }
  | {
      readonly type: 'copy-source';
      readonly targetInstanceId: string | null;
      readonly direction: 'left' | 'right' | null;
    }
  | {
      readonly type: 'retrigger-source';
      readonly targetInstanceId: string | null;
      readonly direction: 'left' | 'right' | null;
      readonly count: number;
    }
  | {
      readonly type: 'retrigger-card';
      readonly count: number;
      readonly onlyFirst: boolean;
    }
  | { readonly type: 'debuff-suit'; readonly suit: Suit }
  | { readonly type: 'debuff-card'; readonly cardId: string }
  | { readonly type: 'enable-card'; readonly cardId: string }
  | { readonly type: 'create-item'; readonly contentId: string }
  | { readonly type: 'transform-card'; readonly enhancementId: string | null }
  | {
      readonly type: 'destroy-card';
      readonly money: number;
      readonly selection?: string;
      readonly count?: number;
      readonly destructibleOnly?: boolean;
    }
  | { readonly type: 'add-hands'; readonly amount: number }
  | { readonly type: 'set-hands'; readonly value: number }
  | { readonly type: 'set-discards'; readonly value: number }
  | { readonly type: 'adjust-hand-size'; readonly amount: number }
  | { readonly type: 'draw-face-down'; readonly count: number }
  | { readonly type: 'force-card-choice'; readonly count: number }
  | { readonly type: 'require-play-count'; readonly count: number }
  | { readonly type: 'add-joker-slots'; readonly amount: number }
  | { readonly type: 'add-consumable-slots'; readonly amount: number }
  | { readonly type: 'set-discount'; readonly basisPoints: number }
  | { readonly type: 'set-interest-cap'; readonly value: number }
  | { readonly type: 'set-reroll-cost'; readonly value: number }
  | { readonly type: 'enable-boss-reroll'; readonly cost: number }
  | { readonly type: 'free-reroll' }
  | { readonly type: 'create-free-pack' }
  | { readonly type: 'schedule-deferred'; readonly window: EffectWindow }
  | { readonly type: 'set-rank'; readonly rank: Rank }
  | {
      readonly type: 'level-hand';
      readonly handType: PokerHandType;
      readonly amount: number;
    }
  | {
      readonly type: 'record-observation';
      readonly key: string;
      readonly value: string | number | boolean;
    }
  | {
      readonly type: 'passive-capability';
      readonly capability:
        | 'straight-flush-size'
        | 'allowed-debt'
        | 'free-reroll-per-shop'
        | 'all-cards-face';
      readonly value: number | boolean;
    }
  | {
      readonly type: 'joker-score';
      readonly metric: 'chips' | 'mult' | 'mult-factor' | 'money';
      readonly predicate: JokerPredicate;
      readonly value: JokerValue;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-retrigger-card';
      readonly target: 'scored-card' | 'held-card';
      readonly predicate: JokerPredicate;
      readonly count: number;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-create-content';
      readonly family: 'joker' | 'tarot' | 'planet' | 'spectral' | 'playing-card';
      readonly count: number;
      readonly rarity: string;
      readonly predicate: JokerPredicate;
      readonly capacityRequired: boolean;
      readonly stickerPolicy: string;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-create-playing-card';
      readonly enhancementId: string;
      readonly predicate: JokerPredicate;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-destroy-right-grow';
      readonly stateKey: string;
      readonly saleValueScale: number;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-destroy-source';
      readonly predicate: JokerPredicate;
      readonly observationKey: string | null;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-state-change';
      readonly key: string;
      readonly mode: 'set' | 'add' | 'decrement';
      readonly value: JokerValue;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-level-current-hand';
      readonly levels: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-sell-value-add';
      readonly amount: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-round-resource';
      readonly resource: 'hands' | 'discards';
      readonly mode: 'add' | 'set';
      readonly value: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-clone-played-card';
      readonly predicate: JokerPredicate;
      readonly snapshot: 'command-entry';
      readonly destination: 'hand';
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-add-card-bonus';
      readonly amount: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-transform-enhancement';
      readonly enhancementId: string | null;
      readonly predicate: JokerPredicate;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-destroy-event-card';
      readonly target: 'played-singleton' | 'discarded-singleton';
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-random-destroy-other';
      readonly excludePermanent: boolean;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-state-change-clamped';
      readonly key: string;
      readonly mode: 'set' | 'add';
      readonly value: JokerValue;
      readonly minimum: number | null;
      readonly maximum: number | null;
      readonly destroyAtOrBelow: number | null;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-set-target';
      readonly scope: 'source' | 'shared';
      readonly target: 'hand' | 'rank' | 'suit';
      readonly policy: 'eligible-hand' | 'weighted-full-deck-rank' | 'nonrepeating-suit';
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-inventory-sell-value-add';
      readonly family: 'joker' | 'consumable' | 'both';
      readonly amount: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-create-fixed-tag';
      readonly tagContentId: string;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-disable-current-boss';
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-passive-capability';
      readonly capability:
        | 'all-played-cards-score'
        | 'straight-maximum-step'
        | 'hand-size-delta'
        | 'discards-per-round-delta'
        | 'extra-interest';
      readonly value: JokerValue;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-after-rarity';
      readonly rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
      readonly factor: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-record-observation';
      readonly key: string;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'patch-rule';
      readonly key: string;
      readonly mode: 'set' | 'add' | 'multiply';
      readonly value: number | boolean;
    }
  | {
      readonly type: 'set-card-modifier';
      readonly family: 'enhancement' | 'seal' | 'edition' | 'sticker';
      readonly modifierId: string;
      readonly selection: string;
      readonly count: number;
      readonly numerator: number | null;
      readonly denominator: number | null;
    }
  | {
      readonly type: 'transform-card-field';
      readonly field: 'suit' | 'rank' | 'full-state' | 'debuff' | 'face-down';
      readonly value: string | boolean;
      readonly selection: string;
      readonly count: number;
    }
  | {
      readonly type: 'copy-card-state';
      readonly source: string;
      readonly destination: string;
      readonly count: number;
    }
  | {
      readonly type: 'create-playing-cards';
      readonly count: number;
      readonly rankPool: 'face' | 'ace' | 'number';
      readonly enhancementPolicy: 'random';
    }
  | {
      readonly type: 'create-content-family';
      readonly family: 'joker' | 'tarot' | 'planet' | 'spectral' | 'playing-card';
      readonly count: number;
      readonly rarity: string;
      readonly capacityRequired: boolean;
      readonly stickerPolicy: string;
    }
  | { readonly type: 'level-all-hands'; readonly amount: number }
  | {
      readonly type: 'catalog-money';
      readonly mode: string;
      readonly amount: number;
      readonly cap: number | null;
      readonly historyKey: string | null;
    }
  | {
      readonly type: 'catalog-score-rule';
      readonly key: string;
      readonly amount: number;
      readonly numerator: number | null;
      readonly denominator: number | null;
    }
  | {
      readonly type: 'catalog-shop-rule';
      readonly key: string;
      readonly value: string | number | boolean;
    }
  | {
      readonly type: 'catalog-blind-rule';
      readonly key: string;
      readonly value: string | number | boolean;
    }
  | {
      readonly type: 'catalog-tag-rule';
      readonly timing: string;
      readonly key: string;
      readonly value: string | number;
    }
  | {
      readonly type: 'catalog-rule';
      readonly category: string;
      readonly key: string;
      readonly value: string | number | boolean;
    };

export interface EffectHandlerContext {
  readonly window: EffectWindow;
  readonly state: RunStateV2 | null;
}

export type EffectHandler = (
  effect: EffectReference,
  context: EffectHandlerContext,
) => readonly EffectOperation[];

export type EffectHandlerRegistry = Readonly<Record<string, EffectHandler>>;

function numberParameter(
  effect: EffectReference,
  key: string,
  integer = false,
): number | null {
  const value = effect.parameters[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return integer && !Number.isSafeInteger(value) ? null : value;
}

function stringParameter(effect: EffectReference, key: string): string | null {
  const value = effect.parameters[key];
  return typeof value === 'string' ? value : null;
}

function directionParameter(effect: EffectReference): 'left' | 'right' | null {
  const direction = effect.parameters.direction;
  return direction === 'left' || direction === 'right' ? direction : null;
}

function booleanParameter(effect: EffectReference, key: string): boolean | null {
  const value = effect.parameters[key];
  return typeof value === 'boolean' ? value : null;
}

function primitiveParameter(
  effect: EffectReference,
  key: string,
): string | number | boolean | null {
  const value = effect.parameters[key];
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? value
    : null;
}

function jsonParameter<T>(
  effect: EffectReference,
  key: string,
  parse: (value: unknown) =>
    | { readonly success: true; readonly data: T }
    | {
        readonly success: false;
      },
): T | null {
  const serialized = stringParameter(effect, key);
  if (serialized === null) return null;
  try {
    const parsed = parse(JSON.parse(serialized));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function numericOperation(
  effect: EffectReference,
  key: string,
  create: (value: number) => EffectOperation,
  integer = false,
): readonly EffectOperation[] {
  const value = numberParameter(effect, key, integer);
  return value === null ? [] : [create(value)];
}

function stringOperation(
  effect: EffectReference,
  key: string,
  create: (value: string) => EffectOperation,
): readonly EffectOperation[] {
  const value = stringParameter(effect, key);
  return value === null ? [] : [create(value)];
}

const CATALOG_EFFECT_HANDLERS = {
  'bxqp:handler:baseline': (effect) => {
    const key = stringParameter(effect, 'key');
    return key === null
      ? []
      : [{ type: 'record-observation', key: `baseline:${key}`, value: true }];
  },
  'bxqp:handler:passive-capability': (effect) => {
    const capability = stringParameter(effect, 'capability');
    const value = primitiveParameter(effect, 'value');
    if (
      (capability === 'straight-flush-size' || capability === 'allowed-debt') &&
      typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value >= 0
    ) {
      return [{ type: 'passive-capability', capability, value }];
    }
    if (
      (capability === 'free-reroll-per-shop' || capability === 'all-cards-face') &&
      typeof value === 'boolean'
    ) {
      return [{ type: 'passive-capability', capability, value }];
    }
    return [];
  },
  'bxqp:handler:joker-score': (effect) => {
    const metric = stringParameter(effect, 'metric');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    const value = jsonParameter(effect, 'value', (candidate) =>
      jokerValueSchema.safeParse(candidate),
    );
    return predicate !== null &&
      value !== null &&
      validateJokerPredicateDepth(predicate) &&
      (metric === 'chips' ||
        metric === 'mult' ||
        metric === 'mult-factor' ||
        metric === 'money') &&
      (copyFacet === 'output' || copyFacet === 'trigger' || copyFacet === 'none')
      ? [{ type: 'joker-score', metric, predicate, value, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-retrigger-card': (effect) => {
    const target = stringParameter(effect, 'target');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const count = numberParameter(effect, 'count', true);
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      count !== null &&
      count >= 0 &&
      (target === 'scored-card' || target === 'held-card') &&
      (copyFacet === 'output' || copyFacet === 'trigger' || copyFacet === 'none')
      ? [{ type: 'joker-retrigger-card', target, predicate, count, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-create-content': (effect) => {
    const family = stringParameter(effect, 'family');
    const rarity = stringParameter(effect, 'rarity');
    const count = numberParameter(effect, 'count', true);
    const capacityRequired = booleanParameter(effect, 'capacityRequired');
    const stickerPolicy = stringParameter(effect, 'stickerPolicy');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      count !== null &&
      count >= 0 &&
      rarity !== null &&
      capacityRequired !== null &&
      stickerPolicy !== null &&
      (family === 'joker' ||
        family === 'tarot' ||
        family === 'planet' ||
        family === 'spectral' ||
        family === 'playing-card') &&
      (copyFacet === 'output' || copyFacet === 'trigger' || copyFacet === 'none')
      ? [
          {
            type: 'joker-create-content',
            family,
            count,
            rarity,
            predicate,
            capacityRequired,
            stickerPolicy,
            copyFacet,
          },
        ]
      : [];
  },
  'bxqp:handler:joker-create-playing-card': (effect) => {
    const enhancementId = stringParameter(effect, 'enhancementId');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return enhancementId !== null &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      (copyFacet === 'output' || copyFacet === 'trigger' || copyFacet === 'none')
      ? [{ type: 'joker-create-playing-card', enhancementId, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-destroy-right-grow': (effect) => {
    const stateKey = stringParameter(effect, 'stateKey');
    const saleValueScale = numberParameter(effect, 'saleValueScale');
    const copyFacet = stringParameter(effect, 'copyFacet');
    return stateKey !== null &&
      saleValueScale !== null &&
      saleValueScale >= 0 &&
      copyFacet === 'none'
      ? [{ type: 'joker-destroy-right-grow', stateKey, saleValueScale, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-destroy-source': (effect) => {
    const observationKey = stringParameter(effect, 'observationKey');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [{ type: 'joker-destroy-source', predicate, observationKey, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-state-change': (effect) => {
    const key = stringParameter(effect, 'key');
    const mode = stringParameter(effect, 'mode');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    const value = jsonParameter(effect, 'value', (candidate) =>
      jokerValueSchema.safeParse(candidate),
    );
    return key !== null &&
      predicate !== null &&
      value !== null &&
      validateJokerPredicateDepth(predicate) &&
      (mode === 'set' || mode === 'add' || mode === 'decrement') &&
      copyFacet === 'none'
      ? [{ type: 'joker-state-change', key, mode, value, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-level-current-hand': (effect) => {
    const levels = numberParameter(effect, 'levels', true);
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return levels !== null &&
      levels >= 0 &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-level-current-hand', levels, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-sell-value-add': (effect) => {
    const amount = numberParameter(effect, 'amount', true);
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return amount !== null &&
      amount >= 0 &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [{ type: 'joker-sell-value-add', amount, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-round-resource': (effect) => {
    const resource = stringParameter(effect, 'resource');
    const mode = stringParameter(effect, 'mode');
    const value = numberParameter(effect, 'value', true);
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (candidate) =>
      jokerPredicateSchema.safeParse(candidate),
    );
    return (resource === 'hands' || resource === 'discards') &&
      (mode === 'add' || mode === 'set') &&
      value !== null &&
      value >= 0 &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-round-resource', resource, mode, value, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-clone-played-card': (effect) => {
    const snapshot = stringParameter(effect, 'snapshot');
    const destination = stringParameter(effect, 'destination');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      snapshot === 'command-entry' &&
      destination === 'hand' &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-clone-played-card', predicate, snapshot, destination, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-add-card-bonus': (effect) => {
    const amount = numberParameter(effect, 'amount', true);
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return amount !== null &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-add-card-bonus', amount, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-transform-enhancement': (effect) => {
    const enhancementId = effect.parameters.enhancementId;
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return (typeof enhancementId === 'string' || enhancementId === null) &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      (copyFacet === 'output' || copyFacet === 'trigger' || copyFacet === 'none')
      ? [
          {
            type: 'joker-transform-enhancement',
            enhancementId,
            predicate,
            copyFacet,
          },
        ]
      : [];
  },
  'bxqp:handler:joker-destroy-event-card': (effect) => {
    const target = stringParameter(effect, 'target');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return (target === 'played-singleton' || target === 'discarded-singleton') &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [{ type: 'joker-destroy-event-card', target, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-random-destroy-other': (effect) => {
    const excludePermanent = booleanParameter(effect, 'excludePermanent');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return excludePermanent !== null &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [
          {
            type: 'joker-random-destroy-other',
            excludePermanent,
            predicate,
            copyFacet,
          },
        ]
      : [];
  },
  'bxqp:handler:joker-state-change-clamped': (effect) => {
    const key = stringParameter(effect, 'key');
    const mode = stringParameter(effect, 'mode');
    const minimum = effect.parameters.minimum;
    const maximum = effect.parameters.maximum;
    const destroyAtOrBelow = effect.parameters.destroyAtOrBelow;
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    const value = jsonParameter(effect, 'value', (candidate) =>
      jokerValueSchema.safeParse(candidate),
    );
    const nullableNumber = (candidate: unknown): candidate is number | null =>
      candidate === null ||
      (typeof candidate === 'number' && Number.isSafeInteger(candidate));
    return key !== null &&
      (mode === 'set' || mode === 'add') &&
      nullableNumber(minimum) &&
      nullableNumber(maximum) &&
      nullableNumber(destroyAtOrBelow) &&
      predicate !== null &&
      value !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [
          {
            type: 'joker-state-change-clamped',
            key,
            mode,
            value,
            minimum,
            maximum,
            destroyAtOrBelow,
            predicate,
            copyFacet,
          },
        ]
      : [];
  },
  'bxqp:handler:joker-set-target': (effect) => {
    const scope = stringParameter(effect, 'scope');
    const target = stringParameter(effect, 'target');
    const policy = stringParameter(effect, 'policy');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return (scope === 'source' || scope === 'shared') &&
      (target === 'hand' || target === 'rank' || target === 'suit') &&
      (policy === 'eligible-hand' ||
        policy === 'weighted-full-deck-rank' ||
        policy === 'nonrepeating-suit') &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [{ type: 'joker-set-target', scope, target, policy, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-inventory-sell-value-add': (effect) => {
    const family = stringParameter(effect, 'family');
    const amount = numberParameter(effect, 'amount', true);
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return (family === 'joker' || family === 'consumable' || family === 'both') &&
      amount !== null &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [
          {
            type: 'joker-inventory-sell-value-add',
            family,
            amount,
            predicate,
            copyFacet,
          },
        ]
      : [];
  },
  'bxqp:handler:joker-create-fixed-tag': (effect) => {
    const tagContentId = stringParameter(effect, 'tagContentId');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return tagContentId !== null &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-create-fixed-tag', tagContentId, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-disable-current-boss': (effect) => {
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-disable-current-boss', predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-passive-capability': (effect) => {
    const capability = stringParameter(effect, 'capability');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const value = jsonParameter(effect, 'value', (candidate) =>
      jokerValueSchema.safeParse(candidate),
    );
    return (capability === 'all-played-cards-score' ||
      capability === 'straight-maximum-step' ||
      capability === 'hand-size-delta' ||
      capability === 'discards-per-round-delta' ||
      capability === 'extra-interest') &&
      value !== null &&
      copyFacet === 'none'
      ? [{ type: 'joker-passive-capability', capability, value, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-after-rarity': (effect) => {
    const rarity = stringParameter(effect, 'rarity');
    const factor = numberParameter(effect, 'factor');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return (rarity === 'common' ||
      rarity === 'uncommon' ||
      rarity === 'rare' ||
      rarity === 'legendary') &&
      factor !== null &&
      factor >= 0 &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'trigger'
      ? [{ type: 'joker-after-rarity', rarity, factor, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:joker-record-observation': (effect) => {
    const key = stringParameter(effect, 'key');
    const copyFacet = stringParameter(effect, 'copyFacet');
    const predicate = jsonParameter(effect, 'predicate', (value) =>
      jokerPredicateSchema.safeParse(value),
    );
    return key !== null &&
      predicate !== null &&
      validateJokerPredicateDepth(predicate) &&
      copyFacet === 'none'
      ? [{ type: 'joker-record-observation', key, predicate, copyFacet }]
      : [];
  },
  'bxqp:handler:rule-patch': (effect) => {
    const key = stringParameter(effect, 'key');
    const mode = stringParameter(effect, 'mode');
    const value = primitiveParameter(effect, 'value');
    return key !== null &&
      (mode === 'set' || mode === 'add' || mode === 'multiply') &&
      (typeof value === 'number' || typeof value === 'boolean')
      ? [{ type: 'patch-rule', key, mode, value }]
      : [];
  },
  'bxqp:handler:deck-recipe': (effect) => {
    const recipe = stringParameter(effect, 'recipe');
    return recipe === null
      ? []
      : [
          {
            type: 'catalog-rule',
            category: 'deck-recipe',
            key: recipe,
            value: numberParameter(effect, 'count', true) ?? 0,
          },
        ];
  },
  'bxqp:handler:target-curve': (effect) => {
    const curveId = stringParameter(effect, 'curveId');
    return curveId === null
      ? []
      : [
          {
            type: 'catalog-rule',
            category: 'target-curve',
            key: curveId,
            value: stringParameter(effect, 'anteOneThroughEight') ?? '',
          },
        ];
  },
  'bxqp:handler:sticker-roll': (effect) => {
    const stickerId = stringParameter(effect, 'stickerId');
    return stickerId === null
      ? []
      : [
          {
            type: 'catalog-rule',
            category: 'sticker-roll',
            key: stickerId,
            value: `${numberParameter(effect, 'numerator', true) ?? 0}/${numberParameter(effect, 'denominator', true) ?? 1}`,
          },
        ];
  },
  'bxqp:handler:card-modifier': (effect) => {
    const family = stringParameter(effect, 'family');
    const modifierId = stringParameter(effect, 'modifierId');
    const selection = stringParameter(effect, 'selection') ?? 'selected';
    const count = numberParameter(effect, 'count', true) ?? 0;
    return modifierId !== null &&
      (family === 'enhancement' ||
        family === 'seal' ||
        family === 'edition' ||
        family === 'sticker')
      ? [
          {
            type: 'set-card-modifier',
            family,
            modifierId,
            selection,
            count,
            numerator: numberParameter(effect, 'numerator', true),
            denominator: numberParameter(effect, 'denominator', true),
          },
        ]
      : [];
  },
  'bxqp:handler:playing-card-create': (effect) => {
    const count = numberParameter(effect, 'count', true);
    const rankPool = stringParameter(effect, 'rankPool');
    const enhancementPolicy = stringParameter(effect, 'enhancementPolicy');
    return count !== null &&
      (rankPool === 'face' || rankPool === 'ace' || rankPool === 'number') &&
      enhancementPolicy === 'random'
      ? [{ type: 'create-playing-cards', count, rankPool, enhancementPolicy }]
      : [];
  },
  'bxqp:handler:card-transform': (effect) => {
    const field = stringParameter(effect, 'field');
    const value = primitiveParameter(effect, 'value');
    const selection = stringParameter(effect, 'selection') ?? 'selected';
    const count = numberParameter(effect, 'count', true) ?? 0;
    return (typeof value === 'string' || typeof value === 'boolean') &&
      (field === 'suit' ||
        field === 'rank' ||
        field === 'full-state' ||
        field === 'debuff' ||
        field === 'face-down')
      ? [{ type: 'transform-card-field', field, value, selection, count }]
      : [];
  },
  'bxqp:handler:card-destroy': (effect) => [
    {
      type: 'destroy-card',
      money: 0,
      selection: stringParameter(effect, 'selection') ?? 'selected',
      count: numberParameter(effect, 'count', true) ?? 0,
      destructibleOnly: booleanParameter(effect, 'destructibleOnly') ?? true,
    },
  ],
  'bxqp:handler:card-copy': (effect) => {
    const source = stringParameter(effect, 'source');
    const destination = stringParameter(effect, 'destination');
    const count = numberParameter(effect, 'count', true);
    return source !== null && destination !== null && count !== null
      ? [{ type: 'copy-card-state', source, destination, count }]
      : [];
  },
  'bxqp:handler:content-create': (effect) => {
    const family = stringParameter(effect, 'family');
    const count = numberParameter(effect, 'count', true);
    const rarity = stringParameter(effect, 'rarity');
    const capacityRequired = booleanParameter(effect, 'capacityRequired');
    const stickerPolicy = stringParameter(effect, 'stickerPolicy');
    return count !== null &&
      rarity !== null &&
      capacityRequired !== null &&
      stickerPolicy !== null &&
      (family === 'joker' ||
        family === 'tarot' ||
        family === 'planet' ||
        family === 'spectral' ||
        family === 'playing-card')
      ? [
          {
            type: 'create-content-family',
            family,
            count,
            rarity,
            capacityRequired,
            stickerPolicy,
          },
        ]
      : [];
  },
  'bxqp:handler:money': (effect) => {
    const mode = stringParameter(effect, 'mode');
    const amount = numberParameter(effect, 'amount');
    if (mode === null || amount === null) return [];
    if (mode === 'add') return [{ type: 'add-money', amount }];
    if (mode === 'set-zero') return [{ type: 'set-money', value: 0 }];
    return [
      {
        type: 'catalog-money',
        mode,
        amount,
        cap: numberParameter(effect, 'cap'),
        historyKey: stringParameter(effect, 'historyKey'),
      },
    ];
  },
  'bxqp:handler:hand-level': (effect) => {
    const handType = stringParameter(effect, 'hand');
    const amount = numberParameter(effect, 'levels', true);
    if (amount === null) return [];
    return handType !== null && POKER_HAND_TYPES.includes(handType as PokerHandType)
      ? [{ type: 'level-hand', handType: handType as PokerHandType, amount }]
      : [{ type: 'level-all-hands', amount }];
  },
  'bxqp:handler:score-rule': (effect) => {
    const key = stringParameter(effect, 'key');
    const amount = numberParameter(effect, 'amount');
    if (key === null || amount === null) return [];
    if (key === 'add-chips') return [{ type: 'add-chips', amount }];
    if (key === 'add-mult') return [{ type: 'add-multiplier', amount }];
    if (key === 'multiply-mult') {
      return [{ type: 'multiply-multiplier', factor: amount }];
    }
    return [
      {
        type: 'catalog-score-rule',
        key,
        amount,
        numerator: numberParameter(effect, 'numerator', true),
        denominator: numberParameter(effect, 'denominator', true),
      },
    ];
  },
  'bxqp:handler:shop-rule': (effect) => {
    const key = stringParameter(effect, 'key');
    const value = primitiveParameter(effect, 'value');
    return key === null || value === null
      ? []
      : [{ type: 'catalog-shop-rule', key, value }];
  },
  'bxqp:handler:pack-rule': (effect) => {
    const profileId = stringParameter(effect, 'profileId');
    return profileId === null
      ? []
      : [{ type: 'record-observation', key: 'pack-profile', value: profileId }];
  },
  'bxqp:handler:blind-rule': (effect) => {
    const key = stringParameter(effect, 'key');
    const value = primitiveParameter(effect, 'value');
    if (key === null || value === null) return [];
    if (key === 'require-play-count' && typeof value === 'number') {
      return [{ type: 'require-play-count', count: value }];
    }
    if (key === 'zero-discards') return [{ type: 'set-discards', value: 0 }];
    if (key === 'one-hand') return [{ type: 'set-hands', value: 1 }];
    if (key === 'force-selected-card' && typeof value === 'number') {
      return [{ type: 'force-card-choice', count: value }];
    }
    if (key === 'first-hand-face-down') {
      return [{ type: 'draw-face-down', count: 100 }];
    }
    return [{ type: 'catalog-blind-rule', key, value }];
  },
  'bxqp:handler:tag-rule': (effect) => {
    const timing = stringParameter(effect, 'timing');
    const key = stringParameter(effect, 'key');
    const value = primitiveParameter(effect, 'value');
    if (
      timing === null ||
      key === null ||
      (typeof value !== 'string' && typeof value !== 'number')
    ) {
      return [];
    }
    if (key === 'free-reroll') return [{ type: 'free-reroll' }];
    if (key === 'free-pack') return [{ type: 'create-free-pack' }];
    if (key === 'money' && typeof value === 'number') {
      return [{ type: 'add-money', amount: value }];
    }
    return [{ type: 'catalog-tag-rule', timing, key, value }];
  },
  'bxqp:handler:restriction': (effect) => {
    const key = stringParameter(effect, 'key');
    const values = stringParameter(effect, 'values');
    return key === null || values === null
      ? []
      : [
          {
            type: 'catalog-rule',
            category: 'restriction',
            key,
            value: values,
          },
        ];
  },
} satisfies EffectHandlerRegistry;

const DEFAULT_EFFECT_HANDLERS = {
  ...CATALOG_EFFECT_HANDLERS,
  'fixture:run-economy:handler:add-chips': (effect) =>
    numericOperation(effect, 'amount', (amount) => ({ type: 'add-chips', amount })),
  'fixture:run-economy:handler:add-multiplier': (effect) =>
    numericOperation(effect, 'amount', (amount) => ({
      type: 'add-multiplier',
      amount,
    })),
  'fixture:run-economy:handler:multiply-multiplier': (effect) =>
    numericOperation(effect, 'factor', (factor) => ({
      type: 'multiply-multiplier',
      factor,
    })),
  'fixture:run-economy:handler:multiply-final-score': (effect) =>
    numericOperation(effect, 'factor', (factor) => ({
      type: 'multiply-final-score',
      factor,
    })),
  'fixture:run-economy:handler:add-money': (effect) =>
    numericOperation(effect, 'amount', (amount) => ({ type: 'add-money', amount }), true),
  'fixture:run-economy:handler:spend-money': (effect) =>
    numericOperation(
      effect,
      'amount',
      (amount) => ({ type: 'spend-money', amount }),
      true,
    ),
  'fixture:run-economy:handler:set-money': (effect) =>
    numericOperation(effect, 'value', (value) => ({ type: 'set-money', value }), true),
  'fixture:run-economy:handler:append-reward-line': (effect) => {
    const label = stringParameter(effect, 'label');
    const amount = numberParameter(effect, 'amount', true);
    return label === null || amount === null
      ? []
      : [{ type: 'append-reward-line', label, amount }];
  },
  'fixture:run-economy:handler:copy-joker': (effect) => [
    {
      type: 'copy-source',
      targetInstanceId: stringParameter(effect, 'targetInstanceId'),
      direction: directionParameter(effect),
    },
  ],
  'fixture:run-economy:handler:retrigger-source': (effect) => {
    const count = numberParameter(effect, 'count', true);
    return count === null || count < 0
      ? []
      : [
          {
            type: 'retrigger-source',
            targetInstanceId: stringParameter(effect, 'targetInstanceId'),
            direction: directionParameter(effect),
            count,
          },
        ];
  },
  'fixture:run-economy:handler:retrigger-card': (effect) => {
    const count = numberParameter(effect, 'count', true);
    return count === null || count < 0
      ? []
      : [
          {
            type: 'retrigger-card',
            count,
            onlyFirst: effect.parameters.onlyFirst === true,
          },
        ];
  },
  'fixture:run-economy:handler:debuff-suit': (effect) => {
    const suit = stringParameter(effect, 'suit');
    return suit !== null && SUITS.includes(suit as Suit)
      ? [{ type: 'debuff-suit', suit: suit as Suit }]
      : [];
  },
  'fixture:run-economy:handler:debuff-card': (effect) =>
    stringOperation(effect, 'cardId', (cardId) => ({ type: 'debuff-card', cardId })),
  'fixture:run-economy:handler:enable-card': (effect) =>
    stringOperation(effect, 'cardId', (cardId) => ({ type: 'enable-card', cardId })),
  'fixture:run-economy:handler:create-item': (effect) =>
    stringOperation(effect, 'contentId', (contentId) => ({
      type: 'create-item',
      contentId,
    })),
  'fixture:run-economy:handler:transform-card': (effect) => {
    const value = effect.parameters.enhancementId;
    return value === null || typeof value === 'string'
      ? [{ type: 'transform-card', enhancementId: value }]
      : [];
  },
  'fixture:run-economy:handler:destroy-card': (effect) => [
    {
      type: 'destroy-card',
      money: numberParameter(effect, 'money', true) ?? 0,
    },
  ],
  'fixture:run-economy:handler:add-hands': (effect) =>
    numericOperation(effect, 'amount', (amount) => ({ type: 'add-hands', amount }), true),
  'fixture:run-economy:handler:set-hands': (effect) =>
    numericOperation(effect, 'value', (value) => ({ type: 'set-hands', value }), true),
  'fixture:run-economy:handler:set-discards': (effect) =>
    numericOperation(
      effect,
      'value',
      (value) => ({
        type: 'set-discards',
        value,
      }),
      true,
    ),
  'fixture:run-economy:handler:adjust-hand-size': (effect) =>
    numericOperation(
      effect,
      'amount',
      (amount) => ({
        type: 'adjust-hand-size',
        amount,
      }),
      true,
    ),
  'fixture:run-economy:handler:draw-face-down': (effect) =>
    numericOperation(
      effect,
      'count',
      (count) => ({ type: 'draw-face-down', count }),
      true,
    ),
  'fixture:run-economy:handler:force-card-choice': (effect) =>
    numericOperation(
      effect,
      'count',
      (count) => ({
        type: 'force-card-choice',
        count,
      }),
      true,
    ),
  'fixture:run-economy:handler:require-play-count': (effect) =>
    numericOperation(
      effect,
      'count',
      (count) => ({
        type: 'require-play-count',
        count,
      }),
      true,
    ),
  'fixture:run-economy:handler:add-joker-slots': (effect) =>
    numericOperation(
      effect,
      'amount',
      (amount) => ({
        type: 'add-joker-slots',
        amount,
      }),
      true,
    ),
  'fixture:run-economy:handler:add-consumable-slots': (effect) =>
    numericOperation(
      effect,
      'amount',
      (amount) => ({
        type: 'add-consumable-slots',
        amount,
      }),
      true,
    ),
  'fixture:run-economy:handler:set-discount': (effect) =>
    numericOperation(
      effect,
      'basisPoints',
      (basisPoints) => ({
        type: 'set-discount',
        basisPoints,
      }),
      true,
    ),
  'fixture:run-economy:handler:set-interest-cap': (effect) =>
    numericOperation(
      effect,
      'value',
      (value) => ({
        type: 'set-interest-cap',
        value,
      }),
      true,
    ),
  'fixture:run-economy:handler:set-reroll-cost': (effect) =>
    numericOperation(
      effect,
      'value',
      (value) => ({
        type: 'set-reroll-cost',
        value,
      }),
      true,
    ),
  'fixture:run-economy:handler:enable-boss-reroll': (effect) =>
    numericOperation(
      effect,
      'cost',
      (cost) => ({ type: 'enable-boss-reroll', cost }),
      true,
    ),
  'fixture:run-economy:handler:free-reroll': () => [{ type: 'free-reroll' }],
  'fixture:run-economy:handler:create-free-pack': () => [{ type: 'create-free-pack' }],
  'fixture:run-economy:handler:schedule-deferred': (effect) => {
    const window = stringParameter(effect, 'window');
    return window !== null && EFFECT_WINDOWS.includes(window as EffectWindow)
      ? [{ type: 'schedule-deferred', window: window as EffectWindow }]
      : [];
  },
  'fixture:run-economy:handler:set-rank': (effect) => {
    const rank = stringParameter(effect, 'rank');
    return rank !== null && RANKS.includes(rank as Rank)
      ? [{ type: 'set-rank', rank: rank as Rank }]
      : [];
  },
  'fixture:run-economy:handler:level-hand': (effect) => {
    const handType = stringParameter(effect, 'handType');
    const amount = numberParameter(effect, 'amount', true);
    return handType !== null &&
      POKER_HAND_TYPES.includes(handType as PokerHandType) &&
      amount !== null
      ? [{ type: 'level-hand', handType: handType as PokerHandType, amount }]
      : [];
  },
  'fixture:run-economy:handler:record-observation': (effect) => {
    const key = stringParameter(effect, 'key');
    const value = effect.parameters.value;
    return key !== null &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean')
      ? [{ type: 'record-observation', key, value }]
      : [];
  },
} satisfies EffectHandlerRegistry;

export const DEFAULT_EFFECT_HANDLER_REGISTRY: EffectHandlerRegistry = Object.freeze(
  DEFAULT_EFFECT_HANDLERS,
);

export function hasRegisteredEffectHandler(
  handlerId: string,
  registry: EffectHandlerRegistry = DEFAULT_EFFECT_HANDLER_REGISTRY,
): boolean {
  return Object.hasOwn(registry, handlerId);
}

export type EffectOperationResolution =
  | { readonly ok: true; readonly operations: readonly EffectOperation[] }
  | {
      readonly ok: false;
      readonly code: 'effect-handler-missing';
      readonly message: string;
    };

export function resolveEffectOperations(
  effect: EffectReference,
  window: EffectWindow,
  state: RunStateV2 | null = null,
  registry: EffectHandlerRegistry = DEFAULT_EFFECT_HANDLER_REGISTRY,
): EffectOperationResolution {
  if (!effect.windows.includes(window)) return { ok: true, operations: [] };
  const handler = registry[effect.handlerId];
  if (!handler) {
    return {
      ok: false,
      code: 'effect-handler-missing',
      message: `效果处理器未注册：${effect.handlerId}`,
    };
  }
  return { ok: true, operations: handler(effect, { window, state }) };
}

export interface EffectQueueSource {
  readonly instanceId: string;
  readonly position: number;
  readonly effects: readonly EffectReference[];
  readonly debuffed?: boolean;
}

export interface ResolvedEffectOperation {
  readonly effectId: string;
  readonly handlerId: string;
  readonly sourceInstanceId: string;
  readonly sourcePosition: number;
  readonly copiedBy: readonly string[];
  readonly operation: EffectOperation;
}

export type EffectQueueFailureCode =
  'effect-cycle' | 'effect-budget' | 'effect-handler-missing';

export type EffectQueueResolution =
  | {
      readonly ok: true;
      readonly operations: readonly ResolvedEffectOperation[];
      readonly operationCount: number;
    }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode;
      readonly message: string;
    };

export interface ResolveEffectQueueOptions {
  readonly registry?: EffectHandlerRegistry;
  readonly state?: RunStateV2 | null;
  readonly maximumDepth?: number;
  readonly maximumOperations?: number;
}

function targetSourceIndex(
  sources: readonly EffectQueueSource[],
  sourceIndex: number,
  operation: Extract<
    EffectOperation,
    { readonly type: 'copy-source' | 'retrigger-source' }
  >,
): number {
  if (operation.targetInstanceId) {
    return sources.findIndex(
      (source) => source.instanceId === operation.targetInstanceId,
    );
  }
  if (operation.direction === 'left') return sourceIndex - 1;
  return operation.direction === 'right' ? sourceIndex + 1 : -1;
}

export function resolveEffectQueue(
  inputSources: readonly EffectQueueSource[],
  window: EffectWindow,
  options: ResolveEffectQueueOptions = {},
): EffectQueueResolution {
  const registry = options.registry ?? DEFAULT_EFFECT_HANDLER_REGISTRY;
  const maximumDepth = options.maximumDepth ?? 32;
  const maximumOperations = options.maximumOperations ?? 10_000;
  const state = options.state ?? null;
  const sources = [...inputSources]
    .filter((source) => !source.debuffed)
    .sort(
      (left, right) =>
        left.position - right.position || left.instanceId.localeCompare(right.instanceId),
    );
  const output: ResolvedEffectOperation[] = [];
  let operationCount = 0;
  let failure: Extract<EffectQueueResolution, { readonly ok: false }> | null = null;

  const resolveSource = (
    sourceIndex: number,
    ancestry: readonly number[],
    copiedBy: readonly string[],
  ): void => {
    if (failure) return;
    if (ancestry.length > maximumDepth) {
      failure = {
        ok: false,
        code: 'effect-cycle',
        message: '效果复制或重演深度超过安全上限',
      };
      return;
    }
    const source = sources[sourceIndex];
    if (!source) return;
    const effects = [...source.effects]
      .filter((effect) => effect.windows.includes(window))
      .sort(
        (left, right) =>
          left.priority - right.priority || left.id.localeCompare(right.id),
      );
    for (const effect of effects) {
      operationCount += 1;
      if (operationCount > maximumOperations) {
        failure = {
          ok: false,
          code: 'effect-budget',
          message: '效果操作超过安全上限，已拒绝本次结算',
        };
        return;
      }
      const resolved = resolveEffectOperations(effect, window, state, registry);
      if (!resolved.ok) {
        failure = resolved;
        return;
      }
      for (const operation of resolved.operations) {
        operationCount += 1;
        if (operationCount > maximumOperations) {
          failure = {
            ok: false,
            code: 'effect-budget',
            message: '效果操作超过安全上限，已拒绝本次结算',
          };
          return;
        }
        output.push({
          effectId: effect.id,
          handlerId: effect.handlerId,
          sourceInstanceId: source.instanceId,
          sourcePosition: source.position,
          copiedBy,
          operation,
        });
        if (operation.type !== 'copy-source' && operation.type !== 'retrigger-source') {
          continue;
        }
        const targetIndex = targetSourceIndex(sources, sourceIndex, operation);
        if (targetIndex < 0) continue;
        if (ancestry.includes(targetIndex)) {
          failure = {
            ok: false,
            code: 'effect-cycle',
            message: '效果复制或重演关系形成循环，已拒绝本次结算',
          };
          return;
        }
        const repeats = operation.type === 'retrigger-source' ? operation.count : 1;
        for (let repeat = 0; repeat < repeats; repeat += 1) {
          resolveSource(
            targetIndex,
            [...ancestry, targetIndex],
            [...copiedBy, source.instanceId],
          );
          if (failure) return;
        }
      }
    }
  };

  for (let index = 0; index < sources.length; index += 1) {
    resolveSource(index, [index], []);
    if (failure) return failure;
  }
  return { ok: true, operations: output, operationCount };
}
