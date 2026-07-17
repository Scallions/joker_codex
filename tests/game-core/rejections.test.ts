import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';

describe('指令拒绝矩阵', () => {
  it('陈旧指令不改变状态也不消耗随机数', () => {
    const state = createFixtureRun('stale-command');
    const result = executeCommand(state, {
      type: 'toggle-card',
      checkpointId: 99,
      cardId: state.hand[0]!.id,
    });

    expect(result).toEqual({
      ok: false,
      rejection: { code: 'stale-checkpoint', message: '操作基于旧检查点，请重试' },
    });
    expect(state.checkpointId).toBe(0);
    expect(state.selectedCardIds).toEqual([]);
  });

  it('空选择、超额选择和错误阶段都被显式拒绝', () => {
    let state = createFixtureRun('illegal-command');
    expect(
      executeCommand(state, { type: 'play-selected', checkpointId: state.checkpointId }),
    ).toMatchObject({ ok: false, rejection: { code: 'empty-selection' } });

    for (const card of state.hand.slice(0, 5)) {
      const result = executeCommand(state, {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId: card.id,
      });
      if (!result.ok) throw new Error(result.rejection.message);
      state = result.state;
    }
    expect(
      executeCommand(state, {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId: state.hand[5]!.id,
      }),
    ).toMatchObject({ ok: false, rejection: { code: 'selection-limit' } });

    const lost = { ...state, phase: 'lost' as const, selectedCardIds: [] };
    expect(
      executeCommand(lost, {
        type: 'toggle-card',
        checkpointId: lost.checkpointId,
        cardId: lost.hand[0]!.id,
      }),
    ).toMatchObject({ ok: false, rejection: { code: 'illegal-phase' } });
  });
});
