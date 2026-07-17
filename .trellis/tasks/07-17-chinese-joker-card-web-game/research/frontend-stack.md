# Frontend Stack Research

## Decision

Use a client-only Vite + React + TypeScript application rendered primarily with
DOM/SVG. Keep the deterministic game engine in framework-free TypeScript and
use a small Canvas overlay only for non-authoritative particles when DOM/CSS is
not sufficient.

Recommended implementation stack:

- Current Vite with the React TypeScript template, pinned by the lockfile.
- React and React DOM for screens, cards, overlays, menus, and table layout.
- Redux Toolkit for serializable application/session state and typed commands.
- Motion for state-linked card movement, layout transitions, scoring sequences,
  and enter/exit choreography.
- CSS Modules plus global design tokens; no generic component kit or utility-CSS
  dependency.
- `idb` over IndexedDB for typed, transactional local persistence.
- Zod 4 for imported-save, content-definition, and migration-boundary validation.
- Web Audio API for local music/SFX buses and playback; no runtime CDN assets.
- Vitest + fast-check for unit, contract, and property tests.
- React Testing Library for component behavior.
- Playwright for full flows in Chromium, branded Chrome/Edge where available,
  and WebKit as automated Safari coverage, followed by a real-Safari smoke pass.

## Why DOM/React Instead of a Full Canvas Engine

Phaser is a mature browser-focused 2D engine with WebGL/Canvas rendering and an
official React integration. It is a good fit for physics-heavy or sprite-heavy
games. 百戏奇牌 instead has a small number of simultaneously visible cards and
a large amount of Chinese text, tooltips, tables, collection browsing, settings,
profiles, and modal workflows. A Phaser + React split would introduce two scene
trees and a bridge without a gameplay requirement that needs physics or a large
sprite batch.

DOM/SVG gives direct text measurement, natural layered layout, crisp card copy,
CSS styling, browser event handling, and simpler component tests. Motion supports
hardware-accelerated transforms, gestures, layout transitions, and sequenced
animations. A presentation-only Canvas layer can still provide coins, sparks,
paper flecks, and score-burst particles without owning interactive state.

## Runtime Boundary

The game must be split into the following dependency direction:

```text
content data -> pure game engine -> application orchestrator -> React presentation
                                  -> persistence adapter
                                  -> audio/animation event consumers
```

Rules:

1. `game-core` imports no React, Redux, browser storage, audio, or animation code.
2. A player intent becomes a typed domain command.
3. The engine validates the command and returns the next serializable state plus
   an ordered list of domain/presentation events.
4. The application commits the complete checkpoint transactionally before the
   UI treats an irreversible action as durable.
5. Animations and sounds consume emitted events but never affect scoring, random
   draws, inventory, unlocks, or persistence.
6. The UI renders projections/selectors and never performs gameplay arithmetic.

## Determinism

- Define a project-owned seeded PRNG with explicit unsigned 32-bit state, seeded
  through a stable string-to-state function.
- Use integer operations (`Math.imul`, shifts, and unsigned coercion) and keep
  golden output vectors so Chrome, Edge, and Safari must agree.
- Pass an RNG object/state explicitly through every random rule. Never call
  `Math.random()` inside domain or content code.
- Persist the PRNG state in every active-run checkpoint.
- Give each effect window a deterministic ordering contract: phase, priority,
  owned-card order, playing-card order, then stable content ID.

## Persistence

Use IndexedDB rather than `localStorage` for profiles and active runs because it
supports transactions and schema upgrades. Use one read-write transaction to
replace the active checkpoint and its metadata, then await transaction completion.
Keep the previous valid checkpoint until the new record validates and commits.

Suggested stores:

- `meta`: database/save schema versions and active profile ID.
- `settings`: shared device settings.
- `profiles`: three profile summaries and progression data.
- `runs`: at most one active-run checkpoint per profile.
- `recovery`: prior known-good checkpoint and last persistence failure metadata.

Zod validates data at import, database-read, migration, and content-load
boundaries. Internal engine functions rely on TypeScript domain types rather than
re-parsing every call.

## Local Development Contract

- Require Node.js 22.12 or newer within Vite's supported range.
- `npm install` installs the locked dependency graph.
- `npm run dev` starts the local Vite server.
- `npm run build` creates static assets; public deployment remains out of scope.
- `npm run check` runs formatting/lint, TypeScript, unit/contract tests, and the
  configured browser smoke suite.

## Quality Strategy

- Pure rule tests: poker evaluator, scoring pipeline, economy, shop generation,
  unlocks, challenge modifiers, autosave boundaries, and PRNG vectors.
- One contract suite per mapped content item plus focused interaction matrices.
- Property tests for card conservation, legal command generation, deterministic
  replay, score monotonicity where applicable, and save round trips.
- Component tests for selection, drag/reorder, tooltips, modals, profile flows,
  tutorial steps, and collection filtering.
- Browser tests for new run -> blind -> scoring -> shop -> save/reload, profile
  isolation, import/export, seeded replay, win/endless, loss, and challenge mode.
- Visual snapshots at 1280x720 and a larger desktop viewport for critical screens.

## Sources

- Vite guide and current runtime/browser requirements:
  https://vite.dev/guide/
- React client rendering and DOM component model:
  https://react.dev/reference/react-dom/client/createRoot
  https://react.dev/reference/react-dom/components
- React reducer guidance:
  https://react.dev/learn/extracting-state-logic-into-a-reducer
- Redux Toolkit TypeScript and serializable-state guidance:
  https://redux-toolkit.js.org/tutorials/typescript
  https://redux-toolkit.js.org/api/serializabilityMiddleware
- Motion for React capabilities:
  https://motion.dev/docs/react
- Phaser scope and official React integration used for comparison:
  https://docs.phaser.io/
  https://phaser.io/news/2024/02/official-phaser-3-and-react-template
- IndexedDB transactions and the `idb` wrapper:
  https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
  https://github.com/jakearchibald/idb
- Zod 4 validation:
  https://zod.dev/
- Vitest property-testing guidance:
  https://main.vitest.dev/guide/learn/testing-in-practice
- Playwright browser coverage:
  https://playwright.dev/docs/browsers

