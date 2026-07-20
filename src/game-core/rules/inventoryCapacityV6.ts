import type { RunStateV2 } from '../model/runV2';

export function usedJokerSlotsForRun(run: RunStateV2): number {
  return run.inventory.jokers.reduce(
    (total, joker) => total + Math.max(0, joker.slotContribution),
    0,
  );
}

export function consumableSlotContribution(editionId: string | null): 0 | 1 {
  return editionId === 'bxqp:edition:shadow-cutout' ? 0 : 1;
}

export function usedConsumableSlotsForRun(run: RunStateV2): number {
  return run.inventory.consumables.reduce(
    (total, consumable) => total + consumableSlotContribution(consumable.editionId),
    0,
  );
}
