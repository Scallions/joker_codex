import { applyRoundStartEffectsV2 } from '../effects/roundStartV2';
import {
  acquireContentByIdV3,
  applyStateOperationV3,
  initializeAcquiredJokerTargetsV5,
  type StateOperationFailureCodeV3,
} from '../effects/applyStateOperationV3';
import {
  applyResolvedRunOperationsV2,
  applyRunWindowEffectsV2,
} from '../effects/runWindowV2';
import { resolveHandScoreV2, validateBeforeHandV2 } from '../effects/scoreHandV2';
import { resolvePlayedHandV3 } from '../effects/resolvePlayedHandV3';
import { destroyPlayingCardsV6 } from '../effects/playingCardDestructionV6';
import {
  preparePlayingCardDestructionV6,
  removePlayingCardReferencesV6,
} from '../effects/playingCardDestructionProposalV6';
import {
  resolveEffectOperations,
  resolveEffectQueue,
  type EffectQueueFailureCode,
} from '../effects/registry';
import { saleValue } from '../economy/pricing';
import {
  createShopV2,
  fillShopCardOffersV2,
  materializePackOptionsV2,
  repriceShopV2,
  rerollShopCardsV2,
} from '../economy/shopV2';
import { stableId, type CardId } from '../model/ids';
import { projectEffectivePlayingCardV3 } from '../poker/effectiveCardV3';
import { buildHandFactsV3 } from '../poker/handFactsV3';
import {
  isAbilityStateRun,
  isRunStateV3,
  materializeJokerStickersV3,
  synchronizeRunStateV3,
  type CatalogRunState as RunStateV3,
} from '../model/runV3';
import { isRunStateV5OrV6, isRunStateV6, type RunStateV6 } from '../model/runV6';
import type {
  BlindDefinition,
  BossRerollChoiceFrame,
  ChoiceFrame,
  MaterializedItem,
  MaterializedBlind,
  OwnedConsumableV2,
  OwnedJokerV2,
  PackChoiceFrame,
  RewardReceipt,
  RunStateV2,
  TargetChoiceFrame,
} from '../model/runV2';
import { shuffle } from '../rng/shuffle';
import { pickStable } from '../rng/weighted';
import { addScore, meetsTarget } from '../score/score';
import {
  selectBossRerollCostV2,
  selectCardMapV2,
  sortCardIdsV2,
} from '../selectors/runV2';
import {
  eligibleBosses,
  getBlindDefinitionForPosition,
  materializeAnte,
  materializeBlind,
} from '../rules/ante';
import {
  applyBossCompletionSetupRulesV3,
  applySetupDrawRulesV3,
  hasActiveBlindRule,
  blindRewardForRun,
  bossEffectsDisabledForRun,
  canSellJokerForRun,
  discardCostForRun,
  effectiveHandSizeForRun,
  effectiveDiscardsPerRoundForRun,
  effectiveHandsPerRoundForRun,
  getBlindTargetForRun,
  remainingDiscardRewardForRun,
  remainingHandRewardForRun,
  recordPurchaseForRun,
  replacementDrawCountForRun,
  settleJokerStickersV3,
} from '../rules/runtimeV3';
import {
  applyDiscardModifierLifecycleV3,
  applyRoundEndModifierLifecycleV3,
} from '../rules/playingCardModifierLifecycleV3';
import {
  canAffordRunStateV3,
  resolveJokerPassiveCapabilities,
} from '../rules/jokerPassiveCapabilitiesV3';
import { recordFirstAcquisitionDiscoveryV3 } from '../rules/discoveryV3';
import {
  usedConsumableSlotsForRun,
  usedJokerSlotsForRun,
} from '../rules/inventoryCapacityV6';
import type {
  CancelChoiceCommandV2,
  BeginConsumableChoiceCommandV2,
  BuyPackCommandV2,
  BuyShopOfferCommandV2,
  BuyVoucherCommandV2,
  ClaimRoundRewardCommandV2,
  ChoosePackOptionCommandV2,
  CommandResultV2,
  ConfirmChoiceCommandV2,
  DiscardSelectedCommandV2,
  DomainEventV2,
  EnterEndlessCommandV2,
  FinishRunCommandV2,
  LeaveShopCommandV2,
  PlaySelectedCommandV2,
  PresentationEventV2,
  RejectionCodeV2,
  RequestBossRerollCommandV2,
  ReorderJokerCommandV2,
  RerollShopCommandV2,
  RunCommandV2,
  SelectBlindCommandV2,
  SellConsumableCommandV2,
  SellJokerCommandV2,
  SkipBlindCommandV2,
  SkipPackCommandV2,
  SortHandCommandV2,
  ToggleCardCommandV2,
  ToggleChoiceTargetCommandV2,
} from './typesV2';

function reject(code: RejectionCodeV2, message: string): CommandResultV2 {
  return { ok: false, rejection: { code, message } };
}

function accept(
  state: RunStateV2,
  domainEvents: readonly DomainEventV2[] = [],
  presentationEvents: readonly PresentationEventV2[] = [],
): CommandResultV2 {
  return {
    ok: true,
    state: synchronizeRunStateV3(state),
    domainEvents,
    presentationEvents,
  };
}

function withCheckpoint(state: RunStateV2): RunStateV2 {
  return { ...state, checkpointId: state.checkpointId + 1 };
}

function recordConsumableUse(state: RunStateV2, contentId: string): RunStateV2 {
  return {
    ...state,
    history: {
      ...state.history,
      effectObservations: [
        ...state.history.effectObservations,
        {
          window: 'item-acquired',
          key: 'consumable-used',
          value: contentId,
          sourceInstanceId: `consumable:${contentId}`,
          effectId: `consumable-used:${contentId}`,
          checkpointId: state.checkpointId + 1,
        },
      ],
    },
  };
}

function applyConsumableUsedWindow(state: RunStateV2, contentId: string) {
  const recorded = recordConsumableUse(state, contentId);
  const definition = recorded.content.items.find(
    (item) => item.kind === 'consumable' && item.contentId === contentId,
  );
  return applyRunWindowEffectsV2(recorded, 'consumable-used', {
    eventContext: {
      eventFacts: {
        kind: 'consumable-use',
        family: definition?.kind === 'consumable' ? definition.family : 'fixture',
        contentId,
      },
      eventCardIdentities: {},
    },
  });
}

function activeBlind(state: RunStateV2): MaterializedBlind {
  return state.progress.blindPosition === 'boss'
    ? state.progress.lineup.boss
    : materializeBlind(
        getBlindDefinitionForPosition(state.content, state.progress.blindPosition),
      );
}

function tagHasRule(state: RunStateV2, contentId: string, key: string): boolean {
  return (
    state.content.tags
      .find((definition) => definition.id === contentId)
      ?.effects.some((effect) => effect.parameters.key === key) ?? false
  );
}

function openImmediateFreePack(state: RunStateV2, profile: string, identity: string) {
  const [family, size] = (() => {
    switch (profile) {
      case 'standard-mega':
        return ['standard', 'mega'] as const;
      case 'tarot-mega':
        return ['arcana', 'mega'] as const;
      case 'planet-mega':
        return ['celestial', 'mega'] as const;
      case 'joker-mega':
        return ['buffoon', 'mega'] as const;
      case 'spectral-normal':
        return ['spectral', 'normal'] as const;
      default:
        return [null, null] as const;
    }
  })();
  if (!family || !size) {
    return { ok: true as const, state, packId: null, choiceId: null };
  }
  const definition = [...state.content.packs]
    .filter((pack) => pack.family === family && pack.size === size)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!definition) {
    return { ok: true as const, state, packId: null, choiceId: null };
  }
  const offerId = stableId<'pack-offer'>(
    `bxqp:free-pack:${state.runId}:${state.checkpointId + 1}:${identity}`,
  );
  const materialized = materializePackOptionsV2(
    state,
    definition,
    offerId,
    state.rngState,
  );
  if (materialized.items.length === 0) {
    return { ok: true as const, state, packId: null, choiceId: null };
  }
  const choice: PackChoiceFrame = {
    id: stableId<'choice'>(`choice:pack:${offerId}`),
    kind: 'pack',
    optional: true,
    returnPhase: 'blind-select',
    packId: definition.id,
    packOfferId: offerId,
    options: materialized.items.map((item, index) => ({
      id: `${offerId}:option:${index}`,
      item,
      consumed: false,
    })),
    remainingPicks: Math.min(definition.pickCount, materialized.items.length),
    temporaryJokerSlots: definition.temporaryJokerSlots,
    temporaryConsumableSlots: definition.temporaryConsumableSlots,
  };
  const openedState: RunStateV2 = {
    ...state,
    rngState: materialized.rngState,
    phase: { kind: 'choice', choiceId: choice.id },
    pendingChoice: { current: choice, suspended: [] },
  };
  const packEffects = applyRunWindowEffectsV2(openedState, 'pack-opened', {
    additionalSources: [
      {
        instanceId: `pack:${definition.id}:${offerId}`,
        position: 500,
        effects: definition.effects,
      },
    ],
    eventContext: {
      eventFacts: { kind: 'pack', packId: definition.id, action: 'opened' },
      eventCardIdentities: {},
    },
  });
  if (!packEffects.ok) return packEffects;
  return {
    ok: true as const,
    state: packEffects.state,
    packId: definition.id,
    choiceId: choice.id,
  };
}

function selectBlind(state: RunStateV2, command: SelectBlindCommandV2): CommandResultV2 {
  if (state.phase.kind !== 'blind-select') {
    return reject('illegal-phase', '当前不能选择盲注');
  }
  if (command.position !== state.progress.blindPosition) {
    return reject('wrong-blind', '只能选择当前待演的盲注');
  }

  let readyState: RunStateV2 = state;
  if (isRunStateV5OrV6(state)) {
    const reset = {
      ...state,
      jokerRuntimeV5: {
        ...state.jokerRuntimeV5,
        bossDisabledForRound: false,
      },
    };
    readyState = reset;
  }
  if (isRunStateV6(readyState)) {
    let targetedState = readyState;
    for (const joker of targetedState.inventory.jokers) {
      if (joker.debuffed) continue;
      const initialized = initializeAcquiredJokerTargetsV5(
        targetedState,
        joker.instanceId,
        joker.effects,
      );
      if (!initialized.ok) return reject(initialized.code, initialized.message);
      if (!isRunStateV6(initialized.state)) {
        return reject('pool-empty', 'V6 盲注目标初始化降级了牌局版本');
      }
      targetedState = initialized.state;
    }
    readyState = targetedState;
  }
  const blind = activeBlind(readyState);
  const handSize = effectiveHandSizeForRun(readyState, blind);
  const shuffled = shuffle(
    readyState.deck.cards.map((card) => card.id),
    readyState.rngState,
  );
  const handIds = shuffled.value.slice(0, handSize);
  const initialRound: NonNullable<RunStateV2['round']> = {
    blind,
    targetScore: getBlindTargetForRun(readyState, blind.targetMultiplier),
    score: 0,
    handsRemaining: effectiveHandsPerRoundForRun(readyState),
    discardsRemaining: effectiveDiscardsPerRoundForRun(readyState),
    drawPileIds: shuffled.value.slice(handSize),
    handIds,
    playedIds: [],
    discardPileIds: [],
    selectedCardIds: [],
    forcedSelectedCardIds: [],
    faceDownCardIds: [],
    sortMode: 'rank',
    handsPlayed: 0,
    discardsUsed: 0,
    lastHandType: null,
  };
  const selected = applyRunWindowEffectsV2(
    {
      ...readyState,
      rngState: shuffled.state,
      phase: { kind: 'round' },
      round: initialRound,
      shop: null,
      pendingChoice: null,
      lastHand: null,
      result: null,
    },
    'blind-selected',
  );
  if (!selected.ok) return reject(selected.code, selected.message);
  const setupDrawn = applySetupDrawRulesV3(
    selected.state,
    handIds,
    `round-start:${readyState.runId}:${readyState.progress.ante}:${readyState.progress.blindPosition}:${readyState.checkpointId + 1}`,
  );
  const roundStart = applyRoundStartEffectsV2(
    setupDrawn,
    setupDrawn.round!,
    setupDrawn.rngState,
  );
  if (!roundStart.ok) return reject(roundStart.code, roundStart.message);
  const passiveRoundStart = applyRunWindowEffectsV2(
    {
      ...setupDrawn,
      rngState: roundStart.rngState,
      round: roundStart.round,
      inventory: {
        ...setupDrawn.inventory,
        tags: roundStart.tags,
      },
    },
    'round-start',
    {
      includeDeferredTags: false,
      blindDrawnCardIds: handIds,
    },
  );
  if (!passiveRoundStart.ok) {
    return reject(passiveRoundStart.code, passiveRoundStart.message);
  }
  const deckIdsBeforeRoundStart = new Set(readyState.deck.cards.map(({ id }) => id));
  let afterAddedCards = passiveRoundStart.state;
  const addedCards = afterAddedCards.deck.cards.filter(
    ({ id }) => !deckIdsBeforeRoundStart.has(id),
  );
  for (const card of addedCards) {
    const added = applyRunWindowEffectsV2(afterAddedCards, 'playing-card-added', {
      eventContext: {
        eventFacts: {
          kind: 'playing-card-added',
          cardIds: [card.id],
          reason: 'joker-round-start',
        },
        eventCardIdentities: {
          [card.id]: projectEffectivePlayingCardV3(afterAddedCards, card),
        },
      },
    });
    if (!added.ok) return reject(added.code, added.message);
    afterAddedCards = added.state;
  }
  const next = withCheckpoint({
    ...afterAddedCards,
    phase: { kind: 'round' },
    shop: null,
    pendingChoice: null,
    lastHand: null,
    result: null,
  });

  return accept(
    next,
    [{ type: 'blind-selected', blindId: blind.definitionId }],
    [{ type: 'blind-curtain', name: blind.name }],
  );
}

