import type { RunPlayingCard } from '../model/runV2';
import type { RunStateV4 } from '../model/runV4';
import { resolveHandScoreV2, type ScoreResolution } from './scoreHandV2';

/**
 * Production V4 hand proposal boundary. All RNG, generated inventory, and score
 * changes are returned together; callers commit the proposal only after success.
 */
export function resolvePlayedHandV3(
  state: RunStateV4,
  cards: readonly RunPlayingCard[],
): ScoreResolution {
  return resolveHandScoreV2(state, cards);
}
