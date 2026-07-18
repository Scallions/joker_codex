import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunStateV3 } from '../../src/game-core/model/runV3';

type ModifierFamily = 'enhancementId' | 'sealId' | 'editionId';

function roundRun(seed = 'modifier-score'): RunStateV3 {
  const initial = createProductionRunV3(PRODUCTION_CATALOG, { seed });
  const selected = executeCommandV2(initial, {
    type: 'select-blind',
    checkpointId: initial.checkpointId,
    position: 'small',
  });
  if (!selected.ok) throw new Error(selected.rejection.message);
  return selected.state as RunStateV3;
}

function modifyCard(
  run: RunStateV3,
  cardId: CardId,
  family: ModifierFamily,
  modifierId: string,
): RunStateV3 {
  return {
    ...run,
    deck: {
      cards: run.deck.cards.map((card) =>
        card.id === cardId ? { ...card, [family]: modifierId } : card,
      ),
    },
    modifiersV3: {
      ...run.modifiersV3,
      playingCards: run.modifiersV3.playingCards.map((modifier) =>
        modifier.cardId === cardId
          ? {
              ...modifier,
              [family]: modifierId,
            }
          : modifier,
      ),
    },
  };
}

function scoreOne(run: RunStateV3, cardId: CardId) {
  const card = run.deck.cards.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error('测试牌不存在');
  const resolution = resolveHandScoreV2(run, [card]);
  if (!resolution.ok) throw new Error(resolution.message);
  return resolution;
}

