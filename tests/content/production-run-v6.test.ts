import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV6 } from '../../src/content/runtime/runSetupV6';
import { validateRunStateV6 } from '../../src/game-core/invariants/validateRunStateV6';
import { runStateV6Schema } from '../../src/persistence/schemasV6';

describe('生产 V6 牌局初始化', () => {
  it('冻结 380 项目录、150 张真实奇牌与独立 V6 目标/容量字段', () => {
    const run = createProductionRunV6(PRODUCTION_CATALOG, { seed: 'production-v6' });
    const jokers = run.content.items.filter((item) => item.kind === 'joker');
    expect(run).toMatchObject({
      schemaVersion: 6,
      contentVersion: 'joker-catalog-3',
      jokerRuntimeV6: {
        castleTargetSuit: null,
        idolTargetRank: null,
        idolTargetSuit: null,
        jokerCapacityDebt: 0,
      },
      migrationV6: {
        sourceSchemaVersion: 6,
        sourceContentVersion: 'joker-catalog-3',
        sourceCheckpointId: 0,
      },
    });
    expect(run.productionContentV3.rows).toHaveLength(380);
    expect(jokers).toHaveLength(150);
    expect(jokers.at(-1)?.contentId).toBe('bxqp:joker:150');
    expect(run.externalDependenciesV3.requiredIds).toEqual([]);
    expect(runStateV6Schema.parse(structuredClone(run))).toEqual(run);
    expect(validateRunStateV6(run)).toEqual({ ok: true });
  });
});
