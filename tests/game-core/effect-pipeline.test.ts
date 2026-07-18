import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import { stableId } from '../../src/game-core/model/ids';
import type {
  EffectReference,
  OwnedJokerV2,
  RunPlayingCard,
  RunStateV2,
} from '../../src/game-core/model/runV2';
import { materializeBlind } from '../../src/game-core/rules/ante';

function startBoss(blindId: string): RunStateV2 {
  const initial = createRunEconomyFixtureRun({ seed: `boss:${blindId}` });
  const definition = initial.content.blinds.find((blind) => blind.id === blindId);
  if (!definition) throw new Error(`缺少班主：${blindId}`);
  const prepared: RunStateV2 = {
    ...initial,
    progress: {
      ...initial.progress,
      blindPosition: 'boss',
      lineup: { ...initial.progress.lineup, boss: materializeBlind(definition) },
    },
  };
  const result = executeCommandV2(prepared, {
    type: 'select-blind',
    checkpointId: prepared.checkpointId,
    position: 'boss',
  });
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state;
}

function effect(
  id: string,
  handlerId: string,
  parameters: EffectReference['parameters'],
): EffectReference {
  return { id, handlerId, windows: ['scored-card'], priority: 0, parameters };
}

function joker(instance: string, effects: readonly EffectReference[]): OwnedJokerV2 {
  return {
    instanceId: stableId<'joker-instance'>(instance),
    contentId: `test:${instance}`,
    name: instance,
    description: instance,
    baseCost: 1,
    editionCost: 0,
    editionId: null,
    effects,
    slotContribution: 1,
    sellValueOverride: null,
    debuffed: false,
  };
}

