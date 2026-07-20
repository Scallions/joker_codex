import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SAMPLE_RATE = 32_000;
const FIXED_SEED = 'midnight-variety-audio-v1';
const OUTPUT_DIRECTORY = resolve('public/assets/presentation/audio');
const TAU = Math.PI * 2;

const DEFINITIONS = [
  { id: 'music-atmosphere', kind: 'stem', duration: 96, peak: 0.68 },
  { id: 'music-percussion', kind: 'stem', duration: 96, peak: 0.7 },
  { id: 'music-color', kind: 'stem', duration: 96, peak: 0.68 },
  { id: 'card-lift', kind: 'sfx', duration: 0.18, peak: 0.64 },
  { id: 'card-select', kind: 'sfx', duration: 0.12, peak: 0.62 },
  { id: 'card-draw', kind: 'sfx', duration: 0.28, peak: 0.66 },
  { id: 'card-play', kind: 'sfx', duration: 0.34, peak: 0.72 },
  { id: 'card-discard', kind: 'sfx', duration: 0.32, peak: 0.68 },
  { id: 'card-sweep', kind: 'sfx', duration: 0.48, peak: 0.68 },
  { id: 'paper-fold', kind: 'sfx', duration: 0.34, peak: 0.6 },
  { id: 'paper-tear', kind: 'sfx', duration: 0.46, peak: 0.68 },
  { id: 'wood-tap', kind: 'sfx', duration: 0.16, peak: 0.65 },
  { id: 'coin-spend', kind: 'sfx', duration: 0.32, peak: 0.72 },
  { id: 'coin-receive', kind: 'sfx', duration: 0.42, peak: 0.72 },
  { id: 'seal-soft', kind: 'sfx', duration: 0.3, peak: 0.68 },
  { id: 'seal-hard', kind: 'sfx', duration: 0.52, peak: 0.78 },
  { id: 'curtain-open', kind: 'sfx', duration: 0.78, peak: 0.64 },
  { id: 'curtain-close', kind: 'sfx', duration: 0.72, peak: 0.68 },
  { id: 'pack-open', kind: 'sfx', duration: 0.85, peak: 0.72 },
  { id: 'pack-choice', kind: 'sfx', duration: 0.38, peak: 0.68 },
  { id: 'purchase', kind: 'sfx', duration: 0.48, peak: 0.72 },
  { id: 'sale', kind: 'sfx', duration: 0.44, peak: 0.68 },
  { id: 'score-low', kind: 'sfx', duration: 0.42, peak: 0.68 },
  { id: 'score-high', kind: 'sfx', duration: 0.72, peak: 0.76 },
  { id: 'unlock', kind: 'sfx', duration: 0.88, peak: 0.74 },
  { id: 'stinger-victory', kind: 'stinger', duration: 2.6, peak: 0.8 },
  { id: 'stinger-loss', kind: 'stinger', duration: 2.2, peak: 0.72 },
  { id: 'stinger-rare', kind: 'stinger', duration: 1.8, peak: 0.76 },
  { id: 'stinger-achievement', kind: 'stinger', duration: 2.4, peak: 0.8 },
];

