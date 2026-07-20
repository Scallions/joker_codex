import type { DomainEventV2 } from '../game-core/commands/typesV2';
import type { RunId } from '../game-core/model/ids';
import type { ItemDefinitionV2 } from '../game-core/model/runV2';
import type { RunClassV7, RunStateV7 } from '../game-core/model/runV7';
import type { PokerHandType } from '../game-core/poker/evaluate';
import { JOKER_DISCOVERY_OBSERVATION_KEY } from '../game-core/rules/discoveryV3';

export type ProgressionFact =
  | {
      readonly type: 'hand-scored';
      readonly handType: PokerHandType;
      readonly score: number;
    }
  | { readonly type: 'cards-played'; readonly count: number }
  | { readonly type: 'cards-discarded'; readonly count: number }
  | {
      readonly type: 'blind-won';
      readonly blindId: string;
      readonly handsPlayed: number;
      readonly discardsUsed: number;
      readonly jokerCapacityOccupied: boolean;
    }
  | { readonly type: 'blind-skipped'; readonly blindId: string }
  | {
      readonly type: 'reward-claimed';
      readonly amount: number;
      readonly interestAmount: number;
    }
  | {
      readonly type: 'item-acquired';
      readonly contentId: string;
      readonly kind: ItemDefinitionV2['kind'];
      readonly editionId: string | null;
    }
  | {
      readonly type: 'item-purchased';
      readonly contentId: string;
      readonly kind: ItemDefinitionV2['kind'];
      readonly price: number;
    }
  | {
      readonly type: 'item-sold';
      readonly contentId: string;
      readonly amount: number;
    }
  | {
      readonly type: 'consumable-used';
      readonly contentId: string;
      readonly family: 'tarot' | 'planet' | 'spectral' | 'fixture';
    }
  | {
      readonly type: 'voucher-redeemed';
      readonly voucherId: string;
      readonly price: number;
    }
  | { readonly type: 'shop-rerolled'; readonly cost: number }
  | { readonly type: 'boss-rerolled'; readonly cost: number }
  | { readonly type: 'pack-opened'; readonly packId: string; readonly price: number }
  | { readonly type: 'joker-discovered'; readonly contentId: string }
  | { readonly type: 'money-held'; readonly amount: number }
  | { readonly type: 'endless-entered'; readonly ante: number }
  | { readonly type: 'endless-ante-reached'; readonly ante: number }
  | {
      readonly type: 'run-won';
      readonly deckId: string;
      readonly stakeId: string;
      readonly stakeOrdinal: number;
      readonly moneyHeld: number;
      readonly printedRanks: readonly string[];
      readonly printedSuits: readonly string[];
      readonly ownedJokerContentIds: readonly string[];
    }
  | {
      readonly type: 'run-lost';
      readonly ante: number;
      readonly challengeId: string | null;
    }
  | { readonly type: 'run-finished'; readonly ante: number }
  | { readonly type: 'challenge-completed'; readonly challengeId: string }
  | { readonly type: 'tutorial-step-completed'; readonly stepId: string }
  | { readonly type: 'tutorial-completed' }
  | { readonly type: 'tutorial-skipped' };

export interface ProgressionFactBatch {
  readonly runId: RunId;
  readonly checkpointId: number;
  readonly runClass: RunClassV7;
  readonly profileId: RunStateV7['sessionV7']['profileId'];
  readonly facts: readonly ProgressionFact[];
}

function itemDefinition(
  run: RunStateV7,
  contentId: string,
): ItemDefinitionV2 | undefined {
  return run.content.items.find((item) => item.contentId === contentId);
}

function packPurchasePrice(run: RunStateV7, packId: string): number {
  return run.shop?.packOffers.find((offer) => offer.packId === packId)?.price ?? 0;
}

function voucherPurchasePrice(run: RunStateV7, voucherId: string): number {
  const offers = [
    ...(run.shop?.voucherOffer ? [run.shop.voucherOffer] : []),
    ...(run.shop?.extraVoucherOffers ?? []),
  ];
  return offers.find((offer) => offer.voucherId === voucherId)?.price ?? 0;
}

