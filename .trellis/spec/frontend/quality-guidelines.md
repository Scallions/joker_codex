# Quality Guidelines

> Static, unit, browser, visual, and build verification standards.

---

## Overview

Quality is enforced by formatting, linting, strict TypeScript, deterministic
tests, production build, and a gzip budget. npm run check is the default local
gate; it intentionally does not run Playwright, so browser-visible changes need
an additional targeted Chromium/WebKit command.

---

## Required Static Gates

- npm run format:check
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- npm run build:audit

npm run check runs that sequence. ESLint also enforces import cycles, type-only
imports, React hook rules, and the game-core dependency boundary. Always finish
with task validation and git diff --check for Trellis work.

---

## Testing Matrix

- tests/game-core: command, scoring, RNG, rejection, invariant, and property
  behavior.
- tests/content: catalog completeness, assets, IDs, and eligibility.
- tests/persistence: Zod decoding, migration, recovery, atomicity, and fault
  injection.
- tests/app: Redux orchestration and persistence-first command commits.
- tests/presentation: component behavior in jsdom.
- tests/integration: deterministic cross-layer replay and release coverage.
- tests/e2e: real browser flows, IndexedDB behavior, geometry, animation,
  screenshots, and tutorial progression.
- tests/architecture: dependency direction and forbidden browser objects.

Add the lowest-layer regression that can prove the contract. For interaction,
layout, pointer, animation, Web Audio, or IndexedDB integration defects, also
add a real-browser regression.

---

## Browser and Visual Checks

- Playwright runs Desktop Chrome and Desktop Safari projects.
- The baseline viewport is 1280 by 720; selected flows also cover 1920-wide
  desktop layouts.
- Use semantic locators or stable data-testid/data-layout-zone hooks.
- Assert durable state through the IndexedDB helper when UI completion alone
  could race persistence.
- Treat screenshot changes as reviewed product changes; do not update baselines
  merely to make a test pass.
- Verify final settled geometry for motion bugs, not only an intermediate class
  or Redux value.

---

## Forbidden Patterns

- Skipped, only, or weakened tests committed as a fix.
- Arbitrary sleeps when a visible, durable, or event-driven condition exists.
- Console debugging, debugger, ts-ignore, blanket ESLint disables, or hidden
  TODO acceptance gaps.
- Snapshot churn unrelated to the task.
- Import cycles or browser dependencies in game-core.
- Bypassing typed thunks, persistence transactions, or runtime validation.
- Large eager dependencies that silently exceed the initial gzip budget.

---

## Code Review Checklist

1. Does the implementation match the task's user-visible contract?
2. Is logic in the lowest correct layer with no duplicated source of truth?
3. Are loading, disabled, rejection, rollback, and empty states covered?
4. Are motion ownership and final settled layout deterministic?
5. Are durable changes migrated, recoverable, and tested under faults?
6. Does the regression fail for the original reason and pass for the fix?
7. Did npm run check and the relevant Chromium/WebKit tests pass freshly?
8. Did build:audit remain within the configured 350 KiB gzip budget?
