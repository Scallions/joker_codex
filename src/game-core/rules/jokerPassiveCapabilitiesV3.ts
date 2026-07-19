import { resolveEffectQueue, type EffectQueueFailureCode } from '../effects/registry';
import type { RunStateV2 } from '../model/runV2';

const MAX_PASSIVE_OPERATIONS = 10_000;

export interface JokerPassiveCapabilitiesV3 {
  readonly straightSize: number;
  readonly flushSize: number;
  readonly allowedDebt: number;
  readonly freeRerollPerShop: boolean;
  readonly allCardsFace: boolean;
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
  for (const { operation } of resolved.operations) {
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
