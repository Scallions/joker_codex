import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { commitRunCommand } from '../../src/app/commitRunCommand';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile } from '../../src/persistence/profiles';
import { projectRunStart, reduceProfileProgression } from '../../src/progression/reducer';
import {
  createTutorialRun,
  TUTORIAL_SMALL_BLIND_TARGET,
  TUTORIAL_STEPS,
} from '../../src/tutorial/script';
import {
  deriveTutorialProgressionFacts,
  gateTutorialCommand,
} from '../../src/tutorial/gate';

describe('八步实机教程', () => {
  it('使用固定脚本版本、真实 D01/S01 牌局与八条中文步骤', () => {
    const profile = createProfile(1, '学戏人', 100);
    const run = createTutorialRun(PRODUCTION_CATALOG, profile, 'TUTOR001');

    expect(TUTORIAL_STEPS).toHaveLength(8);
    expect(run).toMatchObject({
      schemaVersion: 7,
      sessionV7: {
        runClass: 'tutorial',
        profileId: profile.id,
        tutorialScriptVersion: 'tutorial-1',
      },
    });
    expect(
      run.productionContentV3.rows.find(
        ({ definition }) => definition.id === run.setupV3.deckId,
      )?.definition.referenceIndex,
    ).toBe('D01');
    expect(
      run.productionContentV3.rows.find(
        ({ definition }) => definition.id === run.setupV3.stakeId,
      )?.definition.referenceIndex,
    ).toBe('S01');
  });

  it('错误操作返回中文引导；成功命令只推进教程字段', () => {
    const baseProfile = createProfile(1, '学戏人', 100);
    const run = createTutorialRun(PRODUCTION_CATALOG, baseProfile, 'TUTOR002');
    const profile = projectRunStart(baseProfile, run, 150);
    const invalid = gateTutorialCommand(run, profile.tutorial, {
      type: 'reroll-shop',
      checkpointId: run.checkpointId,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.message).toContain('盲注');

    const command = {
      type: 'select-blind' as const,
      checkpointId: run.checkpointId,
      position: 'small' as const,
    };
    expect(gateTutorialCommand(run, profile.tutorial, command)).toEqual({ ok: true });
    const accepted = executeCommandV2(run, command);
    if (!accepted.ok) throw new Error(accepted.rejection.message);
    if (!isRunStateV7(accepted.state)) throw new Error('教程命令丢失 V7 状态');
    const tutorialFacts = deriveTutorialProgressionFacts(
      run,
      accepted.state,
      accepted.domainEvents,
      profile.tutorial,
    );
    const projected = reduceProfileProgression(
      profile,
      {
        runId: run.runId,
        checkpointId: accepted.state.checkpointId,
        runClass: 'tutorial',
        profileId: profile.id,
        facts: tutorialFacts,
      },
      200,
    );

    expect(projected.tutorial.currentStepId).toBe('tutorial:step:02');
    expect(projected.statistics).toEqual(profile.statistics);
    expect(projected.objectives).toEqual(profile.objectives);
    expect(projected.achievements).toEqual(profile.achievements);
    expect(projected.collection).toEqual(profile.collection);
  });

  it('应用提交边界先执行教程门禁，并在落盘成功后推进步骤', async () => {
    const baseProfile = createProfile(2, '守规人', 100);
    const run = createTutorialRun(PRODUCTION_CATALOG, baseProfile, 'TUTOR003');
    const profile = projectRunStart(baseProfile, run, 150);
    let writes = 0;
    const repository = {
      commitCheckpoint: async () => {
        writes += 1;
      },
    };

    const rejected = await commitRunCommand(
      repository,
      profile,
      run,
      { type: 'reroll-shop', checkpointId: run.checkpointId },
      200,
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.code).toBe('domain-rejected');
      expect(rejected.message).toContain('盲注');
    }
    expect(writes).toBe(0);

    const accepted = await commitRunCommand(
      repository,
      profile,
      run,
      {
        type: 'select-blind',
        checkpointId: run.checkpointId,
        position: 'small',
      },
      200,
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.profile.tutorial.currentStepId).toBe('tutorial:step:02');
    expect(writes).toBe(1);
  });

  it('重温教程保留首次完成时间并增加重玩次数', () => {
    const fresh = createProfile(3, '重温人', 100);
    const completed = {
      ...fresh,
      updatedAtEpochMs: 200,
      tutorial: {
        ...fresh.tutorial,
        status: 'completed' as const,
        startedAtEpochMs: 120,
        completedAtEpochMs: 180,
      },
    };
    const run = createTutorialRun(PRODUCTION_CATALOG, completed, 'TUTOR004');
    const replaying = projectRunStart(completed, run, 220);

    expect(replaying.tutorial).toMatchObject({
      status: 'in-progress',
      completedAtEpochMs: 180,
      replayCount: 1,
    });
  });

  it('固定教程可经真实引擎命令完成八步且不推进普通账册', async () => {
    const base = createProfile(1, '实演人', 100);
    let state = createTutorialRun(PRODUCTION_CATALOG, base);
    let profile = projectRunStart(base, state, 110);
    let now = 120;
    const repository = { commitCheckpoint: async () => undefined };
    const apply = async (command: RunCommandV2) => {
      const result = await commitRunCommand(repository, profile, state, command, now++);
      if (!result.ok) throw new Error(result.message);
      if (!isRunStateV7(result.state)) throw new Error('教程牌局丢失 V7 身份');
      profile = result.profile;
      state = result.state;
    };
    const handIds = () => state.round?.handIds ?? [];
    const chooseFive = () => handIds().slice(0, 5);

    await apply({
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    await apply({
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: handIds()[0]!,
    });
    await apply({ type: 'play-selected', checkpointId: state.checkpointId });
    for (const cardId of handIds().slice(0, 3)) {
      await apply({ type: 'toggle-card', checkpointId: state.checkpointId, cardId });
    }
    await apply({ type: 'discard-selected', checkpointId: state.checkpointId });

    while (state.phase.kind === 'round') {
      for (const cardId of chooseFive()) {
        await apply({ type: 'toggle-card', checkpointId: state.checkpointId, cardId });
      }
      await apply({ type: 'play-selected', checkpointId: state.checkpointId });
    }
    expect(state.phase.kind).toBe('round-reward');
    expect(typeof state.round?.score).toBe('number');
    expect(state.round?.targetScore).toBe(TUTORIAL_SMALL_BLIND_TARGET);
    await apply({ type: 'claim-round-reward', checkpointId: state.checkpointId });

    const joker = state.shop?.cardOffers.find(
      (offer) => offer.item.kind === 'joker' && offer.price <= state.economy.money,
    );
    if (!joker) throw new Error('教程夜市缺少可购买奇牌');
    await apply({
      type: 'buy-shop-offer',
      checkpointId: state.checkpointId,
      offerId: joker.id,
    });
    const pack = state.shop?.packOffers.find((offer) => {
      const definition = state.content.packs.find(
        (candidate) => candidate.id === offer.packId,
      );
      return (
        offer.price <= state.economy.money &&
        definition?.allowedItemKinds.includes('consumable')
      );
    });
    if (!pack) throw new Error('教程夜市缺少可购买补充包');
    const incompatiblePack = state.shop?.packOffers.find((offer) => {
      const definition = state.content.packs.find(
        (candidate) => candidate.id === offer.packId,
      );
      return (
        offer.price <= state.economy.money &&
        definition !== undefined &&
        !definition.allowedItemKinds.includes('consumable')
      );
    });
    if (!incompatiblePack) throw new Error('教程夜市缺少不兼容补充包回归样本');
    expect(
      gateTutorialCommand(state, profile.tutorial, {
        type: 'buy-pack',
        checkpointId: state.checkpointId,
        offerId: pack.id,
      }),
    ).toEqual({ ok: true });
    expect(
      gateTutorialCommand(state, profile.tutorial, {
        type: 'buy-pack',
        checkpointId: state.checkpointId,
        offerId: incompatiblePack.id,
      }),
    ).toMatchObject({ ok: false });

    const openedIncompatible = executeCommandV2(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId: incompatiblePack.id,
    });
    if (!openedIncompatible.ok || !isRunStateV7(openedIncompatible.state)) {
      throw new Error(
        openedIncompatible.ok
          ? '旧教程补充包状态丢失 V7 身份'
          : openedIncompatible.rejection.message,
      );
    }
    const restoredChoice = openedIncompatible.state.pendingChoice?.current;
    if (!restoredChoice || restoredChoice.kind !== 'pack') {
      throw new Error('旧教程补充包未打开候选');
    }
    const recoveryCommand = {
      type: 'skip-pack' as const,
      checkpointId: openedIncompatible.state.checkpointId,
      choiceId: restoredChoice.id,
    };
    expect(
      gateTutorialCommand(openedIncompatible.state, profile.tutorial, recoveryCommand),
    ).toEqual({ ok: true });
    const recovered = executeCommandV2(openedIncompatible.state, recoveryCommand);
    if (!recovered.ok || !isRunStateV7(recovered.state)) {
      throw new Error(
        recovered.ok ? '教程恢复状态丢失 V7 身份' : recovered.rejection.message,
      );
    }
    expect(
      deriveTutorialProgressionFacts(
        openedIncompatible.state,
        recovered.state,
        recovered.domainEvents,
        profile.tutorial,
      ),
    ).toEqual([{ type: 'tutorial-step-completed', stepId: 'tutorial:step:08' }]);

    await apply({ type: 'buy-pack', checkpointId: state.checkpointId, offerId: pack.id });
    const packChoice = state.pendingChoice?.current;
    if (!packChoice || packChoice.kind !== 'pack') {
      throw new Error('教程补充包未打开候选');
    }
    expect(
      gateTutorialCommand(state, profile.tutorial, {
        type: 'skip-pack',
        checkpointId: state.checkpointId,
        choiceId: packChoice.id,
      }),
    ).toMatchObject({ ok: false });
    const consumable = packChoice.options.find(
      (option) => option.item.kind === 'consumable',
    );
    if (!consumable) throw new Error('教程补充包缺少消耗牌');
    await apply({
      type: 'choose-pack-option',
      checkpointId: state.checkpointId,
      choiceId: packChoice.id,
      optionId: consumable.id,
    });
    const targetChoice = state.pendingChoice?.current;
    if (targetChoice?.kind === 'targets') {
      for (const targetId of targetChoice.eligibleIds.slice(
        0,
        targetChoice.minimumTargets,
      )) {
        await apply({
          type: 'toggle-choice-target',
          checkpointId: state.checkpointId,
          choiceId: targetChoice.id,
          targetId,
        });
      }
      await apply({
        type: 'confirm-choice',
        checkpointId: state.checkpointId,
        choiceId: targetChoice.id,
      });
    }
    await apply({ type: 'leave-shop', checkpointId: state.checkpointId });

    expect(state.phase.kind).toBe('finished');
    expect(profile.tutorial.status).toBe('completed');
    expect(profile.statistics).toEqual(base.statistics);
    expect(profile.objectives).toEqual(base.objectives);
    expect(profile.collection).toEqual(base.collection);
    expect(profile.achievements).toEqual(base.achievements);
  });
});
