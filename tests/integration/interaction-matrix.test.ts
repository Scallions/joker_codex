import { EFFECT_WINDOWS } from '../../src/game-core/model/runV2';
import {
  RELEASE_INTERACTION_RULES,
  RELEASE_RISK_CASES,
  auditReleaseInteractions,
  type ReleaseInteractionRule,
} from './releaseInteractions';

describe('发布能力交互矩阵', () => {
  it('所有效果原语、26 个窗口与顺序敏感场景都有唯一可执行归属', () => {
    const audit = auditReleaseInteractions(
      EFFECT_WINDOWS,
      RELEASE_INTERACTION_RULES,
      RELEASE_RISK_CASES,
    );

    expect(EFFECT_WINDOWS).toHaveLength(26);
    expect(audit.effectOperationTypes).toHaveLength(74);
    expect(audit.coveredWindows).toEqual([...EFFECT_WINDOWS].sort());
    expect(audit.coveredRiskCaseIds).toEqual([
      'card-modifier-score-destroy',
      'challenge-frozen-pools',
      'copy-retrigger-debuff',
      'destruction-clone-snapshot',
      'listed-chance',
      'sale-boss-payout',
      'tag-voucher-pack-capacity',
      'terminal-progression-endless',
    ]);
    expect(audit).toMatchObject({
      uncoveredEffectOperationTypes: [],
      multiplyCoveredEffectOperationTypes: [],
      uncoveredWindows: [],
      multiplyCoveredWindows: [],
      duplicateRiskCaseIds: [],
      missingTestFiles: [],
      invalidRuleIds: [],
    });
  });

  it('拒绝重复、空归属及缺少真实测试文件的台账规则', () => {
    const duplicate = RELEASE_INTERACTION_RULES[0];
    if (!duplicate) throw new Error('缺少发布交互规则');
    const malformed = [
      ...RELEASE_INTERACTION_RULES,
      { ...duplicate, id: 'release:duplicate-owner' },
      {
        id: 'release:empty-owner',
        operationTypes: [],
        windows: [],
        testFiles: [],
      },
      {
        id: 'release:stale-owner',
        operationTypes: [],
        windows: [],
        testFiles: ['tests/integration/does-not-exist.test.ts'],
      },
    ] satisfies readonly ReleaseInteractionRule[];
    const audit = auditReleaseInteractions(EFFECT_WINDOWS, malformed, RELEASE_RISK_CASES);

    expect(audit.multiplyCoveredEffectOperationTypes.length).toBeGreaterThan(0);
    expect(audit.multiplyCoveredWindows.length).toBeGreaterThan(0);
    expect(audit.invalidRuleIds).toEqual(['release:empty-owner', 'release:stale-owner']);
    expect(audit.missingTestFiles).toContain('tests/integration/does-not-exist.test.ts');
  });
});
