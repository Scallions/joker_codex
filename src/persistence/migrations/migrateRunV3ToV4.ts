import type { JokerDefinitionV2, RunStateV2 } from '../../game-core/model/runV2';
import { isLegacyRunStateV3 } from '../../game-core/model/runV3';
import {
  RUN_SCHEMA_VERSION_V4,
  isRunStateV4,
  type AbilityStateValueV4,
  type RunStateV4,
} from '../../game-core/model/runV4';
import { runMigrationFingerprint } from './migrateRunV2ToV3';

function initialAbilityState(
  run: RunStateV2,
  contentId: string,
): Readonly<Record<string, AbilityStateValueV4>> {
  const definition = run.content.items.find(
    (item): item is JokerDefinitionV2 =>
      item.kind === 'joker' && item.contentId === contentId,
  );
  return { ...(definition?.initialAbilityState ?? {}) };
}

export function migrateRunV3ToV4(run: RunStateV2): RunStateV4 {
  if (isRunStateV4(run)) return run;
  if (!isLegacyRunStateV3(run)) {
    throw new Error('仅支持将 V3 牌局迁移到 V4');
  }

  const ownedByInstance = new Map(
    run.inventory.jokers.map((joker) => [joker.instanceId, joker]),
  );

  return {
    ...run,
    schemaVersion: RUN_SCHEMA_VERSION_V4,
    modifiersV3: {
      ...run.modifiersV3,
      jokers: run.modifiersV3.jokers.map((modifier) => {
        const owned = ownedByInstance.get(modifier.instanceId);
        return {
          ...modifier,
          abilityState: owned ? initialAbilityState(run, owned.contentId) : {},
        };
      }),
    },
    migrationV4: {
      sourceSchemaVersion: 3,
      sourceContentVersion: run.contentVersion,
      sourceCheckpointId: run.checkpointId,
      recoveryFingerprint: runMigrationFingerprint(run),
    },
  };
}
