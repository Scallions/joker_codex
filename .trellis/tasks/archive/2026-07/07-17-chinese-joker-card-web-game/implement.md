# 百戏奇牌 Parent Execution Plan

## Execution Rule

This directory is the parent planning and final-integration owner. Do not run
`task.py start` on the parent. Plan, start, verify, finish, and archive the child
that owns the next deliverable. Every child must receive its own reviewed PRD and,
when complex, its own design and implementation plan before activation.

## Global Gates

No child may weaken these contracts:

- project-owned deterministic engine and stable IDs;
- original Chinese copy and presentation assets;
- no Balatro interoperability or copied code/assets/text;
- three isolated profiles and atomic action-boundary persistence;
- no gameplay logic in React, animation, audio, or persistence adapters;
- typed content matrices with behavior and interaction fixtures;
- local desktop-browser scope and no required backend/network service.

## Ordered Child Plan

### 1. Playable Foundation Slice

Directory: `07-17-playable-foundation-slice`

Deliver a tracer-bullet path through the final architecture:

- scaffold Vite/React/TypeScript and quality scripts;
- establish layer boundaries, design tokens, and baseline stage shell;
- implement stable IDs, command protocol, PRNG, poker evaluator subset, and
  invariant framework;
- create three profiles, transactional IndexedDB persistence, import/export
  envelope, and one active-run recovery path;
- ship one deterministic playable blind with play/discard/score and a minimal
  fixture shop;
- prove reload determinism and browser launch locally.

Gate: the slice is actually playable at 1280x720, saves after every action, and
passes unit, property, component, build, Chromium, and WebKit smoke tests.

### 2. Complete Run and Economy

Directory: `07-17-complete-run-and-economy`

- finish all run phases and legal command validation;
- finish poker-hand classification and score windows;
- implement ante/blind progression, skip/tag hooks, boss/finisher routing;
- implement shop, rerolls, inventory, packs, consumables, vouchers, economy,
  win/loss, and endless state transitions with fixture content;
- stabilize effect primitives, handler registry, copy/retrigger/debuff rules;
- cover every action with atomic checkpoint tests.

Gate: fixture content can complete and lose full eight-ante runs, continue
endless, and replay deterministically through save/reload.

### 3. Non-Joker Content Catalogs

Directory: `07-17-non-joker-content-catalogs`

- finalize original Chinese naming and mapping matrices;
- implement 15 decks, 8 stakes, 20 challenges' rule data ownership where shared,
  32 vouchers, 22 Tarot equivalents, 12 Planet equivalents, 18 Spectral
  equivalents, 24 tags, 30 blind entries, 32 pack entries, 8 enhancements,
  4 seals, and 5 editions;
- deliver original icon/frame/illustration assets for owned catalog entries;
- add positive, boundary, and cross-category interaction fixtures.

Gate: manifest count checks and contract coverage reach 100%; every entry is
reachable through a deterministic scenario and survives save/reload.

### 4-6. 奇牌 Catalog Batches

Directories:

- `07-17-joker-catalog-001-050`
- `07-17-joker-catalog-051-100`
- `07-17-joker-catalog-101-150`

For each batch:

- approve 50 original IDs, Chinese names/descriptions, illustration briefs, and
  behavior mappings before code;
- implement typed definitions and only the reusable primitives/handlers needed;
- produce and optimize unique original illustrations with ownership manifests;
- test acquisition, cost/rarity/unlock, each effect contract, copy/retrigger,
  debuff, destruction, ordering, and relevant cross-catalog interactions;
- update collection and content-completeness manifests.

Gate per batch: exactly 50 entries are functional, discoverable, illustrated,
localized, deterministic, and contract-tested. Later batches may reuse but must
not silently change earlier handler semantics.

### 7. Progression, Tutorial, and Modes

Directory: `07-17-progression-tutorial-modes`

- finish deck/stake/challenge availability and selection flows;
- implement collection discovery, stickers, statistics, unlocks, and the local
  百戏成就簿;
- implement first-run scripted tutorial, skip, replay, glossary, and hand table;
- finish seeded run entry/sharing and content-version labeling;
- verify profile isolation, deletion, reset, export/import, and migrations.

Gate: a fresh profile can learn, unlock, complete, inspect, export, restore, and
resume all supported modes without affecting the other profiles.

### 8. Midnight Variety Presentation

Directory: `07-17-midnight-variety-presentation`

- apply the final stage composition and component system to every screen;
- replace baseline placeholders with approved original illustrations and frames;
- implement the stage-seal score performance, card motion, curtains, shop/pack
  transitions, particles, and responsive 16:9 scaling;
- deliver original music/SFX and independent volume controls;
- optimize assets, preload critical media, and lazy-load collection media;
- capture critical-screen visual snapshots at required viewports.

Gate: visual review confirms a coherent original 午夜百戏 identity, readable
Chinese copy, stable hit targets, smooth supported-browser animation, and no
excluded presentation material.

### 9. Full Integration and Quality Gate

Directory: `07-17-integration-quality-gate`

- run generated completeness audits for every catalog and asset/test manifest;
- close the full cross-content interaction matrix and deterministic replay suite;
- fault-inject every persistence boundary and migration/import path;
- run complete campaign, challenge, seeded, win, loss, and endless E2E flows;
- test Chrome, Edge, Safari, Chromium, and WebKit at supported desktop viewports;
- profile initial load, collection browsing, score sequences, and large endless
  values; fix regressions without changing approved balance silently;
- conduct final original-asset/copy audit and parent acceptance review.

Gate: every parent PRD criterion has direct evidence and no child remains active.

## Current Acceptance State (2026-07-20)

The ninth child's final release dossier is the current source of evidence. This
table records acceptance readiness only; it does not authorize archiving this
parent task.

| Parent criterion | Current state |
|---|---|
| AC-01 Local launch | PASS |
| AC-02 Complete modes | PASS |
| AC-03 Catalog completeness | PASS |
| AC-04 Rule correctness | PASS |
| AC-05 Determinism | PASS |
| AC-06 Atomic recovery | PASS |
| AC-07 Profile isolation | PASS |
| AC-08 Tutorial and reference | PASS |
| AC-09 Progression | PASS |
| AC-10 Original Chinese presentation | PASS |
| AC-11 Desktop experience | PASS WITH APPROVED SAFARI WEBDRIVER EXCEPTION |
| AC-12 Audio and animation | PASS |
| AC-13 Parent integration | PASS AT CHILD HANDOFF |

Detailed command, browser, catalog, persistence, asset, and archived-child
evidence is retained in
`.trellis/tasks/archive/2026-07/07-17-integration-quality-gate/evidence.md` after
the child finish workflow. The parent remains unarchived until a separate explicit
user approval.

## Validation Commands

Children may add focused commands, but the repository must converge on:

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

Manual gates:

- launch via the documented local command on a fresh checkout;
- play at 1280x720 and one larger desktop viewport;
- smoke the latest supported Chrome, Edge, and Safari;
- inspect every critical screen and a representative entry from each catalog;
- complete save export/import and crash-recovery drills.

## Review and Change Control

- Do not start a child until its own artifacts are reviewed.
- Treat child completion as a rollback point; commit intentionally per child.
- Any change to counts, gameplay mapping, supported browsers, persistence,
  presentation ownership, or out-of-scope boundaries returns to parent planning.
- Any balance deviation requires a documented content-version change and fixtures.
- Final completion requires parent PRD convergence, all child archives, full
  integration evidence, spec updates, and the Trellis finish workflow.
