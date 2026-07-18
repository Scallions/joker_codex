import type { RunStateV2 } from '../../game-core/model/runV2';
import {
  RUN_SCHEMA_VERSION_V3,
  isRunStateV3,
  type RunStateV3,
} from '../../game-core/model/runV3';

function fingerprint(run: RunStateV2): string {
  const text = [
    run.runId,
    run.checkpointId,
    run.seed,
    run.rngState,
    run.phase.kind,
    run.progress.ante,
    run.progress.blindPosition,
  ].join('|');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function migrateRunV2ToV3(run: RunStateV2): RunStateV3 {
  if (isRunStateV3(run)) return run;
  if (run.schemaVersion !== 2 || run.contentVersion !== 'run-economy-2') {
    throw new Error('仅支持将 run-economy-2 的 V2 牌局迁移到 V3');
  }

  return {
    ...run,
    schemaVersion: RUN_SCHEMA_VERSION_V3,
    contentVersion: 'run-economy-2',
    mode: 'migrated-run-economy',
    setupV3: {
      deckId: 'fixture:run-economy:deck:embedded',
      stakeId: 'bxqp:stake:first-bell',
      appliedStakeIds: ['bxqp:stake:first-bell'],
      challengeId: null,
      rulePatchEffectIds: [],
    },
    productionContentV3: {
      contentVersion: 'run-economy-2',
      rows: [],
      boosterProfiles: [],
    },
    rulesV3: {
      targetCurveId: 'baseline',
      anteOneThroughEightTargets: [
        300, 800, 2_000, 5_000, 11_000, 20_000, 35_000, 50_000,
      ],
      blindRewardPolicy: 'normal',
      remainingHandReward: 1,
      remainingDiscardReward: 0,
      discardCost: 0,
      priceInflationPerPurchase: 0,
      purchasesMade: 0,
      shopFamilyWeightMultipliers: {},
      playingCardsInShop: false,
      jokersInShop: true,
      bossRerollCost: null,
      bossRerollLimitPerAnte: null,
      bannedContentIds: [],
      excludedRuleKeys: [],
      stickerRuleIds: [],
    },
    modifiersV3: {
      playingCards: run.deck.cards.map((card) => ({
        cardId: card.id,
        enhancementId: card.enhancementId,
        sealId: card.sealId,
        editionId: card.editionId,
        debuffed: false,
      })),
      jokers: run.inventory.jokers.map((joker) => ({
        instanceId: joker.instanceId,
        stickerIds: [],
        perishableRoundsRemaining: null,
        rentalRoundCost: 0,
        saleAllowed: true,
        slotContribution: joker.slotContribution,
      })),
    },
    externalDependenciesV3: {
      requiredIds: [],
      resolvedIds: [],
      validationMode: 'catalog-child',
    },
    materializedChoicesV3: [],
    migrationV3: {
      sourceSchemaVersion: 2,
      sourceContentVersion: run.contentVersion,
      sourceCheckpointId: run.checkpointId,
      recoveryFingerprint: fingerprint(run),
    },
  };
}
