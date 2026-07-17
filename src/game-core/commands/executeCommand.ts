import { stableId, type CardId } from '../model/ids';
import type { RunState } from '../model/run';
import { scoreHand } from '../rules/scoreHand';
import { createShop } from '../rules/shop';
import { sortHand } from '../rules/sortHand';
import type {
  BuyShopOfferCommand,
  CommandResult,
  DomainEvent,
  PresentationEvent,
  RejectionCode,
  ReorderJokerCommand,
  RunCommand,
  SellJokerCommand,
  SortHandCommand,
  ToggleCardCommand,
  UseConsumableCommand,
} from './types';

const MAX_SELECTED_CARDS = 5;

function reject(code: RejectionCode, message: string): CommandResult {
  return { ok: false, rejection: { code, message } };
}

function playSelected(state: RunState): CommandResult {
  if (state.phase !== 'round') return reject('illegal-phase', '当前不能出牌');
  if (state.handsRemaining <= 0) return reject('no-hands', '本回合已没有出牌次数');
  if (state.selectedCardIds.length === 0)
    return reject('empty-selection', '请先选择要打出的牌');

  const selected = new Set(state.selectedCardIds);
  const played = state.hand.filter((card) => selected.has(card.id));
  const kept = state.hand.filter((card) => !selected.has(card.id));
  const drawCount = Math.min(state.handSize - kept.length, state.drawPile.length);
  const drawn = state.drawPile.slice(0, drawCount);
  const breakdown = scoreHand(played, state.jokers);
  const roundScore = state.roundScore + breakdown.score;
  const handsRemaining = state.handsRemaining - 1;
  const won = roundScore >= state.targetScore;
  const lost = !won && handsRemaining === 0;
  const createdShop = won ? createShop(state.shopPool, state.rngState, 0) : null;
  const domainEvents: DomainEvent[] = [
    { type: 'hand-scored', score: breakdown.score, handName: breakdown.handName },
  ];
  const presentationEvents: PresentationEvent[] = [
    { type: 'hand-reveal', name: breakdown.handName },
    { type: 'score-stamp', score: breakdown.score },
  ];

  if (won) {
    domainEvents.push({ type: 'blind-won', score: roundScore });
    presentationEvents.push({ type: 'blind-cleared' });
  } else if (lost) {
    domainEvents.push({ type: 'run-lost', score: roundScore });
    presentationEvents.push({ type: 'run-failed' });
  }

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      rngState: createdShop?.rngState ?? state.rngState,
      phase: won ? 'shop' : lost ? 'lost' : 'round',
      roundScore,
      handsRemaining,
      money: won ? state.money + 5 + handsRemaining : state.money,
      drawPile: state.drawPile.slice(drawCount),
      hand: [...kept, ...drawn],
      discardPile: [...state.discardPile, ...played],
      selectedCardIds: [],
      shop: createdShop?.shop ?? null,
      lastHand: breakdown,
    },
    domainEvents,
    presentationEvents,
  };
}

function applyConsumable(state: RunState, command: UseConsumableCommand): CommandResult {
  if (state.phase !== 'round') return reject('illegal-phase', '当前不能使用消耗牌');

  const consumable = state.consumables.find(
    (item) => item.instanceId === command.consumableInstanceId,
  );
  if (!consumable) return reject('consumable-not-owned', '没有找到这张消耗牌');
  if (!state.hand.some((card) => card.id === command.cardId)) {
    return reject('card-not-in-hand', '目标牌不在当前手牌中');
  }
  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      hand: state.hand.map((card) =>
        card.id === command.cardId ? { ...card, rank: consumable.effect.rank } : card,
      ),
      consumables: state.consumables.filter(
        (item) => item.instanceId !== command.consumableInstanceId,
      ),
    },
    domainEvents: [{ type: 'card-transformed', cardId: command.cardId }],
    presentationEvents: [{ type: 'card-overprint', cardId: command.cardId }],
  };
}

