# UI Layout, Playability, and Motion Implementation Plan

## 1. Execution contract

- Do not start product-code implementation until the user reviews `prd.md`,
  `design.md`, and this plan and explicitly approves implementation.
- At implementation start, run the project `trellis-before-dev` skill, then use
  test-driven development for each behavior slice. Re-read the task artifacts and
  the selected frontend/gameplay/release specs before editing their layers.
- Work inline in the current workspace. Preserve unrelated user changes and the
  already-running local preview; do not reinstall packages or change dependencies.
- Use `apply_patch` for authored edits. Generated catalog/audio artifacts may only
  be touched by their existing deterministic generators when the plan explicitly
  requires it; this task is not expected to change either artifact set.
- Keep each slice independently reviewable. Do not accept new snapshots until the
  corresponding geometry, behavior, and performance assertions are green.

## 2. Slice 0 — Freeze the baseline and add failing contracts

### 2.1 Record baseline evidence

1. Capture `git status --short`, the active task metadata, Node/npm versions, and
   the current build/test results without modifying unrelated files.
2. Record current bundle gzip size and the existing presentation-performance probe
   result so later motion work has an objective comparison.
3. Reproduce the audited routes at `1280x720` and `1920x1080`; retain the existing
   audit screenshots as evidence rather than regenerating them unnecessarily.

### 2.2 Add red tests first

1. Add a shared E2E rectangle helper that:
   - resolves visible elements through stable `data-layout-zone` values;
   - asserts containment inside the fixed stage;
   - checks an explicit non-overlap/minimum-gap matrix;
   - permits only named drawer, modal, or route-transition overlaps.
2. Add failing Chromium/WebKit layout assertions for the verified collisions:
   audio/title, ledger/sort metadata, ledger/first card, navigation/Joker inventory,
   notice/hand or shop footer, and tutorial/card/action regions.
3. Add failing pure engine tests for initial, play, discard, effect/choice-return,
   reload, and persisted-unsorted-hand normalization under both sort modes.
4. Add failing component tests for compact tutorial/notice status, one grouped
   navigation zone, `StageShell` full/brisk propagation, and bounded showcase
   motion nodes.

Gate: every new assertion fails for the intended pre-change reason; unrelated
existing tests stay green.

## 3. Slice 1 — Make accepted hand order an engine invariant

### 3.1 Implement the pure finalizer

1. Reuse `sortCardIdsV2`; do not introduce a comparator in React or in tests.
2. Add a private `normalizeActiveRoundHandOrder` helper at the outer accepted
   boundary of `executeCommandV2`.
3. Restructure the existing early-return path so every accepted command first
   completes all `playing-card-added` windows, then normalizes the active round
   exactly once, then passes the same events to `accept`.
4. Return the original state object when the phase is not an active round or the
   order is already equal. Emit no automatic sort event and consume no RNG.

### 3.2 Prove invariant preservation

Cover, with shared selectors/comparators:

- initial blind rank order;
- play and discard replacement draws under rank and suit modes;
- card creation, destruction, consumable, and target-choice returns to a round;
- selected, forced, face-down, and ordinary card-ID set conservation;
- unchanged draw-pile sequence, RNG state, score, economy, and domain events;
- exactly one accepted-command checkpoint and unchanged rejection preimage;
- reload retaining committed mode/order;
- a legacy/current unsorted active save normalizing only on its next accepted
  round command;
- a new blind retaining the existing rank-mode default.

Gate: focused engine tests, invariant validation, structured-clone tests, and all
existing game-core tests pass before presentation work begins.

## 4. Slice 2 — Unify stage chrome and layout ownership

### 4.1 Establish shared geometry

1. Add shared stage-chrome tokens for top offset, row height, audio width, content
   start, and inter-zone gap.
2. Add stable layout hooks for:
   `audio-controls`, `playing-status`, `playing-navigation`, `table-inventory`,
   `table-ledger`, `table-center`, `table-hand`, and `table-actions`.
3. Create `PlayingStageChrome` with center status and right navigation zones.
   Convert the independent navigation offsets into one flex group.
4. Keep `SoundStageDrawer` responsible for the left trigger group and deliberate
   drawer/scrim overlay only.

### 4.2 Make transient chrome compact and intentional

1. Refactor `TutorialCoach` into a compact top-row summary with step/title,
   one-line instruction, `查看讲解`, and always-visible `跳过教程`.
2. Open the full tutorial copy in a deliberate centered modal without advancing
   tutorial state; preserve the existing skip confirmation and progression rules.
3. Refactor `ProgressionNoticeBanners` into one compact latest-notice row. Preserve
   sequence deferral and durable acknowledgement semantics.
4. Give tutorial guidance deterministic priority over notices in the shared status
   slot; retain the full notice ledger in the menu.

### 4.3 Repair screen zones

1. Move blind/reward/choice surfaces below the chrome row.
2. Reflow table inventory, ledger, center, hand, and action zones so transformed
   card bounds retain at least the agreed gap and never cross the ledger/action
   boundaries.
3. Reflow shop header/content/footer so the compact status cannot cover purchase
   summaries or actions.
4. Check menu, help, maintenance, terminal screens, pack/target choices, drawers,
   and tutorial detail for clipping, outer scroll, or hidden targets even where no
   initial defect was measured.

