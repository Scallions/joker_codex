import { createStandardDeck } from '../model/cards';
import { stableId } from '../model/ids';
import type {
  ConsumableDefinitionV2,
  JokerDefinitionV2,
  OwnedConsumableV2,
  OwnedJokerV2,
  RunContentSnapshot,
  RunModeV2,
  RunPlayingCard,
  RunStateV2,
} from '../model/runV2';
import { CONTENT_VERSION_V2, RUN_SCHEMA_VERSION_V2 } from '../model/runV2';
import { createRandomState, type RandomState } from '../rng/random';
import { DEFAULT_HAND_LEVELS } from '../poker/evaluate';
import { materializeAnte } from './ante';

export interface CreateCampaignRunConfig {
  readonly seed: string;
  readonly content: RunContentSnapshot;
  readonly startingMoney?: number;
  readonly targetScaleBasisPoints?: number;
  readonly startingJokerContentIds?: readonly string[];
  readonly startingConsumableContentIds?: readonly string[];
  readonly startingDeck?: readonly RunPlayingCard[];
  readonly initialRngState?: RandomState;
  readonly mode?: RunModeV2;
}

function toRunCard(card: ReturnType<typeof createStandardDeck>[number]): RunPlayingCard {
  return {
    id: card.id,
    suit: card.suit,
    rank: card.rank,
    enhancementId: null,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function createOwnedJoker(
  definition: JokerDefinitionV2,
  index: number,
  production: boolean,
): OwnedJokerV2 {
  return {
    instanceId: stableId<'joker-instance'>(
      `${production ? 'bxqp' : 'fixture:run-economy'}:joker-instance:opening:${index}:${definition.contentId}`,
    ),
    contentId: definition.contentId,
    name: definition.name,
    description: definition.description,
    baseCost: definition.baseCost,
    editionCost: 0,
    editionId: null,
    effects: definition.effects,
    slotContribution: definition.slotContribution,
    sellValueOverride: null,
    debuffed: false,
    copyPolicy: definition.copyPolicy ?? 'none',
    copyTarget: definition.copyTarget ?? 'none',
  };
}

function createOwnedConsumable(
  definition: ConsumableDefinitionV2,
  index: number,
  production: boolean,
): OwnedConsumableV2 {
  return {
    instanceId: stableId<'consumable-instance'>(
      `${production ? 'bxqp' : 'fixture:run-economy'}:consumable-instance:opening:${index}:${definition.contentId}`,
    ),
    contentId: definition.contentId,
    name: definition.name,
    description: definition.description,
    baseCost: definition.baseCost,
    editionCost: 0,
    editionId: null,
    effects: definition.effects,
    targetKind: definition.targetKind,
    minimumTargets: definition.minimumTargets,
    maximumTargets: definition.maximumTargets,
    sellValueOverride: null,
  };
}

export function createCampaignRun(config: CreateCampaignRunConfig): RunStateV2 {
  if (config.seed.length < 1 || config.seed.length > 256) {
    throw new RangeError('种子长度必须在 1 到 256 个字符之间');
  }
  const startingMoney = config.startingMoney ?? 4;
  if (!Number.isSafeInteger(startingMoney))
    throw new RangeError('起始戏票必须是安全整数');
  const targetScaleBasisPoints = config.targetScaleBasisPoints ?? 10_000;
  if (!Number.isSafeInteger(targetScaleBasisPoints) || targetScaleBasisPoints <= 0) {
    throw new RangeError('目标缩放必须是正安全整数');
  }

  const jokerDefinitions = (config.startingJokerContentIds ?? []).map((contentId) => {
    const definition = config.content.items.find(
      (item): item is JokerDefinitionV2 =>
        item.kind === 'joker' && item.contentId === contentId,
    );
    if (!definition) throw new Error(`缺少起始奇牌定义：${contentId}`);
    return definition;
  });
  const consumableDefinitions = (config.startingConsumableContentIds ?? []).map(
    (contentId) => {
      const definition = config.content.items.find(
        (item): item is ConsumableDefinitionV2 =>
          item.kind === 'consumable' && item.contentId === contentId,
      );
      if (!definition) throw new Error(`缺少起始消耗牌定义：${contentId}`);
      return definition;
    },
  );

  const startingDeck = config.startingDeck ?? createStandardDeck().map(toRunCard);
  if (startingDeck.length === 0) throw new RangeError('起始牌组不能为空');
  if (new Set(startingDeck.map(({ id }) => id)).size !== startingDeck.length) {
    throw new RangeError('起始牌组实例编号不能重复');
  }
  const randomState = config.initialRngState ?? createRandomState(config.seed);
  const ante = materializeAnte(config.content, 1, randomState, [], []);
  const production = config.mode?.startsWith('production-') ?? false;

  return {
    schemaVersion: RUN_SCHEMA_VERSION_V2,
    contentVersion: CONTENT_VERSION_V2,
    runId: stableId<'run'>(`run:campaign:${config.seed}`),
    checkpointId: 0,
    mode: config.mode ?? 'fixture-campaign',
    seed: config.seed,
    rngState: ante.rngState,
    phase: { kind: 'blind-select' },
    progress: {
      ante: 1,
      blindPosition: 'small',
      campaignWon: false,
      endless: false,
      lineup: ante.lineup,
      seenNormalBossIds: ante.seenNormalBossIds,
      seenFinisherBossIds: ante.seenFinisherBossIds,
      bossRerollCount: 0,
      anteVoucherId: null,
    },
    rules: {
      handsPerRound: 4,
      discardsPerRound: 3,
      handSize: 8,
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
      targetScaleBasisPoints,
      straightSize: 5,
      flushSize: 5,
      handLevels: { ...DEFAULT_HAND_LEVELS },
    },
    content: config.content,
    deck: { cards: [...startingDeck] },
    round: null,
    inventory: {
      jokers: jokerDefinitions.map((definition, index) =>
        createOwnedJoker(definition, index, production),
      ),
      consumables: consumableDefinitions.map((definition, index) =>
        createOwnedConsumable(definition, index, production),
      ),
      voucherIds: [],
      tags: [],
    },
    economy: { money: startingMoney, pendingReward: null, claimedRewardIds: [] },
    shop: null,
    pendingChoice: null,
    history: {
      completedBlindIds: [],
      skippedBlindIds: [],
      playedCardIdsThisAnte: [],
      playedHandTypes: [],
      claimedRewardIds: [],
      effectObservations: [],
    },
    lastHand: null,
    result: null,
  };
}