function stakeOrdinal(run: RunStateV7): number {
  const row = run.productionContentV3.rows.find(
    ({ definition }) => definition.id === run.setupV3.stakeId,
  )?.definition;
  if (row?.family !== 'stake' || row.ordinal < 1 || row.ordinal > 8) {
    throw new Error(`牌局筹码等级无效：${run.setupV3.stakeId}`);
  }
  return row.ordinal;
}

function acquiredItemFacts(
  before: RunStateV7,
  after: RunStateV7,
): readonly ProgressionFact[] {
  const facts: ProgressionFact[] = [];
  const beforeJokers = new Set(
    before.inventory.jokers.map(({ instanceId }) => instanceId),
  );
  for (const joker of after.inventory.jokers) {
    if (!beforeJokers.has(joker.instanceId)) {
      facts.push({
        type: 'item-acquired',
        contentId: joker.contentId,
        kind: 'joker',
        editionId: joker.editionId,
      });
    }
  }
  const beforeConsumables = new Set(
    before.inventory.consumables.map(({ instanceId }) => instanceId),
  );
  for (const consumable of after.inventory.consumables) {
    if (!beforeConsumables.has(consumable.instanceId)) {
      facts.push({
        type: 'item-acquired',
        contentId: consumable.contentId,
        kind: 'consumable',
        editionId: consumable.editionId,
      });
    }
  }
  const beforeCards = new Set(before.deck.cards.map(({ id }) => id));
  for (const card of after.deck.cards) {
    if (!beforeCards.has(card.id)) {
      facts.push({
        type: 'item-acquired',
        contentId: card.id,
        kind: 'playing-card',
        editionId: card.editionId,
      });
    }
  }
  return facts;
}

function discoveryFacts(
  before: RunStateV7,
  after: RunStateV7,
): readonly ProgressionFact[] {
  const existing = new Set(
    before.history.effectObservations
      .filter(({ key }) => key === JOKER_DISCOVERY_OBSERVATION_KEY)
      .map(({ value }) => value),
  );
  return after.history.effectObservations.flatMap((observation) =>
    observation.key === JOKER_DISCOVERY_OBSERVATION_KEY &&
    typeof observation.value === 'string' &&
    !existing.has(observation.value)
      ? [{ type: 'joker-discovered' as const, contentId: observation.value }]
      : [],
  );
}