function hashSeed(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFor(id) {
  let state = hashSeed(`${FIXED_SEED}:${id}`);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function envelope(time, duration, attack = 0.012, release = 0.35) {
  const attackGain = Math.min(1, time / Math.max(attack, 0.0001));
  const releaseStart = Math.max(attack, duration - release);
  const releaseGain = time <= releaseStart ? 1 : Math.max(0, (duration - time) / release);
  return Math.sin((Math.PI / 2) * attackGain) * releaseGain ** 1.6;
}

function addTone(output, start, duration, frequency, amplitude, options = {}) {
  const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
  const sampleCount = Math.min(
    output.length - startSample,
    Math.round(duration * SAMPLE_RATE),
  );
  const attack = options.attack ?? 0.008;
  const release = options.release ?? Math.min(duration * 0.75, 0.5);
  const harmonics = options.harmonics ?? [1, 0.24, 0.1];
  const decay = options.decay ?? 0;
  const vibrato = options.vibrato ?? 0;
  const bend = options.bend ?? 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const progress = time / duration;
    const bentFrequency = frequency * (1 + bend * progress);
    const phase =
      TAU * bentFrequency * time + (vibrato ? Math.sin(TAU * 5.2 * time) * vibrato : 0);
    let value = 0;
    let weight = 0;
    for (const [harmonicIndex, harmonicGain] of harmonics.entries()) {
      const harmonic = harmonicIndex + 1;
      value += Math.sin(phase * harmonic) * harmonicGain;
      weight += harmonicGain;
    }
    const decayGain = decay ? Math.exp(-decay * time) : 1;
    output[startSample + index] +=
      (value / Math.max(weight, 1)) *
      amplitude *
      envelope(time, duration, attack, release) *
      decayGain;
  }
}

function addNoise(output, random, start, duration, amplitude, options = {}) {
  const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
  const sampleCount = Math.min(
    output.length - startSample,
    Math.round(duration * SAMPLE_RATE),
  );
  const smoothing = options.smoothing ?? 0.5;
  const attack = options.attack ?? 0.002;
  const release = options.release ?? Math.min(duration * 0.7, 0.35);
  const rising = options.rising ?? false;
  let filtered = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    filtered = filtered * smoothing + (random() * 2 - 1) * (1 - smoothing);
    const movement = rising ? 0.25 + (time / duration) * 0.75 : 1;
    output[startSample + index] +=
      filtered * amplitude * envelope(time, duration, attack, release) * movement;
  }
}

function addStrike(output, start, frequency, amplitude, duration = 0.65) {
  addTone(output, start, duration, frequency, amplitude, {
    attack: 0.001,
    release: duration,
    decay: 2.8,
    harmonics: [1, 0.42, 0.22, 0.1],
  });
  addTone(output, start, duration * 0.85, frequency * 1.505, amplitude * 0.35, {
    attack: 0.001,
    release: duration * 0.85,
    decay: 3.5,
    harmonics: [1, 0.18],
  });
}

function generateAtmosphere() {
  const output = new Float32Array(96 * SAMPLE_RATE);
  const random = randomFor('music-atmosphere');
  for (let index = 0; index < output.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const breath = 0.72 + Math.sin((TAU * time) / 16) * 0.16;
    output[index] =
      (Math.sin(TAU * 55 * time) * 0.18 +
        Math.sin(TAU * 82.5 * time + 0.7) * 0.11 +
        Math.sin(TAU * 110 * time + Math.sin((TAU * time) / 24) * 0.16) * 0.07 +
        Math.sin(TAU * 0.125 * time) * 0.025) *
      breath;
  }
  for (const time of [6, 22, 38, 54, 70, 86]) {
    addStrike(output, time, 146.6667, 0.16, 2.4);
    addNoise(output, random, time + 0.1, 1.8, 0.035, {
      smoothing: 0.985,
      attack: 0.25,
      release: 0.8,
    });
  }
  return output;
}

function generatePercussion() {
  const output = new Float32Array(96 * SAMPLE_RATE);
  const random = randomFor('music-percussion');
  for (let beat = 0; beat < 48; beat += 1) {
    const time = 0.5 + beat * 2;
    const downbeat = beat % 4 === 0;
    addTone(
      output,
      time,
      downbeat ? 0.46 : 0.22,
      downbeat ? 82 : 128,
      downbeat ? 0.42 : 0.22,
      {
        attack: 0.001,
        release: downbeat ? 0.42 : 0.2,
        decay: downbeat ? 5 : 9,
        bend: -0.22,
        harmonics: [1, 0.5, 0.16],
      },
    );
    addNoise(output, random, time, downbeat ? 0.18 : 0.09, downbeat ? 0.16 : 0.09, {
      smoothing: downbeat ? 0.62 : 0.38,
      release: downbeat ? 0.16 : 0.07,
    });
    if (beat % 8 === 6) addStrike(output, time + 0.9, 420, 0.12, 0.8);
  }
  return output;
}

