import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { validateRunStateV2 } from '../../src/game-core/invariants/validateRunStateV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type {
  EffectReference,
  EffectWindow,
  RunStateV2,
} from '../../src/game-core/model/runV2';
import { runStateV2Schema } from '../../src/persistence/schemasV2';

const ROUTED_WINDOWS = [
  'blind-selected',
  'round-start',
  'after-hand',
  'discard',
  'round-end',
  'shop-entered',
  'shop-rerolled',
  'item-acquired',
  'pack-opened',
  'ante-ended',
] as const satisfies readonly EffectWindow[];

const routeObservation: EffectReference = {
  id: 'test:effect:observe-run-window',
  handlerId: 'fixture:run-economy:handler:record-observation',
  windows: ROUTED_WINDOWS,
  priority: 0,
  parameters: { key: 'run-window', value: true },
};

function apply(state: RunStateV2, command: RunCommandV2): RunStateV2 {
  const result = executeCommandV2(state, command);
  if (!result.ok) {
    throw new Error(`${result.rejection.code}: ${result.rejection.message}`);
  }
  expect(validateRunStateV2(result.state)).toEqual({ ok: true });
  expect(runStateV2Schema.parse(structuredClone(result.state))).toEqual(result.state);
  return result.state;
}

function playCurrentBlind(state: RunStateV2, discardFirst = false): RunStateV2 {
  state = apply(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: state.progress.blindPosition,
  });
  if (discardFirst) {
    const discardId = state.round?.handIds.find(
      (cardId) => !state.round?.forcedSelectedCardIds.includes(cardId),
    );
    if (!discardId) throw new Error('缺少可弃手牌');
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: discardId,
    });
    state = apply(state, {
      type: 'discard-selected',
      checkpointId: state.checkpointId,
    });
  }
  const requiredCount =
    state.round?.blind.effects.find(
      (effect) => effect.handlerId === 'fixture:run-economy:handler:require-play-count',
    )?.parameters.count ?? 1;
  if (typeof requiredCount !== 'number') throw new Error('非法出牌数量');
  for (const cardId of state.round?.handIds ?? []) {
    if ((state.round?.selectedCardIds.length ?? 0) >= requiredCount) break;
    if (state.round?.selectedCardIds.includes(cardId)) continue;
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
  }
  state = apply(state, {
    type: 'play-selected',
    checkpointId: state.checkpointId,
  });
  if (state.phase.kind !== 'round-reward') throw new Error('未进入奖励阶段');
  return apply(state, {
    type: 'claim-round-reward',
    checkpointId: state.checkpointId,
  });
}

describe('命令路由的效果窗口', () => {
  it('生命周期窗口均经有界队列执行，观测可存读', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'routed-effect-windows',
      startingMoney: 200,
      targetScaleBasisPoints: 1,
      startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
    });
    const observer = state.inventory.jokers[0];
    if (!observer) throw new Error('缺少观测奇牌');
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: [{ ...observer, effects: [...observer.effects, routeObservation] }],
      },
    };

    state = playCurrentBlind(state, true);
    state = apply(state, {
      type: 'reroll-shop',
      checkpointId: state.checkpointId,
    });
    const cardOffer = state.shop?.cardOffers[0];
    if (!cardOffer) throw new Error('缺少普通商品');
    state = apply(state, {
      type: 'buy-shop-offer',
      checkpointId: state.checkpointId,
      offerId: cardOffer.id,
    });
    const packOffer = state.shop?.packOffers[0];
    if (!packOffer) throw new Error('缺少卡包商品');
    state = apply(state, {
      type: 'buy-pack',
      checkpointId: state.checkpointId,
      offerId: packOffer.id,
    });
    if (state.pendingChoice?.current.kind !== 'pack') throw new Error('缺少卡包选择');
    state = apply(state, {
      type: 'skip-pack',
      checkpointId: state.checkpointId,
      choiceId: state.pendingChoice.current.id,
    });
    state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });

    state = playCurrentBlind(state);
    state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
    state = playCurrentBlind(state);
    state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });

    const observed = new Set(
      state.history.effectObservations
        .filter((observation) => observation.effectId === routeObservation.id)
        .map((observation) => observation.window),
    );
    expect(observed).toEqual(new Set(ROUTED_WINDOWS));
    expect(runStateV2Schema.parse(structuredClone(state))).toEqual(state);
  });
});
