import { createRunEconomyFixtureRun as createCampaignRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { validateRunStateV2 } from '../../src/game-core/invariants/validateRunStateV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { selectHandCardsV2 } from '../../src/game-core/selectors/runV2';
import { runStateV2Schema } from '../../src/persistence/schemasV2';

function apply(state: ReturnType<typeof createCampaignRun>, command: RunCommandV2) {
  const result = executeCommandV2(state, command);
  if (!result.ok)
    throw new Error(`${result.rejection.code}: ${result.rejection.message}`);
  expect(validateRunStateV2(result.state)).toEqual({ ok: true });
  expect(runStateV2Schema.parse(structuredClone(result.state))).toEqual(result.state);
  return result.state;
}

function winCurrentBlind(state: ReturnType<typeof createCampaignRun>) {
  state = apply(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: state.progress.blindPosition,
  });
  const requiredCount =
    state.round?.blind.effects.find(
      (effect) => effect.handlerId === 'fixture:run-economy:handler:require-play-count',
    )?.parameters.count ?? 1;
  if (typeof requiredCount !== 'number') throw new Error('无效的出牌数量限制');
  for (const card of selectHandCardsV2(state)) {
    if ((state.round?.selectedCardIds.length ?? 0) >= requiredCount) break;
    if (state.round?.selectedCardIds.includes(card.id)) continue;
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: card.id,
    });
  }
  state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
  expect(state.phase.kind).toBe('round-reward');
  return apply(state, {
    type: 'claim-round-reward',
    checkpointId: state.checkpointId,
  });
}

function winThroughAnteEight() {
  let state = createCampaignRun({
    seed: 'eight-ante-win',
    targetScaleBasisPoints: 1,
    startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
  });

  for (let ante = 1; ante <= 8; ante += 1) {
    for (const position of ['small', 'big', 'boss'] as const) {
      expect(state.progress.ante).toBe(ante);
      expect(state.progress.blindPosition).toBe(position);
      state = winCurrentBlind(state);
      if (ante === 8 && position === 'boss') break;
      expect(state.phase.kind).toBe('shop');
      state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
    }
  }
  return state;
}

describe('完整八幕流程', () => {
  it('同种子物化相同戏签与班主，重载不会重抽', () => {
    const first = createCampaignRun({ seed: 'lineup-seed' });
    const second = createCampaignRun({ seed: 'lineup-seed' });
    expect(first).toEqual(second);
    expect(first.phase).toEqual({ kind: 'blind-select' });
    expect(first.progress.ante).toBe(1);
    expect(first.progress.lineup).toEqual(second.progress.lineup);
    expect(first.rngState).toBe(second.rngState);
  });

  it('可打完二十四个盲注、记录一次胜利并进入第九幕无尽', () => {
    let state = winThroughAnteEight();

    expect(state.phase).toEqual({ kind: 'run-won' });
    expect(state.progress.campaignWon).toBe(true);
    expect(state.history.completedBlindIds).toHaveLength(24);
    state = apply(state, { type: 'enter-endless', checkpointId: state.checkpointId });
    expect(state.phase).toEqual({ kind: 'blind-select' });
    expect(state.progress.ante).toBe(9);
    expect(state.progress.blindPosition).toBe('small');
    expect(state.progress.endless).toBe(true);
  });

  it('每幕混合跳过小幕、完成大幕与班主，戏签只领取一次', () => {
    let state = createCampaignRun({
      seed: 'mixed-skip-campaign',
      targetScaleBasisPoints: 1,
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
    });
    for (let ante = 1; ante <= 8; ante += 1) {
      state = apply(state, {
        type: 'skip-blind',
        checkpointId: state.checkpointId,
        position: 'small',
      });
      expect(state.progress.blindPosition).toBe('big');
      state = winCurrentBlind(state);
      state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
      state = winCurrentBlind(state);
      if (ante < 8) {
        state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
      }
    }

    expect(state.phase).toEqual({ kind: 'run-won' });
    expect(state.history.skippedBlindIds).toHaveLength(8);
    expect(state.history.completedBlindIds).toHaveLength(16);
    expect(new Set(state.inventory.tags.map((tag) => tag.instanceId)).size).toBe(8);
    expect(state.inventory.tags.every((tag) => tag.consumed)).toBe(true);
  });

  it('胜利后可选择谢幕，无尽每八幕再用压轴班主且不重复胜利选择', () => {
    const won = winThroughAnteEight();
    const finished = apply(won, {
      type: 'finish-run',
      checkpointId: won.checkpointId,
    });
    expect(finished.phase).toEqual({ kind: 'finished' });
    expect(finished.result?.kind).toBe('finished');

    const boosted: typeof won = {
      ...won,
      inventory: {
        ...won.inventory,
        jokers: won.inventory.jokers.map((joker) => ({
          ...joker,
          effects: joker.effects.map((entry) =>
            entry.handlerId === 'fixture:run-economy:handler:add-multiplier'
              ? { ...entry, parameters: { ...entry.parameters, amount: 1e300 } }
              : entry,
          ),
        })),
      },
    };
    let endless = apply(boosted, {
      type: 'enter-endless',
      checkpointId: boosted.checkpointId,
    });
    for (let ante = 9; ante <= 16; ante += 1) {
      for (const position of ['small', 'big', 'boss'] as const) {
        expect(endless.progress.ante).toBe(ante);
        expect(endless.progress.blindPosition).toBe(position);
        if (ante === 16 && position === 'boss') {
          expect(endless.progress.lineup.boss.kind).toBe('finisher');
        }
        endless = winCurrentBlind(endless);
        expect(endless.phase.kind).toBe('shop');
        if (ante < 16 || position !== 'boss') {
          endless = apply(endless, {
            type: 'leave-shop',
            checkpointId: endless.checkpointId,
          });
        }
      }
    }
    expect(endless.progress.campaignWon).toBe(true);
    expect(endless.progress.ante).toBe(16);
    expect(endless.phase).toEqual({ kind: 'shop' });
    expect(endless.history.completedBlindIds).toHaveLength(48);
  });

  it('跳过小幕和大幕后直接进入班主，拒绝跳过班主且不改变状态', () => {
    let state = createCampaignRun({ seed: 'skip-route' });
    state = apply(state, {
      type: 'skip-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    expect(state.progress.blindPosition).toBe('big');
    state = apply(state, {
      type: 'skip-blind',
      checkpointId: state.checkpointId,
      position: 'big',
    });
    expect(state.progress.blindPosition).toBe('boss');
    expect(state.inventory.tags).toHaveLength(2);

    const before = structuredClone(state);
    const rejected = executeCommandV2(state, {
      type: 'skip-blind',
      checkpointId: state.checkpointId,
      position: 'boss',
    });
    expect(rejected).toMatchObject({
      ok: false,
      rejection: { code: 'blind-not-skippable' },
    });
    expect(state).toEqual(before);
  });

  it('未达目标且耗尽出牌次数时失败', () => {
    let state = createCampaignRun({ seed: 'campaign-loss' });
    state = apply(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });

    while (state.phase.kind === 'round') {
      const card = selectHandCardsV2(state)[0];
      if (!card) throw new Error('回合没有手牌');
      state = apply(state, {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId: card.id,
      });
      state = apply(state, {
        type: 'play-selected',
        checkpointId: state.checkpointId,
      });
    }

    expect(state.phase).toEqual({ kind: 'run-lost' });
    expect(state.result?.kind).toBe('lost');
    expect(state.round?.handsRemaining).toBe(0);
  });
});
