import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { CatalogRow, NonJokerCatalogFamily } from '../../src/content/schema/catalog';

export type ReleaseContractKind =
  'positive' | 'boundary' | 'debuffed' | 'interaction' | 'persistence';

export type ReleaseCoverageSelector =
  | { readonly family: NonJokerCatalogFamily }
  | {
      readonly family: 'joker';
      readonly firstOrdinal: number;
      readonly lastOrdinal: number;
    };

export interface ReleaseCoverageRule {
  readonly id: string;
  readonly selector: ReleaseCoverageSelector;
  readonly contractKinds: readonly ReleaseContractKind[];
  readonly testFiles: readonly string[];
}

const COMMON_ROW_TEST = 'tests/content/catalog-operations.test.ts';

function nonJokerRule(
  family: NonJokerCatalogFamily,
  testFiles: readonly string[],
): ReleaseCoverageRule {
  return {
    id: `release:${family}`,
    selector: { family },
    contractKinds: ['positive', 'boundary'],
    testFiles: [COMMON_ROW_TEST, ...testFiles],
  };
}

function jokerRule(
  firstOrdinal: number,
  lastOrdinal: number,
  behaviorFile: string,
  ledgerFile: string,
): ReleaseCoverageRule {
  return {
    id: `release:joker:${String(firstOrdinal).padStart(3, '0')}-${String(lastOrdinal).padStart(3, '0')}`,
    selector: { family: 'joker', firstOrdinal, lastOrdinal },
    contractKinds: ['positive', 'boundary', 'debuffed'],
    testFiles: [behaviorFile, ledgerFile],
  };
}

export const RELEASE_COVERAGE_RULES: readonly ReleaseCoverageRule[] = [
  nonJokerRule('deck', ['tests/game-core/run-setup-catalog-v3.test.ts']),
  nonJokerRule('stake', [
    'tests/game-core/run-setup-catalog-v3.test.ts',
    'tests/game-core/ante-baseline.test.ts',
  ]),
  nonJokerRule('challenge', [
    'tests/game-core/run-setup-catalog-v3.test.ts',
    'tests/game-core/modifiers-v3.test.ts',
  ]),
  nonJokerRule('voucher', [
    'tests/content/vouchers-tags-packs.test.ts',
    'tests/game-core/economy-shop-v2.test.ts',
  ]),
  nonJokerRule('tarot', [
    'tests/game-core/consumable-commands-v3.test.ts',
    'tests/game-core/catalog-runtime-v3.test.ts',
  ]),
  nonJokerRule('planet', [
    'tests/game-core/consumable-commands-v3.test.ts',
    'tests/game-core/catalog-runtime-v3.test.ts',
  ]),
  nonJokerRule('spectral', [
    'tests/game-core/consumable-commands-v3.test.ts',
    'tests/game-core/catalog-runtime-v3.test.ts',
  ]),
  nonJokerRule('tag', [
    'tests/game-core/tag-contracts-v3.test.ts',
    'tests/content/vouchers-tags-packs.test.ts',
  ]),
  nonJokerRule('blind', [
    'tests/game-core/blind-contracts-v3.test.ts',
    'tests/game-core/ante-baseline.test.ts',
  ]),
  nonJokerRule('booster', [
    'tests/content/vouchers-tags-packs.test.ts',
    'tests/game-core/economy-shop-v2.test.ts',
  ]),
  nonJokerRule('enhancement', [
    'tests/game-core/modifiers-v3.test.ts',
    'tests/game-core/catalog-runtime-v3.test.ts',
  ]),
  nonJokerRule('seal', [
    'tests/game-core/modifiers-v3.test.ts',
    'tests/game-core/catalog-runtime-v3.test.ts',
  ]),
  nonJokerRule('edition', [
    'tests/game-core/modifiers-v3.test.ts',
    'tests/game-core/catalog-runtime-v3.test.ts',
  ]),
  jokerRule(
    1,
    20,
    'tests/game-core/jokers-001-020.test.ts',
    'tests/content/joker-catalog.test.ts',
  ),
  jokerRule(
    21,
    30,
    'tests/game-core/jokers-021-030.test.ts',
    'tests/content/joker-catalog.test.ts',
  ),
  jokerRule(
    31,
    40,
    'tests/game-core/jokers-031-040.test.ts',
    'tests/content/joker-catalog.test.ts',
  ),
  jokerRule(
    41,
    50,
    'tests/game-core/jokers-041-050.test.ts',
    'tests/content/joker-catalog.test.ts',
  ),
  jokerRule(
    51,
    70,
    'tests/game-core/jokers-051-070.test.ts',
    'tests/content/joker-catalog-051-100.test.ts',
  ),
  jokerRule(
    71,
    85,
    'tests/game-core/jokers-071-085.test.ts',
    'tests/content/joker-catalog-051-100.test.ts',
  ),
  jokerRule(
    86,
    100,
    'tests/game-core/jokers-086-100.test.ts',
    'tests/content/joker-catalog-051-100.test.ts',
  ),
  jokerRule(
    101,
    115,
    'tests/game-core/jokers-101-115.test.ts',
    'tests/content/joker-catalog-101-150.test.ts',
  ),
  jokerRule(
    116,
    130,
    'tests/game-core/jokers-116-130.test.ts',
    'tests/content/joker-catalog-101-150.test.ts',
  ),
  jokerRule(
    131,
    145,
    'tests/game-core/jokers-131-145.test.ts',
    'tests/content/joker-catalog-101-150.test.ts',
  ),
  jokerRule(
    146,
    150,
    'tests/game-core/jokers-146-150.test.ts',
    'tests/content/joker-catalog-101-150.test.ts',
  ),
];

