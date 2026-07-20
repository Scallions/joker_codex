import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { isRunStateV6 } from '../../src/game-core/model/runV6';
import { commandV6, enterShopV6, initialV6 } from '../helpers/jokerV6';

const LEGENDARY_IDS = new Set(
  Array.from(
    { length: 5 },
    (_, index) => `bxqp:joker:${String(146 + index).padStart(3, '0')}`,
  ),
);

describe('V6 传奇奇牌真实来源', () => {
  it('幽戏牌“传奇召请”只生成 J146-J150，并可由稳定种子覆盖五张', () => {
    const reached = new Set<string>();
    for (let index = 0; index < 80 && reached.size < LEGENDARY_IDS.size; index += 1) {
      let state = initialV6(`legend-route-${index}`);
      const acquired = acquireContentByIdV3(
        state,
        'bxqp:spectral:legend-call',
        `legend-call:${index}`,
      );
      expect(acquired.ok).toBe(true);
      if (!acquired.ok || !isRunStateV6(acquired.state)) continue;
      state = enterShopV6(acquired.state);
      const source = state.inventory.consumables.find(
        ({ contentId }) => contentId === 'bxqp:spectral:legend-call',
      )!;
      const used = commandV6(state, {
        type: 'begin-consumable-choice',
        consumableInstanceId: source.instanceId,
      });
      const created = used.inventory.jokers.at(-1)?.contentId;
      expect(created && LEGENDARY_IDS.has(created)).toBe(true);
      if (created) reached.add(created);
    }
    expect(reached).toEqual(LEGENDARY_IDS);
  });
});
