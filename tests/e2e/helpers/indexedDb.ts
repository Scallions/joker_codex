import type { Page } from '@playwright/test';

import type { RunStateV2 } from '../../../src/game-core/model/runV2';
import type { ProfileRecord } from '../../../src/persistence/profiles';

export interface ActiveProfileRunPair {
  readonly profile: ProfileRecord;
  readonly run: RunStateV2;
}

export async function readActiveProfileRunPair(
  page: Page,
): Promise<ActiveProfileRunPair> {
  return page.evaluate(async (): Promise<ActiveProfileRunPair> => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('baixiqipai');
      request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
      request.onsuccess = () => resolve(request.result);
    });
    const read = <T>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error('无法读取本地数据库'));
        request.onsuccess = () => resolve(request.result);
      });
    const meta = await read<unknown>(
      database.transaction('meta', 'readonly').objectStore('meta').get('state'),
    );
    if (
      !meta ||
      typeof meta !== 'object' ||
      !('activeProfileId' in meta) ||
      typeof meta.activeProfileId !== 'string'
    ) {
      throw new Error('没有活动档案');
    }
    const profile = await read<unknown>(
      database
        .transaction('profiles', 'readonly')
        .objectStore('profiles')
        .get(meta.activeProfileId),
    );
    const run = await read<unknown>(
      database
        .transaction('runs', 'readonly')
        .objectStore('runs')
        .get(meta.activeProfileId),
    );
    database.close();
    if (!profile || !run) throw new Error('活动档案与牌局不完整');
    return { profile: profile as ProfileRecord, run: run as RunStateV2 };
  });
}
