import { executeCommand } from '../game-core/commands/executeCommand';
import type {
  DomainEvent,
  PresentationEvent,
  RunCommand,
} from '../game-core/commands/types';
import { validateRunState } from '../game-core/invariants/validateRunState';
import type { RunState } from '../game-core/model/run';
import type { ProfileRecord } from '../persistence/profiles';

export interface CheckpointRepository {
  commitCheckpoint(profile: ProfileRecord, run: RunState): Promise<void>;
}

export type CommittedCommandResult =
  | {
      readonly ok: true;
      readonly state: RunState;
      readonly domainEvents: readonly DomainEvent[];
      readonly presentationEvents: readonly PresentationEvent[];
    }
  | {
      readonly ok: false;
      readonly code: 'domain-rejected' | 'invariant-failed' | 'persistence-failed';
      readonly message: string;
      readonly state: RunState;
    };

export async function commitRunCommand(
  repository: CheckpointRepository,
  profile: ProfileRecord,
  currentState: RunState,
  command: RunCommand,
): Promise<CommittedCommandResult> {
  const proposal = executeCommand(currentState, command);
  if (!proposal.ok) {
    return {
      ok: false,
      code: 'domain-rejected',
      message: proposal.rejection.message,
      state: currentState,
    };
  }

  const validation = validateRunState(proposal.state);
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
