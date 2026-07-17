import { configureStore } from '@reduxjs/toolkit';

import type { GameRepository } from '../../persistence/repository';
import { appReducer } from './appSlice';

export function createGameStore(repository: GameRepository) {
  return configureStore({
    reducer: { app: appReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: { repository } },
      }),
  });
}

export type GameStore = ReturnType<typeof createGameStore>;
export type RootState = ReturnType<GameStore['getState']>;
export type AppDispatch = GameStore['dispatch'];
