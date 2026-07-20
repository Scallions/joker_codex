# Joker Catalog 101-150 — Implementation Plan

## Entry gate

- [x] The user has reviewed `prd.md`, `design.md`, `implement.md`, and both
      research files and explicitly approved **task activation/implementation**.
- [x] Run `python3 .trellis/scripts/task.py start 07-17-joker-catalog-101-150`
      only after that approval.
- [x] Invoke `trellis-before-dev` before production edits and load the gameplay
      contract, current engine audit, frozen matrix, PRD, and design.
- [x] Classify the working tree and preserve unrelated changes.
- [x] Record a green baseline for the accepted J001-J100 engine, persistence,
      content, component, coverage, build, and browser suites before adding red
      tests.

No slice may add behavior selected by Joker ID, ordinal, Chinese name, ensemble,
or asset path. Every slice ends green and is a source-control rollback point.

## Slice 0 — Machine ledger and red contracts

- [x] Add one machine-readable J101-J150 expected ledger for IDs, Chinese names,
      executable rules, flavor, rarity, cost, availability/source, ensemble,
      copy policy/target/facets, stickers, state, contracts, art, provenance, and
      named fixtures.
- [x] Add red catalog tests for 50 contiguous rows, 6/25/14/5 rarity, 230/150/380
      counts, all 150 Joker IDs resolved, and zero external Joker doubles.
- [x] Add red positive/boundary/debuffed vectors for every row and test-name
      closure for every fixture in matrix section 6.
- [x] Add red V5→V6, V2→V6, old-snapshot, recovery, export/import, capacity-debt,
      target, and no-RNG migration fixtures.
- [x] Add red graph/chance/suit/destruction/Boss/shop-exit property fixtures
      before their implementations.
- [x] Confirm failures identify only absent final-batch/V6 contracts while every
      accepted baseline test remains green.

Gate:

```bash
npx vitest run tests/content/joker-catalog-101-150.test.ts tests/game-core/joker-contract-ledger-101-150.test.ts tests/persistence/migrate-run-v5-to-v6.test.ts
```

Rollback point: test/ledger-only commit.

## Slice 1 — Catalog version, identities, and dependency closure

- [x] Add `joker-catalog-3`, extend aggregate ledgers to 150 Jokers/380 rows,
      and remove all Joker IDs from unresolved production dependencies.
- [x] Extend `JokerEnsemble` with the five approved presentation-only values and
      prove no mechanic can consume them.
- [x] Extend copy policy/definition/materialized/owned shapes with generic
      `route` and `copyTarget`; default every earlier row to `none` target.
- [x] Add the 50 frozen source records, localization, flavor, cost, rarity,
      availability, sticker, state, contract, effect, art, and ownership metadata.
- [x] Express J106/J120 gates through deck modifiers and J146-J150 reachability
      through a typed Legendary source, not profile-name or ID branches.
- [x] Remove the legendary Spectral-equivalent reserved dependency and prove it
      selects all five real Legendary definitions while ordinary pools select
      none.
- [x] Validate copy-route/facet agreement, safe state values, sticker exclusions,
      localization, contracts, assets, provenance, and fixture-name closure.

Gate:

```bash
npx vitest run tests/content/joker-catalog-101-150.test.ts tests/content/catalog-audit.test.ts tests/content/production-run-v6.test.ts tests/game-core/joker-rarity-pools.test.ts
npm run content:audit
npm run typecheck
```

Rollback point: catalog/version commit; runtime contract tests may remain red.

## Slice 2 — RunStateV6 and forward persistence

- [x] Add `runV6.ts` with independent Castle/Idol targets, exact Joker capacity
      debt, and migration metadata while retaining inherited V5 fields.
- [x] Implement target initialization/clear/rotation/fallback and materialized
      evidence without coupling J083/J099 state.
- [x] Implement pure V5→V6 migration that preserves frozen content, initializes
      null targets, derives provable debt, records fingerprint, and consumes no
      RNG.
- [x] Preserve the V1→V2→V3→V4→V5→V6 chain and every old content resolver.
- [x] Add V6 schema/invariants, recovery, metadata repair, IndexedDB normalization,
      last-known-good fallback, profile transfer/wire encoding, and future-version
      rejection.
- [x] Widen ability-state/content-version guards without weakening exact keys,
      row-count closure, or old snapshot immutability.

Gate:

```bash
npx vitest run tests/persistence tests/game-core/run-v6-invariants.test.ts tests/game-core/run-v5-invariants.test.ts tests/content/run-setup-v6.test.ts
npm run typecheck
```

Rollback point: V6 reader/writer/migration commit. Never land the writer without
all readers/recovery paths.

