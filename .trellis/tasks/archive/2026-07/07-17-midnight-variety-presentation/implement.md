# Midnight Variety Presentation Implementation Plan

## 1. Execution Contract

Implement inline, one ordered slice at a time. Do not start until the user reviews
`prd.md`, `design.md`, and this plan and `task.py start` changes the task to
`in_progress`.

At Phase 2 entry:

1. load `trellis-before-dev` and reread all three task artifacts;
2. load `tdd` before the first production edit;
3. read the frontend gameplay/persistence contract and cross-layer/reuse guides;
4. record the clean baseline commands in Section 4;
5. keep implementation in the main session; do not dispatch implement/check
   sub-agents in inline mode;
6. load the project `imagegen` skill before creating or editing raster artwork;
7. use `apply_patch` for source edits and preserve accepted user/task changes.

Every slice follows red -> green -> refactor. A visual screenshot alone never
proves state separation, asset ownership, audio behavior, or interaction safety.

## 2. Ordered Implementation Slices

### Slice 0 — Freeze baseline and failing presentation contracts

- [x] Run and record the current full unit/build/browser baseline before changing
      presentation code.
- [x] Add typed test fixtures for device settings V0/V1/future rows,
      presentation sequences, score evidence, AudioContext fakes, and media errors.
- [x] Add failing count/path tests for exactly 230 non-Joker emblems, 15 scenes,
      three stems, 22 SFX, and four stingers.
- [x] Add failing architecture tests that forbid browser/audio imports from
      game-core and forbid presentation from parsing `ScoreBreakdownV2.trace`.
- [x] Capture the current 1280x720 critical screens as before-state review evidence;
      do not update approved snapshots until each visual change is intentional.

Primary ownership:

- `tests/persistence/device-settings.test.ts` (new)
- `tests/game-core/score-presentation-evidence.test.ts` (new)
- `tests/presentation/presentation-assets.test.ts` (new)
- `tests/presentation/presentation-sequence.test.ts` (new)
- `tests/architecture/layers.test.ts`

Gate: new tests fail only because the planned V1 settings, manifests, typed cues,
and assets do not exist; existing tests remain green.

### Slice 1 — Device settings V1 and global 声场 drawer

- [x] Extract settings ownership from the IndexedDB adapter into a pure
      `deviceSettings` module with `PresentationSpeed`, defaults, decoder, and
      validator.
- [x] Migrate valid unversioned rows in place while preserving volumes/mute; add
      `schemaVersion: 1` and default `presentationSpeed: full`.
- [x] Preserve physical IndexedDB version 1. Treat corrupt and future rows per the
      design matrix without touching profile/run data.
- [x] Extend `GameRepository` and every memory/test adapter with typed
      `getSettings` and `saveSettings`.
- [x] Add serializable settings, pending/error, drawer-open, and exact-source
      overlay state to the app slice. Persist changes through one serialized thunk
      with rollback on failure.
- [x] Add the global `声场` drawer to every loaded route and one-click mute to
      active-run chrome. Drawer close must preserve current route, run phase,
      selection, setup form, and underlying scroll position.
- [x] Keep audio objects out of Redux; use a temporary no-op preview adapter until
      Slice 7 supplies the real director.

Primary ownership:

- `src/persistence/deviceSettings.ts` (new)
- `src/persistence/repository.ts`
- `src/persistence/indexedDbRepository.ts`
- `src/app/store/appSlice.ts`
- `src/presentation/components/SoundStageDrawer.tsx` (new)
- `tests/persistence/device-settings.test.ts`
- `tests/app/settings-store.test.ts` (new)
- `tests/presentation/sound-stage-drawer.test.tsx` (new)
- `tests/helpers/memoryRepository.ts`

Gate: legacy values survive, all invalid/future/write-failure cases are safe, and
drawer/mute operations never change route/profile/run state.

### Slice 2 — Theme tokens, StageShell, and shared materials

- [x] Create the single token source for palette, paper/lacquer/brass/jade
      materials, typography, spacing, layers, shadows, and motion curves.
- [x] Extract `StageShell`, global overlay host, route-independent nav, and shared
      curtain/light/background decoration from `App.tsx`.
- [x] Implement the small approved primitive set: paper ledger, lacquer panel,
      stage placard, seal button, brass counter, dialog, and catalog emblem frame.
