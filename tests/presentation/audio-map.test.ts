import { describe, expect, it } from 'vitest';

import type { CardId } from '../../src/game-core/model/ids';
import type { ProgressionNotice } from '../../src/progression/model';
import {
  PRESENTATION_AUDIO_BY_ID,
  PRESENTATION_SCENE_IDS,
} from '../../src/presentation/assets/presentationAssets';
import {
  audioIdForCue,
  audioIdForProgressionNotice,
  sceneMixFor,
} from '../../src/presentation/audio/audioMap';
import type { PresentationCueV1 } from '../../src/presentation/motion/presentationSequence';

function cue(payload: PresentationCueV1['payload']): PresentationCueV1 {
  return {
    cueId: `test:${payload.type}`,
    kind: payload.type,
    payload,
    repetitions: 1,
  };
}

describe('presentation audio mapping', () => {
  it('owns one bounded mix for every scene', () => {
    for (const sceneId of PRESENTATION_SCENE_IDS) {
      const mix = sceneMixFor(sceneId);
      expect(Object.keys(mix)).toEqual(['atmosphere', 'percussion', 'color']);
      expect(Object.values(mix).every((value) => value >= 0 && value <= 1)).toBe(true);
    }
  });

  it('maps every closed cue family to an owned local sound', () => {
    const cues = [
      cue({
        type: 'hand',
        handType: 'pair',
        name: '对子',
        level: 1,
        baseChips: 10,
        baseMultiplier: 2,
      }),
      cue({
        type: 'card',
        cardId: 'playing:test' as CardId,
        pass: 1,
        chips: 10,
        scoring: true,
      }),
      cue({
        type: 'source',
        sourceKind: 'joker',
        sourceId: 'joker:test',
        effectId: 'effect:test',
        metric: 'mult-factor',
        value: 2,
        repeatCount: 1,
      }),
      cue({ type: 'total', chips: 20, multiplier: 4, score: 80 }),
      cue({ type: 'overflow-summary', remainingCount: 8 }),
      cue({ type: 'blind-curtain', name: '小幕' }),
      cue({ type: 'tag-received', name: '戏签' }),
      cue({ type: 'card-selection', cardId: 'playing:test' as CardId }),
      cue({ type: 'cards-reordered', mode: 'rank' }),
      cue({ type: 'cards-swept', cardIds: ['playing:test' as CardId] }),
      cue({ type: 'blind-cleared' }),
      cue({ type: 'run-failed' }),
      cue({ type: 'reward-receipt', amount: 8 }),
      cue({ type: 'curtain-call' }),
      cue({ type: 'coin-spent', amount: 4 }),
      cue({ type: 'coin-received', amount: 4 }),
      cue({ type: 'item-arrived', contentId: 'bxqp:joker:001' }),
    ];

    for (const presentationCue of cues) {
      const audioId = audioIdForCue(presentationCue);
      expect(PRESENTATION_AUDIO_BY_ID[audioId]).toBeDefined();
    }
  });

  it('maps all progression notice kinds without using content text', () => {
    for (const kind of ['unlock', 'discovery', 'achievement', 'victory-mark'] as const) {
      const notice: ProgressionNotice = {
        noticeId: `notice:${kind}`,
        kind,
        title: '任意标题',
        detail: '任意说明',
        createdAtEpochMs: 1,
      };
      expect(PRESENTATION_AUDIO_BY_ID[audioIdForProgressionNotice(notice)]).toBeDefined();
    }
  });
});
