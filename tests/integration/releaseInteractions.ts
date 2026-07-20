import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { EffectOperation } from '../../src/game-core/effects/registry';
import type { EffectWindow } from '../../src/game-core/model/runV2';

export interface ReleaseInteractionRule {
  readonly id: string;
  readonly operationTypes: readonly EffectOperation['type'][];
  readonly windows: readonly EffectWindow[];
  readonly testFiles: readonly string[];
}

export interface ReleaseRiskCase {
  readonly id: string;
  readonly testFiles: readonly string[];
}

const SCORE_GRAPH_OPERATIONS = [
  'add-chips',
  'add-multiplier',
  'multiply-multiplier',
  'multiply-final-score',
  'copy-source',
  'retrigger-source',
  'retrigger-card',
  'debuff-suit',
  'debuff-card',
  'enable-card',
  'schedule-deferred',
  'record-observation',
] as const satisfies readonly EffectOperation['type'][];

const LIFECYCLE_OPERATIONS = [
  'add-hands',
  'set-hands',
  'set-discards',
  'adjust-hand-size',
  'draw-face-down',
  'force-card-choice',
  'require-play-count',
  'patch-rule',
  'catalog-blind-rule',
  'catalog-rule',
] as const satisfies readonly EffectOperation['type'][];

const ECONOMY_OPERATIONS = [
  'add-money',
  'spend-money',
  'set-money',
  'append-reward-line',
  'create-item',
  'add-joker-slots',
  'add-consumable-slots',
  'set-discount',
  'set-interest-cap',
  'set-reroll-cost',
  'enable-boss-reroll',
  'free-reroll',
  'create-free-pack',
  'create-content-family',
  'catalog-money',
  'catalog-shop-rule',
  'catalog-tag-rule',
] as const satisfies readonly EffectOperation['type'][];

const CARD_OPERATIONS = [
  'transform-card',
  'destroy-card',
  'set-rank',
  'level-hand',
  'set-card-modifier',
  'transform-card-field',
  'copy-card-state',
  'create-playing-cards',
  'level-all-hands',
  'catalog-score-rule',
] as const satisfies readonly EffectOperation['type'][];

const JOKER_DSL_OPERATIONS = [
  'passive-capability',
  'joker-score',
  'joker-retrigger-card',
  'joker-create-content',
  'joker-create-playing-card',
  'joker-destroy-right-grow',
  'joker-destroy-source',
  'joker-state-change',
  'joker-level-current-hand',
  'joker-sell-value-add',
  'joker-round-resource',
  'joker-clone-played-card',
  'joker-add-card-bonus',
  'joker-transform-enhancement',
  'joker-destroy-event-card',
  'joker-random-destroy-other',
  'joker-state-change-clamped',
  'joker-set-target',
  'joker-inventory-sell-value-add',
  'joker-create-fixed-tag',
  'joker-disable-current-boss',
  'joker-passive-capability',
  'joker-runtime-action',
  'joker-after-rarity',
  'joker-record-observation',
] as const satisfies readonly EffectOperation['type'][];

export const RELEASE_EFFECT_OPERATION_TYPES = [
  ...SCORE_GRAPH_OPERATIONS,
  ...LIFECYCLE_OPERATIONS,
  ...ECONOMY_OPERATIONS,
  ...CARD_OPERATIONS,
  ...JOKER_DSL_OPERATIONS,
] as const satisfies readonly EffectOperation['type'][];

type ReleasedEffectOperation = (typeof RELEASE_EFFECT_OPERATION_TYPES)[number];
const EFFECT_OPERATION_TYPES_ARE_EXHAUSTIVE: Exclude<
  EffectOperation['type'],
  ReleasedEffectOperation
> extends never
  ? true
  : false = true;
void EFFECT_OPERATION_TYPES_ARE_EXHAUSTIVE;

