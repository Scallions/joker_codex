# Joker Catalog 051-100

## Goal

Ship the second 50 production 奇牌 as fully playable, deterministic, original
Chinese content in the local desktop-browser game. This batch must extend the
accepted 001-050 runtime without changing earlier semantics and leave only rows
101-150 unresolved for the final catalog child.

## Player outcome

- A player can encounter, inspect, buy, arrange, trigger, and sell rows 051-100
  through the real campaign rather than fixture-only paths.
- Card copy, destruction, permanent playing-card mutation, discard triggers,
  pack events, economy effects, and score ordering remain understandable from
  explicit Chinese rules and current-value copy.
- The same seed and command sequence produces the same offers, random targets,
  score trace, state changes, and saved checkpoint before and after reload.
- All 100 implemented 奇牌 appear in the local review ledger with original
  illustrations; first acquisition emits durable discovery evidence.

## Background and frozen product decisions

- The dependency chain is satisfied by the archived 001-050 task and work commit
  `19b0171`; its typed effect DSL, V4 ability state, rarity-first draw, passive
  capability collection, discovery observation, persistence, audit UI, and
  local asset pipeline are the compatibility baseline for this child.
- Rows 051-100 follow the already approved Balatro v1.0.1o collection order only
  as an internal mechanical research index. Project IDs, Chinese presentation,
  art, code, saved data, and behavior contracts remain owned by 百戏奇牌.
- Stable IDs are `bxqp:joker:051` through `bxqp:joker:100`; they must never be
  renumbered after approval.
- The frozen rarity ledger is 19 Common, 25 Uncommon, and 6 Rare rows. All 50
  reference rows are baseline-unlocked.
- J061 additionally requires the persisted J038 extinction observation; J089
  requires a Stone-equivalent card in the full deck; J091 requires a
  Lucky-equivalent card in the full deck. Discovery never gates a first offer.
- The parent task requires one-to-one player-visible mechanics, unique original
  art, deterministic fixtures, and regression coverage for rows 001-050. It
  explicitly excludes Balatro interoperability and copied names, text, code,
  frames, or artwork.
- Use evocative 2-6 Han-character identities, explicit executable Chinese rules,
  and separate short flavor lines. Reference identities must never appear as
  player-facing names or copy.
- Reproduce the approved player-visible mechanics and numbers, but do not
  reproduce crashes, softlocks, corrupt saves, nondeterministic consumption, or
  misleading display. Ambiguous interactions become explicit deterministic
  百戏奇牌 contracts with named fixtures.
- Continue the 午夜百戏 visual direction with five presentation-only ten-card
  ensembles approved on 2026-07-19: `051-060` 造化秘戏, `061-070` 失序机关,
  `071-080` 云路贵客, `081-090` 夜市账房, and `091-100` 异兽散场.
  Ensembles organize original naming, illustration review, and the audit ledger;
  they are never gameplay tags, synergy rules, or availability conditions.

## Requirements

- Freeze a normative `research/frozen-joker-matrix-051-100.md` before
  implementation. It must own each row's original Chinese name, explicit rules,
  flavor, rarity, cost, availability, hooks, values, state, copy policy, sticker
  exclusions, deterministic rulings, art brief, and interaction fixtures.
- Compile exactly 50 new rows into production definitions and extend the
  production aggregate from 280 to 330 rows: 230 non-奇牌 rows plus 100 real
  奇牌 rows. Exactly 50 reserved future Joker IDs must remain unresolved.
- Reuse the accepted data-driven predicates, values, operations, event queue,
  ability state, passive capabilities, discovery, and rarity selection whenever
  their semantics match. Runtime, command, persistence, and presentation code
  must never branch on a Joker content ID.
- Add shared typed primitives only for irreducible gaps such as cloning a played
  card, changing scoring-card membership, permanent per-card bonus state,
  discard/pack/consumable/shop-reroll observations, round-selected rank or suit,
  sell-triggered effects, and cross-Joker rarity evaluation.
- Preserve command atomicity: rejected capacity, target, invariant, or schema
  checks cannot consume RNG or partially mutate score, inventory, cards, money,
  ability state, history, or persistence.
