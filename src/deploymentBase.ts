export const DEFAULT_DEPLOYMENT_BASE = '/' as const;

export function validateDeploymentBase(baseUrl: string): string {
  const segments = baseUrl.split('/').slice(1, -1);
  if (
    baseUrl.trim() !== baseUrl ||
    !baseUrl.startsWith('/') ||
    !baseUrl.endsWith('/') ||
    baseUrl.startsWith('//') ||
    baseUrl.includes('\\') ||
    baseUrl.includes('?') ||
    baseUrl.includes('#') ||
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    throw new Error(`部署基础路径必须是以单斜杠包围的绝对路径：${baseUrl}`);
  }
  return baseUrl;
}
