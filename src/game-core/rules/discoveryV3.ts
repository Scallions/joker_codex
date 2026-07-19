import { isRunStateV3 } from '../model/runV3';
import type { RunStateV2 } from '../model/runV2';

export const JOKER_DISCOVERY_OBSERVATION_KEY = 'catalog-first-acquisition' as const;

/** Record run-local discovery evidence without making discovery an offer gate. */
export function recordFirstAcquisitionDiscoveryV3(
  state: RunStateV2,
  contentId: string,
  sourceInstanceId: string,
  checkpointId = state.checkpointId,
): RunStateV2 {
  if (!isRunStateV3(state)) return state;
  const row = state.productionContentV3.rows.find(
    ({ definition }) => definition.id === contentId,
  )?.definition;
  if (row?.family !== 'joker' || row.discovery.kind !== 'first-acquisition') {
    return state;
  }
  const alreadyDiscovered = state.history.effectObservations.some(
    ({ key, value }) => key === JOKER_DISCOVERY_OBSERVATION_KEY && value === contentId,
  );
  if (alreadyDiscovered) return state;
  return {
    ...state,
    history: {
      ...state.history,
      effectObservations: [
        ...state.history.effectObservations,
        {
          window: 'item-acquired',
          key: JOKER_DISCOVERY_OBSERVATION_KEY,
          value: contentId,
          sourceInstanceId,
          effectId: `discovery:${contentId}`,
          checkpointId,
        },
      ],
    },
  };
}
