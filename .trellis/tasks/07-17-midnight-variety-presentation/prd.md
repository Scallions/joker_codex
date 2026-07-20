# Midnight Variety Presentation

## Goal

Turn the complete functional game into a cohesive, original Simplified-Chinese
desktop production under the **百戏奇牌 / 午夜百戏** identity. The result must feel
like a tactile midnight variety-show stage rather than a styled dashboard, while
leaving deterministic gameplay and committed state completely independent from
animation or audio.

## Background and Confirmed Baseline

- This is child 8 of 9 under `07-17-chinese-joker-card-web-game`. Children 1-7
  are complete; the final integration gate explicitly depends on this child.
- The application already has functional profile, menu, mode setup, blind, table,
  reward, shop, choice/pack, collection, achievement, statistics, tutorial,
  notices, maintenance, win, loss, and endless-result screens.
- The current stage already uses an indigo/vermilion/paper/brass baseline and a
  fixed 16:9 viewport, but many screens still use large flat panels, generic
  generated catalog glyphs, sparse transitions, and placeholder stage chrome.
- Exactly 150 奇牌 already have reviewed local 768x1024 WebP illustrations and
  per-asset provenance. The other 230 catalog rows currently share one stage SVG
  plus deterministic geometric glyphs.
- The engine emits a closed `PresentationEventV2` queue after persistence. Current
  presentation consumes those events as brief text cues; some screens use Motion,
  but there is no complete ordered score performance or unified transition system.
- IndexedDB already stores device-level `masterVolume`, `musicVolume`, and
  `sfxVolume`, but there is no player-facing settings route, audio engine, music,
  or SFX asset set.
- The approved parent direction is documented in
  `research/visual-direction.md`: theatrical, mischievous, tactile, nocturnal;
  ink-indigo, vermilion, warm paper, aged brass, jade, lacquer, silk, carved
  metal, ink wash, and sparse electric glow. The signature interaction is a
  circular vermilion scoring seal.

## Requirements

### R1 — Unified original visual system

1. Apply one coherent 午夜百戏 system to every functional route and overlay,
   including loading, profiles, menu, all setup modes, table, blind selection,
   reward, shop, choice/pack, collection, achievements, statistics, tutorial,
   help, notices, maintenance, settings, win, loss, and endless results.
2. Use shared tokens and primitives for paper, lacquer, brass, jade, curtains,
   stage placards, seals, tickets, ledgers, frames, buttons, tooltips, dialogs,
   tabs, progress marks, rarity, disabled/locked states, and focus/hover/press
   feedback.
3. After loading, every functional screen exposes one compact global `声场`
   control. It opens a drawer over the current stage for master/music/SFX volume
   and the two presentation speeds, then closes back to the exact same route,
   overlay, or committed run phase without navigation or state loss. Active run
   screens additionally expose one-click mute.
4. Preserve live DOM/SVG Chinese text, costs, ranks, suits, rules, progress, and
   action labels; do not bake functional text into generated imagery.
5. Preserve the 百戏奇牌 name and exclude copied branding, mascots, casino/CRT
   treatments, localized text, art, audio, or interface assets from any reference
   product.

### R2 — Fixed-stage composition and readability

1. Keep one scroll-free 16:9 game stage that is fully usable at 1280x720 and
   scales cleanly at a larger desktop viewport.
2. The table must retain stable hit targets and expose the run ledger, blind,
   target/current score, hands, discards, money, Joker/consumable capacity,
   selected cards, sort controls, deck state, and primary actions without overlap.
3. Dense collection, achievement, statistics, help, and maintenance views may
   scroll only inside an intentional bounded ledger region; the browser page and
   stage itself must not scroll.
4. Critical Chinese copy, numbers, controls, locked conditions, masks, tooltips,
   and dialogs must remain readable against all materials and artwork.

### R3 — Asset coverage and ownership

1. Keep the 150 approved 奇牌 illustrations and make their frames, crops, loading,
   shop/pack/table presentation, collection display, and locked masks consistent
   with the final visual system.
