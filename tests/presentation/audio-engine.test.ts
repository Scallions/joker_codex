import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import type { PresentationSceneId } from '../../src/presentation/assets/presentationAssets';
import {
  PresentationAudioEngine,
  type AudioContextLike,
  type AudioParamLike,
  type BufferSourceLike,
  type GainNodeLike,
} from '../../src/presentation/audio/audioEngine';

class FakeParam implements AudioParamLike {
  public value = 1;
  public readonly ramps: { value: number; time: number }[] = [];

  public cancelScheduledValues() {}

  public setValueAtTime(value: number) {
    this.value = value;
    return this;
  }

  public linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.ramps.push({ value, time });
    return this;
  }
}

class FakeGain implements GainNodeLike {
  public readonly gain = new FakeParam();
  public connect = vi.fn(() => undefined);
  public disconnect = vi.fn(() => undefined);
}

class FakeSource implements BufferSourceLike {
  public buffer: unknown = null;
  public loop = false;
  public onended: (() => void) | null = null;
  public connect = vi.fn(() => undefined);
  public disconnect = vi.fn(() => undefined);
  public start = vi.fn<BufferSourceLike['start']>(() => undefined);
  public stop = vi.fn(() => undefined);
}

class FakeContext implements AudioContextLike {
  public currentTime = 4;
  public state: 'running' | 'suspended' | 'closed' = 'suspended';
  public readonly destination = {};
  public readonly gains: FakeGain[] = [];
  public readonly sources: FakeSource[] = [];
  public readonly resume = vi.fn(async () => {
    this.state = 'running';
  });
  public readonly suspend = vi.fn(async () => {
    this.state = 'suspended';
  });
  public readonly close = vi.fn(async () => {
    this.state = 'closed';
  });
  public readonly decodeAudioData = vi.fn(async () => ({ decoded: true }));

  public createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  public createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
}

function harness() {
  const context = new FakeContext();
  const contextFactory = vi.fn(() => context);
  const fetched: string[] = [];
  let nowMs = 1_000;
  const engine = new PresentationAudioEngine({
    contextFactory,
    fetchAudio: async (path) => {
      fetched.push(path);
      return new ArrayBuffer(16);
    },
    nowMs: () => nowMs,
  });
  return {
    context,
    contextFactory,
    engine,
    fetched,
    setNowMs: (value: number) => {
      nowMs = value;
      context.currentTime = value / 1_000;
    },
  };
}

describe('browser presentation audio engine', () => {
  it('creates audio only on unlock and starts three stems on one loop phase', async () => {
    const { context, contextFactory, engine, fetched } = harness();
    expect(contextFactory).not.toHaveBeenCalled();

    await expect(engine.unlock()).resolves.toBe(true);
    expect(contextFactory).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(fetched).toEqual([
      '/assets/presentation/audio/music-atmosphere.wav',
      '/assets/presentation/audio/music-percussion.wav',
      '/assets/presentation/audio/music-color.wav',
    ]);
    expect(context.sources).toHaveLength(3);
    expect(context.sources.every(({ loop }) => loop)).toBe(true);
    expect(context.sources.map(({ start }) => start.mock.calls[0]?.[1])).toEqual([
      0, 0, 0,
    ]);

    await engine.unlock();
    expect(contextFactory).toHaveBeenCalledTimes(1);
  });

  it('ramps scene mixes and mute without destroying configured values', async () => {
    const { context, engine } = harness();
    await engine.unlock();
    engine.setScene('night-market' satisfies PresentationSceneId);
    engine.setSettings({
      ...DEFAULT_DEVICE_SETTINGS,
      masterVolume: 0.7,
      musicVolume: 0.6,
      sfxVolume: 0.5,
      muted: true,
    });

    const latestRampValues = context.gains.map(({ gain }) => gain.ramps.at(-1)?.value);
    expect(latestRampValues).toContain(0);
    expect(latestRampValues).toContain(0.6);
    expect(latestRampValues).toContain(0.5);
    expect(engine.getSettings()).toMatchObject({
      masterVolume: 0.7,
      musicVolume: 0.6,
      sfxVolume: 0.5,
      muted: true,
    });
  });

  it('deduplicates cue keys and 40ms repeats while capping active one-shots at eight', async () => {
    const { context, engine, setNowMs } = harness();
    await engine.unlock();
    expect(await engine.playOneShot('card-select', 'sequence:cue:1')).toBe(true);
    expect(await engine.playOneShot('card-select', 'sequence:cue:1')).toBe(false);
    expect(await engine.playOneShot('card-select', 'sequence:cue:2')).toBe(false);
    setNowMs(1_041);
    expect(await engine.playOneShot('card-select', 'sequence:cue:3')).toBe(true);

    const ids = [
      'card-lift',
      'card-draw',
      'card-play',
      'card-discard',
      'card-sweep',
      'paper-fold',
    ] as const;
    for (const [index, id] of ids.entries()) {
      setNowMs(1_100 + index * 50);
      expect(await engine.playOneShot(id, `sequence:extra:${String(index)}`)).toBe(true);
    }
    setNowMs(1_500);
    expect(await engine.playOneShot('paper-tear', 'sequence:ninth')).toBe(false);
    expect(context.sources.slice(3)).toHaveLength(8);
  });

  it('contains fetch/decode failure and tears down every active node', async () => {
    const context = new FakeContext();
    const engine = new PresentationAudioEngine({
      contextFactory: () => context,
      fetchAudio: async () => {
        throw new Error('媒体被拦截');
      },
      nowMs: () => 0,
    });
    await expect(engine.unlock()).resolves.toBe(false);
    expect(engine.getStatus().kind).toBe('error');

    const live = harness();
    await live.engine.unlock();
    await live.engine.suspend();
    await live.engine.resume();
    await live.engine.destroy();
    expect(live.context.suspend).toHaveBeenCalled();
    expect(live.context.resume).toHaveBeenCalledTimes(2);
    expect(live.context.sources.every(({ stop }) => stop.mock.calls.length === 1)).toBe(
      true,
    );
    expect(live.context.close).toHaveBeenCalledTimes(1);
  });

  it('contains autoplay denial and can retry on a later trusted gesture', async () => {
    const { context, engine } = harness();
    context.resume.mockRejectedValueOnce(new Error('NotAllowedError'));

    await expect(engine.unlock()).resolves.toBe(false);
    expect(engine.getStatus()).toMatchObject({ kind: 'error' });
    await expect(engine.unlock()).resolves.toBe(true);
    expect(engine.getStatus()).toEqual({ kind: 'ready', message: null });
  });
});
