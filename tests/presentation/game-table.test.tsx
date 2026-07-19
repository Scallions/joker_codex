// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import {
  createLocalProfile,
  initializeApplication,
  startLocalFixtureRun,
  submitRunCommand,
} from '../../src/app/store/appSlice';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('午夜百戏牌桌', () => {
  it('选择一张手牌并出牌后显示已保存的计分结果', async () => {
    const user = userEvent.setup();
    const store = createGameStore(createMemoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '试牌人', nowEpochMs: 100 }))
      .unwrap();
    await store
      .dispatch(startLocalFixtureRun({ seed: 'table-ui-seed', nowEpochMs: 200 }))
      .unwrap();
    const initial = store.getState().app.run!;
    await store
      .dispatch(
        submitRunCommand({
          type: 'select-blind',
          checkpointId: initial.checkpointId,
          position: 'small',
        }),
      )
      .unwrap();
    render(<App store={store} />);

    expect(await screen.findByText('小幕试锋')).toBeInTheDocument();
    const cards = screen.getAllByTestId('playing-card');
    expect(cards).toHaveLength(8);
    await user.click(cards[0]!);
    expect(screen.getByText('已选 1 / 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '出牌' }));

    expect(await screen.findByText(/本手 ·/)).toBeInTheDocument();
    expect(store.getState().app.run?.checkpointId).toBe(3);
    expect(store.getState().app.run?.round?.score).toBeGreaterThan(0);
  });

  it('返回名簿后可从原检查点继续未完牌局', async () => {
    const user = userEvent.setup();
    const store = createGameStore(createMemoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '续戏人', nowEpochMs: 100 }))
      .unwrap();
    await store
      .dispatch(startLocalFixtureRun({ seed: 'resume-ui-seed', nowEpochMs: 200 }))
      .unwrap();
    const initial = store.getState().app.run!;
    await store
      .dispatch(
        submitRunCommand({
          type: 'select-blind',
          checkpointId: initial.checkpointId,
          position: 'small',
        }),
      )
      .unwrap();
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '返回戏主名簿' }));
    expect(await screen.findByText('三方戏台，三份命数')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续未完牌局' }));

    expect(await screen.findByText('小幕试锋')).toBeInTheDocument();
    expect(store.getState().app.run?.checkpointId).toBe(1);
  });

  it('生产奇牌在牌桌显示审定插画与已提交的当前能力值', async () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'table-joker-art',
    });
    const acquired = acquireContentByIdV3(initial, 'bxqp:joker:044', 'table-art');
    if (!acquired.ok || !isRunStateV4(acquired.state)) {
      throw new Error(acquired.ok ? '未保持 V4' : acquired.message);
    }
    const selected = executeCommandV2(acquired.state, {
      type: 'select-blind',
      checkpointId: acquired.state.checkpointId,
      position: 'small',
    });
    if (!selected.ok || !isRunStateV4(selected.state)) {
      throw new Error(selected.ok ? '未保持 V4' : selected.rejection.message);
    }
    const profile = {
      ...createProfile(1, '看图戏主', 100),
      activeRunId: selected.state.runId,
    };
    const store = createGameStore(
      createMemoryRepository({
        profiles: [profile],
        runs: [[profile.id, selected.state]],
        activeProfileId: profile.id,
      }),
    );
    render(<App store={store} />);

    const art = await screen.findByTestId('joker-art-bxqp:joker:044');
    expect(art).toHaveAttribute('src', '/assets/jokers/044.webp');
    expect(screen.getByText('当前 +0 倍率')).toBeInTheDocument();
  });
});
