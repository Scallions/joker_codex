import { describe, expect, it } from 'vitest';

import type { PresentationEventV2 } from '../../src/game-core/commands/typesV2';
import type { CardId } from '../../src/game-core/model/ids';
import {
  planPresentationSequence,
  presentationSequenceDurationMs,
} from '../../src/presentation/motion/presentationSequence';

const cardId = 'playing:test:1' as CardId;

describe('bounded presentation sequence planner', () => {
  it('expands score evidence in exact order and coalesces only adjacent equivalents', () => {
    const events: readonly PresentationEventV2[] = [
      {
        type: 'score-performance',
        evidence: {
          version: 1,
          cues: [
            {
              type: 'hand',
              handType: 'pair',
              name: '对子',
              level: 2,
              baseChips: 25,
              baseMultiplier: 3,
            },
            { type: 'card', cardId, pass: 1, chips: 11, scoring: true },
            {
              type: 'source',
              sourceKind: 'joker',
              sourceId: 'joker:1',
              effectId: 'effect:bell',
              metric: 'mult-add',
              value: 4,
              repeatCount: 1,
            },
            {
              type: 'source',
              sourceKind: 'joker',
              sourceId: 'joker:1',
              effectId: 'effect:bell',
              metric: 'mult-add',
              value: 4,
              repeatCount: 1,
            },
            { type: 'total', chips: 47, multiplier: 11, score: 517 },
          ],
        },
      },
      { type: 'blind-cleared' },
    ];

    const sequence = planPresentationSequence({
      events,
      runId: 'run:test',
      checkpointId: 7,
    });

    expect(sequence).not.toBeNull();
    expect(sequence).toMatchObject({
      version: 1,
      sequenceId: 'run:test:7',
      checkpointId: 7,
      cursor: 0,
    });
    expect(sequence?.cues.map(({ kind }) => kind)).toEqual([
      'hand',
      'card',
      'source',
      'total',
      'blind-cleared',
    ]);
    expect(sequence?.cues[2]).toMatchObject({ repetitions: 2 });
    expect(new Set(sequence?.cues.map(({ cueId }) => cueId)).size).toBe(5);
  });

  it('bounds rendered cues at 48 plus the exact final total', () => {
    const sourceCues = Array.from({ length: 60 }, (_, index) => ({
      type: 'source' as const,
      sourceKind: 'joker' as const,
      sourceId: `joker:${index}`,
      effectId: `effect:${index}`,
      metric: 'chips' as const,
      value: index + 1,
      repeatCount: 1,
    }));
    const sequence = planPresentationSequence({
      runId: 'run:overflow',
      checkpointId: 9,
      events: [
        {
          type: 'score-performance',
          evidence: {
            version: 1,
            cues: [
              ...sourceCues,
              { type: 'total', chips: 999, multiplier: 2, score: 1998 },
            ],
          },
        },
      ],
    });

    expect(sequence?.cues).toHaveLength(49);
    expect(sequence?.cues[47]).toMatchObject({
      kind: 'overflow-summary',
      payload: { type: 'overflow-summary', remainingCount: 13 },
    });
    expect(sequence?.cues.at(-1)?.payload).toEqual({
      type: 'total',
      chips: 999,
      multiplier: 2,
      score: 1998,
    });
  });

  it('keeps all information while both timing tables stay within their budgets', () => {
    const sequence = planPresentationSequence({
      runId: 'run:timing',
      checkpointId: 3,
      events: [
        {
          type: 'score-performance',
          evidence: {
            version: 1,
            cues: [
              ...Array.from({ length: 48 }, (_, index) => ({
                type: 'card' as const,
                cardId,
                pass: index + 1,
                chips: 10,
                scoring: true,
              })),
              { type: 'total', chips: 480, multiplier: 4, score: 1920 },
            ],
          },
        },
      ],
    });
    if (!sequence) throw new Error('缺少演出序列');

    const full = presentationSequenceDurationMs(sequence, 'full');
    const brisk = presentationSequenceDurationMs(sequence, 'brisk');
    expect(full).toBeLessThanOrEqual(10_000);
    expect(brisk).toBeLessThanOrEqual(3_000);
    expect(full).toBeGreaterThan(brisk);
    expect(sequence.cues.at(-1)?.kind).toBe('total');
  });
});
