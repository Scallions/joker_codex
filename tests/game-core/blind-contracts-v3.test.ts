import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { stableId, type CardId } from '../../src/game-core/model/ids';
import type { OwnedJokerV2 } from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';
import { materializeBlind } from '../../src/game-core/rules/ante';

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

function blindReady(referenceIndex: string, seed = referenceIndex): RunStateV3 {
  const run = createProductionRunV3(PRODUCTION_CATALOG, { seed });
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) =>
      candidate.family === 'blind' && candidate.referenceIndex === referenceIndex,
  );
  const blind = run.content.blinds.find((candidate) => candidate.id === row?.id);
  if (!blind) throw new Error(`测试缺少盲注：${referenceIndex}`);
  return {
    ...run,
    progress: {
      ...run.progress,
      blindPosition: 'boss',
      lineup: { ...run.progress.lineup, boss: materializeBlind(blind) },
    },
  };
}

function startBlind(referenceIndex: string, seed = referenceIndex): RunStateV3 {
  return command(blindReady(referenceIndex, seed), {
    type: 'select-blind',
    position: 'boss',
  });
}

function play(run: RunStateV3, cardIds: readonly CardId[]): RunStateV3 {
  for (const cardId of cardIds) {
    run = command(run, { type: 'toggle-card', cardId });
  }
  return command(run, { type: 'play-selected' });
}

function joker(index: number): OwnedJokerV2 {
  return {
    instanceId: stableId<'joker-instance'>(`test:blind:joker:${index}`),
    contentId: `bxqp:joker:${String(index).padStart(3, '0')}`,
    name: `试演奇牌${index}`,
    description: '仅用于盲注跨目录合约测试。',
    baseCost: 6,
    editionCost: 0,
    editionId: null,
    effects: [],
    slotContribution: 1,
    sellValueOverride: null,
    debuffed: false,
  };
}

function withJokers(run: RunStateV3, count: number): RunStateV3 {
  const jokers = Array.from({ length: count }, (_, index) => joker(index + 1));
  return {
    ...run,
    inventory: { ...run.inventory, jokers },
    modifiersV3: {
      ...run.modifiersV3,
      jokers: jokers.map((owned) => ({
        instanceId: owned.instanceId,
        stickerIds: [],
        perishableRoundsRemaining: null,
        rentalRoundCost: 0,
        saleAllowed: true,
        slotContribution: 1,
      })),
    },
  };
}

