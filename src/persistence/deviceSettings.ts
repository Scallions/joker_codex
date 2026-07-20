export type PresentationSpeed = 'full' | 'brisk';

export interface DeviceSettingsV1 {
  readonly schemaVersion: 1;
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  readonly presentationSpeed: PresentationSpeed;
}

export type LegacyDeviceSettingsV0 = Omit<
  DeviceSettingsV1,
  'schemaVersion' | 'presentationSpeed'
>;

export const DEFAULT_DEVICE_SETTINGS: DeviceSettingsV1 = {
  schemaVersion: 1,
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  muted: false,
  presentationSpeed: 'full',
};

export type DeviceSettingsValidation =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

export function validateDeviceSettings(
  settings: DeviceSettingsV1,
): DeviceSettingsValidation {
  const violations: string[] = [];
  const volumes = [
    ['masterVolume', settings.masterVolume],
    ['musicVolume', settings.musicVolume],
    ['sfxVolume', settings.sfxVolume],
  ] as const;
  for (const [field, volume] of volumes) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      violations.push(`${field} 必须在 0 到 1 之间`);
    }
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

function decodeVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('设备声场设置无效');
  }
  return value;
}

export function decodeDeviceSettings(value: unknown): DeviceSettingsV1 {
  if (value === undefined) return DEFAULT_DEVICE_SETTINGS;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('设备声场设置无效');
  }
  const record = value as Record<string, unknown>;
  const masterVolume = decodeVolume(record.masterVolume);
  const musicVolume = decodeVolume(record.musicVolume);
  const sfxVolume = decodeVolume(record.sfxVolume);
  if (typeof record.muted !== 'boolean') {
    throw new Error('设备声场设置无效');
  }
  if (record.schemaVersion !== undefined && record.schemaVersion !== 1) {
    if (typeof record.schemaVersion === 'number' && record.schemaVersion > 1) {
      throw new Error('设备声场设置版本过新');
    }
    throw new Error('设备声场设置无效');
  }
  if (record.schemaVersion === 1) {
    if (record.presentationSpeed !== 'full' && record.presentationSpeed !== 'brisk') {
      throw new Error('设备声场设置无效');
    }
    const decoded: DeviceSettingsV1 = {
      schemaVersion: 1,
      masterVolume,
      musicVolume,
      sfxVolume,
      muted: record.muted,
      presentationSpeed: record.presentationSpeed,
    };
    const validation = validateDeviceSettings(decoded);
    if (!validation.ok) throw new Error('设备声场设置无效');
    return decoded;
  }
  const decoded: DeviceSettingsV1 = {
    schemaVersion: 1,
    masterVolume,
    musicVolume,
    sfxVolume,
    muted: record.muted,
    presentationSpeed: 'full',
  };
  const validation = validateDeviceSettings(decoded);
  if (!validation.ok) throw new Error('设备声场设置无效');
  return decoded;
}
