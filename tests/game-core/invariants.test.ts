import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { validateRunState } from '../../src/game-core/invariants/validateRunState';
import { stableId } from '../../src/game-core/model/ids';

describe('运行状态不变量', () => {
  it('拒绝重复牌与悬空选择，同时接受完整夹具状态', () => {
    const valid = createFixtureRun('invariant-script');
    expect(validateRunState(valid)).toEqual({ ok: true });

    const invalid = {
      ...valid,
      hand: [...valid.hand, valid.hand[0]!],
      selectedCardIds: [stableId<'playing-card'>('missing-card')],
    };
    const result = validateRunState(invalid);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('无效状态不应通过');
    expect(result.violations).toContain('牌组必须恰好包含 52 个唯一实例');
    expect(result.violations).toContain('选择区只能引用当前手牌');
  });
});
