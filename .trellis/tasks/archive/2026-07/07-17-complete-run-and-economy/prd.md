# Complete Run and Economy

## Goal

Turn the completed one-blind foundation into a deterministic, locally playable
campaign engine that can traverse all eight antes, win or lose, enter endless
play, and resolve the economy, shops, packs, and shared effect behaviors needed
by every later content task.

This child proves capability with project-owned fixture content. It does not
claim that the production catalogs are complete.

## Confirmed Product Decisions

- The frozen stable PC gameplay behavior documented on 2026-07-17 is the numeric
  and timing baseline. 百戏奇牌 does not share names, copy, IDs, saves, random
  streams, art, audio, or compatibility contracts with Balatro.
- The parent task remains the planning/integration owner; this P0 child is the
  next implementation target after the archived foundation slice.
- Use the minimum deterministic fixture catalog that covers every engine
  capability category. The 30 production blind entries, 32 production packs,
  32 vouchers, 24 tags, and other complete catalogs remain in the next child.
- Preserve the local-first, three-profile, atomic-checkpoint workflow already
  established by the foundation.
- Accessibility modes, mobile/touch, gamepad, backend services, and public
  deployment remain out of scope.

## Functional Requirements

### 1. Complete Run State Machine

- Add explicit states for blind selection, active round, round rewards, shop,
  durable player choice, run win, run loss, finished run, and endless
  continuation. Pack options, consumable targeting, boss-reroll confirmation,
  and boss-forced card choices use discriminated durable choice frames.
- Start an ordinary fixture campaign at ante 1 with 4 hands, 3 discards, hand
  size 8, 4 money, five 奇牌 slots, and two consumable slots before modifiers.
- Route each ante through small, big, and boss blinds. Small and big blinds may
  be skipped for their visible tag; boss blinds may not be skipped.
- Defeating the ante-8 finisher records a campaign win and offers finish or
  endless. Endless begins at ante 9 and uses finisher blinds every eight antes.
- Every irreversible transition is a checkpointed command. Commands illegal in
  the current state must leave state, RNG, and checkpoint unchanged.

### 2. Blind and Ante Baseline

- Freeze the baseline ante target table from ante -1 through the numeric endless
  boundary. For the default fixture difficulty, small blinds use 1x base, big
  blinds 1.5x, ordinary bosses normally 2x, and individual blind definitions may
  override the multiplier.
- Ante setup deterministically materializes both skip tags and the boss blind so
  reloading never rerolls visible choices.
- Boss selection honors minimum-ante eligibility, normal-versus-finisher pools,
  and no-repeat-until-pool-exhaustion behavior. Supported voucher effects may
  reroll a boss from the same eligible pool.
- Include representative fixture blinds for score multiplication, suit/face or
  card debuff, action-budget changes, hand restrictions, draw/selection changes,
  and a finisher. Production blind identities belong to the next child.

### 3. Round, Poker, and Scoring

- Preserve all 12 poker-hand classifications and add hand levels, rule context,
  all matching candidates, and deterministic winner selection.
- Support wild-suit and no-rank/stone behavior plus contracts for shortened
  straights/flushes, face overrides, played-card debuffs, and hand restrictions.
- Resolve scoring in a frozen sequence: classify/base values, blind and pre-play
  modifiers, scored cards left to right including retriggers, held cards left to
  right including retriggers, 奇牌 left to right, consumable/global modifiers,
  final score, destruction/economy/statistics, then presentation events.
- Centralize score arithmetic and formatting on JavaScript `number`; allow
  positive Infinity at the endless boundary, reject NaN, and test scientific
  notation, rounding, comparison, and overflow behavior.

### 4. Effect Engine Contract

- Add typed hook windows, project-owned handler IDs, ordered effect sources, a
  queue, and primitive operations for chips, multiplier, money, copy, retrigger,
  debuff, create, transform, destroy, inventory/slot changes, shop/cost changes,
  and deferred effects.
- Content definitions remain serializable data and reference handlers by stable
  ID. Executable handlers live in a typed registry outside durable state.
- Copy/retrigger ancestry, explicit consumption counts, depth limits, and an
  operation budget must reject cycles without silently truncating valid repeats.
- Random operations construct a stable-ID-sorted eligible pool and consume the
  stored RNG only when an eligible random choice is actually resolved.
- Fixture handlers and interaction tests must exercise every primitive and every
  defined hook window before production catalogs build on the registry.

### 5. Rewards and Economy

- Default blind rewards are 3 for small, 4 for big, 5 for ordinary boss, and 8
  for finisher fixtures, subject to definition/modifier overrides.
