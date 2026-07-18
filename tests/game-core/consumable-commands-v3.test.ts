import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { stableId } from '../../src/game-core/model/ids';
import type {
  ConsumableDefinitionV2,
  OwnedConsumableV2,
  OwnedJokerV2,
} from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';

type CommandWithoutCheckpoint = RunCommandV2 extends infer Command
  ? Command extends RunCommandV2
    ? Omit<Command, 'checkpointId'>
    : never
  : never;

function command(run: RunStateV3, input: CommandWithoutCheckpoint): RunStateV3 {
  const result = executeCommandV2(run, {
    ...input,
    checkpointId: run.checkpointId,
  });
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state as RunStateV3;
}

function definition(run: RunStateV3, contentId: string): ConsumableDefinitionV2 {
  const found = run.content.items.find(
    (item): item is ConsumableDefinitionV2 =>
      item.kind === 'consumable' && item.contentId === contentId,
  );
  if (!found) throw new Error(`测试缺少消耗牌：${contentId}`);
  return found;
}

function owned(run: RunStateV3, contentId: string, suffix = '1'): OwnedConsumableV2 {
  const item = definition(run, contentId);
  return {
    instanceId: stableId<'consumable-instance'>(`test:consumable:${contentId}:${suffix}`),
    contentId,
    name: item.name,
    description: item.description,
    baseCost: item.baseCost,
    editionCost: 0,
    editionId: null,
    effects: item.effects,
    targetKind: item.targetKind,
    minimumTargets: item.minimumTargets,
    maximumTargets: item.maximumTargets,
    sellValueOverride: null,
  };
}

function give(
  run: RunStateV3,
  contentId: string,
  suffix = String(run.checkpointId + 1),
): RunStateV3 {
  return {
    ...run,
    inventory: {
      ...run.inventory,
      consumables: [...run.inventory.consumables, owned(run, contentId, suffix)],
    },
  };
}

function shopRun(seed: string): RunStateV3 {
  return {
    ...createProductionRunV3(PRODUCTION_CATALOG, { seed }),
    phase: { kind: 'shop' },
  };
}

function roundRun(seed: string): RunStateV3 {
  const initial = createProductionRunV3(PRODUCTION_CATALOG, { seed });
  return command(initial, { type: 'select-blind', position: 'small' });
}

function giveJokers(run: RunStateV3, count: number): RunStateV3 {
  const jokers: OwnedJokerV2[] = Array.from({ length: count }, (_, index) => ({
    instanceId: stableId<'joker-instance'>(`test:consumable:joker:${index}`),
    contentId: `bxqp:joker:${String(index + 17).padStart(3, '0')}`,
    name: `试验奇牌${index + 1}`,
    description: '用于消耗牌外部能力合约。',
    baseCost: 8,
    editionCost: 0,
    editionId: null,
    effects: [],
    slotContribution: 1,
    sellValueOverride: null,
    debuffed: false,
  }));
  return {
    ...run,
    inventory: { ...run.inventory, jokers },
    modifiersV3: {
      ...run.modifiersV3,
      jokers: jokers.map((joker) => ({
        instanceId: joker.instanceId,
        stickerIds: [],
        perishableRoundsRemaining: null,
        rentalRoundCost: 0,
        saleAllowed: true,
        slotContribution: 1,
      })),
    },
  };
}