- [x] Replace duplicated global raw colors/frames/buttons incrementally without
      moving domain data or commands into primitives.
- [x] Establish the title/body/numeric system with local system stacks and
      project-owned wordmark/seal art only; add no remote or unverified font.
- [x] Prove the stage and browser page remain scroll-free at 1280x720 and
      1920x1080 while named dense ledger bodies retain bounded internal scroll.

Primary ownership:

- `src/presentation/theme/tokens.css` (new)
- `src/presentation/components/StageShell.tsx` (new)
- `src/presentation/components/StageMaterials.module.css` (new)
- `src/presentation/components/StagePrimitives.tsx` (new)
- `src/app/App.tsx`
- `src/app/App.module.css`
- `src/presentation/styles/global.css`
- `tests/presentation/stage-shell.test.tsx` (new)

Gate: loading, profile, menu, and one active-run screen share the shell/primitives,
fit both viewports, and preserve existing functional component tests.

### Slice 3 — Authored 230-row non-Joker emblem system

- [x] Freeze an explicit 230-row emblem matrix with stable content ID, family,
      reference, motif, ornament, palette, and seal fields.
- [x] Implement 13 family-specific SVG grammars and a deterministic generator;
      runtime must load committed SVGs rather than hash-drawing generic geometry.
- [x] Generate exactly 230 text-free local SVG files at stable family/reference
      paths, each within the size/security budget.
- [x] Update non-Joker asset manifest rows to unique paths/focal keys while
      preserving ownership/content/asset IDs.
- [x] Replace `CatalogGlyph` in collection, offers, choices, setup, and reference
      surfaces with the shared `CatalogEmblem` projection and family frame.
- [x] Preserve approved lock conditions and Joker undiscovered masking; add local
      family fallback for decode failure with no remote retry.
- [x] Add static and browser audits for counts, family matrix, unique paths,
      SVG safety/decode, lazy loading, and zero remote request.

Primary ownership:

- `src/presentation/assets/catalogEmblemMatrix.ts` (new)
- `src/presentation/assets/catalogEmblems.ts` (new)
- `scripts/generate-catalog-emblems.mjs` (new)
- `public/assets/catalog/**` (new generated SVGs)
- `src/content/manifests/assets.ts`
- `src/presentation/catalog/CatalogGlyph.tsx` or replacement
- `tests/content/catalog-emblems.test.ts` (new)
- `tests/e2e/catalog-emblems.spec.ts` (new)

Gate: 230/230 unique non-Joker SVGs and 150/150 unchanged Joker WebPs resolve;
locked/masked tests and full catalog audit pass.

### Slice 4 — Five-performer reference and 15 key scenes

- [x] Load the `imagegen` skill and create a text-free reference board for the five
      unnamed archetypes plus paper audience/spirits.
- [x] Review and freeze character silhouettes, materials, palette, exclusions, and
      crop rules before scene production.
- [x] Generate the 15 approved scene briefs using the accepted reference board;
      keep controls/text out of all raster masters.
- [x] Inspect every master at original resolution; regenerate anatomy, text/logo,
      crop, similarity, contrast, or cast-consistency failures.
- [x] Optimize accepted masters to 1920x1080 local WebP within per-file/aggregate
      budgets and write one complete provenance sidecar each.
- [x] Add the versioned presentation asset manifest with focal/crop metadata and
      CSS fallbacks.
- [x] Integrate scenes first into loading, profile, menu, table, shop, victory, and
      loss, then the remaining route families; do not cover live controls with art.
- [x] Add a 15-scene audit route/test and attach visual review evidence.

Primary ownership:

- `public/assets/presentation/scenes/*.webp` (15 new)
- `public/assets/presentation/provenance/*` (new)
- `src/presentation/assets/presentationAssets.ts` (new)
- shared shell and owning screen CSS modules
- `tests/presentation/presentation-assets.test.ts`
- `tests/e2e/presentation-assets.spec.ts` (new)

Gate: 15/15 scenes decode locally, match manifest/provenance/dimensions/budgets,
show a consistent unnamed ensemble, contain no gameplay text, and leave all hit
targets/readability intact.

### Slice 5 — Typed score evidence at the pure owner boundary

- [x] Add the closed `ScorePresentationEvidenceV3`/cue union in game-core with no
      React, browser, audio, or CSS dependency.
