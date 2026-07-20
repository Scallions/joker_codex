# Progression, Tutorial, and Modes Design

## 1. Objective and Existing Baseline

This task turns the already playable deterministic game into a complete
profile-local product loop: mode selection, progression, collection, statistics,
achievements, tutorial, results, seed sharing, migration, and recovery.

The implementation must build on these accepted facts:

- src/game-core already owns the deterministic command/checkpoint protocol,
  eight-Ante win/loss flow, and endless transition.
- src/content owns 15 decks, 8 cumulative stakes, 20 challenges, 32 vouchers,
  24 tags, 150 Jokers, and the complete 380-row production catalog.
- production runs already snapshot setup identity and emit durable Joker
  first-acquisition observations.
- src/persistence currently stores exactly three minimal profile summaries plus at
  most one active run per profile. It has no tutorial, progression, collection,
  statistics, achievement, or profile-action recovery state.
- src/app currently exposes only loading, profile selection, and active play.
  ProfileScreen starts D01/S01 directly and treats any optional seed as ordinary
  play.
- this task depends on the archived non-Joker and all three Joker catalog children.
  The later midnight-variety presentation child depends on this task's functional
  screens and must not be started first.

The feature remains one Trellis task. Its slices are separately testable, but they
all change the same profile schema, run migration chain, repository transaction,
and app router; splitting them into concurrent child tasks would create unsafe
ownership overlap.

## 2. Frozen Product Decisions

| Area | Decision |
|---|---|
| Progress ledgers | Content-unlock objectives and the 31 public achievements are separate ledgers fed by shared committed facts. |
| Eligible modes | Ordinary campaign plus its endless continuation advances full progress. Challenge advances only challenge state and rows explicitly derived from it (D15 and achievements 025–027). Seeded and tutorial play do not advance ordinary progress. |
| Stakes | Each of 15 decks owns an independent S01-S08 completion ladder. |
| Challenges | First campaign win unlocks C01; completing C01-C19 unlocks the next challenge. |
| Victory marks | Decks and Joker content IDs record their highest eligible winning stake as permanent 胜幕印记, separate from run-local stickers. |
| Collection | All 230 non-Joker rows are visible. The 150 Jokers remain masked until first eligible acquisition. |
| Achievements | Exactly 31 visible, deterministic local achievements in six approved categories; no hidden objectives. |
| Statistics | Bounded aggregate statistics only; no wall-clock play time or unbounded raw event log. |
| Tutorial | One resumable scripted blind plus shop, start/skip/replay, with always-available hand and terminology references. |
| Seed sharing | Clipboard share code only; no URL, account, network, or external-game compatibility. |
| Profile safety | Abandon, recoverable reset, target-slot import with one-level recovery, and typed-name permanent deletion are distinct actions. |
| Migration | Recover only facts supported by durable evidence; never fabricate old history. |
| Notices | Commit immediately, show non-blocking banners, summarize at results, and persist a bounded unread queue. |
| Endless | Campaign and seeded runs may continue; challenges and tutorials end at their own completion boundary. |

## 3. Layer Boundaries

The accepted cross-layer flow becomes:

    typed UI intent
      -> pure run command proposal
      -> run invariant validation
      -> typed progression facts from before/after state plus domain events
      -> pure profile projection
      -> profile invariant validation
      -> one IndexedDB transaction for profile and run
      -> reveal committed run, profile, presentation events, and notices

Rules:

1. src/game-core remains framework-free and never imports profiles, IndexedDB,
   Redux, React, tutorial UI, or presentation code.
2. src/progression owns the single fact taxonomy, objective/achievement registries,
   statistics reducer, profile projector, mode policy, and selectors.
3. src/tutorial owns the versioned script and command gate; it uses real production
   content and a real run, never a mock React-only game state.
4. src/persistence validates, migrates, and atomically stores durable profile/run
   pairs and recovery snapshots.
5. src/app orchestrates clocks, seed generation, transactions, route state, and
   committed event revelation.
6. src/presentation renders selectors and dispatches intents; it does not evaluate
   unlocks, achievements, scores, or tutorial legality.

The central projection APIs will have equivalent signatures to:

    deriveProgressionFacts(beforeRun, afterRun, domainEvents, context)
    reduceProfileProgression(profile, facts, nowEpochMs)
    validateProfileRecord(profile)

