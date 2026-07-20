import { validateRunStateV2 } from './validateRunStateV2';
import type { CatalogRunState } from '../model/runV3';

export type RunValidationResultV3 =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

export function validateRunStateV3(run: CatalogRunState): RunValidationResultV3 {
  const base = validateRunStateV2(run);
  const violations = base.ok ? [] : [...base.violations];

  if (
    run.schemaVersion !== 3 &&
    run.schemaVersion !== 4 &&
    run.schemaVersion !== 5 &&
    run.schemaVersion !== 6 &&
    run.schemaVersion !== 7
  ) {
    violations.push('目录牌局结构版本错误');
  }
  if (
    run.contentVersion !== 'run-economy-2' &&
    run.contentVersion !== 'catalog-baseline-3' &&
    run.contentVersion !== 'joker-catalog-1' &&
    run.contentVersion !== 'joker-catalog-2' &&
    run.contentVersion !== 'joker-catalog-3' &&
    run.contentVersion !== 'progression-modes-1'
  ) {
    violations.push('V3 内容版本不受支持');
  }
  if (run.setupV3.appliedStakeIds[0] !== 'bxqp:stake:first-bell') {
    violations.push('难度组合必须从第一阶开始');
  }
  if (
    run.setupV3.challengeId !== null &&
    run.setupV3.appliedStakeIds.join('|') !== 'bxqp:stake:first-bell'
  ) {
    violations.push('挑战牌局只能使用第一阶基础难度');
  }
  if (
    run.contentVersion === 'catalog-baseline-3' &&
    run.productionContentV3.rows.length !== 230
  ) {
    violations.push('生产牌局必须物化 230 项目录快照');
  }
  if (
    run.contentVersion === 'joker-catalog-1' &&
    run.productionContentV3.rows.length !== 280
  ) {
    violations.push('奇牌生产牌局必须物化 280 项目录快照');
  }
  if (
    run.contentVersion === 'joker-catalog-2' &&
    run.productionContentV3.rows.length !== 330
  ) {
    violations.push('V5 奇牌生产牌局必须物化 330 项目录快照');
  }
  if (
    (run.contentVersion === 'joker-catalog-3' ||
      run.contentVersion === 'progression-modes-1') &&
    run.productionContentV3.rows.length !== 380
  ) {
    violations.push('V6 奇牌生产牌局必须物化 380 项目录快照');
  }
  if (
    run.contentVersion === 'run-economy-2' &&
    run.productionContentV3.rows.length !== 0
  ) {
    violations.push('迁移牌局不得静默混入生产目录');
  }
  if (
    run.productionContentV3.contentVersion !== run.contentVersion ||
    run.productionContentV3.rows.some(
      ({ name, description }) => !name.trim() || !description.trim(),
    )
  ) {
    violations.push('V3 内容快照未闭合');
  }
  if (
    run.rulesV3.anteOneThroughEightTargets.length !== 8 ||
    run.rulesV3.anteOneThroughEightTargets.some(
      (target) => !Number.isSafeInteger(target) || target <= 0,
    )
  ) {
    violations.push('V3 前八幕目标曲线无效');
  }
  if (
    [
      run.rulesV3.remainingHandReward,
      run.rulesV3.remainingDiscardReward,
      run.rulesV3.discardCost,
      run.rulesV3.priceInflationPerPurchase,
      run.rulesV3.purchasesMade,
    ].some((value) => !Number.isSafeInteger(value) || value < 0)
  ) {
    violations.push('V3 扩展经济规则无效');
  }
  if (
    duplicates(run.productionContentV3.rows.map(({ definition }) => definition.id)).length
  ) {
    violations.push('V3 内容快照存在重复 ID');
  }
  if (duplicates(run.modifiersV3.playingCards.map(({ cardId }) => cardId)).length) {
    violations.push('同一张牌出现多份修饰状态');
  }
  if (duplicates(run.modifiersV3.jokers.map(({ instanceId }) => instanceId)).length) {
    violations.push('同一奇牌出现多份贴签状态');
  }
  for (const modifier of run.modifiersV3.playingCards) {
    const card = run.deck.cards.find(({ id }) => id === modifier.cardId);
    if (!card) violations.push(`修饰状态引用未知牌：${modifier.cardId}`);
    if (
      card &&
      (card.enhancementId !== modifier.enhancementId ||
        card.sealId !== modifier.sealId ||
        card.editionId !== modifier.editionId)
    ) {
      violations.push(`牌面修饰快照不一致：${modifier.cardId}`);
    }
  }
  if (
    run.externalDependenciesV3.resolvedIds.some(
      (id) => !run.externalDependenciesV3.requiredIds.includes(id),
    )
  ) {
    violations.push('外部依赖解析集合超出需求集合');
  }
  if (
    run.externalDependenciesV3.validationMode === 'integration-strict' &&
    run.externalDependenciesV3.requiredIds.some(
      (id) => !run.externalDependenciesV3.resolvedIds.includes(id),
    )
  ) {
    violations.push('严格模式存在未解析外部依赖');
  }
  if (
    run.materializedChoicesV3.some(
      (choice) => choice.checkpointId < 0 || choice.checkpointId > run.checkpointId,
    )
  ) {
    violations.push('物化选择引用未来检查点');
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
