import {
  parseDurableAppRoute,
  serializeDurableAppRoute,
  type DurableAppRoute,
} from '../../src/app/routeState';

describe('可持久恢复的应用路由', () => {
  const routes: readonly DurableAppRoute[] = [
    { status: 'profiles' },
    { status: 'menu' },
    { status: 'setup', setupMode: 'campaign' },
    { status: 'setup', setupMode: 'seeded' },
    { status: 'setup', setupMode: 'challenge' },
    { status: 'playing' },
    { status: 'collection' },
    { status: 'achievements' },
    { status: 'statistics' },
    { status: 'help' },
    { status: 'maintenance' },
    { status: 'notices' },
  ];

  it.each(routes)('往返解析 $status', (route) => {
    expect(parseDurableAppRoute(serializeDurableAppRoute(route))).toEqual(route);
  });

  it.each([
    '',
    '#/',
    '#/loading',
    '#/setup',
    '#/setup/tutorial',
    '#/menu/extra',
    '#/unknown',
  ])('拒绝未知或不完整路由 %s', (hash) => {
    expect(parseDurableAppRoute(hash)).toBeNull();
  });
});
