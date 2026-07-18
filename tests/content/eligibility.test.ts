import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import {
  catalogRowIsExcludedBySemanticRules,
  catalogEligibility,
  eligibleCatalogRows,
  type EligibilityContext,
} from '../../src/content/runtime/eligibility';

function context(overrides: Partial<EligibilityContext> = {}): EligibilityContext {
  return {
    source: 'shop',
    ante: 1,
    challengeId: null,
    ownedContentIds: new Set(),
    offeredContentIds: new Set(),
    playedHandIds: new Set(),
    completedObjectiveIds: new Set(),
    discoveredContentIds: new Set(),
    availableExternalIds: new Set(PRODUCTION_CATALOG.dependencies.map(({ id }) => id)),
    bannedContentIds: new Set(),
    excludedFamilies: new Set(),
    allowDuplicates: false,
    ...overrides,
  };
}

describe('统一内容资格服务', () => {
  it('统一处理幕次、先决、秘密牌型与重复项', () => {
    const lateBlind = PRODUCTION_CATALOG.rows.find(
      (row) => row.id === 'bxqp:blind:coin-ox',
    );
    const dependentVoucher = PRODUCTION_CATALOG.rows.find(
      (row) => row.id === 'bxqp:voucher:fourth-stall',
    );
    const secretPlanet = PRODUCTION_CATALOG.rows.find(
      (row) => row.id === 'bxqp:planet:five-mask-star',
    );
    expect(lateBlind && dependentVoucher && secretPlanet).toBeTruthy();
    if (!lateBlind || !dependentVoucher || !secretPlanet) return;

    expect(catalogEligibility(lateBlind, context()).eligible).toBe(false);
    expect(catalogEligibility(lateBlind, context({ ante: 6 })).eligible).toBe(true);
    expect(catalogEligibility(dependentVoucher, context()).eligible).toBe(false);
    expect(
      catalogEligibility(
        dependentVoucher,
        context({ ownedContentIds: new Set(['bxqp:voucher:third-stall']) }),
      ).eligible,
    ).toBe(true);
    expect(catalogEligibility(secretPlanet, context()).eligible).toBe(false);
    expect(
      catalogEligibility(
        secretPlanet,
        context({ playedHandIds: new Set(['five-of-a-kind']) }),
      ).eligible,
    ).toBe(true);
    expect(
      catalogEligibility(
        secretPlanet,
        context({
          playedHandIds: new Set(['five-of-a-kind']),
          offeredContentIds: new Set([secretPlanet.id]),
        }),
      ),
    ).toEqual({ eligible: false, reason: 'duplicate-excluded' });
  });

  it('外部依赖缺失时不让奇牌生成路由进入候选池', () => {
    const summon = PRODUCTION_CATALOG.rows.find(
      (row) => row.id === 'bxqp:tarot:summon-mask',
    );
    expect(summon).toBeDefined();
    if (!summon) return;
    expect(
      catalogEligibility(summon, context({ availableExternalIds: new Set() })),
    ).toEqual({ eligible: false, reason: 'external-dependency-missing' });
  });

  it('候选输出按稳定内容 ID 排序', () => {
    const eligible = eligibleCatalogRows(
      [...PRODUCTION_CATALOG.rows].reverse(),
      context({ ante: 20, allowDuplicates: true }),
    );
    const ids = eligible.map(({ id }) => id);
    expect(ids).toEqual([...ids].sort((left, right) => left.localeCompare(right)));
  });

  it('把挑战语义禁令映射到目录操作而不是硬编码内容 ID', () => {
    const discount = PRODUCTION_CATALOG.rows.find(
      ({ id }) => id === 'bxqp:voucher:quarter-price',
    )!;
    const sellFinisher = PRODUCTION_CATALOG.rows.find(
      ({ family, effects }) =>
        family === 'blind' &&
        effects.some((effect) =>
          effect.operations.some(
            (operation) =>
              operation.type === 'blind-rule' &&
              operation.key === 'debuff-until-joker-sold',
          ),
        ),
    )!;

    expect(
      catalogRowIsExcludedBySemanticRules(discount, new Set(['discount-voucher-pair'])),
    ).toBe(true);
    expect(
      catalogRowIsExcludedBySemanticRules(
        sellFinisher,
        new Set(['sell-to-enable-finisher']),
      ),
    ).toBe(true);
    expect(catalogRowIsExcludedBySemanticRules(discount, new Set())).toBe(false);
  });
});