function eventFacts(
  before: RunStateV7,
  after: RunStateV7,
  domainEvents: readonly DomainEventV2[],
): readonly ProgressionFact[] {
  const facts: ProgressionFact[] = [];
  for (const event of domainEvents) {
    switch (event.type) {
      case 'hand-scored': {
        if (!after.lastHand) throw new Error('出牌事实缺少结算明细');
        facts.push({
          type: 'hand-scored',
          handType: after.lastHand.handType,
          score: after.lastHand.score,
        });
        facts.push({ type: 'cards-played', count: after.lastHand.playedCardIds.length });
        break;
      }
      case 'cards-discarded':
        facts.push({ type: 'cards-discarded', count: event.cardIds.length });
        break;
      case 'blind-won': {
        const round = after.round ?? before.round;
        if (!round) throw new Error('盲注胜利事实缺少回合状态');
        const usedSlots = after.inventory.jokers.reduce(
          (total, joker) => total + joker.slotContribution,
          0,
        );
        facts.push({
          type: 'blind-won',
          blindId: event.blindId,
          handsPlayed: round.handsPlayed,
          discardsUsed: round.discardsUsed,
          jokerCapacityOccupied: usedSlots >= after.rules.jokerSlots,
        });
        break;
      }
      case 'blind-skipped':
        facts.push({ type: 'blind-skipped', blindId: event.blindId });
        break;
      case 'reward-claimed':
        facts.push({
          type: 'reward-claimed',
          amount: event.amount,
          interestAmount: before.economy.pendingReward?.interestReward ?? 0,
        });
        break;
      case 'item-purchased': {
        const remainingOfferIds = new Set(
          after.shop?.cardOffers.map(({ id }) => id) ?? [],
        );
        const offer = before.shop?.cardOffers.find(
          ({ id, item }) =>
            item.contentId === event.contentId && !remainingOfferIds.has(id),
        );
        if (!offer) break;
        facts.push({
          type: 'item-purchased',
          contentId: event.contentId,
          kind: offer.item.kind,
          price: offer.price,
        });
        break;
      }
      case 'item-sold':
        facts.push({
          type: 'item-sold',
          contentId: event.contentId,
          amount: Math.max(0, after.economy.money - before.economy.money),
        });
        break;
      case 'item-consumed': {
        const definition = itemDefinition(before, event.contentId);
        if (definition?.kind !== 'consumable') {
          throw new Error(`消耗事实缺少内容定义：${event.contentId}`);
        }
        facts.push({
          type: 'consumable-used',
          contentId: event.contentId,
          family: definition.family,
        });
        break;
      }
      case 'voucher-redeemed':
        facts.push({
          type: 'voucher-redeemed',
          voucherId: event.voucherId,
          price: voucherPurchasePrice(before, event.voucherId),
        });
        break;
      case 'shop-rerolled':
        facts.push({ type: 'shop-rerolled', cost: event.cost });
        break;
      case 'boss-rerolled':
        facts.push({ type: 'boss-rerolled', cost: event.cost });
        break;
      case 'pack-opened':
        facts.push({
          type: 'pack-opened',
          packId: event.packId,
          price: packPurchasePrice(before, event.packId),
        });
        break;
      case 'endless-entered':
        facts.push({ type: 'endless-entered', ante: event.ante });
        break;
      case 'run-won':
        if (after.sessionV7.runClass === 'challenge') {
          if (!after.setupV3.challengeId) throw new Error('挑战胜利缺少挑战编号');
          facts.push({
            type: 'challenge-completed',
            challengeId: after.setupV3.challengeId,
          });
        } else {
          facts.push({
            type: 'run-won',
            deckId: after.setupV3.deckId,
            stakeId: after.setupV3.stakeId,
            stakeOrdinal: stakeOrdinal(after),
            moneyHeld: after.economy.money,
            printedRanks: [...new Set(after.deck.cards.map(({ rank }) => rank))].sort(),
            printedSuits: [...new Set(after.deck.cards.map(({ suit }) => suit))].sort(),
            ownedJokerContentIds: [
              ...new Set(after.inventory.jokers.map(({ contentId }) => contentId)),
            ].sort(),
          });
        }
        break;
      case 'run-lost':
        facts.push({
          type: 'run-lost',
          ante: event.ante,
          challengeId:
            after.sessionV7.runClass === 'challenge' ? after.setupV3.challengeId : null,
        });
        break;
      case 'run-finished':
        facts.push({ type: 'run-finished', ante: event.ante });
        break;
      case 'shop-left':
        if (after.progress.endless) {
          facts.push({ type: 'endless-ante-reached', ante: after.progress.ante });
        }
        break;
      case 'blind-selected':
      case 'selection-changed':
      case 'hand-sorted':
      case 'choice-opened':
      case 'choice-cancelled':
      case 'pack-skipped':
        break;
    }
  }
  return facts;
}

export function deriveProgressionFacts(
  before: RunStateV7,
  after: RunStateV7,
  domainEvents: readonly DomainEventV2[],
): ProgressionFactBatch {
  if (before.runId !== after.runId) throw new Error('进度事实不能跨牌局派生');
  if (after.checkpointId <= before.checkpointId) {
    throw new Error('进度事实要求递增的检查点');
  }
  if (
    before.sessionV7.runClass !== after.sessionV7.runClass ||
    before.sessionV7.profileId !== after.sessionV7.profileId
  ) {
    throw new Error('进度事实的牌局归属发生变化');
  }

  return {
    runId: after.runId,
    checkpointId: after.checkpointId,
    runClass: after.sessionV7.runClass,
    profileId: after.sessionV7.profileId,
    facts: [
      ...eventFacts(before, after, domainEvents),
      ...acquiredItemFacts(before, after),
      ...discoveryFacts(before, after),
      { type: 'money-held', amount: after.economy.money },
    ],
  };
}
