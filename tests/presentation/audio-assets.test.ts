import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PRESENTATION_AUDIO_ASSETS,
  PRESENTATION_AUDIO_ASSET_VERSION,
} from '../../src/presentation/assets/presentationAssets';

const STEM_IDS = ['music-atmosphere', 'music-percussion', 'music-color'] as const;
const SFX_IDS = [
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
] as const;
const STINGER_IDS = [
  'stinger-victory',
  'stinger-loss',
  'stinger-rare',
  'stinger-achievement',
] as const;

function inspectPcmWav(source: Buffer) {
  expect(source.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(source.subarray(8, 12).toString('ascii')).toBe('WAVE');
  expect(source.subarray(12, 16).toString('ascii')).toBe('fmt ');
  expect(source.readUInt16LE(20)).toBe(1);
  expect(source.readUInt16LE(22)).toBe(1);
  expect(source.readUInt32LE(24)).toBe(32_000);
  expect(source.readUInt16LE(34)).toBe(16);
  expect(source.subarray(36, 40).toString('ascii')).toBe('data');

  const dataBytes = source.readUInt32LE(40);
  let peak = 0;
  for (let offset = 44; offset < 44 + dataBytes; offset += 2) {
    peak = Math.max(peak, Math.abs(source.readInt16LE(offset)));
  }
  return { samples: dataBytes / 2, peak };
}

describe('original local presentation audio assets', () => {
  it('freezes exactly 3 stems, 22 core SFX and 4 stingers with ownership', () => {
    expect(PRESENTATION_AUDIO_ASSET_VERSION).toBe(1);
    expect(
      PRESENTATION_AUDIO_ASSETS.filter(({ kind }) => kind === 'stem').map(({ id }) => id),
    ).toEqual(STEM_IDS);
    expect(
      PRESENTATION_AUDIO_ASSETS.filter(({ kind }) => kind === 'sfx').map(({ id }) => id),
    ).toEqual(SFX_IDS);
    expect(
      PRESENTATION_AUDIO_ASSETS.filter(({ kind }) => kind === 'stinger').map(
        ({ id }) => id,
      ),
    ).toEqual(STINGER_IDS);
    expect(new Set(PRESENTATION_AUDIO_ASSETS.map(({ path }) => path)).size).toBe(29);

    for (const asset of PRESENTATION_AUDIO_ASSETS) {
      expect(asset).toMatchObject({
        owner: 'midnight-variety-presentation',
        source: 'deterministic-generator',
        sampleRate: 32_000,
        channels: 1,
        bitsPerSample: 16,
        format: 'wav',
        reviewed: true,
        provenancePath: '/assets/presentation/provenance/audio-generation.md',
      });
      expect(asset.path).toBe(`/assets/presentation/audio/${asset.id}.wav`);
      expect(asset.purpose.length).toBeGreaterThan(3);
      expect(asset.generatorPreset).toBe(asset.id);
      expect(asset.peakTarget).toBeGreaterThan(0.4);
      expect(asset.peakTarget).toBeLessThanOrEqual(0.82);
    }
  });

  it('ships exact PCM headers, synchronized 96-second stems and bounded peaks/sizes', async () => {
    let stemBytes = 0;
    let oneShotBytes = 0;
    let stemSamples: number | null = null;

    for (const asset of PRESENTATION_AUDIO_ASSETS) {
      const path = resolve('public', asset.path.slice(1));
      const [source, stats] = await Promise.all([readFile(path), stat(path)]);
      const inspected = inspectPcmWav(source);
      expect(inspected.peak).toBeGreaterThan(500);
      expect(inspected.peak).toBeLessThanOrEqual(30_000);
      expect(inspected.samples).toBe(Math.round(asset.durationSeconds * 32_000));

      if (asset.kind === 'stem') {
        expect(asset.durationSeconds).toBe(96);
        stemSamples ??= inspected.samples;
        expect(inspected.samples).toBe(stemSamples);
        stemBytes += stats.size;
      } else {
        expect(asset.durationSeconds).toBeGreaterThan(0.05);
        expect(asset.durationSeconds).toBeLessThanOrEqual(3);
        oneShotBytes += stats.size;
      }
    }

    expect(stemBytes).toBeLessThanOrEqual(20 * 1024 * 1024);
    expect(oneShotBytes).toBeLessThanOrEqual(3 * 1024 * 1024);
    const provenance = await readFile(
      resolve('public/assets/presentation/provenance/audio-generation.md'),
      'utf8',
    );
    expect(provenance).toContain('source: deterministic-generator');
    expect(provenance).toContain('fixed_seed: midnight-variety-audio-v1');
    expect(provenance).toContain('review_state: approved');
  });
});
