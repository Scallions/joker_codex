import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

import { clearPresentationEvents, consumePresentationEvent } from '../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import type { PresentationEventV2 } from '../game-core/commands/typesV2';
import styles from './PresentationQueue.module.css';

function eventLabel(event: PresentationEventV2): string {
  switch (event.type) {
    case 'blind-curtain':
      return `开幕 · ${event.name}`;
    case 'tag-received':
      return `戏签 · ${event.name}`;
    case 'card-selection':
      return '选牌落定';
    case 'cards-swept':
      return `扫去 ${String(event.cardIds.length)} 张牌`;
    case 'hand-reveal':
      return `揭晓 · ${event.name}`;
    case 'score-stamp':
      return `朱印 +${String(event.score)}`;
    case 'blind-cleared':
      return '盲注已破';
    case 'run-failed':
      return '锣声暂止';
    case 'cards-reordered':
      return event.mode === 'rank' ? '按点数理牌' : '按花色理牌';
    case 'coin-spent':
      return `支出 ¥${String(event.amount)}`;
    case 'item-arrived':
      return '奇货入箱';
    case 'coin-received':
      return `收入 ¥${String(event.amount)}`;
    case 'curtain-call':
      return '今夜谢幕';
    case 'reward-receipt':
      return `赏银 ¥${String(event.amount)}`;
  }
}

export function PresentationQueue() {
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) => state.app.presentationEvents[0]);

  useEffect(() => {
    if (!event) return undefined;
    const timer = window.setTimeout(() => dispatch(consumePresentationEvent()), 240);
    return () => window.clearTimeout(timer);
  }, [dispatch, event]);

  return (
    <AnimatePresence mode="wait">
      {event ? (
        <motion.button
          type="button"
          className={styles.cue}
          key={JSON.stringify(event)}
          aria-label="跳过演出提示"
          title="点击跳过本次演出提示"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          onClick={() => dispatch(clearPresentationEvents())}
        >
          <span>百戏报幕</span>
          <strong>{eventLabel(event)}</strong>
          <em>点击略过</em>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
