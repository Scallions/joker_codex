# Directory Structure

> Frontend module organization and dependency direction.

---

## Overview

The repository is a single Vite application organized by architectural
responsibility rather than by page-only feature folders. React lives in app and
presentation; deterministic rules remain in game-core; browser storage remains
in persistence.

---

## Directory Layout

~~~
src/
├── app/                  # Composition, routes, Redux store, command commit flow
├── content/              # Bundled catalogs, localization, schemas, run builders
├── game-core/            # Pure deterministic rules, commands, models, selectors
├── persistence/          # IndexedDB, import/export, schemas, migrations
├── presentation/
│   ├── assets/           # Typed presentation asset registry
│   ├── audio/            # Browser audio engine and director
│   ├── catalog/          # Development catalog ledgers
│   ├── components/       # Reusable stage and artwork components
│   ├── motion/           # Motion tokens and presentation sequences
│   ├── progression/      # Menu, profile, collection, tutorial screens
│   ├── screens/          # Core run-stage screens
│   ├── selectors/        # UI projection helpers
│   ├── styles/           # Global reset and shared global styles
│   └── theme/            # Design tokens
├── progression/          # Pure profile progression rules
├── tutorial/             # Pure tutorial gates and script
└── main.tsx              # StrictMode browser entrypoint

tests/
├── app/ content/ game-core/ persistence/ presentation/
├── architecture/         # Layer boundary tests
├── integration/          # Cross-layer deterministic flows
└── e2e/                  # Chromium/WebKit behavior and screenshots
~~~

Static production art and audio live under public/assets. Source provenance is
kept next to those assets under provenance directories.

---

## Module Organization

- src/app/App.tsx owns top-level composition, route-to-screen selection,
  lazy-loading, providers, and the default IndexedDB repository.
- Screen components read typed Redux state and dispatch application thunks.
  They may call pure game selectors for display derivation, but do not execute
  durable writes directly.
- Reusable visual surfaces and controls belong in
  src/presentation/components. Screen-specific layout stays beside the screen.
- Shared motion timing belongs in src/presentation/motion, not hard-coded
  independently across screens.
- Authored game content belongs in src/content; UI labels shared by content
  belong in localization or typed presentation selectors.
- Keep tests in the matching tests subdirectory. Shared browser-only helpers
  belong in tests/e2e/helpers.

---

## Naming Conventions

- React components and their files use PascalCase: GameTableScreen.tsx,
  StageShell.tsx, JokerArtworkInspector.tsx.
- Non-component modules use camelCase: routeState.ts, motionTokens.ts,
  jokerPresentation.ts.
- Component-local styles use Name.module.css. Global tokens and reset styles
  are the exceptions.
- Screen components end in Screen; application-wide providers end in Provider;
  selectors start with select; React hooks start with use.
- Durable model generations use V-number suffixes. Do not add a suffix merely
  for an internal refactor with no versioned contract.

---

## Examples

- src/app/App.tsx composes providers and lazy screen boundaries.
- src/presentation/components/StagePrimitives.tsx centralizes themed buttons
  and surfaces while accepting native HTML props.
- src/presentation/screens/GameTableScreen.tsx keeps card-table behavior and
  its CSS module together.
- tests/architecture/layers.test.ts protects the intended import boundaries.

Avoid generic utils or components dumping grounds. Place a helper with the
layer that owns its vocabulary; promote it only after multiple real consumers
need the same contract.