function matches(row: CatalogRow, selector: ReleaseCoverageSelector): boolean {
  if (row.family !== selector.family) return false;
  if (selector.family !== 'joker') return true;
  return row.ordinal >= selector.firstOrdinal && row.ordinal <= selector.lastOrdinal;
}

function isInvalidRule(rule: ReleaseCoverageRule): boolean {
  if (!rule.id.trim() || rule.testFiles.length === 0) return true;
  if (
    !rule.contractKinds.includes('positive') ||
    !rule.contractKinds.includes('boundary')
  ) {
    return true;
  }
  if (rule.selector.family !== 'joker') return false;
  return (
    !rule.contractKinds.includes('debuffed') ||
    !Number.isSafeInteger(rule.selector.firstOrdinal) ||
    !Number.isSafeInteger(rule.selector.lastOrdinal) ||
    rule.selector.firstOrdinal < 1 ||
    rule.selector.firstOrdinal > rule.selector.lastOrdinal ||
    (rule.selector.firstOrdinal === 1 && rule.selector.lastOrdinal === 150)
  );
}

export interface ReleaseCoverageAudit {
  readonly coveredIds: readonly string[];
  readonly uncoveredIds: readonly string[];
  readonly multiplyCoveredIds: readonly string[];
  readonly missingTestFiles: readonly string[];
  readonly invalidRuleIds: readonly string[];
}

export function auditReleaseCoverage(
  rows: readonly CatalogRow[],
  rules: readonly ReleaseCoverageRule[],
): ReleaseCoverageAudit {
  const coverage = rows.map((row) => ({
    row,
    rules: rules.filter((rule) => matches(row, rule.selector)),
  }));
  const testFiles = [...new Set(rules.flatMap((rule) => rule.testFiles))];
  const ruleIdCounts = new Map<string, number>();
  rules.forEach((rule) => {
    ruleIdCounts.set(rule.id, (ruleIdCounts.get(rule.id) ?? 0) + 1);
  });
  const invalidRuleIds = [
    ...new Set(
      rules
        .filter((rule) => isInvalidRule(rule) || (ruleIdCounts.get(rule.id) ?? 0) > 1)
        .map((rule) => rule.id),
    ),
  ];

  return {
    coveredIds: coverage
      .filter(({ rules: owners }) => owners.length === 1)
      .map(({ row }) => row.id),
    uncoveredIds: coverage
      .filter(({ rules: owners }) => owners.length === 0)
      .map(({ row }) => row.id),
    multiplyCoveredIds: coverage
      .filter(({ rules: owners }) => owners.length > 1)
      .map(({ row }) => row.id),
    missingTestFiles: testFiles.filter(
      (path) => !existsSync(resolve(process.cwd(), path)),
    ),
    invalidRuleIds,
  };
}
