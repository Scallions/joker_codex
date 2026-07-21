import type { PresentationSceneId } from '../assets/presentationAssets';
import type { PresentationSpeed } from '../../persistence/deviceSettings';

export type StageTransitionKind =
  'curtain' | 'ledger' | 'placard' | 'receipt' | 'folding-screen';

export const MOTION_TOKENS = {
  routineMs: 160,
  stageMs: 420,
  curtainMs: 680,
  maximumDecorativeParticles: 18,
} as const;

export interface MotionProfile {
  readonly routineMs: number;
  readonly stageMs: number;
  readonly curtainMs: number;
  readonly staggerMs: number;
  readonly spring: {
    readonly stiffness: number;
    readonly damping: number;
  };
}

export const MOTION_PROFILES = {
  full: {
    routineMs: 160,
    stageMs: 420,
    curtainMs: 680,
    staggerMs: 40,
    spring: { stiffness: 430, damping: 28 },
  },
  brisk: {
    routineMs: 55,
    stageMs: 140,
    curtainMs: 225,
    staggerMs: 14,
    spring: { stiffness: 520, damping: 34 },
  },
} as const satisfies Record<PresentationSpeed, MotionProfile>;

export function motionProfileForSpeed(speed: PresentationSpeed): MotionProfile {
  return MOTION_PROFILES[speed];
}

const STAGE_TRANSITION_BY_SCENE = {
  'brand-curtain': 'curtain',
  'profile-ledger': 'ledger',
  'main-ensemble': 'placard',
  'mode-rehearsal': 'ledger',
  'blind-curtain': 'curtain',
  'table-stage': 'placard',
  'reward-receipt': 'receipt',
  'night-market': 'folding-screen',
  'prop-cabinet': 'folding-screen',
  'archive-ledger': 'ledger',
  'honor-ledger': 'ledger',
  'rehearsal-guide': 'ledger',
  'backstage-controls': 'ledger',
  'curtain-call': 'curtain',
  'empty-stage': 'curtain',
} as const satisfies Record<PresentationSceneId, StageTransitionKind>;

export function transitionKindForScene(
  sceneId: PresentationSceneId,
): StageTransitionKind {
  return STAGE_TRANSITION_BY_SCENE[sceneId];
}