- Default cash-out adds 1 per remaining hand and 1 interest per full 5 money,
  capped at 5. Interest uses non-negative money and exposes modifier contracts
  for disabled interest, increased cap, and alternative cash-out rules.
- Support positive and permitted negative money, income and costs at declared
  effect windows, dynamic purchase/sale prices, discount rounding, and blocked
  payments. No rejected purchase may mutate an offer or consume RNG.
- The reward breakdown is durable and claimable exactly once.

### 6. Shop, Packs, Inventory, Vouchers, and Tags

- A default shop materializes two weighted card/consumable offers, two pack
  offers, and one ante voucher offer. Reroll starts at 5, rises by 1 per reroll,
  and replaces only random card/consumable offers.
- New-shop entry restocks card and pack offers. The ante voucher persists until
  purchased and restocks after a boss or an explicit voucher-tag effect.
- Purchase price uses base plus edition surcharge, then discounts with half-down
  rounding and a normal minimum of 1. Sale price is half the current purchase
  price rounded down, with a normal minimum of 1.
- Buying a pack deducts money and materializes its options in a durable pack
  choice. The player may take the allowed number of options or skip; reload must
  preserve options, remaining picks, selected and eligible targets, suspended
  parent choices, and return state exactly.
- Cover playing-card, 奇牌, and immediate-consumable pack behaviors, slot limits,
  temporary choice capacity, deterministic generated items, duplicate filters,
  and empty/blocked pools with fixture definitions.
- Tags may be immediate or deferred. Skipping forfeits that blind's reward and
  shop, grants its visible tag exactly once, and advances to the next blind.

### 7. Persistence and Migration

- Introduce an explicit V2 run/content schema and pure V1-to-V2 migrations for
  existing foundation profiles, active rounds, shops, and terminal results.
- Retain the old raw checkpoint as recovery data when a stored run is migrated.
- IndexedDB and JSON profile transfer must preserve every V2 field. The transfer
  codec must encode non-finite score sentinels explicitly instead of relying on
  `JSON.stringify(Infinity)`.
- Continue the proposal -> invariant validation -> atomic IndexedDB transaction
  -> Redux commit -> presentation queue protocol for every new command.
- Migration, import, or persistence failure leaves the last committed profile
  and run usable and surfaces a Chinese recovery error.

### 8. Playable Baseline Presentation

- Extend the existing 午夜百戏 table with blind selection, ante ledger, reward
  receipt, full shop sections, pack choice, win/endless choice, and loss views.
- Keep UI state non-authoritative. Screens dispatch typed commands and render
  selectors; no scoring, pricing, random selection, or routing rule lives in
  React.
- Provide clear Simplified Chinese feedback for illegal phase, insufficient
  money, full inventory, invalid target, empty pool, effect-cycle, migration,
  and save failure cases.

## Acceptance Criteria

- [x] Deterministic scenario fixtures play or skip all blind routes, win and lose
      complete eight-ante campaigns, record the win once, and elect to enter
      endless mode at ante 9.
- [x] Baseline tests freeze ante targets, blind multipliers/rewards, default run
      budgets, interest, shop slots, reroll prices, pack sizes/picks, and voucher
      timing used by this child.
- [x] Every state and pending choice rejects illegal or stale commands without
      changing state, RNG, inventory, offers, or checkpoint.
- [x] Scoring fixtures cover all poker hands and every defined hook window,
      including source order, copy, multiple retriggers, debuffs, transformation,
      destruction, generated items, deferred effects, and cycle rejection.
- [x] Fixture shops and packs cover purchase, sell, reroll, discounts, vouchers,
      tags, slot changes, target validation, deterministic generation, duplicate
      filtering, and empty/blocked pool behavior.
- [x] Save/reload after every action preserves phase, visible random choices,
      inventory, deck zones, economy, score, random state, and pending choices
      exactly; V1 saves/imports migrate with recovery retained.
- [x] Chromium and WebKit E2E campaigns cover resume boundaries, win, loss,
      endless choice, shop, pack, profile isolation, and persistence failure.
- [x] Format, lint, strict typecheck, unit/property/component tests, coverage,
      Playwright, production build, and Trellis quality review all pass.

## Out of Scope

- Complete production catalogs or catalog-count claims.
- Progression, unlocks, challenges, all starting decks/stakes, achievements, and
  tutorial flows beyond the data/observation hooks needed by later children.
- Final generated illustrations, final audio, collection presentation, and the
  final visual-polish pass.
- Compatibility with Balatro seeds, saves, mods, data formats, names, or bugs.

## Success Boundary

This child is complete when later catalog tasks can add definitions and typed
handlers without rewriting run routing, scoring order, economy, persistence, or
choice-state machinery, and when a player can locally finish the fixture campaign
through the existing profile UI.
