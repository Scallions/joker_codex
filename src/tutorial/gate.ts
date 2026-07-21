import type { DomainEventV2, RunCommandV2 } from '../game-core/commands/typesV2';
import type { RunStateV7 } from '../game-core/model/runV7';
import type { ProgressionFact } from '../progression/facts';
import type { TutorialProgress } from '../progression/model';
import { TUTORIAL_STEPS, tutorialInstructionForPhase } from './script';

export type TutorialGateResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

function rejection(run: RunStateV7, stepId: string): TutorialGateResult {
  const step = TUTORIAL_STEPS.find((candidate) => candidate.stepId === stepId);
  return {
    ok: false,
    message: step
      ? `教程提示：${tutorialInstructionForPhase(step, run.phase.kind)}`
      : '教程步骤无效，请返回主菜单重试。',
  };
}

function shopOfferIsJoker(run: RunStateV7, command: RunCommandV2): boolean {
  return (
    command.type === 'buy-shop-offer' &&
    run.shop?.cardOffers.find(({ id }) => id === command.offerId)?.item.kind === 'joker'
  );
}

function packOptionIsConsumable(run: RunStateV7, command: RunCommandV2): boolean {
  return (
    command.type !== 'choose-pack-option' ||
    (run.pendingChoice?.current.kind === 'pack' &&
      run.pendingChoice.current.options.find(({ id }) => id === command.optionId)?.item
        .kind === 'consumable')
  );
}

export function tutorialPackOfferSupportsConsumable(
  run: RunStateV7,
  offerId: string,
): boolean {
  const offer = run.shop?.packOffers.find(({ id }) => id === offerId);
  if (!offer) return false;
  return Boolean(
    run.content.packs
      .find(({ id }) => id === offer.packId)
      ?.allowedItemKinds.includes('consumable'),
  );
}

export function tutorialPackChoiceHasConsumable(run: RunStateV7): boolean {
  const choice = run.pendingChoice?.current;
  return Boolean(
    choice?.kind === 'pack' &&
    choice.options.some(({ consumed, item }) => !consumed && item.kind === 'consumable'),
  );
}

export function gateTutorialCommand(
  run: RunStateV7,
  tutorial: TutorialProgress,
  command: RunCommandV2,
): TutorialGateResult {
  if (run.sessionV7.runClass !== 'tutorial') return { ok: true };
  if (tutorial.status !== 'in-progress' || tutorial.currentStepId === null) {
    return { ok: false, message: '教程尚未开始或已经结束。' };
  }
  const stepId = tutorial.currentStepId;
  const allowed = (() => {
    switch (stepId) {
      case 'tutorial:step:01':
        return command.type === 'select-blind' && command.position === 'small';
      case 'tutorial:step:02':
        return command.type === 'toggle-card';
      case 'tutorial:step:03':
        return command.type === 'play-selected';
      case 'tutorial:step:04':
        return command.type === 'toggle-card' || command.type === 'discard-selected';
      case 'tutorial:step:05':
        return ['toggle-card', 'play-selected', 'claim-round-reward'].includes(
          command.type,
        );
      case 'tutorial:step:06':
        return shopOfferIsJoker(run, command);
      case 'tutorial:step:07':
        if (command.type === 'buy-pack') {
          return tutorialPackOfferSupportsConsumable(run, command.offerId);
        }
        if (command.type === 'skip-pack') {
          return !tutorialPackChoiceHasConsumable(run);
        }
        return (
          [
            'choose-pack-option',
            'toggle-choice-target',
            'confirm-choice',
            'begin-consumable-choice',
          ].includes(command.type) && packOptionIsConsumable(run, command)
        );
      case 'tutorial:step:08':
        return command.type === 'leave-shop';
      default:
        return false;
    }
  })();
  return allowed ? { ok: true } : rejection(run, stepId);
}

function hasEvent(
  events: readonly DomainEventV2[],
  type: DomainEventV2['type'],
): boolean {
  return events.some((event) => event.type === type);
}

function purchasedKind(
  before: RunStateV7,
  events: readonly DomainEventV2[],
): 'joker' | 'consumable' | 'playing-card' | null {
  const event = events.find(
    (candidate): candidate is Extract<DomainEventV2, { type: 'item-purchased' }> =>
      candidate.type === 'item-purchased',
  );
  if (!event) return null;
  const definition = before.content.items.find(
    ({ contentId }) => contentId === event.contentId,
  );
  const packOption =
    before.pendingChoice?.current.kind === 'pack'
      ? before.pendingChoice.current.options.find(
          ({ item }) => item.contentId === event.contentId,
        )?.item
      : undefined;
  return definition?.kind ?? packOption?.kind ?? null;
}

export function deriveTutorialProgressionFacts(
  before: RunStateV7,
  after: RunStateV7,
  domainEvents: readonly DomainEventV2[],
  tutorial: TutorialProgress,
): readonly ProgressionFact[] {
  if (before.sessionV7.runClass !== 'tutorial' || tutorial.currentStepId === null) {
    return [];
  }
  const nextStep = (() => {
    switch (tutorial.currentStepId) {
      case 'tutorial:step:01':
        return hasEvent(domainEvents, 'blind-selected') ? 'tutorial:step:02' : null;
      case 'tutorial:step:02':
        return hasEvent(domainEvents, 'selection-changed') ? 'tutorial:step:03' : null;
      case 'tutorial:step:03':
        return hasEvent(domainEvents, 'hand-scored')
          ? hasEvent(domainEvents, 'blind-won')
            ? 'tutorial:step:05'
            : 'tutorial:step:04'
          : null;
      case 'tutorial:step:04':
        return hasEvent(domainEvents, 'cards-discarded') ? 'tutorial:step:05' : null;
      case 'tutorial:step:05':
        return hasEvent(domainEvents, 'reward-claimed') ? 'tutorial:step:06' : null;
      case 'tutorial:step:06':
        return purchasedKind(before, domainEvents) === 'joker'
          ? 'tutorial:step:07'
          : null;
      case 'tutorial:step:07':
        return hasEvent(domainEvents, 'item-consumed') ||
          (hasEvent(domainEvents, 'pack-skipped') &&
            !tutorialPackChoiceHasConsumable(before))
          ? 'tutorial:step:08'
          : null;
      default:
        return null;
    }
  })();
  if (
    tutorial.currentStepId === 'tutorial:step:08' &&
    hasEvent(domainEvents, 'shop-left')
  ) {
    return [{ type: 'tutorial-completed' }];
  }
  if (!nextStep || after.checkpointId <= before.checkpointId) return [];
  return [{ type: 'tutorial-step-completed', stepId: nextStep }];
}
