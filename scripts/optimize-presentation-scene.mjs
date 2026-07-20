import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const inputIndex = process.argv.indexOf('--input');
const outputIndex = process.argv.indexOf('--output');
if (inputIndex < 0 || outputIndex < 0) {
  throw new Error(
    'Usage: node scripts/optimize-presentation-scene.mjs --input FILE --output FILE',
  );
}

const input = resolve(process.argv[inputIndex + 1]);
const output = resolve(process.argv[outputIndex + 1]);
const source = await readFile(input);
const sourceDataUrl = `data:image/png;base64,${source.toString('base64')}`;
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  const candidates = await page.evaluate(async (dataUrl) => {
    const image = new globalThis.Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return [0.82, 0.78, 0.74, 0.7, 0.66, 0.62, 0.58].map((quality) => ({
      quality,
      dataUrl: canvas.toDataURL('image/webp', quality),
    }));
  }, sourceDataUrl);
  const decoded = candidates.map(({ quality, dataUrl }) => ({
    quality,
    buffer: Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'),
  }));
  const selected =
    decoded.find(({ buffer }) => buffer.byteLength <= 350 * 1024) ?? decoded.at(-1);
  if (!selected) throw new Error('WebP conversion returned no candidate');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, selected.buffer);
  console.log(
    JSON.stringify({
      input,
      output,
      width: 1920,
      height: 1080,
      quality: selected.quality,
      bytes: selected.buffer.byteLength,
    }),
  );
} finally {
  await browser.close();
}
