import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile } from '../../src/persistence/profiles';
import {
  exportProfileToJson,
  importProfileFromJson,
  remapImportedProfileToSlot,
} from '../../src/persistence/profileTransfer';
import { projectRunStart } from '../../src/progression/reducer';

function attachRun(profile: ReturnType<typeof createProfile>, run: RunStateV2) {
  return {
    ...profile,
    activeRunId: run.runId,
    currentRunProgress: {
      ...profile.currentRunProgress,
      runId: run.runId,
    },
  };
}

describe('档案导入导出', () => {
  it('用版本与校验和完整往返，并拒绝被篡改的中文档案', () => {
    const run = createRunEconomyFixtureRun({ seed: 'export-seed' });
    const profile = attachRun(createProfile(1, '掌灯人', 1_700_000_000_000), run);
    const json = exportProfileToJson(profile, run);

    expect(JSON.parse(json)).toMatchObject({
      profileSchemaVersion: 1,
      runSchemaVersion: 7,
      envelopeVersion: 'profile-transfer-7',
      runContentVersion: 'run-economy-2',
    });
    expect(isRunStateV7(importProfileFromJson(json).run!)).toBe(true);
    expect(() => importProfileFromJson(json.replace('掌灯人', '偷梁人'))).toThrow(
      '档案校验失败',
    );
  });

  it('生产目录 V3 导出会前向迁移并保留设置、修饰、选择与完整内容版本', () => {
    const run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'profile-production-v3',
      deckId: 'bxqp:deck:shifting-cast',
      stakeId: 'bxqp:stake:borrowed-mask',
    });
    const profile = attachRun(createProfile(2, '巡场人', 1_700_000_000_001), run);
    const json = exportProfileToJson(profile, run);
    const imported = importProfileFromJson(json);

    expect(JSON.parse(json)).toMatchObject({
      profileSchemaVersion: 1,
      runSchemaVersion: 7,
      envelopeVersion: 'profile-transfer-7',
      runContentVersion: 'catalog-baseline-3',
    });
    expect(imported.profile).toEqual(profile);
    expect(imported.run?.schemaVersion).toBe(7);
    expect(imported.run && isRunStateV7(imported.run)).toBe(true);
    if (!imported.run || !isRunStateV7(imported.run)) return;
    expect(imported.run.productionContentV3.rows).toHaveLength(230);
  });

  it('导入到目标档位时只重映射档案身份与 V7 归属，不改牌局确定性状态', () => {
    const source = createProfile(1, '换箱人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: source.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'REMAP001',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const profile = projectRunStart(source, run, 150);
    const imported = importProfileFromJson(exportProfileToJson(profile, run));
    const remapped = remapImportedProfileToSlot(imported, 3, 200);

    expect(remapped.profile).toMatchObject({ id: 'profile:3', slot: 3 });
    expect(remapped.run).toMatchObject({
      runId: run.runId,
      checkpointId: run.checkpointId,
      rngState: run.rngState,
      sessionV7: { profileId: 'profile:3' },
    });
  });

  it('在生成预览前拒绝冻结快照中未解锁的牌局设置', () => {
    const source = createProfile(1, '验箱人', 100);
    const lockedDeckId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'deck' && row.referenceIndex === 'D02',
    )?.id;
    if (!lockedDeckId) throw new Error('测试目录缺少 D02');
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: source.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'IMPORT01',
      deckId: lockedDeckId,
      eligibilityObjectiveIds: ['bxqp:objective:deck:02'],
      discoveredContentIds: [],
    });
    const profile = projectRunStart(source, run, 150);

    expect(() => exportProfileToJson(profile, run)).toThrow('尚未取得');
  });

  it('用分数线格式无损传输档案中的正无穷分数', () => {
    const base = createProfile(1, '满堂人', 100);
    const profile = {
      ...base,
      statistics: {
        ...base.statistics,
        totalScore: Number.POSITIVE_INFINITY,
        bestHandScore: Number.POSITIVE_INFINITY,
        handTypes: base.statistics.handTypes.map((record, index) =>
          index === 0 ? { ...record, bestScore: Number.POSITIVE_INFINITY } : record,
        ),
      },
    };

    const json = exportProfileToJson(profile, null);
    const wire: unknown = JSON.parse(json);
    expect(wire).toMatchObject({
      profile: { statistics: { totalScore: 'Infinity' } },
    });
    expect(importProfileFromJson(json).profile.statistics).toMatchObject({
      totalScore: Number.POSITIVE_INFINITY,
      bestHandScore: Number.POSITIVE_INFINITY,
    });
  });

  it('按 UTF-8 字节而不是字符数执行 2 MB 导入上限', () => {
    const oversizedChinese = `"${'戏'.repeat(700_000)}"`;

    expect(oversizedChinese.length).toBeLessThan(2_000_000);
    expect(() => importProfileFromJson(oversizedChinese)).toThrow('档案文件过大');
  });
});
