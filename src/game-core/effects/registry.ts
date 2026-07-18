import { RANKS, SUITS, type Rank, type Suit } from '../model/cards';
import {
  EFFECT_WINDOWS,
  type EffectReference,
  type EffectWindow,
  type RunStateV2,
} from '../model/runV2';
import { POKER_HAND_TYPES, type PokerHandType } from '../poker/evaluate';

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
