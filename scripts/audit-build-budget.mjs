import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_DIRECTORY = resolve('dist');
const INITIAL_GZIP_BUDGET = 350 * 1024;
const DEPLOYMENT_BASE = process.env.VITE_BASE_PATH ?? '/';

function distRelativeReference(path) {
  const [pathname] = path.split(/[?#]/, 1);
  if (!pathname) throw new Error(`首屏资源路径为空：${path}`);
  if (!pathname.startsWith('/')) return pathname.replace(/^\.\//, '');
  if (!pathname.startsWith(DEPLOYMENT_BASE)) {
    throw new Error(`首屏资源不在部署基础路径 ${DEPLOYMENT_BASE} 下：${path}`);
  }
  return pathname.slice(DEPLOYMENT_BASE.length);
}

function initialReferences(html) {
  const references = new Set();
  const tagPattern = /<(script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g;
  for (const match of html.matchAll(tagPattern)) {
    const tag = match[0];
    const path = match[2];
    if (!path || /^https?:|^data:/.test(path)) continue;
    if (
      (match[1] === 'script' && /type=["']module["']/.test(tag)) ||
      (match[1] === 'link' && /rel=["'](?:modulepreload|stylesheet)["']/.test(tag))
    ) {
      references.add(distRelativeReference(path));
    }
  }
  return references;
}

function staticImports(source) {
  const imports = [];
  const pattern = /\b(?:import|export)(?:[^"'`;]*?from)?["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]?.startsWith('.')) imports.push(match[1]);
  }
  return imports;
}

function insideDist(path) {
  const local = relative(DIST_DIRECTORY, path);
  return (
    local !== '..' && !local.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  );
}

async function collectInitialFiles() {
  const html = await readFile(join(DIST_DIRECTORY, 'index.html'), 'utf8');
  const queue = [...initialReferences(html)].map((path) => join(DIST_DIRECTORY, path));
  const sharedReactChunks = (await readdir(join(DIST_DIRECTORY, 'assets')))
    .filter((name) => /^react-[^.]+\.js$/.test(name))
    .map((name) => join(DIST_DIRECTORY, 'assets', name));
  queue.push(...sharedReactChunks);
  const visited = new Set();

  while (queue.length > 0) {
    const current = normalize(queue.shift());
    if (!insideDist(current)) throw new Error(`首屏资源越过 dist：${current}`);
    if (visited.has(current)) continue;
    visited.add(current);
    await stat(current);
    if (extname(current) !== '.js') continue;
    const source = await readFile(current, 'utf8');
    for (const imported of staticImports(source)) {
      const resolved = resolve(dirname(current), imported);
      if (extname(resolved) === '.js' || extname(resolved) === '.css') {
        queue.push(resolved);
      }
    }
  }
  return [...visited].sort((left, right) => left.localeCompare(right));
}

const initialFiles = await collectInitialFiles();
const rows = await Promise.all(
  initialFiles.map(async (path) => {
    const source = await readFile(path);
    return {
      path: relative(DIST_DIRECTORY, path),
      rawBytes: source.byteLength,
      gzipBytes: gzipSync(source, { level: 9 }).byteLength,
    };
  }),
);
const totalGzipBytes = rows.reduce((total, row) => total + row.gzipBytes, 0);
const report = {
  budgetBytes: INITIAL_GZIP_BUDGET,
  totalGzipBytes,
  passed: totalGzipBytes <= INITIAL_GZIP_BUDGET,
  files: rows,
};

console.log(JSON.stringify(report, null, 2));
if (!report.passed) {
  throw new Error(`首屏资源超出 gzip 预算：${totalGzipBytes} > ${INITIAL_GZIP_BUDGET}`);
}
