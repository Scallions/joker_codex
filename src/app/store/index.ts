import { configureStore } from '@reduxjs/toolkit';

import type { GameRepository } from '../../persistence/repository';
import { generateAutomaticSeed } from '../../progression/seedCode';
import type { DurableAppRoute } from '../routeState';
import { appReducer } from './appSlice';

export function createGameStore(
  repository: GameRepository,
  nowEpochMs: () => number = Date.now,
  generateSeed: () => string = generateAutomaticSeed,
  readInitialRoute: () => DurableAppRoute | null = () => null,
) {
  return configureStore({
    reducer: { app: appReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: { repository, nowEpochMs, generateSeed, readInitialRoute },
        },
      }),
  });
}

export type GameStore = ReturnType<typeof createGameStore>;
export type RootState = ReturnType<GameStore['getState']>;
export type AppDispatch = GameStore['dispatch'];
