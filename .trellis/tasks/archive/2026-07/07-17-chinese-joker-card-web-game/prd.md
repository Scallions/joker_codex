# 百戏奇牌

## Goal

Create a complete, original Simplified-Chinese desktop-browser poker roguelike
named **百戏奇牌**. It uses the stable PC gameplay available on 2026-07-17 as a
frozen system, catalog, and balance reference while owning all implementation,
IDs, random streams, saves, branding, copy, artwork, and audio.

The final result is a full local game, not a static mockup or reduced proof of
concept. Implementation may be delivered incrementally through the approved
child tasks.

## Background

- The repository began as a clean Trellis scaffold with no application code,
  framework, tests, or assets.
- The product is for local/private execution first. Public hosting and
  commercialization are not part of this task.
- Balatro is a gameplay reference only. No technical interoperability, copied
  code/data formats, branding, presentation assets, audio, or localized text is
  required or permitted by this scope.
- The agreed original direction is **午夜百戏**: an indigo, vermilion, paper,
  lacquer, and brass theatrical card show with original comic performers and a
  circular stage-seal scoring identity.

## Requirements

### R1. Local desktop application

- Run through documented local commands in modern desktop Chrome, Edge, and
  Safari without an application backend.
- Require no account or network request after local application assets load.
- Support mouse-first play at 1280x720 CSS pixels and larger desktop viewports
  without browser-page scrolling during gameplay.
- Optional shortcuts may accelerate actions; gamepad, phone, and touch-first
  support are not required.

### R2. Complete game structure

- Provide campaign, seeded, challenge, eight-stake difficulty, win/loss, and
  endless play.
- Implement the complete blind loop: choose/play/skip, draw, select, play,
  discard, classify, score, reward, shop, pack, ante progression, finisher, and
  endless continuation.
- Match the frozen reference's established numerical curves and effect strengths
  for the first complete baseline. Independent rebalancing is deferred.

### R3. Frozen gameplay catalogs

Implement project-owned one-to-one mechanical mappings for:

| Catalog | Required count |
|---|---:|
| Standard playing cards | 52 |
| Poker hands, including hidden hands | 12 |
| 奇牌 | 150 |
| Starting decks | 15 |
| Difficulty stakes | 8 |
| Challenge runs | 20 |
| Vouchers | 32 |
| Tarot-equivalent consumables | 22 |
| Planet-equivalent consumables | 12 |
| Spectral-equivalent consumables | 18 |
| Tags | 24 |
| Blind collection entries | 30 |
| Booster-pack collection entries | 32 |
| Playing-card enhancements | 8 |
| Seals | 4 |
| Editions, including base | 5 |
| Local achievement objectives | 31 baseline objectives |

Every entry must have a project-owned stable ID, original Simplified Chinese
name and description, original presentation, availability/unlock/discovery
rules, typed behavior contract, and automated coverage. Counts describe the
frozen scope and do not expand automatically with future reference updates.

### R4. Deterministic engine

- The same 百戏奇牌 content version, seed, starting profile state, and player
  command sequence must reproduce identical gameplay state and random outcomes.
- Use a project-owned PRNG contract; do not promise cross-game seed compatibility.
- Resolve scoring and effects in an explicit stable order independent of browser,
  rendering, animation, audio, frame rate, or persistence timing.
- Gameplay rules and arithmetic must live outside UI components.

### R5. Profiles and durable local saves

- Support exactly three named local profiles.
- Isolate each profile's tutorial state, unlocks, collection, statistics,
  achievements, and active run; share only device-level settings such as audio.
- Autosave atomically after every committed irreversible action, including play,
  discard, buy, sell, reroll, consumable use, pack choice, blind choice/skip,
  reward, and round transition.
- After close, reload, or interrupted write, restore the latest complete state,
  never a partial resolution or animation frame.
- Support confirmed profile deletion and a versioned, validated, per-profile
  export/import format owned by 百戏奇牌.

### R6. Progression and onboarding

- Track deck/stake/challenge availability, collection discovery, stickers,
  statistics, unlocks, and a local **百戏成就簿** with original names and icons.
- A fresh profile must enter an in-run Simplified Chinese tutorial covering card
  selection, play/discard, scoring, blinds, shops, 奇牌 slots, and consumables.
- The tutorial can be skipped and replayed. A poker-hand table and contextual
  terminology reference remain available during ordinary runs.

### R7. Original presentation and audio

- Use **百戏奇牌** consistently as the product and browser title.
- Apply the approved 午夜百戏 identity across profiles, menus, table, shop,
  packs, collection, achievements, tutorial, settings, and results.
- Give all mapped content original names, wording, icons/illustrations, frames,
  and ownership metadata. Do not ship Balatro names as this product's formal
  identity or copy its mascot, card art, CRT treatment, UI assets, music, SFX,
  or localized descriptions.
- Provide original local music and sound effects blending card handling, coins,
  restrained Chinese percussion, and light electronic elements, with separate
  music and SFX volume controls.
