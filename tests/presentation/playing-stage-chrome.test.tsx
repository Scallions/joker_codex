// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import {
  createLocalProfile,
  initializeApplication,
  skipPresentationSequence,
  startLocalFixtureRun,
  submitRunCommand,
} from '../../src/app/store/appSlice';
import { createMemoryRepository } from '../helpers/memoryRepository';

async function createTableStore() {
  const store = createGameStore(createMemoryRepository());
  await store.dispatch(initializeApplication()).unwrap();
  await store
    .dispatch(createLocalProfile({ slot: 1, displayName: '看台人', nowEpochMs: 100 }))
    .unwrap();
  await store
    .dispatch(startLocalFixtureRun({ seed: 'playing-stage-chrome', nowEpochMs: 200 }))
    .unwrap();
  const run = store.getState().app.run;
  if (!run) throw new Error('缺少测试牌局');
  await store
    .dispatch(
      submitRunCommand({
        type: 'select-blind',
        checkpointId: run.checkpointId,
        position: 'small',
      }),
    )
    .unwrap();
  return store;
}

describe('牌局舞台分区', () => {
  it('用单一顶栏和具名牌桌区域隔离全局控制与玩法内容', async () => {
    const store = await createTableStore();
    const { container } = render(<App store={store} />);
    await screen.findAllByTestId('playing-card');

    expect(container.querySelector('[data-layout-zone="audio-controls"]')).toBeTruthy();
    expect(container.querySelector('[data-layout-zone="playing-status"]')).toBeTruthy();
    const navigation = screen.getByRole('navigation', { name: '牌局导航' });
    expect(navigation).toHaveAttribute('data-layout-zone', 'playing-navigation');
    expect(navigation.querySelectorAll('button')).toHaveLength(4);

    for (const zone of [
      'table-inventory',
      'table-ledger',
      'table-center',
      'table-hand',
      'table-actions',
    ]) {
      expect(container.querySelector(`[data-layout-zone="${zone}"]`)).toBeTruthy();
    }

    const hand = container.querySelector<HTMLElement>('[data-layout-zone="table-hand"]');
    const handCards = container.querySelector<HTMLElement>(
      '[data-layout-zone="table-hand-cards"]',
    );
    const actions = container.querySelector<HTMLElement>(
      '[data-layout-zone="table-actions"]',
    );
    expect(hand).toContainElement(handCards);
    expect(hand).toContainElement(actions);
  });

  it('演出覆盖期间暂存新手牌并在跳过后释放同一批已提交卡牌', async () => {
    const store = await createTableStore();
    const { container } = render(<App store={store} />);
    const cards = await screen.findAllByTestId('playing-card');
    const committedIds = cards.map((card) => card.getAttribute('data-card-id'));

    expect(container.querySelectorAll('[data-card-entry-state="held"]').length).toBe(
      cards.length,
    );
    act(() => {
      store.dispatch(skipPresentationSequence());
    });
    await waitFor(() =>
      expect(container.querySelectorAll('[data-card-entry-state="held"]')).toHaveLength(
        0,
      ),
    );
    expect(
      (await screen.findAllByTestId('playing-card')).map((card) =>
        card.getAttribute('data-card-id'),
      ),
    ).toEqual(committedIds);
  });
});
