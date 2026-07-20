# Progression, Tutorial, and Modes

## Goal

Turn the existing deterministic Chinese card-game runtime into a complete
local-first product loop. A player can keep three isolated profiles, learn through
a short scripted tutorial, choose campaign/seeded/challenge modes, advance visible
progression, inspect the complete collection/achievement/statistics ledgers, and
safely move or recover one profile without an account, network service, or
compatibility promise to any external game.

## Background and Confirmed Baseline

- The production catalog is already frozen at 14 families and 380 rows: 230
  non-Jokers plus 150 Jokers. Its exact family counts are executable constants in
  `src/content/schema/catalog.ts:11-58`, and the production catalog combines every
  family in `src/content/catalogs/index.ts:12-27`.
- Existing catalog availability already accepts profile-objective and discovery
  context, but no durable profile projection currently supplies it
  (`src/content/runtime/eligibility.ts:119-186`). Joker first acquisitions already
  leave deduplicated run evidence (`src/game-core/rules/discoveryV3.ts:4-40`).
- A profile currently contains only slot identity, name, timestamps, and active
  run ID; its slot type is exactly 1, 2, or 3 (`src/persistence/profiles.ts:4-13`).
  There is no durable tutorial, unlock, collection, achievement, statistics, mark,
  or notice state.
- IndexedDB physical version 1 already has `meta`, `settings`, `profiles`, `runs`,
  and `recovery` stores (`src/persistence/indexedDbRepository.ts:51-72` and
  `src/persistence/indexedDbRepository.ts:190-203`). Profile transfer already uses
  checksums, versioned run migration, and a 2 MB limit
  (`src/persistence/profileTransfer.ts:47-113`).
- The command boundary already follows proposal, invariant validation, checkpoint
  persistence, then event reveal (`src/app/commitRunCommand.ts:29-72`). Typed
  domain events cover the principal play/economy/result actions
  (`src/game-core/commands/typesV2.ts:191-218`).
- The latest run is V6 / `joker-catalog-3` (`src/game-core/model/runV6.ts:6-33`).
  Current run IDs derive only from the seed (`src/game-core/rules/createCampaignRun.ts:129-143`),
  so repeating one seed is not a safe persistent run identity.
- App navigation currently distinguishes only loading, profiles, and playing
  (`src/app/store/appSlice.ts:22-32`), while the root routes only by those states
  and the active run phase (`src/app/App.tsx:99-147`). The production start action
  creates V6 directly, without a mode/setup/progression contract
  (`src/app/store/appSlice.ts:200-228`).
- This task depends on the completed non-Joker and three Joker catalog children.
  The later presentation-polish child depends on the functional screens produced
  here, so this task owns function and data contracts but not final polish.

## Requirements

### R1 — Three isolated durable profiles

1. Keep exactly three profile slots. Every permanent field, active run, tutorial
   state, unlock, discovery, mark, achievement, statistic, result delta, and unread
   notice belongs to one profile and must never leak through profile switching.
2. Version the profile independently from the run. Preserve slot-based stable
   identity, 1–12-character name, creation/update timestamps, active-run ownership,
   and a monotonic per-profile run sequence.
3. Store only canonical, bounded, serializable profile data. Reject duplicate,
   missing, foreign, unsorted, negative, unsafe, or unknown-version records without
   mutating any slot.

### R2 — Mode selection and settlement policy

1. Support these run classes with one explicit policy table:
   - ordinary campaign and its endless continuation advance all ordinary ledgers;
   - challenge advances only challenge completion, challenge-specific statistics,
     the next challenge gate, and registry rows explicitly derived from challenge
     completion (D15 plus achievements 025–027); it advances no unrelated ledger;
   - seeded records its seed/content version/result but advances no ordinary
     unlock, discovery, achievement, victory-mark, or statistics ledger;
   - tutorial updates only tutorial start/step/complete/skip/replay state.
2. An ordinary Ante 8 win settles its campaign victory exactly once before the
   player chooses finish or endless. Reload, command retry, finish, or later
   endless checkpoints cannot award that win twice.
3. Campaign and seeded wins may finish or enter endless. Challenges complete and
   end at Ante 8 with no endless branch. Tutorials end after their scripted shop.
4. Mode/setup/result flows must display the selected deck, stake or challenge,
   seed, exact content version, outcome, and mode-appropriate progress delta.

### R3 — Content-unlock progression

