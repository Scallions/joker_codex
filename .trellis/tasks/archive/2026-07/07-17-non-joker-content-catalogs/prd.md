# Non-Joker Content Catalogs

## Goal

Replace the run/economy fixtures with the complete production non-奇牌 content
baseline for 百戏奇牌: 230 original, typed, deterministic, locally illustrated
catalog rows whose mechanics can participate in real runs and survive save,
reload, export, and migration.

## Background

- The archived complete-run/economy child delivered the deterministic V2 engine,
  15 ordered effect windows, eight-ante campaign loop, shop/pack/tag/voucher
  primitives, atomic checkpoints, and fixture content used by current tests.
- Production catalogs do not exist yet. Current content IDs remain under the
  `fixture:` namespace, and there is no build-validated content, localization,
  asset-ownership, or contract-coverage manifest.
- The frozen matrix is documented in `research/frozen-catalog-matrix.md`: 15
  decks, 8 stakes, 20 challenges, 32 vouchers, 52 consumables, 24 tags, 30
  blinds, 32 booster collection rows, 8 enhancements, 4 seals, and 5 editions.
- Thirty-two booster collection rows intentionally share fifteen family/size
  mechanical profiles. Every collection row still requires its own ID and asset.
- This child is third in the approved parent task order. The later progression
  child owns profile unlock evaluation, navigation, onboarding, and final mode
  flows; the three 奇牌 batches own the 150 real 奇牌 definitions.

## Requirements

### R1. Frozen catalog completeness

- Implement exactly the 230 rows and numerical contracts frozen in
  `research/frozen-catalog-matrix.md`; no row may be represented by placeholder
  behavior or silently inherit a decorative variant's identity.
- Represent the three stake/challenge Joker stickers as run-only typed modifiers;
  they do not add collection rows.
- Known reference defects are not compatibility requirements. Preserve the
  project's defined Infinity boundary, implement intended modifier behavior, and
  reject or safely exit impossible pack states instead of reproducing softlocks.

### R2. Original identity and offline assets

- Give every row a stable `bxqp:` content ID, original Simplified-Chinese name and
  description, local asset ID, availability/discovery metadata, and introduced
  content version. Reference names, IDs, descriptions, art, and localization are
  not shipped as product identity.
- Each row must resolve to a checked-in original asset and an ownership record.
  Reusable 午夜百戏 frames/materials are allowed, but each collection row needs a
  distinct focal symbol or cover composition and no remote request at runtime.
- Keep rule text, costs, suits, ranks, and other gameplay symbols as live text or
  SVG layers rather than baking them into raster art.

### R3. Validated content pipeline

- Add Zod-validated family definitions, localization, asset ownership, external
  dependency, and contract-coverage manifests with a single generated aggregate
  catalog export.
- Build validation must prove exact counts, unique IDs/ordinals/localization keys,
  valid pair prerequisites and foreign references, local assets, registered
  handlers, nonempty tests, and pack profile/variant consistency.
- Content IDs identify data only. Executable behavior remains in an exhaustive,
  project-owned handler/operation registry and may not branch on content ID.

### R4. Complete executable mechanics

- Extend run creation, scoring, draw/discard, economy, shop, pack, blind, and
  effect operations only as needed to execute every matrix row at the existing 15
  windows and stable source order.
- Materialize every random choice before commit: randomized starting decks,
  sticker/modifier rolls, generated cards, rare consumable replacements, tag and
  boss outcomes, pack options, random targets, destruction, and copied instances.
- Centralize eligibility and exclusion rules so ordinary shop offers, packs,
  generated/free content, challenges, and tags cannot disagree.
- Enforce one enhancement, one seal, and one edition per playing card; modifier
  replacement, debuff suppression, retriggers, destruction, and instance-level
  slot contributions follow the matrix contracts.

### R5. Deck, stake, and challenge ownership

- All 15 decks must produce their deterministic starting deck, initial inventory,
  rule patches, and run-scoped effects.
- All 8 stakes must compose cumulatively in order, including exact target curves
  and materialized sticker generation rules.
- All 20 challenges must provide complete typed definitions, executable engine
  modifiers, deterministic fixtures, starting recipes, allow/ban sets, external
  dependencies, and save-safe contracts.