Unknown imported data is decoded once at the persistence boundary. UI and reducers
consume typed projections rather than parsing profile JSON or run observations.

## 4. Run V7 and Mode Identity

The current run mode cannot distinguish an ordinary campaign from a seeded or
tutorial run. Add RUN_SCHEMA_VERSION_V7 and CONTENT_VERSION_V7 =
progression-modes-1. V7 keeps the complete V6 gameplay state and adds a serializable
sessionV7 record:

| Field | Contract |
|---|---|
| runClass | campaign, seeded, challenge, tutorial, or migrated-legacy |
| profileId | Owning profile for new local runs; null only for legacy fixture inputs. |
| runSequence | Safe non-negative per-profile sequence used in the run ID. |
| progressionRulesVersion | progression-1 |
| eligibilityObjectiveIds | Sorted unique global objective IDs frozen at run start. |
| discoveredContentIds | Sorted unique profile discoveries frozen at run start. |
| tutorialScriptVersion | tutorial-1 for tutorial, otherwise null. |

New production run IDs include profile ID, run sequence, class, and seed. This
prevents two plays of the same seed from sharing an identity and makes checkpoint
deduplication safe. Test factories may omit the explicit identity and preserve
their existing deterministic fallback IDs.

V6-to-V7 migration is pure, consumes no RNG, preserves the V6 content version and
every gameplay field, derives campaign/challenge/legacy class from the old mode,
and uses a null legacy owner plus sequence zero. New runs use progression-modes-1.

Mode legality is enforced in the engine-facing command guard:

| Run class | Ante 8 result | Endless | Profile policy |
|---|---|---|---|
| campaign | run-won choice | allowed | full |
| seeded | run-won choice | allowed | none |
| challenge | completed result | rejected | challenge-only |
| tutorial | scripted shop completion | rejected | tutorial-only |
| migrated-legacy | preserve old legal state | evidence-only | derived conservatively |

The challenge-only policy updates the completed-challenge ledger, its isolated
attempt/completion statistics, the next challenge gate, D15 when ten challenges
are complete, and achievements 025–027. It does not update campaign statistics,
collection discovery, victory marks, or unrelated objectives/achievements.

Run pool eligibility uses the objective/discovery snapshot frozen at run creation.
Unlocks earned during a run become available on the next run; they never mutate an
already materialized shop, pack, tag, voucher, or seed stream.

## 5. Profile Schema

Introduce PROFILE_SCHEMA_VERSION = 1 and treat the current unversioned record as
legacy profile version zero. Durable state remains plain serializable data: arrays,
records, strings, booleans, and finite/safe numbers only.

ProfileRecord V1 contains the existing identity fields plus:

| Group | Durable fields |
|---|---|
| identity | schemaVersion, id, slot, displayName, createdAtEpochMs, updatedAtEpochMs |
| run ownership | activeRunId, nextRunSequence, activeProjectionCursor |
| tutorial | status, currentStepId, scriptVersion, started/completed/skipped timestamps, replayCount |
| global unlocks | sorted objective progress records with current/target/completedAt/source |
| deck stakes | exactly 15 records with highest cleared stake ordinal 0-8 |
| challenges | exactly 20 attempt/completion records and next available ordinal |
| collection | sorted discovered Joker IDs and exactly 150 optional Joker victory marks |
| achievements | exactly 31 progress records with first completion timestamps |
| statistics | fixed counters, records, per-hand, per-deck, and per-challenge records |
| run-local projection | bounded counters needed for current-run objectives and result deltas |
| notices | at most 50 keyed unread summaries plus the last bounded result summary |

The activeProjectionCursor is either null or a pair of runId and highest committed
checkpointId. The reducer accepts each checkpoint once. Starting a new run resets
the cursor and run-local projection; finishing or abandoning clears active state
without retaining an unbounded run ledger.

Every list is normalized to stable ID order, duplicate-free, and exact-count where
the catalog is frozen. Selectors may create temporary Sets or Maps, but they never
enter Redux or persistence.

## 6. Progression Facts and Atomic Commit

ProgressionFact is a closed discriminated union. It covers at least:

- run-started, run-won, run-lost, run-finished, endless-entered;
- blind-won, blind-skipped, hand-scored, cards-played, cards-discarded;
- item-acquired, item-purchased, item-sold, consumable-used, voucher-redeemed;
- shop-rerolled, boss-rerolled, pack-opened, interest-earned;
- Joker-discovered and Joker-edition-acquired;
- challenge-completed and tutorial-step/completed/skipped;
- final-run facts such as money, full-deck ranks/suits, used Joker capacity, setup
  deck/stake/challenge, and final owned Joker content IDs.

Facts are derived from the accepted engine result, immutable before/after run
states, registered content metadata, and existing durable observations. The
projector never switches on Joker IDs to implement gameplay.

For every accepted command:

1. reject stale or illegal commands without profile work;
2. produce and validate the next run;
3. derive ordered facts and filter them through the run-class policy;
4. reject a fact batch whose run/checkpoint is already at or behind the cursor;
5. update statistics, objectives, collection, achievements, marks, result delta,
   and unread notices in one pure reduction;
6. validate the projected profile/run pair;
7. write previous run recovery, projected profile, and next run in one transaction;
8. reveal Redux state and presentation events only after transaction completion.

The same pattern applies to run start and tutorial completion. A persistence
failure exposes neither the proposed run nor the projected progress.

Timestamps enter from an injected application clock only after a completion fact
exists. Engine code and pure condition evaluation never read Date.now.

## 7. Internal Unlock Matrix

### 7.1 Fresh-profile grants

Fresh profiles start with D01, S01, campaign/seeded play, all 16 odd-numbered base
voucher objective IDs, and every tag except G02-G06. Challenge mode remains locked.
Baseline objective records use source = baseline and createdAtEpochMs as their
completion time; they do not emit unread notices.

### 7.2 Deck objectives

| Objective ID | Unlock | Visible condition |
|---|---|---|
| bxqp:objective:deck:02 | D02 | Win one eligible campaign. |
| bxqp:objective:deck:03 | D03 | Win an eligible campaign while holding at least 40 戏票. |
| bxqp:objective:deck:04 | D04 | Win an eligible campaign that earned zero interest. |
| bxqp:objective:deck:05 | D05 | Clear a blind while all current Joker capacity is occupied. |
| bxqp:objective:deck:06 | D06 | Use 20 consumables in eligible campaigns. |
| bxqp:objective:deck:07 | D07 | Play one poker-hand type at least 20 times in total. |
| bxqp:objective:deck:08 | D08 | Use 5 Spectral-family consumables. |
| bxqp:objective:deck:09 | D09 | Win with no printed J, Q, or K remaining in the full deck. |
| bxqp:objective:deck:10 | D10 | Win with at most two printed suits remaining in the full deck. |
| bxqp:objective:deck:11 | D11 | Redeem 10 distinct voucher content IDs. |
| bxqp:objective:deck:12 | D12 | Win any eligible campaign on S03 or higher. |
| bxqp:objective:deck:13 | D13 | Skip 20 blinds in eligible campaigns. |
| bxqp:objective:deck:14 | D14 | Score at least 1,000,000 in one hand. |
| bxqp:objective:deck:15 | D15 | Complete 10 challenges. |

All final-deck checks use the committed full deck at the Ante 8 win checkpoint.
Printed identity is used so Wild or Stone effects cannot make the condition
ambiguous.

### 7.3 Voucher objectives

The 16 odd rows are baseline grants. The even row remains unavailable to future
runs until its profile objective completes and still requires the odd paired row
inside the current run.