1. Maintain a private content-unlock ledger separate from the public achievement
   book. It covers the 78 catalog objective references: 14 decks, 7 contextual
   stakes, 20 challenges, 32 vouchers, and 5 tags. Shared facts may advance both
   ledgers, but one ledger never stands in for or implicitly mutates the other.
2. A fresh profile receives D01, S01, campaign and seeded modes, V01/V03 through
   V31 (the 16 odd base vouchers), and every tag except G02-G06. Baseline grants
   emit no unread notice.
3. D02-D15, V02/V04 through V32, and G02-G06 use the visible deterministic global
   objective matrix in `design.md` Section 7. Conditions may use committed wins,
   aggregate statistics, collection facts, and explicit actions, but never random
   unlock rolls, wall-clock dates, opaque platform identity, circular gates, or
   permanently missable one-shot events.
4. A permanently unlocked even voucher remains subject to its paired odd voucher
   prerequisite inside each run.
5. Stakes progress per deck, not globally. Every unlocked deck begins at S01; a
   valid campaign win on Sn records that deck's clear and opens only S(n+1), up to
   S08. Lower cleared stakes remain selectable.
6. The first ordinary campaign win unlocks challenge mode and C01. Completing
   C01-C19 sequentially opens the next challenge through C20. Challenge setup uses
   S01 and exposes no deck/stake selector.
7. Seeded setup may select only a deck and stake already available to the profile.
   A run freezes its eligibility/discovery snapshot at creation, so progress earned
   during it changes only future runs.

### R4 — Permanent 胜幕印记

1. Keep permanent victory marks structurally separate from run-local permanent,
   perishable, and rental sticker modifiers.
2. Record each deck's highest eligible cleared stake.
3. At a valid ordinary Ante 8 win, upgrade every final owned Joker content ID to
   the highest stake on which it accompanied a win. Duplicate instances settle
   once per content ID, marks only increase, and challenge/seeded/tutorial modes
   award none.

### R5 — Complete profile collection

1. Project exactly 380 rows with the established 14-family counts.
2. Show all 230 non-Joker identities, descriptions, local art, rules, and lock
   conditions from profile creation. Locked content remains identifiable.
3. Mask each of the 150 Jokers until its first acquisition in an ordinary campaign
   or its endless continuation. A masked row may show only silhouette, ordinal, and
   undiscovered state; it must not leak name, rarity, copy policy, rules, or flavor.
4. Discovery is monotonic and profile-local. Support family, lock, discovery,
   discovered-Joker rarity, and victory-mark filters plus separate completion
   summaries for catalog, Joker discovery, global unlocks, deck stakes, and Joker
   marks.

### R6 — Exactly 31 visible achievements

1. Implement the exact registry in `design.md` Section 8: 6 入场, 8 牌技, 5 经营,
   5 收藏, 4 挑战, and 3 终局 achievements, for a total of 31.
2. Every achievement is visible from profile creation and shows its stable ID,
   original Chinese name, local icon, condition, current/target progress,
   completion state, and first completion timestamp. There are no hidden entries.
3. Evaluate only committed deterministic facts. Achievements never directly gate
   content, depend on network/platform identity or wall-clock dates, or complete a
   second time.

### R7 — Bounded deterministic statistics

Maintain these profile-local aggregates and records, deduplicated by run ID plus
checkpoint ID:

- campaign starts/wins/losses, derived win rate, current/best win streak, and
  highest endless Ante;
- total score, best hand score, hands/cards played, cards discarded, blinds
  defeated/skipped;
- money earned/spent/maximum held, interest earned, purchases/sales, shop and boss
  rerolls, packs opened, vouchers redeemed, and consumables used;
- play count and best score for exactly 12 poker-hand types;
- starts, wins, and highest clear for exactly 15 decks;
- attempts, completions, and completion time for exactly 20 challenges;
- bounded typed sets/counters required for visible objective progress.

Derived ratios must handle zero denominators. Do not measure wall-clock play time
or retain an unbounded raw event log. Seeded/tutorial activity does not enter these
statistics; challenge activity enters only its isolated challenge records.

### R8 — Scripted tutorial and permanent help

1. Prompt every fresh profile to start or skip a resumable deterministic tutorial
   before ordinary mode selection. Permit skip at any step and replay from Help
   after completion or skip.
