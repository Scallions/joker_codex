import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import {
  resumeRun,
  showAchievements,
  showCollection,
  showHelp,
  showMaintenance,
  showModeSetup,
  showNotices,
  showProfiles,
  showStatistics,
  skipActiveTutorial,
  startLocalProductionRun,
} from '../../app/store/appSlice';
import { selectAvailableChallenges } from '../../progression/selectors';
import { TUTORIAL_FIXED_SEED } from '../../tutorial/script';
import { LacquerPanel } from '../components/StagePrimitives';
import styles from './ProgressionScreens.module.css';

export function MainMenuScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, busy, run } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  if (!profile) return null;
  const challenges = selectAvailableChallenges(profile, PRODUCTION_CATALOG);
  const completedAchievements = profile.achievements.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
  const completedObjectives = profile.objectives.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
  const tutorialPromptPending = profile.tutorial.status === 'not-started';
  const startTutorial = () =>
    dispatch(
      startLocalProductionRun({
        runClass: 'tutorial',
        seed: TUTORIAL_FIXED_SEED,
      }),
    );

  return (
    <LacquerPanel
      className={`${styles.screen} ${styles.contentHeightScreen}`}
      data-layout-size="content"
    >
      <header className={styles.header}>
        <div>
          <p>
            {profile.displayName} · 第 {profile.slot} 档
          </p>
          <h1>今晚演哪一出</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => dispatch(showProfiles())}>
            切换档案
          </button>
          <button type="button" onClick={() => dispatch(showNotices())}>
            戏报 {profile.unreadNotices.length}
          </button>
        </div>
      </header>

      <div className={styles.menuGrid}>
        {run ? (
          <button
            type="button"
            aria-label="继续牌局"
            className={styles.menuCard}
            disabled={busy}
            onClick={() => dispatch(resumeRun())}
          >
            <strong>继续牌局</strong>
            <span>回到检查点 #{run.checkpointId}，牌局状态已经自动保存。</span>
          </button>
        ) : null}
        <button
          type="button"
          aria-label="普通战役"
          className={styles.menuCard}
          disabled={busy || Boolean(run) || tutorialPromptPending}
          onClick={() => dispatch(showModeSetup('campaign'))}
        >
          <strong>普通战役</strong>
          <span>选择已解锁牌组与筹码等级，推进全部档案进度。</span>
        </button>
        <button
          type="button"
          aria-label="种子牌局"
          className={styles.menuCard}
          disabled={busy || Boolean(run) || tutorialPromptPending}
          onClick={() => dispatch(showModeSetup('seeded'))}
        >
          <strong>种子牌局</strong>
          <span>复演相同随机序列，可复制分享码，不推进普通进度。</span>
        </button>
        <button
          type="button"
          aria-label="挑战模式"
          className={styles.menuCard}
          disabled={
            busy || Boolean(run) || tutorialPromptPending || challenges.length === 0
          }
          onClick={() => dispatch(showModeSetup('challenge'))}
        >
          <strong>挑战模式</strong>
          <span>
            {challenges.length > 0
              ? `已有 ${challenges.length} 项可选`
              : '赢得普通战役后开放'}
          </span>
        </button>
        <button
          type="button"
          aria-label={profile.tutorial.status === 'not-started' ? '入门教程' : '重温教程'}
          className={styles.menuCard}
          disabled={busy || Boolean(run)}
          onClick={() => void startTutorial()}
        >
          <strong>
            {profile.tutorial.status === 'not-started' ? '入门教程' : '重温教程'}
          </strong>
          <span>八步实机引导；教程行为不改变普通收藏与统计。</span>
        </button>
        <button
          type="button"
          aria-label="百戏图鉴"
          className={styles.menuCard}
          onClick={() => dispatch(showCollection())}
        >
          <strong>百戏图鉴</strong>
          <span>查看 380 项内容、解锁条件与奇牌胜幕印记。</span>
        </button>
        <button
          type="button"
          aria-label="百戏成就簿"
          className={styles.menuCard}
          onClick={() => dispatch(showAchievements())}
        >
          <strong>百戏成就簿</strong>
          <span>六类共 31 项公开成就，没有隐藏条目。</span>
        </button>
        <button
          type="button"
          aria-label="统计账册"
          className={styles.menuCard}
          onClick={() => dispatch(showStatistics())}
        >
          <strong>统计账册</strong>
          <span>战役、牌型、经济与挑战记录全部本地保存。</span>
        </button>
        <button
          type="button"
          aria-label="牌型与术语"
          className={styles.menuCard}
          onClick={() => dispatch(showHelp())}
        >
          <strong>牌型与术语</strong>
          <span>十二种牌型、基础筹码倍率与稳定中文术语。</span>
        </button>
        <button
          type="button"
          aria-label="档案维护"
          className={styles.menuCard}
          onClick={() => dispatch(showMaintenance())}
        >
          <strong>档案维护</strong>
          <span>导入、导出、重置、恢复与永久删除。</span>
        </button>
      </div>

      <div className={styles.summaryStrip}>
        <div>
          <span>普通胜场</span>
          <strong>{profile.statistics.campaignWins}</strong>
        </div>
        <div>
          <span>内容目标</span>
          <strong>{completedObjectives} / 78</strong>
        </div>
        <div>
          <span>发现奇牌</span>
          <strong>{profile.collection.discoveredJokerIds.length} / 150</strong>
        </div>
        <div>
          <span>成就</span>
          <strong>{completedAchievements} / 31</strong>
        </div>
      </div>

      {tutorialPromptPending ? (
        <aside className={styles.tutorialPrompt} role="dialog" aria-modal="true">
          <small>初次登台</small>
          <h2>要先走一遍八步入门吗？</h2>
          <p>
            教程使用一局固定小盲注和夜市，带你完成选牌、计分、弃牌、买奇牌、拆包与使用消耗牌；不会改变普通进度。
          </p>
          <div className={styles.inlineActions}>
            <button type="button" disabled={busy} onClick={() => void startTutorial()}>
              开始八步教程
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void dispatch(skipActiveTutorial({}))}
            >
              暂时跳过教程
            </button>
          </div>
        </aside>
      ) : null}
    </LacquerPanel>
  );
}
