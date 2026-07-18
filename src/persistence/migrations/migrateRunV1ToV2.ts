import { stableId } from '../../game-core/model/ids';
import { DEFAULT_HAND_LEVELS } from '../../game-core/poker/evaluate';
import type { PlayingCard } from '../../game-core/model/cards';
import type {
  OwnedConsumable,
  OwnedJoker,
  RunState as RunStateV1,
  ShopItemDefinition,
} from '../../game-core/model/run';
import {
  CONTENT_VERSION_V2,
  RUN_SCHEMA_VERSION_V2,
  type BlindDefinition,
  type EffectReference,
  type ItemDefinitionV2,
  type MaterializedBlind,
  type MaterializedItem,
  type OwnedConsumableV2,
  type OwnedJokerV2,
  type RunContentSnapshot,
  type RunPlayingCard,
  type RunStateV2,
  type ScoreBreakdownV2,
  type ShopCardOfferV2,
} from '../../game-core/model/runV2';

const SMALL_BLIND: BlindDefinition = {
  id: 'fixture:run-economy:blind:small',
  name: '小幕盲注',
  description: '基础目标，可跳过以领取戏签。',
  kind: 'small',
  minimumAnte: 1,
  targetMultiplier: 1,
  reward: 3,
  effects: [],
};

const BIG_BLIND: BlindDefinition = {
  id: 'fixture:run-economy:blind:big',
  name: '大幕盲注',
  description: '目标为基础分数的一点五倍。',
  kind: 'big',
  minimumAnte: 1,
  targetMultiplier: 1.5,
  reward: 4,
  effects: [],
};

const BOSS_BLIND: BlindDefinition = {
  id: 'fixture:run-economy:blind:boss',
  name: '镇场班主',
  description: '迁移试玩局所用的代表性首领盲注。',
  kind: 'boss',
  minimumAnte: 1,
  targetMultiplier: 2,
  reward: 5,
  effects: [],
};

const FINISHER_BLIND: BlindDefinition = {
  id: 'fixture:run-economy:blind:finisher',
  name: '压轴班主',
  description: '第八幕的代表性压轴盲注。',
  kind: 'finisher',
  minimumAnte: 8,
  targetMultiplier: 2,
  reward: 8,
  effects: [],
};

function materializeBlind(definition: BlindDefinition): MaterializedBlind {
  return {
    definitionId: definition.id,
    name: definition.name,
    description: definition.description,
    kind: definition.kind,
    targetMultiplier: definition.targetMultiplier,
    reward: definition.reward,
    effects: definition.effects,
  };
}

