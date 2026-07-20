import type { ProgressionNotice } from '../../progression/model';
import type {
  PresentationAudioId,
  PresentationSceneId,
} from '../assets/presentationAssets';
import type { PresentationCueV1 } from '../motion/presentationSequence';

export interface SceneAudioMix {
  readonly atmosphere: number;
  readonly percussion: number;
  readonly color: number;
}

const PROFILE_MIX: SceneAudioMix = {
  atmosphere: 1,
  percussion: 0.15,
  color: 0.55,
};
const TABLE_MIX: SceneAudioMix = {
  atmosphere: 0.85,
  percussion: 0.7,
  color: 0.45,
};
const MARKET_MIX: SceneAudioMix = {
  atmosphere: 0.95,
  percussion: 0.35,
  color: 0.8,
};
const WIN_MIX: SceneAudioMix = {
  atmosphere: 0.9,
  percussion: 0.9,
  color: 1,
};
const LOSS_MIX: SceneAudioMix = {
  atmosphere: 0.7,
  percussion: 0.05,
  color: 0.25,
};

const SCENE_MIXES = {
  'brand-curtain': PROFILE_MIX,
  'profile-ledger': PROFILE_MIX,
  'main-ensemble': PROFILE_MIX,
  'mode-rehearsal': PROFILE_MIX,
  'blind-curtain': TABLE_MIX,
  'table-stage': TABLE_MIX,
  'reward-receipt': TABLE_MIX,
  'night-market': MARKET_MIX,
  'prop-cabinet': MARKET_MIX,
  'archive-ledger': MARKET_MIX,
  'honor-ledger': PROFILE_MIX,
  'rehearsal-guide': PROFILE_MIX,
  'backstage-controls': PROFILE_MIX,
  'curtain-call': WIN_MIX,
  'empty-stage': LOSS_MIX,
} as const satisfies Record<PresentationSceneId, SceneAudioMix>;

export function sceneMixFor(sceneId: PresentationSceneId): SceneAudioMix {
  return SCENE_MIXES[sceneId];
}

export function audioIdForCue(cue: PresentationCueV1): PresentationAudioId {
  const payload = cue.payload;
  switch (payload.type) {
    case 'hand':
      return 'paper-fold';
    case 'card':
      return payload.scoring
        ? payload.pass > 1
          ? 'score-low'
          : 'card-play'
        : 'wood-tap';
    case 'source':
      if (payload.sourceKind === 'held-card') return 'card-select';
      if (payload.sourceKind === 'joker') {
        return payload.metric === 'mult-factor' || payload.metric === 'score-factor'
          ? 'score-high'
          : 'score-low';
      }
      return payload.metric === 'money' ? 'coin-receive' : 'seal-soft';
    case 'total':
      return 'seal-hard';
    case 'overflow-summary':
      return 'score-high';
    case 'blind-curtain':
      return 'curtain-open';
    case 'tag-received':
      return 'unlock';
    case 'card-selection':
      return 'card-select';
    case 'cards-reordered':
      return 'card-sweep';
    case 'cards-swept':
      return 'card-discard';
    case 'blind-cleared':
      return 'score-high';
    case 'run-failed':
      return 'stinger-loss';
    case 'reward-receipt':
      return 'coin-receive';
    case 'curtain-call':
      return 'stinger-victory';
    case 'coin-spent':
      return 'coin-spend';
    case 'coin-received':
      return 'coin-receive';
    case 'item-arrived':
      return 'purchase';
  }
}

export function audioIdForProgressionNotice(
  notice: Pick<ProgressionNotice, 'kind'>,
): PresentationAudioId {
  switch (notice.kind) {
    case 'unlock':
      return 'unlock';
    case 'discovery':
      return 'stinger-rare';
    case 'achievement':
      return 'stinger-achievement';
    case 'victory-mark':
      return 'stinger-victory';
  }
}