| Objective ID | Unlock | Visible condition |
|---|---|---|
| bxqp:objective:voucher:02 | V02 | Purchase 30 shop items. |
| bxqp:objective:voucher:04 | V04 | Spend 500 戏票 in shops. |
| bxqp:objective:voucher:06 | V06 | Acquire 10 edition-bearing Jokers. |
| bxqp:objective:voucher:08 | V08 | Reroll the shop 30 times. |
| bxqp:objective:voucher:10 | V10 | Use 20 Tarot-family consumables. |
| bxqp:objective:voucher:12 | V12 | Use 20 Planet-family consumables. |
| bxqp:objective:voucher:14 | V14 | Play 150 hands. |
| bxqp:objective:voucher:16 | V16 | Discard 300 playing cards. |
| bxqp:objective:voucher:18 | V18 | Use 50 Tarot-family consumables. |
| bxqp:objective:voucher:20 | V20 | Use 50 Planet-family consumables. |
| bxqp:objective:voucher:22 | V22 | Earn 100 戏票 from interest. |
| bxqp:objective:voucher:24 | V24 | Discover 50 Jokers. |
| bxqp:objective:voucher:26 | V26 | Purchase 20 playing cards. |
| bxqp:objective:voucher:28 | V28 | Reach Ante 12 in an eligible endless campaign. |
| bxqp:objective:voucher:30 | V30 | Reroll a boss blind 10 times. |
| bxqp:objective:voucher:32 | V32 | Win 5 eligible campaigns. |

### 7.4 Tag objectives

| Objective ID | Unlock | Visible condition |
|---|---|---|
| bxqp:objective:tag:02 | G02 | Discover 25 Jokers. |
| bxqp:objective:tag:03 | G03 | Acquire a Shadow-edition Joker. |
| bxqp:objective:tag:04 | G04 | Acquire a Gilt-edition Joker. |
| bxqp:objective:tag:05 | G05 | Acquire a Phantom-edition Joker. |
| bxqp:objective:tag:06 | G06 | Acquire a Rainbow-edition Joker. |

### 7.5 Contextual stakes and challenges

- For each deck, S01 is available by default. Winning with that deck on Sn marks Sn
  and unlocks S(n+1), up to S08. Lower stakes stay selectable.
- The seven stake objective IDs are rule templates evaluated in deck context, not
  global completions shared across all decks.
- First eligible campaign win completes the C01 availability objective.
- Completing C01-C19 unlocks the next challenge. Completing C20 closes the
  challenge ledger. Challenge setup always uses S01.
- Objective validation rejects circular dependencies and any registry row that
  targets missing catalog content.

## 8. Public Achievement Registry

Achievement IDs are bxqp:achievement:001 through 031. All entries are visible from
profile creation and have a unique local iconId, original Chinese name, description,
progress selector, target, and completion timestamp.

| ID | Category | Chinese name | Completion condition |
|---|---|---|---|
| 001 | 入场 | 初次开锣 | Start the first eligible campaign. |
| 002 | 入场 | 首场喝彩 | Defeat the first blind. |
| 003 | 入场 | 开市第一单 | Purchase the first shop item. |
| 004 | 入场 | 奇客入班 | Acquire the first Joker. |
| 005 | 入场 | 八幕谢场 | Win the first eligible campaign. |
| 006 | 入场 | 加演不散 | Enter endless after an eligible campaign win. |
| 007 | 牌技 | 一招谢幕 | Defeat a blind with one played hand. |
| 008 | 牌技 | 后场未动 | Defeat a blind without using a discard. |
| 009 | 牌技 | 四门齐唱 | Play a Straight Flush. |
| 010 | 牌技 | 秘式现台 | Play Flush Five, Flush House, or Five of a Kind. |
| 011 | 牌技 | 十万喝彩 | Score at least 100,000 in one hand. |
| 012 | 牌技 | 百万满堂 | Score at least 1,000,000 in one hand. |
| 013 | 牌技 | 百手熟客 | Play 100 hands. |
| 014 | 牌技 | 十二式全 | Play all 12 poker-hand types at least once. |
| 015 | 经营 | 满堂戏票 | Hold at least 50 戏票. |
| 016 | 经营 | 一掷五百 | Spend 500 戏票 in shops. |
| 017 | 经营 | 百货开箱 | Open 50 booster packs. |
| 018 | 经营 | 换场不倦 | Reroll shops 50 times. |
| 019 | 经营 | 券册满行 | Redeem all 32 voucher content IDs at least once. |
| 020 | 收藏 | 初识百相 | Discover 25 Jokers. |
| 021 | 收藏 | 半卷奇谱 | Discover 75 Jokers. |
| 022 | 收藏 | 百戏全谱 | Discover all 150 Jokers. |
| 023 | 收藏 | 印记成班 | Give any victory mark to 25 Joker content IDs. |
| 024 | 收藏 | 顶阶金印 | Give an S08 victory mark to 25 Joker content IDs. |
| 025 | 挑战 | 试阵初捷 | Complete one challenge. |
| 026 | 挑战 | 十阵连破 | Complete 10 challenges. |
| 027 | 挑战 | 二十阵全破 | Complete all 20 challenges. |
| 028 | 挑战 | 八阶登顶 | Win S08 with any deck. |
| 029 | 终局 | 十五箱同庆 | Win at least once with all 15 decks. |
| 030 | 终局 | 八阶全冠 | Clear S08 with all 15 decks. |
| 031 | 终局 | 百相满金 | Give an S08 victory mark to all 150 Jokers. |

