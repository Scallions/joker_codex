import { describe, expect, it } from 'vitest';

import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from '../../src/persistence/migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from '../../src/persistence/migrations/migrateRunV4ToV5';
import { validateRunStateV5 } from '../../src/game-core/invariants/validateRunStateV5';

describe('V4 到 V5 牌局迁移', () => {
  it('保留冻结内容和 RNG，并只添加可证明的 V5 运行态', () => {
    const v4 = migrateRunV3ToV4(
      migrateRunV2ToV3(createRunEconomyFixtureRun({ seed: 'v5-migrate' })),
    );
    const migrated = migrateRunV4ToV5(v4);

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.contentVersion).toBe(v4.contentVersion);
    expect(migrated.productionContentV3).toEqual(v4.productionContentV3);
    expect(migrated.rngState).toEqual(v4.rngState);
    expect(migrated.jokerRuntimeV5).toEqual({
      initialDeckSize: v4.deck.cards.length,
      sharedRoundTargetRank: null,
      sharedRoundTargetSuit: null,
      bossDisabledForRound: false,
    });
    expect(migrated.migrationV5).toMatchObject({
      sourceSchemaVersion: 4,
      sourceContentVersion: v4.contentVersion,
      sourceCheckpointId: v4.checkpointId,
    });
    expect(validateRunStateV5(migrated)).toEqual({ ok: true });
  });

  it('对已经迁移的 V5 检查点幂等', () => {
    const v5 = migrateRunV4ToV5(
      migrateRunV3ToV4(
        migrateRunV2ToV3(createRunEconomyFixtureRun({ seed: 'v5-idempotent' })),
      ),
    );
    expect(migrateRunV4ToV5(v5)).toBe(v5);
  });
});
