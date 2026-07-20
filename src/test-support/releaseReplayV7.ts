import { PRODUCTION_CATALOG } from '../content/productionCatalog';
import { createProductionRunV7 } from '../content/runtime/runSetupV7';
import type { RunStateV7 } from '../game-core/model/runV7';
import { materializeBlind } from '../game-core/rules/ante';
import {
  createProfile,
  type ProfileRecord,
  type ProfileSlot,
} from '../persistence/profiles';
import { projectRunStart } from '../progression/reducer';
import { selectFrozenEligibilityObjectiveIds } from '../progression/selectors';
import { createTutorialRun } from '../tutorial/script';
import type { ScenarioStepV2 } from './runScenarioV2';

export const RELEASE_REPLAY_KINDS = [
  'campaign',
  'seeded',
  'challenge',
  'tutorial',
  'endless',
] as const;

export type ReleaseReplayKind = (typeof RELEASE_REPLAY_KINDS)[number];

export interface ReleaseReplayFixture {
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
  readonly steps: readonly ScenarioStepV2[];
}

const SEEDS: Readonly<Record<ReleaseReplayKind, string>> = {
  campaign: 'REPLAY01',
  seeded: 'REPLAY02',
  challenge: 'REPLAY03',
  tutorial: 'REPLAY04',
  endless: 'REPLAY05',
};

function contentId(family: 'deck' | 'stake' | 'challenge', ordinal: number): string {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) => candidate.family === family && candidate.ordinal === ordinal,
  );
  if (!row) throw new Error(`发布回放缺少 ${family} #${ordinal}`);
  return row.id;
}

function unlockFirstChallenge(profile: ProfileRecord): ProfileRecord {
  return {
    ...profile,
    updatedAtEpochMs: 150,
    challengeProgress: {
      ...profile.challengeProgress,
      nextAvailableOrdinal: 1,
    },
    objectives: profile.objectives.map((record) =>
      record.objectiveId === 'bxqp:objective:challenge:01'
        ? {
            ...record,
            current: record.target,
            completedAtEpochMs: 150,
            source: 'campaign' as const,
          }
        : record,
    ),
  };
}

function createRun(kind: ReleaseReplayKind, profile: ProfileRecord): RunStateV7 {
  if (kind === 'tutorial') {
    return createTutorialRun(PRODUCTION_CATALOG, profile, SEEDS.tutorial);
  }
  const deckId = contentId('deck', 1);
  const stakeId = contentId('stake', 1);
  const run = createProductionRunV7(PRODUCTION_CATALOG, {
    profileId: profile.id,
    runSequence: profile.nextRunSequence,
    runClass:
      kind === 'challenge' ? 'challenge' : kind === 'seeded' ? 'seeded' : 'campaign',
    seed: SEEDS[kind],
    deckId,
    stakeId,
    ...(kind === 'challenge' ? { challengeId: contentId('challenge', 1) } : {}),
    eligibilityObjectiveIds: selectFrozenEligibilityObjectiveIds(
      profile,
      PRODUCTION_CATALOG,
      deckId,
    ),
    discoveredContentIds: profile.collection.discoveredJokerIds,
  });
  if (kind !== 'endless') return run;
  const finisher = run.content.blinds.find(
    ({ kind: blindKind, minimumAnte }) => blindKind === 'finisher' && minimumAnte <= 8,
  );
  if (!finisher) throw new Error('发布回放缺少第八幕班主');
  return {
    ...run,
    phase: { kind: 'run-won' },
    progress: {
      ...run.progress,
      ante: 8,
      campaignWon: true,
      lineup: { ...run.progress.lineup, boss: materializeBlind(finisher) },
    },
    result: { kind: 'won', ante: 8, score: 1, reason: '发布回放胜利' },
  };
}

function regularSteps(): readonly ScenarioStepV2[] {
  return [
    {
      buildCommand: (state) => ({
        type: 'select-blind',
        checkpointId: state.checkpointId,
        position: state.progress.blindPosition,
      }),
      expectedPhase: 'round',
    },
    {
      buildCommand: (state) => {
        const cardId = state.round?.handIds.find(
          (candidate) => !state.round?.forcedSelectedCardIds.includes(candidate),
        );
        if (!cardId) throw new Error('发布回放缺少可选择手牌');
        return { type: 'toggle-card', checkpointId: state.checkpointId, cardId };
      },
      expectedPhase: 'round',
    },
  ];
}

export function createReleaseReplayFixture(
  kind: ReleaseReplayKind,
  slot: ProfileSlot = 1,
): ReleaseReplayFixture {
  const fresh = createProfile(slot, `回放-${kind}`, 100);
  const baseProfile = kind === 'challenge' ? unlockFirstChallenge(fresh) : fresh;
  const run = createRun(kind, baseProfile);
  const profile = projectRunStart(baseProfile, run, 200);
  return {
    profile,
    run,
    steps:
      kind === 'endless'
        ? [
            {
              buildCommand: (state) => ({
                type: 'enter-endless',
                checkpointId: state.checkpointId,
              }),
              expectedPhase: 'blind-select',
            },
          ]
        : regularSteps(),
  };
}
