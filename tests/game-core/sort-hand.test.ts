import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';

const rankValue = new Map([
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
  ['9', 9],
  ['10', 10],
  ['jack', 11],
  ['queen', 12],
  ['king', 13],
  ['ace', 14],
]);

describe('手牌排序', () => {
  it('按点数稳定排序且不改变随机状态', () => {
    const state = createFixtureRun('sort-script');
    const result = executeCommand(state, {
      type: 'sort-hand',
      checkpointId: state.checkpointId,
      mode: 'rank',
    });
    if (!result.ok) throw new Error(result.rejection.message);

    const values = result.state.hand.map((card) => rankValue.get(card.rank));
    expect(values).toEqual([...values].sort((left, right) => (right ?? 0) - (left ?? 0)));
    expect(result.state.sortMode).toBe('rank');
    expect(result.state.rngState).toBe(state.rngState);
  });
});
