import {
  resolveEffectQueue,
  type EffectQueueFailureCode,
  type EffectQueueSource,
  type ResolvedEffectOperation,
} from './registry';
import { materializeItemV2 } from '../economy/shopV2';
import { stableId } from '../model/ids';
import { materializeJokerStickersV3 } from '../model/runV3';
import type { EffectReference, EffectWindow, RunStateV2 } from '../model/runV2';
import { applyStateOperationV3 } from './applyStateOperationV3';

export interface AdditionalEffectSourceV2 {
  readonly instanceId: string;
  readonly position: number;
  readonly effects: readonly EffectReference[];
  readonly debuffed?: boolean;
}

export interface RunWindowOptionsV2 {
  readonly includeBlind?: boolean;
  readonly includeDeferredTags?: boolean;
  readonly includeVouchers?: boolean;
  readonly includeJokers?: boolean;
  readonly includeConsumables?: boolean;
  readonly additionalSources?: readonly AdditionalEffectSourceV2[];
  /** Cards materialized by the draw immediately preceding this window. */
  readonly blindDrawnCardIds?: readonly string[];
}

export type RunWindowResolutionV2 =
  | {
      readonly ok: true;
      readonly state: RunStateV2;
      readonly operations: readonly ResolvedEffectOperation[];
    }
  | {
      readonly ok: false;
      readonly code:
        EffectQueueFailureCode | 'insufficient-funds' | 'inventory-full' | 'pool-empty';
      readonly message: string;
    };

function usedJokerSlots(state: RunStateV2): number {
  return state.inventory.jokers.reduce(
    (total, joker) => total + joker.slotContribution,
    0,
  );
}

function collectSources(
  state: RunStateV2,
  window: EffectWindow,
  options: RunWindowOptionsV2,
): readonly EffectQueueSource[] {
  const sources: EffectQueueSource[] = [];
  if (options.includeBlind !== false && state.round) {
    sources.push({
      instanceId: `blind:${state.round.blind.definitionId}`,
      position: 0,
      effects: state.round.blind.effects,
    });
  }
  if (options.includeDeferredTags !== false) {
    for (const [index, tag] of state.inventory.tags.entries()) {
      if (tag.consumed || tag.deferredWindow !== window) continue;
      const definition = state.content.tags.find(
        (candidate) => candidate.id === tag.contentId,
      );
      if (!definition) continue;
      sources.push({
        instanceId: tag.instanceId,
        position: 100 + index,
        effects: definition.effects,
      });
    }
  }
  if (options.includeVouchers !== false) {
    for (const [index, voucherId] of state.inventory.voucherIds.entries()) {
      const definition = state.content.vouchers.find(
        (candidate) => candidate.id === voucherId,
      );
      if (!definition) continue;
      sources.push({
        instanceId: `voucher:${voucherId}`,
        position: 300 + index,
        effects: definition.effects,
      });
    }
  }
  if (options.includeJokers !== false) {
    sources.push(
      ...state.inventory.jokers.map((joker, index) => ({
        instanceId: joker.instanceId,
        position: 1_000 + index,
        effects: joker.effects,
        debuffed: joker.debuffed,
      })),
    );
  }
  if (options.includeConsumables !== false) {
    sources.push(
      ...state.inventory.consumables.map((item, index) => ({
        instanceId: item.instanceId,
        position: 2_000 + index,
        effects: item.effects,
      })),
    );
  }
  sources.push(...(options.additionalSources ?? []));
  return sources;
}

