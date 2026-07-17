import { executeCommand } from '../game-core/commands/executeCommand';
import type {
  DomainEvent,
  PresentationEvent,
  RunCommand,
} from '../game-core/commands/types';
import { validateRunState } from '../game-core/invariants/validateRunState';
import type { RunState } from '../game-core/model/run';

export interface ScenarioResult {
  readonly state: RunState;
  readonly domainEvents: readonly DomainEvent[];
  readonly presentationEvents: readonly PresentationEvent[];
}

export function runScenario(
  initialState: RunState,
  commands: readonly RunCommand[],
): ScenarioResult {
  let state = initialState;
  const domainEvents: DomainEvent[] = [];
  const presentationEvents: PresentationEvent[] = [];

  commands.forEach((command, index) => {
    const result = executeCommand(state, command);
    if (!result.ok) {
      throw new Error(`场景第 ${index + 1} 步被拒绝：${result.rejection.code}`);
    }

    const validation = validateRunState(result.state);
    if (!validation.ok) {
      throw new Error(
        `场景第 ${index + 1} 步破坏不变量：${validation.violations.join('；')}`,
      );
    }

    state = result.state;
    domainEvents.push(...result.domainEvents);
    presentationEvents.push(...result.presentationEvents);
  });

  return { state, domainEvents, presentationEvents };
}
