import type { JokerRank, JokerSuit } from '../../content/schema/catalog';
import type { RunStateV2 } from './runV2';
import type { RunStateV4 } from './runV3';

export const RUN_SCHEMA_VERSION_V5 = 5 as const;
export const CONTENT_VERSION_V5 = 'joker-catalog-2' as const;

export interface JokerRuntimeStateV5 {
  readonly initialDeckSize: number;
  readonly sharedRoundTargetRank: JokerRank | null;
  readonly sharedRoundTargetSuit: JokerSuit | null;
  readonly bossDisabledForRound: boolean;
}

export interface MigrationMetadataV5 {
  readonly sourceSchemaVersion: 1 | 2 | 3 | 4 | 5;
  readonly sourceContentVersion: string;
  readonly sourceCheckpointId: number;
  readonly recoveryFingerprint: string;
}

export type RunStateV5 = Omit<RunStateV4, 'schemaVersion' | 'contentVersion'> & {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V5;
  readonly contentVersion:
    | 'run-economy-2'
    | 'catalog-baseline-3'
    | 'joker-catalog-1'
    | typeof CONTENT_VERSION_V5;
  readonly jokerRuntimeV5: JokerRuntimeStateV5;
  readonly migrationV5: MigrationMetadataV5;
};

export function isRunStateV5(run: RunStateV2): run is RunStateV5 {
  return (
    run.schemaVersion === RUN_SCHEMA_VERSION_V5 &&
    'setupV3' in run &&
    'productionContentV3' in run &&
    'rulesV3' in run &&
    'modifiersV3' in run &&
    'externalDependenciesV3' in run &&
    'materializedChoicesV3' in run &&
    'migrationV3' in run &&
    'migrationV4' in run &&
    'jokerRuntimeV5' in run &&
    'migrationV5' in run
  );
}