function skipBlind(state: RunStateV2, command: SkipBlindCommandV2): CommandResultV2 {
  if (state.phase.kind !== 'blind-select') {
    return reject('illegal-phase', '当前不能跳过盲注');
  }
  if (command.position !== state.progress.blindPosition) {
    return reject('wrong-blind', '只能处理当前待演的盲注');
  }
  if (command.position === 'boss') {
    return reject('blind-not-skippable', '班主盲注必须登台应战');
  }

  const tagId =
    command.position === 'small'
      ? state.progress.lineup.smallTagId
      : state.progress.lineup.bigTagId;
  const tag = state.content.tags.find((definition) => definition.id === tagId);
  if (!tag) return reject('pool-empty', '当前戏签定义缺失');
  const blind = materializeBlind(
    getBlindDefinitionForPosition(state.content, command.position),
  );
  const nextPosition = command.position === 'small' ? 'big' : 'boss';
  const copyTag = tag.effects.some((effect) => effect.parameters.key === 'copy-next-tag');
  const pendingCopyTags = state.inventory.tags.filter(
    (owned) =>
      !owned.consumed &&
      owned.deferredWindow === null &&
      tagHasRule(state, owned.contentId, 'copy-next-tag'),
  );
  const instancePrefix = isRunStateV3(state)
    ? `bxqp:tag-instance:${state.runId}:${state.checkpointId + 1}:${tag.id}`
    : `fixture:run-economy:tag-instance:${state.checkpointId + 1}:${tag.id}`;
  const acquiredTags = copyTag
    ? [
        {
          instanceId: instancePrefix,
          contentId: tag.id,
          consumed: false,
          deferredWindow: null,
        },
      ]
    : Array.from({ length: pendingCopyTags.length + 1 }, (_, index) => ({
        instanceId: `${instancePrefix}:copy:${index}`,
        contentId: tag.id,
        consumed: tag.effects.length === 0,
        deferredWindow: tag.effects[0]?.windows[0] ?? null,
      }));
  const tagged: RunStateV2 = {
    ...state,
    progress: { ...state.progress, blindPosition: nextPosition },
    inventory: {
      ...state.inventory,
      tags: [
        ...state.inventory.tags.map((owned) =>
          !copyTag &&
          pendingCopyTags.some(({ instanceId }) => instanceId === owned.instanceId)
            ? { ...owned, consumed: true }
            : owned,
        ),
        ...acquiredTags,
      ],
    },
    history: {
      ...state.history,
      skippedBlindIds: [...state.history.skippedBlindIds, blind.definitionId],
    },
  };
  if (copyTag) {
    const next = withCheckpoint(tagged);
    return accept(
      next,
      [{ type: 'blind-skipped', blindId: blind.definitionId, tagId: tag.id }],
      [{ type: 'tag-received', name: tag.name }],
    );
  }
  const skipped = applyRunWindowEffectsV2(tagged, 'blind-skipped');
  if (!skipped.ok) return reject(skipped.code, skipped.message);
  const freePackProfile = tag.effects.find(
    (effect) => effect.parameters.key === 'free-pack',
  )?.parameters.value;
  const afterPack =
    typeof freePackProfile === 'string'
      ? openImmediateFreePack(
          skipped.state,
          freePackProfile,
          acquiredTags[0]?.instanceId ?? tag.id,
        )
      : {
          ok: true as const,
          state: skipped.state,
          packId: null,
          choiceId: null,
        };
  if (!afterPack.ok) return reject(afterPack.code, afterPack.message);
  const next = withCheckpoint(afterPack.state);

  return accept(
    next,
    [
      { type: 'blind-skipped', blindId: blind.definitionId, tagId: tag.id },
      ...(afterPack.packId
        ? ([{ type: 'pack-opened', packId: afterPack.packId }] as const)
        : []),
      ...(afterPack.choiceId
        ? ([{ type: 'choice-opened', choiceId: afterPack.choiceId }] as const)
        : []),
    ],
    [{ type: 'tag-received', name: tag.name }],
  );
}

function toggleCard(state: RunStateV2, command: ToggleCardCommandV2): CommandResultV2 {
  if (state.phase.kind !== 'round' || !state.round) {
    return reject('illegal-phase', '当前不能选择手牌');
  }
  if (!state.round.handIds.includes(command.cardId)) {
    return reject('card-not-in-hand', '这张牌不在当前手牌中');
  }
  if (state.round.forcedSelectedCardIds.includes(command.cardId)) {
    return reject('forced-card', '这张牌被班主规则强制选中');
  }
  const selected = state.round.selectedCardIds.includes(command.cardId);
  if (
    !selected &&
    state.round.selectedCardIds.length >= state.rules.maximumSelectedCards
  ) {
    return reject(
      'selection-limit',
      `一次最多选择${state.rules.maximumSelectedCards}张牌`,
    );
  }
  const selectedCardIds = selected
    ? state.round.selectedCardIds.filter((cardId) => cardId !== command.cardId)
    : [...state.round.selectedCardIds, command.cardId];
  return accept(
    withCheckpoint({ ...state, round: { ...state.round, selectedCardIds } }),
    [{ type: 'selection-changed', cardIds: selectedCardIds }],
    [{ type: 'card-selection', cardId: command.cardId }],
  );
}

function sortHand(state: RunStateV2, command: SortHandCommandV2): CommandResultV2 {
  if (state.phase.kind !== 'round' || !state.round) {
    return reject('illegal-phase', '当前不能整理手牌');
  }
  const handIds = sortCardIdsV2(state, state.round.handIds, command.mode);
  return accept(
    withCheckpoint({
      ...state,
      round: { ...state.round, handIds, sortMode: command.mode },
    }),
    [{ type: 'hand-sorted', mode: command.mode }],
    [{ type: 'cards-reordered', mode: command.mode }],
  );
}

function drawReplacementCards(
  state: RunStateV2,
  removedIds: readonly CardId[],
): Pick<NonNullable<RunStateV2['round']>, 'drawPileIds' | 'handIds'> & {
  readonly drawnCardIds: readonly CardId[];
  readonly deckExhausted: boolean;
} {
  if (!state.round) throw new Error('缺少活动回合');
  const removed = new Set(removedIds);
  const kept = state.round.handIds.filter((cardId) => !removed.has(cardId));
  const drawCount = replacementDrawCountForRun(state, kept.length);
  const drawnCardIds = state.round.drawPileIds.slice(0, drawCount);
  return {
    drawPileIds: state.round.drawPileIds.slice(drawCount),
    handIds: [...kept, ...drawnCardIds],
    drawnCardIds,
    deckExhausted: drawnCardIds.length < drawCount,
  };
}

