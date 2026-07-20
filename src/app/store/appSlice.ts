import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { createRunEconomyFixtureRun } from '../../content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import { createProductionRunV7 } from '../../content/runtime/runSetupV7';
import type { PresentationEventV2, RunCommandV2 } from '../../game-core/commands/typesV2';
import type { ProfileId } from '../../game-core/model/ids';
import type { RunStateV2 } from '../../game-core/model/runV2';
import { isRunStateV7, type RunClassV7 } from '../../game-core/model/runV7';
import {
  DEFAULT_DEVICE_SETTINGS,
  type DeviceSettingsV1,
} from '../../persistence/deviceSettings';
import {
  createProfile,
  renameProfile,
  type ProfileRecord,
  type ProfileSlot,
} from '../../persistence/profiles';
import type { GameRepository } from '../../persistence/repository';
import {
  planPresentationSequence,
  type PresentationSequenceV1,
} from '../../presentation/motion/presentationSequence';
import {
  exportProfileToJson,
  importProfileFromJson,
  remapImportedProfileToSlot,
} from '../../persistence/profileTransfer';
import {
  projectRunAbandon,
  projectRunStart,
  projectTutorialSkip,
} from '../../progression/reducer';
import { normalizeGeneratedSeed } from '../../progression/seedCode';
import {
  assertAvailableModeSetup,
  selectAvailableDecks,
  selectFrozenEligibilityObjectiveIds,
  selectAvailableStakesForDeck,
} from '../../progression/selectors';
import { createTutorialRun } from '../../tutorial/script';
import { commitRunCommand } from '../commitRunCommand';
import type { DurableAppRoute } from '../routeState';

export type AppStatus =
  | 'loading'
  | 'profiles'
  | 'menu'
  | 'setup'
  | 'playing'
  | 'collection'
  | 'achievements'
  | 'statistics'
  | 'help'
  | 'maintenance'
  | 'notices';

export type ModeSetupKind = 'campaign' | 'seeded' | 'challenge';

export interface AppState {
  readonly status: AppStatus;
  readonly busy: boolean;
  readonly error: string | null;
  readonly profiles: readonly ProfileRecord[];
  readonly activeProfileId: ProfileId | null;
  readonly run: RunStateV2 | null;
  readonly presentationSequence: PresentationSequenceV1 | null;
  readonly setupMode: ModeSetupKind | null;
  readonly setupSeed: string | null;
  readonly settings: DeviceSettingsV1;
  readonly settingsOpen: boolean;
  readonly settingsBusy: boolean;
  readonly settingsError: string | null;
  readonly settingsRollback: DeviceSettingsV1 | null;
}

interface ApplicationRootState {
  readonly app: AppState;
}

interface AppThunkConfig {
  readonly state: ApplicationRootState;
  readonly extra: {
    readonly repository: GameRepository;
    readonly nowEpochMs: () => number;
    readonly generateSeed: () => string;
    readonly readInitialRoute: () => DurableAppRoute | null;
  };
  readonly rejectValue: string;
}

const initialState: AppState = {
  status: 'loading',
  busy: false,
  error: null,
  profiles: [],
  activeProfileId: null,
  run: null,
  presentationSequence: null,
  setupMode: null,
  setupSeed: null,
  settings: DEFAULT_DEVICE_SETTINGS,
  settingsOpen: false,
  settingsBusy: false,
  settingsError: null,
  settingsRollback: null,
};

export const generateLocalSetupSeed = createAsyncThunk<string, void, AppThunkConfig>(
  'app/generate-setup-seed',
  (_argument, { extra, rejectWithValue }) => {
    try {
      return normalizeGeneratedSeed(extra.generateSeed());
    } catch (error) {
      return rejectWithValue(`生成种子失败：${errorMessage(error)}`);
    }
  },
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知本地错误';
}

function sortedProfiles(profiles: readonly ProfileRecord[]): ProfileRecord[] {
  return [...profiles].sort((left, right) => left.slot - right.slot);
}

