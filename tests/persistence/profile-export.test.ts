import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { isRunStateV3 } from '../../src/game-core/model/runV3';
import { createProfile } from '../../src/persistence/profiles';
import {
  exportProfileToJson,
  importProfileFromJson,
} from '../../src/persistence/profileTransfer';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';

describe('档案导入导出', () => {
  it('用版本与校验和完整往返，并拒绝被篡改的中文档案', () => {
    const run = createRunEconomyFixtureRun({ seed: 'export-seed' });
    const profile = {
      ...createProfile(1, '掌灯人', 1_700_000_000_000),
      activeRunId: run.runId,
    };
    const json = exportProfileToJson(profile, run);

    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: 3,
      envelopeVersion: 'profile-transfer-3',
      runContentVersion: 'run-economy-2',
    });
    expect(importProfileFromJson(json)).toEqual({
      profile,
      run: migrateRunV2ToV3(run),
    });
    expect(() => importProfileFromJson(json.replace('掌灯人', '偷梁人'))).toThrow(
      '档案校验失败',
    );
  });

  it('生产目录 V3 导出保留设置、修饰、选择与完整内容版本', () => {
    const run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'profile-production-v3',
      deckId: 'bxqp:deck:shifting-cast',
      stakeId: 'bxqp:stake:borrowed-mask',
    });
    const profile = {
      ...createProfile(2, '巡场人', 1_700_000_000_001),
      activeRunId: run.runId,
    };
    const json = exportProfileToJson(profile, run);
    const imported = importProfileFromJson(json);

    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: 3,
      runContentVersion: 'catalog-baseline-3',
    });
    expect(imported).toEqual({ profile, run });
    expect(imported.run?.schemaVersion).toBe(3);
    expect(imported.run && isRunStateV3(imported.run)).toBe(true);
    if (!imported.run || !isRunStateV3(imported.run)) return;
    expect(imported.run.productionContentV3.rows).toHaveLength(230);
  });
});
