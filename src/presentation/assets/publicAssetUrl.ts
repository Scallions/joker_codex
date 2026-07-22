import { validateDeploymentBase } from '../../deploymentBase';

const CANONICAL_PUBLIC_ASSET_PREFIX = '/assets/';

export function resolvePublicAssetUrlFromBase(
  baseUrl: string,
  assetPath: string,
): string {
  const validatedBase = validateDeploymentBase(baseUrl);
  if (!assetPath.startsWith(CANONICAL_PUBLIC_ASSET_PREFIX)) return assetPath;
  return `${validatedBase}${assetPath.slice(1)}`;
}

export function resolvePublicAssetUrl(assetPath: string): string {
  return resolvePublicAssetUrlFromBase(import.meta.env.BASE_URL, assetPath);
}
