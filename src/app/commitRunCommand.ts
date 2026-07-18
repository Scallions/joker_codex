import { executeCommandV2 } from '../game-core/commands/executeCommandV2';
import type {
  DomainEventV2,
  PresentationEventV2,
  RunCommandV2,
} from '../game-core/commands/typesV2';
import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import type { RunStateV2 } from '../game-core/model/runV2';
import type { ProfileRecord } from '../persistence/profiles';

export interface CheckpointRepository {
  commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void>;
}

export type CommittedCommandResult =
  | {
      readonly ok: true;
      readonly state: RunStateV2;
      readonly domainEvents: readonly DomainEventV2[];
      readonly presentationEvents: readonly PresentationEventV2[];
    }
  | {
      readonly ok: false;
      readonly code: 'domain-rejected' | 'invariant-failed' | 'persistence-failed';
      readonly message: string;
      readonly state: RunStateV2;
    };

export async function commitRunCommand(
  repository: CheckpointRepository,
  profile: ProfileRecord,
  currentState: RunStateV2,
  command: RunCommandV2,
): Promise<CommittedCommandResult> {
  const proposal = executeCommandV2(currentState, command);
  if (!proposal.ok) {
    return {
      ok: false,
      code: 'domain-rejected',
      message: proposal.rejection.message,
      state: currentState,
    };
  }

  const validation = validateRunStateV2(proposal.state);
  if (!validation.ok) {
    return {
      ok: false,
      code: 'invariant-failed',
      message: `操作未通过状态校验：${validation.violations.join('；')}`,
      state: currentState,
    };
  }

  try {
    await repository.commitCheckpoint(profile, proposal.state);
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知存储错误';
    return {
      ok: false,
      code: 'persistence-failed',
      message: `自动保存失败：${detail}`,
      state: currentState,
    };
  }

  return {
    ok: true,
    state: proposal.state,
    domainEvents: proposal.domainEvents,
    presentationEvents: proposal.presentationEvents,
  };
}
