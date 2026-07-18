import fc from 'fast-check';

import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { validateRunStateV2 } from '../../src/game-core/invariants/validateRunStateV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { runStateV2Schema } from '../../src/persistence/schemasV2';

function commandFor(state: RunStateV2, move: number): RunCommandV2 | null {
  const checkpointId = state.checkpointId;
  if (state.phase.kind === 'blind-select') {
    if (move % 4 === 0 && state.progress.blindPosition !== 'boss') {
      return {
        type: 'skip-blind',
        checkpointId,
        position: state.progress.blindPosition,
      };
    }
    if (move % 4 === 1 && state.progress.blindPosition === 'boss') {
      return { type: 'request-boss-reroll', checkpointId };
    }
    return {
      type: 'select-blind',
      checkpointId,
      position: state.progress.blindPosition,
    };
  }
  if (state.phase.kind === 'round') {
    const cardId =
      state.round?.handIds.find((id) => !state.round?.selectedCardIds.includes(id)) ??
      state.round?.handIds[0];
    const consumable = state.inventory.consumables[0];
    switch (move % 6) {
      case 0:
        return cardId ? { type: 'toggle-card', checkpointId, cardId } : null;
      case 1:
        return { type: 'play-selected', checkpointId };
      case 2:
        return { type: 'discard-selected', checkpointId };
      case 3:
        return {
          type: 'sort-hand',
          checkpointId,
          mode: move % 2 === 0 ? 'rank' : 'suit',
        };
      case 4:
        return consumable
          ? {
              type: 'begin-consumable-choice',
              checkpointId,
              consumableInstanceId: consumable.instanceId,
            }
          : cardId
            ? { type: 'toggle-card', checkpointId, cardId }
            : null;
      default: {
        const joker = state.inventory.jokers[0];
        return joker
          ? {
              type: 'reorder-joker',
              checkpointId,
              jokerInstanceId: joker.instanceId,
              toIndex: state.inventory.jokers.length - 1,
            }
          : null;
      }
    }
  }
  if (state.phase.kind === 'round-reward') {
    return { type: 'claim-round-reward', checkpointId };
  }
  if (state.phase.kind === 'shop') {
    const cardOffer = state.shop?.cardOffers[0];
    const packOffer = state.shop?.packOffers[0];
    const voucherOffer = state.shop?.voucherOffer;
    const joker = state.inventory.jokers[0];
    const consumable = state.inventory.consumables[0];
    switch (move % 9) {
      case 0:
        return { type: 'leave-shop', checkpointId };
      case 1:
        return { type: 'reroll-shop', checkpointId };
      case 2:
        return cardOffer
          ? { type: 'buy-shop-offer', checkpointId, offerId: cardOffer.id }
          : { type: 'leave-shop', checkpointId };
      case 3:
        return packOffer
          ? { type: 'buy-pack', checkpointId, offerId: packOffer.id }
          : { type: 'leave-shop', checkpointId };
      case 4:
        return voucherOffer
          ? { type: 'buy-voucher', checkpointId, offerId: voucherOffer.id }
          : { type: 'leave-shop', checkpointId };
      case 5:
        return joker
          ? { type: 'sell-joker', checkpointId, jokerInstanceId: joker.instanceId }
          : { type: 'leave-shop', checkpointId };
      case 6:
        return consumable
          ? {
              type: 'sell-consumable',
              checkpointId,
              consumableInstanceId: consumable.instanceId,
            }
          : { type: 'leave-shop', checkpointId };
      case 7:
        return joker
          ? {
              type: 'reorder-joker',
              checkpointId,
              jokerInstanceId: joker.instanceId,
              toIndex: state.inventory.jokers.length - 1,
            }
          : { type: 'leave-shop', checkpointId };
      default:
        return consumable
          ? {
              type: 'begin-consumable-choice',
              checkpointId,
              consumableInstanceId: consumable.instanceId,
            }
          : { type: 'leave-shop', checkpointId };
    }
  }
  if (state.phase.kind === 'choice' && state.pendingChoice) {
    const frame = state.pendingChoice.current;
    if (frame.kind === 'pack') {
      const option = frame.options.find((candidate) => !candidate.consumed);
      return move % 2 === 0 && option
        ? {
            type: 'choose-pack-option',
            checkpointId,
            choiceId: frame.id,
            optionId: option.id,
          }
        : { type: 'skip-pack', checkpointId, choiceId: frame.id };
    }
    if (frame.kind === 'boss-reroll') {
      return move % 2 === 0
        ? { type: 'confirm-choice', checkpointId, choiceId: frame.id }
        : { type: 'cancel-choice', checkpointId, choiceId: frame.id };
    }
    if (frame.selectedIds.length >= frame.minimumTargets && move % 3 === 0) {
      return { type: 'confirm-choice', checkpointId, choiceId: frame.id };
    }
    if (frame.optional && move % 3 === 1) {
      return { type: 'cancel-choice', checkpointId, choiceId: frame.id };
    }
    const selectedIds: ReadonlySet<string> = new Set(frame.selectedIds);
    const targetId =
      frame.eligibleIds.find((id) => !selectedIds.has(id)) ?? frame.selectedIds[0];
    return targetId
      ? {
          type: 'toggle-choice-target',
          checkpointId,
          choiceId: frame.id,
          targetId,
        }
      : frame.optional
        ? { type: 'cancel-choice', checkpointId, choiceId: frame.id }
        : null;
  }
  if (state.phase.kind === 'run-won') {
    return move % 2 === 0
      ? { type: 'enter-endless', checkpointId }
      : { type: 'finish-run', checkpointId };
  }
  return null;
}

describe('V2 命令序列属性', () => {
  it('任意混合合法/被拒命令都保持不变量、存读和拒绝原子性', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 24 }),
        fc.array(fc.integer({ min: 0, max: 1_000 }), {
          minLength: 1,
          maxLength: 100,
        }),
        (seed, moves) => {
          let state = createRunEconomyFixtureRun({
            seed,
            startingMoney: 50,
            targetScaleBasisPoints: 1,
            startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
          });
          for (const move of moves) {
            const command = commandFor(state, move);
            if (!command) break;
            const before = structuredClone(state);
            const result = executeCommandV2(state, command);
            if (!result.ok) {
              expect(state).toEqual(before);
              expect(state.rngState).toBe(before.rngState);
              expect(state.checkpointId).toBe(before.checkpointId);
              continue;
            }
            expect(result.state.checkpointId).toBe(state.checkpointId + 1);
            expect(validateRunStateV2(result.state)).toEqual({ ok: true });
            expect(runStateV2Schema.parse(structuredClone(result.state))).toEqual(
              result.state,
            );
            state = result.state;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