2. Use one real fixed D01/S01 blind plus one fixed shop, not a mock UI or a guided
   eight-Ante campaign. Across roughly eight committed interactions teach blind
   target/reward, card selection, play, Chips/Mult/score, discard, shop purchase,
   Joker capacity, pack opening, consumable choice/use, and return to menu.
3. Persist script version and current step. Invalid actions show contextual Chinese
   guidance without changing run/profile/RNG; reload resumes the committed step.
   Replay keeps the original completion timestamp and never clears ordinary data.
4. Tutorial runs never advance ordinary ledgers.
5. Keep a 12-hand Chinese table and contextual terminology reference available
   from the menu and every campaign/seeded/challenge run, independent of tutorial
   status. Show current run hand levels when applicable.

### R9 — Clipboard-only seeded sharing

1. Generate or accept an eight-character uppercase A-Z/0-9 seed.
2. Copy and parse the canonical code
   `BXQP1|progression-modes-1|SEED8|DNN|SNN`, containing share format, exact
   content version, seed, deck, and stake.
3. Accept a plain seed or full code, normalize case, and preview the resolved setup
   before starting. Reject malformed, future, unsupported-version, or unavailable
   deck/stake input with a Simplified Chinese explanation; never replay it silently
   under current content.
4. Keep sharing local and clipboard-based: no URL/deep link, account, network, or
   external-game compatibility.

### R10 — Atomic projection, results, and notices

1. For every accepted command, derive profile facts from typed before/after run
   state and domain events, validate the projected profile/run pair, then persist
   both in the same transaction before revealing either state or presentation.
2. Reject stale/repeated checkpoints. A failed domain rule, invariant, profile
   projection, or storage write leaves the exact prior Redux and IndexedDB pair.
3. Progress settles automatically; there is no manual reward claim and no modal
   interruption during card, score, pack, choice, or existing presentation queues.
4. After presentation, show compact coalesced banners for discoveries,
   achievements, unlocks, and marks. Persist at most 50 keyed unread summaries per
   profile; acknowledgement is durable, and no unbounded notification history is
   retained.
5. Win/loss/finish results show the complete bounded run delta, including unlocks,
   discoveries, achievements, marks, and applicable statistics.

### R11 — Safe profile maintenance, transfer, and migration

1. Treat the following as distinct operations:
   - abandon clears only the active run and retains permanent progress;
   - reset keeps slot, name, and creation time, clears all other profile/run state,
     and first atomically saves one complete recovery snapshot;
   - import validates/migrates and previews source version, name, progress summary,
     and active-run status before target selection; it remaps profile/run ownership
     to any chosen slot and snapshots the overwritten target in the same transaction;
   - restore replaces the slot with its latest reset/import snapshot; a later
     reset/import replaces that one-level recovery;
   - permanent delete requires exact normalized profile-name input and removes its
     profile, run, and all recovery records with no undo.
2. A profile export contains the complete selected profile and optional active run,
   but no other slot, recovery snapshot, or device setting. Imports remain bounded
   to 2 MB and checksum-validated.
3. Support legacy local records and V1-V6 transfers through pure sequential
   migrations. Preserve identity, slot, name, timestamps, active run, setup, and
   structurally valid durable discovery/unsettled terminal evidence. Seed the
   approved fresh defaults and tutorial not-started; leave unsupported historical
   statistics, achievements, purchases, and unlocks at zero.
4. Never infer history from balances, inventory, deck shape, or checkpoint number.
   Preserve a raw pre-migration profile/run snapshot, make migration idempotent,
   permit an evidenced unsettled Ante 8 result to settle once, and reject unknown
   future versions without mutation.

### R12 — Functional Simplified Chinese screens

1. After profile selection, provide Continue when applicable plus Main Menu,
   Campaign/Seeded/Challenge/Tutorial setup, Collection, 百戏成就簿, Statistics,
   Help, notices, results, and profile maintenance.
2. Restore navigation from durable route/run state after refresh. Active run class
   and phase, not transient component state, determine the functional screen.
3. Fit every functional state into the existing fixed 1280×720 16:9 stage and use
   local assets and Simplified Chinese copy. This task must make every required
   operation usable, but may leave final art/audio/motion refinement to its
   dependent presentation child.

## Technical Notes

- `src/game-core` stays pure and framework-free. `src/progression` owns the single
  fact taxonomy, registries, reducers, policies, and selectors; `src/tutorial`
  owns the versioned script/gate; persistence owns decoding/migration/transactions;
  the app injects clock/seed and orchestrates reveal; presentation renders typed
  projections. Detailed contracts are in `design.md` Sections 3–16.
