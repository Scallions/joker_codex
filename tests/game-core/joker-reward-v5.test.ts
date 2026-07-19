import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { saleValue } from '../../src/game-core/economy/pricing';
import { stableId } from '../../src/game-core/model/ids';
import type { OwnedConsumableV2 } from '../../src/game-core/model/runV2';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';

type CommandWithoutCheckpoint = RunCommandV2 extends infer Command
  ? Command extends RunCommandV2
    ? Omit<Command, 'checkpointId'>
    : never
  : never;

function initial(seed: string): RunStateV5 {
  const state = createProductionRunV5(PRODUCTION_CATALOG, { seed });
  return {
    ...state,
    rules: { ...state.rules, jokerSlots: 12 },
    economy: { ...state.economy, money: 10 },
  };
}

function acquire(
  state: RunStateV5,
  ordinal: number,
  suffix = String(state.inventory.jokers.length),
): RunStateV5 {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, contentId, `reward:${ordinal}:${suffix}`);
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

function command(state: RunStateV5, input: CommandWithoutCheckpoint): RunStateV5 {
  const result = executeCommandV2(state, {
    ...input,
    checkpointId: state.checkpointId,
  });
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.rejection.message);
  }
  return result.state;
}

function ability(state: RunStateV5, ordinal: number, key: string): unknown {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const joker = state.inventory.jokers.find(
    (candidate) => candidate.contentId === contentId,
  );
  return state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === joker?.instanceId,
  )?.abilityState[key];
}

function winCurrentRound(state: RunStateV5): RunStateV5 {
  let round = command(state, {
    type: 'select-blind',
    position: state.progress.blindPosition,
  });
  const cardId = round.round?.handIds[0];
  if (!cardId || !round.round) throw new Error('缺少获胜手牌');
  round = {
    ...round,
    round: { ...round.round, targetScore: 1, selectedCardIds: [cardId] },
  };
  return command(round, { type: 'play-selected' });
}

function giveConsumable(state: RunStateV5): RunStateV5 {
  const definition = state.content.items.find(
    (item) => item.kind === 'consumable' && item.family === 'tarot',
  );
  if (!definition || definition.kind !== 'consumable') {
    throw new Error('缺少纸术牌定义');
  }
  const owned: OwnedConsumableV2 = {
    instanceId: stableId<'consumable-instance'>('reward:consumable'),
    contentId: definition.contentId,
    name: definition.name,
    description: definition.description,
    baseCost: definition.baseCost,
    editionCost: 0,
    editionId: null,
    effects: definition.effects,
    targetKind: definition.targetKind,
    minimumTargets: definition.minimumTargets,
    maximumTargets: definition.maximumTargets,
    sellValueOverride: null,
  };
  return {
    ...state,
    inventory: {
      ...state.inventory,
      consumables: [...state.inventory.consumables, owned],
    },
  };
}

