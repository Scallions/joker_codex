import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { createShopV2 } from '../../src/game-core/economy/shopV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { validateRunStateV4 } from '../../src/game-core/invariants/validateRunStateV4';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';
import {
  canAffordRunStateV3,
  resolveJokerPassiveCapabilities,
} from '../../src/game-core/rules/jokerPassiveCapabilitiesV3';

function acquire(run: RunStateV4, contentId: string, index: number): RunStateV4 {
  const result = acquireContentByIdV3(run, contentId, `passive:${contentId}:${index}`);
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '获得奇牌后没有保持 V4' : result.message);
  }
  return result.state;
}

describe('奇牌通用被动能力', () => {
  it('J018/J030/J037 幂等，J020 按活跃原件逐张叠加', () => {
    let run = createProductionRunV4(PRODUCTION_CATALOG, { seed: 'passive-fold' });
    run = acquire(run, 'bxqp:joker:018', 0);
    run = acquire(run, 'bxqp:joker:018', 1);
    run = acquire(run, 'bxqp:joker:020', 2);
    run = acquire(run, 'bxqp:joker:020', 3);
    run = acquire(run, 'bxqp:joker:030', 4);
    run = {
      ...run,
      rules: { ...run.rules, jokerSlots: 6 },
    };
    run = acquire(run, 'bxqp:joker:037', 5);
    const resolved = resolveJokerPassiveCapabilities(run);

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.capabilities).toEqual({
      straightSize: 4,
      flushSize: 4,
      allowedDebt: 40,
      freeRerollPerShop: true,
      allCardsFace: true,
    });
    expect(
      canAffordRunStateV3({ ...run, economy: { ...run.economy, money: 0 } }, 40),
    ).toBe(true);
    expect(
      canAffordRunStateV3({ ...run, economy: { ...run.economy, money: 0 } }, 41),
    ).toBe(false);
  });

  it('减益或移除来源会影响下一次查询，但既有负余额仍是有效状态', () => {
    let run = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'passive-live-query',
    });
    run = acquire(run, 'bxqp:joker:020', 0);
    run = acquire(run, 'bxqp:joker:020', 1);
    const firstId = run.inventory.jokers[0]!.instanceId;
    const secondId = run.inventory.jokers[1]!.instanceId;
    const changed: RunStateV4 = {
      ...run,
      economy: { ...run.economy, money: -35 },
      inventory: {
        ...run.inventory,
        jokers: run.inventory.jokers
          .filter(({ instanceId }) => instanceId !== secondId)
          .map((joker) =>
            joker.instanceId === firstId ? { ...joker, debuffed: true } : joker,
          ),
      },
      modifiersV3: {
        ...run.modifiersV3,
        jokers: run.modifiersV3.jokers.filter(
          ({ instanceId }) => instanceId !== secondId,
        ),
      },
    };
    const resolved = resolveJokerPassiveCapabilities(changed);

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.capabilities.allowedDebt).toBe(0);
    expect(canAffordRunStateV3(changed, 0)).toBe(false);
    expect(validateRunStateV4(changed)).toEqual({ ok: true });
  });

  it('J020 权限进入真实换摊支付，J030 在每次新夜市只提供一次免费换摊', () => {
    let debtRun = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'passive-debt-command',
    });
    debtRun = acquire(debtRun, 'bxqp:joker:020', 0);
    const debtShop = createShopV2(debtRun);
    expect(debtShop.ok).toBe(true);
    if (!debtShop.ok) return;
    const debtState: RunStateV4 = {
      ...debtRun,
      phase: { kind: 'shop' },
      shop: debtShop.shop,
      rngState: debtShop.rngState,
      economy: { ...debtRun.economy, money: 0 },
    };
    const paidReroll = executeCommandV2(debtState, {
      type: 'reroll-shop',
      checkpointId: debtState.checkpointId,
    });
    expect(paidReroll.ok).toBe(true);
    if (!paidReroll.ok) return;
    expect(paidReroll.state.economy.money).toBe(-debtShop.shop.rerollCost);

    let freeRun = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'passive-free-reroll-command',
    });
    freeRun = acquire(freeRun, 'bxqp:joker:030', 0);
    const freeShop = createShopV2(freeRun);
    expect(freeShop.ok).toBe(true);
    if (!freeShop.ok) return;
    expect(freeShop.shop.freeRerollAvailable).toBe(true);
    const freeState: RunStateV4 = {
      ...freeRun,
      phase: { kind: 'shop' },
      shop: freeShop.shop,
      rngState: freeShop.rngState,
      economy: { ...freeRun.economy, money: 0 },
    };
    const freeReroll = executeCommandV2(freeState, {
      type: 'reroll-shop',
      checkpointId: freeState.checkpointId,
    });
    expect(freeReroll.ok).toBe(true);
    if (!freeReroll.ok || !freeReroll.state.shop) return;
    expect(freeReroll.domainEvents).toContainEqual({ type: 'shop-rerolled', cost: 0 });
    expect(freeReroll.state.shop.freeRerollAvailable).toBe(false);
  });
});