export const saveDeviceSettings = createAsyncThunk<
  DeviceSettingsV1,
  DeviceSettingsV1,
  AppThunkConfig
>(
  'app/save-device-settings',
  async (settings, { extra, rejectWithValue }) => {
    try {
      await extra.repository.saveSettings(settings);
      return settings;
    } catch (error) {
      return rejectWithValue(`声场设置保存失败：${errorMessage(error)}`);
    }
  },
  {
    condition: (_settings, { getState }) => !getState().app.settingsBusy,
  },
);

export const initializeApplication = createAsyncThunk<
  {
    profiles: ProfileRecord[];
    activeProfileId: ProfileId | null;
    run: RunStateV2 | null;
    initialRoute: DurableAppRoute | null;
    settings: DeviceSettingsV1;
    settingsError: string | null;
  },
  void,
  AppThunkConfig
>('app/initialize', async (_argument, { extra, rejectWithValue }) => {
  try {
    await extra.repository.initialize();
    const [profiles, storedActiveId, settingsResult] = await Promise.all([
      extra.repository.listProfiles(),
      extra.repository.getActiveProfileId(),
      extra.repository
        .getSettings()
        .then((settings) => ({ settings, error: null }))
        .catch((error: unknown) => ({
          settings: DEFAULT_DEVICE_SETTINGS,
          error: `声场设置读取失败：${errorMessage(error)}`,
        })),
    ]);
    const activeProfileId = profiles.some((profile) => profile.id === storedActiveId)
      ? storedActiveId
      : null;
    const run = activeProfileId
      ? ((await extra.repository.loadRun(activeProfileId)) ?? null)
      : null;
    return {
      profiles,
      activeProfileId,
      run,
      initialRoute: extra.readInitialRoute(),
      settings: settingsResult.settings,
      settingsError: settingsResult.error,
    };
  } catch (error) {
    return rejectWithValue(`无法读取本地档案：${errorMessage(error)}`);
  }
});

export const createLocalProfile = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[] },
  { slot: ProfileSlot; displayName: string; nowEpochMs?: number },
  AppThunkConfig
>('app/create-profile', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    if (getState().app.profiles.some((profile) => profile.slot === argument.slot)) {
      throw new Error('这个档案位已经有人了');
    }
    const profile = createProfile(argument.slot, argument.displayName, nowEpochMs);
    await extra.repository.saveProfile(profile);
    await extra.repository.setActiveProfile(profile.id);
    return { profile, profiles: await extra.repository.listProfiles() };
  } catch (error) {
    return rejectWithValue(`建档失败：${errorMessage(error)}`);
  }
});

export const selectLocalProfile = createAsyncThunk<
  { profileId: ProfileId; run: RunStateV2 | null },
  ProfileId,
  AppThunkConfig
>('app/select-profile', async (profileId, { extra, rejectWithValue }) => {
  try {
    const profile = await extra.repository.getProfile(profileId);
    if (!profile) throw new Error('档案不存在');
    await extra.repository.setActiveProfile(profileId);
    const run = (await extra.repository.loadRun(profileId)) ?? null;
    return { profileId, run };
  } catch (error) {
    return rejectWithValue(`切换档案失败：${errorMessage(error)}`);
  }
});

export const renameLocalProfile = createAsyncThunk<
  { profiles: ProfileRecord[] },
  {
    profileId: ProfileId;
    displayName: string;
    nowEpochMs?: number;
  },
  AppThunkConfig
>('app/rename-profile', async (argument, { extra, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const profile = await extra.repository.getProfile(argument.profileId);
    if (!profile) throw new Error('档案不存在');
    await extra.repository.saveProfile(
      renameProfile(profile, argument.displayName, nowEpochMs),
    );
    return { profiles: await extra.repository.listProfiles() };
  } catch (error) {
    return rejectWithValue(`改名失败：${errorMessage(error)}`);
  }
});

export const deleteLocalProfile = createAsyncThunk<
  {
    profiles: ProfileRecord[];
    activeProfileId: ProfileId | null;
    deletedActive: boolean;
  },
  ProfileId,
  AppThunkConfig