2. Replace generic placeholder presentation for the 230 non-奇牌 rows with a
   stable unique local SVG emblem per row, composed inside a family-specific frame
   and material system. The emblem must be recognizable in catalog cards, offers,
   choices, tooltips, and locked/masked states without requiring 230 full-size
   raster paintings or leaking locked metadata.
3. Add exactly 15 original key scene/chrome artworks across card backs, curtains, score
   seal, table materials, profile/menu motifs, shop/pack framing, tutorial/help,
   settings, achievements, and win/loss/endless results. Reusable stage materials
   may be shared, but each major route family must have a deliberate focal scene.
4. Key scenes use one recurring unnamed five-performer ensemble: masked comic,
   illusionist, musician, acrobat, and prop master, accompanied by paper-cut
   audience silhouettes and minor paper spirits. They create visual continuity
   only; they receive no proper names, catalog IDs, gameplay abilities, dialogue
   tree, lore progression, or mascot role.
5. Every shipped image, vector, texture, icon, and audio asset must have a stable
   manifest record covering owner, source or generation prompt, dimensions/format,
   review state, and owning feature/content ID.
6. Runtime presentation assets must be local; no screen or media path may require
   a network request.

### R4 — Table and card interaction language

1. Cards lift with a short paper snap and controlled perspective. Selection,
   sorting, drawing, discarding, playing, sweeping, transformation, destruction,
   copying, acquisition, and reordering must have distinct readable motion.
2. The table composition uses hanging Joker/consumable placards, a lacquered run
   ledger, a central blind banner and score seal, a fanned hand, and physical
   ticket/seal actions.
3. Motion must never change selection, command timing, RNG, score, purchases,
   persistence, or progression. The committed state remains authoritative before
   any presentation begins.

### R5 — Ordered scoring performance

1. Replace the brief score toast with an ordered performance that can represent
   hand reveal, base chips, card strikes/retriggers, held-card effects, Joker
   triggers, multiplier changes, final score, blind clear/failure, and rewards.
2. The circular vermilion stage seal is the visual anchor. It accumulates rings,
   stamps, glyphs, coin marks, and restrained particles in event order, then lands
   on the exact committed total.
3. Provide exactly two device-level presentation speeds: `完整演出` is the
   default full timing, while `利落演出` shortens pauses and transitions without
   dropping event information. The choice persists across profiles and reloads.
4. At either speed, the player can click once to land immediately on the already
   committed result for the current sequence. Skipping, animation errors, hidden
   tabs, slow frames, or reduced browser timers must reveal the final state
   without replaying commands. A global animation-off mode is not part of this
   task.
5. Routine feedback remains restrained so scoring, rare acquisition, victory,
   and failure retain a clear impact hierarchy.

### R6 — Screen transitions and feedback

1. Use curtains, lighting, folding screens, ledgers, receipts, seals, or stage
   placards for major route/phase transitions rather than generic fades alone.
2. Give blind entry/skip, reward receipt, shop entry/reroll/purchase/sale, pack
   opening/choice/skip, unlocks, achievements, tutorial steps, win, loss, and
   endless continuation distinct but consistent feedback.
3. Progression notices remain non-modal and do not obscure primary gameplay or
   the ordered presentation queue.

### R7 — Original local audio

1. Provide one original 96-second seamless local composition with Chinese
   instrumental timbres and restrained electronic texture. Deliver it as three
   synchronized layers (base atmosphere, percussion, and instrumental color) so
   menu, table, and shop can crossfade between deliberate mixes without loading
   several unrelated full songs.
2. Provide exactly 22 bounded core SFX covering cards, paper, wood, coins, seals,
   curtains, packs, purchase/sale, scoring tiers, and unlocks, plus four short
   stingers for victory, loss, rare acquisition, and achievement completion.
3. Use separate master, music, and SFX controls backed by the existing device-level
   settings. These values and the two-state presentation speed persist across
   profiles and reloads.
4. Drawer changes apply audibly/visually without leaving the current route and
   persist safely. One-click mute preserves the three configured volume values so
   unmuting restores the previous mix.