- [x] Make successful score resolution emit cues beside exact arithmetic changes:
      hand, scoring/retriggered cards, held sources, Joker/global sources, factors,
      money where presented, and final total.
- [x] Keep evidence ephemeral: do not add it to run history, save Zod schemas,
      migrations, profile transfer, progression facts, or deterministic content
      identity.
- [x] Replace coarse V2 hand/score presentation events with one typed
      `score-performance` variant; extend other transient events only where an
      approved screen transition lacks evidence.
- [x] Add exhaustive order/value tests for base hands, card modifiers, held cards,
      retriggers, Joker sources, debuffs/false branches, factors, overflow Infinity,
      and blind win/loss.
- [x] Prove score state/RNG/domain events remain byte-equivalent when presentation
      evidence is ignored.

Primary ownership:

- `src/game-core/presentation/scoreEvidenceV3.ts` (new)
- `src/game-core/effects/scoreHandV2.ts`
- `src/game-core/commands/typesV2.ts`
- `src/game-core/commands/executeCommandV2.ts`
- `tests/game-core/score-presentation-evidence.test.ts`
- affected scoring goldens

Gate: UI requires no trace parsing, cue order is typed/exhaustive, and all gameplay
goldens remain unchanged outside transient presentation output.

### Slice 6 — Bounded presentation sequence, score seal, and motion language

- [x] Implement the pure event-to-sequence planner, adjacent coalescing, 48-cue
      visual bound, exact overflow summary, and full/brisk timing tables.
- [x] Replace the 240 ms toast queue with one reducer-owned sequence/cursor and
      exhaustive advance/finish/skip actions installed only on fulfilled commit.
- [x] Implement the circular score-seal performer for hand/base/card/source/total
      cues with bounded rings, stamps, placards, and particles.
- [x] Implement one-click land-now, hidden-tab finish, error-boundary finish, and
      drawer pause/resume-or-skip behavior.
- [x] Keep progression notices behind active sequences and preserve their durable
      acknowledgement semantics.
- [x] Consolidate card selection/draw/reorder/discard/play/sweep, acquisition,
      pack, coin, blind, reward, and curtain transitions under shared motion
      tokens with stable IDs and transform/opacity animation.
- [x] Add both-speed component/browser tests proving exact committed state before,
      during, after, skipped, hidden, and failed presentation.

Primary ownership:

- `src/presentation/motion/presentationSequence.ts` (new)
- `src/presentation/motion/motionTokens.ts` (new)
- `src/presentation/motion/ScoreSealPerformance.tsx` (new)
- `src/presentation/motion/StageTransition.tsx` (new)
- `src/presentation/PresentationQueue.tsx`
- `src/app/store/appSlice.ts`
- screen motion components/CSS
- `tests/presentation/presentation-sequence.test.ts`
- `tests/presentation/score-seal-performance.test.tsx` (new)

Gate: maximum cue counts/timing are bounded, both speeds and skip land on the
exact committed result, and presentation errors cannot call gameplay thunks.

### Slice 7 — Original audio generation, manifest, and Web Audio director

- [x] Implement the deterministic Node PCM/WAV generator with fixed PRNG, score
      config, peak normalization, exact sample counts, and check mode.
- [x] Generate three synchronized 96-second 32 kHz mono stems, 22 core SFX, and
      four stingers; keep aggregate sizes within approved budgets.
- [x] Add source/provenance/audio manifest rows with purpose, duration, sample
      format, owner, generator input, peak, and review state.
- [x] Implement the browser-only audio engine graph: gesture unlock, stem phase
      sync, 400 ms scene mix crossfade, master/music/SFX gains, mute ramp, eight
      one-shot cap, 40 ms duplicate coalescing, suspend/resume, and teardown.
- [x] Implement exhaustive presentation-cue and progression-notice sound mapping
      keyed by sequence/cue ID so rerender cannot replay sound.
- [x] Wire `AudioDirector` to committed route/phase, settings, and current cue
      without putting AudioContext/AudioBuffer/nodes in Redux.
- [x] Test denied gesture, decode failure, suspended context, duplicate cue,
      hidden tab, mute restoration, route mix changes, and unmount cleanup.
- [x] Add browser checks for persisted mix controls and silent gameplay fallback.

Primary ownership:

- `scripts/generate-presentation-audio.mjs` (new)
- `public/assets/presentation/audio/*.wav` (29 new)
- `src/presentation/audio/audioEngine.ts` (new)
- `src/presentation/audio/audioMap.ts` (new)
- `src/presentation/audio/AudioDirector.tsx` (new)
- `src/presentation/assets/presentationAssets.ts`
- `tests/presentation/audio-*.test.ts` (new)
- `tests/e2e/audio-settings.spec.ts` (new)

Gate: exact file/header/count/mapping audits pass; audio unlocks and persists in
Chromium/WebKit, while every failure case leaves gameplay fully usable.

### Slice 8 — Complete route-by-route presentation integration

- [x] Convert every remaining screen/overlay to the shared shell, material
      primitives, scene manifest, emblem projection, and motion hierarchy.
- [x] Preserve every Simplified-Chinese label, validation message, empty/locked/
      masked/completed/error state, and existing command dispatch.
- [x] Rework dense collection, achievement, statistics, help, notices, and
      maintenance layouts into intentional bounded ledgers with stable headers and
      filters.
- [x] Ensure setup previews, seed codes, exact IDs/content versions, result deltas,
      tutorial coach, and profile recovery remain visible and usable.
- [x] Add route transition and snapshot coverage incrementally: profiles/menu,
      setup/blind/table, reward/shop/pack, ledgers/tutorial/settings, win/loss.
- [x] Review visual hierarchy at 1280x720 and 1920x1080 after each family; update
      snapshots only for accepted intentional output.

Primary ownership:

- `src/presentation/screens/**`
- `src/presentation/progression/**`
- `src/presentation/catalog/**`
- owning CSS modules
- existing/new presentation component tests
- `tests/e2e/foundation.spec.ts` visual snapshots
- `tests/e2e/presentation.spec.ts` (new)

Gate: every functional route is visually coherent and operational at both
viewports, with no browser-page scroll, clipped critical control, or state
regression.

### Slice 9 — Loading, chunking, and performance closure

- [x] Measure current/new build chunks and resource loading against design budgets;
      split performer/audio/settings code where the initial route would regress.
- [x] Preload only current scene and atmosphere; lazy-load remaining scenes,
      emblems, Joker art, SFX, and performer code at point of use.
- [x] Reserve media dimensions and validate scene/emblem failure causes no layout
      shift or hit-target movement.
- [x] Keep collection rendering/decode bounded and verify not all Joker images load
      on entry/filter changes.
- [x] Add repeatable 1280x720/1920x1080 browser performance/resource probes for
      routine card motion, complex score sequence, collection, and route changes.
- [x] Fix recurring >50 ms main-thread work or layout/paint animation regressions
      without weakening gameplay correctness or hiding failures.

Primary ownership:

- `vite.config.ts`
- lazy import boundaries
- scene/emblem/Joker image components
- `tests/e2e/presentation-performance.spec.ts` (new)
- build/asset audit helpers

Gate: all size/loading/frame budgets pass or an explicit evidence-backed exception
is approved before final validation.

### Slice 10 — Full review, browser smoke, spec, and handoff

- [x] Run every command in Section 4 from the configured workspace runtime.
- [x] Run `trellis-check` over the complete task scope, not just the last slice;
      fix all blocking findings and rerun affected gates.
- [x] Visually inspect every scene, all emblem family ensembles, both speed modes,
      audio controls, error fallbacks, and critical snapshots.
- [x] Run real Chrome, Edge, and Safari mouse-first smoke at 1280x720 and a larger
      desktop viewport; record environment/version and evidence. Chrome was absent
      at planning time, so surface that external prerequisite before this gate and
      do not substitute Playwright Chromium without explicit approval. The user
      approved the documented Edge + Playwright Chromium/WebKit exception on
      2026-07-20.
- [x] Audit no remote request, no excluded identity, no unowned/unreviewed media,
      and byte-stable accepted Joker masters.
- [x] Run `git diff --check`, review the complete diff, validate the Trellis task,
      and update executable specs for settings/presentation/audio contracts.
- [x] Present the final evidence and logical commit plan for one-shot approval;
      commit before `trellis-finish-work` archives the child.

Browser smoke evidence on 2026-07-20:

- Installed Microsoft Edge `150.0.4078.83` passed the mouse-first profile, sound
  drawer, run setup, and table flow through the real `msedge` binary. The document
  geometry was exactly 1280x720 and 1920x1080, both primary table actions remained
  in view, and no remote request was observed.