function applyOperation(
  state: RunStateV2,
  entry: ResolvedEffectOperation,
  window: EffectWindow,
  blindDrawnCardIds?: readonly string[],
): RunWindowResolutionV2 {
  const operation = entry.operation;
  let next = state;
  if (operation.type === 'add-money') {
    next = {
      ...next,
      economy: { ...next.economy, money: next.economy.money + operation.amount },
    };
  }
  if (operation.type === 'spend-money') {
    next = {
      ...next,
      economy: { ...next.economy, money: next.economy.money - operation.amount },
    };
  }
  if (operation.type === 'set-money') {
    next = { ...next, economy: { ...next.economy, money: operation.value } };
  }
  if (next.economy.money < -next.rules.allowedDebt) {
    return {
      ok: false,
      code: 'insufficient-funds',
      message: '效果会超出当前允许的欠票额度',
    };
  }
  if (operation.type === 'add-hands' && next.round) {
    next = {
      ...next,
      round: {
        ...next.round,
        handsRemaining: Math.max(0, next.round.handsRemaining + operation.amount),
      },
    };
  }
  if (operation.type === 'set-hands' && next.round) {
    next = {
      ...next,
      round: { ...next.round, handsRemaining: Math.max(0, operation.value) },
    };
  }
  if (operation.type === 'set-discards' && next.round) {
    next = {
      ...next,
      round: { ...next.round, discardsRemaining: Math.max(0, operation.value) },
    };
  }
  if (operation.type === 'adjust-hand-size') {
    next = {
      ...next,
      rules: {
        ...next.rules,
        handSize: Math.max(0, next.rules.handSize + operation.amount),
      },
    };
  }
  if (operation.type === 'add-joker-slots') {
    const jokerSlots = Math.max(0, next.rules.jokerSlots + operation.amount);
    if (jokerSlots < usedJokerSlots(next)) {
      return {
        ok: false,
        code: 'inventory-full',
        message: '效果会使奇牌栏位少于已用容量',
      };
    }
    next = { ...next, rules: { ...next.rules, jokerSlots } };
  }
  if (operation.type === 'add-consumable-slots') {
    const consumableSlots = Math.max(0, next.rules.consumableSlots + operation.amount);
    if (consumableSlots < next.inventory.consumables.length) {
      return {
        ok: false,
        code: 'inventory-full',
        message: '效果会使消耗牌栏位少于已用容量',
      };
    }
    next = { ...next, rules: { ...next.rules, consumableSlots } };
  }
  if (operation.type === 'set-discount') {
    next = {
      ...next,
      rules: {
        ...next.rules,
        priceDiscountBasisPoints: Math.max(0, Math.min(10_000, operation.basisPoints)),
      },
    };
  }
  if (operation.type === 'set-interest-cap') {
    next = {
      ...next,
      rules: { ...next.rules, interestCap: Math.max(0, operation.value) },
    };
  }
  if (operation.type === 'set-reroll-cost') {
    const rerollCost = Math.max(0, operation.value);
    next = {
      ...next,
      rules: { ...next.rules, baseRerollCost: rerollCost },
      shop: next.shop ? { ...next.shop, rerollCost } : null,
    };
  }
  if (operation.type === 'free-reroll' && next.shop) {
    next = { ...next, shop: { ...next.shop, freeRerollAvailable: true } };
  }
  if (operation.type === 'level-hand') {
    next = {
      ...next,
      rules: {
        ...next.rules,
        handLevels: {
          ...next.rules.handLevels,
          [operation.handType]: Math.max(
            1,
            next.rules.handLevels[operation.handType] + operation.amount,
          ),
        },
      },
    };
  }
  if (operation.type === 'create-item') {
    const definition = next.content.items.find(
      (item) => item.contentId === operation.contentId,
    );
    if (!definition) {
      return {
        ok: false,
        code: 'pool-empty',
        message: `创建物品的内容定义缺失：${operation.contentId}`,
      };
    }
    if (
      definition.kind === 'joker' &&
      usedJokerSlots(next) + definition.slotContribution > next.rules.jokerSlots
    ) {
      return { ok: false, code: 'inventory-full', message: '奇牌栏位已满' };
    }
    if (
      definition.kind === 'consumable' &&
      next.inventory.consumables.length >= next.rules.consumableSlots
    ) {
      return { ok: false, code: 'inventory-full', message: '消耗牌栏位已满' };
    }
    const identity = `effect-created:${next.runId}:${next.checkpointId + 1}:${entry.sourceInstanceId}:${entry.effectId}:${next.deck.cards.length}:${next.inventory.jokers.length}:${next.inventory.consumables.length}`;
    const materialized = materializeItemV2(definition, identity, next.rngState);
    next = { ...next, rngState: materialized.rngState };
    const item = materialized.item;
    if (item.kind === 'joker') {
      const instanceId = stableId<'joker-instance'>(`joker:${identity}`);
      next = {
        ...next,
        inventory: {
          ...next.inventory,
          jokers: [
            ...next.inventory.jokers,
            {
              instanceId,
              contentId: item.contentId,
              name: item.name,
              description: item.description,
              baseCost: item.baseCost,
              editionCost: item.editionCost,
              editionId: item.editionId,
              effects: item.effects,
              slotContribution: item.slotContribution,
              sellValueOverride: null,
              debuffed: false,
            },
          ],
        },
      };
      next = materializeJokerStickersV3(next, instanceId, identity);
    }
    if (item.kind === 'consumable') {
      next = {
        ...next,
        inventory: {
          ...next.inventory,
          consumables: [
            ...next.inventory.consumables,
            {
              instanceId: stableId<'consumable-instance'>(`consumable:${identity}`),
              contentId: item.contentId,
              name: item.name,
              description: item.description,
              baseCost: item.baseCost,
              editionCost: item.editionCost,
              editionId: item.editionId,
              effects: item.effects,
              targetKind: item.targetKind,
              minimumTargets: item.minimumTargets,
              maximumTargets: item.maximumTargets,
              sellValueOverride: null,
            },
          ],
        },
      };
    }
    if (item.kind === 'playing-card') {
      if (!item.generatedCard) {
        return { ok: false, code: 'pool-empty', message: '生成的戏牌资料缺失' };
      }
      next = {
        ...next,
        deck: { cards: [...next.deck.cards, item.generatedCard] },
        round: next.round
          ? {
              ...next.round,
              discardPileIds: [...next.round.discardPileIds, item.generatedCard.id],
            }
          : null,
      };
    }
  }
  if (operation.type === 'record-observation') {
    next = {
      ...next,
      history: {
        ...next.history,
        effectObservations: [
          ...next.history.effectObservations,
          {
            window,
            key: operation.key,
            value: operation.value,
            sourceInstanceId: entry.sourceInstanceId,
            effectId: entry.effectId,
            checkpointId: next.checkpointId + 1,
          },
        ],
      },
    };
  }
  if (operation.type === 'schedule-deferred') {
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        tags: next.inventory.tags.map((tag) =>
          tag.instanceId === entry.sourceInstanceId
            ? { ...tag, consumed: false, deferredWindow: operation.window }
            : tag,
        ),
      },
    };
  }
  const catalogApplied = applyStateOperationV3(next, operation, {
    window,
    sourceInstanceId: entry.sourceInstanceId,
    effectId: entry.effectId,
    ...(entry.sourceInstanceId.startsWith('blind:') && blindDrawnCardIds !== undefined
      ? { selectedIds: blindDrawnCardIds }
      : {}),
  });
  if (!catalogApplied.ok) return catalogApplied;
  if (catalogApplied.handled) next = catalogApplied.state;
  return { ok: true, state: next, operations: [entry] };
}

