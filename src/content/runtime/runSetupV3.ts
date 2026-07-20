import { validateRunStateV3 } from '../../game-core/invariants/validateRunStateV3';
import {
  createStandardDeck,
  RANKS,
  SUITS,
  type Rank,
  type Suit,
} from '../../game-core/model/cards';
import { stableId } from '../../game-core/model/ids';
import type {
  JokerDefinitionV2,
  RunPlayingCard,
  RunRuleStateV2,
} from '../../game-core/model/runV2';
import {
  CONTENT_VERSION_V3,
  RUN_SCHEMA_VERSION_V3,
  type MaterializedChoiceV3,
  type RunRulesV3,
  type RunStateV3,
} from '../../game-core/model/runV3';
import { DEFAULT_HAND_LEVELS } from '../../game-core/poker/evaluate';
import {
  createRandomState,
  nextInteger,
  type RandomState,
} from '../../game-core/rng/random';
import { createCampaignRun } from '../../game-core/rules/createCampaignRun';
import type { CatalogOperation, CatalogRow, ProductionCatalog } from '../schema/catalog';
import { validateProductionCatalog } from '../schema/validateCatalog';
import { catalogRowIsExcludedBySemanticRules } from './eligibility';
import { createProductionRunContent } from './productionRunContent';

const DEFAULT_DECK_ID = 'bxqp:deck:echo-ledger';
const DEFAULT_STAKE_ID = 'bxqp:stake:first-bell';

type DeckRecipe = Extract<CatalogOperation, { readonly type: 'deck-recipe' }>['recipe'];

export interface CompileRunSetupOptionsV3 {
  readonly deckId?: string;
  readonly stakeId?: string;
  readonly challengeId?: string | null;
}

export interface CompiledRunSetupV3 {
  readonly deckId: string;
  readonly stakeId: string;
  readonly challengeId: string | null;
  readonly appliedStakeIds: readonly string[];
  readonly appliedRows: readonly CatalogRow[];
  readonly rules: RunRuleStateV2;
  readonly rulesV3: RunRulesV3;
  readonly startingMoney: number;
  readonly deckRecipe: DeckRecipe;
  readonly deckModifierOperations: readonly Extract<
    CatalogOperation,
    { readonly type: 'card-modifier' }
  >[];
  readonly startingVoucherIds: readonly string[];
  readonly startingConsumableIds: readonly string[];
  readonly startingJokerIds: readonly string[];
  readonly requiredExternalIds: readonly string[];
}

export interface CreateProductionRunOptionsV3 extends CompileRunSetupOptionsV3 {
  readonly seed: string;
  readonly eligibilityObjectiveIds?: readonly string[];
  readonly discoveredContentIds?: readonly string[];
  readonly resolvedExternalIds?: ReadonlySet<string>;
  readonly externalJokerDefinitions?: readonly JokerDefinitionV2[];
  readonly validationMode?: 'catalog-child' | 'integration-strict';
}

function baselineRules(): RunRuleStateV2 {
  return {
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
    targetScaleBasisPoints: 10_000,
    straightSize: 5,
    flushSize: 5,
    handLevels: { ...DEFAULT_HAND_LEVELS },
  };
}

function baselineRulesV3(): RunRulesV3 {
  return {
    targetCurveId: 'baseline',
    anteOneThroughEightTargets: [300, 800, 2_000, 5_000, 11_000, 20_000, 35_000, 50_000],
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
  };
}

function numericRuleValue(
  current: number,
  mode: Extract<CatalogOperation, { readonly type: 'rule-patch' }>['mode'],
  value: number,
): number {
  if (mode === 'set') return value;
  return mode === 'add' ? current + value : current * value;
}

