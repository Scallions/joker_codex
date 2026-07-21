// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  JokerArtworkInspectorProvider,
  JokerArtworkTrigger,
} from '../../src/presentation/components/JokerArtworkInspector';
import { selectJokerPresentation } from '../../src/presentation/selectors/jokerPresentation';

function presentation(contentId: string) {
  const result = selectJokerPresentation(contentId);
  if (!result) throw new Error(`缺少鉴赏测试奇牌：${contentId}`);
  return result;
}

const first = presentation('bxqp:joker:021');
const second = presentation('bxqp:joker:044');

function Harness({ scope = 'shop' }: { readonly scope?: string }) {
  return (
    <JokerArtworkInspectorProvider key={scope}>
      <JokerArtworkTrigger presentation={first} />
      <JokerArtworkTrigger presentation={second} loading="lazy" />
    </JokerArtworkInspectorProvider>
  );
}

describe('奇牌大图鉴赏层', () => {
  it('关闭时只有一个空主机，打开后只挂载所选本地大图和完整文案', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getAllByTestId('joker-inspector-host')).toHaveLength(1);
    expect(screen.getByTestId('joker-inspector-host')).toHaveAttribute(
      'data-open',
      'false',
    );
    expect(screen.queryByTestId('joker-inspector-art')).toBeNull();

    await user.click(screen.getByRole('button', { name: `查看 ${first.name} 大图` }));
    const dialog = screen.getByRole('dialog', {
      name: `奇牌鉴赏 · ${first.name}`,
    });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('joker-inspector-host')).toHaveAttribute(
      'data-open',
      'true',
    );
    expect(within(dialog).getByTestId('joker-inspector-art')).toHaveAttribute(
      'src',
      first.assetPath,
    );
    expect(within(dialog).getByText(first.rarityLabel)).toBeInTheDocument();
    expect(within(dialog).getByText(first.description)).toBeInTheDocument();
    expect(within(dialog).getByText(first.currentValue!)).toBeInTheDocument();
    expect(within(dialog).getByText(first.flavor)).toBeInTheDocument();
  });

  it('支持显式按钮、幕布和 Escape，画框内部点击不会误关', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const open = () =>
      user.click(screen.getByRole('button', { name: `查看 ${second.name} 大图` }));

    await open();
    await user.click(screen.getByRole('button', { name: '关闭鉴赏' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await open();
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('joker-inspector-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();

    await open();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('路由作用域变化会清空尚未关闭的鉴赏快照', async () => {
    const user = userEvent.setup();
    const view = render(<Harness scope="shop" />);
    await user.click(screen.getByRole('button', { name: `查看 ${first.name} 大图` }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    view.rerender(<Harness scope="round" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByTestId('joker-inspector-host')).toHaveLength(1);
  });
});
