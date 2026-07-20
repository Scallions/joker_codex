# Midnight Variety Presentation Technical Design

## 1. Design Objective

Deliver a production-grade visual, motion, and audio layer for every existing game
state without changing authoritative gameplay. The design has one memorable focal
mechanism: the circular vermilion stage seal turns committed score evidence into an
ordered theatrical performance. All other decoration, motion, and sound supports
that mechanism rather than competing with it.

The implementation remains a local React/Vite application. It adds no backend,
account, network content, gameplay rule, balance change, or save/seed
compatibility promise.

## 2. Non-Negotiable Invariants

1. `src/game-core` remains pure and framework-free.
2. Commands propose and persist the complete gameplay checkpoint before React
   receives presentation cues.
3. Presentation state is transient. Refresh restores the committed screen, not an
   unfinished animation cursor.
4. Motion, media decode, autoplay denial, audio failure, hidden tabs, or cue skip
   cannot issue or replay a command.
5. UI does not parse score debug traces. The score owner emits typed transient
   evidence at the same time as the arithmetic result.
6. Device settings are isolated from all three profiles; profile export/import
   excludes them.
7. All visual and audio media is local, ownership-tracked, and text-free where
   rasterized. Gameplay text remains live DOM/SVG.
8. The browser page and fixed stage never scroll. Only named ledger bodies may
   scroll internally.

## 3. Approved Product Decisions

| Area | Decision |
|---|---|
| Identity | Bold, tactile 午夜百戏 stage; no generic dashboard or casino/CRT treatment |
| Signature | Circular vermilion score seal is the high-impact visual anchor |
| Existing Joker art | Retain all 150 approved 768x1024 WebP illustrations |
| Non-Joker art | 230 unique local SVG emblems inside authored family-specific frames |
| Key art | Exactly 15 text-free scene/chrome WebPs |
| Recurring cast | Five unnamed performer archetypes; no mascot, lore, dialogue, or gameplay IDs |
| Music | One 96-second composition rendered as three synchronized local stems |
| SFX | 22 core effects plus four stingers |
| Pacing | `完整演出` and `利落演出`; one click lands immediately on committed state |
| Settings | Global `声场` drawer on every loaded route; active runs also get one-click mute |
| Typography | Intentional Chinese system stacks for live text plus project-owned wordmark/seal art; do not introduce an unverified font license |
| Accessibility | No dedicated reduced-motion, high-contrast, scaling, or keyboard-only mode in this child |

## 4. Current Baseline and Gaps

- `App.tsx` owns one fixed stage and route switch, with four absolute run-only nav
  buttons. It has no route-independent overlay host for settings.
- CSS modules already implement paper, lacquer, indigo, and vermilion concepts,
  but tokens and primitives are duplicated between screen files.
- Several screens use Motion for entry or card hover. Timing and easing are local
  literals rather than a motion language.
- `PresentationQueue` consumes a flat `PresentationEventV2[]` every 240 ms and
  renders only a small text toast.
- A scored hand emits only `hand-reveal`, one final `score-stamp`, and optional
  blind/result events even though `scoreHandV2` already owns the complete effect
  order.
- `ScoreBreakdownV2.trace` is a debugging representation. Presentation must not
  parse that string array.
- `DeviceSettings` and default volumes exist inside
  `indexedDbRepository.ts`; they are not part of `GameRepository` and have no app
  state or UI.
- All 230 non-Joker rows point to `catalog-stage.svg` and a hashed geometric
  `CatalogGlyph`. All 150 Joker paths and provenance records are already closed.
- No music/SFX files, audio engine, audio mapping, key-scene manifest, or global
  settings component exists.

## 5. Architecture

```text
Pure command / scorer
  -> committed RunState + typed score evidence in PresentationEventV2
  -> profile/run IndexedDB transaction completes
  -> application builds one transient PresentationSequence
  -> Redux exposes committed run + current cue
  -> React stage performer renders cue
  -> AudioDirector mirrors current cue through Web Audio

Device settings
  -> repository decode/default migration
  -> Redux serializable DeviceSettingsV1
  -> global settings drawer
  -> AudioDirector gains + presentation timing selector
```

Dependency direction remains:

```text
game-core -> app orchestration -> presentation components
                  |                    |
                  v                    v
             repository           audio runtime
```

