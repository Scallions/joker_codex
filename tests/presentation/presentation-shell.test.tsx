// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import { ApplicationErrorBoundary } from '../../src/app/ApplicationErrorBoundary';
import { createGameStore } from '../../src/app/store';
import {
  createLocalProfile,
  initializeApplication,
  startLocalFixtureRun,
  submitRunCommand,
} from '../../src/app/store/appSlice';
import { PresentationQueue } from '../../src/presentation/PresentationQueue';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('演出队列与壳层保护', () => {
  it('按提交后的演出事件报幕，并允许一次略过整个队列', async () => {
    const store = createGameStore(createMemoryRepository());
    await store.dispatch(initializeApplication()).unwrap();
    await store
      .dispatch(createLocalProfile({ slot: 1, displayName: '报幕人', nowEpochMs: 1 }))
      .unwrap();
    await store
      .dispatch(startLocalFixtureRun({ seed: 'presentation-queue', nowEpochMs: 2 }))
      .unwrap();
    const run = store.getState().app.run;
    if (!run) throw new Error('缺少测试牌局');
    await store
      .dispatch(
        submitRunCommand({
          type: 'toggle-card',
          checkpointId: run.checkpointId,
          cardId: run.hand[0]!.id,
        }),
      )
      .unwrap();

    render(
      <Provider store={store}>
        <PresentationQueue />
      </Provider>,
    );

    expect(screen.getByText('选牌落定')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '跳过演出提示' }));
    expect(store.getState().app.presentationEvents).toEqual([]);
  });

  it('渲染故障时保留应用壳并说明本地档案未改动', () => {
    const errorOutput = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const BrokenScreen = () => {
      throw new Error('模拟布景故障');
    };

    render(
      <ApplicationErrorBoundary>
        <BrokenScreen />
      </ApplicationErrorBoundary>,
    );

    expect(
      screen.getByText('戏台布景出了岔子，本地档案没有被改动。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新支起戏台' })).toBeInTheDocument();
    errorOutput.mockRestore();
  });
});
