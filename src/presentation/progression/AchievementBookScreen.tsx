import { showMenu } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { ACHIEVEMENT_DEFINITIONS } from '../../progression/definitions';
import { CatalogGlyph } from '../catalog/CatalogGlyph';
import { PaperLedger } from '../components/StagePrimitives';
import { formatTimestamp } from './formatTimestamp';
import styles from './ProgressionScreens.module.css';

export function AchievementBookScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  if (!profile) return null;
  const progressById = new Map(
    profile.achievements.map((record) => [record.achievementId, record]),
  );
  const completed = profile.achievements.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;

  return (
    <PaperLedger className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p>公开成就 · 已完成 {completed} / 31</p>
          <h1>百戏成就簿</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => dispatch(showMenu())}>
            返回主菜单
          </button>
        </div>
      </header>

      <div className={styles.scrollArea}>
        <div className={styles.achievementGrid}>
          {ACHIEVEMENT_DEFINITIONS.map((definition) => {
            const progress = progressById.get(definition.achievementId);
            const current = progress?.current ?? 0;
            const complete =
              progress?.completedAtEpochMs !== null && progress !== undefined;
            return (
              <article
                key={definition.achievementId}
                className={styles.achievementRow}
                data-achievement-row
                data-complete={complete}
              >
                <div className={styles.achievementHeading}>
                  <span
                    className={styles.achievementIcon}
                    data-achievement-icon={definition.iconId}
                  >
                    <CatalogGlyph focalKey={definition.iconId} />
                  </span>
                  <div>
                    <small>
                      {definition.category} · {complete ? '已经题名' : '尚待完成'}
                    </small>
                    <h3>{definition.name}</h3>
                  </div>
                </div>
                <code className={styles.achievementId}>{definition.achievementId}</code>
                <p>{definition.description}</p>
                <div
                  className={styles.progressTrack}
                  title={`${Math.min(current, definition.target)} / ${definition.target}`}
                >
                  <i
                    style={{
                      width: `${Math.min(100, (current / definition.target) * 100)}%`,
                    }}
                  />
                </div>
                <p>
                  {Math.min(current, definition.target)} / {definition.target}
                </p>
                {progress?.completedAtEpochMs !== null && progress !== undefined ? (
                  <p className={styles.completedAt}>
                    首次完成：{formatTimestamp(progress.completedAtEpochMs)}
                  </p>
                ) : (
                  <p className={styles.completedAt}>首次完成：尚未题名</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </PaperLedger>
  );
}
