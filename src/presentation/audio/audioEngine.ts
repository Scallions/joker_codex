import {
  DEFAULT_DEVICE_SETTINGS,
  type DeviceSettingsV1,
} from '../../persistence/deviceSettings';
import {
  PRESENTATION_AUDIO_BY_ID,
  type PresentationAudioId,
  type PresentationSceneId,
} from '../assets/presentationAssets';
import { sceneMixFor } from './audioMap';

export interface AudioParamLike {
  value: number;
  cancelScheduledValues(time: number): unknown;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
}

export interface GainNodeLike {
  readonly gain: AudioParamLike;
  connect(destination: unknown): unknown;
  disconnect(): unknown;
}

export interface BufferSourceLike {
  buffer: unknown;
  loop: boolean;
  onended: (() => void) | null;
  connect(destination: unknown): unknown;
  disconnect(): unknown;
  start(when?: number, offset?: number): unknown;
  stop(): unknown;
}

export interface AudioContextLike {
  currentTime: number;
  state: string;
  readonly destination: unknown;
  createGain(): GainNodeLike;
  createBufferSource(): BufferSourceLike;
  decodeAudioData(source: ArrayBuffer): Promise<unknown>;
  resume(): Promise<unknown>;
  suspend(): Promise<unknown>;
  close(): Promise<unknown>;
}

export interface PresentationAudioStatus {
  readonly kind: 'locked' | 'ready' | 'suspended' | 'error' | 'closed';
  readonly message: string | null;
}

export interface PresentationAudioEngineOptions {
  readonly contextFactory?: () => AudioContextLike;
  readonly fetchAudio?: (path: string) => Promise<ArrayBuffer>;
  readonly nowMs?: () => number;
  readonly onStatus?: (status: PresentationAudioStatus) => void;
}

const STEM_IDS = [
  'music-atmosphere',
  'music-percussion',
  'music-color',
] as const satisfies readonly PresentationAudioId[];
type StemId = (typeof STEM_IDS)[number];

function defaultContextFactory(): AudioContextLike {
  const constructors = window as typeof window & {
    readonly webkitAudioContext?: typeof AudioContext;
  };
  const Context = constructors.AudioContext ?? constructors.webkitAudioContext;
  if (!Context) throw new Error('当前浏览器没有可用的 Web Audio 声场');
  return new Context() as unknown as AudioContextLike;
}

async function defaultFetchAudio(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`本地音频读取失败：${String(response.status)}`);
  return response.arrayBuffer();
}

export class PresentationAudioEngine {
  private readonly contextFactory: () => AudioContextLike;

  private readonly fetchAudio: (path: string) => Promise<ArrayBuffer>;

  private readonly nowMs: () => number;

  private readonly onStatus: ((status: PresentationAudioStatus) => void) | undefined;

  private context: AudioContextLike | null = null;

  private masterGain: GainNodeLike | null = null;

  private musicGain: GainNodeLike | null = null;

  private sfxGain: GainNodeLike | null = null;

  private readonly stemGains = new Map<StemId, GainNodeLike>();

  private readonly stemSources = new Set<BufferSourceLike>();

  private readonly activeOneShots = new Set<BufferSourceLike>();

  private readonly buffers = new Map<PresentationAudioId, unknown>();

  private readonly bufferPromises = new Map<PresentationAudioId, Promise<unknown>>();

  private readonly playedCueKeys = new Set<string>();

  private readonly playedCueOrder: string[] = [];

  private readonly lastSoundAt = new Map<PresentationAudioId, number>();

  private settings: DeviceSettingsV1 = DEFAULT_DEVICE_SETTINGS;

  private sceneId: PresentationSceneId = 'profile-ledger';

  private status: PresentationAudioStatus = { kind: 'locked', message: null };

  private stemEpochSeconds = 0;

  private unlockPromise: Promise<boolean> | null = null;

  private destroyed = false;

  public constructor(options: PresentationAudioEngineOptions = {}) {
    this.contextFactory = options.contextFactory ?? defaultContextFactory;
    this.fetchAudio = options.fetchAudio ?? defaultFetchAudio;
    this.nowMs = options.nowMs ?? (() => performance.now());
    this.onStatus = options.onStatus;
  }

  public getStatus(): PresentationAudioStatus {
    return this.status;
  }

  public getSettings(): DeviceSettingsV1 {
    return this.settings;
  }

  public async unlock(): Promise<boolean> {
    if (this.destroyed) return false;
    if (this.status.kind === 'ready' && this.context) return true;
    this.unlockPromise ??= this.performUnlock();
    const unlocked = await this.unlockPromise;
    if (!unlocked) this.unlockPromise = null;
    return unlocked;
  }

  public setSettings(settings: DeviceSettingsV1) {
    this.settings = settings;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.ramp(this.masterGain, settings.muted ? 0 : settings.masterVolume, now, 0.04);
    this.ramp(this.musicGain, settings.musicVolume, now, 0.04);
    this.ramp(this.sfxGain, settings.sfxVolume, now, 0.04);
  }

  public setScene(sceneId: PresentationSceneId) {
    this.sceneId = sceneId;
    if (!this.context) return;
    const mix = sceneMixFor(sceneId);
    const now = this.context.currentTime;
    this.ramp(this.stemGains.get('music-atmosphere') ?? null, mix.atmosphere, now, 0.4);
    this.ramp(this.stemGains.get('music-percussion') ?? null, mix.percussion, now, 0.4);
    this.ramp(this.stemGains.get('music-color') ?? null, mix.color, now, 0.4);
  }