function rewardReceipt(state: RunStateV2):
  | { readonly ok: true; readonly state: RunStateV2; readonly receipt: RewardReceipt }
  | {
      readonly ok: false;
      readonly code:
        | 'effect-cycle'
        | 'effect-budget'
        | 'effect-handler-missing'
        | StateOperationFailureCodeV3;
      readonly message: string;
    } {
  if (!state.round) throw new Error('缺少活动回合');
  const modifierSettled = applyRoundEndModifierLifecycleV3(state);
  const deferredTags = modifierSettled.inventory.tags.filter(
    (tag) => !tag.consumed && tag.deferredWindow === 'round-end',
  );
  const bossRulesDisabled = bossEffectsDisabledForRun(modifierSettled);
  const resolved = resolveEffectQueue(
    [
      ...(!bossRulesDisabled
        ? [
            {
              instanceId: `blind:${modifierSettled.round!.blind.definitionId}`,
              position: 0,
              effects: modifierSettled.round!.blind.effects,
            },
          ]
        : []),
      ...deferredTags.flatMap((tag, index) => {
        const definition = modifierSettled.content.tags.find(
          (candidate) => candidate.id === tag.contentId,
        );
        return definition
          ? [
              {
                instanceId: tag.instanceId,
                position: 100 + index,
                effects: definition.effects,
              },
            ]
          : [];
      }),
      ...modifierSettled.inventory.voucherIds.flatMap((voucherId, index) => {
        const definition = modifierSettled.content.vouchers.find(
          (candidate) => candidate.id === voucherId,
        );
        return definition
          ? [
              {
                instanceId: `voucher:${voucherId}`,
                position: 300 + index,
                effects: definition.effects,
              },
            ]
          : [];
      }),
      ...modifierSettled.inventory.jokers.map((joker, position) => ({
        instanceId: joker.instanceId,
        position: 1_000 + position,
        effects: joker.effects,
        debuffed: joker.debuffed,
        copyPolicy: joker.copyPolicy ?? 'none',
        copyTarget: joker.copyTarget ?? 'none',
      })),
      ...modifierSettled.inventory.consumables.map((item, index) => ({
        instanceId: item.instanceId,
        position: 2_000 + index,
        effects: item.effects,
      })),
    ],
    'round-end',
    { state: modifierSettled },
  );
  if (!resolved.ok) return resolved;
  const applied = applyResolvedRunOperationsV2(
    modifierSettled,
    'round-end',
    resolved.operations,
    undefined,
    {
      eventFacts: {
        kind: 'blind-result',
        position: modifierSettled.progress.blindPosition,
        defeated: true,
      },
      eventCardIdentities: {},
    },
  );
  if (!applied.ok) return applied;
  let settledState: RunStateV2 = {
    ...applied.state,
    inventory: {
      ...applied.state.inventory,
      tags: applied.state.inventory.tags.map((tag) =>
        deferredTags.some((candidate) => candidate.instanceId === tag.instanceId)
          ? { ...tag, consumed: true }
          : tag,
      ),
    },
  };
  const stickerSettlement = settleJokerStickersV3(settledState);
  if (!stickerSettlement.ok) return stickerSettlement;
  settledState = stickerSettlement.state;
  if (isRunStateV6(settledState)) {
    let targetedState: RunStateV6 = {
      ...settledState,
      jokerRuntimeV6: {
        ...settledState.jokerRuntimeV6,
        castleTargetSuit: null,
        idolTargetRank: null,
        idolTargetSuit: null,
      },
    };
    for (const joker of targetedState.inventory.jokers) {
      if (joker.debuffed) continue;
      const initialized = initializeAcquiredJokerTargetsV5(
        targetedState,
        joker.instanceId,
        joker.effects,
      );
      if (!initialized.ok) return initialized;
      if (!isRunStateV6(initialized.state)) {
        return {
          ok: false,
          code: 'pool-empty',
          message: 'V6 回合目标初始化降级了牌局版本',
        };
      }
      targetedState = initialized.state;
    }
    settledState = targetedState;
  }
  const money = settledState.economy.money;
  const effectLines: RewardReceipt['effectLines'][number][] = [];
  for (const entry of resolved.operations) {
    const operation = entry.operation;
    if (operation.type === 'append-reward-line') {
      effectLines.push({
        id: `reward-line:${state.runId}:${state.checkpointId + 1}:${effectLines.length}`,
        label: operation.label,
        amount: operation.amount,
        sourceId: entry.sourceInstanceId,
      });
    }
  }
  if (stickerSettlement.upkeep > 0) {
    effectLines.push({
      id: `reward-line:${state.runId}:${state.checkpointId + 1}:sticker-upkeep`,
      label: '租借贴签维护',
      amount: -stickerSettlement.upkeep,
      sourceId: 'bxqp:sticker:rental',
    });
  }
  const survivalWaivedBaseReward = settledState.history.effectObservations.some(
    (observation) =>
      observation.key === 'blind-survival-base-reward-zero' &&
      observation.checkpointId === settledState.checkpointId + 1,
  );
  const blindReward = survivalWaivedBaseReward
    ? 0
    : blindRewardForRun(
        settledState,
        settledState.round!.blind.kind,
        settledState.round!.blind.reward,
      );
  const remainingHandReward = remainingHandRewardForRun(
    settledState,
    settledState.round!.handsRemaining,
  );
  const remainingDiscardReward = remainingDiscardRewardForRun(
    settledState,
    settledState.round!.discardsRemaining,
  );
  if (remainingDiscardReward > 0) {
    effectLines.push({
      id: `reward-line:${state.runId}:${state.checkpointId + 1}:remaining-discards`,
      label: '余下弃牌次数',
      amount: remainingDiscardReward,
      sourceId: 'bxqp:rule:remaining-discard-reward',
    });
  }
  const interestReward = Math.min(
    settledState.rules.interestCap,
    Math.floor(Math.max(0, money) / settledState.rules.interestStep) *
      settledState.rules.interestRate,
  );
  const passives = resolveJokerPassiveCapabilities(settledState);
  if (!passives.ok) return passives;
  for (const source of passives.capabilities.extraInterestSources) {
    const amount = Math.min(
      settledState.rules.interestCap,
      Math.floor(Math.max(0, money) / settledState.rules.interestStep) * source.rate,
    );
    if (amount <= 0) continue;
    effectLines.push({
      id: `reward-line:${state.runId}:${state.checkpointId + 1}:extra-interest:${source.sourceInstanceId}`,
      label: '月息算盘',
      amount,
      sourceId: source.sourceInstanceId,
    });
  }
  const total =
    blindReward +
    remainingHandReward +
    interestReward +
    effectLines.reduce((sum, line) => sum + line.amount, 0);
  if (money + total < -settledState.rules.allowedDebt) {
    return {
      ok: false,
      code: 'insufficient-funds',
      message: '赏银收据会超出当前欠票额度',
    };
  }
  return {
    ok: true,
    state: settledState,
    receipt: {
      id: stableId<'reward-receipt'>(
        `reward:${state.runId}:${state.checkpointId + 1}:${state.progress.ante}:${state.progress.blindPosition}`,
      ),
      blindReward,
      remainingHandReward,
      interestReward,
      effectLines,
      total,
      claimed: false,
    },
  };
}

function playSelected(
  state: RunStateV2,
  command: PlaySelectedCommandV2,
): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'round' || !state.round) {
    return reject('illegal-phase', '当前不能出牌');
  }
  if (state.round.handsRemaining <= 0) return reject('no-hands', '本回合已无出牌次数');
  if (state.round.selectedCardIds.length === 0) {
    return reject('empty-selection', '请先选择要打出的牌');
  }

  const cards = selectCardMapV2(state);
  const played = state.round.selectedCardIds.map((cardId) => {
    const card = cards.get(cardId);
    if (!card) throw new Error(`选中的牌不存在：${cardId}`);
    return card;
  });
  const restriction = validateBeforeHandV2(state, played);
  if (restriction) return reject('hand-restricted', restriction);
  const resolution =
    isAbilityStateRun(state) &&
    (state.contentVersion === 'joker-catalog-1' ||
      state.contentVersion === 'joker-catalog-2')
      ? resolvePlayedHandV3(state, played)
      : resolveHandScoreV2(state, played);
  if (!resolution.ok) return reject(resolution.code, resolution.message);
  const breakdown = resolution.breakdown;
  const score = addScore(state.round.score, breakdown.score);
  const handsRemaining = state.round.handsRemaining - 1;
  let scoredState: RunStateV2 = {
    ...resolution.proposedState,
    rngState: resolution.rngState,
    economy: {
      ...resolution.proposedState.economy,
      money: resolution.proposedState.economy.money + resolution.moneyDelta,
    },
  };
  if (isRunStateV3(scoredState) && resolution.modifierRolls.length > 0) {
    const materialized: RunStateV3 = {
      ...scoredState,
      materializedChoicesV3: [
        ...scoredState.materializedChoicesV3,
        {
          id: `bxqp:choice:modifier-rolls:${scoredState.runId}:${scoredState.checkpointId + 1}`,
          kind: 'playing-card-modifier-rolls',
          valueIds: resolution.modifierRolls.map(({ sourceId }) => sourceId),
          valueNumbers: resolution.modifierRolls.map(({ value }) => value),
          checkpointId: scoredState.checkpointId + 1,
        },
      ],
    };
    scoredState = materialized;
  }
  if (resolution.destroyedCardIds.length > 0) {
    const destroyed = destroyPlayingCardsV6(
      scoredState,
      resolution.destroyedCardIds,
      'post-score',
    );
    if (!destroyed.ok) return reject(destroyed.code, destroyed.message);
    scoredState = destroyed.state;
  }
  const zones = drawReplacementCards(scoredState, state.round.selectedCardIds);
  const nextRound = {
    ...scoredState.round!,
    drawPileIds: zones.drawPileIds,
    handIds: zones.handIds,
    score,
    handsRemaining,
    discardPileIds: [
      ...state.round.discardPileIds,
      ...state.round.selectedCardIds,
    ].filter((id) => !resolution.destroyedCardIds.includes(id)),
    selectedCardIds: [],
    forcedSelectedCardIds: [],
    faceDownCardIds: state.round.faceDownCardIds.filter((cardId) =>
      zones.handIds.includes(cardId),
    ),
    handsPlayed: state.round.handsPlayed + 1,
    lastHandType: breakdown.handType,
  };
  let won = meetsTarget(score, state.round.targetScore);
  let lost =
    !won && (handsRemaining === 0 || (isRunStateV6(scoredState) && zones.deckExhausted));
  const base: RunStateV2 = {
    ...scoredState,
    deck: scoredState.deck,
    round: nextRound,
    lastHand: breakdown,
    history: {
      ...scoredState.history,
      playedCardIdsThisAnte: [
        ...scoredState.history.playedCardIdsThisAnte,
        ...breakdown.playedCardIds,
      ],
      playedHandTypes: [...scoredState.history.playedHandTypes, breakdown.handType],
    },
  };
  let challengeAdjusted = base;
  if (
    isRunStateV3(base) &&
    base.rulesV3.excludedRuleKeys.includes('debuff-after-score')
  ) {
    const debuffed: RunStateV3 = {
      ...base,
      modifiersV3: {
        ...base.modifiersV3,
        playingCards: base.modifiersV3.playingCards.map((modifier) =>
          breakdown.playedCardIds.includes(modifier.cardId)
            ? { ...modifier, debuffed: true }
            : modifier,
        ),
      },
    };
    challengeAdjusted = debuffed;
  }
  const setupDrawn = applySetupDrawRulesV3(
    challengeAdjusted,
    zones.drawnCardIds,
    `after-hand:${state.runId}:${state.checkpointId + 1}:${state.round.handsPlayed + 1}`,
  );
  const afterHand = applyRunWindowEffectsV2(setupDrawn, 'after-hand', {
    blindDrawnCardIds: zones.drawnCardIds,
    // Joker after-hand operations are part of resolveHandScoreV2's atomic
    // proposal so they can use the command-entry hand facts exactly once.
    includeJokers: false,
  });
  if (!afterHand.ok) return reject(afterHand.code, afterHand.message);
  let resolvedBase = afterHand.state;
  if (lost && isRunStateV6(resolvedBase) && !zones.deckExhausted) {
    const survival = applyRunWindowEffectsV2(resolvedBase, 'blind-survival', {
      includeBlind: false,
      includeDeferredTags: false,
      includeVouchers: false,
      includeConsumables: false,
      eventContext: {
        eventFacts: {
          kind: 'blind-survival',
          score,
          targetScore: state.round.targetScore,
          deckExhausted: zones.deckExhausted,
        },
        eventCardIdentities: {},
      },
    });
    if (!survival.ok) return reject(survival.code, survival.message);
    const rescued = survival.state.history.effectObservations.some(
      (observation) =>
        observation.key === 'blind-survival-base-reward-zero' &&
        observation.checkpointId === state.checkpointId + 1,
    );
    if (rescued) {
      resolvedBase = survival.state;
      won = true;
      lost = false;
    }
  }
  let next: RunStateV2;
  if (won) {
    const reward = rewardReceipt(resolvedBase);
    if (!reward.ok) return reject(reward.code, reward.message);
    next = withCheckpoint({
      ...reward.state,
      phase: { kind: 'round-reward', receiptId: reward.receipt.id },
      economy: { ...reward.state.economy, pendingReward: reward.receipt },
    });
  } else if (lost) {
    next = withCheckpoint({
      ...base,
      ...resolvedBase,
      phase: { kind: 'run-lost' },
      result: {
        kind: 'lost',
        ante: resolvedBase.progress.ante,
        score,
        reason: zones.deckExhausted
          ? '抽牌堆耗尽且未达到盲注目标'
          : '出牌次数耗尽且未达到盲注目标',
      },
    });
  } else {
    next = withCheckpoint(resolvedBase);
  }
  const domainEvents: DomainEventV2[] = [
    { type: 'hand-scored', score: breakdown.score, handName: breakdown.handName },
  ];
  const presentationEvents: PresentationEventV2[] = [
    { type: 'hand-reveal', name: breakdown.handName },
    { type: 'score-stamp', score: breakdown.score },
  ];
  if (won) {
    domainEvents.push({
      type: 'blind-won',
      blindId: state.round.blind.definitionId,
      score,
    });
    presentationEvents.push({ type: 'blind-cleared' });
  } else if (lost) {
    domainEvents.push({ type: 'run-lost', ante: state.progress.ante });
    presentationEvents.push({ type: 'run-failed' });
  }
  return accept(next, domainEvents, presentationEvents);
}

