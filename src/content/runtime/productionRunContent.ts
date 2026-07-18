import type {
  BlindDefinition,
  ConsumableDefinitionV2,
  EffectParameterValue,
  EffectReference,
  EffectWindow,
  PackDefinition,
  PackFamily,
  RunContentSnapshot,
  TagDefinition,
  TargetKind,
  VoucherDefinition,
} from '../../game-core/model/runV2';
import type {
  BoosterProfile,
  CatalogOperation,
  CatalogRow,
  ProductionCatalog,
} from '../schema/catalog';

function text(catalog: ProductionCatalog, key: string): string {
  const value = catalog.localization[key];
  if (!value) throw new Error(`缺少生产目录文本：${key}`);
  return value;
}

function operationParameters(
  operation: CatalogOperation,
): Readonly<Record<string, EffectParameterValue>> {
  switch (operation.type) {
    case 'baseline':
      return { key: operation.key };
    case 'rule-patch':
      return { key: operation.key, mode: operation.mode, value: operation.value };
    case 'deck-recipe':
      return { recipe: operation.recipe, count: operation.count };
    case 'target-curve':
      return {
        curveId: operation.curveId,
        anteOneThroughEight: operation.anteOneThroughEight.join(','),
      };
    case 'sticker-roll':
      return {
        stickerId: operation.stickerId,
        numerator: operation.numerator,
        denominator: operation.denominator,
        purchaseCost: operation.purchaseCost,
        roundCost: operation.roundCost,
        expiryRounds: operation.expiryRounds,
      };
    case 'card-modifier':
      return {
        family: operation.family,
        modifierId: operation.modifierId,
        selection: operation.selection,
        count: operation.count,
        ...(operation.numerator === undefined ? {} : { numerator: operation.numerator }),
        ...(operation.denominator === undefined
          ? {}
          : { denominator: operation.denominator }),
      };
    case 'card-transform':
      return {
        field: operation.field,
        value: operation.value,
        selection: operation.selection,
        count: operation.count,
      };
    case 'card-destroy':
      return {
        selection: operation.selection,
        count: operation.count,
        destructibleOnly: operation.destructibleOnly,
      };
    case 'card-copy':
      return {
        source: operation.source,
        destination: operation.destination,
        count: operation.count,
      };
    case 'playing-card-create':
      return {
        count: operation.count,
        rankPool: operation.rankPool,
        enhancementPolicy: operation.enhancementPolicy,
      };
    case 'content-create':
      return {
        family: operation.family,
        count: operation.count,
        rarity: operation.rarity,
        capacityRequired: operation.capacityRequired,
        stickerPolicy: operation.stickerPolicy,
      };
    case 'money':
      return {
        mode: operation.mode,
        amount: operation.amount,
        cap: operation.cap,
        historyKey: operation.historyKey,
      };
    case 'hand-level':
      return {
        hand: operation.hand,
        levels: operation.levels,
        chips: operation.chips,
        mult: operation.mult,
      };
    case 'score-rule':
      return {
        key: operation.key,
        amount: operation.amount,
        numerator: operation.numerator,
        denominator: operation.denominator,
      };
    case 'shop-rule':
      return { key: operation.key, value: operation.value };
    case 'pack-rule':
      return {
        profileId: operation.profileId,
        optionCount: operation.optionCount,
        pickCount: operation.pickCount,
        temporarySlots: operation.temporarySlots,
        rareReplacementBasisPoints: operation.rareReplacementBasisPoints,
      };
    case 'blind-rule':
      return { key: operation.key, value: operation.value };
    case 'tag-rule':
      return { timing: operation.timing, key: operation.key, value: operation.value };
    case 'restriction':
      return { key: operation.key, values: operation.values.join('|') };
  }
}

