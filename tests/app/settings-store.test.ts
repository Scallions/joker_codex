import { createGameStore } from '../../src/app/store';
import {
  closeSoundStageDrawer,
  initializeApplication,
  openSoundStageDrawer,
  saveDeviceSettings,
} from '../../src/app/store/appSlice';
import {
  DEFAULT_DEVICE_SETTINGS,
  type DeviceSettingsV1,
} from '../../src/persistence/deviceSettings';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('声场设置状态', () => {
  it('初始化时读取设备设置且不依赖档案', async () => {
    const settings: DeviceSettingsV1 = {
      schemaVersion: 1,
      masterVolume: 0.45,
      musicVolume: 0.35,
      sfxVolume: 0.75,
      muted: true,
      presentationSpeed: 'brisk',
    };
    const store = createGameStore(createMemoryRepository({ settings }));

    await store.dispatch(initializeApplication()).unwrap();

    expect(store.getState().app.settings).toEqual(settings);
    expect(store.getState().app.settingsOpen).toBe(false);
  });

  it('设置记录损坏时仍加载档案并采用默认声场', async () => {
    const profile = createProfile(1, '守戏人', 100);
    const repository = {
      ...createMemoryRepository({ profiles: [profile] }),
      getSettings: async () => {
        throw new Error('记录损坏');
      },
    };
    const store = createGameStore(repository);

    await store.dispatch(initializeApplication()).unwrap();

    expect(store.getState().app.profiles).toEqual([profile]);
    expect(store.getState().app.settings).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(store.getState().app.settingsError).toBe('声场设置读取失败：记录损坏');
  });

  it('保存成功后让设备级设置立即成为当前值', async () => {
    const saved: DeviceSettingsV1[] = [];
    const repository = {
      ...createMemoryRepository(),
      saveSettings: async (settings: DeviceSettingsV1) => {
        saved.push(settings);
      },
    };
    const store = createGameStore(repository);
    await store.dispatch(initializeApplication()).unwrap();
    const next: DeviceSettingsV1 = {
      ...DEFAULT_DEVICE_SETTINGS,
      musicVolume: 0.2,
      presentationSpeed: 'brisk',
    };

    await store.dispatch(saveDeviceSettings(next)).unwrap();

    expect(saved).toEqual([next]);
    expect(store.getState().app.settings).toEqual(next);
    expect(store.getState().app.settingsBusy).toBe(false);
  });

  it('写入期间乐观预览新值，失败后恢复完整旧设置', async () => {
    let rejectSave: (reason: Error) => void = () => undefined;
    const repository = {
      ...createMemoryRepository(),
      saveSettings: () =>
        new Promise<void>((_resolve, reject) => {
          rejectSave = reject;
        }),
    };
    const store = createGameStore(repository);
    await store.dispatch(initializeApplication()).unwrap();
    const next: DeviceSettingsV1 = {
      ...DEFAULT_DEVICE_SETTINGS,
      masterVolume: 0.1,
      muted: true,
    };

    const saving = store.dispatch(saveDeviceSettings(next));
    const pendingSettings = store.getState().app.settings;
    rejectSave(new Error('磁盘拒绝写入'));
    await saving;

    expect(pendingSettings).toEqual(next);
    expect(store.getState().app.settings).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(store.getState().app.settingsError).toBe('声场设置保存失败：磁盘拒绝写入');
  });

  it('前一次写入完成前不会启动第二次设备写入', async () => {
    let finishSave: () => void = () => undefined;
    const calls: DeviceSettingsV1[] = [];
    const repository = {
      ...createMemoryRepository(),
      saveSettings: (settings: DeviceSettingsV1) => {
        calls.push(settings);
        if (calls.length > 1) return Promise.resolve();
        return new Promise<void>((resolve) => {
          finishSave = resolve;
        });
      },
    };
    const store = createGameStore(repository);
    await store.dispatch(initializeApplication()).unwrap();
    const first = { ...DEFAULT_DEVICE_SETTINGS, musicVolume: 0.4 };
    const second = { ...DEFAULT_DEVICE_SETTINGS, musicVolume: 0.2 };

    const firstSave = store.dispatch(saveDeviceSettings(first));
    await store.dispatch(saveDeviceSettings(second));

    expect(calls).toEqual([first]);
    expect(store.getState().app.settings).toEqual(first);
    finishSave();
    await firstSave;
  });

  it('声场抽屉开合不改变当前路由或牌局状态', async () => {
    const store = createGameStore(createMemoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    const before = store.getState().app;

    store.dispatch(openSoundStageDrawer());
    expect(store.getState().app.settingsOpen).toBe(true);
    expect(store.getState().app.status).toBe(before.status);
    expect(store.getState().app.run).toBe(before.run);

    store.dispatch(closeSoundStageDrawer());
    expect(store.getState().app.settingsOpen).toBe(false);
    expect(store.getState().app.status).toBe(before.status);
    expect(store.getState().app.run).toBe(before.run);
  });
});