`audio runtime` contains browser objects and may import typed presentation
contracts. It may not be imported by game-core, content rules, migrations, or the
repository.

## 6. Proposed File Ownership

```text
src/
  app/
    store/appSlice.ts                  # settings + transient sequence state
  game-core/
    presentation/scoreEvidenceV3.ts    # typed ephemeral score cue contract
  persistence/
    deviceSettings.ts                  # V0 decode -> DeviceSettingsV1
    repository.ts                      # getSettings/saveSettings boundary
  presentation/
    assets/
      catalogEmblems.ts                # row -> committed SVG path projection
      presentationAssets.ts            # scene/audio manifest
    audio/
      AudioDirector.tsx                # browser lifecycle/provider
      audioEngine.ts                   # AudioContext graph, no React
      audioMap.ts                      # cue -> sound mapping
    components/
      StageShell.tsx
      StageMaterials.module.css
      StagePrimitives.tsx
      SoundStageDrawer.tsx
    motion/
      motionTokens.ts
      presentationSequence.ts
      ScoreSealPerformance.tsx
      StageTransition.tsx
    theme/
      tokens.css
    screens/ and progression/          # consume shared shell/primitives
scripts/
  generate-catalog-emblems.mjs
  generate-presentation-audio.mjs
public/assets/
  catalog/<family>/<reference>.svg
  presentation/scenes/*.webp
  presentation/audio/*.wav
  presentation/provenance/*.{md,json}
```

The final names may be adjusted to existing naming conventions, but ownership
must remain separated: pure evidence, application orchestration, browser runtime,
and visual components cannot collapse into one module.

## 7. Device Settings Contract

Formalize the previously unversioned settings row as V1 while retaining physical
IndexedDB version 1.

```ts
type PresentationSpeed = "full" | "brisk";

interface DeviceSettingsV1 {
  readonly schemaVersion: 1;
  readonly masterVolume: number; // finite 0..1
  readonly musicVolume: number;  // finite 0..1
  readonly sfxVolume: number;    // finite 0..1
  readonly muted: boolean;
  readonly presentationSpeed: PresentationSpeed;
}

function decodeDeviceSettings(value: unknown): DeviceSettingsV1;
function validateDeviceSettings(value: DeviceSettingsV1): ValidationResult;
```

Decode behavior:

- Missing row -> current defaults `0.8 / 0.7 / 0.9 / false / full`.
- Existing unversioned valid row -> preserve all four existing values and add
  `schemaVersion: 1`, `presentationSpeed: "full"`.
- Missing/invalid individual volume fields do not silently clamp a future record;
  reject writes. A corrupt stored row falls back to defaults with a recoverable
  Chinese warning and never blocks profile/run loading.
- Unknown future settings version is not overwritten automatically.

Extend `GameRepository` with `getSettings()` and `saveSettings(settings)`. Every
memory/test repository implements the same boundary. The app initializes settings
with profiles and exposes pending/error state. Drawer changes update the Web Audio
gains immediately and persist through one serialized thunk. Failed persistence
restores the prior serializable settings while audio follows the restored values.

`settingsOpen` is overlay state, not a durable route. Closing the drawer returns to
the untouched route/run. `muted` changes only the effective master gain; it never
zeros or rewrites the saved three volumes.

## 8. Typed Presentation Evidence

### 8.1 Score evidence

Add an ephemeral evidence field to the successful score resolution. Do not add it
to `ScoreBreakdownV2`, run history, Zod save schemas, migration, or transfer.

```ts
type ScoreMetricV3 =
  | "chips"
  | "mult-add"
  | "mult-factor"
  | "score-factor"
  | "money";

type ScorePresentationCueV3 =
  | {
      readonly type: "hand";
      readonly handType: PokerHandType;
      readonly name: string;
      readonly level: number;
      readonly baseChips: number;
      readonly baseMultiplier: number;
    }
  | {
      readonly type: "card";
      readonly cardId: CardId;
      readonly pass: number;
      readonly chips: number;
      readonly scoring: boolean;
    }
  | {
      readonly type: "source";
      readonly sourceKind: "held-card" | "joker" | "global";
      readonly sourceId: string;
      readonly effectId: string;
      readonly metric: ScoreMetricV3;
      readonly value: number;
      readonly repeatCount: number;
    }
  | {
      readonly type: "total";
      readonly chips: number;
      readonly multiplier: number;
      readonly score: number;
    };

interface ScorePresentationEvidenceV3 {
  readonly version: 1;
  readonly cues: readonly ScorePresentationCueV3[];
}
```

