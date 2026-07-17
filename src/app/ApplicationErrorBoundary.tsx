import { Component, type ReactNode } from 'react';

import styles from './App.module.css';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
}

export class ApplicationErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className={styles.crashFallback}>
        <p>戏台布景出了岔子，本地档案没有被改动。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新支起戏台
        </button>
      </main>
    );
  }
}
