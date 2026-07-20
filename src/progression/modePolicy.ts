import type { RunClassV7 } from '../game-core/model/runV7';
import type { ProgressionFact } from './facts';

export type ProgressionPolicy = 'full' | 'challenge-only' | 'tutorial-only' | 'none';

export function progressionPolicyForRunClass(runClass: RunClassV7): ProgressionPolicy {
  switch (runClass) {
    case 'campaign':
      return 'full';
    case 'challenge':
      return 'challenge-only';
    case 'tutorial':
      return 'tutorial-only';
    case 'seeded':
      return 'none';
    case 'migrated-legacy':
      return 'none';
  }
}

export function filterProgressionFactsByRunClass(
  runClass: RunClassV7,
  facts: readonly ProgressionFact[],
): readonly ProgressionFact[] {
  const policy = progressionPolicyForRunClass(runClass);
  if (policy === 'full') return facts;
  if (policy === 'challenge-only') {
    return facts.filter(({ type }) => ['challenge-completed', 'run-lost'].includes(type));
  }
  if (policy === 'tutorial-only') {
    return facts.filter(({ type }) =>
      ['tutorial-step-completed', 'tutorial-completed', 'tutorial-skipped'].includes(
        type,
      ),
    );
  }
  return [];
}
