import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';

import { IndexedDbGameRepository } from '../persistence/indexedDbRepository';
import { ApplicationErrorBoundary } from './ApplicationErrorBoundary';
import { createGameStore, type GameStore } from './store';
import { initializeApplication, showProfiles } from './store/appSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import styles from './App.module.css';

const BlindSelectScreen = lazy(async () => ({
  default: (await import('../presentation/screens/BlindSelectScreen')).BlindSelectScreen,
}));
const ChoiceScreen = lazy(async () => ({
  default: (await import('../presentation/screens/ChoiceScreen')).ChoiceScreen,
}));
const CatalogAuditScreen = lazy(async () => ({
  default: (await import('../presentation/catalog/CatalogAuditScreen'))
    .CatalogAuditScreen,
}));
const GameTableScreen = lazy(async () => ({
  default: (await import('../presentation/screens/GameTableScreen')).GameTableScreen,
}));
const ProfileScreen = lazy(async () => ({
  default: (await import('../presentation/screens/ProfileScreen')).ProfileScreen,
}));
const RewardScreen = lazy(async () => ({
  default: (await import('../presentation/screens/RewardScreen')).RewardScreen,
}));
const ResultScreen = lazy(async () => ({
  default: (await import('../presentation/screens/ResultScreen')).ResultScreen,
}));
const RunWonScreen = lazy(async () => ({
  default: (await import('../presentation/screens/RunWonScreen')).RunWonScreen,
}));
const ShopScreen = lazy(async () => ({
  default: (await import('../presentation/screens/ShopScreen')).ShopScreen,
}));
const PresentationQueue = lazy(async () => ({
  default: (await import('../presentation/PresentationQueue')).PresentationQueue,
}));

export interface AppProps {
  readonly store?: GameStore;
}

function StageDecor() {
  return (
    <>
      <div className={styles.curtainLeft} aria-hidden="true" />
      <div className={styles.curtainRight} aria-hidden="true" />
      <div className={styles.lanterns} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </>
  );
}

function WelcomeStage() {
  return (
    <div className={styles.welcome}>
      <p className={styles.eyebrow}>午夜百戏 · 本地试玩</p>
      <div className={styles.titleSeal} aria-hidden="true">
        戏
      </div>
      <h1>百戏奇牌</h1>
      <p className={styles.tagline}>今夜开演，一手定乾坤</p>
      <div className={styles.stageLine} aria-hidden="true">
        <span>♠</span>
        <span>♥</span>
        <span>♣</span>
        <span>♦</span>
      </div>
      <p className={styles.loading}>正在支起戏台……</p>
    </div>
  );
}

function GameApplication() {
  const dispatch = useAppDispatch();
  const initialized = useRef(false);
  const { status, error, run } = useAppSelector((state) => state.app);
  const catalogAudit =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('catalog-audit') === '1';

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void dispatch(initializeApplication());
  }, [dispatch]);

  return (
    <main className={styles.viewport}>
      <section className={styles.stage}>
        <StageDecor />
        {status === 'loading' ? <WelcomeStage /> : null}
        <Suspense fallback={<WelcomeStage />}>
          {catalogAudit ? <CatalogAuditScreen /> : null}
          {!catalogAudit && status === 'profiles' ? <ProfileScreen /> : null}
          {!catalogAudit && status === 'playing' && run?.phase.kind === 'blind-select' ? (
            <BlindSelectScreen />
          ) : null}
          {!catalogAudit && status === 'playing' && run?.phase.kind === 'round' ? (
            <GameTableScreen />
          ) : null}
          {!catalogAudit && status === 'playing' && run?.phase.kind === 'round-reward' ? (
            <RewardScreen />
          ) : null}
          {!catalogAudit && status === 'playing' && run?.phase.kind === 'shop' ? (
            <ShopScreen />
          ) : null}
          {!catalogAudit && status === 'playing' && run?.phase.kind === 'choice' ? (
            <ChoiceScreen />
          ) : null}
          {!catalogAudit && status === 'playing' && run?.phase.kind === 'run-won' ? (
            <RunWonScreen />
          ) : null}
          {!catalogAudit &&
          status === 'playing' &&
          run &&
          (run.phase.kind === 'run-lost' || run.phase.kind === 'finished') ? (
            <ResultScreen />
          ) : null}
        </Suspense>
        {!catalogAudit && status === 'playing' ? (
          <button
            type="button"
            className={styles.profileNav}
            aria-label="返回戏主名簿"
            onClick={() => dispatch(showProfiles())}
          >
            戏主名簿
          </button>
        ) : null}
        <Suspense fallback={null}>
          <PresentationQueue />
        </Suspense>
        {error ? <p className={styles.errorBanner}>{error}</p> : null}
      </section>
    </main>
  );
}

export function App({ store: providedStore }: AppProps = {}) {
  const [store] = useState<GameStore>(
    () => providedStore ?? createGameStore(new IndexedDbGameRepository()),
  );

  return (
    <Provider store={store}>
      <ApplicationErrorBoundary>
        <GameApplication />
      </ApplicationErrorBoundary>
    </Provider>
  );
}
