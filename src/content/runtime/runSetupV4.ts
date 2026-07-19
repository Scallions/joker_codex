import { validateRunStateV4 } from '../../game-core/invariants/validateRunStateV4';
import { stableId } from '../../game-core/model/ids';
import type { JokerDefinitionV2, OwnedJokerV2 } from '../../game-core/model/runV2';
import {
  CONTENT_VERSION_V4,
  RUN_SCHEMA_VERSION_V4,
  isRunStateV4,
  type JokerModifierStateV4,
  type RunStateV4,
} from '../../game-core/model/runV4';
import { runMigrationFingerprint } from '../../persistence/migrations/migrateRunV2ToV3';
import type { ProductionCatalog } from '../schema/catalog';
import { createProductionRunContent } from './productionRunContent';
import { recordFirstAcquisitionDiscoveryV3 } from '../../game-core/rules/discoveryV3';
import {
  compileRunSetupV3,
  createProductionRunV3,
  type CreateProductionRunOptionsV3,
} from './runSetupV3';

export type CreateProductionRunOptionsV4 = CreateProductionRunOptionsV3;

function ownedJoker(
  definition: JokerDefinitionV2,
  seed: string,
  index: number,
): OwnedJokerV2 {
  return {
    instanceId: stableId<'joker-instance'>(
      `joker-instance:v4:${seed}:starting:${index}:${definition.contentId}`,
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
  };
}

export function createProductionRunV4(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV4,
): RunStateV4 {
  const legacyBase = createProductionRunV3(catalog, options);
  const setup = compileRunSetupV3(catalog, options);
  const productionContent = createProductionRunContent(catalog);
  const jokerDefinitions = new Map(
    productionContent.items
      .filter((item): item is JokerDefinitionV2 => item.kind === 'joker')
      .map((definition) => [definition.contentId, definition]),
  );
  const localStartingJokers = setup.startingJokerIds.flatMap((contentId, index) => {
    const definition = jokerDefinitions.get(contentId);
    return definition ? [ownedJoker(definition, options.seed, index)] : [];
  });
  const allJokers = [...legacyBase.inventory.jokers, ...localStartingJokers];
  const permanentStartingJokers =
    setup.rulesV3.excludedRuleKeys.includes('permanent-jokers') &&
    (setup.rulesV3.excludedRuleKeys.includes('starting') ||
      setup.rulesV3.excludedRuleKeys.includes('all-acquired'));
  const existingModifiers = new Map(
    legacyBase.modifiersV3.jokers.map((modifier) => [modifier.instanceId, modifier]),
  );
  const jokerModifiers: readonly JokerModifierStateV4[] = allJokers.map((joker) => {
    const definition = jokerDefinitions.get(joker.contentId);
    const existing = existingModifiers.get(joker.instanceId);
    const stickerIds =
      existing?.stickerIds ?? (permanentStartingJokers ? ['bxqp:sticker:permanent'] : []);
    return {
      instanceId: joker.instanceId,
      stickerIds,
      perishableRoundsRemaining: existing?.perishableRoundsRemaining ?? null,
      rentalRoundCost: existing?.rentalRoundCost ?? 0,
      saleAllowed:
        existing?.saleAllowed ?? !stickerIds.includes('bxqp:sticker:permanent'),
      slotContribution: joker.slotContribution,
      abilityState: { ...(definition?.initialAbilityState ?? {}) },
    };
  });
  const suppliedExternalJokers = options.externalJokerDefinitions ?? [];
  const suppliedIds = new Set(suppliedExternalJokers.map(({ contentId }) => contentId));
  const content = {
    ...legacyBase.content,
    items: [
      ...productionContent.items,
      ...suppliedExternalJokers.filter(
        ({ contentId }) => !jokerDefinitions.has(contentId),
      ),
    ],
  };
  let run: RunStateV4 = {
    ...legacyBase,
    schemaVersion: RUN_SCHEMA_VERSION_V4,
    contentVersion: CONTENT_VERSION_V4,
    content,
    inventory: { ...legacyBase.inventory, jokers: allJokers },
    productionContentV3: {
      contentVersion: CONTENT_VERSION_V4,
      rows: catalog.rows.map((definition) => ({
        definition,
        name: catalog.localization[definition.nameKey] as string,
        description: catalog.localization[definition.descriptionKey] as string,
      })),
      boosterProfiles: catalog.boosterProfiles,
    },
    modifiersV3: {
      ...legacyBase.modifiersV3,
      jokers: jokerModifiers,
    },
    externalDependenciesV3: {
      ...legacyBase.externalDependenciesV3,
      resolvedIds: legacyBase.externalDependenciesV3.requiredIds.filter((id) =>
        suppliedIds.has(id),
      ),
    },
    migrationV4: {
      sourceSchemaVersion: 4,
      sourceContentVersion: CONTENT_VERSION_V4,
      sourceCheckpointId: 0,
      recoveryFingerprint: runMigrationFingerprint(legacyBase),
    },
  };
  for (const joker of localStartingJokers) {
    const discovered = recordFirstAcquisitionDiscoveryV3(
      run,
      joker.contentId,
      joker.instanceId,
      0,
    );
    if (!isRunStateV4(discovered)) {
      throw new Error('生产 V4 起始奇牌发现记录降级了牌局版本');
    }
    run = discovered;
  }
  const validation = validateRunStateV4(run);
  if (!validation.ok) {
    throw new Error(`生产 V4 牌局初始化失败：${validation.violations.join('；')}`);
  }
  return run;
}
