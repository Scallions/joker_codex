// @vitest-environment jsdom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { App } from '../../src/app/App';
import { commitRunCommand } from '../../src/app/commitRunCommand';
import { createGameStore } from '../../src/app/store';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { createShopV2, materializeItemV2 } from '../../src/game-core/economy/shopV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import { isRunStateV7, type RunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile, type ProfileRecord } from '../../src/persistence/profiles';
import { projectRunStart } from '../../src/progression/reducer';
import { selectJokerPresentation } from '../../src/presentation/selectors/jokerPresentation';
import { createTutorialRun } from '../../src/tutorial/script';
import { createMemoryRepository } from '../helpers/memoryRepository';

function apply(state: RunStateV2, command: RunCommandV2) {
  const result = executeCommandV2(state, command);
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state;
}

function shopFixture() {
  let run = createRunEconomyFixtureRun({
    seed: 'shop-ui-seed',
    startingMoney: 30,
    targetScaleBasisPoints: 1,
    startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
  });
  run = apply(run, { type: 'select-blind', checkpointId: 0, position: 'small' });
  run = apply(run, {
    type: 'toggle-card',
    checkpointId: run.checkpointId,
    cardId: run.round!.handIds[0]!,
  });
  run = apply(run, { type: 'play-selected', checkpointId: run.checkpointId });
  run = apply(run, { type: 'claim-round-reward', checkpointId: run.checkpointId });
  const profile = {
    ...createProfile(1, '逛夜市的人', 100),
    activeRunId: run.runId,
  };
  return { profile, run };
}

async function tutorialShopFixture(): Promise<{
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
}> {
  const baseProfile = createProfile(1, '教程夜市人', 100);
  let run = createTutorialRun(PRODUCTION_CATALOG, baseProfile, 'SHOPTEST');
  let profile = projectRunStart(baseProfile, run, 110);
  let nowEpochMs = 120;
  const repository = { commitCheckpoint: async () => undefined };
  const apply = async (command: RunCommandV2) => {
    const result = await commitRunCommand(
      repository,
      profile,
      run,
      command,
      nowEpochMs++,
    );
    if (!result.ok) throw new Error(result.message);
    if (!isRunStateV7(result.state)) throw new Error('教程牌局丢失 V7 身份');
    profile = result.profile;
    run = result.state;
  };

  await apply({
    type: 'select-blind',
    checkpointId: run.checkpointId,
    position: 'small',
  });
  await apply({
    type: 'toggle-card',
    checkpointId: run.checkpointId,
    cardId: run.round!.handIds[0]!,
  });
  await apply({ type: 'play-selected', checkpointId: run.checkpointId });
  for (const cardId of run.round!.handIds.slice(0, 3)) {
    await apply({ type: 'toggle-card', checkpointId: run.checkpointId, cardId });
  }
  await apply({ type: 'discard-selected', checkpointId: run.checkpointId });
  while (run.phase.kind === 'round') {
    for (const cardId of run.round!.handIds.slice(0, 5)) {
      await apply({ type: 'toggle-card', checkpointId: run.checkpointId, cardId });
    }
    await apply({ type: 'play-selected', checkpointId: run.checkpointId });
  }
  await apply({ type: 'claim-round-reward', checkpointId: run.checkpointId });

  if (profile.tutorial.currentStepId !== 'tutorial:step:06' || !run.shop) {
    throw new Error('未能构造教程奇牌购买步骤');
  }
  return { profile, run };
}

