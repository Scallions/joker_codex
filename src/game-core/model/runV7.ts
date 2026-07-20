import type { ProfileId } from './ids';
import type { RunStateV2 } from './runV2';
import type { RunStateV6 } from './runV6';
import { PROGRESSION_CONTENT_VERSION } from '../../progression/seedCode';
import type {
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
} from '../../progression/definitions';

export const RUN_SCHEMA_VERSION_V7 = 7 as const;
export const CONTENT_VERSION_V7 = PROGRESSION_CONTENT_VERSION;

export type RunClassV7 =
  'campaign' | 'seeded' | 'challenge' | 'tutorial' | 'migrated-legacy';

export interface RunSessionV7 {
  readonly runClass: RunClassV7;
  readonly profileId: ProfileId | null;
  readonly runSequence: number;
  readonly progressionRulesVersion: typeof PROGRESSION_RULES_VERSION;
  readonly eligibilityObjectiveIds: readonly string[];
  readonly discoveredContentIds: readonly string[];
  readonly tutorialScriptVersion: typeof TUTORIAL_SCRIPT_VERSION | null;
}

export interface MigrationMetadataV7 {
  readonly sourceSchemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly sourceContentVersion: string;
  readonly sourceCheckpointId: number;
  readonly recoveryFingerprint: string;
}

export type RunStateV7 = Omit<RunStateV6, 'schemaVersion' | 'contentVersion'> & {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V7;
  readonly contentVersion: RunStateV6['contentVersion'];
  readonly sessionV7: RunSessionV7;
  readonly migrationV7: MigrationMetadataV7;
};

export function isRunStateV7(run: RunStateV2): run is RunStateV7 {
  return (
    run.schemaVersion === RUN_SCHEMA_VERSION_V7 &&
    'jokerRuntimeV6' in run &&
    'migrationV6' in run &&
    'sessionV7' in run &&
    'migrationV7' in run
  );
}
