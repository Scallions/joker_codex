import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { validateRunStateV3 } from '../../src/game-core/invariants/validateRunStateV3';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';
import { runStateV3Schema } from '../../src/persistence/schemasV3';

const CHANGED_KEYS = new Set([
  'schemaVersion',
  'contentVersion',
  'mode',
  'setupV3',
  'productionContentV3',
  'rulesV3',
  'modifiersV3',
  'externalDependenciesV3',
  'materializedChoicesV3',
  'migrationV3',
]);

function baseProjection(run: RunStateV2 | RunStateV3): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(run).filter(([key]) => !CHANGED_KEYS.has(key)),
  );
}

describe('V2 到 V3 牌局迁移', () => {
  it('不消费随机数并保留检查点、物化内容和所有可见状态', () => {
    const legacy = createRunEconomyFixtureRun({
      seed: 'v2-to-v3-golden',
      startingMoney: 37,
      startingConsumableContentIds: ['fixture:run-economy:item:consumable:ace-paint'],
    });
    const preimage = structuredClone(legacy);
    const migrated = migrateRunV2ToV3(legacy);

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.contentVersion).toBe('run-economy-2');
    expect(migrated.mode).toBe('migrated-run-economy');
    expect(migrated.runId).toBe(legacy.runId);
    expect(migrated.checkpointId).toBe(legacy.checkpointId);
    expect(migrated.rngState).toBe(legacy.rngState);
    expect(baseProjection(migrated)).toEqual(baseProjection(preimage));
    expect(migrated.productionContentV3.rows).toEqual([]);
    expect(migrated.modifiersV3.playingCards).toHaveLength(52);
    expect(migrated.migrationV3).toMatchObject({
      sourceSchemaVersion: 2,
      sourceContentVersion: 'run-economy-2',
      sourceCheckpointId: legacy.checkpointId,
    });
    expect(runStateV3Schema.safeParse(migrated).success).toBe(true);
    expect(validateRunStateV3(migrated)).toEqual({ ok: true });
    expect(legacy).toEqual(preimage);
  });

  it('重复迁移幂等且不重新物化任何选择', () => {
    const legacy = createRunEconomyFixtureRun({ seed: 'idempotent-v3' });
    const once = migrateRunV2ToV3(legacy);
    const twice = migrateRunV2ToV3(once);

    expect(twice).toBe(once);
    expect(twice).toEqual(once);
  });

  it('拒绝未知版本和不一致的修饰快照', () => {
    const legacy = createRunEconomyFixtureRun({ seed: 'reject-bad-v3' });
    expect(() =>
      migrateRunV2ToV3({
        ...legacy,
        schemaVersion: 3,
        contentVersion: 'catalog-baseline-3',
      }),
    ).toThrow(/仅支持/);

    const migrated = migrateRunV2ToV3(legacy);
    const first = migrated.modifiersV3.playingCards[0];
    expect(first).toBeDefined();
    if (!first) return;
    const invalid: RunStateV3 = {
      ...migrated,
      modifiersV3: {
        ...migrated.modifiersV3,
        playingCards: [
          { ...first, enhancementId: 'bxqp:enhancement:brass-inlay' },
          ...migrated.modifiersV3.playingCards.slice(1),
        ],
      },
    };
    const validation = validateRunStateV3(invalid);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.violations).toContain(`牌面修饰快照不一致：${first.cardId}`);
    }
  });
});
