import {
  showHelp,
  showMaintenance,
  showMenu,
  showProfiles,
} from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { isRunStateV7 } from '../../game-core/model/runV7';
import { ProgressionNoticeBanners } from '../progression/ProgressionNoticeBanners';
import { TutorialCoach } from '../progression/TutorialCoach';
import { SealButton } from './StagePrimitives';
import styles from './PlayingStageChrome.module.css';

export function PlayingStageChrome() {
  const dispatch = useAppDispatch();
  const run = useAppSelector((state) => state.app.run);
  const tutorialActive =
    run !== null && isRunStateV7(run) && run.sessionV7.runClass === 'tutorial';

  return (
    <div className={styles.chrome}>
      <div className={styles.status} data-layout-zone="playing-status">
        {tutorialActive ? <TutorialCoach /> : <ProgressionNoticeBanners />}
      </div>
      <nav
        className={styles.navigation}
        data-layout-zone="playing-navigation"
        aria-label="牌局导航"
      >
        <SealButton tone="jade" onClick={() => dispatch(showMenu())}>
          主菜单
        </SealButton>
        <SealButton tone="jade" onClick={() => dispatch(showHelp())}>
          牌型帮助
        </SealButton>
        <SealButton tone="jade" onClick={() => dispatch(showMaintenance())}>
          档案维护
        </SealButton>
        <SealButton
          tone="jade"
          aria-label="返回戏主名簿"
          onClick={() => dispatch(showProfiles())}
        >
          戏主名簿
        </SealButton>
      </nav>
    </div>
  );
}