function generateColor() {
  const output = new Float32Array(96 * SAMPLE_RATE);
  const pentatonic = [220, 247.5, 293.3333, 330, 391.1111];
  const phrase = [0, 2, 4, 2, 1, 3, 4, 3, 0, 1, 3, 2];
  for (let step = 0; step < 48; step += 1) {
    const time = 1 + step * 2;
    const frequency = pentatonic[phrase[step % phrase.length]];
    addTone(output, time, 1.15, frequency, 0.28, {
      attack: 0.002,
      release: 0.9,
      decay: 1.8,
      harmonics: [1, 0.52, 0.22, 0.08],
    });
    if (step % 4 === 2) {
      addTone(output, time + 0.55, 1.8, frequency / 2, 0.1, {
        attack: 0.2,
        release: 0.7,
        vibrato: 0.06,
        harmonics: [1, 0.14],
      });
    }
  }
  return output;
}

function generateOneShot(definition) {
  const output = new Float32Array(Math.round(definition.duration * SAMPLE_RATE));
  const random = randomFor(definition.id);
  const id = definition.id;

  if (id.startsWith('card-') || id.startsWith('paper-')) {
    const isSweep = id === 'card-sweep' || id === 'paper-tear';
    addNoise(output, random, 0, definition.duration, isSweep ? 0.55 : 0.38, {
      smoothing: isSweep ? 0.82 : 0.5,
      release: definition.duration * 0.75,
      rising: id === 'card-lift' || id === 'card-draw',
    });
    const frequency = id === 'card-select' ? 510 : id === 'card-play' ? 180 : 310;
    addTone(output, 0.015, Math.min(0.2, definition.duration), frequency, 0.2, {
      release: Math.min(0.18, definition.duration),
      decay: 8,
      bend: id === 'card-discard' ? -0.35 : 0.12,
    });
  } else if (id === 'wood-tap') {
    addTone(output, 0, definition.duration, 172, 0.8, {
      attack: 0.001,
      release: definition.duration,
      decay: 14,
      harmonics: [1, 0.62, 0.24],
    });
    addNoise(output, random, 0, 0.05, 0.22, { smoothing: 0.3, release: 0.04 });
  } else if (id.startsWith('coin-') || id === 'purchase' || id === 'sale') {
    const ascending = id === 'coin-receive' || id === 'purchase';
    addStrike(output, 0.015, ascending ? 920 : 760, 0.55, definition.duration);
    addStrike(
      output,
      definition.duration * 0.28,
      ascending ? 1220 : 620,
      0.32,
      definition.duration * 0.65,
    );
  } else if (id.startsWith('seal-')) {
    const hard = id === 'seal-hard';
    addTone(output, 0, definition.duration, hard ? 68 : 96, hard ? 0.9 : 0.62, {
      attack: 0.001,
      release: definition.duration,
      decay: hard ? 5 : 8,
      bend: -0.25,
      harmonics: [1, 0.52, 0.28],
    });
    addNoise(output, random, 0, hard ? 0.16 : 0.08, hard ? 0.4 : 0.24, {
      smoothing: 0.32,
      release: hard ? 0.15 : 0.07,
    });
  } else if (id.startsWith('curtain-')) {
    addNoise(output, random, 0, definition.duration, 0.5, {
      smoothing: 0.94,
      attack: 0.08,
      release: 0.24,
      rising: id === 'curtain-open',
    });
    addTone(
      output,
      0.04,
      definition.duration * 0.8,
      id === 'curtain-open' ? 105 : 82,
      0.14,
      {
        attack: 0.08,
        release: 0.3,
        bend: id === 'curtain-open' ? 0.18 : -0.18,
      },
    );
  } else if (id.startsWith('pack-')) {
    addNoise(output, random, 0, definition.duration * 0.65, 0.44, {
      smoothing: 0.68,
      release: definition.duration * 0.45,
      rising: true,
    });
    addStrike(
      output,
      definition.duration * 0.42,
      id === 'pack-open' ? 520 : 690,
      0.38,
      definition.duration * 0.5,
    );
  } else if (id.startsWith('score-') || id === 'unlock') {
    const high = id === 'score-high' || id === 'unlock';
    const notes = high ? [440, 550, 660] : [293.3333, 366.6667];
    for (const [index, note] of notes.entries()) {
      addStrike(
        output,
        index * 0.11,
        note,
        0.4 - index * 0.06,
        definition.duration - index * 0.1,
      );
    }
  } else if (id.startsWith('stinger-')) {
    const notesById = {
      'stinger-victory': [220, 293.3333, 330, 440, 586.6667],
      'stinger-loss': [330, 293.3333, 247.5, 165],
      'stinger-rare': [293.3333, 440, 660, 880],
      'stinger-achievement': [220, 330, 440, 550, 660],
    };
    const notes = notesById[id];
    for (const [index, note] of notes.entries()) {
      addTone(output, index * 0.24, definition.duration - index * 0.18, note, 0.34, {
        attack: 0.008,
        release: Math.min(0.9, definition.duration * 0.4),
        decay: 0.8,
        harmonics: [1, 0.45, 0.18],
      });
      if (index === notes.length - 1)
        addStrike(output, index * 0.24, note / 2, 0.24, 1.2);
    }
    if (id === 'stinger-victory' || id === 'stinger-achievement') {
      addNoise(output, random, 0.5, 1.1, 0.08, {
        smoothing: 0.985,
        attack: 0.3,
        release: 0.6,
      });
    }
  }

  return output;
}

