import { useEffect, useMemo, useState } from 'react';

import {
  generateLocalSetupSeed,
  showMenu,
  startLocalProductionRun,
} from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import {
  parseSeedInput,
  PROGRESSION_CONTENT_VERSION,
  serializeSeedCode,
  type SeedSetupPreview,
} from '../../progression/seedCode';
import {
  selectAvailableChallenges,
  selectAvailableDecks,
  selectAvailableStakesForDeck,
} from '../../progression/selectors';
import { PaperLedger } from '../components/StagePrimitives';
import styles from './ProgressionScreens.module.css';

const MODE_TITLES = {
  campaign: '普通战役设置',
  seeded: '种子牌局设置',
  challenge: '挑战模式设置',
} as const;

export function ModeSetupScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, setupMode, setupSeed, busy } = useAppSelector(
    (state) => state.app,
  );
  const profile = profiles.find((item) => item.id === activeProfileId);
  const decks = useMemo(
    () => (profile ? selectAvailableDecks(profile, PRODUCTION_CATALOG) : []),
    [profile],
  );
  const [deckSelection, setDeckSelection] = useState(() => decks[0]?.id ?? '');
  const deckId = decks.some(({ id }) => id === deckSelection)
    ? deckSelection
    : (decks[0]?.id ?? '');
  const stakes = useMemo(
    () =>
      profile ? selectAvailableStakesForDeck(profile, PRODUCTION_CATALOG, deckId) : [],
    [deckId, profile],
  );
  const [stakeSelection, setStakeSelection] = useState(() => stakes[0]?.id ?? '');
  const stakeId = stakes.some(({ id }) => id === stakeSelection)
    ? stakeSelection
    : (stakes[0]?.id ?? '');
  const challenges = useMemo(
    () => (profile ? selectAvailableChallenges(profile, PRODUCTION_CATALOG) : []),
    [profile],
  );
  const [challengeId, setChallengeId] = useState(() => challenges[0]?.id ?? '');
  const [seedOverride, setSeedOverride] = useState<string | null>(null);
  const seedInput = seedOverride ?? setupSeed ?? '';
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    if (setupSeed === null) {
      void dispatch(generateLocalSetupSeed());
    }
  }, [dispatch, setupSeed]);

  const selectedDeck = decks.find((deck) => deck.id === deckId);
  const selectedStake = stakes.find((stake) => stake.id === stakeId);
  const seedResult = useMemo(
    () =>
      parseSeedInput(
        seedInput,
        selectedDeck && selectedStake
          ? {
              deckReference: selectedDeck.referenceIndex,
              stakeReference: selectedStake.referenceIndex,
            }
          : null,
      ),
    [seedInput, selectedDeck, selectedStake],
  );
  const seedPreview: SeedSetupPreview | null = seedResult.ok ? seedResult.preview : null;
  const previewDeck = seedPreview
    ? decks.find(({ id }) => id === seedPreview.deckId)
    : undefined;
  const previewStakes =
    seedPreview && profile
      ? selectAvailableStakesForDeck(profile, PRODUCTION_CATALOG, seedPreview.deckId)
      : [];
  const previewStake = seedPreview
    ? previewStakes.find(({ id }) => id === seedPreview.stakeId)
    : undefined;
  const previewDeckAllowed = previewDeck !== undefined;
  const previewStakeAllowed = previewStake !== undefined;
  const canonicalCode = seedPreview ? serializeSeedCode(seedPreview) : null;

  if (!profile || !setupMode) return null;

  const startRun = () => {
    setLocalMessage(null);
    if (setupMode === 'challenge') {
      if (!challengeId) {
        setLocalMessage('当前没有可用挑战');
        return;
      }
      void dispatch(
        startLocalProductionRun({
          runClass: 'challenge',
          challengeId,
          seed: setupSeed ?? '',
        }),
      );
      return;
    }
    if (!seedPreview) {
      setLocalMessage(seedResult.ok ? '种子设置无效' : seedResult.message);
      return;
    }
    if (!previewDeckAllowed || !previewStakeAllowed) {
      setLocalMessage('分享码中的牌组或筹码等级尚未解锁');
      return;
    }
    void dispatch(
      startLocalProductionRun({
        runClass: setupMode,
        deckId: seedPreview.deckId,
        stakeId: seedPreview.stakeId,
        seed: seedPreview.seed,
      }),
    );
  };

  const selectedChallenge = challenges.find((challenge) => challenge.id === challengeId);

  return (
    <PaperLedger className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p>{profile.displayName} · 仅显示本档已开放内容</p>
          <h1>{MODE_TITLES[setupMode]}</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => dispatch(showMenu())}>
            返回主菜单
          </button>
        </div>
      </header>

      <div className={styles.setupPanel}>
        {setupMode === 'challenge' ? (
          <>
            <label>
              已开放挑战
              <select
                value={challengeId}
                onChange={(event) => setChallengeId(event.target.value)}
              >
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.referenceIndex} · {challenge.displayName}
                  </option>
                ))}
              </select>
            </label>
            <article className={styles.setupPreview}>
              <small>{selectedChallenge?.referenceIndex ?? '尚未开放'}</small>
              <h2>{selectedChallenge?.displayName ?? '暂无挑战'}</h2>
              <p>{selectedChallenge?.description ?? '赢得普通战役后将依次开放挑战。'}</p>
              <p>挑战使用固定规则，不推进普通收藏与统计，也不能进入无尽模式。</p>
              <div className={styles.setupFacts}>
                <span>固定设置：D01 / S01</span>
                <span>种子：{setupSeed ?? '生成中'}</span>
                <span>内容版本：{PROGRESSION_CONTENT_VERSION}</span>
              </div>
            </article>
          </>
        ) : (
          <>
            <div className={styles.formGrid}>
              <label>
                牌组
                <select
                  value={deckId}
                  onChange={(event) => setDeckSelection(event.target.value)}
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.referenceIndex} · {deck.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                筹码等级
                <select
                  value={stakeId}
                  onChange={(event) => setStakeSelection(event.target.value)}
                >
                  {stakes.map((stake) => (
                    <option key={stake.id} value={stake.id}>
                      {stake.referenceIndex} · {stake.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {setupMode === 'seeded' ? '种子或分享码' : '演出种子'}
                <input
                  value={seedInput}
                  onChange={(event) => setSeedOverride(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setSeedOverride(null);
                  void dispatch(generateLocalSetupSeed());
                }}
              >
                换一个种子
              </button>
            </div>
            <article className={styles.setupPreview}>
              <small>{setupMode === 'seeded' ? '可复演设置预览' : '本场设置预览'}</small>
              <h2>
                {seedPreview?.deckReference ?? '—'} / {seedPreview?.stakeReference ?? '—'}
              </h2>
              {canonicalCode ? <code>{canonicalCode}</code> : null}
              <div className={styles.setupFacts}>
                <span>
                  牌组：{seedPreview?.deckReference ?? '—'} ·{' '}
                  {previewDeck?.displayName ?? '未知'}
                </span>
                <span>
                  筹码：{seedPreview?.stakeReference ?? '—'} ·{' '}
                  {previewStake?.displayName ?? '未知'}
                </span>
                <span>种子：{seedPreview?.seed ?? '—'}</span>
                <span>内容版本：{PROGRESSION_CONTENT_VERSION}</span>
              </div>
              <p>
                {seedResult.ok
                  ? setupMode === 'seeded'
                    ? '种子牌局使用相同随机序列，不推进普通进度。'
                    : '普通战役会推进解锁、收藏、成就与统计。'
                  : seedResult.message}
              </p>
              {canonicalCode ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    void navigator.clipboard?.writeText(canonicalCode);
                    setLocalMessage('分享码已复制');
                  }}
                >
                  复制分享码
                </button>
              ) : null}
            </article>
          </>
        )}

        {localMessage ? <p className={styles.localMessage}>{localMessage}</p> : null}
        <div className={styles.setupActions}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={
              busy ||
              (setupMode === 'challenge'
                ? !challengeId || !setupSeed
                : !seedPreview || !previewDeckAllowed || !previewStakeAllowed)
            }
            onClick={startRun}
          >
            {setupMode === 'campaign'
              ? '开始普通战役'
              : setupMode === 'seeded'
                ? '开始种子牌局'
                : '开始挑战'}
          </button>
        </div>
      </div>
    </PaperLedger>
  );
}
