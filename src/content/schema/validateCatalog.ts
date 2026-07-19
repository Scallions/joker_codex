import { RESERVED_JOKER_IDS } from '../dependencies/jokerIds';
import {
  CATALOG_FAMILIES,
  EXPECTED_CATALOG_COUNTS,
  EXPECTED_CATALOG_TOTAL,
  EXPECTED_JOKER_CATALOG_TOTAL,
  EXPECTED_NON_JOKER_CATALOG_COUNTS,
  EXPECTED_NON_JOKER_CATALOG_TOTAL,
  NON_JOKER_CATALOG_FAMILIES,
  catalogRowSchema,
  jokerPredicateSchema,
  jokerValueSchema,
  validateJokerPredicateDepth,
  type CatalogFamily,
  type NonJokerCatalogFamily,
  type ProductionCatalog,
} from './catalog';

export type CatalogValidationMode = 'catalog-child' | 'integration-strict';

export interface CatalogValidationOptions {
  readonly mode?: CatalogValidationMode;
  readonly resolvedExternalIds?: ReadonlySet<string>;
}

export interface CatalogAuditReport {
  readonly mode: CatalogValidationMode;
  readonly totalRows: number;
  readonly nonJokerRows: number;
  readonly jokerRows: number;
  readonly familyCounts: Readonly<Record<CatalogFamily, number>>;
  readonly nonJokerFamilyCounts: Readonly<Record<NonJokerCatalogFamily, number>>;
  readonly boosterRows: number;
  readonly boosterProfiles: number;
  readonly localizationEntries: number;
  readonly assetRecords: number;
  readonly contractRecords: number;
  readonly reservedExternalIds: number;
  readonly resolvedJokerIds: readonly string[];
  readonly unresolvedExternalIds: readonly string[];
}

export class CatalogValidationError extends Error {
  readonly violations: readonly string[];

  constructor(violations: readonly string[]) {
    super(`生产目录校验失败：${violations.join('；')}`);
    this.name = 'CatalogValidationError';
    this.violations = violations;
  }
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort((left, right) => left.localeCompare(right));
}

function pushDuplicates(
  violations: string[],
  label: string,
  values: readonly string[],
): void {
  const repeated = duplicates(values);
  if (repeated.length > 0) violations.push(`${label}重复：${repeated.join(', ')}`);
}

function expectedOwner(ordinal: number): string {
  if (ordinal <= 50) return '07-17-joker-catalog-001-050';
  if (ordinal <= 100) return '07-17-joker-catalog-051-100';
  return '07-17-joker-catalog-101-150';
}

