import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

import type { JokerPresentation } from '../selectors/jokerPresentation';
import { resolvePublicAssetUrl } from '../assets/publicAssetUrl';
import styles from './JokerArtworkInspector.module.css';

interface JokerArtworkInspectorContextValue {
  readonly open: (presentation: JokerPresentation) => void;
}

const JokerArtworkInspectorContext =
  createContext<JokerArtworkInspectorContextValue | null>(null);

export interface JokerArtworkInspectorProviderProps {
  readonly children: ReactNode;
}

export function JokerArtworkInspectorProvider({
  children,
}: JokerArtworkInspectorProviderProps) {
  const [active, setActive] = useState<JokerPresentation | null>(null);
  const open = useCallback((presentation: JokerPresentation) => {
    setActive(presentation);
  }, []);
  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [active, close]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close();
  };
  const activeAssetUrl = active ? resolvePublicAssetUrl(active.assetPath) : null;

  return (
    <JokerArtworkInspectorContext.Provider value={{ open }}>
      {children}
      <div
        className={styles.host}
        data-testid="joker-inspector-host"
        data-open={String(Boolean(active))}
      >
        {active ? (
          <div
            className={styles.backdrop}
            data-testid="joker-inspector-backdrop"
            onMouseDown={closeOnBackdrop}
          >
            <div className={styles.ambient} aria-hidden="true">
              <img src={activeAssetUrl ?? undefined} alt="" />
            </div>
            <section
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-label={`奇牌鉴赏 · ${active.name}`}
              data-rarity={active.rarity}
            >
              <div className={styles.artFrame}>
                <img
                  className={styles.art}
                  src={activeAssetUrl ?? undefined}
                  alt=""
                  data-testid="joker-inspector-art"
                  data-focal-key={active.focalKey}
                />
                <span className={styles.artIndex}>{active.contentId}</span>
              </div>
              <div className={styles.details}>
                <div className={styles.eyebrow}>
                  <span>百戏奇牌 · 珍藏画幅</span>
                  <strong>{active.rarityLabel}</strong>
                </div>
                <h2>{active.name}</h2>
                <p className={styles.description}>{active.description}</p>
                {active.currentValue ? (
                  <p className={styles.currentValue}>{active.currentValue}</p>
                ) : null}
                <q className={styles.flavor}>{active.flavor}</q>
                <button type="button" className={styles.closeButton} onClick={close}>
                  <span aria-hidden="true">收</span>
                  关闭鉴赏
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </JokerArtworkInspectorContext.Provider>
  );
}

export interface JokerArtworkTriggerProps {
  readonly presentation: JokerPresentation;
  readonly className?: string | undefined;
  readonly imageClassName?: string | undefined;
  readonly loading?: 'eager' | 'lazy' | undefined;
  readonly assetSource?: string | undefined;
}

export function JokerArtworkTrigger({
  presentation,
  className,
  imageClassName,
  loading = 'eager',
  assetSource,
}: JokerArtworkTriggerProps) {
  const inspector = useContext(JokerArtworkInspectorContext);
  if (!inspector) {
    throw new Error('JokerArtworkTrigger 必须位于 JokerArtworkInspectorProvider 内');
  }
  const assetUrl = resolvePublicAssetUrl(presentation.assetPath);

  return (
    <button
      type="button"
      className={`${styles.trigger} ${className ?? ''}`}
      aria-label={`查看 ${presentation.name} 大图`}
      onClick={() => inspector.open(presentation)}
    >
      <img
        className={imageClassName}
        src={assetUrl}
        alt=""
        loading={loading}
        data-testid={`joker-art-${presentation.contentId}`}
        data-focal-key={presentation.focalKey}
        data-asset-source={assetSource}
      />
      <span className={styles.triggerHint} aria-hidden="true">
        鉴
      </span>
    </button>
  );
}