function applySortHand(state: RunState, command: SortHandCommand): CommandResult {
  if (state.phase !== 'round') return reject('illegal-phase', '当前不能整理手牌');

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      sortMode: command.mode,
      hand: sortHand(state.hand, command.mode),
    },
    domainEvents: [{ type: 'hand-sorted', mode: command.mode }],
    presentationEvents: [{ type: 'cards-reordered', mode: command.mode }],
  };
}

function rerollShop(state: RunState): CommandResult {
  if (state.phase !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在商店');
  }
  if (state.money < state.shop.rerollCost) {
    return reject('insufficient-funds', '戏票不足，无法重掷商品');
  }

  const cost = state.shop.rerollCost;
  const created = createShop(state.shopPool, state.rngState, state.shop.rerollCount + 1);
  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      money: state.money - cost,
      rngState: created.rngState,
      shop: created.shop,
    },
    domainEvents: [{ type: 'shop-rerolled', cost }],
    presentationEvents: [{ type: 'coin-spent', amount: cost }],
  };
}

function buyShopOffer(state: RunState, command: BuyShopOfferCommand): CommandResult {
  if (state.phase !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在商店');
  }
  const offer = state.shop.offers.find((candidate) => candidate.id === command.offerId);
  if (!offer) return reject('offer-not-found', '商品已经不在货架上');
  if (state.money < offer.cost) return reject('insufficient-funds', '戏票不足');
  if (offer.kind === 'joker' && state.jokers.length >= 5) {
    return reject('inventory-full', '奇牌栏已满');
  }
  if (offer.kind === 'consumable' && state.consumables.length >= 2) {
    return reject('inventory-full', '消耗牌栏已满');
  }

  const instanceSuffix = `${state.checkpointId + 1}:${offer.contentId}`;
  const jokers =
    offer.kind === 'joker'
      ? [
          ...state.jokers,
          {
            instanceId: stableId<'joker-instance'>(
              `fixture:joker-instance:${instanceSuffix}`,
            ),
            contentId: offer.contentId,
            name: offer.name,
            description: offer.description,
            handMultiplier: offer.handMultiplier,
            sellPrice: offer.sellPrice,
          },
        ]
      : state.jokers;
  const consumables =
    offer.kind === 'consumable'
      ? [
          ...state.consumables,
          {
            instanceId: stableId<'consumable-instance'>(
              `fixture:consumable-instance:${instanceSuffix}`,
            ),
            contentId: offer.contentId,
            name: offer.name,
            description: offer.description,
            effect: offer.effect,
            sellPrice: offer.sellPrice,
          },
        ]
      : state.consumables;

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      money: state.money - offer.cost,
      jokers,
      consumables,
      shop: {
        ...state.shop,
        offers: state.shop.offers.filter((candidate) => candidate.id !== offer.id),
      },
    },
    domainEvents: [{ type: 'item-purchased', contentId: offer.contentId }],
    presentationEvents: [
      { type: 'coin-spent', amount: offer.cost },
      { type: 'item-arrived', contentId: offer.contentId },
    ],
  };
}

function reorderJoker(state: RunState, command: ReorderJokerCommand): CommandResult {
  if (state.phase !== 'shop') return reject('illegal-phase', '当前不能调整奇牌顺序');
  const sourceIndex = state.jokers.findIndex(
    (joker) => joker.instanceId === command.jokerInstanceId,
  );
  if (sourceIndex < 0) return reject('joker-not-owned', '没有找到这张奇牌');
  if (
    !Number.isSafeInteger(command.toIndex) ||
    command.toIndex < 0 ||
    command.toIndex >= state.jokers.length
  ) {
    return reject('invalid-order', '目标位置超出奇牌栏');
  }

  const jokers = [...state.jokers];
  const [moved] = jokers.splice(sourceIndex, 1);
  if (!moved) return reject('joker-not-owned', '没有找到这张奇牌');
  jokers.splice(command.toIndex, 0, moved);

  return {
    ok: true,
    state: { ...state, checkpointId: state.checkpointId + 1, jokers },
    domainEvents: [{ type: 'joker-reordered', instanceId: moved.instanceId }],
    presentationEvents: [{ type: 'placard-moved', instanceId: moved.instanceId }],
  };
}

