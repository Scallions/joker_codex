import type { RunPhaseStateV2 } from '../game-core/model/runV2';
import type { PresentationSceneId } from '../presentation/assets/presentationAssets';
import type { AppStatus } from './store/appSlice';

type RunPhaseKind = RunPhaseStateV2['kind'];

const NON_PLAYING_SCENES = {
  loading: 'brand-curtain',
  profiles: 'profile-ledger',
  menu: 'main-ensemble',
  setup: 'mode-rehearsal',
  collection: 'archive-ledger',
  achievements: 'honor-ledger',
  statistics: 'honor-ledger',
  help: 'rehearsal-guide',
  notices: 'backstage-controls',
  maintenance: 'backstage-controls',
} as const satisfies Record<Exclude<AppStatus, 'playing'>, PresentationSceneId>;

const PLAYING_SCENES = {
  'blind-select': 'blind-curtain',
  round: 'table-stage',
  'round-reward': 'reward-receipt',
  shop: 'night-market',
  choice: 'prop-cabinet',
  'run-won': 'curtain-call',
  'run-lost': 'empty-stage',
  finished: 'empty-stage',
} as const satisfies Record<RunPhaseKind, PresentationSceneId>;

export function selectStageScene(
  status: AppStatus,
  phaseKind?: RunPhaseKind,
): PresentationSceneId {
  if (status !== 'playing') return NON_PLAYING_SCENES[status];
  return phaseKind ? PLAYING_SCENES[phaseKind] : 'table-stage';
}
