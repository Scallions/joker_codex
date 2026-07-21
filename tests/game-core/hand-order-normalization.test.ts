import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { validateRunStateV2 } from '../../src/game-core/invariants/validateRunStateV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { sortCardIdsV2 } from '../../src/game-core/selectors/runV2';
import { runStateV2Schema } from '../../src/persistence/schemasV2';

function execute(state: RunStateV2, command: RunCommandV2): RunStateV2 {
  const result = executeCommandV2(state, command);
  if (!result.ok) throw new Error(result.rejection.message);
  expect(validateRunStateV2(result.state)).toEqual({ ok: true });
  expect(runStateV2Schema.parse(structuredClone(result.state))).toEqual(result.state);
  return result.state;
}

function startRound(seed: string): RunStateV2 {
  const initial = createRunEconomyFixtureRun({ seed });
  return execute(initial, {
    type: 'select-blind',
    checkpointId: initial.checkpointId,
    position: 'small',
  });
}

describe('活动回合手牌顺序不变量', () => {
  it('选择盲注后按默认点数模式整理首手牌', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'sorted-initial-hand' });
    const result = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    if (!result.ok) throw new Error(result.rejection.message);
    if (!result.state.round) throw new Error('选择盲注后缺少活动回合');

    expect(result.state.round.sortMode).toBe('rank');
    expect(result.state.round.handIds).toEqual(
      sortCardIdsV2(result.state, result.state.round.handIds, 'rank'),
    );
    expect(result.state.checkpointId).toBe(initial.checkpointId + 1);
  });

  it('弃牌补牌后保持花色模式且不改变补牌集合、牌堆或随机状态', () => {
    let state = startRound('sorted-discard-hand');
    state = execute(state, {
      type: 'sort-hand',
      checkpointId: state.checkpointId,
      mode: 'suit',
    });
    const discardId = state.round?.handIds.find(
      (cardId) => !state.round?.forcedSelectedCardIds.includes(cardId),
    );
    if (!discardId || !state.round) throw new Error('缺少可弃手牌');
    state = execute(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: discardId,
    });
    const roundBefore = state.round;
    if (!roundBefore) throw new Error('选牌后缺少活动回合');

    const before = state;
    const expectedIds = new Set([
      ...roundBefore.handIds.filter((cardId) => cardId !== discardId),
      ...roundBefore.drawPileIds.slice(0, 1),
    ]);
    const discarded = executeCommandV2(before, {
      type: 'discard-selected',
      checkpointId: before.checkpointId,
    });
    if (!discarded.ok) throw new Error(discarded.rejection.message);
    if (!discarded.state.round) throw new Error('弃牌后缺少活动回合');

    expect(discarded.state.round.handIds).toEqual(
      sortCardIdsV2(discarded.state, discarded.state.round.handIds, 'suit'),
    );
    expect(new Set(discarded.state.round.handIds)).toEqual(expectedIds);
    expect(discarded.state.round.drawPileIds).toEqual(roundBefore.drawPileIds.slice(1));
    expect(discarded.state.rngState).toEqual(before.rngState);
    expect(discarded.state.checkpointId).toBe(before.checkpointId + 1);
    expect(validateRunStateV2(discarded.state)).toEqual({ ok: true });
  });

  it('出牌补牌后按点数模式整理且只提交一个检查点', () => {
    let state = startRound('sorted-play-hand');
    const playedId = state.round?.handIds.find(
      (cardId) => !state.round?.forcedSelectedCardIds.includes(cardId),
    );
    if (!playedId) throw new Error('缺少可出手牌');
    state = execute(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: playedId,
    });
    const before = state;
    const played = executeCommandV2(before, {
      type: 'play-selected',
      checkpointId: before.checkpointId,
    });
    if (!played.ok) throw new Error(played.rejection.message);
    if (played.state.phase.kind !== 'round' || !played.state.round) {
      throw new Error('单张牌不应结束测试回合');
    }

    expect(played.state.round.handIds).toEqual(
      sortCardIdsV2(played.state, played.state.round.handIds, 'rank'),
    );
    expect(played.state.checkpointId).toBe(before.checkpointId + 1);
    expect(played.domainEvents).not.toContainEqual({ type: 'hand-sorted', mode: 'rank' });
    expect(played.presentationEvents).not.toContainEqual({
      type: 'cards-reordered',
      mode: 'rank',
    });
    expect(validateRunStateV2(played.state)).toEqual({ ok: true });
  });

  it('旧的未排序活动手牌在下一次接受命令时整理并保留选牌身份', () => {
    const started = startRound('sorted-existing-save');
    if (!started.round) throw new Error('缺少活动回合');
    const reversed = [...started.round.handIds].reverse();
    const selectedId = reversed[0];
    const faceDownId = reversed[1];
    if (!selectedId || !faceDownId) throw new Error('测试手牌不足');
    const persisted: RunStateV2 = {
      ...started,
      round: {
        ...started.round,
        handIds: reversed,
        selectedCardIds: [selectedId],
        forcedSelectedCardIds: [selectedId],
        faceDownCardIds: [faceDownId],
      },
    };
    const rngBefore = structuredClone(persisted.rngState);
    const next = executeCommandV2(persisted, {
      type: 'toggle-card',
      checkpointId: persisted.checkpointId,
      cardId: faceDownId,
    });
    if (!next.ok) throw new Error(next.rejection.message);
    if (!next.state.round) throw new Error('整理后缺少活动回合');

    expect(next.state.round.handIds).toEqual(
      sortCardIdsV2(next.state, next.state.round.handIds, 'rank'),
    );
    expect(next.state.round.forcedSelectedCardIds).toEqual([selectedId]);
    expect(next.state.round.selectedCardIds).toEqual([selectedId, faceDownId]);
    expect(next.state.round.faceDownCardIds).toEqual([faceDownId]);
    expect(new Set(next.state.round.handIds)).toEqual(new Set(reversed));
    expect(next.state.round.drawPileIds).toEqual(started.round.drawPileIds);
    expect(next.state.rngState).toEqual(rngBefore);
    expect(next.state.checkpointId).toBe(persisted.checkpointId + 1);
  });

  it('拒绝命令不整理未排序手牌或返回提议状态', () => {
    const started = startRound('sorted-rejection');
    if (!started.round) throw new Error('缺少活动回合');
    const persisted: RunStateV2 = {
      ...started,
      round: { ...started.round, handIds: [...started.round.handIds].reverse() },
    };
    const preimage = structuredClone(persisted);
    const rejected = executeCommandV2(persisted, {
      type: 'sort-hand',
      checkpointId: persisted.checkpointId - 1,
      mode: 'suit',
    });

    expect(rejected).toEqual({
      ok: false,
      rejection: { code: 'stale-checkpoint', message: '操作基于旧检查点，请重试' },
    });
    expect(persisted).toEqual(preimage);
  });

  it('手动排序仍发出原有事件且只增加一个检查点', () => {
    const state = startRound('sorted-manual-mode');
    const sorted = executeCommandV2(state, {
      type: 'sort-hand',
      checkpointId: state.checkpointId,
      mode: 'suit',
    });
    if (!sorted.ok) throw new Error(sorted.rejection.message);

    expect(sorted.state.checkpointId).toBe(state.checkpointId + 1);
    expect(sorted.domainEvents).toEqual([{ type: 'hand-sorted', mode: 'suit' }]);
    expect(sorted.presentationEvents).toEqual([
      { type: 'cards-reordered', mode: 'suit' },
    ]);
  });
});
