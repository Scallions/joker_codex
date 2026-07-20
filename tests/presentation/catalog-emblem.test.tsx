// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';

import { CatalogEmblem } from '../../src/presentation/catalog/CatalogEmblem';

describe('目录徽记', () => {
  it('本地 SVG 解码失败时只显示同家族后备印记', () => {
    render(
      <CatalogEmblem
        family="planet"
        assetPath="/assets/catalog/planet/p01.svg"
        focalKey="catalog-planet-p01"
      />,
    );

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('catalog-emblem-fallback')).toHaveAttribute(
      'data-family',
      'planet',
    );
  });
});
