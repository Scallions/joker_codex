import 'fake-indexeddb/auto';

import { deleteDB, openDB } from 'idb';

import {
  DEFAULT_DEVICE_SETTINGS,
  decodeDeviceSettings,
  validateDeviceSettings,
} from '../../src/persistence/deviceSettings';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';

describe('设备级声场设置', () => {
  it('把旧音量记录升级为 V1，并完整保留原有值', () => {
    expect(
      decodeDeviceSettings({
        masterVolume: 0.6,
        musicVolume: 0.25,
        sfxVolume: 0.95,
        muted: true,
      }),
    ).toEqual({
      schemaVersion: 1,
      masterVolume: 0.6,
      musicVolume: 0.25,
      sfxVolume: 0.95,
      muted: true,
      presentationSpeed: 'full',
    });
  });

  it('缺少本地记录时返回完整 V1 默认值', () => {
    expect(decodeDeviceSettings(undefined)).toEqual(DEFAULT_DEVICE_SETTINGS);
  });

  it('读取 V1 记录时保留利落演出选择', () => {
    const settings = {
      schemaVersion: 1 as const,
      masterVolume: 0.4,
      musicVolume: 0.5,
      sfxVolume: 0.6,
      muted: false,
      presentationSpeed: 'brisk' as const,
    };

    expect(decodeDeviceSettings(settings)).toEqual(settings);
  });

  it('拒绝越界音量而不是静默截断', () => {
    expect(() =>
      decodeDeviceSettings({
        schemaVersion: 1,
        masterVolume: 1.2,
        musicVolume: 0.5,
        sfxVolume: 0.6,
        muted: false,
        presentationSpeed: 'full',
      }),
    ).toThrow('设备声场设置无效');
  });

  it('拒绝未知未来版本，避免用旧客户端覆盖', () => {
    expect(() =>
      decodeDeviceSettings({
        schemaVersion: 2,
        masterVolume: 0.8,
        musicVolume: 0.7,
        sfxVolume: 0.9,
        muted: false,
        presentationSpeed: 'brisk',
      }),
    ).toThrow('设备声场设置版本过新');
  });

  it('拒绝 V1 中未定义的演出速度', () => {
    expect(() =>
      decodeDeviceSettings({
        schemaVersion: 1,
        masterVolume: 0.8,
        musicVolume: 0.7,
        sfxVolume: 0.9,
        muted: false,
        presentationSpeed: 'instant',
      }),
    ).toThrow('设备声场设置无效');
  });

  it('拒绝非布尔静音字段', () => {
    expect(() =>
      decodeDeviceSettings({
        masterVolume: 0.8,
        musicVolume: 0.7,
        sfxVolume: 0.9,
        muted: 'yes',
      }),
    ).toThrow('设备声场设置无效');
  });

  it('为仓库写入提供公开的 V1 校验结果', () => {
    expect(validateDeviceSettings(DEFAULT_DEVICE_SETTINGS)).toEqual({ ok: true });
  });

  it('写入校验会报告越界字段', () => {
    expect(
      validateDeviceSettings({
        ...DEFAULT_DEVICE_SETTINGS,
        masterVolume: 2,
      }),
    ).toEqual({ ok: false, violations: ['masterVolume 必须在 0 到 1 之间'] });
  });

  it('仓库读取旧记录时原地写回 V1', async () => {
    const databaseName = 'baixiqipai-test-device-settings-migration';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const database = await openDB(databaseName, 1);
    await database.put(
      'settings',
      {
        masterVolume: 0.3,
        musicVolume: 0.4,
        sfxVolume: 0.5,
        muted: true,
      },
      'device',
    );
    database.close();

    const migrated = await repository.getSettings();
    expect(migrated).toMatchObject({
      schemaVersion: 1,
      masterVolume: 0.3,
      musicVolume: 0.4,
      sfxVolume: 0.5,
      muted: true,
      presentationSpeed: 'full',
    });

    const storedDatabase = await openDB(databaseName, 1);
    expect(await storedDatabase.get('settings', 'device')).toEqual(migrated);
    storedDatabase.close();
    repository.close();
    await deleteDB(databaseName);
  });
});
