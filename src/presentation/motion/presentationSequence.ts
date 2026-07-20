import type { PresentationEventV2 } from '../../game-core/commands/typesV2';
import type { ScorePresentationCueV3 } from '../../game-core/presentation/scoreEvidenceV3';
import type { PresentationSpeed } from '../../persistence/deviceSettings';

export interface PresentationOverflowSummaryV1 {
  readonly type: 'overflow-summary';
  readonly remainingCount: number;
}

export type PresentationCuePayloadV1 =
  | ScorePresentationCueV3
  | Exclude<PresentationEventV2, { readonly type: 'score-performance' }>
  | PresentationOverflowSummaryV1;

export interface PresentationCueV1 {
  readonly cueId: string;
  readonly kind: PresentationCuePayloadV1['type'];
  readonly payload: PresentationCuePayloadV1;
  readonly repetitions: number;
}

export interface PresentationSequenceV1 {
  readonly version: 1;
  readonly sequenceId: string;
  readonly checkpointId: number;
  readonly cues: readonly PresentationCueV1[];
  readonly cursor: number;
}

interface DraftCue {
  readonly payload: PresentationCuePayloadV1;
  readonly repetitions: number;
}

const MAX_RENDERED_CUES = 48;

function equivalenceKey(payload: PresentationCuePayloadV1): string {
  if (payload.type === 'source') return JSON.stringify({ ...payload, repeatCount: 1 });
  return JSON.stringify(payload);
}

function expandEvents(events: readonly PresentationEventV2[]): DraftCue[] {
  return events.flatMap((event): DraftCue[] => {
    if (event.type !== 'score-performance') {
      return [{ payload: event, repetitions: 1 }];
    }
    return event.evidence.cues.map((payload) => ({
      payload,
      repetitions: payload.type === 'source' ? Math.max(1, payload.repeatCount) : 1,
    }));
  });
}

function coalesceAdjacent(cues: readonly DraftCue[]): DraftCue[] {
  const output: DraftCue[] = [];
  for (const cue of cues) {
    const previous = output.at(-1);
    if (previous && equivalenceKey(previous.payload) === equivalenceKey(cue.payload)) {
      output[output.length - 1] = {
        payload: previous.payload,
        repetitions: previous.repetitions + cue.repetitions,
      };
    } else {
      output.push(cue);
    }
  }
  return output;
}

function boundCues(cues: readonly DraftCue[]): DraftCue[] {
  const finalTotalIndex = cues.reduce(
    (lastIndex, cue, index) => (cue.payload.type === 'total' ? index : lastIndex),
    -1,
  );
  const nonTotalCount = cues.length - (finalTotalIndex >= 0 ? 1 : 0);
  if (nonTotalCount <= MAX_RENDERED_CUES) return [...cues];

  const visibleNonTotalCount = MAX_RENDERED_CUES - 1;
  const omitted = cues
    .filter((_cue, index) => index !== finalTotalIndex)
    .slice(visibleNonTotalCount);
  const remainingCount = omitted.reduce((count, cue) => count + cue.repetitions, 0);
  const output: DraftCue[] = [];
  let includedNonTotals = 0;
  let summaryInserted = false;

  for (const [index, cue] of cues.entries()) {
    if (index === finalTotalIndex) {
      output.push(cue);
      continue;
    }
    if (includedNonTotals < visibleNonTotalCount) {
      output.push(cue);
      includedNonTotals += 1;
      continue;
    }
    if (!summaryInserted) {
      output.push({
        payload: { type: 'overflow-summary', remainingCount },
        repetitions: 1,
      });
      summaryInserted = true;
    }
  }

  return output;
}

export function planPresentationSequence(input: {
  readonly events: readonly PresentationEventV2[];
  readonly runId: string;
  readonly checkpointId: number;
}): PresentationSequenceV1 | null {
  const bounded = boundCues(coalesceAdjacent(expandEvents(input.events)));
  if (bounded.length === 0) return null;
  const sequenceId = `${input.runId}:${String(input.checkpointId)}`;

  return {
    version: 1,
    sequenceId,
    checkpointId: input.checkpointId,
    cursor: 0,
    cues: bounded.map((cue, index) => ({
      cueId: `${sequenceId}:cue:${String(index)}:${cue.payload.type}`,
      kind: cue.payload.type,
      payload: cue.payload,
      repetitions: cue.repetitions,
    })),
  };
}

const BASE_CUE_DURATION_MS: Readonly<
  Record<PresentationSpeed, Readonly<Record<PresentationCuePayloadV1['type'], number>>>
> = {
  full: {
    hand: 700,
    card: 330,
    source: 360,
    total: 950,
    'overflow-summary': 450,
    'blind-curtain': 520,
    'tag-received': 420,
    'card-selection': 180,
    'cards-reordered': 240,
    'cards-swept': 360,
    'blind-cleared': 650,
    'run-failed': 650,
    'reward-receipt': 520,
    'curtain-call': 700,
    'coin-spent': 260,
    'coin-received': 260,
    'item-arrived': 420,
  },
  brisk: {
    hand: 180,
    card: 90,
    source: 110,
    total: 280,
    'overflow-summary': 120,
    'blind-curtain': 170,
    'tag-received': 130,
    'card-selection': 70,
    'cards-reordered': 90,
    'cards-swept': 120,
    'blind-cleared': 180,
    'run-failed': 180,
    'reward-receipt': 160,
    'curtain-call': 200,
    'coin-spent': 90,
    'coin-received': 90,
    'item-arrived': 140,
  },
};

function isScoreSequence(sequence: PresentationSequenceV1): boolean {
  return sequence.cues.some(
    ({ kind }) =>
      kind === 'hand' || kind === 'card' || kind === 'source' || kind === 'total',
  );
}

export function presentationCueDurationMs(
  sequence: PresentationSequenceV1,
  cueIndex: number,
  speed: PresentationSpeed,
): number {
  const cue = sequence.cues[cueIndex];
  if (!cue) return 0;
  const maximum = isScoreSequence(sequence)
    ? speed === 'full'
      ? 10_000
      : 3_000
    : speed === 'full'
      ? 1_200
      : 450;
  const perCueCap = Math.floor(maximum / sequence.cues.length);
  const repetitionFactor = Math.min(1.8, 1 + (cue.repetitions - 1) * 0.12);
  return Math.max(
    16,
    Math.min(
      Math.round(BASE_CUE_DURATION_MS[speed][cue.kind] * repetitionFactor),
      perCueCap,
    ),
  );
}

export function presentationSequenceDurationMs(
  sequence: PresentationSequenceV1,
  speed: PresentationSpeed,
): number {
  return sequence.cues.reduce(
    (duration, _cue, index) =>
      duration + presentationCueDurationMs(sequence, index, speed),
    0,
  );
}
