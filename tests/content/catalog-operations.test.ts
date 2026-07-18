import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { executeCatalogEffects } from '../../src/content/runtime/catalogOperations';
import { createRandomState } from '../../src/game-core/rng/random';

describe('生产目录可执行合约', () => {
  it('每项都能通过公共效果边界形成确定性物化操作', () => {
    const candidates = ['instance:c', 'instance:a', 'instance:b'];
    for (const row of PRODUCTION_CATALOG.rows) {
      const trigger = row.effects[0]?.trigger;
      expect(trigger, row.id).toBeDefined();
      if (!trigger) continue;
      const context = {
        rngState: createRandomState(`catalog-contract:${row.id}`),
        candidateIds: candidates,
        selectedIds: ['instance:b', 'instance:a'],
      };
      const first = executeCatalogEffects(row.effects, trigger, context);
      const replay = executeCatalogEffects(row.effects, trigger, context);

      expect(first, row.id).toEqual(replay);
      expect(first.operations.length, row.id).toBeGreaterThan(0);
      expect(
        first.operations.every(({ effectId }) => effectId.startsWith('bxqp:effect:')),
      ).toBe(true);
    }
  });

  it('随机候选先稳定排序且空池不额外消费随机状态', () => {
    const tarot = PRODUCTION_CATALOG.rows.find(
      (row) => row.id === 'bxqp:tarot:summon-mask',
    );
    expect(tarot).toBeDefined();
    if (!tarot) return;
    const seed = createRandomState('stable-pool');
    const left = executeCatalogEffects(tarot.effects, 'consumable-used', {
      rngState: seed,
      candidateIds: ['joker:c', 'joker:a', 'joker:b'],
      selectedIds: [],
    });
    const right = executeCatalogEffects(tarot.effects, 'consumable-used', {
      rngState: seed,
      candidateIds: ['joker:b', 'joker:c', 'joker:a'],
      selectedIds: [],
    });
    const empty = executeCatalogEffects(tarot.effects, 'consumable-used', {
      rngState: seed,
      candidateIds: [],
      selectedIds: [],
    });

    expect(left).toEqual(right);
    expect(empty.rngState).toBe(seed);
    expect(empty.operations[0]?.materializedIds).toEqual([]);
  });

  it('独立概率按声明顺序消费随机数并保存结果', () => {
    const lucky = PRODUCTION_CATALOG.rows.find(
      (row) => row.id === 'bxqp:enhancement:lucky-knot',
    );
    expect(lucky).toBeDefined();
    if (!lucky) return;
    const result = executeCatalogEffects(lucky.effects, 'scored-card', {
      rngState: createRandomState('two-independent-rolls'),
      candidateIds: [],
      selectedIds: [],
    });

    expect(result.operations).toHaveLength(2);
    expect(result.operations.map(({ applied }) => typeof applied)).toEqual([
      'boolean',
      'boolean',
    ]);
  });
});