`scoreHandV2` pushes evidence next to the exact arithmetic mutation that it
describes. Debug `trace` remains for golden diagnosis; UI and audio import only the
typed cue union. Evidence values use the same overflow semantics as committed
score and the central score formatter.

### 8.2 Command events

Replace the pair of coarse `hand-reveal`/`score-stamp` events for accepted V2 play
commands with one transient `score-performance` event containing the typed
evidence. Other action variants remain closed and are extended only where a
player-facing transition lacks evidence (pack open/skip, sale, achievement, and
route curtain where required).

Presentation events are never saved, exported, migrated, or used to derive
progression. This makes the transient contract change independent from Run V7 and
content version `progression-modes-1`.

## 9. Presentation Sequence Contract

The app transforms committed presentation events into one bounded sequence:

```ts
type PresentationCuePayloadV1 =
  | ScorePresentationCueV3
  | Exclude<PresentationEventV2, { readonly type: "score-performance" }>
  | { readonly type: "overflow-summary"; readonly remainingCount: number };

interface PresentationCueV1 {
  readonly cueId: string;
  readonly kind: string; // implemented as an exhaustive union
  readonly payload: PresentationCuePayloadV1;
  readonly repetitions: number;
}

interface PresentationSequenceV1 {
  readonly sequenceId: string; // runId:checkpointId
  readonly checkpointId: number;
  readonly cues: readonly PresentationCueV1[];
  readonly cursor: number;
}
```

Rules:

1. The fulfilled command action installs the sequence only after persistence.
2. One reducer owns advance, finish, and skip. Components never splice the queue.
3. The planner coalesces adjacent equivalent triggers and preserves a repetition
   count. It caps rendered cues at 48 plus a final total; overflow becomes one
   typed summary cue with the exact remaining count.
4. `完整演出` targets a maximum 10-second complex score performance;
   `利落演出` targets 3 seconds. Simple feedback remains below 1.2/0.45 seconds.
5. One click on the performer dispatches `skipPresentationSequence`, immediately
   revealing the committed state. It does not dispatch a gameplay thunk.
6. On `document.visibilityState === "hidden"`, finish the visual sequence and
   silence one-shot cues. Resume only the continuous music mix on return.
7. A presentation error boundary finishes the sequence and reports a non-blocking
   Chinese warning. It never resets the app or run.
8. Progression notice banners remain queued until no active sequence exists.

## 10. Visual System

### 10.1 Tokens

Define one CSS-token source for:

- ink/indigo/soot surfaces;
- vermilion action and danger;
- paper ivory plus warm/cool/locked variants;
- aged brass economy/achievement;
- jade utility/success;
- rarity accents;
- shadow, foil, fiber, grid, and glow strengths;
- stage scale, panel radii/cuts, borders, spacing, type scale, and z-index layers;
- full/brisk timing and four approved easing curves.

CSS modules consume variables; they do not redeclare raw palette values except for
asset-specific art direction. A token audit rejects repeated legacy raw colors in
new shared chrome.

### 10.2 Primitives

Use a small composable set rather than a new UI kit:

- `StageShell`: stage background, curtains, lights, global controls, overlay host.
- `PaperLedger`: dense scrollable information and forms.
- `LacquerPanel`: dark gameplay/status surfaces.
- `StagePlacard`: Joker, consumable, blind, and choice framing.
- `SealButton`: primary/destructive/utility physical actions.
- `BrassCounter`: money, score, target, capacity, and progress.
- `StageDialog`: confirm/import/settings overlays.
- `CatalogEmblem`: image path, family frame, locked mask, fallback.

Primitives own visual semantics only. Existing feature components retain their
data selection, commands, labels, and validation.

### 10.3 Typography

- Display: Kai/serif system stack with project-owned title/seal SVG only where a
  fixed wordmark is appropriate.
