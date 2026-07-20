import type { RunStateV2 } from '../../game-core/model/runV2';
import { isRunStateV5 } from '../../game-core/model/runV5';
import {
  RUN_SCHEMA_VERSION_V6,
  isRunStateV6,
  type RunStateV6,
} from '../../game-core/model/runV6';
import { usedJokerSlotsForRun } from '../../game-core/rules/inventoryCapacityV6';
import { runMigrationFingerprint } from './migrateRunV2ToV3';

export function migrateRunV5ToV6(run: RunStateV2): RunStateV6 {
  if (isRunStateV6(run)) return run;
  if (!isRunStateV5(run)) throw new Error('仅支持将 V5 牌局迁移到 V6');

  return {
    ...run,
    schemaVersion: RUN_SCHEMA_VERSION_V6,
    jokerRuntimeV6: {
      castleTargetSuit: null,
      idolTargetRank: null,
      idolTargetSuit: null,
      jokerCapacityDebt: Math.max(0, usedJokerSlotsForRun(run) - run.rules.jokerSlots),
    },
    migrationV6: {
      sourceSchemaVersion: 5,
      sourceContentVersion: run.contentVersion,
      sourceCheckpointId: run.checkpointId,
      recoveryFingerprint: runMigrationFingerprint(run),
    },
  };
}