export const RELEASE_INTERACTION_RULES: readonly ReleaseInteractionRule[] = [
  {
    id: 'release:score-graph',
    operationTypes: SCORE_GRAPH_OPERATIONS,
    windows: [
      'before-hand',
      'scored-card',
      'held-card',
      'joker-independent',
      'after-hand',
      'other-joker-resolved',
      'passive',
    ],
    testFiles: [
      'tests/game-core/effect-registry.test.ts',
      'tests/game-core/effect-pipeline.test.ts',
      'tests/game-core/joker-copy-graph-v6.test.ts',
    ],
  },
  {
    id: 'release:lifecycle',
    operationTypes: LIFECYCLE_OPERATIONS,
    windows: [
      'blind-selected',
      'round-start',
      'discard',
      'round-end',
      'blind-skipped',
      'ante-ended',
      'boss-ability-triggered',
      'blind-survival',
      'shop-left',
    ],
    testFiles: [
      'tests/game-core/run-window-integration.test.ts',
      'tests/game-core/blind-contracts-v3.test.ts',
      'tests/game-core/campaign-lifecycle.test.ts',
    ],
  },
  {
    id: 'release:economy',
    operationTypes: ECONOMY_OPERATIONS,
    windows: [
      'shop-entered',
      'shop-rerolled',
      'item-acquired',
      'pack-opened',
      'pack-skipped',
      'item-sold',
    ],
    testFiles: [
      'tests/game-core/economy-shop-v2.test.ts',
      'tests/game-core/tag-contracts-v3.test.ts',
      'tests/content/vouchers-tags-packs.test.ts',
    ],
  },
  {
    id: 'release:cards',
    operationTypes: CARD_OPERATIONS,
    windows: [
      'playing-card-added',
      'playing-card-modifier-succeeded',
      'consumable-used',
      'playing-card-destroyed',
    ],
    testFiles: [
      'tests/game-core/consumable-commands-v3.test.ts',
      'tests/game-core/modifiers-v3.test.ts',
      'tests/game-core/playing-card-destruction-v6.test.ts',
    ],
  },
  {
    id: 'release:joker-dsl',
    operationTypes: JOKER_DSL_OPERATIONS,
    windows: [],
    testFiles: [
      'tests/game-core/effect-registry.test.ts',
      'tests/game-core/joker-contract-ledger-051-100.test.ts',
      'tests/game-core/joker-contract-ledger-101-150.test.ts',
    ],
  },
];

export const RELEASE_RISK_CASES: readonly ReleaseRiskCase[] = [
  {
    id: 'copy-retrigger-debuff',
    testFiles: [
      'tests/game-core/effect-pipeline.test.ts',
      'tests/game-core/effect-registry.test.ts',
      'tests/game-core/joker-copy-graph-v6.test.ts',
    ],
  },
  {
    id: 'listed-chance',
    testFiles: ['tests/game-core/listed-chance-v6.test.ts'],
  },
  {
    id: 'destruction-clone-snapshot',
    testFiles: [
      'tests/game-core/playing-card-destruction-v6.test.ts',
      'tests/game-core/joker-played-hand-v5.test.ts',
    ],
  },
  {
    id: 'sale-boss-payout',
    testFiles: [
      'tests/game-core/joker-sale-boss-v5.test.ts',
      'tests/game-core/joker-reward-v5.test.ts',
    ],
  },
  {
    id: 'tag-voucher-pack-capacity',
    testFiles: [
      'tests/game-core/tag-contracts-v3.test.ts',
      'tests/game-core/economy-shop-v2.test.ts',
      'tests/content/vouchers-tags-packs.test.ts',
    ],
  },
  {
    id: 'card-modifier-score-destroy',
    testFiles: [
      'tests/game-core/modifiers-v3.test.ts',
      'tests/game-core/playing-card-destruction-v6.test.ts',
      'tests/game-core/scoring.test.ts',
    ],
  },
  {
    id: 'challenge-frozen-pools',
    testFiles: [
      'tests/game-core/run-setup-catalog-v3.test.ts',
      'tests/progression/fact-pipeline.test.ts',
    ],
  },
  {
    id: 'terminal-progression-endless',
    testFiles: [
      'tests/game-core/campaign-lifecycle.test.ts',
      'tests/progression/profile-record.test.ts',
      'tests/persistence/run-v7-repository.test.ts',
    ],
  },
];

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function multiplyCovered<T extends string>(
  values: readonly T[],
  rules: readonly (readonly T[])[],
): T[] {
  return values
    .filter((value) => rules.filter((owned) => owned.includes(value)).length > 1)
    .sort();
}

