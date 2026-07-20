import { createGameStore } from '../../src/app/store';
import {
  advancePresentationSequence,
  createLocalProfile,
  finishPresentationSequence,
  initializeApplication,
  skipPresentationSequence,
  startLocalFixtureRun,
  submitRunCommand,
} from '../../src/app/store/appSlice';
import { createMemoryRepository } from '../helpers/memoryRepository';

async function createRoundStore() {
  const store = createGameStore(createMemoryRepository());
  await store.dispatch(initializeApplication()).unwrap();
  await store
    .dispatch(createLocalProfile({ slot: 1, displayName: '朱印人', nowEpochMs: 1 }))
    .unwrap();
  await store
    .dispatch(startLocalFixtureRun({ seed: 'sequence-store', nowEpochMs: 2 }))
    .unwrap();
  const run = store.getState().app.run;
  if (!run) throw new Error('缺少牌局');
  await store
    .dispatch(
      submitRunCommand({
        type: 'select-blind',
        checkpointId: run.checkpointId,
        position: 'small',
      }),
    )
    .unwrap();
  return store;
}

describe('presentation sequence store boundary', () => {
  it('installs a sequence only with the fulfilled committed checkpoint', async () => {
    const store = await createRoundStore();
    const round = store.getState().app.run;
    const cardId = round?.round?.handIds[0];
    if (!round || !cardId) throw new Error('缺少活动回合');

    await store
      .dispatch(
        submitRunCommand({
          type: 'toggle-card',
          checkpointId: round.checkpointId,
          cardId,
        }),
      )
      .unwrap();

    const state = store.getState().app;
    expect(state.run?.round?.selectedCardIds).toEqual([cardId]);
    expect(state.presentationSequence).toMatchObject({
      checkpointId: state.run?.checkpointId,
      cursor: 0,
      cues: [{ kind: 'card-selection' }],
    });
    expect(state.presentationSequence?.sequenceId).toBe(
      `${state.run?.runId}:${String(state.run?.checkpointId)}`,
    );

    store.dispatch(advancePresentationSequence());
    expect(store.getState().app.presentationSequence).toBeNull();
  });

  it('skip and finish reveal committed state without issuing or replaying a command', async () => {
    const store = await createRoundStore();
    const round = store.getState().app.run;
    const cardId = round?.round?.handIds[0];
    if (!round || !cardId) throw new Error('缺少活动回合');
    await store
      .dispatch(
        submitRunCommand({
          type: 'toggle-card',
          checkpointId: round.checkpointId,
          cardId,
        }),
      )
      .unwrap();
    const selected = store.getState().app.run;
    if (!selected) throw new Error('缺少选牌状态');
    await store
      .dispatch(
        submitRunCommand({
          type: 'play-selected',
          checkpointId: selected.checkpointId,
        }),
      )
      .unwrap();

    const committed = structuredClone(store.getState().app.run);
    expect(store.getState().app.presentationSequence?.cues[0]?.kind).toBe('hand');
    store.dispatch(skipPresentationSequence());
    expect(store.getState().app.presentationSequence).toBeNull();
    expect(store.getState().app.run).toEqual(committed);

    store.dispatch(finishPresentationSequence());
    expect(store.getState().app.presentationSequence).toBeNull();
    expect(store.getState().app.run).toEqual(committed);
  });
});