describe('V5 回合结算与赏银事务', () => {
  it('j074-boss-grow-before-pay / j079-all-inventory-values：Boss 先成长再付款并统一结算售价、衰减与额外利钱', () => {
    let state = initial('j074-boss-grow-before-pay');
    state = {
      ...state,
      progress: { ...state.progress, blindPosition: 'boss' },
    };
    for (const ordinal of [73, 74, 79, 80, 84, 90, 97, 52]) {
      state = acquire(state, ordinal);
    }
    state = giveConsumable(state);
    const debuffedTarget = state.inventory.jokers.find(
      (joker) => joker.contentId === 'bxqp:joker:052',
    )!;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === debuffedTarget.instanceId
            ? { ...joker, debuffed: true }
            : joker,
        ),
      },
    };
    const moneyBefore = state.economy.money;
    const printedNines = state.deck.cards.filter((card) => card.rank === '9').length;
    const targetSellBefore = saleValue(
      debuffedTarget.baseCost,
      debuffedTarget.editionCost,
      state.rules.priceDiscountBasisPoints,
      debuffedTarget.sellValueOverride,
    );
    const consumable = state.inventory.consumables[0]!;
    const consumableSellBefore = saleValue(
      consumable.baseCost,
      consumable.editionCost,
      state.rules.priceDiscountBasisPoints,
      consumable.sellValueOverride,
    );

    const rewarded = winCurrentRound(state);

    expect(rewarded.phase.kind).toBe('round-reward');
    expect(ability(rewarded, 74, 'roundPayout')).toBe(3);
    expect(rewarded.economy.money).toBe(moneyBefore + printedNines + 3 + 4);
    expect(ability(rewarded, 80, 'handSizeBonus')).toBe(4);
    expect(ability(rewarded, 97, 'storedMult')).toBe(16);
    expect(
      rewarded.inventory.jokers.find(
        (joker) => joker.instanceId === debuffedTarget.instanceId,
      )?.sellValueOverride,
    ).toBe(targetSellBefore + 1);
    expect(rewarded.inventory.consumables[0]?.sellValueOverride).toBe(
      consumableSellBefore + 1,
    );
    const postEffectMoney = rewarded.economy.money;
    const expectedInterest = Math.min(
      rewarded.rules.interestCap,
      Math.floor(Math.max(0, postEffectMoney) / rewarded.rules.interestStep) *
        rewarded.rules.interestRate,
    );
    expect(rewarded.economy.pendingReward?.interestReward).toBe(expectedInterest);
    expect(rewarded.economy.pendingReward?.effectLines).toContainEqual(
      expect.objectContaining({ label: '月息算盘', amount: expectedInterest }),
    );
  });

  it('减益 J074 在 Boss 回合既不成长也不付款', () => {
    let state = acquire(initial('j074-debuffed-boss'), 74);
    state = {
      ...state,
      progress: { ...state.progress, blindPosition: 'boss' },
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    const money = state.economy.money;
    const rewarded = winCurrentRound(state);

    expect(ability(rewarded, 74, 'roundPayout')).toBe(1);
    expect(rewarded.economy.money).toBe(money);
  });

  it('j084-interest-components：多个来源按结算后金额单独封顶，减益与负债不产生额外利钱', () => {
    let state = initial('j084-interest-components');
    state = { ...state, economy: { ...state.economy, money: 26 } };
    state = acquire(acquire(state, 84, 'left'), 84, 'right');
    let rewarded = winCurrentRound(state);
    const lines = rewarded.economy.pendingReward?.effectLines.filter(
      (line) => line.label === '月息算盘',
    );
    expect(rewarded.economy.pendingReward?.interestReward).toBe(5);
    expect(lines).toHaveLength(2);
    expect(lines?.map((line) => line.amount)).toEqual([5, 5]);

    let debt = initial('j084-negative-money');
    debt = {
      ...debt,
      rules: { ...debt.rules, allowedDebt: 10 },
      economy: { ...debt.economy, money: -5 },
    };
    debt = acquire(debt, 84);
    debt = {
      ...debt,
      inventory: {
        ...debt.inventory,
        jokers: debt.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    rewarded = winCurrentRound(debt);
    expect(rewarded.economy.pendingReward?.interestReward).toBe(0);
    expect(
      rewarded.economy.pendingReward?.effectLines.filter(
        (line) => line.label === '月息算盘',
      ),
    ).toHaveLength(0);
  });

  it('j097-five-round-lifetime：五次真实回合结算按 20→16→12→8→4→销毁', () => {
    let state = acquire(initial('j097-five-round-lifetime'), 97);
    const sourceId = state.inventory.jokers.find(
      (joker) => joker.contentId === 'bxqp:joker:097',
    )!.instanceId;
    const expected = [16, 12, 8, 4] as const;
    for (const value of expected) {
      state = winCurrentRound(state);
      expect(ability(state, 97, 'storedMult')).toBe(value);
      state = command(state, { type: 'claim-round-reward' });
      state = command(state, { type: 'leave-shop' });
    }
    state = winCurrentRound(state);
    expect(
      state.inventory.jokers.some((joker) => joker.contentId === 'bxqp:joker:097'),
    ).toBe(false);
    expect(
      state.modifiersV3.jokers.some((modifier) => modifier.instanceId === sourceId),
    ).toBe(false);
  });
});