function uncovered<T extends string>(
  values: readonly T[],
  rules: readonly (readonly T[])[],
): T[] {
  return values.filter((value) => rules.every((owned) => !owned.includes(value))).sort();
}

export interface ReleaseInteractionAudit {
  readonly effectOperationTypes: readonly EffectOperation['type'][];
  readonly coveredWindows: readonly EffectWindow[];
  readonly coveredRiskCaseIds: readonly string[];
  readonly uncoveredEffectOperationTypes: readonly EffectOperation['type'][];
  readonly multiplyCoveredEffectOperationTypes: readonly EffectOperation['type'][];
  readonly uncoveredWindows: readonly EffectWindow[];
  readonly multiplyCoveredWindows: readonly EffectWindow[];
  readonly duplicateRiskCaseIds: readonly string[];
  readonly missingTestFiles: readonly string[];
  readonly invalidRuleIds: readonly string[];
}

export function auditReleaseInteractions(
  windows: readonly EffectWindow[],
  rules: readonly ReleaseInteractionRule[],
  riskCases: readonly ReleaseRiskCase[],
): ReleaseInteractionAudit {
  const operationOwners = rules.map((rule) => rule.operationTypes);
  const windowOwners = rules.map((rule) => rule.windows);
  const ruleIdCounts = new Map<string, number>();
  const riskIdCounts = new Map<string, number>();
  rules.forEach((rule) =>
    ruleIdCounts.set(rule.id, (ruleIdCounts.get(rule.id) ?? 0) + 1),
  );
  riskCases.forEach((risk) =>
    riskIdCounts.set(risk.id, (riskIdCounts.get(risk.id) ?? 0) + 1),
  );
  const testFiles = uniqueSorted([
    ...rules.flatMap((rule) => rule.testFiles),
    ...riskCases.flatMap((risk) => risk.testFiles),
  ]);

  return {
    effectOperationTypes: uniqueSorted(RELEASE_EFFECT_OPERATION_TYPES),
    coveredWindows: uniqueSorted(
      windows.filter(
        (window) => windowOwners.filter((owned) => owned.includes(window)).length === 1,
      ),
    ),
    coveredRiskCaseIds: uniqueSorted(riskCases.map((risk) => risk.id)),
    uncoveredEffectOperationTypes: uncovered(
      RELEASE_EFFECT_OPERATION_TYPES,
      operationOwners,
    ),
    multiplyCoveredEffectOperationTypes: multiplyCovered(
      RELEASE_EFFECT_OPERATION_TYPES,
      operationOwners,
    ),
    uncoveredWindows: uncovered(windows, windowOwners),
    multiplyCoveredWindows: multiplyCovered(windows, windowOwners),
    duplicateRiskCaseIds: uniqueSorted(
      riskCases
        .filter((risk) => (riskIdCounts.get(risk.id) ?? 0) > 1)
        .map((risk) => risk.id),
    ),
    missingTestFiles: testFiles.filter(
      (path) => !existsSync(resolve(process.cwd(), path)),
    ),
    invalidRuleIds: uniqueSorted(
      rules
        .filter(
          (rule) =>
            !rule.id.trim() ||
            (rule.operationTypes.length === 0 && rule.windows.length === 0) ||
            rule.testFiles.length === 0 ||
            (ruleIdCounts.get(rule.id) ?? 0) > 1,
        )
        .map((rule) => rule.id),
    ),
  };
}