describe('V3 消耗牌公共命令合约', () => {
  it('T01 抄写最近使用的戏法或星象牌并排除自身', () => {
    let run = give(shopRun('last-use-copy'), 'bxqp:planet:solo-lantern');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });
    run = give(run, 'bxqp:tarot:afterimage');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });

    expect(run.inventory.consumables).toHaveLength(1);
    expect(run.inventory.consumables[0]?.contentId).toBe('bxqp:planet:solo-lantern');
    expect(
      run.history.effectObservations
        .filter(({ key }) => key === 'consumable-used')
        .map(({ value }) => value),
    ).toEqual(['bxqp:planet:solo-lantern', 'bxqp:tarot:afterimage']);
  });

  it('T03/T05 在来源栏位释放后只生成容量容许的数量', () => {
    let run = shopRun('capacity-up-to-two');
    run = {
      ...run,
      inventory: {
        ...run.inventory,
        consumables: [
          owned(run, 'bxqp:tarot:open-purse', 'existing'),
          owned(run, 'bxqp:tarot:star-pair', 'source'),
        ],
      },
    };
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[1]!.instanceId,
    });

    expect(run.inventory.consumables).toHaveLength(2);
    expect(
      run.inventory.consumables.filter(({ contentId }) =>
        contentId.startsWith('bxqp:planet:'),
      ),
    ).toHaveLength(1);
  });

  it('T12 的“至多两张”允许只选一张并记录使用历史', () => {
    let run = give(shopRun('up-to-two-targets'), 'bxqp:tarot:turning-rank');
    const card = run.deck.cards.find(({ rank }) => rank === 'king')!;
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });
    expect(run.pendingChoice?.current).toMatchObject({
      kind: 'targets',
      minimumTargets: 1,
      maximumTargets: 2,
    });
    run = command(run, {
      type: 'toggle-choice-target',
      choiceId: run.pendingChoice!.current.id,
      targetId: card.id,
    });
    run = command(run, {
      type: 'confirm-choice',
      choiceId: run.pendingChoice!.current.id,
    });

    expect(run.deck.cards.find(({ id }) => id === card.id)?.rank).toBe('ace');
    expect(run.history.effectObservations.at(-1)).toMatchObject({
      key: 'consumable-used',
      value: 'bxqp:tarot:turning-rank',
    });
  });

  it('X01 原子销毁一张持牌并物化三张随机增强人头牌', () => {
    let run = give(roundRun('enhanced-face-generation'), 'bxqp:spectral:court-casting');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });
    const generated = run.deck.cards.filter(({ id }) =>
      id.startsWith('playing:created:'),
    );

    expect(run.deck.cards).toHaveLength(54);
    expect(generated).toHaveLength(3);
    expect(
      generated.every(
        ({ rank, enhancementId }) =>
          ['jack', 'queen', 'king'].includes(rank) && enhancementId !== null,
      ),
    ).toBe(true);
    const choice = run.materializedChoicesV3.at(-1);
    expect(choice?.kind).toBe('created-playing-cards');
    expect(Array.isArray(choice?.valueNumbers)).toBe(true);
  });

  it('X07 只统一当前持牌花色，不改动牌堆其他区域', () => {
    let run = roundRun('held-suit-transform');
    const heldIds = new Set(run.round!.handIds);
    const outsideBefore = run.deck.cards
      .filter(({ id }) => !heldIds.has(id))
      .map(({ id, suit }) => [id, suit]);
    run = give(run, 'bxqp:spectral:one-suit-night');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });

    expect(
      new Set(run.deck.cards.filter(({ id }) => heldIds.has(id)).map(({ suit }) => suit)),
    ).toHaveLength(1);
    expect(
      run.deck.cards
        .filter(({ id }) => !heldIds.has(id))
        .map(({ id, suit }) => [id, suit]),
    ).toEqual(outsideBefore);
  });

  it('X09 每次使用按一加既往次数累计缩手并只命中基础版本奇牌', () => {
    let run = giveJokers(shopRun('cumulative-shadow-cut'), 2);
    run = give(run, 'bxqp:spectral:shadow-cut', 'first');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });
    run = give(run, 'bxqp:spectral:shadow-cut', 'second');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });

    expect(run.rules.handSize).toBe(5);
    expect(
      run.inventory.jokers.filter(
        ({ editionId }) => editionId === 'bxqp:edition:shadow-cutout',
      ),
    ).toHaveLength(2);
    expect(
      run.inventory.jokers.every(({ slotContribution }) => slotContribution === 0),
    ).toBe(true);
  });

  it('T11 一进四概率与条件版本权重按种子可重放', () => {
    const outcomes = Array.from({ length: 24 }, (_, index) => {
      let run = giveJokers(shopRun(`three-lights-${index}`), 1);
      run = give(run, 'bxqp:tarot:three-lights');
      run = command(run, {
        type: 'begin-consumable-choice',
        consumableInstanceId: run.inventory.consumables[0]!.instanceId,
      });
      return {
        editionId: run.inventory.jokers[0]?.editionId ?? null,
        choice: run.materializedChoicesV3.at(-1),
      };
    });
    const applied = outcomes.filter(({ editionId }) => editionId !== null);

    expect(applied.length).toBeGreaterThan(0);
    expect(applied.length).toBeLessThan(outcomes.length);
    expect(
      applied.every(({ editionId }) =>
        [
          'bxqp:edition:gilt-edge',
          'bxqp:edition:phantom-ink',
          'bxqp:edition:rainbow-lacquer',
        ].includes(editionId!),
      ),
    ).toBe(true);
    expect(outcomes.every(({ choice }) => choice?.kind === 'card-modifier-roll')).toBe(
      true,
    );
  });
});