function patchRules(
  rules: RunRuleStateV2,
  operation: Extract<CatalogOperation, { readonly type: 'rule-patch' }>,
): RunRuleStateV2 {
  const value = operation.value;
  if (operation.key === 'interest-enabled' && typeof value === 'boolean') {
    return { ...rules, interestRate: value ? Math.max(1, rules.interestRate) : 0 };
  }
  if (typeof value !== 'number') return rules;
  const patch = (current: number) =>
    Math.max(0, numericRuleValue(current, operation.mode, value));
  switch (operation.key) {
    case 'hands-per-round':
      return { ...rules, handsPerRound: patch(rules.handsPerRound) };
    case 'discards-per-round':
      return { ...rules, discardsPerRound: patch(rules.discardsPerRound) };
    case 'hand-size':
      return { ...rules, handSize: patch(rules.handSize) };
    case 'joker-slots':
      return { ...rules, jokerSlots: patch(rules.jokerSlots) };
    case 'consumable-slots':
      return { ...rules, consumableSlots: patch(rules.consumableSlots) };
    case 'interest-cap':
      return { ...rules, interestCap: patch(rules.interestCap) };
    case 'target-scale':
      return {
        ...rules,
        targetScaleBasisPoints: Math.max(
          1,
          numericRuleValue(rules.targetScaleBasisPoints, operation.mode, value),
        ),
      };
    case 'shop-offer-slots':
      return { ...rules, cardOfferSlots: patch(rules.cardOfferSlots) };
    case 'pack-offer-slots':
      return { ...rules, packOfferSlots: patch(rules.packOfferSlots) };
    case 'reroll-cost':
      return { ...rules, baseRerollCost: patch(rules.baseRerollCost) };
    case 'allowed-debt':
      return { ...rules, allowedDebt: patch(rules.allowedDebt) };
    case 'maximum-selected-cards':
      return { ...rules, maximumSelectedCards: patch(rules.maximumSelectedCards) };
    default:
      return rules;
  }
}

function baselineStartingContent(key: string): {
  readonly vouchers: readonly string[];
  readonly consumables: readonly string[];
} {
  switch (key) {
    case 'start-with-consumable-slot-voucher':
      return { vouchers: ['bxqp:voucher:wide-satchel'], consumables: [] };
    case 'start-with-two-last-use-copies':
      return {
        vouchers: [],
        consumables: ['bxqp:tarot:afterimage', 'bxqp:tarot:afterimage'],
      };
    case 'start-with-most-played-hand-voucher':
      return { vouchers: ['bxqp:voucher:favored-star'], consumables: [] };
    case 'start-with-polychrome-sacrifice-consumable':
      return { vouchers: [], consumables: ['bxqp:spectral:rainbow-sacrifice'] };
    case 'start-with-tarot-frequency-voucher':
      return { vouchers: ['bxqp:voucher:paper-scent'], consumables: [] };
    case 'start-with-planet-frequency-voucher':
      return { vouchers: ['bxqp:voucher:star-scent'], consumables: [] };
    case 'start-with-shop-slot-voucher':
      return { vouchers: ['bxqp:voucher:third-stall'], consumables: [] };
    case 'start-with-interest-cap-voucher-pair':
      return {
        vouchers: ['bxqp:voucher:ten-coin-interest', 'bxqp:voucher:twenty-coin-interest'],
        consumables: [],
      };
    case 'start-with-two-tarot-and-card-shop-vouchers':
      return {
        vouchers: ['bxqp:voucher:card-stall', 'bxqp:voucher:decorated-card-stall'],
        consumables: ['bxqp:tarot:star-pair', 'bxqp:tarot:paper-pair'],
      };
    case 'start-with-planet-frequency-voucher-pair':
      return {
        vouchers: ['bxqp:voucher:star-scent', 'bxqp:voucher:star-tide'],
        consumables: [],
      };
    default:
      return { vouchers: [], consumables: [] };
  }
}

function requiredRow(
  catalog: ProductionCatalog,
  family: CatalogRow['family'],
  id: string,
): CatalogRow {
  const row = catalog.rows.find(
    (candidate) => candidate.family === family && candidate.id === id,
  );
  if (!row) throw new Error(`找不到 ${family} 目录项：${id}`);
  return row;
}

