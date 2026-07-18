import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { stableId } from '../../src/game-core/model/ids';
import type { RunStateV2 } from '../../src/game-core/model/runV2';

function commands(checkpointId: number): readonly RunCommandV2[] {
  const choiceId = stableId<'choice'>('test:choice');
  return [
    { type: 'select-blind', checkpointId, position: 'small' },
    { type: 'skip-blind', checkpointId, position: 'small' },
    { type: 'request-boss-reroll', checkpointId },
    {
      type: 'toggle-card',
      checkpointId,
      cardId: stableId<'playing-card'>('test:card'),
    },
    { type: 'sort-hand', checkpointId, mode: 'suit' },
    { type: 'play-selected', checkpointId },
    { type: 'discard-selected', checkpointId },
    { type: 'claim-round-reward', checkpointId },
    { type: 'reroll-shop', checkpointId },
    {
      type: 'buy-shop-offer',
      checkpointId,
      offerId: stableId<'shop-offer'>('test:offer'),
    },
    {
      type: 'buy-pack',
      checkpointId,
      offerId: stableId<'pack-offer'>('test:pack'),
    },
    {
      type: 'buy-voucher',
      checkpointId,
      offerId: stableId<'voucher-offer'>('test:voucher'),
    },
    {
      type: 'sell-joker',
      checkpointId,
      jokerInstanceId: stableId<'joker-instance'>('test:joker'),
    },
    {
      type: 'sell-consumable',
      checkpointId,
      consumableInstanceId: stableId<'consumable-instance'>('test:consumable'),
    },
    {
      type: 'reorder-joker',
      checkpointId,
      jokerInstanceId: stableId<'joker-instance'>('test:joker'),
      toIndex: 0,
    },
    {
      type: 'begin-consumable-choice',
      checkpointId,
      consumableInstanceId: stableId<'consumable-instance'>('test:consumable'),
    },
    { type: 'choose-pack-option', checkpointId, choiceId, optionId: 'test:option' },
    { type: 'toggle-choice-target', checkpointId, choiceId, targetId: 'test:target' },
    { type: 'confirm-choice', checkpointId, choiceId },
    { type: 'cancel-choice', checkpointId, choiceId },
    { type: 'skip-pack', checkpointId, choiceId },
    { type: 'leave-shop', checkpointId },
    { type: 'finish-run', checkpointId },
    { type: 'enter-endless', checkpointId },
  ];
}

function apply(state: RunStateV2, command: RunCommandV2): RunStateV2 {
  const result = executeCommandV2(state, command);
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state;
}

function enterPackChoice(): RunStateV2 {
  let state = createRunEconomyFixtureRun({
    seed: 'choice-rejection',
    targetScaleBasisPoints: 1,
    startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
  });
  state = apply(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: 'small',
  });
  const cardId = state.round?.handIds[0];
  if (!cardId) throw new Error('缺少手牌');
  state = apply(state, { type: 'toggle-card', checkpointId: state.checkpointId, cardId });
  state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
  state = apply(state, {
    type: 'claim-round-reward',
    checkpointId: state.checkpointId,
  });
  const pack = state.shop?.packOffers[0];
  if (!pack) throw new Error('缺少卡包');
  return apply(state, {
    type: 'buy-pack',
    checkpointId: state.checkpointId,
    offerId: pack.id,
  });
}

describe('V2 指令拒绝原子性', () => {
  it('所有指令都在路由前统一拒绝陈旧检查点', () => {
    const state = createRunEconomyFixtureRun({ seed: 'all-stale-commands' });
    for (const command of commands(state.checkpointId + 1)) {
      const before = structuredClone(state);
      expect(executeCommandV2(state, command)).toMatchObject({
        ok: false,
        rejection: { code: 'stale-checkpoint' },
      });
      expect(state).toEqual(before);
    }
  });

  it('终局上的所有非法指令都不改变状态或随机流', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'all-illegal-phases' });
    const state: RunStateV2 = {
      ...initial,
      phase: { kind: 'finished' },
      result: { kind: 'finished', ante: 1, score: 0, reason: '测试终局' },
    };
    for (const command of commands(state.checkpointId)) {
      const before = structuredClone(state);
      expect(executeCommandV2(state, command).ok).toBe(false);
      expect(state).toEqual(before);
    }
  });

  it('待决帧的错误编号在选项、目标、确认、取消和跳过上都失败不变', () => {
    const state = enterPackChoice();
    const wrongChoiceId = stableId<'choice'>('test:stale-choice');
    const commandsWithWrongChoice: readonly RunCommandV2[] = [
      {
        type: 'choose-pack-option',
        checkpointId: state.checkpointId,
        choiceId: wrongChoiceId,
        optionId: 'test:option',
      },
      {
        type: 'toggle-choice-target',
        checkpointId: state.checkpointId,
        choiceId: wrongChoiceId,
        targetId: 'test:target',
      },
      {
        type: 'confirm-choice',
        checkpointId: state.checkpointId,
        choiceId: wrongChoiceId,
      },
      {
        type: 'cancel-choice',
        checkpointId: state.checkpointId,
        choiceId: wrongChoiceId,
      },
      { type: 'skip-pack', checkpointId: state.checkpointId, choiceId: wrongChoiceId },
    ];
    for (const command of commandsWithWrongChoice) {
      const before = structuredClone(state);
      expect(executeCommandV2(state, command)).toMatchObject({
        ok: false,
        rejection: { code: 'choice-mismatch' },
      });
      expect(state).toEqual(before);
    }
  });
});
