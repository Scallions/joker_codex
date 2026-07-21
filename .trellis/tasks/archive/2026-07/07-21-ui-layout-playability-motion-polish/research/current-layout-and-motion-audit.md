# Current Layout, Hand-Order, and Motion Audit

## Audit setup

- Runtime: the existing local Vite preview at `http://127.0.0.1:4173`.
- Browser: Chromium through the repository-approved desktop browser harness.
- Viewports: `1280x720` and `1920x1080`.
- Evidence sources:
  - live DOM rectangles and screenshots;
  - current Chromium visual baselines for blind selection, reward, shop, table,
    and result scenes;
  - source inspection of the active React/CSS/game-command paths.
- The pre-existing preview process was reused and not stopped or replaced.

## Verified layout defects

### Active table at 1280x720

| Pair | Rectangles / overlap | Finding |
|---|---:|---|
| sound controls vs. brand plate | `603.1 px²`, `33.2 x 18.2 px` | `声场 / 静音` visibly covers the `百戏奇牌` plate. |
| hand metadata vs. ledger | `309.9 px²`, `12.8 x 24.2 px` | `按点数` begins inside the ledger boundary. |
| first hand card vs. ledger | `466.6 px²`, `7.1 x 65.9 px` | The leftmost card edge sits behind the ledger. |
| main-menu nav vs. fifth empty Joker slot | `1225.8 px²`, `56.8 x 21.6 px` | The independently positioned navigation crosses a real inventory slot. |
| notice banner vs. hand area | `8400 px²`, `150 x 56 px` | The achievement banner covers the left side of the hand fan. |

The same sound/brand and ledger/hand-metadata overlaps remain at `1920x1080`
because their absolute coordinates do not scale away. The broad viewport only
hides some of the visual pressure; it does not repair spatial ownership.

### Tutorial overlays

At the first tutorial table step, the `310px` coach card occupies
`x=949..1259, y=520.2..701` and overlaps:

- the action rail by `14849.5 px²` (`136 x 109.2 px`), hiding much of the play and
  discard controls;
- the hand area by `24947.8 px²` (`138 x 180.8 px`), hiding the rightmost cards.

On blind selection the same bottom-right coach covers the third blind card. The
coach has `pointer-events: none` around its body, but visual occlusion still makes
the required game state and targets hard to read.

### Other playing scenes

- `DecisionScreen.module.css` starts its main surface at `50px`, while the playing
  navigation ends at `59.4px`; the controls sit across the surface's top border.
- The shop baseline shows the bottom-left progression banner over the shop footer
  summary. Blind/reward banners happen to land in emptier regions, so the current
  route-independent bottom-left coordinate is not a valid universal safe area.
- Menu, help, and maintenance screens do not reproduce the reported collisions;
  their main panels already leave a top-left gutter for the global sound control.
- The sound drawer and centered blocking prompts are deliberate modal layers, not
  accidental collisions, and should retain an explicit scrim/layer contract.

## Layout cause and recommended boundary

The defects share one cause: audio controls, four navigation buttons, notices,
tutorial guidance, and each screen independently claim absolute stage coordinates.
There is no common playing-chrome owner or collision contract.

Recommended direction:

1. Introduce one playing-stage chrome row with three owned zones:
   - left: sound and mute;
   - center: one compact status surface for tutorial guidance or the latest notice;
   - right: one flex navigation group.
2. Convert the full tutorial coach into compact always-visible guidance in the
   center zone, with detailed explanation opened intentionally instead of floating
   over live cards and actions.
3. Place notices in the same center status zone rather than a universal bottom-left
   coordinate.
4. Move the table inventory rail and decision/shop content below this chrome row.
5. Give the table ledger, center stage, hand fan, and action rail non-overlapping
   named zones. Move the whole hand zone to the right of the ledger, not only the
   two sort buttons.
6. Add stable `data-layout-zone` hooks and pairwise geometry assertions so future
   independently positioned controls cannot silently reclaim those areas.

Likely owners:

- `src/app/App.tsx`, `src/app/App.module.css`
- `src/presentation/components/SoundStageDrawer.tsx` and its CSS module
- `src/presentation/progression/ProgressionNoticeBanners.tsx`
- `src/presentation/progression/TutorialCoach.tsx`
- `src/presentation/progression/ProgressionScreens.module.css`
- `src/presentation/screens/GameTableScreen.tsx` and its CSS module
- `src/presentation/screens/DecisionScreen.module.css`
- `src/presentation/screens/ShopScreen.module.css`
- `tests/e2e/layout-occlusion.spec.ts` (new) plus reviewed visual baselines

## Hand-order contract

Current facts:

- `round.sortMode` already records `rank` or `suit` and is persisted with the run.
- `sort-hand` sorts `round.handIds`, updates the mode, and creates one normal
  checkpoint without changing RNG.
- initial blind draw, play replacement draw, and discard replacement draw append
  raw draw-order IDs and do not reapply `sortMode`.
- the first new round sets `sortMode: rank`, but its initial shuffled hand is not
  rank-sorted; the live first hand confirms this mismatch.
- the UI reads `selectHandCardsV2`, which preserves `round.handIds` order.
- engine effects can consume hand-zone order (for example round-start hand-size
  adjustment removes cards from the end), so a hidden presentation-only order can
  disagree with the authoritative left/right order.

Recommended contract:

- After all effects for an accepted hand-changing command finish, normalize the
  active hand IDs once with the current round `sortMode` before the command's
  existing checkpoint is committed.
- Cover initial blind draw, accepted play, accepted discard, and any other accepted
  command that adds/removes cards while an active round remains.
- Do not issue a second command/checkpoint and do not consume RNG. Card identity,
  card sets, draw-pile order, discarded/played zones, selected/forced/face-down ID
  membership, and rejection equality remain unchanged.
- Manual rank/suit changes continue to create their existing explicit checkpoint.
- Reload preserves the committed order and mode. A new blind keeps the existing
  product default of rank order unless a separate run-wide preference is requested.

Likely owners:

- `src/game-core/selectors/runV2.ts` for the reusable stable comparator/helper
- `src/game-core/commands/executeCommandV2.ts` for accepted command boundaries
- focused game-core tests plus browser reflow/reload coverage

## Existing motion baseline

The product already has a useful motion foundation:

- five scene-transition grammars: curtain, ledger, placard, receipt, and folding
  screen;
- card entrance, selection, play/discard exit, and layout-position springs;
- staggered Joker/shop entrance;
- a bounded, committed-state-only score-seal presentation sequence with full and
  brisk timing, skip, hidden-tab completion, and error isolation;
- local audio cues mapped to committed presentation events.

The gap is not animation quantity. Several route entrances are opacity-only, card
replacement/reorder lacks a clear draw-to-fan story, and the static final impact of
existing transitions can feel flatter than the visual identity.

Recommended motion scope is four showcase moments, implemented with existing
Motion/CSS/local assets:

1. stage reveal: curtain depth, lantern sweep, and restrained parallax;
2. hand choreography: played/discarded cards leave, replacement cards arrive from
   the deck edge, then settle into the automatically sorted fan with a short ripple;
3. score/blind impact: reinforce the committed final seal with one bounded ink-ring
   or paper-shock accent, never extra score logic;
4. reward/night-market reveal: receipt unroll/stamp and staggered folding-screen
   offer arrival.

New motion should reuse stable card/event IDs, transform/opacity effects, bounded
particle counts, and the current full/brisk settings. The existing repeatable
performance ceiling remains frame-gap P95 `<= 50ms` with zero Chromium Long Tasks
above `50ms`.

## Test implications

- Add deterministic geometry helpers that compare visible rectangles and viewport
  containment for named layout zones at both baseline viewports.
- Exercise ordinary table, unread notice, tutorial blind/table, reward, shop, and
  choice paths; retain deliberate modal overlap as an explicit allow-list.
- Assert automatic order after initial draw, play, discard, reload, and a manual
  switch to suit order. Compare card-ID sets, RNG, draw pile, and checkpoint delta.
- Assert full/brisk timing selection, skip/committed-state isolation, and rerun the
  existing performance probe after the new showcase effects.
