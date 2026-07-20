// @vitest-environment jsdom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('全局声场抽屉', () => {
  it('从档案页打开、保存利落演出并返回原页面', async () => {
    const user = userEvent.setup();
    const store = createGameStore(createMemoryRepository());
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '打开声场设置' }));
    const drawer = screen.getByRole('dialog', { name: '声场控制台' });
    expect(within(drawer).getByLabelText('总音量')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('音乐')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('音效')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: '利落演出' }));
    await waitFor(() =>
      expect(store.getState().app.settings.presentationSpeed).toBe('brisk'),
    );
    await user.click(within(drawer).getByRole('button', { name: '收起声场' }));

    expect(screen.queryByRole('dialog', { name: '声场控制台' })).not.toBeInTheDocument();
    expect(store.getState().app.status).toBe('profiles');
  });
});
