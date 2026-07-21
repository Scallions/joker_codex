// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { CatalogEmblem } from '../../src/presentation/catalog/CatalogEmblem';
import { selectCatalogArtwork } from '../../src/presentation/selectors/catalogArtwork';

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

  it('只为生产非奇牌与补充包返回预索引的本地素材', () => {
    const tarot = PRODUCTION_CATALOG.rows.find(({ family }) => family === 'tarot');
    const booster = PRODUCTION_CATALOG.rows.find(({ family }) => family === 'booster');
    const joker = PRODUCTION_CATALOG.rows.find(({ family }) => family === 'joker');
    if (!tarot || !booster || !joker) throw new Error('生产目录家族不完整');

    expect(selectCatalogArtwork(tarot.id)).toMatchObject({
      contentId: tarot.id,
      family: 'tarot',
      source: 'project-svg',
    });
    expect(selectCatalogArtwork(booster.id)).toMatchObject({
      contentId: booster.id,
      family: 'booster',
      source: 'project-svg',
    });
    expect(selectCatalogArtwork(joker.id)).toBeNull();
    expect(selectCatalogArtwork('fixture:embedded:item')).toBeNull();
  });
});
