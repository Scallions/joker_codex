import type { CardId } from '../model/ids';
import { isRunStateV3 } from '../model/runV3';
import type { RunPlayingCard, RunStateV2 } from '../model/runV2';
import { resolveEffectOperations } from '../effects/registry';

export function selectCardMapV2(state: RunStateV2): ReadonlyMap<CardId, RunPlayingCard> {
  return new Map(state.deck.cards.map((card) => [card.id, card]));
}

function cardsForIds(state: RunStateV2, ids: readonly CardId[]): RunPlayingCard[] {
  const cards = selectCardMapV2(state);
  return ids.map((id) => {
    const card = cards.get(id);
    if (!card) throw new Error(`牌区引用了不存在的卡牌：${id}`);
    return card;
  });
}

export function selectHandCardsV2(state: RunStateV2): RunPlayingCard[] {
  return state.round ? cardsForIds(state, state.round.handIds) : [];
}

export function selectDrawPileCardsV2(state: RunStateV2): RunPlayingCard[] {
  return state.round ? cardsForIds(state, state.round.drawPileIds) : [];
}

export function selectDiscardPileCardsV2(state: RunStateV2): RunPlayingCard[] {
  return state.round ? cardsForIds(state, state.round.discardPileIds) : [];
}

export function selectBossRerollCostV2(state: RunStateV2): number | null {
  if (isRunStateV3(state) && state.rulesV3.bossRerollCost !== null) {
    return state.rulesV3.bossRerollCost;
  }
  for (const voucherId of state.inventory.voucherIds) {
    const voucher = state.content.vouchers.find((entry) => entry.id === voucherId);
    for (const effect of voucher?.effects ?? []) {
      const resolved = resolveEffectOperations(effect, 'item-acquired', state);
      if (!resolved.ok) continue;
      const operation = resolved.operations.find(
        (candidate) => candidate.type === 'enable-boss-reroll',
      );
      if (operation?.type === 'enable-boss-reroll') {
        return Math.max(0, operation.cost);
      }
    }
  }
  return null;
}

const SUIT_ORDER = new Map([
  ['spades', 0],
  ['hearts', 1],
  ['clubs', 2],
  ['diamonds', 3],
]);
const RANK_ORDER = new Map([
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
  ['9', 9],
  ['10', 10],
  ['jack', 11],
  ['queen', 12],
  ['king', 13],
  ['ace', 14],
]);

export function sortCardIdsV2(
  state: RunStateV2,
  ids: readonly CardId[],
  mode: 'rank' | 'suit',
): CardId[] {
  const cards = selectCardMapV2(state);
  return [...ids].sort((leftId, rightId) => {
    const left = cards.get(leftId);
    const right = cards.get(rightId);
    if (!left || !right) return leftId.localeCompare(rightId);
    const rankDifference =
      (RANK_ORDER.get(right.rank) ?? 0) - (RANK_ORDER.get(left.rank) ?? 0);
    const suitDifference =
      (SUIT_ORDER.get(left.suit) ?? 0) - (SUIT_ORDER.get(right.suit) ?? 0);
    return mode === 'rank'
      ? rankDifference || suitDifference || left.id.localeCompare(right.id)
      : suitDifference || rankDifference || left.id.localeCompare(right.id);
  });
}
