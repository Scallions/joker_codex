import type { JokerDefinitionV2 } from '../../src/game-core/model/runV2';

export function jokerCapabilityDouble(
  contentId: string,
  options: {
    readonly slotContribution?: number;
    readonly rarity?: JokerDefinitionV2['rarity'];
  } = {},
): JokerDefinitionV2 {
  return {
    kind: 'joker',
    contentId,
    name: `能力替身 ${contentId.slice(-3)}`,
    description: '仅在契约测试中代替后续奇牌批次提供实例能力。',
    baseCost: 6,
    weightUnits: 100,
    effects: [],
    targetKind: 'none',
    minimumTargets: 0,
    maximumTargets: 0,
    rarity: options.rarity ?? 'common',
    slotContribution: options.slotContribution ?? 1,
  };
}
