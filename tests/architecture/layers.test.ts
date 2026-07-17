import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const requiredLayers = [
  'src/app',
  'src/game-core',
  'src/content',
  'src/persistence',
  'src/presentation',
];

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('架构边界', () => {
  it('建立约定的五个应用层', () => {
    expect(requiredLayers.filter((path) => !existsSync(join(root, path)))).toEqual([]);
  });

  it('纯规则引擎不依赖界面、状态库或浏览器持久化', () => {
    const forbidden =
      /from\s+['"](?:react|react-dom|react-redux|@reduxjs\/toolkit|idb|motion)(?:\/[^'"]*)?['"]/;
    const violations = sourceFiles(join(root, 'src/game-core'))
      .filter((path) => /\.[cm]?[jt]sx?$/.test(path))
      .filter((path) => forbidden.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path));

    expect(violations).toEqual([]);
  });
});