## Slice 3 — Frozen source graph and compatible facets

- [x] Build `FrozenJokerSourceGraphV6` from the complete event-entry layout,
      retaining debuffed nodes for literal adjacency.
- [x] Route J123 right and J138 leftmost while preserving the copied router's
      anchor through multi-router chains.
- [x] Reuse the existing queue/applicator and shared budget; do not introduce a
      second Joker interpreter.
- [x] Suppress self/missing/dynamic-cycle branches with typed trace and no RNG;
      keep invalid static cycles, missing handlers, budget, and state failures
      hard failures.
- [x] Enforce operation facets for output/trigger/none; prove partial J136
      compatibility and noncopying state/passive/destruction/edition/sticker.
- [x] Freeze one graph across nested score/retrigger/sale/creation phases and
      prove reorder after admission affects only the next event.
- [x] Re-run every J001-J100 copy/retrigger/debuff/order fixture.

Gate:

```bash
npx vitest run tests/game-core/joker-copy-graph-v6.test.ts tests/game-core/effect-pipeline.test.ts tests/game-core/joker-copy-facets-v6.test.ts tests/game-core/jokers-001-100.test.ts
npm run typecheck
```

Rollback point: graph/facet commit.

## Slice 4 — Listed chance and derived passive capabilities

- [x] Add the bounded `resolveListedChanceV6` service with saturating numerator
      doubling, zero/certainty no-RNG branches, and durable roll evidence.
- [x] Add passive capabilities for listed-chance power, hands-per-round delta,
      suit equivalence, duplicate materialization families, zero-price item/pack
      families, and idempotent Boss disable.
- [x] Freeze passives once per event and recompute after an accepted inventory/
      debuff change; prevent recursive passive/chance evaluation.
- [x] Route every explicit gameplay chance call through the service, including
      existing Joker, modifier, Glass, setup, blind, and consumable effects.
- [x] Prove weighted selection, rarity, shuffle, random targets/content, editions,
      and stickers retain byte-identical RNG sequences with/without J126.
- [x] Add `effectiveHandsPerRoundForRun` and safe stacking/idempotence tests.

Gate:

```bash
npx vitest run tests/game-core/listed-chance-v6.test.ts tests/game-core/joker-passives-v6.test.ts tests/game-core/joker-probability-regression.test.ts tests/game-core/modifiers-v3.test.ts
npm run typecheck
```

Rollback point: chance/passive commit.

## Slice 5 — Suit assignment and event fact extensions

- [x] Add `candidateSuitsForCardV6` and use it in Flush classification and all
      scored/held/discarded suit predicates without changing persisted base suit.
- [x] Add deterministic distinct-card bipartite assignment for J122/J128 with
      Wild, Stone, debuff, J113, and input-permutation coverage.
- [x] Classify the immutable discarded set with the ordinary full poker-hand
      evaluator and append `discardedHandType` to discard facts.
- [x] Add the four V6 effect windows and discriminated destruction, Boss ability,
      shop-leave, and survival facts plus strict invalid-pair tests.
- [x] Extend event context with frozen destruction modifiers/effective identities
      and successful Planet content history.
- [x] Thread one V6 event runtime (graph, passives, budget, event ID) through the
      accepted proposal pipeline.

Gate:

```bash
npx vitest run tests/game-core/joker-event-facts-v6.test.ts tests/game-core/suit-assignment-v6.test.ts tests/game-core/poker.test.ts tests/game-core/run-window-v6.test.ts
npm run typecheck
```

Rollback point: suit/fact/coordinator commit.

## Slice 6 — Destruction, Boss trigger/disable, and survival

- [x] Implement one atomic permanent playing-card destruction helper that
      freezes facts, removes all zones/mirrors once, emits one event, validates,
      and rolls back on failure.
- [x] Replace Glass break, consumable, Joker, and generic state-operation direct
      removals; prove transformations/moves/reload repairs emit no false event.
- [x] Add one `bossEffectsDisabledForRun` and replace every direct V5 flag check
      in hand validation, target, draw, blind rule, run window, and reward paths.
- [x] Record exactly one Boss-ability event when an enabled rule actually applies
      to a played hand; suppressed/irrelevant rules produce none.
- [x] Add the last-hand survival proposal with exact quarter threshold, first
      active source, non-sale destruction, zero base reward, ordinary settlement,
      and deck-exhaustion exclusion.
- [x] Fault-inject late destruction/Boss/survival failures and prove state, score,
      cards, inventory, money, RNG, history, and events roll back exactly.

Gate:

```bash
npx vitest run tests/game-core/playing-card-destruction-v6.test.ts tests/game-core/boss-ability-v6.test.ts tests/game-core/blind-survival-v6.test.ts tests/game-core/joker-lifecycle-regression.test.ts
npm run typecheck
```

Rollback point: destruction/Boss/survival commit.

## Slice 7 — Sale clone, duplicates, pricing, and shop exit

- [x] Add shared Joker/consumable used-slot helpers. Negative consumables use
      zero slots; validated sale clones can create exact durable Joker debt.
- [x] Replace acquisition/operation/pack/invariant consumable array-length checks
      and add debt normalization/blocking tests.
- [x] Extend the sale transaction with generic ready-source random-other clone,
      exact state/edition/sticker preservation, Negative stripping, cloned-source
      readiness reset, stable instance IDs, and pre-removal payout.
- [x] Thread capability-derived duplicate-family policy through shop fill/reroll,
      free-Joker tags, and eligible pack options. Preserve existing offers/options.
- [x] Add family-aware zero pricing after ordinary price computation/repricing;
      cover Planet items/packs and all excluded families.
- [x] Emit atomic pre-advance `shop-left`; freeze the original consumable pool,
      allow independent copied target draws, create Negative zero-slot clones,
      then ante-end/advance/checkpoint.
- [x] Prove empty/full/debuff/sale/reload/rejected/late-failure behavior consumes
      no unintended RNG and leaves materialized shop state immutable.

Gate:

```bash
npx vitest run tests/game-core/joker-sale-clone-v6.test.ts tests/game-core/inventory-capacity-v6.test.ts tests/game-core/shop-materialization-v6.test.ts tests/game-core/shop-left-v6.test.ts
npm run typecheck
```

Rollback point: inventory/shop/sale commit.

## Slice 8 — Rows J101-J115

- [x] Implement 双频铜筒 through 众价佩刀: 10/4 card output, ten-hand all-card
      retrigger/expiry, Castle target/growth/output, face output, sale factor/reset,
      Gold payout, quarter survival, final-hand factor, face retrigger, and other-
      Joker sale-value sum.
- [x] Implement 长袖歌伶 through 首牌悬签: round hands/hand size, random sealed
      opening card/overflow, color suit equivalence, skipped-Blind factor, and
      first scoring-card double retrigger.
- [x] Cover tenth-hand ordering, all-Stone target, deliberate vs automatic sale,
      Boss reset/debuff, reward override, source/copy order, current sale values,
      random seal/card replay, and every named fixture.
- [x] Re-run J001-J100 score/retrigger/sale/Boss/target baselines.

Gate:

```bash
npx vitest run tests/game-core/jokers-101-115.test.ts tests/game-core/joker-interactions-101-115.test.ts tests/game-core/jokers-001-100.test.ts
npm run content:audit
```

Rollback point: first 15 new rows functional.

## Slice 9 — Rows J116-J130

- [x] Implement four suit output rows, Glass destruction growth, duplicate
      content permission, four-suit assignment, right router, scored-2 growth,
      discard/hand-size passive, and global chance factor.
- [x] Implement Idol exact target, Club/other distinct assignment, actual Boss
      trigger payout, and round-local Jack factor/reset.
- [x] Cover J113/Wild/Stone/debuff assignment, copied/retriggered money/chance,
      destruction source paths, graph chains/cycles, current-hand J124 growth,
      harmful guaranteed chance, target weighting/reload, Boss suppression, and
      all named fixtures.
- [x] Re-run every earlier chance, suit, shop/pack uniqueness, destruction, copy,
      and Boss regression.

Gate:

```bash
npx vitest run tests/game-core/jokers-116-130.test.ts tests/game-core/joker-interactions-116-130.test.ts tests/game-core/joker-copy-graph-v6.test.ts tests/game-core/listed-chance-v6.test.ts
npm run content:audit
```

Rollback point: 30 functional new rows.

## Slice 10 — Rows J131-J145

- [x] Implement Pair/Three/Four/Straight/Flush factors and secret-hand containment.
- [x] Implement partial-copy +250 Chips/−2 hand size, two-round sale duplicate,
      leftmost router, distinct-Planet payout, held Queen, sixteen-enhancement
      gate, blind-selected Tarot creation, free Planet pricing, first-discard hand
      level, and five-money groups.
- [x] Cover capacity debt, target state/edition/sticker clone, cloned J137 reset,
      graph router-to-router anchors, history before acquisition, held retrigger,
      temporary card debuff, capacity-before-RNG, free-price materialization,
      discard classification/copy, negative money floor, and all named fixtures.
- [x] Re-run persistence, shop, pack, sale, history, poker, held-card, and all
      J001-J130 regressions.

