export const PRESENTATION_SCENE_ASSET_VERSION = 1 as const;

export const PRESENTATION_SCENE_IDS = [
  'brand-curtain',
  'profile-ledger',
  'main-ensemble',
  'mode-rehearsal',
  'blind-curtain',
  'table-stage',
  'reward-receipt',
  'night-market',
  'prop-cabinet',
  'archive-ledger',
  'honor-ledger',
  'rehearsal-guide',
  'backstage-controls',
  'curtain-call',
  'empty-stage',
] as const;

export type PresentationSceneId = (typeof PRESENTATION_SCENE_IDS)[number];

export interface PresentationSceneAssetRecord {
  readonly id: PresentationSceneId;
  readonly path: `/assets/presentation/scenes/${PresentationSceneId}.webp`;
  readonly provenancePath: `/assets/presentation/provenance/${PresentationSceneId}.md`;
  readonly referencePath: '/assets/presentation/references/ensemble-reference.png';
  readonly width: 1920;
  readonly height: 1080;
  readonly format: 'webp';
  readonly owner: 'midnight-variety-presentation';
  readonly source: 'openai-imagegen';
  readonly focalPoint: readonly [number, number];
  /** Normalized x, y, width, height of the preferred live-UI overlay region. */
  readonly safeArea: readonly [number, number, number, number];
  readonly reviewed: true;
}

const scene = (
  id: PresentationSceneId,
  focalPoint: readonly [number, number],
  safeArea: readonly [number, number, number, number],
): PresentationSceneAssetRecord => ({
  id,
  path: `/assets/presentation/scenes/${id}.webp`,
  provenancePath: `/assets/presentation/provenance/${id}.md`,
  referencePath: '/assets/presentation/references/ensemble-reference.png',
  width: 1920,
  height: 1080,
  format: 'webp',
  owner: 'midnight-variety-presentation',
  source: 'openai-imagegen',
  focalPoint,
  safeArea,
  reviewed: true,
});

export const PRESENTATION_SCENE_ASSETS = [
  scene('brand-curtain', [0.5, 0.55], [0.2, 0.16, 0.6, 0.62]),
  scene('profile-ledger', [0.5, 0.52], [0.13, 0.17, 0.74, 0.69]),
  scene('main-ensemble', [0.5, 0.62], [0.26, 0.48, 0.48, 0.43]),
  scene('mode-rehearsal', [0.33, 0.5], [0.07, 0.12, 0.6, 0.78]),
  scene('blind-curtain', [0.57, 0.5], [0.12, 0.22, 0.82, 0.58]),
  scene('table-stage', [0.5, 0.55], [0.14, 0.19, 0.72, 0.72]),
  scene('reward-receipt', [0.48, 0.49], [0.17, 0.14, 0.65, 0.72]),
  scene('night-market', [0.5, 0.62], [0.22, 0.34, 0.56, 0.58]),
  scene('prop-cabinet', [0.5, 0.51], [0.22, 0.25, 0.56, 0.54]),
  scene('archive-ledger', [0.52, 0.5], [0.27, 0.12, 0.58, 0.8]),
  scene('honor-ledger', [0.5, 0.51], [0.24, 0.14, 0.52, 0.72]),
  scene('rehearsal-guide', [0.33, 0.48], [0.08, 0.12, 0.55, 0.75]),
  scene('backstage-controls', [0.72, 0.48], [0.55, 0.07, 0.4, 0.86]),
  scene('curtain-call', [0.5, 0.52], [0.25, 0.12, 0.5, 0.73]),
  scene('empty-stage', [0.5, 0.44], [0.24, 0.12, 0.52, 0.68]),
] as const satisfies readonly PresentationSceneAssetRecord[];

export const PRESENTATION_SCENES_BY_ID: Readonly<
  Record<PresentationSceneId, PresentationSceneAssetRecord>
> = Object.fromEntries(
  PRESENTATION_SCENE_ASSETS.map((asset) => [asset.id, asset]),
) as Record<PresentationSceneId, PresentationSceneAssetRecord>;

export const PRESENTATION_AUDIO_ASSET_VERSION = 1 as const;

export const PRESENTATION_AUDIO_IDS = [
  'music-atmosphere',
  'music-percussion',
  'music-color',
  'card-lift',
  'card-select',
  'card-draw',
  'card-play',
  'card-discard',
  'card-sweep',
  'paper-fold',
  'paper-tear',
  'wood-tap',
  'coin-spend',
  'coin-receive',
  'seal-soft',
  'seal-hard',
  'curtain-open',
  'curtain-close',
  'pack-open',
  'pack-choice',
  'purchase',
  'sale',
  'score-low',
  'score-high',
  'unlock',
  'stinger-victory',
  'stinger-loss',
  'stinger-rare',
  'stinger-achievement',
] as const;

