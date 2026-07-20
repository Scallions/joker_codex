import { createGameStore } from '../../src/app/store';
import {
  createLocalProfile,
  exportActiveProfile,
  importLocalProfile,
  initializeApplication,
  deleteLocalProfile,
  renameLocalProfile,
  selectLocalProfile,
  skipActiveTutorial,
  startLocalFixtureRun,
  submitRunCommand,
} from '../../src/app/store/appSlice';
import type { ProfileId } from '../../src/game-core/model/ids';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import type { GameRepository } from '../../src/persistence/repository';
import { createProfile, type ProfileRecord } from '../../src/persistence/profiles';

function memoryRepository(): GameRepository {
  const profiles = new Map<string, ProfileRecord>();
  const runs = new Map<string, RunStateV2>();
  const profileActions = new Map<
    string,
    { readonly profile: ProfileRecord; readonly run: RunStateV2 | null }
  >();
  let activeProfileId: ProfileId | null = null;
  let settings = DEFAULT_DEVICE_SETTINGS;

  return {
    initialize: async () => undefined,
    getSettings: async () => settings,
    saveSettings: async (nextSettings) => {
      settings = nextSettings;
    },
    listProfiles: async () => [...profiles.values()].sort((a, b) => a.slot - b.slot),
    getProfile: async (id) => profiles.get(id),
    saveProfile: async (profile) => void profiles.set(profile.id, profile),
    deleteProfile: async (id) => {
      profiles.delete(id);
      runs.delete(id);
    },
    setActiveProfile: async (id) => {
      activeProfileId = id;
    },
    getActiveProfileId: async () => activeProfileId,
    loadRun: async (id) => runs.get(id),
    loadRecoveryRun: async () => undefined,
    loadProfileActionRecovery: async (id) => profileActions.get(id),
    restoreProfileAction: async (id) => {
      const restored = profileActions.get(id);
      if (!restored) throw new Error('没有恢复点');
      profiles.set(id, restored.profile);
      if (restored.run) runs.set(id, restored.run);
      else runs.delete(id);
      return restored;
    },
    resetProfile: async (id, nowEpochMs) => {
      const profile = profiles.get(id);
      if (!profile) throw new Error('档案不存在');
      profileActions.set(id, { profile, run: runs.get(id) ?? null });
      const reset = {
        ...createProfile(profile.slot, profile.displayName, profile.createdAtEpochMs),
        updatedAtEpochMs: nowEpochMs,
      };
      profiles.set(id, reset);
      runs.delete(id);
      return reset;
    },
    commitCheckpoint: async (profile, run) => {
      profiles.set(profile.id, profile);
      runs.set(profile.id, run);
    },
    replaceProfile: async (profile, run) => {
      profiles.set(profile.id, profile);
      if (run) runs.set(profile.id, run);
      else runs.delete(profile.id);
    },
    clearRun: async (profile) => {
      profiles.set(profile.id, { ...profile, activeRunId: null });
      runs.delete(profile.id);
    },
  };
}