export function compileRunSetupV3(
  catalog: ProductionCatalog,
  options: CompileRunSetupOptionsV3 = {},
): CompiledRunSetupV3 {
  validateProductionCatalog(catalog);
  const challengeId = options.challengeId ?? null;
  const deckId = options.deckId ?? DEFAULT_DECK_ID;
  const requestedStakeId = options.stakeId ?? DEFAULT_STAKE_ID;
  const firstStake = requiredRow(catalog, 'stake', DEFAULT_STAKE_ID);
  const challenge = challengeId ? requiredRow(catalog, 'challenge', challengeId) : null;
  const deck = challenge ? null : requiredRow(catalog, 'deck', deckId);
  const selectedStake = challenge
    ? firstStake
    : requiredRow(catalog, 'stake', requestedStakeId);
  const appliedStakes = catalog.rows
    .filter((row) => row.family === 'stake' && row.ordinal <= selectedStake.ordinal)
    .sort((left, right) => left.ordinal - right.ordinal);
  const appliedRows = challenge
    ? [firstStake, challenge]
    : [deck as CatalogRow, ...appliedStakes];
  const locallyDefinedJokerIds = new Set(
    catalog.rows.filter((row) => row.family === 'joker').map((row) => row.id),
  );

  let rules = baselineRules();
  let rulesV3 = baselineRulesV3();
  let startingMoney = 4;
  let deckRecipe: DeckRecipe = 'standard';
  const deckModifierOperations: Extract<
    CatalogOperation,
    { readonly type: 'card-modifier' }
  >[] = [];
  const startingVoucherIds: string[] = [];
  const startingConsumableIds: string[] = [];

  for (const row of appliedRows) {
    for (const operation of row.effects.flatMap((effect) => effect.operations)) {
      if (operation.type === 'rule-patch') {
        rules = patchRules(rules, operation);
        if (operation.key === 'blind-reward' && operation.value === 0) {
          rulesV3 = {
            ...rulesV3,
            blindRewardPolicy:
              row.family === 'stake'
                ? 'small-zero'
                : row.referenceIndex === 'C19'
                  ? 'small-big-zero'
                  : 'all-zero',
          };
        }
        if (
          operation.key === 'remaining-hand-reward' &&
          typeof operation.value === 'number'
        ) {
          rulesV3 = { ...rulesV3, remainingHandReward: Math.max(0, operation.value) };
        }
        if (
          operation.key === 'remaining-discard-reward' &&
          typeof operation.value === 'number'
        ) {
          rulesV3 = { ...rulesV3, remainingDiscardReward: Math.max(0, operation.value) };
        }
        if (operation.key === 'discard-cost' && typeof operation.value === 'number') {
          rulesV3 = { ...rulesV3, discardCost: Math.max(0, operation.value) };
        }
      }
      if (operation.type === 'deck-recipe') deckRecipe = operation.recipe;
      if (operation.type === 'target-curve') {
        rulesV3 = {
          ...rulesV3,
          targetCurveId: operation.curveId,
          anteOneThroughEightTargets: operation.anteOneThroughEight,
        };
      }
      if (operation.type === 'sticker-roll') {
        rulesV3 = {
          ...rulesV3,
          stickerRuleIds: [...rulesV3.stickerRuleIds, operation.stickerId],
        };
      }
      if (operation.type === 'card-modifier') deckModifierOperations.push(operation);
      if (operation.type === 'money' && operation.mode === 'add') {
        startingMoney += operation.amount;
      }
      if (
        operation.type === 'shop-rule' &&
        operation.key === 'price-increase-per-purchase' &&
        typeof operation.value === 'number'
      ) {
        rulesV3 = { ...rulesV3, priceInflationPerPurchase: operation.value };
      }
      if (
        operation.type === 'shop-rule' &&
        operation.key === 'playing-cards-enabled' &&
        typeof operation.value === 'boolean'
      ) {
        rulesV3 = { ...rulesV3, playingCardsInShop: operation.value };
      }
      if (
        operation.type === 'shop-rule' &&
        operation.key === 'joker-offers-enabled' &&
        typeof operation.value === 'boolean'
      ) {
        rulesV3 = { ...rulesV3, jokersInShop: operation.value };
      }
      if (
        operation.type === 'shop-rule' &&
        operation.key === 'boss-reroll' &&
        typeof operation.value === 'string'
      ) {
        rulesV3 = {
          ...rulesV3,
          bossRerollCost: 10,
          bossRerollLimitPerAnte: operation.value.includes('unlimited') ? null : 1,
        };
      }
      if (
        operation.type === 'shop-rule' &&
        operation.key === 'family-weight' &&
        typeof operation.value === 'string'
      ) {
        const [rawFamily, rawMultiplier] = operation.value.split(':');
        const family = operation.value === 'spectral-enabled' ? 'spectral' : rawFamily;
        const multiplier =
          operation.value === 'spectral-enabled' ? 1 : Number(rawMultiplier);
        if (family && Number.isFinite(multiplier) && multiplier > 0) {
          rulesV3 = {
            ...rulesV3,
            shopFamilyWeightMultipliers: {
              ...rulesV3.shopFamilyWeightMultipliers,
              [family]: multiplier,
            },
          };
        }
      }
      if (operation.type === 'restriction') {
        rulesV3 = {
          ...rulesV3,
          bannedContentIds:
            operation.key === 'ban-content'
              ? [...rulesV3.bannedContentIds, ...operation.values]
              : rulesV3.bannedContentIds,
          excludedRuleKeys:
            operation.key === 'ban-content'
              ? rulesV3.excludedRuleKeys
              : [...rulesV3.excludedRuleKeys, operation.key, ...operation.values],
        };
      }
      if (operation.type === 'baseline') {
        const starting = baselineStartingContent(operation.key);
        startingVoucherIds.push(...starting.vouchers);
        startingConsumableIds.push(...starting.consumables);
      }
    }
  }

  // Starting vouchers are already redeemed setup content, so their persistent
  // rule patches must be composed before the first command just like purchased
  // vouchers would be.
  for (const voucherId of new Set(startingVoucherIds)) {
    const voucher = requiredRow(catalog, 'voucher', voucherId);
    for (const operation of voucher.effects.flatMap((effect) => effect.operations)) {
      if (operation.type === 'rule-patch') {
        rules = patchRules(rules, operation);
      }
      if (operation.type !== 'shop-rule') continue;
      if (
        operation.key === 'discount-basis-points' &&
        typeof operation.value === 'number'
      ) {
        rules = {
          ...rules,
          priceDiscountBasisPoints: Math.max(0, Math.min(10_000, operation.value)),
        };
      }
      if (operation.key === 'reroll-discount' && typeof operation.value === 'number') {
        rules = {
          ...rules,
          baseRerollCost: Math.max(0, rules.baseRerollCost - operation.value),
        };
      }
      if (
        operation.key === 'playing-cards-enabled' &&
        typeof operation.value === 'boolean'
      ) {
        rulesV3 = { ...rulesV3, playingCardsInShop: operation.value };
      }
      if (
        operation.key === 'joker-offers-enabled' &&
        typeof operation.value === 'boolean'
      ) {
        rulesV3 = { ...rulesV3, jokersInShop: operation.value };
      }
      if (operation.key === 'family-weight' && typeof operation.value === 'string') {
        const [family, rawMultiplier] = operation.value.split(':');
        const multiplier = Number(rawMultiplier);
        if (family && Number.isFinite(multiplier) && multiplier > 0) {
          rulesV3 = {
            ...rulesV3,
            shopFamilyWeightMultipliers: {
              ...rulesV3.shopFamilyWeightMultipliers,
              [family]: multiplier,
            },
          };
        }
      }
    }
  }

  return {
    deckId,
    stakeId: selectedStake.id,
    challengeId,
    appliedStakeIds: challenge ? [firstStake.id] : appliedStakes.map((row) => row.id),
    appliedRows,
    rules,
    rulesV3,
    startingMoney,
    deckRecipe,
    deckModifierOperations,
    startingVoucherIds: [...new Set(startingVoucherIds)],
    startingConsumableIds,
    startingJokerIds: challenge?.externalDependencyIds ?? [],
    requiredExternalIds: [
      ...new Set(appliedRows.flatMap((row) => row.externalDependencyIds)),
    ]
      .filter((id) => !locallyDefinedJokerIds.has(id))
      .sort((left, right) => left.localeCompare(right)),
  };
}