export function validateProductionCatalog(
  catalog: ProductionCatalog,
  options: CatalogValidationOptions = {},
): CatalogAuditReport {
  const mode = options.mode ?? 'catalog-child';
  const resolvedExternalIds = options.resolvedExternalIds ?? new Set<string>();
  const violations: string[] = [];

  if (catalog.contentVersion !== 'catalog-baseline-3') {
    violations.push('内容版本错误');
  }

  for (const row of catalog.rows) {
    const parsed = catalogRowSchema.safeParse(row);
    if (!parsed.success) {
      violations.push(`${row.id || '<unknown>'} 不符合目录结构`);
    }
    if (!row.id.startsWith('bxqp:') || row.id.startsWith('fixture:')) {
      violations.push(`非项目内容 ID：${row.id}`);
    }
    if (row.effects.some((effect) => effect.operations.length === 0)) {
      violations.push(`效果没有可执行操作：${row.id}`);
    }
    if (
      row.effects.some((effect) => effect.handlerId !== 'bxqp:handler:catalog-operations')
    ) {
      violations.push(`未注册目录处理器：${row.id}`);
    }
    for (const operation of row.effects.flatMap((effect) => effect.operations)) {
      if (
        operation.type !== 'joker-score' &&
        operation.type !== 'joker-retrigger-card' &&
        operation.type !== 'joker-create-content' &&
        operation.type !== 'joker-create-playing-card' &&
        operation.type !== 'joker-destroy-source' &&
        operation.type !== 'joker-state-change' &&
        operation.type !== 'joker-level-current-hand' &&
        operation.type !== 'joker-sell-value-add' &&
        operation.type !== 'joker-round-resource'
      ) {
        continue;
      }
      const predicate = jokerPredicateSchema.safeParse(operation.predicate);
      const value =
        operation.type === 'joker-score' || operation.type === 'joker-state-change'
          ? jokerValueSchema.safeParse(operation.value)
          : { success: true as const };
      if (
        !predicate.success ||
        !value.success ||
        !validateJokerPredicateDepth(operation.predicate)
      ) {
        violations.push(`奇牌 DSL 无效：${row.id}`);
      }
    }
  }

  const familyCounts = Object.fromEntries(
    CATALOG_FAMILIES.map((family) => [
      family,
      catalog.rows.filter((row) => row.family === family).length,
    ]),
  ) as Record<CatalogFamily, number>;
  const nonJokerFamilyCounts = Object.fromEntries(
    NON_JOKER_CATALOG_FAMILIES.map((family) => [family, familyCounts[family]]),
  ) as Record<NonJokerCatalogFamily, number>;
  for (const family of CATALOG_FAMILIES) {
    if (familyCounts[family] !== EXPECTED_CATALOG_COUNTS[family]) {
      violations.push(
        `${family} 数量应为 ${EXPECTED_CATALOG_COUNTS[family]}，实际 ${familyCounts[family]}`,
      );
    }
    const ordinals = catalog.rows
      .filter((row) => row.family === family)
      .map((row) => row.ordinal)
      .sort((left, right) => left - right);
    const expectedOrdinals = Array.from(
      { length: EXPECTED_CATALOG_COUNTS[family] },
      (_, index) => index + 1,
    );
    if (ordinals.join(',') !== expectedOrdinals.join(',')) {
      violations.push(`${family} 序号不连续`);
    }
  }
  if (catalog.rows.length !== EXPECTED_CATALOG_TOTAL) {
    violations.push(`总数应为 ${EXPECTED_CATALOG_TOTAL}，实际 ${catalog.rows.length}`);
  }
  const nonJokerRows = catalog.rows.filter((row) => row.family !== 'joker');
  const jokerRows = catalog.rows.filter((row) => row.family === 'joker');
  if (nonJokerRows.length !== EXPECTED_NON_JOKER_CATALOG_TOTAL) {
    violations.push(
      `非奇牌总数应为 ${EXPECTED_NON_JOKER_CATALOG_TOTAL}，实际 ${nonJokerRows.length}`,
    );
  }
  if (jokerRows.length !== EXPECTED_JOKER_CATALOG_TOTAL) {
    violations.push(
      `奇牌总数应为 ${EXPECTED_JOKER_CATALOG_TOTAL}，实际 ${jokerRows.length}`,
    );
  }
  for (const family of NON_JOKER_CATALOG_FAMILIES) {
    if (nonJokerFamilyCounts[family] !== EXPECTED_NON_JOKER_CATALOG_COUNTS[family]) {
      violations.push(`${family} 非奇牌账本数量漂移`);
    }
  }
  if (jokerRows.filter((row) => row.rarity === 'common').length !== 36) {
    violations.push('常见奇牌数量应为 36');
  }
  if (jokerRows.filter((row) => row.rarity === 'uncommon').length !== 14) {
    violations.push('少见奇牌数量应为 14');
  }
  if (jokerRows.some((row) => row.rarity === 'rare' || row.rarity === 'legendary')) {
    violations.push('001-050 不应包含稀有或传奇奇牌');
  }

  pushDuplicates(
    violations,
    '内容 ID',
    catalog.rows.map((row) => row.id),
  );
  pushDuplicates(
    violations,
    '研究索引',
    catalog.rows.map((row) => row.referenceIndex),
  );
  pushDuplicates(
    violations,
    '本地化键',
    catalog.rows.flatMap((row) => [
      row.nameKey,
      row.descriptionKey,
      ...(row.family === 'joker' ? [row.flavorKey] : []),
    ]),
  );
  pushDuplicates(
    violations,
    '资产 ID',
    catalog.rows.map((row) => row.assetId),
  );
  pushDuplicates(
    violations,
    '权属 ID',
    catalog.rows.map((row) => row.ownershipId),
  );
  pushDuplicates(
    violations,
    '效果 ID',
    catalog.rows.flatMap((row) => row.effects.map((effect) => effect.id)),
  );
  pushDuplicates(
    violations,
    '合约 ID',
    catalog.rows.flatMap((row) => row.contractIds),
  );

  const rowIds = new Set(catalog.rows.map((row) => row.id));
  for (const row of catalog.rows) {
    for (const prerequisiteId of row.prerequisiteIds) {
      if (!rowIds.has(prerequisiteId)) {
        violations.push(`${row.id} 缺少先决内容 ${prerequisiteId}`);
      }
    }
    const name = catalog.localization[row.nameKey];
    const description = catalog.localization[row.descriptionKey];
    if (!name?.trim()) violations.push(`${row.id} 缺少中文名称`);
    if (!description?.trim()) violations.push(`${row.id} 缺少中文说明`);
    if (row.family === 'joker' && !catalog.localization[row.flavorKey]?.trim()) {
      violations.push(`${row.id} 缺少中文风味文本`);
    }
  }

  const requiredLocalizationKeys = new Set(
    catalog.rows.flatMap((row) => [
      row.nameKey,
      row.descriptionKey,
      ...(row.family === 'joker' ? [row.flavorKey] : []),
    ]),
  );
  const orphanLocalizationKeys = Object.keys(catalog.localization).filter(
    (key) => !requiredLocalizationKeys.has(key),
  );
  if (orphanLocalizationKeys.length > 0) {
    violations.push(`孤立本地化：${orphanLocalizationKeys.join(', ')}`);
  }

  const assetsByContent = new Map(
    catalog.assets.map((record) => [record.contentId, record]),
  );
  pushDuplicates(
    violations,
    '资产记录内容',
    catalog.assets.map((record) => record.contentId),
  );
  pushDuplicates(
    violations,
    '焦点构图',
    catalog.assets.map((record) => record.focalKey),
  );
  for (const row of catalog.rows) {
    const asset = assetsByContent.get(row.id);
    if (!asset) {
      violations.push(`${row.id} 缺少资产权属记录`);
      continue;
    }
    if (
      asset.id !== row.ownershipId ||
      asset.assetId !== row.assetId ||
      !asset.reviewed
    ) {
      violations.push(`${row.id} 资产权属未闭合`);
    }
    if (/^https?:\/\//i.test(asset.assetPath) || !asset.assetPath.startsWith('/')) {
      violations.push(`${row.id} 使用非本地资产路径`);
    }
    if (row.family === 'joker') {
      const ordinal = row.ordinal.toString().padStart(3, '0');
      if (asset.source !== 'generated-raster') {
        violations.push(`${row.id} 奇牌必须使用已审生成栅格插画`);
      } else {
        if (
          asset.assetPath !== `/assets/jokers/${ordinal}.webp` ||
          asset.sourceFileOrPrompt !== `/assets/jokers/provenance/${ordinal}.md`
        ) {
          violations.push(`${row.id} 奇牌插画与来源侧车路径不闭合`);
        }
        if (
          asset.width !== 768 ||
          asset.height !== 1024 ||
          asset.ensemble !== row.ensemble ||
          asset.inspectionStatus !== 'approved'
        ) {
          violations.push(`${row.id} 奇牌插画尺寸、班目或目检状态不合格`);
        }
      }
    } else if (asset.source !== 'project-svg') {
      violations.push(`${row.id} 非奇牌不得占用奇牌栅格清单`);
    }
  }
  for (const asset of catalog.assets) {
    if (!rowIds.has(asset.contentId)) violations.push(`孤立资产：${asset.id}`);
  }

  const contractsByContent = new Map(
    catalog.contracts.map((record) => [record.contentId, record]),
  );
  pushDuplicates(
    violations,
    '合约记录内容',
    catalog.contracts.map((record) => record.contentId),
  );
  for (const row of catalog.rows) {
    const coverage = contractsByContent.get(row.id);
    if (!coverage || coverage.contractIds.join('|') !== row.contractIds.join('|')) {
      violations.push(`${row.id} 合约覆盖未闭合`);
    }
  }
  for (const record of catalog.contracts) {
    if (!rowIds.has(record.contentId)) violations.push(`孤立合约：${record.contentId}`);
  }

  pushDuplicates(
    violations,
    '卡包机械档案',
    catalog.boosterProfiles.map((profile) => profile.id),
  );
  if (catalog.boosterProfiles.length !== 15) {
    violations.push(`卡包机械档案应为 15，实际 ${catalog.boosterProfiles.length}`);
  }
  const profileIds = new Set(catalog.boosterProfiles.map((profile) => profile.id));
  const boosterRows = catalog.rows.filter((row) => row.family === 'booster');
  for (const row of boosterRows) {
    if (!row.mechanicalProfileId || !profileIds.has(row.mechanicalProfileId)) {
      violations.push(`${row.id} 缺少有效卡包机械档案`);
    }
  }

  const voucherRows = catalog.rows.filter((row) => row.family === 'voucher');
  const dependentVoucherCount = voucherRows.filter(
    (row) => row.prerequisiteIds.length === 1,
  ).length;
  if (dependentVoucherCount !== 16) {
    violations.push(`木牌先决配对应为 16，实际 ${dependentVoucherCount}`);
  }

  const dependencyIds = catalog.dependencies.map((dependency) => dependency.id);
  pushDuplicates(violations, '外部依赖', dependencyIds);
  if (
    dependencyIds.length !== RESERVED_JOKER_IDS.length ||
    [...dependencyIds].sort().join('|') !== [...RESERVED_JOKER_IDS].sort().join('|')
  ) {
    violations.push('未完整保留 150 个未来奇牌 ID');
  }
  const dependencyById = new Map(
    catalog.dependencies.map((dependency) => [dependency.id, dependency]),
  );
  for (const [index, id] of RESERVED_JOKER_IDS.entries()) {
    const dependency = dependencyById.get(id);
    if (!dependency) continue;
    if (dependency.ownerTask !== expectedOwner(index + 1)) {
      violations.push(`${id} 所属批次错误`);
    }
    if (dependency.capabilities.length === 0) {
      violations.push(`${id} 缺少能力契约`);
    }
    for (const consumerId of dependency.consumerIds) {
      const consumer = catalog.rows.find((row) => row.id === consumerId);
      if (!consumer?.externalDependencyIds.includes(id)) {
        violations.push(`${id} 的消费者 ${consumerId} 未双向声明`);
      }
    }
  }
  for (const row of catalog.rows) {
    for (const dependencyId of row.externalDependencyIds) {
      const dependency = dependencyById.get(dependencyId);
      if (!dependency || !dependency.consumerIds.includes(row.id)) {
        violations.push(`${row.id} 的外部依赖 ${dependencyId} 未闭合`);
      }
    }
  }

  const locallyResolvedIds = new Set(jokerRows.map((row) => row.id));
  for (const id of resolvedExternalIds) {
    if (locallyResolvedIds.has(id)) {
      violations.push(`${id} 已由生产定义解析，不得以外部能力覆盖`);
    }
  }
  const resolvedJokerIds = RESERVED_JOKER_IDS.filter(
    (id) => locallyResolvedIds.has(id) || resolvedExternalIds.has(id),
  );
  const unresolvedExternalIds = RESERVED_JOKER_IDS.filter(
    (id) => !locallyResolvedIds.has(id) && !resolvedExternalIds.has(id),
  );
  if (mode === 'integration-strict' && unresolvedExternalIds.length > 0) {
    violations.push(`严格集成仍缺少 ${unresolvedExternalIds.length} 个奇牌定义`);
  }

  if (violations.length > 0) throw new CatalogValidationError(violations);

  return {
    mode,
    totalRows: catalog.rows.length,
    nonJokerRows: nonJokerRows.length,
    jokerRows: jokerRows.length,
    familyCounts,
    nonJokerFamilyCounts,
    boosterRows: boosterRows.length,
    boosterProfiles: catalog.boosterProfiles.length,
    localizationEntries: Object.keys(catalog.localization).length,
    assetRecords: catalog.assets.length,
    contractRecords: catalog.contracts.length,
    reservedExternalIds: catalog.dependencies.length,
    resolvedJokerIds,
    unresolvedExternalIds,
  };
}