function legacyCardToV2(card: PlayingCard): RunPlayingCard {
  return {
    id: card.id,
    suit: card.suit,
    rank: card.rank,
    enhancementId:
      card.enhancement === 'none'
        ? null
        : `fixture:run-economy:enhancement:${card.enhancement}`,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function jokerEffect(
  joker: Pick<OwnedJoker, 'contentId' | 'handMultiplier'>,
): EffectReference {
  return {
    id: `${joker.contentId}:effect:hand-multiplier`,
    handlerId: 'fixture:run-economy:handler:multiply-multiplier',
    windows: ['joker-independent'],
    priority: 0,
    parameters: { factor: joker.handMultiplier },
  };
}

function consumableEffect(
  consumable: Pick<OwnedConsumable, 'contentId' | 'effect'>,
): EffectReference {
  return {
    id: `${consumable.contentId}:effect:set-rank`,
    handlerId: 'fixture:run-economy:handler:set-rank',
    windows: ['item-acquired'],
    priority: 0,
    parameters: { rank: consumable.effect.rank },
  };
}

function legacyJokerToV2(joker: OwnedJoker): OwnedJokerV2 {
  return {
    instanceId: joker.instanceId,
    contentId: joker.contentId,
    name: joker.name,
    description: joker.description,
    baseCost: Math.max(1, joker.sellPrice * 2),
    editionCost: 0,
    editionId: null,
    effects: [jokerEffect(joker)],
    slotContribution: 1,
    sellValueOverride: joker.sellPrice,
    debuffed: false,
  };
}

function legacyConsumableToV2(consumable: OwnedConsumable): OwnedConsumableV2 {
  return {
    instanceId: consumable.instanceId,
    contentId: consumable.contentId,
    name: consumable.name,
    description: consumable.description,
    baseCost: Math.max(1, consumable.sellPrice * 2),
    editionCost: 0,
    editionId: null,
    effects: [consumableEffect(consumable)],
    targetKind: 'playing-card',
    minimumTargets: 1,
    maximumTargets: 1,
    sellValueOverride: consumable.sellPrice,
  };
}

function legacyShopDefinitionToV2(definition: ShopItemDefinition): ItemDefinitionV2 {
  if (definition.kind === 'joker') {
    return {
      kind: 'joker',
      contentId: definition.contentId,
      name: definition.name,
      description: definition.description,
      baseCost: definition.cost,
      weightUnits: 20,
      effects: [jokerEffect(definition)],
      targetKind: 'none',
      minimumTargets: 0,
      maximumTargets: 0,
      rarity: 'common',
      slotContribution: 1,
    };
  }

  return {
    kind: 'consumable',
    contentId: definition.contentId,
    name: definition.name,
    description: definition.description,
    baseCost: definition.cost,
    weightUnits: 4,
    effects: [consumableEffect(definition)],
    targetKind: 'playing-card',
    minimumTargets: 1,
    maximumTargets: 1,
    family: 'fixture',
  };
}

function definitionToMaterializedItem(definition: ShopItemDefinition): MaterializedItem {
  const migrated = legacyShopDefinitionToV2(definition);
  return {
    contentId: migrated.contentId,
    kind: migrated.kind,
    name: migrated.name,
    description: migrated.description,
    baseCost: migrated.baseCost,
    editionCost: 0,
    editionId: null,
    effects: migrated.effects,
    targetKind: migrated.targetKind,
    minimumTargets: migrated.minimumTargets,
    maximumTargets: migrated.maximumTargets,
    slotContribution: migrated.kind === 'joker' ? migrated.slotContribution : 1,
    generatedCard: null,
  };
}

function contentSnapshot(state: RunStateV1): RunContentSnapshot {
  return {
    blinds: [SMALL_BLIND, BIG_BLIND, BOSS_BLIND, FINISHER_BLIND],
    tags: [
      {
        id: 'fixture:run-economy:tag:small',
        name: '小幕戏签',
        description: '迁移占位戏签。',
        effects: [],
      },
      {
        id: 'fixture:run-economy:tag:big',
        name: '大幕戏签',
        description: '迁移占位戏签。',
        effects: [],
      },
    ],
    vouchers: [],
    items: state.shopPool.map(legacyShopDefinitionToV2),
    packs: [],
  };
}

function migratedPhase(state: RunStateV1): RunStateV2['phase'] {
  switch (state.phase) {
    case 'round':
      return { kind: 'round' };
    case 'shop':
      return { kind: 'shop' };
    case 'won':
      return { kind: 'finished' };
    case 'lost':
      return { kind: 'run-lost' };
  }
}

function migratedLastHand(state: RunStateV1): ScoreBreakdownV2 | null {
  if (!state.lastHand) return null;
  return {
    ...state.lastHand,
    handLevel: 1,
    trace: [],
  };
}

function migratedShop(state: RunStateV1): RunStateV2['shop'] {
  if (!state.shop) return null;
  const cardOffers: ShopCardOfferV2[] = state.shop.offers.map((offer) => ({
    id: offer.id,
    item: definitionToMaterializedItem(offer),
    price: offer.cost,
  }));
  return {
    id: stableId<'shop'>(`fixture:migrated-shop:${state.runId}:${state.checkpointId}`),
    ante: 1,
    afterBlind: 'small',
    cardOffers,
    packOffers: [],
    voucherOffer: null,
    rerollCount: state.shop.rerollCount,
    rerollCost: state.shop.rerollCost,
    purchasedOfferIds: [],
    freeRerollAvailable: false,
  };
}

export function migrateRunV1ToV2(state: RunStateV1): RunStateV2 {
  const cards = [...state.drawPile, ...state.hand, ...state.discardPile].map(
    legacyCardToV2,
  );
  const blind = materializeBlind(SMALL_BLIND);
  const lastHand = migratedLastHand(state);

  return {
    schemaVersion: RUN_SCHEMA_VERSION_V2,
    contentVersion: CONTENT_VERSION_V2,
    runId: state.runId,
    checkpointId: state.checkpointId,
    mode: 'migrated-foundation',
    seed: state.seed,
    rngState: state.rngState,
    phase: migratedPhase(state),
    progress: {
      ante: 1,
      blindPosition: 'small',
      campaignWon: state.phase === 'won',
      endless: false,
      lineup: {
        smallTagId: 'fixture:run-economy:tag:small',
        bigTagId: 'fixture:run-economy:tag:big',
        boss: materializeBlind(BOSS_BLIND),
      },
      seenNormalBossIds: [],
      seenFinisherBossIds: [],
      bossRerollCount: 0,
      anteVoucherId: null,
    },
    rules: {
      handsPerRound: 4,
      discardsPerRound: 3,
      handSize: state.handSize,
      maximumSelectedCards: 5,
      jokerSlots: 5,
      consumableSlots: 2,
      interestStep: 5,
      interestRate: 1,
      interestCap: 5,
      allowedDebt: 0,
      cardOfferSlots: 2,
      packOfferSlots: 2,
      baseRerollCost: 5,
      priceDiscountBasisPoints: 10_000,
      targetScaleBasisPoints: 10_000,
      straightSize: 5,
      flushSize: 5,
      handLevels: { ...DEFAULT_HAND_LEVELS },
    },
    content: contentSnapshot(state),
    deck: { cards },
    round: {
      blind,
      targetScore: state.targetScore,
      score: state.roundScore,
      handsRemaining: state.handsRemaining,
      discardsRemaining: state.discardsRemaining,
      drawPileIds: state.drawPile.map((card) => card.id),
      handIds: state.hand.map((card) => card.id),
      playedIds: [],
      discardPileIds: state.discardPile.map((card) => card.id),
      selectedCardIds: state.selectedCardIds,
      forcedSelectedCardIds: [],
      faceDownCardIds: [],
      sortMode: state.sortMode,
      handsPlayed: 4 - state.handsRemaining,
      discardsUsed: 3 - state.discardsRemaining,
      lastHandType: lastHand?.handType ?? null,
    },
    inventory: {
      jokers: state.jokers.map(legacyJokerToV2),
      consumables: state.consumables.map(legacyConsumableToV2),
      voucherIds: [],
      tags: [],
    },
    economy: {
      money: state.money,
      pendingReward: null,
      claimedRewardIds: [],
    },
    shop: migratedShop(state),
    pendingChoice: null,
    history: {
      completedBlindIds:
        state.phase === 'shop' || state.phase === 'won' ? [blind.definitionId] : [],
      skippedBlindIds: [],
      playedCardIdsThisAnte: state.discardPile.map((card) => card.id),
      playedHandTypes: lastHand ? [lastHand.handType] : [],
      claimedRewardIds: [],
      effectObservations: [],
    },
    lastHand,
    result:
      state.phase === 'won'
        ? {
            kind: 'won',
            ante: 1,
            score: state.roundScore,
            reason: '迁移自已完成的试玩局',
          }
        : state.phase === 'lost'
          ? {
              kind: 'lost',
              ante: 1,
              score: state.roundScore,
              reason: '迁移自已失败的试玩局',
            }
          : null,
  };
}
