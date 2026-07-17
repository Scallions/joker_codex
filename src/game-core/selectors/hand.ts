import type { RunState } from '../model/run';
import { evaluatePokerHand, type PokerHandEvaluation } from '../poker/evaluate';

export function selectHandPreview(state: RunState): PokerHandEvaluation | null {
  if (state.selectedCardIds.length === 0) return null;
  const selected = new Set(state.selectedCardIds);
  return evaluatePokerHand(state.hand.filter((card) => selected.has(card.id)));
}
