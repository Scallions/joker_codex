import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { createShopV2 } from '../../src/game-core/economy/shopV2';
import { stableId } from '../../src/game-core/model/ids';
import type { OwnedConsumableV2 } from '../../src/game-core/model/runV2';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';

type CommandWithoutCheckpoint = RunCommandV2 extends infer Command
  ? Command extends RunCommandV2
    ? Omit<Command, 'checkpointId'>
    : never
  : never;

type AcceptedV5 = Extract<ReturnType<typeof executeCommandV2>, { readonly ok: true }> & {
  readonly state: RunStateV5;
};

function initial(seed: string): RunStateV5 {
  const state = createProductionRunV5(PRODUCTION_CATALOG, { seed });
  return {
    ...state,
    rules: { ...state.rules, jokerSlots: 10 },
    economy: { ...state.economy, money: 50 },
  };
}

function acquire(state: RunStateV5, ordinal: number): RunStateV5 {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, contentId, `lifecycle:${ordinal}`);
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

function command(state: RunStateV5, input: CommandWithoutCheckpoint): AcceptedV5 {
  const result = executeCommandV2(state, {
    ...input,
    checkpointId: state.checkpointId,
  });
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.rejection.message);
  }
  return result as AcceptedV5;
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

function giveConsumable(
  state: RunStateV5,
  family: 'planet' | 'tarot',
  suffix: string,
): RunStateV5 {
  const definition = state.content.items.find(
    (item) =>
      item.kind === 'consumable' && item.family === family && item.targetKind === 'none',
  );
  if (!definition || definition.kind !== 'consumable') {
    throw new Error(`缺少无目标 ${family} 消耗牌`);
  }
  const owned: OwnedConsumableV2 = {
    instanceId: stableId<'consumable-instance'>(`lifecycle:${family}:${suffix}`),
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

function enterShop(state: RunStateV5): RunStateV5 {
  const created = createShopV2(state);
  if (!created.ok) throw new Error(created.message);
  return {
    ...state,
    rngState: created.rngState,
    phase: { kind: 'shop' },
    inventory: { ...state.inventory, tags: created.tags },
    progress: { ...state.progress, anteVoucherId: created.anteVoucherId },
    shop: created.shop,
  };
}

function forcePack(
  state: RunStateV5,
  predicate: (pack: RunStateV5['content']['packs'][number]) => boolean,
): RunStateV5 {
  const definition = state.content.packs.find(predicate);
  const offer = state.shop?.packOffers[0];
  if (!definition || !offer || !state.shop) throw new Error('缺少卡包或卡包商品');
  return {
    ...state,
    shop: {
      ...state.shop,
      packOffers: [
        {
          ...offer,
          packId: definition.id,
          name: definition.name,
          description: definition.description,
          price: 0,
        },
        ...state.shop.packOffers.slice(1),
      ],
    },
  };
}

function buyFirstPack(state: RunStateV5) {
  const offer = state.shop?.packOffers[0];
  if (!offer) throw new Error('缺少卡包商品');
  return command(state, { type: 'buy-pack', offerId: offer.id });
}

describe('V5 消耗牌、卡包与换摊生命周期', () => {
  it('J055 只在成功使用星谱后成长，非星谱与减益来源均不成长', () => {
    let state = enterShop(acquire(initial('j055-consumable-used'), 55));
    state = giveConsumable(state, 'planet', 'active');
    state = command(state, {
      type: 'begin-consumable-choice',
      consumableInstanceId: state.inventory.consumables.at(-1)!.instanceId,
    }).state;
    expect(ability(state, 55, 'multFactorHundredths')).toBe(110);

    state = giveConsumable(state, 'tarot', 'wrong-family');
    state = command(state, {
      type: 'begin-consumable-choice',
      consumableInstanceId: state.inventory.consumables.at(-1)!.instanceId,
    }).state;
    expect(ability(state, 55, 'multFactorHundredths')).toBe(110);

    const source = state.inventory.jokers.find(
      (joker) => joker.contentId === 'bxqp:joker:055',
    )!;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === source.instanceId ? { ...joker, debuffed: true } : joker,
        ),
      },
    };
    state = giveConsumable(state, 'planet', 'debuffed');
    state = command(state, {
      type: 'begin-consumable-choice',
      consumableInstanceId: state.inventory.consumables.at(-1)!.instanceId,
    }).state;
    expect(ability(state, 55, 'multFactorHundredths')).toBe(110);
  });

  it('j063-pack-skip-once：每次放弃已打开卡包只成长一次，打开本身不成长', () => {
    let state = enterShop(acquire(initial('j063-pack-skip-once'), 63));
    state = forcePack(state, (pack) => pack.pickCount >= 2);
    const opened = buyFirstPack(state);
    state = opened.state;
    expect(ability(state, 63, 'storedMult')).toBe(0);
    expect(state.pendingChoice?.current).toMatchObject({
      kind: 'pack',
      remainingPicks: 2,
    });
    const choice = state.pendingChoice?.current;
    if (!choice || choice.kind !== 'pack') throw new Error('缺少卡包选择');
    const skipped = command(state, { type: 'skip-pack', choiceId: choice.id });
    state = skipped.state;

    expect(ability(state, 63, 'storedMult')).toBe(3);
    expect(skipped.domainEvents).toContainEqual({
      type: 'pack-skipped',
      packId: choice.packId,
    });
    const rejected = executeCommandV2(state, {
      type: 'skip-pack',
      checkpointId: state.checkpointId,
      choiceId: choice.id,
    });
    expect(rejected).toMatchObject({
      ok: false,
      rejection: { code: 'choice-mismatch' },
    });
    expect(ability(state, 63, 'storedMult')).toBe(3);
  });

  it('j085-capacity-before-roll：先检查容量再掷骰，成功打开生成纸术牌，跳过不再触发', () => {
    let full = acquire(initial('j085-capacity-before-roll'), 85);
    full = giveConsumable(full, 'planet', 'full-a');
    full = giveConsumable(full, 'planet', 'full-b');
    full = forcePack(enterShop(full), () => true);
    const source = full.inventory.jokers.find(
      (joker) => joker.contentId === 'bxqp:joker:085',
    )!;
    const debuffed: RunStateV5 = {
      ...full,
      inventory: {
        ...full.inventory,
        jokers: full.inventory.jokers.map((joker) =>
          joker.instanceId === source.instanceId ? { ...joker, debuffed: true } : joker,
        ),
      },
    };
    const activeFull = buyFirstPack(full).state;
    const inactiveFull = buyFirstPack(debuffed).state;
    expect(activeFull.rngState).toEqual(inactiveFull.rngState);
    expect(activeFull.materializedChoicesV3).toEqual(inactiveFull.materializedChoicesV3);
    expect(activeFull.inventory.consumables).toHaveLength(2);

    let success: RunStateV5 | null = null;
    for (let index = 0; index < 64 && !success; index += 1) {
      let candidate = enterShop(acquire(initial(`j085-open-success:${index}`), 85));
      candidate = forcePack(candidate, () => true);
      const opened = buyFirstPack(candidate).state;
      if (opened.inventory.consumables.length === 1) success = opened;
    }
    expect(success).not.toBeNull();
    if (!success) return;
    expect(success.inventory.consumables[0]?.contentId).toMatch(/^bxqp:tarot:/);
    const pack = success.pendingChoice?.current;
    if (!pack || pack.kind !== 'pack') throw new Error('缺少成功打开的卡包');
    const skipped = command(success, { type: 'skip-pack', choiceId: pack.id }).state;
    expect(skipped.inventory.consumables).toHaveLength(1);
  });

  it('免费戏签卡包也走同一个 pack-opened 事件并可触发 J085', () => {
    const freePackTag = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'tag' && row.referenceIndex === 'G10',
    );
    if (!freePackTag) throw new Error('缺少免费卡包戏签');
    let accepted: AcceptedV5 | null = null;
    for (let index = 0; index < 64 && !accepted; index += 1) {
      let state = acquire(initial(`j085-free-pack:${index}`), 85);
      state = {
        ...state,
        progress: {
          ...state.progress,
          lineup: {
            ...state.progress.lineup,
            smallTagId: freePackTag.id,
          },
        },
      };
      const result = command(state, { type: 'skip-blind', position: 'small' });
      if (result.state.inventory.consumables.length === 1) accepted = result;
    }
    expect(accepted).not.toBeNull();
    if (!accepted) return;
    const pack = accepted.state.pendingChoice?.current;
    expect(pack).toMatchObject({ kind: 'pack', returnPhase: 'blind-select' });
    if (!pack || pack.kind !== 'pack') return;
    expect(accepted.domainEvents).toContainEqual({
      type: 'pack-opened',
      packId: pack.packId,
    });
    expect(accepted.state.inventory.consumables[0]?.contentId).toMatch(/^bxqp:tarot:/);
  });

  it('j096-free-and-paid-rerolls：付费和免费成功换摊各成长一次，拒绝命令保持状态与 RNG', () => {
    let state = enterShop(acquire(initial('j096-free-and-paid-rerolls'), 96));
    const paidMoney = state.economy.money;
    state = command(state, { type: 'reroll-shop' }).state;
    expect(ability(state, 96, 'storedMult')).toBe(2);
    expect(state.economy.money).toBeLessThan(paidMoney);

    state = {
      ...state,
      shop: { ...state.shop!, freeRerollAvailable: true },
    };
    const freeMoney = state.economy.money;
    state = command(state, { type: 'reroll-shop' }).state;
    expect(ability(state, 96, 'storedMult')).toBe(4);
    expect(state.economy.money).toBe(freeMoney);

    const unaffordable: RunStateV5 = {
      ...state,
      economy: { ...state.economy, money: -state.rules.allowedDebt },
      shop: {
        ...state.shop!,
        freeRerollAvailable: false,
        rerollCost: 1,
      },
    };
    const before = structuredClone(unaffordable);
    const rejected = executeCommandV2(unaffordable, {
      type: 'reroll-shop',
      checkpointId: unaffordable.checkpointId,
    });
    expect(rejected).toMatchObject({
      ok: false,
      rejection: { code: 'insufficient-funds' },
    });
    expect(unaffordable).toEqual(before);
    expect(ability(unaffordable, 96, 'storedMult')).toBe(4);
  });
});
