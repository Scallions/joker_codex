import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';
import { renameProfile } from '../../src/persistence/profiles';
import {
  exportProfileToJson,
  importProfileFromJson,
  remapImportedProfileToSlot,
} from '../../src/persistence/profileTransfer';
import { createReleaseReplayFixture } from '../../src/test-support/releaseReplayV7';

describe('三档隔离矩阵', () => {
  it('选择、改名、导入、重置、恢复与删除都只影响目标档，设备设置保持共享', async () => {
    const databaseName = 'baixiqipai-profile-isolation-matrix';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const first = createReleaseReplayFixture('campaign', 1);
    const second = createReleaseReplayFixture('seeded', 2);
    const third = createReleaseReplayFixture('tutorial', 3);
    for (const fixture of [first, second, third]) {
      await repository.commitCheckpoint(fixture.profile, fixture.run);
    }
    const deviceSettings = {
      ...DEFAULT_DEVICE_SETTINGS,
      musicVolume: 0.4,
      sfxVolume: 0.7,
    };
    await repository.saveSettings(deviceSettings);

    for (const fixture of [first, second, third]) {
      await repository.setActiveProfile(fixture.profile.id);
      expect(await repository.getActiveProfileId()).toBe(fixture.profile.id);
      expect(await repository.loadRun(fixture.profile.id)).toEqual(fixture.run);
    }

    const renamedFirst = renameProfile(first.profile, '只改第一档', 300);
    await repository.saveProfile(renamedFirst);
    expect((await repository.getProfile(first.profile.id))?.displayName).toBe(
      '只改第一档',
    );
    expect(await repository.getProfile(second.profile.id)).toEqual(second.profile);
    expect(await repository.getProfile(third.profile.id)).toEqual(third.profile);

    const remapped = remapImportedProfileToSlot(
      importProfileFromJson(exportProfileToJson(renamedFirst, first.run)),
      2,
      400,
    );
    await repository.replaceProfile(remapped.profile, remapped.run);
    expect(await repository.loadRun(first.profile.id)).toEqual(first.run);
    expect(await repository.loadRun(third.profile.id)).toEqual(third.run);
    expect(await repository.getSettings()).toEqual(deviceSettings);

    const reset = await repository.resetProfile(remapped.profile.id, 500);
    expect(reset.activeRunId).toBeNull();
    expect(await repository.loadRun(remapped.profile.id)).toBeUndefined();
    expect(await repository.loadRun(first.profile.id)).toEqual(first.run);
    expect(await repository.loadRun(third.profile.id)).toEqual(third.run);

    const restored = await repository.restoreProfileAction(remapped.profile.id);
    expect(restored).toEqual({ profile: remapped.profile, run: remapped.run });
    expect(await repository.getSettings()).toEqual(deviceSettings);

    await repository.deleteProfile(remapped.profile.id);
    expect((await repository.listProfiles()).map(({ id }) => id)).toEqual([
      first.profile.id,
      third.profile.id,
    ]);
    expect(await repository.loadRun(first.profile.id)).toEqual(first.run);
    expect(await repository.loadRun(third.profile.id)).toEqual(third.run);
    expect(await repository.getSettings()).toEqual(deviceSettings);

    repository.close();
    await deleteDB(databaseName);
  });
});
