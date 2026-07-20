import { validateRunStateV5 } from '../../game-core/invariants/validateRunStateV5';
import { stableId } from '../../game-core/model/ids';
import type { JokerDefinitionV2, OwnedJokerV2 } from '../../game-core/model/runV2';
import {
  CONTENT_VERSION_V5,
  RUN_SCHEMA_VERSION_V5,
  isRunStateV5,
  type RunStateV5,
} from '../../game-core/model/runV5';
import { recordFirstAcquisitionDiscoveryV3 } from '../../game-core/rules/discoveryV3';
import { runMigrationFingerprint } from '../../persistence/migrations/migrateRunV2ToV3';
import type { ProductionCatalog } from '../schema/catalog';
import { createProductionRunContent } from './productionRunContent';
import { compileRunSetupV3 } from './runSetupV3';
import { createProductionRunV4, type CreateProductionRunOptionsV4 } from './runSetupV4';

export type CreateProductionRunOptionsV5 = CreateProductionRunOptionsV4;

function ownedJoker(
  definition: JokerDefinitionV2,
  seed: string,
  index: number,
): OwnedJokerV2 {
  return {
    instanceId: stableId<'joker-instance'>(
      `joker-instance:v5:${seed}:starting:${index}:${definition.contentId}`,
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

export function createProductionRunV5(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV5,
): RunStateV5 {
  const base = createProductionRunV4(catalog, options);
  const setup = compileRunSetupV3(catalog, options);
  const v5Rows = catalog.rows.filter(
    (row) => row.family !== 'joker' || row.ordinal <= 100,
  );
  const v5Catalog: ProductionCatalog = {
    ...catalog,
    rows: v5Rows,
    assets: catalog.assets.filter((asset) =>
      v5Rows.some((row) => row.id === asset.contentId),
    ),
    contracts: catalog.contracts.filter((record) =>
      v5Rows.some((row) => row.id === record.contentId),
    ),
  };
  const productionContent = createProductionRunContent(v5Catalog);
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

  let run: RunStateV5 = {
    ...base,
    schemaVersion: RUN_SCHEMA_VERSION_V5,
    contentVersion: CONTENT_VERSION_V5,
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
      contentVersion: CONTENT_VERSION_V5,
      rows: v5Rows.map((definition) => ({
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
    jokerRuntimeV5: {
      initialDeckSize: base.deck.cards.length,
      sharedRoundTargetRank: null,
      sharedRoundTargetSuit: null,
      bossDisabledForRound: false,
    },
    migrationV5: {
      sourceSchemaVersion: 5,
      sourceContentVersion: CONTENT_VERSION_V5,
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
    if (!isRunStateV5(discovered)) {
      throw new Error('生产 V5 起始奇牌发现记录降级了牌局版本');
    }
    run = discovered;
  }
  const validation = validateRunStateV5(run);
  if (!validation.ok) {
    throw new Error(`生产 V5 牌局初始化失败：${validation.violations.join('；')}`);
  }
  return run;
}
