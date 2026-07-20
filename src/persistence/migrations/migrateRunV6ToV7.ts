import type { RunStateV2 } from '../../game-core/model/runV2';
import { isRunStateV6 } from '../../game-core/model/runV6';
import {
  RUN_SCHEMA_VERSION_V7,
  isRunStateV7,
  type RunClassV7,
  type RunStateV7,
} from '../../game-core/model/runV7';
import { JOKER_DISCOVERY_OBSERVATION_KEY } from '../../game-core/rules/discoveryV3';
import {
  JOKER_CONTENT_IDS,
  PROGRESSION_RULES_VERSION,
} from '../../progression/definitions';
import { runMigrationFingerprint } from './migrateRunV2ToV3';

function legacyRunClass(run: RunStateV2): RunClassV7 {
  if (run.mode === 'production-campaign') return 'campaign';
  if (run.mode === 'production-challenge') return 'challenge';
  return 'migrated-legacy';
}

function evidencedDiscoveries(run: RunStateV2): readonly string[] {
  const known = new Set(JOKER_CONTENT_IDS);
  return [
    ...new Set(
      run.history.effectObservations.flatMap((observation) =>
        observation.key === JOKER_DISCOVERY_OBSERVATION_KEY &&
        typeof observation.value === 'string' &&
        known.has(observation.value)
          ? [observation.value]
          : [],
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function migrateRunV6ToV7(run: RunStateV2): RunStateV7 {
  if (isRunStateV7(run)) return run;
  if (!isRunStateV6(run) || run.schemaVersion !== 6) {
    throw new Error('仅支持将 V6 牌局迁移到 V7');
  }
  return {
    ...run,
    schemaVersion: RUN_SCHEMA_VERSION_V7,
    sessionV7: {
      runClass: legacyRunClass(run),
      profileId: null,
      runSequence: 0,
      progressionRulesVersion: PROGRESSION_RULES_VERSION,
      eligibilityObjectiveIds: [],
      discoveredContentIds: evidencedDiscoveries(run),
      tutorialScriptVersion: null,
    },
    migrationV7: {
      sourceSchemaVersion: 6,
      sourceContentVersion: run.contentVersion,
      sourceCheckpointId: run.checkpointId,
      recoveryFingerprint: runMigrationFingerprint(run),
    },
  };
}
