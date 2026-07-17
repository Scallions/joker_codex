import { stableId } from '../game-core/model/ids';
import type { ProfileId, RunId } from '../game-core/model/ids';

export type ProfileSlot = 1 | 2 | 3;

export interface ProfileRecord {
  readonly id: ProfileId;
  readonly slot: ProfileSlot;
  readonly displayName: string;
  readonly createdAtEpochMs: number;
  readonly updatedAtEpochMs: number;
  readonly activeRunId: RunId | null;
}

export function createProfile(
  slot: ProfileSlot,
  displayName: string,
  nowEpochMs: number,
): ProfileRecord {
  const normalizedName = displayName.trim();
  if (normalizedName.length < 1 || normalizedName.length > 12) {
    throw new RangeError('档案名须为 1 至 12 个字符');
  }
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < 0) {
    throw new RangeError('档案时间无效');
  }

  return {
    id: stableId<'profile'>(`profile:${slot}`),
    slot,
    displayName: normalizedName,
    createdAtEpochMs: nowEpochMs,
    updatedAtEpochMs: nowEpochMs,
    activeRunId: null,
  };
}

export function renameProfile(
  profile: ProfileRecord,
  displayName: string,
  nowEpochMs: number,
): ProfileRecord {
  const renamed = createProfile(profile.slot, displayName, nowEpochMs);
  return {
    ...profile,
    displayName: renamed.displayName,
    updatedAtEpochMs: nowEpochMs,
  };
}