function discardSelected(
  state: RunStateV2,
  command: DiscardSelectedCommandV2,
): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'round' || !state.round) {
    return reject('illegal-phase', '当前不能弃牌');
  }
  if (state.round.discardsRemaining <= 0) {
    return reject('no-discards', '本回合已无弃牌次数');
  }
  if (state.round.selectedCardIds.length === 0) {
    return reject('empty-selection', '请先选择要弃掉的牌');
  }
  if (
    !(isRunStateV3(state) && hasActiveBlindRule(state, 'force-selected-card')) &&
    state.round.selectedCardIds.some((cardId) =>
      state.round?.forcedSelectedCardIds.includes(cardId),
    )
  ) {
    return reject('forced-card', '强制选中的牌不能弃掉');
  }
  const discardCost = discardCostForRun(state);
  if (!canAffordRunStateV3(state, discardCost)) {
    return reject('insufficient-funds', '戏票不足，无法支付弃牌费用');
  }
  const discarded = state.round.selectedCardIds;
  const discardedCards = state.deck.cards.filter(({ id }) => discarded.includes(id));
  const discardedHand = buildHandFactsV3(state, discardedCards, []);
  if (!discardedHand.ok) return reject(discardedHand.code, discardedHand.message);
  const eventContext = {
    eventFacts: {
      kind: 'discard' as const,
      discardedCardIds: discarded,
      firstDiscardOfRound: state.round.discardsUsed === 0,
      forced: false,
      discardedHandType: discardedHand.facts.displayedHand,
    },
    eventCardIdentities: Object.fromEntries(
      discardedCards.map((card) => [card.id, projectEffectivePlayingCardV3(state, card)]),
    ),
  };
  const remainingHandIds = state.round.handIds.filter(
    (cardId) => !discarded.includes(cardId),
  );
  const discardedState: RunStateV2 = {
    ...state,
    economy: {
      ...state.economy,
      money: state.economy.money - discardCost,
    },
    round: {
      ...state.round,
      handIds: remainingHandIds,
      discardsRemaining: state.round.discardsRemaining - 1,
      discardPileIds: [...state.round.discardPileIds, ...discarded],
      selectedCardIds: state.round.forcedSelectedCardIds.filter((cardId) =>
        remainingHandIds.includes(cardId),
      ),
      forcedSelectedCardIds: state.round.forcedSelectedCardIds.filter((cardId) =>
        remainingHandIds.includes(cardId),
      ),
      faceDownCardIds: state.round.faceDownCardIds.filter((cardId) =>
        remainingHandIds.includes(cardId),
      ),
      discardsUsed: state.round.discardsUsed + 1,
    },
  };
  const modifierDiscarded = applyDiscardModifierLifecycleV3(discardedState, discarded);
  const discardedEffects = applyRunWindowEffectsV2(modifierDiscarded, 'discard', {
    eventContext,
  });
  if (!discardedEffects.ok) {
    return reject(discardedEffects.code, discardedEffects.message);
  }
  const zones = drawReplacementCards(discardedEffects.state, discarded);
  const replenished: RunStateV2 = {
    ...discardedEffects.state,
    round: {
      ...discardedEffects.state.round!,
      drawPileIds: zones.drawPileIds,
      handIds: zones.handIds,
    },
  };
  const setupDrawn = applySetupDrawRulesV3(
    replenished,
    zones.drawnCardIds,
    `discard:${state.runId}:${state.checkpointId + 1}:${state.round.discardsUsed + 1}`,
  );
  const next = withCheckpoint(setupDrawn);
  return accept(
    next,
    [{ type: 'cards-discarded', cardIds: discarded }],
    [
      { type: 'cards-swept', cardIds: discarded },
      ...(discardCost > 0
        ? ([{ type: 'coin-spent', amount: discardCost }] as const)
        : []),
    ],
  );
}

function claimRoundReward(
  state: RunStateV2,
  command: ClaimRoundRewardCommandV2,
): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'round-reward' || !state.round) {
    return reject('illegal-phase', '当前没有可领取的回合奖励');
  }
  const receipt = state.economy.pendingReward;
  if (!receipt || receipt.id !== state.phase.receiptId || receipt.claimed) {
    return reject('choice-mismatch', '奖励收据已失效');
  }
  const campaignWin =
    state.progress.ante === 8 &&
    state.progress.blindPosition === 'boss' &&
    !state.progress.campaignWon;
  const rewardedState: RunStateV2 = {
    ...state,
    economy: {
      ...state.economy,
      money: state.economy.money + receipt.total,
      pendingReward: null,
      claimedRewardIds: [...state.economy.claimedRewardIds, receipt.id],
    },
    history: {
      ...state.history,
      effectObservations: [
        ...state.history.effectObservations,
        {
          window: 'round-end',
          key: 'unused-discards-bank',
          value: state.round.discardsRemaining,
          sourceInstanceId: `round:${state.round.blind.definitionId}`,
          effectId: 'bxqp:history:unused-discards-bank',
          checkpointId: state.checkpointId + 1,
        },
      ],
    },
  };
  const setupSettled = applyBossCompletionSetupRulesV3(rewardedState);
  const shopResolution = campaignWin ? null : createShopV2(setupSettled);
  if (shopResolution && !shopResolution.ok) {
    return reject(shopResolution.code, shopResolution.message);
  }
  const createdShop = shopResolution?.ok ? shopResolution : null;
  let proposed: RunStateV2 = {
    ...setupSettled,
    rngState: createdShop?.rngState ?? setupSettled.rngState,
    phase: campaignWin ? { kind: 'run-won' } : { kind: 'shop' },
    inventory: createdShop
      ? { ...setupSettled.inventory, tags: createdShop.tags }
      : setupSettled.inventory,
    round: campaignWin ? setupSettled.round : null,
    shop: createdShop?.shop ?? null,
    progress: campaignWin
      ? { ...setupSettled.progress, campaignWon: true }
      : {
          ...setupSettled.progress,
          anteVoucherId:
            createdShop?.anteVoucherId ?? setupSettled.progress.anteVoucherId,
        },
    history: {
      ...setupSettled.history,
      completedBlindIds: [
        ...setupSettled.history.completedBlindIds,
        state.round.blind.definitionId,
      ],
      claimedRewardIds: [...setupSettled.history.claimedRewardIds, receipt.id],
    },
    result: campaignWin
      ? {
          kind: 'won',
          ante: state.progress.ante,
          score: state.round.score,
          reason: '击败第八幕压轴班主',
        }
      : state.result,
  };
  if (createdShop) {
    const shopEntered = applyRunWindowEffectsV2(proposed, 'shop-entered', {
      includeDeferredTags: false,
    });
    if (!shopEntered.ok) return reject(shopEntered.code, shopEntered.message);
    proposed = shopEntered.state.shop
      ? {
          ...shopEntered.state,
          shop: repriceShopV2(shopEntered.state.shop, shopEntered.state),
        }
      : shopEntered.state;
  }
  const next = withCheckpoint(proposed);
  const domainEvents: DomainEventV2[] = [
    { type: 'reward-claimed', amount: receipt.total },
  ];
  const presentationEvents: PresentationEventV2[] = [
    { type: 'reward-receipt', amount: receipt.total },
    { type: 'coin-received', amount: receipt.total },
  ];
  if (campaignWin) {
    domainEvents.push({ type: 'run-won', ante: state.progress.ante });
    presentationEvents.push({ type: 'curtain-call' });
  }
  return accept(next, domainEvents, presentationEvents);
}

type AcquisitionResult =
  | { readonly ok: true; readonly state: RunStateV2 }
  | {
      readonly ok: false;
      readonly code: 'inventory-full' | 'pool-empty';
      readonly message: string;
    };

function acquireItem(
  state: RunStateV2,
  item: MaterializedItem,
  identity: string,
  temporaryCapacity: {
    readonly jokerSlots: number;
    readonly consumableSlots: number;
  } = { jokerSlots: 0, consumableSlots: 0 },
): AcquisitionResult {
  if (item.kind === 'joker') {
    const ownedSlotContribution = Math.max(
      0,
      item.slotContribution - temporaryCapacity.jokerSlots,
    );
    if (
      (isRunStateV6(state) && state.jokerRuntimeV6.jokerCapacityDebt > 0) ||
      usedJokerSlotsForRun(state) + ownedSlotContribution > state.rules.jokerSlots
    ) {
      return { ok: false, code: 'inventory-full', message: '奇牌栏位已满' };
    }
    const instanceId = stableId<'joker-instance'>(`joker:${identity}`);
    const owned: OwnedJokerV2 = {
      instanceId,
      contentId: item.contentId,
      name: item.name,
      description: item.description,
      baseCost: item.baseCost,
      editionCost: item.editionCost,
      editionId: item.editionId,
      effects: item.effects,
      slotContribution: ownedSlotContribution,
      sellValueOverride: null,
      debuffed: false,
      copyPolicy: item.copyPolicy ?? 'none',
      copyTarget: item.copyTarget ?? 'none',
    };
    const acquired: RunStateV2 = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: [...state.inventory.jokers, owned],
      },
    };
    const stickered = materializeJokerStickersV3(acquired, instanceId, identity);
    const discovered = recordFirstAcquisitionDiscoveryV3(
      stickered,
      item.contentId,
      instanceId,
      state.checkpointId + 1,
    );
    const targeted = initializeAcquiredJokerTargetsV5(
      discovered,
      instanceId,
      item.effects,
    );
    if (!targeted.ok) {
      return { ok: false, code: 'pool-empty', message: targeted.message };
    }
    return {
      ok: true,
      state: targeted.state,
    };
  }
  if (item.kind === 'consumable') {
    if (
      usedConsumableSlotsForRun(state) >=
      state.rules.consumableSlots + temporaryCapacity.consumableSlots
    ) {
      return { ok: false, code: 'inventory-full', message: '消耗牌栏位已满' };
    }
    const owned: OwnedConsumableV2 = {
      instanceId: stableId<'consumable-instance'>(`consumable:${identity}`),
      contentId: item.contentId,
      name: item.name,
      description: item.description,
      baseCost: item.baseCost,
      editionCost: item.editionCost,
      editionId: item.editionId,
      effects: item.effects,
      targetKind: item.targetKind,
      minimumTargets: item.minimumTargets,
      maximumTargets: item.maximumTargets,
      sellValueOverride: null,
    };
    return {
      ok: true,
      state: {
        ...state,
        inventory: {
          ...state.inventory,
          consumables: [...state.inventory.consumables, owned],
        },
      },
    };
  }
  if (!item.generatedCard) {
    return { ok: false, code: 'pool-empty', message: '生成的戏牌资料缺失' };
  }
  if (state.deck.cards.some((card) => card.id === item.generatedCard?.id)) {
    return { ok: false, code: 'pool-empty', message: '生成的戏牌实例重复' };
  }
  return {
    ok: true,
    state: {
      ...state,
      deck: { cards: [...state.deck.cards, item.generatedCard] },
    },
  };
}

type ImmediateItemEffectResult =
  | { readonly ok: true; readonly state: RunStateV2 }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode | StateOperationFailureCodeV3;
      readonly message: string;
    };