The six category counts are exactly 6/8/5/5/4/3. No achievement is a content gate.
Shared facts may complete a content objective and an achievement in the same
transaction, producing separate records and a coalesced notice batch.

## 9. Statistics

The public statistics registry is fixed and bounded:

- campaign starts, wins, losses, derived win rate, current win streak, best win
  streak, and highest endless Ante;
- total score, best hand score, hands played, cards played, cards discarded,
  blinds defeated, and blinds skipped;
- money earned, money spent, maximum held, interest earned, items purchased,
  items sold, shop rerolls, boss rerolls, packs opened, vouchers redeemed, and
  consumables used;
- exactly 12 hand records containing play count and best score;
- exactly 15 deck records containing starts, wins, and highest cleared stake;
- exactly 20 challenge records containing attempts, completions, and completedAt.

Additional bounded typed sets/counters needed by visible objective progress include
distinct voucher IDs, consumable-family counts, playing-card purchases,
edition-bearing Joker acquisitions, and discovered/victory-mark counts. These are
part of the profile projection, not an append-only event history.

All arithmetic uses safe non-negative integers except score totals, which reuse the
central score wire representation and formatting rules. Win rate is derived and
renders zero when there are no completed campaigns.

## 10. Collection and Victory Marks

The functional collection screen projects exactly 380 catalog rows grouped by the
existing 14 families.

- The 230 non-Joker rows show name, description, local art, and mechanical summary
  from the start. Locked deck/stake/challenge/voucher/tag rows add a lock layer and
  visible objective progress.
- The 150 Joker rows show only a silhouette, ordinal, and undiscovered label until
  a first-acquisition observation is projected from an eligible campaign/endless
  checkpoint. Masked rows do not leak names, rarity, copy policy, rules, or flavor.
- Discovery is monotonic and profile-local. Challenge, seeded, and tutorial run
  observations remain valid run evidence but do not enter profile discovery.
- Filters include family, locked/unlocked, discovered/undiscovered, rarity for
  discovered Jokers, and victory-mark stake. Completion summaries separate catalog
  rows, Joker discovery, global unlocks, deck stake clears, and Joker marks.

At the eligible Ante 8 win checkpoint:

1. upgrade the selected deck's highest cleared stake;
2. deduplicate final owned Jokers by content ID;
3. upgrade each content ID's 胜幕印记 to max(old, selected stake);
4. settle once before either finish or endless;
5. preserve the marks through endless without awarding the same win again.

Run-local permanent/perishable/rental stickers never enter this profile record.

## 11. Tutorial and Reference

TUTORIAL_SCRIPT_VERSION = tutorial-1 defines a real production tutorial run with a
fixed seed, D01/S01, deterministic deck order, blind, reward, shop, Joker, pack,
and consumable choices. The script validates the expected materialization at build
and test time so catalog drift fails visibly.

The eight functional steps are:

1. read and select the scripted blind;
2. select the highlighted cards;
3. play and inspect Chips, Mult, and total score;
4. select low-value cards and discard;
5. play the scripted winning hand and claim the reward;
6. enter the shop, buy the scripted Joker, and explain slot capacity;
7. open the scripted pack, choose its consumable, and use it on valid targets;
8. leave the shop, mark the tutorial complete, and return to the menu.

Tutorial state persists the current step and run checkpoint. The pure tutorial
command gate allows the exact expected intent, returns a Chinese guidance rejection
for other commands without touching run/profile/RNG, and advances a step only after
the matching command commits. The user may skip at any step. Replay creates a new
tutorial run sequence without clearing the original completion timestamp or
ordinary progress.

Help is independent of script state:

- the 12-hand table shows original Chinese names, base Chips/Mult, current run
  levels when opened in play, and hidden-hand construction;
- the terminology reference covers the stable project terms for Chips, Mult,
  Ante, blind, deck, hand, discard, Joker, consumable, voucher, tag, pack, edition,
  sticker, victory mark, and endless;
- both are available from the menu and all ordinary/seeded/challenge run screens.

## 12. Mode Selection, Seed Codes, and Results

After choosing a profile with no active run, the functional main menu exposes:

- Continue when an active run exists;
- Campaign, Seeded, Challenge, and Tutorial/Replay;
- Collection, 百戏成就簿, Statistics, Help, Profile maintenance, and unread notices.

Campaign setup selects an unlocked deck and that deck's unlocked stake. Seeded
setup uses the same eligibility plus either an automatically generated seed or
clipboard input. Challenge setup selects one available challenge and shows its
fixed rules; it does not expose deck/stake controls.

The canonical clipboard code is:

    BXQP1|progression-modes-1|SEED8|DNN|SNN

SEED8 is uppercase A-Z/0-9. The pure parser accepts a plain seed or the full code,
normalizes case, resolves DNN/SNN to stable IDs, validates unlocks, previews all
fields, and rejects malformed/future/unsupported versions without starting a run.
Automatic seed generation lives at the application boundary behind an injectable
generator; engine code receives only the final string.

Result behavior:

- campaign win shows finish/endless and the Ante 8 progression delta;
- seeded win shows finish/endless, seed/code copy, and a zero-progress label;
- challenge win settles completion, unlocks the next challenge, and returns after
  its result screen with no endless action;
- tutorial completion returns after its scripted summary;
- loss/finish screens show setup identity, seed/content version, outcome, records,
  and the complete bounded delta produced by the committed profile projection.

Notices are keyed and coalesced. Presentation waits until the existing event queue
finishes, then shows non-modal banners. At most 50 unread summaries persist; repeated
keys update an existing notice. Result summaries are bounded snapshots, not rewards
that require claiming.

## 13. Persistence, Recovery, and Transfer V7

No new IndexedDB object store is required. Physical database version 1 can retain
meta, settings, profiles, runs, and recovery. The recovery store uses distinct keys:

- checkpoint:<profileId> for the previous run checkpoint;
- profile-action:<profileId> for the latest reset/import full snapshot;
- migration:<profileId> for the raw pre-migration profile/run pair;
- legacy profileId keys remain readable and migrate to the checkpoint namespace.

Initialization decodes every profile/run pair, validates it, and migrates inside a
transaction. A failure aborts the complete pair and leaves all other profiles
unchanged.

Profile transfer V7 decouples envelope, profile, run, and content versions:

| Field | Meaning |
|---|---|
| envelopeVersion | profile-transfer-7 |
| profileSchemaVersion | 1 |
| runSchemaVersion | 7 or null |
| runContentVersion | exact run content version or null |
| profile | complete validated profile, excluding recovery and device settings |
| run | optional score-wire encoded V7 run |
| checksum | canonical payload checksum |

Import remains limited to 2 MB, validates before confirmation, and supports legacy
V1-V6 envelopes through sequential pure run and profile migrations. Target-slot
selection occurs after source validation. Remapping changes profile id/slot and the
V7 run owner together without changing seed, RNG, checkpoint, run ID, or gameplay.
The target's old full pair is written to profile-action recovery in the same
transaction as replacement.

Reset snapshots the full pair, then keeps identity/name/createdAt with fresh
progress defaults. Abandon clears only the run. Delete requires exact normalized
profile-name input and removes profile, run, every recovery namespace, and active
metadata atomically.

Legacy evidence migration:

- keep identity, timestamps, and active run;
- seed baseline grants and tutorial not-started;
- recover first-acquisition observations from an eligible active production run;
- recover setup and an unsettled terminal Ante 8 result when structurally valid;
- leave unsupported historical counters/achievements at zero;
- never infer old activity from money, inventory, checkpoint number, or final deck.

## 14. Invariants and Error Handling

Profile validation rejects:

- a profile ID that does not match its slot;
- unknown schema/rules/tutorial versions;
- missing, duplicate, unsorted, or foreign objective/content/achievement IDs;
- category/count drift from 31 achievements, 15 decks, 20 challenges, 12 hands, or
  150 Joker mark slots;
