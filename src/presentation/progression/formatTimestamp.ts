export function formatTimestamp(epochMs: number): string {
  return new Date(epochMs)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC');
}
