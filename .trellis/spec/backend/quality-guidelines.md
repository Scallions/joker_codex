# Quality Guidelines

> Quality standards for deterministic rules and local persistence.

---

## Overview

Non-UI quality centers on deterministic rules, strict dependency boundaries,
runtime validation of durable data, and atomic local persistence. The standard
gate is npm run check; browser-visible changes also require targeted Playwright
coverage.

---

## Forbidden Patterns

- Global Math.random, Date.now, or browser I/O inside game-core.
- Imports from React, Redux Toolkit, idb, Motion, app, persistence, or
  presentation inside game-core.
- In-place mutation of input state or arrays in rule functions.
- Direct IndexedDB access outside the persistence adapter.
- Publishing proposed state before profile/run persistence completes.
- Editing an old durable schema or migration to mean something new.
- any, unchecked external payload casts, circular imports, and value imports
  used only as types.

---

## Required Patterns

- Pass RNG state, clocks, generated seeds, repositories, and route readers as
  values or injected dependencies.
- Return a new state and updated RNG/checkpoint from successful commands.
- Validate domain invariants after a proposal and Zod-validate imported or
  stored payloads before use.
- Commit related profile/run writes in one transaction with recovery data.
- Use deterministic stable IDs and tie-breakers.
- Preserve typed domain and presentation events as separate evidence streams.

---

## Testing Requirements

- Unit tests cover commands, selectors, scoring, catalogs, progression, and
  migrations.
- fast-check properties cover determinism, conservation, and order invariants.
- Persistence tests cover transactions, migration chains, recovery, and
  injected failure stages.
- Integration tests replay full deterministic command sequences.
- tests/architecture/layers.test.ts and ESLint enforce dependency boundaries.
- Run npm run check before completion. Run relevant Chromium and WebKit tests
  for user-visible or browser-storage behavior.

---

## Code Review Checklist

1. Is the change in the correct layer, with game-core still browser-free?
2. Are all nondeterministic inputs explicit and replayable?
3. Are rejection and failure paths state-preserving?
4. Are durable schema changes versioned, validated, migrated, and recoverable?
5. Are profile and run updates atomic?
6. Do tests prove the failure case as well as the success path?
7. Do npm run check, task validation, and git diff --check pass?