- Add Run V7 and content compatibility label `progression-modes-1`, including run
  class, profile owner, sequence, frozen eligibility/discovery, progression rules,
  and tutorial script version. New production run IDs include profile, sequence,
  class, and seed.
- Keep physical IndexedDB version 1 and reuse the five existing stores with
  namespaced recovery records; no backend or network service is required.
- Use safe non-negative integers and the existing score wire/formatting contract.
  Engine/reducer code does not read ambient time or randomness.
- Execute the ordered slices and risk gates in `implement.md`. Phase 2 begins only
  after review, `task.py start`, and `trellis-before-dev`.

## Acceptance Criteria

- [x] **AC1 (R1):** Exactly three profiles remain isolated across all permanent
      state, active runs, switching, export/import, reset/restore, and deletion;
      invalid or future profile data cannot mutate a slot.
- [x] **AC2 (R2):** Campaign, endless, challenge, seeded, and tutorial flows enforce
      their exact settlement scopes through retry, reload, finish, and resume; only
      campaign/seeded offer endless, and Ante 8 campaign victory settles once.
- [x] **AC3 (R3):** The separate 78-reference content ledger has the approved fresh
      grants, exact visible global objective matrix, 15×8 contextual stake progress,
      sequential C01-C20 gates, paired-voucher runtime prerequisites, frozen run
      eligibility, and positive/negative/boundary/migration tests.
- [x] **AC4 (R4):** Deck and Joker 胜幕印记 derive only from a valid ordinary final
      inventory, deduplicate Joker IDs, upgrade monotonically, and never mix with
      run-local sticker modifiers.
- [x] **AC5 (R5):** Collection renders exactly 380 correctly counted rows; all 230
      non-Jokers are visible, 150 Jokers mask without metadata leakage until an
      eligible first acquisition, and discovery/filter/summary state is isolated
      and durable.
- [x] **AC6 (R6):** The achievement book contains exactly 31 visible entries in
      category counts 6/8/5/5/4/3, with stable Chinese copy/icons/progress and one
      first-completion timestamp; it has no hidden or direct content gates.
- [x] **AC7 (R7):** Every approved bounded aggregate and 12-hand/15-deck/20-challenge
      record counts a successfully persisted checkpoint once, derives ratios safely,
      obeys mode/profile isolation, and stores no play-time or raw-event history.
- [x] **AC8 (R8):** Fresh-profile start/skip, all scripted tutorial steps, invalid
      action, close/reload resume, completion, later replay, hand table, and terms
      pass pure/component/browser coverage without advancing ordinary ledgers.
- [x] **AC9 (R9):** Seed generation, plain entry, canonical code copy/paste, preview,
      unlock enforcement, malformed/future-version rejection, and same-version
      deterministic replay pass pure and browser tests with no network dependency.
- [x] **AC10 (R10):** Profile progression cannot commit or fail separately from its
      run command; stale checkpoints are idempotent, result deltas are complete,
      banners wait for presentation, and the at-most-50 unread queue survives and
      durably acknowledges reload.
- [x] **AC11 (R11):** Abandon, reset, restore, target-slot import/remap, import
      recovery, typed-name deletion, full-profile export, and evidence-only legacy
      migration are atomic, previewed, failure-injected, and preserve other slots
      plus device settings.
- [x] **AC12 (R12):** All functional screens and error/empty/locked/masked states are
      usable in Simplified Chinese at 1280×720, restore correctly after refresh,
      make zero remote content requests, and pass Chromium and WebKit flows.
- [x] **AC13 (R1–R12):** Registry audits, format, lint, TypeScript, focused/full
      Vitest, production build, Chromium/WebKit Playwright, `git diff --check`, and
      Trellis validation pass with no unresolved blocker.

## Out of Scope

- Compatibility with Balatro or any other external game's saves, seeds, content,
  terminology, balance, accounts, or online services; only its style of play is a
  reference.
- URL/deep-link sharing, multiplayer, cloud sync, platform achievements, telemetry,
  leaderboards, backend APIs, and network content.
- Wall-clock play-time tracking, unbounded event/notice history, and manual reward
  claiming.
- Final art replacement, full audio, advanced motion, presentation polish, and the
  later cross-content visual-quality pass.
- A dedicated accessibility audit or certification for this task.
