import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { validateRunStateV3 } from '../../src/game-core/invariants/validateRunStateV3';
import { stableId } from '../../src/game-core/model/ids';
import type { OwnedJokerV2 } from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';
import { jokerCapabilityDouble } from '../helpers/jokerCapabilityDoubles';

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
  if (!result.ok) {
    throw new Error(`${result.rejection.code}: ${result.rejection.message}`);
  }
  expect(result).toMatchObject({ ok: true });
  return result.state as RunStateV3;
}

function winCurrentBoss(run: RunStateV3, ante = run.progress.ante): RunStateV3 {
  let next: RunStateV3 = {
    ...run,
    progress: { ...run.progress, ante, blindPosition: 'boss' },
  };
  next = command(next, { type: 'select-blind', position: 'boss' });
  next = { ...next, round: { ...next.round!, targetScore: 1 } };
  for (const cardId of next.round!.handIds.slice(0, 5)) {
    if (!next.round!.selectedCardIds.includes(cardId)) {
      next = command(next, { type: 'toggle-card', cardId });
    }
  }
  next = command(next, { type: 'play-selected' });
  return command(next, { type: 'claim-round-reward' });
}

describe('V3 牌组、难度与挑战命令合约', () => {
  it('C05 对初始摸牌与补牌逐张独立掷 1/4 暗置并可按种子重放', () => {
    const create = () =>
      createProductionRunV3(PRODUCTION_CATALOG, {
        seed: 'veiled-draw-replay',
        challengeId: 'bxqp:challenge:veiled-draw',
      });
    let run = command(create(), { type: 'select-blind', position: 'small' });
    const initialChoice = run.materializedChoicesV3.find(
      ({ kind }) => kind === 'setup-draw-face-down',
    );

    expect(initialChoice?.valueNumbers).toHaveLength(8);
    expect(initialChoice?.valueNumbers.every((roll) => roll >= 0 && roll < 4)).toBe(true);
    expect(run.round?.faceDownCardIds).toEqual(initialChoice?.valueIds);
    expect(run).toEqual(command(create(), { type: 'select-blind', position: 'small' }));

    run = command(run, {
      type: 'toggle-card',
      cardId: run.round!.handIds[0]!,
    });
    run = command(run, { type: 'discard-selected' });
    const drawChoices = run.materializedChoicesV3.filter(
      ({ kind }) => kind === 'setup-draw-face-down',
    );
    expect(drawChoices).toHaveLength(2);
    expect(drawChoices[1]?.valueNumbers).toHaveLength(1);
  });

  it('D13 每次击败班主生成一个等待下一张戏签的复制令', () => {
    const run = winCurrentBoss(
      createProductionRunV3(PRODUCTION_CATALOG, {
        seed: 'boss-copy-token-deck',
        deckId: 'bxqp:deck:copy-token',
      }),
    );
    const activeCopyTags = run.inventory.tags.filter(
      (tag) =>
        !tag.consumed &&
        run.content.tags
          .find(({ id }) => id === tag.contentId)
          ?.effects.some((effect) => effect.parameters.key === 'copy-next-tag'),
    );

    expect(activeCopyTags).toHaveLength(1);
    expect(activeCopyTags[0]?.deferredWindow).toBeNull();
    expect(activeCopyTags[0]?.instanceId.startsWith('bxqp:')).toBe(true);
  });

  it('已声明能力替身只进入当前挑战执行快照，并按重复依赖生成五个实例', () => {
    const double = jokerCapabilityDouble('bxqp:joker:001');
    const run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-external-starting-jokers',
      challengeId: 'bxqp:challenge:empty-house',
      externalJokerDefinitions: [double],
    });

    expect(run.inventory.jokers).toHaveLength(5);
    expect(
      run.inventory.jokers.every(({ contentId }) => contentId === double.contentId),
    ).toBe(true);
    expect(run.content.items).toContainEqual(double);
    expect(run.productionContentV3.rows).toHaveLength(230);
    expect(PRODUCTION_CATALOG.rows.some(({ id }) => id === double.contentId)).toBe(false);
    expect(run.externalDependenciesV3).toMatchObject({
      requiredIds: ['bxqp:joker:001'],
      resolvedIds: ['bxqp:joker:001'],
    });
  });

  it('C11 第四幕班主结算后把已有奇牌永久封存在零名义栏位', () => {
    const definition = jokerCapabilityDouble('bxqp:joker:099');
    const instanceId = stableId<'joker-instance'>('test:c11:owned-joker');
    const owned: OwnedJokerV2 = {
      instanceId,
      contentId: definition.contentId,
      name: definition.name,
      description: definition.description,
      baseCost: definition.baseCost,
      editionCost: 0,
      editionId: null,
      effects: definition.effects,
      slotContribution: 1,
      sellValueOverride: null,
      debuffed: false,
    };
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'closed-balcony-after-four',
      challengeId: 'bxqp:challenge:closed-balcony',
    });
    const prepared: RunStateV3 = {
      ...base,
      content: { ...base.content, items: [...base.content.items, definition] },
      inventory: { ...base.inventory, jokers: [owned] },
      modifiersV3: {
        ...base.modifiersV3,
        jokers: [
          {
            instanceId,
            stickerIds: [],
            perishableRoundsRemaining: null,
            rentalRoundCost: 0,
            saleAllowed: true,
            slotContribution: 1,
          },
        ],
      },
    };
    const run = winCurrentBoss(prepared, 4);
    const modifier = run.modifiersV3.jokers[0];

    expect(run.rules.jokerSlots).toBe(0);
    expect(run.inventory.jokers).toHaveLength(1);
    expect(modifier?.saleAllowed).toBe(false);
    expect(modifier?.stickerIds).toContain('bxqp:sticker:permanent');
    expect(validateRunStateV3(run)).toEqual({ ok: true });

    const sold = executeCommandV2(run, {
      type: 'sell-joker',
      checkpointId: run.checkpointId,
      jokerInstanceId: instanceId,
    });
    expect(sold).toMatchObject({
      ok: false,
      rejection: { code: 'item-not-owned' },
    });
  });

  it('挑战禁令按操作能力裁剪木牌、班主、戏签与卡包候选池', () => {
    const rising = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-ban-discounts',
      challengeId: 'bxqp:challenge:rising-prices',
    });
    const smallCourt = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-ban-face-boss',
      challengeId: 'bxqp:challenge:small-court',
    });
    const emptyRail = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-no-joker-routes',
      challengeId: 'bxqp:challenge:empty-rail',
    });

    expect(
      rising.content.vouchers.some((voucher) =>
        voucher.effects.some(
          (effect) => effect.parameters.key === 'discount-basis-points',
        ),
      ),
    ).toBe(false);
    expect(
      smallCourt.content.blinds.some((blind) =>
        blind.effects.some(
          (effect) =>
            effect.parameters.field === 'debuff' &&
            effect.parameters.value === 'face-card',
        ),
      ),
    ).toBe(false);
    expect(
      emptyRail.content.packs.some((pack) =>
        ['buffoon', 'arcana', 'spectral'].includes(pack.family),
      ),
    ).toBe(false);
    expect(
      emptyRail.content.tags.some((tag) =>
        tag.effects.some((effect) =>
          ['free-joker', 'edition-joker'].includes(String(effect.parameters.key)),
        ),
      ),
    ).toBe(false);
  });
});
