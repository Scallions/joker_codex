import type { ProfileId } from '../game-core/model/ids';
import type { RunStateV2 } from '../game-core/model/runV2';
import type { ProfileRecord } from './profiles';

export interface GameRepository {
  initialize(): Promise<void>;
  listProfiles(): Promise<ProfileRecord[]>;
  getProfile(profileId: ProfileId): Promise<ProfileRecord | undefined>;
  saveProfile(profile: ProfileRecord): Promise<void>;
  deleteProfile(profileId: ProfileId): Promise<void>;
  setActiveProfile(profileId: ProfileId | null): Promise<void>;
  getActiveProfileId(): Promise<ProfileId | null>;
  loadRun(profileId: ProfileId): Promise<RunStateV2 | undefined>;
  loadRecoveryRun(profileId: ProfileId): Promise<RunStateV2 | undefined>;
  loadProfileActionRecovery(profileId: ProfileId): Promise<
    | {
        readonly profile: ProfileRecord;
        readonly run: RunStateV2 | null;
      }
    | undefined
  >;
  restoreProfileAction(profileId: ProfileId): Promise<{
    readonly profile: ProfileRecord;
    readonly run: RunStateV2 | null;
  }>;
  resetProfile(profileId: ProfileId, nowEpochMs: number): Promise<ProfileRecord>;
  commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void>;
  replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void>;
  clearRun(profile: ProfileRecord): Promise<void>;
}
