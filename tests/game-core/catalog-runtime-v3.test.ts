import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { stableId } from '../../src/game-core/model/ids';
import type {
  ConsumableDefinitionV2,
  JokerDefinitionV2,
  OwnedConsumableV2,
} from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';

function ownedConsumable(run: RunStateV3, contentId: string): OwnedConsumableV2 {
  const definition = run.content.items.find(
    (item): item is ConsumableDefinitionV2 =>
      item.kind === 'consumable' && item.contentId === contentId,
  );
  if (!definition) throw new Error(`测试缺少消耗牌：${contentId}`);
  return {
    instanceId: stableId<'consumable-instance'>(`test:owned:${contentId}`),
    contentId,
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
}

function giveConsumable(run: RunStateV3, contentId: string): RunStateV3 {
  return {
    ...run,
    inventory: {
      ...run.inventory,
      consumables: [ownedConsumable(run, contentId)],
    },
  };
}

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

function shopReady(contentId: string, seed = contentId): RunStateV3 {
  return {
    ...giveConsumable(createProductionRunV3(PRODUCTION_CATALOG, { seed }), contentId),
    phase: { kind: 'shop' },
  };
}

describe('V3 目录效果走公共命令边界', () => {
  it('花色改造经目标帧原子确认并同步修饰镜像', () => {
    let run = shopReady('bxqp:tarot:heart-turn');
    const targetIds = run.deck.cards.slice(0, 3).map(({ id }) => id);
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });
    expect(run.pendingChoice?.current).toMatchObject({
      kind: 'targets',
      minimumTargets: 1,
      maximumTargets: 3,
    });
    for (const targetId of targetIds) {
      run = command(run, {
        type: 'toggle-choice-target',
        choiceId: run.pendingChoice!.current.id,
        targetId,
      });
    }
    run = command(run, {
      type: 'confirm-choice',
      choiceId: run.pendingChoice!.current.id,
    });

    expect(
      run.deck.cards
        .filter(({ id }) => targetIds.includes(id))
        .every(({ suit }) => suit === 'hearts'),
    ).toBe(true);
    expect(run.inventory.consumables).toEqual([]);
    expect(run.modifiersV3.playingCards).toHaveLength(52);
  });

  it('双目标镜写复制完整牌面但保留左侧实例 ID', () => {
    let run = shopReady('bxqp:tarot:mirror-transfer');
    const left = run.deck.cards[0]!;
    const right = {
      ...run.deck.cards[1]!,
      enhancementId: 'bxqp:enhancement:glass-ribbon',
      sealId: 'bxqp:seal:echo-knot',
      editionId: 'bxqp:edition:gilt-edge',
      bonusChips: 17,
    };
    run = {
      ...run,
      deck: {
        cards: run.deck.cards.map((card) => (card.id === right.id ? right : card)),
      },
    };
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });
    for (const targetId of [left.id, right.id]) {
      run = command(run, {
        type: 'toggle-choice-target',
        choiceId: run.pendingChoice!.current.id,
        targetId,
      });
    }
    run = command(run, {
      type: 'confirm-choice',
      choiceId: run.pendingChoice!.current.id,
    });

    expect(run.deck.cards.find(({ id }) => id === left.id)).toEqual({
      ...right,
      id: left.id,
    });
  });

  it('生成两张星象牌时先释放来源栏位且不越过容量', () => {
    let run = shopReady('bxqp:tarot:star-pair');
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });

    expect(run.inventory.consumables).toHaveLength(2);
    expect(
      run.inventory.consumables.every(({ contentId }) =>
        contentId.startsWith('bxqp:planet:'),
      ),
    ).toBe(true);
    expect(
      new Set(run.inventory.consumables.map(({ contentId }) => contentId)).size,
    ).toBe(2);
  });

  it('随机持牌销毁与奖金由同一检查点提交并可种子重放', () => {
    const play = () => {
      let run = createProductionRunV3(PRODUCTION_CATALOG, {
        seed: 'five-for-twenty-runtime',
      });
      run = command(run, { type: 'select-blind', position: 'small' });
      run = giveConsumable(run, 'bxqp:spectral:five-for-twenty');
      return command(run, {
        type: 'begin-consumable-choice',
        consumableInstanceId: run.inventory.consumables[0]!.instanceId,
      });
    };
    const first = play();
    const replay = play();

    expect(first.deck.cards).toHaveLength(47);
    expect(first.economy.money).toBe(24);
    expect(first).toEqual(replay);
  });

  it('高阶注生成的外部奇牌保存三次独立贴签掷骰', () => {
    const testJoker: JokerDefinitionV2 = {
      kind: 'joker',
      contentId: 'bxqp:joker:019',
      name: '测试稀有奇牌',
      description: '仅用于验证跨子任务能力合约。',
      baseCost: 8,
      weightUnits: 100,
      effects: [],
      targetKind: 'none',
      minimumTargets: 0,
      maximumTargets: 0,
      rarity: 'rare',
      slotContribution: 1,
    };
    let run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'sticker-materialization',
      stakeId: 'bxqp:stake:borrowed-mask',
    });
    run = {
      ...giveConsumable(run, 'bxqp:spectral:rare-mask'),
      phase: { kind: 'shop' },
      content: { ...run.content, items: [...run.content.items, testJoker] },
    };
    run = command(run, {
      type: 'begin-consumable-choice',
      consumableInstanceId: run.inventory.consumables[0]!.instanceId,
    });

    expect(run.inventory.jokers).toHaveLength(1);
    expect(run.inventory.jokers[0]?.contentId).toBe(testJoker.contentId);
    expect(run.economy.money).toBe(0);
    expect(run.modifiersV3.jokers).toHaveLength(1);
    const choice = run.materializedChoicesV3.at(-1);
    expect(choice?.kind).toBe('joker-sticker-roll');
    expect(choice?.valueNumbers).toHaveLength(3);
    expect(choice?.valueNumbers.every((value) => Number.isFinite(value))).toBe(true);
  });
});
