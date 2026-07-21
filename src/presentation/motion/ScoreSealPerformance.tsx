import { useEffect, useMemo, type CSSProperties } from 'react';

import { formatScore } from '../../game-core/score/score';
import type { PresentationSpeed } from '../../persistence/deviceSettings';
import {
  presentationCueDurationMs,
  type PresentationCuePayloadV1,
  type PresentationSequenceV1,
} from './presentationSequence';
import styles from './ScoreSealPerformance.module.css';

export interface ScoreSealPerformanceProps {
  readonly sequence: PresentationSequenceV1;
  readonly speed: PresentationSpeed;
  readonly paused: boolean;
  readonly onAdvance: () => void;
  readonly onFinish: () => void;
  readonly onSkip: () => void;
}

interface SealTotals {
  readonly handName: string;
  readonly chips: number;
  readonly multiplier: number;
  readonly scoreFactor: number;
  readonly score: number | null;
}

function accumulateSealTotals(
  cues: readonly PresentationSequenceV1['cues'][number][],
): SealTotals {
  let handName = '百戏报幕';
  let chips = 0;
  let multiplier = 1;
  let scoreFactor = 1;
  let score: number | null = null;

  for (const cue of cues) {
    const payload = cue.payload;
    if (payload.type === 'hand') {
      handName = payload.name;
      chips = payload.baseChips;
      multiplier = payload.baseMultiplier;
    } else if (payload.type === 'card' && payload.scoring) {
      chips += payload.chips * cue.repetitions;
    } else if (payload.type === 'source') {
      const repeats = cue.repetitions;
      if (payload.metric === 'chips') chips += payload.value * repeats;
      if (payload.metric === 'mult-add') multiplier += payload.value * repeats;
      if (payload.metric === 'mult-factor') {
        multiplier *= payload.value ** repeats;
      }
      if (payload.metric === 'score-factor') {
        scoreFactor *= payload.value ** repeats;
      }
    } else if (payload.type === 'total') {
      chips = payload.chips;
      multiplier = payload.multiplier;
      score = payload.score;
    }
  }

  return { handName, chips, multiplier, scoreFactor, score };
}

function sourceMetricLabel(
  payload: Extract<PresentationCuePayloadV1, { type: 'source' }>,
) {
  switch (payload.metric) {
    case 'chips':
      return `${payload.value >= 0 ? '+' : ''}${formatScore(payload.value)} 筹码`;
    case 'mult-add':
      return `${payload.value >= 0 ? '+' : ''}${String(payload.value)} 倍率`;
    case 'mult-factor':
      return `倍率 ×${String(payload.value)}`;
    case 'score-factor':
      return `总分 ×${String(payload.value)}`;
    case 'money':
      return `戏票 ${payload.value >= 0 ? '+' : ''}${String(payload.value)}`;
  }
}

function cueCopy(payload: PresentationCuePayloadV1): {
  readonly eyebrow: string;
  readonly heading: string;
} {
  switch (payload.type) {
    case 'hand':
      return { eyebrow: `第 ${String(payload.level)} 重`, heading: payload.name };
    case 'card':
      return {
        eyebrow: payload.pass > 1 ? `第 ${String(payload.pass)} 响 · 重演` : '牌面落印',
        heading: payload.scoring ? `+${formatScore(payload.chips)} 筹码` : '此牌未计分',
      };
    case 'source':
      return {
        eyebrow:
          payload.sourceKind === 'joker'
            ? '奇牌应声'
            : payload.sourceKind === 'held-card'
              ? '手中余韵'
              : '全场机关',
        heading: sourceMetricLabel(payload),
      };
    case 'total':
      return { eyebrow: '朱印落定', heading: '本手总分' };
    case 'overflow-summary':
      return {
        eyebrow: '百戏齐鸣',
        heading: `另有 ${String(payload.remainingCount)} 响合印`,
      };
    case 'blind-curtain':
      return { eyebrow: '新幕开场', heading: payload.name };
    case 'tag-received':
      return { eyebrow: '戏签入手', heading: payload.name };
    case 'card-selection':
      return { eyebrow: '纸牌轻响', heading: '选牌落定' };
    case 'cards-reordered':
      return {
        eyebrow: '理牌成列',
        heading: payload.mode === 'rank' ? '按点数理牌' : '按花色理牌',
      };
    case 'cards-swept':
      return {
        eyebrow: '台面一扫',
        heading: `收去 ${String(payload.cardIds.length)} 张`,
      };
    case 'blind-cleared':
      return { eyebrow: '铜锣破幕', heading: '盲注已破' };
    case 'run-failed':
      return { eyebrow: '余灯未灭', heading: '本幕暂歇' };
    case 'reward-receipt':
      return { eyebrow: '赏银入账', heading: `+${String(payload.amount)} 戏票` };
    case 'curtain-call':
      return { eyebrow: '满堂谢幕', heading: '今夜功成' };
    case 'coin-spent':
      return { eyebrow: '铜钱一响', heading: `-${String(payload.amount)} 戏票` };
    case 'coin-received':
      return { eyebrow: '彩头入袋', heading: `+${String(payload.amount)} 戏票` };
    case 'item-arrived':
      return { eyebrow: '道具入箱', heading: '新物件到手' };
  }
}

