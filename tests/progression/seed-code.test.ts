import { parseSeedInput, serializeSeedCode } from '../../src/progression/seedCode';

describe('种子分享码', () => {
  it('规范化纯种子并精确往返当前内容版本', () => {
    const plain = parseSeedInput('ab12cd34', {
      deckReference: 'D01',
      stakeReference: 'S01',
    });
    expect(plain).toMatchObject({
      ok: true,
      preview: {
        contentVersion: 'progression-modes-1',
        seed: 'AB12CD34',
        deckReference: 'D01',
        stakeReference: 'S01',
      },
    });
    if (!plain.ok) return;

    const code = serializeSeedCode(plain.preview);
    expect(code).toBe('BXQP1|progression-modes-1|AB12CD34|D01|S01');
    expect(parseSeedInput(code, null)).toEqual(plain);
  });

  it('拒绝格式错误与不受支持的未来内容版本', () => {
    expect(parseSeedInput('BXQP1|future-2|AB12CD34|D01|S01', null)).toMatchObject({
      ok: false,
      code: 'unsupported-version',
    });
    expect(parseSeedInput('有空格 123', null)).toMatchObject({
      ok: false,
      code: 'invalid-seed',
    });
  });
});