  public async playOneShot(id: PresentationAudioId, cueKey: string): Promise<boolean> {
    if (!this.context || this.status.kind !== 'ready' || this.destroyed) return false;
    if (this.playedCueKeys.has(cueKey)) return false;
    this.rememberCueKey(cueKey);
    const now = this.nowMs();
    const previous = this.lastSoundAt.get(id);
    if (previous !== undefined && now - previous < 40) return false;
    if (this.activeOneShots.size >= 8) return false;
    this.lastSoundAt.set(id, now);

    try {
      const buffer = await this.loadBuffer(id);
      if (!this.context || !this.sfxGain || this.destroyed) return false;
      if (this.activeOneShots.size >= 8) return false;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(this.sfxGain);
      source.onended = () => {
        this.activeOneShots.delete(source);
        source.disconnect();
      };
      this.activeOneShots.add(source);
      source.start(0);
      return true;
    } catch (error) {
      this.fail(`音效已静默：${this.errorMessage(error)}`);
      return false;
    }
  }

  public async suspend(): Promise<void> {
    if (!this.context || this.context.state === 'closed') return;
    try {
      await this.context.suspend();
      this.updateStatus({ kind: 'suspended', message: null });
    } catch (error) {
      this.fail(`声场暂停失败：${this.errorMessage(error)}`);
    }
  }

  public async resume(): Promise<void> {
    if (!this.context || this.context.state === 'closed') return;
    try {
      await this.context.resume();
      this.updateStatus({ kind: 'ready', message: null });
    } catch (error) {
      this.fail(`声场恢复失败：${this.errorMessage(error)}`);
    }
  }

  public async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const source of [...this.stemSources, ...this.activeOneShots]) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // A source that never started is already inert.
      }
      source.disconnect();
    }
    this.stemSources.clear();
    this.activeOneShots.clear();
    for (const gain of [
      this.masterGain,
      this.musicGain,
      this.sfxGain,
      ...this.stemGains.values(),
    ]) {
      gain?.disconnect();
    }
    this.stemGains.clear();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        // Teardown remains best-effort and cannot affect gameplay.
      }
    }
    this.updateStatus({ kind: 'closed', message: null });
  }

  private async performUnlock(): Promise<boolean> {
    try {
      this.context ??= this.contextFactory();
      this.buildGraph(this.context);
      if (this.context.state !== 'running') await this.context.resume();
      await this.startStems(this.context);
      this.setSettings(this.settings);
      this.setScene(this.sceneId);
      this.updateStatus({ kind: 'ready', message: null });
      return true;
    } catch (error) {
      this.fail(`浏览器未能开启声场：${this.errorMessage(error)}`);
      return false;
    }
  }

  private buildGraph(context: AudioContextLike) {
    if (this.masterGain) return;
    this.masterGain = context.createGain();
    this.musicGain = context.createGain();
    this.sfxGain = context.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(context.destination);
    for (const id of STEM_IDS) {
      const gain = context.createGain();
      gain.connect(this.musicGain);
      this.stemGains.set(id, gain);
    }
  }

  private async startStems(context: AudioContextLike) {
    if (this.stemSources.size > 0) return;
    const atmosphere = await this.loadBuffer('music-atmosphere');
    this.stemEpochSeconds = context.currentTime;
    this.startStem(context, 'music-atmosphere', atmosphere, 0);
    const percussion = await this.loadBuffer('music-percussion');
    const color = await this.loadBuffer('music-color');
    const phase = Math.max(0, (context.currentTime - this.stemEpochSeconds) % 96);
    this.startStem(context, 'music-percussion', percussion, phase);
    this.startStem(context, 'music-color', color, phase);
  }

  private startStem(
    context: AudioContextLike,
    id: StemId,
    buffer: unknown,
    offset: number,
  ) {
    const gain = this.stemGains.get(id);
    if (!gain) throw new Error(`声部节点缺失：${id}`);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(0, offset);
    this.stemSources.add(source);
  }

  private loadBuffer(id: PresentationAudioId): Promise<unknown> {
    const loaded = this.buffers.get(id);
    if (loaded) return Promise.resolve(loaded);
    const pending = this.bufferPromises.get(id);
    if (pending) return pending;
    const record = PRESENTATION_AUDIO_BY_ID[id];
    const promise = this.fetchAudio(record.path)
      .then((source) => {
        if (!this.context) throw new Error('声场尚未开启');
        return this.context.decodeAudioData(source);
      })
      .then((buffer) => {
        this.buffers.set(id, buffer);
        this.bufferPromises.delete(id);
        return buffer;
      })
      .catch((error: unknown) => {
        this.bufferPromises.delete(id);
        throw error;
      });
    this.bufferPromises.set(id, promise);
    return promise;
  }

  private ramp(node: GainNodeLike | null, target: number, now: number, duration: number) {
    if (!node) return;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(target, now + duration);
  }

  private rememberCueKey(cueKey: string) {
    this.playedCueKeys.add(cueKey);
    this.playedCueOrder.push(cueKey);
    if (this.playedCueOrder.length <= 512) return;
    const removed = this.playedCueOrder.shift();
    if (removed) this.playedCueKeys.delete(removed);
  }

  private fail(message: string) {
    this.updateStatus({ kind: 'error', message });
  }

  private updateStatus(status: PresentationAudioStatus) {
    this.status = status;
    this.onStatus?.(status);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '未知媒体错误';
  }
}
