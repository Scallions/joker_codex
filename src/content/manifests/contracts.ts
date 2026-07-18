import type { CatalogRow, ContractCoverageRecord } from '../schema/catalog';

export function buildContractManifest(
  rows: readonly CatalogRow[],
): readonly ContractCoverageRecord[] {
  return rows.map((row) => ({ contentId: row.id, contractIds: row.contractIds }));
}
