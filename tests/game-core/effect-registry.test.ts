import {
  DEFAULT_EFFECT_HANDLER_REGISTRY,
  resolveEffectOperations,
  resolveEffectQueue,
  type EffectHandlerRegistry,
  type EffectOperation,
} from '../../src/game-core/effects/registry';
import {
  EFFECT_WINDOWS,
  type EffectReference,
  type EffectWindow,
} from '../../src/game-core/model/runV2';

function effect(
  id: string,
  handlerId: string,
  parameters: EffectReference['parameters'] = {},
  windows: readonly EffectWindow[] = ['item-acquired'],
  priority = 0,
): EffectReference {
  return { id, handlerId, parameters, windows, priority };
}

describe('类型化效果注册表', () => {
  it.each(EFFECT_WINDOWS)('%s 窗口可经同一有界队列解析', (window) => {
    const registry = {
      'test:window': (_effect, context) => [
        { type: 'record-observation', key: 'window', value: context.window },
      ],
    } satisfies EffectHandlerRegistry;
    const result = resolveEffectQueue(
      [
        {
          instanceId: 'test:source',
          position: 0,
          effects: [effect(`test:${window}`, 'test:window', {}, [window])],
        },
      ],
      window,
      { registry },
    );

    expect(result).toMatchObject({
      ok: true,
      operations: [
        {
          sourceInstanceId: 'test:source',
          operation: { type: 'record-observation', value: window },
        },
      ],
    });
  });

  it('每种内建原语都由 handler 数据物化，不需要路由分支', () => {
    const cases = [
      ['add-chips', 'add-chips', { amount: 2 }],
      ['add-multiplier', 'add-multiplier', { amount: 2 }],
      ['multiply-multiplier', 'multiply-multiplier', { factor: 2 }],
      ['multiply-final-score', 'multiply-final-score', { factor: 2 }],
      ['add-money', 'add-money', { amount: 2 }],
      ['spend-money', 'spend-money', { amount: 2 }],
      ['set-money', 'set-money', { value: 2 }],
      ['append-reward-line', 'append-reward-line', { label: '加演', amount: 2 }],
      ['copy-joker', 'copy-source', { direction: 'right' }],
      ['retrigger-source', 'retrigger-source', { direction: 'left', count: 2 }],
      ['retrigger-card', 'retrigger-card', { count: 2, onlyFirst: true }],
      ['debuff-suit', 'debuff-suit', { suit: 'hearts' }],
      ['debuff-card', 'debuff-card', { cardId: 'card:1' }],
      ['enable-card', 'enable-card', { cardId: 'card:1' }],
      ['create-item', 'create-item', { contentId: 'item:1' }],
      ['transform-card', 'transform-card', { enhancementId: 'enhancement:wild' }],
      ['destroy-card', 'destroy-card', { money: 2 }],
      ['add-hands', 'add-hands', { amount: 2 }],
      ['set-hands', 'set-hands', { value: 2 }],
      ['set-discards', 'set-discards', { value: 2 }],
      ['adjust-hand-size', 'adjust-hand-size', { amount: 2 }],
      ['draw-face-down', 'draw-face-down', { count: 2 }],
      ['force-card-choice', 'force-card-choice', { count: 2 }],
      ['require-play-count', 'require-play-count', { count: 2 }],
      ['add-joker-slots', 'add-joker-slots', { amount: 2 }],
      ['add-consumable-slots', 'add-consumable-slots', { amount: 2 }],
      ['set-discount', 'set-discount', { basisPoints: 7500 }],
      ['set-interest-cap', 'set-interest-cap', { value: 10 }],
      ['set-reroll-cost', 'set-reroll-cost', { value: 3 }],
      ['enable-boss-reroll', 'enable-boss-reroll', { cost: 10 }],
      ['free-reroll', 'free-reroll', {}],
      ['create-free-pack', 'create-free-pack', {}],
      ['schedule-deferred', 'schedule-deferred', { window: 'after-hand' }],
      ['set-rank', 'set-rank', { rank: 'ace' }],
      ['level-hand', 'level-hand', { handType: 'pair', amount: 1 }],
      ['record-observation', 'record-observation', { key: 'hands', value: 1 }],
      ['bxqp:rule-patch', 'patch-rule', { key: 'hand-size', mode: 'add', value: 1 }],
      [
        'bxqp:card-modifier',
        'set-card-modifier',
        { family: 'seal', modifierId: 'bxqp:seal:echo-knot' },
      ],
      ['bxqp:card-transform', 'transform-card-field', { field: 'suit', value: 'hearts' }],
      [
        'bxqp:card-copy',
        'copy-card-state',
        { source: 'selected', destination: 'new-playing-cards', count: 2 },
      ],
      [
        'bxqp:playing-card-create',
        'create-playing-cards',
        { count: 3, rankPool: 'face', enhancementPolicy: 'random' },
      ],
      [
        'bxqp:content-create',
        'create-content-family',
        {
          family: 'tarot',
          count: 1,
          rarity: 'any',
          capacityRequired: true,
          stickerPolicy: 'none',
        },
      ],
      [
        'bxqp:hand-level',
        'level-all-hands',
        { hand: null, levels: 1, chips: 0, mult: 0 },
      ],
      [
        'bxqp:money',
        'catalog-money',
        { mode: 'cap-add', amount: 1, cap: 20, historyKey: 'current-nonnegative-money' },
      ],
      [
        'bxqp:score-rule',
        'catalog-score-rule',
        { key: 'halve-base', amount: 0.5, numerator: null, denominator: null },
      ],
      ['bxqp:shop-rule', 'catalog-shop-rule', { key: 'family-weight', value: 'tarot:2' }],
      [
        'bxqp:blind-rule',
        'catalog-blind-rule',
        { key: 'hand-type-no-repeat', value: true },
      ],
      [
        'bxqp:tag-rule',
        'catalog-tag-rule',
        { timing: 'next-shop', key: 'voucher', value: 1 },
      ],
      ['bxqp:restriction', 'catalog-rule', { key: 'ban-content', values: 'one|two' }],
    ] as const satisfies readonly [
      string,
      EffectOperation['type'],
      EffectReference['parameters'],
    ][];
    type CoveredOperation = (typeof cases)[number][1];
    const exhaustive: Exclude<EffectOperation['type'], CoveredOperation> extends never
      ? true
      : false = true;
    expect(exhaustive).toBe(true);

    for (const [handlerSuffix, operationType, parameters] of cases) {
      const window =
        handlerSuffix === 'schedule-deferred' ? 'after-hand' : 'item-acquired';
      const handlerId = handlerSuffix.startsWith('bxqp:')
        ? `bxqp:handler:${handlerSuffix.slice('bxqp:'.length)}`
        : `fixture:run-economy:handler:${handlerSuffix}`;
      const resolved = resolveEffectOperations(
        effect(`test:${handlerSuffix}`, handlerId, parameters, [window]),
        window,
        null,
        DEFAULT_EFFECT_HANDLER_REGISTRY,
      );
      expect(resolved).toMatchObject({
        ok: true,
        operations: [{ type: operationType }],
      });
    }
  });

  it('复制与有消耗重演保留源顺序和祖先，循环及预算越界整体失败', () => {
    const sources = [
      {
        instanceId: 'source:a',
        position: 0,
        effects: [
          effect(
            'effect:copy-right',
            'fixture:run-economy:handler:copy-joker',
            { direction: 'right' },
            ['joker-independent'],
          ),
        ],
      },
      {
        instanceId: 'source:b',
        position: 1,
        effects: [
          effect('effect:add', 'fixture:run-economy:handler:add-chips', { amount: 7 }, [
            'joker-independent',
          ]),
        ],
      },
      {
        instanceId: 'source:c',
        position: 2,
        effects: [
          effect(
            'effect:repeat-b',
            'fixture:run-economy:handler:retrigger-source',
            { targetInstanceId: 'source:b', count: 2 },
            ['joker-independent'],
          ),
        ],
      },
    ];
    const resolved = resolveEffectQueue(sources, 'joker-independent');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const additions = resolved.operations.filter(
      (entry) => entry.operation.type === 'add-chips',
    );
    expect(additions).toHaveLength(4);
    expect(additions.map((entry) => entry.copiedBy)).toEqual([
      ['source:a'],
      [],
      ['source:c'],
      ['source:c'],
    ]);

    const cyclic = resolveEffectQueue(
      [
        sources[0]!,
        {
          ...sources[1]!,
          effects: [
            effect(
              'effect:copy-left',
              'fixture:run-economy:handler:copy-joker',
              { direction: 'left' },
              ['joker-independent'],
            ),
          ],
        },
      ],
      'joker-independent',
    );
    expect(cyclic).toMatchObject({ ok: false, code: 'effect-cycle' });

    expect(
      resolveEffectQueue(sources, 'joker-independent', { maximumOperations: 2 }),
    ).toMatchObject({ ok: false, code: 'effect-budget' });
  });

  it('未注册 handler 会显式失败', () => {
    expect(
      resolveEffectOperations(
        effect('test:missing', 'test:missing-handler'),
        'item-acquired',
      ),
    ).toMatchObject({ ok: false, code: 'effect-handler-missing' });
  });
});
