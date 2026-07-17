import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';

describe('试玩消耗牌', () => {
  it('把指定手牌变为 A，消耗道具但不推进随机流', () => {
    const state = createFixtureRun('consumable-script');
    const target = state.hand.find((card) => card.rank !== 'ace');
    const consumable = state.consumables[0];
    if (!target || !consumable) throw new Error('测试夹具缺少目标');

    const result = executeCommand(state, {
      type: 'use-consumable',
      checkpointId: state.checkpointId,
      consumableInstanceId: consumable.instanceId,
      cardId: target.id,
    });
    if (!result.ok) throw new Error(result.rejection.message);

    expect(result.state.hand.find((card) => card.id === target.id)?.rank).toBe('ace');
    expect(result.state.consumables).toHaveLength(0);
    expect(result.state.rngState).toBe(state.rngState);
    expect(result.state.checkpointId).toBe(1);
    expect(result.domainEvents.map((event) => event.type)).toEqual(['card-transformed']);
  });
});
