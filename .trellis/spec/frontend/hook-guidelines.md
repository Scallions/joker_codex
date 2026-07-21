# Hook Guidelines

> Typed Redux hooks and local React effect conventions.

---

## Overview

The only project-wide custom hooks are the typed Redux wrappers in
src/app/store/hooks.ts:

~~~ts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
~~~

There is no data-fetching hook layer because the game has no server. Most
shared calculations are pure selectors or helpers rather than custom hooks.

---

## Hook Selection

- useAppSelector reads the narrowest practical application slice.
- useAppDispatch sends synchronous reducers or async thunks. Prefix ignored
  dispatch promises with void in event handlers and effects.
- useState owns transient presentation state such as an open inspector,
  selected shop tab, input draft, or pointer gesture.
- useMemo is for derived collections or calculations whose inputs and cost
  justify memoization; it is not a semantic state store.
- useRef holds DOM references, one-time initialization guards, attempt
  counters, timers, or stable browser-engine instances.
- useEffect synchronizes with browser state, timers, audio, or event listeners.
  Pure derivation belongs in render or a selector.

---

## Effect Patterns

Effects list every reactive dependency and clean up anything they create:

~~~tsx
useEffect(() => {
  if (!active) return undefined;
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  window.addEventListener('keydown', closeOnEscape);
  return () => window.removeEventListener('keydown', closeOnEscape);
}, [active, close]);
~~~

For event listeners, remove the exact same handler during cleanup. Guard
one-time StrictMode initialization with a ref only when the operation truly
must happen once per mounted application instance.

When local state is initialized from a changing domain context, include the
context key in the stored value or synchronize it explicitly. ShopScreen's
tutorialStepId plus offer group is the reference pattern.

---

## Shared Stateful Logic

Extract a custom hook only when multiple components share real stateful
lifecycle behavior. First consider:

1. a pure selector in game-core or presentation/selectors;
2. a reusable component/provider;
3. an application thunk for durable orchestration.

If a hook is warranted, name it useSomething, keep browser side effects inside
its effect boundaries, and return typed values rather than Redux internals.

---

## Data Fetching

Not applicable. Catalogs are bundled modules and durable state comes from the
injected local repository during application initialization. Do not introduce
React Query, SWR, request caches, loading races, or retry policies for
IndexedDB-backed state.

---

## Common Mistakes

- Mirroring Redux or run state in useState and allowing the copies to diverge.
- Using an effect for a value that can be derived during render.
- Omitting effect dependencies to force a desired schedule.
- Failing to clear timers, listeners, audio nodes, or object URLs.
- Creating a custom hook that merely renames one selector or dispatch call.
- Capturing a stale checkpoint or tutorial step in a callback.
