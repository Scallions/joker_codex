# Playable Foundation Slice Implementation Plan

## Preconditions

- Parent PRD/design/research artifacts remain authoritative.
- Child PRD and design are reviewed by the implementation approval already given.
- Load `trellis-before-dev` before editing application code.

## Slice 1: Toolchain and Architectural Shell

1. Scaffold Vite React TypeScript in the repository root without overwriting
   Trellis/user files.
2. Pin dependencies and record the Node/npm contract.
3. Add scripts for dev, build, format check, lint, typecheck, unit tests, coverage,
   and Playwright.
4. Establish `src` layer directories and import-boundary lint rules.
5. Add the baseline fixed-stage shell and design tokens.

Red gate: architecture/import-boundary tests fail before layers exist.
Green gate: local shell renders and all empty-toolchain checks pass.

## Slice 2: Pure Deterministic Core

1. Write failing golden tests for seed hashing and PRNG outputs.
2. Implement project-owned PRNG and deterministic shuffle.
3. Write table/property tests for all 12 poker-hand classifications.
4. Implement playing-card model, evaluator, base score table, and formatters.
5. Define fixture content, run state, commands, rejections, invariants, and
   scenario runner.

Gate: no game-core import references React, Redux, IndexedDB, Motion, or audio;
all deterministic/property tests pass.

## Slice 3: One-Blind Domain Loop

1. Test and implement run start, deterministic deal, select/sort, play, discard,
   scoring windows, fixture 奇牌/consumable effects, win, and loss.
2. Test and implement fixture shop buy/sell/reorder/reroll and demo exit.
3. Emit ordered domain and presentation events without executing UI work.
4. Add stale checkpoint, double-command, illegal phase, and exhausted-budget tests.

Gate: command scripts win and lose the slice deterministically without a browser.

## Slice 4: Profiles and Atomic Persistence

1. Test Zod envelopes, three-profile isolation, export/import, and migrations.
2. Implement typed IndexedDB schema and transaction adapter with recovery record.
3. Implement proposal -> validate -> persist -> commit orchestration.
4. Add failure injection for interrupted writes and invalid imports.

Gate: every domain action round-trips and failure restores the prior checkpoint.

## Slice 5: Playable React Presentation

1. Build profile selection and local launch flow.
2. Build fixed-stage table, ledger, hand selection/sorting, action tickets,
   fixture 奇牌/consumable slots, score sequence, shop, and results.
3. Connect components only through selectors and commands.
4. Add Motion sequencing and skippable presentation queue.
5. Add Chinese errors, confirmations, and resume behavior.

Gate: the full slice is readable and operable at 1280x720 and a larger viewport.

## Slice 6: Browser and Handoff Gate

1. Add Playwright Chromium/WebKit flows for new profile, deterministic run,
   win/loss, shop, reload after every boundary, profile isolation, and import/export.
2. Add visual snapshots for profile, table, shop, and result screens.
3. Run format, lint, typecheck, unit/property/component tests, coverage, browser
   tests, build, and fresh local launch.
4. Run `trellis-check`, fix verified findings, and rerun full validation.
5. Update relevant project specs from established conventions, commit, finish,
   and archive this child before planning the next child.

## Validation Commands

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
```

Focused commands may be added, but none replaces the final full gate.

## Risk and Rollback Points

- Commit after toolchain shell, pure core, persistence, playable UI, and final gate
  only when each checkpoint is independently green.
- Keep fixture IDs namespaced; do not let them enter parent completeness counts.
- Do not disable serializability or invariant checks to make persistence pass.
- If DOM animation compromises state ownership, remove the animation integration
  rather than moving domain state into presentation.
- If a parent contract is invalid, return the child to planning and update both
  parent and child artifacts before continuing.

