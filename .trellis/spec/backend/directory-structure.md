# Directory Structure

> How non-UI code is organized in this browser-only project.

---

## Overview

There is no backend runtime and no API endpoint directory. The non-UI code is
split by responsibility:

- src/game-core contains deterministic rules and domain models.
- src/content contains bundled catalogs, schemas, and run assembly.
- src/progression and src/tutorial contain pure local progression policies.
- src/persistence contains browser storage contracts, schemas, migrations, and
  the IndexedDB adapter.
- src/app is the composition and orchestration boundary between those layers
  and React.

Server concepts such as controllers, routes, middleware, and request DTOs do
not currently exist.

---

## Directory Layout

~~~
src/
├── app/                 # Redux orchestration and application composition
├── content/             # Bundled production catalogs and content validation
├── game-core/           # Pure deterministic engine
├── persistence/         # IndexedDB repository and version migrations
├── progression/         # Profile progression projections
├── tutorial/            # Tutorial policy and script
└── presentation/        # React UI; not part of this backend-like boundary
~~~

---

## Module Organization

- Put rule state, commands, selectors, RNG, scoring, and invariants in
  src/game-core.
- Put authored definitions and catalog assembly in src/content, not in screen
  components.
- Put durable browser I/O behind GameRepository in
  src/persistence/repository.ts. The concrete IndexedDB code belongs in
  src/persistence/indexedDbRepository.ts.
- Put cross-layer command sequencing in src/app. For example,
  src/app/commitRunCommand.ts performs proposal, invariant validation,
  progression projection, and atomic persistence in that order.
- Keep src/game-core independent of React, Redux Toolkit, idb, Motion,
  src/app, src/persistence, and src/presentation. ESLint and
  tests/architecture/layers.test.ts enforce this boundary.

---

## Naming Conventions

- TypeScript source files use descriptive camelCase names such as
  executeCommandV2.ts and validateRunStateV7.ts.
- Versioned durable contracts carry a V-number suffix. Do not rewrite an old
  migration or schema in place.
- Test files mirror the responsibility under tests/game-core,
  tests/persistence, tests/app, and tests/integration.
- Stable content and instance identifiers use the bxqp namespace or the
  stableId helper rather than ad hoc numeric IDs.

---

## Examples

- src/game-core/rng/random.ts returns the next random state instead of reading
  global randomness.
- src/persistence/repository.ts is the browser-storage port consumed by the
  store.
- src/app/commitRunCommand.ts is the application transaction boundary.

Do not add browser database calls to game-core or presentation components. If a
future remote backend is needed, create an explicit service boundary and update
these guidelines before adding server code.