function sellJoker(state: RunState, command: SellJokerCommand): CommandResult {
  if (state.phase !== 'shop') return reject('illegal-phase', '当前不能出售奇牌');
  const joker = state.jokers.find((item) => item.instanceId === command.jokerInstanceId);
  if (!joker) return reject('joker-not-owned', '没有找到这张奇牌');

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      money: state.money + joker.sellPrice,
      jokers: state.jokers.filter((item) => item.instanceId !== command.jokerInstanceId),
    },
    domainEvents: [{ type: 'joker-sold', instanceId: joker.instanceId }],
    presentationEvents: [{ type: 'coin-received', amount: joker.sellPrice }],
  };
}

function leaveShop(state: RunState): CommandResult {
  if (state.phase !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在商店');
  }

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      phase: 'won',
      shop: null,
    },
    domainEvents: [{ type: 'run-won', score: state.roundScore }],
    presentationEvents: [{ type: 'curtain-call' }],
  };
}

function toggleCard(state: RunState, command: ToggleCardCommand): CommandResult {
  if (state.phase !== 'round') return reject('illegal-phase', '当前不能选择手牌');
  if (!state.hand.some((card) => card.id === command.cardId)) {
    return reject('card-not-in-hand', '这张牌不在当前手牌中');
  }

  const alreadySelected = state.selectedCardIds.includes(command.cardId);
  if (!alreadySelected && state.selectedCardIds.length >= MAX_SELECTED_CARDS) {
    return reject('selection-limit', '一次最多选择五张牌');
  }

  const selectedCardIds: readonly CardId[] = alreadySelected
    ? state.selectedCardIds.filter((cardId) => cardId !== command.cardId)
    : [...state.selectedCardIds, command.cardId];

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      selectedCardIds,
    },
    domainEvents: [{ type: 'selection-changed', cardIds: selectedCardIds }],
    presentationEvents: [{ type: 'card-selection', cardId: command.cardId }],
  };
}

function discardSelected(state: RunState): CommandResult {
  if (state.phase !== 'round') return reject('illegal-phase', '当前不能弃牌');
  if (state.discardsRemaining <= 0) return reject('no-discards', '本回合已没有弃牌次数');
  if (state.selectedCardIds.length === 0)
    return reject('empty-selection', '请先选择要弃掉的牌');

  const selected = new Set(state.selectedCardIds);
  const discarded = state.hand.filter((card) => selected.has(card.id));
  const kept = state.hand.filter((card) => !selected.has(card.id));
  const drawCount = Math.min(state.handSize - kept.length, state.drawPile.length);
  const drawn = state.drawPile.slice(0, drawCount);

  return {
    ok: true,
    state: {
      ...state,
      checkpointId: state.checkpointId + 1,
      discardsRemaining: state.discardsRemaining - 1,
      drawPile: state.drawPile.slice(drawCount),
      hand: [...kept, ...drawn],
      discardPile: [...state.discardPile, ...discarded],
      selectedCardIds: [],
    },
    domainEvents: [
      { type: 'cards-discarded', cardIds: discarded.map((card) => card.id) },
    ],
    presentationEvents: [
      { type: 'cards-swept', cardIds: discarded.map((card) => card.id) },
    ],
  };
}

export function executeCommand(state: RunState, command: RunCommand): CommandResult {
  if (command.checkpointId !== state.checkpointId) {
    return reject('stale-checkpoint', '操作基于旧检查点，请重试');
  }

  switch (command.type) {
    case 'toggle-card':
      return toggleCard(state, command);
    case 'discard-selected':
      return discardSelected(state);
    case 'play-selected':
      return playSelected(state);
    case 'use-consumable':
      return applyConsumable(state, command);
    case 'sort-hand':
      return applySortHand(state, command);
    case 'reroll-shop':
      return rerollShop(state);
    case 'buy-shop-offer':
      return buyShopOffer(state, command);
    case 'reorder-joker':
      return reorderJoker(state, command);
    case 'sell-joker':
      return sellJoker(state, command);
    case 'leave-shop':
      return leaveShop(state);
  }
}
