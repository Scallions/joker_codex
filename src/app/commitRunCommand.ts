import { executeCommandV2 } from '../game-core/commands/executeCommandV2';
import type {
  DomainEventV2,
  PresentationEventV2,
  RunCommandV2,
} from '../game-core/commands/typesV2';
import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import { validateRunStateV7 } from '../game-core/invariants/validateRunStateV7';
import type { RunStateV2 } from '../game-core/model/runV2';
import { isRunStateV7 } from '../game-core/model/runV7';
import type { ProfileRecord } from '../persistence/profiles';
import { deriveProgressionFacts } from '../progression/facts';
import { reduceProfileProgression } from '../progression/reducer';
import { deriveTutorialProgressionFacts, gateTutorialCommand } from '../tutorial/gate';

export interface CheckpointRepository {
  commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void>;
}

export type CommittedCommandResult =
  | {
      readonly ok: true;
      readonly profile: ProfileRecord;
      readonly state: RunStateV2;
      readonly domainEvents: readonly DomainEventV2[];
      readonly presentationEvents: readonly PresentationEventV2[];
    }
  | {
      readonly ok: false;
      readonly code:
        | 'domain-rejected'
        | 'invariant-failed'
        | 'projection-failed'
        | 'persistence-failed';
      readonly message: string;
      readonly profile: ProfileRecord;
      readonly state: RunStateV2;
    };

export async function commitRunCommand(
  repository: CheckpointRepository,
  profile: ProfileRecord,
  currentState: RunStateV2,
  command: RunCommandV2,
  nowEpochMs: number,
): Promise<CommittedCommandResult> {
  if (isRunStateV7(currentState) && currentState.sessionV7.runClass === 'tutorial') {
    const gate = gateTutorialCommand(currentState, profile.tutorial, command);
    if (!gate.ok) {
      return {
        ok: false,
        code: 'domain-rejected',
        message: gate.message,
        profile,
        state: currentState,
      };
    }
  }
  const proposal = executeCommandV2(currentState, command);
  if (!proposal.ok) {
    return {
      ok: false,
      code: 'domain-rejected',
      message: proposal.rejection.message,
      profile,
      state: currentState,
    };
  }

  const validation = isRunStateV7(proposal.state)
    ? validateRunStateV7(proposal.state)
    : validateRunStateV2(proposal.state);
  if (!validation.ok) {
    return {
      ok: false,
      code: 'invariant-failed',
      message: `操作未通过状态校验：${validation.violations.join('；')}`,
      profile,
      state: currentState,
    };
  }

  let projectedProfile = profile;
  if (isRunStateV7(currentState) && isRunStateV7(proposal.state)) {
    try {
      const derived =
        currentState.sessionV7.runClass === 'migrated-legacy'
          ? {
              runId: proposal.state.runId,
              profileId: proposal.state.sessionV7.profileId,
              checkpointId: proposal.state.checkpointId,
              runClass: proposal.state.sessionV7.runClass,
              facts: [],
            }
          : deriveProgressionFacts(currentState, proposal.state, proposal.domainEvents);
      const tutorialFacts = deriveTutorialProgressionFacts(
        currentState,
        proposal.state,
        proposal.domainEvents,
        profile.tutorial,
      );
      projectedProfile = reduceProfileProgression(
        profile,
        { ...derived, facts: [...derived.facts, ...tutorialFacts] },
        nowEpochMs,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知进度错误';
      return {
        ok: false,
        code: 'projection-failed',
        message: `局外进度结算失败：${detail}`,
        profile,
        state: currentState,
      };
    }
  }

  try {
    await repository.commitCheckpoint(projectedProfile, proposal.state);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知存储错误';
    return {
      ok: false,
      code: 'persistence-failed',
      message: `自动保存失败：${detail}`,
      profile,
      state: currentState,
    };
  }

  return {
    ok: true,
    profile: projectedProfile,
    state: proposal.state,
    domainEvents: proposal.domainEvents,
    presentationEvents: proposal.presentationEvents,
  };
}
