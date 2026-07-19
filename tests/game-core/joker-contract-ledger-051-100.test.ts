import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { resolveEffectQueue } from '../../src/game-core/effects/registry';
import { validateRunStateV5 } from '../../src/game-core/invariants/validateRunStateV5';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import {
  decodeRunStateV5FromTransfer,
  encodeRunStateV5ForTransfer,
} from '../../src/persistence/scoreWire';
import { runStateV5Schema } from '../../src/persistence/schemasV5';

const IDS = Array.from(
  { length: 50 },
  (_, index) => `bxqp:joker:${(index + 51).toString().padStart(3, '0')}`,
);

function initial(seed: string): RunStateV5 {
  const state = createProductionRunV5(PRODUCTION_CATALOG, { seed });
  return { ...state, rules: { ...state.rules, jokerSlots: 30 } };
}

function acquire(state: RunStateV5, contentId: string, index: number): RunStateV5 {
  const result = acquireContentByIdV3(state, contentId, `ledger:${index}:${contentId}`);
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

describe('J051-J100 可执行契约总账', () => {
  it('每张生产奇牌都编译出真实窗口与已注册操作，生命周期窗口不退化成 item-acquired', () => {
    const run = initial('j051-100-runtime-ledger');
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
        if (resolved.ok) {
          expect(
            resolved.operations.length,
            `${definition.contentId}:${window}`,
          ).toBeGreaterThan(0);
        }
      }
    }

    const byId = new Map(
      definitions.map((definition) => [definition.contentId, definition]),
    );
    expect(
      byId.get('bxqp:joker:055')?.effects.flatMap((effect) => effect.windows),
    ).toContain('consumable-used');
    expect(
      byId.get('bxqp:joker:085')?.effects.flatMap((effect) => effect.windows),
    ).toContain('pack-opened');
    expect(
      byId.get('bxqp:joker:096')?.effects.flatMap((effect) => effect.windows),
    ).toContain('shop-rerolled');
  });

  it('batch-001-100-copy-debuff-order：所有 50 张来源被减益时，每个窗口都输出零操作', () => {
    const run = initial('j051-100-debuff-ledger');
    const definitions = run.content.items.filter(
      (item) => item.kind === 'joker' && IDS.includes(item.contentId),
    );
    for (const definition of definitions) {
      const windows = new Set(definition.effects.flatMap((effect) => effect.windows));
      for (const window of windows) {
        const resolved = resolveEffectQueue(
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
        );
        expect(resolved).toMatchObject({ ok: true, operations: [] });
      }
    }
  });

  it('全部可变新奇牌的实例状态与共享目标可经 schema 和传输格式无损往返', () => {
    const mutableIds = [
      55, 58, 60, 63, 64, 65, 68, 70, 74, 75, 80, 83, 91, 96, 97, 98, 99, 100,
    ].map((ordinal) => `bxqp:joker:${ordinal.toString().padStart(3, '0')}`);
    let state = initial('j051-100-mutable-reload');
    for (const [index, contentId] of mutableIds.entries()) {
      state = acquire(state, contentId, index);
    }
    state = {
      ...state,
      checkpointId: Math.max(
        state.checkpointId,
        ...state.materializedChoicesV3.map((choice) => choice.checkpointId),
      ),
    };
    const mutated: RunStateV5 = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        jokers: state.modifiersV3.jokers.map((modifier) => ({
          ...modifier,
          abilityState: Object.fromEntries(
            Object.entries(modifier.abilityState).map(([key, value]) => [
              key,
              typeof value === 'number' && key !== 'multFactorHundredths'
                ? Math.max(0, value - 1)
                : value,
            ]),
          ),
        })),
      },
    };
    expect(validateRunStateV5(mutated)).toEqual({ ok: true });
    const parsed = runStateV5Schema.parse(structuredClone(mutated));
    expect(parsed).toEqual(mutated);
    expect(validateRunStateV5(parsed)).toEqual({ ok: true });
    expect(decodeRunStateV5FromTransfer(encodeRunStateV5ForTransfer(mutated))).toEqual(
      mutated,
    );
  });
});