function blindWindows(operation: CatalogOperation): readonly EffectWindow[] {
  if (operation.type === 'card-transform' && operation.field === 'face-down') {
    return ['round-start', 'after-hand', 'discard'];
  }
  if (operation.type === 'card-transform' || operation.type === 'score-rule') {
    return ['before-hand'];
  }
  if (operation.type !== 'blind-rule') return ['round-start'];
  if (
    operation.key === 'require-play-count' ||
    operation.key === 'hand-type-no-repeat' ||
    operation.key === 'first-hand-type-only'
  ) {
    return ['before-hand'];
  }
  if (
    operation.key === 'money-reset-on-most-played' ||
    operation.key === 'draw-replacements-face-down' ||
    operation.key === 'random-held-discard' ||
    operation.key === 'played-card-cost'
  ) {
    return ['after-hand'];
  }
  if (operation.key === 'draw-exactly') {
    return ['after-hand', 'discard'];
  }
  if (operation.key === 'random-draw-face-down') {
    return ['round-start', 'after-hand', 'discard'];
  }
  if (operation.key === 'force-selected-card') {
    return ['round-start', 'after-hand', 'discard'];
  }
  if (operation.key === 'disable-random-joker') {
    return ['round-start', 'after-hand'];
  }
  return ['round-start'];
}

function tagWindows(operation: CatalogOperation): readonly EffectWindow[] {
  if (operation.type !== 'tag-rule') return ['blind-skipped'];
  switch (operation.timing) {
    case 'immediate':
      return ['blind-skipped'];
    case 'next-shop':
      return ['shop-entered'];
    case 'next-round':
      return ['round-start'];
    case 'next-boss':
      return ['ante-ended'];
  }
}

function operationWindows(
  row: CatalogRow,
  operation: CatalogOperation,
): readonly EffectWindow[] {
  if (row.family === 'blind') return blindWindows(operation);
  if (row.family === 'tag') return tagWindows(operation);
  if (
    row.family === 'voucher' &&
    operation.type === 'baseline' &&
    operation.key === 'held-matching-planet-multiplies-1.5'
  ) {
    return ['before-hand'];
  }
  if (row.family === 'voucher' || ['tarot', 'planet', 'spectral'].includes(row.family)) {
    return ['item-acquired'];
  }
  if (row.family === 'booster') return ['pack-opened'];
  const trigger = row.effects[0]?.trigger;
  return trigger &&
    trigger !== 'run-setup' &&
    trigger !== 'consumable-used' &&
    trigger !== 'passive'
    ? [trigger]
    : ['item-acquired'];
}

function runtimeEffects(row: CatalogRow): readonly EffectReference[] {
  return row.effects.flatMap((effect) =>
    effect.operations.map((operation, index) => ({
      id: `${effect.id}:operation:${index}`,
      handlerId: `bxqp:handler:${operation.type}`,
      windows: operationWindows(row, operation),
      priority: effect.priority + index,
      parameters: operationParameters(operation),
    })),
  );
}

function blind(row: CatalogRow, catalog: ProductionCatalog): BlindDefinition {
  const targetOperation = row.effects
    .flatMap((effect) => effect.operations)
    .find(
      (operation) =>
        operation.type === 'blind-rule' && operation.key === 'target-multiplier',
    );
  const targetMultiplier =
    targetOperation?.type === 'blind-rule' && typeof targetOperation.value === 'number'
      ? targetOperation.value
      : 2;
  const minimumAnte =
    row.availability.kind === 'minimum-ante' ? row.availability.value : 1;
  const kind =
    row.ordinal === 1
      ? ('small' as const)
      : row.ordinal === 2
        ? ('big' as const)
        : row.ordinal >= 26
          ? ('finisher' as const)
          : ('boss' as const);
  return {
    id: row.id,
    name: text(catalog, row.nameKey),
    description: text(catalog, row.descriptionKey),
    kind,
    minimumAnte,
    targetMultiplier,
    reward: kind === 'small' ? 3 : kind === 'big' ? 4 : kind === 'finisher' ? 8 : 5,
    effects: runtimeEffects(row).filter(
      (effect) =>
        effect.parameters.key !== 'target-multiplier' &&
        effect.handlerId !== 'bxqp:handler:money',
    ),
  };
}

