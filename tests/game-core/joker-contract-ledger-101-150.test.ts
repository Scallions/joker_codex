import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV6 } from '../../src/content/runtime/runSetupV6';
import { resolveEffectQueue } from '../../src/game-core/effects/registry';

const IDS = Array.from(
  { length: 50 },
  (_, index) => `bxqp:joker:${(index + 101).toString().padStart(3, '0')}`,
);

describe('J101-J150 可执行契约总账', () => {
  it('50 张生产定义均编译到真实窗口与已注册操作', () => {
    const run = createProductionRunV6(PRODUCTION_CATALOG, {
      seed: 'j101-150-runtime-ledger',
    });
    const definitions = run.content.items.filter(
      (item) => item.kind === 'joker' && IDS.includes(item.contentId),
    );
    expect(definitions.map((definition) => definition.contentId)).toEqual(IDS);
    for (const definition of definitions) {
      expect(definition.effects.length).toBeGreaterThan(0);
      const windows = new Set(definition.effects.flatMap((effect) => effect.windows));
      for (const window of windows) {
        const resolved = resolveEffectQueue(
          [
            {
              instanceId: `ledger:${definition.contentId}`,
              position: 1_000,
              effects: definition.effects,
            },
          ],
          window,
          { state: run },
        );
        expect(resolved.ok, `${definition.contentId}:${window}`).toBe(true);
        if (resolved.ok) expect(resolved.operations.length).toBeGreaterThan(0);
      }
    }
  });

  it('所有来源减益时，每个窗口都输出零操作', () => {
    const run = createProductionRunV6(PRODUCTION_CATALOG, {
      seed: 'j101-150-debuff-ledger',
    });
    const definitions = run.content.items.filter(
      (item) => item.kind === 'joker' && IDS.includes(item.contentId),
    );
    for (const definition of definitions) {
      for (const window of new Set(
        definition.effects.flatMap((effect) => effect.windows),
      )) {
        expect(
          resolveEffectQueue(
            [
              {
                instanceId: `ledger:${definition.contentId}`,
                position: 1_000,
                effects: definition.effects,
                debuffed: true,
              },
            ],
            window,
            { state: run },
          ),
        ).toMatchObject({ ok: true, operations: [] });
      }
    }
  });
});