- Body: explicit Simplified-Chinese sans stack optimized for dense rules.
- Numeric: tabular figures and stable-width counters.
- No remote font request. Do not extract or redistribute a system font.

## 11. Screen Composition Matrix

| Screen family | Final composition | Key scene |
|---|---|---|
| Loading/brand | Curtain rise, title seal, lantern rail | `brand-curtain` |
| Profiles | Three paper playbills on a dark rehearsal stage | `profile-ledger` |
| Main menu | Five-performer ensemble behind physical mode tickets | `main-ensemble` |
| Mode setup | Route map, deck/stake emblems, seed ticket | `mode-rehearsal` |
| Blind select | Three curtain bays and audience silhouettes | `blind-curtain` |
| Table | Ledger left, placards top, score seal center, fanned hand | `table-stage` |
| Reward | Oversized stamped receipt over cleared stage | `reward-receipt` |
| Shop | Layered night-market stalls, brass coin rail | `night-market` |
| Pack/choice | Folding prop cabinet and torn-paper reveal | `prop-cabinet` |
| Collection | Archive drawers, family emblems, masked Joker slots | `archive-ledger` |
| Achievements/statistics | Brass honor wall plus accounting scroll | `honor-ledger` |
| Tutorial/help | Rehearsal chalk marks and prop-master guidance | `rehearsal-guide` |
| Settings/notices/maintenance | Backstage control board and document trays | `backstage-controls` |
| Victory/endless | Full cast curtain call and expanding seal | `curtain-call` |
| Loss | Empty lit stage, folded playbill, restrained soot | `empty-stage` |

These 15 scenes are atmosphere layers, not full-screen illustrations covering
controls. Crop-safe focal regions are declared in the manifest for 16:9 and panel
uses.

## 12. Catalog Emblem Pipeline

1. Freeze an explicit 230-row emblem matrix keyed by content ID. Each entry owns
   `family`, `reference`, `motif`, `ornament`, `palette`, and `seal` rather than a
   hash-only geometry seed.
2. Use 13 authored family grammars matching catalog families: deck, stake,
   challenge, voucher, tarot, planet, spectral, tag, blind, booster, enhancement,
   seal, and edition.
3. A deterministic Node generator turns the reviewed matrix into individual
   optimized text-free SVG files under stable family/reference paths. Generated
   output is committed; runtime does not draw a random shape.
4. Update each non-Joker catalog ownership row to its individual SVG path while
   preserving its existing ownership/content/asset IDs and unique focal key.
5. `CatalogEmblem` uses `<img>` for the local file, family-specific live frame,
   lazy loading in the collection, and a CSS/SVG fallback if decode fails.
6. Locked non-Jokers may show the emblem plus lock condition as already approved;
   undiscovered Jokers continue to mask name, rule, rarity, flavor, and image.

Audit requirements: 230 files, 230 unique paths/focal keys, valid SVG structure,
no script/external URL/text node, path localness, family count match, and browser
decode success.

## 13. Key Scene Asset Pipeline

During implementation, load the project `imagegen` skill before creating raster
art.

1. Generate and approve one text-free five-performer ensemble reference board.
2. Reuse that board as a visual reference while producing the 15 scene briefs.
3. For each scene, record prompt, reference inputs, intended crop/focal area,
   dimensions, owner, exclusions, and review checklist before optimization.
4. Inspect every master at original detail for character consistency, composition,
   broken anatomy/props, accidental text/logo/watermark, excluded visual identity,
   and safe control-overlay contrast.
5. Regenerate failures; do not repair raster art with CSS patches.
6. Commit optimized local WebP plus provenance sidecar. Keep live text and critical
   symbols outside the raster.

The scene manifest is separate from `ProductionCatalog.assets` because scenes are
presentation-owned and do not correspond one-to-one with gameplay content rows.

```ts
interface SceneAssetRecord {
  readonly id: SceneAssetId;
  readonly path: `/assets/presentation/scenes/${string}.webp`;
  readonly provenancePath: string;
  readonly width: 1920;
  readonly height: 1080;
  readonly focalPoint: readonly [number, number];
  readonly reviewed: true;
}
```

## 14. Audio Production and Runtime

### 14.1 Deterministic original media

Use a checked-in Node generator and authored score configuration so the project
owns the complete source and needs no external audio license or generation service.

