import {
  ACHIEVEMENT_DEFINITIONS,
  OBJECTIVE_DEFINITIONS,
  validateProgressionDefinitions,
} from '../../src/progression/definitions';

describe('进度注册表', () => {
  it('闭合 78 个内容目标与 31 项公开成就的全部依赖', () => {
    expect(validateProgressionDefinitions()).toEqual({ ok: true });

    expect(
      Object.fromEntries(
        ['deck', 'stake', 'challenge', 'voucher', 'tag'].map((family) => [
          family,
          OBJECTIVE_DEFINITIONS.filter((definition) => definition.family === family)
            .length,
        ]),
      ),
    ).toEqual({ deck: 14, stake: 7, challenge: 20, voucher: 32, tag: 5 });

    expect(
      Object.fromEntries(
        ['入场', '牌技', '经营', '收藏', '挑战', '终局'].map((category) => [
          category,
          ACHIEVEMENT_DEFINITIONS.filter((definition) => definition.category === category)
            .length,
        ]),
      ),
    ).toEqual({ 入场: 6, 牌技: 8, 经营: 5, 收藏: 5, 挑战: 4, 终局: 3 });
  });
});
