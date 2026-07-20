import { acknowledgeProgressionNotices } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import styles from './ProgressionScreens.module.css';

export function ProgressionNoticeBanners() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, presentationSequence, busy } = useAppSelector(
    (state) => state.app,
  );
  const profile = profiles.find((item) => item.id === activeProfileId);
  if (!profile || presentationSequence) return null;
  const notices = profile.unreadNotices.slice(-1);
  if (notices.length === 0) return null;

  return (
    <aside className={styles.noticeBanners}>
      {notices.map((notice) => (
        <article key={notice.noticeId}>
          <div>
            <strong>{notice.title}</strong>
            <span>{notice.detail}</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void dispatch(
                acknowledgeProgressionNotices({ noticeIds: [notice.noticeId] }),
              )
            }
          >
            收讫
          </button>
        </article>
      ))}
    </aside>
  );
}