describe('有序效果流水线', () => {
  it('计分流水线使用持久化牌型等级', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'leveled-pair' });
    const aces = initial.deck.cards.filter((card) => card.rank === 'ace').slice(0, 2);
    const state: RunStateV2 = {
      ...initial,
      rules: {
        ...initial.rules,
        handLevels: { ...initial.rules.handLevels, pair: 2 },
      },
    };
    const result = resolveHandScoreV2(state, aces);

    expect(result).toMatchObject({
      ok: true,
      breakdown: {
        handType: 'pair',
        handLevel: 2,
        baseChips: 25,
        cardChips: 22,
        multiplier: 3,
        score: 141,
      },
    });
  });

  it('班主/奇牌的出牌前效果先于计分牌，消耗牌全局效果最后结算', () => {
    const initial = createRunEconomyFixtureRun({
      seed: 'before-and-global-score',
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
      startingConsumableContentIds: ['fixture:run-economy:item:consumable:ace-paint'],
    });
    const joker = initial.inventory.jokers[0];
    const consumable = initial.inventory.consumables[0];
    const ace = initial.deck.cards.find((card) => card.rank === 'ace');
    if (!joker || !consumable || !ace) throw new Error('缺少计分效果夹具');
    const state: RunStateV2 = {
      ...initial,
      inventory: {
        ...initial.inventory,
        jokers: [
          {
            ...joker,
            effects: [
              {
                id: 'test:before:add-chips',
                handlerId: 'fixture:run-economy:handler:add-chips',
                windows: ['before-hand'],
                priority: 0,
                parameters: { amount: 5 },
              },
            ],
          },
        ],
        consumables: [
          {
            ...consumable,
            effects: [
              {
                id: 'test:global:double-score',
                handlerId: 'fixture:run-economy:handler:multiply-final-score',
                windows: ['after-hand'],
                priority: 0,
                parameters: { factor: 2 },
              },
            ],
          },
        ],
      },
    };

    const result = resolveHandScoreV2(state, [ace]);

    expect(result).toMatchObject({
      ok: true,
      breakdown: { baseChips: 5, cardChips: 16, multiplier: 1, score: 42 },
    });
    if (result.ok) {
      expect(result.breakdown.trace).toContain('before:test:before:add-chips:chips+5');
      expect(result.breakdown.trace).toContain('global:test:global:double-score:scorex2');
    }
  });

  it('按计分牌、重演、加倍率、乘倍率的固定顺序结算并留下追踪', () => {
    const state = createRunEconomyFixtureRun({
      seed: 'ordered-score',
      startingJokerContentIds: [
        'fixture:run-economy:item:joker:echo',
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:double-mask',
      ],
    });
    const ace = state.deck.cards.find(
      (card): card is RunPlayingCard => card.suit === 'spades' && card.rank === 'ace',
    );
    if (!ace) throw new Error('缺少黑桃 A');

    const result = resolveHandScoreV2(state, [ace]);
    expect(result).toMatchObject({
      ok: true,
      breakdown: { cardChips: 22, multiplier: 10, score: 270 },
    });
    if (!result.ok) return;
    expect(result.breakdown.trace).toEqual([
      'window:before-hand',
      'hand:high-card',
      'base:5x1',
      'window:scored-card',
      `card:${ace.id}:chips+11`,
      `retrigger:fixture:run-economy:effect:retrigger-first:${ace.id}:chips+11`,
      'window:held-card',
      'window:joker-independent',
      expect.stringContaining('fixture:run-economy:effect:add-mult:mult+4'),
      expect.stringContaining('fixture:run-economy:effect:multiply-mult:multx2'),
      'window:after-hand',
      'score:270',
    ]);
  });

  it('被班主压制的计分牌不贡献筹码，也不会被重演', () => {
    const state = startBoss('fixture:run-economy:blind:red-curtain');
    const heart = state.deck.cards.find((card) => card.suit === 'hearts');
    if (!heart) throw new Error('缺少红桃牌');
    const withEcho: RunStateV2 = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: createRunEconomyFixtureRun({
          seed: 'echo-source',
          startingJokerContentIds: ['fixture:run-economy:item:joker:echo'],
        }).inventory.jokers,
      },
    };

    const result = resolveHandScoreV2(withEcho, [heart]);
    expect(result).toMatchObject({ ok: true, breakdown: { cardChips: 0, score: 5 } });
    if (result.ok) {
      expect(result.breakdown.trace).toContain(`card:${heart.id}:debuffed`);
      expect(result.breakdown.trace.some((line) => line.startsWith('retrigger:'))).toBe(
        false,
      );
    }
  });

  it('拒绝复制循环与超预算重演，不改变调用者状态', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'effect-guards' });
    const leftId = stableId<'joker-instance'>('test:left');
    const rightId = stableId<'joker-instance'>('test:right');
    const cyclic: RunStateV2 = {
      ...initial,
      inventory: {
        ...initial.inventory,
        jokers: [
          joker(leftId, [
            effect('copy-right', 'fixture:run-economy:handler:copy-joker', {
              targetInstanceId: rightId,
            }),
          ]),
          joker(rightId, [
            effect('copy-left', 'fixture:run-economy:handler:copy-joker', {
              targetInstanceId: leftId,
            }),
          ]),
        ],
      },
    };
    const card = cyclic.deck.cards[0]!;
    const before = structuredClone(cyclic);
    expect(resolveHandScoreV2(cyclic, [card])).toMatchObject({
      ok: false,
      code: 'effect-cycle',
    });
    expect(cyclic).toEqual(before);

    const overBudget: RunStateV2 = {
      ...initial,
      inventory: {
        ...initial.inventory,
        jokers: [
          joker('test:overflow', [
            effect('overflow', 'fixture:run-economy:handler:retrigger-card', {
              count: 10_001,
            }),
          ]),
        ],
      },
    };
    expect(resolveHandScoreV2(overBudget, [overBudget.deck.cards[0]!])).toMatchObject({
      ok: false,
      code: 'effect-budget',
    });
  });
});

