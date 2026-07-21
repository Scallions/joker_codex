# UI Layout, Playability, and Motion Technical Design

## 1. Design objective

Repair the desktop stage as one coherent system rather than a collection of CSS
offset patches. The implementation will:

1. give global controls, route navigation, notices, tutorial guidance, the table
   inventory, ledger, hand, and actions explicit non-overlapping ownership;
2. make the active hand order an accepted-command invariant using the existing
   rank/suit comparator;
3. add four approved, high-impact motion moments using committed state and the
   existing local presentation stack.

This task changes no catalog row, balance value, RNG algorithm, persistence schema,
profile schema, run schema, browser support policy, or network behavior.

## 2. Approved product decisions

| Area | Decision |
|---|---|
| Desktop scope | Fixed mouse-first `1280x720` and `1920x1080` stage baselines |
| Stage chrome | One top row with left audio, center status, and right navigation ownership |
| Tutorial | Compact guidance stays visible; full explanation opens intentionally instead of covering live play |
| Notices | Latest notice uses the center status slot and never floats over the hand/shop footer |
| Hand order | Normalize authoritative `round.handIds` after every accepted active-round command |
| New blind | Preserve the existing rank-order default; no run/device-wide sort preference |
| Motion | Four moderate theatrical showcases, restrained routine feedback |
| Pacing | Full expression in `完整演出`; roughly one-third timings in `利落演出` |
| Assets | Reuse existing local scene/card/audio assets; generate no new raster or remote media |
| Accessibility/mobile | No dedicated accessibility or touch/mobile mode in this task |

## 3. Non-negotiable invariants

1. `src/game-core/**` remains pure, serializable, framework-free, and ambient-
   randomness-free.
2. One accepted command advances `checkpointId` exactly once. A rejection returns
   no state and remains byte-equivalent to its preimage.
3. Automatic hand normalization consumes no RNG and changes only active hand order;
   it cannot change card membership, draw-pile order, selected/forced/face-down ID
   membership, played/discard zones, score, economy, or emitted domain facts.
4. The app still follows `propose -> validate -> persist -> reveal`. Motion never
   exposes an uncommitted proposal or dispatches a gameplay command.
5. Presentation sequences remain transient and skippable. Reload restores only the
   committed screen; it never replays an old sequence cursor.
6. The browser page and fixed stage never scroll. Only already-approved named
   ledger bodies may scroll internally.
7. Modal overlap is explicit and blocking. Compact stage chrome may not cover a
   required control, card, title, inventory slot, or ledger.
8. New animation uses bounded DOM nodes and transform/opacity-first effects. The
   current `<=50ms` frame-gap P95 and zero Chromium Long Tasks above `50ms` remain
   release gates.

## 4. Current evidence

The complete measurements and source anchors live in
`research/current-layout-and-motion-audit.md`. The verified 1280 table collisions
include:

- sound controls / brand plate: `603.1 px²`;
- hand metadata / ledger: `309.9 px²`;
- first card / ledger: `466.6 px²`;
- main-menu navigation / fifth Joker slot: `1225.8 px²`;
- notice / hand: `8400 px²`;
- tutorial coach / actions: `14849.5 px²`;
- tutorial coach / hand: `24947.8 px²`.

The first two reported defects also remain at 1920 because their coordinates are
absolute. Decision surfaces start inside the playing-navigation band, and the shop
footer is not a safe universal notice anchor.

## 5. Architecture

### 5.1 Layer map

```text
Run command
  -> pure command/effect proposal
  -> playing-card-added windows complete
  -> active-round hand-order normalization
  -> existing invariant + profile/run-pair validation
  -> IndexedDB checkpoint transaction
  -> Redux reveals committed run + typed presentation sequence
  -> React stage chrome and screen motion render committed IDs/events
```

Dependency direction remains:

```text
game-core comparator/command finalizer
  -> app commit orchestration (unchanged)
  -> presentation components and transient motion
```

No presentation module is imported by game-core. No new durable field crosses the
engine, repository, or transfer boundary.

### 5.2 Accepted hand-order invariant

Retain `sortCardIdsV2` as the single rank/suit comparator. Add one private pure
finalizer at the `executeCommandV2` accepted-result boundary:

```ts
function normalizeActiveRoundHandOrder(state: RunStateV2): RunStateV2 {
  if (state.phase.kind !== 'round' || !state.round) return state;
  const handIds = sortCardIdsV2(state, state.round.handIds, state.round.sortMode);
  if (sameCardIdOrder(handIds, state.round.handIds)) return state;
  return { ...state, round: { ...state.round, handIds } };
}
```

`sameCardIdOrder` should stay private/trivial unless repository search finds a
shared array-identity helper. Do not create a second comparator.

`executeCommandV2` currently returns early when a command adds no playing cards.
Restructure the accepted path so it always:

1. dispatches the typed command;
2. applies every `playing-card-added` window for newly created deck cards;
3. normalizes an active round once;
4. returns the original domain/presentation events through `accept`.

This placement covers initial blind draw after round-start/setup/add-card effects,
play/discard replacement draws, consumable/choice effects that return to a round,
card addition/destruction paths, and current unsorted saves on their next accepted
round command.

It intentionally does not normalize terminal reward/loss/win phases where no hand
is interactively visible. It emits no extra `cards-reordered` event: automatic
ordering is part of the accepted checkpoint, while the existing manual sort command
keeps its explicit event and checkpoint.

Why not a presentation-only selector: engine operations may consume hand-zone
order, so rendering a different left/right order would make visible card position
disagree with authoritative gameplay. Why not three command-local sort calls:
playing-card additions and future hand-changing commands could bypass them.

### 5.3 Playing-stage chrome

Create one `PlayingStageChrome` presentation component and CSS module. It owns two
structural zones beside the existing audio trigger zone:

```text
| audio controls | compact tutorial/notice status ........ | navigation group |
```

- `SoundStageDrawer` remains the owner of its drawer/scrim and top-left triggers.
  Its trigger group gains `data-layout-zone="audio-controls"`.
- `PlayingStageChrome` begins after the measured audio width and contains
  `playing-status` and `playing-navigation` layout zones.
- The four navigation buttons move from independent right offsets into one flex
  group. Navigation actions and Chinese labels do not change.
- Status priority is deterministic: active tutorial guidance first; otherwise the
  latest unread notice after the presentation queue clears. The full notice ledger
  remains available from the main menu.

The shared token source gains stage-chrome geometry variables: top offset, row
height, audio-zone width, inter-zone gap, and content start. Screen CSS consumes
these variables rather than copying numeric top bands.

`TutorialCoach` becomes a compact row containing step number, title, one-line
instruction, `查看讲解`, and the existing `跳过教程` action. `查看讲解` opens a
centered scrim-backed detail panel with the full instruction/explanation; that
panel is tagged as a deliberate modal layer and can be closed without changing the
tutorial step. The skip action keeps its current confirmation and progression
behavior.

`ProgressionNoticeBanners` becomes one compact row with title, truncated detail,
and `收讫`. It still waits until no presentation sequence is active and still
acknowledges only the displayed durable notice.

### 5.4 Screen zone contract

Add stable test-only geometry hooks without coupling tests to hashed CSS-module
names:

```text
audio-controls
playing-status
playing-navigation
table-inventory
table-ledger
table-center
table-hand
table-actions
```

The layout rules are:

1. playing content starts below the top chrome row with at least an `8px` gap;
2. table inventory occupies the second row and cannot intersect audio/navigation;
3. table ledger ends before the hand zone begins, including card fan transforms;
4. the hand zone ends before the action rail begins;
5. compact tutorial/notices remain inside the center status zone;
6. every required zone remains inside the stage rectangle;
7. explicit drawer/tutorial-detail/presentation overlays use a separate modal or
   transition layer and are excluded only by a named allow-list.

Expected CSS ownership:

- `tokens.css`: shared chrome offsets and full/brisk duration variables;
- `PlayingStageChrome.module.css`: center/right top-row grid and compact status;
- `SoundStageDrawer.module.css`: left-zone alignment only;
- `GameTableScreen.module.css`: inventory/ledger/center/hand/action geometry;
- `DecisionScreen.module.css`: blind/reward/choice surface below chrome;
- `ShopScreen.module.css`: shop header/content below chrome;
- `ProgressionScreens.module.css`: compact tutorial/notice content and deliberate
  tutorial detail overlay.