describe('应用状态纵切片', () => {
  it('从空数据库建立第一档案并开始确定性试玩局', async () => {
    const store = createGameStore(memoryRepository());

    await store.dispatch(initializeApplication()).unwrap();
    expect(store.getState().app.status).toBe('profiles');

    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '看戏人', nowEpochMs: 100 }))
      .unwrap();
    expect(store.getState().app.profiles[0]?.displayName).toBe('看戏人');
    expect(store.getState().app.activeProfileId).toBe('profile:1');

    await store
      .dispatch(startLocalFixtureRun({ seed: 'ui-seed', nowEpochMs: 200 }))
      .unwrap();
    expect(store.getState().app.status).toBe('playing');
    expect(store.getState().app.run?.seed).toBe('ui-seed');
    expect(store.getState().app.run?.checkpointId).toBe(0);
  });

  it('只在自动保存成功后提交规则指令', async () => {
    const store = createGameStore(memoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '掌柜', nowEpochMs: 100 }))
      .unwrap();
    await store
      .dispatch(startLocalFixtureRun({ seed: 'command-seed', nowEpochMs: 200 }))
      .unwrap();
    const before = store.getState().app.run;
    if (!before) throw new Error('缺少试玩局');

    await store
      .dispatch(
        submitRunCommand({
          type: 'select-blind',
          checkpointId: before.checkpointId,
          position: 'small',
        }),
      )
      .unwrap();
    const round = store.getState().app.run;
    const cardId = round?.round?.handIds[0];
    if (!round || !cardId) throw new Error('缺少活动回合');

    await store
      .dispatch(
        submitRunCommand({
          type: 'toggle-card',
          checkpointId: round.checkpointId,
          cardId,
        }),
      )
      .unwrap();

    expect(store.getState().app.run?.checkpointId).toBe(2);
    expect(store.getState().app.run?.round?.selectedCardIds).toEqual([cardId]);
  });

  it('切换档案时只恢复该档案自己的进行中牌局', async () => {
    const store = createGameStore(memoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '甲', nowEpochMs: 100 }))
      .unwrap();
    await store
      .dispatch(startLocalFixtureRun({ seed: 'profile-one-run', nowEpochMs: 200 }))
      .unwrap();
    const firstProfileId = store.getState().app.activeProfileId;
    if (!firstProfileId) throw new Error('缺少第一档案');

    await store
      .dispatch(createLocalProfile({ slot: 2, displayName: '乙', nowEpochMs: 300 }))
      .unwrap();
    expect(store.getState().app.run).toBeNull();

    await store.dispatch(selectLocalProfile(firstProfileId)).unwrap();
    expect(store.getState().app.run?.seed).toBe('profile-one-run');
    expect(store.getState().app.status).toBe('playing');
  });

  it('通过应用层导出并恢复含活动牌局的完整档案', async () => {
    const source = createGameStore(memoryRepository());
    await source.dispatch(initializeApplication()).unwrap();
    await source
      .dispatch(createLocalProfile({ slot: 1, displayName: '移箱人', nowEpochMs: 100 }))
      .unwrap();
    await source
      .dispatch(startLocalFixtureRun({ seed: 'portable-run', nowEpochMs: 200 }))
      .unwrap();
    const json = await source.dispatch(exportActiveProfile()).unwrap();

    const target = createGameStore(memoryRepository());
    await target.dispatch(initializeApplication()).unwrap();
    await target.dispatch(importLocalProfile(json)).unwrap();

    expect(target.getState().app.profiles[0]?.displayName).toBe('移箱人');
    expect(target.getState().app.run?.seed).toBe('portable-run');
    expect(target.getState().app.status).toBe('playing');
  });

  it('可以改名并删除本地档案位', async () => {
    const store = createGameStore(memoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '旧名', nowEpochMs: 100 }))
      .unwrap();
    const profileId = store.getState().app.activeProfileId;
    if (!profileId) throw new Error('缺少活动档案');

    await store
      .dispatch(renameLocalProfile({ profileId, displayName: '新名', nowEpochMs: 200 }))
      .unwrap();
    expect(store.getState().app.profiles[0]?.displayName).toBe('新名');

    await store.dispatch(deleteLocalProfile(profileId)).unwrap();
    expect(store.getState().app.profiles).toEqual([]);
    expect(store.getState().app.activeProfileId).toBeNull();
  });

  it('刷新后恢复无活动牌局的功能页面与模式设置', async () => {
    const repository = memoryRepository();
    const source = createGameStore(repository);
    await source.dispatch(initializeApplication()).unwrap();
    await source
      .dispatch(createLocalProfile({ slot: 1, displayName: '寻路人', nowEpochMs: 100 }))
      .unwrap();
    await source.dispatch(skipActiveTutorial({ nowEpochMs: 150 })).unwrap();

    const collection = createGameStore(repository, Date.now, undefined, () => ({
      status: 'collection',
    }));
    await collection.dispatch(initializeApplication()).unwrap();
    expect(collection.getState().app.status).toBe('collection');

    const seededSetup = createGameStore(repository, Date.now, undefined, () => ({
      status: 'setup',
      setupMode: 'seeded',
    }));
    await seededSetup.dispatch(initializeApplication()).unwrap();
    expect(seededSetup.getState().app).toMatchObject({
      status: 'setup',
      setupMode: 'seeded',
    });
  });

  it('活动牌局优先于刷新前的功能页面路由', async () => {
    const repository = memoryRepository();
    const source = createGameStore(repository);
    await source.dispatch(initializeApplication()).unwrap();
    await source
      .dispatch(createLocalProfile({ slot: 1, displayName: '续局人', nowEpochMs: 100 }))
      .unwrap();
    await source
      .dispatch(startLocalFixtureRun({ seed: 'durable-run', nowEpochMs: 200 }))
      .unwrap();

    const restored = createGameStore(repository, Date.now, undefined, () => ({
      status: 'collection',
    }));
    await restored.dispatch(initializeApplication()).unwrap();
    expect(restored.getState().app.status).toBe('playing');
    expect(restored.getState().app.run?.seed).toBe('durable-run');
  });

  it('新档案不能借刷新路由越过首次教程提示', async () => {
    const repository = memoryRepository();
    const source = createGameStore(repository);
    await source.dispatch(initializeApplication()).unwrap();
    await source
      .dispatch(createLocalProfile({ slot: 1, displayName: '新戏主', nowEpochMs: 100 }))
      .unwrap();

    const restored = createGameStore(repository, Date.now, undefined, () => ({
      status: 'setup',
      setupMode: 'campaign',
    }));
    await restored.dispatch(initializeApplication()).unwrap();
    expect(restored.getState().app).toMatchObject({
      status: 'menu',
      setupMode: null,
    });
  });
});
