import { isRunStateV3 } from '../../game-core/model/runV3';
import type { ProfileId, RunId } from '../../game-core/model/ids';
import type { RunStateV2 } from '../../game-core/model/runV2';
import { JOKER_DISCOVERY_OBSERVATION_KEY } from '../../game-core/rules/discoveryV3';
import { JOKER_CONTENT_IDS } from '../../progression/definitions';
import { createProfile, type ProfileRecord, type ProfileSlot } from '../profiles';

export interface LegacyProfileRecordV0 {
  readonly id: ProfileId;
  readonly slot: ProfileSlot;
  readonly displayName: string;
  readonly createdAtEpochMs: number;
  readonly updatedAtEpochMs: number;
  readonly activeRunId: RunId | null;
}

function evidencedDiscoveries(run: RunStateV2 | null): readonly string[] {
  if (!run || !isRunStateV3(run) || run.mode !== 'production-campaign') return [];
  const knownJokers = new Set(JOKER_CONTENT_IDS);
  return [
    ...new Set(
      run.history.effectObservations.flatMap((observation) =>
        observation.key === JOKER_DISCOVERY_OBSERVATION_KEY &&
        typeof observation.value === 'string' &&
        knownJokers.has(observation.value)
          ? [observation.value]
          : [],
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function migrateProfileV0ToV1(
  legacy: LegacyProfileRecordV0,
  run: RunStateV2 | null,
): ProfileRecord {
  if (legacy.id !== `profile:${legacy.slot}`) {
    throw new Error('旧档案编号与档位不匹配');
  }
  if ((legacy.activeRunId === null) !== (run === null)) {
    throw new Error('旧档案与进行中的牌局不匹配');
  }
  if (run && legacy.activeRunId !== run.runId) {
    throw new Error('旧档案引用了另一局牌');
  }

  const fresh = createProfile(legacy.slot, legacy.displayName, legacy.createdAtEpochMs);
  return {
    ...fresh,
    id: legacy.id,
    createdAtEpochMs: legacy.createdAtEpochMs,
    updatedAtEpochMs: legacy.updatedAtEpochMs,
    activeRunId: legacy.activeRunId,
    collection: {
      ...fresh.collection,
      discoveredJokerIds: evidencedDiscoveries(run),
    },
    currentRunProgress: {
      ...fresh.currentRunProgress,
      runId: legacy.activeRunId,
    },
  };
}
