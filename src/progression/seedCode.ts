import { PRODUCTION_CATALOG } from '../content/productionCatalog';

export const SEED_SHARE_FORMAT_VERSION = 'BXQP1' as const;
export const PROGRESSION_CONTENT_VERSION = 'progression-modes-1' as const;
const SEED_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateAutomaticSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes]
    .map((value) => SEED_ALPHABET[value % SEED_ALPHABET.length] ?? 'A')
    .join('');
}

export function normalizeGeneratedSeed(seed: string): string {
  const normalized = seed.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(normalized)) {
    throw new Error('自动种子生成器必须返回 8 位大写英文字母或数字');
  }
  return normalized;
}

export interface SeedSetupReferences {
  readonly deckReference: string;
  readonly stakeReference: string;
}

export interface SeedSetupPreview extends SeedSetupReferences {
  readonly contentVersion: typeof PROGRESSION_CONTENT_VERSION;
  readonly seed: string;
  readonly deckId: string;
  readonly stakeId: string;
}

export type SeedParseResult =
  | { readonly ok: true; readonly preview: SeedSetupPreview }
  | {
      readonly ok: false;
      readonly code:
        | 'invalid-seed'
        | 'invalid-code'
        | 'unsupported-version'
        | 'unknown-content'
        | 'missing-setup';
      readonly message: string;
    };

const deckByReference = new Map(
  PRODUCTION_CATALOG.rows
    .filter((row) => row.family === 'deck')
    .map((row) => [row.referenceIndex, row.id]),
);
const stakeByReference = new Map(
  PRODUCTION_CATALOG.rows
    .filter((row) => row.family === 'stake')
    .map((row) => [row.referenceIndex, row.id]),
);

function preview(
  seed: string,
  deckReference: string,
  stakeReference: string,
): SeedParseResult {
  if (!/^[A-Z0-9]{8}$/.test(seed)) {
    return {
      ok: false,
      code: 'invalid-seed',
      message: '种子必须是 8 位大写英文字母或数字',
    };
  }
  const deckId = deckByReference.get(deckReference);
  const stakeId = stakeByReference.get(stakeReference);
  if (!deckId || !stakeId) {
    return {
      ok: false,
      code: 'unknown-content',
      message: '分享码引用了不存在的牌组或筹码等级',
    };
  }
  return {
    ok: true,
    preview: {
      contentVersion: PROGRESSION_CONTENT_VERSION,
      seed,
      deckReference,
      stakeReference,
      deckId,
      stakeId,
    },
  };
}

export function parseSeedInput(
  input: string,
  defaults: SeedSetupReferences | null,
): SeedParseResult {
  const trimmed = input.trim();
  if (!trimmed.includes('|')) {
    const seed = trimmed.toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(seed)) {
      return {
        ok: false,
        code: 'invalid-seed',
        message: '种子必须是 8 位大写英文字母或数字',
      };
    }
    if (!defaults) {
      return {
        ok: false,
        code: 'missing-setup',
        message: '纯种子还需要先选择牌组与筹码等级',
      };
    }
    return preview(
      seed,
      defaults.deckReference.toUpperCase(),
      defaults.stakeReference.toUpperCase(),
    );
  }

  const parts = trimmed.split('|');
  if (parts.length !== 5 || parts[0]?.toUpperCase() !== SEED_SHARE_FORMAT_VERSION) {
    return { ok: false, code: 'invalid-code', message: '种子分享码格式无效' };
  }
  if (parts[1] !== PROGRESSION_CONTENT_VERSION) {
    return {
      ok: false,
      code: 'unsupported-version',
      message: `此分享码使用不受支持的内容版本：${parts[1] ?? '未知'}`,
    };
  }
  return preview(
    (parts[2] ?? '').toUpperCase(),
    (parts[3] ?? '').toUpperCase(),
    (parts[4] ?? '').toUpperCase(),
  );
}

export function serializeSeedCode(setup: SeedSetupPreview): string {
  const validated = preview(
    setup.seed.toUpperCase(),
    setup.deckReference.toUpperCase(),
    setup.stakeReference.toUpperCase(),
  );
  if (!validated.ok) throw new Error(validated.message);
  return [
    SEED_SHARE_FORMAT_VERSION,
    PROGRESSION_CONTENT_VERSION,
    validated.preview.seed,
    validated.preview.deckReference,
    validated.preview.stakeReference,
  ].join('|');
}
