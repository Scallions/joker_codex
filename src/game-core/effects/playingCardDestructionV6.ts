import type { RunStateV2 } from '../model/runV2';
import { applyRunWindowEffectsV2, type RunWindowResolutionV2 } from './runWindowV2';
import type { CardId } from '../model/ids';
import { preparePlayingCardDestructionV6 } from './playingCardDestructionProposalV6';

export function destroyPlayingCardsV6(
  state: RunStateV2,
  cardIds: readonly CardId[],
  reason: string,
): RunWindowResolutionV2 {
  if (cardIds.length === 0) {
    return { ok: true, state, operations: [] };
  }
  const proposal = preparePlayingCardDestructionV6(state, cardIds, reason);
  if (!proposal.ok) return proposal;
  return applyRunWindowEffectsV2(proposal.state, 'playing-card-destroyed', {
    eventContext: proposal.eventContext,
  });
}
