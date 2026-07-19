// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CatalogAuditScreen } from '../../src/presentation/catalog/CatalogAuditScreen';

describe('奇牌图鉴总账', () => {
  it('分页可达 50 张本地插画并保留独立焦点、规则和风味', async () => {
    const user = userEvent.setup();
    render(<CatalogAuditScreen ledger="joker" />);
    const ids = new Set<string>();
    const focalKeys = new Set<string>();
    expect(screen.getByText('第一声锣，总要有人接住。')).toBeInTheDocument();

    for (;;) {
      const cards = screen.getAllByTestId('catalog-card');
      expect(cards).toHaveLength(10);
      for (const card of cards) {
        ids.add(card.getAttribute('data-content-id') ?? '');
        const image = card.querySelector('img');
        expect(image?.getAttribute('src')).toMatch(/^\/assets\/jokers\/\d{3}\.webp$/);
        expect(card.querySelector('.catalog-glyph')).toBeNull();
        focalKeys.add(image?.getAttribute('data-focal-key') ?? '');
      }
      const next = screen.getByRole('button', { name: '下一页' });
      if (next.hasAttribute('disabled')) break;
      await user.click(next);
    }

    expect(ids.size).toBe(50);
    expect(focalKeys.size).toBe(50);
  });

  it('可分别按班目与稀有度筛选，不改变非玩法分组语义', async () => {
    const user = userEvent.setup();
    render(<CatalogAuditScreen ledger="joker" />);

    await user.click(screen.getByRole('button', { name: '面具幻术' }));
    expect(screen.getByText('面具幻术 · 10 项')).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('catalog-card')
        .every((card) => card.getAttribute('data-ensemble') === 'mask-illusion'),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: '全部班目' }));
    await user.click(screen.getByRole('button', { name: '少见' }));
    expect(screen.getByText('全部班目 · 少见 · 14 项')).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('catalog-card')
        .every((card) => card.getAttribute('data-rarity') === 'uncommon'),
    ).toBe(true);
  });
});
