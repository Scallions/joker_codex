import type { CatalogRow, ExternalContentDependency } from '../schema/catalog';
import { RESERVED_JOKER_IDS } from './jokerIds';

function ownerForOrdinal(ordinal: number): ExternalContentDependency['ownerTask'] {
  if (ordinal <= 50) return '07-17-joker-catalog-001-050';
  if (ordinal <= 100) return '07-17-joker-catalog-051-100';
  return '07-17-joker-catalog-101-150';
}

export function buildExternalDependencies(
  rows: readonly CatalogRow[],
): readonly ExternalContentDependency[] {
  return RESERVED_JOKER_IDS.map((id, index) => ({
    id,
    ownerTask: ownerForOrdinal(index + 1),
    capabilities: [
      'shop-pool',
      'pack-pool',
      'creation',
      'edition',
      'sticker',
      'copy-destroy',
    ],
    consumerIds: rows
      .filter((row) => row.externalDependencyIds.includes(id))
      .map((row) => row.id)
      .sort((left, right) => left.localeCompare(right)),
  }));
}