The exact pixel values are finalized against both browser baselines. The contract,
not a specific unmeasured number, is the source of truth.

### 5.5 Motion speed contract

Extend `motionTokens.ts` with one typed profile keyed by the existing persisted
`PresentationSpeed`:

```ts
interface MotionProfile {
  readonly routineMs: number;
  readonly stageMs: number;
  readonly curtainMs: number;
  readonly staggerMs: number;
  readonly spring: { readonly stiffness: number; readonly damping: number };
}
```

`full` preserves the current expressive range. `brisk` uses approximately one
third of the duration/stagger while retaining the same start/end state. CSS keeps
the full profile as its default and overrides duration variables under
`[data-presentation-speed="brisk"]`.

`StageShell` accepts `presentationSpeed?: PresentationSpeed` with a default of
`full` and writes the data attribute on the fixed stage. `App` passes the already
loaded device setting. This avoids making `StageShell` depend on Redux and keeps its
standalone tests valid.

### 5.6 Four showcase moments

#### A. Stage reveal

Enhance the existing transition grammars rather than add another route queue:

- scene image settles with a slight scale/depth move;
- curtain transitions add one bounded light sweep;
- lanterns use a short staggered ignition on scene change;
- ledger/receipt/folding-screen endpoints gain paper depth without animating
  layout-affecting dimensions.

Route transitions remain decorative, pointer-free, and speed-aware.

#### B. Hand draw and sorted reflow

Keep stable card IDs and Motion layout springs. `GameTableScreen` tracks the IDs in
the last fully presented hand as transient component state only:

- removed cards keep the existing play/discard exit grammar;
- retained cards move to committed sorted positions with `layout="position"`;
- IDs newly present in the committed hand enter from the deck/action edge and fan
  into place with a bounded stagger;
- while a score/sweep presentation covers the table, new IDs wait in their entry
  pose; normal completion, skip, hidden-tab finish, or performer failure clears the
  sequence and releases the same committed cards immediately;
- refresh has no sequence and presents the stored hand with the normal short
  entrance, never a replayed command.

No card draw, rank/suit calculation, or checkpoint logic moves into React.

#### C. Score and blind impact

Reuse `ScoreSealPerformance`. On typed total/blind-cleared terminal cues, add one
bounded impact ring/ink accent and tighten the final seal landing. It reads only the
current typed cue and stable cue ID. Decorative nodes remain under the existing
`maximumDecorativeParticles` cap; no score trace or arithmetic is parsed.

#### D. Reward and night-market reveal

- reward receipt unrolls/settles, then its committed rows stamp in with a short
  stagger;
- night-market folding screens reveal the header, offer cards, inventory, and
  footer in a controlled order;
- existing offer IDs remain Motion keys; purchase/reroll commands are unchanged.

All four moments use transform/opacity-first effects. Continuous infinite motion is
limited to the already-bounded score rings and ambient lantern glow.

## 6. Test design

### 6.1 Pure hand-order tests

Add focused V2-compatible tests for initial rank order, suit mode after in-round
play/discard, card creation/destruction or target-choice return, selected/forced/
face-down conservation, identical card sets/draw pile/RNG, one checkpoint, complete
rejection preimage equality, and structured-clone/invariant success.

Expected order is derived with the shared `sortCardIdsV2`, never a test-local
comparator.

### 6.2 Component tests

- playing chrome renders one flex navigation group and correct status priority;
- tutorial compact row keeps `跳过教程`, opens/closes detail without changing the
  run/profile, and its modal is explicit;
- notice waits for the sequence, shows only the latest row, and acknowledges it;
- `StageShell` exposes full/brisk data values without requiring Redux;
- card entry/reflow consumes committed IDs and sequence clearing, while skip/failure
  cannot dispatch another gameplay command;
- score/reward/shop showcase elements render bounded nodes and stable IDs.

### 6.3 Browser geometry and visuals

Add a shared E2E rectangle helper that reads visible layout-zone rectangles relative
to the stage, asserts containment, checks a named non-overlap/minimum-gap matrix,
and allows only explicit modal/transition pairs.