- Presentation sequences may mirror domain events but must never determine the
  committed result.

## Acceptance Criteria

- **AC-01 Local launch:** A fresh checkout installs and launches with the
  documented commands, opens 百戏奇牌 in a supported browser, and requires no
  backend or account.
- **AC-02 Complete modes:** Automated and manual scenarios can win and lose the
  campaign, continue endless, and complete representative seeded, challenge, and
  stake runs through all required phases.
- **AC-03 Catalog completeness:** Generated audits match every R3 count with zero
  duplicate/missing IDs, localization, assets, ownership records, handlers,
  unlock/discovery rules, or contract tests.
- **AC-04 Rule correctness:** Poker, scoring, blind, economy, shop, pack,
  inventory, progression, and every mapped content contract pass approved
  positive, boundary, and interaction fixtures; intentional reference
  differences are documented.
- **AC-05 Determinism:** Golden PRNG vectors and replay fixtures produce identical
  state across repeated Chromium and WebKit runs for the same content version,
  seed, starting state, and command sequence.
- **AC-06 Atomic recovery:** Reload and fault-injection at every autosave boundary
  recover the exact last valid checkpoint without duplicate rewards, consumed
  actions, partial scoring, or damaged profiles.
- **AC-07 Profile isolation:** Creating, switching, renaming, deleting, exporting,
  importing, and progressing any profile cannot mutate either of the other two.
  Invalid imports leave current data intact and show a clear Chinese error.
- **AC-08 Tutorial and reference:** A new profile can complete, skip, and replay
  the tutorial; all poker hands and core terms remain available from the game.
- **AC-09 Progression:** Every planned unlock, discovery, statistic, sticker, and
  achievement trigger has tested locked/unlocked behavior and persists correctly.
- **AC-10 Original Chinese presentation:** All player-facing screens and catalogs
  use coherent original Simplified Chinese copy and approved 午夜百戏 assets; the
  ownership audit finds no excluded copied material.
- **AC-11 Desktop experience:** At 1280x720 and a larger desktop viewport, all
  required information and actions remain readable/operable without page scroll;
  critical flows pass Chromium/WebKit automation and real Chrome, Edge, and
  Safari smoke tests.
- **AC-12 Audio and animation:** Music/SFX controls work independently, assets are
  local, critical presentation sequences are smooth on supported desktops, and
  skipping or failing presentation cannot change game state.
- **AC-13 Parent integration:** All nine child tasks satisfy their PRDs and quality
  gates, the parent criterion-to-evidence audit is complete, and no required work
  remains hidden in a placeholder catalog or mock screen.

## Task Map

| Order | Child task | Acceptance ownership |
|---:|---|---|
| 1 | `07-17-playable-foundation-slice` | AC-01, architecture tracer, deterministic local save slice |
| 2 | `07-17-complete-run-and-economy` | Complete loop foundations for AC-02, AC-04, AC-06 |
| 3 | `07-17-non-joker-content-catalogs` | Non-奇牌 portion of AC-03 and AC-04 |
| 4 | `07-17-joker-catalog-001-050` | 奇牌 rows 001-050 for AC-03 and AC-04 |
| 5 | `07-17-joker-catalog-051-100` | 奇牌 rows 051-100 and earlier regression coverage |
| 6 | `07-17-joker-catalog-101-150` | 奇牌 rows 101-150 and complete catalog regression |
| 7 | `07-17-progression-tutorial-modes` | AC-07, AC-08, AC-09 and final mode flows |
| 8 | `07-17-midnight-variety-presentation` | AC-10, AC-11 presentation, AC-12 |
| 9 | `07-17-integration-quality-gate` | Full AC-02 through AC-13 evidence and release gate |

The parent owns this requirement set, task map, cross-child acceptance, and final
integration review. It is not itself an implementation target.

## Out of Scope

- Balatro seed/save/data/ID/protocol compatibility or runtime dependency.
- Copied Balatro branding, mascot, illustrations, interface, CRT treatment,
  music, sound effects, or localized text.
- Licensed crossover skins and reference content released after 2026-07-17.
- User accounts, cloud sync, backend APIs, online multiplayer, leaderboards,
  analytics, public hosting, domain setup, commercialization, or launch operations.
- Phone/touch layouts, gamepad support, or dedicated accessibility/compliance
  modes such as reduced motion, high contrast, UI scaling, guaranteed
  keyboard-only operation, and screen-reader gameplay.
- Manual save slots, mid-animation persistence, and undo of committed actions.
- Independent balance redesign before the frozen baseline is complete.

## Planning References

- `design.md` — architecture, data flow, effect ordering, persistence, UI, and
  compatibility/rollback design.
- `implement.md` — ordered child execution and quality gates.
- `research/frontend-stack.md` — stack and test-tool evidence.
- `research/gameplay-scope.md` — catalog counts, system inventory, and evidence
  limitations.
- `research/visual-direction.md` — 午夜百戏 presentation contract.
