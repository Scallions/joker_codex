import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { destroyPlayingCardsV6 } from '../../src/game-core/effects/playingCardDestructionV6';
import type { CardId } from '../../src/game-core/model/ids';
import type { EffectReference, RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV6, type RunStateV6 } from '../../src/game-core/model/runV6';
import { abilityV6, acquireV6, commandV6, initialV6 } from '../helpers/jokerV6';

function asV6(state: RunStateV2): RunStateV6 {
  if (!isRunStateV6(state)) throw new Error('摧毁事务降级了 V6');
  return state;
}

function acquireContentV6(state: RunStateV6, contentId: string): RunStateV6 {
  const acquired = acquireContentByIdV3(state, contentId, `destroy:${contentId}`);
  if (!acquired.ok || !isRunStateV6(acquired.state)) {
    throw new Error(acquired.ok ? '获得内容后没有保持 V6' : acquired.message);
  }
  return acquired.state;
}

function patchCard(
  state: RunStateV6,
  cardId: CardId,
  patch: { readonly enhancementId?: string | null },
): RunStateV6 {
  return {
    ...state,
    deck: {
      cards: state.deck.cards.map((card) =>
        card.id === cardId ? { ...card, ...patch } : card,
      ),
    },
    modifiersV3: {
      ...state.modifiersV3,
      playingCards: state.modifiersV3.playingCards.map((modifier) =>
        modifier.cardId === cardId ? { ...modifier, ...patch } : modifier,
      ),
    },
  };
}

