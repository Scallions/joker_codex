import {
  buildFrozenJokerSourceGraphV6,
  resolveEffectQueue,
  type EffectQueueSource,
} from '../../src/game-core/effects/registry';
import type { EffectReference } from '../../src/game-core/model/runV2';

function scoreEffect(id: string): EffectReference {
  return {
    id,
    handlerId: 'bxqp:handler:joker-score',
    windows: ['joker-independent'],
    priority: 0,
    parameters: {
      metric: 'chips',
      predicate: JSON.stringify({ kind: 'always' }),
      value: JSON.stringify({ kind: 'fixed', value: 10 }),
      copyFacet: 'output',
    },
  };
}

function stateEffect(id: string): EffectReference {
  return {
    id,
    handlerId: 'bxqp:handler:joker-state-change',
    windows: ['joker-independent'],
    priority: 1,
    parameters: {
      key: 'storedChips',
      mode: 'add',
      predicate: JSON.stringify({ kind: 'always' }),
      value: JSON.stringify({ kind: 'fixed', value: 1 }),
      copyFacet: 'none',
    },
  };
}

function source(
  instanceId: string,
  position: number,
  options: Partial<EffectQueueSource> = {},
): EffectQueueSource {
  return {
    instanceId,
    position,
    effects: [],
    copyPolicy: 'none',
    copyTarget: 'none',
    ...options,
  };
}

describe('V6 冻结奇牌复制图', () => {
  it('按完整布局冻结右邻，失效节点不会被跳过', () => {
    const sources = [
      source('router', 0, { copyPolicy: 'route', copyTarget: 'right-adjacent' }),
      source('blocked', 1, {
        debuffed: true,
        copyPolicy: 'output',
        effects: [scoreEffect('blocked-score')],
      }),
      source('later', 2, {
        copyPolicy: 'output',
        effects: [scoreEffect('later-score')],
      }),
    ];
    const graph = buildFrozenJokerSourceGraphV6(sources, 'event-1');
    const resolved = resolveEffectQueue(sources, 'joker-independent');

    expect(graph.nodes.map(({ instanceId, active }) => [instanceId, active])).toEqual([
      ['router', true],
      ['blocked', false],
      ['later', true],
    ]);
    expect(resolved).toMatchObject({ ok: true });
    if (!resolved.ok) return;
    expect(resolved.operations.map(({ sourceInstanceId }) => sourceInstanceId)).toEqual([
      'later',
    ]);
  });

  it('路由链沿目标锚点继续，动态自环与循环只抑制该分支', () => {
    const chain = [
      source('left', 0, {
        copyPolicy: 'output',
        effects: [scoreEffect('left-score')],
      }),
      source('right-router', 1, {
        copyPolicy: 'route',
        copyTarget: 'right-adjacent',
      }),
      source('left-router', 2, {
        copyPolicy: 'route',
        copyTarget: 'leftmost',
      }),
    ];
    const resolved = resolveEffectQueue(chain, 'joker-independent');
    expect(resolved).toMatchObject({ ok: true });
    if (!resolved.ok) return;
    expect(resolved.operations).toEqual([
      expect.objectContaining({ sourceInstanceId: 'left', copiedBy: [] }),
      expect.objectContaining({
        sourceInstanceId: 'left',
        copiedBy: ['right-router', 'left-router'],
      }),
      expect.objectContaining({
        sourceInstanceId: 'left',
        copiedBy: ['left-router'],
      }),
    ]);

    const cycle = [
      source('right', 0, {
        copyPolicy: 'route',
        copyTarget: 'right-adjacent',
      }),
      source('leftmost', 1, {
        copyPolicy: 'route',
        copyTarget: 'leftmost',
      }),
    ];
    expect(resolveEffectQueue(cycle, 'joker-independent')).toMatchObject({
      ok: true,
      operations: [],
    });
  });

  it('复制时只保留目标声明的兼容分面', () => {
    const sources = [
      source('router', 0, { copyPolicy: 'route', copyTarget: 'right-adjacent' }),
      source('target', 1, {
        copyPolicy: 'output',
        effects: [scoreEffect('score'), stateEffect('growth')],
      }),
    ];
    const resolved = resolveEffectQueue(sources, 'joker-independent');
    expect(resolved).toMatchObject({ ok: true });
    if (!resolved.ok) return;
    expect(
      resolved.operations.map(({ effectId, copiedBy }) => [effectId, copiedBy]),
    ).toEqual([
      ['score', ['router']],
      ['score', []],
      ['growth', []],
    ]);
  });
});
