import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { validateRunStateV2 } from '../../src/game-core/invariants/validateRunStateV2';
import { stableId } from '../../src/game-core/model/ids';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { migrateRunV1ToV2 } from '../../src/persistence/migrations/migrateRunV1ToV2';

function execute(state: RunStateV2, command: RunCommandV2): RunStateV2 {
  const result = executeCommandV2(state, command);
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state;
}

function shopState(): RunStateV2 {
  let state = createRunEconomyFixtureRun({
    seed: 'invariant-shop',
    startingMoney: 50,
    targetScaleBasisPoints: 1,
    startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
  });
  state = execute(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: 'small',
  });
  const cardId = state.round?.handIds[0];
  if (!cardId) throw new Error('缺少手牌');
  state = execute(state, {
    type: 'toggle-card',
    checkpointId: state.checkpointId,
    cardId,
  });
  state = execute(state, {
    type: 'play-selected',
    checkpointId: state.checkpointId,
  });
  return execute(state, {
    type: 'claim-round-reward',
    checkpointId: state.checkpointId,
  });
}

describe('V2 运行状态不变量', () => {
  it('接受完整迁移状态，并拒绝区域重复和阶段错配', () => {
    const valid = migrateRunV1ToV2(createFixtureRun('v2-invariant'));
    expect(validateRunStateV2(valid)).toEqual({ ok: true });

    if (!valid.round) throw new Error('夹具缺少回合');
    const duplicated = {
      ...valid,
      round: {
        ...valid.round,
        handIds: [...valid.round.handIds, valid.round.handIds[0]!],
      },
    };
    const duplicateResult = validateRunStateV2(duplicated);
    expect(duplicateResult.ok).toBe(false);
    if (duplicateResult.ok) throw new Error('重复区域不应通过');
    expect(duplicateResult.violations).toContain('活动回合的牌区必须恰好引用每张牌一次');

    const mismatched = { ...valid, phase: { kind: 'shop' as const }, shop: null };
    const phaseResult = validateRunStateV2(mismatched);
    expect(phaseResult.ok).toBe(false);
    if (phaseResult.ok) throw new Error('阶段错配不应通过');
    expect(phaseResult.violations).toContain('商店阶段必须持有商店状态');
  });

  it('允许正无穷目标但拒绝 NaN 和负分', () => {
    const valid = migrateRunV1ToV2(createFixtureRun('v2-score-boundary'));
    if (!valid.round) throw new Error('夹具缺少回合');

    expect(
      validateRunStateV2({
        ...valid,
        round: { ...valid.round, targetScore: Number.POSITIVE_INFINITY },
      }),
    ).toEqual({ ok: true });

    for (const score of [Number.NaN, -1]) {
      const result = validateRunStateV2({
        ...valid,
        round: { ...valid.round, targetScore: score },
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('非法分数不应通过');
      expect(result.violations).toContain('分数必须是非负有限数或正无穷');
    }
  });

  it('拒绝超出规则额度的欠票', () => {
    const valid = migrateRunV1ToV2(createFixtureRun('v2-debt-boundary'));
    const result = validateRunStateV2({
      ...valid,
      rules: { ...valid.rules, allowedDebt: 3 },
      economy: { ...valid.economy, money: -4 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('超额欠票不应通过');
    expect(result.violations).toContain('戏票不能超出允许的欠票额度');
  });

  it('拒绝内容中未注册的效果 handler', () => {
    const valid = migrateRunV1ToV2(createFixtureRun('v2-handler-boundary'));
    const firstBlind = valid.content.blinds[0];
    if (!firstBlind) throw new Error('夹具缺少盲注');
    const result = validateRunStateV2({
      ...valid,
      content: {
        ...valid.content,
        blinds: [
          {
            ...firstBlind,
            effects: [
              {
                id: 'test:missing-handler-effect',
                handlerId: 'test:missing-handler',
                windows: ['before-hand'],
                priority: 0,
                parameters: {},
              },
            ],
          },
          ...valid.content.blinds.slice(1),
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('未注册 handler 不应通过');
    expect(result.violations).toContain('效果处理器未注册：test:missing-handler');
  });

  it('拒绝悬空内容、重复消费、伪造价格和非法选择帧', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'cross-reference-guards' });
    const joker = createRunEconomyFixtureRun({
      seed: 'owned-joker-source',
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
    }).inventory.jokers[0];
    if (!joker) throw new Error('缺少奇牌');
    const receiptId = stableId<'reward-receipt'>('test:claimed-receipt');
    const choiceId = stableId<'choice'>('test:invalid-choice');
    const shop = shopState();
    const shopOffer = shop.shop?.cardOffers[0];
    if (!shopOffer || !shop.shop) throw new Error('缺少商店商品');

    const cases: readonly {
      readonly state: RunStateV2;
      readonly violation: string;
    }[] = [
      {
        state: {
          ...initial,
          progress: {
            ...initial.progress,
            lineup: { ...initial.progress.lineup, smallTagId: 'test:missing-tag' },
          },
        },
        violation: '当前幕阵容必须引用合法的戏签和班主',
      },
      {
        state: {
          ...initial,
          inventory: {
            ...initial.inventory,
            jokers: [{ ...joker, contentId: 'test:missing-joker' }],
          },
        },
        violation: '持有奇牌必须引用合法定义并具有有效数值',
      },
      {
        state: {
          ...initial,
          economy: {
            ...initial.economy,
            claimedRewardIds: [receiptId, receiptId],
          },
          history: {
            ...initial.history,
            claimedRewardIds: [receiptId, receiptId],
          },
        },
        violation: '奖励收据的经济与历史消费记录必须唯一且一致',
      },
      {
        state: {
          ...shop,
          shop: {
            ...shop.shop,
            cardOffers: [{ ...shopOffer, price: -1 }, ...shop.shop.cardOffers.slice(1)],
          },
        },
        violation: '商店可见商品必须引用冻结内容并具有合法价格',
      },
      {
        state: {
          ...initial,
          phase: { kind: 'choice', choiceId },
          pendingChoice: {
            current: {
              id: choiceId,
              kind: 'targets',
              optional: true,
              returnPhase: 'round',
              sourceInstanceId: 'test:source',
              effectId: 'test:effect',
              targetKind: 'playing-card',
              eligibleIds: ['test:foreign-card'],
              selectedIds: ['test:foreign-card'],
              minimumTargets: 1,
              maximumTargets: 1,
            },
            suspended: [],
          },
        },
        violation: `目标选择帧无效：${choiceId}`,
      },
    ];

    for (const testCase of cases) {
      const result = validateRunStateV2(testCase.state);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('非法状态不应通过');
      expect(result.violations).toContain(testCase.violation);
    }
  });
});
