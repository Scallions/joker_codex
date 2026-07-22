import { validateDeploymentBase } from '../../src/deploymentBase';
import {
  resolvePublicAssetUrl,
  resolvePublicAssetUrlFromBase,
} from '../../src/presentation/assets/publicAssetUrl';

describe('公开素材部署路径', () => {
  it('默认根路径保持既有素材 URL', () => {
    expect(resolvePublicAssetUrl('/assets/jokers/001.webp')).toBe(
      '/assets/jokers/001.webp',
    );
    expect(resolvePublicAssetUrlFromBase('/', '/assets/catalog/planet/p01.svg')).toBe(
      '/assets/catalog/planet/p01.svg',
    );
  });

  it('为 GitHub Pages 项目站点补上仓库前缀并保留查询与片段', () => {
    expect(
      resolvePublicAssetUrlFromBase(
        '/joker_codex/',
        '/assets/presentation/scenes/night-market.webp?revision=1#focus',
      ),
    ).toBe('/joker_codex/assets/presentation/scenes/night-market.webp?revision=1#focus');
  });

  it('不重写已解析路径、外部地址或非规范相对路径', () => {
    expect(
      resolvePublicAssetUrlFromBase(
        '/joker_codex/',
        '/joker_codex/assets/jokers/001.webp',
      ),
    ).toBe('/joker_codex/assets/jokers/001.webp');
    expect(
      resolvePublicAssetUrlFromBase('/joker_codex/', 'https://example.com/card.webp'),
    ).toBe('https://example.com/card.webp');
    expect(resolvePublicAssetUrlFromBase('/joker_codex/', 'assets/card.webp')).toBe(
      'assets/card.webp',
    );
  });

  it.each(['joker_codex/', '/joker_codex', '//joker_codex/', '/joker//codex/', '/a/../'])(
    '拒绝不规范部署基础路径 %s',
    (baseUrl) => {
      expect(() => validateDeploymentBase(baseUrl)).toThrow(
        '部署基础路径必须是以单斜杠包围的绝对路径',
      );
      expect(() =>
        resolvePublicAssetUrlFromBase(baseUrl, '/assets/jokers/001.webp'),
      ).toThrow('部署基础路径必须是以单斜杠包围的绝对路径');
    },
  );
});