- Safari `26.4` is installed with safaridriver
  `21624.1.16.11.4`, but session creation is blocked until the user enables
  Safari Settings -> Developer -> Allow remote automation.
- Google Chrome is not installed under `/Applications/Google Chrome.app`.
- AC7 was accepted on 2026-07-20 through the user's explicit exception based on
  real Edge plus Playwright Chromium/WebKit.

## 3. Risk Gates and Rollback Points

| Risk | Required evidence | Rollback boundary |
|---|---|---|
| Settings migration damages device/profile data | V0/V1/future/corrupt fixtures; profiles/runs byte-identical | Revert settings module/repository slice only |
| Typed cues change score/RNG | Before/after run/domain/RNG equality with evidence ignored | Revert evidence emission, keep scorer arithmetic |
| Sequence blocks gameplay | Skip/error/hidden tests land immediately on committed screen | Disable shared performer, never patch command timing |
| SVG set is generic or unsafe | Matrix review + 230-file safety/decode/focal audit | Revert emblem manifest/files as one unit |
| Key art obscures controls or drifts cast | Original-detail review + both-viewport overlay snapshots | Remove owning scene through manifest fallback |
| Audio replays or clips | cue-key idempotence + 8-source/40 ms limits + peak audit | Disable AudioDirector; gameplay remains complete |
| Asset payload regresses launch | build/resource budgets and lazy-load assertions | Roll back preload/chunk integration, keep files local |
| Snapshot updates hide defects | inspect actual/diff before any baseline write | keep prior baseline and fix layout |
| Accepted Joker art changes accidentally | byte/focal/provenance audit against baseline commit | restore only accidental asset edits |

Each generated asset family, manifest, generator, and audit is one rollback unit.
Never keep a manifest pointing at removed files or files without provenance.

## 4. Validation Commands

Use Node >=22.12 from the configured workspace runtime. In this workspace:

```bash
PATH=/opt/homebrew/Cellar/node/26.5.0/bin:$PATH
```

Focused gates:

```bash
npm run test -- --run tests/persistence/device-settings.test.ts tests/app/settings-store.test.ts tests/presentation/sound-stage-drawer.test.tsx
npm run test -- --run tests/game-core/score-presentation-evidence.test.ts tests/presentation/presentation-sequence.test.ts tests/presentation/score-seal-performance.test.tsx
npm run test -- --run tests/content/catalog-emblems.test.ts tests/presentation/presentation-assets.test.ts tests/presentation/audio-engine.test.ts
node scripts/generate-catalog-emblems.mjs --check
node scripts/generate-presentation-audio.mjs --check
npm run content:audit
npm run test:e2e -- --project=chromium tests/e2e/presentation.spec.ts tests/e2e/audio-settings.spec.ts
npm run test:e2e -- --project=webkit tests/e2e/presentation.spec.ts tests/e2e/audio-settings.spec.ts
```

Final automated gates:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
python3 ./.trellis/scripts/task.py validate 07-17-midnight-variety-presentation
```

Final review must report:

- test files/assertion counts and both Playwright projects;
- 150 Joker / 230 emblem / 15 scene / 3 stem / 22 SFX / 4 stinger audits;
- asset sizes, initial eager requests, and chunk/resource budgets;
- scene/emblem/audio provenance closure and zero remote requests;
- 1280x720 and 1920x1080 visual/performance evidence;
- real Chrome/Edge/Safari smoke evidence;
- any intentionally deferred work (none may contradict this PRD or parent AC).

## 5. Pre-Start Review Checklist

- [x] `prd.md`, `design.md`, and `implement.md` agree on exact asset/audio counts,
      settings behavior, two pacing modes, scene/cast scope, state separation,
      performance budgets, and browser gates.
- [x] PRD convergence pass removes resolved questions and duplicate temporary
      brainstorm material without losing constraints or evidence anchors.
- [x] Repository-answerable technical decisions are resolved in `design.md`.
- [x] No genuinely blocking product decision remains.
- [x] User reviews and explicitly approves the final planning artifacts.
- [x] Only then run `task.py start 07-17-midnight-variety-presentation` and load
      `trellis-before-dev`; planning approval is not implicit implementation
      approval.
