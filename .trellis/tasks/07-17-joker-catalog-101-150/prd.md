# Joker Catalog 101-150

## Goal

Ship the final 50 production 奇牌 as fully playable, deterministic, original
Chinese content in the local browser game. This batch must complete the approved
150-row mechanical catalog, extend the accepted V5 runtime through reusable
primitives, and leave no reserved Joker dependency unresolved.

## Player outcome

- A player can encounter, inspect, acquire, arrange, trigger, sell, copy, save,
  and reload rows 101-150 through real campaign routes rather than fixture-only
  setup.
- Rules involving adjacent-copy routing, probability modification, duplicate
  offers, Boss suppression, card destruction, shop exit, and last-hand survival
  are explicit in Chinese and behave consistently across all 150 奇牌.
- The same seed and command sequence produces the same targets, chance results,
  offers, clones, score trace, state changes, and checkpoint before and after
  reload.
- All 150 奇牌 appear in the local review ledger with original text-free
  illustrations and durable first-acquisition discovery evidence.

## Background and frozen product decisions

- The accepted baseline is the archived 051-100 task and V5 production commit
  `f79279b`. It provides 100 real 奇牌, 330 aggregate rows, typed event facts,
  per-instance ability state, shared round targets, passive capabilities,
  rarity-first acquisition, deterministic materialization, persistence, audit
  presentation, and the local asset pipeline.
- Rows 101-150 use the approved v1.0.1o collection order only as an internal
  mechanical research index. 百戏奇牌 does not target save/data/defect
  compatibility with Balatro and does not ship its names, translated copy,
  code, frames, artwork, or visual identity.
- Stable IDs are `bxqp:joker:101` through `bxqp:joker:150`; they must never be
  renumbered after activation.
- The frozen rarity ledger is 6 Common, 25 Uncommon, 14 Rare, and 5 Legendary.
  J146-J150 are excluded from ordinary rarity draws and are reachable through
  the existing legendary Spectral-equivalent route or explicit challenge/start
  inventory materialization.
- Progression achievements and masked collection browsing remain owned by the
  later progression child. In this batch, non-Legendary rows are baseline
  eligible except J106, which requires a Gold-equivalent card in the full deck,
  and J120, which requires a Glass-equivalent card in the full deck. Discovery
  never gates a first offer.
- Permanent stickers are excluded from J102, J107, and J137. Perishable stickers
  are excluded from J103, J120, and J124. Rental remains eligible for all 50.
- Reference-copy compatibility is frozen as incompatible only for J107, J111,
  J113, J121, J125, J126, J137, J139, J143, and J149. Compatible copying repeats
  only the operation facets declared copyable; it never advances another
  instance's counters, resets, destruction, passive rules, edition, or sticker.
- Use evocative 2-6 Han-character identities, executable Chinese rules, and a
  separate short flavor line. Player-visible identity must remain original.
- Reproduce the approved player-visible mechanics and numbers, but not crashes,
  corrupt saves, platform-order defects, accidental probability bugs, infinite
  copy recursion, or misleading display. Ambiguous interactions become named,
  deterministic 百戏奇牌 contracts in the frozen matrix.
- Continue 午夜百戏 with five presentation-only ten-card ensembles:
  `101-110` 铜线急报, `111-120` 四色巡游, `121-130` 镜局重台,
  `131-140` 百相压轴, and `141-150` 星火终章. Ensembles are art/audit grouping
  only and cannot affect mechanics, acquisition, or synergy.
- The deliverable remains local-first: existing Vite development/build flows,
  local IndexedDB saves, local assets, and no deployment or runtime network
  dependency.

## Requirements

- Freeze `research/frozen-joker-matrix-101-150.md` before implementation. It is
  normative for every row's name, rule, flavor, rarity, cost, availability,
  event windows, values, state, copy facets, sticker exclusions, edge rulings,
  illustration focal, and named interaction fixtures.
- Compile exactly 50 new rows and extend production from 330 to 380 definitions:
  230 non-奇牌 plus 150 real 奇牌. No `bxqp:joker:001-150` may remain an external
  dependency or be shadowed by a production fixture.
- Advance new runs to `joker-catalog-3` and a strict V6 durable schema without
  changing frozen content snapshots in existing V2-V5 runs. Preserve the full
  forward load/import/recovery chain and reject future versions safely.
- Reuse the accepted serializable predicates, values, operations, event queue,
  passive collector, ability state, discovery, and rarity draw. Add typed
  primitives only for irreducible gaps; runtime/command/persistence/presentation
  code must never select behavior by Joker ID, ordinal, Chinese name, ensemble,
  asset path, or reference identity.
- Replace layout-sensitive ad hoc copying with one event-entry frozen source
  graph. J123 routes through its immediate-right source; J138 routes through the
  leftmost source. Chains must preserve source anchoring, copy compatible facets,
  roll chance independently, suppress dynamic layout cycles as a traced no-op,
  and retain the global 10,000-operation budget.
- Centralize all player-visible chance resolution behind a typed listed-chance
  service. J126 doubles the numerator once per active source, stacks
  multiplicatively, clamps at certainty, and affects beneficial and harmful
  gameplay chances equally. It must not alter weighted content selection,
  shuffle, target choice, shop rarity, edition, or sticker materialization.
- Add immutable event facts and atomic transaction paths for playing-card
  destruction, an actually triggered Boss ability, shop exit, and eligible
  last-hand survival. Every rejected capacity/target/schema/budget check returns
  the original state and RNG.