- Persist every mutable current value and materialized random result through
  schema validation, invariants, recovery, export/import, and reload. If the
  durable shape changes, add a forward migration and retain older V2-V4 loading.
- Recompute passive capabilities and dynamic values from committed state at the
  use site so acquisition, sale, debuff, edition slots, and destruction cannot
  leave leaked rule patches.
- Define explicit ordering for playing-card mutation, Joker state growth,
  card/held retriggers, other-Joker triggers, boss suppression, interest, pack
  open/skip, shop rerolls, and end-of-round destruction.
- Maintain localization, flavor, asset ownership/provenance, mechanical mapping,
  discovery, and test coverage from the same typed row definitions.
- Store 50 unique illustrations locally as optimized portrait WebP assets with
  matching provenance sidecars. Raster art contains no gameplay text, logos,
  copied frames, or reference-game identity; all playable labels remain DOM/SVG.
- Give every ensemble a coherent visual vocabulary while keeping every row's
  focal subject, silhouette, and composition distinct.
- Keep the app directly runnable through the existing local Vite workflow with
  no runtime network dependency.

## Acceptance Criteria

- [x] Production validation reports 230 frozen non-奇牌 rows, 100 real Joker
      rows, 330 aggregate rows, 100 resolved Joker IDs, and exactly 50 unresolved
      future Joker IDs; no fixture definition enters shipped content.
- [x] IDs `bxqp:joker:051` through `100` each use the frozen rarity, cost,
      availability, source, initialization, and first-acquisition discovery rule.
- [x] All 50 effects execute the frozen numerical, timing, ordering, persistent
      state, capacity, copy, retrigger, debuff, sticker, sale, and destruction
      contracts without content-ID conditionals.
- [x] Every row has positive, boundary, and debuffed-source fixtures plus named
      coverage for every interaction ruling referenced by its matrix entry.
- [x] RNG consumers prove same-seed replay, no-consumption false branches,
      stored materialization, reload equivalence, and rejection atomicity.
- [x] Mutable rows prove save/reload, export/import, recovery, and invariant
      validation while older V2-V4 runs still load through supported migrations.
- [x] Real shop, Buffoon-equivalent pack, discard, consumable, pack-open/skip,
      reroll, blind, round, sale, and score paths can exercise every applicable
      row without test doubles.
- [x] Cross-batch fixtures preserve all 001-050 semantics, including the J038 to
      J061 availability edge, while exercising copy, retrigger, debuff, mutation,
      random target, and destruction order across both batches.
- [x] All 50 approved names, explicit descriptions, separate flavor lines, local
      illustrations, focal compositions, and provenance records are complete,
      unique, resolved, decoded, and visually reviewed.
- [x] The 100-row Joker ledger and representative shop, pack, and table states
      pass component tests plus 1280x720 Chromium/WebKit smoke and visual review.
- [x] Formatting, lint, type-check, unit/property/component tests, coverage,
      build, content audit, full E2E, Trellis validation, and `git diff --check`
      pass together with the complete rows 001-050 regression suite.

## Out of scope

- Definitions, names, art, and mechanics for rows 101-150.
- Final strict 150-Joker integration, whole-catalog balance review, progression
  unlock economy, masked collection browsing, achievements, and final visual
  polish owned by later children.
- Mobile/responsive redesign, accessibility-specific work, online services,
  multiplayer, telemetry, cloud saves, deployment, or runtime image fetching.
- Save, data, asset, naming, or defect compatibility with Balatro.
- Balance changes beyond a documented project-safety ruling in the frozen matrix.

## Planning evidence

- Archived 001-050 PRD, design, implementation plan, frozen matrix, and engine
  audit under `.trellis/tasks/archive/2026-07/07-17-joker-catalog-001-050/`.
- Parent gameplay scope, architecture, and ordered child plan under
  `.trellis/tasks/07-17-chinese-joker-card-web-game/`.
- [Balatro Wiki complete Joker table](https://balatrogame.fandom.com/wiki/Jokers)
  and [Balatro HQ v1.0.1o database](https://balatrohq.com/jokers/) as secondary
  reference-index evidence only; executable contracts require local fixtures.