export type PresentationAudioId = (typeof PRESENTATION_AUDIO_IDS)[number];

export interface PresentationAudioAssetRecord {
  readonly id: PresentationAudioId;
  readonly kind: 'stem' | 'sfx' | 'stinger';
  readonly path: `/assets/presentation/audio/${PresentationAudioId}.wav`;
  readonly provenancePath: '/assets/presentation/provenance/audio-generation.md';
  readonly durationSeconds: number;
  readonly sampleRate: 32_000;
  readonly channels: 1;
  readonly bitsPerSample: 16;
  readonly format: 'wav';
  readonly owner: 'midnight-variety-presentation';
  readonly source: 'deterministic-generator';
  readonly generatorPreset: PresentationAudioId;
  readonly purpose: string;
  readonly peakTarget: number;
  readonly reviewed: true;
}

const audio = (
  id: PresentationAudioId,
  kind: PresentationAudioAssetRecord['kind'],
  durationSeconds: number,
  purpose: string,
  peakTarget: number,
): PresentationAudioAssetRecord => ({
  id,
  kind,
  path: `/assets/presentation/audio/${id}.wav`,
  provenancePath: '/assets/presentation/provenance/audio-generation.md',
  durationSeconds,
  sampleRate: 32_000,
  channels: 1,
  bitsPerSample: 16,
  format: 'wav',
  owner: 'midnight-variety-presentation',
  source: 'deterministic-generator',
  generatorPreset: id,
  purpose,
  peakTarget,
  reviewed: true,
});

export const PRESENTATION_AUDIO_ASSETS = [
  audio('music-atmosphere', 'stem', 96, '全局午夜声场与连续低频气息', 0.68),
  audio('music-percussion', 'stem', 96, '牌桌与盲注用板鼓节奏层', 0.7),
  audio('music-color', 'stem', 96, '夜市与谢幕用弹拨和箫色层', 0.68),
  audio('card-lift', 'sfx', 0.18, '纸牌抬起', 0.64),
  audio('card-select', 'sfx', 0.12, '纸牌选中', 0.62),
  audio('card-draw', 'sfx', 0.28, '纸牌抽取', 0.66),
  audio('card-play', 'sfx', 0.34, '纸牌打出', 0.72),
  audio('card-discard', 'sfx', 0.32, '纸牌弃置', 0.68),
  audio('card-sweep', 'sfx', 0.48, '台面收牌', 0.68),
  audio('paper-fold', 'sfx', 0.34, '票据折叠', 0.6),
  audio('paper-tear', 'sfx', 0.46, '纸封撕开', 0.68),
  audio('wood-tap', 'sfx', 0.16, '木牌轻叩', 0.65),
  audio('coin-spend', 'sfx', 0.32, '戏票支出', 0.72),
  audio('coin-receive', 'sfx', 0.42, '戏票收入', 0.72),
  audio('seal-soft', 'sfx', 0.3, '常规朱印落下', 0.68),
  audio('seal-hard', 'sfx', 0.52, '最终朱印重落', 0.78),
  audio('curtain-open', 'sfx', 0.78, '幕布开启', 0.64),
  audio('curtain-close', 'sfx', 0.72, '幕布收拢', 0.68),
  audio('pack-open', 'sfx', 0.85, '道具包拆封', 0.72),
  audio('pack-choice', 'sfx', 0.38, '道具包选择', 0.68),
  audio('purchase', 'sfx', 0.48, '夜市购入', 0.72),
  audio('sale', 'sfx', 0.44, '夜市售出', 0.68),
  audio('score-low', 'sfx', 0.42, '常规计分层级', 0.68),
  audio('score-high', 'sfx', 0.72, '高阶计分层级', 0.76),
  audio('unlock', 'sfx', 0.88, '普通解锁完成', 0.74),
  audio('stinger-victory', 'stinger', 2.6, '胜利谢幕短章', 0.8),
  audio('stinger-loss', 'stinger', 2.2, '失败收场短章', 0.72),
  audio('stinger-rare', 'stinger', 1.8, '稀有获得短章', 0.76),
  audio('stinger-achievement', 'stinger', 2.4, '成就完成短章', 0.8),
] as const satisfies readonly PresentationAudioAssetRecord[];

export const PRESENTATION_AUDIO_BY_ID: Readonly<
  Record<PresentationAudioId, PresentationAudioAssetRecord>
> = Object.fromEntries(
  PRESENTATION_AUDIO_ASSETS.map((asset) => [asset.id, asset]),
) as Record<PresentationAudioId, PresentationAudioAssetRecord>;