export function ScoreSealPerformance({
  sequence,
  speed,
  paused,
  onAdvance,
  onFinish,
  onSkip,
}: ScoreSealPerformanceProps) {
  const current = sequence.cues[sequence.cursor];
  const visibleCues = sequence.cues.slice(0, sequence.cursor + 1);
  const totals = useMemo(() => accumulateSealTotals(visibleCues), [visibleCues]);
  const copy = current ? cueCopy(current.payload) : null;

  useEffect(() => {
    if (!current || paused) return undefined;
    const timer = window.setTimeout(
      onAdvance,
      presentationCueDurationMs(sequence, sequence.cursor, speed),
    );
    return () => window.clearTimeout(timer);
  }, [current, onAdvance, paused, sequence, speed]);

  useEffect(() => {
    const finishWhenHidden = () => {
      if (document.visibilityState === 'hidden') onFinish();
    };
    document.addEventListener('visibilitychange', finishWhenHidden);
    return () => document.removeEventListener('visibilitychange', finishWhenHidden);
  }, [onFinish]);

  if (!current || !copy) return null;
  const primaryValue =
    current.payload.type === 'total'
      ? formatScore(current.payload.score)
      : formatScore(totals.score ?? totals.chips);
  const recentCues = visibleCues.slice(-6);
  const particleCount = Math.min(8, 3 + (sequence.cursor % 6));
  const impactKind =
    current.payload.type === 'total' || current.payload.type === 'blind-cleared'
      ? current.payload.type
      : null;

  return (
    <div
      className={styles.performance}
      data-sequence-id={sequence.sequenceId}
      data-speed={speed}
    >
      <button
        type="button"
        className={styles.seal}
        aria-label="落定演出，显示已提交结果"
        title="点击立即落定"
        onClick={onSkip}
      >
        <span className={styles.outerRing} aria-hidden="true" />
        <span className={styles.innerRing} aria-hidden="true" />
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <strong className={styles.primary}>{primaryValue}</strong>
        <span className={styles.heading}>{copy.heading}</span>
        <span className={styles.equation}>
          <b>筹码 {formatScore(totals.chips)}</b>
          <b>×{String(totals.multiplier)}</b>
        </span>
        <span className={styles.skip}>一点落定</span>
      </button>

      <div className={styles.stampRail} aria-hidden="true">
        {recentCues.map((cue) => (
          <i
            key={cue.cueId}
            className={styles.stamp}
            data-kind={cue.kind}
            style={
              {
                '--stamp-turn': `${(cue.cueId.length % 7) - 3}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: particleCount }, (_, index) => (
          <i
            key={`${current.cueId}:particle:${String(index)}`}
            style={
              {
                '--particle-index': String(index),
                '--particle-turn': `${String(index * 47)}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {impactKind ? (
        <span
          className={styles.impactRing}
          data-score-impact={impactKind}
          aria-hidden="true"
        />
      ) : null}
      <p className={styles.progress}>
        第 {String(sequence.cursor + 1)} / {String(sequence.cues.length)} 响
        {paused ? ' · 声场调校中' : ''}
      </p>
      <span className={styles.liveCopy} aria-live="polite">
        {totals.handName}，{copy.heading}
      </span>
    </div>
  );
}
