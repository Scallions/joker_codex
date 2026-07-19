import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { validateRunStateV5 } from '../../src/game-core/invariants/validateRunStateV5';
import { runStateV5Schema } from '../../src/persistence/schemasV5';

describe('生产 V5 牌局初始化', () => {
  it('冻结 330 项目录与 100 张真实奇牌定义', () => {
    const run = createProductionRunV5(PRODUCTION_CATALOG, { seed: 'production-v5' });
    const jokers = run.content.items.filter((item) => item.kind === 'joker');

    expect(run).toMatchObject({
      schemaVersion: 5,
      contentVersion: 'joker-catalog-2',
      jokerRuntimeV5: {
        initialDeckSize: run.deck.cards.length,
        sharedRoundTargetRank: null,
        sharedRoundTargetSuit: null,
        bossDisabledForRound: false,
      },
      migrationV5: {
        sourceSchemaVersion: 5,
        sourceContentVersion: 'joker-catalog-2',
        sourceCheckpointId: 0,
      },
    });
    expect(run.productionContentV3.rows).toHaveLength(330);
    expect(jokers).toHaveLength(100);
    expect(jokers.at(-1)?.contentId).toBe('bxqp:joker:100');
    expect(runStateV5Schema.parse(structuredClone(run))).toEqual(run);
    expect(validateRunStateV5(run)).toEqual({ ok: true });
  });
});
