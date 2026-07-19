import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import {
  jokerPredicateSchema,
  validateJokerPredicateDepth,
  type JokerPredicate,
} from '../../src/content/schema/catalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { resolveEffectOperations } from '../../src/game-core/effects/registry';
import type { CardId } from '../../src/game-core/model/ids';
import type { EffectReference, RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import { buildHandFactsV3 } from '../../src/game-core/poker/handFactsV3';
import {
  evaluateJokerPredicateV3,
  evaluateJokerValueV3,
  type JokerDslContextV3,
} from '../../src/game-core/rules/jokerEffectDslV3';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
  enhancementId: string | null = null,
): RunPlayingCard {
  return {
    id: `dsl:${id}` as CardId,
    suit,
    rank,
    enhancementId,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function context(): JokerDslContextV3 {
  let state = createProductionRunV4(PRODUCTION_CATALOG, { seed: 'joker-dsl' });
  const acquired = acquireContentByIdV3(state, 'bxqp:joker:050', 'dsl-source');
  if (!acquired.ok || !isRunStateV4(acquired.state)) {
    throw new Error(acquired.ok ? '没有保持 V4' : acquired.message);
  }
  state = acquired.state;
  const played = [
    card('wild-8', 'hearts', '8', 'bxqp:enhancement:four-winds'),
    card('8', 'clubs', '8'),
  ];
  const held = [card('held-3-a', 'spades', '3'), card('held-3-b', 'clubs', '3')];
  const facts = buildHandFactsV3(state, played, held);
  if (!facts.ok) throw new Error(facts.message);
  return {
    state,
    facts: facts.facts,
    sourceInstanceId: state.inventory.jokers[0]!.instanceId,
    window: 'scored-card',
    cardId: played[0]!.id,
    rngState: state.rngState,
    originalStencilCount: 0,
  };
}

describe('奇牌谓词与动态值 DSL', () => {
  it('严格拒绝未知字段和超深组合，并接受受限组合谓词', () => {
    const valid: JokerPredicate = {
      kind: 'all',
      predicates: [
        { kind: 'hand-contains', fact: 'pair' },
        { kind: 'scored-card-rank-in', ranks: ['8'] },
      ],
    };
    expect(jokerPredicateSchema.safeParse(valid).success).toBe(true);
    expect(validateJokerPredicateDepth(valid)).toBe(true);
    expect(
      jokerPredicateSchema.safeParse({ ...valid, arbitraryCode: 'return true' }).success,
    ).toBe(false);

    let deep: JokerPredicate = { kind: 'always' };
    for (let index = 0; index < 6; index += 1) {
      deep = { kind: 'all', predicates: [deep] };
    }
    expect(validateJokerPredicateDepth(deep)).toBe(false);
  });

  it('按有效身份、独立手牌事实和最右最低留手牌求值', () => {
    const ctx = context();
    const predicates: readonly JokerPredicate[] = [
      { kind: 'hand-contains', fact: 'pair' },
      { kind: 'scored-card-suit', suit: 'diamonds' },
      { kind: 'scored-card-rank-in', ranks: ['8'] },
    ];
    for (const predicate of predicates) {
      expect(evaluateJokerPredicateV3(predicate, ctx)).toMatchObject({
        ok: true,
        matched: true,
      });
    }
    expect(
      evaluateJokerPredicateV3(
        { kind: 'held-lowest-rank' },
        { ...ctx, window: 'held-card', cardId: ctx.facts.heldCardIds[1]! },
      ),
    ).toMatchObject({ ok: true, matched: true });
  });

  it('组合谓词短路时不消耗概率 RNG，命中概率时记录唯一整数掷骰', () => {
    const ctx = context();
    const skipped = evaluateJokerPredicateV3(
      {
        kind: 'all',
        predicates: [
          { kind: 'remaining-discards', comparison: 'any' },
          { kind: 'chance', numerator: 1, denominator: 2 },
        ],
      },
      ctx,
    );
    expect(skipped).toEqual({
      ok: true,
      matched: false,
      rngState: ctx.rngState,
      rolls: [],
    });

    const rolled = evaluateJokerPredicateV3(
      { kind: 'chance', numerator: 1, denominator: 2 },
      ctx,
    );
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.rngState).not.toBe(ctx.rngState);
    expect(rolled.rolls).toHaveLength(1);
    expect(rolled.rolls[0]).toMatchObject({ minimum: 0, maximum: 1 });
  });

  it('来源状态和闭区间随机值只从声明上下文读取并返回可重放证据', () => {
    const ctx = context();
    expect(
      evaluateJokerValueV3({ kind: 'source-state', key: 'remainingChips' }, ctx),
    ).toMatchObject({ ok: true, value: 100, rolls: [] });
    expect(
      evaluateJokerValueV3({ kind: 'source-state', key: 'unknown' }, ctx),
    ).toMatchObject({ ok: false, code: 'joker-state-key' });

    const random = evaluateJokerValueV3(
      { kind: 'uniform-integer', minimum: 0, maximum: 23 },
      ctx,
    );
    const replay = evaluateJokerValueV3(
      { kind: 'uniform-integer', minimum: 0, maximum: 23 },
      ctx,
    );
    expect(random).toEqual(replay);
    expect(random.ok).toBe(true);
    if (!random.ok) return;
    expect(random.value).toBeGreaterThanOrEqual(0);
    expect(random.value).toBeLessThanOrEqual(23);
    expect(random.rolls).toHaveLength(1);
  });

  it('目录参数经纯 handler 还原为带复制侧面的类型化计分操作', () => {
    const predicate: JokerPredicate = {
      kind: 'scored-card-rank-in',
      ranks: ['ace', '8'],
    };
    const effect: EffectReference = {
      id: 'test:joker-dsl-handler',
      handlerId: 'bxqp:handler:joker-score',
      windows: ['scored-card'],
      priority: 0,
      parameters: {
        metric: 'mult',
        predicate: JSON.stringify(predicate),
        value: JSON.stringify({ kind: 'fixed', value: 8 }),
        copyFacet: 'output',
      },
    };
    expect(resolveEffectOperations(effect, 'scored-card')).toEqual({
      ok: true,
      operations: [
        {
          type: 'joker-score',
          metric: 'mult',
          predicate,
          value: { kind: 'fixed', value: 8 },
          copyFacet: 'output',
        },
      ],
    });
  });
});
