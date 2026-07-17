# Playable Foundation Slice

## Goal

Scaffold the local app and deliver one deterministic, autosaved, browser-playable vertical slice with core engine boundaries.

## Requirements

- Depends on the approved parent PRD, design, and research artifacts; it has no
  implementation dependency on another child.
- Scaffold the Vite, React, and strict TypeScript application with local launch,
  build, lint, type-check, unit-test, and browser-test commands.
- Establish the pure engine, typed command, project-owned ID, seeded PRNG,
  invariant, application-store, presentation, and persistence boundaries.
- Provide three isolated local profiles and a versioned save envelope.
- Deliver one deterministic playable blind with draw, select, play, discard,
  poker classification, scoring, win/loss, and a minimal fixture shop.
- Atomically autosave every irreversible action and restore the exact checkpoint.
- Present a usable Simplified Chinese 1280x720 baseline UI. Final content counts
  and final 午夜百戏 art are not required in this slice.

## Acceptance Criteria

- [ ] A fresh checkout can install dependencies and launch locally using the
      documented commands.
- [ ] All architecture layers compile with strict type checking and the engine
      imports no React, browser persistence, animation, or audio code.
- [ ] The same seed and command script produces identical state and RNG output
      in repeated Chromium and WebKit runs.
- [ ] A player can create/switch profiles, start the fixture run, play or discard,
      finish or lose the blind, visit the fixture shop, close, and resume.
- [ ] Reload tests at every action boundary restore the prior committed state
      without duplicate score, money, cards, or random draws.
- [ ] Unit/property/component/browser tests and a production build pass.

## Out of Scope

- Complete eight-ante progression, complete catalogs, final progression systems,
  final art/audio, and full browser certification belong to later children.
