# Fix Post-Play Hand Ordering UI Regression

## Goal

Fix the regression where the remaining hand appears out of order after playing a
hand, so players do not need to press a sort control after every accepted play.

## Background

- The user reports that the problem is visible in the frontend after playing a
  hand and explicitly requires a real rendered playthrough, not unit tests alone.
- The project already promises automatic accepted-command hand normalization and
  a stable animated card fan.
- A real Chromium playthrough with seed `BOUND001` reproduced the defect at
  1280x720. After rank/suit reordering and an accepted play, persisted `handIds`
  and DOM order remained correct, while surviving cards could retain the entry
  pose (`opacity: 0; translateX(84px) ...`) or an obsolete fan rotation. Refreshing
  restored the same committed hand with correct visual poses. The failing browser
  test proved that Motion could reuse the unconditional hidden `initial` pose on
  surviving keyed nodes during presence reconciliation.

## Requirements

- Reproduce the issue through the real browser UI by selecting cards, playing
  them, waiting for the score/presentation sequence to settle, and inspecting the
  newly displayed hand.
- Compare the committed run order, rendered DOM order, and visible card positions
  against the active rank/suit sort mode.
- After every accepted play that returns to an active round, display the complete
  remaining/replacement hand in the selected sort order without another manual
  sort click.
- Mount every stable card node from its committed pose (`initial={false}`); only
  genuinely new replacement IDs may receive the hidden entry pose through the
  explicit transient `entryHeld`/`entering` animation state.
- Preserve manual rank/suit sorting, stable card identity, play animation, scoring,
  RNG, checkpoints, selection rules, and persistence behavior.
- Add a regression test that fails on the observed frontend behavior and exercises
  the repair through rendered controls.

## Acceptance Criteria

- [x] A pre-fix browser run captures the observed post-play ordering failure and
      distinguishes committed-state order from visual/DOM order.
- [x] After a rank-sorted play, the settled rendered hand matches the committed
      rank order without pressing `按点数` again.
- [x] After a suit-sorted play, the settled rendered hand matches the committed
      suit order without pressing `按花色` again.
- [x] Every settled card is visible (`opacity` at the settled value), arranged
      left-to-right in committed order, and uses the fan pose for its current
      index rather than an entry pose or a previous index's rotation.
- [x] Refreshing after the accepted play restores the same normalized order.
- [x] The regression passes in Chromium and WebKit at the supported desktop
      viewports without card overlap, clipped actions, or outer-page scrolling.
- [x] Existing deterministic gameplay, persistence, presentation-performance, and
      full project quality gates pass unchanged.

## Out of Scope

- Changing poker rules, draw order, card values, scoring, animation art direction,
  or adding a new sort mode.
- Mobile/touch layouts or viewports below the supported 1280x720 baseline.
