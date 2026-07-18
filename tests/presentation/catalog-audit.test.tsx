// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CatalogAuditScreen } from '../../src/presentation/catalog/CatalogAuditScreen';

describe('生产目录审计界面', () => {
  it('分页可达全部 230 项且每项使用本地素材与独立焦点', async () => {
    const user = userEvent.setup();
    render(<CatalogAuditScreen />);
    const contentIds = new Set<string>();
    const focalKeys = new Set<string>();

    for (;;) {
      const cards = screen.getAllByTestId('catalog-card');
      for (const card of cards) {
        contentIds.add(card.getAttribute('data-content-id') ?? '');
        const image = card.querySelector('img');
        const glyph = card.querySelector('[data-focal-key]');
        expect(image?.getAttribute('src')).toMatch(/^\/assets\//);
        focalKeys.add(glyph?.getAttribute('data-focal-key') ?? '');
      }
      const next = screen.getByRole('button', { name: '下一页' });
      if (next.hasAttribute('disabled')) break;
      await user.click(next);
    }

    expect(contentIds.size).toBe(230);
    expect(focalKeys.size).toBe(230);
    expect([...contentIds].every((id) => id.startsWith('bxqp:'))).toBe(true);
    expect([...focalKeys].every(Boolean)).toBe(true);
  });

  it('按家族过滤并保留中文身份和冻结数量', async () => {
    const user = userEvent.setup();
    render(<CatalogAuditScreen />);
    await user.click(screen.getByRole('button', { name: '盲注' }));

    expect(screen.getByText('盲注 · 30 项')).toBeInTheDocument();
    expect(screen.getAllByTestId('catalog-card')).toHaveLength(12);
    expect(
      screen
        .getAllByTestId('catalog-card')
        .every((card) => card.getAttribute('data-family') === 'blind'),
    ).toBe(true);
    expect(screen.getByText('开锣试锋')).toBeInTheDocument();
  });
});
