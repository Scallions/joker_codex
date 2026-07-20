// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CardId } from '../../src/game-core/model/ids';
import { ScoreSealPerformance } from '../../src/presentation/motion/ScoreSealPerformance';
import { planPresentationSequence } from '../../src/presentation/motion/presentationSequence';

const sequence = planPresentationSequence({
  runId: 'run:seal',
  checkpointId: 4,
  events: [
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
          {
            type: 'card',
            cardId: 'playing:test:seal' as CardId,
            pass: 1,
            chips: 12,
            scoring: true,
          },
          {
            type: 'source',
            sourceKind: 'joker',
            sourceId: 'joker:seal',
            effectId: 'effect:seal',
            metric: 'mult-add',
            value: 8,
            repeatCount: 1,
          },
          { type: 'total', chips: 37, multiplier: 11, score: 407 },
        ],
      },
    },
  ],
});

if (!sequence) throw new Error('缺少测试演出');

describe('vermilion score-seal performer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders live ordered evidence and advances using the selected pacing', async () => {
    const onAdvance = vi.fn();
    render(
      <ScoreSealPerformance
        sequence={sequence}
        speed="full"
        paused={false}
        onAdvance={onAdvance}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByText('对子')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('×3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '落定演出，显示已提交结果' }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(699);
    });
    expect(onAdvance).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('lands immediately with one click and pauses its timer under the settings drawer', async () => {
    const onAdvance = vi.fn();
    const onSkip = vi.fn();
    const { rerender } = render(
      <ScoreSealPerformance
        sequence={sequence}
        speed="brisk"
        paused
        onAdvance={onAdvance}
        onFinish={vi.fn()}
        onSkip={onSkip}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(onAdvance).not.toHaveBeenCalled();

    rerender(
      <ScoreSealPerformance
        sequence={{ ...sequence, cursor: 3 }}
        speed="brisk"
        paused={false}
        onAdvance={onAdvance}
        onFinish={vi.fn()}
        onSkip={onSkip}
      />,
    );
    expect(screen.getByText('407')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '落定演出，显示已提交结果' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('finishes visual playback when the document becomes hidden', () => {
    const onFinish = vi.fn();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    render(
      <ScoreSealPerformance
        sequence={sequence}
        speed="full"
        paused={false}
        onAdvance={vi.fn()}
        onFinish={onFinish}
        onSkip={vi.fn()}
      />,
    );

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    fireEvent(document, new Event('visibilitychange'));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
