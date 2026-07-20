import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import { commitRunCommand } from '../../src/app/commitRunCommand';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';
import {
  exportProfileToJson,
  importProfileFromJson,
} from '../../src/persistence/profileTransfer';
import {
  RELEASE_REPLAY_KINDS,
  createReleaseReplayFixture,
} from '../../src/test-support/releaseReplayV7';
import { runScenarioV2 } from '../../src/test-support/runScenarioV2';

describe('发布确定性回放', () => {
  it.each(RELEASE_REPLAY_KINDS)(
    '%s 在纯逻辑、导入导出与 IndexedDB 重载后保持同一规范状态',
    async (kind) => {
      const first = createReleaseReplayFixture(kind);
      const replay = createReleaseReplayFixture(kind);
      const pure = runScenarioV2(first.run, first.steps);
      const repeated = runScenarioV2(replay.run, replay.steps);

      expect(repeated).toEqual(pure);

      const transferredStart = importProfileFromJson(
        exportProfileToJson(first.profile, first.run),
      );
      if (!transferredStart.run) throw new Error('发布回放传输缺少牌局');
      expect(runScenarioV2(transferredStart.run, first.steps)).toEqual(pure);

      const databaseName = `baixiqipai-release-replay-${kind}`;
      await deleteDB(databaseName);
      const repository = new IndexedDbGameRepository(databaseName);
      await repository.initialize();
      await repository.commitCheckpoint(first.profile, first.run);

      let profile = first.profile;
      let run = first.run;
      for (const [index, step] of first.steps.entries()) {
        const committed = await commitRunCommand(
          repository,
          profile,
          run,
          step.buildCommand(run),
          1_000 + index,
        );
        if (!committed.ok) throw new Error(`${committed.code}: ${committed.message}`);
        if (!isRunStateV7(committed.state)) throw new Error('发布回放降级为旧版牌局');
        profile = committed.profile;
        run = committed.state;
      }

      expect(run).toEqual(pure.state);
      const transferredFinal = importProfileFromJson(exportProfileToJson(profile, run));
      expect(transferredFinal).toEqual({ profile, run });
      repository.close();

      const reloaded = new IndexedDbGameRepository(databaseName);
      await reloaded.initialize();
      expect(await reloaded.getProfile(profile.id)).toEqual(profile);
      expect(await reloaded.loadRun(profile.id)).toEqual(pure.state);
      reloaded.close();
      await deleteDB(databaseName);
    },
  );
});
