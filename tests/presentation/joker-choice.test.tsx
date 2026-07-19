// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { materializeItemV2 } from '../../src/game-core/economy/shopV2';
import { stableId } from '../../src/game-core/model/ids';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('百戏包奇牌选项', () => {
  it('用目录插画和初始当前值展示已物化的奇牌选项', async () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'choice-joker-art',
    });
    const definition = initial.content.items.find(
      (item) => item.kind === 'joker' && item.contentId === 'bxqp:joker:050',
    );
    const pack = initial.content.packs.find(({ family }) => family === 'buffoon');
    if (!definition || !pack) throw new Error('缺少百戏包或 J050');
    const item = materializeItemV2(
      definition,
      'choice-joker-art-option',
      initial.rngState,
    ).item;
    const choiceId = stableId<'choice'>('choice:joker-art');
    const run = {
      ...initial,
      phase: { kind: 'choice', choiceId } as const,
      pendingChoice: {
        current: {
          id: choiceId,
          kind: 'pack' as const,
          optional: true as const,
          returnPhase: 'blind-select' as const,
          packId: pack.id,
          packOfferId: stableId<'pack-offer'>('pack-offer:joker-art'),
          options: [{ id: 'option:joker-050', item, consumed: false }],
          remainingPicks: 1,
          temporaryJokerSlots: pack.temporaryJokerSlots,
          temporaryConsumableSlots: pack.temporaryConsumableSlots,
        },
        suspended: [],
      },
    };
    const profile = {
      ...createProfile(1, '拆包戏主', 100),
      activeRunId: run.runId,
    };
    const store = createGameStore(
      createMemoryRepository({
        profiles: [profile],
        runs: [[profile.id, run]],
        activeProfileId: profile.id,
      }),
    );
    render(<App store={store} />);

    const art = await screen.findByTestId('joker-art-bxqp:joker:050');
    expect(art).toHaveAttribute('src', '/assets/jokers/050.webp');
    expect(screen.getByText('当前 +100 筹码')).toBeInTheDocument();
  });
});
