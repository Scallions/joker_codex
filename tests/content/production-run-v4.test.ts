import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { validateRunStateV4 } from '../../src/game-core/invariants/validateRunStateV4';
import { isRunStateV4 } from '../../src/game-core/model/runV4';
import { runStateV4Schema } from '../../src/persistence/schemasV4';

describe('生产 V4 牌局初始化', () => {
  it('冻结 280 项目录与 50 张真实奇牌定义', () => {
    const run = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'production-v4',
    });
    const jokers = run.content.items.filter((item) => item.kind === 'joker');

    expect(run).toMatchObject({
      schemaVersion: 4,
      contentVersion: 'joker-catalog-1',
      migrationV4: {
        sourceSchemaVersion: 4,
        sourceContentVersion: 'joker-catalog-1',
        sourceCheckpointId: 0,
      },
    });
    expect(run.productionContentV3).toMatchObject({
      contentVersion: 'joker-catalog-1',
    });
    expect(run.productionContentV3.rows).toHaveLength(280);
    expect(jokers).toHaveLength(50);
    expect(jokers[0]?.contentId).toBe('bxqp:joker:001');
    expect(jokers[49]?.contentId).toBe('bxqp:joker:050');
    expect(runStateV4Schema.parse(structuredClone(run))).toEqual(run);
    expect(validateRunStateV4(run)).toEqual({ ok: true });
  });

  it('把本批奇牌作为真实挑战起始实例并在命令后保持 V4', () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'production-v4-starting-jokers',
      challengeId: 'bxqp:challenge:empty-house',
    });

    expect(initial.inventory.jokers).toHaveLength(5);
    expect(
      initial.inventory.jokers.every((joker) => joker.contentId === 'bxqp:joker:001'),
    ).toBe(true);
    expect(initial.modifiersV3.jokers).toHaveLength(5);
    expect(
      initial.modifiersV3.jokers.every(
        (modifier) => Object.keys(modifier.abilityState).length === 0,
      ),
    ).toBe(true);
    expect(initial.externalDependenciesV3.requiredIds).toEqual([]);

    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.state.schemaVersion).toBe(4);
    expect(validateRunStateV4(selected.state as typeof initial)).toEqual({
      ok: true,
    });
  });

  it('获得有状态奇牌时原子初始化定义给出的能力状态', () => {
    const initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'production-v4-acquire-state',
    });
    const acquired = acquireContentByIdV3(initial, 'bxqp:joker:050', 'acquire-j050');

    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    const owned = acquired.state.inventory.jokers[0];
    expect(owned).toBeDefined();
    expect(isRunStateV4(acquired.state)).toBe(true);
    if (!isRunStateV4(acquired.state)) return;
    expect(
      acquired.state.modifiersV3.jokers.find(
        (modifier) => modifier.instanceId === owned?.instanceId,
      )?.abilityState,
    ).toEqual({ remainingChips: 100 });
  });

  it.each(['bxqp:joker:038', 'bxqp:joker:050'])(
    '%s 不会被“全部新奇牌永久封签”规则附加永久贴签',
    (contentId) => {
      const initial = createProductionRunV4(PRODUCTION_CATALOG, {
        seed: `production-v4-no-permanent:${contentId}`,
      });
      const prepared = {
        ...initial,
        rulesV3: {
          ...initial.rulesV3,
          excludedRuleKeys: [
            ...initial.rulesV3.excludedRuleKeys,
            'permanent-jokers',
            'all-acquired',
          ],
        },
      };
      const acquired = acquireContentByIdV3(
        prepared,
        contentId,
        `no-permanent:${contentId}`,
        'normal',
      );

      expect(acquired.ok).toBe(true);
      if (!acquired.ok || !isRunStateV4(acquired.state)) return;
      expect(acquired.state.modifiersV3.jokers[0]?.stickerIds).not.toContain(
        'bxqp:sticker:permanent',
      );
      expect(acquired.state.modifiersV3.jokers[0]?.saleAllowed).toBe(true);
    },
  );

  it.each(['bxqp:joker:021', 'bxqp:joker:044', 'bxqp:joker:049'])(
    '%s 不参与枯萎贴签随机检定',
    (contentId) => {
      const initial = createProductionRunV4(PRODUCTION_CATALOG, {
        seed: `production-v4-no-perishable:${contentId}`,
      });
      const prepared = {
        ...initial,
        rulesV3: {
          ...initial.rulesV3,
          stickerRuleIds: ['bxqp:sticker:perishable'],
        },
      };
      const acquired = acquireContentByIdV3(
        prepared,
        contentId,
        `no-perishable:${contentId}`,
        'normal',
      );

      expect(acquired.ok).toBe(true);
      if (!acquired.ok || !isRunStateV4(acquired.state)) return;
      expect(acquired.state.modifiersV3.jokers[0]?.stickerIds).not.toContain(
        'bxqp:sticker:perishable',
      );
      expect(acquired.state.modifiersV3.jokers[0]?.perishableRoundsRemaining).toBeNull();
      expect(acquired.state.materializedChoicesV3.at(-1)).toMatchObject({
        kind: 'joker-sticker-roll',
        valueIds: [],
        valueNumbers: [],
      });
    },
  );
});
