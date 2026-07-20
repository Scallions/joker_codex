import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_ROOT = join(PROJECT_ROOT, 'public', 'assets', 'catalog');

const FAMILIES = {
  deck: { prefix: 'D', count: 15, colors: ['#e7c477', '#9b302f', '#17333b'] },
  stake: { prefix: 'S', count: 8, colors: ['#e2b45e', '#6f2630', '#1b223e'] },
  challenge: { prefix: 'C', count: 20, colors: ['#ef8c69', '#7a1f2a', '#17283a'] },
  voucher: { prefix: 'V', count: 32, colors: ['#d5ae68', '#7e4928', '#26343b'] },
  tarot: { prefix: 'T', count: 22, colors: ['#d9bd83', '#683766', '#171f3d'] },
  planet: { prefix: 'P', count: 12, colors: ['#8bd0c7', '#34558a', '#171d3c'] },
  spectral: { prefix: 'X', count: 18, colors: ['#b6e1db', '#4c518a', '#17192e'] },
  tag: { prefix: 'G', count: 24, colors: ['#e0bc72', '#457064', '#172b30'] },
  blind: { prefix: 'B', count: 30, colors: ['#ed8a70', '#8a2934', '#1b1730'] },
  booster: { prefix: 'K', count: 32, colors: ['#e7c775', '#a3443f', '#1b3340'] },
  enhancement: { prefix: 'E', count: 8, colors: ['#d7d0b5', '#527a72', '#202744'] },
  seal: { prefix: 'L', count: 4, colors: ['#efb060', '#9a2730', '#311824'] },
  edition: { prefix: 'N', count: 5, colors: ['#f2dca0', '#7e6a9f', '#1b2742'] },
};

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function regularPolygon(cx, cy, radius, sides, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (Math.PI * 2 * index) / sides;
    return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(
      cy +
      Math.sin(angle) * radius
    ).toFixed(1)}`;
  }).join(' ');
}

function familyMotif(family, hash, ordinal, colors) {
  const [primary, accent] = colors;
  const turn = (hash % 31) - 15;
  const shift = ((hash >>> 7) % 17) - 8;
  const orbit = 33 + ((hash >>> 12) % 18);
  const polygon = regularPolygon(120, 152, 42 + (ordinal % 9), 3 + (ordinal % 6));

  switch (family) {
    case 'deck':
      return `<g transform="rotate(${turn} 120 154)"><rect x="73" y="88" width="70" height="104" rx="8" fill="none" stroke="${primary}" stroke-width="5"/><rect x="96" y="105" width="70" height="104" rx="8" fill="${accent}" fill-opacity=".18" stroke="${accent}" stroke-width="3"/><path d="M108 132q12-22 24 0q-12 22-24 0Z" fill="${primary}"/></g>`;
    case 'stake':
      return `<path d="M120 67l30 48-18 111h-24L90 115Z" fill="${accent}" fill-opacity=".2" stroke="${primary}" stroke-width="5"/><path d="M94 ${133 + shift}h52M99 ${163 - shift}h42M106 194h28" stroke="${primary}" stroke-width="7" stroke-linecap="round"/>`;
    case 'challenge':
      return `<g transform="rotate(${turn} 120 154)"><path d="M72 213L163 91M77 91l88 122" stroke="${primary}" stroke-width="8" stroke-linecap="round"/><path d="M92 119h56v67H92zM105 134h30v36h-30z" fill="none" stroke="${accent}" stroke-width="4"/></g>`;
    case 'voucher':
      return `<path d="M62 96q15 12 0 24v74q15 12 0 24h116q-15-12 0-24v-74q-15-12 0-24Z" fill="${accent}" fill-opacity=".2" stroke="${primary}" stroke-width="5"/><path d="M91 115v84M149 115v84M105 ${145 + shift}h30M105 ${170 - shift}h30" stroke="${primary}" stroke-width="4" stroke-dasharray="7 7"/>`;
    case 'tarot':
      return `<path d="M145 87a65 65 0 1 0 0 130a52 52 0 1 1 0-130Z" fill="${primary}" fill-opacity=".82"/><g transform="rotate(${turn} 120 152)"><path d="M120 64v31M120 209v31M32 152h35M173 152h35" stroke="${accent}" stroke-width="5"/><polygon points="${polygon}" fill="none" stroke="${accent}" stroke-width="4"/></g>`;
    case 'planet':
      return `<circle cx="120" cy="152" r="${38 + (ordinal % 13)}" fill="${accent}" fill-opacity=".3" stroke="${primary}" stroke-width="5"/><ellipse cx="120" cy="152" rx="82" ry="${orbit}" fill="none" stroke="${primary}" stroke-width="4" transform="rotate(${turn} 120 152)"/><circle cx="${55 + (hash % 23)}" cy="${128 + shift}" r="8" fill="${primary}"/>`;
    case 'spectral':
      return `<path d="M120 66c34 38 55 64 48 105c-6 39-28 60-48 72c-20-12-42-33-48-72c-7-41 25-55 48-105Zm0 61c-19 22-24 43-5 72c28-16 30-42 5-72Z" fill="${primary}" fill-opacity=".25" stroke="${primary}" stroke-width="5"/><circle cx="104" cy="150" r="6" fill="${accent}"/><circle cx="137" cy="146" r="6" fill="${accent}"/>`;
    case 'tag':
      return `<path d="M87 73h66l25 42l-58 118l-58-118Z" fill="${accent}" fill-opacity=".24" stroke="${primary}" stroke-width="5"/><circle cx="120" cy="105" r="12" fill="none" stroke="${primary}" stroke-width="5"/><path d="M120 54v39M91 ${153 + shift}h58M101 ${182 - shift}h38" stroke="${primary}" stroke-width="5" stroke-linecap="round"/>`;
    case 'blind':
      return `<path d="M52 153q68-82 136 0q-68 82-136 0Z" fill="${accent}" fill-opacity=".2" stroke="${primary}" stroke-width="6"/><circle cx="120" cy="153" r="${30 + (ordinal % 11)}" fill="none" stroke="${primary}" stroke-width="6"/><path d="M82 94l76 118M158 94L82 212" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>`;
    case 'booster':
      return `<g transform="rotate(${turn} 120 155)"><path d="M65 111l55-35l55 35v100l-55 30l-55-30Z" fill="${accent}" fill-opacity=".25" stroke="${primary}" stroke-width="5"/><path d="M65 111l55 35l55-35M120 146v95" fill="none" stroke="${primary}" stroke-width="5"/><path d="M91 119l29-19l29 19l-29 18Z" fill="${primary}" fill-opacity=".62"/></g>`;
    case 'enhancement':
      return `<polygon points="${regularPolygon(120, 152, 67, 6, Math.PI / 6)}" fill="${accent}" fill-opacity=".25" stroke="${primary}" stroke-width="5"/><polygon points="${regularPolygon(120, 152, 37 + (ordinal % 8), 4, Math.PI / 4)}" fill="none" stroke="${primary}" stroke-width="5"/><path d="M120 85v134M62 119l116 66M62 185l116-66" stroke="${accent}" stroke-width="3"/>`;
    case 'seal':
      return `<circle cx="120" cy="153" r="76" fill="${accent}" fill-opacity=".24" stroke="${primary}" stroke-width="7"/><circle cx="120" cy="153" r="54" fill="none" stroke="${primary}" stroke-width="4" stroke-dasharray="${8 + ordinal} 8"/><path d="M92 124h56v58H92zM105 109v88M87 153h66" fill="none" stroke="${primary}" stroke-width="7"/>`;
    case 'edition':
      return `<rect x="63" y="78" width="114" height="154" rx="14" fill="${accent}" fill-opacity=".2" stroke="${primary}" stroke-width="5"/><path d="M74 ${108 + shift}l92 52M74 ${145 + shift}l92 52M84 89l82 46M74 182l61 35" stroke="${primary}" stroke-width="8" stroke-linecap="round" opacity=".72"/><circle cx="${105 + shift}" cy="152" r="24" fill="none" stroke="${accent}" stroke-width="5"/>`;
    default:
      throw new Error(`Unknown emblem family: ${family}`);
  }
}

function renderSvg(family, reference, ordinal, config) {
  const hash = hashText(`${family}:${reference}`);
  const [primary, accent, background] = config.colors;
  const pipCount = 3 + (ordinal % 5);
  const pips = Array.from({ length: pipCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / pipCount + (hash % 13) * 0.03;
    const x = 120 + Math.cos(angle) * 91;
    const y = 157 + Math.sin(angle) * 119;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.8 + ((hash >>> index) % 3)).toFixed(1)}" fill="${index % 2 === 0 ? primary : accent}"/>`;
  }).join('');
  const motif = familyMotif(family, hash, ordinal, config.colors);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" data-emblem="${family}-${reference.toLowerCase()}"><defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="#080b1a"/></linearGradient><radialGradient id="glow"><stop stop-color="${primary}" stop-opacity=".24"/><stop offset="1" stop-color="${primary}" stop-opacity="0"/></radialGradient></defs><rect width="240" height="320" rx="18" fill="url(#paper)"/><circle cx="120" cy="154" r="112" fill="url(#glow)"/><path d="M18 48V18h30M192 18h30v30M18 272v30h30M192 302h30v-30" fill="none" stroke="${primary}" stroke-width="4" opacity=".7"/><rect x="25" y="29" width="190" height="262" rx="86" fill="none" stroke="${accent}" stroke-opacity=".34" stroke-width="2"/>${pips}<g>${motif}</g><path d="M79 270q41 ${-12 + (hash % 25)} 82 0" fill="none" stroke="${primary}" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>\n`;
}