Gate: geometry assertions pass at both baseline viewports before any screenshot is
updated. Visual review confirms Chinese copy remains legible and required content
was not removed.

## 5. Slice 3 — Centralize full/brisk motion profiles

1. Add a typed `MotionProfile` in `motionTokens.ts`, keyed by the existing
   `PresentationSpeed` values only.
2. Preserve current expressive timings for `full`; set `brisk` duration and
   stagger values to approximately one third while keeping identical endpoints.
3. Add optional `presentationSpeed` to `StageShell`, default it to `full`, and
   expose it as `data-presentation-speed` without importing Redux into the shell.
4. Pass the already-loaded device setting from `App`; map matching CSS custom
   properties from the stage data attribute.

Gate: component tests prove both profiles, standalone shell behavior, persistence,
and identical settled DOM/geometry.

## 6. Slice 4 — Implement the four approved showcase moments

### 6.1 Stage reveal

- Enhance existing scene/curtain transitions with a bounded depth settle, one
  light sweep, and short lantern ignition stagger.
- Keep route transitions pointer-free, transform/opacity-first, and speed-aware.

### 6.2 Hand draw and sorted reflow

- Retain stable card IDs and Motion layout positioning for cards that remain.
- Track only the last fully presented hand IDs as transient component state.
- Enter newly committed IDs from the deck/action edge and fan them into the
  authoritative sorted positions with a bounded stagger.
- Hold new cards only while the existing score/sweep sequence owns the table;
  normal completion, skip, hidden-tab completion, or performer failure must clear
  that sequence and release the same committed cards.
- Never derive card membership, sort order, draw results, or checkpoints in React.

### 6.3 Score and blind impact

- Extend `ScoreSealPerformance` with one bounded ink/impact accent keyed by typed
  cue ID and strengthen the final seal landing.
- Stay within the existing decorative-particle cap; do not parse prose or recompute
  score arithmetic.

### 6.4 Reward and night-market reveal

- Stagger committed reward rows after the existing receipt unroll settles.
- Reveal the night-market header, stable-ID offers, inventory, and footer through
  the existing folding-screen grammar.
- Do not add events, commands, audio cues, remote media, assets, or persisted state.

Gate: focused tests prove stable keys, bounded node counts, full/brisk timing,
normal/skip/failure end states, and zero gameplay dispatch from presentation.

## 7. Slice 5 — Browser, visual, performance, and release closure

1. Run the layout matrix at `1280x720` and `1920x1080` in Chromium and WebKit for
   blind, ordinary table, unread notice, tutorial blind/table, reward, shop,
   pack/target choice, terminal, drawer, and tutorial-detail states.
2. Assert zero unexplained overlap, clipping, page scroll, hidden required target,
   browser-console error, missing local asset, or remote request.
3. Regenerate only snapshots affected by intentional final geometry. Inspect every
   changed image at full resolution before accepting it.
4. Run focused motion checks with animation enabled and the repeatable performance
   probe. Require frame-gap P95 `<=50ms`, zero Chromium Long Tasks above `50ms`,
   and zero timer drifts above `50ms`.
5. Run the Trellis check workflow inline, fix all actionable findings, and retain
   evidence in the task handoff.

## 8. Final verification commands

Run from the repository root, in this order:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run content:audit
node scripts/generate-catalog-emblems.mjs --check
node scripts/generate-presentation-audio.mjs --check
npm run build
npm run build:audit
npm run test:e2e
python3 ./.trellis/scripts/task.py validate 07-21-ui-layout-playability-motion-polish
git diff --check
```

Final evidence must also show build gzip `<=358400` bytes, unchanged catalog/audio
generation, one checkpoint per accepted command, exact rejection equality, both
browser projects green without retry, and an intentional review of every snapshot
change.

## 9. Risk controls and rollback

| Risk | Early signal | Control | Rollback boundary |
|---|---|---|---|
| Sorting changes gameplay semantics | Card sets/draw pile/RNG differ | Shared comparator plus invariant-delta tests | Slice 1 finalizer only |
| CSS fixes shift another route | Geometry matrix fails elsewhere | Shared zones at both viewports before snapshots | Slice 2 screen owner |
| Tutorial/notice behavior regresses | Progress/ack tests fail | Preserve durable commands; local modal state only | Compact chrome component |
| Motion hides committed state | Skip/failure test stalls | Existing sequence clear path releases final DOM | Individual showcase |
| Motion exceeds budget | Probe or build audit regresses | Bounded nodes, transform/opacity, no new assets/deps | Slice 3/4 profile or effect |
| Visual baselines mask a defect | Snapshot changes without green geometry | Geometry gate precedes snapshot acceptance | Reject affected snapshots |

## 10. Pre-start checklist

- [x] Reported and adjacent collisions reproduced and measured.
- [x] Automatic-sort semantics and invariant boundary selected.
- [x] Four showcase moments and moderate intensity confirmed by the user.
- [x] Persistence, RNG, checkpoint, browser, build, and performance constraints
      captured.
- [x] PRD and technical design completed.
- [x] User has reviewed all three planning artifacts and explicitly approved
      implementation.