>('app/delete-profile', async (profileId, { extra, getState, rejectWithValue }) => {
  try {
    const deletedActive = getState().app.activeProfileId === profileId;
    await extra.repository.deleteProfile(profileId);
    if (deletedActive) await extra.repository.setActiveProfile(null);
    return {
      profiles: await extra.repository.listProfiles(),
      activeProfileId: deletedActive ? null : getState().app.activeProfileId,
      deletedActive,
    };
  } catch (error) {
    return rejectWithValue(`删除档案失败：${errorMessage(error)}`);
  }
});

export const startLocalFixtureRun = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[]; run: RunStateV2 },
  { seed: string; nowEpochMs?: number },
  AppThunkConfig
>('app/start-fixture-run', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const activeProfileId = getState().app.activeProfileId;
    if (!activeProfileId) throw new Error('请先选择档案');
    const profile = getState().app.profiles.find((item) => item.id === activeProfileId);
    if (!profile) throw new Error('当前档案不存在');
    const run = createRunEconomyFixtureRun({ seed: argument.seed });
    const updatedProfile: ProfileRecord = {
      ...profile,
      activeRunId: run.runId,
      updatedAtEpochMs: nowEpochMs,
      currentRunProgress: {
        ...profile.currentRunProgress,
        runId: run.runId,
      },
    };
    await extra.repository.commitCheckpoint(updatedProfile, run);
    return {
      profile: updatedProfile,
      profiles: sortedProfiles(
        getState().app.profiles.map((item) =>
          item.id === updatedProfile.id ? updatedProfile : item,
        ),
      ),
      run,
    };
  } catch (error) {
    return rejectWithValue(`开局失败：${errorMessage(error)}`);
  }
});

export const startLocalProductionRun = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[]; run: RunStateV2 },
  {
    seed: string;
    nowEpochMs?: number;
    runClass?: Exclude<RunClassV7, 'migrated-legacy'>;
    deckId?: string;
    stakeId?: string;
    challengeId?: string | null;
  },
  AppThunkConfig
>('app/start-production-run', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const activeProfileId = getState().app.activeProfileId;
    if (!activeProfileId) throw new Error('请先选择档案');
    const profile = getState().app.profiles.find((item) => item.id === activeProfileId);
    if (!profile) throw new Error('当前档案不存在');
    const runClass = argument.runClass ?? 'campaign';
    const firstDeck = selectAvailableDecks(profile, PRODUCTION_CATALOG)[0];
    const deckId = argument.deckId ?? firstDeck?.id;
    const stakeId =
      argument.stakeId ??
      (deckId
        ? selectAvailableStakesForDeck(profile, PRODUCTION_CATALOG, deckId)[0]?.id
        : undefined);
    if (runClass === 'challenge') {
      if (!argument.challengeId) throw new Error('请选择一项已开放挑战');
      assertAvailableModeSetup(profile, PRODUCTION_CATALOG, {
        runClass,
        challengeId: argument.challengeId,
      });
    } else if (runClass !== 'tutorial') {
      if (!deckId || !stakeId) throw new Error('缺少可用牌组或筹码等级');
      assertAvailableModeSetup(profile, PRODUCTION_CATALOG, {
        runClass,
        deckId,
        stakeId,
      });
    }
    if (!deckId) throw new Error('缺少可用牌组');
    const run =
      runClass === 'tutorial'
        ? createTutorialRun(PRODUCTION_CATALOG, profile, argument.seed)
        : createProductionRunV7(PRODUCTION_CATALOG, {
            seed: argument.seed,
            profileId: profile.id,
            runSequence: profile.nextRunSequence,
            runClass,
            ...(deckId ? { deckId } : {}),
            ...(stakeId ? { stakeId } : {}),
            ...(argument.challengeId !== undefined
              ? { challengeId: argument.challengeId }
              : {}),
            eligibilityObjectiveIds: selectFrozenEligibilityObjectiveIds(
              profile,
              PRODUCTION_CATALOG,
              deckId,
            ),
            discoveredContentIds: profile.collection.discoveredJokerIds,
          });
    const updatedProfile = projectRunStart(profile, run, nowEpochMs);
    await extra.repository.commitCheckpoint(updatedProfile, run);
    return {
      profile: updatedProfile,
      profiles: sortedProfiles(
        getState().app.profiles.map((item) =>
          item.id === updatedProfile.id ? updatedProfile : item,
        ),
      ),
      run,
    };
  } catch (error) {
    return rejectWithValue(`开局失败：${errorMessage(error)}`);
  }
});

