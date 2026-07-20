import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';

import { IndexedDbGameRepository } from '../persistence/indexedDbRepository';
import { AchievementBookScreen } from '../presentation/progression/AchievementBookScreen';
import { CollectionScreen } from '../presentation/progression/CollectionScreen';
import { HelpReferenceScreen } from '../presentation/progression/HelpReferenceScreen';
import { MainMenuScreen } from '../presentation/progression/MainMenuScreen';
import { ModeSetupScreen } from '../presentation/progression/ModeSetupScreen';
import { NoticesScreen } from '../presentation/progression/NoticesScreen';
import { ProfileMaintenanceScreen } from '../presentation/progression/ProfileMaintenanceScreen';
import { ProgressionNoticeBanners } from '../presentation/progression/ProgressionNoticeBanners';
import { StatisticsScreen } from '../presentation/progression/StatisticsScreen';
import { TutorialCoach } from '../presentation/progression/TutorialCoach';
import { isRunStateV7 } from '../game-core/model/runV7';
import { ApplicationErrorBoundary } from './ApplicationErrorBoundary';
import { readBrowserRoute, replaceBrowserRoute } from './routeState';
import { createGameStore, type GameStore } from './store';
import {
  initializeApplication,
  showHelp,
  showMaintenance,
  showMenu,
  showProfiles,
} from './store/appSlice';
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
  const { status, error, run, setupMode } = useAppSelector((state) => state.app);
  const catalogAuditMode =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('catalog-audit');
  const catalogAudit = catalogAuditMode === '1' || catalogAuditMode === 'jokers';

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void dispatch(initializeApplication());
  }, [dispatch]);

  useEffect(() => {
    if (catalogAudit || status === 'loading') return;
    if (status === 'setup') {
      if (setupMode) replaceBrowserRoute({ status, setupMode });
      return;
    }
    replaceBrowserRoute({ status });
  }, [catalogAudit, setupMode, status]);

  return (
    <main className={styles.viewport}>
      <section className={styles.stage}>
        <StageDecor />
        {status === 'loading' ? <WelcomeStage /> : null}
        <Suspense fallback={<WelcomeStage />}>
          {catalogAudit ? (
            <CatalogAuditScreen
              ledger={catalogAuditMode === 'jokers' ? 'joker' : 'non-joker'}
            />
          ) : null}
          {!catalogAudit && status === 'profiles' ? <ProfileScreen /> : null}
          {!catalogAudit && status === 'menu' ? <MainMenuScreen /> : null}
          {!catalogAudit && status === 'setup' ? <ModeSetupScreen /> : null}
          {!catalogAudit && status === 'collection' ? <CollectionScreen /> : null}
          {!catalogAudit && status === 'achievements' ? <AchievementBookScreen /> : null}
          {!catalogAudit && status === 'statistics' ? <StatisticsScreen /> : null}
          {!catalogAudit && status === 'help' ? <HelpReferenceScreen /> : null}
          {!catalogAudit && status === 'notices' ? <NoticesScreen /> : null}
          {!catalogAudit && status === 'maintenance' ? (
            <ProfileMaintenanceScreen />
          ) : null}
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
          <>
            <button
              type="button"
              className={styles.menuNav}
              onClick={() => dispatch(showMenu())}
            >
              主菜单
            </button>
            <button
              type="button"
              className={styles.helpNav}
              onClick={() => dispatch(showHelp())}
            >
              牌型帮助
            </button>
            <button
              type="button"
              className={styles.maintenanceNav}
              onClick={() => dispatch(showMaintenance())}
            >
              档案维护
            </button>
            <button
              type="button"
              className={styles.profileNav}
              aria-label="返回戏主名簿"
              onClick={() => dispatch(showProfiles())}
            >
              戏主名簿
            </button>
          </>
        ) : null}
        {!catalogAudit &&
        status === 'playing' &&
        run &&
        isRunStateV7(run) &&
        run.sessionV7.runClass === 'tutorial' ? (
          <TutorialCoach />
        ) : null}
        {!catalogAudit && status === 'playing' ? <ProgressionNoticeBanners /> : null}
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
    () =>
      providedStore ??
      createGameStore(
        new IndexedDbGameRepository(),
        undefined,
        undefined,
        readBrowserRoute,
      ),
  );

  return (
    <Provider store={store}>
      <ApplicationErrorBoundary>
        <GameApplication />
      </ApplicationErrorBoundary>
    </Provider>
  );
}
