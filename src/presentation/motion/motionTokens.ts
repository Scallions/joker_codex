import type { PresentationSceneId } from '../assets/presentationAssets';

export type StageTransitionKind =
  'curtain' | 'ledger' | 'placard' | 'receipt' | 'folding-screen';

export const MOTION_TOKENS = {
  routineMs: 160,
  stageMs: 420,
  curtainMs: 680,
  maximumDecorativeParticles: 18,
} as const;

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
