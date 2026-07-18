import type {
  AnteLineup,
  BlindDefinition,
  MaterializedBlind,
  RunContentSnapshot,
} from '../model/runV2';
import { pickStable } from '../rng/weighted';
import type { RandomState } from '../rng/random';

export interface MaterializedAnteResult {
  readonly lineup: AnteLineup;
  readonly rngState: RandomState;
  readonly seenNormalBossIds: readonly string[];
  readonly seenFinisherBossIds: readonly string[];
}

export function materializeBlind(definition: BlindDefinition): MaterializedBlind {
  return {
    definitionId: definition.id,
    name: definition.name,
    description: definition.description,
    kind: definition.kind,
    targetMultiplier: definition.targetMultiplier,
    reward: definition.reward,
    effects: definition.effects,
  };
}

export function eligibleBosses(
  content: RunContentSnapshot,
  ante: number,
  seenIds: readonly string[],
): readonly BlindDefinition[] {
  const kind = ante % 8 === 0 ? 'finisher' : 'boss';
  const available = content.blinds.filter(
    (blind) => blind.kind === kind && blind.minimumAnte <= ante,
  );
  if (available.length === 0) throw new Error('当前幕次没有可用班主盲注');
  const unseen = available.filter((blind) => !seenIds.includes(blind.id));
  return unseen.length > 0 ? unseen : available;
}

export function materializeAnte(
  content: RunContentSnapshot,
  ante: number,
  rngState: RandomState,
  seenNormalBossIds: readonly string[],
  seenFinisherBossIds: readonly string[],
): MaterializedAnteResult {
  if (content.tags.length === 0) throw new Error('戏签池不能为空');
  const smallTag = pickStable(content.tags, (tag) => tag.id, rngState);
  const bigTag = pickStable(content.tags, (tag) => tag.id, smallTag.state);
  const finisher = ante % 8 === 0;
  const seen = finisher ? seenFinisherBossIds : seenNormalBossIds;
  const pool = eligibleBosses(content, ante, seen);
  const boss = pickStable(pool, (blind) => blind.id, bigTag.state);
  const allEligibleSeen = pool.every((blind) => seen.includes(blind.id));
  const nextSeen = allEligibleSeen ? [boss.value.id] : [...seen, boss.value.id];

  return {
    lineup: {
      smallTagId: smallTag.value.id,
      bigTagId: bigTag.value.id,
      boss: materializeBlind(boss.value),
    },
    rngState: boss.state,
    seenNormalBossIds: finisher ? seenNormalBossIds : nextSeen,
    seenFinisherBossIds: finisher ? nextSeen : seenFinisherBossIds,
  };
}

export function getBlindDefinitionForPosition(
  content: RunContentSnapshot,
  position: 'small' | 'big',
): BlindDefinition {
  const definition = content.blinds
    .filter((blind) => blind.kind === position)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (!definition) throw new Error(`缺少${position === 'small' ? '小幕' : '大幕'}盲注`);
  return definition;
}