describe('班主与延迟戏签效果', () => {
  it.each([
    ['fixture:run-economy:blind:dry-well', 'discardsRemaining', 0],
    ['fixture:run-economy:blind:single-drum', 'handsRemaining', 1],
  ] as const)('%s 在开场修改回合资源', (blindId, field, expected) => {
    const state = startBoss(blindId);
    expect(state.round?.[field]).toBe(expected);
  });

  it('压轴强制牌会持久选中且不能手动取消', () => {
    const state = startBoss('fixture:run-economy:blind:forced-lantern');
    const forced = state.round?.forcedSelectedCardIds[0];
    expect(forced).toBeDefined();
    if (!forced) return;
    const before = structuredClone(state);
    const result = executeCommandV2(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: forced,
    });
    expect(result).toMatchObject({ ok: false, rejection: { code: 'forced-card' } });
    expect(state).toEqual(before);
  });

  it('五面班主拒绝非五张出牌且保持检查点不变', () => {
    let state = startBoss('fixture:run-economy:blind:five-mask');
    const cardId = state.round?.handIds[0];
    if (!cardId) throw new Error('缺少手牌');
    const toggled = executeCommandV2(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
    if (!toggled.ok) throw new Error(toggled.rejection.message);
    state = toggled.state;
    const before = structuredClone(state);
    const result = executeCommandV2(state, {
      type: 'play-selected',
      checkpointId: state.checkpointId,
    });
    expect(result).toMatchObject({ ok: false, rejection: { code: 'hand-restricted' } });
    expect(state).toEqual(before);
  });

  it('加演戏签只在下一回合生效一次', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'deferred-tag' });
    const tagged: RunStateV2 = {
      ...initial,
      inventory: {
        ...initial.inventory,
        tags: [
          {
            instanceId: 'test:extra-hand-tag',
            contentId: 'fixture:run-economy:tag:extra-hand',
            consumed: false,
            deferredWindow: 'round-start',
          },
        ],
      },
    };
    const result = executeCommandV2(tagged, {
      type: 'select-blind',
      checkpointId: tagged.checkpointId,
      position: 'small',
    });
    expect(result).toMatchObject({
      ok: true,
      state: {
        round: { handsRemaining: 5 },
        inventory: { tags: [{ consumed: true }] },
      },
    });
  });

  it('延迟原语把戏签从跳盲窗口调度到下一回合并且只消费一次', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'scheduled-tag-operation' });
    const tagId = initial.progress.lineup.smallTagId;
    const scheduled: RunStateV2 = {
      ...initial,
      content: {
        ...initial.content,
        tags: initial.content.tags.map((tag) =>
          tag.id === tagId
            ? {
                ...tag,
                effects: [
                  {
                    id: 'test:tag:schedule-round-start',
                    handlerId: 'fixture:run-economy:handler:schedule-deferred',
                    windows: ['blind-skipped'],
                    priority: 0,
                    parameters: { window: 'round-start' },
                  },
                  {
                    id: 'test:tag:scheduled-hand',
                    handlerId: 'fixture:run-economy:handler:add-hands',
                    windows: ['round-start'],
                    priority: 0,
                    parameters: { amount: 1 },
                  },
                ],
              }
            : tag,
        ),
      },
    };
    const skipped = executeCommandV2(scheduled, {
      type: 'skip-blind',
      checkpointId: scheduled.checkpointId,
      position: 'small',
    });
    expect(skipped).toMatchObject({
      ok: true,
      state: {
        inventory: {
          tags: [{ consumed: false, deferredWindow: 'round-start' }],
        },
      },
    });
    if (!skipped.ok) return;

    const selected = executeCommandV2(skipped.state, {
      type: 'select-blind',
      checkpointId: skipped.state.checkpointId,
      position: 'big',
    });
    expect(selected).toMatchObject({
      ok: true,
      state: {
        round: { handsRemaining: 5 },
        inventory: { tags: [{ consumed: true }] },
      },
    });
  });

  it('创建物品原语物化合法实例，缺失内容时整个命令回滚', () => {
    const base = createRunEconomyFixtureRun({
      seed: 'create-item-operation',
      targetScaleBasisPoints: 1,
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
    });
    const joker = base.inventory.jokers[0];
    if (!joker) throw new Error('缺少创建效果来源');
    const prepare = (contentId: string): RunStateV2 => ({
      ...base,
      inventory: {
        ...base.inventory,
        jokers: [
          {
            ...joker,
            effects: [
              ...joker.effects,
              {
                id: 'test:after-hand:create-item',
                handlerId: 'fixture:run-economy:handler:create-item',
                windows: ['after-hand'],
                priority: 0,
                parameters: { contentId },
              },
            ],
          },
        ],
      },
    });
    const play = (initial: RunStateV2) => {
      const selected = executeCommandV2(initial, {
        type: 'select-blind',
        checkpointId: initial.checkpointId,
        position: 'small',
      });
      if (!selected.ok) throw new Error(selected.rejection.message);
      const cardId = selected.state.round?.handIds[0];
      if (!cardId) throw new Error('缺少手牌');
      const toggled = executeCommandV2(selected.state, {
        type: 'toggle-card',
        checkpointId: selected.state.checkpointId,
        cardId,
      });
      if (!toggled.ok) throw new Error(toggled.rejection.message);
      return {
        selected: toggled.state,
        result: executeCommandV2(toggled.state, {
          type: 'play-selected',
          checkpointId: toggled.state.checkpointId,
        }),
      };
    };

    const created = play(prepare('fixture:run-economy:item:joker:paper-shadow')).result;
    expect(created).toMatchObject({
      ok: true,
      state: {
        inventory: {
          jokers: [
            {},
            {
              contentId: 'fixture:run-economy:item:joker:paper-shadow',
              slotContribution: 0,
            },
          ],
        },
      },
    });

    const missing = play(prepare('test:missing-created-item'));
    const before = structuredClone(missing.selected);
    expect(missing.result).toMatchObject({
      ok: false,
      rejection: { code: 'pool-empty' },
    });
    expect(missing.selected).toEqual(before);
  });
});
