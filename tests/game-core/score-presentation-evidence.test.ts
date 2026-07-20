import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import { materializeBlind } from '../../src/game-core/rules/ante';

describe('typed score presentation evidence', () => {
  it('records hand, each card pass, ordered score sources and exact total beside arithmetic', () => {
    const state = createRunEconomyFixtureRun({
      seed: 'typed-score-evidence',
      startingJokerContentIds: [
        'fixture:run-economy:item:joker:echo',
        'fixture:run-economy:item:joker:brass-drum',
        'fixture:run-economy:item:joker:double-mask',
      ],
    });
    const ace = state.deck.cards.find(
      (card) => card.suit === 'spades' && card.rank === 'ace',
    );
    if (!ace) throw new Error('缺少黑桃 A');

    const result = resolveHandScoreV2(state, [ace]);
    if (!result.ok) throw new Error(result.message);

    expect(result.evidence.version).toBe(1);
    expect(result.evidence.cues).toEqual([
      {
        type: 'hand',
        handType: 'high-card',
        name: '高牌',
        level: 1,
        baseChips: 5,
        baseMultiplier: 1,
      },
      { type: 'card', cardId: ace.id, pass: 1, chips: 11, scoring: true },
      { type: 'card', cardId: ace.id, pass: 2, chips: 11, scoring: true },
      expect.objectContaining({
        type: 'source',
        sourceKind: 'joker',
        metric: 'mult-add',
        value: 4,
        repeatCount: 1,
      }),
      expect.objectContaining({
        type: 'source',
        sourceKind: 'joker',
        metric: 'mult-factor',
        value: 2,
        repeatCount: 1,
      }),
      { type: 'total', chips: 27, multiplier: 10, score: 270 },
    ]);
    expect(result.breakdown.trace).toContain(`card:${ace.id}:chips+11`);
  });

  it('represents a debuffed scoring card without inventing contribution', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'typed-debuff-evidence' });
    const definition = initial.content.blinds.find(
      ({ id }) => id === 'fixture:run-economy:blind:red-curtain',
    );
    const heart = initial.deck.cards.find(({ suit }) => suit === 'hearts');
    if (!definition || !heart) throw new Error('缺少红幕班主夹具');
    const state = {
      ...initial,
      progress: {
        ...initial.progress,
        blindPosition: 'boss' as const,
        lineup: { ...initial.progress.lineup, boss: materializeBlind(definition) },
      },
    };
    const selected = executeCommandV2(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'boss',
    });
    if (!selected.ok) throw new Error(selected.rejection.message);

    const result = resolveHandScoreV2(selected.state, [heart]);
    if (!result.ok) throw new Error(result.message);
    expect(result.evidence.cues).toContainEqual({
      type: 'card',
      cardId: heart.id,
      pass: 1,
      chips: 0,
      scoring: false,
    });
    expect(result.evidence.cues.at(-1)).toEqual({
      type: 'total',
      chips: 5,
      multiplier: 1,
      score: 5,
    });
  });

  it('emits one transient score-performance event without storing evidence in run state', () => {
    let state = createRunEconomyFixtureRun({
      seed: 'typed-command-evidence',
      targetScaleBasisPoints: 1,
    });
    const selectedBlind = executeCommandV2(state, {
      type: 'select-blind',
      checkpointId: state.checkpointId,
      position: 'small',
    });
    if (!selectedBlind.ok) throw new Error(selectedBlind.rejection.message);
    state = selectedBlind.state;
    const cardId = state.round?.handIds[0];
    if (!cardId) throw new Error('缺少手牌');
    const selectedCard = executeCommandV2(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId,
    });
    if (!selectedCard.ok) throw new Error(selectedCard.rejection.message);

    const played = executeCommandV2(selectedCard.state, {
      type: 'play-selected',
      checkpointId: selectedCard.state.checkpointId,
    });
    if (!played.ok) throw new Error(played.rejection.message);
    const scoreEvent = played.presentationEvents[0];

    expect(scoreEvent?.type).toBe('score-performance');
    if (scoreEvent?.type !== 'score-performance') return;
    expect(scoreEvent.evidence.cues.at(-1)).toEqual(
      expect.objectContaining({
        type: 'total',
        score: played.state.lastHand?.score,
      }),
    );
    expect(scoreEvent.evidence.cues.some((cue) => 'trace' in cue)).toBe(false);
    expect(JSON.stringify(played.state)).not.toMatch(
      /"(?:score-performance|evidence|cues)":/,
    );
  });
});