function targetRange(row: CatalogRow): {
  readonly targetKind: TargetKind;
  readonly minimumTargets: number;
  readonly maximumTargets: number;
} {
  const operations = row.effects.flatMap((effect) => effect.operations);
  const selected = operations.find(
    (operation) =>
      (operation.type === 'card-modifier' &&
        (operation.selection === 'selected' || operation.selection === 'face-cards')) ||
      (operation.type === 'card-transform' && operation.selection === 'selected') ||
      (operation.type === 'card-destroy' && operation.selection === 'selected') ||
      (operation.type === 'card-copy' &&
        (operation.source === 'selected' || operation.source === 'selected-right')),
  );
  if (!selected) return { targetKind: 'none', minimumTargets: 0, maximumTargets: 0 };
  if (selected.type === 'card-copy' && selected.source === 'selected') {
    return { targetKind: 'playing-card', minimumTargets: 1, maximumTargets: 1 };
  }
  if (selected.type === 'card-copy' && selected.source === 'selected-right') {
    return { targetKind: 'playing-card', minimumTargets: 2, maximumTargets: 2 };
  }
  const count =
    selected.type === 'card-modifier' ||
    selected.type === 'card-transform' ||
    selected.type === 'card-destroy'
      ? selected.count
      : 1;
  return {
    targetKind: 'playing-card',
    minimumTargets:
      'minimumTargets' in selected && selected.minimumTargets !== undefined
        ? selected.minimumTargets
        : count,
    maximumTargets: count,
  };
}

function consumable(row: CatalogRow, catalog: ProductionCatalog): ConsumableDefinitionV2 {
  const range = targetRange(row);
  return {
    kind: 'consumable',
    contentId: row.id,
    name: text(catalog, row.nameKey),
    description: text(catalog, row.descriptionKey),
    baseCost: row.cost,
    weightUnits: row.weightUnits,
    effects: runtimeEffects(row),
    targetKind: range.targetKind,
    minimumTargets: range.minimumTargets,
    maximumTargets: range.maximumTargets,
    family: row.family as 'tarot' | 'planet' | 'spectral',
  };
}

function packFamily(family: BoosterProfile['family']): PackFamily {
  switch (family) {
    case 'standard':
      return 'standard';
    case 'tarot':
      return 'arcana';
    case 'planet':
      return 'celestial';
    case 'joker':
      return 'buffoon';
    case 'spectral':
      return 'spectral';
  }
}

function pack(row: CatalogRow, catalog: ProductionCatalog): PackDefinition {
  const profile = catalog.boosterProfiles.find(
    (candidate) => candidate.id === row.mechanicalProfileId,
  );
  if (!profile) throw new Error(`卡包缺少机械档案：${row.id}`);
  return {
    id: row.id,
    name: text(catalog, row.nameKey),
    description: text(catalog, row.descriptionKey),
    family: packFamily(profile.family),
    size: profile.size,
    cost: profile.cost,
    optionCount: profile.optionCount,
    pickCount: profile.pickCount,
    temporaryJokerSlots: profile.temporaryJokerSlots,
    temporaryConsumableSlots: profile.temporaryConsumableSlots,
    weightUnits: row.weightUnits,
    allowedItemKinds:
      profile.family === 'standard'
        ? ['playing-card']
        : profile.family === 'joker'
          ? ['joker']
          : ['consumable'],
    effects: runtimeEffects(row),
  };
}

export function createProductionRunContent(
  catalog: ProductionCatalog,
): RunContentSnapshot {
  const rows = (family: CatalogRow['family']) =>
    catalog.rows.filter((row) => row.family === family);
  const tags: readonly TagDefinition[] = rows('tag').map((row) => ({
    id: row.id,
    name: text(catalog, row.nameKey),
    description: text(catalog, row.descriptionKey),
    effects: runtimeEffects(row),
  }));
  const vouchers: readonly VoucherDefinition[] = rows('voucher').map((row) => ({
    id: row.id,
    name: text(catalog, row.nameKey),
    description: text(catalog, row.descriptionKey),
    cost: row.cost,
    prerequisiteId: row.prerequisiteIds[0] ?? null,
    effects: runtimeEffects(row),
  }));
  return {
    blinds: rows('blind').map((row) => blind(row, catalog)),
    tags,
    vouchers,
    items: [
      ...rows('tarot').map((row) => consumable(row, catalog)),
      ...rows('planet').map((row) => consumable(row, catalog)),
      ...rows('spectral').map((row) => consumable(row, catalog)),
      {
        kind: 'playing-card',
        contentId: 'bxqp:playing-card:night-market',
        name: '夜市散牌',
        description: '加入牌组的一张已物化点数与花色的原创散牌。',
        baseCost: 3,
        weightUnits: 40,
        effects: [],
        targetKind: 'none',
        minimumTargets: 0,
        maximumTargets: 0,
      },
    ],
    packs: rows('booster').map((row) => pack(row, catalog)),
  };
}