export function applyRunWindowEffectsV2(
  state: RunStateV2,
  window: EffectWindow,
  options: RunWindowOptionsV2 = {},
): RunWindowResolutionV2 {
  const sources = collectSources(state, window, options);
  const resolved = resolveEffectQueue(sources, window, { state });
  if (!resolved.ok) return resolved;
  const applied = applyResolvedRunOperationsV2(
    state,
    window,
    resolved.operations,
    options.blindDrawnCardIds,
  );
  if (!applied.ok) return applied;
  let next = applied.state;
  if (options.includeDeferredTags !== false) {
    const consumedTagIds = new Set(
      state.inventory.tags
        .filter((tag) => !tag.consumed && tag.deferredWindow === window)
        .map((tag) => tag.instanceId),
    );
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        tags: next.inventory.tags.map((tag) =>
          consumedTagIds.has(tag.instanceId) && tag.deferredWindow === window
            ? { ...tag, consumed: true }
            : tag,
        ),
      },
    };
  }
  return { ok: true, state: next, operations: resolved.operations };
}

export function applyResolvedRunOperationsV2(
  state: RunStateV2,
  window: EffectWindow,
  operations: readonly ResolvedEffectOperation[],
  blindDrawnCardIds?: readonly string[],
): RunWindowResolutionV2 {
  let next = state;
  for (const entry of operations) {
    const applied = applyOperation(next, entry, window, blindDrawnCardIds);
    if (!applied.ok) return applied;
    next = applied.state;
  }
  return { ok: true, state: next, operations };
}
