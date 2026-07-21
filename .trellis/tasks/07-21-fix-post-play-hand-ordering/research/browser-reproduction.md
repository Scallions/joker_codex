# Browser Reproduction: Post-Play Hand Pose Regression

## Environment

- Browser automation: `agent-browser` 0.26.0 (Chromium)
- App: Vite development server at `http://127.0.0.1:4173`
- Viewports: 1440x900 and the supported 1280x720 baseline
- Deterministic production run seed: `BOUND001`

## Reproduction

1. Create a profile, skip the tutorial, start a normal campaign with `BOUND001`,
   and enter the small blind.
2. Let the opening presentation settle.
3. Select the first card and press `出牌`.
4. Press `按花色`, select the first card, and press `出牌` again at 1280x720.
5. Let the score presentation and replacement-card entry complete.

## Evidence

- Before the play, persisted `round.handIds`, DOM `[data-card-id]` order, and
  bounding-box centers were identical and strictly left-to-right.
- After the second play, persisted state still contained eight suit-sorted card
  IDs and the DOM contained those same eight IDs in the same order.
- Three surviving cards remained at inline Motion styles equivalent to the entry
  pose: `opacity: 0; translateX(84px) translateY(42px) scale(0.9) rotate(5deg)`.
  Their `data-card-entry-state` already said `settled`, so this was not intentional
  entry staging.
- A later rank-sorted play left one surviving card with the rotation for its old
  suit-sorted index (`-5.5deg`) instead of the rotation for its new right-edge
  index (`+7.7deg`).
- Reloading the route restored all eight persisted cards at `opacity: 1` with the
  expected current-index fan transforms.
- No page or console error occurred.

## Root Cause Direction

`CardButton` advertised the hidden entry pose through unconditional
`initial={entryPose}` on every stable keyed node. When `AnimatePresence` removed,
inserted, and reordered cards in one update, Motion could restore that initial pose
to surviving tail nodes even though React still marked them as settled. This also
left a surviving card at a previous index's rotation.

An outer layout wrapper was tested but proved unnecessary: it fixed neither symptom
until the reusable initial pose was removed and introduced avoidable compositing
differences. Keeping the existing stable button/layout architecture while setting
`initial={false}` fixes both symptoms, preserves the approved visual baselines, and
still lets unseen replacement IDs remain hidden through `entryHeld` before their
explicit entry animation. The browser regression checks state, DOM order,
visibility, left-to-right geometry, and settled fan rotation after both rank- and
suit-sorted plays.