function applyImmediateItemEffects(
  state: RunStateV2,
  item: Pick<MaterializedItem, 'effects'>,
): ImmediateItemEffectResult {
  let next = state;
  const effects = [...item.effects].sort(
    (left, right) => left.priority - right.priority || left.id.localeCompare(right.id),
  );
  for (const effect of effects) {
    const resolved = resolveEffectOperations(effect, 'item-acquired', next);
    if (!resolved.ok) return resolved;
    for (const operation of resolved.operations) {
      if (
        operation.type === 'spend-money' &&
        !canAffordRunStateV3(next, operation.amount)
      ) {
        return {
          ok: false,
          code: 'insufficient-funds',
          message: '戏票不足，无法结算这张消耗牌',
        };
      }
      if (operation.type === 'add-money') {
        next = {
          ...next,
          economy: { ...next.economy, money: next.economy.money + operation.amount },
        };
      }
      if (operation.type === 'spend-money') {
        next = {
          ...next,
          economy: { ...next.economy, money: next.economy.money - operation.amount },
        };
      }
      if (operation.type === 'set-money') {
        if (operation.value < -next.rules.allowedDebt) {
          return {
            ok: false,
            code: 'insufficient-funds',
            message: '效果会超出当前欠票额度',
          };
        }
        next = { ...next, economy: { ...next.economy, money: operation.value } };
      }
      if (operation.type === 'level-hand') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            handLevels: {
              ...next.rules.handLevels,
              [operation.handType]: Math.max(
                1,
                next.rules.handLevels[operation.handType] + operation.amount,
              ),
            },
          },
        };
      }
      if (operation.type === 'add-joker-slots') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            jokerSlots: Math.max(0, next.rules.jokerSlots + operation.amount),
          },
        };
      }
      if (operation.type === 'add-consumable-slots') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            consumableSlots: Math.max(0, next.rules.consumableSlots + operation.amount),
          },
        };
      }
      if (operation.type === 'set-discount') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            priceDiscountBasisPoints: operation.basisPoints,
          },
        };
      }
      if (operation.type === 'set-interest-cap') {
        next = {
          ...next,
          rules: { ...next.rules, interestCap: operation.value },
        };
      }
      if (operation.type === 'set-reroll-cost') {
        next = {
          ...next,
          rules: { ...next.rules, baseRerollCost: operation.value },
        };
      }
      if (operation.type === 'record-observation') {
        if (operation.key === 'baseline:copy-last-tarot-or-planet-excluding-self') {
          const previous = [...next.history.effectObservations]
            .reverse()
            .flatMap((observation) => {
              if (
                observation.key !== 'consumable-used' ||
                typeof observation.value !== 'string'
              ) {
                return [];
              }
              const definition = next.content.items.find(
                (candidate) =>
                  candidate.contentId === observation.value &&
                  candidate.kind === 'consumable' &&
                  (candidate.family === 'tarot' || candidate.family === 'planet') &&
                  !candidate.effects.some(
                    (effect) =>
                      effect.parameters.key ===
                      'copy-last-tarot-or-planet-excluding-self',
                  ),
              );
              return definition ? [definition] : [];
            })[0];
          if (!previous) {
            return {
              ok: false,
              code: 'pool-empty',
              message: '尚无可抄写的已用戏法牌或星象牌',
            };
          }
          const copied = acquireContentByIdV3(
            next,
            previous.contentId,
            `last-use-copy:${next.runId}:${next.checkpointId + 1}:${effect.id}`,
          );
          if (!copied.ok) return copied;
          next = copied.state;
        }
        if (operation.key === 'baseline:cumulative-hand-size-cost-one-plus-prior-use') {
          const priorUses = next.history.effectObservations.filter(
            (observation) => observation.key === operation.key,
          ).length;
          next = {
            ...next,
            rules: {
              ...next.rules,
              handSize: Math.max(1, next.rules.handSize - (priorUses + 1)),
            },
          };
        }
        next = {
          ...next,
          history: {
            ...next.history,
            effectObservations: [
              ...next.history.effectObservations,
              {
                window: 'item-acquired',
                key: operation.key,
                value: operation.value,
                sourceInstanceId: `item:${effect.id}`,
                effectId: effect.id,
                checkpointId: next.checkpointId + 1,
              },
            ],
          },
        };
      }
      const beforeCatalogOperation = next;
      const catalogApplied = applyStateOperationV3(next, operation, {
        window: 'item-acquired',
        sourceInstanceId: `item:${effect.id}`,
        effectId: effect.id,
      });
      if (!catalogApplied.ok) return catalogApplied;
      if (catalogApplied.handled) {
        next = catalogApplied.state;
        const remainingCardIds = new Set(next.deck.cards.map(({ id }) => id));
        const removedCardIds = beforeCatalogOperation.deck.cards
          .filter(({ id }) => !remainingCardIds.has(id))
          .map(({ id }) => id);
        if (removedCardIds.length > 0) {
          const destruction = preparePlayingCardDestructionV6(
            beforeCatalogOperation,
            removedCardIds,
            `consumable:${effect.id}`,
          );
          if (!destruction.ok) return destruction;
          next = removePlayingCardReferencesV6(next, new Set(removedCardIds));
          const emitted = applyRunWindowEffectsV2(next, 'playing-card-destroyed', {
            eventContext: destruction.eventContext,
          });
          if (!emitted.ok) return emitted;
          next = emitted.state;
        }
      }
    }
  }
  return { ok: true, state: next };
}

function rerollShop(state: RunStateV2, command: RerollShopCommandV2): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在夜市');
  }
  const cost = state.shop.freeRerollAvailable ? 0 : state.shop.rerollCost;
  if (!canAffordRunStateV3(state, cost)) {
    return reject('insufficient-funds', '戏票不足，无法换摊');
  }
  const rerolled = rerollShopCardsV2(state);
  const rerolledState: RunStateV2 = {
    ...state,
    rngState: rerolled.rngState,
    economy: { ...state.economy, money: state.economy.money - cost },
    shop: {
      ...state.shop,
      cardOffers: rerolled.offers,
      rerollCount: state.shop.rerollCount + 1,
      rerollCost: state.rules.baseRerollCost + state.shop.rerollCount + 1,
      freeRerollAvailable: false,
    },
  };
  const rerollEffects = applyRunWindowEffectsV2(rerolledState, 'shop-rerolled');
  if (!rerollEffects.ok) return reject(rerollEffects.code, rerollEffects.message);
  const repriced = rerollEffects.state.shop
    ? {
        ...rerollEffects.state,
        shop: repriceShopV2(rerollEffects.state.shop, rerollEffects.state),
      }
    : rerollEffects.state;
  const next = withCheckpoint(repriced);
  return accept(
    next,
    [{ type: 'shop-rerolled', cost }],
    cost > 0 ? [{ type: 'coin-spent', amount: cost }] : [],
  );
}

function buyShopOffer(
  state: RunStateV2,
  command: BuyShopOfferCommandV2,
): CommandResultV2 {
  if (state.phase.kind !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在夜市');
  }
  const offer = state.shop.cardOffers.find(
    (candidate) => candidate.id === command.offerId,
  );
  if (!offer) return reject('offer-not-found', '商品已不存在');
  if (!canAffordRunStateV3(state, offer.price)) {
    return reject('insufficient-funds', '戏票不足，无法购买');
  }
  const acquired = acquireItem(state, offer.item, offer.id);
  if (!acquired.ok) return reject(acquired.code, acquired.message);
  const purchasedState = recordPurchaseForRun({
    ...acquired.state,
    economy: { ...state.economy, money: state.economy.money - offer.price },
    shop: {
      ...state.shop,
      cardOffers: state.shop.cardOffers.filter((candidate) => candidate.id !== offer.id),
      purchasedOfferIds: [...state.shop.purchasedOfferIds, offer.id],
    },
  });
  const acquisitionEffects = applyRunWindowEffectsV2(purchasedState, 'item-acquired', {
    includeVouchers: false,
  });
  if (!acquisitionEffects.ok) {
    return reject(acquisitionEffects.code, acquisitionEffects.message);
  }
  const repriced = acquisitionEffects.state.shop
    ? {
        ...acquisitionEffects.state,
        shop: repriceShopV2(acquisitionEffects.state.shop, acquisitionEffects.state),
      }
    : acquisitionEffects.state;
  const next = withCheckpoint(repriced);
  return accept(
    next,
    [{ type: 'item-purchased', contentId: offer.item.contentId }],
    [
      { type: 'coin-spent', amount: offer.price },
      { type: 'item-arrived', contentId: offer.item.contentId },
    ],
  );
}

function buyPack(state: RunStateV2, command: BuyPackCommandV2): CommandResultV2 {
  if (state.phase.kind !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在夜市');
  }
  const offer = state.shop.packOffers.find(
    (candidate) => candidate.id === command.offerId,
  );
  if (!offer) return reject('offer-not-found', '卡包已不存在');
  if (!canAffordRunStateV3(state, offer.price)) {
    return reject('insufficient-funds', '戏票不足，无法购买卡包');
  }
  const definition = state.content.packs.find((pack) => pack.id === offer.packId);
  if (!definition) return reject('pool-empty', '卡包定义缺失');
  const materialized = materializePackOptionsV2(
    state,
    definition,
    offer.id,
    state.rngState,
  );
  if (materialized.items.length === 0) return reject('pool-empty', '卡包候选池为空');
  const choice: PackChoiceFrame = {
    id: stableId<'choice'>(`choice:pack:${offer.id}`),
    kind: 'pack',
    optional: true,
    returnPhase: 'shop',
    packId: definition.id,
    packOfferId: offer.id,
    options: materialized.items.map((item, index) => ({
      id: `${offer.id}:option:${index}`,
      item,
      consumed: false,
    })),
    remainingPicks: Math.min(definition.pickCount, materialized.items.length),
    temporaryJokerSlots: definition.temporaryJokerSlots,
    temporaryConsumableSlots: definition.temporaryConsumableSlots,
  };
  const openedState = recordPurchaseForRun({
    ...state,
    rngState: materialized.rngState,
    phase: { kind: 'choice', choiceId: choice.id },
    economy: { ...state.economy, money: state.economy.money - offer.price },
    shop: {
      ...state.shop,
      packOffers: state.shop.packOffers.filter((candidate) => candidate.id !== offer.id),
      purchasedOfferIds: [...state.shop.purchasedOfferIds, offer.id],
    },
    pendingChoice: { current: choice, suspended: [] },
  });
  const packEffects = applyRunWindowEffectsV2(openedState, 'pack-opened', {
    additionalSources: [
      {
        instanceId: `pack:${definition.id}:${offer.id}`,
        position: 500,
        effects: definition.effects,
      },
    ],
    eventContext: {
      eventFacts: { kind: 'pack', packId: definition.id, action: 'opened' },
      eventCardIdentities: {},
    },
  });
  if (!packEffects.ok) return reject(packEffects.code, packEffects.message);
  const next = withCheckpoint(packEffects.state);
  return accept(
    next,
    [
      { type: 'pack-opened', packId: definition.id },
      { type: 'choice-opened', choiceId: choice.id },
    ],
    offer.price > 0 ? [{ type: 'coin-spent', amount: offer.price }] : [],
  );
}

function applyVoucherRules(
  state: RunStateV2,
  voucher: BlindDefinition | RunStateV2['content']['vouchers'][number],
):
  | { readonly ok: true; readonly state: RunStateV2 }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode | StateOperationFailureCodeV3;
      readonly message: string;
    } {
  let next = state;
  for (const effect of voucher.effects) {
    const resolved = resolveEffectOperations(effect, 'item-acquired', next);
    if (!resolved.ok) return resolved;
    for (const operation of resolved.operations) {
      if (operation.type === 'add-joker-slots') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            jokerSlots: next.rules.jokerSlots + operation.amount,
          },
        };
      }
      if (operation.type === 'add-consumable-slots') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            consumableSlots: next.rules.consumableSlots + operation.amount,
          },
        };
      }
      if (operation.type === 'set-discount') {
        next = {
          ...next,
          rules: {
            ...next.rules,
            priceDiscountBasisPoints: operation.basisPoints,
          },
        };
      }
      if (operation.type === 'set-interest-cap') {
        next = {
          ...next,
          rules: { ...next.rules, interestCap: operation.value },
        };
      }
      if (operation.type === 'set-reroll-cost') {
        next = {
          ...next,
          rules: { ...next.rules, baseRerollCost: operation.value },
        };
      }
      if (
        operation.type === 'record-observation' &&
        operation.key === 'baseline:move-back-one-ante'
      ) {
        const ante = Math.max(0, next.progress.ante - 1);
        next = {
          ...next,
          progress: { ...next.progress, ante },
          shop: next.shop ? { ...next.shop, ante } : null,
        };
      }
      const catalogApplied = applyStateOperationV3(next, operation, {
        window: 'item-acquired',
        sourceInstanceId: `voucher:${voucher.id}`,
        effectId: effect.id,
      });
      if (!catalogApplied.ok) return catalogApplied;
      if (catalogApplied.handled) next = catalogApplied.state;
    }
  }
  return { ok: true, state: next };
}

