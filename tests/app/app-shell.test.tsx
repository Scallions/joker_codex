// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';

import { App } from '../../src/app/App';

describe('应用舞台', () => {
  it('以中文品牌和午夜百戏基调迎接玩家', () => {
    render(<App />);

    expect(screen.getByRole('region', { name: '午夜百戏舞台' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '百戏奇牌' })).toBeInTheDocument();
    expect(screen.getByText('今夜开演，一手定乾坤')).toBeInTheDocument();
    expect(screen.getByText('午夜百戏 · 本地试玩')).toBeInTheDocument();
  });
});