describe('V3 完整盲注公共命令合约', () => {
  it('开场资源与当前盲注手牌尺寸不会污染永久规则', () => {
    const dry = startBlind('B13');
    const tight = startBlind('B15');

    expect(dry.round?.discardsRemaining).toBe(0);
    expect(tight.round?.handIds).toHaveLength(tight.rules.handSize - 1);
    expect(tight.rules.handSize).toBe(8);
  });

  it('每次动作固定抽三张而不是把整手裁成三张', () => {
    let run = startBlind('B19');
    expect(run.round?.handIds).toHaveLength(8);
    const drawPileBefore = run.round!.drawPileIds.length;
    run = play(run, [run.round!.handIds[0]!]);

    expect(run.round?.handIds).toHaveLength(10);
    expect(run.round?.drawPileIds).toHaveLength(drawPileBefore - 3);
  });

  it('随机覆面只为本次抽牌逐张物化一次独立掷骰', () => {
    let run = startBlind('B07', 'turning-wheel-replay');
    const firstRoll = run.materializedChoicesV3.at(-1);
    expect(firstRoll).toMatchObject({ kind: 'blind-face-down-rolls' });
    expect(firstRoll?.valueNumbers).toHaveLength(8);

    run = play(run, [run.round!.handIds[0]!]);
    const replacementRoll = run.materializedChoicesV3.at(-1);
    expect(replacementRoll).toMatchObject({ kind: 'blind-face-down-rolls' });
    expect(replacementRoll?.valueNumbers).toHaveLength(1);
  });

  it('出牌后的补牌可全部覆面，且覆面人头牌只命中人头牌', () => {
    let covered = startBlind('B10');
    const replacementIds = covered.round!.drawPileIds.slice(0, 2);
    covered = play(covered, covered.round!.handIds.slice(0, 2));
    expect(new Set(covered.round?.faceDownCardIds)).toEqual(new Set(replacementIds));

    const masked = startBlind('B25');
    const cardMap = new Map(masked.deck.cards.map((card) => [card.id, card]));
    expect(
      masked.round?.faceDownCardIds.every((id) => {
        const rank = cardMap.get(id)?.rank;
        return rank === 'jack' || rank === 'queen' || rank === 'king';
      }),
    ).toBe(true);
  });

  it('随机弃两张持牌会提交区域变化与可重放选择', () => {
    let run = startBlind('B03', 'hook-master-replay');
    run = play(run, [run.round!.handIds[0]!]);

    expect(run.round?.handIds).toHaveLength(6);
    const choice = run.materializedChoicesV3.at(-1);
    expect(choice?.kind).toBe('blind-random-held-discard');
    expect(choice?.valueIds).toHaveLength(2);
    expect(choice?.valueIds.every((id) => typeof id === 'string')).toBe(true);
  });

  it('最常用牌型清零戏票，逐张费用不会越过允许欠票边界', () => {
    let ox = startBlind('B04');
    ox = { ...ox, economy: { ...ox.economy, money: 10 } };
    ox = play(ox, [ox.round!.handIds[0]!]);
    expect(ox.economy.money).toBe(0);

    let tooth = startBlind('B23');
    tooth = { ...tooth, economy: { ...tooth.economy, money: 2 } };
    tooth = play(tooth, tooth.round!.handIds.slice(0, 3));
    expect(tooth.economy.money).toBe(0);
  });

  it('压轴盲注物化奇牌顺序、售牌解禁与逐手禁用', () => {
    const reordered = command(withJokers(blindReady('B26'), 3), {
      type: 'select-blind',
      position: 'boss',
    });
    const reorderChoice = reordered.materializedChoicesV3.at(-1);
    expect(reorderChoice?.kind).toBe('blind-joker-order');
    expect(new Set(reorderChoice?.valueIds)).toEqual(
      new Set(['test:blind:joker:1', 'test:blind:joker:2', 'test:blind:joker:3']),
    );

    let saleBell = command(withJokers(blindReady('B27'), 1), {
      type: 'select-blind',
      position: 'boss',
    });
    expect(saleBell.modifiersV3.playingCards.every(({ debuffed }) => debuffed)).toBe(
      true,
    );
    saleBell = command(saleBell, {
      type: 'sell-joker',
      jokerInstanceId: saleBell.inventory.jokers[0]!.instanceId,
    });
    expect(saleBell.modifiersV3.playingCards.every(({ debuffed }) => !debuffed)).toBe(
      true,
    );

    let spotlight = command(withJokers(blindReady('B29'), 3), {
      type: 'select-blind',
      position: 'boss',
    });
    expect(spotlight.inventory.jokers.filter(({ debuffed }) => debuffed)).toHaveLength(1);
    spotlight = play(spotlight, [spotlight.round!.handIds[0]!]);
    expect(spotlight.inventory.jokers.filter(({ debuffed }) => debuffed)).toHaveLength(1);
    expect(spotlight.materializedChoicesV3.at(-1)?.kind).toBe('blind-disabled-joker');
  });

  it('强制留选牌可被弃掉并立即重新物化下一张', () => {
    let run = startBlind('B30', 'held-thread-replay');
    const first = run.round!.forcedSelectedCardIds[0];
    expect(first).toBeDefined();
    run = command(run, { type: 'discard-selected' });

    expect(run.round?.discardPileIds).toContain(first);
    expect(run.round?.forcedSelectedCardIds).toHaveLength(1);
    expect(run.round?.forcedSelectedCardIds[0]).not.toBe(first);
    expect(run.materializedChoicesV3.at(-1)?.kind).toBe('blind-forced-card');
  });
});
