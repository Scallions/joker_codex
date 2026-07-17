import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { createProfile } from '../../src/persistence/profiles';
import {
  exportProfileToJson,
  importProfileFromJson,
} from '../../src/persistence/profileTransfer';

describe('档案导入导出', () => {
  it('用版本与校验和完整往返，并拒绝被篡改的中文档案', () => {
    const run = createFixtureRun('export-seed');
    const profile = {
      ...createProfile(1, '掌灯人', 1_700_000_000_000),
      activeRunId: run.runId,
    };
    const json = exportProfileToJson(profile, run);

    expect(importProfileFromJson(json)).toEqual({ profile, run });
    expect(() => importProfileFromJson(json.replace('掌灯人', '偷梁人'))).toThrow(
      '档案校验失败',
    );
  });
});