- Profile unlock evaluation, mode-selection navigation, tutorial integration, and
  final end-to-end playable stake/challenge flows remain in the progression child.

### R6. Versioning, migration, and persistence

- New production runs use a V3 run/export contract and content version
  `catalog-baseline-3`; existing V2 `run-economy-2` runs migrate forward without
  changing their checkpoint, RNG, materialized fixture content, or visible state.
- Migration must retain a pre-migration recovery record, be idempotent, reject
  unsupported downgrade/newer versions, and keep profile/run identity intact.
- Catalog IDs, rules, modifiers, dependency state, and already materialized
  choices must survive structured-clone, IndexedDB, recovery, and profile
  export/import round trips.

### R7. Cross-child dependency contract

- Reserve the stable numeric IDs required for all 150 future 奇牌 rows. Non-奇牌
  entries may declare those IDs as externally owned dependencies, not as local
  completed definitions.
- Use test-only 奇牌 doubles to prove challenge, pack, creation, edition, sticker,
  and finisher composition. Shipped catalogs must never count a double or fixture
  as a real 奇牌.
- The integration gate must be able to fail unresolved external dependencies once
  all three 奇牌 batches are expected to exist.

### R8. Reachability and regression safety

- Every local row must map to at least one deterministic positive fixture, one
  rejection/boundary assertion where applicable, and named interaction coverage
  for every shared operation category it changes.
- Contract tests must execute behavior through public command/effect boundaries;
  tests that only compare a manifest row with itself do not count.
- Existing V1/V2 replay, run/economy, profile-isolation, atomic-recovery, Chromium,
  and WebKit scenarios must remain green.

## Acceptance Criteria

- [ ] **AC-01 Count ledger:** A generated audit reports exactly 230 non-奇牌
      collection rows with every family count and 32-to-15 booster mapping equal
      to the frozen matrix; there are no duplicate IDs, ordinals, or pair links.
- [ ] **AC-02 Manifest closure:** Every row has original zh-CN localization, a
      valid local asset and ownership record, eligibility/unlock/discovery data,
      registered behavior references, and one or more executable contract-test
      IDs; no local handler or asset is orphaned.
- [ ] **AC-03 Mechanical contracts:** All decks, cumulative stakes, challenges,
      vouchers, consumables, tags, blinds, packs, enhancements, seals, editions,
      and run-only stickers pass their positive, boundary, and required
      cross-family fixtures at the approved numerical baseline.
- [ ] **AC-04 Determinism:** Repeating each representative scenario from the same
      V3 content version, seed, starting state, and command sequence yields the
      same canonical state, RNG, materialized choices, domain events, and effect
      observations in pure tests, Chromium, and WebKit.
- [ ] **AC-05 Migration and round trips:** V2-to-V3 migration, V3 IndexedDB
      checkpoint/recovery, structured clone, and profile export/import preserve
      exact state; injected migration/write/import failures expose only the last
      valid checkpoint and do not damage other profiles.
- [ ] **AC-06 Original presentation:** All 230 rows render their original Chinese
      identity and local 午夜百戏 asset in the catalog audit surface or owning
      gameplay screen at 1280x720, with zero runtime network requests for content.
- [ ] **AC-07 Dependency honesty:** Every future-奇牌 reference resolves to a
      reserved external dependency with an owning batch and test double; the
      shipped non-奇牌 count contains no fake 奇牌 and strict integration mode can
      detect unresolved real definitions.
- [ ] **AC-08 Quality gate:** Generated audits, contract/interaction/property
      tests, migration and repository suites, component tests, Chromium/WebKit
      smoke/visual checks, format, lint, type-check, build, and `git diff --check`
      all pass without regressing the existing full-run scenarios.

## Out of Scope

- Implementing or illustrating the 150 real 奇牌 definitions; those belong to the
  three numbered 奇牌 children.
- Profile-facing unlock progression, collection completion rewards, mode-selection
  UI, tutorial integration, achievements, and final playable-mode orchestration;
  this child supplies complete metadata and executable rule contracts.
- The final whole-game visual/audio polish, music, sound effects, and motion pass.
  This child still owns usable original per-row assets and their audit surface.
- Reference-game seed/save/ID compatibility, copied identity or assets, and
  independent balance redesign beyond documented safety corrections.
