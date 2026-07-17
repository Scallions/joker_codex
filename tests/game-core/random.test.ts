import { createRandomState, nextUint32 } from '../../src/game-core/rng/random';

describe('项目自有随机数契约', () => {
  it('为中文种子生成冻结的 32 位黄金向量', () => {
    let state = createRandomState('百戏奇牌');
    const values: number[] = [];

    expect(state).toBe(3965272257);

    for (let index = 0; index < 6; index += 1) {
      const result = nextUint32(state);
      state = result.state;
      values.push(result.value);
    }

    expect(values).toEqual([
      1281449665, 2425417405, 631639006, 2137690032, 4245653310, 2967500938,
    ]);
  });
});