export const submitRunCommand = createAsyncThunk<
  {
    profile: ProfileRecord;
    profiles: ProfileRecord[];
    run: RunStateV2;
    presentationEvents: readonly PresentationEventV2[];
  },
  RunCommandV2,
  AppThunkConfig
>('app/submit-run-command', async (command, { extra, getState, rejectWithValue }) => {
  const state = getState().app;
  const profile = state.profiles.find((item) => item.id === state.activeProfileId);
  if (!profile || !state.run) return rejectWithValue('当前没有可操作的牌局');

  const result = await commitRunCommand(
    extra.repository,
    profile,
    state.run,
    command,
    extra.nowEpochMs(),
  );
  if (!result.ok) return rejectWithValue(result.message);
  return {
    profile: result.profile,
    profiles: sortedProfiles(
      state.profiles.map((item) =>
        item.id === result.profile.id ? result.profile : item,
      ),
    ),
    run: result.state,
    presentationEvents: result.presentationEvents,
  };
});

export const finishLocalRun = createAsyncThunk<
  { profiles: ProfileRecord[] },
  void,
  AppThunkConfig
>('app/finish-local-run', async (_argument, { extra, getState, rejectWithValue }) => {
  try {
    const state = getState().app;
    const profile = state.profiles.find((item) => item.id === state.activeProfileId);
    if (!profile) throw new Error('当前档案不存在');
    const projected = projectRunAbandon(profile, extra.nowEpochMs());
    await extra.repository.clearRun(projected);
    return {
      profiles: sortedProfiles(
        state.profiles.map((item) => (item.id === profile.id ? projected : item)),
      ),
    };
  } catch (error) {
    return rejectWithValue(`收尾失败：${errorMessage(error)}`);
  }
});

export const exportActiveProfile = createAsyncThunk<string, void, AppThunkConfig>(
  'app/export-active-profile',
  async (_argument, { extra, getState, rejectWithValue }) => {
    try {
      const state = getState().app;
      const profile = state.profiles.find((item) => item.id === state.activeProfileId);
      if (!profile) throw new Error('请先选择要导出的档案');
      const run = profile.activeRunId
        ? ((await extra.repository.loadRun(profile.id)) ?? null)
        : null;
      return exportProfileToJson(profile, run);
    } catch (error) {
      return rejectWithValue(`导出失败：${errorMessage(error)}`);
    }
  },
);

export const importLocalProfile = createAsyncThunk<
  { profiles: ProfileRecord[]; profile: ProfileRecord; run: RunStateV2 | null },
  string,
  AppThunkConfig
>('app/import-profile', async (text, { extra, rejectWithValue }) => {
  try {
    const imported = importProfileFromJson(text);
    await extra.repository.replaceProfile(imported.profile, imported.run);
    await extra.repository.setActiveProfile(imported.profile.id);
    return {
      profiles: await extra.repository.listProfiles(),
      profile: imported.profile,
      run: imported.run,
    };
  } catch (error) {
    return rejectWithValue(`导入失败：${errorMessage(error)}`);
  }
});

export const importLocalProfileToSlot = createAsyncThunk<
  { profiles: ProfileRecord[]; profile: ProfileRecord; run: RunStateV2 | null },
  { text: string; targetSlot: ProfileSlot; nowEpochMs?: number },
  AppThunkConfig
