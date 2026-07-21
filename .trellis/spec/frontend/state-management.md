# State Management

> Redux, deterministic engine state, IndexedDB, URL, and local UI state.

---

## Overview

Redux Toolkit owns application-wide runtime state. The game engine remains a
pure command/state machine; Redux thunks orchestrate it with profile progression
and IndexedDB. Components use local React state only for transient
presentation. There is no server state.

---

## State Categories

| Category | Owner | Examples |
|---|---|---|
| Domain run state | game-core model, held in Redux | phase, hand, inventory, checkpoint, RNG |
| Profile and device state | Redux plus GameRepository | profiles, unlocks, settings, active run |
| Application navigation | appSlice plus durable hash route | menu/setup/playing status |
| Presentation sequence | Redux | score and transition cue queue |
| Transient component state | local React state | tabs, input drafts, pointer state, modal detail |
| Browser engine state | owning component/ref | Web Audio engine, timers, file input |
| Durable storage | IndexedDbGameRepository | profile/run pair, settings, recovery |

Selectors derive view data from domain state. Do not persist values that can be
recomputed reliably from the durable source.

---

## Command Flow

Durable gameplay follows this order:

1. A component dispatches submitRunCommand with the current checkpoint.
2. The thunk calls commitRunCommand.
3. The pure engine proposes new state and typed events.
4. Invariants and progression projection run.
5. The repository atomically writes the projected profile and run.
6. Redux publishes the committed state and presentation sequence.

On rejection or persistence failure, Redux retains the previous profile and run.
This persistence-first rule is part of the observable product contract.

---

## When to Use Global State

Use Redux when state:

- determines the current screen or game phase;
- must be shared across distant presentation components;
- survives screen replacement or lazy boundaries;
- participates in durable profile/run transactions; or
- drives a global presentation/audio sequence.

Keep state local when it is a reversible visual choice owned by one mounted
component. ShopScreen's active offer group and
JokerArtworkInspectorProvider's open artwork are reference examples.

Do not promote local pointer/hover state to Redux. Do not keep a second mutable
copy of run state in a screen.

---

## Dependency Injection

createGameStore receives the GameRepository, clock, seed generator, and initial
route reader. Tests inject memory repositories and deterministic functions:

~~~ts
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
~~~

Components consume useAppDispatch and useAppSelector, not the repository.

---

## Server and URL State

There is no remote server cache. Bundled content is imported from src/content,
and initialization reads IndexedDB once through a thunk.

The hash route is a durable navigation hint, not the source of game truth.
src/app/routeState.ts parses a closed union and App synchronizes valid Redux
status back with history.replaceState.

---

## Common Mistakes

- Publishing an engine proposal before its IndexedDB transaction succeeds.
- Calling executeCommandV2 or IndexedDB directly from a component.
- Storing derived hand, score, availability, or catalog projections as another
  mutable source of truth.
- Using local state for a value that must survive a screen/phase transition.
- Treating the hash route as authority for a phase the restored run does not
  support.
- Using global randomness or wall-clock time instead of injected dependencies.