function buyVoucher(state: RunStateV2, command: BuyVoucherCommandV2): CommandResultV2 {
  if (state.phase.kind !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前没有可兑换木牌');
  }
  const primaryOffer = state.shop.voucherOffer;
  const offer = [
    ...(primaryOffer ? [primaryOffer] : []),
    ...(state.shop.extraVoucherOffers ?? []),
  ].find(({ id }) => id === command.offerId);
  if (!offer) return reject('offer-not-found', '木牌已不存在');
  const isPrimaryOffer = offer.id === primaryOffer?.id;
  if (!canAffordRunStateV3(state, offer.price)) {
    return reject('insufficient-funds', '戏票不足，无法兑换木牌');
  }
  const voucher = state.content.vouchers.find(
    (definition) => definition.id === offer.voucherId,
  );
  if (
    !voucher ||
    state.inventory.voucherIds.includes(voucher.id) ||
    (voucher.prerequisiteId !== null &&
      !state.inventory.voucherIds.includes(voucher.prerequisiteId))
  ) {
    return reject('offer-not-found', '木牌定义已失效');
  }
  const rulesResult = applyVoucherRules(state, voucher);
  if (!rulesResult.ok) return reject(rulesResult.code, rulesResult.message);
  const purchased = recordPurchaseForRun({
    ...rulesResult.state,
    economy: {
      ...rulesResult.state.economy,
      money: rulesResult.state.economy.money - offer.price,
    },
    inventory: {
      ...rulesResult.state.inventory,
      voucherIds: [...rulesResult.state.inventory.voucherIds, voucher.id],
    },
    progress: {
      ...rulesResult.state.progress,
      anteVoucherId: isPrimaryOffer ? null : rulesResult.state.progress.anteVoucherId,
    },
    shop: {
      ...(rulesResult.state.shop ?? state.shop),
      voucherOffer: isPrimaryOffer ? null : primaryOffer,
      extraVoucherOffers: (state.shop.extraVoucherOffers ?? []).filter(
        ({ id }) => id !== offer.id,
      ),
      rerollCost: rulesResult.state.rules.baseRerollCost + state.shop.rerollCount,
      purchasedOfferIds: [...state.shop.purchasedOfferIds, offer.id],
    },
  });
  const filled = fillShopCardOffersV2(purchased);
  const filledState: RunStateV2 = {
    ...purchased,
    rngState: filled.rngState,
    shop: purchased.shop
      ? {
          ...purchased.shop,
          cardOffers: [...purchased.shop.cardOffers, ...filled.offers],
        }
      : null,
  };
  const next = withCheckpoint({
    ...filledState,
    shop: filledState.shop ? repriceShopV2(filledState.shop, filledState) : null,
  });
  return accept(
    next,
    [{ type: 'voucher-redeemed', voucherId: voucher.id }],
    [
      { type: 'coin-spent', amount: offer.price },
      { type: 'item-arrived', contentId: voucher.id },
    ],
  );
}

function sellJoker(state: RunStateV2, command: SellJokerCommandV2): CommandResultV2 {
  const owned = state.inventory.jokers.find(
    (joker) => joker.instanceId === command.jokerInstanceId,
  );
  if (!owned) return reject('item-not-owned', '未持有这张奇牌');
  const sellToEnable =
    state.phase.kind === 'round' &&
    isRunStateV3(state) &&
    hasActiveBlindRule(state, 'debuff-until-joker-sold');
  const hasRoundSaleTrigger =
    state.phase.kind === 'round' &&
    owned.effects.some((effect) => effect.windows.includes('item-sold'));
  if (
    (state.phase.kind !== 'shop' || !state.shop) &&
    !sellToEnable &&
    !hasRoundSaleTrigger
  ) {
    return reject('illegal-phase', '只能在夜市出售奇牌');
  }
  if (!canSellJokerForRun(state, owned.instanceId)) {
    return reject('item-not-owned', '永久贴签使这张奇牌不能出售');
  }
  const value = saleValue(
    owned.baseCost,
    owned.editionCost,
    state.rules.priceDiscountBasisPoints,
    owned.sellValueOverride,
  );
  const saleEffects = applyRunWindowEffectsV2(state, 'item-sold', {
    eventContext: {
      eventFacts: {
        kind: 'item-sale',
        family: 'joker',
        instanceId: owned.instanceId,
      },
      eventCardIdentities: {},
    },
  });
  if (!saleEffects.ok) return reject(saleEffects.code, saleEffects.message);
  let soldState: RunStateV2 = {
    ...saleEffects.state,
    economy: {
      ...saleEffects.state.economy,
      money: saleEffects.state.economy.money + value,
    },
    inventory: {
      ...saleEffects.state.inventory,
      jokers: saleEffects.state.inventory.jokers.filter(
        (joker) => joker.instanceId !== owned.instanceId,
      ),
    },
    ...(isRunStateV3(saleEffects.state)
      ? {
          modifiersV3: {
            ...saleEffects.state.modifiersV3,
            jokers: saleEffects.state.modifiersV3.jokers.filter(
              ({ instanceId }) => instanceId !== owned.instanceId,
            ),
          },
        }
      : {}),
  };
  if (isRunStateV6(soldState)) {
    const hasRuntimeAction = (action: string) =>
      soldState.inventory.jokers.some((joker) =>
        joker.effects.some((effect) => effect.parameters.action === action),
      );
    const normalizedSale: RunStateV6 = {
      ...soldState,
      jokerRuntimeV6: {
        ...soldState.jokerRuntimeV6,
        jokerCapacityDebt: Math.max(
          0,
          usedJokerSlotsForRun(soldState) - soldState.rules.jokerSlots,
        ),
        castleTargetSuit: hasRuntimeAction('set-castle-target')
          ? soldState.jokerRuntimeV6.castleTargetSuit
          : null,
        idolTargetRank: hasRuntimeAction('set-idol-target')
          ? soldState.jokerRuntimeV6.idolTargetRank
          : null,
        idolTargetSuit: hasRuntimeAction('set-idol-target')
          ? soldState.jokerRuntimeV6.idolTargetSuit
          : null,
      },
    };
    soldState = normalizedSale;
  }
  if (sellToEnable && isRunStateV3(soldState)) {
    const enabled: RunStateV3 = {
      ...soldState,
      modifiersV3: {
        ...soldState.modifiersV3,
        playingCards: soldState.modifiersV3.playingCards.map((modifier) => ({
          ...modifier,
          debuffed: false,
        })),
      },
    };
    soldState = enabled;
  }
  return accept(
    withCheckpoint(soldState),
    [{ type: 'item-sold', contentId: owned.contentId }],
    [{ type: 'coin-received', amount: value }],
  );
}

function sellConsumable(
  state: RunStateV2,
  command: SellConsumableCommandV2,
): CommandResultV2 {
  if (state.phase.kind !== 'shop' || !state.shop) {
    return reject('illegal-phase', '只能在夜市出售消耗牌');
  }
  const owned = state.inventory.consumables.find(
    (item) => item.instanceId === command.consumableInstanceId,
  );
  if (!owned) return reject('item-not-owned', '未持有这张消耗牌');
  const value = saleValue(
    owned.baseCost,
    owned.editionCost,
    state.rules.priceDiscountBasisPoints,
    owned.sellValueOverride,
  );
  const saleEffects = applyRunWindowEffectsV2(state, 'item-sold', {
    eventContext: {
      eventFacts: {
        kind: 'item-sale',
        family: 'consumable',
        instanceId: owned.instanceId,
      },
      eventCardIdentities: {},
    },
  });
  if (!saleEffects.ok) return reject(saleEffects.code, saleEffects.message);
  return accept(
    withCheckpoint({
      ...saleEffects.state,
      economy: {
        ...saleEffects.state.economy,
        money: saleEffects.state.economy.money + value,
      },
      inventory: {
        ...saleEffects.state.inventory,
        consumables: saleEffects.state.inventory.consumables.filter(
          (item) => item.instanceId !== owned.instanceId,
        ),
      },
    }),
    [{ type: 'item-sold', contentId: owned.contentId }],
    [{ type: 'coin-received', amount: value }],
  );
}

function reorderJoker(
  state: RunStateV2,
  command: ReorderJokerCommandV2,
): CommandResultV2 {
  if (state.phase.kind !== 'shop' && state.phase.kind !== 'round') {
    return reject('illegal-phase', '当前不能调整奇牌顺序');
  }
  const index = state.inventory.jokers.findIndex(
    (joker) => joker.instanceId === command.jokerInstanceId,
  );
  if (index < 0) return reject('item-not-owned', '未持有这张奇牌');
  if (
    !Number.isSafeInteger(command.toIndex) ||
    command.toIndex < 0 ||
    command.toIndex >= state.inventory.jokers.length
  ) {
    return reject('invalid-order', '目标位置无效');
  }
  if (
    isRunStateV3(state) &&
    state.rulesV3.excludedRuleKeys.includes('immovable') &&
    (index === 0 || command.toIndex === 0)
  ) {
    return reject('invalid-order', '最左侧奇牌已被开局誓约固定');
  }
  const jokers = [...state.inventory.jokers];
  const [moved] = jokers.splice(index, 1);
  jokers.splice(command.toIndex, 0, moved!);
  return accept(
    withCheckpoint({
      ...state,
      inventory: { ...state.inventory, jokers },
    }),
  );
}

function advanceAfterShop(state: RunStateV2): RunStateV2 {
  if (!state.shop) throw new Error('缺少商店状态');
  if (state.shop.afterBlind !== 'boss') {
    return {
      ...state,
      phase: { kind: 'blind-select' },
      progress: {
        ...state.progress,
        blindPosition: state.shop.afterBlind === 'small' ? 'big' : 'boss',
      },
      round: null,
      shop: null,
      lastHand: null,
    };
  }
  const nextAnte = state.progress.ante + 1;
  const ante = materializeAnte(
    state.content,
    nextAnte,
    state.rngState,
    state.progress.seenNormalBossIds,
    state.progress.seenFinisherBossIds,
  );
  return {
    ...state,
    rngState: ante.rngState,
    phase: { kind: 'blind-select' },
    progress: {
      ...state.progress,
      ante: nextAnte,
      blindPosition: 'small',
      lineup: ante.lineup,
      seenNormalBossIds: ante.seenNormalBossIds,
      seenFinisherBossIds: ante.seenFinisherBossIds,
      bossRerollCount: 0,
      anteVoucherId: null,
    },
    round: null,
    shop: null,
    history: { ...state.history, playedCardIdsThisAnte: [] },
    lastHand: null,
  };
}

function leaveShop(state: RunStateV2, command: LeaveShopCommandV2): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'shop' || !state.shop) {
    return reject('illegal-phase', '当前不在夜市');
  }
  const shopLeft = applyRunWindowEffectsV2(state, 'shop-left', {
    eventContext: {
      eventFacts: {
        kind: 'shop-left',
        consumableInstanceIds: state.inventory.consumables.map(
          ({ instanceId }) => instanceId,
        ),
      },
      eventCardIdentities: {},
    },
  });
  if (!shopLeft.ok) return reject(shopLeft.code, shopLeft.message);
  let resolvedState = shopLeft.state;
  if (state.shop.afterBlind === 'boss') {
    const anteEnded = applyRunWindowEffectsV2(resolvedState, 'ante-ended');
    if (!anteEnded.ok) return reject(anteEnded.code, anteEnded.message);
    resolvedState = anteEnded.state;
  }
  const advanced = advanceAfterShop(resolvedState);
  return accept(withCheckpoint(advanced), [
    {
      type: 'shop-left',
      ante: advanced.progress.ante,
      position: advanced.progress.blindPosition,
    },
  ]);
}

function finishRun(state: RunStateV2, command: FinishRunCommandV2): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'run-won') {
    return reject('illegal-phase', '当前不能结束牌局');
  }
  const next = withCheckpoint({
    ...state,
    phase: { kind: 'finished' },
    result: {
      kind: 'finished',
      ante: state.progress.ante,
      score: state.round?.score ?? 0,
      reason: '完成八幕演出并选择谢幕',
    },
  });
  return accept(next, [{ type: 'run-finished', ante: state.progress.ante }]);
}

