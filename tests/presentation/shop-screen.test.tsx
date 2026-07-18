// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { createProfile } from '../../src/persistence/profiles';
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

describe('百戏夜市', () => {
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
});
