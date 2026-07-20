import type { JokerRank, JokerSuit } from '../../content/schema/catalog';
import type { RunStateV2 } from './runV2';
import type { RunStateV5 } from './runV5';
import { isRunStateV5 } from './runV5';

export const RUN_SCHEMA_VERSION_V6 = 6 as const;
export const CONTENT_VERSION_V6 = 'joker-catalog-3' as const;

export interface JokerRuntimeStateV6 {
  readonly castleTargetSuit: JokerSuit | null;
  readonly idolTargetRank: JokerRank | null;
  readonly idolTargetSuit: JokerSuit | null;
  readonly jokerCapacityDebt: number;
}

export interface MigrationMetadataV6 {
  readonly sourceSchemaVersion: 1 | 2 | 3 | 4 | 5 | 6;
  readonly sourceContentVersion: string;
  readonly sourceCheckpointId: number;
  readonly recoveryFingerprint: string;
}

export type RunStateV6 = Omit<RunStateV5, 'schemaVersion' | 'contentVersion'> & {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V6;
  readonly contentVersion:
    | 'run-economy-2'
    | 'catalog-baseline-3'
    | 'joker-catalog-1'
    | 'joker-catalog-2'
    | typeof CONTENT_VERSION_V6;
  readonly jokerRuntimeV6: JokerRuntimeStateV6;
  readonly migrationV6: MigrationMetadataV6;
};

export function isRunStateV6(run: RunStateV2): run is RunStateV6 {
  return (
    run.schemaVersion === RUN_SCHEMA_VERSION_V6 &&
    'setupV3' in run &&
    'productionContentV3' in run &&
    'rulesV3' in run &&
    'modifiersV3' in run &&
    'externalDependenciesV3' in run &&
    'materializedChoicesV3' in run &&
    'migrationV3' in run &&
    'migrationV4' in run &&
    'jokerRuntimeV5' in run &&
    'migrationV5' in run &&
    'jokerRuntimeV6' in run &&
    'migrationV6' in run
  );
}

export function isRunStateV5OrV6(run: RunStateV2): run is RunStateV5 | RunStateV6 {
  return isRunStateV5(run) || isRunStateV6(run);
}