function enterEndless(
  state: RunStateV2,
  command: EnterEndlessCommandV2,
): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'run-won') {
    return reject('illegal-phase', '当前不能进入无尽模式');
  }
  const ante = materializeAnte(
    state.content,
    9,
    state.rngState,
    state.progress.seenNormalBossIds,
    state.progress.seenFinisherBossIds,
  );
  const next = withCheckpoint({
    ...state,
    rngState: ante.rngState,
    phase: { kind: 'blind-select' },
    progress: {
      ...state.progress,
      ante: 9,
      blindPosition: 'small',
      endless: true,
      lineup: ante.lineup,
      seenNormalBossIds: ante.seenNormalBossIds,
      seenFinisherBossIds: ante.seenFinisherBossIds,
      bossRerollCount: 0,
      anteVoucherId: null,
    },
    round: null,
    shop: null,
    lastHand: null,
    result: null,
  });
  return accept(next, [{ type: 'endless-entered', ante: 9 }]);
}

function requestBossReroll(
  state: RunStateV2,
  command: RequestBossRerollCommandV2,
): CommandResultV2 {
  void command;
  if (state.phase.kind !== 'blind-select' || state.progress.blindPosition !== 'boss') {
    return reject('illegal-phase', '只有班主登台前可以更换班主');
  }
  const cost = selectBossRerollCostV2(state);
  const rerollLimit = isRunStateV3(state) ? state.rulesV3.bossRerollLimitPerAnte : 1;
  if (
    cost === null ||
    (rerollLimit !== null && state.progress.bossRerollCount >= rerollLimit)
  ) {
    return reject('boss-reroll-unavailable', '本幕没有可用的换班机会');
  }
  if (state.economy.money + state.rules.allowedDebt < cost) {
    return reject('insufficient-funds', '戏票不足，无法更换班主');
  }
  const seen =
    state.progress.ante % 8 === 0
      ? state.progress.seenFinisherBossIds
      : state.progress.seenNormalBossIds;
  const candidates = eligibleBosses(state.content, state.progress.ante, seen).filter(
    (blind) => blind.id !== state.progress.lineup.boss.definitionId,
  );
  if (candidates.length === 0) return reject('pool-empty', '没有其他可用班主');
  const choice: BossRerollChoiceFrame = {
    id: stableId<'choice'>(`choice:boss-reroll:${state.runId}:${state.checkpointId + 1}`),
    kind: 'boss-reroll',
    optional: true,
    returnPhase: 'blind-select',
    cost,
    eligibleBlindIds: candidates.map((blind) => blind.id),
  };
  return accept(
    withCheckpoint({
      ...state,
      phase: { kind: 'choice', choiceId: choice.id },
      pendingChoice: { current: choice, suspended: [] },
    }),
    [{ type: 'choice-opened', choiceId: choice.id }],
  );
}

function targetEligibleIds(
  state: RunStateV2,
  targetKind: TargetChoiceFrame['targetKind'],
): readonly string[] {
  if (targetKind === 'playing-card') {
    return state.phase.kind === 'round' && state.round
      ? state.round.handIds
      : state.deck.cards.map((card) => card.id);
  }
  if (targetKind === 'joker') {
    return state.inventory.jokers.map((joker) => joker.instanceId);
  }
  return state.inventory.consumables.map((item) => item.instanceId);
}

function createTargetChoice(
  state: RunStateV2,
  sourceInstanceId: string,
  item: Pick<
    MaterializedItem,
    'targetKind' | 'minimumTargets' | 'maximumTargets' | 'effects'
  >,
  returnPhase: TargetChoiceFrame['returnPhase'],
): TargetChoiceFrame | null {
  if (item.targetKind === 'none') return null;
  const effect = item.effects[0];
  if (!effect) return null;
  return {
    id: stableId<'choice'>(
      `choice:targets:${state.runId}:${state.checkpointId + 1}:${sourceInstanceId}`,
    ),
    kind: 'targets',
    optional: true,
    returnPhase,
    sourceInstanceId,
    effectId: effect.id,
    targetKind: item.targetKind,
    eligibleIds: targetEligibleIds(state, item.targetKind),
    selectedIds: [],
    minimumTargets: item.minimumTargets,
    maximumTargets: item.maximumTargets,
  };
}

function beginConsumableChoice(
  state: RunStateV2,
  command: BeginConsumableChoiceCommandV2,
): CommandResultV2 {
  if (state.phase.kind !== 'round' && state.phase.kind !== 'shop') {
    return reject('illegal-phase', '当前不能使用消耗牌');
  }
  const consumable = state.inventory.consumables.find(
    (item) => item.instanceId === command.consumableInstanceId,
  );
  if (!consumable) return reject('item-not-owned', '未持有这张消耗牌');
  if (consumable.targetKind === 'none') {
    const consumingState: RunStateV2 = {
      ...state,
      inventory: {
        ...state.inventory,
        consumables: state.inventory.consumables.filter(
          (item) => item.instanceId !== consumable.instanceId,
        ),
      },
    };
    const applied = applyImmediateItemEffects(consumingState, consumable);
    if (!applied.ok) return reject(applied.code, applied.message);
    const used = applyConsumableUsedWindow(applied.state, consumable.contentId);
    if (!used.ok) return reject(used.code, used.message);
    return accept(withCheckpoint(used.state), [
      { type: 'item-consumed', contentId: consumable.contentId },
    ]);
  }
  const choice = createTargetChoice(
    state,
    consumable.instanceId,
    consumable,
    state.phase.kind,
  );
  if (!choice || choice.eligibleIds.length < choice.minimumTargets) {
    return reject('invalid-target', '当前没有足够的合法目标');
  }
  return accept(
    withCheckpoint({
      ...state,
      phase: { kind: 'choice', choiceId: choice.id },
      pendingChoice: { current: choice, suspended: [] },
    }),
    [{ type: 'choice-opened', choiceId: choice.id }],
  );
}

function choosePackOption(
  state: RunStateV2,
  command: ChoosePackOptionCommandV2,
): CommandResultV2 {
  if (
    state.phase.kind !== 'choice' ||
    !state.pendingChoice ||
    state.pendingChoice.current.id !== command.choiceId ||
    state.pendingChoice.current.kind !== 'pack'
  ) {
    return reject('choice-mismatch', '卡包选择已经改变');
  }
  const pack = state.pendingChoice.current;
  const option = pack.options.find((candidate) => candidate.id === command.optionId);
  if (!option || option.consumed) return reject('offer-not-found', '卡包选项已不可用');
  if (option.item.targetKind !== 'none') {
    const target = createTargetChoice(state, option.id, option.item, pack.returnPhase);
    if (!target || target.eligibleIds.length < target.minimumTargets) {
      return reject('invalid-target', '当前没有足够的合法目标');
    }
    return accept(
      withCheckpoint({
        ...state,
        phase: { kind: 'choice', choiceId: target.id },
        pendingChoice: {
          current: target,
          suspended: [...state.pendingChoice.suspended, pack],
        },
      }),
      [{ type: 'choice-opened', choiceId: target.id }],
    );
  }
  const acquired =
    option.item.kind === 'consumable'
      ? applyImmediateItemEffects(state, option.item)
      : acquireItem(state, option.item, option.id, {
          jokerSlots: pack.temporaryJokerSlots,
          consumableSlots: pack.temporaryConsumableSlots,
        });
  if (!acquired.ok) return reject(acquired.code, acquired.message);
  const updatedPack: PackChoiceFrame = {
    ...pack,
    options: pack.options.map((candidate) =>
      candidate.id === option.id ? { ...candidate, consumed: true } : candidate,
    ),
    remainingPicks: Math.max(0, pack.remainingPicks - 1),
    temporaryJokerSlots:
      option.item.kind === 'joker'
        ? Math.max(0, pack.temporaryJokerSlots - option.item.slotContribution)
        : pack.temporaryJokerSlots,
    temporaryConsumableSlots:
      option.item.kind === 'consumable'
        ? Math.max(0, pack.temporaryConsumableSlots - 1)
        : pack.temporaryConsumableSlots,
  };
  const finished =
    updatedPack.remainingPicks === 0 ||
    updatedPack.options.every((candidate) => candidate.consumed);
  const consumedWindow =
    option.item.kind === 'consumable'
      ? applyConsumableUsedWindow(acquired.state, option.item.contentId)
      : { ok: true as const, state: acquired.state };
  if (!consumedWindow.ok) {
    return reject(consumedWindow.code, consumedWindow.message);
  }
  const acquiredState = consumedWindow.state;
  const chosenState: RunStateV2 = {
    ...acquiredState,
    phase: finished
      ? { kind: pack.returnPhase }
      : { kind: 'choice', choiceId: updatedPack.id },
    pendingChoice: finished
      ? null
      : {
          current: updatedPack,
          suspended: state.pendingChoice.suspended,
        },
  };
  const acquisitionEffects =
    option.item.kind === 'consumable'
      ? { ok: true as const, state: chosenState }
      : applyRunWindowEffectsV2(chosenState, 'item-acquired', {
          includeVouchers: false,
          additionalSources:
            option.item.kind === 'playing-card'
              ? [
                  {
                    instanceId: option.id,
                    position: 500,
                    effects: option.item.effects,
                  },
                ]
              : [],
        });
  if (!acquisitionEffects.ok) {
    return reject(acquisitionEffects.code, acquisitionEffects.message);
  }
  return accept(
    withCheckpoint(acquisitionEffects.state),
    [{ type: 'item-purchased', contentId: option.item.contentId }],
    [{ type: 'item-arrived', contentId: option.item.contentId }],
  );
}

function toggleChoiceTarget(
  state: RunStateV2,
  command: ToggleChoiceTargetCommandV2,
): CommandResultV2 {
  if (
    state.phase.kind !== 'choice' ||
    !state.pendingChoice ||
    state.pendingChoice.current.id !== command.choiceId ||
    (state.pendingChoice.current.kind !== 'targets' &&
      state.pendingChoice.current.kind !== 'forced-card')
  ) {
    return reject('choice-mismatch', '目标选择已经改变');
  }
  const choice = state.pendingChoice.current;
  if (!choice.eligibleIds.includes(command.targetId as CardId)) {
    return reject('invalid-target', '这个目标不合法');
  }
  const selected = choice.selectedIds.includes(command.targetId as CardId);
  if (!selected && choice.selectedIds.length >= choice.maximumTargets) {
    return reject('selection-limit', `最多选择${choice.maximumTargets}个目标`);
  }
  const selectedIds = selected
    ? choice.selectedIds.filter((targetId) => targetId !== command.targetId)
    : [...choice.selectedIds, command.targetId as CardId];
  const updated = { ...choice, selectedIds } as ChoiceFrame;
  return accept(
    withCheckpoint({
      ...state,
      pendingChoice: {
        current: updated,
        suspended: state.pendingChoice.suspended,
      },
    }),
  );
}

function findChoiceEffects(
  state: RunStateV2,
  choice: TargetChoiceFrame,
): {
  readonly effects: MaterializedItem['effects'];
  readonly fromInventory: boolean;
  readonly contentId: string;
} | null {
  const owned = state.inventory.consumables.find(
    (item) => item.instanceId === choice.sourceInstanceId,
  );
  const ownedEffect = owned?.effects.find((effect) => effect.id === choice.effectId);
  if (ownedEffect && owned) {
    return {
      effects: owned.effects,
      fromInventory: true,
      contentId: owned.contentId,
    };
  }
  const parent = [...(state.pendingChoice?.suspended ?? [])]
    .reverse()
    .find((frame): frame is PackChoiceFrame => frame.kind === 'pack');
  const option = parent?.options.find(
    (candidate) => candidate.id === choice.sourceInstanceId,
  );
  const optionEffect = option?.item.effects.find(
    (effect) => effect.id === choice.effectId,
  );
  return optionEffect && option
    ? {
        effects: option.item.effects,
        fromInventory: false,
        contentId: option.item.contentId,
      }
    : null;
}

