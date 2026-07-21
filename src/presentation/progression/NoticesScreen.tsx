import { acknowledgeProgressionNotices, showMenu } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { PaperLedger } from '../components/StagePrimitives';
import styles from './ProgressionScreens.module.css';

export function NoticesScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, busy } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  if (!profile) return null;
  const empty = profile.unreadNotices.length === 0;

  const acknowledge = (noticeIds: readonly string[]) =>
    dispatch(acknowledgeProgressionNotices({ noticeIds }));

  return (
    <PaperLedger
      className={`${styles.screen} ${empty ? styles.contentHeightScreen : ''}`}
      data-layout-size={empty ? 'content' : 'full'}
    >
      <header className={styles.header}>
        <div>
          <p>最多保留 50 条未读进度摘要</p>
          <h1>戏报</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            disabled={busy || profile.unreadNotices.length === 0}
            onClick={() =>
              void acknowledge(profile.unreadNotices.map(({ noticeId }) => noticeId))
            }
          >
            全部收讫
          </button>
          <button type="button" onClick={() => dispatch(showMenu())}>
            返回主菜单
          </button>
        </div>
      </header>

      <div className={styles.scrollArea}>
        {empty ? (
          <div className={styles.emptyState}>
            <h2>暂无新戏报</h2>
            <p>新解锁、发现、成就与胜幕印记会在这里汇总。</p>
          </div>
        ) : (
          <div className={styles.noticeList}>
            {profile.unreadNotices.map((notice) => (
              <article key={notice.noticeId} className={styles.noticeRow}>
                <small>{notice.kind}</small>
                <h2>{notice.title}</h2>
                <p>{notice.detail}</p>
                <button
                  type="button"
                  className={styles.button}
                  disabled={busy}
                  onClick={() => void acknowledge([notice.noticeId])}
                >
                  收讫
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </PaperLedger>
  );
}
