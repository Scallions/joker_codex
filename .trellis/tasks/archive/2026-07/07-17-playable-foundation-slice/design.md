# Playable Foundation Slice Design

## Objective

Prove the final 百戏奇牌 architecture with one browser-playable, deterministic,
transactionally saved vertical slice. This child establishes contracts that all
later children extend; it does not attempt the complete content catalog.

## Parent Contracts

This child inherits the parent PRD, `design.md`, and research artifacts. The
following are fixed here:

- Vite + React + strict TypeScript, DOM/SVG presentation, CSS Modules.
- Pure framework-free `game-core`; Redux Toolkit orchestration; Motion animation.
- `idb` IndexedDB adapter; Zod save/content validation.
- Vitest, fast-check, React Testing Library, and Playwright.
- No backend, runtime CDN, `Math.random()` in domain code, or gameplay logic in UI.

## Vertical-Slice Content

Use clearly marked project-owned fixture content that cannot be mistaken for a
completed production catalog:

- standard 52-card deck with original baseline face/back styling;
- all 12 poker-hand classifications and base score table;
- one blind with a deterministic target, four hands, and three discards;
- one fixture 奇牌 demonstrating a scored-hand multiplier hook;
- one fixture consumable demonstrating a deterministic card transformation;
- one post-blind fixture shop with buy, sell, reorder, and reroll;
- win and loss results for the single-blind slice.

Fixture IDs live under a dedicated namespace and are excluded from production
catalog count audits.

## State and Commands

Foundation commands:

- profile: create, rename, select, delete, export, import;
- run: start fixture run, select/deselect card, sort hand;
- round: play selected cards, discard selected cards;
- shop: buy, sell, reorder 奇牌, reroll, leave demo;
- shell: resume active run, abandon fixture run with confirmation.

The pure engine accepts `(state, command)` and returns either a typed rejection or
`{ state, domainEvents, presentationEvents }`. Every state-changing command checks
the caller's `checkpointId`.

## Determinism

- Stable string hash expands into explicit unsigned 32-bit PRNG state.
- Every shuffle/draw/shop roll consumes and returns that state.
- A golden-vector test freezes PRNG output.
- A scenario runner replays commands without React or IndexedDB.
- Browser tests compare canonical serialized state after the same script.

## Persistence V1

IndexedDB stores:

- `meta`: schema/content versions and active profile;
- `settings`: audio settings shared across profiles;
- `profiles`: three optional profile records;
- `runs`: one active fixture run per profile;
- `recovery`: previous known-good record per profile.

The orchestrator calculates and validates a proposed state, commits profile/run
records in one transaction, awaits `tx.done`, then exposes the result to React.
Import validates size, JSON, envelope, schema, and invariants before confirmation.

## Presentation

The slice uses a deliberate baseline of 午夜百戏 rather than generic scaffolding:

- fixed 16:9 lacquered stage with indigo background, vermilion actions, ivory
  cards, and brass economy accents;
- left run ledger, top fixture 奇牌 placard, center scoring seal, bottom fanned
  hand, and right action tickets;
- profile selection, run table, fixture shop, import confirmation, and result
  overlays;
- Motion for card selection/deal/play and ordered score stamps;
- no final generated illustration or production audio obligation in this child.

Animation consumes presentation events after persistence and can be skipped
without changing state.

## Error Behavior

- Illegal commands show no domain mutation and consume no RNG.
- Persistence failure retains the old state and offers retry/export diagnostics.
- Invalid import reports a Simplified Chinese error and leaves all profiles intact.
- React error boundaries protect the shell but cannot auto-commit domain changes.

## Validation

- Strict TypeScript and lint/format checks.
- Unit tests for PRNG, poker evaluator, commands, scoring, and invariants.
- Property tests for shuffle conservation, evaluator invariance under permutation,
  command determinism, and save round trips.
- Component tests for profile, selection, score feedback, shop, and dialogs.
- Playwright Chromium/WebKit flows for win, loss, save/reload, profile isolation,
  import/export, and deterministic replay.
- Production build and documented local launch.

## Rollback

No production save exists before this child. Schema V1 may be replaced only while
the child remains active; once archived, later changes require explicit migrations.
Fixture content remains isolated so later catalogs can replace it without ID or
save collisions.

