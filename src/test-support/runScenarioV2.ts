import { executeCommandV2 } from '../game-core/commands/executeCommandV2';
import type {
  DomainEventV2,
  PresentationEventV2,
  RejectionCodeV2,
  RunCommandV2,
} from '../game-core/commands/typesV2';
import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import { validateRunStateV3 } from '../game-core/invariants/validateRunStateV3';
import { validateRunStateV4 } from '../game-core/invariants/validateRunStateV4';
import { validateRunStateV5 } from '../game-core/invariants/validateRunStateV5';
import { validateRunStateV6 } from '../game-core/invariants/validateRunStateV6';
import { validateRunStateV7 } from '../game-core/invariants/validateRunStateV7';
import type { RunStateV2 } from '../game-core/model/runV2';
import { isRunStateV3, isRunStateV4 } from '../game-core/model/runV3';
import { isRunStateV5 } from '../game-core/model/runV5';
import { isRunStateV6 } from '../game-core/model/runV6';
import { isRunStateV7 } from '../game-core/model/runV7';
import { encodeRunStateV2ForTransfer } from '../persistence/scoreWire';

export interface ScenarioStepV2 {
  readonly buildCommand: (state: RunStateV2) => RunCommandV2;
  readonly expectedPhase?: RunStateV2['phase']['kind'];
  readonly expectedRejection?: RejectionCodeV2;
}

export interface ScenarioResultV2 {
  readonly state: RunStateV2;
  readonly domainEvents: readonly DomainEventV2[];
  readonly presentationEvents: readonly PresentationEventV2[];
}

function canonicalRunState(state: RunStateV2): string {
  return JSON.stringify(encodeRunStateV2ForTransfer(state));
}

function validateCurrentRunState(state: RunStateV2) {
  if (isRunStateV7(state)) return validateRunStateV7(state);
  if (isRunStateV6(state)) return validateRunStateV6(state);
  if (isRunStateV5(state)) return validateRunStateV5(state);
  if (isRunStateV4(state)) return validateRunStateV4(state);
  if (isRunStateV3(state)) return validateRunStateV3(state);
  return validateRunStateV2(state);
}

export function runScenarioV2(
  initialState: RunStateV2,
  steps: readonly ScenarioStepV2[],
): ScenarioResultV2 {
  let state = initialState;
  const domainEvents: DomainEventV2[] = [];
  const presentationEvents: PresentationEventV2[] = [];

  steps.forEach((step, index) => {
    const preimage = canonicalRunState(state);
    const result = executeCommandV2(state, step.buildCommand(state));
    if (!result.ok) {
      if (result.rejection.code !== step.expectedRejection) {
        throw new Error(`场景第 ${String(index + 1)} 步被拒绝：${result.rejection.code}`);
      }
      if (canonicalRunState(state) !== preimage) {
        throw new Error(`场景第 ${String(index + 1)} 步拒绝后改变了状态前像`);
      }
      return;
    }
    if (step.expectedRejection) {
      throw new Error(
        `场景第 ${String(index + 1)} 步应被拒绝：${step.expectedRejection}`,
      );
    }

    const validation = validateCurrentRunState(result.state);
    if (!validation.ok) {
      throw new Error(
        `场景第 ${String(index + 1)} 步破坏不变量：${validation.violations.join('；')}`,
      );
    }
    if (step.expectedPhase && result.state.phase.kind !== step.expectedPhase) {
      throw new Error(
        `场景第 ${String(index + 1)} 步阶段错误：应为 ${step.expectedPhase}，实际为 ${result.state.phase.kind}`,
      );
    }

    state = result.state;
    domainEvents.push(...result.domainEvents);
    presentationEvents.push(...result.presentationEvents);
  });

  return { state, domainEvents, presentationEvents };
}