>('app/import-profile-to-slot', async (argument, { extra, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const imported = remapImportedProfileToSlot(
      importProfileFromJson(argument.text),
      argument.targetSlot,
      nowEpochMs,
    );
    await extra.repository.replaceProfile(imported.profile, imported.run);
    await extra.repository.setActiveProfile(imported.profile.id);
    return {
      profiles: await extra.repository.listProfiles(),
      profile: imported.profile,
      run: imported.run,
    };
  } catch (error) {
    return rejectWithValue(`导入失败：${errorMessage(error)}`);
  }
});

export const abandonActiveRun = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[] },
  { nowEpochMs?: number },
  AppThunkConfig
>('app/abandon-run', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const state = getState().app;
    const profile = state.profiles.find((item) => item.id === state.activeProfileId);
    if (!profile || !profile.activeRunId) throw new Error('当前没有可放弃的牌局');
    const projected = projectRunAbandon(profile, nowEpochMs);
    await extra.repository.clearRun(projected);
    return {
      profile: projected,
      profiles: sortedProfiles(
        state.profiles.map((item) => (item.id === projected.id ? projected : item)),
      ),
    };
  } catch (error) {
    return rejectWithValue(`弃局失败：${errorMessage(error)}`);
  }
});

export const skipActiveTutorial = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[] },
  { nowEpochMs?: number },
  AppThunkConfig
>('app/skip-tutorial', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const state = getState().app;
    const profile = state.profiles.find((item) => item.id === state.activeProfileId);
    if (!profile) throw new Error('当前没有可跳过的教程');
    const activeTutorial =
      profile.activeRunId !== null &&
      state.run !== null &&
      isRunStateV7(state.run) &&
      state.run.sessionV7.runClass === 'tutorial';
    if (!activeTutorial && profile.tutorial.status !== 'not-started') {
      throw new Error('当前没有可跳过的教程');
    }
    const projected = projectTutorialSkip(profile, nowEpochMs);
    if (activeTutorial) await extra.repository.clearRun(projected);
    else await extra.repository.saveProfile(projected);
    return {
      profile: projected,
      profiles: sortedProfiles(
        state.profiles.map((item) => (item.id === projected.id ? projected : item)),
      ),
    };
  } catch (error) {
    return rejectWithValue(`跳过教程失败：${errorMessage(error)}`);
  }
});

export const resetActiveProfile = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[] },
  { nowEpochMs?: number },
  AppThunkConfig
>('app/reset-profile', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const profileId = getState().app.activeProfileId;
    if (!profileId) throw new Error('请先选择档案');
    const profile = await extra.repository.resetProfile(profileId, nowEpochMs);
    return { profile, profiles: await extra.repository.listProfiles() };
  } catch (error) {
    return rejectWithValue(`重置失败：${errorMessage(error)}`);
  }
});

export const restoreActiveProfile = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[]; run: RunStateV2 | null },
  void,
  AppThunkConfig
>('app/restore-profile', async (_argument, { extra, getState, rejectWithValue }) => {
  try {
    const profileId = getState().app.activeProfileId;
    if (!profileId) throw new Error('请先选择档案');
    const restored = await extra.repository.restoreProfileAction(profileId);
    return { ...restored, profiles: await extra.repository.listProfiles() };
  } catch (error) {
    return rejectWithValue(`恢复失败：${errorMessage(error)}`);
  }
});

export const acknowledgeProgressionNotices = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[] },
  { noticeIds: readonly string[]; nowEpochMs?: number },
  AppThunkConfig