Gate:

```bash
npx vitest run tests/game-core/jokers-131-145.test.ts tests/game-core/joker-interactions-131-145.test.ts tests/game-core/joker-sale-clone-v6.test.ts tests/game-core/shop-materialization-v6.test.ts
npm run content:audit
```

Rollback point: 45 functional new rows.

## Slice 11 — Rows J146-J150 and Legendary route

- [x] Implement destroyed effective-face factor, scored K/Q factors, 23-discard
      quotient/remainder, idempotent passive Boss suppression, and frozen-pool
      Negative consumable clone.
- [x] Route the real Legendary Spectral-equivalent action through all five rows
      with deterministic equal-weight/eligible selection and no ordinary leakage.
- [x] Cover all-cards-face/Stone/debuff destruction, multi-card/multi-source
      growth, K/Q retriggers/copies, forced discards/surplus/reload, multiple J149,
      earlier sale suppression, J129 exclusion, zero-slot full capacity, copied
      J150 choices, empty pools, and all named fixtures.
- [x] Run the complete J001-J145 contract suite after the five Legendary rows
      and shared primitives are active.

Gate:

```bash
npx vitest run tests/game-core/jokers-146-150.test.ts tests/game-core/joker-interactions-146-150.test.ts tests/game-core/legendary-joker-route-v6.test.ts tests/game-core/jokers-001-145.test.ts
npm run content:audit
```

Rollback point: all 50 new rows functional.

## Slice 12 — Real acquisition, discovery, and campaign integration

- [x] Route ordinary shops/rerolls, all relevant packs, tags, Spectral creation,
      challenges, and starting inventory through 150 real rows.
- [x] Reject every attempt to shadow J001-J150 with a fixture definition; strict
      production external dependency sets must be empty for Jokers.
- [x] Preserve rarity-first draw and renormalization over eligible pools; empty
      forced pools fail without RNG.
- [x] Persist first-acquisition discovery without gating first offers.
- [x] Prove saved offers/options/targets/copy graph evidence remain immutable
      across reload, migration, recovery, and catalog refresh.
- [x] Run seeded real campaign routes for every applicable new row rather than
      relying only on direct inventory construction.

Gate:

```bash
npx vitest run tests/game-core/shop-catalog-v6.test.ts tests/game-core/run-setup-catalog-v6.test.ts tests/game-core/legendary-joker-route-v6.test.ts tests/content/production-run-v6.test.ts
npm run content:audit
```

Rollback point: real 150-row acquisition commit.

## Slice 13 — Original illustrations and presentation

- [x] Load the project `imagegen` skill before generating raster artwork.
- [x] Generate one 768×1024 text-free master from every frozen focal brief and
      record prompt/source/ownership before optimization.
- [x] Visually inspect identity distance, focal uniqueness, pose/composition,
      crop, accidental text/logo/watermark, geometry, and ensemble consistency;
      regenerate failures.
- [x] Optimize accepted masters to local WebP and complete all provenance,
      dimensions, ownership, and unique-focal records.
- [x] Extend generic current-value projections for counters, targets, factors,
      histories, chance power, copy route/status, capacity debt, and pricing.
- [x] Extend the audit to fifteen ten-card ensembles while preserving the
      accepted first ten and representative shop/pack/table projections.
- [x] Prove all assets decode, all paths are local, and no browser request reaches
      a remote image/runtime service.

Gate:

```bash
npx vitest run tests/presentation/joker-catalog-audit.test.tsx tests/presentation/joker-current-values-v6.test.tsx tests/presentation/shop-screen.test.tsx tests/presentation/game-table.test.tsx
CI=1 npx playwright test tests/e2e/joker-catalog-audit.spec.ts tests/e2e/joker-gameplay.spec.ts
npm run content:audit
```

Rollback point: art/presentation commit. Automated decode is not visual approval.

## Slice 14 — Full integration, specs, and local acceptance

- [x] Run seeded campaigns across all five final ensembles and every relevant
      score, retrigger, chance, discard, destruction, Boss, survival, sale,
      duplicate, pack, pricing, round, shop-exit, save/load, win, and endless
      boundary.
- [x] Compare pure-engine and persisted Chromium/WebKit checkpoints for RNG,
      targets, graph trace, offers, state, score, inventory, discovery, mutation,
      destruction, and capacity debt.
- [x] Fault-inject every new migration, recovery, graph budget, chance, target,
      destruction, clone, survival, capacity, and late-command failure boundary.
- [x] Re-run full non-Joker, J001-J100, legacy V2-V5, challenge, modifier,
      component, coverage, build, audit, and browser baselines.
