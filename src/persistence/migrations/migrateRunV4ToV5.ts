import type { RunStateV2 } from '../../game-core/model/runV2';
import { isRunStateV4 } from '../../game-core/model/runV4';
import {
  RUN_SCHEMA_VERSION_V5,
  isRunStateV5,
  type RunStateV5,
} from '../../game-core/model/runV5';
import { runMigrationFingerprint } from './migrateRunV2ToV3';

export function migrateRunV4ToV5(run: RunStateV2): RunStateV5 {
  if (isRunStateV5(run)) return run;
  if (!isRunStateV4(run)) throw new Error('仅支持将 V4 牌局迁移到 V5');

  return {
    ...run,
    schemaVersion: RUN_SCHEMA_VERSION_V5,
    jokerRuntimeV5: {
      initialDeckSize: run.deck.cards.length,
      sharedRoundTargetRank: null,
      sharedRoundTargetSuit: null,
      bossDisabledForRound: false,
    },
    migrationV5: {
      sourceSchemaVersion: 4,
      sourceContentVersion: run.contentVersion,
      sourceCheckpointId: run.checkpointId,
      recoveryFingerprint: runMigrationFingerprint(run),
    },
  };
}
