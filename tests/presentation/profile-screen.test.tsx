// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('三档案戏票页', () => {
  it('在空档位落印建档并显示开局入口', async () => {
    const user = userEvent.setup();
    const store = createGameStore(createMemoryRepository());
    render(<App store={store} />);

    expect(await screen.findByText('三方戏台，三份命数')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: '在此建档' })[0]!);
    await user.type(screen.getByLabelText('档案名'), '掌灯人');
    await user.click(screen.getByRole('button', { name: '落印建档' }));

    expect(await screen.findByRole('heading', { name: '掌灯人' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始今夜试玩' })).toBeInTheDocument();
  });
});
