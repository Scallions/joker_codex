import { createFixtureRun } from '../../src/content/fixtures/foundation';
import {
  decodeRunStateV2FromTransfer,
  encodeRunStateV2ForTransfer,
} from '../../src/persistence/scoreWire';
import { migrateRunV1ToV2 } from '../../src/persistence/migrations/migrateRunV1ToV2';

describe('非有限分数传输编码', () => {
  it('将正无穷显式编码并无损恢复，不让 JSON 静默写成 null', () => {
    const migrated = migrateRunV1ToV2(createFixtureRun('score-wire'));
    if (!migrated.round) throw new Error('夹具缺少回合');
    const run = {
      ...migrated,
      round: { ...migrated.round, targetScore: Number.POSITIVE_INFINITY },
    };

    const encoded = encodeRunStateV2ForTransfer(run);
    const text = JSON.stringify(encoded);
    expect(text).toContain('"Infinity"');
    expect(text).not.toContain('"targetScore":null');
    expect(decodeRunStateV2FromTransfer(JSON.parse(text) as unknown)).toEqual(run);
  });

  it('拒绝 null、NaN 字样和负无穷分数', () => {
    const migrated = migrateRunV1ToV2(createFixtureRun('score-wire-invalid'));
    const encoded = encodeRunStateV2ForTransfer(migrated) as {
      round: Record<string, unknown>;
    };

    for (const invalid of [null, 'NaN', '-Infinity']) {
      expect(() =>
        decodeRunStateV2FromTransfer({
          ...encoded,
          round: { ...encoded.round, targetScore: invalid },
        }),
      ).toThrow('牌局传输分数无效');
    }
  });
});