function runCard(id: string, suit: Suit, rank: Rank): RunPlayingCard {
  return {
    id: stableId<'playing-card'>(id),
    suit,
    rank,
    enhancementId: null,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function standardRunDeck(): RunPlayingCard[] {
  return createStandardDeck().map((card) => runCard(card.id, card.suit, card.rank));
}

function deckForRecipe(
  recipe: DeckRecipe,
  rngState: RandomState,
): {
  readonly cards: readonly RunPlayingCard[];
  readonly rngState: RandomState;
  readonly choiceNumbers: readonly number[];
} {
  if (recipe === 'no-face') {
    return {
      cards: standardRunDeck().filter(
        ({ rank }) => rank !== 'jack' && rank !== 'queen' && rank !== 'king',
      ),
      rngState,
      choiceNumbers: [],
    };
  }
  if (recipe === 'hearts-spades') {
    return {
      cards: (['hearts', 'spades'] as const).flatMap((suit) =>
        RANKS.flatMap((rank) =>
          [1, 2].map((copy) =>
            runCard(`playing:${suit}:${rank}:copy:${copy}`, suit, rank),
          ),
        ),
      ),
      rngState,
      choiceNumbers: [],
    };
  }
  if (recipe === 'rank-two-through-nine') {
    const ranks = RANKS.slice(0, 8);
    return {
      cards: SUITS.flatMap((suit) =>
        ranks.map((rank) => runCard(`playing:${suit}:${rank}`, suit, rank)),
      ),
      rngState,
      choiceNumbers: [],
    };
  }
  if (recipe === 'double-face-no-low') {
    const ranks = RANKS.filter((rank) => rank !== '2' && rank !== '3' && rank !== 'ace');
    const cards = SUITS.flatMap((suit) =>
      ranks.map((rank) => runCard(`playing:${suit}:${rank}:copy:1`, suit, rank)),
    );
    const faces = SUITS.flatMap((suit) =>
      (['jack', 'queen', 'king'] as const).map((rank) =>
        runCard(`playing:${suit}:${rank}:copy:2`, suit, rank),
      ),
    );
    return { cards: [...cards, ...faces], rngState, choiceNumbers: [] };
  }
  if (recipe === 'randomized') {
    const cards: RunPlayingCard[] = [];
    const choiceNumbers: number[] = [];
    let nextState = rngState;
    for (let index = 0; index < 52; index += 1) {
      const suit = nextInteger(nextState, SUITS.length);
      const rank = nextInteger(suit.state, RANKS.length);
      cards.push(
        runCard(
          `playing:randomized:${index.toString().padStart(2, '0')}`,
          SUITS[suit.value] as Suit,
          RANKS[rank.value] as Rank,
        ),
      );
      choiceNumbers.push(suit.value, rank.value);
      nextState = rank.state;
    }
    return { cards, rngState: nextState, choiceNumbers };
  }
  return { cards: standardRunDeck(), rngState, choiceNumbers: [] };
}

function isFace(rank: Rank): boolean {
  return rank === 'jack' || rank === 'queen' || rank === 'king';
}

function applyDeckModifiers(
  cards: readonly RunPlayingCard[],
  operations: CompiledRunSetupV3['deckModifierOperations'],
): readonly RunPlayingCard[] {
  let next = [...cards];
  for (const operation of operations) {
    const eligible = next.filter((card) =>
      operation.selection === 'face-cards' ? isFace(card.rank) : true,
    );
    const targetIds = new Set(
      eligible
        .slice(0, operation.count === 0 ? eligible.length : operation.count)
        .map(({ id }) => id),
    );
    next = next.map((card) => {
      if (!targetIds.has(card.id)) return card;
      if (operation.family === 'enhancement') {
        return { ...card, enhancementId: operation.modifierId };
      }
      if (operation.family === 'seal') return { ...card, sealId: operation.modifierId };
      if (operation.family === 'edition')
        return { ...card, editionId: operation.modifierId };
      return card;
    });
  }
  return next;
}

function fingerprint(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function createProductionRunV3(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV3,
): RunStateV3 {
  const validationMode = options.validationMode ?? 'catalog-child';
  const suppliedExternalJokers = options.externalJokerDefinitions ?? [];
  if (
    new Set(suppliedExternalJokers.map(({ contentId }) => contentId)).size !==
    suppliedExternalJokers.length
  ) {
    throw new Error('外部奇牌能力定义不能重复');
  }
  const resolvedExternalIds = new Set([
    ...(options.resolvedExternalIds ?? []),
    ...suppliedExternalJokers.map(({ contentId }) => contentId),
  ]);
  validateProductionCatalog(catalog, {
    mode: validationMode,
    resolvedExternalIds,
  });
  const setup = compileRunSetupV3(catalog, options);
  if (
    suppliedExternalJokers.some(
      ({ contentId }) => !setup.requiredExternalIds.includes(contentId),
    )
  ) {
    throw new Error('外部奇牌能力定义不属于当前牌局的已声明依赖');
  }
  const deckMaterialization = deckForRecipe(
    setup.deckRecipe,
    createRandomState(options.seed),
  );
  const deck = applyDeckModifiers(
    deckMaterialization.cards,
    setup.deckModifierOperations,
  );
  // V3 is the frozen pre-Joker production format. New aggregate content is
  // compiled directly by V4; V3 runs retain the accepted 230-row snapshot.
  const legacyRows = catalog.rows.filter((row) => row.family !== 'joker');
  const legacyCatalog: ProductionCatalog = {
    ...catalog,
    rows: legacyRows,
    assets: catalog.assets.filter((asset) =>
      legacyRows.some((row) => row.id === asset.contentId),
    ),
    contracts: catalog.contracts.filter((record) =>
      legacyRows.some((row) => row.id === record.contentId),
    ),
  };
  const productionContent = createProductionRunContent(legacyCatalog);
  const semanticRuleKeys = new Set([
    ...setup.rulesV3.bannedContentIds,
    ...setup.rulesV3.excludedRuleKeys,
  ]);
  const rowById = new Map(catalog.rows.map((row) => [row.id, row]));
  const frozenObjectiveIds = options.eligibilityObjectiveIds
    ? new Set(options.eligibilityObjectiveIds)
    : null;
  const frozenDiscoveryIds = options.discoveredContentIds
    ? new Set(options.discoveredContentIds)
    : null;
  const allowedByFrozenProfile = (row: CatalogRow): boolean => {
    if (!frozenObjectiveIds || !frozenDiscoveryIds) return true;
    if (
      row.unlockObjectiveId !== null &&
      !frozenObjectiveIds.has(row.unlockObjectiveId)
    ) {
      return false;
    }
    if (
      row.availability.kind === 'profile-objective' &&
      !frozenObjectiveIds.has(row.availability.value)
    ) {
      return false;
    }
    if (
      row.discovery.kind === 'profile-objective' &&
      !frozenObjectiveIds.has(row.discovery.value)
    ) {
      return false;
    }
    return (
      row.discovery.kind !== 'after-use' || frozenDiscoveryIds.has(row.discovery.value)
    );
  };
  const allowedBySetup = (contentId: string): boolean => {
    const row = rowById.get(contentId);
    return (
      row === undefined ||
      (allowedByFrozenProfile(row) &&
        !catalogRowIsExcludedBySemanticRules(row, semanticRuleKeys))
    );
  };
  const noJokerRoutes = semanticRuleKeys.has('no-joker-routes');
  const content = {
    ...productionContent,
    items: [
      ...productionContent.items.filter(({ contentId }) => allowedBySetup(contentId)),
      ...suppliedExternalJokers,
    ],
    blinds: productionContent.blinds.filter(({ id }) => allowedBySetup(id)),
    tags: productionContent.tags.filter(({ id }) => allowedBySetup(id)),
    vouchers: productionContent.vouchers.filter(({ id }) => allowedBySetup(id)),
    packs: productionContent.packs.filter(
      (pack) =>
        allowedBySetup(pack.id) &&
        (!noJokerRoutes ||
          (pack.family !== 'buffoon' &&
            pack.family !== 'arcana' &&
            pack.family !== 'spectral')),
    ),
  };
  const suppliedJokerIds = new Set(
    suppliedExternalJokers.map(({ contentId }) => contentId),
  );
  const base = createCampaignRun({
    seed: options.seed,
    content,
    startingMoney: setup.startingMoney,
    startingJokerContentIds: setup.startingJokerIds.filter((id) =>
      suppliedJokerIds.has(id),
    ),
    startingConsumableContentIds: setup.startingConsumableIds,
    startingDeck: deck,
    initialRngState: deckMaterialization.rngState,
    mode: setup.challengeId ? 'production-challenge' : 'production-campaign',
  });
  const materializedChoicesV3: readonly MaterializedChoiceV3[] = [
    {
      id: `bxqp:choice:starting-deck:${options.seed}`,
      kind: setup.deckRecipe,
      valueIds: deck.map(({ id }) => id),
      valueNumbers: deckMaterialization.choiceNumbers,
      checkpointId: 0,
    },
  ];
  const permanentStartingJokers =
    setup.rulesV3.excludedRuleKeys.includes('permanent-jokers') &&
    (setup.rulesV3.excludedRuleKeys.includes('starting') ||
      setup.rulesV3.excludedRuleKeys.includes('all-acquired'));
  const run: RunStateV3 = {
    ...base,
    schemaVersion: RUN_SCHEMA_VERSION_V3,
    contentVersion: CONTENT_VERSION_V3,
    mode: setup.challengeId ? 'production-challenge' : 'production-campaign',
    rules: setup.rules,
    inventory: {
      ...base.inventory,
      voucherIds: setup.startingVoucherIds,
    },
    setupV3: {
      deckId: setup.deckId,
      stakeId: setup.stakeId,
      appliedStakeIds: setup.appliedStakeIds,
      challengeId: setup.challengeId,
      rulePatchEffectIds: setup.appliedRows.flatMap((row) =>
        row.effects.map((effect) => effect.id),
      ),
    },
    productionContentV3: {
      contentVersion: CONTENT_VERSION_V3,
      rows: legacyRows.map((definition) => ({
        definition,
        name: catalog.localization[definition.nameKey] as string,
        description: catalog.localization[definition.descriptionKey] as string,
      })),
      boosterProfiles: catalog.boosterProfiles,
    },
    rulesV3: setup.rulesV3,
    modifiersV3: {
      playingCards: deck.map((card) => ({
        cardId: card.id,
        enhancementId: card.enhancementId,
        sealId: card.sealId,
        editionId: card.editionId,
        debuffed: false,
      })),
      jokers: base.inventory.jokers.map((joker) => ({
        instanceId: joker.instanceId,
        stickerIds: permanentStartingJokers ? ['bxqp:sticker:permanent'] : [],
        perishableRoundsRemaining: null,
        rentalRoundCost: 0,
        saleAllowed: !permanentStartingJokers,
        slotContribution: joker.slotContribution,
      })),
    },
    externalDependenciesV3: {
      requiredIds: setup.requiredExternalIds,
      resolvedIds: setup.requiredExternalIds.filter((id) => resolvedExternalIds.has(id)),
      validationMode,
    },
    materializedChoicesV3,
    migrationV3: {
      sourceSchemaVersion: 3,
      sourceContentVersion: CONTENT_VERSION_V3,
      sourceCheckpointId: 0,
      recoveryFingerprint: fingerprint(`production:${options.seed}`),
    },
  };
  const valid = validateRunStateV3(run);
  if (!valid.ok) {
    throw new Error(`生产牌局初始化失败：${valid.violations.join('；')}`);
  }
  return run;
}
