import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PRESENTATION_SCENE_ASSETS,
  PRESENTATION_SCENE_ASSET_VERSION,
} from '../../src/presentation/assets/presentationAssets';

const EXPECTED_SCENE_IDS = [
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

function readVp8xDimensions(source: Buffer) {
  expect(source.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(source.subarray(8, 16).toString('ascii')).toBe('WEBPVP8X');

  return {
    width: source.readUIntLE(24, 3) + 1,
    height: source.readUIntLE(27, 3) + 1,
  };
}

describe('presentation scene assets', () => {
  it('freezes the approved versioned 15-scene matrix', () => {
    expect(PRESENTATION_SCENE_ASSET_VERSION).toBe(1);
    expect(PRESENTATION_SCENE_ASSETS.map(({ id }) => id)).toEqual(EXPECTED_SCENE_IDS);
    expect(new Set(PRESENTATION_SCENE_ASSETS.map(({ path }) => path)).size).toBe(15);
    expect(
      new Set(PRESENTATION_SCENE_ASSETS.map(({ provenancePath }) => provenancePath)).size,
    ).toBe(15);

    for (const scene of PRESENTATION_SCENE_ASSETS) {
      expect(scene).toMatchObject({
        width: 1920,
        height: 1080,
        format: 'webp',
        owner: 'midnight-variety-presentation',
        source: 'openai-imagegen',
        reviewed: true,
      });
      expect(scene.path).toBe(`/assets/presentation/scenes/${scene.id}.webp`);
      expect(scene.provenancePath).toBe(`/assets/presentation/provenance/${scene.id}.md`);
      expect(scene.referencePath).toBe(
        '/assets/presentation/references/ensemble-reference.png',
      );
      expect(scene.focalPoint).toHaveLength(2);
      expect(scene.focalPoint.every((value) => value >= 0 && value <= 1)).toBe(true);
      expect(scene.safeArea).toHaveLength(4);
      expect(scene.safeArea.every((value) => value >= 0 && value <= 1)).toBe(true);
    }
  });

  it('ships valid local 1920x1080 WebPs and complete provenance within budget', async () => {
    let aggregateBytes = 0;

    for (const scene of PRESENTATION_SCENE_ASSETS) {
      const assetPath = resolve('public', scene.path.slice(1));
      const provenancePath = resolve('public', scene.provenancePath.slice(1));
      const [asset, assetStats, provenance] = await Promise.all([
        readFile(assetPath),
        stat(assetPath),
        readFile(provenancePath, 'utf8'),
      ]);

      aggregateBytes += assetStats.size;
      expect(assetStats.size).toBeLessThanOrEqual(350 * 1024);
      expect(readVp8xDimensions(asset)).toEqual({ width: 1920, height: 1080 });
      expect(provenance).toContain(`scene_id: ${scene.id}`);
      expect(provenance).toContain('review_state: approved');
      expect(provenance).toContain('source: openai-imagegen');
      expect(provenance).toContain('reference: ensemble-reference.png');
      expect(provenance).toContain('prompt:');
      expect(provenance).toContain('review_checklist:');
    }

    expect(aggregateBytes).toBeLessThanOrEqual(5 * 1024 * 1024);
  });
});
