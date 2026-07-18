import { hasRegisteredEffectHandler } from '../effects/registry';
import {
  EFFECT_WINDOWS,
  type ChoiceFrame,
  type EffectParameterValue,
  type MaterializedItem,
  type RunStateV2,
  type TargetKind,
} from '../model/runV2';
import { POKER_HAND_TYPES } from '../poker/evaluate';

export type RunValidationResultV2 =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function isScore(value: number): boolean {
  return value >= 0 && (Number.isFinite(value) || value === Number.POSITIVE_INFINITY);
}

function isNonnegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isEffectParameter(value: unknown): value is EffectParameterValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function targetRangeIsValid(
  targetKind: TargetKind,
  minimumTargets: number,
  maximumTargets: number,
): boolean {
  return (
    isNonnegativeInteger(minimumTargets) &&
    isNonnegativeInteger(maximumTargets) &&
    minimumTargets <= maximumTargets &&
    (targetKind !== 'none' || (minimumTargets === 0 && maximumTargets === 0))
  );
}

function allChoiceFrames(state: RunStateV2): readonly ChoiceFrame[] {
  return state.pendingChoice
    ? [state.pendingChoice.current, ...state.pendingChoice.suspended]
    : [];
}

export function validateRunStateV2(state: RunStateV2): RunValidationResultV2 {
  const violations: string[] = [];
  const cardIds = state.deck.cards.map((card) => card.id);
  const cardIdSet = new Set(cardIds);
  const cardIdStringSet: ReadonlySet<string> = new Set(cardIds);
  const blindById = new Map(state.content.blinds.map((entry) => [entry.id, entry]));
  const tagById = new Map(state.content.tags.map((entry) => [entry.id, entry]));
  const voucherById = new Map(state.content.vouchers.map((entry) => [entry.id, entry]));
  const itemById = new Map(state.content.items.map((entry) => [entry.contentId, entry]));
  const packById = new Map(state.content.packs.map((entry) => [entry.id, entry]));

  const contentEntries = [
    ...state.content.blinds.map((entry) => ({ id: entry.id, effects: entry.effects })),
    ...state.content.tags.map((entry) => ({ id: entry.id, effects: entry.effects })),
    ...state.content.vouchers.map((entry) => ({ id: entry.id, effects: entry.effects })),
    ...state.content.items.map((entry) => ({
      id: entry.contentId,
      effects: entry.effects,
    })),
    ...state.content.packs.map((entry) => ({ id: entry.id, effects: entry.effects })),
  ];
  const runtimeEffects = [
    ...(state.round?.blind.effects ?? []),
    ...state.inventory.jokers.flatMap((joker) => joker.effects),
    ...state.inventory.consumables.flatMap((item) => item.effects),
    ...(state.shop?.cardOffers.flatMap((offer) => offer.item.effects) ?? []),
    ...allChoiceFrames(state).flatMap((frame) =>
      frame.kind === 'pack' ? frame.options.flatMap((option) => option.item.effects) : [],
    ),
  ];

  if (hasDuplicates(contentEntries.map((entry) => entry.id))) {
    violations.push('内容定义编号必须唯一');
  }
  const contentEffectIds = contentEntries.flatMap((entry) =>
    entry.effects.map((effect) => effect.id),
  );
  if (hasDuplicates(contentEffectIds)) {
    violations.push('内容效果编号必须唯一');
  }
  const missingHandlers = new Set<string>();
  for (const effect of [
    ...contentEntries.flatMap((entry) => entry.effects),
    ...runtimeEffects,
  ]) {
    if (!hasRegisteredEffectHandler(effect.handlerId)) {
      missingHandlers.add(effect.handlerId);
    }
    if (
      effect.windows.length === 0 ||
      hasDuplicates(effect.windows) ||
      effect.windows.some(
        (window) => !(EFFECT_WINDOWS as readonly string[]).includes(window),
      ) ||
      !Number.isSafeInteger(effect.priority) ||
      Object.values(effect.parameters).some((value) => !isEffectParameter(value))
    ) {
      violations.push(`效果定义无效：${effect.id}`);
    }
  }
  if (missingHandlers.size > 0) {
    violations.push(`效果处理器未注册：${[...missingHandlers].sort().join('、')}`);
  }

  for (const blind of state.content.blinds) {
    if (
      !Number.isSafeInteger(blind.minimumAnte) ||
      !Number.isFinite(blind.targetMultiplier) ||
      blind.targetMultiplier <= 0 ||
      !isNonnegativeInteger(blind.reward)
    ) {
      violations.push(`盲注定义数值无效：${blind.id}`);
    }
  }
  for (const voucher of state.content.vouchers) {
    if (
      !isNonnegativeInteger(voucher.cost) ||
      (voucher.prerequisiteId !== null && !voucherById.has(voucher.prerequisiteId))
    ) {
      violations.push(`木牌定义无效：${voucher.id}`);
    }
  }
  for (const item of state.content.items) {
    if (
      !isNonnegativeInteger(item.baseCost) ||
      !isNonnegativeInteger(item.weightUnits) ||
      !targetRangeIsValid(item.targetKind, item.minimumTargets, item.maximumTargets) ||
      (item.kind === 'joker' && !isNonnegativeInteger(item.slotContribution))
    ) {
      violations.push(`物品定义无效：${item.contentId}`);
    }
  }
  for (const pack of state.content.packs) {
    if (
      !isNonnegativeInteger(pack.cost) ||
      !isNonnegativeInteger(pack.optionCount) ||
      !isNonnegativeInteger(pack.pickCount) ||
      pack.pickCount > pack.optionCount ||
      !isNonnegativeInteger(pack.temporaryJokerSlots) ||
      !isNonnegativeInteger(pack.temporaryConsumableSlots) ||
      !isNonnegativeInteger(pack.weightUnits) ||
      pack.allowedItemKinds.length === 0 ||
      hasDuplicates(pack.allowedItemKinds)
    ) {
      violations.push(`卡包定义无效：${pack.id}`);
    }
  }

  if (hasDuplicates(cardIds)) violations.push('永久牌组中的卡牌实例编号必须唯一');
  if (
    state.deck.cards.some(
      (card) =>
        !Number.isSafeInteger(card.bonusChips) || !card.id || !card.suit || !card.rank,
    )
  ) {
    violations.push('永久牌组中存在无效卡牌');
  }
  if (!Number.isSafeInteger(state.checkpointId) || state.checkpointId < 0) {
    violations.push('检查点编号必须是非负安全整数');
  }
  if (
    !Number.isSafeInteger(state.rngState) ||
    state.rngState <= 0 ||
    state.rngState > 0xffff_ffff
  ) {
    violations.push('随机状态必须是非零 32 位整数');
  }
  if (!Number.isSafeInteger(state.progress.ante) || state.progress.ante < -1) {
    violations.push('幕次必须是不小于 -1 的安全整数');
  }

  const nonnegativeRules = [
    state.rules.handsPerRound,
    state.rules.discardsPerRound,
    state.rules.handSize,
    state.rules.maximumSelectedCards,
    state.rules.jokerSlots,
    state.rules.consumableSlots,
    state.rules.interestRate,
    state.rules.interestCap,
    state.rules.allowedDebt,
    state.rules.cardOfferSlots,
    state.rules.packOfferSlots,
    state.rules.baseRerollCost,
  ];
  if (
    nonnegativeRules.some((value) => !isNonnegativeInteger(value)) ||
    !Number.isSafeInteger(state.rules.interestStep) ||
    state.rules.interestStep < 1 ||
    !Number.isSafeInteger(state.rules.priceDiscountBasisPoints) ||
    state.rules.priceDiscountBasisPoints < 0 ||
    state.rules.priceDiscountBasisPoints > 10_000 ||
    !Number.isSafeInteger(state.rules.targetScaleBasisPoints) ||
    state.rules.targetScaleBasisPoints < 1 ||
    !Number.isSafeInteger(state.rules.straightSize) ||
    state.rules.straightSize < 1 ||
    !Number.isSafeInteger(state.rules.flushSize) ||
    state.rules.flushSize < 1
  ) {
    violations.push('运行规则数值必须在声明范围内');
  }
  if (
    POKER_HAND_TYPES.some(
      (handType) =>
        !Number.isSafeInteger(state.rules.handLevels[handType]) ||
        state.rules.handLevels[handType] < 1,
    )
  ) {
    violations.push('每种牌型等级必须是正安全整数');
  }

  if (!Number.isSafeInteger(state.economy.money)) {
    violations.push('戏票必须是安全整数');
  } else if (state.economy.money < -state.rules.allowedDebt) {
    violations.push('戏票不能超出允许的欠票额度');
  }

  const lineupBoss = blindById.get(state.progress.lineup.boss.definitionId);
  const expectedBossKind = state.progress.ante % 8 === 0 ? 'finisher' : 'boss';
  if (
    !tagById.has(state.progress.lineup.smallTagId) ||
    !tagById.has(state.progress.lineup.bigTagId) ||
    !lineupBoss ||
    lineupBoss.kind !== state.progress.lineup.boss.kind ||
    state.progress.lineup.boss.kind !== expectedBossKind
  ) {
    violations.push('当前幕阵容必须引用合法的戏签和班主');
  }
  if (
    hasDuplicates(state.progress.seenNormalBossIds) ||
    hasDuplicates(state.progress.seenFinisherBossIds) ||
    state.progress.seenNormalBossIds.some((id) => blindById.get(id)?.kind !== 'boss') ||
    state.progress.seenFinisherBossIds.some(
      (id) => blindById.get(id)?.kind !== 'finisher',
    )
  ) {
    violations.push('班主历史必须与普通/压轴池一致');
  }
  if (
    state.progress.anteVoucherId !== null &&
    !voucherById.has(state.progress.anteVoucherId)
  ) {
    violations.push('本幕木牌必须引用已冻结内容');
  }

  if (state.round) {
    const zones = [
      ...state.round.drawPileIds,
      ...state.round.handIds,
      ...state.round.playedIds,
      ...state.round.discardPileIds,
    ];
    if (
      zones.length !== cardIds.length ||
      hasDuplicates(zones) ||
      zones.some((cardId) => !cardIdSet.has(cardId))
    ) {
      violations.push('活动回合的牌区必须恰好引用每张牌一次');
    }
    const handIds = new Set(state.round.handIds);
    if (
      hasDuplicates(state.round.selectedCardIds) ||
      state.round.selectedCardIds.length > state.rules.maximumSelectedCards ||
      state.round.selectedCardIds.some((cardId) => !handIds.has(cardId))
    ) {
      violations.push('选择区只能引用当前手牌并遵守上限');
    }
    if (
      hasDuplicates(state.round.forcedSelectedCardIds) ||
      state.round.forcedSelectedCardIds.some(
        (cardId) =>
          !handIds.has(cardId) || !state.round?.selectedCardIds.includes(cardId),
      )
    ) {
      violations.push('强制选择必须同时属于手牌和当前选择');
    }
    if (
      hasDuplicates(state.round.faceDownCardIds) ||
      state.round.faceDownCardIds.some((cardId) => !handIds.has(cardId))
    ) {
      violations.push('暗置牌只能引用当前手牌');
    }
    if (
      !blindById.has(state.round.blind.definitionId) ||
      (state.phase.kind === 'round' &&
        state.progress.blindPosition !== 'boss' &&
        state.round.blind.kind !== state.progress.blindPosition) ||
      (state.phase.kind === 'round' &&
        state.progress.blindPosition === 'boss' &&
        state.round.blind.definitionId !== state.progress.lineup.boss.definitionId)
    ) {
      violations.push('活动回合盲注必须与当前路由和内容一致');
    }
    if (
      !isScore(state.round.targetScore) ||
      !isScore(state.round.score) ||
      (state.lastHand !== null && !isScore(state.lastHand.score))
    ) {
      violations.push('分数必须是非负有限数或正无穷');
    }
    if (
      !isNonnegativeInteger(state.round.handsRemaining) ||
      !isNonnegativeInteger(state.round.discardsRemaining) ||
      !isNonnegativeInteger(state.round.handsPlayed) ||
      !isNonnegativeInteger(state.round.discardsUsed)
    ) {
      violations.push('出牌、弃牌次数和历史计数必须是非负安全整数');
    }
  } else if (state.phase.kind === 'round' || state.phase.kind === 'round-reward') {
    violations.push('回合阶段必须持有回合状态');
  }

  const usedJokerSlots = state.inventory.jokers.reduce(
    (total, joker) => total + joker.slotContribution,
    0,
  );
  if (
    state.inventory.jokers.some(
      (joker) =>
        !isNonnegativeInteger(joker.slotContribution) ||
        !isNonnegativeInteger(joker.baseCost) ||
        !isNonnegativeInteger(joker.editionCost) ||
        (joker.sellValueOverride !== null &&
          !isNonnegativeInteger(joker.sellValueOverride)) ||
        itemById.get(joker.contentId)?.kind !== 'joker',
    )
  ) {
    violations.push('持有奇牌必须引用合法定义并具有有效数值');
  }
  if (usedJokerSlots > state.rules.jokerSlots) {
    violations.push('持有奇牌超过当前栏位容量');
  }
  if (
    state.inventory.consumables.some(
      (item) =>
        !isNonnegativeInteger(item.baseCost) ||
        !isNonnegativeInteger(item.editionCost) ||
        (item.sellValueOverride !== null &&
          !isNonnegativeInteger(item.sellValueOverride)) ||
        !targetRangeIsValid(item.targetKind, item.minimumTargets, item.maximumTargets) ||
        itemById.get(item.contentId)?.kind !== 'consumable',
    )
  ) {
    violations.push('持有消耗牌必须引用合法定义并具有有效数值');
  }
  if (state.inventory.consumables.length > state.rules.consumableSlots) {
    violations.push('持有消耗牌超过当前栏位容量');
  }
  if (hasDuplicates(state.inventory.jokers.map((joker) => joker.instanceId))) {
    violations.push('奇牌实例编号必须唯一');
  }
  if (hasDuplicates(state.inventory.consumables.map((item) => item.instanceId))) {
    violations.push('消耗牌实例编号必须唯一');
  }
  if (
    hasDuplicates(state.inventory.voucherIds) ||
    state.inventory.voucherIds.some((id) => {
      const voucher = voucherById.get(id);
      return (
        !voucher ||
        (voucher.prerequisiteId !== null &&
          !state.inventory.voucherIds.includes(voucher.prerequisiteId))
      );
    })
  ) {
    violations.push('已兑换木牌不能重复且必须引用冻结内容');
  }
  if (
    hasDuplicates(state.inventory.tags.map((tag) => tag.instanceId)) ||
    state.inventory.tags.some((tag) => !tagById.has(tag.contentId))
  ) {
    violations.push('戏签实例必须唯一且引用冻结内容');
  }

  function materializedItemIsValid(item: MaterializedItem): boolean {
    const definition = itemById.get(item.contentId);
    return (
      definition?.kind === item.kind &&
      isNonnegativeInteger(item.baseCost) &&
      isNonnegativeInteger(item.editionCost) &&
      isNonnegativeInteger(item.slotContribution) &&
      targetRangeIsValid(item.targetKind, item.minimumTargets, item.maximumTargets) &&
      (item.kind === 'playing-card'
        ? item.generatedCard !== null
        : item.generatedCard === null)
    );
  }

  if (state.phase.kind === 'shop' && state.shop === null) {
    violations.push('商店阶段必须持有商店状态');
  }
  if (state.shop) {
    const activeOfferIds = [
      ...state.shop.cardOffers.map((offer) => offer.id),
      ...state.shop.packOffers.map((offer) => offer.id),
      ...(state.shop.voucherOffer ? [state.shop.voucherOffer.id] : []),
    ];
    if (
      (state.phase.kind !== 'shop' && state.phase.kind !== 'choice') ||
      state.shop.ante !== state.progress.ante ||
      state.shop.cardOffers.length > state.rules.cardOfferSlots ||
      state.shop.packOffers.length > state.rules.packOfferSlots ||
      hasDuplicates(activeOfferIds) ||
      hasDuplicates(state.shop.purchasedOfferIds) ||
      activeOfferIds.some((id) => state.shop?.purchasedOfferIds.includes(id)) ||
      !isNonnegativeInteger(state.shop.rerollCount) ||
      !isNonnegativeInteger(state.shop.rerollCost)
    ) {
      violations.push('商店容量、价格、计数和消费记录必须一致');
    }
    if (
      state.shop.cardOffers.some(
        (offer) =>
          !isNonnegativeInteger(offer.price) || !materializedItemIsValid(offer.item),
      ) ||
      state.shop.packOffers.some(
        (offer) => !isNonnegativeInteger(offer.price) || !packById.has(offer.packId),
      ) ||
      (state.shop.voucherOffer !== null &&
        (!isNonnegativeInteger(state.shop.voucherOffer.price) ||
          !voucherById.has(state.shop.voucherOffer.voucherId)))
    ) {
      violations.push('商店可见商品必须引用冻结内容并具有合法价格');
    }
  }

  if (state.phase.kind === 'choice') {
    if (!state.pendingChoice || state.pendingChoice.current.id !== state.phase.choiceId) {
      violations.push('选择阶段必须引用当前选择帧');
    }
  } else if (state.pendingChoice !== null) {
    violations.push('只有选择阶段可以持有待决选择');
  }
  if (state.pendingChoice && state.pendingChoice.suspended.length > 8) {
    violations.push('选择栈深度超过安全上限');
  }
  const choiceFrames = allChoiceFrames(state);
  if (hasDuplicates(choiceFrames.map((frame) => frame.id))) {
    violations.push('选择栈帧编号必须唯一');
  }
  const generatedChoiceCardIds: string[] = [];
  for (const frame of choiceFrames) {
    if (frame.kind === 'pack') {
      const availableOptions = frame.options.filter((option) => !option.consumed);
      if (
        !packById.has(frame.packId) ||
        hasDuplicates(frame.options.map((option) => option.id)) ||
        !isNonnegativeInteger(frame.remainingPicks) ||
        frame.remainingPicks > availableOptions.length ||
        !isNonnegativeInteger(frame.temporaryJokerSlots) ||
        !isNonnegativeInteger(frame.temporaryConsumableSlots) ||
        frame.options.some((option) => !materializedItemIsValid(option.item))
      ) {
        violations.push(`卡包选择帧无效：${frame.id}`);
      }
      generatedChoiceCardIds.push(
        ...frame.options.flatMap((option) =>
          option.item.generatedCard ? [option.item.generatedCard.id] : [],
        ),
      );
      continue;
    }
    if (frame.kind === 'boss-reroll') {
      if (
        !isNonnegativeInteger(frame.cost) ||
        frame.eligibleBlindIds.length === 0 ||
        hasDuplicates(frame.eligibleBlindIds) ||
        frame.eligibleBlindIds.some((id) => {
          const kind = blindById.get(id)?.kind;
          return kind !== expectedBossKind;
        })
      ) {
        violations.push(`班主换角选择帧无效：${frame.id}`);
      }
      continue;
    }
    const targetIds: ReadonlySet<string> =
      frame.kind === 'forced-card' || frame.targetKind === 'playing-card'
        ? cardIdStringSet
        : frame.targetKind === 'joker'
          ? new Set<string>(state.inventory.jokers.map((joker) => joker.instanceId))
          : new Set<string>(state.inventory.consumables.map((item) => item.instanceId));
    const eligibleIdSet: ReadonlySet<string> = new Set(frame.eligibleIds);
    if (
      !targetRangeIsValid(
        frame.kind === 'forced-card' ? 'playing-card' : frame.targetKind,
        frame.minimumTargets,
        frame.maximumTargets,
      ) ||
      hasDuplicates(frame.eligibleIds) ||
      hasDuplicates(frame.selectedIds) ||
      frame.eligibleIds.some((id) => !targetIds.has(id)) ||
      frame.selectedIds.some((id) => !eligibleIdSet.has(id)) ||
      frame.selectedIds.length > frame.maximumTargets
    ) {
      violations.push(`目标选择帧无效：${frame.id}`);
    }
  }
  if (
    hasDuplicates(generatedChoiceCardIds) ||
    generatedChoiceCardIds.some((id) => cardIdStringSet.has(id))
  ) {
    violations.push('卡包生成牌实例必须唯一且未进入永久牌组');
  }

  const claimedEconomyIds = state.economy.claimedRewardIds;
  const claimedHistoryIds = state.history.claimedRewardIds;
  if (
    state.history.effectObservations.some(
      (observation) =>
        !observation.key ||
        !observation.sourceInstanceId ||
        !observation.effectId ||
        !isEffectParameter(observation.value) ||
        !isNonnegativeInteger(observation.checkpointId) ||
        observation.checkpointId > state.checkpointId,
    )
  ) {
    violations.push('效果观测历史必须是可序列化的已提交记录');
  }
  if (
    hasDuplicates(claimedEconomyIds) ||
    hasDuplicates(claimedHistoryIds) ||
    !sameOrderedValues(claimedEconomyIds, claimedHistoryIds)
  ) {
    violations.push('奖励收据的经济与历史消费记录必须唯一且一致');
  }
  if (state.economy.pendingReward) {
    const receipt = state.economy.pendingReward;
    const expectedTotal =
      receipt.blindReward +
      receipt.remainingHandReward +
      receipt.interestReward +
      receipt.effectLines.reduce((total, line) => total + line.amount, 0);
    if (
      !isNonnegativeInteger(receipt.blindReward) ||
      !isNonnegativeInteger(receipt.remainingHandReward) ||
      !isNonnegativeInteger(receipt.interestReward) ||
      receipt.effectLines.some((line) => !Number.isSafeInteger(line.amount)) ||
      hasDuplicates(receipt.effectLines.map((line) => line.id)) ||
      !Number.isSafeInteger(receipt.total) ||
      receipt.total !== expectedTotal ||
      receipt.claimed ||
      claimedEconomyIds.includes(receipt.id) ||
      state.economy.money + receipt.total < -state.rules.allowedDebt
    ) {
      violations.push('待领取奖励必须有效且尚未领取');
    }
    if (state.phase.kind !== 'round-reward' || state.phase.receiptId !== receipt.id) {
      violations.push('奖励阶段必须引用唯一待领取收据');
    }
  } else if (state.phase.kind === 'round-reward') {
    violations.push('奖励阶段必须持有待领取收据');
  }

  if (
    (state.phase.kind === 'run-won' && state.result?.kind !== 'won') ||
    (state.phase.kind === 'run-lost' && state.result?.kind !== 'lost') ||
    (state.phase.kind === 'finished' && state.result === null) ||
    (state.phase.kind !== 'run-won' &&
      state.phase.kind !== 'run-lost' &&
      state.phase.kind !== 'finished' &&
      state.result !== null)
  ) {
    violations.push('终局阶段与运行结果必须一致');
  }
  if (
    state.result &&
    (!Number.isSafeInteger(state.result.ante) || !isScore(state.result.score))
  ) {
    violations.push('运行结果必须持有合法幕次和分数');
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
