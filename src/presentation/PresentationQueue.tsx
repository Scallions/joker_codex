import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';

import {
  advancePresentationSequence,
  finishPresentationSequence,
  skipPresentationSequence,
} from '../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../app/store/hooks';
import { ScoreSealPerformance } from './motion/ScoreSealPerformance';
import styles from './PresentationQueue.module.css';

interface PerformerBoundaryProps {
  readonly children: ReactNode;
  readonly sequenceId: string;
  readonly onFailure: () => void;
}

interface PerformerBoundaryState {
  readonly failedSequenceId: string | null;
}

class PerformerBoundary extends Component<
  PerformerBoundaryProps,
  PerformerBoundaryState
> {
  public state: PerformerBoundaryState = { failedSequenceId: null };

  public static getDerivedStateFromError(): PerformerBoundaryState {
    return { failedSequenceId: 'failed' };
  }

  public componentDidCatch() {
    this.setState({ failedSequenceId: this.props.sequenceId });
    this.props.onFailure();
  }

  public componentDidUpdate(previous: PerformerBoundaryProps) {
    if (
      previous.sequenceId !== this.props.sequenceId &&
      this.state.failedSequenceId !== null
    ) {
      this.setState({ failedSequenceId: null });
    }
  }

  public render() {
    if (this.state.failedSequenceId !== null) return null;
    return this.props.children;
  }
}

export function PresentationQueue() {
  const dispatch = useAppDispatch();
  const [warning, setWarning] = useState<string | null>(null);
  const { presentationSequence, settings, settingsOpen } = useAppSelector(
    (state) => state.app,
  );
  const advance = useCallback(() => dispatch(advancePresentationSequence()), [dispatch]);
  const finish = useCallback(() => dispatch(finishPresentationSequence()), [dispatch]);
  const skip = useCallback(() => dispatch(skipPresentationSequence()), [dispatch]);
  const fail = useCallback(() => {
    setWarning('演出布景已安全略过；牌局结果与本地档案均已落定。');
    dispatch(finishPresentationSequence());
  }, [dispatch]);

  useEffect(() => {
    if (!warning) return;
    const timeout = window.setTimeout(() => setWarning(null), 5_000);
    return () => window.clearTimeout(timeout);
  }, [warning]);

  if (!presentationSequence) {
    return warning ? <p className={styles.warning}>{warning}</p> : null;
  }
  const current = presentationSequence.cues[presentationSequence.cursor];
  if (!current) return null;

  return (
    <PerformerBoundary sequenceId={presentationSequence.sequenceId} onFailure={fail}>
      <ScoreSealPerformance
        sequence={presentationSequence}
        speed={settings.presentationSpeed}
        paused={settingsOpen}
        onAdvance={advance}
        onFinish={finish}
        onSkip={skip}
      />
    </PerformerBoundary>
  );
}
