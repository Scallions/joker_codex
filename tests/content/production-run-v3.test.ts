import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunContent } from '../../src/content/runtime/productionRunContent';
import {
  compileRunSetupV3,
  createProductionRunV3,
} from '../../src/content/runtime/runSetupV3';
import { hasRegisteredEffectHandler } from '../../src/game-core/effects/registry';
import { validateRunStateV3 } from '../../src/game-core/invariants/validateRunStateV3';
import { runStateV3Schema } from '../../src/persistence/schemasV3';

describe('生产 V3 牌局初始化', () => {
  it('把 230 项目录投影为完整 V2 执行快照且不引用测试夹具', () => {
    const content = createProductionRunContent(PRODUCTION_CATALOG);
    const effects = [
      ...content.blinds.flatMap(({ effects: entries }) => entries),
      ...content.tags.flatMap(({ effects: entries }) => entries),
      ...content.vouchers.flatMap(({ effects: entries }) => entries),
      ...content.items.flatMap(({ effects: entries }) => entries),
      ...content.packs.flatMap(({ effects: entries }) => entries),
    ];

    expect(content.blinds).toHaveLength(30);
    expect(content.tags).toHaveLength(24);
    expect(content.vouchers).toHaveLength(32);
    expect(content.items).toHaveLength(53);
    expect(content.packs).toHaveLength(32);
    expect(effects.length).toBeGreaterThan(170);
    expect(effects.every(({ handlerId }) => hasRegisteredEffectHandler(handlerId))).toBe(
      true,
    );
    expect(JSON.stringify(content)).not.toContain('fixture:');
  });

  it('创建可克隆、可校验并冻结完整目录快照的默认生产局', () => {
    const run = createProductionRunV3(PRODUCTION_CATALOG, { seed: 'production-v3' });
    const cloned = structuredClone(run);

    expect(run.schemaVersion).toBe(3);
    expect(run.contentVersion).toBe('catalog-baseline-3');
    expect(run.setupV3).toMatchObject({
      deckId: 'bxqp:deck:echo-ledger',
      stakeId: 'bxqp:stake:first-bell',
      appliedStakeIds: ['bxqp:stake:first-bell'],
      challengeId: null,
    });
    expect(run.deck.cards).toHaveLength(52);
    expect(run.rules.discardsPerRound).toBe(4);
    expect(run.productionContentV3.rows).toHaveLength(230);
    expect(run.modifiersV3.playingCards).toHaveLength(52);
    expect(validateRunStateV3(run)).toEqual({ ok: true });
    expect(runStateV3Schema.parse(cloned)).toEqual(cloned);
  });

  it('随机牌组由种子物化，重放完全一致且不同种子不同', () => {
    const first = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'shifting-cast-a',
      deckId: 'bxqp:deck:shifting-cast',
    });
    const replay = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'shifting-cast-a',
      deckId: 'bxqp:deck:shifting-cast',
    });
    const other = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'shifting-cast-b',
      deckId: 'bxqp:deck:shifting-cast',
    });

    expect(first.deck.cards).toEqual(replay.deck.cards);
    expect(first.rngState).toEqual(replay.rngState);
    expect(first.materializedChoicesV3).toEqual(replay.materializedChoicesV3);
    expect(first.deck.cards).not.toEqual(other.deck.cards);
    expect(new Set(first.deck.cards.map(({ id }) => id))).toHaveLength(52);
  });

  it('组合牌组与八阶难度时累积所有规则', () => {
    const faceless = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'faceless',
      deckId: 'bxqp:deck:faceless-troupe',
    });
    const twin = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'twin',
      deckId: 'bxqp:deck:twin-curtain',
    });
    const balanced = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'balanced',
      deckId: 'bxqp:deck:balanced-seal',
      stakeId: 'bxqp:stake:borrowed-mask',
    });

    expect(faceless.deck.cards).toHaveLength(40);
    expect(
      faceless.deck.cards.some(({ rank }) => ['jack', 'queen', 'king'].includes(rank)),
    ).toBe(false);
    expect(twin.deck.cards).toHaveLength(52);
    expect(new Set(twin.deck.cards.map(({ suit }) => suit))).toEqual(
      new Set(['hearts', 'spades']),
    );
    expect(balanced.rules.targetScaleBasisPoints).toBe(20_000);
    expect(balanced.setupV3.appliedStakeIds).toHaveLength(8);
    expect(balanced.rulesV3.targetCurveId).toBe('purple');
    expect(balanced.rulesV3.anteOneThroughEightTargets).toEqual([
      300, 1_000, 3_200, 9_000, 25_000, 60_000, 110_000, 200_000,
    ]);
    expect(balanced.rulesV3.stickerRuleIds).toEqual([
      'bxqp:sticker:permanent',
      'bxqp:sticker:perishable',
      'bxqp:sticker:rental',
    ]);
  });

  it('挑战仅使用第一阶难度并物化牌组改造', () => {
    const faces = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-faces',
      challengeId: 'bxqp:challenge:court-of-faces',
    });
    const sealed = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-sealed',
      challengeId: 'bxqp:challenge:echoing-seal',
    });
    const glass = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'challenge-glass',
      challengeId: 'bxqp:challenge:glass-troupe',
    });

    expect(faces.setupV3.appliedStakeIds).toEqual(['bxqp:stake:first-bell']);
    expect(faces.deck.cards).toHaveLength(52);
    expect(faces.deck.cards.some(({ rank }) => ['2', '3', 'ace'].includes(rank))).toBe(
      false,
    );
    expect(
      faces.deck.cards.filter(({ rank }) => ['jack', 'queen', 'king'].includes(rank)),
    ).toHaveLength(24);
    expect(
      sealed.deck.cards.every(({ sealId }) => sealId === 'bxqp:seal:echo-knot'),
    ).toBe(true);
    expect(
      glass.deck.cards.every(
        ({ enhancementId }) => enhancementId === 'bxqp:enhancement:glass-ribbon',
      ),
    ).toBe(true);
  });

  it('严格依赖模式只接受完整解析集合', () => {
    const resolved = new Set(PRODUCTION_CATALOG.dependencies.map(({ id }) => id));
    const setup = compileRunSetupV3(PRODUCTION_CATALOG, {
      challengeId: 'bxqp:challenge:empty-house',
    });
    const run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'strict-dependencies',
      challengeId: 'bxqp:challenge:empty-house',
      validationMode: 'integration-strict',
      resolvedExternalIds: resolved,
    });

    expect(setup.requiredExternalIds).toEqual(['bxqp:joker:001']);
    expect(run.externalDependenciesV3.validationMode).toBe('integration-strict');
    expect(run.externalDependenciesV3.resolvedIds).toEqual(['bxqp:joker:001']);
  });

  it('双牌复制消耗牌要求恰好选择两张牌', () => {
    const content = createProductionRunContent(PRODUCTION_CATALOG);
    const mirror = content.items.find(
      ({ contentId }) => contentId === 'bxqp:tarot:mirror-transfer',
    );

    expect(mirror).toMatchObject({
      kind: 'consumable',
      targetKind: 'playing-card',
      minimumTargets: 2,
      maximumTargets: 2,
    });
  });
});