- negative/unsafe counters, invalid timestamps, decreasing completion, or marks
  outside S01-S08;
- a cursor that does not match the active run;
- more than 50 unread notices or duplicate notice keys;
- tutorial state/run-class mismatches;
- a selected deck/stake/challenge not available in the frozen start snapshot;
- a challenge/tutorial endless transition;
- a profile/run owner or activeRunId mismatch.

Rejected commands, invalid seed codes, migration/import failures, profile projection
errors, and IndexedDB failures keep the exact prior Redux and persisted state and
surface a local Simplified Chinese error. No catch-all fallback silently changes
mode, seed, content version, or target slot.

## 15. Functional Screens

Add feature-owned functional components under presentation/progression and
presentation/tutorial:

- MainMenuScreen and ModeSetupScreen;
- CollectionScreen with a reusable profile-aware CatalogCard projection;
- AchievementBookScreen and StatisticsScreen;
- TutorialCoach plus HelpReference overlay;
- ProgressionNoticeQueue and ResultDeltaPanel;
- ProfileMaintenance dialogs for abandon/reset/recover/import/export/delete.

App route state expands beyond loading/profiles/playing but remains a typed finite
union. An active run always routes by its committed phase and run class; refresh
does not rely on transient component state. All screens remain Simplified Chinese
and fit the existing fixed 1280x720 16:9 stage. Final art/audio/motion polish remains
owned by the next presentation child.

## 16. Validation Strategy

### Definition and pure reducer tests

- exact 78 catalog unlock references and approved baseline grants;
- exact 14 deck, 16 upgraded-voucher, 5 tag conditions;
- contextual 15-by-8 stakes and sequential C01-C20 challenges;
- exact 31 achievement IDs/category counts/copy/icon IDs/targets;
- positive, false, boundary, idempotent, and mode-filtered facts for every
  objective, achievement, statistic, discovery, and mark;
- no circular/missing catalog dependencies;
- same fact batch plus same profile/time yields canonical-equivalent output.

### Run and tutorial tests

- V6-to-V7 migration, new mode identities, unique same-seed run sequences;
- campaign/seeded endless legality and challenge/tutorial rejection;
- frozen eligibility snapshot and same-seed replay;
- all tutorial steps, invalid action, skip, resume, replay, and catalog-drift guard;
- hand table and terminology projections.

### Persistence tests

- legacy unversioned profile to V1 evidence-only migration and idempotence;
- V1-V7 export/import, checksum, score wire, 2 MB limit, future rejection;
- cross-slot remap, profile/run identity, raw migration recovery;
- checkpoint and profile-action recovery coexist;
- abandon/reset/recover/delete and injected transaction failures;
- three-profile isolation and device-settings preservation.

### Component and browser tests

- fresh profile tutorial choice and complete/skip/replay;
- campaign, seeded share-code, challenge, stake, win/loss/endless results;
- collection masks/filters/counts, achievements, statistics, notices;
- reload at progression checkpoints and unread acknowledgement;
- import preview/target/recovery and typed-name deletion;
- Chromium and WebKit at 1280x720 with zero remote content requests.

### Final gates

Run format check, lint, TypeScript, focused and full Vitest, production build,
Chromium/WebKit Playwright, content audits, git diff check, and Trellis validation.

## 17. Trade-offs and Rollback

- A run V7 bump is preferred over side-channel mode metadata because mode,
  progression policy, ownership, and eligibility must survive export/reload and be
  invariant-checked with the run.
- Eligibility is frozen at run start, trading immediate mid-run unlock appearance
  for replay determinism and simpler migration.
- Aggregated profile state is preferred over a raw event log because the catalog is
  bounded and the product does not need historical replay of every past run.
- One full profile-action recovery is preferred over unlimited backups to keep
  storage and UI bounded.
- Inline original SVG achievement glyphs are sufficient for this functional child;
  the presentation child may polish them without changing IDs or conditions.

If a migration or replacement fails, retain the exact preimage and do not write the
new schema. Once a V7 profile is committed, rollback must load V7 or restore the
stored migration snapshot; it must never silently downgrade the live save.