>('app/acknowledge-notices', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const nowEpochMs = argument.nowEpochMs ?? extra.nowEpochMs();
    const state = getState().app;
    const profile = state.profiles.find((item) => item.id === state.activeProfileId);
    if (!profile) throw new Error('请先选择档案');
    const acknowledged = new Set(argument.noticeIds);
    const projected: ProfileRecord = {
      ...profile,
      updatedAtEpochMs: nowEpochMs,
      unreadNotices: profile.unreadNotices.filter(
        ({ noticeId }) => !acknowledged.has(noticeId),
      ),
    };
    await extra.repository.saveProfile(projected);
    return {
      profile: projected,
      profiles: sortedProfiles(
        state.profiles.map((item) => (item.id === projected.id ? projected : item)),
      ),
    };
  } catch (error) {
    return rejectWithValue(`通知更新失败：${errorMessage(error)}`);
  }
});

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    openSoundStageDrawer(state) {
      state.settingsOpen = true;
    },
    closeSoundStageDrawer(state) {
      state.settingsOpen = false;
    },
    skipPresentationSequence(state) {
      state.presentationSequence = null;
    },
    finishPresentationSequence(state) {
      state.presentationSequence = null;
    },
    advancePresentationSequence(state) {
      const sequence = state.presentationSequence;
      if (!sequence) return;
      const nextCursor = sequence.cursor + 1;
      state.presentationSequence =
        nextCursor >= sequence.cues.length ? null : { ...sequence, cursor: nextCursor };
    },
    showProfiles(state) {
      state.status = 'profiles';
      state.run = null;
      state.presentationSequence = null;
      state.setupMode = null;
      state.setupSeed = null;
    },
    showMenu(state) {
      state.status = 'menu';
      state.setupMode = null;
      state.setupSeed = null;
    },
    resumeRun(state) {
      if (state.run) state.status = 'playing';
    },
    showModeSetup(state, action: PayloadAction<ModeSetupKind>) {
      state.status = 'setup';
      state.setupMode = action.payload;
      state.setupSeed = null;
    },
    showCollection(state) {
      state.status = 'collection';
    },
    showAchievements(state) {
      state.status = 'achievements';
    },
    showStatistics(state) {
      state.status = 'statistics';
    },
    showHelp(state) {
      state.status = 'help';
    },
    showMaintenance(state) {
      state.status = 'maintenance';
    },
    showNotices(state) {
      state.status = 'notices';
    },
  },
  extraReducers(builder) {
    builder
      .addCase(saveDeviceSettings.pending, (state, action) => {
        state.settingsBusy = true;
        state.settingsError = null;
        state.settingsRollback = state.settings;
        state.settings = action.meta.arg;
      })
      .addCase(saveDeviceSettings.fulfilled, (state, action) => {
        state.settingsBusy = false;
        state.settings = action.payload;
        state.settingsRollback = null;
      })
      .addCase(saveDeviceSettings.rejected, (state, action) => {
        state.settingsBusy = false;
        if (state.settingsRollback) state.settings = state.settingsRollback;
        state.settingsRollback = null;
        state.settingsError =
          action.payload ?? action.error.message ?? '声场设置保存失败';
      })
      .addCase(generateLocalSetupSeed.fulfilled, (state, action) => {
        state.setupSeed = action.payload;
        state.error = null;
      })
      .addCase(generateLocalSetupSeed.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message ?? '生成种子失败';
      })
      .addCase(initializeApplication.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(initializeApplication.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        activeProfileId: action.payload.activeProfileId,
        run: action.payload.run,
        settings: action.payload.settings,
        settingsError: action.payload.settingsError,
        status: (() => {
          if (action.payload.run) return 'playing';
          if (!action.payload.activeProfileId) return 'profiles';
          const route = action.payload.initialRoute;
          const activeProfile = action.payload.profiles.find(
            ({ id }) => id === action.payload.activeProfileId,
          );
          if (
            route?.status === 'setup' &&
            activeProfile?.tutorial.status === 'not-started'
          ) {
            return 'menu';
          }
          return route && route.status !== 'playing' ? route.status : 'menu';
        })(),
        setupMode:
          action.payload.initialRoute?.status === 'setup' &&
          action.payload.profiles.find(({ id }) => id === action.payload.activeProfileId)
            ?.tutorial.status !== 'not-started'
            ? action.payload.initialRoute.setupMode
            : null,
      }))
      .addCase(initializeApplication.rejected, (state, action) => {
        state.busy = false;
        state.status = 'profiles';
        state.error = action.payload ?? action.error.message ?? '初始化失败';
      })
      .addCase(createLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(createLocalProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        activeProfileId: action.payload.profile.id,
        run: null,
        status: 'menu',
      }))
      .addCase(createLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '建档失败';
      })
      .addCase(selectLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(selectLocalProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        activeProfileId: action.payload.profileId,
        run: action.payload.run,
        status: action.payload.run ? 'playing' : 'menu',
        presentationSequence: null,
      }))
      .addCase(selectLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '切换档案失败';
      })
      .addCase(renameLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(renameLocalProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
      }))
      .addCase(renameLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '改名失败';
      })
      .addCase(deleteLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(deleteLocalProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        activeProfileId: action.payload.activeProfileId,
        run: action.payload.deletedActive ? null : state.run,
        status: action.payload.deletedActive ? 'profiles' : state.status,
        presentationSequence: action.payload.deletedActive
          ? null
          : state.presentationSequence,
      }))
      .addCase(deleteLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '删除档案失败';
      })
      .addCase(startLocalFixtureRun.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(startLocalFixtureRun.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: action.payload.run,
        status: 'playing',
        presentationSequence: null,
      }))
      .addCase(startLocalFixtureRun.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '开局失败';
      })
      .addCase(startLocalProductionRun.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(startLocalProductionRun.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: action.payload.run,
        status: 'playing',
        setupSeed: null,
        presentationSequence: null,
      }))
      .addCase(startLocalProductionRun.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '开局失败';
      })
      .addCase(submitRunCommand.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(submitRunCommand.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: action.payload.run,
        presentationSequence: planPresentationSequence({
          events: action.payload.presentationEvents,
          runId: action.payload.run.runId,
          checkpointId: action.payload.run.checkpointId,
        }),
      }))
      .addCase(submitRunCommand.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '操作失败';
      })
      .addCase(finishLocalRun.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(finishLocalRun.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: null,
        status: 'menu',
        presentationSequence: null,
      }))
      .addCase(finishLocalRun.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '收尾失败';
      })
      .addCase(importLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(importLocalProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        activeProfileId: action.payload.profile.id,
        run: action.payload.run,
        status: action.payload.run ? 'playing' : 'menu',
        presentationSequence: null,
      }))
      .addCase(importLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '导入失败';
      })
      .addCase(importLocalProfileToSlot.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(importLocalProfileToSlot.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        activeProfileId: action.payload.profile.id,
        run: action.payload.run,
        status: action.payload.run ? 'playing' : 'menu',
        presentationSequence: null,
      }))
      .addCase(importLocalProfileToSlot.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '导入失败';
      })
      .addCase(abandonActiveRun.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: null,
        status: 'menu',
        presentationSequence: null,
      }))
      .addCase(abandonActiveRun.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(abandonActiveRun.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '弃局失败';
      })
      .addCase(skipActiveTutorial.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: null,
        status: 'menu',
        presentationSequence: null,
      }))
      .addCase(skipActiveTutorial.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(skipActiveTutorial.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '跳过教程失败';
      })
      .addCase(resetActiveProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: null,
        status: 'menu',
        presentationSequence: null,
      }))
      .addCase(resetActiveProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(resetActiveProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '重置失败';
      })
      .addCase(restoreActiveProfile.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
        run: action.payload.run,
        status: action.payload.run ? 'playing' : 'menu',
        presentationSequence: null,
      }))
      .addCase(restoreActiveProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(restoreActiveProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '恢复失败';
      })
      .addCase(acknowledgeProgressionNotices.fulfilled, (state, action): AppState => ({
        ...state,
        busy: false,
        profiles: action.payload.profiles,
      }))
      .addCase(acknowledgeProgressionNotices.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(acknowledgeProgressionNotices.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '通知更新失败';
      });
  },
});

export const {
  advancePresentationSequence,
  closeSoundStageDrawer,
  clearError,
  finishPresentationSequence,
  openSoundStageDrawer,
  resumeRun,
  showAchievements,
  showCollection,
  showHelp,
  showMaintenance,
  showMenu,
  showModeSetup,
  showNotices,
  showProfiles,
  showStatistics,
  skipPresentationSequence,
} = appSlice.actions;
export const appReducer = appSlice.reducer;