- Route every permanent playing-card removal through one destruction proposal
  that snapshots effective identity and modifiers before removal, updates every
  zone/mirror once, then emits exactly one destruction event. Glass break and
  consumable/Joker destruction use the same contract.
- Derive suit equivalence, duplicate-offer permissions, listed-chance factor,
  hands-per-round delta, zero-price content families, and passive Boss disabling
  from currently active sources. Sale, destruction, and debuff must take effect
  immediately at the next relevant use site without leaking a rule patch.
- Make all item generation and capacity behavior explicit. J121 permits duplicate
  Joker/Tarot/Planet/Spectral content in shops and packs only. J137 duplicates a
  random other owned Joker in one sale transaction. J150 creates a Negative
  consumable clone when the player chooses Next Round, including at ordinary
  consumable capacity because Negative consumables use zero slots.
- Persist all mutable counters, factors, copy readiness, shared round targets,
  legal capacity debt, materialized random choices, and current-value evidence.
  Fractional multiplier state uses safe integer hundredths.
- Preserve command-entry facts and explicit phase order for score passes,
  retriggers, copy routes, discard classification, sale growth/cloning, Boss
  trigger payout/suppression, card destruction growth, round completion,
  last-hand rescue, shop exit, target rotation, and reward settlement.
- Store 50 unique local portrait WebP illustrations with complete ownership and
  provenance sidecars. Raster art contains no gameplay text, logo, copied frame,
  or reference-game identity; names/rules remain DOM/SVG.
- Extend generic current-value projections and the local audit ledger to all 150
  rows. React renders committed definitions/current values and never evaluates
  mechanics, chance, copy compatibility, or acquisition rules.

## Acceptance Criteria

- [x] Production validation reports 230 frozen non-奇牌 rows, 150 real Joker
      rows, 380 aggregate rows, all 150 Joker IDs resolved, and zero unresolved
      reserved Joker dependencies; no fixture definition enters shipped content.
- [x] IDs `bxqp:joker:101` through `150` each use the frozen original name, rule,
      flavor, rarity, cost, source availability, discovery rule, copy facets,
      sticker policy, initial state, ensemble, art, and provenance.
- [x] The batch rarity split is exactly 6 Common / 25 Uncommon / 14 Rare /
      5 Legendary; ordinary draws never select Legendary rows, while the real
      legendary creation route can reach all five deterministically.
- [x] All 50 mechanics execute the matrix's numerical, timing, ordering,
      persistence, capacity, copy, retrigger, probability, debuff, sale,
      destruction, Boss, shop-exit, and sticker contracts without content-ID
      conditionals.
- [x] Every row has positive, boundary, and debuffed-source fixtures plus named
      coverage for every matrix interaction; the ten incompatible rows and all
      forty compatible rows are explicitly proven.
- [x] Copy-graph tests cover right-edge/leftmost/self target, router chains,
      dynamic cycles, frozen event layout, partial compatibility, copied sale and
      creation triggers, independent chance rolls, debuffed nodes, reorder, and
      the operation budget across J001-J150.
- [x] Listed-chance tests cover zero/guaranteed/no-RNG branches, stacked J126,
      beneficial and harmful chances, retriggers/copies, save/reload, and prove
      selection/shuffle/shop rarity/edition/sticker RNG remains unchanged.
- [x] Destruction, survival, duplicate-offer, Joker-clone, Negative-consumable,
      Boss-trigger, Boss-disable, and shop-exit paths are atomic and deterministic
      under capacity, empty-pool, debuff, sale, reload, and injected late failure.
- [x] V5-to-V6 migration preserves the old `joker-catalog-2` snapshot, consumes
      no RNG, initializes only deterministic nullable/default V6 fields, records
      recovery evidence, and keeps V2-V5 import/recovery paths supported.
- [x] Real shops, rerolls, all relevant packs, consumables, blinds, round reward,
      sale, legendary creation, save/load, win, and endless mode can exercise
      every applicable new row without test doubles.
- [x] All 50 approved illustrations are local, unique, decoded, provenance-
      complete, text-free, visually reviewed, and visible in the 150-row ledger
      plus representative shop/pack/table states at 1280x720.
- [x] Formatting, lint, type-check, unit/property/component tests, coverage,
      build, content audit, Chromium/WebKit E2E, Trellis validation, and
      `git diff --check` pass with the full J001-J100 and non-Joker regression
      suites.

## Out of scope

- Whole-catalog balance changes that alter the frozen mechanics or numbers.
- Progression unlock economy, achievements, masked collection browsing, tutorial
  flow, game modes, and final cross-content acceptance owned by later children.
- Save/data/asset/naming/defect compatibility with Balatro or any external game.
- Mobile/responsive redesign, accessibility-specific work, online services,
  multiplayer, telemetry, cloud saves, deployment, or runtime image fetching.
- Copying reference names, descriptions, code, frames, artwork, sound, or brand
  identity.

## Planning evidence

- Accepted V5 engine and matrix under
  `.trellis/tasks/archive/2026-07/07-17-joker-catalog-051-100/`.
- Parent scope and ordered child plan under
  `.trellis/tasks/07-17-chinese-joker-card-web-game/`.
- Repository audit in `research/current-engine-surface.md`.
- Frozen production contract in `research/frozen-joker-matrix-101-150.md`.
- The community-maintained
  [complete Joker table](https://balatrogame.fandom.com/wiki/Jokers),
  [structured Joker data](https://balatrowiki.org/w/Module:Jokers/data), and
  named mechanic pages linked by the frozen matrix are secondary research
  evidence only. Local typed fixtures are the executable source of truth.
