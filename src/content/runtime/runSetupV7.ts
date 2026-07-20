import { validateRunStateV7 } from '../../game-core/invariants/validateRunStateV7';
import { stableId, type ProfileId } from '../../game-core/model/ids';
import {
  CONTENT_VERSION_V7,
  RUN_SCHEMA_VERSION_V7,
  type RunClassV7,
  type RunStateV7,
} from '../../game-core/model/runV7';
import {
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
} from '../../progression/definitions';
import { runMigrationFingerprint } from '../../persistence/migrations/migrateRunV2ToV3';
import type { ProductionCatalog } from '../schema/catalog';
import { createProductionRunV6, type CreateProductionRunOptionsV6 } from './runSetupV6';

export interface CreateProductionRunOptionsV7 extends CreateProductionRunOptionsV6 {
  readonly profileId: ProfileId;
  readonly runSequence: number;
  readonly runClass: Exclude<RunClassV7, 'migrated-legacy'>;
  readonly eligibilityObjectiveIds: readonly string[];
  readonly discoveredContentIds: readonly string[];
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function createProductionRunV7(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV7,
): RunStateV7 {
  if (!Number.isSafeInteger(options.runSequence) || options.runSequence < 1) {
    throw new RangeError('牌局序号必须是正安全整数');
  }
  if (!/^[A-Z0-9]{8}$/.test(options.seed)) {
    throw new RangeError('V7 牌局种子必须是 8 位大写英文字母或数字');
  }
  if ((options.runClass === 'challenge') !== Boolean(options.challengeId)) {
    throw new Error('挑战模式与挑战设置不匹配');
  }
  const base = createProductionRunV6(catalog, options);
  const run: RunStateV7 = {
    ...base,
    schemaVersion: RUN_SCHEMA_VERSION_V7,
    contentVersion: CONTENT_VERSION_V7,
    runId: stableId<'run'>(
      `run:${options.profileId}:${options.runSequence}:${options.runClass}:${options.seed}`,
    ),
    productionContentV3: {
      ...base.productionContentV3,
      contentVersion: CONTENT_VERSION_V7,
    },
    sessionV7: {
      runClass: options.runClass,
      profileId: options.profileId,
      runSequence: options.runSequence,
      progressionRulesVersion: PROGRESSION_RULES_VERSION,
      eligibilityObjectiveIds: sortedUnique(options.eligibilityObjectiveIds),
      discoveredContentIds: sortedUnique(options.discoveredContentIds),
      tutorialScriptVersion:
        options.runClass === 'tutorial' ? TUTORIAL_SCRIPT_VERSION : null,
    },
    migrationV7: {
      sourceSchemaVersion: 7,
      sourceContentVersion: CONTENT_VERSION_V7,
      sourceCheckpointId: 0,
      recoveryFingerprint: runMigrationFingerprint(base),
    },
  };
  const validation = validateRunStateV7(run);
  if (!validation.ok) {
    throw new Error(`生产 V7 牌局初始化失败：${validation.violations.join('；')}`);
  }
  return run;
}
