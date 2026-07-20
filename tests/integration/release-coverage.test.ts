import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { RELEASE_COVERAGE_RULES, auditReleaseCoverage } from './releaseCoverage';

describe('发布覆盖账本', () => {
  it('让每一项生产目录内容恰好归属一个明确的测试覆盖规则', () => {
    const report = auditReleaseCoverage(PRODUCTION_CATALOG.rows, RELEASE_COVERAGE_RULES);

    expect(report.coveredIds).toEqual(PRODUCTION_CATALOG.rows.map((row) => row.id));
    expect(report.uncoveredIds).toEqual([]);
    expect(report.multiplyCoveredIds).toEqual([]);
    expect(report.missingTestFiles).toEqual([]);
    expect(report.invalidRuleIds).toEqual([]);
  });

  it('拒绝重复规则身份，避免两个账本条目被误当成独立证据', () => {
    const first = RELEASE_COVERAGE_RULES[0];
    const second = RELEASE_COVERAGE_RULES[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    const report = auditReleaseCoverage(PRODUCTION_CATALOG.rows, [
      first,
      { ...second, id: first.id },
      ...RELEASE_COVERAGE_RULES.slice(2),
    ]);

    expect(report.invalidRuleIds).toEqual([first.id]);
  });

  it('要求每个奇牌范围显式拥有受减益覆盖', () => {
    const jokerRuleIndex = RELEASE_COVERAGE_RULES.findIndex(
      (rule) => rule.selector.family === 'joker',
    );
    const jokerRule = RELEASE_COVERAGE_RULES[jokerRuleIndex];
    expect(jokerRule).toBeDefined();
    if (!jokerRule || jokerRuleIndex < 0) return;

    const report = auditReleaseCoverage(PRODUCTION_CATALOG.rows, [
      ...RELEASE_COVERAGE_RULES.slice(0, jokerRuleIndex),
      {
        ...jokerRule,
        contractKinds: jokerRule.contractKinds.filter((kind) => kind !== 'debuffed'),
      },
      ...RELEASE_COVERAGE_RULES.slice(jokerRuleIndex + 1),
    ]);

    expect(report.invalidRuleIds).toEqual([jokerRule.id]);
  });
});