Reuse existing deterministic foundation/tutorial flows rather than duplicate game
rules. Cover blind selection, ordinary table with an unread notice, tutorial blind
and table, reward, shop, pack/target choice, terminal screen, and deliberate drawer/
tutorial-detail overlays at both baseline viewports.

Inspect every updated Chromium/WebKit snapshot. `animations: disabled` proves final
geometry; focused motion assertions and the performance probe prove choreography.

## 7. Compatibility and migration

- No run/profile/settings version changes and no IndexedDB migration.
- Existing `sortMode` remains the source of truth. A currently persisted unsorted
  active hand is normalized on its next accepted round command; a rejection does
  not silently rewrite it.
- Manual sort still emits `hand-sorted` / `cards-reordered` and one checkpoint.
- Existing presentation event unions, sequence IDs, audio maps, and asset manifests
  remain compatible; no new audio file or cue kind is required.
- DOM geometry hooks are test contracts only and carry no persisted meaning.

## 8. Failure handling

- A command/effect rejection returns before normalization and preserves the exact
  preimage.
- Persistence failure keeps the prior Redux run and never reveals the normalized
  proposal or new motion.
- Missing media or a transition/component error follows the existing non-blocking
  performer boundary and releases the committed final screen.
- Tutorial detail state is local. Route change/unmount discards it without touching
  tutorial progress.
- If a scene cannot fit the geometry matrix at either baseline, fix the owning
  layout; do not weaken the assertion or hide required copy.

## 9. Performance budget

- No new runtime dependency or initial asset.
- No unbounded particles, intervals, observers, or per-frame React state.
- Prefer CSS/Motion transforms and opacity; do not animate width, height, top, left,
  filter blur, or large box-shadow fields during routine motion.
- Full and brisk end states are identical.
- Final evidence must retain build gzip `<=358400` bytes, frame-gap P95 `<=50ms`,
  zero Chromium Long Tasks above `50ms`, zero timer drifts above `50ms`, and no
  remote request.

## 10. Rollout and rollback

Implementation is split into independent checkpoints:

1. hand-order invariant and pure tests;
2. stage chrome/layout zones and geometry tests;
3. speed profile and showcase motion;
4. visual/performance/full-suite closure.

If a slice fails its gate, revert only that slice before continuing. Snapshot
changes never substitute for fixing a collision. Removing the hand finalizer
restores prior ordering with no schema rollback; removing the chrome component can
restore prior App markup; motion enhancements can be disabled independently while
leaving layout and hand order intact.

## 11. Primary file map

```text
src/game-core/commands/executeCommandV2.ts
src/game-core/selectors/runV2.ts                  # reuse only
src/app/App.tsx
src/app/App.module.css                            # remove old nav offsets
src/presentation/theme/tokens.css
src/presentation/components/PlayingStageChrome.tsx          (new)
src/presentation/components/PlayingStageChrome.module.css   (new)
src/presentation/components/SoundStageDrawer.tsx
src/presentation/components/SoundStageDrawer.module.css
src/presentation/components/StageShell.tsx
src/presentation/components/StageMaterials.module.css
src/presentation/motion/motionTokens.ts
src/presentation/motion/StageTransition.tsx
src/presentation/motion/StageTransition.module.css
src/presentation/motion/ScoreSealPerformance.tsx
src/presentation/motion/ScoreSealPerformance.module.css
src/presentation/screens/GameTableScreen.tsx
src/presentation/screens/GameTableScreen.module.css
src/presentation/screens/DecisionScreen.module.css
src/presentation/screens/RewardScreen.tsx
src/presentation/screens/ShopScreen.tsx
src/presentation/screens/ShopScreen.module.css
src/presentation/progression/TutorialCoach.tsx
src/presentation/progression/ProgressionNoticeBanners.tsx
src/presentation/progression/ProgressionScreens.module.css
tests/game-core/**
tests/presentation/**
tests/e2e/helpers/layoutGeometry.ts               (new)
tests/e2e/foundation.spec.ts
tests/e2e/tutorial.spec.ts
tests/e2e/presentation-performance.spec.ts
```