function normalize(samples, targetPeak) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak < 1e-9) throw new Error('Generated silent audio');
  const scale = targetPeak / peak;
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] *= scale;
  }
  return samples;
}

function encodePcmWav(samples, id) {
  const dataBytes = samples.length * 2;
  const output = Buffer.allocUnsafe(44 + dataBytes);
  output.write('RIFF', 0, 'ascii');
  output.writeUInt32LE(36 + dataBytes, 4);
  output.write('WAVE', 8, 'ascii');
  output.write('fmt ', 12, 'ascii');
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36, 'ascii');
  output.writeUInt32LE(dataBytes, 40);
  const random = randomFor(`${id}:dither`);
  for (let index = 0; index < samples.length; index += 1) {
    const dither = (random() - random()) / 65_536;
    const value = Math.max(-1, Math.min(1, samples[index] + dither));
    output.writeInt16LE(
      value < 0 ? Math.round(value * 32_768) : Math.round(value * 32_767),
      44 + index * 2,
    );
  }
  return output;
}

function generate(definition) {
  const samples =
    definition.id === 'music-atmosphere'
      ? generateAtmosphere()
      : definition.id === 'music-percussion'
        ? generatePercussion()
        : definition.id === 'music-color'
          ? generateColor()
          : generateOneShot(definition);
  return encodePcmWav(normalize(samples, definition.peak), definition.id);
}

const check = process.argv.includes('--check');
await mkdir(OUTPUT_DIRECTORY, { recursive: true });
const expectedNames = new Set(DEFINITIONS.map(({ id }) => `${id}.wav`));
const results = [];

for (const definition of DEFINITIONS) {
  const output = generate(definition);
  const path = resolve(OUTPUT_DIRECTORY, `${definition.id}.wav`);
  if (check) {
    const committed = await readFile(path);
    if (!committed.equals(output)) throw new Error(`Audio drift: ${definition.id}`);
  } else {
    await writeFile(path, output);
  }
  results.push({
    id: definition.id,
    kind: definition.kind,
    duration: definition.duration,
    bytes: output.byteLength,
  });
}

if (check) {
  const unexpected = (await readdir(OUTPUT_DIRECTORY)).filter(
    (name) => name.endsWith('.wav') && !expectedNames.has(name),
  );
  if (unexpected.length > 0)
    throw new Error(`Unexpected audio: ${unexpected.join(', ')}`);
}

console.log(
  JSON.stringify({
    mode: check ? 'check' : 'write',
    fixedSeed: FIXED_SEED,
    sampleRate: SAMPLE_RATE,
    files: results.length,
    bytes: results.reduce((sum, item) => sum + item.bytes, 0),
  }),
);
