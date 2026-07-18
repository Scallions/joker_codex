import type { ProfileId } from '../../src/game-core/model/ids';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import type { ProfileRecord } from '../../src/persistence/profiles';
import type { GameRepository } from '../../src/persistence/repository';

interface MemoryRepositorySeed {
  readonly profiles?: readonly ProfileRecord[];
  readonly runs?: ReadonlyArray<readonly [ProfileId, RunStateV2]>;
  readonly activeProfileId?: ProfileId | null;
}

export function createMemoryRepository(seed: MemoryRepositorySeed = {}): GameRepository {
  const profiles = new Map<string, ProfileRecord>(
    (seed.profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const runs = new Map<string, RunStateV2>(seed.runs ?? []);
  const recovery = new Map<string, RunStateV2>();
  let activeProfileId: ProfileId | null = seed.activeProfileId ?? null;

  return {
    initialize: async () => undefined,
    listProfiles: async () => [...profiles.values()].sort((a, b) => a.slot - b.slot),
    getProfile: async (id) => profiles.get(id),
    saveProfile: async (profile) => void profiles.set(profile.id, profile),
    deleteProfile: async (id) => {
      profiles.delete(id);
      runs.delete(id);
      recovery.delete(id);
    },
    setActiveProfile: async (id) => {
      activeProfileId = id;
    },
    getActiveProfileId: async () => activeProfileId,
    loadRun: async (id) => runs.get(id),
    loadRecoveryRun: async (id) => recovery.get(id),
    commitCheckpoint: async (profile, run) => {
      const previous = runs.get(profile.id);
      if (previous) recovery.set(profile.id, previous);
      profiles.set(profile.id, profile);
      runs.set(profile.id, run);
    },
    replaceProfile: async (profile, run) => {
      const previous = runs.get(profile.id);
      if (previous) recovery.set(profile.id, previous);
      profiles.set(profile.id, profile);
      if (run) runs.set(profile.id, run);
      else runs.delete(profile.id);
    },
    clearRun: async (profile) => {
      const previous = runs.get(profile.id);
      if (previous) recovery.set(profile.id, previous);
      profiles.set(profile.id, { ...profile, activeRunId: null });
      runs.delete(profile.id);
    },
  };
}