5. Audio begins only after a user gesture, tolerates browser autoplay denial,
   resumes safely, and never blocks or alters command resolution.
6. Event-to-sound mapping is presentation data. Repeated/high-frequency events
   must be bounded so scoring remains clear and does not clip or become cacophonous.

### R8 — Performance and loading

1. Target fluid 60 Hz transform/opacity motion on a modern desktop at 1280x720;
   avoid layout reads and paint-heavy full-stage animation loops.
2. Preload only critical stage/card/audio chrome, lazy-load collection media, and
   decode imagery before important reveals without delaying committed gameplay.
3. Keep live DOM and particle counts bounded. Large catalog views must remain
   responsive and must not eagerly decode all 150 full-resolution Joker images.
4. Production build output must remain fully local and must not introduce an
   application backend.

### R9 — Browser and regression coverage

1. Preserve all existing functional, deterministic, migration, persistence,
   progression, and catalog tests.
2. Add component tests for settings, media failure, cue skipping, event/audio
   mapping, asset fallbacks, and presentation/state separation.
3. Add Chromium and WebKit flows for critical animation/audio controls, reload,
   collection loading, and representative win/loss/shop/pack sequences.
4. Maintain intentional visual baselines at 1280x720 and add a larger-viewport
   baseline for critical screens. Complete real Chrome, Edge, and Safari smoke
   checks before acceptance.

## Acceptance Criteria

- [x] **AC1 (R1-R2):** Every functional route and overlay uses one original
      午夜百戏 component/material system, with readable Simplified Chinese and
      stable mouse targets at 1280x720 and a larger desktop viewport; the global
      `声场` drawer returns to the exact source state and active runs offer one-click
      mute.
- [x] **AC2 (R3):** All visual/audio assets have complete ownership manifests;
      all 150 Joker illustrations, 230 unique SVG emblems with family frames, and
      exactly 15 key scene/chrome artworks resolve locally with approved masks/
      fallbacks and zero remote requests; the five unnamed performer archetypes
      remain visually consistent without becoming gameplay content or a mascot.
- [x] **AC3 (R4-R5):** Card/table motion and the ordered stage-seal performance
      follow committed presentation evidence and land on exact final values in
      both `完整演出` and `利落演出`; either speed can be skipped or fail without
      changing, dropping, or repeating gameplay state, and the selected speed
      persists across profiles and reloads.
- [x] **AC4 (R6):** Blind, reward, shop, pack, progression, tutorial, win, loss,
      and endless transitions have distinct coherent feedback without obscuring
      required actions.
- [x] **AC5 (R7):** The three-layer 96-second local loop, exactly 22 core SFX, and
      four stingers pass ownership and event-mapping audits; media starts only
      after user gesture, master/music/SFX controls persist across profiles and
      reloads, and autoplay/media failure never blocks gameplay.
- [x] **AC6 (R8):** Critical motion meets the approved desktop performance budget,
      collection/media loading stays responsive, assets are bounded/lazy, and the
      production build has no runtime network dependency.
- [x] **AC7 (R9):** Format, lint, type checks, full Vitest, build, asset/ownership
      audits, Chromium/WebKit E2E and visual baselines, plus real Chrome/Edge/
      Safari smoke checks all pass without a gameplay regression.

  Accepted exception (approved by the user on 2026-07-20): installed Edge
  `150.0.4078.83` passed the real-browser smoke at both target viewports;
  Playwright Chromium/WebKit passed the full suite. Google Chrome was absent and
  Safari 26.4 remote automation was disabled, so those two installed-browser
  smokes were waived for this local acceptance.

## Out of Scope

- Gameplay rules, catalog counts, balance, RNG, saves, seed compatibility, or
  progression redesign.
- Compatibility with another product's assets, audio, branding, saves, or seeds.
- Mobile/touch, gamepad, public deployment, backend services, cloud sync, and
  account features.
- Dedicated accessibility modes or certification, including reduced-motion,
  high-contrast, UI scaling, screen-reader gameplay, and keyboard-only guarantees.
- Replacing the approved 150 Joker focal illustrations unless an audit finds a
  concrete defect.
