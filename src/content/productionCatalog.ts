import { BOOSTER_PROFILES, CATALOG_ROWS } from './catalogs';
import { buildExternalDependencies } from './dependencies/externalDependencies';
import { buildZhCnLocalization } from './localization/zh-CN';
import { buildAssetManifest } from './manifests/assets';
import { buildContractManifest } from './manifests/contracts';
import {
  CATALOG_CONTENT_VERSION,
  PRODUCTION_CATALOG_VERSION,
  type ProductionCatalog,
} from './schema/catalog';

export const PRODUCTION_CATALOG: ProductionCatalog = {
  contentVersion: CATALOG_CONTENT_VERSION,
  productionVersion: PRODUCTION_CATALOG_VERSION,
  rows: CATALOG_ROWS,
  boosterProfiles: BOOSTER_PROFILES,
  localization: buildZhCnLocalization(CATALOG_ROWS),
  assets: buildAssetManifest(CATALOG_ROWS),
  dependencies: buildExternalDependencies(CATALOG_ROWS),
  contracts: buildContractManifest(CATALOG_ROWS),
};
