// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { selectStageScene } from '../../src/app/selectStageScene';
import { StageShell } from '../../src/presentation/components/StageShell';

describe('stage scene selection', () => {
  it.each([
    ['loading', undefined, 'brand-curtain'],
    ['profiles', undefined, 'profile-ledger'],
    ['menu', undefined, 'main-ensemble'],
    ['setup', undefined, 'mode-rehearsal'],
    ['collection', undefined, 'archive-ledger'],
    ['achievements', undefined, 'honor-ledger'],
    ['statistics', undefined, 'honor-ledger'],
    ['help', undefined, 'rehearsal-guide'],
    ['notices', undefined, 'backstage-controls'],
    ['maintenance', undefined, 'backstage-controls'],
    ['playing', 'blind-select', 'blind-curtain'],
    ['playing', 'round', 'table-stage'],
    ['playing', 'round-reward', 'reward-receipt'],
    ['playing', 'shop', 'night-market'],
    ['playing', 'choice', 'prop-cabinet'],
    ['playing', 'run-won', 'curtain-call'],
    ['playing', 'run-lost', 'empty-stage'],
    ['playing', 'finished', 'empty-stage'],
  ] as const)('maps %s / %s to %s', (status, phaseKind, expected) => {
    expect(selectStageScene(status, phaseKind)).toBe(expected);
  });

  it('loads only the current local scene and preserves the CSS fallback on failure', () => {
    const { container } = render(
      <StageShell sceneId="night-market" showGlobalControls={false}>
        <p>商店内容</p>
      </StageShell>,
    );

    const scene = screen.getByTestId('stage-scene-night-market');
    expect(scene).toHaveAttribute('src', '/assets/presentation/scenes/night-market.webp');
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(
      container.querySelector('[data-transition-kind="folding-screen"]'),
    ).toHaveAttribute('data-scene-id', 'night-market');
    expect(screen.getByText('商店内容')).toBeInTheDocument();

    fireEvent.error(scene);
    expect(scene).toHaveAttribute('data-load-state', 'failed');
    expect(screen.getByText('商店内容')).toBeInTheDocument();
  });

  it('exposes the selected full or brisk motion profile on the fixed stage', () => {
    const { container, rerender } = render(
      <StageShell presentationSpeed="brisk" showGlobalControls={false}>
        <p>利落演出</p>
      </StageShell>,
    );

    expect(container.querySelector('section')).toHaveAttribute(
      'data-presentation-speed',
      'brisk',
    );

    rerender(
      <StageShell presentationSpeed="full" showGlobalControls={false}>
        <p>完整演出</p>
      </StageShell>,
    );
    expect(container.querySelector('section')).toHaveAttribute(
      'data-presentation-speed',
      'full',
    );
  });
});