describe('百戏夜市', () => {
  it('用明确分组展示商品与补充包，切换分组不写入检查点', async () => {
    const user = userEvent.setup();
    const { profile, run } = shopFixture();
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    const commit = vi.spyOn(repository, 'commitCheckpoint');
    render(<App store={createGameStore(repository)} />);

    await screen.findByText('百戏夜市 · 幕间奇货');
    const items = screen.getByRole('button', {
      name: `单品 ${run.shop!.cardOffers.length}`,
    });
    const packs = screen.getByRole('button', {
      name: `补充包 ${run.shop!.packOffers.length}`,
    });
    expect(items).toHaveAttribute('aria-pressed', 'true');
    for (const offer of run.shop!.cardOffers) {
      expect(
        screen.getByRole('button', { name: `购买 ${offer.item.name}` }),
      ).toBeInTheDocument();
    }
    for (const offer of run.shop!.packOffers) {
      expect(screen.queryByRole('button', { name: `购买 ${offer.name}` })).toBeNull();
    }

    await user.click(packs);
    expect(packs).toHaveAttribute('aria-pressed', 'true');
    for (const offer of run.shop!.cardOffers) {
      expect(
        screen.queryByRole('button', { name: `购买 ${offer.item.name}` }),
      ).toBeNull();
    }
    for (const offer of run.shop!.packOffers) {
      expect(
        screen.getByRole('button', { name: `购买 ${offer.name}` }),
      ).toBeInTheDocument();
    }
    expect(commit).not.toHaveBeenCalled();
  });

  it('教程奇牌购买落盘后才推进步骤并自动切到补充包', async () => {
    const user = userEvent.setup();
    const { profile, run } = await tutorialShopFixture();
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    const commit = vi.spyOn(repository, 'commitCheckpoint');
    const store = createGameStore(repository, () => 500);
    render(<App store={store} />);

    await screen.findByText('百戏夜市 · 幕间奇货');
    expect(
      screen.getByRole('button', { name: `单品 ${run.shop!.cardOffers.length}` }),
    ).toHaveAttribute('aria-pressed', 'true');
    const joker = run.shop!.cardOffers.find(
      (offer) => offer.item.kind === 'joker' && offer.price <= run.economy.money,
    );
    if (!joker) throw new Error('教程夜市没有可购买奇牌');
    await user.click(screen.getByRole('button', { name: `购买 ${joker.item.name}` }));

    await waitFor(() =>
      expect(
        store.getState().app.profiles.find(({ id }) => id === profile.id)?.tutorial
          .currentStepId,
      ).toBe('tutorial:step:07'),
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: `补充包 ${run.shop!.packOffers.length}` }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('教程奇牌购买写入失败时保留步骤、牌局和单品分组', async () => {
    const user = userEvent.setup();
    const { profile, run } = await tutorialShopFixture();
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    vi.spyOn(repository, 'commitCheckpoint').mockRejectedValueOnce(new Error('测试故障'));
    const store = createGameStore(repository, () => 500);
    const runBefore = structuredClone(run);
    const profileBefore = structuredClone(profile);
    render(<App store={store} />);

    await screen.findByText('百戏夜市 · 幕间奇货');
    const joker = run.shop!.cardOffers.find(
      (offer) => offer.item.kind === 'joker' && offer.price <= run.economy.money,
    );
    if (!joker) throw new Error('教程夜市没有可购买奇牌');
    await user.click(screen.getByRole('button', { name: `购买 ${joker.item.name}` }));

    expect(await screen.findByText(/自动保存失败：测试故障/)).toBeVisible();
    expect(store.getState().app.run).toEqual(runBefore);
    expect(store.getState().app.profiles.find(({ id }) => id === profile.id)).toEqual(
      profileBefore,
    );
    expect(
      screen.getByRole('button', { name: `单品 ${run.shop!.cardOffers.length}` }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('换摊并购买普通商品，所有动作即时写入检查点', async () => {
    const user = userEvent.setup();
    const { profile, run } = shopFixture();
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    const store = createGameStore(repository);
    render(<App store={store} />);

    expect(await screen.findByText('百戏夜市 · 幕间奇货')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重掷商品' }));
    const offer = store.getState().app.run!.shop!.cardOffers[0]!;
    await user.click(screen.getByRole('button', { name: `购买 ${offer.item.name}` }));

    expect(store.getState().app.run?.checkpointId).toBe(6);
    expect(store.getState().app.run?.shop?.cardOffers).toHaveLength(1);
  });

  it('生产奇牌商品与持有栏共用本地图像和当前状态文案', async () => {
    const user = userEvent.setup();
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'shop-joker-art',
    });
    const acquired = acquireContentByIdV3(initial, 'bxqp:joker:044', 'shop-owned');
    if (!acquired.ok || !isRunStateV4(acquired.state)) {
      throw new Error(acquired.ok ? '未保持 V4' : acquired.message);
    }
    const owned = acquired.state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:044',
    );
    if (!owned) throw new Error('缺少持有 J044');
    const committedState = {
      ...acquired.state,
      modifiersV3: {
        ...acquired.state.modifiersV3,
        jokers: acquired.state.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === owned.instanceId
            ? { ...modifier, abilityState: { ...modifier.abilityState, storedMult: 3 } }
            : modifier,
        ),
      },
    };
    const definition = committedState.content.items.find(
      (item) => item.kind === 'joker' && item.contentId === 'bxqp:joker:044',
    );
    if (!definition) throw new Error('缺少 J044 定义');
    const created = createShopV2(committedState);
    if (!created.ok) throw new Error(created.message);
    const firstOffer = created.shop.cardOffers[0];
    if (!firstOffer) throw new Error('缺少夜市商品位');
    const item = materializeItemV2(
      definition,
      'shop-joker-art-offer',
      committedState.rngState,
    ).item;
    const run = {
      ...committedState,
      phase: { kind: 'shop' } as const,
      round: null,
      shop: {
        ...created.shop,
        cardOffers: [{ ...firstOffer, item, price: definition.baseCost }],
      },
      rngState: created.rngState,
      inventory: { ...committedState.inventory, tags: created.tags },
      progress: {
        ...committedState.progress,
        anteVoucherId: created.anteVoucherId,
      },
    };
    const profile = {
      ...createProfile(1, '奇牌买手', 100),
      activeRunId: run.runId,
    };
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    const commit = vi.spyOn(repository, 'commitCheckpoint');
    const store = createGameStore(repository);
    render(<App store={store} />);

    expect(await screen.findByText('百戏夜市 · 幕间奇货')).toBeInTheDocument();
    expect(screen.getAllByTestId('joker-art-bxqp:joker:044')).not.toHaveLength(0);
    expect(screen.getAllByText('当前 +0 倍率')).not.toHaveLength(0);
    expect(screen.getByText('当前 +3 倍率')).toBeInTheDocument();
    const presentation = selectJokerPresentation('bxqp:joker:044');
    if (!presentation) throw new Error('缺少 J044 展示');
    const stateBefore = structuredClone(store.getState().app);
    await user.click(
      screen.getAllByRole('button', { name: `查看 ${presentation.name} 大图` })[0]!,
    );
    const dialog = screen.getByRole('dialog', {
      name: `奇牌鉴赏 · ${presentation.name}`,
    });
    expect(within(dialog).getByTestId('joker-inspector-art')).toHaveAttribute(
      'src',
      presentation.assetPath,
    );
    expect(within(dialog).getByText(presentation.rarityLabel)).toBeInTheDocument();
    expect(within(dialog).getByText(presentation.description)).toBeInTheDocument();
    expect(within(dialog).getByText(presentation.flavor)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '关闭鉴赏' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(
      screen.getAllByRole('button', { name: `查看 ${presentation.name} 大图` })[1]!,
    );
    expect(
      within(
        screen.getByRole('dialog', { name: `奇牌鉴赏 · ${presentation.name}` }),
      ).getByText('当前 +3 倍率'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭鉴赏' }));
    expect(store.getState().app).toEqual(stateBefore);
    expect(commit).not.toHaveBeenCalled();
  });
});