function expectedFiles() {
  const files = new Map();
  for (const [family, config] of Object.entries(FAMILIES)) {
    for (let ordinal = 1; ordinal <= config.count; ordinal += 1) {
      const reference = `${config.prefix}${String(ordinal).padStart(2, '0')}`;
      const path = join(OUTPUT_ROOT, family, `${reference.toLowerCase()}.svg`);
      files.set(path, renderSvg(family, reference, ordinal, config));
    }
  }
  return files;
}

async function listSvgFiles(root) {
  const files = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listSvgFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.svg')) files.push(path);
  }
  return files;
}

async function check() {
  const expected = expectedFiles();
  const actual = await listSvgFiles(OUTPUT_ROOT);
  const failures = [];
  for (const [path, source] of expected) {
    let current;
    try {
      current = await readFile(path, 'utf8');
    } catch {
      failures.push(`missing ${relative(PROJECT_ROOT, path)}`);
      continue;
    }
    if (current !== source) failures.push(`drifted ${relative(PROJECT_ROOT, path)}`);
  }
  for (const path of actual) {
    if (!expected.has(path)) failures.push(`unexpected ${relative(PROJECT_ROOT, path)}`);
  }
  if (failures.length > 0) throw new Error(failures.join('\n'));
  console.log(`catalog emblems verified: ${expected.size}`);
}

async function write() {
  const expected = expectedFiles();
  let changed = 0;
  for (const [path, source] of expected) {
    await mkdir(dirname(path), { recursive: true });
    let current = '';
    try {
      current = await readFile(path, 'utf8');
    } catch {
      // The generated file does not exist yet.
    }
    if (current === source) continue;
    await writeFile(path, source, 'utf8');
    changed += 1;
  }
  console.log(`catalog emblems generated: ${expected.size} (${changed} changed)`);
}

if (process.argv.includes('--check')) await check();
else await write();
