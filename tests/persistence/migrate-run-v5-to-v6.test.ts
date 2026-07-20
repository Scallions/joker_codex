import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { validateRunStateV6 } from '../../src/game-core/invariants/validateRunStateV6';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from '../../src/persistence/migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from '../../src/persistence/migrations/migrateRunV4ToV5';
import { migrateRunV5ToV6 } from '../../src/persistence/migrations/migrateRunV5ToV6';
import {
  decodeRunStateV6FromTransfer,
  encodeRunStateV6ForTransfer,
} from '../../src/persistence/scoreWire';

describe('V5 → V6 迁移', () => {
  it('v5-to-v6-no-rng：保持冻结内容与 RNG，只初始化独立目标和可证明容量欠额', () => {
    const v5 = createProductionRunV5(PRODUCTION_CATALOG, { seed: 'v5-to-v6-no-rng' });
    const frozenRows = structuredClone(v5.productionContentV3.rows);
    const frozenItems = structuredClone(v5.content.items);
    const migrated = migrateRunV5ToV6(v5);
    expect(migrated.rngState).toEqual(v5.rngState);
    expect(migrated.contentVersion).toBe('joker-catalog-2');
    expect(migrated.productionContentV3.rows).toEqual(frozenRows);
    expect(migrated.content.items).toEqual(frozenItems);
    expect(migrated.jokerRuntimeV6).toEqual({
      castleTargetSuit: null,
      idolTargetRank: null,
      idolTargetSuit: null,
      jokerCapacityDebt: 0,
    });
    expect(validateRunStateV6(migrated)).toEqual({ ok: true });
  });

  it('v2-to-v6-forward-chain：旧牌局沿 V2→V3→V4→V5→V6 前向迁移且不混入新目录', () => {
    const v2 = createRunEconomyFixtureRun({ seed: 'v2-to-v6-forward-chain' });
    const v6 = migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(v2))));
    expect(v6.schemaVersion).toBe(6);
    expect(v6.contentVersion).toBe('run-economy-2');
    expect(v6.productionContentV3.rows).toEqual([]);
    expect(validateRunStateV6(v6)).toEqual({ ok: true });
  });

  it('v6-recovery-export-import：V6 传输编码无损往返', () => {
    const v6 = migrateRunV5ToV6(
      createProductionRunV5(PRODUCTION_CATALOG, { seed: 'v6-transfer' }),
    );
    expect(decodeRunStateV6FromTransfer(encodeRunStateV6ForTransfer(v6))).toEqual(v6);
  });

  it('拒绝半套神龛目标、无来源残留目标与不精确容量欠额', () => {
    const v6 = migrateRunV5ToV6(
      createProductionRunV5(PRODUCTION_CATALOG, { seed: 'v6-invalid-runtime' }),
    );
    expect(
      validateRunStateV6({
        ...v6,
        jokerRuntimeV6: {
          ...v6.jokerRuntimeV6,
          idolTargetRank: 'ace',
        },
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateRunStateV6({
        ...v6,
        jokerRuntimeV6: {
          ...v6.jokerRuntimeV6,
          castleTargetSuit: 'hearts',
        },
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateRunStateV6({
        ...v6,
        jokerRuntimeV6: {
          ...v6.jokerRuntimeV6,
          jokerCapacityDebt: 1,
        },
      }),
    ).toMatchObject({ ok: false });
  });
});
