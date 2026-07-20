import type { PokerHandType } from '../poker/evaluate';
import type { CardId } from '../model/ids';

export type ScoreMetricV3 =
  'chips' | 'mult-add' | 'mult-factor' | 'score-factor' | 'money';

export type ScorePresentationCueV3 =
  | {
      readonly type: 'hand';
      readonly handType: PokerHandType;
      readonly name: string;
      readonly level: number;
      readonly baseChips: number;
      readonly baseMultiplier: number;
    }
  | {
      readonly type: 'card';
      readonly cardId: CardId;
      /** One-based pass number; values above one are retriggers. */
      readonly pass: number;
      readonly chips: number;
      readonly scoring: boolean;
    }
  | {
      readonly type: 'source';
      readonly sourceKind: 'held-card' | 'joker' | 'global';
      readonly sourceId: string;
      readonly effectId: string;
      readonly metric: ScoreMetricV3;
      readonly value: number;
      readonly repeatCount: number;
    }
  | {
      readonly type: 'total';
      readonly chips: number;
      readonly multiplier: number;
      readonly score: number;
    };

export interface ScorePresentationEvidenceV3 {
  readonly version: 1;
  readonly cues: readonly ScorePresentationCueV3[];
}
