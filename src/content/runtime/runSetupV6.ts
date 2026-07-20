import { validateRunStateV6 } from '../../game-core/invariants/validateRunStateV6';
import { stableId } from '../../game-core/model/ids';
import type { JokerDefinitionV2, OwnedJokerV2 } from '../../game-core/model/runV2';
import {
  CONTENT_VERSION_V6,
  RUN_SCHEMA_VERSION_V6,
  isRunStateV6,
  type RunStateV6,
} from '../../game-core/model/runV6';
import { recordFirstAcquisitionDiscoveryV3 } from '../../game-core/rules/discoveryV3';
import { initializeAcquiredJokerTargetsV5 } from '../../game-core/effects/applyStateOperationV3';
import { runMigrationFingerprint } from '../../persistence/migrations/migrateRunV2ToV3';
import type { ProductionCatalog } from '../schema/catalog';
import { createProductionRunContent } from './productionRunContent';
import { compileRunSetupV3 } from './runSetupV3';
import { createProductionRunV5, type CreateProductionRunOptionsV5 } from './runSetupV5';

export type CreateProductionRunOptionsV6 = CreateProductionRunOptionsV5;

function ownedJoker(
  definition: JokerDefinitionV2,
  seed: string,
  index: number,
): OwnedJokerV2 {
  return {
    instanceId: stableId<'joker-instance'>(
      `joker-instance:v6:${seed}:starting:${index}:${definition.contentId}`,
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

export function createProductionRunV6(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV6,
): RunStateV6 {
  const base = createProductionRunV5(catalog, options);
  const setup = compileRunSetupV3(catalog, options);
  const productionContent = createProductionRunContent(catalog);
  const jokerDefinitions = new Map(
    productionContent.items
      .filter((item): item is JokerDefinitionV2 => item.kind === 'joker')
      .map((definition) => [definition.contentId, definition]),
  );
  const existingContentIds = new Set(
    base.inventory.jokers.map(({ contentId }) => contentId),
  );
  const newStartingJokers = setup.startingJokerIds.flatMap((contentId, index) => {
    const definition = jokerDefinitions.get(contentId);
    return definition && !existingContentIds.has(contentId)
      ? [ownedJoker(definition, options.seed, index)]
      : [];
  });
  const allJokers = [...base.inventory.jokers, ...newStartingJokers];
  const permanentStartingJokers =
    setup.rulesV3.excludedRuleKeys.includes('permanent-jokers') &&
    (setup.rulesV3.excludedRuleKeys.includes('starting') ||
      setup.rulesV3.excludedRuleKeys.includes('all-acquired'));
  const existingModifiers = new Map(
    base.modifiersV3.jokers.map((modifier) => [modifier.instanceId, modifier]),
  );
  const jokerModifiers = allJokers.map((joker) => {
    const definition = jokerDefinitions.get(joker.contentId);
    const existing = existingModifiers.get(joker.instanceId);
    if (existing) return existing;
    const permanentAllowed = definition?.stickerEligibility?.permanent !== false;
    const stickerIds =
      permanentStartingJokers && permanentAllowed ? ['bxqp:sticker:permanent'] : [];
    return {
      instanceId: joker.instanceId,
      stickerIds,
      perishableRoundsRemaining: null,
      rentalRoundCost: 0,
      saleAllowed: !stickerIds.includes('bxqp:sticker:permanent'),
      slotContribution: joker.slotContribution,
      abilityState: { ...(definition?.initialAbilityState ?? {}) },
    };
  });
  const suppliedExternalJokers = options.externalJokerDefinitions ?? [];
  const suppliedIds = new Set(suppliedExternalJokers.map(({ contentId }) => contentId));

  let run: RunStateV6 = {
    ...base,
    schemaVersion: RUN_SCHEMA_VERSION_V6,
    contentVersion: CONTENT_VERSION_V6,
    content: {
      ...base.content,
      items: [
        ...productionContent.items,
        ...suppliedExternalJokers.filter(
          ({ contentId }) => !jokerDefinitions.has(contentId),
        ),
      ],
    },
    inventory: { ...base.inventory, jokers: allJokers },
    productionContentV3: {
      contentVersion: CONTENT_VERSION_V6,
      rows: catalog.rows.map((definition) => ({
        definition,
        name: catalog.localization[definition.nameKey] as string,
        description: catalog.localization[definition.descriptionKey] as string,
      })),
      boosterProfiles: catalog.boosterProfiles,
    },
    modifiersV3: { ...base.modifiersV3, jokers: jokerModifiers },
    externalDependenciesV3: {
      ...base.externalDependenciesV3,
      resolvedIds: base.externalDependenciesV3.requiredIds.filter((id) =>
        suppliedIds.has(id),
      ),
    },
    jokerRuntimeV6: {
      castleTargetSuit: null,
      idolTargetRank: null,
      idolTargetSuit: null,
      jokerCapacityDebt: 0,
    },
    migrationV6: {
      sourceSchemaVersion: 6,
      sourceContentVersion: CONTENT_VERSION_V6,
      sourceCheckpointId: 0,
      recoveryFingerprint: runMigrationFingerprint(base),
    },
  };
  for (const joker of newStartingJokers) {
    const discovered = recordFirstAcquisitionDiscoveryV3(
      run,
      joker.contentId,
      joker.instanceId,
      0,
    );
    if (!isRunStateV6(discovered)) {
      throw new Error('生产 V6 起始奇牌发现记录降级了牌局版本');
    }
    const targeted = initializeAcquiredJokerTargetsV5(
      discovered,
      joker.instanceId,
      joker.effects,
    );
    if (!targeted.ok || !isRunStateV6(targeted.state)) {
      throw new Error(
        targeted.ok ? '生产 V6 起始奇牌目标初始化降级了牌局版本' : targeted.message,
      );
    }
    run = targeted.state;
  }
  const validation = validateRunStateV6(run);
  if (!validation.ok) {
    throw new Error(`生产 V6 牌局初始化失败：${validation.violations.join('；')}`);
  }
  return run;
}