- [x] Update `.trellis/spec/frontend/gameplay-contracts.md` with V6 graph,
      chance scope, suit assignment, transactions, capacity, target persistence,
      compatibility, and 380-row snapshot guarantees.
- [x] Inspect the locally running game at 1280×720 in Chromium and WebKit and
      record exact commands/results as acceptance evidence.
- [x] Invoke `trellis-check`, fix every blocking finding, and repeat the full gate
      from a classified tree.

Final gate:

```bash
npm run check
npm run test:coverage
CI=1 npm run test:e2e
npm run content:audit
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/07-17-joker-catalog-101-150
```

## High-risk review checklist

- [x] No content-ID/name/ensemble/asset behavior branch exists outside content,
      tests, or explicitly declarative dependency targeting.
- [x] Literal graph adjacency includes debuffed nodes; copied routers retain
      target anchoring; dynamic cycles terminate without failing or drawing RNG.
- [x] Copy facets, probability rolls, source state, debuff, retrigger, source
      order, and operation budget match the frozen matrix.
- [x] J126 affects every and only explicitly listed gameplay chances; excluded
      weighted RNG sequences are unchanged.
- [x] Suit equivalence and distinct-card assignment use one shared helper in
      poker facts and predicates.
- [x] All permanent playing-card removal uses one destruction transaction and
      immutable pre-removal facts.
- [x] Boss suppression is one idempotent projection; J129 observes only actually
      applied rules; J107 survival cannot duplicate rewards or save exhaustion.
- [x] Joker debt and zero-slot consumables remain schema-valid across clone,
      removal, capacity changes, save/reload, recovery, and transfer.
- [x] V6 migration never changes an old run's frozen catalog or consumes RNG.
- [x] Failed commands never alter checkpoint, RNG, score, cards, inventory,
      money, history, discovery, materialized choices, or presentation events.
- [x] All J001-J100 and 230 non-Joker behaviors remain green.

## Required completion evidence

- 50/50 new definitions and 50/50 standard contract groups pass; every named
  matrix fixture maps to a named test.
- The 6 Common / 25 Uncommon / 14 Rare / 5 Legendary split and 230 + 150 = 380
  counts pass; all 150 Joker IDs resolve and ordinary/Legendary routes separate.
- 50/50 original names, rules, flavor lines, local illustrations, provenance,
  ownership, and focal compositions pass automated and visual review.
- Every mutable/random row passes same-seed replay, reload, recovery,
  export/import, false-branch no-consumption, and rejection atomicity checks.
- Chromium and WebKit show the complete 150-row ledger and representative real
  gameplay at 1280×720 with no runtime network dependency.
- The final gate, Trellis validation, classified tree review, and user acceptance
  all pass.

## Acceptance evidence

Record only after implementation and verification. Do not mark this task
complete or archive it from planning evidence alone.

### 2026-07-20 implementation verification

- Production catalog closure: 230 non-Joker rows + 150 real Joker rows = 380
  definitions; J101-J150 are contiguous, all reserved Joker dependencies resolve,
  and the new batch is exactly 6 Common / 25 Uncommon / 14 Rare / 5 Legendary.
- Contract and regression evidence: `npm run check` passed formatting, ESLint,
  TypeScript, 96 Vitest files / 429 tests, and the production Vite build. Focused
  regressions also passed 60 game-core files / 329 tests, 10 presentation files /
  22 tests, and 4 final-batch content files / 12 tests.
- Coverage gate: `npm run test:coverage` passed 96 files / 429 tests with 81.44%
  statements, 74.26% branches, 88.28% functions, and 85.03% lines.
- Browser gate: `CI=1 npm run test:e2e` passed 26/26 tests across Chromium and
  WebKit, including the 150-card ledger, local asset decoding, deterministic V6
  checkpoint restore, campaign boundaries, and 1280x720 review captures.
- Content and asset closure: `npm run content:audit` passed 2 files / 7 tests.
  All 50 new illustrations are 768x1024 local WebP files with 50 provenance
  sidecars. Contact-sheet review caused J119, J127, J138-J141, and J143 to be
  regenerated before acceptance.
- High-risk review found no Joker ID/name/ensemble/asset behavior branches outside
  declarative content, no direct nondeterministic RNG, and no debug/type-escape
  residue. Unified V6 graph, chance, suit, destruction, Boss, survival, capacity,
  migration, recovery, and atomic rejection contracts remain green.
- Final repository gates passed: `git diff --check`, task context validation, and
  the full Trellis check flow. The classified dirty tree was preserved; no task
  completion, archive, stage, or commit was performed pending explicit user
  acceptance.