function applyTargetEffect(
  state: RunStateV2,
  choice: TargetChoiceFrame,
  effects: MaterializedItem['effects'],
):
  | { readonly ok: true; readonly state: RunStateV2 }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode | StateOperationFailureCodeV3;
      readonly message: string;
    } {
  const selected = new Set(choice.selectedIds as readonly CardId[]);
  let next = state;
  for (const effect of [...effects].sort(
    (left, right) => left.priority - right.priority || left.id.localeCompare(right.id),
  )) {
    const resolved = resolveEffectOperations(effect, 'item-acquired', next);
    if (!resolved.ok) return resolved;
    for (const operation of resolved.operations) {
      if (operation.type === 'set-rank') {
        next = {
          ...next,
          deck: {
            cards: next.deck.cards.map((card) =>
              selected.has(card.id) ? { ...card, rank: operation.rank } : card,
            ),
          },
        };
      }
      if (operation.type === 'transform-card') {
        next = {
          ...next,
          deck: {
            cards: next.deck.cards.map((card) =>
              selected.has(card.id)
                ? { ...card, enhancementId: operation.enhancementId }
                : card,
            ),
          },
        };
      }
      if (operation.type === 'destroy-card') {
        const destroyed = destroyPlayingCardsV6(
          next,
          [...selected],
          `consumable:${effect.id}`,
        );
        if (!destroyed.ok) return destroyed;
        next = {
          ...destroyed.state,
          economy: {
            ...destroyed.state.economy,
            money: destroyed.state.economy.money + operation.money * selected.size,
          },
        };
        continue;
      }
      if (operation.type === 'add-money') {
        next = {
          ...next,
          economy: { ...next.economy, money: next.economy.money + operation.amount },
        };
      }
      if (operation.type === 'spend-money') {
        next = {
          ...next,
          economy: { ...next.economy, money: next.economy.money - operation.amount },
        };
      }
      if (operation.type === 'set-money') {
        next = { ...next, economy: { ...next.economy, money: operation.value } };
      }
      const catalogApplied = applyStateOperationV3(next, operation, {
        window: 'item-acquired',
        sourceInstanceId: choice.sourceInstanceId,
        effectId: effect.id,
        selectedIds: choice.selectedIds,
      });
      if (!catalogApplied.ok) return catalogApplied;
      if (catalogApplied.handled) next = catalogApplied.state;
    }
  }
  return { ok: true, state: next };
}

function resumeAfterTarget(
  state: RunStateV2,
  choice: TargetChoiceFrame,
  fromInventory: boolean,
): RunStateV2 {
  const suspended = [...(state.pendingChoice?.suspended ?? [])];
  const parent = suspended.pop();
  const inventory = fromInventory
    ? {
        ...state.inventory,
        consumables: state.inventory.consumables.filter(
          (item) => item.instanceId !== choice.sourceInstanceId,
        ),
      }
    : state.inventory;
  if (parent?.kind === 'pack') {
    const updated: PackChoiceFrame = {
      ...parent,
      options: parent.options.map((option) =>
        option.id === choice.sourceInstanceId ? { ...option, consumed: true } : option,
      ),
      remainingPicks: Math.max(0, parent.remainingPicks - 1),
    };
    const finished =
      updated.remainingPicks === 0 || updated.options.every((option) => option.consumed);
    return {
      ...state,
      inventory,
      phase: finished
        ? { kind: parent.returnPhase }
        : { kind: 'choice', choiceId: updated.id },
      pendingChoice: finished ? null : { current: updated, suspended },
    };
  }
  if (parent) {
    return {
      ...state,
      inventory,
      phase: { kind: 'choice', choiceId: parent.id },
      pendingChoice: { current: parent, suspended },
    };
  }
  return {
    ...state,
    inventory,
    phase: { kind: choice.returnPhase },
    pendingChoice: null,
  };
}

function confirmTargetChoice(
  state: RunStateV2,
  choice: TargetChoiceFrame,
): CommandResultV2 {
  if (
    choice.selectedIds.length < choice.minimumTargets ||
    choice.selectedIds.length > choice.maximumTargets
  ) {
    return reject(
      'invalid-target',
      `需要选择${choice.minimumTargets}至${choice.maximumTargets}个目标`,
    );
  }
  const resolved = findChoiceEffects(state, choice);
  if (!resolved) return reject('item-not-owned', '效果来源已经失效');
  const effectState: RunStateV2 = resolved.fromInventory
    ? {
        ...state,
        inventory: {
          ...state.inventory,
          consumables: state.inventory.consumables.filter(
            (item) => item.instanceId !== choice.sourceInstanceId,
          ),
        },
      }
    : state;
  const effected = applyTargetEffect(effectState, choice, resolved.effects);
  if (!effected.ok) return reject(effected.code, effected.message);
  const resumed = resumeAfterTarget(effected.state, choice, resolved.fromInventory);
  const used = applyConsumableUsedWindow(resumed, resolved.contentId);
  if (!used.ok) return reject(used.code, used.message);
  return accept(withCheckpoint(used.state));
}

function skipPack(state: RunStateV2, command: SkipPackCommandV2): CommandResultV2 {
  if (
    state.phase.kind !== 'choice' ||
    !state.pendingChoice ||
    state.pendingChoice.current.id !== command.choiceId ||
    state.pendingChoice.current.kind !== 'pack'
  ) {
    return reject('choice-mismatch', '卡包选择已经改变');
  }
  const pack = state.pendingChoice.current;
  const skipped = applyRunWindowEffectsV2(state, 'pack-skipped', {
    eventContext: {
      eventFacts: { kind: 'pack', packId: pack.packId, action: 'skipped' },
      eventCardIdentities: {},
    },
  });
  if (!skipped.ok) return reject(skipped.code, skipped.message);
  return accept(
    withCheckpoint({
      ...skipped.state,
      phase: { kind: pack.returnPhase },
      pendingChoice: null,
    }),
    [
      { type: 'pack-skipped', packId: pack.packId },
      { type: 'choice-cancelled', choiceId: command.choiceId },
    ],
  );
}

function cancelChoice(
  state: RunStateV2,
  command: CancelChoiceCommandV2,
): CommandResultV2 {
  if (
    state.phase.kind !== 'choice' ||
    !state.pendingChoice ||
    state.pendingChoice.current.id !== command.choiceId
  ) {
    return reject('choice-mismatch', '待决选择已经改变');
  }
  if (!state.pendingChoice.current.optional) {
    return reject('illegal-phase', '这个选择不能取消');
  }
  const suspended = [...state.pendingChoice.suspended];
  const parent = suspended.pop();
  const next = withCheckpoint({
    ...state,
    phase: parent
      ? { kind: 'choice', choiceId: parent.id }
      : { kind: state.pendingChoice.current.returnPhase },
    pendingChoice: parent ? { current: parent, suspended } : null,
  });
  return accept(next, [{ type: 'choice-cancelled', choiceId: command.choiceId }]);
}

function confirmChoice(
  state: RunStateV2,
  command: ConfirmChoiceCommandV2,
): CommandResultV2 {
  if (
    state.phase.kind !== 'choice' ||
    !state.pendingChoice ||
    state.pendingChoice.current.id !== command.choiceId
  ) {
    return reject('choice-mismatch', '待决选择已经改变');
  }
  const choice = state.pendingChoice.current;
  if (choice.kind === 'targets') {
    return confirmTargetChoice(state, choice);
  }
  if (choice.kind !== 'boss-reroll') {
    return reject('illegal-phase', '这个选择尚不能在当前切片确认');
  }
  if (state.economy.money + state.rules.allowedDebt < choice.cost) {
    return reject('insufficient-funds', '戏票不足，无法更换班主');
  }
  const candidates = choice.eligibleBlindIds
    .map((id) => state.content.blinds.find((blind) => blind.id === id))
    .filter((blind): blind is BlindDefinition => blind !== undefined);
  if (candidates.length === 0) return reject('pool-empty', '班主候选池已失效');
  const draw = pickStable(candidates, (blind) => blind.id, state.rngState);
  const finisher = state.progress.ante % 8 === 0;
  const next = withCheckpoint({
    ...state,
    rngState: draw.state,
    phase: { kind: 'blind-select' },
    progress: {
      ...state.progress,
      lineup: { ...state.progress.lineup, boss: materializeBlind(draw.value) },
      seenNormalBossIds: finisher
        ? state.progress.seenNormalBossIds
        : [...state.progress.seenNormalBossIds, draw.value.id],
      seenFinisherBossIds: finisher
        ? [...state.progress.seenFinisherBossIds, draw.value.id]
        : state.progress.seenFinisherBossIds,
      bossRerollCount: state.progress.bossRerollCount + 1,
    },
    economy: { ...state.economy, money: state.economy.money - choice.cost },
    pendingChoice: null,
  });
  return accept(
    next,
    [{ type: 'boss-rerolled', blindId: draw.value.id, cost: choice.cost }],
    [{ type: 'coin-spent', amount: choice.cost }],
  );
}

function dispatchCommandV2(state: RunStateV2, command: RunCommandV2): CommandResultV2 {
  if (command.checkpointId !== state.checkpointId) {
    return reject('stale-checkpoint', '操作基于旧检查点，请重试');
  }

  switch (command.type) {
    case 'select-blind':
      return selectBlind(state, command);
    case 'skip-blind':
      return skipBlind(state, command);
    case 'request-boss-reroll':
      return requestBossReroll(state, command);
    case 'toggle-card':
      return toggleCard(state, command);
    case 'sort-hand':
      return sortHand(state, command);
    case 'play-selected':
      return playSelected(state, command);
    case 'discard-selected':
      return discardSelected(state, command);
    case 'claim-round-reward':
      return claimRoundReward(state, command);
    case 'reroll-shop':
      return rerollShop(state, command);
    case 'buy-shop-offer':
      return buyShopOffer(state, command);
    case 'buy-pack':
      return buyPack(state, command);
    case 'buy-voucher':
      return buyVoucher(state, command);
    case 'sell-joker':
      return sellJoker(state, command);
    case 'sell-consumable':
      return sellConsumable(state, command);
    case 'reorder-joker':
      return reorderJoker(state, command);
    case 'begin-consumable-choice':
      return beginConsumableChoice(state, command);
    case 'choose-pack-option':
      return choosePackOption(state, command);
    case 'toggle-choice-target':
      return toggleChoiceTarget(state, command);
    case 'skip-pack':
      return skipPack(state, command);
    case 'leave-shop':
      return leaveShop(state, command);
    case 'finish-run':
      return finishRun(state, command);
    case 'enter-endless':
      return enterEndless(state, command);
    case 'confirm-choice':
      return confirmChoice(state, command);
    case 'cancel-choice':
      return cancelChoice(state, command);
  }
}

export function executeCommandV2(
  state: RunStateV2,
  command: RunCommandV2,
): CommandResultV2 {
  const result = dispatchCommandV2(state, command);
  if (!result.ok) return result;
  const previousIds = new Set(state.deck.cards.map(({ id }) => id));
  const addedCards = result.state.deck.cards.filter(({ id }) => !previousIds.has(id));
  if (addedCards.length === 0) return result;

  let next = result.state;
  for (const card of addedCards) {
    const added = applyRunWindowEffectsV2(next, 'playing-card-added', {
      eventContext: {
        eventFacts: {
          kind: 'playing-card-added',
          cardIds: [card.id],
          reason: `command:${command.type}`,
        },
        eventCardIdentities: {
          [card.id]: projectEffectivePlayingCardV3(next, card),
        },
      },
    });
    if (!added.ok) return reject(added.code, added.message);
    next = added.state;
  }
  return accept(next, result.domainEvents, result.presentationEvents);
}
