# Polish UI Layout, Playability, and Motion

## Goal

Improve the desktop play experience of **百戏奇牌** by removing obstructive
interface overlaps, making the hand remain usefully ordered after gameplay draws,
and adding memorable 午夜百戏 motion without weakening clarity, determinism, or
performance.

## Background

- The user reports that the sound-field/mute controls can cover the 百戏奇牌 title.
- The point/suit sort controls can cover the 八幕账簿 area.
- These are examples rather than the whole defect list; the task must audit similar
  floating controls, labels, ledgers, buttons, overlays, and stage edges across the
  game rather than fixing only two selectors.
- The current product targets mouse-first desktop play at 1280x720 and larger
  viewports with a fixed 16:9 stage and no browser-page scrolling.
- Gameplay state commits before presentation. New animation remains optional
  presentation and may not calculate or change game results.

## Requirements

### R1 — Systematic layout and occlusion audit

1. Reproduce the reported title/sound-control and ledger/sort-control collisions.
2. Inspect all primary routes and modal layers at 1280x720 and 1920x1080 for
   overlap, clipping, unreadable text, hidden hit targets, unsafe fixed-position
   controls, and controls that cover persistent stage landmarks.
3. Define explicit spatial ownership for the global title, sound controls, stage
   ledger, hand-sort controls, action buttons, navigation, notices, tutorial
   guidance, drawers, and transient presentation layers.
4. Fix verified collisions without reducing required content, shrinking important
   Chinese copy into unreadability, or introducing page scrolling.
5. Treat tutorial guidance and progression notices as first-class stage chrome:
   their compact state may not hide cards or actions, while expanded/modal states
   must be intentional and dismissible.

### R2 — Automatic hand ordering

1. Keep the visible and authoritative hand order automatically normalized by the
   active point/suit preference after the initial blind draw and every accepted
   command that changes the hand, including play and discard replacement draws.
2. Preserve selected/forced/face-down card correctness, card identity and sets,
   deterministic draw-pile order, rejected-command equality, and RNG state.
3. Automatic normalization is part of the command's existing committed checkpoint;
   it may not issue a second command or checkpoint. Manual sort changes retain their
   current explicit checkpoint behavior.
4. Reload preserves the committed order and active mode. Each new blind keeps the
   current rank-order default; run-wide or device-wide preference persistence is
   not added by this task.

### R3 — Cohesive motion enhancement

1. Add a small set of high-impact, 午夜百戏-specific animations at meaningful
   moments instead of scattering unrelated effects across every control.
2. Use the user-approved moderate theatrical scope of four showcase moments:
   stage reveal, hand draw/sorted reflow, score/blind impact, and
   reward/night-market reveal.
3. Motion must consume committed state/events only, retain the existing full/brisk
   presentation modes, remain skippable where sequences already are, and never
   delay or duplicate a gameplay command.
4. Keep the approved desktop motion budget: frame-gap P95 at most 50 ms and zero
   Chromium Long Tasks above 50 ms in the repeatable probe.

### R4 — Regression coverage

1. Add geometry/occlusion assertions at both supported viewports for every fixed
   collision discovered in the audit.
2. Add focused tests for automatic sort preference and post-command reflow while
   proving that only authoritative hand order changes—not card membership, draw
   order, RNG, rejection behavior, or checkpoint count.
3. Add motion tests that prove persistence, skipping, brisk/full timing, and
   failure isolation remain intact.
4. Run the full formatting, lint, type, unit/coverage, build-budget, Chromium, and
   WebKit gates before completion.

## Acceptance Criteria

- [ ] **AC1:** At 1280x720 and 1920x1080, global sound/mute controls do not cover
      百戏奇牌 or any route title, and the hand-sort controls do not cover 八幕账簿
      or another required ledger/action.
- [ ] **AC2:** A route-wide automated geometry audit plus visual review finds no
      unexplained overlap, clipping, outer scrolling, or hidden required target in
      the agreed desktop scope; tutorial guidance and notices do not cover live
      cards or action controls in their compact state.
- [ ] **AC3:** Initial draw, play, discard, reload, and manual-mode scenarios show
      the expected point/suit order with unchanged card-ID sets, draw-pile order,
      RNG, rejection behavior, and exactly the original command checkpoint delta.
- [ ] **AC4:** The agreed motion moments feel coherent with 午夜百戏, behave in full
      and brisk modes, and cannot issue or alter gameplay commands.
- [ ] **AC5:** Existing visual baselines are reviewed intentionally; focused and
      full Vitest, build budget, and Chromium/WebKit E2E gates pass with no retry or
      unresolved warning.

## Constraints and Out of Scope

- Preserve the original Chinese identity, fixed desktop-stage model, local-only
  runtime, catalog counts, balance, persistence schema, and browser support policy.
- Do not add mobile/touch-first layouts, accessibility modes, backend services, or
  new gameplay/content.
- Do not treat arbitrary overlap as visual flair: deliberate decorative overlap is
  acceptable only when it cannot obscure required copy or interaction.

## Confirmed Product Decision

- On 2026-07-21 the user confirmed moderate theatrical intensity: four high-impact
  moments with restrained routine feedback, fully expressed in `完整演出` and
  shortened to roughly one-third pacing in `利落演出`.
