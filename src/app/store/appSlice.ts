import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { createRunEconomyFixtureRun } from '../../content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import { createProductionRunV5 } from '../../content/runtime/runSetupV5';
import type { PresentationEventV2, RunCommandV2 } from '../../game-core/commands/typesV2';
import type { ProfileId } from '../../game-core/model/ids';
import type { RunStateV2 } from '../../game-core/model/runV2';
import {
  createProfile,
  renameProfile,
  type ProfileRecord,
  type ProfileSlot,
} from '../../persistence/profiles';
import type { GameRepository } from '../../persistence/repository';
import {
  exportProfileToJson,
  importProfileFromJson,
} from '../../persistence/profileTransfer';
import { commitRunCommand } from '../commitRunCommand';

export type AppStatus = 'loading' | 'profiles' | 'playing';

export interface AppState {
  readonly status: AppStatus;
  readonly busy: boolean;
  readonly error: string | null;
  readonly profiles: readonly ProfileRecord[];
  readonly activeProfileId: ProfileId | null;
  readonly run: RunStateV2 | null;
  readonly presentationEvents: readonly PresentationEventV2[];
}

interface ApplicationRootState {
  readonly app: AppState;
}

interface AppThunkConfig {
  readonly state: ApplicationRootState;
  readonly extra: { readonly repository: GameRepository };
  readonly rejectValue: string;
}

const initialState: AppState = {
  status: 'loading',
  busy: false,
  error: null,
  profiles: [],
  activeProfileId: null,
  run: null,
  presentationEvents: [],
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知本地错误';
}

function sortedProfiles(profiles: readonly ProfileRecord[]): ProfileRecord[] {
  return [...profiles].sort((left, right) => left.slot - right.slot);
}

export const initializeApplication = createAsyncThunk<
  {
    profiles: ProfileRecord[];
    activeProfileId: ProfileId | null;
    run: RunStateV2 | null;
  },
  void,
  AppThunkConfig
>('app/initialize', async (_argument, { extra, rejectWithValue }) => {
  try {
    await extra.repository.initialize();
    const profiles = await extra.repository.listProfiles();
    const storedActiveId = await extra.repository.getActiveProfileId();
    const activeProfileId = profiles.some((profile) => profile.id === storedActiveId)
      ? storedActiveId
      : null;
    const run = activeProfileId
      ? ((await extra.repository.loadRun(activeProfileId)) ?? null)
      : null;
    return { profiles, activeProfileId, run };
  } catch (error) {
    return rejectWithValue(`无法读取本地档案：${errorMessage(error)}`);
  }
});

export const createLocalProfile = createAsyncThunk<
  { profile: ProfileRecord; profiles: ProfileRecord[] },
  { slot: ProfileSlot; displayName: string; nowEpochMs: number },
  AppThunkConfig
>('app/create-profile', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    if (getState().app.profiles.some((profile) => profile.slot === argument.slot)) {
      throw new Error('这个档案位已经有人了');
    }
    const profile = createProfile(
      argument.slot,
      argument.displayName,
      argument.nowEpochMs,
    );
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
    nowEpochMs: number;
  },
  AppThunkConfig
>('app/rename-profile', async (argument, { extra, rejectWithValue }) => {
  try {
    const profile = await extra.repository.getProfile(argument.profileId);
    if (!profile) throw new Error('档案不存在');
    await extra.repository.saveProfile(
      renameProfile(profile, argument.displayName, argument.nowEpochMs),
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
  { seed: string; nowEpochMs: number },
  AppThunkConfig
>('app/start-fixture-run', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const activeProfileId = getState().app.activeProfileId;
    if (!activeProfileId) throw new Error('请先选择档案');
    const profile = getState().app.profiles.find((item) => item.id === activeProfileId);
    if (!profile) throw new Error('当前档案不存在');
    const run = createRunEconomyFixtureRun({ seed: argument.seed });
    const updatedProfile: ProfileRecord = {
      ...profile,
      activeRunId: run.runId,
      updatedAtEpochMs: argument.nowEpochMs,
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
  { seed: string; nowEpochMs: number },
  AppThunkConfig
>('app/start-production-run', async (argument, { extra, getState, rejectWithValue }) => {
  try {
    const activeProfileId = getState().app.activeProfileId;
    if (!activeProfileId) throw new Error('请先选择档案');
    const profile = getState().app.profiles.find((item) => item.id === activeProfileId);
    if (!profile) throw new Error('当前档案不存在');
    const run = createProductionRunV5(PRODUCTION_CATALOG, { seed: argument.seed });
    const updatedProfile: ProfileRecord = {
      ...profile,
      activeRunId: run.runId,
      updatedAtEpochMs: argument.nowEpochMs,
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

export const submitRunCommand = createAsyncThunk<
  { run: RunStateV2; presentationEvents: readonly PresentationEventV2[] },
  RunCommandV2,
  AppThunkConfig
>('app/submit-run-command', async (command, { extra, getState, rejectWithValue }) => {
  const state = getState().app;
  const profile = state.profiles.find((item) => item.id === state.activeProfileId);
  if (!profile || !state.run) return rejectWithValue('当前没有可操作的牌局');

  const result = await commitRunCommand(extra.repository, profile, state.run, command);
  if (!result.ok) return rejectWithValue(result.message);
  return { run: result.state, presentationEvents: result.presentationEvents };
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
    await extra.repository.clearRun(profile);
    return {
      profiles: sortedProfiles(
        state.profiles.map((item) =>
          item.id === profile.id ? { ...item, activeRunId: null } : item,
        ),
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

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearPresentationEvents(state) {
      state.presentationEvents = [];
    },
    consumePresentationEvent(state) {
      state.presentationEvents = state.presentationEvents.slice(1);
    },
    showProfiles(state) {
      state.status = 'profiles';
      state.run = null;
      state.presentationEvents = [];
    },
  },
  extraReducers(builder) {
    builder
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
        status: action.payload.run ? 'playing' : 'profiles',
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
      .addCase(createLocalProfile.fulfilled, (state, action) => {
        state.busy = false;
        state.profiles = action.payload.profiles;
        state.activeProfileId = action.payload.profile.id;
        state.run = null;
        state.status = 'profiles';
      })
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
        status: action.payload.run ? 'playing' : 'profiles',
        presentationEvents: [],
      }))
      .addCase(selectLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '切换档案失败';
      })
      .addCase(renameLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(renameLocalProfile.fulfilled, (state, action) => {
        state.busy = false;
        state.profiles = action.payload.profiles;
      })
      .addCase(renameLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '改名失败';
      })
      .addCase(deleteLocalProfile.pending, (state) => {
        state.busy = true;
        state.error = null;
      })
      .addCase(deleteLocalProfile.fulfilled, (state, action) => {
        state.busy = false;
        state.profiles = action.payload.profiles;
        state.activeProfileId = action.payload.activeProfileId;
        if (action.payload.deletedActive) {
          state.run = null;
          state.status = 'profiles';
          state.presentationEvents = [];
        }
      })
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
        run: action.payload.run,
        presentationEvents: action.payload.presentationEvents,
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
        status: 'profiles',
        presentationEvents: [],
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
        status: action.payload.run ? 'playing' : 'profiles',
        presentationEvents: [],
      }))
      .addCase(importLocalProfile.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? action.error.message ?? '导入失败';
      });
  },
});

export const {
  clearError,
  clearPresentationEvents,
  consumePresentationEvent,
  showProfiles,
} = appSlice.actions;
export const appReducer = appSlice.reducer;
