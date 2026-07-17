import type { ProfileId } from '../game-core/model/ids';
import type { RunState } from '../game-core/model/run';
import type { ProfileRecord } from './profiles';

export interface GameRepository {
  initialize(): Promise<void>;
  listProfiles(): Promise<ProfileRecord[]>;
  getProfile(profileId: ProfileId): Promise<ProfileRecord | undefined>;
  saveProfile(profile: ProfileRecord): Promise<void>;
  deleteProfile(profileId: ProfileId): Promise<void>;
  setActiveProfile(profileId: ProfileId | null): Promise<void>;
  getActiveProfileId(): Promise<ProfileId | null>;
  loadRun(profileId: ProfileId): Promise<RunState | undefined>;
  loadRecoveryRun(profileId: ProfileId): Promise<RunState | undefined>;
  commitCheckpoint(profile: ProfileRecord, run: RunState): Promise<void>;
  replaceProfile(profile: ProfileRecord, run: RunState | null): Promise<void>;
  clearRun(profile: ProfileRecord): Promise<void>;
}