- Sample format: mono 16-bit PCM WAV at 32 kHz.
- Music: exactly three sample-aligned 96-second stems: atmosphere, percussion,
  instrumental color.
- SFX: exactly 22 short core files, normalized conservatively.
- Stingers: exactly four files for victory, loss, rare acquisition, achievement.
- Generation uses a fixed project PRNG seed, bounded oscillators/noise/envelopes,
  and no ambient time/randomness.
- All stems have identical sample count/loop boundaries. Tests inspect WAV headers,
  duration, peak bounds, non-silence, and file counts.

### 14.2 Browser graph

```text
three synchronized looping BufferSourceNodes
  -> per-stem GainNodes -> music GainNode
pooled one-shot BufferSourceNodes
  -> sfx GainNode
music GainNode + sfx GainNode
  -> master GainNode -> AudioContext.destination
```

- Create/resume the context on the first trusted pointer/keyboard gesture.
- Decode lazily; menu may start once the atmosphere stem is ready. Other stems
  join only at the shared loop phase.
- Crossfade scene mixes over 400 ms; never stop/restart music for ordinary route
  changes.
- Cap simultaneous one-shots at eight and coalesce identical sounds inside 40 ms.
- `AudioDirector` keys playback by `sequenceId + cueId`; React rerender does not
  replay a sound.
- `muted` ramps effective master gain to zero over 40 ms while preserving values.
- Context suspend/decode/source failure sets a non-blocking status and leaves all
  gameplay controls available.

Scene mixes:

| Context | Atmosphere | Percussion | Color |
|---|---:|---:|---:|
| Profiles/menu/help/settings | 1.0 | 0.15 | 0.55 |
| Blind/table/reward | 0.85 | 0.70 | 0.45 |
| Shop/pack/collection | 0.95 | 0.35 | 0.80 |
| Win/endless | 0.90 | 0.90 | 1.00 |
| Loss | 0.70 | 0.05 | 0.25 |

The exact curves belong to presentation configuration, not app reducers.

## 15. Motion Language

- Routine hover/press: CSS transform/opacity, 90-180 ms.
- Card selection: Motion spring using transform only; preserve current hit box.
- Draw/reorder: layout animation with stable card IDs.
- Discard/destruction: paper sweep/tear overlay after committed zone change.
- Acquisition: placard arrives from the stage wing; coin cue is independent.
- Pack reveal: cabinet fold plus staggered options, no random UI ordering.
- Route change: one shared curtain/lighting transition; never nest full-stage
  transitions.
- Score: typed cues drive rings/stamps/source placards/total. Particles are bounded
  SVG/DOM decoration with `pointer-events: none`, not gameplay state.

Animate transform and opacity wherever possible. No layout measurement occurs
inside a frame loop. Motion keys use stable content/card/instance/cue IDs, never
array position alone.

## 16. Loading and Performance Budgets

- Keep critical initial JS+CSS gzip below 350 KiB after existing route splitting;
  split audio/settings performer code from the initial profile route where useful.
- Each scene WebP target <= 350 KiB; all 15 <= 5 MiB combined.
- Each emblem SVG target <= 8 KiB; all 230 <= 1.5 MiB combined.
- Three PCM stems combined <= 20 MiB; all SFX/stingers combined <= 3 MiB.
- Initial route preloads at most the current scene plus atmosphere stem. Do not
  preload all scene, SFX, emblem, or Joker assets.
- Collection uses `loading="lazy"`, bounded overscan/pagination, and does not decode
  all 150 Joker images on entry.
- At 1280x720 and 1920x1080, critical interactions target 60 Hz with no recurring
  >50 ms main-thread long task during routine card motion.
- Layout must not shift when a scene/emblem fails; reserve dimensions and show the
  local fallback.

Budgets are verified by build stats, asset audits, browser resource entries, and a
repeatable Playwright performance probe. Real-browser smoke checks remain an
acceptance requirement, not a replacement for automated evidence.

## 17. Error and Fallback Matrix

