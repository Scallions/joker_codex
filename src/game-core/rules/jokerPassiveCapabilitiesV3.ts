import { resolveEffectQueue, type EffectQueueFailureCode } from '../effects/registry';
import type { RunStateV2 } from '../model/runV2';
import { isAbilityStateRun } from '../model/runV3';
import type { JokerValue } from '../../content/schema/catalog';

const MAX_PASSIVE_OPERATIONS = 10_000;

export interface JokerPassiveCapabilitiesV3 {
  readonly straightSize: number;
  readonly flushSize: number;
  readonly allowedDebt: number;
  readonly freeRerollPerShop: boolean;
  readonly allCardsFace: boolean;
  readonly allPlayedCardsScore: boolean;
  readonly straightMaximumStep: 1 | 2;
  readonly handSizeDelta: number;
  readonly handsPerRoundDelta: number;
  readonly discardsPerRoundDelta: number;
  readonly suitColorEquivalence: boolean;
  readonly duplicateShopFamilies: boolean;
  readonly listedChancePower: number;
  readonly zeroPricePlanet: boolean;
  readonly bossDisabled: boolean;
  readonly extraInterestSources: readonly {
    readonly sourceInstanceId: string;
    readonly rate: number;
  }[];
}

export type JokerPassiveCapabilityResolutionV3 =
  | {
      readonly ok: true;
      readonly capabilities: JokerPassiveCapabilitiesV3;
      readonly operationCount: number;
    }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode;
      readonly message: string;
    };

export function resolveJokerPassiveCapabilities(
  state: RunStateV2,
): JokerPassiveCapabilityResolutionV3 {
  const resolved = resolveEffectQueue(
    state.inventory.jokers.map((joker, position) => ({
      instanceId: joker.instanceId,
      position,
      effects: joker.effects,
      debuffed: joker.debuffed,
      copyPolicy: joker.copyPolicy ?? 'none',
      copyTarget: joker.copyTarget ?? 'none',
    })),
    'passive',
    { state, maximumOperations: MAX_PASSIVE_OPERATIONS },
  );
  if (!resolved.ok) return resolved;

  let straightSize = state.rules.straightSize;
  let flushSize = state.rules.flushSize;
  let allowedDebt = state.rules.allowedDebt;
  let freeRerollPerShop = false;
  let allCardsFace = false;
  let allPlayedCardsScore = false;
  let straightMaximumStep: 1 | 2 = 1;
  let handSizeDelta = 0;
  let handsPerRoundDelta = 0;
  let discardsPerRoundDelta = 0;
  let suitColorEquivalence = false;
  let duplicateShopFamilies = false;
  let listedChancePower = 0;
  let zeroPricePlanet = false;
  let bossDisabled = false;
  const extraInterestSources: { sourceInstanceId: string; rate: number }[] = [];
  const resolveValue = (value: JokerValue, sourceInstanceId: string): number | null => {
    if (value.kind === 'fixed') return value.value;
    if (value.kind !== 'source-state' || !isAbilityStateRun(state)) return null;
    const candidate = state.modifiersV3.jokers.find(
      ({ instanceId }) => instanceId === sourceInstanceId,
    )?.abilityState[value.key];
    return typeof candidate === 'number' && Number.isSafeInteger(candidate)
      ? candidate
      : null;
  };
  for (const { operation, sourceInstanceId } of resolved.operations) {
    if (operation.type === 'joker-passive-capability') {
      const value = resolveValue(operation.value, sourceInstanceId);
      if (value === null || !Number.isSafeInteger(value)) continue;
      if (operation.capability === 'all-played-cards-score' && value > 0) {
        allPlayedCardsScore = true;
      }
      if (operation.capability === 'straight-maximum-step' && value >= 2) {
        straightMaximumStep = 2;
      }
      if (operation.capability === 'hand-size-delta') handSizeDelta += value;
      if (operation.capability === 'hands-per-round-delta') {
        handsPerRoundDelta += value;
      }
      if (operation.capability === 'discards-per-round-delta') {
        discardsPerRoundDelta += value;
      }
      if (operation.capability === 'extra-interest' && value > 0) {
        extraInterestSources.push({ sourceInstanceId, rate: value });
      }
      if (operation.capability === 'suit-color-equivalence' && value > 0) {
        suitColorEquivalence = true;
      }
      if (operation.capability === 'duplicate-shop-families' && value > 0) {
        duplicateShopFamilies = true;
      }
      if (operation.capability === 'listed-chance-power' && value > 0) {
        listedChancePower += value;
      }
      if (operation.capability === 'zero-price-planet' && value > 0) {
        zeroPricePlanet = true;
      }
      if (operation.capability === 'boss-disable' && value > 0) {
        bossDisabled = true;
      }
      continue;
    }
    if (operation.type !== 'passive-capability') continue;
    if (
      operation.capability === 'straight-flush-size' &&
      typeof operation.value === 'number'
    ) {
      straightSize = Math.min(straightSize, operation.value);
      flushSize = Math.min(flushSize, operation.value);
    }
    if (operation.capability === 'allowed-debt' && typeof operation.value === 'number') {
      allowedDebt += operation.value;
    }
    if (operation.capability === 'free-reroll-per-shop' && operation.value === true) {
      freeRerollPerShop = true;
    }
    if (operation.capability === 'all-cards-face' && operation.value === true) {
      allCardsFace = true;
    }
  }
  return {
    ok: true,
    capabilities: {
      straightSize,
      flushSize,
      allowedDebt,
      freeRerollPerShop,
      allCardsFace,
      allPlayedCardsScore,
      straightMaximumStep,
      handSizeDelta,
      handsPerRoundDelta,
      discardsPerRoundDelta,
      suitColorEquivalence,
      duplicateShopFamilies,
      listedChancePower,
      zeroPricePlanet,
      bossDisabled,
      extraInterestSources,
    },
    operationCount: resolved.operationCount,
  };
}

export function canAffordRunStateV3(state: RunStateV2, price: number): boolean {
  if (!Number.isSafeInteger(price) || price < 0) return false;
  const resolved = resolveJokerPassiveCapabilities(state);
  return (
    resolved.ok &&
    Number.isSafeInteger(state.economy.money) &&
    state.economy.money - price >= -resolved.capabilities.allowedDebt
  );
}
