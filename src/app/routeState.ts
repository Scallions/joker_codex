export type DurableAppRoute =
  | { readonly status: 'profiles' }
  | { readonly status: 'menu' }
  | { readonly status: 'setup'; readonly setupMode: 'campaign' | 'seeded' | 'challenge' }
  | { readonly status: 'playing' }
  | { readonly status: 'collection' }
  | { readonly status: 'achievements' }
  | { readonly status: 'statistics' }
  | { readonly status: 'help' }
  | { readonly status: 'maintenance' }
  | { readonly status: 'notices' };

const SIMPLE_ROUTES = new Set<DurableAppRoute['status']>([
  'profiles',
  'menu',
  'playing',
  'collection',
  'achievements',
  'statistics',
  'help',
  'maintenance',
  'notices',
]);

export function parseDurableAppRoute(hash: string): DurableAppRoute | null {
  const value = hash.replace(/^#\/?/, '');
  const [status, detail, ...extra] = value.split('/');
  if (extra.length > 0) return null;
  if (status === 'setup') {
    return detail === 'campaign' || detail === 'seeded' || detail === 'challenge'
      ? { status, setupMode: detail }
      : null;
  }
  if (!detail && SIMPLE_ROUTES.has(status as DurableAppRoute['status'])) {
    return { status } as DurableAppRoute;
  }
  return null;
}

export function readBrowserRoute(): DurableAppRoute | null {
  return typeof window === 'undefined'
    ? null
    : parseDurableAppRoute(window.location.hash);
}

export function serializeDurableAppRoute(route: DurableAppRoute): string {
  return route.status === 'setup'
    ? `#/${route.status}/${route.setupMode}`
    : `#/${route.status}`;
}

export function replaceBrowserRoute(route: DurableAppRoute): void {
  if (typeof window === 'undefined') return;
  const hash = serializeDurableAppRoute(route);
  if (window.location.hash === hash) return;
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${hash}`,
  );
}
