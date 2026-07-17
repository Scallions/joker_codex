import { useEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';

import { IndexedDbGameRepository } from '../persistence/indexedDbRepository';
import { GameTableScreen } from '../presentation/screens/GameTableScreen';
import { ProfileScreen } from '../presentation/screens/ProfileScreen';
import { ResultScreen } from '../presentation/screens/ResultScreen';
import { ShopScreen } from '../presentation/screens/ShopScreen';
import { PresentationQueue } from '../presentation/PresentationQueue';
import { ApplicationErrorBoundary } from './ApplicationErrorBoundary';
import { createGameStore, type GameStore } from './store';
import { initializeApplication } from './store/appSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import styles from './App.module.css';

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
        {status === 'profiles' ? <ProfileScreen /> : null}
        {status === 'playing' && run?.phase === 'round' ? <GameTableScreen /> : null}
        {status === 'playing' && run?.phase === 'shop' ? <ShopScreen /> : null}
        {status === 'playing' && run && (run.phase === 'won' || run.phase === 'lost') ? (
          <ResultScreen />
        ) : null}
        <PresentationQueue />
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
