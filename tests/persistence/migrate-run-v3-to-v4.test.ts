import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { validateRunStateV4 } from '../../src/game-core/invariants/validateRunStateV4';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from '../../src/persistence/migrations/migrateRunV3ToV4';
import { runStateV4Schema } from '../../src/persistence/schemasV4';

describe('V3 到 V4 牌局迁移', () => {
  it('只为已有奇牌补入能力状态并保留已物化牌局', () => {
    const v3 = migrateRunV2ToV3(
      createRunEconomyFixtureRun({
        seed: 'ability-state-v4',
        startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
      }),
    );
    const preimage = structuredClone(v3);

    const v4 = migrateRunV3ToV4(v3);

    expect(v4).toMatchObject({
      schemaVersion: 4,
      contentVersion: 'run-economy-2',
      checkpointId: v3.checkpointId,
      rngState: v3.rngState,
      modifiersV3: {
        jokers: [{ abilityState: {} }],
      },
      migrationV4: {
        sourceSchemaVersion: 3,
        sourceContentVersion: 'run-economy-2',
        sourceCheckpointId: v3.checkpointId,
      },
    });
    expect(v4.content).toEqual(v3.content);
    expect(v4.productionContentV3).toEqual(v3.productionContentV3);
    expect(runStateV4Schema.parse(structuredClone(v4))).toEqual(v4);
    expect(validateRunStateV4(v4)).toEqual({ ok: true });
    expect(migrateRunV3ToV4(v4)).toBe(v4);
    expect(v3).toEqual(preimage);
  });

  it('拒绝定义之外的能力状态键', () => {
    const v4 = migrateRunV3ToV4(
      migrateRunV2ToV3(
        createRunEconomyFixtureRun({
          seed: 'reject-unknown-ability-state',
          startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
        }),
      ),
    );
    const first = v4.modifiersV3.jokers[0];
    expect(first).toBeDefined();
    if (!first) return;
    const invalid = {
      ...v4,
      modifiersV3: {
        ...v4.modifiersV3,
        jokers: [{ ...first, abilityState: { unexpected: 1 } }],
      },
    };

    expect(runStateV4Schema.safeParse(invalid).success).toBe(false);
    const validation = validateRunStateV4(invalid);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.violations).toContain(
        `V4 奇牌能力状态键不匹配：${first.instanceId}`,
      );
    }
  });
});