describe('V3 牌面修饰结算', () => {
  it('E01/E02/E06 与 N02/N03/N04 按固定层次改变 Chips 和 Mult', () => {
    const run = roundRun();
    const cardId = run.round!.handIds[0]!;
    const baseline = scoreOne(run, cardId).breakdown;
    const cases = [
      [
        'enhancementId',
        'bxqp:enhancement:brass-inlay',
        baseline.cardChips + 30,
        baseline.multiplier,
      ],
      [
        'enhancementId',
        'bxqp:enhancement:red-ink',
        baseline.cardChips,
        baseline.multiplier + 4,
      ],
      ['enhancementId', 'bxqp:enhancement:stone-mask', 50, baseline.multiplier],
      [
        'editionId',
        'bxqp:edition:gilt-edge',
        baseline.cardChips + 50,
        baseline.multiplier,
      ],
      [
        'editionId',
        'bxqp:edition:phantom-ink',
        baseline.cardChips,
        baseline.multiplier + 10,
      ],
      [
        'editionId',
        'bxqp:edition:rainbow-lacquer',
        baseline.cardChips,
        baseline.multiplier * 1.5,
      ],
    ] as const;

    for (const [family, modifierId, cardChips, multiplier] of cases) {
      const score = scoreOne(
        modifyCard(run, cardId, family, modifierId),
        cardId,
      ).breakdown;
      expect(score.cardChips, modifierId).toBe(cardChips);
      expect(score.multiplier, modifierId).toBe(multiplier);
    }
  });

  it('L01 加钱、L02 重演一次，E08 两次独立概率按种子重放', () => {
    const run = roundRun('modifier-random-replay');
    const cardId = run.round!.handIds[0]!;
    const baseline = scoreOne(run, cardId);
    const coin = scoreOne(
      modifyCard(run, cardId, 'sealId', 'bxqp:seal:coin-seal'),
      cardId,
    );
    const echo = scoreOne(
      modifyCard(run, cardId, 'sealId', 'bxqp:seal:echo-knot'),
      cardId,
    );
    const luckyRun = modifyCard(
      run,
      cardId,
      'enhancementId',
      'bxqp:enhancement:lucky-knot',
    );
    const lucky = scoreOne(luckyRun, cardId);
    const replay = scoreOne(luckyRun, cardId);

    expect(coin.moneyDelta).toBe(3);
    expect(echo.breakdown.cardChips).toBe(baseline.breakdown.cardChips * 2);
    expect(echo.breakdown.trace.some((line) => line.startsWith('retrigger:'))).toBe(true);
    expect(lucky.modifierRolls).toHaveLength(2);
    expect(lucky).toEqual(replay);
  });

  it('被减益的牌保留身份但不执行计分修饰', () => {
    const run = roundRun('modifier-debuff');
    const cardId = run.round!.handIds[0]!;
    const modified = modifyCard(
      run,
      cardId,
      'enhancementId',
      'bxqp:enhancement:brass-inlay',
    );
    const debuffed: RunStateV3 = {
      ...modified,
      modifiersV3: {
        ...modified.modifiersV3,
        playingCards: modified.modifiersV3.playingCards.map((entry) =>
          entry.cardId === cardId ? { ...entry, debuffed: true } : entry,
        ),
      },
    };
    const score = scoreOne(debuffed, cardId).breakdown;

    expect(score.cardChips).toBe(0);
    expect(score.trace).toContain(`card:${cardId}:debuffed`);
  });

  it('C10 已计分牌在成功命令后写入减益镜像', () => {
    const challenge = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-echo-seal',
      challengeId: 'bxqp:challenge:echoing-seal',
    });
    const selected = executeCommandV2(challenge, {
      type: 'select-blind',
      checkpointId: challenge.checkpointId,
      position: 'small',
    });
    if (!selected.ok) throw new Error(selected.rejection.message);
    const run = selected.state as RunStateV3;
    const cardId = run.round!.handIds[0]!;
    const toggled = executeCommandV2(run, {
      type: 'toggle-card',
      checkpointId: run.checkpointId,
      cardId,
    });
    if (!toggled.ok) throw new Error(toggled.rejection.message);
    const played = executeCommandV2(toggled.state, {
      type: 'play-selected',
      checkpointId: toggled.state.checkpointId,
    });
    if (!played.ok) throw new Error(played.rejection.message);
    const next = played.state as RunStateV3;

    expect(
      next.modifiersV3.playingCards.find((entry) => entry.cardId === cardId)?.debuffed,
    ).toBe(true);
  });

  it('E07 与 L03 在回合末仅按留手牌结算并生成最终牌型星象牌', () => {
    const playWinningHand = (modifierId: string, family: ModifierFamily) => {
      let run = roundRun(`round-end-${modifierId}`);
      const playedId = run.round!.handIds[0]!;
      const heldId = run.round!.handIds[1]!;
      run = modifyCard(run, heldId, family, modifierId);
      run = {
        ...run,
        round: { ...run.round!, targetScore: 1 },
      };
      const toggled = executeCommandV2(run, {
        type: 'toggle-card',
        checkpointId: run.checkpointId,
        cardId: playedId,
      });
      if (!toggled.ok) throw new Error(toggled.rejection.message);
      const played = executeCommandV2(toggled.state, {
        type: 'play-selected',
        checkpointId: toggled.state.checkpointId,
      });
      if (!played.ok) throw new Error(played.rejection.message);
      return played.state as RunStateV3;
    };

    const gold = playWinningHand('bxqp:enhancement:gold-leaf', 'enhancementId');
    const star = playWinningHand('bxqp:seal:star-seal', 'sealId');

    expect(gold.economy.money).toBe(7);
    expect(star.inventory.consumables).toHaveLength(1);
    expect(star.inventory.consumables[0]?.contentId).toBe('bxqp:planet:solo-lantern');
  });

  it('L04 在弃牌命令内生成一张戏法牌并与弃牌检查点一同提交', () => {
    let run = roundRun('discard-script-seal');
    const cardId = run.round!.handIds[0]!;
    run = modifyCard(run, cardId, 'sealId', 'bxqp:seal:script-seal');
    const toggled = executeCommandV2(run, {
      type: 'toggle-card',
      checkpointId: run.checkpointId,
      cardId,
    });
    if (!toggled.ok) throw new Error(toggled.rejection.message);
    const discarded = executeCommandV2(toggled.state, {
      type: 'discard-selected',
      checkpointId: toggled.state.checkpointId,
    });
    if (!discarded.ok) throw new Error(discarded.rejection.message);
    const next = discarded.state as RunStateV3;

    expect(next.inventory.consumables).toHaveLength(1);
    expect(next.inventory.consumables[0]?.contentId.startsWith('bxqp:tarot:')).toBe(true);
    expect(next.round?.discardPileIds).toContain(cardId);
  });
});