describe('V6 统一戏牌摧毁事务', () => {
  it('一次冻结多张牌的有效身份，按来源顺序结算并清理所有区域与镜像', () => {
    let state = acquireV6(initialV6('destroy-multi-zone'), 120);
    state = acquireV6(state, 146);
    state = acquireV6(state, 37);
    state = commandV6(state, { type: 'select-blind', position: 'small' });
    const targets = state.round!.handIds.slice(0, 2);
    for (const target of targets) {
      state = patchCard(state, target, {
        enhancementId: 'bxqp:enhancement:glass-ribbon',
      });
    }
    state = {
      ...state,
      round: {
        ...state.round!,
        drawPileIds: [...state.round!.drawPileIds, ...targets],
        handIds: [...state.round!.handIds, ...targets],
        playedIds: [...state.round!.playedIds, ...targets],
        discardPileIds: [...state.round!.discardPileIds, ...targets],
        selectedCardIds: targets,
        forcedSelectedCardIds: targets,
        faceDownCardIds: targets,
      },
    };

    const destroyed = destroyPlayingCardsV6(state, targets, 'test:multi-zone');
    expect(destroyed.ok).toBe(true);
    if (!destroyed.ok) return;
    const next = asV6(destroyed.state);
    expect(abilityV6(next, 120, 'multFactorHundredths')).toBe(250);
    expect(abilityV6(next, 146, 'multFactorHundredths')).toBe(300);
    const expectedSources = state.inventory.jokers
      .filter(({ contentId }) => ['bxqp:joker:120', 'bxqp:joker:146'].includes(contentId))
      .map(({ instanceId }) => instanceId);
    expect(destroyed.operations.map(({ sourceInstanceId }) => sourceInstanceId)).toEqual(
      expectedSources,
    );
    expect(next.deck.cards.some(({ id }) => targets.includes(id))).toBe(false);
    expect(
      next.modifiersV3.playingCards.some(({ cardId }) => targets.includes(cardId)),
    ).toBe(false);
    for (const ids of [
      next.round!.drawPileIds,
      next.round!.handIds,
      next.round!.playedIds,
      next.round!.discardPileIds,
      next.round!.selectedCardIds,
      next.round!.forcedSelectedCardIds,
      next.round!.faceDownCardIds,
    ]) {
      expect(ids.some((id) => targets.includes(id))).toBe(false);
    }
  });

  it('空请求不伪造事件，重复或未知 ID 在任何变更和 RNG 消耗前拒绝', () => {
    const state = initialV6('destroy-invalid');
    const target = state.deck.cards[0]!.id;
    const empty = destroyPlayingCardsV6(state, [], 'test:empty');
    expect(empty).toEqual({ ok: true, state, operations: [] });

    const duplicate = destroyPlayingCardsV6(state, [target, target], 'test:duplicate');
    expect(duplicate).toMatchObject({ ok: false, code: 'pool-empty' });
    const unknown = destroyPlayingCardsV6(
      state,
      ['test:unknown-card' as CardId],
      'test:unknown',
    );
    expect(unknown).toMatchObject({ ok: false, code: 'pool-empty' });
    expect(state.deck.cards.some(({ id }) => id === target)).toBe(true);
    expect(state.rngState).toEqual(initialV6('destroy-invalid').rngState);
  });

  it('J095 的首张弃牌销毁也进入统一事件并驱动 J120', () => {
    let state = acquireV6(initialV6('destroy-j095'), 95);
    state = acquireV6(state, 120);
    state = commandV6(state, { type: 'select-blind', position: 'small' });
    const target = state.round!.handIds[0]!;
    state = patchCard(state, target, {
      enhancementId: 'bxqp:enhancement:glass-ribbon',
    });
    state = {
      ...state,
      round: { ...state.round!, selectedCardIds: [target] },
    };
    const discarded = commandV6(state, { type: 'discard-selected' });
    expect(discarded.deck.cards.some(({ id }) => id === target)).toBe(false);
    expect(abilityV6(discarded, 120, 'multFactorHundredths')).toBe(175);
  });

  it('有目标纸术牌的永久销毁也进入统一事件并消费来源', () => {
    let state = acquireV6(initialV6('destroy-consumable'), 120);
    const destroyDefinition = state.content.items.find(
      (item) =>
        item.kind === 'consumable' &&
        item.effects.some(
          (effect) =>
            effect.handlerId === 'bxqp:handler:card-destroy' &&
            effect.parameters.selection === 'selected',
        ),
    );
    if (!destroyDefinition || destroyDefinition.kind !== 'consumable') {
      throw new Error('缺少有目标摧毁纸术牌');
    }
    state = acquireContentV6(state, destroyDefinition.contentId);
    state = commandV6(state, { type: 'select-blind', position: 'small' });
    const target = state.round!.handIds[0]!;
    state = patchCard(state, target, {
      enhancementId: 'bxqp:enhancement:glass-ribbon',
    });
    const source = state.inventory.consumables.find(
      ({ contentId }) => contentId === destroyDefinition.contentId,
    )!;
    state = commandV6(state, {
      type: 'begin-consumable-choice',
      consumableInstanceId: source.instanceId,
    });
    if (state.pendingChoice?.current.kind !== 'targets') {
      throw new Error('摧毁纸术牌没有打开目标选择');
    }
    const choiceId = state.pendingChoice.current.id;
    state = commandV6(state, {
      type: 'toggle-choice-target',
      choiceId,
      targetId: target,
    });
    state = commandV6(state, { type: 'confirm-choice', choiceId });
    expect(state.deck.cards.some(({ id }) => id === target)).toBe(false);
    expect(abilityV6(state, 120, 'multFactorHundredths')).toBe(175);
    expect(
      state.inventory.consumables.some(
        ({ instanceId }) => instanceId === source.instanceId,
      ),
    ).toBe(false);
  });

  it('摧毁后续效果图若形成静态循环，整个提案失败且入口状态不变', () => {
    let state = acquireV6(initialV6('destroy-late-failure'), 120);
    state = acquireV6(state, 146);
    const [left, right] = state.inventory.jokers;
    if (!left || !right) throw new Error('缺少循环来源');
    const copyEffect = (id: string, targetInstanceId: string): EffectReference => ({
      id,
      handlerId: 'fixture:run-economy:handler:copy-joker',
      windows: ['playing-card-destroyed'],
      priority: 0,
      parameters: { targetInstanceId },
    });
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === left.instanceId
            ? { ...joker, effects: [copyEffect('test:cycle:left', right.instanceId)] }
            : joker.instanceId === right.instanceId
              ? { ...joker, effects: [copyEffect('test:cycle:right', left.instanceId)] }
              : joker,
        ),
      },
    };
    const before = JSON.stringify(state);
    const target = state.deck.cards[0]!.id;
    const rejected = destroyPlayingCardsV6(state, [target], 'test:late-failure');
    expect(rejected).toMatchObject({ ok: false, code: 'effect-cycle' });
    expect(JSON.stringify(state)).toBe(before);
    expect(state.deck.cards.some(({ id }) => id === target)).toBe(true);
  });
});
