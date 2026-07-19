import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import { JOKER_DISCOVERY_OBSERVATION_KEY } from '../../src/game-core/rules/discoveryV3';

describe('V4 奇牌获取与发现', () => {
  it('同一稳定 ID 只在首次获取时写入一条可持久化发现观测', () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'first-acquisition-discovery',
    });
    const first = acquireContentByIdV3(initial, 'bxqp:joker:001', 'discovery:first');
    expect(first.ok && isRunStateV4(first.state)).toBe(true);
    if (!first.ok || !isRunStateV4(first.state)) return;
    const second = acquireContentByIdV3(
      first.state,
      'bxqp:joker:001',
      'discovery:second',
    );
    expect(second.ok && isRunStateV4(second.state)).toBe(true);
    if (!second.ok || !isRunStateV4(second.state)) return;

    const observations = second.state.history.effectObservations.filter(
      ({ key, value }) =>
        key === JOKER_DISCOVERY_OBSERVATION_KEY && value === 'bxqp:joker:001',
    );
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      window: 'item-acquired',
      effectId: 'discovery:bxqp:joker:001',
    });
  });

  it('挑战起始库存也从真实定义初始化能力状态并记录首次发现', () => {
    const state = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'starting-joker-discovery',
      challengeId: 'bxqp:challenge:empty-house',
    });

    expect(state.inventory.jokers).toHaveLength(5);
    expect(
      state.inventory.jokers.every(({ contentId }) => contentId === 'bxqp:joker:001'),
    ).toBe(true);
    expect(state.modifiersV3.jokers).toHaveLength(5);
    expect(
      state.history.effectObservations.filter(
        ({ key, value }) =>
          key === JOKER_DISCOVERY_OBSERVATION_KEY && value === 'bxqp:joker:001',
      ),
    ).toHaveLength(1);
  });
});