| Failure | Required behavior |
|---|---|
| Settings row absent | Use and persist V1 defaults |
| Legacy valid settings row | Preserve values, add speed `full` |
| Future settings version | Warn and do not overwrite automatically |
| Settings save rejects | Restore prior settings and gains; keep route/run |
| Audio autoplay denied/suspended | Show non-blocking enable affordance; game continues |
| Stem/SFX decode fails | Silence only affected media; game continues |
| Scene image fails | Render reserved CSS stage fallback |
| Catalog emblem fails | Render family fallback without remote retry |
| Presentation cue render throws | Finish sequence; reveal committed state |
| Tab becomes hidden | Finish transient visual sequence; do not replay on return |
| Cue list exceeds visual bound | Coalesce and show exact repetition/remaining count |
| Infinity score | Use central score formatter and terminal visual state |
| Drawer opened mid-sequence | Pause visual timing, keep committed state and music; resume or skip on close |
| Unknown cue variant | Exhaustive compile failure; no catch-all production rendering |

## 18. Testing Strategy

### Pure/unit

- Settings V0/default/V1/future decode and validation.
- Cue evidence order beside score arithmetic, retriggers, held cards, Jokers,
  factors, Infinity, and false/debuff branches.
- Sequence coalescing, 48-cue bound, full/brisk timing, advance, hidden, error,
  and skip reducers.
- Audio mapping exhaustiveness, scene mixes, one-shot coalescing, mute restoration,
  and no replay for the same cue key.
- Emblem/scene/audio manifest counts, paths, provenance, decode headers, sizes,
  focal uniqueness, and remote URL rejection.

### Component

- Global drawer opens from menu and active run, closes to the exact same screen,
  changes live values, saves, rolls back on failure, and one-click mute restores.
- Score seal renders typed evidence and exact total at both speeds; skip finishes
  without command dispatch.
- Every route uses the shared shell/material primitives and retains existing
  functional selectors/actions.
- Locked/masked/fallback asset states leak no Joker identity.

### Browser

- Chromium and WebKit: first gesture unlock, settings persistence across profiles
  and reload, autoplay/decode failure fallback, full/brisk/skip score sequence.
- Critical campaign flow: blind -> table -> score -> reward -> shop -> pack,
  including scene/audio resource audits and state equivalence before/after skip.
- Win, loss, endless, tutorial, collection, achievement, and maintenance route
  snapshots at 1280x720; representative 1920x1080 snapshots.
- Zero remote request, bounded eager resource count, lazy Joker decode, and
  performance probe.
- Real Chrome, Edge, and Safari manual smoke matrix is recorded for the final gate.

Planning-time environment audit on 2026-07-20 found Edge and Safari installed and
Playwright 1.61.1 configured for Chromium and WebKit. Google Chrome was not found
under `/Applications` or the user application directory. This does not block
implementation, but AC7 cannot close until Chrome is available for the named
real-browser smoke or the user explicitly approves an evidence-backed exception;
Playwright Chromium is not silently substituted for that check.

All existing 514 unit/integration tests and 36 cross-browser E2E tests remain the
regression baseline before new coverage is added.

## 19. Compatibility and Rollback

- Run/profile/content schemas do not change for presentation evidence.
- Device settings add a pure V0-to-V1 decode in the existing physical store.
- Scene/audio/emblem changes do not bump gameplay content version because they do
  not change deterministic pools, behavior, IDs, or RNG. The presentation manifest
  owns its own version.
- Keep accepted 150 Joker files and provenance byte-stable unless a specific audit
  defect is documented.
- Slice rollback boundaries are settings, theme primitives, emblems, key scenes,
  typed performer, audio, screen integration, and optimization. Never roll back a
  manifest without its matching files/tests.
- If a visual transition blocks an action, first disable that transition through
  the shared performer; do not patch gameplay commands or persistence timing.

## 20. Rejected Alternatives

- 230 full raster non-Joker paintings: disproportionate review/load cost.
- One shared procedural glyph: insufficient authored identity.
- Multiple unrelated full music tracks: unnecessary size and composition scope.
- One fixed animation speed: slow for long runs.
- Global animation-off mode: outside the approved accessibility scope.
- Named cast or mascot: expands narrative/brand scope and conflicts with the
  ensemble stage concept.
- Menu-only settings: poor long-run control.
- Audio/animation objects in Redux: non-serializable and hard to recover.
- UI parsing score trace strings: duplicates an unstable engine contract.
- Presentation-before-persistence: can reveal a state that never committed.
